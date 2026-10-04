"""Accessoires de l'atlas : pont rouge, ponton, bateaux, train, voiture, phare. Les bateaux, le train et la voiture avancent vers +x ;
le pont et le ponton s'étirent selon +z depuis leur origine (le jeu les oriente).  Mêmes conventions de matériaux que les bâtiments."""
import math
from blender_kit import Kit
from batiments_def import *
from batiments_def2 import BR, BETON, ACIER, ARDOISE
from batiments_def3 import ROUGE_LAQUE

BLANC = 'peinture|#f1f0ea'; ROUGE_PONT = 'peinture|#c0302a'; BOIS_CLAIR = 'bois|#9a6a3c'; BOIS_SOMBRE = 'bois|#5d4026'

def pont(K):
    """Pont japonais rouge en dos d'âne : tablier cintré, garde-corps à poteaux dorés, culées de pierre et pilotis."""
    L, H, Y0 = 1.75, 0.3, 0.45
    pts = [(0, Y0 + H * math.sin(math.pi * t) , t * L) for t in [i / 14 for i in range(15)]]
    K.ruban(pts, 0.34, 0.05, BOIS_CLAIR)
    for s in (-1, 1):
        rail = [(s * 0.185, y + 0.15, z) for (_, y, z) in pts]
        K.tronc_courbe([(s * 0.185, y + 0.17, z) for (_, y, z) in pts], 0.014, 0.014, ROUGE_PONT, seg=6)
        for i in range(0, 15, 2):
            _, y, z = pts[i]
            K.boite((0.03, 0.17, 0.03), (s * 0.185, y + 0.085, z), ROUGE_PONT)
            if i % 4 == 0: K.cylindre((s * 0.185, y + 0.17, z), 0.022, 0.03, 'metal|#d9b44a', seg=8)
    for z in (0.0, L):
        K.boite((0.5, 0.45, 0.14), (0, Y0 / 2 - 0.02, z + (-0.04 if z == 0 else 0.04)), 'pierre|#bdb7a8', biseau=0.01)
    for z in (0.34, 0.6, 1.15, 1.41):
        for s in (-1, 1): K.cylindre((s * 0.14, -0.9, z), 0.025, 1.25, BOIS_SOMBRE, seg=8)
    return K

def ponton(K):
    """Ponton de bois : planches, deux files de pilotis qui plongent dans l'eau, bittes, caisses, échelle, lampe."""
    L, W, Y = 2.75, 0.52, 0.2
    n = 22
    for i in range(n):
        K.boite((W, 0.03, L / n - 0.012), (0, Y, (i + 0.5) * L / n), BOIS_CLAIR if i % 3 else 'bois|#a87846')
    for s in (-1, 1):
        K.boite((0.05, 0.07, L), (s * (W / 2 + 0.02), Y - 0.055, L / 2), BOIS_SOMBRE)
    for z in [0.1 + k * 0.55 for k in range(6)]:
        for s in (-1, 1): K.cylindre((s * (W / 2 + 0.02), -1.3, z), 0.032, 1.55, BOIS_SOMBRE, seg=8)
        K.boite((W + 0.12, 0.04, 0.05), (0, Y - 0.04, z), BOIS_SOMBRE)
    for z in (0.5, 1.3, 2.5):
        for s in (-1, 1): K.cylindre((s * (W / 2 + 0.02), Y + 0.015, z), 0.02, 0.06, 'metal|#2c323b', seg=8)
    K.boite((0.22, 0.2, 0.22), (-0.12, Y + 0.115, 0.6), 'bois|#8a5a34', biseau=0.006); K.boite((0.18, 0.16, 0.18), (0.14, Y + 0.095, 0.82), 'bois|#9a6a3c', biseau=0.006)
    K.cylindre((0.14, Y + 0.015, 2.3), 0.07, 0.18, 'bois|#7a4f2c', seg=12)
    K.cylindre((-0.2, Y + 0.015, 2.62), 0.012, 0.5, ACIER, seg=6); K.boite((0.06, 0.05, 0.06), (-0.2, Y + 0.54, 2.62), 'fenetre|#ffe9a8')
    K.boite((0.04, 0.5, 0.012), (W / 2 + 0.03, Y - 0.2, L - 0.1), 'metal|#aab3bb'); K.boite((0.04, 0.5, 0.012), (W / 2 + 0.03, Y - 0.2, L - 0.3), 'metal|#aab3bb')
    K.ancre('amarre', (0.0, Y + 0.02, L - 0.05))
    return K

