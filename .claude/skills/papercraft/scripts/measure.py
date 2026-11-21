#!/usr/bin/env python3
"""measure.py - paper-look metrics for a render, a still or a video frame (numpy + Pillow only).

Every image is resized to a working width (default 1600 px; the gates assume it) and measured for:

  tone     luma p5 / p50 / p95 / mean (Rec.709 luma of the sRGB values), clipped pixels %, mean HSV saturation,
           CIELAB chroma mean and p95, % of strongly saturated green ("video-game grass")
  light    mean colour of the darkest 20 % (paper shadows take the world's colour: warm umber on warm ground by
           day, lilac-blue on snow, teal under water, navy at night; never neutral grey or black) and of the brightest 20 % (paper white is cream, not blue-white), warm/cool split (left third
           minus right third), luma left/right, corner/centre luma (vignette or a dark surround)
  lens     blur per horizontal band in px, estimated at edges from the ratio of fine- to coarse-scale gradient
           (independent of edge contrast), plus edge energy per band (p99.5 Sobel); centre and height of the sharp
           band (half-max), sharp/top and sharp/bottom ratios, tiltShift = the larger of the two, peakBlur (blur
           of the sharpest band), dofSpread = blur of the softest vs the sharpest tiles of an 8x6 grid (orientation
           free, so it also works for close-ups whose blur follows depth rather than screen height)
  paper    toothRms: RMS of band-passed luma (Gaussian sigma 1 minus sigma 4) on flat areas of the sharp band;
           flatPct: share of the sharp band with no edge or print at all (bare flat colour; fibre does not count)
  palette  k-means in CIELAB (hex + share). With --target IMAGE: paletteDE = symmetric, share-weighted
           nearest-colour distance (CIEDE2000, or CIE76 with --de 76), paletteWorst = the worst cluster of >= 5 %
           share in either direction, plus each cluster's nearest target colour and the target colours missing.
           With --palette HEXES (a written palette, e.g. from a style card): frame->palette only and looser gates
           (*_written), because authored albedos sit 5-12 dE from lit pixels and one shot never shows them all

Each metric that has a range gets PASS or WARN, with a hint on what usually fixes a miss. The ranges are STARTING
GATES: "storybook" admits every day frame of a shipped pop-up game's five biomes (autumn farmland, desert, snow,
spring gardens, misty pine forest: the stills in assets/gallery/ and 15 earlier stills and video frames, close-ups
included), so a snowy, misty, dark-forest or desert brief is not pushed toward warm autumn colour; "dusk" is
calibrated on the 3D template's golden and dusk sets and a black-sand dusk build; "night" admits its night stills. PASS means "not obviously off", never "looks good": shapes, construction,
density and composition decide how a piece reads, and no metric here can see them. With --target, the table also
shows the target's values, and metrics that have a "tol" WARN when they are further than tol from the target. A
look of your own needs its own target or ranges: --dump-ranges, edit, --ranges.

Usage:
  python measure.py frame.png                           table with PASS/WARN against the storybook gates
  python measure.py frame.png --target target.png       + target values, tol checks and palette distance
  python measure.py a.png b.png c.png --compact         one row per image (compare passes or variants)
  python measure.py frame.png --palette "#rrggbb,#rrggbb,..."   palette distance to your style card's written palette
  python measure.py dusk.png --profile dusk             golden hour and dusk (night: --profile night)
  python measure.py clip.mp4 --at 1,4.5,9               frames of a video (needs ffmpeg on PATH)
  python measure.py frame.png --json out.json           also write everything as JSON ("-" = JSON to stdout)
  python measure.py --dump-ranges storybook > my.json   copy the gates, edit them, then: --ranges my.json
  python measure.py ui.png --profile flat               UI pages, print, flat 2D art: lens, corner, flat-area and
                                                        print-density gates off (a pitched 2D world uses storybook)

Profiles: storybook (default: day in any biome, shadows coloured by the world, tilt-shift; also a pitched 2D world),
dusk (golden hour and dusk: low light empties print detail, shadows go violet, a dark floor the brief names; palette
gates off), night (indigo ambient, amber practicals; palette gates off), flat (UI pages, print, flat 2D art: no lens,
no density).
Ranges file: {"metric": {"min": 0.1, "max": 0.5, "tol": 0.05, "low": "fix if low", "high": "fix if high"}} or
{"metric": [min, max]}; null = unbounded ("hint" sets both texts). Keys you leave out keep the profile's values;
{"metric": null} removes a gate.

Deterministic: the same input and options give the same numbers (seeded k-means, no clocks, no randomness).
Exit code 0, or 1 with --strict when any gate WARNs (use it as a CI / loop gate, never as proof of quality).
"""
import argparse
import io
import json
import math
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image

VIDEO_EXT = {'.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'}


def G(lo=None, hi=None, tol=None, low='', high=''):
    """A gate: range [lo, hi] (None = open), tol vs the target, and what to do when a value is too low / high."""
    return dict(min=lo, max=hi, tol=tol, low=low, high=high)


