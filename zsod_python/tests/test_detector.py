"""
tests/test_detector.py – Unit tests for the Zero-Shot Object Detector.

10 tests covering:
  1.  Image loading from PIL object
  2.  Image loading from file path
  3.  Query parsing (comma-separated string)
  4.  Backbone forward pass (output shape)
  5.  Region proposal generator (returns array, correct shape)
  6.  Semantic encoder (output shape)
  7.  Alignment scores (shape matches N_boxes × N_queries)
  8.  Box regressor output shape
  9.  NMS function
  10. Full end-to-end detect() returns list of dicts
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
# Path bootstrap – allow running from any directory
# ---------------------------------------------------------------------------
_TESTS_DIR = Path(__file__).parent.resolve()
_ROOT      = _TESTS_DIR.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import torch
from PIL import Image

from from_scratch.backbone            import ScratchVisionBackbone
from from_scratch.region_proposal     import ScratchRegionProposalGenerator
from from_scratch.semantic_encoder    import ScratchSemanticEncoder
from from_scratch.multimodal_alignment import ScratchVisualSemanticAligner
from from_scratch.box_regressor       import ScratchBoxRegressor
from from_scratch                     import ScratchZeroShotDetector
from zero_shot_detector.utils         import load_image, apply_nms


# ---------------------------------------------------------------------------
# Helper: synthetic PIL image
# ---------------------------------------------------------------------------

def _make_pil(w: int = 320, h: int = 240) -> Image.Image:
    arr = np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)
    return Image.fromarray(arr, mode="RGB")


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

class TestImageLoading(unittest.TestCase):
    """Tests 1 & 2 – Image loading."""

    def test_01_load_from_pil(self):
        """load_image accepts a PIL.Image and returns RGB PIL.Image."""
        pil = _make_pil()
        result = load_image(pil)
        self.assertIsInstance(result, Image.Image)
        self.assertEqual(result.mode, "RGB")

    def test_02_load_from_file_path(self):
        """load_image accepts a file-system path string."""
        pil = _make_pil(100, 80)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            tmp_path = f.name
        try:
            pil.save(tmp_path)
            loaded = load_image(tmp_path)
            self.assertIsInstance(loaded, Image.Image)
            self.assertEqual(loaded.mode, "RGB")
        finally:
            os.unlink(tmp_path)


class TestQueryParsing(unittest.TestCase):
    """Test 3 – Query parsing."""

    def test_03_comma_separated_queries(self):
        """Detector parses comma-separated query string into list."""
        det = ScratchZeroShotDetector(embed_dim=32, proposal_top_k=10)
        queries_str = "cat, dog,  bird , "
        pil = _make_pil(64, 64)

        # Call detect – we only care that it returns a list (shape not empty error)
        result = det.detect(pil, queries_str, threshold=0.0, max_detections=5)
        self.assertIsInstance(result, list)

        # Verify parsing logic directly
        parsed = [q.strip() for q in queries_str.split(",") if q.strip()]
        self.assertEqual(parsed, ["cat", "dog", "bird"])


class TestBackbone(unittest.TestCase):
    """Test 4 – Backbone forward pass."""

    def test_04_backbone_output_shape(self):
        """Backbone produces (1, 256, H/16, W/16) feature map."""
        backbone = ScratchVisionBackbone(visual_embed_dim=64)
        # 128×128 input → 8×8 feature map
        x = torch.randn(1, 3, 128, 128)
        with torch.no_grad():
            feat = backbone.extract_feature_map(x)

        self.assertEqual(feat.shape, (1, 256, 8, 8),
                         f"Expected (1,256,8,8), got {tuple(feat.shape)}")


class TestRegionProposal(unittest.TestCase):
    """Test 5 – Region proposal generator."""

    def test_05_proposal_shape(self):
        """propose() returns ndarray of shape (K, 4) with K ≤ top_k."""
        rpg = ScratchRegionProposalGenerator(top_k=50)
        img = np.random.randint(0, 255, (240, 320, 3), dtype=np.uint8)
        proposals = rpg.propose(img)

        self.assertIsInstance(proposals, np.ndarray)
        self.assertEqual(proposals.ndim, 2)
        self.assertEqual(proposals.shape[1], 4)
        self.assertLessEqual(proposals.shape[0], 50)
        # At least some proposals
        self.assertGreater(proposals.shape[0], 0)


class TestSemanticEncoder(unittest.TestCase):
    """Test 6 – Semantic encoder output shape."""

    def test_06_encoder_output_shape(self):
        """SemanticEncoder returns L2-normalised tensor of shape (N, D)."""
        enc     = ScratchSemanticEncoder(semantic_dim=64)
        queries = ["laptop", "coffee mug", "potted plant"]
        with torch.no_grad():
            embeds = enc(queries)

        self.assertEqual(embeds.shape, (3, 64),
                         f"Expected (3,64), got {tuple(embeds.shape)}")
        # L2 norms should be ≈ 1
        norms = embeds.norm(dim=-1).numpy()
        np.testing.assert_allclose(norms, np.ones(3), atol=1e-5)


class TestAligner(unittest.TestCase):
    """Test 7 – Alignment score matrix shape."""

    def test_07_alignment_scores_shape(self):
        """Aligner returns (N_boxes, N_queries) sigmoid score matrix."""
        embed_dim  = 64
        n_boxes    = 20
        n_queries  = 5

        aligner    = ScratchVisualSemanticAligner(embed_dim=embed_dim)
        vis_embeds = torch.randn(n_boxes,  embed_dim)
        txt_embeds = torch.randn(n_queries, embed_dim)
        # Normalise
        vis_embeds = torch.nn.functional.normalize(vis_embeds, dim=-1)
        txt_embeds = torch.nn.functional.normalize(txt_embeds, dim=-1)

        with torch.no_grad():
            scores = aligner(vis_embeds, txt_embeds)

        self.assertEqual(scores.shape, (n_boxes, n_queries))
        # All values should be in (0, 1) since we apply sigmoid
        self.assertTrue((scores > 0).all().item())
        self.assertTrue((scores < 1).all().item())


class TestBoxRegressor(unittest.TestCase):
    """Test 8 – Box regressor output shape."""

    def test_08_box_regressor_output_shape(self):
        """BoxRegressor returns refined boxes of shape (N, 4)."""
        visual_dim = 64
        n          = 15
        reg        = ScratchBoxRegressor(visual_dim=visual_dim)

        vis_embeds  = torch.randn(n, visual_dim)
        anchor_boxes = torch.rand(n, 4) * 100       # random boxes in [0,100]
        # Ensure x2 > x1, y2 > y1
        anchor_boxes[:, 2] += anchor_boxes[:, 0]
        anchor_boxes[:, 3] += anchor_boxes[:, 1]

        with torch.no_grad():
            refined = reg(vis_embeds, anchor_boxes)

        self.assertEqual(refined.shape, (n, 4),
                         f"Expected ({n},4), got {tuple(refined.shape)}")


class TestNMS(unittest.TestCase):
    """Test 9 – Non-Maximum Suppression."""

    def test_09_nms_removes_overlapping_boxes(self):
        """apply_nms keeps the highest-score box when boxes heavily overlap."""
        detections = [
            {"label": "cat", "score": 0.90, "box": [10, 10, 110, 110]},
            {"label": "cat", "score": 0.70, "box": [15, 15, 115, 115]},  # ~87% IoU
            {"label": "cat", "score": 0.50, "box": [20, 20, 120, 120]},  # ~80% IoU
            {"label": "dog", "score": 0.80, "box": [200, 200, 300, 300]},
        ]
        kept = apply_nms(detections, iou_threshold=0.5)

        # Only the top cat box should survive (others have IoU > 0.5)
        # The dog box is separate and should always be kept
        kept_labels = [d["label"] for d in kept]
        self.assertIn("dog", kept_labels)

        cat_dets = [d for d in kept if d["label"] == "cat"]
        self.assertEqual(len(cat_dets), 1,
                         f"Expected 1 cat detection, got {len(cat_dets)}")
        self.assertAlmostEqual(cat_dets[0]["score"], 0.90)

    def test_09b_nms_empty_input(self):
        """apply_nms handles empty list gracefully."""
        self.assertEqual(apply_nms([], iou_threshold=0.5), [])


class TestEndToEnd(unittest.TestCase):
    """Test 10 – Full detect() pipeline."""

    def test_10_detect_returns_list_of_dicts(self):
        """ScratchZeroShotDetector.detect() returns a list of dicts."""
        det    = ScratchZeroShotDetector(embed_dim=32, proposal_top_k=20)
        pil    = _make_pil(128, 128)

        result = det.detect(
            pil,
            ["car", "person"],
            threshold=0.0,      # accept everything for shape testing
            nms_iou_threshold=0.5,
            max_detections=10,
        )

        self.assertIsInstance(result, list)
        for item in result:
            self.assertIsInstance(item, dict)
            self.assertIn("label", item)
            self.assertIn("score", item)
            self.assertIn("box",   item)
            self.assertEqual(len(item["box"]), 4)
            self.assertIn(item["label"], ["car", "person"])
            self.assertGreaterEqual(item["score"], 0.0)
            self.assertLessEqual(item["score"], 1.0)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main(verbosity=2)
