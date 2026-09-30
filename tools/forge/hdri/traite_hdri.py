"""Traitement du HDRI « Moonlit Golf » (Poly Haven, CC0, Greg Zaal) pour le Village Talas :
   lecture Radiance RGBE -> statistiques (couleurs du ciel, direction et teinte de la lune) -> harmoniques sphériques d'ordre 2 (LightProbe)
   -> ciel équirectangulaire en JPEG tonemappé (fond de scène et carte d'environnement des matières brillantes).
   Sortie : assets/talas/hdri/moonlit_golf_sky.jpg · moonlit_golf_sh.json
   Usage : python traite_hdri.py"""
import os, json, struct, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'moonlit_golf_1k.hdr')
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'assets', 'talas', 'hdri'))
os.makedirs(OUT, exist_ok=True)

def lire_rgbe(path):
    d = open(path, 'rb').read(); pos = 0
    def ligne():
        nonlocal pos
        e = d.index(b'\n', pos); s = d[pos:e]; pos = e + 1; return s.decode('latin1')
    assert ligne().startswith('#?'), 'pas un fichier Radiance'
    while ligne().strip(): pass                       # en-tête jusqu'à la ligne vide
    res = ligne().split(); H, W = int(res[1]), int(res[3])
    img = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        a, b, hi, lo = d[pos], d[pos + 1], d[pos + 2], d[pos + 3]
        assert a == 2 and b == 2 and (hi << 8 | lo) == W, 'RLE attendu'
        pos += 4
        for c in range(4):
            x = 0
            while x < W:
                n = d[pos]; pos += 1
                if n > 128:
                    n -= 128; img[y, x:x + n, c] = d[pos]; pos += 1
                else:
                    img[y, x:x + n, c] = np.frombuffer(d[pos:pos + n], np.uint8); pos += n
                x += n
    e = img[..., 3].astype(np.float32)
    f = np.where(e > 0, np.ldexp(1.0, (e - 136).astype(np.int32)), 0.0).astype(np.float32)
    return img[..., :3].astype(np.float32) * f[..., None]

hdr = lire_rgbe(SRC); H, W, _ = hdr.shape
print('HDRI %dx%d, luminance moyenne %.4f, max %.1f' % (W, H, hdr.mean(), hdr.max()))

# directions des pixels (convention d'équirectangulaire de three.js : u = atan2(z, x) / 2π + .5, v = asin(y) / π + .5, ligne 0 en haut)
lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi; lon = ((np.arange(W) + 0.5) / W - 0.5) * 2 * np.pi
LAT, LON = np.meshgrid(lat, lon, indexing='ij')
dirs = np.stack([np.cos(LAT) * np.cos(LON), np.sin(LAT), np.cos(LAT) * np.sin(LON)], axis=-1)
dw = (np.pi / H) * (2 * np.pi / W) * np.cos(LAT)                       # angle solide de chaque pixel
lum = hdr @ np.array([0.2126, 0.7152, 0.0722], np.float32)

# --- la lune : le pic de luminance
seuil = np.quantile(lum, 0.9995)
m = lum >= max(seuil, lum.max() * 0.35)
w = (lum * dw * m)[..., None]
moon_dir = (dirs * w).sum(axis=(0, 1)); moon_dir /= np.linalg.norm(moon_dir)
moon_col = (hdr * w).sum(axis=(0, 1)) / w.sum()
moon_e = float((lum * dw * m).sum())                                     # éclairement (luminance intégrée sur son angle solide)
print('lune : direction %s, éclairement %.3f, teinte %s' % (np.round(moon_dir, 3), moon_e, np.round(moon_col / moon_col.max(), 3)))

# --- couleurs moyennes par bande de latitude (linéaire -> sRGB hex)
def srgb(c):
    c = np.clip(c, 0, 1); c = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)
    return '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in c)
