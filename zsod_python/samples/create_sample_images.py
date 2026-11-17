"""Generate 5 synthetic sample images for the gallery."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).parent
W, H = 640, 480

def save(img, name):
    img.save(str(OUT/name), quality=92)
    print(f"  Saved: {name}")

def office_desk():
    img=Image.new("RGB",(W,H),(210,210,210)); d=ImageDraw.Draw(img)
    d.rectangle([0,300,W,H],fill=(160,110,70))
    d.rectangle([140,170,380,310],fill=(50,50,55)); d.rectangle([155,110,365,165],fill=(30,30,35))
    d.rectangle([162,115,358,162],fill=(20,100,180))
    d.ellipse([430,260,530,310],fill=(220,220,220)); d.rectangle([430,270,530,350],fill=(220,220,220))
    d.arc([520,285,560,330],start=315,end=45,fill=(180,180,180),width=3)
    d.ellipse([440,265,520,285],fill=(100,60,20))
    d.rectangle([40,300,130,380],fill=(255,255,240),outline=(200,200,180),width=2)
    for y in range(315,375,12): d.line([55,y,115,y],fill=(180,180,180),width=1)
    return img.filter(ImageFilter.GaussianBlur(0.4))

def street_traffic():
    img=Image.new("RGB",(W,H),(135,185,230)); d=ImageDraw.Draw(img)
    for cx,cy in [(100,60),(300,40),(520,80)]:
        d.ellipse([cx-50,cy-25,cx+50,cy+25],fill=(250,250,255))
        d.ellipse([cx-30,cy-35,cx+30,cy+10],fill=(250,250,255))
    d.rectangle([0,290,W,H],fill=(90,90,90)); d.rectangle([0,290,W,310],fill=(110,110,110))
    for x in range(0,W,80): d.rectangle([x,370,x+40,382],fill=(255,255,255))
    d.rectangle([80,240,260,295],fill=(210,40,40),outline=(150,20,20),width=2)
    d.rectangle([110,210,230,245],fill=(180,30,30))
    d.ellipse([90,280,140,310],fill=(30,30,30)); d.ellipse([200,280,250,310],fill=(30,30,30))
    d.rectangle([360,235,560,292],fill=(40,80,200),outline=(20,50,150),width=2)
    d.rectangle([308,150,316,295],fill=(60,60,60))
    d.rectangle([300,145,325,230],fill=(40,40,40))
    d.ellipse([303,150,322,165],fill=(220,50,50))
    d.ellipse([303,170,322,185],fill=(220,180,50))
    d.ellipse([303,190,322,205],fill=(50,200,50))
    return img.filter(ImageFilter.GaussianBlur(0.3))

def living_room():
    img=Image.new("RGB",(W,H),(235,225,210)); d=ImageDraw.Draw(img)
    d.rectangle([0,350,W,H],fill=(190,155,110))
    d.rectangle([60,250,400,360],fill=(100,90,160),outline=(70,60,130),width=2)
    d.rectangle([60,180,400,255],fill=(90,80,150),outline=(70,60,130),width=2)
    d.rectangle([40,200,70,360],fill=(80,70,140)); d.rectangle([390,200,420,360],fill=(80,70,140))
    for cx in [100,200,295]: d.ellipse([cx,190,cx+90,250],fill=(120,110,180))
    d.rectangle([120,355,350,410],fill=(160,110,70))
    d.rectangle([450,240,620,360],fill=(50,50,55)); d.rectangle([460,100,615,245],fill=(30,30,35))
    d.rectangle([468,108,608,240],fill=(20,90,160))
    d.rectangle([20,300,55,355],fill=(120,80,40)); d.ellipse([0,230,70,305],fill=(50,150,50))
    return img.filter(ImageFilter.GaussianBlur(0.3))

def dog_pet():
    img=Image.new("RGB",(W,H),(100,180,230)); d=ImageDraw.Draw(img)
    d.rectangle([0,300,W,H],fill=(60,140,50)); d.rectangle([0,290,W,310],fill=(50,120,40))
    d.ellipse([200,230,450,330],fill=(150,90,40),outline=(110,65,25),width=3)
    d.ellipse([380,185,490,275],fill=(160,100,45),outline=(110,65,25),width=3)
    d.ellipse([440,220,500,265],fill=(175,115,55))
    d.ellipse([455,225,480,242],fill=(40,25,10))
    d.ellipse([395,193,415,212],fill=(30,20,10))
    d.ellipse([360,170,410,220],fill=(120,70,30))
    for lx in [220,270,360,410]: d.rectangle([lx,315,lx+22,365],fill=(140,85,35))
    d.arc([380,245,490,275],start=0,end=180,fill=(220,50,50),width=5)
    d.ellipse([50,240,170,275],fill=(255,220,50),outline=(220,180,20),width=3)
    return img.filter(ImageFilter.GaussianBlur(0.4))

def kitchen_items():
    img=Image.new("RGB",(W,H),(245,245,248)); d=ImageDraw.Draw(img)
    d.rectangle([0,300,W,H],fill=(210,200,185)); d.rectangle([0,0,W,110],fill=(220,210,195))
    d.rectangle([50,130,240,220],fill=(55,55,60),outline=(30,30,35),width=2)
    d.rectangle([60,140,190,215],fill=(20,20,25)); d.rectangle([195,140,235,215],fill=(70,70,75))
    d.rectangle([280,240,420,295],fill=(200,195,190))
    d.ellipse([470,265,560,300],fill=(255,255,255)); d.rectangle([470,275,560,340],fill=(255,255,255))
    d.arc([550,285,585,325],start=315,end=45,fill=(190,190,190),width=3)
    d.ellipse([483,268,548,285],fill=(180,100,40))
    d.arc([130,285,260,310],start=180,end=0,fill=(180,150,110),width=4)
    d.ellipse([145,265,180,290],fill=(220,50,50))
    d.ellipse([175,258,215,290],fill=(255,220,0))
    d.ellipse([210,263,245,290],fill=(255,140,0))
    return img.filter(ImageFilter.GaussianBlur(0.3))

print("Generating sample images...")
OUT.mkdir(parents=True, exist_ok=True)
save(office_desk(),    "office_desk.jpg")
save(street_traffic(), "street_traffic.jpg")
save(living_room(),    "living_room.jpg")
save(dog_pet(),        "dog_pet.jpg")
save(kitchen_items(),  "kitchen_items.jpg")
print("Done! 5 images created.")
