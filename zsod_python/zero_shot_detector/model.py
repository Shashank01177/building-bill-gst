"""
zero_shot_detector/model.py
Supports: "owlv2-base" (best), "owlvit-base", "from-scratch"
"""
from __future__ import annotations
import logging, os, sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from PIL import Image

_HERE = Path(__file__).parent.parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

logger = logging.getLogger("zero_shot_detector")

MODELS = {
    "owlv2-base":  "google/owlv2-base-patch16-ensemble",
    "owlvit-base": "google/owlvit-base-patch32",
    "from-scratch": "from-scratch",
}


class ZeroShotObjectDetector:
    def __init__(self, model_name="owlv2-base", device=None, lazy_load=True):
        self.model_name = model_name
        self.model_id   = MODELS.get(model_name, model_name)
        self.device     = device
        self._hf_proc   = None
        self._hf_model  = None
        self._scratch   = None
        self.is_loaded  = False
        self.load_error = None
        if not lazy_load:
            self.load_model()

    def _dev(self):
        if self.device: return self.device
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except: return "cpu"

    def load_model(self):
        if self.is_loaded: return
        d = self._dev(); self.device = d
        if self.model_name == "from-scratch":
            self._load_scratch(d)
        else:
            self._load_hf(d)

    def _load_scratch(self, dev):
        try:
            from from_scratch.zero_shot_detector import ScratchZeroShotDetector
            import torch
            self._scratch = ScratchZeroShotDetector(embed_dim=128, device=dev)
            ckpt = _HERE / "scratch_model.pth"
            if ckpt.exists():
                self._scratch.load_state_dict(torch.load(str(ckpt), map_location=dev), strict=False)
            self.is_loaded = True; self.load_error = None
        except Exception as e:
            self.load_error = str(e); self.is_loaded = False
            logger.error(f"from-scratch load failed: {e}")

    def _load_hf(self, dev):
        try:
            from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
            logger.info(f"Loading {self.model_id}...")
            self._hf_proc  = AutoProcessor.from_pretrained(self.model_id)
            self._hf_model = AutoModelForZeroShotObjectDetection.from_pretrained(self.model_id)
            self._hf_model.to(dev).eval()
            self.is_loaded = True; self.load_error = None
            logger.info(f"Loaded {self.model_id} OK.")
        except Exception as e:
            self.load_error = str(e); self.is_loaded = False
            logger.error(f"HF load failed: {e}")

    def switch_model(self, name):
        if name not in MODELS:
            raise ValueError(f"Unknown model '{name}'. Choose from: {list(MODELS)}")
        self.model_name=name; self.model_id=MODELS[name]
        self._hf_proc=self._hf_model=self._scratch=None
        self.is_loaded=False; self.load_error=None
        self.load_model()

    def parse_queries(self, q):
        if isinstance(q, str):
            return [t.strip() for t in q.replace(";",",").replace("\n",",").split(",") if t.strip()] or ["object"]
        return [str(x).strip() for x in q if str(x).strip()] or ["object"]

    def detect(self, image, queries, threshold=0.15, nms_iou_threshold=0.3, max_detections=50):
        if not self.is_loaded: self.load_model()
        qlist = self.parse_queries(queries)
        if self.model_name=="from-scratch" and self._scratch:
            return self._scratch.detect(image, qlist, threshold=threshold,
                                        nms_iou_threshold=nms_iou_threshold, max_detections=max_detections)
        if self._hf_model and self._hf_proc:
            return self._detect_hf(image, qlist, threshold, nms_iou_threshold, max_detections)
        return []

    def _detect_hf(self, image, qlist, threshold, nms_iou_threshold, max_detections):
        import torch
        from zero_shot_detector.utils import apply_nms, load_image
        pil = image if isinstance(image, Image.Image) else load_image(image)
        w, h = pil.size
        formatted = [f"a photo of a {q}" if not q.lower().startswith(("a ","an ","the ")) else q for q in qlist]
        inputs = self._hf_proc(text=[formatted], images=pil, return_tensors="pt")
        inputs = {k: v.to(self.device) for k,v in inputs.items()}
        with torch.no_grad():
            outputs = self._hf_model(**inputs)
        sizes = torch.tensor([[h, w]], device=self.device)
        res = self._hf_proc.post_process_object_detection(outputs=outputs, target_sizes=sizes, threshold=threshold)[0]
        dets = []
        for box, score, idx in zip(res["boxes"].cpu().tolist(), res["scores"].cpu().tolist(), res["labels"].cpu().tolist()):
            label = qlist[idx] if idx < len(qlist) else f"class_{idx}"
            x1,y1,x2,y2 = box
            dets.append({"box":[round(x1,1),round(y1,1),round(x2,1),round(y2,1)], "score":round(float(score),4), "label":label})
        if nms_iou_threshold:
            dets = apply_nms(dets, iou_threshold=nms_iou_threshold)
        dets.sort(key=lambda d: d["score"], reverse=True)
        return dets[:max_detections]

    def get_info(self):
        return {"model_name":self.model_name,"model_id":self.model_id,"device":self._dev(),
                "is_loaded":self.is_loaded,"loaded":self.is_loaded,
                "load_error":self.load_error,"available_models":list(MODELS.keys())}
