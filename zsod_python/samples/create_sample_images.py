"""
samples/create_sample_images.py – Generate 5 synthetic sample images.

Creates the following files in the samples/ directory:
  office_desk.jpg    – Gray desk with laptop + mug shapes
  street_traffic.jpg – Blue sky, gray road, coloured cars
  living_room.jpg    – Beige background with couch shape
  dog_pet.jpg        – Green grass with brown dog silhouette
  kitchen_items.jpg  – White kitchen with appliance shapes
"""

from __future__ import annotations

import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_HERE = Path(__file__).parent.resolve()
_ROOT = _HERE.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from PIL import Image, ImageDraw, ImageFilter

SAVE_DIR = _HERE          # save into samples/ directory
IMAGE_W  = 640
IMAGE_H  = 480
QUALITY  = 92


def save(img: Image.Image, name: str) -> None:
    path = SAVE_DIR / name
    img.save(str(path), quality=QUALITY)
    print(f"  Saved: {path}")


# ---------------------------------------------------------------------------
# 1. office_desk.jpg
# ---------------------------------------------------------------------------

def make_office_desk() -> Image.Image:
    img  = Image.new("RGB", (IMAGE_W, IMAGE_H), color=(210, 210, 210))
    draw = ImageDraw.Draw(img)

    # Desk surface
    draw.rectangle([0, 300, IMAGE_W, IMAGE_H], fill=(160, 110, 70))

    # Laptop body
    draw.rectangle([140, 170, 380, 310], fill=(50, 50, 55), outline=(30,30,35), width=2)
    draw.rectangle([140, 160, 380, 175], fill=(40, 40, 45))  # hinge
    # Laptop screen
    draw.rectangle([155, 110, 365, 165], fill=(30, 30, 35))
    draw.rectangle([162, 115, 358, 162], fill=(20, 100, 180))  # screen glow

    # Coffee mug
    draw.ellipse([430, 260, 530, 310], fill=(220, 220, 220), outline=(180,180,180), width=2)
    draw.rectangle([430, 270, 530, 350], fill=(220, 220, 220), outline=(180,180,180), width=2)
    draw.ellipse([430, 340, 530, 360], fill=(200, 200, 200))
    draw.arc([520, 285, 560, 330], start=315, end=45, fill=(180,180,180), width=3)
    # Coffee inside
    draw.ellipse([440, 265, 520, 285], fill=(100, 60, 20))

    # Keyboard
    draw.rectangle([145, 290, 375, 308], fill=(60, 60, 65))
    for col in range(10):
        x = 155 + col * 22
        draw.rectangle([x, 293, x+16, 305], fill=(80, 80, 85), outline=(50,50,55), width=1)

    # Notebook
    draw.rectangle([40, 300, 130, 380], fill=(255, 255, 240), outline=(200, 200, 180), width=2)
    for line_y in range(315, 375, 12):
        draw.line([55, line_y, 115, line_y], fill=(180, 180, 180), width=1)

    # Apply slight blur for realism
    return img.filter(ImageFilter.GaussianBlur(0.4))


# ---------------------------------------------------------------------------
# 2. street_traffic.jpg
# ---------------------------------------------------------------------------

