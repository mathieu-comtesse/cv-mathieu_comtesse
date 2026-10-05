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
    """Ponton de bois : planches, deux files de pilotis qui plongent jusqu'au fond, culée de pierre côté plage, bittes, défenses, caisses, échelle, bouée, lampe."""
    L, W, Y = 2.75, 0.52, 0.2
    n = 22
    for i in range(n):
        K.boite((W, 0.03, L / n - 0.012), (0, Y, (i + 0.5) * L / n), BOIS_CLAIR if i % 3 else 'bois|#a87846')
        if i % 4 == 1:                                                                               # planche usée, plus sombre
            K.boite((W, 0.004, L / n - 0.02), (0, Y + 0.016, (i + 0.5) * L / n), 'bois|#7a5532')
    for s in (-1, 1):
        K.boite((0.05, 0.07, L), (s * (W / 2 + 0.02), Y - 0.055, L / 2), BOIS_SOMBRE)
        K.boite((0.03, 0.03, L), (s * (W / 2 + 0.035), Y + 0.03, L / 2), BOIS_SOMBRE)                # liston de bord
    for z in [0.1 + k * 0.55 for k in range(6)]:
        for s in (-1, 1):
            K.cylindre((s * (W / 2 + 0.02), -1.4, z), 0.034, 1.65, BOIS_SOMBRE, seg=10, r_haut=0.03)
            K.cylindre((s * (W / 2 + 0.02), Y + 0.04, z), 0.036, 0.015, 'metal|#2c323b', seg=10)         # capuchon de pilotis
        K.boite((W + 0.12, 0.04, 0.05), (0, Y - 0.04, z), BOIS_SOMBRE)
    for z in (0.5, 1.3, 2.5):
        for s in (-1, 1):
            K.cylindre((s * (W / 2 + 0.05), Y + 0.015, z), 0.022, 0.07, 'metal|#2c323b', seg=8, r_haut=0.03)
            K.cylindre((s * (W / 2 + 0.05), Y + 0.085, z), 0.034, 0.016, 'metal|#2c323b', seg=8)
    for z in (0.35, 1.0, 1.7, 2.35):                                                                  # défenses (pare-battage) le long du bord
        K.cylindre((W / 2 + 0.07, Y - 0.14, z), 0.022, 0.1, 'peinture|#f1f0ea', seg=8)
        K.cylindre((-W / 2 - 0.07, Y - 0.14, z), 0.022, 0.1, 'peinture|#f1f0ea', seg=8)
    K.boite((0.22, 0.2, 0.22), (-0.12, Y + 0.115, 0.6), 'bois|#8a5a34', biseau=0.006); K.boite((0.18, 0.16, 0.18), (0.14, Y + 0.095, 0.82), 'bois|#9a6a3c', biseau=0.006)
    K.boite((0.2, 0.12, 0.16), (-0.12, Y + 0.27, 0.6), 'peinture|#2a7de1', biseau=0.005)
    K.cylindre((0.14, Y + 0.015, 2.3), 0.07, 0.18, 'bois|#7a4f2c', seg=12)
    K.cylindre((0.14, Y + 0.195, 2.3), 0.072, 0.012, 'metal|#2c323b', seg=12)
    K.cylindre((-0.2, Y + 0.015, 2.62), 0.012, 0.5, ACIER, seg=6); K.boite((0.06, 0.05, 0.06), (-0.2, Y + 0.54, 2.62), 'fenetre|#ffe9a8')
    K.boite((0.09, 0.012, 0.09), (-0.2, Y + 0.52, 2.62), 'metal|#2c323b')
    K.boite((0.04, 0.5, 0.012), (W / 2 + 0.03, Y - 0.2, L - 0.1), 'metal|#aab3bb'); K.boite((0.04, 0.5, 0.012), (W / 2 + 0.03, Y - 0.2, L - 0.3), 'metal|#aab3bb')
    for k in range(4): K.boite((0.04, 0.012, 0.2), (W / 2 + 0.03, Y - 0.08 - k * 0.1, L - 0.2), 'metal|#aab3bb')
    K.cylindre((-W / 2 - 0.02, Y + 0.02, 1.9), 0.05, 0.02, 'peinture|#e8582b', seg=14)               # bouée de sauvetage posée
    K.cylindre((-W / 2 - 0.02, Y + 0.04, 1.9), 0.05, 0.005, 'peinture|#f1f0ea', seg=14)
    # culée côté plage : bloc de pierre dont le pied est recalé sur le relief (atlas-batiments.js, ajusterPieds)
    K.boite((W + 0.34, 0.2, 0.5), (0, Y - 0.1, -0.2), 'pierre|#bdb7a8', pied=True)
    K.boite((W + 0.38, 0.03, 0.54), (0, Y + 0.015, -0.2), 'pierre|#d2ccbd', biseau=0.008)
    K.ancre('amarre', (0.0, Y + 0.02, L - 0.05))
    return K

