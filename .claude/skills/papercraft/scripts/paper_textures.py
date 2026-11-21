#!/usr/bin/env python3
"""paper_textures.py - seamless paper texture sets for engines that cannot run the JS kit.

Generates one tileable paper stock as a set of maps (numpy + Pillow only, no other dependencies):

  <name>_albedo.png      sRGB colour, RGB 8 bit                    -> base colour / albedo slot
  <name>_detail.png      LINEAR grey, mean 0.5, 8 bit              -> albedo = any palette colour * 2 * detail
  <name>_height.png      LINEAR, 16 bit, 0..1 (range in the .json) -> bump / displacement / parallax
  <name>_normal.png      tangent-space normal, OpenGL (+Y, green up); --directx flips green for Unreal / 3ds Max
  <name>_roughness.png   LINEAR grey, about 0.9 (dead matte)       -> roughness slot (Unity wants --maps smoothness)
  <name>_smoothness.png  optional, 1 - roughness
  <name>_opacity.png     optional, LINEAR grey from sheet thickness (tissue / washi translucency)
  <name>_mask.png        optional sheet-edge alpha from --edge cut|deckle|torn (a whole sheet, NOT tileable)
  <name>_albedo_rgba.png optional (--rgba): albedo with the edge mask as alpha, exposed fibres lightened
  <name>_preview.png     optional (--preview): QA sheet, see below
  <name>.json            parameters and measurements (always written)

Presets (see --list-presets): cardstock, kraft, watercolour, construction, newsprint, washi, tissue, corrugated.
Deterministic: the same arguments give byte-identical files. Every component has its own seeded stream, so adding
--edge or --preview never changes the other maps.

Rules this follows (they come from a shipped pop-up game; see references/procedural-art.md):
- Periodic by construction (FFT band noise, strokes redrawn across the wrap), never cross-faded, so no seams.
- Every feature is a wavelength band in TEXELS. Tell the script how big a texel lands on screen with --texel-px
  (screen pixels per texel at your main camera; 0.25 = the texture is minified 4x) and every feature is resized so
  fibres stay at least about one screen pixel wide. Sub-pixel fibres vanish and leave only blotches: that reads as felt.
- Albedo detail is calibrated to a measured fine-detail level (tooth RMS) as seen at --texel-px, so "fibre visible
  but not dominant" holds whatever the size. Relief is tooth + fibres only (high-passed): sheets stay rigid card.
  Crumple is optional and lives in the height / normal only, never in the colour.
- Normal strength is calibrated to a target mean tilt in degrees; roughness stays about 0.9 with tiny variation.
  Paper is matte: give it no specular, no clear coat, no sheen.

QA (--preview): left = lit 2x2 tiling at 1:1 with the tile corner in the middle (a seam would cross the centre),
middle = detail at x4 contrast (seams and repeats pop out), right = lit as seen at --texel-px, fourth panel = the
--edge sheet if any. The script also prints seam ratios (pass <= 1.5), tooth RMS and mean tilt.

Examples:
  python -I paper_textures.py --preset cardstock --out tex
  python -I paper_textures.py --preset kraft --size 2048 --seed 3 --directx --out tex --name kraft_ue
  python -I paper_textures.py --preset washi --edge deckle --rgba --preview --out tex
  python -I paper_textures.py --preset cardstock --color "#RRGGBB" --texel-px 0.4 --out tex   # minified 2.5x
  python -I paper_textures.py --preset watercolour --maps albedo,normal,roughness --crumple 0.3 --out tex

Engine notes: Godot, Unity and Blender read OpenGL normals (default); Unreal and 3ds Max read DirectX (--directx).
Import albedo as sRGB colour; import detail, height, roughness, smoothness, opacity and normal as linear / non-colour
data. Unity Standard / URP want smoothness (--maps ...,smoothness), metallic 0.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import zlib

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# -----------------------------------------------------------------------------------------------------------------
# Presets. Lengths are texels at --texel-px 1; counts are per 1024 x 1024 texels.
# bands: (lo, hi) wavelength in texels.  strands: (count, (len lo, hi), (width lo, hi), curl per step, sign)
# a_*: weights in the albedo field, h_*: weights in the height field (both normalised afterwards).
# tooth_rms: target fine detail (luma DoG sigma 1 - sigma 4, display values) as seen at --texel-px.
# tilt: target mean normal tilt in degrees.  hp: high-pass sigma for the relief (texels).
# -----------------------------------------------------------------------------------------------------------------
BASE = dict(
    color='#F2E9DA', fibre_col=None, speck_col=None,
    tooth=(3.5, 9.0), mid=(16, 72), cloud=(60, 170), felt=(3, 14), felt_aniso=1.8, aniso=1.0,
    a_tooth=0.55, a_felt=0.10, a_mid=0.22, a_cloud=0.12, a_peb=0.0, a_strand=0.6, a_speck=0.10, a_photo=0.55,
    h_tooth=0.9, h_felt=0.2, h_mid=0.10, h_peb=0.0, h_strand=0.12, h_photo=0.8, h_blur=0.6, hp=12,
    strands=[(300, (60, 200), (2.0, 3.2), 0.014, 1.0),
             (1500, (30, 90), (1.2, 1.9), 0.03, 0.75),
             (130, (20, 60), (1.3, 2.0), 0.05, -0.6)],
    specks=260, speck_r=(0.6, 1.7), speck_elong=1.0,
    pebble=0.0, pebble2=0.0, flutes=0.0,
    tooth_rms=0.014, tilt=5.5, crumple=0.0, rough=0.93, opacity=(0.92, 1.0), edge='cut',
)

PRESETS = {
    'cardstock': dict(
        desc='rigid smooth card: fine tooth, sparse crisp light strands, faint cloud. The default for cut cards.',
    ),
    'kraft': dict(
        desc='unbleached brown card: denser fibres, dark shives, stronger mottle, slight machine direction.',
        color='#C49A6C', fibre_col='#E6CDA6', speck_col='#3B2716', aniso=1.25,
        tooth=(3.0, 8.0), mid=(14, 60), cloud=(50, 160), a_mid=0.16, a_cloud=0.14, a_strand=0.75, a_speck=0.16,
        strands=[(500, (40, 160), (1.6, 2.8), 0.02, 0.9),
                 (2200, (20, 70), (1.1, 1.7), 0.035, 0.6),
                 (700, (15, 50), (1.1, 1.8), 0.05, -0.9)],
        specks=900, speck_r=(0.6, 2.0), tooth_rms=0.02, tilt=6.5, hp=10, rough=0.9,
    ),
    'watercolour': dict(
        desc='cold-press watercolour sheet: embossed pebble tooth, quiet colour, few fibres. Suggested edge: deckle.',
        color='#F5F1E7', fibre_col='#FFFFFA', speck_col='#7A6A58',
        tooth=(3.0, 7.0), mid=(20, 90), cloud=(80, 250), a_tooth=0.3, a_mid=0.18, a_cloud=0.14, a_peb=0.45,
        a_strand=0.35, a_speck=0.06, h_tooth=0.5, h_peb=1.0, h_strand=0.05, h_blur=1.0, hp=24,
        strands=[(120, (40, 140), (1.4, 2.4), 0.02, 0.7),
                 (500, (20, 60), (1.0, 1.6), 0.04, 0.5)],
        specks=80, pebble=10.0, pebble2=5.0, tooth_rms=0.011, tilt=7.0, rough=0.95, edge='deckle',
    ),
    'construction': dict(
        desc='coarse coloured construction paper: fuzzy felted tooth, visible flecks, soft and very matte.',
        color='#B85A3C', tooth=(4.0, 12.0), mid=(12, 50), cloud=(40, 140),
        a_tooth=0.38, a_felt=0.12, a_mid=0.16, a_cloud=0.12, a_peb=0.1, a_strand=0.7, a_speck=0.12,
        h_felt=0.45, h_peb=0.3, hp=10,
        strands=[(400, (25, 80), (1.3, 2.2), 0.04, 0.8),
                 (1800, (12, 40), (1.0, 1.6), 0.06, 0.6),
                 (400, (10, 30), (1.0, 1.6), 0.06, -0.6)],
        specks=300, pebble=9.0, tooth_rms=0.016, tilt=7.0, rough=0.97, edge='torn',
    ),
    'newsprint': dict(
        desc='thin grey-cream newsprint: short fine fibres, grey specks, little relief.',
        color='#E4DDCB', fibre_col='#F4F0E6', speck_col='#4A4A48',
        tooth=(2.5, 6.0), mid=(10, 40), cloud=(40, 120), a_mid=0.25, a_cloud=0.12, a_speck=0.14, hp=8,
        strands=[(200, (20, 70), (1.0, 1.6), 0.03, 0.6),
                 (1500, (8, 30), (0.9, 1.3), 0.05, 0.5),
                 (600, (8, 25), (0.9, 1.4), 0.05, -0.7)],
        specks=700, speck_r=(0.5, 1.3), tooth_rms=0.012, tilt=3.5, rough=0.88, opacity=(0.85, 0.97),
    ),
    'washi': dict(
        desc='Japanese washi: long light kozo fibres, cloudy formation, bark flecks. Suggested edge: deckle.',
        color='#F1ECE0', fibre_col='#FFFFFF', speck_col='#6E5A44',
        tooth=(3.0, 8.0), mid=(20, 80), cloud=(60, 220), a_tooth=0.3, a_mid=0.18, a_cloud=0.35,
        a_strand=0.9, a_speck=0.10, h_strand=0.2, hp=16,
        strands=[(180, (120, 320), (1.6, 3.0), 0.025, 1.0),
                 (700, (50, 160), (1.1, 2.0), 0.035, 0.7),
                 (60, (20, 60), (1.2, 2.0), 0.04, -0.4)],
        specks=120, speck_r=(0.7, 1.6), speck_elong=3.0, tooth_rms=0.016, tilt=4.5, rough=0.9,
        opacity=(0.62, 0.9), edge='deckle',
    ),
    'tissue': dict(
        desc='tissue paper: thin, smooth, cloudy and translucent, crinkled. Use the opacity map (or 60-80 %).',
        color='#F3EEE4', fibre_col='#FFFFFF', tooth=(2.5, 6.0), mid=(16, 60), cloud=(40, 160),
        a_tooth=0.35, a_mid=0.2, a_cloud=0.25, a_speck=0.04, h_tooth=0.5, hp=10,
        strands=[(150, (40, 140), (1.0, 1.8), 0.02, 0.6),
                 (600, (15, 50), (0.9, 1.4), 0.04, 0.4)],
        specks=40, tooth_rms=0.010, tilt=3.0, crumple=0.6, rough=0.86, opacity=(0.45, 0.8), edge='torn',
    ),
    'corrugated': dict(
        desc='corrugated board face: kraft liner with flute ridges showing through (height and a faint value band).',
        color='#BE966A', fibre_col='#E0C69E', speck_col='#3B2716', aniso=1.2,
        tooth=(3.0, 8.0), mid=(14, 60), cloud=(50, 160), a_mid=0.25, a_cloud=0.14, a_speck=0.14,
        strands=[(400, (40, 160), (1.6, 2.6), 0.02, 0.8),
                 (1800, (20, 70), (1.1, 1.7), 0.035, 0.6),
                 (500, (15, 50), (1.1, 1.8), 0.05, -0.8)],
        specks=700, flutes=1.0, tooth_rms=0.018, tilt=6.0, hp=10, rough=0.92,
    ),
}

MAPS_ALL = ('albedo', 'detail', 'height', 'normal', 'roughness', 'smoothness', 'opacity')
MAPS_DEFAULT = 'albedo,detail,height,normal,roughness'
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def preset(name):
    p = dict(BASE)
    p.update(PRESETS[name])
    return p


# -----------------------------------------------------------------------------------------------------------------
# colour
# -----------------------------------------------------------------------------------------------------------------

def hex_rgb(h):
    s = h.strip().lstrip('#')
    if len(s) == 3:
        s = ''.join(c * 2 for c in s)
    if len(s) != 6:
        raise ValueError(f'bad colour {h!r}, use #RRGGBB')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def to_lin(c):
    c = np.clip(np.asarray(c, np.float32), 0.0, 1.0)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)


def to_srgb(c):
    c = np.clip(np.asarray(c, np.float32), 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055).astype(np.float32)


def hexstr(rgb01):
    return '#' + ''.join(f'{int(round(float(v) * 255)):02X}' for v in np.clip(rgb01, 0, 1))


# -----------------------------------------------------------------------------------------------------------------
# periodic signal toolkit
# -----------------------------------------------------------------------------------------------------------------

def _freqs(shape):
    fy = np.fft.fftfreq(shape[0]).astype(np.float32)[:, None]
    fx = np.fft.rfftfreq(shape[1]).astype(np.float32)[None, :]
    return fx, fy


def gauss(a, sigma):
    """Gaussian blur with wrap-around (periodic), sigma in texels."""
    if sigma <= 1e-3:
        return a
    fx, fy = _freqs(a.shape)
    h = np.exp(-2.0 * (math.pi * sigma) ** 2 * (fx * fx + fy * fy)).astype(np.float32)
    return np.fft.irfft2(np.fft.rfft2(a) * h, s=a.shape).astype(np.float32)


def band_noise(n, lo, hi, rng, aniso=1.0):
    """Periodic gaussian noise with wavelengths between lo and hi texels (log-gaussian band), unit std."""
    fx, fy = _freqs((n, n))
    f = np.sqrt((fx * aniso) ** 2 + (fy / aniso) ** 2)
    f[0, 0] = 1e-9
    fc = 1.0 / math.sqrt(lo * hi)
    width = math.log(hi / lo) / 2.355 + 1e-6
    filt = np.exp(-0.5 * (np.log(f / fc) / width) ** 2).astype(np.float32)
    filt[0, 0] = 0.0
    spec = np.fft.rfft2(rng.standard_normal((n, n)).astype(np.float32)) * filt
    out = np.fft.irfft2(spec, s=(n, n)).astype(np.float32)
    return out / (out.std() + 1e-12)


def unit(a):
    a = a - a.mean()
    return (a / (a.std() + 1e-12)).astype(np.float32)


def periodic_component(u):
    """Moisan periodic + smooth decomposition: makes a photo seamless without mirroring or blending."""
    u = np.asarray(u, np.float64)
    m, n = u.shape
    v = np.zeros_like(u)
    d0 = u[-1, :] - u[0, :]
    v[0, :] += d0
    v[-1, :] -= d0
    d1 = u[:, -1] - u[:, 0]
    v[:, 0] += d1
    v[:, -1] -= d1
    q = np.arange(m)[:, None]
    r = np.arange(n)[None, :]
    den = 2 * np.cos(2 * np.pi * q / m) + 2 * np.cos(2 * np.pi * r / n) - 4
    den[0, 0] = 1
    s = np.fft.fft2(v) / den
    s[0, 0] = 0
    return (u - np.real(np.fft.ifft2(s))).astype(np.float32)


class WrapCanvas:
    """Supersampled 8-bit canvas; every stroke near a border is redrawn shifted by +-n, so the result tiles.
    Later strokes overwrite earlier ones (no additive pile-up, which is what turns fibres into felt)."""

    def __init__(self, n, ss=2):
        self.n, self.ss = n, ss
        self.im = Image.new('L', (n * ss, n * ss), 0)
        self.d = ImageDraw.Draw(self.im)

    def _offsets(self, xs, ys, pad):
        n = self.n
        ox = [0] + ([n] if min(xs) - pad < 0 else []) + ([-n] if max(xs) + pad > n else [])
        oy = [0] + ([n] if min(ys) - pad < 0 else []) + ([-n] if max(ys) + pad > n else [])
        return [(a, b) for a in ox for b in oy]

    def line(self, pts, width, fill):
        s = self.ss
        w = max(1, int(round(width * s)))
        for a, b in self._offsets([p[0] for p in pts], [p[1] for p in pts], width + 2):
            self.d.line([((x + a) * s, (y + b) * s) for x, y in pts], fill=int(fill), width=w, joint='curve')

    def ellipse(self, cx, cy, rx, ry, fill):
        s = self.ss
        for a, b in self._offsets([cx - rx, cx + rx], [cy - ry, cy + ry], 2):
            x, y = cx + a, cy + b
            self.d.ellipse([(x - rx) * s, (y - ry) * s, (x + rx) * s, (y + ry) * s], fill=int(fill))

    def array(self):
        n, s = self.n, self.ss
        a = np.asarray(self.im, dtype=np.float32) / 255.0
        return a.reshape(n, s, n, s).mean(axis=(1, 3))


# -----------------------------------------------------------------------------------------------------------------
# paper components
# -----------------------------------------------------------------------------------------------------------------

class Ctx:
    def __init__(self, n, seed, fs):
        self.n, self.seed, self.fs = n, seed, fs
        self.cs = (n / 1024.0) ** 2 / (fs * fs)          # count scale: same feature density per area

    def rng(self, tag):
        return np.random.default_rng([self.seed & 0xFFFFFFFF, zlib.crc32(tag.encode())])

    def band(self, tag, lo, hi, aniso=1.0, scaled=True):
        k = self.fs if scaled else 1.0
        lo, hi = max(2.0, lo * k), min(self.n / 1.5, hi * k)
        hi = max(hi, lo * 1.05)
        return band_noise(self.n, lo, hi, self.rng(tag), aniso)


def strands(ctx, layers):
    """Sparse distinct fibres: curvature random walks drawn crisp, tapered ends, one canvas per layer."""
    n, fs = ctx.n, ctx.fs
    acc = np.zeros((n, n), np.float32)
    for li, (count, (l0, l1), (w0, w1), curl, sign) in enumerate(layers):
        r = ctx.rng(f'strands{li}')
        cv = WrapCanvas(n, 2)
        step = 6.0 * fs
        for _ in range(int(round(count * ctx.cs))):
            x, y = r.uniform(0, n, 2)
            th = r.uniform(0, 2 * math.pi)
            length = min(n / 3.0, math.exp(r.uniform(math.log(l0), math.log(l1))) * fs)
            k = r.normal(0, curl)
            pts = [(x, y)]
            for _ in range(max(2, int(length / step))):
                k = (k + r.normal(0, curl * 0.5)) * 0.93
                th += k
                x += math.cos(th) * step
                y += math.sin(th) * step
                pts.append((x, y))
            w = r.uniform(w0, w1) * fs
            v = 255.0 * r.uniform(0.55, 1.0)
            cv.line(pts, w, v * 0.5)                      # faint full length ...
            a = max(1, len(pts) // 5)
            if len(pts) - 2 * a >= 2:
                cv.line(pts[a:len(pts) - a], w, v)       # ... strong middle: tapered fibre, not a scratch
        acc += sign * gauss(cv.array(), 0.45 * fs)
    return acc


def specks(ctx, count, rr, elong):
    """Shives and inclusions: small dark flecks (elongated bark flecks when elong > 1)."""
    n, fs = ctx.n, ctx.fs
    r = ctx.rng('specks')
    cv = WrapCanvas(n, 2)
    for _ in range(int(round(count * ctx.cs))):
        x, y = r.uniform(0, n, 2)
        rad = r.uniform(*rr) * fs
        v = 255.0 * r.uniform(0.5, 1.0)
        if elong > 1.0:
            th = r.uniform(0, math.pi)
            L = rad * elong
            cv.line([(x - math.cos(th) * L, y - math.sin(th) * L), (x + math.cos(th) * L, y + math.sin(th) * L)],
                    rad * 1.2, v)
        else:
            cv.ellipse(x, y, rad, rad * r.uniform(0.6, 1.0), v)
    return gauss(cv.array(), 0.35 * fs)


def pebbles(ctx, cell, tag):
    """Tileable Worley F1 bumps: the embossed tooth of watercolour / felted papers."""
    n = ctx.n
    m = max(2, int(round(n / (cell * ctx.fs))))
    r = ctx.rng(tag)
    fp = r.random((m, m, 2)).astype(np.float32)
    hc = r.uniform(0.6, 1.0, (m, m)).astype(np.float32)
    g = (np.arange(n, dtype=np.float32) + 0.5) * (m / n)
    y, x = np.meshgrid(g, g, indexing='ij')
    cy, cx = np.floor(y).astype(np.int32), np.floor(x).astype(np.int32)
    best = np.full((n, n), 9.0, np.float32)
    bh = np.zeros((n, n), np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            jy, jx = (cy + dy) % m, (cx + dx) % m
            d2 = (x - (cx + dx + fp[jy, jx, 0])) ** 2 + (y - (cy + dy + fp[jy, jx, 1])) ** 2
            closer = d2 < best
            best = np.where(closer, d2, best)
            bh = np.where(closer, hc[jy, jx], bh)
    d = np.minimum(1.0, np.sqrt(best) / 0.75)
    return unit((1.0 - d * d) * bh - 0.45)


def flutes(ctx):
    """Corrugated board: the flutes under the liner show as soft parallel ridges (periodic, whole cycles)."""
    n = ctx.n
    cycles = max(2, int(round(n / (34.0 * ctx.fs))))
    x = (np.arange(n, dtype=np.float32) + 0.5) / n
    wob = ctx.band('flutewob', n / 3, n / 1.6, scaled=False) * 0.004
    ph = 2 * math.pi * (cycles * x[None, :] + wob)
    return unit(np.sin(ph) * 0.5 + 0.5 * np.sin(ph) ** 3)


def crumple_field(ctx):
    """Broad creases (ridged noise: sharp valleys along zero crossings). Height / normal only."""
    n = ctx.n
    c1 = ctx.band('crumpleA', n / 4.0, n / 1.8, scaled=False)
    c2 = ctx.band('crumpleB', n / 10.0, n / 5.0, scaled=False)
    c = -(np.abs(c1) + 0.55 * np.abs(c2))
    return gauss(unit(c), 1.2 * ctx.fs)


def load_photo(path, n):
    """A flat, evenly lit macro photo of paper -> periodic, lighting-free unit-std detail field."""
    im = Image.open(path).convert('RGB')
    s = min(im.size)
    left, top = (im.width - s) // 2, (im.height - s) // 2
    im = im.crop((left, top, left + s, top + s)).resize((n, n), Image.LANCZOS)
    lum = to_lin(np.asarray(im, np.float32) / 255.0) @ LUMA
    pad = int(n * 0.12)
    big = np.pad(lum, pad, mode='reflect')
    low = gauss(big, n * 0.035)[pad:pad + n, pad:pad + n]
    rel = lum / np.maximum(low, 1e-4) - 1.0                     # relative high-pass: flattens the lighting
    rel = periodic_component(rel)
    lo, hi = np.percentile(rel, [0.05, 99.95])
    return unit(np.clip(rel, lo, hi))


# -----------------------------------------------------------------------------------------------------------------
# maps
# -----------------------------------------------------------------------------------------------------------------

def normal_from_height(h, strength, directx=False):
    """OpenGL convention (+Y up = green up) for a texture whose rows run top to bottom."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx, ny = -dx * strength, dy * strength
    if directx:
        ny = -ny
    nz = np.ones_like(h)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx * inv, ny * inv, nz * inv], -1).astype(np.float32)