def make_street_traffic() -> Image.Image:
    img  = Image.new("RGB", (IMAGE_W, IMAGE_H), color=(135, 185, 230))  # sky blue
    draw = ImageDraw.Draw(img)

    # Clouds
    for cx, cy in [(100, 60), (300, 40), (520, 80)]:
        draw.ellipse([cx-50, cy-25, cx+50, cy+25], fill=(250, 250, 255))
        draw.ellipse([cx-30, cy-35, cx+30, cy+10], fill=(250, 250, 255))
        draw.ellipse([cx+20, cy-20, cx+70, cy+20], fill=(250, 250, 255))

    # Road + sidewalk
    draw.rectangle([0, 290, IMAGE_W, IMAGE_H], fill=(90, 90, 90))
    draw.rectangle([0, 290, IMAGE_W, 310],     fill=(110, 110, 110))  # kerb
    # Road markings
    for x in range(0, IMAGE_W, 80):
        draw.rectangle([x, 370, x+40, 382], fill=(255, 255, 255))

    # Buildings in background
    for bx, bw, bh, col in [
        (10,  80, 160, (170,170,175)),
        (110, 60, 130, (180,175,165)),
        (500, 90, 180, (160,165,180)),
        (570, 70, 140, (175,170,160)),
    ]:
        draw.rectangle([bx, 290-bh, bx+bw, 290], fill=col, outline=(120,120,120), width=1)
        # Windows
        for wy in range(290-bh+10, 280, 25):
            for wx in range(bx+8, bx+bw-8, 20):
                draw.rectangle([wx, wy, wx+12, wy+15], fill=(200, 230, 255))

    # Red car
    draw.rectangle([80,  240, 260, 295], fill=(210, 40, 40), outline=(150,20,20), width=2)
    draw.rectangle([110, 210, 230, 245], fill=(180, 30, 30), outline=(130,15,15), width=2)
    draw.ellipse([90,  280, 140, 310], fill=(30,30,30)); draw.ellipse([100,284,130,308], fill=(80,80,80))
    draw.ellipse([200, 280, 250, 310], fill=(30,30,30)); draw.ellipse([210,284,240,308], fill=(80,80,80))
    draw.rectangle([92, 230, 115, 250], fill=(220, 230, 255))  # windshield
    draw.rectangle([218,230, 240, 250], fill=(220, 230, 255))

    # Blue car
    draw.rectangle([360, 235, 560, 292], fill=(40, 80, 200), outline=(20,50,150), width=2)
    draw.rectangle([390, 205, 530, 240], fill=(30, 65, 175), outline=(15,40,130), width=2)
    draw.ellipse([370, 277, 420, 307],  fill=(30,30,30)); draw.ellipse([380,281,410,305], fill=(80,80,80))
    draw.ellipse([500, 277, 550, 307],  fill=(30,30,30)); draw.ellipse([510,281,540,305], fill=(80,80,80))

    # Traffic light pole
    draw.rectangle([308, 150, 316, 295], fill=(60, 60, 60))
    draw.rectangle([300, 145, 325, 230], fill=(40, 40, 40), outline=(20,20,20), width=1)
    draw.ellipse([303, 150, 322, 165], fill=(220, 50, 50))   # red
    draw.ellipse([303, 170, 322, 185], fill=(220, 180, 50))  # yellow
    draw.ellipse([303, 190, 322, 205], fill=(50, 200, 50))   # green

    return img.filter(ImageFilter.GaussianBlur(0.3))


# ---------------------------------------------------------------------------
# 3. living_room.jpg
# ---------------------------------------------------------------------------

def make_living_room() -> Image.Image:
    img  = Image.new("RGB", (IMAGE_W, IMAGE_H), color=(235, 225, 210))  # beige
    draw = ImageDraw.Draw(img)

    # Floor
    draw.rectangle([0, 350, IMAGE_W, IMAGE_H], fill=(190, 155, 110))
    # Baseboard
    draw.rectangle([0, 350, IMAGE_W, 360], fill=(220, 200, 175))
    # Floor lines
    for x in range(0, IMAGE_W, 90):
        draw.line([x, 360, x, IMAGE_H], fill=(170,135,95), width=1)

    # Wall picture
    draw.rectangle([420, 50, 580, 160], fill=(255,255,255), outline=(160,140,110), width=4)
    draw.rectangle([435, 65, 565, 150], fill=(100, 150, 200))
    draw.ellipse([470, 85, 530, 130],   fill=(60, 180, 60))  # stylised tree

    # Sofa body
    draw.rectangle([60, 250, 400, 360], fill=(100, 90, 160), outline=(70,60,130), width=2)
    # Sofa back
    draw.rectangle([60, 180, 400, 255], fill=(90, 80, 150), outline=(70,60,130), width=2)
    # Sofa armrests
    draw.rectangle([40,  200, 70,  360], fill=(80, 70, 140), outline=(60,55,120), width=2)
    draw.rectangle([390, 200, 420, 360], fill=(80, 70, 140), outline=(60,55,120), width=2)
    # Cushions
    for cx in [100, 200, 295]:
        draw.ellipse([cx, 190, cx+90, 250], fill=(120, 110, 180), outline=(90,80,150), width=1)

    # Coffee table
    draw.rectangle([120, 355, 350, 410], fill=(160, 110, 70), outline=(120,80,50), width=2)
    draw.rectangle([130, 408, 155, 430], fill=(130, 85, 50))
    draw.rectangle([315, 408, 340, 430], fill=(130, 85, 50))

    # TV stand
    draw.rectangle([450, 240, 620, 360], fill=(50, 50, 55), outline=(30,30,35), width=2)
    draw.rectangle([460, 100, 615, 245], fill=(30, 30, 35), outline=(20,20,25), width=2)
    draw.rectangle([468, 108, 608, 240], fill=(20, 90, 160))  # screen

    # Potted plant
    draw.rectangle([20, 300, 55, 355], fill=(120, 80, 40))
    draw.ellipse([0,  230, 70, 305],  fill=(50, 150, 50))
    draw.ellipse([10, 220, 60, 265],  fill=(70, 180, 60))

    return img.filter(ImageFilter.GaussianBlur(0.3))