def _largeur(L, W, t):
    """Demi-largeur de la coque à l'abscisse relative t (0 poupe, 1 étrave) : poupe presque pleine, étrave effilée."""
    return W * (1 - max(0, (t - 0.55) / 0.45) ** 1.7 * 0.96) * (0.9 if t < 0.06 else 1.0)

def _coque_bateau(K, L, W, prof, haut, mat, effilement=0.18, bas='peinture|#8a2f2c', pont=None):
    """Coque par sections : étrave pointue en +x, poupe plate en -x. Haut de muraille clair, carène sombre sous la ligne de flottaison, pont en bois."""
    secs = []
    n = 17
    for i in range(n):
        t = i / (n - 1)
        x = -L / 2 + t * L
        w = _largeur(L, W, t)
        d = prof * (1 - (1 - min(1.0, t * 1.4)) * 0.1) * (1 - (max(0, t - 0.7) / 0.3) ** 2 * 0.6)
        secs.append((x, [(-w, haut), (-w * 0.97, 0.012), (-w * 0.72, -d * 0.45), (0, -d), (w * 0.72, -d * 0.45), (w * 0.97, 0.012), (w, haut)]))
    K.coque(secs, mat, mats=[mat, bas, bas, bas, bas, mat, pont or BOIS_CLAIR])
    for s in (-1, 1):                                                                                 # liston (lisse de bastingage)
        K.tronc_courbe([(-L / 2 + i / (n - 1) * L, haut + 0.004, s * _largeur(L, W, i / (n - 1))) for i in range(n)], 0.009, 0.009, 'bois|#6b4a2e', seg=6)
    for t in (0.2, 0.34, 0.48, 0.62):                                                                 # hublots
        w = _largeur(L, W, t); x = -L / 2 + t * L
        for s in (-1, 1):
            z = s * w * 0.985 + (0.0 if s > 0 else -0.012)
            K.cylindre((x, haut * 0.5, z), 0.021, 0.012, 'metal|#cfd2d6', seg=12, axe='z')
            K.cylindre((x, haut * 0.5, z + (0.004 if s > 0 else 0.002)), 0.015, 0.012, 'verre|#1b2f3f', seg=12, axe='z')
    return secs

def _vitre(K, c, taille, mat_cadre='metal|#e9ecef', mat_verre='verre|#1b2f3f'):
    """Baie vitrée à cadre clair, centrée en c : la vitre dépasse du cadre pour être vue sous tous les angles."""
    K.boite((taille[0] + 0.016, taille[1] + 0.016, taille[2] - 0.004), c, mat_cadre)
    K.boite(taille, c, mat_verre)

def _pont_planches(K, x0, x1, z, y, mat='bois|#6b4a2e', pas=0.045):
    """Joints sombres entre les lattes du pont, en travers : le pont se lit comme du bois et non comme une plaque."""
    n = int((x1 - x0) / pas)
    for i in range(n + 1): K.boite((0.004, 0.003, 2 * z), (x0 + i * pas, y, 0), mat)

def _bouee(K, c, r=0.05):
    K.cylindre(c, r, 0.014, 'peinture|#e8582b', seg=16, axe='z')
    for a in (0, 1.5708, 3.1416, 4.7124):
        K.boite((0.016, 0.016, 0.016), (c[0] + math.cos(a) * r * 0.82, c[1] + math.sin(a) * r * 0.82, c[2] + 0.014), 'peinture|#f1f0ea')

