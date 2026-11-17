"""box_regressor.py - Class-agnostic box refinement MLP."""
import torch, torch.nn as nn


class ScratchBoxRegressor(nn.Module):
    def __init__(self, visual_dim=128):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(visual_dim, 256), nn.ReLU(inplace=True), nn.Linear(256, 4)
        )
        nn.init.zeros_(self.mlp[-1].weight)
        nn.init.zeros_(self.mlp[-1].bias)

    def forward(self, vis, anchors):
        deltas = self.mlp(vis)
        cx = (anchors[:,0]+anchors[:,2])*0.5 + deltas[:,0]*(anchors[:,2]-anchors[:,0])
        cy = (anchors[:,1]+anchors[:,3])*0.5 + deltas[:,1]*(anchors[:,3]-anchors[:,1])
        w  = (anchors[:,2]-anchors[:,0]) * deltas[:,2].exp().clamp(0.1,10)
        h  = (anchors[:,3]-anchors[:,1]) * deltas[:,3].exp().clamp(0.1,10)
        return torch.stack([cx-w/2, cy-h/2, cx+w/2, cy+h/2], dim=1)
