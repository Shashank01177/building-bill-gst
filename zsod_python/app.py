"""
app.py – Flask REST API for the Zero-Shot Object Detector.

Run from the zsod_python directory:
    python app.py

Endpoints
---------
GET  /                 → Serve index.html
GET  /api/status       → Model info JSON
POST /api/switch_model → Switch active model
GET  /api/samples      → List sample images
GET  /samples/<fn>     → Serve a sample image
POST /api/detect       → Detect objects (multipart or JSON base64)
GET  /api/benchmark    → Run built-in benchmark
"""

from __future__ import annotations

import base64
import io
import json
import os
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure local packages are importable when run directly from zsod_python/
# ---------------------------------------------------------------------------
_HERE = Path(__file__).parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from flask import Flask, jsonify, request, send_from_directory, render_template

from zero_shot_detector import ZeroShotObjectDetector
from zero_shot_detector.visualizer import DetectionVisualizer
from zero_shot_detector.utils import (
    image_to_base64,
    load_image,
    export_to_coco_format,
    export_to_yolo_format,
    apply_nms,
)
from zero_shot_detector.evaluator import ZeroShotEvaluator

from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# App configuration
# ---------------------------------------------------------------------------

TEMPLATES_DIR = _HERE / "templates"
SAMPLES_DIR   = _HERE / "samples"
MAX_CONTENT_LENGTH_MB = 32

app = Flask(
    __name__,
    template_folder=str(TEMPLATES_DIR),
    static_folder=str(_HERE),
)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH_MB * 1024 * 1024

# ---------------------------------------------------------------------------
# Global model + helpers (lazy-loaded on first request)
# ---------------------------------------------------------------------------

_detector:   ZeroShotObjectDetector | None = None
_visualizer: DetectionVisualizer           = DetectionVisualizer()


def get_detector() -> ZeroShotObjectDetector:
    global _detector
    if _detector is None:
        _detector = ZeroShotObjectDetector(
            model_name="from-scratch",
            lazy_load=False,
            device="cpu",
        )
    return _detector


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    det = get_detector()
    return jsonify(det.get_info())


@app.route("/api/switch_model", methods=["POST"])
def api_switch_model():
    data       = request.get_json(force=True, silent=True) or {}
    model_name = data.get("model_name", "from-scratch")
    try:
        det = get_detector()
        det.switch_model(model_name)
        return jsonify({"success": True, "model_name": model_name})
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


@app.route("/api/samples")
def api_samples():
    """Return metadata for all sample images with preset queries."""
    PRESETS = {
        "office_desk.jpg": {
            "title":   "Office Desk",
            "queries": "laptop, coffee mug, notebook, keyboard, pen",
            "emoji":   "💻",
        },
        "street_traffic.jpg": {
            "title":   "Street Traffic",
            "queries": "car, traffic light, building, road, cloud",
            "emoji":   "🚗",
        },
        "living_room.jpg": {
            "title":   "Living Room",
            "queries": "sofa, coffee table, potted plant, TV, lamp",
            "emoji":   "🛋️",
        },
        "dog_pet.jpg": {
            "title":   "Dog in Park",
            "queries": "dog, grass, frisbee, dog collar, sky",
            "emoji":   "🐕",
        },
        "kitchen_items.jpg": {
            "title":   "Kitchen",
            "queries": "microwave, toaster, coffee mug, fruits, knife",
            "emoji":   "🍳",
        },
    }

    samples = []
    if SAMPLES_DIR.exists():
        for f in sorted(SAMPLES_DIR.glob("*.jpg")):
            img = Image.open(f)
            w, h = img.size
            preset = PRESETS.get(f.name, {
                "title":   f.stem.replace("_", " ").title(),
                "queries": "object",
                "emoji":   "🖼️",
            })
            samples.append({
                "filename": f.name,
                "url":      f"/samples/{f.name}",
                "width":    w,
                "height":   h,
                "title":    preset["title"],
                "queries":  preset["queries"],
                "emoji":    preset["emoji"],
            })
    return jsonify({"samples": samples})


@app.route("/samples/<path:filename>")
def serve_sample(filename):
    return send_from_directory(str(SAMPLES_DIR), filename)


