"""
visualizer.py – Detection visualiser for the Zero-Shot Object Detector.

Provides
--------
DetectionVisualizer – draws bounding boxes + labels on PIL images, and
                      extracts per-detection crops.
"""

from __future__ import annotations

import colorsys
import io
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont


def _generate_color_palette(n: int) -> List[Tuple[int, int, int]]:
    """
    Generate n visually distinct RGB colours using HSV cycling.

    Parameters
    ----------
    n : int
        Number of colours needed.

    Returns
    -------
    list of (R, G, B) tuples (uint8).
    """
    colors: List[Tuple[int, int, int]] = []
    for i in range(max(n, 1)):
        hue = i / max(n, 1)
        # Fixed high saturation + value for vibrant colours
        r, g, b = colorsys.hsv_to_rgb(hue, 0.85, 0.95)
        colors.append((int(r * 255), int(g * 255), int(b * 255)))
    return colors


class DetectionVisualizer:
    """
    Annotates PIL images with detection boxes, labels, and confidence scores.

    Parameters
    ----------
    font_size : int
        Font size for label text (default 14).
    line_width : int
        Bounding box line width in pixels (default 3).
    """

    def __init__(
        self,
        font_size: int = 14,
        line_width: int = 3,
    ) -> None:
        self.font_size  = font_size
        self.line_width = line_width
        self._label_color_cache: Dict[str, Tuple[int, int, int]] = {}
        self._all_labels: List[str] = []

        # Try to load a truetype font; fall back to default PIL bitmap font
        try:
            self._font = ImageFont.truetype("arial.ttf", font_size)
        except (IOError, OSError):
            try:
                # On Linux / Docker with DejaVu
                self._font = ImageFont.truetype(
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    font_size,
                )
            except (IOError, OSError):
                self._font = ImageFont.load_default()

    # ------------------------------------------------------------------
    # Colour assignment
    # ------------------------------------------------------------------

    def _get_color(self, label: str) -> Tuple[int, int, int]:
        """Return a consistent colour for the given label."""
        if label not in self._label_color_cache:
            self._all_labels.append(label)
            palette = _generate_color_palette(len(self._all_labels))
            # Re-assign all existing labels so order is stable
            for idx, lbl in enumerate(self._all_labels):
                self._label_color_cache[lbl] = palette[idx]
        return self._label_color_cache[label]

    # ------------------------------------------------------------------
    # Drawing
    # ------------------------------------------------------------------

    def draw_detections(
        self,
        pil_image: Image.Image,
        detections: List[Dict[str, Any]],
    ) -> Image.Image:
        """
        Draw bounding boxes, labels, and scores on a copy of ``pil_image``.

        Parameters
        ----------
        pil_image : PIL.Image.Image
        detections : list of dict
            Each dict must have ``label`` (str), ``score`` (float),
            and ``box`` ([x1, y1, x2, y2]).

        Returns
        -------
        PIL.Image.Image
            Annotated image (RGB).
        """
        img = pil_image.convert("RGB").copy()
        draw = ImageDraw.Draw(img, "RGBA")

        for det in detections:
            x1, y1, x2, y2 = [float(v) for v in det["box"]]
            label = det.get("label", "?")
            score = det.get("score", 0.0)
            color = self._get_color(label)

            # Semi-transparent fill
            fill_color = (*color, 30)
            draw.rectangle([x1, y1, x2, y2], outline=color,
                           width=self.line_width, fill=fill_color)

            # Label background + text
            caption = f"{label}: {score:.2f}"
            # Measure text size
            try:
                bbox = self._font.getbbox(caption)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
            except AttributeError:
                tw, th = len(caption) * 7, 12

            pad = 3
            lx1 = x1
            ly1 = max(0, y1 - th - 2 * pad)
            lx2 = x1 + tw + 2 * pad
            ly2 = ly1 + th + 2 * pad

            # Filled label box
            draw.rectangle([lx1, ly1, lx2, ly2],
                           fill=(*color, 200), outline=None)

            # White text
            draw.text(
                (lx1 + pad, ly1 + pad),
                caption,
                fill=(255, 255, 255),
                font=self._font,
            )

        return img

    # ------------------------------------------------------------------
    # Crop extraction
    # ------------------------------------------------------------------

    def extract_crops(
        self,
        pil_image: Image.Image,
        detections: List[Dict[str, Any]],
        padding: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Extract padded image crops for each detection.

        Parameters
        ----------
        pil_image : PIL.Image.Image
        detections : list of dict  (label, score, box)
        padding : int
            Extra pixels to include around each bounding box.

        Returns
        -------
        list of dict
            Keys: ``crop_image`` (PIL.Image), ``label``, ``score``,
            ``box``, ``index``.
        """
        img = pil_image.convert("RGB")
        w, h = img.size
        crops = []

        for idx, det in enumerate(detections):
            x1, y1, x2, y2 = [float(v) for v in det["box"]]
            # Apply padding and clamp to image bounds
            cx1 = max(0, int(x1) - padding)
            cy1 = max(0, int(y1) - padding)
            cx2 = min(w, int(x2) + padding)
            cy2 = min(h, int(y2) + padding)

            crop = img.crop((cx1, cy1, cx2, cy2))

            crops.append({
                "crop_image": crop,
                "label":      det.get("label", "?"),
                "score":      det.get("score", 0.0),
                "box":        det.get("box", [x1, y1, x2, y2]),
                "index":      idx,
            })

        return crops