# ----------------------------------------------------------------------------------------------------------------
# Default gates. min/max: range (None = unbounded). tol: max |value - target value|, used only with --target.
# The measured ranges behind them are listed in references/process.md (step 6, "Measure").
# ----------------------------------------------------------------------------------------------------------------
STORYBOOK = {
    'lumaP5': G(0.03, 0.30, 0.08, 'blacks crushed: lift the shadows with the world\'s shadow tint, nothing pure black',
                'no darks: the frame looks washed out; deepen contact shadows, add dark accents'),
    'lumaP50': G(0.30, 0.75, 0.22, 'too dark overall: raise exposure or fill (a dark floor the brief names, black sand or slate, sits lower: judge by eye)', 'too bright overall: lower exposure'),
    'lumaP95': G(0.55, 0.92, 0.08, 'paper whites dim and murky: brighten the key or the cream stock (a dark forest sits ~0.6)',
                 'whites near clipping: lower exposure / bloom'),
    'clipPct': G(None, 1.0, None, '', 'blown pixels: lower exposure / bloom; only small emissive panes may clip'),
    'satMean': G(0.12, 0.80, 0.12, 'no colour at all: even snow and fog frames keep ~0.15 (accents on every piece, '
                 'grade saturation ~0.95; colourful briefs land at 0.55-0.75, snow / mist / fog far lower, which is right)',
                 'over-saturated, reads as toy plastic: lower the grade saturation'),
    'chromaP95': G(25.0, 76.0, 15.0, 'no saturated accents: add one hot accent family from the brief',
                   'neon colours: cap the most saturated inks and lights'),
    'greenPct': G(None, 15.0, None, '', 'saturated, uniform green reads as video-game grass: mute the greens a step greyer and keep the grade\'s green pull (palettes.md rule 5)'),
    'shadowWarmth': G(0.06, None, 0.17, 'shadows neutral grey or black: give them the colour of the world (warm umber on warm ground; lilac-blue snow or teal water shadows may WARN here: judge those by eye)',
                      'shadows warmer than the target'),
    'highlightWarmth': G(-0.03, None, None, 'paper white is blue-white: warm the key / white balance to cream', ''),
    'warmthLR': G(-0.10, 0.40, 0.16, 'the key-light side is cooler than the far side (or a large cool print sits there: water, snow; check the key-only frame)',
                  'warm/cool split stronger than wanted: soften the fill colour'),
    'cornerCentre': G(0.50, 1.20, None, 'corners near black: a heavy vignette or a dark surround; keep the vignette mild (~0.03 by day) and the printed ground past every edge',
                      'corners brighter than the centre: the subject sits in shadow (expected when a bright surround '
                      'such as snow or a cloud sea frames a darker subject: judge by eye)'),
    'focusCentre': G(0.25, 0.75, 0.20, 'sharp band sits too high', 'sharp band sits too low'),
    'focusHeight': G(0.35, None, 0.10, 'sharp band too thin, the frame reads as mush: widen the band, soften the ramp',
                     'sharp band wider than the target'),
    'tiltShift': G(None, None, None, 'weaker tilt-shift than the target', 'stronger tilt-shift than the target'),
    'peakBlur': G(None, 1.5, None, '', 'even the sharpest band is soft: full-res render, AA, focus distance'),
    'dofSpread': G(1.8, None, None, 'no depth of field: blur the far (and near) parts so the scene reads miniature',
                   'more blur spread than the target'),
    'toothRms': G(0.010, 0.025, 0.007, 'no paper tooth (plastic / vector fill): add two-octave fibre to every fill',
                  'noisy (felt, screen grain or compression): calm the fibre'),
    'flatPct': G(None, 70.0, 15.0, 'busier than the target: leave air between clusters',
                 'too much bare flat colour: print pattern inside every piece, add pieces (quiet ground between '
                 'clusters is right; this flags pieces and ground with no print at all)'),
    'paletteDE': G(None, 9.0, None, '', 'palette drifted from the target: re-tint the clusters with the largest dE'),
    'printDetail': G(0.060, None, 0.015, 'the pieces print too little: more, smaller motifs in every print, a dark third value', ''),
    'localContrast': G(0.072, None, 0.012, 'prints and shadows too flat: a dark third value in every print, deeper contact shadows', ''),
    'barePct': G(None, 58.0, 12.0, '', 'the sharp band is too empty: groups of 4-8 different pieces, low fillers between them; open ground on paths, water, clearings'),
    'paletteWorst': G(None, 16.0, None, '', 'a big colour area the target lacks, or a target colour you lack (see list)'),
    # with --palette (written hexes): frame->palette only; authored albedos sit ~5-12 dE from lit pixels
    'paletteDE_written': G(None, 12.0, None, '', 'frame colours drift from the written palette: re-tint the worst clusters'),
    'paletteWorst_written': G(None, 20.0, None, '', 'a big colour area that no palette colour explains'),
}

NIGHT = dict(STORYBOOK)
NIGHT.update({
    'lumaP5': G(None, 0.10, 0.06, '', 'night looks washed out: deepen the ambient'),
    'lumaP50': G(0.08, 0.35, 0.10, 'too dark: pieces must stay readable in the blue ambient', 'too bright for night'),
    'lumaP95': G(0.35, 0.80, 0.10, 'no bright practicals: light windows and lamps', 'too bright for night'),
    'satMean': G(0.30, 0.75, 0.12, 'grey night: no neutral greys, use indigo ambient + amber practicals',
                 'over-saturated'),
    'chromaP95': G(15.0, 76.0, 15.0, 'no colour accents at night', 'neon colours'),
    'shadowWarmth': G(None, 0.10, 0.20, '', 'warm brown shadows at night: a darkened day grade; make the ambient indigo'),
    'highlightWarmth': G(-0.05, None, None, 'highlights blue-white: practicals (windows, lamps) are amber', ''),
    'warmthLR': G(),
    'cornerCentre': G(0.10, 0.80, None, 'corners crushed to black: lift the far background a little',
                      'corners as bright as the centre: let the night fall off'),
    'flatPct': G(None, 75.0, 15.0, 'busier than the target', 'too much bare flat colour'),
    # darkness hides print and empties the sharp band: the shipped night stills measure printDetail ~0.04-0.05,
    # localContrast ~0.06-0.07, barePct up to ~70
    'printDetail': G(0.035, None, 0.015, 'the pieces print too little even for night: more, bolder motifs', ''),
    'localContrast': G(0.050, None, 0.012, 'prints and shadows too flat even for night: a dark third value, lit panes', ''),
    'barePct': G(None, 72.0, 12.0, '', 'the sharp band is empty even for night: groups of different pieces, lit windows'),
})

FLAT = dict(STORYBOOK)
for _k in ('warmthLR', 'cornerCentre', 'focusCentre', 'focusHeight', 'tiltShift', 'peakBlur', 'dofSpread', 'flatPct', 'printDetail', 'localContrast', 'barePct'):
    FLAT[_k] = G()  # info only for flat media
FLAT.update({
    'lumaP5': G(0.02, 0.60, 0.08, 'ink and shadows crushed to black: use dark warm brown ink',
                'no dark ink at all: text and outlines need contrast'),
    'lumaP50': G(0.25, 0.90, 0.15, 'page too dark', 'page too bright'),
    'lumaP95': G(0.55, 0.95, 0.08, 'paper white dim', 'paper white is cream, not pure #FFFFFF'),
    'satMean': G(0.05, 0.75, 0.12, 'no colour at all', 'over-saturated, not paper'),
    'chromaP95': G(10.0, 76.0, 15.0, 'no accents', 'neon colours'),
    'shadowWarmth': G(0.02, None, 0.17, 'ink and shadows neutral black or blue: use warm brown', 'warmer than the target'),
    'toothRms': G(0.005, 0.030, 0.007, 'fills need a visible fibre / tooth texture', 'noisy texture'),
})