def _coque_bateau(K, L, W, prof, haut, mat, effilement=0.18):
    """Coque par sections : étrave pointue en +x, poupe plate en -x."""
    secs = []
    n = 9
    for i in range(n):
        t = i / (n - 1)                                  # 0 poupe, 1 étrave
        x = -L / 2 + t * L
        w = W * (1 - max(0, (t - 0.6) / 0.4) ** 1.6 * 0.95) * (0.88 if t < 0.08 else 1.0)
        d = prof * (1 - (1 - min(1.0, t * 1.4)) * 0.1) * (1 - (max(0, t - 0.7) / 0.3) ** 2 * 0.6)
        secs.append((x, [(-w, haut), (-w * 0.93, haut * 0.35), (-w * 0.55, -d * 0.7), (0, -d), (w * 0.55, -d * 0.7), (w * 0.93, haut * 0.35), (w, haut)]))
    K.coque(secs, mat)

def bateau_peche(K):
    """Bateau de pêche : coque blanche, timonerie et mât, étals à poissons, canne installée à l'arrière."""
    _coque_bateau(K, 1.35, 0.27, 0.16, 0.2, BLANC)
    K.boite((1.2, 0.025, 0.46), (0.0, 0.205, 0), BOIS_CLAIR)
    K.boite((0.38, 0.28, 0.32), (-0.05, 0.36, 0), BLANC, biseau=0.008)
    K.boite((0.42, 0.03, 0.36), (-0.05, 0.51, 0), 'peinture|#d9453a')
    K.boite((0.02, 0.1, 0.3), (0.145, 0.38, 0), 'verre|#1b2f3f'); K.boite((0.28, 0.1, 0.02), (-0.05, 0.38, 0.165), 'verre|#1b2f3f'); K.boite((0.28, 0.1, 0.02), (-0.05, 0.38, -0.165), 'verre|#1b2f3f')
    K.cylindre((0.3, 0.2, 0), 0.015, 0.62, ACIER, seg=8); K.boite((0.02, 0.02, 0.3), (0.3, 0.7, 0), ACIER)
    for z in (-0.12, 0.12): K.cylindre((-0.45, 0.2, z), 0.012, 0.12, ACIER, seg=6)
    for i, (x, z) in enumerate(((0.45, 0.1), (0.5, -0.1))): K.boite((0.12, 0.07, 0.1), (x, 0.24, z), 'bois|#a87846', biseau=0.005)
    K.boite((0.2, 0.02, 0.2), (-0.55, 0.225, 0), 'peinture|#2a7de1')
    K.ancre('canne', (-0.45, 0.22, 0.12))
    K.boite((0.06, 0.05, 0.06), (0.3, 0.74, 0), 'fenetre|#ffe9a8')
    return K

def voilier(K):
    """Voilier de plaisance (sans les voiles, qui forment un objet à part pour pouvoir se rentrer)."""
    _coque_bateau(K, 1.15, 0.22, 0.15, 0.17, BLANC)
    K.boite((1.0, 0.022, 0.38), (0, 0.175, 0), BOIS_CLAIR)
    K.boite((0.3, 0.1, 0.22), (-0.08, 0.23, 0), BLANC, biseau=0.006); K.boite((0.3, 0.02, 0.24), (-0.08, 0.29, 0), BOIS_CLAIR)
    K.cylindre((0.12, 0.17, 0), 0.014, 1.0, 'metal|#cfd2d6', seg=8, r_haut=0.01)
    K.boite((0.45, 0.014, 0.014), (-0.15, 0.36, 0), 'metal|#cfd2d6')
    K.boite((1.16, 0.014, 0.4), (0, 0.145, 0), 'peinture|#c9342b')
    return K

def voiles(K):
    """Les voiles du voilier, origine au pied du mât : on les replie en écrasant l'axe y."""
    K.tri((0.0, 0.0, 0.0), (0.0, 0.92, 0.0), (-0.42, 0.04, 0.0), 'voile|#fbfaf5')
    K.tri((0.0, 0.04, 0.0), (-0.42, 0.04, 0.0), (0.0, 0.92, 0.0), 'voile|#fbfaf5')
    K.tri((0.03, 0.05, 0.0), (0.03, 0.82, 0.0), (0.45, 0.05, 0.0), 'voile|#fff4d8')
    K.tri((0.03, 0.05, 0.0), (0.45, 0.05, 0.0), (0.03, 0.82, 0.0), 'voile|#fff4d8')
    return K

