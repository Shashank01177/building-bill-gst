"""
train_from_scratch.py – Training demonstration for the from-scratch ZSOD.

Demonstrates zero-shot generalisation:
  Seen classes   : car, person, dog, chair
  Unseen classes : laptop, coffee mug, potted plant, traffic light

The script synthesises random training batches (random coloured image patches
as stand-ins for real images, random 128-dim visual features, and seen-class
text labels) and trains the full from_scratch model for a configurable number
of epochs, then runs inference on a synthetic image with unseen-class queries.

Usage:
  python train_from_scratch.py          # 4 epochs (default)
  python train_from_scratch.py 10       # 10 epochs
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_HERE = Path(__file__).parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageDraw

from from_scratch.backbone            import ScratchVisionBackbone
from from_scratch.semantic_encoder    import ScratchSemanticEncoder
from from_scratch.multimodal_alignment import ScratchVisualSemanticAligner
from from_scratch.box_regressor       import ScratchBoxRegressor
from from_scratch.loss                import ZeroShotDetectionLoss
from from_scratch                     import ScratchZeroShotDetector

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SEEN_CLASSES   = ["car", "person", "dog", "chair"]
UNSEEN_CLASSES = ["laptop", "coffee mug", "potted plant", "traffic light"]

EMBED_DIM     = 128
BATCH_SIZE    = 8
STEPS_PER_EPOCH = 20
LR            = 1e-3
DEVICE        = torch.device("cpu")
SAVE_PATH     = _HERE / "scratch_model.pth"

DEFAULT_EPOCHS = 4


# ---------------------------------------------------------------------------
# Synthetic data
# ---------------------------------------------------------------------------

def synth_visual_features(n: int, embed_dim: int) -> torch.Tensor:
    """Random L2-normalised visual feature vectors."""
    v = torch.randn(n, embed_dim, device=DEVICE)
    return F.normalize(v, p=2, dim=-1)


def synth_boxes(n: int, img_size: int = 224) -> torch.Tensor:
    """Random bounding boxes in [x1, y1, x2, y2] format."""
    xy1 = torch.rand(n, 2) * (img_size * 0.6)
    wh  = torch.rand(n, 2) * (img_size * 0.3) + 20
    xy2 = torch.clamp(xy1 + wh, 0, img_size - 1)
    return torch.cat([xy1, xy2], dim=1).to(DEVICE)


def make_synthetic_image(size: tuple[int, int] = (640, 480)) -> Image.Image:
    """Create a colourful synthetic test image with simple shapes."""
    img  = Image.new("RGB", size, color=(200, 210, 220))
    draw = ImageDraw.Draw(img)
    # Bright rectangles to simulate objects
    draw.rectangle([50,  50,  250, 180], fill=(220, 60,  60),  outline=(150,20,20), width=3)
    draw.rectangle([300, 80,  500, 240], fill=(60,  120, 220), outline=(20,80,160), width=3)
    draw.ellipse   ([150, 280, 350, 400], fill=(60,  200, 80),  outline=(20,140,40),width=3)
    draw.rectangle ([400, 300, 580, 430], fill=(220, 180, 50),  outline=(160,120,10),width=3)
    return img


# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------

def build_models():
    """Instantiate all sub-modules."""
    backbone  = ScratchVisionBackbone(visual_embed_dim=EMBED_DIM).to(DEVICE)
    text_enc  = ScratchSemanticEncoder(semantic_dim=EMBED_DIM).to(DEVICE)
    aligner   = ScratchVisualSemanticAligner(embed_dim=EMBED_DIM).to(DEVICE)
    regressor = ScratchBoxRegressor(visual_dim=EMBED_DIM).to(DEVICE)
    return backbone, text_enc, aligner, regressor


def train(n_epochs: int = DEFAULT_EPOCHS) -> None:
    print("=" * 60)
    print("  Zero-Shot Object Detector – Training from Scratch")
    print(f"  Seen:   {SEEN_CLASSES}")
    print(f"  Unseen: {UNSEEN_CLASSES}")
    print(f"  Epochs: {n_epochs}  |  Steps/epoch: {STEPS_PER_EPOCH}")
    print("=" * 60)

    backbone, text_enc, aligner, regressor = build_models()

    all_params = (
        list(backbone.parameters())
        + list(text_enc.parameters())
        + list(aligner.parameters())
        + list(regressor.parameters())
    )
    optimiser = torch.optim.AdamW(all_params, lr=LR, weight_decay=1e-4)
    criterion = ZeroShotDetectionLoss(lambda_box=0.5)

    backbone.train(); text_enc.train(); aligner.train(); regressor.train()

    t_start = time.time()

    for epoch in range(1, n_epochs + 1):
        epoch_total = 0.0
        epoch_nce   = 0.0
        epoch_box   = 0.0

        for step in range(STEPS_PER_EPOCH):
            # Randomly pick B seen classes as the batch queries
            indices = np.random.choice(len(SEEN_CLASSES), BATCH_SIZE, replace=True)
            query_list = [SEEN_CLASSES[i] for i in indices]

            # Synthetic visual embeddings (simulate backbone+RoI output)
            vis_embeds  = synth_visual_features(BATCH_SIZE, EMBED_DIM)

            # Text embeddings for the batch queries
            txt_embeds  = text_enc(query_list)                # (B, embed_dim)

            # Ground-truth boxes and synthetic predicted boxes
            gt_boxes    = synth_boxes(BATCH_SIZE)
            pred_boxes  = regressor(vis_embeds, gt_boxes)     # refined

            # Loss
            losses = criterion(vis_embeds, txt_embeds, pred_boxes, gt_boxes)
            loss   = losses["total"]

            optimiser.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(all_params, 1.0)
            optimiser.step()

            epoch_total += losses["total"].item()
            epoch_nce   += losses["infonce"].item()
            epoch_box   += losses["box"].item()

        avg_total = epoch_total / STEPS_PER_EPOCH
        avg_nce   = epoch_nce   / STEPS_PER_EPOCH
        avg_box   = epoch_box   / STEPS_PER_EPOCH
        elapsed   = time.time() - t_start

        print(
            f"  Epoch [{epoch:>2}/{n_epochs}]  "
            f"Total: {avg_total:.4f}  "
            f"InfoNCE: {avg_nce:.4f}  "
            f"Box: {avg_box:.4f}  "
            f"({elapsed:.1f}s)"
        )

    print("\n  Training complete.")

    # Save model weights
    state = {
        "backbone":  backbone.state_dict(),
        "text_enc":  text_enc.state_dict(),
        "aligner":   aligner.state_dict(),
        "regressor": regressor.state_dict(),
        "embed_dim": EMBED_DIM,
    }
    torch.save(state, str(SAVE_PATH))
    print(f"  Model saved → {SAVE_PATH}\n")

    # -------------------------------------------------------------------
    # Zero-shot inference on UNSEEN classes
    # -------------------------------------------------------------------
    print("─" * 60)
    print("  Zero-shot inference with UNSEEN class queries")
    print(f"  Queries: {UNSEEN_CLASSES}")
    print("─" * 60)

    backbone.eval(); text_enc.eval(); aligner.eval(); regressor.eval()

    detector = ScratchZeroShotDetector(embed_dim=EMBED_DIM, device=DEVICE)
    # Inject our trained weights into the detector sub-modules
    detector.backbone.load_state_dict(backbone.state_dict())
    detector.text_encoder.load_state_dict(text_enc.state_dict())
    detector.aligner.load_state_dict(aligner.state_dict())
    detector.box_regressor.load_state_dict(regressor.state_dict())

    test_img = make_synthetic_image()
    dets     = detector.detect(
        test_img, UNSEEN_CLASSES,
        threshold=0.1,          # low threshold for synthetic data
        nms_iou_threshold=0.3,
        max_detections=10,
    )

    if dets:
        print(f"\n  Detected {len(dets)} object(s):\n")
        for d in dets:
            print(f"    {d['label']:25s}  score={d['score']:.4f}  "
                  f"box=[{', '.join(f'{v:.0f}' for v in d['box'])}]")
    else:
        print("\n  No detections above threshold (expected for random weights).")
        print("  Train for more epochs or on real data for meaningful results.")

    print("\n  Done. ✓\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    n_epochs = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_EPOCHS
    train(n_epochs)
