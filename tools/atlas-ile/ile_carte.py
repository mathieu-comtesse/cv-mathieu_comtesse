"""Atlas du parcours, île flottante : la carte de l'île vue du dessus.
Une seule source de vérité (hauteurs, lagon, zones, implantation des bâtiments) partagée par le générateur de volume
(ile.py) et exportée vers le jeu (assets/atlas/ile-carte.json). Repère : x vers la droite, z vers la caméra (l'avant de
l'île), y vers le haut ; la surface du lagon est à y = 0.

    python tools/atlas-ile/ile_carte.py apercu.png      # carte des hauteurs et des zones (contrôle visuel)
"""
import sys, math
import numpy as np

# ---------------------------------------------------------------------------------------------- emprise
CENTRE = (0.0, 0.3)          # centre de l'emprise
R0 = 10.0                    # rayon moyen de l'emprise
ETIRE = (1.12, 0.96)         # l'île est plus large que profonde

def rayon_emprise(theta):
    """Rayon de l'emprise selon le cap : un galet irrégulier, pas un disque."""
    return (R0 + 0.95 * np.sin(2 * theta + 0.5) + 0.62 * np.sin(3 * theta + 2.0) + 0.34 * np.sin(5 * theta + 1.1)
            + 0.18 * np.sin(8 * theta + 0.3))

def dist_emprise(x, z):
    """Distance signée approchée à l'emprise (négative dedans), en unités du monde."""
    dx = (x - CENTRE[0]) / ETIRE[0]; dz = (z - CENTRE[1]) / ETIRE[1]
    th = np.arctan2(dz, dx); r = np.hypot(dx, dz)
    return (r - rayon_emprise(th)) * 0.92

# ---------------------------------------------------------------------------------------------- lagon
LAGON = dict(c=(0.3, 3.9), rx=5.3, rz=3.3)          # ellipse du lagon, devant
ILOT = dict(c=(0.5, 3.75), r=1.25)                    # îlot de l'arcade, au milieu du lagon

def forme_lagon(x, z):
    """< 0 dans le lagon (ellipse irrégulière)."""
    dx = (x - LAGON['c'][0]) / LAGON['rx']; dz = (z - LAGON['c'][1]) / LAGON['rz']
    th = np.arctan2(dz, dx)
    r = np.hypot(dx, dz)
    return (r - (1 + 0.10 * np.sin(3 * th + 0.4) + 0.07 * np.sin(5 * th + 2.0))) * min(LAGON['rx'], LAGON['rz'])

# ---------------------------------------------------------------------------------------------- bâtiments
# Implantation (x, z) et rayon d'emprise de chaque étape ; la hauteur est lue sur la carte.
BATIMENTS = {
    'lean':     dict(pos=(-5.3, -4.2), r=1.9),    # dojo, sur la colline, sous les cerisiers
    'bi':       dict(pos=(3.6, -4.8), r=2.6),     # tour Power BI, sur sa plate-forme hexagonale
    'avignon':  dict(pos=(-7.3, -0.3), r=2.1),    # Hôtel-Dieu d'Avignon
    'usp':      dict(pos=(-6.6, 3.6), r=2.6),     # campus de Paris Nord
    'studio':   dict(pos=(-1.3, -2.0), r=1.9),    # atelier des extracteurs PDF
    'sncf':     dict(pos=(7.3, 3.2), r=2.3),     # gare et son petit réseau
    'reseau':   dict(pos=(6.9, 6.4), r=1.25),      # poste de signalisation
    'perso':    dict(pos=ILOT['c'], r=1.6),       # stade des jeux, sur l'îlot du lagon
}
COLLINE = dict(c=(-5.3, -4.2), sig=2.5, h=1.55)       # colline du dojo
PLATEAU = dict(c=(3.6, -4.8), r=3.0, h=0.95)          # plate-forme hexagonale de la tour
PONT = dict(a=(0.55, 0.4), b=(0.52, 2.15))             # pont rouge de l'îlot
PONTON = dict(a=(5.9, 5.5), b=(3.2, 5.4))             # ponton de pêche
VOIE = dict(c=(7.5, 0.0), rx=2.3, rz=1.4)            # boucle du petit train (prairie de droite)
# exutoires du lagon : l'eau déborde de l'île et tombe dans les nuages
CHUTES = [(-3.6, 7.8), (4.4, 7.7), (-0.4, 8.4)]