# golden hour and dusk: low light empties print detail and contrast as night does, the shadows go violet or indigo
# (shadowWarmth reads them as neutral), and a dark floor the brief names (black sand, slate) sits lower; calibrated so
# the 3D template's golden and dusk sets and a black-sand dusk build pass
DUSK = dict(STORYBOOK)
DUSK.update({
    'lumaP5': G(None, 0.30, 0.08, '', 'no darks at all at dusk: deepen the contact shadows'),
    'lumaP50': G(0.22, 0.75, 0.22, 'too dark even for dusk: raise the exposure or the fill', 'too bright for dusk'),
    'lumaP95': G(0.50, 0.92, 0.08, 'no bright paper or lit panes at dusk', 'whites near clipping'),
    'shadowWarmth': G(),
    'warmthLR': G(-0.20, 0.50, 0.16, 'the key side is much cooler than the far side', 'warm/cool split too strong'),
    'printDetail': G(0.045, None, 0.015, 'the pieces print too little even for dusk', ''),
    'localContrast': G(0.060, None, 0.012, 'prints and shadows too flat even for dusk', ''),
    'barePct': G(None, 68.0, 12.0, '', 'the sharp band is empty even for dusk: groups of different pieces'),
})

PROFILES = {'storybook': STORYBOOK, 'dusk': DUSK, 'night': NIGHT, 'flat': FLAT}

# order and number format of the table rows
ROWS = [
    ('lumaP5', '%.3f'), ('lumaP50', '%.3f'), ('lumaP95', '%.3f'), ('lumaMean', '%.3f'), ('clipPct', '%.2f'),
    ('satMean', '%.3f'), ('chromaMean', '%.1f'), ('chromaP95', '%.1f'), ('greenPct', '%.2f'),
    ('shadowHex', '%s'), ('shadowWarmth', '%.3f'), ('highlightHex', '%s'), ('highlightWarmth', '%.3f'),
    ('warmthLR', '%.3f'), ('lumaLR', '%.2f'), ('cornerCentre', '%.2f'),
    ('focusCentre', '%.2f'), ('focusHeight', '%.2f'), ('sharpTop', '%.2f'), ('sharpBottom', '%.2f'),
    ('tiltShift', '%.2f'), ('peakBlur', '%.2f'), ('dofSpread', '%.2f'), ('toothRms', '%.4f'), ('flatPct', '%.1f'), ('printDetail', '%.3f'), ('localContrast', '%.3f'), ('barePct', '%.1f'),
    ('paletteDE', '%.1f'), ('paletteWorst', '%.1f'),
]
COMPACT = ['lumaP5', 'lumaP50', 'lumaP95', 'satMean', 'chromaP95', 'shadowHex', 'shadowWarmth', 'warmthLR',
           'cornerCentre', 'focusCentre', 'focusHeight', 'tiltShift', 'dofSpread', 'toothRms', 'flatPct', 'printDetail',
           'localContrast', 'barePct', 'paletteDE', 'paletteWorst']


# ----------------------------------------------------------------------------------------------------------------
# loading
# ----------------------------------------------------------------------------------------------------------------
def video_frame(path, at):
    exe = shutil.which('ffmpeg')
    if not exe:
        sys.exit('measure.py: %s is a video; install ffmpeg (on PATH) or export a frame as PNG first' % path)
    cmd = [exe, '-v', 'error', '-ss', str(at), '-i', path, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']
    out = subprocess.run(cmd, capture_output=True)
    if out.returncode or not out.stdout:
        sys.exit('measure.py: ffmpeg could not read a frame at %ss from %s: %s' % (at, path, out.stderr.decode()[:300]))
    return Image.open(io.BytesIO(out.stdout))


def to_rgb(im):
    if im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (128, 128, 128, 255))  # transparent areas count as neutral grey
        im = Image.alpha_composite(bg, im)
    return im.convert('RGB')


def prepare(im, width):
    im = to_rgb(im)
    w0, h0 = im.size
    h = max(1, round(h0 * width / w0))
    if (w0, h0) != (width, h):
        im = im.resize((width, h), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255.0, (w0, h0)


# ----------------------------------------------------------------------------------------------------------------
# colour
# ----------------------------------------------------------------------------------------------------------------
_M = np.array([[0.4124564, 0.3575761, 0.1804375],
               [0.2126729, 0.7151522, 0.0721750],
               [0.0193339, 0.1191920, 0.9503041]])
_WHITE = np.array([0.95047, 1.0, 1.08883])


def lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def gam(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def rgb2lab(rgb):
    xyz = lin(rgb) @ _M.T / _WHITE
    d = 6 / 29
    f = np.where(xyz > d ** 3, np.cbrt(xyz), xyz / (3 * d * d) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab2rgb(lab):
    lab = np.asarray(lab, dtype=np.float64)
    fy = (lab[..., 0] + 16) / 116
    f = np.stack([fy + lab[..., 1] / 500, fy, fy - lab[..., 2] / 200], -1)
    d = 6 / 29
    xyz = np.where(f > d, f ** 3, 3 * d * d * (f - 4 / 29)) * _WHITE
    return gam(xyz @ np.linalg.inv(_M).T)


def hexof(rgb):
    r, g, b = [int(round(float(v) * 255)) for v in np.clip(rgb, 0, 1)]
    return '#%02X%02X%02X' % (r, g, b)


def parse_hex(h):
    h = h.strip().lstrip('#')
    if len(h) == 3:
        h = ''.join(c + c for c in h)
    if len(h) != 6:
        raise ValueError('not a hex colour: #' + h)
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def warmth(rgb):
    """(R - B) / (R + G + B): > 0 warm, < 0 cool."""
    r, g, b = [float(v) for v in rgb]
    return (r - b) / (r + g + b + 1e-6)


def hsv(a):
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    return np.where(d > 0, h, 0), s, mx


def de2000(lab1, lab2):
    """CIEDE2000 colour difference, vectorised (broadcasts)."""
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    cb7 = ((np.hypot(a1, b1) + np.hypot(a2, b2)) / 2) ** 7
    g = 0.5 * (1 - np.sqrt(cb7 / (cb7 + 25.0 ** 7)))
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    zero = (c1p * c2p) == 0
    dh = h2p - h1p
    dh = np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh))
    dh = np.where(zero, 0, dh)
    dL, dC = L2 - L1, c2p - c1p
    dH = 2 * np.sqrt(c1p * c2p) * np.sin(np.radians(dh / 2))
    Lb, Cb = (L1 + L2) / 2, (c1p + c2p) / 2
    hs = h1p + h2p
    hb = np.where(zero, hs, np.where(np.abs(h1p - h2p) <= 180, hs / 2, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2)))
    t = (1 - 0.17 * np.cos(np.radians(hb - 30)) + 0.24 * np.cos(np.radians(2 * hb))
         + 0.32 * np.cos(np.radians(3 * hb + 6)) - 0.20 * np.cos(np.radians(4 * hb - 63)))
    dth = 30 * np.exp(-((hb - 275) / 25) ** 2)
    cb7p = Cb ** 7
    rc = 2 * np.sqrt(cb7p / (cb7p + 25.0 ** 7))
    sl = 1 + 0.015 * (Lb - 50) ** 2 / np.sqrt(20 + (Lb - 50) ** 2)
    sc, sh = 1 + 0.045 * Cb, 1 + 0.015 * Cb * t
    rt = -np.sin(np.radians(2 * dth)) * rc
    return np.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh))


