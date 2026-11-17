"""
cli.py – Command-line interface for the Zero-Shot Object Detector.

Usage examples
--------------
  python cli.py --image photo.jpg --queries "cat, dog"
  python cli.py --image photo.jpg --queries "person" --model from-scratch --threshold 0.3
  python cli.py --image photo.jpg --queries "car" --output result.jpg --export-coco out.json
  python cli.py --benchmark
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the zsod_python directory is on the path when invoked directly
# ---------------------------------------------------------------------------
_HERE = Path(__file__).parent.resolve()
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from zero_shot_detector import ZeroShotObjectDetector
from zero_shot_detector.visualizer import DetectionVisualizer
from zero_shot_detector.utils import export_to_coco_format
from PIL import Image


# ---------------------------------------------------------------------------
# ANSI helpers (graceful fallback on Windows without VT mode)
# ---------------------------------------------------------------------------

def _ansi(code: str, text: str) -> str:
    """Wrap text in an ANSI escape code (no-op if not a tty)."""
    if sys.stdout.isatty():
        return f"\033[{code}m{text}\033[0m"
    return text

BOLD  = lambda t: _ansi("1", t)
CYAN  = lambda t: _ansi("96", t)
GREEN = lambda t: _ansi("92", t)
YELLOW= lambda t: _ansi("93", t)
RED   = lambda t: _ansi("91", t)
DIM   = lambda t: _ansi("2", t)


def print_table(detections: list) -> None:
    """Print a formatted detections table."""
    if not detections:
        print(YELLOW("  No detections above the threshold."))
        return

    col_widths = [4, 24, 7, 30]
    header = ["#", "Label", "Score", "Box [x1, y1, x2, y2]"]
    sep    = "─" * (sum(col_widths) + len(col_widths) * 3 + 1)

    print(sep)
    h_parts = [h.ljust(col_widths[i]) for i, h in enumerate(header)]
    print("  " + "   ".join(h_parts))
    print(sep)

    for i, det in enumerate(detections):
        label = det["label"][:23]
        score = f"{det['score']:.4f}"
        box   = "[{:.1f}, {:.1f}, {:.1f}, {:.1f}]".format(*det["box"])
        row   = [
            str(i + 1).ljust(col_widths[0]),
            CYAN(label.ljust(col_widths[1])),
            GREEN(score.ljust(col_widths[2])),
            DIM(box),
        ]
        print("  " + "   ".join(row))

    print(sep)
    print(f"\n  {BOLD('Total')}: {len(detections)} detection(s)\n")


def run_benchmark() -> None:
    """Run a quick synthetic benchmark."""
    print(BOLD("\n── Benchmark Mode ──────────────────────────────────────"))
    from PIL import ImageDraw

    img  = Image.new("RGB", (640, 480), color=(160, 180, 200))
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, 80, 300, 250],  fill=(200, 60,  60))
    draw.rectangle([360, 100, 560, 300], fill=(60, 120, 220))
    draw.ellipse  ([230, 300, 410, 420], fill=(60, 180, 60))

    queries     = ["red car", "blue person", "green ball", "laptop"]
    model_names = ["from-scratch"]

    for mname in model_names:
        print(f"\n  Model: {BOLD(mname)}")
        try:
            det = ZeroShotObjectDetector(model_name=mname, lazy_load=False)
            t0  = time.time()
            res = det.detect(img, queries, threshold=0.1, max_detections=20)
            ms  = (time.time() - t0) * 1000
            print(f"  → {len(res)} detections in {GREEN(f'{ms:.1f}ms')}")
            for d in res[:5]:
                print(f"     {DIM(d['label'])}: {d['score']:.3f}")
        except Exception as exc:
            print(f"  {RED('FAILED')}: {exc}")

    print("\n" + "─" * 55 + "\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Zero-Shot Object Detector CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py --image photo.jpg --queries "cat, dog"
  python cli.py --image photo.jpg --queries "person" --threshold 0.3 --output result.jpg
  python cli.py --benchmark
        """,
    )

    parser.add_argument(
        "--image", "-i",
        type=str,
        help="Path to input image.",
    )
    parser.add_argument(
        "--queries", "-q",
        type=str,
        default="person, car, dog",
        help='Comma-separated text queries. Default: "person, car, dog"',
    )
    parser.add_argument(
        "--model", "-m",
        type=str,
        default="from-scratch",
        choices=["from-scratch", "owlvit-base", "owlv2-base"],
        help="Model backend to use.",
    )
    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=0.35,
        help="Confidence score threshold (default 0.35).",
    )
    parser.add_argument(
        "--nms",
        type=float,
        default=0.25,
        help="NMS IoU threshold (default 0.25).",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Path to save annotated output image.",
    )
    parser.add_argument(
        "--export-coco",
        type=str,
        default=None,
        metavar="PATH",
        help="Save detections in COCO JSON format to this path.",
    )
    parser.add_argument(
        "--benchmark",
        action="store_true",
        help="Run a built-in benchmark instead of detecting.",
    )

    args = parser.parse_args()

    # Banner
    print(BOLD("\n╔═══════════════════════════════════════╗"))
    print(BOLD("║   Zero-Shot Object Detector  CLI      ║"))
    print(BOLD("╚═══════════════════════════════════════╝\n"))

    if args.benchmark:
        run_benchmark()
        return

    if not args.image:
        parser.error("--image is required when not using --benchmark.")

    if not os.path.isfile(args.image):
        print(RED(f"Error: image file not found: {args.image}"))
        sys.exit(1)

    queries = [q.strip() for q in args.queries.split(",") if q.strip()]
    if not queries:
        print(RED("Error: no queries provided."))
        sys.exit(1)

    # Load model
    print(f"  Loading model {BOLD(args.model)}…", end=" ", flush=True)
    t0  = time.time()
    det = ZeroShotObjectDetector(
        model_name=args.model,
        lazy_load=False,
        device="cpu",
    )
    print(GREEN(f"done ({(time.time()-t0)*1000:.0f}ms)"))

    # Load image
    print(f"  Image    : {CYAN(args.image)}")
    print(f"  Queries  : {CYAN(', '.join(queries))}")
    print(f"  Threshold: {args.threshold}   NMS: {args.nms}\n")

    pil = Image.open(args.image).convert("RGB")

    # Detect
    t0   = time.time()
    dets = det.detect(
        pil, queries,
        threshold=args.threshold,
        nms_iou_threshold=args.nms,
        max_detections=50,
    )
    ms   = (time.time() - t0) * 1000
    print(f"  {GREEN('Inference complete')} in {ms:.1f}ms\n")

    print_table(dets)

    # Save annotated image
    if args.output:
        viz = DetectionVisualizer()
        ann = viz.draw_detections(pil, dets)
        ann.save(args.output)
        print(f"  Annotated image saved → {GREEN(args.output)}")

    # Export COCO
    if args.export_coco:
        w, h    = pil.size
        coco    = export_to_coco_format(dets, w, h,
                                        image_filename=os.path.basename(args.image))
        with open(args.export_coco, "w", encoding="utf-8") as f:
            json.dump(coco, f, indent=2)
        print(f"  COCO JSON saved       → {GREEN(args.export_coco)}")

    print()


if __name__ == "__main__":
    main()
