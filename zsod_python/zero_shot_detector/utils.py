"""zero_shot_detector/utils.py"""
from __future__ import annotations
import base64, io
from typing import List, Dict, Any
from PIL import Image


def load_image(src) -> Image.Image:
    if isinstance(src, Image.Image):
        return src.convert("RGB")
    if isinstance(src, str):
        if src.startswith("data:image"):
            src = src.split(",", 1)[1]
        try:
            data = base64.b64decode(src)
            return Image.open(io.BytesIO(data)).convert("RGB")
        except Exception:
            return Image.open(src).convert("RGB")
    return Image.open(io.BytesIO(src)).convert("RGB")


def compute_iou(a, b) -> float:
    ix1=max(a[0],b[0]); iy1=max(a[1],b[1])
    ix2=min(a[2],b[2]); iy2=min(a[3],b[3])
    iw=max(0,ix2-ix1); ih=max(0,iy2-iy1)
    inter=iw*ih
    ua=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter
    return inter/ua if ua>0 else 0.0


def apply_nms(dets: List[Dict], iou_threshold=0.45) -> List[Dict]:
    by_class: Dict[str,List] = {}
    for d in dets:
        by_class.setdefault(d["label"],[]).append(d)
    out=[]
    for cls_dets in by_class.values():
        cls_dets.sort(key=lambda d:d["score"], reverse=True)
        keep=[]
        for d in cls_dets:
            if all(compute_iou(d["box"],k["box"])<iou_threshold for k in keep):
                keep.append(d)
        out.extend(keep)
    return out


def image_to_base64(img: Image.Image, fmt="JPEG") -> str:
    buf=io.BytesIO()
    img.save(buf, format=fmt, quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def export_to_coco_format(dets, w, h):
    anns=[]
    for i,d in enumerate(dets):
        x1,y1,x2,y2=d["box"]
        anns.append({"id":i+1,"bbox":[x1,y1,x2-x1,y2-y1],
                     "category_name":d["label"],"score":d["score"],"area":(x2-x1)*(y2-y1)})
    return {"image":{"width":w,"height":h},"annotations":anns}


def export_to_yolo_format(dets, w, h):
    labels=sorted(set(d["label"] for d in dets))
    cls_map={l:i for i,l in enumerate(labels)}
    lines=[]
    for d in dets:
        x1,y1,x2,y2=d["box"]
        cx=(x1+x2)/(2*w); cy=(y1+y2)/(2*h)
        bw=(x2-x1)/w;     bh=(y2-y1)/h
        lines.append(f"{cls_map[d['label']]} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")
    return "\n".join(lines), {v:k for k,v in cls_map.items()}
