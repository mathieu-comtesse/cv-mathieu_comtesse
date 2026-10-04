"""Les bâtiments de l'atlas, un par étape du parcours. Repère local : y haut, façade +z, origine au sol au centre de l'emprise.
Chaque fonction reçoit un Kit et le remplit ; les matériaux sont des noms « type|#couleur » interprétés par atlas-batiments.js."""
import math
from blender_kit import Kit

PI = math.pi
PIERRE = 'pierre|#e7dbc0'; PIERRE_CLAIRE = 'pierre|#f2ead6'; SOCLE = 'pierre|#bdb29c'
TUILE = 'tuile|#c8693d'; BRIQUE = 'brique|#a85b3e'; BOIS = 'bois|#6b4a2e'; VOLET = 'peinture|#7f98ad'; CUIVRE = 'cuivre|#6cb59d'
VERRE = 'verre|#1b2f3f'; FENETRE = 'fenetre|#ffd27a'

def avignon(K):
    """Hôtel-Dieu d'Avignon : long corps de calcaire clair, pavillon central à fronton, deux pavillons d'angle en croupe, clocheton."""
    K.boite((3.6, 0.1, 1.9), (0, 0.05, 0.1), SOCLE, biseau=0.015)
    # corps principal
    K.boite((3.2, 1.05, 1.3), (0, 0.1 + 0.525, 0), PIERRE, biseau=0.012)
    K.boite((3.34, 0.07, 1.44), (0, 1.17, 0), PIERRE_CLAIRE, biseau=0.01)                           # corniche
    K.boite((3.3, 0.04, 1.4), (0, 0.15, 0), PIERRE_CLAIRE)                                          # bandeau bas
    K.toit_quatre_pans((0, 1.2, 0), 3.34, 1.44, 0.52, TUILE, debord=0.05, faite=1.9)
    # pavillon central
    K.boite((1.12, 1.32, 0.62), (0, 0.1 + 0.66, 0.65 + 0.31 - 0.2), PIERRE, biseau=0.012)
    K.boite((1.26, 0.07, 0.74), (0, 1.43, 0.65 + 0.37 - 0.2), PIERRE_CLAIRE, biseau=0.01)
    K.toit_deux_pans((0, 1.46, 0.72), 0.8, 1.26, 0.44, TUILE, debord=0.04, rot=PI / 2, mat_pignon=PIERRE_CLAIRE)
    for s in (-1, 1):                                                                              # pilastres d'angle
        K.boite((0.09, 1.3, 0.08), (s * 0.5, 0.1 + 0.65, 1.12), PIERRE_CLAIRE, biseau=0.008)
    K.porte((0, 0.1, 1.145), 0.42, 0.74, 0, PIERRE_CLAIRE)
    K.cylindre_couche((0, 0.1 + 0.74 + 0.08, 1.148), 0.255, 0.01, 'bois|#5a3e27', 0.0, demi=True)
    K.fenetre((0, 1.12, 1.145), 0.22, 0.22, 0, PIERRE_CLAIRE, arc=False, croisillons=True)           # œil-de-bœuf rectangulaire du fronton
    # pavillons d'angle
    for s in (-1, 1):
        K.boite((0.82, 1.3, 1.02), (s * 1.45, 0.1 + 0.65, 0.1), PIERRE, biseau=0.012)
        K.boite((0.94, 0.07, 1.14), (s * 1.45, 1.43, 0.1), PIERRE_CLAIRE, biseau=0.01)
        K.toit_quatre_pans((s * 1.45, 1.46, 0.1), 0.94, 1.14, 0.46, TUILE, debord=0.05, faite=0.25)
        for yy, volets in ((0.45, None), (0.92, VOLET)):
            K.fenetre((s * 1.45, yy, 0.61), 0.22, 0.32, 0, PIERRE_CLAIRE, volets=volets, arc=(yy < 0.6))
        K.fenetre((s * 1.86, 0.45, 0.1), 0.22, 0.32, 1 if s > 0 else 3, PIERRE_CLAIRE, arc=True)
        K.fenetre((s * 1.86, 0.92, 0.1), 0.22, 0.32, 1 if s > 0 else 3, PIERRE_CLAIRE, volets=VOLET)
    # fenêtres du corps : deux travées de chaque côté du pavillon, deux niveaux
    for x in (-1.0, 1.0):
        K.fenetre((x, 0.45, 0.65), 0.22, 0.34, 0, PIERRE_CLAIRE, arc=True)
        K.fenetre((x, 0.9, 0.65), 0.22, 0.32, 0, PIERRE_CLAIRE, volets=VOLET)
    for x in (-1.0, -0.5, 0.0, 0.5, 1.0):
        K.fenetre((x, 0.45, -0.65), 0.22, 0.34, 2, PIERRE_CLAIRE, arc=True)
        K.fenetre((x, 0.9, -0.65), 0.22, 0.32, 2, PIERRE_CLAIRE, volets=VOLET)
    # cheminées
    for x in (-0.85, 0.95):
        K.boite((0.15, 0.38, 0.15), (x, 1.58, -0.2), BRIQUE, biseau=0.008); K.boite((0.19, 0.04, 0.19), (x, 1.78, -0.2), PIERRE_CLAIRE)
    # clocheton sur le faîtage
    K.boite((0.5, 0.18, 0.5), (0, 1.71, 0), PIERRE_CLAIRE, biseau=0.01)
    K.boite((0.38, 0.5, 0.38), (0, 2.05, 0), PIERRE, biseau=0.01)
    for d in range(4):                                                                              # baies cintrées de la cloche
        K.fenetre(((0.19 * math.sin(d * PI / 2)), 2.08, (0.19 * math.cos(d * PI / 2))), 0.16, 0.26, d, PIERRE_CLAIRE, arc=True, appui=False, croisillons=False, mat_verre='verre|#0d1a24')
    K.boite((0.46, 0.05, 0.46), (0, 2.33, 0), PIERRE_CLAIRE, biseau=0.01)
    K.toit_pyramide((0, 2.35, 0), 0.46, 0.46, 0.38, CUIVRE, debord=0.03)
    K.cylindre((0, 2.72, 0), 0.012, 0.12, 'metal|#d9c27a', seg=8)
    K.ancre('cloche', (0, 2.0, 0.27))
    # perron : deux vasques et des buis taillés
    for s in (-1, 1):
        K.cylindre((s * 0.78, 0.1, 1.35), 0.12, 0.2, SOCLE, seg=14, r_haut=0.14)
    K.boite((1.9, 0.06, 0.5), (0, 0.13, 1.45), SOCLE, biseau=0.01)
    return K

BATIMENTS = {'avignon': avignon}
