"""
zero_shot_detector.py – Master assembler for the from-scratch ZSOD pipeline.

Full inference pipeline
-----------------------
1.  preprocess_image  → normalised (3,H,W) tensor
2.  backbone.extract_feature_map → (1, 256, Hf, Wf)
3.  proposal_generator.propose   → (K, 4) numpy anchors
4.  backbone.extract_roi_embeddings → (K, embed_dim) visual embeds
5.  text_encoder(query_list)     → (Q, embed_dim) text embeds
6.  aligner(visual, text)        → (K, Q) score matrix
7.  box_regressor(visual, anchors) → (K, 4) refined boxes
8.  Scale refined boxes to original image size
9.  Filter by threshold: keep best-query score per box if score ≥ threshold
10. Per-class NMS (iou_threshold)
11. Per-class top-3 cap
12. Return sorted list of detection dicts
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from typing import List, Dict, Any, Optional, Union

from .backbone          import ScratchVisionBackbone
from .region_proposal   import ScratchRegionProposalGenerator
from .semantic_encoder  import ScratchSemanticEncoder
from .multimodal_alignment import ScratchVisualSemanticAligner
from .box_regressor     import ScratchBoxRegressor


# ImageNet normalisation constants
_IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
_IMAGENET_STD  = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)


# ---------------------------------------------------------------------------
# NMS helper (kept local to avoid circular imports)
# ---------------------------------------------------------------------------

def _compute_iou_matrix(boxes: np.ndarray) -> np.ndarray:
    """Compute pairwise IoU matrix for (N, 4) boxes [x1,y1,x2,y2]."""
    x1 = boxes[:, 0]; y1 = boxes[:, 1]
    x2 = boxes[:, 2]; y2 = boxes[:, 3]
    areas = (x2 - x1).clip(0) * (y2 - y1).clip(0)

    n = len(boxes)
    iou = np.zeros((n, n), dtype=np.float32)
    for i in range(n):
        for j in range(i + 1, n):
            ix1 = max(x1[i], x1[j]); iy1 = max(y1[i], y1[j])
            ix2 = min(x2[i], x2[j]); iy2 = min(y2[i], y2[j])
            inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
            union = areas[i] + areas[j] - inter
            if union > 0:
                iou[i, j] = iou[j, i] = inter / union
    return iou


def _apply_nms_local(
    detections: List[Dict],
    iou_threshold: float,
) -> List[Dict]:
    """Per-class greedy NMS."""
    if not detections:
        return []

    # Group by label
    by_label: Dict[str, List[Dict]] = {}
    for d in detections:
        by_label.setdefault(d["label"], []).append(d)

    kept: List[Dict] = []
    for label, dets in by_label.items():
        # Sort descending by score
        dets = sorted(dets, key=lambda x: x["score"], reverse=True)
        boxes = np.array([d["box"] for d in dets], dtype=np.float32)

        suppressed = [False] * len(dets)
        for i in range(len(dets)):
            if suppressed[i]:
                continue
            kept.append(dets[i])
            for j in range(i + 1, len(dets)):
                if suppressed[j]:
                    continue
                b1 = boxes[i]; b2 = boxes[j]
                ix1 = max(b1[0], b2[0]); iy1 = max(b1[1], b2[1])
                ix2 = min(b1[2], b2[2]); iy2 = min(b1[3], b2[3])
                inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
                a1 = (b1[2]-b1[0])*(b1[3]-b1[1])
                a2 = (b2[2]-b2[0])*(b2[3]-b2[1])
                union = a1 + a2 - inter
                if union > 0 and inter / union > iou_threshold:
                    suppressed[j] = True

    return kept


# ---------------------------------------------------------------------------
# Main detector class
# ---------------------------------------------------------------------------

class ScratchZeroShotDetector(torch.nn.Module):
    """
    End-to-end from-scratch Zero-Shot Object Detector.

    Parameters
    ----------
    embed_dim : int
        Common visual/semantic embedding dimensionality (default 128).
    proposal_top_k : int
        Maximum number of region proposals (default 120).
    device : str or torch.device, optional
        Target device.  Defaults to CPU.
    """

    STRIDE: int = 16  # backbone stride

    def __init__(
        self,
        embed_dim: int = 128,
        proposal_top_k: int = 120,
        device: Optional[Union[str, torch.device]] = None,
    ) -> None:
        super().__init__()

        if device is None:
            device = torch.device("cpu")
        self.device = torch.device(device)

        self.embed_dim = embed_dim

        # Sub-modules
        self.backbone         = ScratchVisionBackbone(visual_embed_dim=embed_dim)
        self.proposal_gen     = ScratchRegionProposalGenerator(top_k=proposal_top_k)
        self.text_encoder     = ScratchSemanticEncoder(semantic_dim=embed_dim)
        self.aligner          = ScratchVisualSemanticAligner(embed_dim=embed_dim)
        self.box_regressor    = ScratchBoxRegressor(visual_dim=embed_dim)

        # Move all parameters to device
        self.to(self.device)
        self.eval()

    # ------------------------------------------------------------------
    # Pre-processing
    # ------------------------------------------------------------------

    def preprocess_image(self, pil_image: Image.Image) -> torch.Tensor:
        """
        Normalise and prepare a PIL image for inference.

        Steps
        -----
        1. Convert to RGB.
        2. Resize both H and W to the nearest multiple of 32 (min 32).
        3. Convert to float32 tensor in [0, 1].
        4. Normalise with ImageNet mean/std.

        Parameters
        ----------
        pil_image : PIL.Image.Image

        Returns
        -------
        torch.Tensor
            Shape (3, H', W') on ``self.device``.
        """
        img = pil_image.convert("RGB")

        # Round to nearest multiple of 32
        w, h = img.size
        new_w = max(32, round(w / 32) * 32)
        new_h = max(32, round(h / 32) * 32)
        if (new_w, new_h) != (w, h):
            img = img.resize((new_w, new_h), Image.BILINEAR)

        # → float tensor (3, H, W) in [0,1]
        arr = np.array(img, dtype=np.float32) / 255.0          # (H, W, 3)
        tensor = torch.from_numpy(arr).permute(2, 0, 1)         # (3, H, W)

        # ImageNet normalise
        mean = _IMAGENET_MEAN.to(tensor.device)
        std  = _IMAGENET_STD.to(tensor.device)
        tensor = (tensor - mean) / std

        return tensor.to(self.device)

    # ------------------------------------------------------------------
    # Detection pipeline
    # ------------------------------------------------------------------

    @torch.no_grad()
    def detect(
        self,
        image: Union[Image.Image, str, np.ndarray],
        queries: Union[List[str], str],
        threshold: float = 0.35,
        nms_iou_threshold: float = 0.25,
        max_detections: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Run the full zero-shot detection pipeline.

        Parameters
        ----------
        image : PIL.Image, file-path str, or numpy RGB array
        queries : list of text query strings, or comma-separated string
        threshold : float
            Minimum alignment score to keep a detection.
        nms_iou_threshold : float
            IoU threshold for per-class NMS.
        max_detections : int
            Hard cap on total detections returned.

        Returns
        -------
        list of dict
            Each dict has keys: label, score, box [x1,y1,x2,y2].
            Sorted by score descending.
        """
        # --- Parse image ---
        if isinstance(image, str):
            pil_img = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            pil_img = Image.fromarray(image.astype(np.uint8)).convert("RGB")
        else:
            pil_img = image.convert("RGB")

        orig_w, orig_h = pil_img.size

        # --- Parse queries ---
        if isinstance(queries, str):
            queries = [q.strip() for q in queries.split(",") if q.strip()]
        if not queries:
            return []

        # --- Step 1: preprocess ---
        img_tensor = self.preprocess_image(pil_img)         # (3, H', W')
        _, H, W = img_tensor.shape

        # --- Step 2: feature map ---
        feat_map = self.backbone.extract_feature_map(img_tensor)  # (1, 256, Hf, Wf)

        # --- Step 3: proposals (uses numpy image) ---
        np_img = np.array(pil_img.resize((W, H), Image.BILINEAR))
        anchors_np = self.proposal_gen.propose(np_img)      # (K, 4)

        if len(anchors_np) == 0:
            return []

        anchors_tensor = torch.from_numpy(anchors_np).to(self.device)  # (K, 4)

        # --- Step 4: RoI embeddings ---
        spatial_scale = 1.0 / self.STRIDE
        visual_embeds = self.backbone.extract_roi_embeddings(
            feat_map, anchors_tensor, spatial_scale
        )  # (K, embed_dim)

        # --- Step 5: text embeddings ---
        text_embeds = self.text_encoder(queries)             # (Q, embed_dim)

        # --- Step 6: alignment scores ---
        scores_matrix = self.aligner(visual_embeds, text_embeds)  # (K, Q)

        # --- Step 7: box regression ---
        refined_boxes = self.box_regressor(visual_embeds, anchors_tensor)  # (K, 4)

        # --- Step 8: scale boxes to original image size ---
        scale_x = orig_w / W
        scale_y = orig_h / H
        rb_np = refined_boxes.cpu().numpy()
        rb_np[:, 0] *= scale_x;  rb_np[:, 2] *= scale_x
        rb_np[:, 1] *= scale_y;  rb_np[:, 3] *= scale_y

        # Clip to original image bounds
        rb_np[:, 0] = np.clip(rb_np[:, 0], 0, orig_w)
        rb_np[:, 1] = np.clip(rb_np[:, 1], 0, orig_h)
        rb_np[:, 2] = np.clip(rb_np[:, 2], 0, orig_w)
        rb_np[:, 3] = np.clip(rb_np[:, 3], 0, orig_h)

        # --- Step 9: filter by threshold ---
        scores_np = scores_matrix.cpu().numpy()              # (K, Q)
        best_query_idx = scores_np.argmax(axis=1)            # (K,)
        best_scores    = scores_np[np.arange(len(scores_np)), best_query_idx]

        detections: List[Dict] = []
        for i, (score, qidx) in enumerate(zip(best_scores, best_query_idx)):
            if score < threshold:
                continue
            box = rb_np[i]
            if box[2] - box[0] < 2 or box[3] - box[1] < 2:
                continue
            detections.append({
                "label": queries[qidx],
                "score": float(score),
                "box":   [float(box[0]), float(box[1]),
                           float(box[2]), float(box[3])],
            })

        # --- Step 10: NMS ---
        detections = _apply_nms_local(detections, nms_iou_threshold)

        # --- Step 11: per-class top-3 cap ---
        by_label: Dict[str, List[Dict]] = {}
        for d in detections:
            by_label.setdefault(d["label"], []).append(d)

        capped: List[Dict] = []
        for label, dets in by_label.items():
            dets_sorted = sorted(dets, key=lambda x: x["score"], reverse=True)
            capped.extend(dets_sorted[:3])

        # --- Step 12: sort and cap total ---
        capped.sort(key=lambda x: x["score"], reverse=True)
        return capped[:max_detections]
