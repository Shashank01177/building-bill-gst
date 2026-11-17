"""app.py - Flask REST API for Zero-Shot Object Detector. Run: python app.py"""
from __future__ import annotations
import base64, io, os, sys, time
from pathlib import Path

_HERE = Path(__file__).parent.resolve()
sys.path.insert(0, str(_HERE))

from flask import Flask, jsonify, request, send_from_directory, render_template
from PIL import Image, ImageDraw

from zero_shot_detector import ZeroShotObjectDetector
from zero_shot_detector.visualizer import DetectionVisualizer
from zero_shot_detector.utils import image_to_base64, load_image, export_to_coco_format, export_to_yolo_format
from zero_shot_detector.evaluator import ZeroShotEvaluator

TEMPLATES = _HERE / "templates"
SAMPLES   = _HERE / "samples"

app = Flask(__name__, template_folder=str(TEMPLATES), static_folder=str(_HERE))
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024

_detector  = None
_visualizer = DetectionVisualizer()


def get_detector():
    global _detector
    if _detector is None:
        _detector = ZeroShotObjectDetector(model_name="owlv2-base", lazy_load=False)
    return _detector


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    return jsonify(get_detector().get_info())


@app.route("/api/switch_model", methods=["POST"])
def api_switch():
    data = request.get_json(force=True, silent=True) or {}
    name = data.get("model_name", "owlv2-base")
    try:
        get_detector().switch_model(name)
        return jsonify({"success": True, **get_detector().get_info()})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400


PRESETS = {
    "office_desk.jpg":    {"title":"Office Desk",     "queries":"laptop, coffee mug, notebook, keyboard, pen",   "emoji":"💻"},
    "street_traffic.jpg": {"title":"Street Traffic",  "queries":"car, traffic light, building, road",             "emoji":"🚗"},
    "living_room.jpg":    {"title":"Living Room",     "queries":"sofa, coffee table, potted plant, TV screen",    "emoji":"🛋️"},
    "dog_pet.jpg":        {"title":"Dog in Park",     "queries":"dog, grass, frisbee, dog collar",                "emoji":"🐕"},
    "kitchen_items.jpg":  {"title":"Kitchen",         "queries":"microwave, toaster, coffee mug, fruits, knife",  "emoji":"🍳"},
}


@app.route("/api/samples")
def api_samples():
    out = []
    if SAMPLES.exists():
        for f in sorted(SAMPLES.glob("*.jpg")):
            img = Image.open(f); w, h = img.size
            p = PRESETS.get(f.name, {"title":f.stem.replace("_"," ").title(),"queries":"object","emoji":"🖼️"})
            out.append({"filename":f.name,"url":f"/samples/{f.name}","width":w,"height":h,
                        "title":p["title"],"queries":p["queries"],"emoji":p["emoji"]})
    return jsonify({"samples": out})


@app.route("/samples/<path:fn>")
def serve_sample(fn):
    return send_from_directory(str(SAMPLES), fn)


@app.route("/api/detect", methods=["POST"])
def api_detect():
    t0 = time.time()
    try:
        if request.content_type and "multipart" in request.content_type:
            if "image" not in request.files:
                return jsonify({"success":False,"error":"No image file"}), 400
            pil = Image.open(request.files["image"].stream).convert("RGB")
            queries_raw = request.form.get("queries","person, car, dog")
            threshold   = float(request.form.get("threshold", 0.15))
            nms_thr     = float(request.form.get("nms", 0.3))
        else:
            data = request.get_json(force=True, silent=True) or {}
            img_data = data.get("image","")
            if not img_data:
                return jsonify({"success":False,"error":"No image"}), 400
            pil = load_image(img_data)
            queries_raw = data.get("queries","person, car, dog")
            threshold   = float(data.get("threshold", 0.15))
            nms_thr     = float(data.get("nms", 0.3))

        queries = [q.strip() for q in queries_raw.split(",") if q.strip()] if isinstance(queries_raw,str) else queries_raw
        if not queries: queries=["object"]

        det  = get_detector()
        dets = det.detect(pil, queries, threshold=threshold, nms_iou_threshold=nms_thr)

        ann     = _visualizer.draw_detections(pil, dets)
        ann_b64 = image_to_base64(ann)
        crops   = [{"index":c["index"],"label":c["label"],"score":c["score"],
                    "box":c["box"],"image":image_to_base64(c["crop_image"])}
                   for c in _visualizer.extract_crops(pil, dets)]

        w, h = pil.size
        coco = export_to_coco_format(dets, w, h)
        yolo_txt, cls_map = export_to_yolo_format(dets, w, h)

        return jsonify({"success":True, "inference_time_ms":round((time.time()-t0)*1000,1),
                        "detections":dets, "annotated_image":ann_b64, "crops":crops,
                        "exports":{"coco":coco,"yolo":{"annotations":yolo_txt,"class_map":{str(k):v for k,v in cls_map.items()}}}})
    except Exception as e:
        import traceback
        return jsonify({"success":False,"error":str(e),"trace":traceback.format_exc()}), 500


@app.route("/api/benchmark")
def api_benchmark():
    img  = Image.new("RGB",(320,240),(180,200,220))
    draw = ImageDraw.Draw(img)
    draw.rectangle([40,40,150,130], fill=(220,60,60))
    draw.ellipse([180,60,270,160],  fill=(60,120,220))
    preds = get_detector().detect(img,["red car","blue person","green tree"],threshold=0.1)
    gt    = [{"label":"red car","box":[40,40,150,130]},{"label":"blue person","box":[180,60,270,160]}]
    ev    = ZeroShotEvaluator()
    return jsonify({"metrics":ev.evaluate_detections(gt,preds),"coco_map":ev.compute_coco_map_range(gt,preds),
                    "num_detections":len(preds)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT",5000))
    print(f"[ZSOD] http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