def mean_tilt(nrm):
    return float(np.degrees(np.arccos(np.clip(nrm[..., 2], -1, 1))).mean(dtype=np.float64))


def calibrate_tilt(h, target):
    if target <= 0 or h.std() < 1e-9:
        return 0.0
    s = 1.0
    for _ in range(12):
        t = mean_tilt(normal_from_height(h, s))
        s *= target / max(t, 1e-4)
        if abs(t - target) < 0.01:
            break
    return s


def as_seen(img, texel_px, max_out=2048):
    """Area-resample a periodic single-channel image to the size it lands on screen."""
    if abs(texel_px - 1.0) < 1e-3:
        return img
    n = img.shape[0]
    if texel_px < 1.0:
        reps = int(math.ceil(64.0 / (n * texel_px))) if n * texel_px < 64 else 1
        src = np.tile(img, (reps, reps)) if reps > 1 else img
        m = max(16, min(max_out, int(round(src.shape[0] * texel_px))))
        return np.asarray(Image.fromarray(src.astype(np.float32)).resize((m, m), Image.BOX), np.float32)
    c = max(16, min(n, int(max_out / texel_px)))
    m = int(round(c * texel_px))
    return np.asarray(Image.fromarray(img[:c, :c].astype(np.float32)).resize((m, m), Image.BICUBIC), np.float32)


