"""
backbone.py - Pretrained ResNet18 visual backbone with RoI Align.
Uses ImageNet pretrained weights for real visual understanding.
"""
import torch, torch.nn as nn, torch.nn.functional as F, logging
from torchvision.ops import roi_align

logger = logging.getLogger(__name__)


class ScratchVisionBackbone(nn.Module):
    def __init__(self, visual_embed_dim=128):
        super().__init__()
        self.visual_embed_dim = visual_embed_dim
        import torchvision.models as M
        try:
            resnet = M.resnet18(weights=M.ResNet18_Weights.IMAGENET1K_V1)
            logger.info("Loaded pretrained ResNet18.")
        except Exception:
            resnet = M.resnet18(weights=None)
            logger.warning("Using random ResNet18 (pretrained weights not available).")
        self.features = nn.Sequential(
            resnet.conv1, resnet.bn1, resnet.relu, resnet.maxpool,
            resnet.layer1, resnet.layer2, resnet.layer3,
        )  # stride=16, 256 channels
        for p in self.features.parameters():
            p.requires_grad = False
        self.roi_proj = nn.Sequential(
            nn.Linear(256*7*7, 512), nn.ReLU(inplace=True),
            nn.Linear(512, visual_embed_dim),
        )

    def extract_feature_map(self, img_tensor):
        if img_tensor.dim() == 3:
            img_tensor = img_tensor.unsqueeze(0)
        with torch.no_grad():
            return self.features(img_tensor)

    def extract_roi_embeddings(self, feature_map, boxes_tensor, spatial_scale):
        if boxes_tensor.numel() == 0:
            return torch.zeros(0, self.visual_embed_dim, device=feature_map.device)
        n = boxes_tensor.shape[0]
        idx = torch.zeros(n, 1, dtype=boxes_tensor.dtype, device=boxes_tensor.device)
        rois = torch.cat([idx, boxes_tensor.float()], dim=1)
        pooled = roi_align(feature_map, rois, output_size=(7,7),
                           spatial_scale=spatial_scale, sampling_ratio=2, aligned=True)
        return F.normalize(self.roi_proj(pooled.flatten(1)), p=2, dim=-1)
