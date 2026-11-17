"""
box_regressor.py – 2-layer MLP box delta regressor.

Predicts (dx, dy, dw, dh) offsets relative to anchor boxes and applies
them to produce refined [x1, y1, x2, y2] bounding boxes.

Delta application (standard RCNN convention)
--------------------------------------------
  refined_cx = anchor_cx + dx * anchor_w
  refined_cy = anchor_cy + dy * anchor_h
  refined_w  = anchor_w  * exp(dw)
  refined_h  = anchor_h  * exp(dh)
  → convert to x1y1x2y2
"""

import torch
import torch.nn as nn


class ScratchBoxRegressor(nn.Module):
    """
    Two-layer MLP that refines anchor boxes given visual embeddings.

    Parameters
    ----------
    visual_dim : int
        Dimensionality of the visual RoI embeddings (default 128).
    """

    def __init__(self, visual_dim: int = 128) -> None:
        super().__init__()
        self.visual_dim = visual_dim

        self.mlp = nn.Sequential(
            nn.Linear(visual_dim, 256),
            nn.ReLU(inplace=True),
            nn.Linear(256, 4),          # predicts (dx, dy, dw, dh)
        )

        # Initialise output layer to small values so early training is stable
        nn.init.normal_(self.mlp[-1].weight, std=0.001)
        nn.init.zeros_(self.mlp[-1].bias)

    @staticmethod
    def _apply_deltas(
        anchors: torch.Tensor,
        deltas: torch.Tensor,
    ) -> torch.Tensor:
        """
        Apply (dx, dy, dw, dh) deltas to anchor boxes.

        Parameters
        ----------
        anchors : torch.Tensor
            Shape (N, 4) in [x1, y1, x2, y2] format.
        deltas : torch.Tensor
            Shape (N, 4) – (dx, dy, dw, dh) predictions.

        Returns
        -------
        torch.Tensor
            Refined boxes (N, 4) in [x1, y1, x2, y2] format.
        """
        # Convert anchor corners to centre + size
        a_w  = anchors[:, 2] - anchors[:, 0]           # (N,)
        a_h  = anchors[:, 3] - anchors[:, 1]           # (N,)
        a_cx = anchors[:, 0] + 0.5 * a_w               # (N,)
        a_cy = anchors[:, 1] + 0.5 * a_h               # (N,)

        dx = deltas[:, 0]
        dy = deltas[:, 1]
        dw = deltas[:, 2].clamp(-4.0, 4.0)  # clamp to avoid exp overflow
        dh = deltas[:, 3].clamp(-4.0, 4.0)

        # Apply deltas
        pred_cx = a_cx + dx * a_w
        pred_cy = a_cy + dy * a_h
        pred_w  = a_w  * torch.exp(dw)
        pred_h  = a_h  * torch.exp(dh)

        # Convert back to x1y1x2y2
        x1 = pred_cx - 0.5 * pred_w
        y1 = pred_cy - 0.5 * pred_h
        x2 = pred_cx + 0.5 * pred_w
        y2 = pred_cy + 0.5 * pred_h

        return torch.stack([x1, y1, x2, y2], dim=-1)   # (N, 4)

    def forward(
        self,
        visual_embeds: torch.Tensor,
        anchor_boxes: torch.Tensor,
    ) -> torch.Tensor:
        """
        Regress refined bounding boxes.

        Parameters
        ----------
        visual_embeds : torch.Tensor
            Shape (N, visual_dim) – per-RoI visual embeddings.
        anchor_boxes : torch.Tensor
            Shape (N, 4) – corresponding anchor boxes [x1, y1, x2, y2].

        Returns
        -------
        torch.Tensor
            Refined boxes (N, 4) in [x1, y1, x2, y2] format.
        """
        deltas = self.mlp(visual_embeds)                # (N, 4)
        refined = self._apply_deltas(anchor_boxes, deltas)
        return refined