def lisse(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)

def hauteur_base(x, z):
    """Hauteur de la surface sans bruit : prairie, colline, plate-forme, lagon, îlot, plage, exutoires."""
    prairie = 0.42
    fl = forme_lagon(x, z)
    # terre : prairie, colline du dojo (sommet plat), plate-forme hexagonale aux flancs raides
    d = np.hypot(x - COLLINE['c'][0], z - COLLINE['c'][1])
    bosse = np.minimum(COLLINE['h'] * np.exp(-(d / COLLINE['sig']) ** 2 * 0.9), COLLINE['h'] * 0.88)
    terre = prairie + bosse
    dx = x - PLATEAU['c'][0]; dz = z - PLATEAU['c'][1]
    hexd = np.maximum.reduce([np.abs(dx * math.cos(a) + dz * math.sin(a)) for a in (0, math.pi / 3, 2 * math.pi / 3)]) / 0.866
    terre = np.maximum(terre, prairie + PLATEAU['h'] * lisse(PLATEAU['r'] + 0.55, PLATEAU['r'] - 0.05, hexd))
    # plage : la terre descend en pente douce vers la rive du lagon (sable), puis le fond plonge dans l'eau
    plage = prairie * lisse(0.0, 2.3, fl) - 0.12 * (1 - lisse(0.0, 1.1, fl))
    rive = np.minimum(terre, plage + (terre - prairie))
    fond = -0.1 - 1.25 * lisse(0.0, -1.7, fl)
    h = np.where(fl < 0, fond, rive)
    # îlot de l'arcade, au milieu du lagon
    di = np.hypot(x - ILOT['c'][0], z - ILOT['c'][1])
    ilot = lisse(ILOT['r'] + 0.55, ILOT['r'] - 0.1, di)
    h = np.where(fl < 0, np.maximum(h, -1.0 + (0.46 + 1.0) * ilot), h)
    # exutoires : un chenal peu profond de la rive du lagon jusqu'au bord de l'île
    for (cx, cz) in CHUTES:
        dxs = x - cx; large = 0.55 + 0.15 * np.sin(z * 2.1)
        dans = lisse(large + 0.45, large - 0.15, np.abs(dxs)) * lisse(LAGON['c'][1] + LAGON['rz'] * 0.7, cz - 0.4, z)
        cana = -0.10 - 0.08 * lisse(cz - 0.8, cz + 2.5, z)
        h = np.where(dans > 0, h * (1 - dans) + np.minimum(h, cana) * dans, h)
    return h

def zones(x, z, h):
    """Masques de matière sous forme de réels 0..1 : sable, herbe, chemin."""
    fl = forme_lagon(x, z)
    sable = np.maximum(lisse(0.55 + 1.7, 0.55, fl) * (h < 0.62), lisse(0.1, -0.5, h) * 1.0)
    return dict(sable=sable)

def apercu(chemin, res=0.1):
    from PIL import Image
    xs = np.arange(-13, 13, res); zs = np.arange(-11.5, 11.5, res)
    X, Z = np.meshgrid(xs, zs, indexing='xy')
    h = hauteur_base(X, Z); d = dist_emprise(X, Z)
    img = np.zeros(h.shape + (3,), np.float32)
    v = np.clip((h + 1.2) / 3.0, 0, 1)
    img[..., 0] = 0.3 + 0.6 * v; img[..., 1] = 0.35 + 0.6 * v; img[..., 2] = 0.3 + 0.2 * v
    eau = (h < 0)
    img[eau] = (0.1 + 0.4 * (1 + h[eau])[:, None] * np.array([0.3, 1.0, 1.0]))
    img[d > 0] = (0.05, 0.1, 0.25)
    for nom, b in BATIMENTS.items():
        i = int((b['pos'][0] + 13) / res); j = int((b['pos'][1] + 11.5) / res); rr = int(b['r'] / res)
        for a in range(0, 360, 6):
            ii = i + int(rr * math.cos(math.radians(a))); jj = j + int(rr * math.sin(math.radians(a)))
            if 0 <= jj < img.shape[0] and 0 <= ii < img.shape[1]: img[jj, ii] = (1, 0, 0)
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((img.shape[1] * 3, img.shape[0] * 3), Image.NEAREST).save(chemin)

if __name__ == '__main__':
    apercu(sys.argv[1] if len(sys.argv) > 1 else 'carte.png')