# ---------------------------------------------------------------------------
# 4. dog_pet.jpg
# ---------------------------------------------------------------------------

def make_dog_pet() -> Image.Image:
    img  = Image.new("RGB", (IMAGE_W, IMAGE_H), color=(100, 180, 230))  # sky
    draw = ImageDraw.Draw(img)

    # Ground / grass
    draw.rectangle([0, 300, IMAGE_W, IMAGE_H], fill=(60, 140, 50))
    draw.rectangle([0, 290, IMAGE_W, 310],     fill=(50, 120, 40))
    # Grass tufts
    for gx in range(0, IMAGE_W, 15):
        h_tuft = (gx % 5) + 5
        draw.line([gx, 300, gx-3, 300-h_tuft], fill=(70,160,55), width=1)

    # Clouds
    for cx, cy in [(80, 70), (350, 50), (560, 90)]:
        draw.ellipse([cx-55, cy-20, cx+55, cy+20], fill=(255,255,255))
        draw.ellipse([cx-25, cy-32, cx+25, cy+8],  fill=(255,255,255))

    # Dog body (brown ellipse)
    draw.ellipse([200, 230, 450, 330], fill=(150, 90, 40), outline=(110,65,25), width=3)
    # Dog head
    draw.ellipse([380, 185, 490, 275], fill=(160, 100, 45), outline=(110,65,25), width=3)
    # Dog snout
    draw.ellipse([440, 220, 500, 265], fill=(175, 115, 55), outline=(120,75,30), width=2)
    # Nose
    draw.ellipse([455, 225, 480, 242], fill=(40, 25, 10))
    # Eye
    draw.ellipse([395, 193, 415, 212], fill=(30, 20, 10))
    draw.ellipse([399, 196, 408, 206], fill=(255, 255, 255))
    # Ear
    draw.ellipse([360, 170, 410, 220], fill=(120, 70, 30), outline=(90,50,20), width=2)
    # Tail
    draw.arc([440, 240, 540, 310], start=180, end=90, fill=(140, 85, 35), width=8)
    # Legs
    for lx in [220, 270, 360, 410]:
        draw.rectangle([lx, 315, lx+22, 365], fill=(140,85,35), outline=(100,60,20), width=2)
    # Collar
    draw.arc([380, 245, 490, 275], start=0, end=180, fill=(220, 50, 50), width=5)

    # Frisbee
    draw.ellipse([50, 240, 170, 275], fill=(255, 220, 50), outline=(220, 180, 20), width=3)
    draw.ellipse([80, 248, 140, 268], fill=(255, 240, 120))

    return img.filter(ImageFilter.GaussianBlur(0.4))


# ---------------------------------------------------------------------------
# 5. kitchen_items.jpg
# ---------------------------------------------------------------------------

