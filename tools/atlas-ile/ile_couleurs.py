"""Couleurs et occlusion ambiante cuites par sommet pour l'île (palette de la vidéo de référence : herbe vive, sable crème,
roche grise aux strates chaudes, mousse). Les matières sont décidées par la géologie (position dans les strates, pente,
exposition, humidité) et non par un simple dégradé : voir terrain-rules.md §22-24 de la compétence « vibe-terrain »."""
import math
import numpy as np
import scipy.ndimage as ndi
from ile_carte import *
from ile_champ import *
from ile_export import hex_vers_lineaire, lineaire_vers_srgb

def srgb(h):
    return hex_vers_lineaire(h)

def melange(a, b, k):
    return a + (b - a) * np.clip(k, 0, 1)[:, None]

def occlusion(F, g, P, N, dists=(0.12, 0.3, 0.6, 1.1, 1.9)):
    """AO par le champ : 1 - somme pondérée de (d - F(p + n d)) / d. 1 = ouvert, 0 = enfoui."""
    ao = np.zeros(len(P), np.float32); poids = (0.34, 0.26, 0.2, 0.12, 0.08)
    for d, w in zip(dists, poids):
        f = echantillonne(F, g, P + N * d)
        ao += w * np.clip((d - f) / d, 0, 1) * 0.5
    return np.clip(1 - ao * 1.15, 0.05, 1).astype(np.float32)

def distance_segments(x, z, segs):
    d = np.full(x.shape, 1e9, np.float32)
    for (a, b) in segs:
        ax, az = a; bx, bz = b; vx, vz = bx - ax, bz - az; L2 = vx * vx + vz * vz + 1e-9
        t = np.clip(((x - ax) * vx + (z - az) * vz) / L2, 0, 1)
        d = np.minimum(d, np.hypot(x - (ax + vx * t), z - (az + vz * t)))
    return d

# Chemins en terre battue entre les bâtiments (polylignes xz)
CHEMINS = [
    [(-5.3, -4.2), (-3.4, -3.3), (-1.3, -2.0), (1.4, -2.2), (3.0, -3.0), (3.6, -4.8)],      # dojo - atelier - tour
    [(-1.3, -2.0), (0.4, -0.6), (0.55, 0.4)],                                                # atelier - pont de l'îlot
    [(-7.3, -0.3), (-5.6, -1.6), (-3.4, -3.3)],                                              # Avignon - dojo
    [(-6.6, 3.6), (-7.0, 1.6), (-7.3, -0.3)],                                                # campus - Avignon
    [(1.4, -2.2), (4.0, -1.0), (5.2, 0.3), (6.9, 1.9)],                                      # atelier - gare
    [(7.3, 3.2), (7.2, 4.8), (6.9, 6.4)],                                                    # gare - poste
    [(6.9, 6.4), (6.4, 5.8), (5.9, 5.5)],                                                    # poste - ponton
]
SEGS = [(c[i], c[i + 1]) for c in CHEMINS for i in range(len(c) - 1)]