def yacht(K):
    """Yacht blanc amarré au ponton : deux ponts, baies vitrées, radar."""
    _coque_bateau(K, 1.7, 0.3, 0.14, 0.2, BLANC)
    K.boite((1.5, 0.02, 0.5), (0, 0.205, 0), BOIS_CLAIR)
    K.boite((0.8, 0.22, 0.4), (-0.12, 0.33, 0), BLANC, biseau=0.01)
    K.boite((0.62, 0.2, 0.34), (-0.18, 0.54, 0), BLANC, biseau=0.01)
    for x in (-0.3, -0.12, 0.06, 0.24): K.boite((0.1, 0.07, 0.42), (x - 0.1, 0.36, 0), 'verre|#1b2f3f')
    for x in (-0.38, -0.2, -0.02): K.boite((0.1, 0.07, 0.36), (x, 0.57, 0), 'verre|#1b2f3f')
    K.boite((0.64, 0.025, 0.36), (-0.18, 0.66, 0), 'peinture|#cfd8dc')
    K.cylindre((-0.1, 0.665, 0), 0.012, 0.16, ACIER, seg=6); K.boite((0.12, 0.02, 0.03), (-0.1, 0.84, 0), 'metal|#cfd2d6')
    K.boite((1.72, 0.012, 0.01), (0, 0.15, 0.3), 'peinture|#2a4a7d')
    return K

def loco(K):
    """Locomotive à vapeur de jouet : chaudière, cheminée, dôme, cabine, roues rouges ; avance vers +x ; origine au sol (rails à y = 0)."""
    K.boite((0.98, 0.07, 0.3), (0, 0.13, 0), 'peinture|#17181b', biseau=0.008)
    K.cylindre((-0.35, 0.3, 0), 0.115, 0.7, 'peinture|#2d6a4f', seg=20, axe='x')
    K.cylindre((0.32, 0.3, 0), 0.115, 0.1, 'metal|#22252a', seg=20, axe='x')
    K.boite((0.04, 0.04, 0.04), (0.44, 0.3, 0), 'fenetre|#fff2b0')
    K.cylindre((0.25, 0.4, 0), 0.04, 0.17, 'metal|#22252a', seg=12, r_haut=0.055)
    K.cylindre((0.0, 0.4, 0), 0.05, 0.06, 'metal|#d9b44a', seg=12); K.cylindre((-0.1, 0.4, 0), 0.03, 0.08, 'metal|#d9b44a', seg=10)
    K.boite((0.3, 0.3, 0.3), (-0.37, 0.32, 0), 'peinture|#2d6a4f', biseau=0.01)
    K.boite((0.34, 0.025, 0.34), (-0.37, 0.485, 0), 'peinture|#17181b')
    K.boite((0.02, 0.1, 0.16), (-0.215, 0.36, 0), 'verre|#1b2f3f'); K.boite((0.16, 0.1, 0.02), (-0.37, 0.36, 0.15), 'verre|#1b2f3f'); K.boite((0.16, 0.1, 0.02), (-0.37, 0.36, -0.15), 'verre|#1b2f3f')
    for x in (0.18, -0.02, -0.28):
        for s in (-1, 1):
            K.cylindre((x, 0.085, s * 0.152), 0.075, 0.025, 'peinture|#c9342b', seg=18, axe='z')
            K.cylindre((x, 0.085, s * 0.152 + 0.012), 0.04, 0.012, 'metal|#d9d9d9', seg=10, axe='z')
    K.boite((0.62, 0.02, 0.025), (0.0, 0.12, 0.185), 'metal|#d9b44a'); K.boite((0.62, 0.02, 0.025), (0.0, 0.12, -0.185), 'metal|#d9b44a')
    K.boite((0.1, 0.04, 0.06), (0.52, 0.14, 0), 'metal|#22252a')
    K.ancre('fumee', (0.25, 0.6, 0))
    return K

def tender(K):
    K.boite((0.38, 0.07, 0.28), (0, 0.13, 0), 'peinture|#17181b', biseau=0.006)
    K.boite((0.36, 0.2, 0.28), (0, 0.27, 0), 'peinture|#2d6a4f', biseau=0.008)
    K.boite((0.32, 0.06, 0.24), (0, 0.4, 0), 'peinture|#17181b')
    for x in (-0.12, 0.12):
        for s in (-1, 1): K.cylindre((x, 0.075, s * 0.145), 0.065, 0.022, 'peinture|#c9342b', seg=16, axe='z')
    return K

