"""Bâtiments de l'atlas, suite : tour Power BI, dojo Lean Six Sigma, stade des jeux. Mêmes conventions."""
import math
from blender_kit import Kit
from batiments_def import *
from batiments_def2 import BR, BETON, ACIER, ARDOISE

JAUNE = 'neon|#ffc400'; ORANGE = 'neon|#ff7a1a'; CYAN = 'neon|#2fe0ff'; ROUGE_LAQUE = 'peinture|#b3302a'; CREPI_JAPON = 'crepi|#f0e8d4'

def hexagone(r, dec=math.pi / 6):
    return [(r * math.cos(dec + k * math.pi / 3), r * math.sin(dec + k * math.pi / 3)) for k in range(6)]

def bi(K):
    """Portail Power BI : quatre tours de verre sombre à néons jaunes et orange sur une plate-forme hexagonale ceinturée d'une route."""
    R = 2.3
    K.prisme(hexagone(R), 0.0, 0.34, 'beton|#3a424d', biseau=0.015)
    pts = hexagone(R)
    for i in range(6):                                                                                 # liseré lumineux du bord
        a, b = pts[i], pts[(i + 1) % 6]; mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; L = math.hypot(b[0] - a[0], b[1] - a[1]); ang = math.atan2(b[0] - a[0], b[1] - a[1])
        K.boite((0.035, 0.035, L - 0.04), (mx * 0.995, 0.3, mz * 0.995), CYAN, rot=ang)
    r1, r2 = 1.5, 1.98                                                                                  # route en anneau, six trapèzes
    for i in range(6):
        a1, b1 = hexagone(r1)[i], hexagone(r1)[(i + 1) % 6]; a2, b2 = hexagone(r2)[i], hexagone(r2)[(i + 1) % 6]
        K.prisme([a2, b2, b1, a1], 0.34, 0.362, 'asphalte|#23282f')
    for k in range(48):                                                                                 # tirets blancs de l'axe
        a = k / 48 * 2 * math.pi
        if k % 2: continue
        rr = 1.74 / math.cos(math.pi / 6 - (a - math.pi / 6) % (math.pi / 3) * 0 )
        K.boite((0.16, 0.006, 0.03), (1.74 * math.cos(a) * 0.93, 0.366, 1.74 * math.sin(a) * 0.93), 'peinture|#e8e8e8', rot=-a + math.pi / 2)
    K.prisme(hexagone(1.45), 0.34, 0.365, 'beton|#59626e')
    # tours
    tours = [((0.2, -0.3), 0.95, 3.9, 'facade|#11151c', JAUNE), ((-0.95, 0.0), 0.78, 2.6, 'facade|#161b24', ORANGE), ((0.95, 0.05), 0.82, 2.1, 'facade|#141922', JAUNE), ((-0.1, 0.78), 0.7, 1.35, 'facade|#181e28', ORANGE)]
    for (x, z), w, h, m, neon in tours:
        K.boite((w, h, w), (x, 0.36 + h / 2, z), m, biseau=0.012)
        K.boite((w + 0.06, 0.06, w + 0.06), (x, 0.36 + h, z), 'metal|#2c323b', biseau=0.008)
        for sx in (-1, 1):
            for sz in (-1, 1):
                K.boite((0.03, h * 0.9, 0.03), (x + sx * (w / 2 + 0.005), 0.36 + h / 2, z + sz * (w / 2 + 0.005)), neon)
        K.boite((w * 0.45, 0.14, w * 0.45), (x + w * 0.1, 0.36 + h + 0.1, z - w * 0.08), 'metal|#454d58', biseau=0.01)
        K.cylindre((x - w * 0.25, 0.36 + h + 0.03, z + w * 0.2), 0.012, 0.4 + 0.04 * h, 'metal|#aab3bb', seg=6)
    # panneau « barres » de Power BI sur la façade de la plus basse tour
    K.boite((0.62, 0.62, 0.04), (-0.1, 0.36 + 0.95, 0.78 + 0.37), 'peinture|#10141a', biseau=0.006)
    for i, (hh, c) in enumerate(((0.22, JAUNE), (0.34, 'neon|#ffb300'), (0.46, ORANGE))):
        K.boite((0.12, hh, 0.05), (-0.28 + i * 0.18, 0.36 + 0.72 + hh / 2, 0.78 + 0.395), c)
    # enseigne verticale de la tour principale et balises
    K.boite((0.08, 1.2, 0.04), (0.2 + 0.52, 0.36 + 2.6, -0.3 + 0.2), CYAN)
    K.boite((0.12, 0.12, 0.12), (0.2, 0.36 + 3.9 + 0.2, -0.3), 'metal|#2c323b')
    K.ancre('ampoule', (0.2, 0.36 + 3.9 + 0.42, -0.3))
    K.cylindre((0.2, 0.36 + 3.9 + 0.26, -0.3), 0.015, 0.16, ACIER, seg=6)
    K.boite((0.04, 0.04, 0.04), (0.2, 0.36 + 3.9 + 0.64, -0.3), 'neon|#ff2a2a')
    # entrée : auvent et jardinières ; lampadaires de la route
    K.boite((0.9, 0.04, 0.4), (-0.1, 0.36 + 0.5, 1.2), ACIER, biseau=0.006)
    for dx in (-0.5, 0.3): K.cylindre((-0.1 + dx, 0.36, 1.35), 0.015, 0.5, ACIER, seg=6)
    for a in (0.4, 1.35, 2.3, 3.25, 4.2, 5.15):
        K.lampadaire((1.9 * math.cos(a), 0.362, 1.9 * math.sin(a)), 0.55, bras=0.0)
    for (x, z) in ((-0.7, 1.15), (0.55, 1.15)):
        K.boite((0.25, 0.14, 0.14), (x, 0.43, z), 'beton|#4a525c', biseau=0.01); K.boite((0.2, 0.08, 0.1), (x, 0.54, z), 'herbe|#4c9a3a')
    for i in range(3):                                                                                  # petit parvis lumineux
        K.boite((0.12, 0.006, 0.12), (-0.4 + i * 0.3, 0.37, 1.55), 'neon|#2fe0ff')
    return K