loin_lune = (dirs @ moon_dir) < np.cos(np.radians(14))                 # ciel hors du halo de la lune
def bande(lo, hi):
    k = (LAT >= np.radians(lo)) & (LAT < np.radians(hi)) & loin_lune; wk = dw[k][:, None]
    return (hdr[k] * wk).sum(axis=0) / wk.sum()
hors_lune = lum < seuil * 0.5
bandes = {'zenith': bande(55, 90), 'haut': bande(25, 55), 'horizon': bande(-5, 25), 'sol': bande(-90, -5)}
for k, v in bandes.items(): print('  %-8s lin %s  -> %s' % (k, np.round(v, 4), srgb(v * 12)))

# --- harmoniques sphériques d'ordre 2 (rayonnance) : c_lm = ∫ L Y_lm dω
x, y, z = dirs[..., 0], dirs[..., 1], dirs[..., 2]
Y = [0.282095 * np.ones_like(x), 0.488603 * y, 0.488603 * z, 0.488603 * x, 1.092548 * x * y, 1.092548 * y * z, 0.315392 * (3 * z * z - 1), 1.092548 * x * z, 0.546274 * (x * x - y * y)]
sh = np.array([[float((hdr[..., c] * Yk * dw).sum()) for c in range(3)] for Yk in Y])       # (9, 3)
print('SH (ordre 0) : %s' % np.round(sh[0], 4))

# --- ambiance sans la lune (elle est une vraie lumière dirigée dans le jeu) : les pixels très lumineux sont remplacés par la médiane de leur ligne
brillant = (lum > 1.5) | ((dirs @ moon_dir) > np.cos(np.radians(9)))
amb = hdr.copy()
for r in range(H):
    ok = ~brillant[r]
    if ok.any() and (~ok).any(): amb[r, ~ok] = np.median(hdr[r, ok], axis=0)
sh_amb = np.array([[float((amb[..., c] * Yk * dw).sum()) for c in range(3)] for Yk in Y])
print('SH ambiance (ordre 0) : %s' % np.round(sh_amb[0], 4))

# --- ciel tonemappé (ACES approximé) avec un gain qui fait lire la nuit sans l'écraser
def aces(v):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((v * (a * v + b)) / (v * (c * v + d) + e), 0, 1)
med = float(np.median(lum)); gain = 0.22 / max(med, 1e-4)
gain = float(min(gain, 40.0))
ldr = aces(hdr * gain)
ldr = np.power(ldr, 1 / 2.2)
im = Image.fromarray((ldr * 255).astype(np.uint8), 'RGB')
im.save(os.path.join(OUT, 'moonlit_golf_sky.jpg'), quality=88, optimize=True)
im.resize((256, 128), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2)).save(os.path.join(OUT, 'moonlit_golf_flou.jpg'), quality=85)
print('gain de tonemapping %.1f (luminance médiane %.5f)' % (gain, med))

info = {
    'source': 'Poly Haven — Moonlit Golf (CC0, Greg Zaal)', 'largeur': W, 'hauteur': H, 'convention': 'équirectangulaire three.js (u = atan2(z,x)/2π+.5)',
    'sh': [[round(float(v), 5) for v in row] for row in sh],
    'shAmbiance': [[round(float(v), 5) for v in row] for row in sh_amb],
    'lune': {'direction': [round(float(v), 4) for v in moon_dir], 'eclairement': round(moon_e, 4), 'teinte': srgb(moon_col / max(moon_col.max(), 1e-6)), 'couleur': [round(float(v), 4) for v in moon_col]},
    'ciel': {k: srgb(np.clip(v * gain * 1.0, 0, 1) ** (1 / 2.2)) for k, v in bandes.items()}, 'gainCiel': round(gain, 2),
    'moyenne': [round(float(v), 5) for v in hdr.reshape(-1, 3).mean(axis=0)],
}
json.dump(info, open(os.path.join(OUT, 'moonlit_golf_sh.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print('écrit :', sorted(os.listdir(OUT)))
