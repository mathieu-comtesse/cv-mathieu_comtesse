"""Rochers et fragments flottants de l'île : mêmes outils que l'île (champ de distance, plans de Voronoï, surface nets), à plus petite échelle.

    python tools/atlas-ile/ile_petits.py          ->  assets/atlas/rochers.bin  (dix rochers « r0..r9 » d'environ 1 m de large, quatre fragments « f0..f3 »)

Rochers : ellipsoïde taillé par des plans (arêtes vives), facettes de Voronoï, grain ; mousse posée sur les faces qui regardent le ciel, AO cuite.
Fragments : un petit morceau d'île, dessus d'herbe, lèvre de terre, dessous de roche conique à strates et stalactites."""
import os, sys, math
import numpy as np
from ile_champ import *
from ile_export import ecrire, hex_vers_lineaire, lineaire_vers_srgb
from ile_build import orienter, compacter, RACINE, SORTIE
import ile_couleurs as COL

def melanger(a, b, k):
    return a + (b - a) * np.clip(k, 0, 1)[:, None]

def maille(g, F, cible):
    import fast_simplification as fs
    P, T = surface_nets(F, g.o, g.res)
    P = projeter(F, g, P, iters=2)
    G = gradient(F, g, P, g.res * 0.9); N = G / np.maximum(np.linalg.norm(G, axis=1, keepdims=True), 1e-9)
    T, _ = orienter(P, T, N); P, T = compacter(P, T)
    if len(T) > cible:
        P2, T2 = fs.simplify(P.astype(np.float64), T.astype(np.int64), target_reduction=1 - cible / len(T), agg=5)
        P, T = P2.astype(np.float32), T2.astype(np.int32); P = projeter(F, g, P, iters=1)
        G = gradient(F, g, P, g.res * 0.9); N = G / np.maximum(np.linalg.norm(G, axis=1, keepdims=True), 1e-9)
        T, _ = orienter(P, T, N); P, T = compacter(P, T)
    G = gradient(F, g, P, g.res * 0.9); N = (G / np.maximum(np.linalg.norm(G, axis=1, keepdims=True), 1e-9)).astype(np.float32)
    return P, N, T

def rocher(graine, taille=1.0):
    rng = np.random.default_rng(graine)
    R = 0.62 * taille
    g = Grille(((-R * 1.35, R * 1.35), (-R * 1.0, R * 1.2), (-R * 1.35, R * 1.35)), 0.034)
    rx, ry, rz = R * rng.uniform(0.85, 1.15), R * rng.uniform(0.55, 0.85), R * rng.uniform(0.8, 1.15)
    F = ellipsoide(g, (0, 0, 0), (rx, ry, rz), rng.uniform(0, 6.3)).astype(np.float32)
    for _ in range(int(rng.integers(6, 10))):                                    # plans de taille : le rocher est un polyèdre usé
        n = rng.normal(size=3); n[1] = abs(n[1]) * rng.choice([-1, 1]) * 0.8; n /= np.linalg.norm(n)
        F = smax(F, g.x * n[0] + g.y * n[1] + g.z * n[2] - rng.uniform(0.5, 0.9) * R, 0.03)
    F = F + 0.045 * bruit(g, 0.5, 0.5, graine + 1) + 0.02 * bruit(g, 0.22, 0.5, graine + 2)
    F = np.where(g.y < -R * 0.45, np.maximum(F, 0.0 * F + (-g.y - R * 0.45) * 0.5), F).astype(np.float32)   # le dessous est aplati : le rocher est posé
    F = facettes(g, F, 1.0, R * 1.1, 14.0, 0.7, graine + 3, bande=0.5)
    P, N, T = maille(g, F, 700)
    ao = COL.occlusion(F, g, P, N, dists=(0.04, 0.1, 0.2, 0.4, 0.7))
    # couleurs : gris chauds, strates horizontales, mousse sur le dessus
    n1 = echantillonne(bruit(g, 0.6, 0.5, graine + 9), g, P); n2 = echantillonne(bruit(g, 1.3, 0.5, graine + 10), g, P)
    base = np.array([hex_vers_lineaire(h) for h in ('#9a948a', '#aaa294', '#80796f', '#b4a68d')])
    k = np.clip(0.5 + 0.35 * n1 + 0.2 * np.sin(P[:, 1] * 9 + n2 * 2), 0, 0.999) * 3
    i0 = np.floor(k).astype(int); f = (k - i0)
    col = base[i0] * (1 - f)[:, None] + base[np.minimum(i0 + 1, 3)] * f[:, None]
    moss = np.clip((N[:, 1] - 0.55) * 3.0, 0, 1) * np.clip(0.5 + 0.9 * n2, 0, 1)
    col = melanger(col, np.tile(hex_vers_lineaire('#68943e'), (len(P), 1)), moss * 0.85)
    col *= (0.8 + 0.2 * ao)[:, None]
    C = np.zeros((len(P), 4), np.uint8); C[:, :3] = np.clip(lineaire_vers_srgb(np.clip(col, 0, 1)) * 255 + 0.5, 0, 255).astype(np.uint8); C[:, 3] = np.clip(ao * 255, 0, 255).astype(np.uint8)
    M = np.where(moss > 0.5, 6, 0).astype(np.uint8)
    # le rocher est posé : la base est ramenée à y = 0
    P[:, 1] -= P[:, 1].min() - 0.0
    return dict(P=P, N=N, C=C, T=T, M=M)