def de76(lab1, lab2):
    return np.sqrt(((lab1 - lab2) ** 2).sum(-1))


# ----------------------------------------------------------------------------------------------------------------
# filters (separable, numpy only)
# ----------------------------------------------------------------------------------------------------------------
def _conv1d(a, k, axis):
    r = len(k) // 2
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r, r)
    p = np.pad(a, pad, mode='symmetric')
    n = a.shape[axis]
    out = np.zeros_like(a)
    for i, w in enumerate(k):
        sl = [slice(None)] * a.ndim
        sl[axis] = slice(i, i + n)
        out += w * p[tuple(sl)]
    return out


def gauss(a, sigma):
    r = int(4 * sigma + 0.5)
    x = np.arange(-r, r + 1, dtype=np.float64)
    k = np.exp(-0.5 * (x / sigma) ** 2)
    k = (k / k.sum()).astype(a.dtype)
    return _conv1d(_conv1d(a, k, 0), k, 1)


def sobel(L):
    """Per-pixel gradient (Sobel / 8), like scipy.ndimage.sobel(L, axis) / 8."""
    p = np.pad(L, 1, mode='symmetric')
    dx = p[:, 2:] - p[:, :-2]
    dy = p[2:, :] - p[:-2, :]
    gx = (dx[:-2] + 2 * dx[1:-1] + dx[2:]) / 8
    gy = (dy[:, :-2] + 2 * dy[:, 1:-1] + dy[:, 2:]) / 8
    return gx, gy


def maxfilter(a, size):
    r = size // 2
    out = a
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r, r)
        p = np.pad(out, pad, mode='edge')
        n = a.shape[axis]
        sl = [slice(None), slice(None)]
        sl[axis] = slice(0, n)
        acc = p[tuple(sl)].copy()
        for i in range(1, 2 * r + 1):
            sl[axis] = slice(i, i + n)
            np.maximum(acc, p[tuple(sl)], out=acc)
        out = acc
    return out


# ----------------------------------------------------------------------------------------------------------------
# palette
# ----------------------------------------------------------------------------------------------------------------
def kmeans(X, k, seed=1, iters=40):
    rng = np.random.default_rng(seed)
    X = X.astype(np.float64)
    k = min(k, len(np.unique(np.round(X, 1), axis=0)))
    C = [X[rng.integers(len(X))]]
    d2 = ((X - C[0]) ** 2).sum(1)
    for _ in range(1, k):  # k-means++ seeding
        s = d2.sum()
        c = X[rng.choice(len(X), p=d2 / s)] if s > 0 else X[rng.integers(len(X))]
        C.append(c)
        d2 = np.minimum(d2, ((X - c) ** 2).sum(1))
    C = np.array(C)
    for _ in range(iters):
        idx = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        newC = np.array([X[idx == j].mean(0) if np.any(idx == j) else C[j] for j in range(len(C))])
        if np.allclose(newC, C, atol=1e-4):
            break
        C = newC
    idx = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
    return C, idx


def palette(a, k=8, step=6, seed=1):
    lab = rgb2lab(a[::step, ::step].reshape(-1, 3))
    C, idx = kmeans(lab, k, seed)
    out = []
    for j in range(len(C)):
        share = float((idx == j).mean())
        if share <= 0:
            continue
        out.append(dict(hex=hexof(lab2rgb(C[j])), share=round(share, 3), lab=[round(float(v), 2) for v in C[j]],
                        L=round(float(C[j][0]), 1), C=round(float(np.hypot(C[j][1], C[j][2])), 1),
                        hue=round(float(np.degrees(np.arctan2(C[j][2], C[j][1])) % 360), 0)))
    return sorted(out, key=lambda c: (-c['share'], c['hex']))


def palette_from_hexes(spec):
    """'#aabbcc,#ddeeff' or '#aabbcc:0.3 ...' or a .json/.txt file with such items; equal shares by default."""
    if os.path.isfile(spec):
        txt = open(spec, encoding='utf-8').read()
        try:
            items = json.loads(txt)
            if isinstance(items, dict):
                items = items.get('palette', items.get('colors', items.get('colours', [])))
        except ValueError:
            items = txt.replace(',', ' ').split()
    else:
        items = spec.replace(',', ' ').split()
    cols = []
    for it in items:
        try:
            if isinstance(it, dict):
                h, s = it.get('hex'), it.get('share')
            else:
                h, _, s = str(it).partition(':')
                s = float(s) if s else None
            rgb = parse_hex(str(h))
        except ValueError as e:
            sys.exit('measure.py: --palette: %s (use "#rrggbb,#rrggbb,...")' % e)
        cols.append(dict(hex=hexof(rgb), share=s, lab=[float(v) for v in rgb2lab(rgb)]))
    if not cols:
        sys.exit('measure.py: --palette has no colours')
    known = sum(c['share'] or 0 for c in cols)
    free = [c for c in cols if c['share'] is None]
    for c in free:
        c['share'] = max(0.0, 1 - known) / len(free) if known < 1 else 0.0
    tot = sum(c['share'] for c in cols) or 1.0
    for c in cols:
        c['share'] = c['share'] / tot
    return cols


