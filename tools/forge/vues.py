"""Planche multi-angles d'un accessoire de la forge (rendu toon Blender identique à l'aperçu) :
   python tools/forge/vues.py <id> [<id> ...] [--px 700] [--vues 35:20,145:20,250:20,90:4,0:70]
Sortie : tools/forge/out/vues/<id>.png (grille des vues : yaw:pitch). Sert à la critique visuelle (boucle prévisualiser -> critiquer -> corriger de vibe-model)."""
import os, subprocess, sys, glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out', 'vues'); os.makedirs(OUT, exist_ok=True)


def blender():
    c = sorted(glob.glob('C:/Program Files/Blender Foundation/*/blender.exe'), reverse=True)
    return c[0] if c else 'blender'


def main():
    a = sys.argv[1:]
    px, vues = 700, '35:20,145:20,250:20,90:4,0:70,320:-8'
    ids = []
    i = 0
    while i < len(a):
        if a[i] == '--px': px = int(a[i + 1]); i += 2
        elif a[i] == '--vues': vues = a[i + 1]; i += 2
        else: ids.append(a[i]); i += 1
    for id_ in ids:
        raw = os.path.join(HERE, 'out', 'raw', id_ + '.glb')
        imgs = []
        for k, v in enumerate(vues.split(',')):
            yaw, pitch = v.split(':')
            png = os.path.join(OUT, '_%s_%d.png' % (id_, k))
            subprocess.run([blender(), '--background', '--factory-startup', '--python', os.path.join(HERE, 'blender_stage.py'), '--',
                            '--in', raw, '--out', os.path.join(OUT, '_tmp.glb'), '--png', png, '--max-tris', '0', '--yaw', yaw, '--pitch', pitch, '--px', str(px)],
                           capture_output=True)
            imgs.append(Image.open(png).convert('RGB'))
        cols = 3 if len(imgs) > 4 else 2
        rows = (len(imgs) + cols - 1) // cols
        sheet = Image.new('RGB', (px * cols, px * rows), (244, 234, 216))
        for k, im in enumerate(imgs):
            sheet.paste(im, ((k % cols) * px, (k // cols) * px))
        sheet.save(os.path.join(OUT, id_ + '.png'))
        for k in range(len(imgs)):
            os.remove(os.path.join(OUT, '_%s_%d.png' % (id_, k)))
        print('vues/%s.png' % id_)


if __name__ == '__main__':
    main()
