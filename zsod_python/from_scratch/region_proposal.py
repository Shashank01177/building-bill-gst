"""
region_proposal.py – Multi-scale Sobel-energy anchor proposal generator.

Algorithm
---------
1. Convert RGB image to grayscale.
2. Compute Sobel-X and Sobel-Y gradients; create an energy map.
3. Generate anchors on a 4×4 grid at 3 scales × 3 aspect ratios = 144 anchors.
4. Score each anchor by summing normalised energy inside its bounding box.
5. Return the top-K anchors sorted by score descending.
"""

import numpy as np
from typing import List, Tuple


class ScratchRegionProposalGenerator:
    """
    Gradient-based multi-scale anchor proposal generator.

    Parameters
    ----------
    top_k : int
        Maximum number of proposals to return.
    """

    # Relative scales as fractions of the image side length
    SCALES: List[float] = [0.10, 0.25, 0.50]
    # Width / Height aspect ratios
    ASPECT_RATIOS: List[float] = [0.5, 1.0, 2.0]
    # Grid resolution (number of cells per side)
    GRID_SIZE: int = 4

    def __init__(self, top_k: int = 120) -> None:
        self.top_k = top_k

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_grayscale(rgb: np.ndarray) -> np.ndarray:
        """Convert (H, W, 3) uint8 to float64 grayscale (H, W)."""
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        return 0.299 * r + 0.587 * g + 0.114 * b

    @staticmethod
    def _sobel_energy(gray: np.ndarray) -> np.ndarray:
        """
        Compute Sobel edge energy map (H, W).

        Uses simple finite-difference approximation of Sobel kernels without
        requiring scipy, so the module stays self-contained.
        """
        # Pad with edge values
        pad = np.pad(gray, 1, mode="edge")

        # Sobel-X: horizontal gradient
        gx = (
            -pad[:-2, :-2] - 2 * pad[1:-1, :-2] - pad[2:, :-2]
            + pad[:-2, 2:] + 2 * pad[1:-1, 2:] + pad[2:, 2:]
        )

        # Sobel-Y: vertical gradient
        gy = (
            -pad[:-2, :-2] - 2 * pad[:-2, 1:-1] - pad[:-2, 2:]
            + pad[2:, :-2] + 2 * pad[2:, 1:-1] + pad[2:, 2:]
        )

        energy = np.sqrt(gx ** 2 + gy ** 2)
        # Normalise to [0, 1] to make scores image-size independent
        max_val = energy.max()
        if max_val > 0:
            energy /= max_val
        return energy

    @staticmethod
    def _generate_anchors(
        img_h: int,
        img_w: int,
        scales: List[float],
        aspect_ratios: List[float],
        grid_size: int,
    ) -> np.ndarray:
        """
        Generate anchor boxes for a grid.

        Returns
        -------
        np.ndarray
            Shape (N_anchors, 4) in [x1, y1, x2, y2] format.
        """
        anchors: List[List[float]] = []
        cell_h = img_h / grid_size
        cell_w = img_w / grid_size

        for row in range(grid_size):
            for col in range(grid_size):
                # Centre of grid cell (in pixels)
                cy = (row + 0.5) * cell_h
                cx = (col + 0.5) * cell_w

                for scale in scales:
                    # Base area = (scale * sqrt(H*W))^2
                    area_side = scale * np.sqrt(img_h * img_w)
                    for ratio in aspect_ratios:
                        # ratio = w / h  →  w = sqrt(area * ratio),  h = sqrt(area / ratio)
                        anchor_w = area_side * np.sqrt(ratio)
                        anchor_h = area_side / np.sqrt(ratio)

                        x1 = cx - anchor_w / 2
                        y1 = cy - anchor_h / 2
                        x2 = cx + anchor_w / 2
                        y2 = cy + anchor_h / 2

                        # Clip to image bounds immediately
                        x1 = float(np.clip(x1, 0, img_w - 1))
                        y1 = float(np.clip(y1, 0, img_h - 1))
                        x2 = float(np.clip(x2, 1, img_w))
                        y2 = float(np.clip(y2, 1, img_h))

                        # Discard degenerate boxes
                        if x2 - x1 >= 2 and y2 - y1 >= 2:
                            anchors.append([x1, y1, x2, y2])

        return np.array(anchors, dtype=np.float32)

    @staticmethod
    def _score_anchors(
        energy: np.ndarray, anchors: np.ndarray
    ) -> np.ndarray:
        """
        Score each anchor by summing normalised Sobel energy inside it.

        Returns
        -------
        np.ndarray
            Shape (N_anchors,) of float scores.
        """
        h, w = energy.shape
        scores = np.empty(len(anchors), dtype=np.float32)

        for i, (x1, y1, x2, y2) in enumerate(anchors):
            ix1 = int(np.clip(round(x1), 0, w - 1))
            iy1 = int(np.clip(round(y1), 0, h - 1))
            ix2 = int(np.clip(round(x2), ix1 + 1, w))
            iy2 = int(np.clip(round(y2), iy1 + 1, h))

            region = energy[iy1:iy2, ix1:ix2]
            area = (ix2 - ix1) * (iy2 - iy1)
            # Mean energy (area-normalised) to avoid biasing large boxes
            scores[i] = region.sum() / (area + 1e-6)

        return scores

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def propose(self, np_image_array: np.ndarray) -> np.ndarray:
        """
        Generate region proposals for the given image.

        Parameters
        ----------
        np_image_array : np.ndarray
            RGB image array of shape (H, W, 3), dtype uint8 or float.

        Returns
        -------
        np.ndarray
            Shape (K, 4) in [x1, y1, x2, y2] format clipped to image bounds,
            where K ≤ top_k.  Sorted by objectness score descending.
        """
        img = np_image_array.astype(np.float64)
        h, w = img.shape[:2]

        # 1. Grayscale + Sobel energy
        gray = self._to_grayscale(img)
        energy = self._sobel_energy(gray)

        # 2. Generate anchors on grid
        anchors = self._generate_anchors(
            h, w, self.SCALES, self.ASPECT_RATIOS, self.GRID_SIZE
        )

        if len(anchors) == 0:
            return np.zeros((0, 4), dtype=np.float32)

        # 3. Score anchors
        scores = self._score_anchors(energy, anchors)

        # 4. Top-K selection
        k = min(self.top_k, len(anchors))
        top_indices = np.argsort(scores)[::-1][:k]
        proposals = anchors[top_indices]

        return proposals.astype(np.float32)
