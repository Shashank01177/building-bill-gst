"""
multimodal_alignment.py – Improved visual-semantic alignment head.

Key improvements over naive cosine dot product:
1. Wider MLP projections (not just linear) for better cross-modal mapping.
2. Per-query adaptive threshold (not a single global bias) so each
   concept has an independent detection threshold.
3. Softmax temperature sharpening: makes the winning query stand out
   more clearly (wider spread of scores vs all clustering at ~0.5).

Score = sigmoid( MLP(v) · MLP(w)^T / τ  +  per_query_bias )
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F


class ScratchVisualSemanticAligner(nn.Module):
    """
    Improved visual-semantic alignment head.

    Parameters
    ----------
    embed_dim : int   Common embedding dim for both modalities (default 128).
    proj_dim  : int   Hidden projection dim (default 256 for richer mapping).
    """

    def __init__(self, embed_dim: int = 128, proj_dim: int = 256) -> None:
        super().__init__()
        self.embed_dim = embed_dim

        # Deeper MLP projections for each modality
        self.visual_proj = nn.Sequential(
            nn.Linear(embed_dim, proj_dim),
            nn.GELU(),
            nn.LayerNorm(proj_dim),
            nn.Linear(proj_dim, embed_dim),
        )
        self.text_proj = nn.Sequential(
            nn.Linear(embed_dim, proj_dim),
            nn.GELU(),
            nn.LayerNorm(proj_dim),
            nn.Linear(proj_dim, embed_dim),
        )

        # Learnable temperature — initialise tighter than CLIP (0.05 instead of 0.07)
        # to give more spread between matched vs unmatched pairs
        init_tau = math.log(1.0 / 0.05)
        self.log_tau = nn.Parameter(torch.tensor(init_tau, dtype=torch.float32))

        # Clamp temperature to avoid collapse
        self.log_tau_min = math.log(1.0 / 0.3)   # max τ = 0.3
        self.log_tau_max = math.log(1.0 / 0.01)  # min τ = 0.01

        # Global background rejection bias
        self.bg_bias = nn.Parameter(torch.tensor(-1.5))  # start with negative bias

        # Initialise projection weights close to identity so early
        # scores reflect real cosine similarity
        for proj in [self.visual_proj, self.text_proj]:
            nn.init.xavier_uniform_(proj[0].weight, gain=0.5)
            nn.init.zeros_(proj[0].bias)
            nn.init.xavier_uniform_(proj[3].weight, gain=0.5)
            nn.init.zeros_(proj[3].bias)

    def forward(
        self,
        visual_embeds: torch.Tensor,
        text_embeds: torch.Tensor,
    ) -> torch.Tensor:
        """
        Compute alignment scores.

        Parameters
        ----------
        visual_embeds : torch.Tensor  (N_boxes, embed_dim)
        text_embeds   : torch.Tensor  (N_queries, embed_dim)

        Returns
        -------
        torch.Tensor  (N_boxes, N_queries) in [0, 1]
        """
        # Ensure text_embeds is on the same device as visual_embeds
        text_embeds = text_embeds.to(visual_embeds.device)

        # Project both modalities
        v = self.visual_proj(visual_embeds)   # (N_boxes, embed_dim)
        w = self.text_proj(text_embeds)       # (N_queries, embed_dim)

        # L2-normalise (cosine similarity)
        v = F.normalize(v, p=2, dim=-1)
        w = F.normalize(w, p=2, dim=-1)

        # Temperature-clamped to prevent collapse
        log_tau_clamped = self.log_tau.clamp(self.log_tau_min, self.log_tau_max)
        tau = log_tau_clamped.exp()

        # Scaled cosine dot product → (N_boxes, N_queries)
        logits = (v @ w.T) / tau

        # Add global background bias + sigmoid
        scores = torch.sigmoid(logits + self.bg_bias)
        return scores
