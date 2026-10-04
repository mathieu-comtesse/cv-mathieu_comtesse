"""Chaîne de fabrication de l'île : champ -> maillage -> allègement -> couleurs / AO -> assets/atlas/ile.bin + ile-carte.

    python tools/atlas-ile/ile_build.py [--res 0.1] [--tri 330000] [--sortie assets/atlas] [--essai]

Sorties (dans assets/atlas/) :
  ile.bin         maillage de l'île (format « MAILLE1 », voir ile_export.py)
  ile-carte.bin   hauteur de la surface (float16) et masque d'eau (uint8) sur la grille de la carte ; ile-carte.json : méta,
                  seuils des chutes d'eau, points du bord (pour les racines pendantes, les lianes et la brume)
--essai écrit ile-essai.bin (aperçu) au lieu de ile.bin."""
import sys, os, time, json
import numpy as np
import scipy.ndimage as ndi
from ile_carte import *
from ile_champ import *
import ile as ILE
from ile_export import ecrire
import ile_couleurs as COL

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SORTIE = os.path.join(RACINE, 'assets', 'atlas')

def orienter(P, T, N):
    """Oriente les triangles dans le sens du gradient (normale vers l'extérieur) ; retire les dégénérés."""
    a, b, c = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
    ng = np.cross(b - a, c - a); nv = N[T[:, 0]] + N[T[:, 1]] + N[T[:, 2]]
    flip = (ng * nv).sum(1) < 0
    T = T.copy(); T[flip] = T[flip][:, ::-1]
    aire = np.linalg.norm(ng, axis=1) / 2
    return T[aire > 1e-8], int(flip.sum())

def compacter(P, T):
    used = np.zeros(len(P), bool); used[T.ravel()] = True
    remap = -np.ones(len(P), np.int64); remap[used] = np.arange(used.sum())
    return P[used], remap[T].astype(np.int32)

def maille(g, F, cible, log):
    P, T = surface_nets(F, g.o, g.res)
    log(f'surface nets : {len(P)} sommets, {len(T)} triangles')
    P = projeter(F, g, P, iters=2)
    G = gradient(F, g, P, g.res * 0.9); N = G / np.maximum(np.linalg.norm(G, axis=1, keepdims=True), 1e-9)
    T, nf = orienter(P, T, N); P, T = compacter(P, T)
    log(f'{nf} triangles retournés')
    if cible and len(T) > cible:
        import fast_simplification as fs
        P2, T2 = fs.simplify(P.astype(np.float64), T.astype(np.int64), target_reduction=1 - cible / len(T), agg=6)
        P, T = P2.astype(np.float32), T2.astype(np.int32)
        P = projeter(F, g, P, iters=1)
        G = gradient(F, g, P, g.res * 0.9); N = G / np.maximum(np.linalg.norm(G, axis=1, keepdims=True), 1e-9)
        T, nf = orienter(P, T, N); P, T = compacter(P, T)
        log(f'allègement : {len(T)} triangles, {len(P)} sommets')
    G = gradient(F, g, P, g.res * 0.9); N = (G / np.maximum(np.linalg.norm(G, axis=1, keepdims=True), 1e-9)).astype(np.float32)
    return P, N, T

def verifier(P, N, T, log):
    """Contrôles de la compétence terrain : valeurs finies, indices valides, bords ouverts, composantes connexes."""
    assert np.isfinite(P).all() and np.isfinite(N).all(), 'sommets non finis'
    assert T.min() >= 0 and T.max() < len(P), 'indices hors bornes'
    e = np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), axis=1)
    _, cnt = np.unique(e[:, 0].astype(np.int64) * len(P) + e[:, 1], return_counts=True)
    ouvertes = int((cnt == 1).sum()); non_var = int((cnt > 2).sum())
    log(f'contrôle : {ouvertes} arêtes ouvertes, {non_var} arêtes non variétés (sur {len(cnt)})')
    import scipy.sparse as sp, scipy.sparse.csgraph as cg
    A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(len(P), len(P)))
    n, lab = cg.connected_components(A, directed=False)
    tailles = np.bincount(lab); log(f'composantes : {n} (plus grande {tailles.max()} sommets, {int((tailles < 60).sum())} miettes de moins de 60 sommets)')
    return lab, tailles