def _ancre(K, c):
    K.cylindre((c[0], c[1], c[2]), 0.006, 0.09, ACIER, seg=6); K.boite((0.05, 0.006, 0.006), (c[0], c[1] + 0.075, c[2]), ACIER)
    K.boite((0.04, 0.008, 0.02), (c[0], c[1], c[2]), ACIER); K.boite((0.016, 0.01, 0.045), (c[0] + 0.02, c[1] + 0.012, c[2]), ACIER)
    K.boite((0.016, 0.01, 0.045), (c[0] - 0.02, c[1] + 0.012, c[2]), ACIER)

def _feux(K, x, z_haut, y):
    K.boite((0.03, 0.03, 0.03), (x, y, -z_haut), 'neon|#ff2a2a'); K.boite((0.03, 0.03, 0.03), (x, y, z_haut), 'neon|#2aff6a')

def _pavillon(K, x, y0, h, mat):
    K.cylindre((x, y0, 0), 0.006, h, 'metal|#cfd2d6', seg=6)
    K.tri((x, y0 + h, 0), (x, y0 + h - 0.07, 0), (x - 0.11, y0 + h - 0.035, 0), mat); K.tri((x, y0 + h - 0.07, 0), (x, y0 + h, 0), (x - 0.11, y0 + h - 0.035, 0), mat)

def bateau_peche(K):
    """Bateau de pêche : coque blanche à carène bleue, pont de lattes, timonerie vitrée à toit-terrasse, mât à haubans et bôme de charge, tambour à filet, caisses, bouées, canne à l'arrière."""
    _coque_bateau(K, 1.35, 0.27, 0.16, 0.2, BLANC, bas='peinture|#2a4a7d')
    _pont_planches(K, -0.6, 0.55, 0.22, 0.201)
    K.boite((0.38, 0.28, 0.32), (-0.05, 0.34, 0), BLANC, biseau=0.008)
    K.boite((0.44, 0.03, 0.38), (-0.05, 0.5, 0), 'peinture|#d9453a', biseau=0.005)
    K.boite((0.44, 0.012, 0.012), (-0.05, 0.525, 0.185), ACIER); K.boite((0.44, 0.012, 0.012), (-0.05, 0.525, -0.185), ACIER)
    _vitre(K, (0.146, 0.38, 0), (0.02, 0.1, 0.28))
    for z in (-0.169, 0.169): _vitre(K, (-0.05, 0.38, z), (0.28, 0.1, 0.02))
    _vitre(K, (-0.235, 0.38, 0), (0.02, 0.1, 0.22))
    K.boite((0.06, 0.16, 0.012), (-0.05, 0.31, 0.164), 'peinture|#6b4a2e')                           # porte de la timonerie
    # mât, haubans et bôme de charge
    K.cylindre((0.3, 0.2, 0), 0.015, 0.62, ACIER, seg=8, r_haut=0.011); K.boite((0.02, 0.02, 0.3), (0.3, 0.7, 0), ACIER)
    K.tronc_courbe([(0.3, 0.8, 0), (0.62, 0.21, 0)], 0.004, 0.004, ACIER, seg=5); K.tronc_courbe([(0.3, 0.8, 0), (-0.55, 0.27, 0)], 0.004, 0.004, ACIER, seg=5)
    for z in (-0.2, 0.2): K.tronc_courbe([(0.3, 0.74, 0), (0.28, 0.21, z)], 0.003, 0.003, ACIER, seg=5)
    K.tronc_courbe([(0.3, 0.45, 0), (0.62, 0.34, 0.0)], 0.009, 0.009, 'bois|#6b4a2e', seg=6)
    K.tronc_courbe([(0.62, 0.34, 0), (0.62, 0.23, 0)], 0.002, 0.002, ACIER, seg=4); K.boite((0.03, 0.025, 0.03), (0.62, 0.22, 0), 'metal|#d9b44a')
    # arrière : portiques, tambour à filet, canne
    for z in (-0.12, 0.12): K.cylindre((-0.45, 0.2, z), 0.012, 0.12, ACIER, seg=6)
    K.boite((0.02, 0.02, 0.26), (-0.45, 0.32, 0), ACIER)
    K.cylindre((-0.3, 0.215, -0.16), 0.075, 0.18, 'metal|#2d6a4f', seg=16, axe='z'); K.cylindre((-0.3, 0.215, -0.16), 0.09, 0.012, 'metal|#2c323b', seg=16, axe='z'); K.cylindre((-0.3, 0.215, 0.02), 0.09, 0.012, 'metal|#2c323b', seg=16, axe='z')
    for (x, z, c) in ((0.45, 0.1, 'bois|#a87846'), (0.5, -0.1, 'bois|#a87846'), (0.43, -0.12, 'peinture|#2a7de1')): K.boite((0.12, 0.07, 0.1), (x, 0.24, z), c, biseau=0.005)
    K.boite((0.12, 0.05, 0.1), (0.46, 0.295, 0.1), 'peinture|#f1f0ea', biseau=0.005)
    for (x, z) in ((0.12, -0.2), (0.17, -0.19), (-0.18, 0.2)): K.cylindre((x, 0.2, z), 0.032, 0.055, 'peinture|#e8582b', seg=10, r_haut=0.028)   # bouées de pêche
    K.boite((0.2, 0.02, 0.2), (-0.55, 0.225, 0), 'peinture|#2a7de1')
    for s in (-1, 1): K.garde_corps((-0.62, 0.2, s * 0.215), (0.02, 0.2, s * 0.235), 0.075, ACIER, poteaux=0.16, lisse=0.007)
    K.garde_corps((-0.62, 0.2, -0.215), (-0.62, 0.2, 0.215), 0.075, ACIER, poteaux=0.16, lisse=0.007)
    _bouee(K, (-0.05, 0.4, 0.176)); _ancre(K, (0.58, 0.2, 0.0)); _feux(K, -0.05, 0.19, 0.545)
    K.cylindre((-0.05, 0.515, 0.0), 0.008, 0.16, ACIER, seg=6); K.boite((0.1, 0.012, 0.025), (-0.05, 0.69, 0), 'metal|#d9d9d9')           # antenne et radar
    for z in (-0.19, 0.19): K.boite((0.04, 0.03, 0.03), (0.24, 0.215, z), 'peinture|#f1f0ea')                                                # défenses
    _pavillon(K, -0.64, 0.2, 0.34, 'peinture|#2a7de1')
    K.ancre('canne', (-0.45, 0.22, 0.12))
    K.boite((0.06, 0.05, 0.06), (0.3, 0.84, 0), 'fenetre|#ffe9a8')
    return K