def palette_distance(pal, ref, metric='2000', written=False, big=0.05):
    """Share-weighted nearest-colour distance. Image target: symmetric (frame->target and target->frame averaged;
    worst = the worst >= 5 % cluster either way). Written palette: frame->palette only, because a style card lists
    colours that need not all be in every shot (absent ones are still listed in targetColours)."""
    fn = de2000 if metric == '2000' else de76
    A = np.array([c['lab'] for c in pal])
    B = np.array([c['lab'] for c in ref])
    sa, sb = np.array([c['share'] for c in pal]), np.array([c['share'] for c in ref])
    D = fn(A[:, None, :], B[None, :, :])
    a2b, b2a = D.min(1), D.min(0)
    fwd, back = float((a2b * sa).sum() / sa.sum()), float((b2a * sb).sum() / sb.sum())
    worst_f = [float(a2b[i]) for i in range(len(A)) if sa[i] >= big]
    worst_b = [] if written else [float(b2a[j]) for j in range(len(B)) if sb[j] >= big]
    pairs = [dict(hex=pal[i]['hex'], share=pal[i]['share'], nearest=ref[int(D[i].argmin())]['hex'],
                  dE=round(float(a2b[i]), 1)) for i in range(len(A))]
    missing = [dict(hex=ref[j]['hex'], share=round(float(sb[j]), 3), nearest=pal[int(D[:, j].argmin())]['hex'],
                    dE=round(float(b2a[j]), 1)) for j in range(len(B))]
    return dict(paletteDE=round(fwd if written else (fwd + back) / 2, 2), paletteDE_frameToTarget=round(fwd, 2),
                paletteDE_targetToFrame=round(back, 2), paletteWorst=round(max(worst_f + worst_b + [0.0]), 2),
                deltaE=metric, written=written, clusters=pairs, targetColours=missing)


# ----------------------------------------------------------------------------------------------------------------
# metrics
# ----------------------------------------------------------------------------------------------------------------
def edge_points(g, gx, gy):
    """Canny-style non-maximum suppression: g is a local max across the edge (gradient direction, 4 bins)."""
    H, W = g.shape
    p = np.pad(g, 1, mode='edge')

    def nb(dy, dx):
        return p[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]

    ang = (np.degrees(np.arctan2(gy, gx)) + 180.0) % 180.0
    ok = ((ang < 22.5) | (ang >= 157.5)) & (g >= nb(0, -1)) & (g >= nb(0, 1))
    ok |= (ang >= 67.5) & (ang < 112.5) & (g >= nb(-1, 0)) & (g >= nb(1, 0))
    ok |= (ang >= 22.5) & (ang < 67.5) & (g >= nb(-1, -1)) & (g >= nb(1, 1))
    ok |= (ang >= 112.5) & (ang < 157.5) & (g >= nb(-1, 1)) & (g >= nb(1, -1))
    return ok