def lean(K):
    """Dojo Lean Six Sigma : socle de pierre, deux niveaux de bois laqué et de papier de riz, toits relevés, torii et lanternes."""
    K.boite((2.4, 0.16, 2.0), (0, 0.08, 0), 'pierre|#bfb8a8', biseau=0.015)
    K.escalier((0, 0.0, 1.0 + 0.2), 1.1, 3, 0.053, 0.1, 'pierre|#bfb8a8', 2)
    # niveau bas : murs de crépi, poteaux laqués, panneaux coulissants
    K.boite((1.6, 0.8, 1.3), (0, 0.16 + 0.4, 0), CREPI_JAPON, biseau=0.01)
    for sx in (-1, 1):
        for sz in (-1, 1):
            K.cylindre((sx * 0.8, 0.16, sz * 0.65), 0.05, 0.84, ROUGE_LAQUE, seg=12)
    for sx in (-1, 0, 1): K.cylindre((sx * 0.4, 0.16, 0.66), 0.035, 0.8, ROUGE_LAQUE, seg=10)
    K.boite((1.7, 0.05, 1.4), (0, 0.16 + 0.83, 0), ROUGE_LAQUE, biseau=0.006)
    for x in (-0.57, -0.19, 0.19, 0.57):
        K.boite((0.34, 0.6, 0.02), (x, 0.16 + 0.37, 0.67), 'shoji|#f7efd8')
    K.boite((1.52, 0.02, 0.03), (0, 0.16 + 0.06, 0.675), 'peinture|#5a3a22'); K.boite((1.52, 0.02, 0.03), (0, 0.16 + 0.68, 0.675), 'peinture|#5a3a22')
    for z in (-0.3, 0.3):
        K.boite((0.02, 0.5, 0.34), (0.81, 0.16 + 0.4, z), 'shoji|#f7efd8'); K.boite((0.02, 0.5, 0.34), (-0.81, 0.16 + 0.4, z), 'shoji|#f7efd8')
    K.toit_pagode((0, 0.16 + 0.86, 0), 1.6, 1.3, 0.36, 'ardoise|#4a5866', relev=0.15, debord=0.5)
    # niveau haut
    K.boite((1.02, 0.52, 0.82), (0, 0.16 + 0.86 + 0.28, 0), CREPI_JAPON, biseau=0.01)
    for sx in (-1, 1):
        for sz in (-1, 1): K.cylindre((sx * 0.5, 1.02, sz * 0.4), 0.04, 0.5, ROUGE_LAQUE, seg=10)
    for x in (-0.25, 0.25): K.boite((0.4, 0.34, 0.02), (x, 1.3, 0.42), 'shoji|#f7efd8')
    K.boite((1.12, 0.04, 0.92), (0, 1.55, 0), ROUGE_LAQUE)
    K.toit_pagode((0, 1.56, 0), 1.0, 0.8, 0.3, 'ardoise|#4a5866', relev=0.13, debord=0.42)
    K.cylindre((0, 1.84, 0), 0.025, 0.28, 'metal|#d9b44a', seg=8, r_haut=0.012)
    for k in range(3): K.cylindre((0, 1.9 + k * 0.07, 0), 0.07 - k * 0.015, 0.025, 'metal|#d9b44a', seg=12)
    K.ancre('ceinture', (0, 0.62, 0.7))
    # torii
    for sx in (-1, 1): K.cylindre((sx * 0.5, 0.0, 1.9), 0.055, 1.1, ROUGE_LAQUE, seg=12, r_haut=0.045)
    K.boite((1.5, 0.07, 0.13), (0, 1.12, 1.9), 'peinture|#2a2a2e', biseau=0.006)
    K.boite((1.55, 0.04, 0.16), (0, 1.17, 1.9), ROUGE_LAQUE)
    K.boite((1.08, 0.05, 0.07), (0, 0.9, 1.9), ROUGE_LAQUE)
    # lanternes de pierre
    for sx in (-1, 1):
        x = sx * 0.85
        K.cylindre((x, 0.0, 1.45), 0.09, 0.05, 'pierre|#a9a79d', seg=8); K.cylindre((x, 0.05, 1.45), 0.04, 0.3, 'pierre|#a9a79d', seg=8)
        K.boite((0.14, 0.12, 0.14), (x, 0.42, 1.45), 'pierre|#a9a79d'); K.boite((0.06, 0.07, 0.06), (x, 0.42, 1.45), 'fenetre|#ffcf70')
        K.cone((x, 0.48, 1.45), 0.13, 0.1, 'pierre|#a9a79d', seg=4, rot=math.pi / 4)
    # lampions rouges au porche
    for x in (-0.5, 0.0, 0.5):
        K.cylindre((x, 0.16 + 0.67, 0.74), 0.06, 0.1, 'neon|#ff3b30', seg=12, r_haut=0.055)
    return K

