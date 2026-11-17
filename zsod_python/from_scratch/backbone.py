"""
backbone.py – Vision backbone using pretrained ResNet18 as feature extractor.

Uses torchvision's ResNet18 (pretrained on ImageNet) to extract rich visual
features that actually understand visual content. Falls back to a random CNN
if the pretrained weights cannot be downloaded.

RoI Align pools per-proposal features, which are projected + L2-normalised
to `visual_embed_dim`.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import logging

logger = logging.getLogger(__name__)

try:
    from torchvision.ops import roi_align
except ImportError as exc:
    raise ImportError(
        "torchvision is required. Install: pip install torchvision"
    ) from exc


# ---------------------------------------------------------------------------
# Helper: build one conv stage (fallback if pretrained unavailable)
# ---------------------------------------------------------------------------

def _conv_stage(in_ch: int, out_ch: int) -> nn.Sequential:
    return nn.Sequential(
        nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
        nn.BatchNorm2d(out_ch),
        nn.ReLU(inplace=True),
        nn.MaxPool2d(kernel_size=2, stride=2),
    )


# ---------------------------------------------------------------------------
# Pretrained ResNet18 feature extractor
# ---------------------------------------------------------------------------

class PretrainedResNetExtractor(nn.Module):
    """
    Uses ResNet18 pretrained on ImageNet as a frozen feature extractor.
    Outputs stride-16 feature maps (layer3 output: 256 channels).
    """
    def __init__(self):
        super().__init__()
        try:
            import torchvision.models as models
            resnet = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
            logger.info("Loaded pretrained ResNet18 weights (ImageNet).")
        except Exception:
            try:
                import torchvision.models as models
                resnet = models.resnet18(pretrained=True)
                logger.info("Loaded pretrained ResNet18 weights (legacy API).")
            except Exception as e:
                logger.warning(f"Could not load pretrained ResNet18: {e}. Using random init.")
                import torchvision.models as models
                resnet = models.resnet18(weights=None)

        # Use up to layer3 → stride 16, 256 channels
        self.features = nn.Sequential(
            resnet.conv1,
            resnet.bn1,
            resnet.relu,
            resnet.maxpool,  # stride 4
            resnet.layer1,   # stride 4
            resnet.layer2,   # stride 8
            resnet.layer3,   # stride 16, 256 ch
        )
        self.out_channels = 256

        # Freeze backbone for speed (we only train the projection head)
        for param in self.features.parameters():
            param.requires_grad = False

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.features(x)  # (B, 256, H/16, W/16)


# ---------------------------------------------------------------------------
# Fallback: 4-stage scratch CNN
# ---------------------------------------------------------------------------

class ScratchCNNExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        self.stage1 = _conv_stage(3,   32)
        self.stage2 = _conv_stage(32,  64)
        self.stage3 = _conv_stage(64, 128)
        self.stage4 = _conv_stage(128, 256)
        self.out_channels = 256

    def forward(self, x):
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.stage4(x)
        return x


# ---------------------------------------------------------------------------
# Main backbone (auto-selects pretrained if available)
# ---------------------------------------------------------------------------

class ScratchVisionBackbone(nn.Module):
    """
    Vision backbone that uses pretrained ResNet18 feature extraction
    for dramatically better visual understanding vs random weights.

    Parameters
    ----------
    visual_embed_dim : int
        Dimensionality of the final L2-normalised visual embedding per RoI.
    use_pretrained : bool
        If True (default), attempt to use pretrained ResNet18.
    """

    def __init__(self, visual_embed_dim: int = 128, use_pretrained: bool = True) -> None:
        super().__init__()
        self.visual_embed_dim = visual_embed_dim

        # Build feature extractor
        if use_pretrained:
            try:
                self.extractor = PretrainedResNetExtractor()
                self._pretrained = True
                logger.info("Using pretrained ResNet18 backbone.")
            except Exception as e:
                logger.warning(f"Falling back to scratch CNN: {e}")
                self.extractor = ScratchCNNExtractor()
                self._pretrained = False
        else:
            self.extractor = ScratchCNNExtractor()
            self._pretrained = False

        feat_channels = self.extractor.out_channels  # 256

        # Projection head: RoI-pooled → embed_dim
        roi_flat_dim = feat_channels * 7 * 7
        self.roi_proj = nn.Sequential(
            nn.Linear(roi_flat_dim, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.1),
            nn.Linear(512, visual_embed_dim),
        )

    # ------------------------------------------------------------------
    # Spatial scale: 1/16 for ResNet18 up to layer3
    # ------------------------------------------------------------------

    @property
    def spatial_scale(self) -> float:
        return 1.0 / 16.0

    # ------------------------------------------------------------------
    # Forward helpers
    # ------------------------------------------------------------------

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Run the full backbone on a batch of images (B, 3, H, W)."""
        return self.extractor(x)

    def extract_feature_map(self, img_tensor: torch.Tensor) -> torch.Tensor:
        """
        Extract the stride-16 feature map from a preprocessed image.

        Parameters
        ----------
        img_tensor : torch.Tensor
            Shape (3, H, W) or (1, 3, H, W). ImageNet-normalised.

        Returns
        -------
        torch.Tensor  shape (1, 256, H/16, W/16)
        """
        if img_tensor.dim() == 3:
            img_tensor = img_tensor.unsqueeze(0)
        with torch.no_grad():
            feat = self.extractor(img_tensor)
        return feat

    def extract_roi_embeddings(
        self,
        feature_map: torch.Tensor,
        boxes_tensor: torch.Tensor,
        spatial_scale: float,
    ) -> torch.Tensor:
        """
        Pool RoI features, project, and L2-normalise.

        Parameters
        ----------
        feature_map : torch.Tensor   shape (1, 256, Hf, Wf)
        boxes_tensor : torch.Tensor  shape (N, 4) in [x1,y1,x2,y2] pixels
        spatial_scale : float        feature_size / image_size (1/16)

        Returns
        -------
        torch.Tensor  shape (N, visual_embed_dim), L2-normalised
        """
        if boxes_tensor.numel() == 0:
            return torch.zeros(0, self.visual_embed_dim, device=feature_map.device)

        n = boxes_tensor.shape[0]
        batch_idx = torch.zeros(n, 1, dtype=boxes_tensor.dtype,
                                device=boxes_tensor.device)
        rois = torch.cat([batch_idx, boxes_tensor.float()], dim=1)  # (N, 5)

        pooled = roi_align(
            feature_map,
            rois,
            output_size=(7, 7),
            spatial_scale=spatial_scale,
            sampling_ratio=2,
            aligned=True,
        )  # (N, 256, 7, 7)

        flat = pooled.flatten(1)                      # (N, 256*7*7)
        proj = self.roi_proj(flat)                    # (N, visual_embed_dim)
        normed = F.normalize(proj, p=2, dim=-1)       # L2 normalise
        return normed