def carte(g, F, ctx, log, sortie):
    """Hauteur de la surface et masque d'eau sur la grille de la carte (x, z) : sert au jeu pour poser les objets et colorer l'eau."""
    nx, ny, nz = g.n
    plein = F < 0
    haut = np.where(plein.any(1), ny - 1 - np.argmax(plein[:, ::-1, :], axis=1), -1)
    ix, iz = np.meshgrid(np.arange(nx), np.arange(nz), indexing='ij')
    yb = np.clip(haut, 0, ny - 2)
    f0 = F[ix, yb, iz]; f1 = F[ix, yb + 1, iz]
    t = np.clip(f0 / np.where(np.abs(f0 - f1) < 1e-6, 1e-6, f0 - f1), 0, 1)
    H = g.o[1] + (yb + t) * g.res
    H = np.where(haut < 0, -50.0, H).astype(np.float32)
    # le dessus de l'île seulement : on ignore les colonnes dont le plein le plus haut est la pointe isolée sous 3 m
    H = np.where(H < -3.0, -50.0, H)
    sol = H > -20
    XX = g.o[0] + ix * g.res; ZZ = g.o[2] + iz * g.res
    dedans = dist_emprise(XX, ZZ) < -0.12                               # à l'intérieur de l'emprise : exclut les sommets de roche sous le surplomb
    eau = (H < -0.02) & (H > -1.5) & dedans
    lab, n = ndi.label(eau)
    c = (int((LAGON['c'][0] - 2.8 - g.o[0]) / g.res), int((LAGON['c'][1] + 0.3 - g.o[2]) / g.res))     # une cellule du lagon hors de l'îlot
    lag = lab == lab[c[0], c[1]]
    log(f'carte : {sol.sum()} colonnes de terre, {lag.sum()} cellules de lagon')
    # chutes d'eau : cellules du lagon voisines du bord de l'emprise (seuil des chenaux)
    bord = lag & ndi.binary_dilation(~dedans, iterations=3)
    lb, nb = ndi.label(ndi.binary_dilation(bord, iterations=4) & lag)
    chutes = []
    for k in range(1, nb + 1):
        cells = np.argwhere((lb == k) & bord)
        if len(cells) < 3: continue
        xs = cells[:, 0] * g.res + g.o[0]; zs = cells[:, 1] * g.res + g.o[2]; hs = H[cells[:, 0], cells[:, 1]]
        cx, cz, cy = float(xs.mean()), float(zs.mean()), float(hs.mean())
        a = math.atan2((cz - CENTRE[1]) / ETIRE[1], (cx - CENTRE[0]) / ETIRE[0])
        dx, dz = math.cos(a), math.sin(a)                                 # sortie vers l'extérieur de l'emprise
        largeur = float(np.hypot(xs.max() - xs.min(), zs.max() - zs.min()))
        chutes.append(dict(x=round(cx, 3), z=round(cz, 3), y=round(cy, 3), dx=round(dx, 4), dz=round(dz, 4), largeur=round(largeur, 3), n=int(len(cells))))
    log(f'chutes détectées : {[(c["x"], c["z"], c["largeur"]) for c in chutes]}')
    # bord : pour chaque azimut, dernière cellule de terre avant le vide
    bordpts = []
    for k in range(120):
        a = k / 120 * 2 * math.pi; dx, dz = math.cos(a), math.sin(a); r = 4.0
        while r < 16:
            xi = int((CENTRE[0] + dx * r - g.o[0]) / g.res); zi = int((CENTRE[1] + dz * r - g.o[2]) / g.res)
            if not (0 <= xi < nx and 0 <= zi < nz) or not sol[xi, zi]: break
            r += 0.05
        r -= 0.2
        xi = int((CENTRE[0] + dx * r - g.o[0]) / g.res); zi = int((CENTRE[1] + dz * r - g.o[2]) / g.res)
        bordpts.append([round(CENTRE[0] + dx * r, 3), round(float(H[xi, zi]), 3), round(CENTRE[1] + dz * r, 3), round(dx, 4), round(dz, 4)])
    meta = dict(x0=float(g.o[0]), z0=float(g.o[2]), res=g.res, nx=nx, nz=nz, chutes=chutes, bord=bordpts,
                batiments={k: dict(pos=list(v['pos']), r=v['r']) for k, v in BATIMENTS.items()},
                pont=PONT, ponton=PONTON, voie=VOIE, colline=COLLINE, plateau=PLATEAU, lagon=LAGON, ilot=ILOT, chemins=COL.CHEMINS)
    with open(os.path.join(sortie, 'ile-carte.bin'), 'wb') as f:
        f.write(H.astype(np.float16).tobytes()); f.write((lag.astype(np.uint8) * 255 + np.where(sol & ~lag, 0, 0)).astype(np.uint8).tobytes())
    with open(os.path.join(sortie, 'ile-carte.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))
    return H, lag

def main():
    args = sys.argv[1:]
    opt = lambda n, d: args[args.index(n) + 1] if n in args else d
    res = float(opt('--res', 0.1)); cible = int(opt('--tri', 330000)); sortie = opt('--sortie', SORTIE)
    log = ILE.horloge()
    g, F, ctx = ILE.champ(res=res, log=log)
    P, N, T = maille(g, F, cible, log)
    lab, tailles = verifier(P, N, T, log)
    gros = tailles[lab[T[:, 0]]] >= 400                                  # retire les miettes de roche flottantes
    if not gros.all():
        T = T[gros]
        utilises = np.unique(T); remap = -np.ones(len(P), np.int64); remap[utilises] = np.arange(len(utilises))
        P, N, T = P[utilises], N[utilises], remap[T].astype(np.int32)
        log(f'{int((~gros).sum())} triangles de miettes retirés')
    os.makedirs(sortie, exist_ok=True)
    col, ids = COL.peindre(g, F, ctx, P, N)
    log('couleurs et AO')
    nom = 'ile-essai.bin' if '--essai' in args else 'ile.bin'
    n = ecrire(os.path.join(sortie, nom), [dict(nom='ile', P=P, N=N, C=col, T=T, M=ids)])
    log(f'écrit {nom} ({n / 1e6:.2f} Mo, {len(T)} triangles)')
    carte(g, F, ctx, log, sortie)
    log('carte écrite')

if __name__ == '__main__':
    main()
