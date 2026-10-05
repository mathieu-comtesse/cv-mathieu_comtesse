"""Bâtiments de l'atlas, suite : campus, gare, poste de signalisation, studio. Même conventions que batiments_def.py."""
import math
from blender_kit import Kit
from batiments_def import *
BR = 'brique|#a9573b'; BETON = 'beton|#d6d2c9'; ACIER = 'metal|#38404a'; ARDOISE = 'ardoise|#4f5b66'

def usp(K):
    """Université Sorbonne Paris Nord (Villetaneuse) d'après la photo : haute tour de brique rouge à pilastres blancs, couronnée d'un bloc blanc à horloge et à
    l'inscription « PARIS 13 NORD » ; long bâtiment voisin à rez-de-chaussée de brique, étages de crépi crème à stores beiges, toit-terrasse à garde-corps vitré."""
    BRU = 'brique|#a23c2a'; CREME = 'crepi|#efe7d3'; BLANC = 'crepi|#f6f1e6'; STORE = 'peinture|#cdb98f'
    K.boite((4.9, 0.08, 2.3), (-0.2, 0.04, 0.0), SOCLE, biseau=0.012)
    # --- tour : x = +1.45, 0.8 x 0.8, 11 rangées de fenêtres, pilastres blancs aux angles et au milieu de chaque face
    tx, tz, W, H0 = 1.45, -0.1, 0.8, 0.1
    K.boite((W + 0.1, 0.12, W + 0.1), (tx, H0 + 0.06, tz), BLANC, biseau=0.01)
    hb = 3.25
    K.boite((W, hb, W), (tx, H0 + 0.12 + hb / 2, tz), BRU, biseau=0.01)
    for dx in (-1, 0, 1):
        for face in range(4):
            if face in (0, 2): c = (tx + dx * (W / 2 - 0.035), H0 + 0.12 + hb / 2, tz + (W / 2 + 0.012) * (1 if face == 0 else -1))
            else: c = (tx + (W / 2 + 0.012) * (1 if face == 1 else -1), H0 + 0.12 + hb / 2, tz + dx * (W / 2 - 0.035))
            sz = (0.07, hb, 0.03) if face in (0, 2) else (0.03, hb, 0.07)
            K.boite(sz, c, BLANC)
    for k in range(11):
        y = H0 + 0.12 + 0.2 + k * 0.275
        for face in range(4):
            for dx in (-0.19, 0.19):
                if face == 0: c = (tx + dx, y, tz + W / 2)
                elif face == 2: c = (tx - dx, y, tz - W / 2)
                elif face == 1: c = (tx + W / 2, y, tz - dx)
                else: c = (tx - W / 2, y, tz + dx)
                K.fenetre(c, 0.12, 0.17, face, 'metal|#d9d6cc', appui=False, croisillons=False)
    # étage haut : fenêtres à arc, corniche, bloc blanc de l'horloge
    ytop = H0 + 0.12 + hb
    K.boite((W + 0.1, 0.1, W + 0.1), (tx, ytop + 0.05, tz), BLANC, biseau=0.01)
    K.boite((W + 0.04, 0.34, W + 0.04), (tx, ytop + 0.27, tz), BRU, biseau=0.01)
    for face in range(4):
        for dx in (-0.19, 0.19):
            c = ((tx + dx, ytop + 0.27, tz + W / 2 + 0.02), (tx + W / 2 + 0.02, ytop + 0.27, tz - dx), (tx - dx, ytop + 0.27, tz - W / 2 - 0.02), (tx - W / 2 - 0.02, ytop + 0.27, tz + dx))[face]
            K.fenetre(c, 0.14, 0.22, face, BLANC, arc=True, appui=False, croisillons=False, mat_verre='verre|#0d1a24')
    K.boite((W + 0.1, 0.07, W + 0.1), (tx, ytop + 0.48, tz), BLANC, biseau=0.008)
    K.boite((W + 0.02, 0.62, W + 0.02), (tx, ytop + 0.83, tz), BLANC, biseau=0.01)
    K.boite((W + 0.1, 0.06, W + 0.1), (tx, ytop + 1.17, tz), BLANC, biseau=0.008)
    K.boite((0.45, 0.07, 0.45), (tx, ytop + 1.23, tz), 'beton|#d6d2c9')
    K.cylindre((tx, ytop + 1.26, tz), 0.012, 0.22, 'metal|#aab3bb', seg=6)
    # cadrans (faces +x et -x), inscription (face +z) : posés par le jeu sur ces ancres
    K.ancre('cadran_e', (tx + W / 2 + 0.03, ytop + 0.85, tz)); K.ancre('cadran_o', (tx - W / 2 - 0.03, ytop + 0.85, tz)); K.ancre('enseigne', (tx, ytop + 0.85, tz + W / 2 + 0.03))
    K.ancre('cloche', (tx + 0.19, ytop + 0.27, tz + W / 2 + 0.2))
    # --- long bâtiment : rez-de-chaussée de brique, deux étages de crépi, attique en retrait et garde-corps vitré
    wx = -0.55; L = 3.0
    K.boite((L, 0.62, 1.05), (wx, H0 + 0.31, 0.1), BRU, biseau=0.01)
    K.boite((L + 0.04, 0.05, 1.09), (wx, H0 + 0.645, 0.1), BLANC)
    K.boite((L - 0.04, 0.82, 1.0), (wx, H0 + 0.67 + 0.41, 0.1), CREME, biseau=0.01)
    K.boite((L + 0.04, 0.045, 1.08), (wx, H0 + 1.50, 0.1), BLANC)
    K.boite((L - 0.9, 0.34, 0.7), (wx - 0.45, H0 + 1.52 + 0.17, 0.0), CREME, biseau=0.01)
    K.boite((L - 0.8, 0.04, 0.74), (wx - 0.45, H0 + 1.88, 0.0), BLANC)
    for x in [wx - L / 2 + 0.2 + i * 0.28 for i in range(int((L - 0.3) / 0.28) + 1)]:
        K.fenetre((x, H0 + 0.33, 0.625), 0.2, 0.34, 0, 'metal|#d9d6cc', appui=False)               # grandes baies du rez-de-chaussée
        for y in (H0 + 0.93, H0 + 1.28):
            K.fenetre((x, y, 0.6), 0.14, 0.18, 0, BLANC, appui=True)
            K.boite((0.17, 0.045, 0.05), (x, y + 0.115, 0.63), STORE)                                  # caisson de store
        if x < wx + 0.5:
            K.fenetre((x + 0.0, H0 + 1.7, 0.355), 0.14, 0.16, 0, BLANC, appui=False)
    for x in [wx - L / 2 + 0.2 + i * 0.28 for i in range(int((L - 0.3) / 0.28) + 1)]:
        for y in (H0 + 0.33, H0 + 0.93, H0 + 1.28): K.fenetre((x, y, -0.4), 0.14, 0.18, 2, BLANC, appui=False, croisillons=False)
    for k in range(6):
        K.fenetre((-2.05, H0 + 0.33 + 0.35 * (k % 3), 0.1 + (k // 3) * 0.3 - 0.15), 0.14, 0.18, 3, BLANC, appui=False, croisillons=False)
    # garde-corps vitré et rampe sur le toit-terrasse
    K.garde_corps((wx - L / 2 + 0.05, H0 + 1.52, 0.55), (wx + L / 2 - 0.05, H0 + 1.52, 0.55), 0.16, 'metal|#cfd2d6', poteaux=0.4)
    K.boite((L - 0.1, 0.12, 0.012), (wx, H0 + 1.58, 0.55), 'verre|#9fc4d8')
    for x in (wx + 0.5, wx + 1.1): K.boite((0.3, 0.2, 0.26), (x, H0 + 1.62, 0.15), 'metal|#9aa3ab', biseau=0.01)
    # entrée vitrée et auvent
    K.boite((0.7, 0.55, 0.05), (wx + 0.7, H0 + 0.29, 0.65), 'verre|#2c5068', biseau=0.005)
    K.boite((0.95, 0.045, 0.4), (wx + 0.7, H0 + 0.6, 0.78), 'metal|#38404a', biseau=0.006)
    K.escalier((wx + 0.7, H0, 0.98), 0.95, 2, 0.04, 0.12, SOCLE, 2)
    # petit bâtiment bas de brique, à l'extrémité ouest
    K.boite((0.75, 0.9, 0.85), (-2.45, H0 + 0.45, 0.15), BRU, biseau=0.01)
    K.boite((0.8, 0.05, 0.9), (-2.45, H0 + 0.92, 0.15), BLANC)
    # abords : bancs et lampadaires
    K.banc((-0.2, 0.08, 0.95), 0.0); K.banc((0.5, 0.08, 0.95), 0.0)
    K.lampadaire((-1.2, 0.08, 1.0), 0.9); K.lampadaire((0.9, 0.08, 1.0), 0.9)
    return K

def sncf(K):
    """SNCF Gares & Connexions : bâtiment-voyageurs en pierre et ardoise, pignon à horloge, marquise sur poteaux, quai à bande jaune."""
    K.boite((4.0, 0.16, 1.6), (0, 0.08, 0.55), 'beton|#b9b5ab', biseau=0.01)
    K.boite((4.0, 0.012, 0.07), (0, 0.166, 1.26), 'peinture|#f2c230')
    K.boite((4.0, 0.06, 0.1), (0, 0.13, 1.33), 'beton|#8f8c84')
    K.boite((2.6, 0.95, 1.0), (0, 0.16 + 0.475, -0.45), 'pierre|#d8c9a8', biseau=0.012)
    K.boite((2.7, 0.06, 1.1), (0, 1.14, -0.45), 'pierre|#efe6d0', biseau=0.01)
    K.toit_deux_pans((0, 1.17, -0.45), 2.7, 1.0, 0.62, ARDOISE, debord=0.08, mat_pignon='pierre|#d8c9a8')
    K.boite((1.0, 1.1, 0.5), (0, 0.16 + 0.55, 0.15), 'pierre|#d8c9a8', biseau=0.012)
    K.boite((1.1, 0.06, 0.6), (0, 1.29, 0.15), 'pierre|#efe6d0', biseau=0.01)
    K.toit_deux_pans((0, 1.32, 0.12), 0.64, 1.1, 0.5, ARDOISE, debord=0.06, rot=PI / 2, mat_pignon='pierre|#d8c9a8')
    K.boite((0.36, 0.36, 0.03), (0, 1.48, 0.43), 'peinture|#fffdf5')
    K.ancre('horloge', (0, 1.48, 0.45))
    K.boite((0.5, 0.52, 0.02), (0, 0.16 + 0.26, 0.41), 'verre|#1b2f3f')
    K.boite((0.56, 0.05, 0.06), (0, 0.16 + 0.54, 0.43), 'pierre|#efe6d0')
    for s in (-1, 1):
        for xx in (0.75, 1.1):
            K.fenetre((s * xx, 0.16 + 0.34, 0.05), 0.2, 0.36, 0, 'pierre|#efe6d0', arc=True)
            K.fenetre((s * xx, 0.16 + 0.76, 0.05), 0.2, 0.28, 0, 'pierre|#efe6d0', volets='peinture|#3e6a5a')
    for x in (-1.0, -0.4, 0.4, 1.0):
        K.fenetre((x, 0.16 + 0.34, -0.95), 0.2, 0.36, 2, 'pierre|#efe6d0', arc=True)
    K.porte((0.0, 0.16, 0.405), 0.3, 0.52, 0, 'pierre|#efe6d0', marches=False)
    K.boite((0.1, 0.34, 0.1), (-0.75, 1.54, -0.5), BR, biseau=0.008); K.boite((0.14, 0.04, 0.14), (-0.75, 1.74, -0.5), 'pierre|#efe6d0')
    K.ancre('chat', (0.9, 1.80, -0.45))
    K.toit_simple_pente((0, 0.98, 0.95), 3.4, 0.9, 0.12, 'tole|#3d7a6a', debord=0.05, rot=math.pi)
    for x in (-1.5, -0.75, 0.0, 0.75, 1.5):
        K.cylindre((x, 0.16, 1.28), 0.025, 0.82, 'metal|#2f3a44', seg=8)
        K.boite((0.12, 0.04, 0.12), (x, 0.99, 1.28), 'metal|#2f3a44')
    K.banc((-1.2, 0.16, 0.7), 0.0, l=0.6); K.banc((1.2, 0.16, 0.7), 0.0, l=0.6)
    for x in (-1.7, -0.3, 1.0, 1.9): K.lampadaire((x, 0.16, 0.95 if abs(x) < 1.8 else 1.1), 0.85)
    K.boite((0.5, 0.3, 0.03), (0.6, 0.16 + 0.55, 0.9), 'peinture|#1b4f8f')
    K.boite((0.44, 0.24, 0.032), (0.6, 0.16 + 0.55, 0.9), 'fenetre|#a8d8ff')
    K.cylindre((0.6, 0.16, 0.9), 0.015, 0.4, ACIER, seg=8)
    return K

def reseau(K):
    """Poste de signalisation : cabine vitrée sur socle de brique, escalier extérieur, mât de signal à trois feux, antenne."""
    K.boite((1.3, 0.06, 1.3), (0, 0.03, 0), SOCLE, biseau=0.008)
    K.boite((1.0, 0.78, 0.8), (0, 0.06 + 0.39, 0), BR, biseau=0.01)
    K.boite((1.06, 0.05, 0.86), (0, 0.87, 0), BETON)
    K.boite((1.1, 0.5, 0.9), (0, 0.9 + 0.25, 0), 'peinture|#cfd8dc', biseau=0.01)
    for dz, d in ((0.451, 0), (-0.451, 2)):
        for x in (-0.33, 0.0, 0.33): K.fenetre((x, 1.17, dz), 0.26, 0.28, d, 'metal|#4a525c', appui=False, croisillons=False)
    for dx, d in ((0.551, 1), (-0.551, 3)):
        K.fenetre((dx, 1.17, 0.0), 0.5, 0.28, d, 'metal|#4a525c', appui=False, croisillons=False)
    K.toit_deux_pans((0, 1.4, 0), 1.1, 0.9, 0.22, ARDOISE, debord=0.1, mat_pignon='peinture|#cfd8dc')
    K.fenetre((0.0, 0.42, 0.4), 0.2, 0.22, 0, SOCLE, volets='peinture|#2f5d7a')
    K.escalier((0.78, 0.06, 0.5), 0.3, 6, 0.13, 0.12, 'metal|#4a525c', 3)
    K.boite((0.3, 0.04, 0.3), (0.45, 0.88, 0.5), 'metal|#4a525c')
    K.garde_corps((0.62, 0.9, 0.65), (0.3, 0.9, 0.65), 0.2, 'metal|#4a525c')
    K.cylindre((1.0, 0.0, 0.5), 0.035, 1.7, ACIER, seg=10, r_haut=0.025)
    K.boite((0.18, 0.5, 0.1), (1.0, 1.55, 0.5), 'peinture|#17191c', biseau=0.008)
    for y in (1.73, 1.55, 1.37):
        K.cylindre((1.0, y - 0.04, 0.56), 0.05, 0.02, 'peinture|#0d0e10', seg=12)
    K.ancre('feu', (1.0, 1.73, 0.58)); K.ancre('feu_orange', (1.0, 1.55, 0.58)); K.ancre('feu_violet', (1.0, 1.37, 0.58))
    K.boite((0.28, 0.02, 0.2), (1.0, 0.01, 0.5), SOCLE)
    K.cylindre((-0.45, 1.5, -0.1), 0.012, 0.9, ACIER, seg=8); K.cylindre((-0.45, 2.1, -0.1), 0.07, 0.03, 'metal|#cfd2d6', seg=14, r_haut=0.1)
    for x in (-0.95, -0.75):
        K.boite((0.16, 0.34, 0.12), (x, 0.17, 0.62), 'peinture|#8fa0a8', biseau=0.008)
    return K

def studio(K):
    """Studio d'extracteurs PDF : halle de brique à toit en dents de scie vitrées, porte coulissante orange, cheminée, quai de chargement."""
    K.boite((3.1, 0.07, 2.2), (0, 0.035, 0.1), 'beton|#b1ada3', biseau=0.008)
    K.boite((2.5, 1.0, 1.25), (0, 0.07 + 0.5, -0.15), 'brique|#93503a', biseau=0.01)
    K.boite((2.56, 0.06, 1.3), (0, 1.1, -0.15), BETON)
    z0, z1 = -0.8, 0.5; w = 2.5 / 3
    for i in range(3):
        x0 = -1.25 + i * w
        K.prisme_z([(x0, 1.13), (x0 + w, 1.13), (x0 + w, 1.62)], z0 - 0.04, z1 + 0.04, 'tole|#7d8b97')
        K.boite((0.03, 0.46, 1.3), (x0 + w + 0.018, 1.38, -0.15), 'verre|#2c5068')
    K.boite((1.12, 0.72, 0.03), (0.0, 0.07 + 0.36, 0.48), 'peinture|#e9702c', biseau=0.006)
    K.boite((1.6, 0.04, 0.06), (0.0, 0.07 + 0.79, 0.5), ACIER)
    for x in (-0.5, -0.17, 0.17, 0.5): K.boite((0.012, 0.7, 0.012), (x, 0.07 + 0.36, 0.5), 'metal|#d9722a')
    for x in (-1.05, 1.05): K.fenetre((x, 0.55, 0.475), 0.4, 0.3, 0, 'metal|#4a525c', appui=False)
    for x in (-0.9, -0.3, 0.3, 0.9): K.fenetre((x, 0.55, -0.775), 0.3, 0.3, 2, 'metal|#4a525c', appui=False)
    for z in (-0.5, 0.1): K.fenetre((1.255, 0.55, z), 0.3, 0.3, 1, 'metal|#4a525c', appui=False)
    K.cylindre((-1.0, 1.1, -0.5), 0.1, 0.9, 'brique|#8a4a35', seg=12, r_haut=0.075); K.cylindre((-1.0, 2.0, -0.5), 0.09, 0.05, ACIER, seg=12)
    K.boite((0.9, 0.7, 0.8), (1.55, 0.07 + 0.35, 0.55), 'crepi|#e7e1d2', biseau=0.01)
    K.boite((1.0, 0.05, 0.9), (1.55, 0.8, 0.55), BETON)
    K.fenetre((1.55, 0.45, 0.955), 0.5, 0.26, 0, 'metal|#4a525c', appui=False)
    K.porte((1.9, 0.07, 0.955), 0.2, 0.42, 0, 'metal|#4a525c', marches=False)
    K.boite((1.3, 0.36, 0.05), (-0.1, 1.9, 0.0), 'peinture|#ffffff', biseau=0.008)
    for i, w2 in enumerate((0.22, 0.2, 0.22)):
        K.boite((w2, 0.2, 0.06), (-0.5 + i * 0.4, 1.9, 0.0), 'neon|#e63946')
    K.boite((0.04, 0.4, 0.04), (-0.65, 1.72, 0.0), ACIER); K.boite((0.04, 0.4, 0.04), (0.45, 1.72, 0.0), ACIER)
    for (x, z) in ((-1.05, 0.85), (-0.6, 0.9), (1.0, -1.0)):
        K.boite((0.36, 0.06, 0.36), (x, 0.1, z), BOIS)
        for k in range(3): K.boite((0.3, 0.07, 0.3), (x, 0.17 + k * 0.075, z), 'peinture|#f5f4ee', biseau=0.004)
        K.boite((0.31, 0.012, 0.31), (x, 0.4, z), 'peinture|#e63946')
    K.ancre('pdf', (0.32, 0.07, 1.0))
    K.lampadaire((1.0, 0.07, 0.95), 0.9)
    return K

BATIMENTS.update({'usp': usp, 'sncf': sncf, 'reseau': reseau, 'studio': studio})
