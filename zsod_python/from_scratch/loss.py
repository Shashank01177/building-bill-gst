"""
loss.py – Training losses for the from-scratch Zero-Shot Object Detector.

Losses
------
InfoNCELoss        – Symmetric InfoNCE / NT-Xent contrastive loss.
SmoothL1BoxLoss    – Thin wrapper around F.smooth_l1_loss for box regression.
ZeroShotDetectionLoss – Combines both for joint optimisation.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class InfoNCELoss(nn.Module):
    """
    Symmetric InfoNCE (NT-Xent) contrastive loss.

    Given N matched (visual, text) pairs the loss encourages each visual
    embedding to be closer to its paired text embedding than to all other
    text embeddings in the batch, and vice-versa.

    Parameters
    ----------
    temperature : float
        Softmax temperature τ (default 0.07).
    """

    def __init__(self, temperature: float = 0.07) -> None:
        super().__init__()
        self.temperature = temperature

    def forward(
        self,
        visual_embeds: torch.Tensor,
        text_embeds: torch.Tensor,
    ) -> torch.Tensor:
        """
        Compute symmetric InfoNCE loss.

        Parameters
        ----------
        visual_embeds : torch.Tensor
            Shape (N, D) – L2-normalised visual embeddings.
        text_embeds : torch.Tensor
            Shape (N, D) – L2-normalised text embeddings.

        Returns
        -------
        torch.Tensor
            Scalar loss value.
        """
        # Both should already be L2-normalised; re-normalise defensively
        v = F.normalize(visual_embeds, p=2, dim=-1)
        t = F.normalize(text_embeds,   p=2, dim=-1)

        # Scaled cosine similarity matrix (N, N)
        logits = (v @ t.T) / self.temperature

        # Diagonal entries are the positive pairs
        n = logits.shape[0]
        labels = torch.arange(n, device=logits.device)

        # Symmetric cross-entropy
        loss_v2t = F.cross_entropy(logits,   labels)
        loss_t2v = F.cross_entropy(logits.T, labels)
        return (loss_v2t + loss_t2v) / 2.0


class SmoothL1BoxLoss(nn.Module):
    """
    Smooth-L1 (Huber) loss for bounding-box regression.

    Wraps ``torch.nn.functional.smooth_l1_loss`` with β=1.

    Parameters
    ----------
    beta : float
        Transition point between L1 and L2 regions (default 1.0).
    """

    def __init__(self, beta: float = 1.0) -> None:
        super().__init__()
        self.beta = beta

    def forward(
        self,
        pred_boxes: torch.Tensor,
        target_boxes: torch.Tensor,
    ) -> torch.Tensor:
        """
        Parameters
        ----------
        pred_boxes : torch.Tensor
            Predicted boxes (N, 4) in [x1, y1, x2, y2].
        target_boxes : torch.Tensor
            Ground-truth boxes (N, 4) in [x1, y1, x2, y2].

        Returns
        -------
        torch.Tensor
            Scalar loss value.
        """
        return F.smooth_l1_loss(pred_boxes, target_boxes, beta=self.beta)


class ZeroShotDetectionLoss(nn.Module):
    """
    Combined Zero-Shot Detection loss.

    Total loss = InfoNCE(visual, text) + lambda_box × SmoothL1(pred, gt)

    Parameters
    ----------
    lambda_box : float
        Weight for the box regression loss (default 1.0).
    temperature : float
        InfoNCE temperature (default 0.07).
    """

    def __init__(
        self,
        lambda_box: float = 1.0,
        temperature: float = 0.07,
    ) -> None:
        super().__init__()
        self.lambda_box = lambda_box
        self.infonce    = InfoNCELoss(temperature=temperature)
        self.box_loss   = SmoothL1BoxLoss()

    def forward(
        self,
        visual_embeds: torch.Tensor,
        text_embeds: torch.Tensor,
        pred_boxes: torch.Tensor,
        target_boxes: torch.Tensor,
    ) -> dict:
        """
        Compute combined loss.

        Parameters
        ----------
        visual_embeds : torch.Tensor  (N, D)
        text_embeds   : torch.Tensor  (N, D)
        pred_boxes    : torch.Tensor  (N, 4)
        target_boxes  : torch.Tensor  (N, 4)

        Returns
        -------
        dict
            Keys: ``total``, ``infonce``, ``box``.
        """
        loss_nce = self.infonce(visual_embeds, text_embeds)
        loss_box = self.box_loss(pred_boxes, target_boxes)
        total    = loss_nce + self.lambda_box * loss_box

        return {
            "total":   total,
            "infonce": loss_nce,
            "box":     loss_box,
        }