def lens(L, g, bands, grid=(8, 6), s1=1.0, s2=4.0):
    """Defocus per region from the ratio of fine- to coarse-scale gradient at edges (contrast-independent).

    For an edge blurred by sigma_b, |grad| after Gaussian pre-blur s is ~ C / sqrt(sigma_b^2 + s^2), so the ratio
    R = g(s1) / g(s2) gives sigma_b = sqrt((s2^2 - R^2 s1^2) / (R^2 - 1)). The median over the edge points of a
    region is its blur in px at the working width (reads ~15 % low above 2 px; use it relatively)."""
    g1 = np.hypot(*sobel(gauss(L, s1)))
    gx2, gy2 = sobel(gauss(L, s2))
    g2 = np.hypot(gx2, gy2)
    R = np.clip(g1 / np.maximum(g2, 1e-9), 1.0005, s2 / s1 - 1e-3)
    sig = np.sqrt(np.maximum((s2 * s2 - R * R * s1 * s1) / (R * R - 1), 0))
    pk = edge_points(g2, gx2, gy2)
    b = 12
    pk[:b], pk[-b:], pk[:, :b], pk[:, -b:] = False, False, False, False

    def blur_of(sl):
        g2r = g2[sl]
        sel = pk[sl] & (g2r > max(0.004, float(np.percentile(g2r, 70))))
        return float(np.median(sig[sl][sel])) if sel.sum() >= 40 else None

    H, W = L.shape
    blur = [blur_of((slice(i * H // bands, (i + 1) * H // bands), slice(None))) for i in range(bands)]
    edge = [float(np.percentile(g[i * H // bands:(i + 1) * H // bands], 99.5)) for i in range(bands)]
    gx, gy = grid
    tiles = [blur_of((slice(i * H // gy, (i + 1) * H // gy), slice(j * W // gx, (j + 1) * W // gx)))
             for i in range(gy) for j in range(gx)]
    out = dict(blurBands=[None if v is None else round(v, 2) for v in blur],
               edgeBandsPct=[int(round(100 * v / max(max(edge), 1e-9))) for v in edge])
    s = [None if v is None else 1 / math.sqrt(v * v + 1) for v in blur]  # sharpness, 1 = crisp
    have = [i for i in range(bands) if s[i] is not None]
    tv = [v for v in tiles if v is not None]
    if len(tv) >= 6:
        p10, p90 = np.percentile(tv, [10, 90])
        out['dofSpread'] = round(math.sqrt(p90 * p90 + 1) / math.sqrt(p10 * p10 + 1), 2)
    if len(have) < 3:
        out['focusRows'] = [0.0, 1.0]
        return out
    pk_i = max(have, key=lambda i: s[i])
    half = 0.5 * s[pk_i]

    def cross(i, j):  # where s crosses half-max between band centres i and j
        if s[j] is None:
            return float(j + 0.5)
        t = (s[i] - half) / (s[i] - s[j]) if s[i] != s[j] else 0.5
        return (i + 0.5) + t * (j - i)

    lo = pk_i
    while lo > 0 and s[lo - 1] is not None and s[lo - 1] >= half:
        lo -= 1
    hi = pk_i
    while hi < bands - 1 and s[hi + 1] is not None and s[hi + 1] >= half:
        hi += 1
    top = cross(lo, lo - 1) if lo > 0 else 0.0
    bot = cross(hi, hi + 1) if hi < bands - 1 else float(bands)
    w = np.array([s[i] for i in range(lo, hi + 1)])
    centre = float(((np.arange(lo, hi + 1) + 0.5) * w).sum() / w.sum()) / bands
    st, sb = s[pk_i] / s[have[0]], s[pk_i] / s[have[-1]]
    out.update(focusCentre=round(centre, 3), focusHeight=round((bot - top) / bands, 3),
               focusRows=[round(max(top, 0) / bands, 3), round(min(bot, bands) / bands, 3)],
               sharpTop=round(st, 2), sharpBottom=round(sb, 2), tiltShift=round(max(st, sb), 2),
               peakBlur=round(blur[pk_i], 2))
    return out


def measure_array(a, bands=10, k=8):
    L = luma(a).astype(np.float32)
    H, W = L.shape
    m = {}
    p5, p20, p50, p80, p95 = np.percentile(L, [5, 20, 50, 80, 95])
    m.update(lumaP5=round(float(p5), 3), lumaP50=round(float(p50), 3), lumaP95=round(float(p95), 3),
             lumaMean=round(float(L.mean()), 3))
    m['clipPct'] = round(float((a.max(-1) >= 254 / 255).mean() * 100), 2)
    hue, sat, val = hsv(a)
    lit = L > 0.06   # near-black pixels have meaningless HSV saturation (an underexposed frame read as "over-saturated")
    m['satMean'] = round(float(sat[lit].mean() if lit.mean() > 0.2 else sat.mean()), 3)
    lab = rgb2lab(a[::2, ::2].reshape(-1, 3))
    chroma = np.hypot(lab[:, 1], lab[:, 2])
    m['chromaMean'] = round(float(chroma.mean()), 1)
    m['chromaP95'] = round(float(np.percentile(chroma, 95)), 1)
    m['greenPct'] = round(float(((hue >= 75) & (hue <= 150) & (sat >= 0.40) & (val >= 0.30)).mean() * 100), 2)  # teal water (150-190) is not grass
    # darkest / brightest 20 %: the colour of shadows and of lit paper
    paperish = (sat < 0.35) & (L >= p80)   # the lit PAPER: bright, unsaturated (bright teal water is not paper white)
    sh = a[L <= p20].reshape(-1, 3).mean(0)
    hl = a[paperish].reshape(-1, 3).mean(0) if paperish.mean() > 0.02 else a[L >= p80].reshape(-1, 3).mean(0)
    shl = rgb2lab(sh)
    m.update(shadowHex=hexof(sh), shadowWarmth=round(warmth(sh), 3), shadowLuma=round(float(luma(sh)), 3),
             shadowChroma=round(float(np.hypot(shl[1], shl[2])), 1),
             shadowHue=round(float(np.degrees(np.arctan2(shl[2], shl[1])) % 360), 0),
             highlightHex=hexof(hl), highlightWarmth=round(warmth(hl), 3))
    # lens: defocus per band and per tile
    gx, gy = sobel(L)
    g = np.hypot(gx, gy)
    ln = lens(L, g, bands)
    for k_ in ('focusCentre', 'focusHeight', 'sharpTop', 'sharpBottom', 'tiltShift', 'peakBlur', 'dofSpread'):
        m[k_] = ln.get(k_)
    y0 = int(ln['focusRows'][0] * H)
    y1 = max(y0 + 16, int(math.ceil(ln['focusRows'][1] * H)))
    # warm / cool split and corners
    left, right = a[:, :W // 3].reshape(-1, 3).mean(0), a[:, 2 * W // 3:].reshape(-1, 3).mean(0)
    m.update(warmthL=round(warmth(left), 3), warmthR=round(warmth(right), 3),
             warmthLR=round(warmth(left) - warmth(right), 3),
             lumaLR=round(float(luma(left) / max(luma(right), 1e-6)), 3))
    bh, bw = int(H * .15), int(W * .15)
    corners = np.mean([L[:bh, :bw].mean(), L[:bh, -bw:].mean(), L[-bh:, :bw].mean(), L[-bh:, -bw:].mean()])
    centre = L[int(H * .3):int(H * .7), int(W * .3):int(W * .7)].mean()
    m['cornerCentre'] = round(float(corners / max(centre, 1e-6)), 3)
    # paper: share of bare flat colour in the sharp band, and the tooth (band-pass RMS) on those flat areas
    band = L[y0:y1]
    bp = gauss(band, 1.0) - gauss(band, 4.0)
    flat = maxfilter(g[y0:y1], 9) < 0.06  # no edge or print within 4 px; fibre stays below this gradient
    m['flatPct'] = round(float(flat.mean() * 100), 1)
    edge = 12  # ignore the filter's border rows/cols for the tooth
    flat[:edge], flat[-edge:], flat[:, :edge], flat[:, -edge:] = False, False, False, False
    m['toothRms'] = round(float(np.sqrt((bp[flat] ** 2).mean())), 4) if flat.sum() >= 500 else None
    # how much the pieces in the sharp band print: edge pixels (detail), luma spread in 16 px blocks (local contrast),
    # 32 px blocks with almost no edge (bare). The shipped day frames: 0.065-0.080, 0.075-0.087, 44-56 %.
    gb = g[y0:y1]
    m['printDetail'] = round(float((gb > 0.10).mean()), 3)
    bb, B = 16, 32
    rr, cc = band.shape[0] // bb, band.shape[1] // bb
    m['localContrast'] = round(float(band[:rr * bb, :cc * bb].reshape(rr, bb, cc, bb).std(axis=(1, 3)).mean()), 3) if rr and cc else None
    rr, cc = gb.shape[0] // B, gb.shape[1] // B
    m['barePct'] = round(float(((gb[:rr * B, :cc * B] > 0.15).reshape(rr, B, cc, B).mean(axis=(1, 3)) < 0.01).mean() * 100), 1) if rr and cc else None
    extra = dict(blurBands=ln['blurBands'], edgeBandsPct=ln['edgeBandsPct'], focusRows=ln['focusRows'],
                 palette=palette(a, k))
    return m, extra


# ----------------------------------------------------------------------------------------------------------------
# gates
# ----------------------------------------------------------------------------------------------------------------
def load_ranges(profile, path):
    rng = {k: dict(v) for k, v in PROFILES[profile].items()}
    if path:
        user = json.load(open(path, encoding='utf-8'))
        user = user.get('ranges', user) if isinstance(user, dict) else user
        for k, v in user.items():
            if k.startswith('_'):
                continue
            if v is None:
                rng.pop(k, None)
            elif isinstance(v, (list, tuple)):
                rng[k] = dict(rng.get(k, {}), min=v[0], max=v[1] if len(v) > 1 else None)
            else:
                rng[k] = dict(rng.get(k, {}), **v)
    return rng


def check(metrics, target, ranges, written=False):
    rows = []
    for name, fmt in ROWS:
        v = metrics.get(name)
        key = name + '_written' if written and name.startswith('palette') else name
        r = ranges.get(key, {})
        lo, hi, tol = r.get('min'), r.get('max'), r.get('tol')
        tv = target.get(name) if target else None
        gated = lo is not None or hi is not None or (tol is not None and tv is not None)
        note = ''
        if v is None:  # palette rows without a target are hidden; other gated metrics say why they are missing
            status = 'info' if name.startswith('palette') or not gated else 'n/a'
            if name == 'toothRms':
                note = 'too few flat pixels in the sharp band'
            elif name.startswith('focus') or name in ('tiltShift', 'peakBlur', 'dofSpread'):
                note = 'too few edges to estimate blur'
        elif not gated or isinstance(v, str):
            status = 'info'
        else:
            status, side = 'PASS', None
            if lo is not None and v < lo:
                status, side, note = 'WARN', 'low', 'below %s' % fmt_val(lo)
            elif hi is not None and v > hi:
                status, side, note = 'WARN', 'high', 'above %s' % fmt_val(hi)
            elif tol is not None and isinstance(tv, (int, float)) and abs(v - tv) > tol:
                side = 'low' if v < tv else 'high'
                status, note = 'WARN', '%s than target by %s (tol %s)' % (
                    'lower' if side == 'low' else 'higher', fmt_val(abs(round(v - tv, 4))), fmt_val(tol))
            hint = r.get(side) or r.get('hint') if side else ''
            if hint:
                note += ': ' + hint
        rows.append(dict(metric=name, value=v, min=lo, max=hi, tol=tol, target=tv, status=status, note=note,
                         fmt=fmt))
    return rows


def fmt_val(v, fmt='%.3g'):
    if v is None:
        return '-'
    if isinstance(v, str):
        return v
    if isinstance(v, float) and fmt:
        return (fmt % v) if '%s' not in fmt else str(v)
    return str(v)


def measure_file(label, im, args, target_pal=None, written=False):
    a, orig = prepare(im, args.width)
    m, extra = measure_array(a, args.bands, args.k)
    pal_res = None
    if target_pal is not None:
        pal_res = palette_distance(extra['palette'], target_pal, args.de, written)
        m['paletteDE'], m['paletteWorst'] = pal_res['paletteDE'], pal_res['paletteWorst']
    else:
        m['paletteDE'] = m['paletteWorst'] = None
    return dict(file=label, size=list(orig), workSize=[a.shape[1], a.shape[0]],
                scale=round(a.shape[1] / orig[0], 3), metrics=m, blurBands=extra['blurBands'],
                edgeBandsPct=extra['edgeBandsPct'], focusRows=extra['focusRows'], palette=extra['palette'],
                paletteMatch=pal_res)


def print_table(res, rows, target_label):
    print('== %s  %dx%d (measured at %dx%d)%s' % (res['file'], res['size'][0], res['size'][1], res['workSize'][0],
                                                   res['workSize'][1], ('  target: ' + target_label) if target_label else ''))
    if res['scale'] > 1.5:
        print('   note: upscaled x%.2f; tooth and sharpness read low on small images' % res['scale'])
    line = '   %-15s %-9s %-14s %-9s %-6s %s'
    print((line % ('metric', 'value', 'gate', 'target' if target_label else '', 'status', 'note')).rstrip())
    for r in rows:
        if r['value'] is None and r['status'] == 'info':
            continue
        lo, hi = r['min'], r['max']
        gate = ('-' if lo is None and hi is None else '>= %s' % fmt_val(lo) if hi is None else
                '<= %s' % fmt_val(hi) if lo is None else '%s .. %s' % (fmt_val(lo), fmt_val(hi)))
        val = fmt_val(r['value'], r['fmt']) if r['value'] is not None else 'n/a'
        tv = fmt_val(r['target'], r['fmt']) if target_label and r['target'] is not None else ''
        print((line % (r['metric'], val, gate, tv, r['status'], r['note'])).rstrip())
    print('   blur per band, top->bottom (px at %d wide): ' % res['workSize'][0] + ' '.join(
        '--' if v is None else '%.1f' % v for v in res['blurBands']))
    print('   edge energy per band, top->bottom (% of max): ' + ' '.join('%d' % v for v in res['edgeBandsPct']))
    print('   palette: ' + '  '.join('%s %d%%' % (c['hex'], round(c['share'] * 100)) for c in res['palette']))
    pm = res.get('paletteMatch')
    if pm:
        print('   palette vs %s (%s): ' % ('written palette' if pm['written'] else 'target',
                                         'CIEDE2000' if pm['deltaE'] == '2000' else 'CIE76') + '  '.join(
            '%s->%s %.1f' % (c['hex'], c['nearest'], c['dE']) for c in pm['clusters']))
        far = [c for c in pm['targetColours'] if c['dE'] > 10 and c['share'] >= 0.03]
        if far:
            if pm['written']:
                print('   palette colours not in this frame (info): ' + '  '.join('%s (nearest %s dE %.1f)' % (
                    c['hex'], c['nearest'], c['dE']) for c in far))
            else:
                print('   target colours missing here: ' + '  '.join('%s (%d%%, nearest %s dE %.1f)' % (
                    c['hex'], round(c['share'] * 100), c['nearest'], c['dE']) for c in far))
    if res['metrics'].get('lumaP50', 1) < 0.08:
        print('   NOTE: the frame is very dark (lumaP50 < 0.08): fix exposure / light first; saturation, tooth and palette '
              'readings are unreliable until then')
    n_pass = sum(r['status'] == 'PASS' for r in rows)
    warns = [r['metric'] for r in rows if r['status'] == 'WARN']
    print('   => %d PASS, %d WARN%s. Gates are starting points, not proof: look at the image.' % (
        n_pass, len(warns), (' (' + ', '.join(warns) + ')') if warns else ''))
    print()


def print_compact(results, target_res):
    cols = ['file'] + COMPACT + ['WARN']
    data = []
    for res in ([target_res] if target_res else []) + results:
        m = res['metrics']
        name = res['file']
        row = [name if len(name) <= 30 else name[:13] + '..' + name[-15:]]
        for c in COMPACT:
            v = m.get(c)
            row.append('-' if v is None else (v if isinstance(v, str) else ('%.3g' % v)))
        row.append('target' if res is target_res else str(sum(r['status'] == 'WARN' for r in res['checks'])))
        data.append(row)
    w = [max(len(str(r[i])) for r in data + [cols]) for i in range(len(cols))]
    print('  '.join(str(c).ljust(w[i]) for i, c in enumerate(cols)))
    for r in data:
        print('  '.join(str(c).ljust(w[i]) for i, c in enumerate(r)))


def expand_inputs(paths, at):
    out = []
    for p in paths:
        if os.path.splitext(p)[1].lower() in VIDEO_EXT:
            for t in (at or '0').split(','):
                out.append(('%s@%ss' % (os.path.basename(p), t.strip()), video_frame(p, t.strip())))
        else:
            out.append((os.path.basename(p), Image.open(p)))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], epilog=__doc__.split('\n', 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('images', nargs='*', help='stills (png/jpg/webp...) or videos (needs ffmpeg; see --at)')
    ap.add_argument('--target', help='target image to compare with (palette distance, target values, tol checks)')
    ap.add_argument('--palette', help='written palette instead of a target image: "#hex,#hex,..." or a .json/.txt '
                                      'file listing hexes (frame->palette distance; looser *_written gates)')
    ap.add_argument('--profile', default='storybook', choices=sorted(PROFILES), help='built-in gates (default storybook)')
    ap.add_argument('--ranges', help='JSON file that overrides / extends the profile gates')
    ap.add_argument('--dump-ranges', nargs='?', const='', metavar='PROFILE',
                    help='print the gates of a profile (default: --profile, merged with --ranges) as JSON and exit')
    ap.add_argument('--at', help='video time(s) in seconds, comma separated (default 0)')
    ap.add_argument('--width', type=int, default=1600, help='working width in px (default 1600; gates assume it)')
    ap.add_argument('--bands', type=int, default=10, help='horizontal bands for the tilt-shift profile (default 10)')
    ap.add_argument('--k', type=int, default=8, help='palette clusters (default 8)')
    ap.add_argument('--de', default='2000', choices=['2000', '76'], help='colour difference: CIEDE2000 or CIE76')
    ap.add_argument('--json', help='write results as JSON to this path ("-" = stdout, no table)')
    ap.add_argument('--compact', action='store_true', help='one row per image instead of the full table')
    ap.add_argument('--strict', action='store_true', help='exit 1 if any gate WARNs')
    ap.add_argument('--crop', help='x,y,w,h in px of the input image: measure only that region (a scene embedded in a '
                                   'web page or UI; the gates assume the region is the scene)')
    args = ap.parse_args(argv)

    if args.dump_ranges is not None:
        prof = args.dump_ranges or args.profile
        if prof not in PROFILES:
            sys.exit('unknown profile %s (choose from %s)' % (prof, ', '.join(sorted(PROFILES))))
        print(json.dumps(load_ranges(prof, args.ranges), indent=1))
        return 0
    if not args.images:
        ap.error('give at least one image (or --dump-ranges)')

    ranges = load_ranges(args.profile, args.ranges)
    target_res, target_pal, target_label = None, None, None
    if args.target:
        (target_label, tim), = expand_inputs([args.target], args.at.split(',')[0] if args.at else None)
        target_res = measure_file(target_label, tim, args)
        target_pal = target_res['palette']
        target_res['checks'] = []
    if args.palette:
        target_pal = palette_from_hexes(args.palette)
        target_label = target_label or 'palette'
    written = bool(args.palette)  # --palette wins over the target image's palette when both are given
    results = []
    if args.profile in ('night', 'dusk'):
        for k in ('paletteDE', 'paletteWorst', 'paletteDE_written', 'paletteWorst_written'):
            ranges.pop(k, None)   # coloured night / dusk light moves every albedo 15-35 dE: compare hue families by eye
    for label, im in expand_inputs(args.images, args.at):
        if args.crop:
            x, y, w, h = (int(float(v)) for v in args.crop.split(','))
            im = im.crop((x, y, x + w, y + h))
            label += '[%d,%d,%dx%d]' % (x, y, w, h)
        res = measure_file(label, im, args, target_pal, written)
        res['profile'] = args.profile
        res['checks'] = check(res['metrics'], target_res['metrics'] if target_res else None, ranges, written)
        results.append(res)

    if args.json != '-':
        if args.compact:
            print_compact(results, target_res)
        else:
            for res in results:
                print_table(res, res['checks'], target_label)
    if args.json:
        for res in results:
            for r in res['checks']:
                r.pop('fmt', None)
        doc = dict(tool='measure.py', profile=args.profile, width=args.width, bands=args.bands, deltaE=args.de,
                   ranges=ranges, target=target_res, targetPalette=target_pal if args.palette else None,
                   results=results)
        txt = json.dumps(doc, indent=1)
        if args.json == '-':
            print(txt)
        else:
            with open(args.json, 'w', encoding='utf-8') as fh:
                fh.write(txt + '\n')
    warn = any(r['status'] == 'WARN' for res in results for r in res['checks'])
    return 1 if (args.strict and warn) else 0


if __name__ == '__main__':
    sys.exit(main())
