"""
quickstart_demo.py - Quick end-to-end demo of the from-scratch Zero-Shot Detector.

Steps
-----
1. Create a synthetic 640x480 test image with coloured shapes.
2. Load the from-scratch detector (no pretrained weights needed).
3. Run detection with queries: ["red square", "blue circle", "green triangle"].
4. Print the results table.
5. Save the annotated image to quickstart_output.jpg.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_HERE = Path(__file__).parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from PIL import Image, ImageDraw, ImageFont
from from_scratch import ScratchZeroShotDetector
from zero_shot_detector.visualizer import DetectionVisualizer

OUTPUT_PATH = _HERE / "quickstart_output.jpg"
IMAGE_SIZE  = (640, 480)
QUERIES     = ["red square", "blue circle", "green triangle"]


# ---------------------------------------------------------------------------
# 1. Create synthetic test image
# ---------------------------------------------------------------------------

def create_test_image(size: tuple[int, int] = IMAGE_SIZE) -> Image.Image:
    """Draw a colourful synthetic image with simple geometric shapes."""
    w, h = size
    img  = Image.new("RGB", size, color=(240, 240, 245))
    draw = ImageDraw.Draw(img)

    # Red rectangle ("red square")
    draw.rectangle(
        [60, 60, 220, 200],
        fill=(220, 50, 50),
        outline=(160, 20, 20),
        width=4,
    )
    # Label on shape
    draw.text((90, 115), "RED", fill=(255, 255, 255))

    # Blue filled ellipse ("blue circle")
    draw.ellipse(
        [280, 80, 460, 260],
        fill=(50, 100, 220),
        outline=(20, 60, 160),
        width=4,
    )
    draw.text((345, 160), "BLUE", fill=(255, 255, 255))

    # Green triangle polygon ("green triangle")
    tri = [(540, 60), (640, 220), (440, 220)]
    draw.polygon(tri, fill=(50, 180, 70), outline=(20, 120, 40))
    draw.text((510, 165), "GRN", fill=(255, 255, 255))

    # Some background noise rectangles (distractors)
    draw.rectangle([80,  300, 200, 420], fill=(180, 170, 160), outline=(120, 110, 100), width=2)
    draw.rectangle([350, 290, 500, 430], fill=(160, 160, 200), outline=(100, 100, 150), width=2)

    return img


# ---------------------------------------------------------------------------
# 2-4. Run detection and print results
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 55)
    print("  Zero-Shot Object Detector  -  Quickstart Demo")
    print("=" * 55)

    # Step 1
    print("\n[1] Creating synthetic test image…")
    test_img = create_test_image()
    print(f"    Image size: {test_img.size[0]}x{test_img.size[1]} px")

    # Step 2
    print("\n[2] Loading from-scratch detector…")
    t0  = time.time()
    det = ScratchZeroShotDetector(embed_dim=128, proposal_top_k=120)
    ms  = (time.time() - t0) * 1000
    print(f"    Model loaded in {ms:.0f}ms (no pretrained weights needed)")

    # Step 3
    print(f"\n[3] Running detection with queries: {QUERIES}")
    t0   = time.time()
    dets = det.detect(
        test_img,
        QUERIES,
        threshold=0.30,
        nms_iou_threshold=0.25,
        max_detections=20,
    )
    ms_inf = (time.time() - t0) * 1000
    print(f"    Inference time: {ms_inf:.1f}ms")

    # Step 4
    print(f"\n[4] Results: {len(dets)} detection(s)\n")
    if dets:
        print(f"  {'#':<4} {'Label':<22} {'Score':<8} {'Box [x1,y1,x2,y2]'}")
        print("  " + "-" * 60)
        for i, d in enumerate(dets, 1):
            box_str = "[{:.0f}, {:.0f}, {:.0f}, {:.0f}]".format(*d["box"])
            print(f"  {i:<4} {d['label']:<22} {d['score']:.4f}   {box_str}")
    else:
        print("  No detections above threshold.")
        print("  (Expected for randomly-initialised weights - train the model for real detections.)")

    # Step 5
    print(f"\n[5] Saving annotated image -> {OUTPUT_PATH}")
    viz      = DetectionVisualizer(font_size=14, line_width=3)
    ann_img  = viz.draw_detections(test_img, dets)
    ann_img.save(str(OUTPUT_PATH), quality=92)
    print(f"    Saved: {OUTPUT_PATH}")

    print("\n  Done!\n")
    print(
        "  Tip: Run `python train_from_scratch.py` to train on synthetic data,\n"
        "       or launch the Flask app with `python app.py` for the full web UI.\n"
    )


if __name__ == "__main__":
    main()

