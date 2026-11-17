"""multimodal_alignment.py - Temperature-scaled cosine alignment."""
import math, torch, torch.nn as nn, torch.nn.functional as F


class ScratchVisualSemanticAligner(nn.Module):
    def __init__(self, embed_dim=128):
        super().__init__()
        self.vp = nn.Linear(embed_dim, embed_dim, bias=False)
        self.tp = nn.Linear(embed_dim, embed_dim, bias=False)
        nn.init.eye_(self.vp.weight)   # start as identity
        nn.init.eye_(self.tp.weight)
        self.log_tau = nn.Parameter(torch.tensor(math.log(1/0.07)))
        self.bg_bias = nn.Parameter(torch.tensor(-2.0))  # negative = reject by default

    def forward(self, vis, txt):
        txt = txt.to(vis.device)
        v = F.normalize(self.vp(vis), p=2, dim=-1)
        w = F.normalize(self.tp(txt), p=2, dim=-1)
        tau = self.log_tau.clamp(math.log(1/0.3), math.log(1/0.01)).exp()
        return torch.sigmoid((v @ w.T) / tau + self.bg_bias)
