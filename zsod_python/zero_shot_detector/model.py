"""
model.py – Unified model interface for Zero-Shot Object Detection.

Supported backends
------------------
"from-scratch" : Fully self-contained from_scratch.ScratchZeroShotDetector
"owlvit-base"  : google/owlvit-base-patch32  (HuggingFace Transformers)
"owlv2-base"   : google/owlv2-base-patch16-ensemble  (HuggingFace Transformers)

All backends expose the same ``detect()`` signature.

If HuggingFace weights are unavailable (no network / not installed),
``_detect_fallback()`` is used automatically and returns demo heuristic boxes.
"""

from __future__ import annotations

import time
import warnings
from typing import Any, Dict, List, Optional, Union

import numpy as np
from PIL import Image

# Transformers is optional
try:
    from transformers import (
        OwlViTProcessor,
        OwlViTForObjectDetection,
        Owlv2Processor,
        Owlv2ForObjectDetection,
    )
    _TRANSFORMERS_AVAILABLE = True
except ImportError:
    _TRANSFORMERS_AVAILABLE = False

from .utils import apply_nms


# ---------------------------------------------------------------------------
# HuggingFace model registry
# ---------------------------------------------------------------------------

_HF_REGISTRY: Dict[str, Dict[str, Any]] = {
    "owlvit-base": {
        "model_id":        "google/owlvit-base-patch32",
        "processor_class": "OwlViTProcessor",
        "model_class":     "OwlViTForObjectDetection",
    },
    "owlv2-base": {
        "model_id":        "google/owlv2-base-patch16-ensemble",
        "processor_class": "Owlv2Processor",
        "model_class":     "Owlv2ForObjectDetection",
    },
}

_SUPPORTED_MODELS = ["from-scratch"] + list(_HF_REGISTRY.keys())