def peindre(g, F, ctx, P, N):
    """Renvoie (couleur uint8 (n,4) : rgb linéaire + AO, masque de matière pour l'export)."""
    n = len(P); x, y, z = P[:, 0], P[:, 1], P[:, 2]
    ao = occlusion(F, g, P, N)
    H = ctx['H'][:, 0, :]
    ix = (x - g.o[0]) / g.res; iz = (z - g.o[2]) / g.res
    Hv = ndi.map_coordinates(H, [ix, iz], order=1, mode='nearest')
    Fo = echantillonne(ctx['F_out'], g, P)                     # >0 : hors du cœur rocheux (lèvre de terre)
    Fs = echantillonne(ctx['F_sol'], g, P)
    w3 = ctx['w3']
    # bruits d'albédo : on relit w3 à plusieurs échelles par des permutations d'axes (grain variable sans calcul de plus)
    def b(sx, sy, sz, ox=0.0, oy=0.0, oz=0.0):
        return echantillonne(w3, g, np.stack([ox + x * sx, oy + y * sy, oz + z * sz], 1))
    n_grain = b(1.0, 1.0, 1.0)
    n_fin = b(2.3, 2.3, 2.3, 3.1, 4.2, 1.7)
    n_vert = b(1.4, 0.22, 1.4, -2.0, 1.0, 5.0)                 # étirement vertical : coulures
    n_moss = b(1.8, 1.8, 1.8, 7.0, -3.0, 2.0)

    ys, A, Bt = ctx['strate']
    # position de la strate : même déformation que dans le champ
    couche = np.interp(y + 0.55 * echantillonne(w3, g, P), ys, A)
    teinte = np.interp(y + 0.55 * echantillonne(w3, g, P), ys, Bt)

    # ---------------- roche : palette de calcaire chaud + gris froids, couches dures plus claires
    gris_chaud = srgb('#b9ac98'); gris = srgb('#a09d98'); gris_fonce = srgb('#77736f'); ocre = srgb('#c39a6a'); brun = srgb('#7a6450')
    roche = melange(np.tile(gris, (n, 1)), np.tile(gris_chaud, (n, 1)), (teinte * 1.2 + (couche + 1) * 0.25))
    roche = melange(roche, np.tile(ocre, (n, 1)), np.clip(n_vert * 0.35 + (teinte - 0.65) * 1.6, 0, 0.75))        # coulures ocre
    roche = melange(roche, np.tile(gris_fonce, (n, 1)), np.clip(0.22 - couche * 0.2 + n_fin * 0.1, 0, 0.55))
    roche *= (0.9 + 0.1 * n_fin)[:, None]

    # ---------------- terre de la lèvre
    terre_sombre = srgb('#5d4332'); terre = srgb('#7d5c42')
    sol = melange(np.tile(terre_sombre, (n, 1)), np.tile(terre, (n, 1)), 0.5 + 0.5 * n_fin)

    # ---------------- dessus : herbe, sable, chemin, fond du lagon
    d_chem = distance_segments(x, z, SEGS)
    fl = forme_lagon(x, z)
    herbe_a = srgb('#689c3a'); herbe_b = srgb('#9ac24e'); herbe_c = srgb('#43803a'); herbe_sec = srgb('#c0c56c')
    herbe = melange(np.tile(herbe_a, (n, 1)), np.tile(herbe_b, (n, 1)), 0.5 + 0.55 * b(.55, .55, .55, 1.0, 2.0, 3.0))
    herbe = melange(herbe, np.tile(herbe_c, (n, 1)), np.clip(0.45 - 0.5 * n_grain - 0.3 * Hv, 0, 0.8))
    herbe = melange(herbe, np.tile(herbe_sec, (n, 1)), np.clip(n_moss * 0.35 - 0.1, 0, 0.35))
    sable_c = srgb('#f1e0b6'); sable_o = srgb('#dcc590'); sable_h = srgb('#b9a577')
    sable = melange(np.tile(sable_c, (n, 1)), np.tile(sable_o, (n, 1)), 0.45 + 0.4 * n_fin)
    sable = melange(sable, np.tile(sable_h, (n, 1)), lisse(0.05, -0.2, Hv))                                      # sable mouillé
    # ligne de sable autour du lagon et du bord ; chemin en terre battue claire
    est_sable = lisse(1.6, 0.25, fl) * (Hv < 0.5)
    est_sable = np.maximum(est_sable, lisse(0.12, -0.05, Hv))
    d_bord = -dist_emprise(x, z)
    chemin = lisse(0.5, 0.2, d_chem + 0.1 * n_fin)
    dessus = melange(herbe, sable, est_sable)
    terre_chemin = srgb('#cfb98c')
    dessus = melange(dessus, np.tile(terre_chemin, (n, 1)), chemin * (1 - est_sable * 0.5) * 0.9)
    # fond du lagon : sable plus sombre en profondeur
    dessus = melange(dessus, np.tile(srgb('#b2c4a8'), (n, 1)), lisse(-0.3, -1.0, Hv) * 0.8 * (fl < 0))

    # ---------------- mousse sur les replats de la roche et dans les creux
    mousse = srgb('#5d9137'); mousse2 = srgb('#789e45')
    face_haut = lisse(0.45, 0.85, N[:, 1])
    m = face_haut * lisse(-0.15, 0.4, n_moss) * lisse(-1.0, -0.3, y * 0 - 1.0)
    m = np.clip(m * (0.6 + 0.6 * (1 - ao)) + 0.35 * face_haut * (1 - ao), 0, 1)
    roche = melange(roche, melange(np.tile(mousse, (n, 1)), np.tile(mousse2, (n, 1)), 0.5 + 0.5 * n_fin), m * (y < -0.9))

    # ---------------- sélection de la matière
    k_top = lisse(0.4, 0.62, N[:, 1]) * lisse(Hv - 0.9, Hv - 0.25, y)
    en_sol = (Fs < 0.07) & (Fo > 0.04) & (y > -2.2)                    # la lèvre de terre : dans la couche meuble, hors du cœur rocheux
    col = roche.copy()
    col = melange(col, sol, np.where(en_sol, 1.0, 0.0))
    # l'herbe déborde sur le haut de la lèvre, comme un tapis
    k_dessus = np.where((Fo > -0.25) | (y > Hv - 0.6), k_top, 0.0) * np.where(y > -1.0, 1.0, 0.0)
    col = melange(col, dessus, k_dessus)
    # identifiant de matière (lu par le shader pour doser le grain et le bosselage) : 0 roche, 1 terre, 2 sable, 3 herbe, 4 chemin, 5 fond du lagon, 6 mousse
    ids = np.zeros(n, np.uint8)
    ids[en_sol] = 1
    dessus_id = np.where(chemin > 0.5, 4, np.where(est_sable > 0.5, 2, 3)).astype(np.uint8)
    dessus_id = np.where((fl < 0) & (Hv < -0.3), 5, dessus_id).astype(np.uint8)
    ids = np.where(k_dessus > 0.5, dessus_id, ids).astype(np.uint8)
    ids = np.where((ids == 0) & (m > 0.5), 6, ids).astype(np.uint8)
    # ---------------- assombrissement par l'AO (léger : l'AO est aussi passée au shader)
    col *= (0.88 + 0.12 * ao)[:, None]
    out = np.zeros((n, 4), np.uint8)
    out[:, :3] = np.clip(lineaire_vers_srgb(np.clip(col, 0, 1)) * 255 + 0.5, 0, 255).astype(np.uint8)
    out[:, 3] = np.clip(ao * 255, 0, 255).astype(np.uint8)
    return out, ids