@app.route("/api/detect", methods=["POST"])
def api_detect():
    """
    Accept either:
      - multipart/form-data with field 'image' (file), plus optional fields
        queries, threshold, nms
      - application/json with {image: base64, queries, threshold, nms}
    """
    start_time = time.time()

    try:
        # --- Parse inputs ---
        if request.content_type and "multipart" in request.content_type:
            # Multipart file upload
            if "image" not in request.files:
                return jsonify({"success": False, "error": "No image file"}), 400
            file  = request.files["image"]
            pil   = Image.open(file.stream).convert("RGB")
            queries_raw = request.form.get("queries", "person, car, dog")
            threshold   = float(request.form.get("threshold", 0.35))
            nms_thr     = float(request.form.get("nms", 0.25))
        else:
            # JSON payload
            data = request.get_json(force=True, silent=True) or {}
            img_data    = data.get("image", "")
            queries_raw = data.get("queries", "person, car, dog")
            threshold   = float(data.get("threshold", 0.35))
            nms_thr     = float(data.get("nms", 0.25))

            if not img_data:
                return jsonify({"success": False, "error": "No image data"}), 400
            pil = load_image(img_data)

        # --- Parse queries ---
        if isinstance(queries_raw, list):
            queries = [q.strip() for q in queries_raw if q.strip()]
        else:
            queries = [q.strip() for q in queries_raw.split(",") if q.strip()]

        if not queries:
            queries = ["object"]

        # --- Detect ---
        det      = get_detector()
        detections = det.detect(
            pil, queries,
            threshold=threshold,
            nms_iou_threshold=nms_thr,
            max_detections=30,
        )

        inference_ms = (time.time() - start_time) * 1000

        # --- Annotated image ---
        annotated     = _visualizer.draw_detections(pil, detections)
        annotated_b64 = image_to_base64(annotated, fmt="JPEG")

        # --- Crops ---
        crops_raw = _visualizer.extract_crops(pil, detections, padding=10)
        crops_out = []
        for crop_info in crops_raw:
            crop_b64 = image_to_base64(crop_info["crop_image"], fmt="JPEG")
            crops_out.append({
                "index": crop_info["index"],
                "label": crop_info["label"],
                "score": crop_info["score"],
                "box":   crop_info["box"],
                "image": crop_b64,
            })

        # --- Exports ---
        w, h = pil.size
        coco_data  = export_to_coco_format(detections, w, h)
        yolo_txt, class_map = export_to_yolo_format(detections, w, h)

        return jsonify({
            "success":           True,
            "inference_time_ms": round(inference_ms, 1),
            "detections":        detections,
            "annotated_image":   annotated_b64,
            "crops":             crops_out,
            "exports": {
                "coco": coco_data,
                "yolo": {
                    "annotations": yolo_txt,
                    "class_map":   {str(k): v for k, v in class_map.items()},
                },
            },
        })

    except Exception as exc:
        import traceback
        return jsonify({
            "success": False,
            "error":   str(exc),
            "trace":   traceback.format_exc(),
        }), 500


@app.route("/api/benchmark")
def api_benchmark():
    """
    Run a quick benchmark using a synthetic test image.
    Returns metrics including inference time and evaluator output.
    """
    # Synthetic 320×240 image
    img  = Image.new("RGB", (320, 240), color=(180, 200, 220))
    draw = ImageDraw.Draw(img)
    draw.rectangle([40, 40, 150, 130], fill=(220, 60, 60))   # "car"
    draw.ellipse([180, 60, 270, 160],  fill=(60, 120, 220))  # "person"

    queries = ["red car", "blue person", "green tree"]

    det    = get_detector()
    t0     = time.time()
    preds  = det.detect(img, queries, threshold=0.1, max_detections=20)
    elapsed_ms = (time.time() - t0) * 1000

    # Ground truth (synthetic)
    gt = [
        {"label": "red car",    "box": [40.0,  40.0, 150.0, 130.0]},
        {"label": "blue person","box": [180.0, 60.0, 270.0, 160.0]},
    ]

    evaluator = ZeroShotEvaluator()
    metrics   = evaluator.evaluate_detections(gt, preds, iou_threshold=0.5)
    coco_map  = evaluator.compute_coco_map_range(gt, preds)

    return jsonify({
        "inference_time_ms": round(elapsed_ms, 1),
        "num_detections":    len(preds),
        "metrics":           metrics,
        "coco_map":          coco_map,
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[ZSOD] Starting Flask server on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
