#!/usr/bin/env python3
"""ab_sheet.py - blind side-by-side (or grid) sheet for critics, with a separate answer key (Pillow only).

Puts a reference image and one or more candidate renders on one sheet in a seeded random order, labels them only
A, B, C..., scales them to equal height on a neutral grey ground, and writes which label is which file to a
separate key JSON that the critic never sees. Optional crop rows repeat the same region of every image, in the
same order, enlarged, for detail comparison (cut edges, fibre, shadows, stair steps, halos).

Usage:
  python ab_sheet.py --ref target.png render.png --out ab/sheet_01.png
  python ab_sheet.py old.png new.png --out ab/regress_03.png             no --ref: blind old-vs-new regression pair
  python ab_sheet.py --ref target.png a.png b.png c.png --out ab/grid.png --cols 2
  python ab_sheet.py --ref target.png render.png --out ab/edges.png --crop 0.42,0.45,0.12,0.12 --crop 0.7,0.3,0.1,0.1 --nearest
  python ab_sheet.py --ref target.png render.png --out deliver/side_by_side.png --reveal   labelled, fixed order (for people)

Crops: --crop X,Y,W,H as fractions of each image (0..1), or as pixels of the first image (the reference if given)
when any value is > 1. Each crop adds one row, enlarged to --crop-height (default half the panel height); add
--nearest to keep pixels hard-edged at high zoom. The same fractions are cut from every image, so they only show
the same content when the images share their framing: shoot candidates with the reference's camera and aspect.

Blindness: the sheet carries no file names, no metadata and no title; the order is shuffled with --seed (default:
derived from the input file contents, so each new pair gets its own order but re-running gives the same sheet).
The key goes to --key (default: <sheet folder>/keys/<sheet name>.json). Keep keys out of the critic's reach and
never print them into a critic's prompt. Name sheets neutrally (sheet_07.png, not new_vs_target.png): the critic
sees the path. Decode a verdict by looking up its label in the key's "labels".

Deterministic: same inputs and options give a byte-identical sheet and key.
"""
import argparse
import hashlib
import json
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

GROUND = (128, 128, 128)   # neutral mid grey: no colour cast toward either image
STRIP = (96, 96, 96)       # label strip
INK = (245, 245, 245)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def load(path):
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, GROUND + (255,))
        im = Image.alpha_composite(bg, im)
    return im.convert('RGB')


def font(px):
    try:
        return ImageFont.load_default(size=px)
    except (TypeError, OSError, AttributeError):   # old Pillow or no FreeType: small bitmap font
        return ImageFont.load_default()


def resize_h(im, h, nearest=False):
    w = max(1, round(im.width * h / im.height))
    return im.resize((w, h), Image.NEAREST if nearest else Image.LANCZOS)


def parse_crop(spec, ref_size):
    try:
        x, y, w, h = [float(v) for v in spec.split(',')]
    except ValueError:
        sys.exit('ab_sheet.py: --crop needs X,Y,W,H (fractions 0..1 or pixels), got %r' % spec)
    if max(x, y, w, h) > 1:  # pixels of the first image -> fractions
        x, w = x / ref_size[0], w / ref_size[0]
        y, h = y / ref_size[1], h / ref_size[1]
    if w <= 0 or h <= 0 or x < 0 or y < 0 or x + w > 1.0001 or y + h > 1.0001:
        sys.exit('ab_sheet.py: crop %r lies outside the image' % spec)
    return [round(x, 5), round(y, 5), round(w, 5), round(h, 5)]


def cut(im, c):
    x, y, w, h = c
    box = (round(x * im.width), round(y * im.height), round((x + w) * im.width), round((y + h) * im.height))
    return im.crop((box[0], box[1], max(box[2], box[0] + 1), max(box[3], box[1] + 1)))