def _wagon(K, couleur):
    K.boite((0.54, 0.06, 0.28), (0, 0.13, 0), 'peinture|#17181b', biseau=0.006)
    K.boite((0.52, 0.2, 0.28), (0, 0.26, 0), couleur, biseau=0.01)
    K.toit_deux_pans((0, 0.36, 0), 0.52, 0.28, 0.07, 'peinture|#d9d9d4', debord=0.01, mat_pignon='peinture|#d9d9d4')
    for x in (-0.16, 0.0, 0.16):
        for s in (-1, 1): K.boite((0.1, 0.08, 0.012), (x, 0.28, s * 0.143), 'fenetre|#ffe9a8')
    for x in (-0.17, 0.17):
        for s in (-1, 1): K.cylindre((x, 0.075, s * 0.145), 0.062, 0.02, 'metal|#22252a', seg=16, axe='z')
    return K

def wagon_a(K): return _wagon(K, 'peinture|#e8573d')
def wagon_b(K): return _wagon(K, 'peinture|#2a7de1')

def voiture(K):
    """Petite voiture blanche (clin d'œil à Route & vigilance) ; avance vers +x ; origine au sol."""
    K.boite((0.56, 0.1, 0.26), (0, 0.11, 0), BLANC, biseau=0.015)
    K.prisme_z([(-0.2, 0.16), (0.2, 0.16), (0.12, 0.27), (-0.1, 0.27)], -0.12, 0.12, BLANC)
    K.boite((0.2, 0.08, 0.002), (0.0, 0.215, 0.121), 'verre|#1b2f3f'); K.boite((0.2, 0.08, 0.002), (0.0, 0.215, -0.121), 'verre|#1b2f3f')
    K.boite((0.004, 0.07, 0.2), (0.15, 0.215, 0), 'verre|#1b2f3f')
    for x in (-0.18, 0.18):
        for s in (-1, 1): K.cylindre((x, 0.055, s * 0.12), 0.055, 0.04, 'plastique|#17181b', seg=14, axe='z')
    K.boite((0.01, 0.03, 0.06), (0.282, 0.13, 0.08), 'fenetre|#fff2b0'); K.boite((0.01, 0.03, 0.06), (0.282, 0.13, -0.08), 'fenetre|#fff2b0')
    K.boite((0.01, 0.03, 0.06), (-0.282, 0.13, 0.08), 'neon|#ff2a2a'); K.boite((0.01, 0.03, 0.06), (-0.282, 0.13, -0.08), 'neon|#ff2a2a')
    return K

def phare(K):
    """Phare rayé rouge et blanc, galerie, lanterne vitrée et coiffe rouge, sur un socle de roche."""
    K.cylindre((0, 0, 0), 0.44, 0.22, 'pierre|#a9a79d', seg=14, r_haut=0.34)
    rs = [(0.22, 0.3, 'peinture|#f1f0ea'), (0.62, 0.275, 'peinture|#c9342b'), (1.02, 0.25, 'peinture|#f1f0ea'), (1.42, 0.225, 'peinture|#c9342b')]
    for i, (y, r, m) in enumerate(rs):
        r2 = rs[i + 1][1] if i + 1 < len(rs) else 0.2
        K.cylindre((0, y, 0), r, 0.4, m, seg=20, r_haut=r2)
    K.cylindre((0, 1.82, 0), 0.27, 0.05, 'metal|#2c323b', seg=20)
    for k in range(16):
        a = k / 16 * 2 * math.pi
        K.boite((0.014, 0.1, 0.014), (0.26 * math.cos(a), 1.92, 0.26 * math.sin(a)), 'metal|#2c323b')
    K.cylindre((0, 2.0, 0), 0.265, 0.015, 'metal|#2c323b', seg=20)
    K.cylindre((0, 1.87, 0), 0.18, 0.3, 'verre|#bfe3ee', seg=16)
    K.cylindre((0, 1.95, 0), 0.075, 0.1, 'fenetre|#fff2b0', seg=12)
    K.cylindre((0, 2.17, 0), 0.2, 0.12, 'peinture|#c9342b', seg=16, r_haut=0.02)
    K.cylindre((0, 2.28, 0), 0.01, 0.1, 'metal|#d9b44a', seg=6)
    K.porte((0, 0.2, 0.28), 0.12, 0.2, 0, 'pierre|#efe6d0', marches=False)
    for y in (0.7, 1.2): K.boite((0.06, 0.08, 0.02), (0, y, 0.255 - (y - 0.7) * 0.04), 'verre|#1b2f3f')
    K.ancre('lampe', (0, 1.95, 0))
    return K

BATIMENTS.update({'pont': pont, 'ponton': ponton, 'bateau': bateau_peche, 'voilier': voilier, 'voiles': voiles, 'yacht': yacht, 'loco': loco, 'tender': tender,
                  'wagon_a': wagon_a, 'wagon_b': wagon_b, 'voiture': voiture, 'phare': phare})