def fragment(graine):
    """Petit morceau d'île : disque d'herbe bombé, lèvre de terre, dessous de roche conique à strates et stalactites."""
    rng = np.random.default_rng(graine)
    Rf = rng.uniform(1.3, 2.1); prof = Rf * rng.uniform(1.0, 1.5)
    g = Grille(((-Rf * 1.4, Rf * 1.4), (-prof * 1.05, 0.7), (-Rf * 1.4, Rf * 1.4)), 0.05)
    th = np.arctan2(g.z, g.x); r = np.hypot(g.x, g.z)
    R = Rf * (1 + 0.14 * np.sin(2 * th + graine) + 0.1 * np.sin(3 * th + 2.0 * graine) + 0.05 * np.sin(5 * th))
    t = np.clip(-g.y / prof, 0, 1); s = (1 - t ** 1.5) ** 0.9 * 0.97 + 0.03
    ys, A, B = ((np.arange(-12, 1, 0.02), None, None))
    strate = 0.5 * np.sin(g.y * 7 + 1.7 * np.sin(g.x * 1.3 + graine) + g.z * 0.8) * lisse(0, 0.2, t)
    F = (r - R * s) * 0.9 - 0.06 * strate
    F = smin(F, capsule_conique(g, (0.2 * Rf, -0.2 * prof, 0), (0.1 * Rf, -prof * 1.02, 0.1 * Rf), 0.5 * Rf, 0.05), 0.4)
    for _ in range(4):                                                           # stalactites
        a = rng.uniform(0, 6.3); d = rng.uniform(0.3, 0.7) * Rf; yt = -rng.uniform(0.2, 0.55) * prof; ln = rng.uniform(0.3, 0.7) * prof
        F = smin(F, capsule_conique(g, (d * math.cos(a), yt, d * math.sin(a)), (d * math.cos(a) * 0.9, yt - ln, d * math.sin(a) * 0.9), 0.2 * Rf, 0.03), 0.18)
    haut = 0.22 * (1 - (r / (Rf * 1.1)) ** 2) + 0.03 * bruit2d(g, 0.9, 0.5, graine + 4)
    F = smax(F, g.y - haut.astype(np.float32), 0.08)
    F = F + lisse(-0.2, -0.9, g.y) * (0.1 * bruit(g, 0.5, 0.5, graine + 5))
    F = facettes(g, F.astype(np.float32), lisse(-0.3, -0.8, g.y), 0.5, 15.0, 0.7, graine + 6, bande=0.5)
    P, N, T = maille(g, F.astype(np.float32), 2600)
    ao = COL.occlusion(F.astype(np.float32), g, P, N, dists=(0.05, 0.12, 0.25, 0.5, 0.9))
    n1 = echantillonne(bruit(g, 0.6, 0.5, graine + 11), g, P)
    top = np.clip((N[:, 1] - 0.35) * 3.0, 0, 1) * lisse(-0.35, -0.05, P[:, 1])
    herbe = melanger(np.tile(hex_vers_lineaire('#689c3a'), (len(P), 1)), np.tile(hex_vers_lineaire('#9ac24e'), (len(P), 1)), 0.5 + 0.6 * n1)
    roche = melanger(np.tile(hex_vers_lineaire('#9a948a'), (len(P), 1)), np.tile(hex_vers_lineaire('#b4a68d'), (len(P), 1)), 0.5 + 0.5 * np.sin(P[:, 1] * 9 + n1 * 2))
    terre = np.tile(hex_vers_lineaire('#6f5039'), (len(P), 1))
    ex_sol = lisse(-0.45, -0.12, P[:, 1]) * (1 - top)
    col = melanger(roche, terre, ex_sol); col = melanger(col, herbe, top)
    col *= (0.82 + 0.18 * ao)[:, None]
    C = np.zeros((len(P), 4), np.uint8); C[:, :3] = np.clip(lineaire_vers_srgb(np.clip(col, 0, 1)) * 255 + 0.5, 0, 255).astype(np.uint8); C[:, 3] = np.clip(ao * 255, 0, 255).astype(np.uint8)
    M = np.where(top > 0.5, 3, np.where(ex_sol > 0.5, 1, 0)).astype(np.uint8)
    return dict(P=P, N=N, C=C, T=T, M=M, extra=dict(rayon=float(Rf), prof=float(prof)))

def main():
    os.makedirs(SORTIE, exist_ok=True); pieces = []
    for i in range(10):
        r = rocher(100 + i * 17, taille=[0.6, 0.8, 1.0, 1.3, 0.7, 0.9, 1.1, 1.6, 0.5, 1.0][i]); r['nom'] = f'r{i}'; pieces.append(r); print('rocher', i, len(r['P']), 'sommets', len(r['T']), 'triangles', flush=True)
    for i in range(4):
        f = fragment(500 + i * 31); f['nom'] = f'f{i}'; pieces.append(f); print('fragment', i, len(f['P']), 'sommets', len(f['T']), 'triangles', flush=True)
    n = ecrire(os.path.join(SORTIE, 'rochers.bin'), pieces); print('écrit rochers.bin', n, 'octets')

if __name__ == '__main__':
    main()