def voilier(K):
    """Voilier de plaisance (sans les voiles, qui forment un objet à part pour pouvoir se rentrer) : coque effilée à liston, rouf à hublots, cockpit, haubans, étais, bôme, balcons."""
    _coque_bateau(K, 1.15, 0.22, 0.15, 0.17, BLANC, bas='peinture|#1f3a5f', pont='bois|#b98a55')
    _pont_planches(K, -0.5, 0.4, 0.185, 0.171, mat='bois|#7a5532')
    K.boite((0.34, 0.1, 0.22), (0.0, 0.22, 0), BLANC, biseau=0.006); K.boite((0.36, 0.014, 0.24), (0.0, 0.277, 0), 'bois|#9a6a3c')
    for s in (-1, 1):
        for x in (-0.09, 0.0, 0.09): K.cylindre((x, 0.22, s * 0.111 + (0 if s > 0 else -0.01)), 0.022, 0.01, 'verre|#1b2f3f', seg=10, axe='z')
    K.boite((0.1, 0.012, 0.1), (0.22, 0.176, 0), 'metal|#cfd2d6')                                    # écoutille de pont
    K.boite((0.3, 0.05, 0.05), (-0.34, 0.2, 0.14), 'bois|#9a6a3c'); K.boite((0.3, 0.05, 0.05), (-0.34, 0.2, -0.14), 'bois|#9a6a3c')       # banquettes du cockpit
    K.boite((0.2, 0.012, 0.01), (-0.52, 0.205, 0), 'bois|#6b4a2e'); K.boite((0.012, 0.012, 0.18), (-0.5, 0.215, 0), ACIER)               # barre
    for z in (-0.18, 0.18): K.cylindre((-0.14, 0.17, z), 0.016, 0.02, 'metal|#cfd2d6', seg=10)                                          # winches
    K.cylindre((0.12, 0.17, 0), 0.014, 1.0, 'metal|#cfd2d6', seg=8, r_haut=0.01)
    K.boite((0.012, 0.012, 0.22), (0.12, 0.8, 0), 'metal|#cfd2d6'); K.boite((0.012, 0.012, 0.16), (0.12, 0.96, 0), 'metal|#cfd2d6')       # barres de flèche
    K.boite((0.03, 0.03, 0.03), (0.12, 1.18, 0), 'neon|#ffffff')
    K.tronc_courbe([(0.12, 1.15, 0), (0.55, 0.18, 0)], 0.003, 0.003, 'metal|#cfd2d6', seg=5); K.tronc_courbe([(0.12, 1.15, 0), (-0.55, 0.18, 0)], 0.003, 0.003, 'metal|#cfd2d6', seg=5)
    for z in (-0.19, 0.19):
        K.tronc_courbe([(0.12, 0.96, 0), (0.12, 0.96, z * 0.45), (0.12, 0.18, z)], 0.0025, 0.0025, 'metal|#cfd2d6', seg=4)
        K.tronc_courbe([(0.12, 0.8, z * 0.45), (0.12, 0.18, z)], 0.0025, 0.0025, 'metal|#cfd2d6', seg=4)
    for s in (-1, 1):                                                                                  # balcons avant et arrière + filières
        K.garde_corps((0.5, 0.17, s * 0.06), (-0.52, 0.17, s * 0.195), 0.06, 'metal|#cfd2d6', poteaux=0.18, lisse=0.004)
    K.garde_corps((0.5, 0.17, -0.06), (0.5, 0.17, 0.06), 0.06, 'metal|#cfd2d6', poteaux=0.12, lisse=0.004)
    K.boite((1.16, 0.014, 0.4), (0, 0.145, 0), 'peinture|#c9342b')                                    # lisse de pont rouge
    _bouee(K, (-0.56, 0.235, 0.0), 0.04); _ancre(K, (0.52, 0.18, 0.0)); _feux(K, 0.5, 0.06, 0.2)
    _pavillon(K, -0.57, 0.17, 0.28, 'peinture|#c9342b')
    return K