class ZeroShotObjectDetector:
    """
    Unified zero-shot object detector with multiple backend support.

    Parameters
    ----------
    model_name : str
        One of ``"from-scratch"``, ``"owlvit-base"``, ``"owlv2-base"``.
    lazy_load : bool
        If True, skip loading the model weights at construction time.
        The first call to ``detect()`` will trigger loading.
    device : str, optional
        Target device (``"cpu"`` / ``"cuda"``).  Defaults to CPU.
    """

    def __init__(
        self,
        model_name: str = "from-scratch",
        lazy_load: bool = True,
        device: str = "cpu",
    ) -> None:
        if model_name not in _SUPPORTED_MODELS:
            raise ValueError(
                f"Unknown model '{model_name}'. "
                f"Choose from {_SUPPORTED_MODELS}."
            )
        self.model_name = model_name
        self.device     = device
        self.lazy_load  = lazy_load

        self._model      = None
        self._processor  = None
        self._loaded     = False
        self._load_error: Optional[str] = None

        if not lazy_load:
            self._load_model()

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        """Load model weights.  Sets ``self._loaded`` and ``self._load_error``."""
        if self._loaded:
            return

        try:
            if self.model_name == "from-scratch":
                from from_scratch import ScratchZeroShotDetector
                self._model  = ScratchZeroShotDetector(device=self.device)
                self._loaded = True

            elif self.model_name in _HF_REGISTRY:
                if not _TRANSFORMERS_AVAILABLE:
                    raise ImportError(
                        "transformers package not installed. "
                        "Run: pip install transformers"
                    )
                cfg      = _HF_REGISTRY[self.model_name]
                mid      = cfg["model_id"]
                proc_cls = cfg["processor_class"]
                mod_cls  = cfg["model_class"]

                import transformers
                proc  = getattr(transformers, proc_cls).from_pretrained(mid)
                model = getattr(transformers, mod_cls).from_pretrained(mid)
                model.eval()

                self._processor = proc
                self._model     = model
                self._loaded    = True

        except Exception as exc:
            self._load_error = str(exc)
            warnings.warn(
                f"[ZeroShotObjectDetector] Could not load '{self.model_name}': "
                f"{exc}\nFalling back to heuristic demo mode.",
                RuntimeWarning,
                stacklevel=2,
            )

    # ------------------------------------------------------------------
    # Detection backends
    # ------------------------------------------------------------------

    def _detect_transformers(
        self,
        image: Image.Image,
        queries: List[str],
        threshold: float,
        nms_iou_threshold: float,
        max_detections: int,
    ) -> List[Dict[str, Any]]:
        """
        Detection via HuggingFace OWL-ViT / OWLv2 pipeline.
        """
        import torch

        inputs = self._processor(
            text=[queries],
            images=image,
            return_tensors="pt",
        )

        with torch.no_grad():
            outputs = self._model(**inputs)

        target_sizes = torch.tensor([[image.height, image.width]])
        results      = self._processor.post_process_grounded_object_detection(
            outputs=outputs,
            target_sizes=target_sizes,
            threshold=threshold,
        )[0]

        detections: List[Dict[str, Any]] = []
        boxes  = results["boxes"].tolist()
        labels = results["labels"].tolist()
        scores = results["scores"].tolist()

        for box, label_idx, score in zip(boxes, labels, scores):
            if score < threshold:
                continue
            # label_idx is an index into the flat queries list
            label = queries[label_idx] if label_idx < len(queries) else "unknown"
            x1, y1, x2, y2 = box
            detections.append({
                "label": label,
                "score": float(score),
                "box":   [float(x1), float(y1), float(x2), float(y2)],
            })

        detections = apply_nms(detections, iou_threshold=nms_iou_threshold)
        detections.sort(key=lambda d: d["score"], reverse=True)
        return detections[:max_detections]

    def _detect_fallback(
        self,
        image: Image.Image,
        queries: List[str],
        threshold: float,
        max_detections: int,
    ) -> List[Dict[str, Any]]:
        """
        Heuristic fallback when model weights are unavailable.

        Places evenly-spaced demo boxes across the image for each query,
        with synthetic confidence scores.  Useful for UI testing.
        """
        w, h = image.size
        detections: List[Dict[str, Any]] = []
        n = len(queries)

        for qi, query in enumerate(queries):
            # Create 2 boxes per query at different image positions
            for k in range(2):
                offset_x = (qi * 150 + k * 60) % (w - 100)
                offset_y = (qi * 100 + k * 80) % (h - 100)
                bw = max(80, min(200, w // 4))
                bh = max(60, min(150, h // 4))
                x1 = float(offset_x)
                y1 = float(offset_y)
                x2 = float(min(x1 + bw, w - 1))
                y2 = float(min(y1 + bh, h - 1))
                # Synthetic score that varies
                score = max(threshold, 0.4 - qi * 0.03 - k * 0.05)

                detections.append({
                    "label": query,
                    "score": round(score, 3),
                    "box":   [x1, y1, x2, y2],
                })

        detections.sort(key=lambda d: d["score"], reverse=True)
        return detections[:max_detections]

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def detect(
        self,
        image: Union[Image.Image, str, np.ndarray],
        queries: Union[List[str], str],
        threshold: float = 0.35,
        nms_iou_threshold: float = 0.25,
        max_detections: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Run zero-shot object detection.

        Parameters
        ----------
        image : PIL.Image | str (path) | np.ndarray
        queries : list of str or comma-separated string
        threshold : float   – confidence score threshold
        nms_iou_threshold : float
        max_detections : int

        Returns
        -------
        list of dict  – {label, score, box [x1,y1,x2,y2]}
        """
        # Ensure model is loaded
        if not self._loaded:
            self._load_model()

        # Normalise image
        if isinstance(image, str):
            pil_img = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            pil_img = Image.fromarray(image.astype(np.uint8)).convert("RGB")
        else:
            pil_img = image.convert("RGB")

        # Normalise queries
        if isinstance(queries, str):
            queries = [q.strip() for q in queries.split(",") if q.strip()]
        if not queries:
            return []

        # Route to correct backend
        if self._load_error or not self._loaded:
            return self._detect_fallback(pil_img, queries, threshold, max_detections)

        if self.model_name == "from-scratch":
            return self._model.detect(
                pil_img, queries,
                threshold=threshold,
                nms_iou_threshold=nms_iou_threshold,
                max_detections=max_detections,
            )

        elif self.model_name in _HF_REGISTRY:
            try:
                return self._detect_transformers(
                    pil_img, queries,
                    threshold=threshold,
                    nms_iou_threshold=nms_iou_threshold,
                    max_detections=max_detections,
                )
            except Exception as exc:
                warnings.warn(
                    f"Transformers inference failed ({exc}); using fallback.",
                    RuntimeWarning,
                )
                return self._detect_fallback(
                    pil_img, queries, threshold, max_detections
                )

        return []

    def switch_model(self, model_name: str) -> None:
        """
        Switch to a different backend.

        Parameters
        ----------
        model_name : str
            One of the supported model names.
        """
        if model_name not in _SUPPORTED_MODELS:
            raise ValueError(
                f"Unknown model '{model_name}'. Choose from {_SUPPORTED_MODELS}."
            )
        self.model_name  = model_name
        self._model      = None
        self._processor  = None
        self._loaded     = False
        self._load_error = None
        self._load_model()

    def get_info(self) -> Dict[str, Any]:
        """
        Return status information about the current model.

        Returns
        -------
        dict with keys: model_name, loaded, device, error, supported_models.
        """
        return {
            "model_name":       self.model_name,
            "loaded":           self._loaded,
            "device":           self.device,
            "error":            self._load_error,
            "supported_models": _SUPPORTED_MODELS,
            "transformers_available": _TRANSFORMERS_AVAILABLE,
        }
