"""
utils.py – Utility functions for the Zero-Shot Object Detector package.

Functions
---------
load_image           – Load PIL.Image from path / PIL / base64.
apply_nms            – Per-class greedy NMS.
image_to_base64      – Encode PIL.Image to base64 string.
export_to_coco_format – Convert detections to COCO JSON dict.
export_to_yolo_format – Convert detections to YOLO text + class-map.
compute_iou          – IoU of two [x1,y1,x2,y2] boxes.
"""

from __future__ import annotations

import base64
import io
import json
from typing import Any, Dict, List, Optional, Tuple, Union

from PIL import Image


# ---------------------------------------------------------------------------
# Image loading
# ---------------------------------------------------------------------------

def load_image(source: Union[Image.Image, str, bytes]) -> Image.Image:
    """
    Load a PIL Image from multiple source types.

    Parameters
    ----------
    source : PIL.Image.Image | str | bytes
        - If already a PIL Image, returned as-is (converted to RGB).
        - If a str that looks like a file path, opened from disk.
        - If a str that looks like a base64 payload (or starts with
          ``data:image``), decoded.
        - If raw bytes, wrapped in BytesIO.

    Returns
    -------
    PIL.Image.Image
        RGB image.
    """
    if isinstance(source, Image.Image):
        return source.convert("RGB")

    if isinstance(source, bytes):
        return Image.open(io.BytesIO(source)).convert("RGB")

    if isinstance(source, str):
        # Data-URI prefix → strip and decode
        if source.startswith("data:image"):
            _, b64 = source.split(",", 1)
            raw = base64.b64decode(b64)
            return Image.open(io.BytesIO(raw)).convert("RGB")

        # Try to decode as bare base64
        try:
            raw = base64.b64decode(source)
            return Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            pass

        # Treat as file path
        return Image.open(source).convert("RGB")

    raise TypeError(f"Unsupported image source type: {type(source)}")


# ---------------------------------------------------------------------------
# IoU computation
# ---------------------------------------------------------------------------

def compute_iou(box1: List[float], box2: List[float]) -> float:
    """
    Compute Intersection-over-Union (IoU) for two bounding boxes.

    Parameters
    ----------
    box1, box2 : list of float
        Boxes in [x1, y1, x2, y2] format.

    Returns
    -------
    float
        IoU value in [0, 1].
    """
    ix1 = max(box1[0], box2[0])
    iy1 = max(box1[1], box2[1])
    ix2 = min(box1[2], box2[2])
    iy2 = min(box1[3], box2[3])

    inter_w = max(0.0, ix2 - ix1)
    inter_h = max(0.0, iy2 - iy1)
    inter   = inter_w * inter_h

    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union = area1 + area2 - inter

    return float(inter / union) if union > 0 else 0.0


# ---------------------------------------------------------------------------
# NMS
# ---------------------------------------------------------------------------

def apply_nms(
    detections: List[Dict[str, Any]],
    iou_threshold: float = 0.45,
) -> List[Dict[str, Any]]:
    """
    Apply per-class greedy Non-Maximum Suppression.

    Parameters
    ----------
    detections : list of dict
        Each dict must have ``label`` (str), ``score`` (float),
        and ``box`` ([x1,y1,x2,y2]).
    iou_threshold : float
        Boxes with IoU above this threshold are suppressed.

    Returns
    -------
    list of dict
        Filtered detections, sorted by score descending within each class.
    """
    if not detections:
        return []

    # Group by class label
    by_label: Dict[str, List[Dict]] = {}
    for det in detections:
        by_label.setdefault(det["label"], []).append(det)

    result: List[Dict] = []

    for label, dets in by_label.items():
        # Sort by score descending
        dets = sorted(dets, key=lambda d: d["score"], reverse=True)
        suppressed = [False] * len(dets)

        for i in range(len(dets)):
            if suppressed[i]:
                continue
            result.append(dets[i])
            for j in range(i + 1, len(dets)):
                if suppressed[j]:
                    continue
                iou = compute_iou(dets[i]["box"], dets[j]["box"])
                if iou > iou_threshold:
                    suppressed[j] = True

    return result