def _voile(K, A, B, C, creux, mat, n=7):
    """Voile triangulaire bombée (creux en z) : A écoute, B point de drisse, C point d'amure ; maillage en bandes, deux faces."""
    def P(u, v):                                                          # u le long du guindant (A->B), v vers le point d'écoute (0..1)
        b = [A[i] + (B[i] - A[i]) * u for i in range(3)]; c = [C[i] + (B[i] - C[i]) * u for i in range(3)]
        p = [b[i] + (c[i] - b[i]) * v for i in range(3)]
        return (p[0], p[1], p[2] + creux * math.sin(math.pi * v) * (1 - u) ** 0.6)
    for i in range(n):
        for j in range(n):
            u0, u1, v0, v1 = i / n, (i + 1) / n, j / n, (j + 1) / n
            q = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]
            K.quad(q[0], q[1], q[2], q[3], mat); K.quad(q[3], q[2], q[1], q[0], mat)

def voiles(K):
    """Les voiles du voilier, origine au pied du mât : grand-voile bombée à lattes, foc bordé de rouge ; on les replie en écrasant l'axe y."""
    _voile(K, (0.0, 0.04, 0.0), (0.0, 0.98, 0.0), (-0.44, 0.04, 0.0), 0.05, 'voile|#fbfaf5')
    for k in range(1, 4):                                                                                 # lattes
        u = k * 0.22; y = 0.04 + 0.94 * u; K.boite((0.2 * (1 - u) + 0.05, 0.008, 0.012), (-0.2 * (1 - u) - 0.03, y, 0.02 + 0.03 * (1 - u) ** 0.6), 'voile|#e4e1d6')
    K.boite((0.46, 0.012, 0.012), (-0.2, 0.04, 0.0), 'metal|#cfd2d6')                                    # bôme
    _voile(K, (0.03, 0.06, 0.0), (0.03, 0.84, 0.0), (0.5, 0.06, 0.0), -0.04, 'voile|#fff4d8')
    K.boite((0.46, 0.014, 0.008), (0.27, 0.065, 0.0), 'voile|#d1453b')                                    # bande de foc au point d'amure
    return K