def make_kitchen_items() -> Image.Image:
    img  = Image.new("RGB", (IMAGE_W, IMAGE_H), color=(245, 245, 248))  # white wall
    draw = ImageDraw.Draw(img)

    # Counter top
    draw.rectangle([0, 300, IMAGE_W, IMAGE_H], fill=(210, 200, 185))
    draw.rectangle([0, 290, IMAGE_W, 305],     fill=(180, 170, 155))

    # Cabinet above
    draw.rectangle([0, 0, IMAGE_W, 110], fill=(220, 210, 195))
    draw.rectangle([0, 105, IMAGE_W, 115], fill=(190, 180, 165))
    for cx in range(0, IMAGE_W, 160):
        draw.rectangle([cx+5, 10, cx+150, 100], fill=(205, 195, 180), outline=(180,170,155), width=2)
        draw.ellipse([cx+70, 50, cx+85, 60], fill=(180, 160, 130))  # handle

    # Microwave
    draw.rectangle([50, 130, 240, 220], fill=(55, 55, 60), outline=(30,30,35), width=2)
    draw.rectangle([60, 140, 190, 215], fill=(20, 20, 25))  # door glass
    draw.rectangle([195, 140, 235, 215], fill=(70, 70, 75))  # controls
    for ky in range(150, 210, 20):
        draw.rectangle([200, ky, 230, ky+12], fill=(90, 90, 95), outline=(60,60,65), width=1)

    # Toaster
    draw.rectangle([280, 240, 420, 295], fill=(200, 195, 190), outline=(160,155,150), width=2)
    draw.rectangle([310, 220, 350, 245], fill=(40, 40, 40), outline=(20,20,20), width=1)
    draw.rectangle([360, 220, 395, 245], fill=(40, 40, 40), outline=(20,20,20), width=1)
    # Lever
    draw.rectangle([412, 255, 428, 285], fill=(180, 175, 170), outline=(140,135,130), width=1)

    # Coffee mug
    draw.ellipse([470, 265, 560, 300],  fill=(255, 255, 255), outline=(200,200,200), width=2)
    draw.rectangle([470, 275, 560, 340], fill=(255, 255, 255), outline=(200,200,200), width=2)
    draw.ellipse([470, 330, 560, 350],  fill=(240, 240, 240))
    draw.arc([550, 285, 585, 325],  start=315, end=45, fill=(190,190,190), width=3)
    draw.ellipse([483, 268, 548, 285], fill=(180, 100, 40))  # coffee

    # Fruits bowl
    draw.arc([130, 285, 260, 310], start=180, end=0, fill=(180, 150, 110), width=4)
    draw.ellipse([145, 265, 180, 290], fill=(220, 50, 50))   # apple
    draw.ellipse([175, 258, 215, 290], fill=(255, 220, 0))   # banana curve
    draw.ellipse([210, 263, 245, 290], fill=(255, 140, 0))   # orange

    # Knife block
    draw.rectangle([570, 220, 620, 300], fill=(160, 110, 70), outline=(120,80,50), width=2)
    for kx in [578, 591, 604]:
        draw.rectangle([kx, 180, kx+5, 225], fill=(180, 180, 185), outline=(150,150,155), width=1)
        draw.polygon([(kx,225),(kx+5,225),(kx+2,235)], fill=(150,150,155))

    return img.filter(ImageFilter.GaussianBlur(0.3))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("Creating sample images in:", SAVE_DIR)
    SAVE_DIR.mkdir(parents=True, exist_ok=True)

    tasks = [
        ("office_desk.jpg",    make_office_desk),
        ("street_traffic.jpg", make_street_traffic),
        ("living_room.jpg",    make_living_room),
        ("dog_pet.jpg",        make_dog_pet),
        ("kitchen_items.jpg",  make_kitchen_items),
    ]

    for filename, fn in tasks:
        print(f"  Generating {filename}…", end=" ")
        try:
            img = fn()
            save(img, filename)
        except Exception as exc:
            print(f"FAILED: {exc}")

    print(f"\nDone. {len(tasks)} sample images created in {SAVE_DIR}\n")


if __name__ == "__main__":
    main()