# ---------------------------------------------------------------------------
# Base64 export
# ---------------------------------------------------------------------------

def image_to_base64(
    pil_image: Image.Image,
    fmt: str = "JPEG",
) -> str:
    """
    Encode a PIL Image to a base64 string.

    Parameters
    ----------
    pil_image : PIL.Image.Image
    fmt : str
        PIL image format, e.g. ``"JPEG"`` or ``"PNG"``.

    Returns
    -------
    str
        Base64-encoded image (no data-URI prefix).
    """
    buf = io.BytesIO()
    save_img = pil_image
    if fmt == "JPEG" and pil_image.mode != "RGB":
        save_img = pil_image.convert("RGB")
    save_img.save(buf, format=fmt, quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ---------------------------------------------------------------------------
# COCO export
# ---------------------------------------------------------------------------

def export_to_coco_format(
    detections: List[Dict[str, Any]],
    width: int,
    height: int,
    image_id: int = 1,
    image_filename: str = "image.jpg",
) -> Dict[str, Any]:
    """
    Convert detections to a COCO-compatible JSON dictionary.

    Parameters
    ----------
    detections : list of dict  (label, score, box)
    width, height : int  – original image dimensions
    image_id : int
    image_filename : str

    Returns
    -------
    dict  – COCO JSON structure with ``images``, ``annotations``,
            ``categories`` keys.
    """
    # Build category list from unique labels (sorted for determinism)
    labels = sorted({d["label"] for d in detections})
    label_to_id = {lbl: idx + 1 for idx, lbl in enumerate(labels)}

    categories = [
        {"id": label_to_id[lbl], "name": lbl, "supercategory": "object"}
        for lbl in labels
    ]

    images = [
        {
            "id": image_id,
            "file_name": image_filename,
            "width": width,
            "height": height,
        }
    ]

    annotations = []
    for ann_id, det in enumerate(detections, start=1):
        x1, y1, x2, y2 = det["box"]
        bw = max(0.0, x2 - x1)
        bh = max(0.0, y2 - y1)
        annotations.append({
            "id": ann_id,
            "image_id": image_id,
            "category_id": label_to_id[det["label"]],
            "bbox": [x1, y1, bw, bh],       # COCO: [x, y, w, h]
            "area": bw * bh,
            "score": det["score"],
            "iscrowd": 0,
        })

    return {
        "images":      images,
        "annotations": annotations,
        "categories":  categories,
    }


# ---------------------------------------------------------------------------
# YOLO export
# ---------------------------------------------------------------------------

def export_to_yolo_format(
    detections: List[Dict[str, Any]],
    width: int,
    height: int,
) -> Tuple[str, Dict[int, str]]:
    """
    Convert detections to YOLO annotation format.

    Parameters
    ----------
    detections : list of dict  (label, score, box)
    width, height : int  – original image dimensions

    Returns
    -------
    yolo_txt : str
        Each line: ``<class_id> <cx> <cy> <w> <h>`` (all normalised 0-1).
    class_map : dict
        Mapping {class_id (int): label (str)}.
    """
    labels = sorted({d["label"] for d in detections})
    label_to_id = {lbl: idx for idx, lbl in enumerate(labels)}
    class_map   = {idx: lbl for lbl, idx in label_to_id.items()}

    lines = []
    for det in detections:
        x1, y1, x2, y2 = det["box"]
        cx = (x1 + x2) / 2 / width
        cy = (y1 + y2) / 2 / height
        bw = (x2 - x1) / width
        bh = (y2 - y1) / height
        cls_id = label_to_id[det["label"]]
        lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

    return "\n".join(lines), class_map