def yacht(K):
    """Yacht blanc amarré au ponton : coque à liseré, deux ponts, baies vitrées cadrées, flybridge, arche radar, garde-corps, annexe, plage arrière."""
    _coque_bateau(K, 1.7, 0.3, 0.14, 0.2, BLANC, bas='peinture|#1b2f4f', pont='bois|#b98a55')
    _pont_planches(K, -0.7, 0.55, 0.26, 0.201)
    K.boite((1.72, 0.012, 0.01), (0, 0.15, 0.3), 'peinture|#2a4a7d')
    K.boite((0.8, 0.22, 0.4), (-0.12, 0.33, 0), BLANC, biseau=0.01)
    K.boite((0.62, 0.2, 0.34), (-0.18, 0.54, 0), BLANC, biseau=0.01)
    for x in (-0.3, -0.12, 0.06, 0.24):
        for z in (-0.202, 0.202): _vitre(K, (x - 0.1, 0.36, z), (0.1, 0.07, 0.02))
    _vitre(K, (0.29, 0.36, 0), (0.02, 0.07, 0.3))
    for x in (-0.38, -0.2, -0.02):
        for z in (-0.172, 0.172): _vitre(K, (x, 0.57, z), (0.1, 0.07, 0.02))
    K.boite((0.7, 0.025, 0.4), (-0.18, 0.66, 0), 'peinture|#cfd8dc', biseau=0.005)
    K.boite((0.3, 0.03, 0.3), (-0.1, 0.69, 0), 'peinture|#f1f0ea', biseau=0.005); K.boite((0.28, 0.06, 0.012), (-0.1, 0.725, 0.142), 'verre|#1b2f3f')   # flybridge, pare-brise
    for z in (-0.18, 0.18): K.cylindre((-0.42, 0.665, z), 0.008, 0.2, 'metal|#cfd2d6', seg=6)
    K.boite((0.02, 0.014, 0.38), (-0.42, 0.865, 0), 'metal|#cfd2d6'); K.boite((0.1, 0.014, 0.03), (-0.42, 0.88, 0), 'metal|#d9d9d9')                   # arche radar
    K.cylindre((-0.1, 0.665, 0), 0.012, 0.16, ACIER, seg=6); K.boite((0.12, 0.02, 0.03), (-0.1, 0.84, 0), 'metal|#cfd2d6')
    for s in (-1, 1): K.garde_corps((0.5, 0.2, s * 0.15), (-0.7, 0.2, s * 0.27), 0.07, 'metal|#cfd2d6', poteaux=0.2, lisse=0.005)
    K.garde_corps((0.5, 0.2, -0.15), (0.5, 0.2, 0.15), 0.07, 'metal|#cfd2d6', poteaux=0.15, lisse=0.005)
    K.garde_corps((-0.8, 0.2, -0.26), (-0.8, 0.2, 0.26), 0.07, 'metal|#cfd2d6', poteaux=0.15, lisse=0.005)
    K.boite((0.14, 0.012, 0.5), (-0.88, 0.14, 0), 'bois|#b98a55')                                         # plage arrière
    K.boite((0.3, 0.05, 0.16), (0.42, 0.225, 0), 'peinture|#2a4a7d', biseau=0.005); K.boite((0.28, 0.02, 0.14), (0.42, 0.26, 0), 'peinture|#f1f0ea')    # bain de soleil avant
    K.boite((0.26, 0.05, 0.14), (-0.62, 0.225, 0), 'peinture|#f1f0ea', biseau=0.005)
    K.boite((0.24, 0.04, 0.1), (-0.72, 0.23, 0), 'peinture|#c9342b', biseau=0.005); K.boite((0.2, 0.03, 0.06), (-0.72, 0.265, 0), 'peinture|#f1f0ea')    # annexe
    _bouee(K, (-0.12, 0.34, 0.21)); _ancre(K, (0.66, 0.2, 0.0)); _feux(K, 0.3, 0.1, 0.23)
    _pavillon(K, -0.86, 0.14, 0.34, 'peinture|#c9342b')
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
