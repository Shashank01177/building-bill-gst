"""zero_shot_detector/visualizer.py"""
from __future__ import annotations
import colorsys
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any


def _color(label: str, alpha=False):
    h = (hash(label) % 100) / 100.0
    r,g,b = colorsys.hsv_to_rgb(h, 0.85, 0.95)
    c = (int(r*255), int(g*255), int(b*255))
    return c+(180,) if alpha else c


class DetectionVisualizer:
    def __init__(self, font_size=14, line_width=3):
        self.line_width = line_width
        try:
            self.font = ImageFont.truetype("arial.ttf", font_size)
        except Exception:
            self.font = ImageFont.load_default()

    def draw_detections(self, img: Image.Image, dets: List[Dict]) -> Image.Image:
        out = img.copy().convert("RGBA")
        overlay = Image.new("RGBA", out.size, (0,0,0,0))
        draw_o = ImageDraw.Draw(overlay)
        draw_m = ImageDraw.Draw(out)
        for d in dets:
            x1,y1,x2,y2 = [int(v) for v in d["box"]]
            col = _color(d["label"])
            draw_o.rectangle([x1,y1,x2,y2], fill=col+(30,))
            draw_m.rectangle([x1,y1,x2,y2], outline=col, width=self.line_width)
            label = f"{d['label']}: {d['score']:.2f}"
            try:
                bbox = draw_m.textbbox((x1,y1), label, font=self.font)
                tw,th = bbox[2]-bbox[0], bbox[3]-bbox[1]
            except Exception:
                tw,th = len(label)*7, 14
            ty = max(0, y1-th-4)
            draw_m.rectangle([x1,ty,x1+tw+6,ty+th+4], fill=col)
            draw_m.text((x1+3, ty+2), label, fill=(255,255,255), font=self.font)
        out = Image.alpha_composite(out, overlay).convert("RGB")
        return out

    def extract_crops(self, img: Image.Image, dets: List[Dict], padding=10):
        crops=[]
        for i,d in enumerate(dets):
            x1,y1,x2,y2=d["box"]
            x1=max(0,x1-padding); y1=max(0,y1-padding)
            x2=min(img.width,x2+padding); y2=min(img.height,y2+padding)
            crop=img.crop((x1,y1,x2,y2))
            crops.append({"index":i,"label":d["label"],"score":d["score"],
                         "box":d["box"],"crop_image":crop})
        return crops
