"""
zero_shot_detector.py (from_scratch) - Full pipeline assembling all components.
"""
from __future__ import annotations
import sys
from pathlib import Path
_HERE = Path(__file__).parent.parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import numpy as np, torch, torch.nn as nn
from PIL import Image
from typing import List, Dict, Any, Union, Optional

from .backbone           import ScratchVisionBackbone
from .region_proposal    import ScratchRegionProposalGenerator
from .semantic_encoder   import ScratchSemanticEncoder
from .multimodal_alignment import ScratchVisualSemanticAligner
from .box_regressor      import ScratchBoxRegressor
from zero_shot_detector.utils import apply_nms, load_image


class ScratchZeroShotDetector(nn.Module):
    def __init__(self, embed_dim=128, proposal_top_k=100, device=None):
        super().__init__()
        self.embed_dim = embed_dim
        self.device    = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.backbone  = ScratchVisionBackbone(visual_embed_dim=embed_dim)
        self.proposals = ScratchRegionProposalGenerator(top_k=proposal_top_k)
        self.text_enc  = ScratchSemanticEncoder(semantic_dim=embed_dim)
        self.aligner   = ScratchVisualSemanticAligner(embed_dim=embed_dim)
        self.box_reg   = ScratchBoxRegressor(visual_dim=embed_dim)
        self.to(self.device)
        self.eval()

    def _preprocess(self, pil: Image.Image):
        w, h = pil.size
        nw = max(32,(w//32)*32); nh = max(32,(h//32)*32)
        pil = pil.resize((nw,nh), Image.BILINEAR)
        arr = np.array(pil).astype(np.float32)
        mean = np.array([0.485,0.456,0.406])*255
        std  = np.array([0.229,0.224,0.225])*255
        arr  = (arr - mean) / std
        t = torch.from_numpy(arr.transpose(2,0,1)).unsqueeze(0).to(self.device)
        return t, arr

    @torch.no_grad()
    def detect(self, image, queries, threshold=0.35, nms_iou_threshold=0.3, max_detections=30):
        pil = load_image(image) if not isinstance(image, Image.Image) else image
        orig_w, orig_h = pil.size
        img_t, arr     = self._preprocess(pil)
        cur_h, cur_w   = arr.shape[:2]

        fmap    = self.backbone.extract_feature_map(img_t)
        anchors = self.proposals.propose(arr)
        if len(anchors) == 0:
            return []

        anc_t   = torch.from_numpy(anchors).to(self.device)
        vis_emb = self.backbone.extract_roi_embeddings(fmap, anc_t, 1.0/16.0)
        txt_emb = self.text_enc(queries if isinstance(queries,list) else [queries])
        scores  = self.aligner(vis_emb, txt_emb)
        boxes   = self.box_reg(vis_emb, anc_t)

        sx, sy = orig_w/cur_w, orig_h/cur_h
        dets = []
        for i in range(len(anchors)):
            bx = boxes[i].cpu().numpy()
            x1 = max(0, float(bx[0]*sx)); y1 = max(0, float(bx[1]*sy))
            x2 = min(orig_w, float(bx[2]*sx)); y2 = min(orig_h, float(bx[3]*sy))
            if x2-x1 < 5 or y2-y1 < 5:
                continue
            sc_row = scores[i].cpu().numpy()
            best_q = int(np.argmax(sc_row)); best_s = float(sc_row[best_q])
            q_list = queries if isinstance(queries,list) else [queries]
            if best_s >= threshold:
                dets.append({"box":[round(x1,1),round(y1,1),round(x2,1),round(y2,1)],
                             "score":round(best_s,4), "label":q_list[best_q]})

        if nms_iou_threshold:
            dets = apply_nms(dets, iou_threshold=nms_iou_threshold)

        per_cls: Dict[str,list] = {}
        for d in dets:
            per_cls.setdefault(d["label"],[]).append(d)
        out = []
        for cls_dets in per_cls.values():
            out.extend(sorted(cls_dets, key=lambda d:d["score"], reverse=True)[:3])
        out.sort(key=lambda d:d["score"], reverse=True)
        return out[:max_detections]