def tooth_rms(luma):
    """Fine detail: RMS of DoG(sigma 1) - DoG(sigma 4) on display luma (the measure used on reference frames)."""
    return float((gauss(luma, 1.0) - gauss(luma, 4.0)).std())


def seam_ratio(a):
    """Mean wrap-around step / mean neighbour step, rows and columns. ~1 for a seamless map, > 1.5 = visible seam."""
    rows = np.abs(a[0] - a[-1]).mean() / (np.abs(np.diff(a, axis=0)).mean() + 1e-9)
    cols = np.abs(a[:, 0] - a[:, -1]).mean() / (np.abs(np.diff(a, axis=1)).mean() + 1e-9)
    return float(rows), float(cols)


def band_noise_1d(n, lo, hi, rng):
    """1D periodic band noise (unit std) for an edge profile."""
    lo, hi = max(2.0, lo), min(n / 1.5, max(hi, lo * 1.05))
    f = np.fft.rfftfreq(n)
    f[0] = 1e-9
    fc, width = 1.0 / math.sqrt(lo * hi), math.log(hi / lo) / 2.355 + 1e-6
    filt = np.exp(-0.5 * (np.log(f / fc) / width) ** 2)
    filt[0] = 0.0
    out = np.fft.irfft(np.fft.rfft(rng.standard_normal(n)) * filt, n)
    return (out / (out.std() + 1e-12)).astype(np.float32)


