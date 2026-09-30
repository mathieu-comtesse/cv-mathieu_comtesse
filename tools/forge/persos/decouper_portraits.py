"""Découpe la planche de portraits (tools/forge/out/portraits-planche.png, rendue par portraits.js) en médaillons ronds 256 px :
assets/talas/por-<nom>.png (anneau blanc + filet sombre, comme les anciens médaillons). Même ordre que LISTE dans portraits.js."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PLANCHE = os.path.join(RACINE, 'tools', 'forge', 'out', 'portraits-planche.png')
SORTIE = os.path.join(RACINE, 'assets', 'talas')
NOMS = ['dylan', 'aurelien', 'mathieu', 'mathilde', 'neila', 'lorette', 'eliott', 'georges', 'bernard', 'boulon']
COLS, PX, T = 4, 512, 256
SS = 4                                   # sur-échantillonnage du masque (bords lisses)
ENCRE = (36, 20, 44, 255)


def medaillon(tuile):
    img = tuile.convert('RGB').resize((T, T), Image.LANCZOS)
    # léger éclat au centre, vignette douce sur les bords : le médaillon se lit mieux à 52 px
    lueur = Image.new('L', (T, T), 0)
    ImageDraw.Draw(lueur).ellipse((T * .18, T * .08, T * .82, T * .72), fill=70)
    lueur = lueur.filter(ImageFilter.GaussianBlur(T * .12))
    img = Image.composite(Image.new('RGB', (T, T), (255, 255, 255)), img, lueur.point(lambda v: int(v * .35)))
    big = T * SS
    masque = Image.new('L', (big, big), 0)
    ImageDraw.Draw(masque).ellipse((0, 0, big - 1, big - 1), fill=255)
    out = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    # disque de fond (filet sombre), anneau blanc, filet sombre intérieur, puis le portrait
    d = ImageDraw.Draw(out)
    d.ellipse((0, 0, big - 1, big - 1), fill=ENCRE)
    e1, e2 = 3 * SS, 12 * SS
    d.ellipse((e1, e1, big - 1 - e1, big - 1 - e1), fill=(255, 255, 255, 255))
    d.ellipse((e2, e2, big - 1 - e2, big - 1 - e2), fill=ENCRE)
    e3 = 15 * SS
    interieur = img.resize((big, big), Image.LANCZOS).convert('RGBA')
    m2 = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m2).ellipse((e3, e3, big - 1 - e3, big - 1 - e3), fill=255)
    out.paste(interieur, (0, 0), m2)
    return out.resize((T, T), Image.LANCZOS)


def main():
    if not os.path.exists(PLANCHE):
        sys.exit('planche introuvable : ' + PLANCHE)
    im = Image.open(PLANCHE).convert('RGB')
    for i, nom in enumerate(NOMS):
        x, y = (i % COLS) * PX, (i // COLS) * PX
        m = medaillon(im.crop((x, y, x + PX, y + PX)))
        m.save(os.path.join(SORTIE, 'por-%s.png' % nom), optimize=True)
        print('por-%s.png' % nom)


if __name__ == '__main__':
    main()
