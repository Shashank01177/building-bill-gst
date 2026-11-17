"""
evaluator.py – Evaluation suite for Zero-Shot Object Detection.

Provides
--------
ZeroShotEvaluator – computes per-class and aggregate metrics.

Metrics
-------
precision, recall, F1 at a given IoU threshold.
Average Precision (AP) via 11-point interpolation.
mAP averaged over IoU thresholds 0.50 → 0.95 step 0.05 (COCO-style).
"""

from __future__ import annotations

import numpy as np
from typing import Any, Dict, List


class ZeroShotEvaluator:
    """
    Evaluates zero-shot object detection results against ground truth.

    Usage
    -----
    ::

        evaluator = ZeroShotEvaluator()
        metrics   = evaluator.evaluate_detections(gt, preds, iou_threshold=0.5)
        coco_map  = evaluator.compute_coco_map_range(gt, preds)

    Ground-truth / prediction format
    ---------------------------------
    Both ``ground_truth`` and ``predictions`` are lists of dicts with keys:

        - ``label`` : str   – class name
        - ``box``   : list  – [x1, y1, x2, y2]
        - ``score`` : float – confidence (predictions only; ignored for GT)
    """

    # ------------------------------------------------------------------
    # IoU helper
    # ------------------------------------------------------------------

    @staticmethod
    def compute_iou(box1: List[float], box2: List[float]) -> float:
        """
        Compute Intersection-over-Union for two [x1,y1,x2,y2] boxes.

        Parameters
        ----------
        box1, box2 : list of float

        Returns
        -------
        float  – IoU in [0, 1].
        """
        ix1 = max(box1[0], box2[0])
        iy1 = max(box1[1], box2[1])
        ix2 = min(box1[2], box2[2])
        iy2 = min(box1[3], box2[3])

        inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
        a1    = max(0.0, box1[2]-box1[0]) * max(0.0, box1[3]-box1[1])
        a2    = max(0.0, box2[2]-box2[0]) * max(0.0, box2[3]-box2[1])
        union = a1 + a2 - inter
        return float(inter / union) if union > 0 else 0.0

    # ------------------------------------------------------------------
    # AP computation (11-point interpolation)
    # ------------------------------------------------------------------

    def _compute_ap(
        self,
        ground_truth: List[Dict],
        predictions: List[Dict],
        label: str,
        iou_threshold: float,
    ) -> float:
        """
        Compute Average Precision for a single class.

        Uses 11-point VOC-style interpolation.
        """
        gt_boxes  = [d["box"] for d in ground_truth if d["label"] == label]
        pred_dets = [d for d in predictions         if d["label"] == label]

        if not gt_boxes:
            return 0.0
        if not pred_dets:
            return 0.0

        # Sort predictions by score descending
        pred_dets = sorted(pred_dets, key=lambda d: d.get("score", 0.0),
                           reverse=True)

        matched_gt = [False] * len(gt_boxes)
        tp_list: List[int] = []
        fp_list: List[int] = []

        for pred in pred_dets:
            best_iou = 0.0
            best_idx = -1
            for gi, gt_box in enumerate(gt_boxes):
                iou = self.compute_iou(pred["box"], gt_box)
                if iou > best_iou:
                    best_iou = iou
                    best_idx = gi

            if best_iou >= iou_threshold and best_idx >= 0 and not matched_gt[best_idx]:
                tp_list.append(1)
                fp_list.append(0)
                matched_gt[best_idx] = True
            else:
                tp_list.append(0)
                fp_list.append(1)

        tp_cum = np.cumsum(tp_list).astype(float)
        fp_cum = np.cumsum(fp_list).astype(float)
        total_gt = len(gt_boxes)

        recalls    = tp_cum / (total_gt + 1e-9)
        precisions = tp_cum / (tp_cum + fp_cum + 1e-9)

        # 11-point interpolation
        ap = 0.0
        for t in np.linspace(0, 1, 11):
            prec_at_rec = precisions[recalls >= t] if np.any(recalls >= t) else np.array([0.0])
            ap += prec_at_rec.max() / 11.0

        return float(ap)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def evaluate_detections(
        self,
        ground_truth: List[Dict],
        predictions: List[Dict],
        iou_threshold: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Compute detection metrics at a single IoU threshold.

        Parameters
        ----------
        ground_truth : list of dict  (label, box)
        predictions  : list of dict  (label, score, box)
        iou_threshold : float

        Returns
        -------
        dict with keys:
            precision, recall, f1, ap,
            tp, fp, fn,
            per_class (dict label → {precision, recall, f1, ap}).
        """
        if not ground_truth and not predictions:
            return {
                "precision": 1.0, "recall": 1.0, "f1": 1.0, "ap": 1.0,
                "tp": 0, "fp": 0, "fn": 0, "per_class": {},
            }

        all_labels = sorted({d["label"] for d in ground_truth} |
                            {d["label"] for d in predictions})

        total_tp = 0; total_fp = 0; total_fn = 0
        per_class: Dict[str, Dict] = {}
        ap_list: List[float] = []

        for label in all_labels:
            gt_cls   = [d for d in ground_truth if d["label"] == label]
            pred_cls = [d for d in predictions  if d["label"] == label]

            # Sort preds by score
            pred_cls = sorted(pred_cls, key=lambda d: d.get("score", 0.0),
                              reverse=True)

            matched_gt = [False] * len(gt_cls)
            tp = 0; fp = 0

            for pred in pred_cls:
                best_iou = 0.0; best_idx = -1
                for gi, gt in enumerate(gt_cls):
                    iou = self.compute_iou(pred["box"], gt["box"])
                    if iou > best_iou:
                        best_iou = iou; best_idx = gi
                if best_iou >= iou_threshold and best_idx >= 0 and not matched_gt[best_idx]:
                    tp += 1; matched_gt[best_idx] = True
                else:
                    fp += 1

            fn = len(gt_cls) - tp
            prec = tp / (tp + fp + 1e-9)
            rec  = tp / (tp + fn + 1e-9)
            f1   = 2 * prec * rec / (prec + rec + 1e-9)
            ap   = self._compute_ap(ground_truth, predictions, label, iou_threshold)

            per_class[label] = {
                "precision": prec, "recall": rec, "f1": f1,
                "ap": ap, "tp": tp, "fp": fp, "fn": fn,
            }
            ap_list.append(ap)
            total_tp += tp; total_fp += fp; total_fn += fn

        g_prec = total_tp / (total_tp + total_fp + 1e-9)
        g_rec  = total_tp / (total_tp + total_fn + 1e-9)
        g_f1   = 2 * g_prec * g_rec / (g_prec + g_rec + 1e-9)
        mean_ap = float(np.mean(ap_list)) if ap_list else 0.0

        return {
            "precision":  float(g_prec),
            "recall":     float(g_rec),
            "f1":         float(g_f1),
            "ap":         mean_ap,
            "tp":         total_tp,
            "fp":         total_fp,
            "fn":         total_fn,
            "per_class":  per_class,
        }

    def compute_coco_map_range(
        self,
        ground_truth: List[Dict],
        predictions: List[Dict],
    ) -> float:
        """
        COCO-style mAP averaged over IoU thresholds 0.50 to 0.95 (step 0.05).

        Parameters
        ----------
        ground_truth : list of dict  (label, box)
        predictions  : list of dict  (label, score, box)

        Returns
        -------
        float  – mAP@[0.50:0.95].
        """
        thresholds = np.arange(0.50, 1.00, 0.05)
        aps: List[float] = []
        for thr in thresholds:
            metrics = self.evaluate_detections(ground_truth, predictions,
                                               iou_threshold=float(thr))
            aps.append(metrics["ap"])
        return float(np.mean(aps))