def edge_mask(n, kind, seed, fs):
    """Alpha of ONE sheet (not tileable) with a cut, deckle or torn edge, plus a 'fibre' band where the core shows.
    Each side gets its own 1D profile, so the edge never folds back on itself (no holes, no islands)."""
    ctx = Ctx(n, seed, fs)
    amp = {'cut': [(n / 5, n / 1.6, n * 0.0011, False)],
           'deckle': [(18, 80, 3.2, True)],
           'torn': [(40, 160, 7.0, True), (10, 30, 1.5, True)]}[kind]
    prof = []
    for side in range(4):
        r = ctx.rng(f'edge{kind}{side}')
        p = np.zeros(n, np.float32)
        for lo, hi, a_, scaled in amp:
            k = fs if scaled else 1.0
            p += band_noise_1d(n, lo * k, hi * k, r) * a_ * k
        prof.append(p)
    g = np.arange(n, dtype=np.float32) + 0.5
    m = n * 0.04
    d = np.minimum(np.minimum((g[None, :] - m) + prof[0][:, None], (n - m - g[None, :]) + prof[1][:, None]),
                   np.minimum((g[:, None] - m) + prof[2][None, :], (n - m - g[:, None]) + prof[3][None, :]))
    if kind != 'cut':      # small isotropic roughness: too weak to open holes more than ~1 px inside the edge
        d = d + ctx.band(f'edge{kind}2d', 2.5, 8) * (0.9 if kind == 'deckle' else 1.1) * fs
    fibre = np.zeros((n, n), np.float32)
    if kind == 'cut':                                           # scissors: slow wander, crisp anti-aliased edge
        a = np.clip(d + 0.5, 0, 1)
    elif kind == 'deckle':                                      # mould-made: wavy, feathered, thinner near the edge
        a = np.clip(d / (2.2 * fs) + 0.5, 0, 1) * (0.72 + 0.28 * np.clip(d / (12 * fs), 0, 1))
        fibre = np.clip(1 - np.abs(d - 4 * fs) / (5 * fs), 0, 1) * 0.5
    elif kind == 'torn':                                        # hand-torn: irregular bites + a fibrous fringe
        core = np.clip(d + 0.5, 0, 1)
        hair = np.clip(ctx.band('trC', 1.5, 4) * 0.8 + ctx.band('trD', 2, 8, aniso=2.5) * 0.6 - 0.3, 0, 1)
        fringe = np.clip((d + 3.5 * fs) / (3.5 * fs), 0, 1) * hair      # loose fibres just outside the tear
        a = np.maximum(core, fringe * 0.8)
        fibre = np.clip(1 - np.abs(d - 1.5 * fs) / (4 * fs), 0, 1) * 0.9
    else:
        raise ValueError(kind)
    return a.astype(np.float32), (fibre * a).astype(np.float32)


