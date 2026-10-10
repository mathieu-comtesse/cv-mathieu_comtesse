from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, random

root = Path(__file__).resolve().parents[1]
out = root.parents[1] / 'outputs' / 'v50-book'
out.mkdir(parents=True, exist_ok=True)
W, H = 1024, 1420
fonts = Path('C:/Windows/Fonts')
serif = lambda size: ImageFont.truetype(str(fonts / 'georgia.ttf'), size)
italic = lambda size: ImageFont.truetype(str(fonts / 'georgiai.ttf'), size)
small = lambda size: ImageFont.truetype(str(fonts / 'cour.ttf'), size)
rng = random.Random(50)

def cloth():
    im = Image.new('RGB', (W, H), '#303630')
    d = ImageDraw.Draw(im)
    for y in range(H):
        v = rng.randint(-4, 4)
        d.line((0, y, W, y), fill=(47+v, 53+v, 47+v))
    for x in range(0, W, 3):
        d.line((x, 0, x, H), fill=(49, 55, 49))
    return im

def centered(d, y, text, font, color='#ece6d5'):
    d.text((W/2, y), text, font=font, fill=color, anchor='mt')

im = cloth(); d = ImageDraw.Draw(im)
centered(d, 112, 'FRAGMENTS', small(22), '#c4c1ad')
centered(d, 164, 'de montagne', italic(65))
photo = Image.open(root/'assets/film/1514.webp').convert('RGB')
photo.thumbnail((570, 740))
x, y = (W-photo.width)//2, 342
d.rectangle((x-12,y-12,x+photo.width+12,y+photo.height+12), fill='#dbd5c5')
im.paste(photo,(x,y))
d = ImageDraw.Draw(im)
centered(d, 1212, 'Mathieu Comtesse', serif(32))
centered(d, 1294, 'PHOTOGRAPHIES ARGENTIQUES · 20 TIRAGES', small(16), '#c4c1ad')
im.save(out/'front-cover.png')

im = cloth(); d = ImageDraw.Draw(im)
centered(d, 270, 'Vingt regards', italic(56))
centered(d, 342, 'sur la montagne.', italic(56))
photo = Image.open(root/'assets/film/1507.webp').convert('RGB'); photo.thumbnail((580, 380))
im.paste(photo,((W-photo.width)//2,570))
d = ImageDraw.Draw(im)
for y, line in [(1060,'Le grain. La lumière. Le silence.'),(1110,'Des paysages conservés sur pellicule.')]:
    centered(d,y,line,serif(22),'#d1cebd')
centered(d, 1290, 'MATHIEU COMTESSE', small(19), '#c4c1ad')
im.save(out/'back-cover.png')

im = Image.new('RGB',(W,H),'#e8e0cc');d=ImageDraw.Draw(im)
for i in range(16000):
    x,y=rng.randrange(W),rng.randrange(H)
    d.point((x,y),fill=('#d9ceb8' if i%2 else '#f3ecd9'))
centered(d, 1120,'Carnet argentique',italic(30),'#81745e')
centered(d, 1174,'Mathieu Comtesse',serif(22),'#81745e')
im.save(out/'endpaper.png')

im=Image.new('RGB',(1024,128),'#343a33');d=ImageDraw.Draw(im)
d.text((512,64),'FRAGMENTS DE MONTAGNE',font=small(31),fill='#d8d2bd',anchor='mm')
im.save(out/'spine-print.png')
print(json.dumps({'textures':[p.name for p in out.glob('*.png')],'sourcePhotographsUnchanged':True}))