def grid(panels, cols, gap, strip_h, fnt):
    """panels: list of (label, image) with equal heights. Returns one RGB block with labels above each panel."""
    rows = math.ceil(len(panels) / cols)
    cw = max(p.width for _, p in panels)
    ph = max(p.height for _, p in panels)
    W = cols * cw + (cols + 1) * gap
    H = rows * (ph + strip_h) + (rows + 1) * gap
    block = Image.new('RGB', (W, H), GROUND)
    d = ImageDraw.Draw(block)
    for i, (label, p) in enumerate(panels):
        r, c = divmod(i, cols)
        x0 = gap + c * (cw + gap)
        y0 = gap + r * (ph + strip_h + gap)
        d.rectangle([x0, y0, x0 + cw - 1, y0 + strip_h - 1], fill=STRIP)
        tb = d.textbbox((0, 0), label, font=fnt)
        d.text((x0 + (cw - (tb[2] - tb[0])) // 2 - tb[0], y0 + (strip_h - (tb[3] - tb[1])) // 2 - tb[1]), label,
               fill=INK, font=fnt)
        block.paste(p, (x0 + (cw - p.width) // 2, y0 + strip_h + (ph - p.height) // 2))
    return block


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], epilog=__doc__.split('\n', 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('candidates', nargs='+', help='candidate render(s); without --ref give at least two')
    ap.add_argument('--ref', help='the reference / target image (shuffled in with the candidates)')
    ap.add_argument('--out', required=True, help='sheet path (.png or .jpg)')
    ap.add_argument('--key', help='answer key path (default: <sheet folder>/keys/<sheet name>.json)')
    ap.add_argument('--seed', type=int, help='order seed (default: derived from the input file contents)')
    ap.add_argument('--height', type=int, help='panel height in px (default: smallest input height, at most 900)')
    ap.add_argument('--cols', type=int, help='panels per row (default: all in one row up to 3, else a grid)')
    ap.add_argument('--gap', type=int, default=24, help='neutral grey gap in px (default 24)')
    ap.add_argument('--crop', action='append', default=[], metavar='X,Y,W,H',
                    help='detail region (fractions, or pixels of the first image); repeatable')
    ap.add_argument('--crop-height', type=int, help='height of the enlarged crops (default: half the panel height)')
    ap.add_argument('--nearest', action='store_true', help='enlarge crops with nearest-neighbour (pixel-exact)')
    ap.add_argument('--reveal', action='store_true',
                    help='NOT blind: keep the given order (reference first) and label panels with file names')
    args = ap.parse_args(argv)

    files = ([args.ref] if args.ref else []) + args.candidates
    if len(files) < 2:
        ap.error('need at least two images (a --ref plus a candidate, or two candidates)')
    for f in files:
        if not os.path.isfile(f):
            ap.error('no such file: %s' % f)
    hashes = [sha256(f) for f in files]
    roles = (['reference'] if args.ref else []) + ['candidate'] * len(args.candidates)
    items = [dict(file=os.path.abspath(f), role=r, sha256=h) for f, r, h in zip(files, roles, hashes)]

    seed = args.seed
    if seed is None:
        seed = int(hashlib.sha256(''.join(sorted(hashes)).encode()).hexdigest()[:8], 16)
    if not args.reveal:
        random.Random(seed).shuffle(items)
    labels = [chr(ord('A') + i) if i < 26 else 'Z%d' % (i - 25) for i in range(len(items))]
    if args.reveal:
        labels = [('REF ' if it['role'] == 'reference' else '') + os.path.splitext(os.path.basename(it['file']))[0][:40]
                  for it in items]

    images = [load(it['file']) for it in items]
    h = args.height or min(900, min(im.height for im in images))
    cols = args.cols or (len(images) if len(images) <= 3 else math.ceil(math.sqrt(len(images))))
    strip_h = max(28, round(h * 0.06))
    fnt = font(round(strip_h * 0.7))
    blocks = [grid([(lab, resize_h(im, h)) for lab, im in zip(labels, images)], cols, args.gap, strip_h, fnt)]

    first = load(files[0]).size
    crops = [parse_crop(c, first) for c in args.crop]
    ch = args.crop_height or max(64, h // 2)
    for k, c in enumerate(crops, 1):
        panels = [('%s  detail %d' % (lab, k), resize_h(cut(im, c), ch, args.nearest)) for lab, im in zip(labels, images)]
        blocks.append(grid(panels, cols, args.gap, strip_h, fnt))

    W = max(b.width for b in blocks)
    sheet = Image.new('RGB', (W, sum(b.height for b in blocks) - args.gap * (len(blocks) - 1)), GROUND)
    y = 0
    for b in blocks:
        sheet.paste(b, ((W - b.width) // 2, y))
        y += b.height - args.gap
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    if args.out.lower().endswith(('.jpg', '.jpeg')):
        sheet.save(args.out, quality=92)
    else:
        sheet.save(args.out)

    key_path = args.key or os.path.join(os.path.dirname(os.path.abspath(args.out)), 'keys',
                                        os.path.splitext(os.path.basename(args.out))[0] + '.json')
    key = dict(sheet=os.path.abspath(args.out), blind=not args.reveal, seed=seed,
               reference=next((lab for lab, it in zip(labels, items) if it['role'] == 'reference'), None),
               labels={lab: it['file'] for lab, it in zip(labels, items)},
               order=[dict(label=lab, **it) for lab, it in zip(labels, items)],
               panelHeight=h, crops=crops)
    os.makedirs(os.path.dirname(os.path.abspath(key_path)), exist_ok=True)
    with open(key_path, 'w', encoding='utf-8') as fh:
        json.dump(key, fh, indent=1)
        fh.write('\n')
    print('wrote %s (%d panels%s, %dx%d) and key %s' % (args.out, len(items), ', %d detail rows' % len(crops)
                                                         if crops else '', sheet.width, sheet.height, key_path))
    return 0


if __name__ == '__main__':
    sys.exit(main())