def perso(K):
    """Stade des projets perso, sur son îlot : gradins en anneau, pelouse à lignes blanches, projecteurs et tableau d'affichage."""
    pelouse = 0.62
    K.cylindre((0, 0.0, 0), 1.45, 0.08, 'pierre|#a9a79d', seg=40)
    K.cylindre((0, 0.07, 0), pelouse + 0.04, 0.012, 'peinture|#f4f4f0', seg=40)
    K.cylindre((0, 0.075, 0), pelouse, 0.014, 'herbe|#5aa83a', seg=40)
    K.cylindre((0, 0.08, 0), 0.12, 0.004, 'peinture|#f4f4f0', seg=24); K.cylindre((0, 0.081, 0), 0.1, 0.004, 'herbe|#5aa83a', seg=24)
    K.boite((0.012, 0.006, pelouse * 2), (0, 0.083, 0), 'peinture|#f4f4f0')
    for s in (-1, 1):                                                                                   # buts
        K.boite((0.03, 0.18, 0.28), (s * (pelouse - 0.04), 0.17, 0), 'metal|#e8e8e8')
        K.boite((0.02, 0.17, 0.26), (s * (pelouse - 0.06), 0.165, 0), 'peinture|#f4f4f0')
    # gradins : 4 rangs de 18 secteurs, deux entrées dégagées
    N = 18; couleurs = ['peinture|#e8573d', 'peinture|#f2c14e', 'peinture|#2a7de1', 'peinture|#f4f4f0']
    for t in range(4):
        r_in = pelouse + 0.1 + t * 0.15; r_out = r_in + 0.15; hh = 0.12 + t * 0.1
        for k in range(N):
            if k in (0, N // 2): continue
            a0 = k / N * 2 * math.pi + 0.012; a1 = (k + 1) / N * 2 * math.pi - 0.012
            pts = [(r_out * math.cos(a0), r_out * math.sin(a0)), (r_out * math.cos(a1), r_out * math.sin(a1)), (r_in * math.cos(a1), r_in * math.sin(a1)), (r_in * math.cos(a0), r_in * math.sin(a0))]
            K.prisme(pts, 0.07, 0.07 + hh, couleurs[(k + t) % 4] if t < 3 else 'beton|#d0ccc2')
    for k in range(N):                                                                                  # mur extérieur
        if k in (0, N // 2): continue
        a0 = k / N * 2 * math.pi + 0.004; a1 = (k + 1) / N * 2 * math.pi - 0.004; ra, rb = 1.22, 1.3
        K.prisme([(rb * math.cos(a0), rb * math.sin(a0)), (rb * math.cos(a1), rb * math.sin(a1)), (ra * math.cos(a1), ra * math.sin(a1)), (ra * math.cos(a0), ra * math.sin(a0))], 0.07, 0.58, 'beton|#d9d5cc')
    # mâts de projecteurs
    for a in (math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4):
        x, z = 1.28 * math.cos(a), 1.28 * math.sin(a)
        K.cylindre((x, 0.07, z), 0.025, 1.45, ACIER, seg=8, r_haut=0.015)
        K.boite((0.26, 0.17, 0.05), (x, 1.58, z), 'metal|#2c323b', rot=-a + math.pi / 2)
        for i in range(3):
            for j in range(2): K.boite((0.06, 0.06, 0.02), (x + (i - 1) * 0.07 * math.cos(-a + math.pi / 2) * 1, 1.55 + j * 0.07, z + (i - 1) * 0.07 * -math.sin(-a + math.pi / 2) * -1 + 0.0), 'fenetre|#fff4c8', rot=-a + math.pi / 2)
    # tableau d'affichage, billetterie, fanions
    K.boite((0.5, 0.26, 0.05), (0, 0.9, -1.36), 'peinture|#10141a', biseau=0.006)
    for i in range(4): K.boite((0.07, 0.12, 0.052), (-0.18 + i * 0.12, 0.9, -1.36), JAUNE if i % 2 else ORANGE)
    K.cylindre((0, 0.58, -1.36), 0.02, 0.14, ACIER, seg=8)
    K.boite((0.3, 0.26, 0.24), (0.0, 0.07 + 0.13, 1.42), 'crepi|#e7e1d2', biseau=0.008); K.boite((0.34, 0.03, 0.28), (0.0, 0.07 + 0.27, 1.42), ROUGE_LAQUE)
    K.boite((0.2, 0.08, 0.02), (0.0, 0.07 + 0.15, 1.56), 'fenetre|#a8d8ff')
    for a in range(0, 360, 20):
        pass
    K.ancre('billot', (0.36, 0.09, 0.1)); K.ancre('rubik', (-0.36, 0.1, -0.08)); K.ancre('sable', (-0.08, 0.09, 0.2)); K.ancre('haie', (0.08, 0.09, -0.2))
    K.ancre('fanion', (0, 1.0, 0))
    return K

BATIMENTS.update({'bi': bi, 'lean': lean, 'perso': perso})