# -----------------------------------------------------------------------------------------------------------------
# build
# -----------------------------------------------------------------------------------------------------------------

def build(args):
    P = preset(args.preset)
    n = args.size
    fs = float(np.clip(1.0 / args.texel_px, 0.5, 6.0))
    if n / fs < 128:
        print(f'warning: size {n} is small for feature scale {fs:.2f}; features may not fit the tile', file=sys.stderr)
    ctx = Ctx(n, args.seed, fs)
    color = hex_rgb(args.color or P['color'])
    base_lin = to_lin(color)

    # -- fields (each unit std, periodic) -------------------------------------------------------------------------
    tooth = ctx.band('tooth', *P['tooth'], aniso=P['aniso'])
    felt = unit(ctx.band('feltA', *P['felt'], aniso=P['felt_aniso'])
                + ctx.band('feltB', *P['felt'], aniso=1 / P['felt_aniso']))      # soft anisotropic felt, both ways
    mid = ctx.band('mid', *P['mid'], aniso=P['aniso'])
    cloud = ctx.band('cloud', *P['cloud'])
    st = strands(ctx, P['strands'])
    sp = specks(ctx, P['specks'], P['speck_r'], P['speck_elong'])
    peb = np.zeros((n, n), np.float32)
    if P['pebble'] > 0:
        peb = pebbles(ctx, P['pebble'], 'pebA')
        if P['pebble2'] > 0:
            peb = unit(peb + 0.5 * pebbles(ctx, P['pebble2'], 'pebB'))
    flu = flutes(ctx) if P['flutes'] > 0 else np.zeros((n, n), np.float32)
    photo = load_photo(args.photo, n) if args.photo else np.zeros((n, n), np.float32)
    pm = args.photo_mix if args.photo else 0.0

    # -- albedo detail: a relative value modulation around 1.0 ------------------------------------------------------
    f = (P['a_tooth'] * tooth + P['a_felt'] * felt + P['a_mid'] * mid + P['a_cloud'] * cloud
         + P['a_peb'] * peb + 0.12 * P['flutes'] * flu)
    f = unit(f) * (1 - pm) + pm * photo
    f = unit(f)
    f = np.tanh(f / 2.2) * 2.2                                   # soft-limit outliers (no blotches)
    f = f + P['a_strand'] * args.fibres * 3.0 * st             # strands: crisp, up to ~2-3 sigma of the base
    f = f - P['a_speck'] * 6.0 * sp                            # sparse darker shives
    f = unit(f)

    light = np.clip(st, 0, 1)
    dark = np.clip(-st, 0, 1) + sp
    # light fibres: the preset's own fibre colour on its own stock; on a custom colour they are just lighter dye
    fib = to_lin(hex_rgb(P['fibre_col'])) if (P['fibre_col'] and not args.color) else base_lin
    spk = to_lin(hex_rgb(P['speck_col'])) if P['speck_col'] else base_lin * 0.35
    lum = lambda c: float(c @ LUMA) + 1e-6                      # noqa: E731
    fib_tint = (fib / lum(fib)) / (base_lin / lum(base_lin) + 1e-6)
    spk_tint = (spk / lum(spk)) / (base_lin / lum(base_lin) + 1e-6)
    tint = (1 + 0.6 * light[..., None] * (fib_tint - 1)) * (1 + 0.6 * np.clip(dark, 0, 1)[..., None] * (spk_tint - 1))

    def albedo(k):
        rel = np.clip(f * k, -0.45, 0.45)
        return rel, to_srgb(base_lin[None, None, :] * (1 + rel)[..., None] * tint)

    target = P['tooth_rms'] * args.strength
    k, measured = 0.1, 0.0
    for _ in range(6):                                         # calibrate to the fine detail you will SEE
        rel, alb = albedo(k)
        measured = tooth_rms(as_seen(alb @ LUMA, args.texel_px))
        k_new = float(np.clip(k * target / max(measured, 1e-6), 0.02, 0.3))
        if abs(k_new - k) < 1e-4:
            break
        k = k_new
    # dark colours show less contrast for the same relative modulation; give them at most 1.6x the gain the preset's
    # own colour needs (more turns light strands into scratches on dark card)
    slope = lambda c: float((to_srgb(c * 1.02) - to_srgb(c * 0.98)) @ LUMA) / 0.04   # noqa: E731
    boost = slope(to_lin(hex_rgb(P['color']))) / max(slope(base_lin), 1e-6)
    if boost > 1.6:
        k = k * 1.6 / boost
    rel, alb = albedo(k)
    if boost > 1.6 or k >= 0.3 - 1e-6:
        measured = tooth_rms(as_seen(alb @ LUMA, args.texel_px))
        print(f'note: dark colour, fibre detail limited to {measured:.4f} (target {target:.4f}); '
              f'raise --strength to push it', file=sys.stderr)

    # -- height: tooth + fibres only (high-passed), optional crumple ------------------------------------------------
    h = (P['h_tooth'] * tooth + P['h_felt'] * felt + P['h_mid'] * mid + P['h_peb'] * peb + 0.8 * P['flutes'] * flu)
    h = unit(h) * (1 - pm) + pm * photo
    h = gauss(unit(h), P['h_blur'] * fs)
    h = h + P['h_strand'] * gauss(np.abs(st), 0.8 * fs) * float(h.std()) * 3.0
    if not P['flutes']:
        h = h - gauss(h, P['hp'] * fs)                         # sheets stay flat: relief is tooth + fibres only
    h = unit(h)
    tilt = args.tilt if args.tilt is not None else P['tilt']
    s = calibrate_tilt(h, tilt)
    H = h * s
    crumple = args.crumple if args.crumple is not None else P['crumple']
    if crumple > 0:
        c = crumple_field(ctx)
        H = H + c * calibrate_tilt(c, 6.0 * crumple)
    nrm = normal_from_height(H, 1.0, args.directx)

    rough = np.clip(P['rough'] + 0.022 * cloud - 0.018 * np.tanh(h) + 0.012 * tooth, 0.8, 1.0)
    o0, o1 = P['opacity']
    thick = unit(0.7 * cloud + 0.3 * mid) * 0.5 + 0.12 * (light - dark)
    opacity = np.clip(o0 + (o1 - o0) * (0.5 + 0.35 * thick), 0, 1)

    meta = dict(
        preset=args.preset, seed=args.seed, size=n, color=hexstr(color), texel_px=args.texel_px,
        feature_scale=round(fs, 3), normal='DirectX (green down)' if args.directx else 'OpenGL (green up)',
        detail_rel_std=round(float(rel.std()), 4), detail_gain=round(k, 4),
        tooth_rms_target=round(target, 4), tooth_rms_as_seen=round(measured, 4),
        mean_tilt_deg=round(mean_tilt(nrm), 2),
        normal_bias_xy=[round(float(nrm[..., i].mean(dtype=np.float64)), 4) for i in (0, 1)],
        height_range_texels=round(float(H.max() - H.min()), 3), roughness_mean=round(float(rough.mean()), 3),
        albedo_mean=hexstr(alb.reshape(-1, 3).mean(0, dtype=np.float64)), crumple=crumple,
    )
    return dict(albedo=alb, rel=rel, H=H, nrm=nrm, rough=rough, opacity=opacity, meta=meta, P=P, base_lin=base_lin,
                fs=fs, core=(to_lin(hex_rgb(P['fibre_col'])) if (P['fibre_col'] and not args.color)
                             else to_lin(color * 0.45 + 0.55)))     # exposed paper core on a torn / deckle edge


# -----------------------------------------------------------------------------------------------------------------
# output
# -----------------------------------------------------------------------------------------------------------------

def save8(a, path):
    a = np.clip(np.asarray(a, np.float32), 0, 1)
    Image.fromarray(np.round(a * 255).astype(np.uint8)).save(path)


def save16(a, path):
    a = np.clip(np.asarray(a, np.float32), 0, 1)
    Image.fromarray(np.round(a * 65535).astype(np.uint16)).save(path)


def lit(alb_srgb, nrm, wrap=0.3, light=(-0.5, 0.55, 0.67)):
    l = np.array(light, np.float32)
    l /= np.linalg.norm(l)
    ndl = nrm @ l
    k = np.clip((ndl + wrap) / (1 + wrap), 0, None) / ((l[2] + wrap) / (1 + wrap))
    return to_srgb(to_lin(alb_srgb) * k[..., None])


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except Exception:  # older Pillow: bitmap font
        return ImageFont.load_default()


def preview(R, args, mask_rgba):
    """QA sheet. Works on one lit tile (rolled / tiled as uint8), so it stays cheap at 4096."""
    n, W, tp = args.size, 512, args.texel_px
    tile = np.round(lit(R['albedo'], R['nrm']) * 255).astype(np.uint8)
    det = np.round(np.clip(0.5 + R['rel'] * 2.0, 0, 1) * 255).astype(np.uint8)
    wrap = lambda a, side: np.tile(a, (-(-side // n), -(-side // n)) + (1,) * (a.ndim - 2))[:side, :side]  # noqa: E731
    corner = lambda a: wrap(np.roll(a, (W // 2, W // 2), axis=(0, 1)), W)   # noqa: E731  (tile corner mid-panel)
    panels = [corner(tile), np.repeat(corner(det)[..., None], 3, 2)]
    labels = ['lit 1:1, tile corner at centre', 'detail x4 contrast (seams?)']
    side = int(math.ceil(W / tp))
    if tp < 1.0:
        img = Image.fromarray(wrap(tile, side)).resize((W, W), Image.BOX)
    else:
        img = Image.fromarray(wrap(tile, max(8, side))).resize((W, W), Image.BICUBIC)
    panels.append(np.asarray(img))
    labels.append(f'as seen at texel-px {tp:g}')
    if mask_rgba is not None:
        im = Image.fromarray(np.round(np.clip(mask_rgba, 0, 1) * 255).astype(np.uint8)).resize((W, W), Image.LANCZOS)
        bg = Image.new('RGBA', (W, W), (58, 52, 60, 255))
        bg.alpha_composite(im)
        panels.append(np.asarray(bg.convert('RGB')))
        labels.append(f'edge: {args.edge}')
    sheet = Image.new('RGB', (len(panels) * (W + 8) - 8, W + 26), (34, 30, 28))
    dr = ImageDraw.Draw(sheet)
    for i, (p, lab) in enumerate(zip(panels, labels)):
        sheet.paste(Image.fromarray(np.ascontiguousarray(p)), (i * (W + 8), 26))
        dr.text((i * (W + 8) + 6, 5), lab, fill=(236, 226, 206), font=font(15))
    return sheet


def main(argv=None):
    doc = __doc__.split('\n\n')
    ap = argparse.ArgumentParser(
        prog='paper_textures.py',
        description='\n\n'.join(doc[:3]),
        epilog='Examples:\n' + __doc__.split('Examples:\n')[1].split('\n\n')[0]
               + '\n\n' + __doc__.split('\n\n')[-1].strip(),
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--preset', default='cardstock', choices=sorted(PRESETS), help='paper stock (default cardstock)')
    ap.add_argument('--list-presets', action='store_true', help='describe the presets and exit')
    ap.add_argument('--size', type=int, default=1024, help='texture size in texels, 256-4096 (default 1024)')
    ap.add_argument('--seed', type=int, default=1, help='random seed (default 1)')
    ap.add_argument('--color', default=None, help='base colour #RRGGBB (sRGB); default from the preset')
    ap.add_argument('--out', default='paper_tex', help='output folder (created if missing)')
    ap.add_argument('--name', default=None, help='file name prefix (default <preset>_<seed>)')
    ap.add_argument('--maps', default=MAPS_DEFAULT,
                    help=f'comma list from {",".join(MAPS_ALL)} (default {MAPS_DEFAULT})')
    ap.add_argument('--directx', action='store_true', help='DirectX normal map (green down) for Unreal / 3ds Max')
    ap.add_argument('--texel-px', type=float, default=1.0,
                    help='screen pixels per texel at your main camera (default 1); 0.25 = minified 4x, '
                         'so features grow 4x')
    ap.add_argument('--strength', type=float, default=1.0, help='multiplier on the fibre / tooth target (default 1)')
    ap.add_argument('--fibres', type=float, default=1.0, help='multiplier on the strand layer only (default 1)')
    ap.add_argument('--tilt', type=float, default=None, help='mean normal tilt in degrees (default from the preset)')
    ap.add_argument('--crumple', type=float, default=None, help='0-1 broad creases, height / normal only')
    ap.add_argument('--edge', default='none', choices=['none', 'cut', 'deckle', 'torn'],
                    help='write a sheet-edge alpha mask')
    ap.add_argument('--rgba', action='store_true', help='also write the albedo with the edge mask as alpha')
    ap.add_argument('--photo', default=None, help='optional flat macro photo of paper to blend into the mid scales')
    ap.add_argument('--photo-mix', type=float, default=0.5,
                    help='share of the photo in albedo and height (default 0.5)')
    ap.add_argument('--preview', action='store_true', help='write a QA preview sheet')
    args = ap.parse_args(argv)

    if args.list_presets:
        for k in sorted(PRESETS):
            p = preset(k)
            print(f'{k:13s} {p["color"]}  edge:{p["edge"]:7s} {p["desc"]}')
        return 0
    if not 256 <= args.size <= 4096:
        ap.error('--size must be between 256 and 4096')
    if args.texel_px <= 0:
        ap.error('--texel-px must be > 0')
    maps = [m.strip() for m in args.maps.split(',') if m.strip()]
    bad = [m for m in maps if m not in MAPS_ALL]
    if bad:
        ap.error(f'unknown map(s) {bad}; choose from {MAPS_ALL}')
    if args.rgba and args.edge == 'none':
        args.edge = preset(args.preset)['edge']

    R = build(args)
    os.makedirs(args.out, exist_ok=True)
    name = args.name or f'{args.preset}_{args.seed}'
    path = lambda kind: os.path.join(args.out, f'{name}_{kind}.png')   # noqa: E731
    written = []
    if 'albedo' in maps:
        save8(R['albedo'], path('albedo')); written.append(path('albedo'))
    if 'detail' in maps:
        save8(0.5 + 0.5 * R['rel'], path('detail')); written.append(path('detail'))
    if 'height' in maps:
        H = R['H']
        save16((H - H.min()) / max(1e-9, float(H.max() - H.min())), path('height')); written.append(path('height'))
    if 'normal' in maps:
        save8(R['nrm'] * 0.5 + 0.5, path('normal')); written.append(path('normal'))
    if 'roughness' in maps:
        save8(R['rough'], path('roughness')); written.append(path('roughness'))
    if 'smoothness' in maps:
        save8(1.0 - R['rough'], path('smoothness')); written.append(path('smoothness'))
    if 'opacity' in maps:
        save8(R['opacity'], path('opacity')); written.append(path('opacity'))

    rgba = None
    if args.edge != 'none':
        a, fibre = edge_mask(args.size, args.edge, args.seed, R['fs'])
        save8(a, path('mask')); written.append(path('mask'))
        fib_srgb = to_srgb(R['core'])
        col = R['albedo'] * (1 - fibre[..., None]) + fib_srgb[None, None, :] * fibre[..., None]
        rgba = np.concatenate([col, a[..., None]], -1)
        if args.rgba:
            Image.fromarray(np.round(np.clip(rgba, 0, 1) * 255).astype(np.uint8)).save(path('albedo_rgba'))
            written.append(path('albedo_rgba'))
        R['meta']['edge'] = args.edge

    m = R['meta']
    m['seam_ratio_rows_cols'] = [round(v, 3) for v in seam_ratio(R['albedo'] @ LUMA)]
    if args.preview:
        preview(R, args, rgba).save(path('preview')); written.append(path('preview'))
    with open(os.path.join(args.out, f'{name}.json'), 'w', encoding='utf-8') as fh:
        json.dump(m, fh, indent=2, sort_keys=True)
        fh.write('\n')
    sr = max(m['seam_ratio_rows_cols'])
    print(f'{name}: tooth RMS {m["tooth_rms_as_seen"]:.4f} (target {m["tooth_rms_target"]:.4f}), '
          f'tilt {m["mean_tilt_deg"]:.1f} deg, seam ratio {sr:.2f} ({"ok" if sr <= 1.5 else "SEAM"}), '
          f'albedo mean {m["albedo_mean"]}')
    for w in written:
        print('  wrote', w)
    return 0


if __name__ == '__main__':
    sys.exit(main())
