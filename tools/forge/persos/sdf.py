"""Modélisation par champs de distance signée (SDF) : primitives, fusions douces, extraction de surface (« surface nets »),
   lissage et projection. Tout en numpy, sans dépendance : les personnages du Village Talas sont construits ainsi, autour du
   squelette Quaternius, puis pesés (skinning) par des fonctions analytiques (voir persos.py)."""
import numpy as np

# ----------------------------------------------------------------------------------------------- primitives
def _len(v): return np.sqrt(np.sum(v * v, axis=-1))

def sphere(P, c, r): return _len(P - np.asarray(c)) - r

def ellipsoid(P, c, radii, R=None):
    """Ellipsoïde (borne de distance améliorée d'Inigo Quilez). R : matrice 3x3 dont les colonnes sont les axes locaux."""
    q = P - np.asarray(c)
    if R is not None: q = q @ np.asarray(R)
    r = np.asarray(radii, float)
    k0 = _len(q / r); k1 = _len(q / (r * r))
    return np.where(k1 > 1e-9, k0 * (k0 - 1.0) / np.maximum(k1, 1e-9), -np.min(r))

def capsule(P, a, b, ra, rb=None):
    """Capsule conique (rayon linéaire de a à b)."""
    a = np.asarray(a, float); b = np.asarray(b, float); rb = ra if rb is None else rb
    pa = P - a; ba = b - a
    h = np.clip(np.sum(pa * ba, axis=-1) / max(np.dot(ba, ba), 1e-12), 0.0, 1.0)
    return _len(pa - h[..., None] * ba) - (ra + (rb - ra) * h)

def box(P, c, half, rnd=0.0, R=None):
    q = P - np.asarray(c)
    if R is not None: q = q @ np.asarray(R)
    d = np.abs(q) - (np.asarray(half, float) - rnd)
    return _len(np.maximum(d, 0.0)) + np.minimum(np.max(d, axis=-1), 0.0) - rnd

def plane(P, n, d0):
    """Demi-espace : négatif du côté opposé à n (n unitaire), distance signée à un plan passant par d0 le long de n."""
    n = np.asarray(n, float); n = n / np.linalg.norm(n)
    return np.sum(P * n, axis=-1) - d0

def torus(P, c, R0, r, axis=1):
    q = P - np.asarray(c)
    ax = np.zeros(3); ax[axis] = 1
    h = np.sum(q * ax, axis=-1); rad = _len(q - h[..., None] * ax)
    return np.sqrt((rad - R0) ** 2 + h * h) - r

# ----------------------------------------------------------------------------------------------- opérations
def smin(a, b, k):
    if k <= 0: return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)

def smax(a, b, k): return -smin(-a, -b, k)

def union(*ds, k=0.0):
    r = ds[0]
    for d in ds[1:]: r = smin(r, d, k)
    return r

def inter(a, b, k=0.0): return smax(a, b, k)

def sub(a, b, k=0.0): return smax(a, -b, k)

def offset(d, t): return d - t

# ----------------------------------------------------------------------------------------------- rotations
def rot_from_y(v):
    """Matrice dont la colonne 1 est le vecteur unitaire v (repère local dont Y suit v)."""
    y = np.asarray(v, float); y = y / np.linalg.norm(y)
    x = np.cross(y, [0, 0, 1.0]);
    if np.linalg.norm(x) < 1e-6: x = np.cross(y, [1.0, 0, 0])
    x /= np.linalg.norm(x); z = np.cross(x, y)
    return np.stack([x, y, z], axis=1)

# ----------------------------------------------------------------------------------------------- maillage
class Mesh:
    def __init__(self, V, F, N=None): self.V = np.asarray(V, float); self.F = np.asarray(F, np.int64); self.N = N
    def __len__(self): return len(self.F)

def surface_nets(f, lo, hi, h, chunk=400000):
    """Extrait l'isosurface f=0 (f négatif à l'intérieur) sur la boîte [lo,hi] au pas h. f prend un tableau (N,3)."""
    lo = np.asarray(lo, float); hi = np.asarray(hi, float)
    n = np.ceil((hi - lo) / h).astype(int) + 1
    xs = lo[0] + np.arange(n[0]) * h; ys = lo[1] + np.arange(n[1]) * h; zs = lo[2] + np.arange(n[2]) * h
    G = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), axis=-1).reshape(-1, 3)
    D = np.empty(len(G))
    for i in range(0, len(G), chunk): D[i:i + chunk] = f(G[i:i + chunk])
    D = D.reshape(n)
    nx, ny, nz = n
    ins = D < 0
    corners = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    sl = lambda a: (slice(a[0], nx - 1 + a[0]), slice(a[1], ny - 1 + a[1]), slice(a[2], nz - 1 + a[2]))
    cs = [ins[sl(c)] for c in corners]
    anyin = cs[0].copy(); allin = cs[0].copy()
    for c in cs[1:]: anyin |= c; allin &= c
    mask = anyin & ~allin
    ii, jj, kk = np.nonzero(mask)
    nv = len(ii)
    vid = -np.ones((nx - 1, ny - 1, nz - 1), np.int64); vid[ii, jj, kk] = np.arange(nv)
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
    Vsum = np.zeros((nv, 3)); cnt = np.zeros(nv)
    val = [D[ii + c[0], jj + c[1], kk + c[2]] for c in corners]
    base = np.stack([ii, jj, kk], axis=1).astype(float)
    for a, b in edges:
        va, vb = val[a], val[b]; ch = (va < 0) != (vb < 0)
        t = np.where(ch, va / np.where(ch, va - vb, 1.0), 0.0)
        pa = base + np.array(corners[a]); pb = base + np.array(corners[b])
        Vsum += np.where(ch[:, None], pa + (pb - pa) * t[:, None], 0.0); cnt += ch
    V = lo + (Vsum / np.maximum(cnt, 1)[:, None]) * h
    quads = []
    # arêtes selon x, y, z : quatre cellules se partagent l'arête
    for ax in range(3):
        u, v = (ax + 1) % 3, (ax + 2) % 3
        shp = [nx, ny, nz]
        a_sl = [slice(None)] * 3; b_sl = [slice(None)] * 3
        a_sl[ax] = slice(0, shp[ax] - 1); b_sl[ax] = slice(1, shp[ax])
        ia, ib = ins[tuple(a_sl)], ins[tuple(b_sl)]
        ch = ia != ib
        # on ne garde que les arêtes dont les quatre cellules existent
        cut = [slice(None)] * 3; cut[u] = slice(1, shp[u] - 1); cut[v] = slice(1, shp[v] - 1)
        idx = np.nonzero(ch[tuple(cut)])
        if len(idx[0]) == 0: continue
        pos = [idx[0].copy(), idx[1].copy(), idx[2].copy()]
        pos[u] += 1; pos[v] += 1
        def cell(du, dv):
            c = [pos[0].copy(), pos[1].copy(), pos[2].copy()]
            c[u] += du; c[v] += dv
            return vid[c[0], c[1], c[2]]
        q = np.stack([cell(-1, -1), cell(0, -1), cell(0, 0), cell(-1, 0)], axis=1)
        inside_first = ia[tuple(pos)]
        q = np.where(inside_first[:, None], q, q[:, ::-1])
        quads.append(q)
    Q = np.concatenate(quads, axis=0)
    Q = Q[np.all(Q >= 0, axis=1)]
    return V, Q

def quads_to_tris(V, Q):
    d02 = _len(V[Q[:, 0]] - V[Q[:, 2]]); d13 = _len(V[Q[:, 1]] - V[Q[:, 3]])
    a = np.where(d02[:, None] <= d13[:, None], Q[:, [0, 1, 2]], Q[:, [0, 1, 3]])
    b = np.where(d02[:, None] <= d13[:, None], Q[:, [0, 2, 3]], Q[:, [1, 2, 3]])
    return np.concatenate([a, b], axis=0)

def gradient(f, P, e=1e-3):
    g = np.zeros_like(P)
    for a in range(3):
        d = np.zeros(3); d[a] = e
        g[:, a] = f(P + d) - f(P - d)
    n = _len(g)[:, None]
    return g / np.maximum(n, 1e-12)

def relax(V, F, f, iters=3, lam=0.5, project=2):
    """Lissage laplacien puis projection sur la surface (le volume ne fond pas)."""
    n = len(V)
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]], axis=0)
    E = np.concatenate([E, E[:, ::-1]], axis=0)
    for _ in range(iters):
        acc = np.zeros_like(V); c = np.zeros(n)
        np.add.at(acc, E[:, 0], V[E[:, 1]]); np.add.at(c, E[:, 0], 1)
        avg = acc / np.maximum(c, 1)[:, None]
        V = V + lam * (avg - V)
        for _p in range(project):
            d = f(V); g = gradient(f, V)
            V = V - d[:, None] * g
    return V

def build(f, lo, hi, h, smooth=2, lam=0.5):
    """SDF -> maillage triangulé lisse : sommets, faces (orientées vers l'extérieur), normales issues du champ."""
    V, Q = surface_nets(f, lo, hi, h)
    if len(V) == 0: return Mesh(np.zeros((0, 3)), np.zeros((0, 3), np.int64), np.zeros((0, 3)))
    F = quads_to_tris(V, Q)
    if smooth: V = relax(V, F, f, iters=smooth, lam=lam)
    # orientation : la normale géométrique doit suivre le gradient
    g = gradient(f, V)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    cg = g[F[:, 0]] + g[F[:, 1]] + g[F[:, 2]]
    flip = np.sum(fn * cg, axis=1) < 0
    F = np.where(flip[:, None], F[:, [0, 2, 1]], F)
    # retire les sommets inutilisés
    used = np.zeros(len(V), bool); used[F.ravel()] = True
    remap = -np.ones(len(V), np.int64); remap[used] = np.arange(used.sum())
    V = V[used]; F = remap[F]
    return Mesh(V, F, gradient(f, V))

def decimate_faces(mesh, keep):
    """Retire les faces dont keep(centre)=False (par exemple pour ouvrir un col ou une manche)."""
    c = (mesh.V[mesh.F[:, 0]] + mesh.V[mesh.F[:, 1]] + mesh.V[mesh.F[:, 2]]) / 3
    k = keep(c)
    F = mesh.F[k]
    used = np.zeros(len(mesh.V), bool); used[F.ravel()] = True
    remap = -np.ones(len(mesh.V), np.int64); remap[used] = np.arange(used.sum())
    return Mesh(mesh.V[used], remap[F], None if mesh.N is None else mesh.N[used])

# ----------------------------------------------------------------------------------------------- décalques : bandes, pièces, rubans collés à la surface
def project(f, P, iters=3):
    """Ramène des points sur la surface f=0 (pas de Newton le long du gradient)."""
    P = np.array(P, float)
    for _ in range(iters):
        d = f(P); g = gradient(f, P); P = P - d[:, None] * g
    return P

def sheet(f, grid, off=0.0, closed_u=False, valid=None, region=None):
    """Nappe collée à la surface : grid (nu, nv, 3) de points approximatifs -> maillage aux bords nets.
       region(P) < 0 : points gardés (par ex. l'intérieur du gilet sans les emmanchures)."""
    nu, nv, _ = grid.shape
    P = project(f, grid.reshape(-1, 3), 5).reshape(nu, nv, 3)
    N = gradient(f, P.reshape(-1, 3)).reshape(nu, nv, 3)
    ok = np.ones((nu, nv), bool)
    if region is not None: ok &= (region(P.reshape(-1, 3)) < 0).reshape(nu, nv)
    if valid is not None: ok &= valid
    P = P + N * off
    idx = np.arange(nu * nv).reshape(nu, nv)
    F = []
    for du in range(nu if closed_u else nu - 1):
        i, i2 = du, (du + 1) % nu
        for j in range(nv - 1):
            if ok[i, j] and ok[i2, j] and ok[i2, j + 1] and ok[i, j + 1]:
                a, b, c, d = idx[i, j], idx[i2, j], idx[i2, j + 1], idx[i, j + 1]
                F.append((a, b, c)); F.append((a, c, d))
    if not F: return Mesh(np.zeros((0, 3)), np.zeros((0, 3), np.int64), np.zeros((0, 3)))
    F = np.array(F, np.int64); V = P.reshape(-1, 3); Nn = N.reshape(-1, 3)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    flip = np.sum(fn * (Nn[F[:, 0]] + Nn[F[:, 1]] + Nn[F[:, 2]]), axis=1) < 0
    F = np.where(flip[:, None], F[:, [0, 2, 1]], F)
    used = np.zeros(len(V), bool); used[F.ravel()] = True
    remap = -np.ones(len(V), np.int64); remap[used] = np.arange(used.sum())
    return Mesh(V[used], remap[F], Nn[used])

def ribbon(f, pts, hw, off=0.006, closed=False, region=None, rows=3):
    """Ruban de demi-largeur hw le long d'un chemin (points proches de la surface), collé à f=0."""
    pts = project(f, pts, 6)
    n = len(pts); N = gradient(f, pts)
    t = np.roll(pts, -1, axis=0) - np.roll(pts, 1, axis=0)
    if not closed: t[0] = pts[1] - pts[0]; t[-1] = pts[-1] - pts[-2]
    t /= np.maximum(_len(t)[:, None], 1e-9)
    side = np.cross(N, t); side /= np.maximum(_len(side)[:, None], 1e-9)
    ks = np.linspace(-1, 1, rows)
    grid = np.stack([pts + side * (k * hw) for k in ks], axis=1)
    return sheet(f, grid, off, closed_u=closed, region=region)

def rect_patch(f, center, u_axis, v_axis, w, h, off=0.006, nu=6, nv=6, region=None):
    """Rectangle de w x h collé à la surface autour de center (axes approximatifs u_axis, v_axis)."""
    us = np.linspace(-w / 2, w / 2, nu); vs = np.linspace(-h / 2, h / 2, nv)
    U = np.asarray(u_axis, float); Vv = np.asarray(v_axis, float)
    grid = np.array([[np.asarray(center) + U * u + Vv * v for v in vs] for u in us])
    return sheet(f, grid, off, region=region)

def merge_meshes(*ms):
    ms = [m for m in ms if m is not None and len(m.F)]
    if not ms: return Mesh(np.zeros((0, 3)), np.zeros((0, 3), np.int64), np.zeros((0, 3)))
    V = np.concatenate([m.V for m in ms]); N = np.concatenate([m.N for m in ms]); F = []; o = 0
    for m in ms: F.append(m.F + o); o += len(m.V)
    return Mesh(V, np.concatenate(F), N)

def _compact(V, F, N):
    used = np.zeros(len(V), bool); used[F.ravel()] = True
    remap = -np.ones(len(V), np.int64); remap[used] = np.arange(used.sum())
    return Mesh(V[used], remap[F], N[used])

def clip_mesh(mesh, kf, f=None):
    """Découpe un maillage suivant le champ kf (> 0 : on garde). Les triangles coupés sont recoupés le long de l'isovaleur kf = 0
       (sommets interpolés sur les arêtes, puis ramenés sur f = 0) : les bords d'un col, d'une manche, d'un ourlet sont lisses,
       contrairement au retrait de faces entières qui laisse des dents de scie."""
    V, F = mesh.V, mesh.F
    if not len(F): return mesh
    N = mesh.N if mesh.N is not None else gradient(f, V)
    s = kf(V); ins = s > 0
    c = ins[F].sum(axis=1)
    def rot_first(Fs, mark):
        if not len(Fs): return Fs
        k = np.argmax(mark, axis=1)
        return np.take_along_axis(Fs, (np.arange(3)[None, :] + k[:, None]) % 3, axis=1)
    full = F[c == 3]
    F1 = F[c == 1]; F1 = rot_first(F1, ins[F1])          # (a, b, c) : a est dedans
    F2 = F[c == 2]; F2 = rot_first(F2, ~ins[F2])         # (c, a, b) : c est dehors
    m1, m2 = len(F1), len(F2)
    if m1 + m2 == 0: return _compact(V, full, N)
    e_in = np.concatenate([F1[:, 0], F1[:, 0], F2[:, 1], F2[:, 2]])
    e_out = np.concatenate([F1[:, 1], F1[:, 2], F2[:, 0], F2[:, 0]])
    nV = len(V)
    uk, inv = np.unique(e_in.astype(np.int64) * nV + e_out, return_inverse=True)
    ui, uo = uk // nV, uk % nV
    t = s[ui] / (s[ui] - s[uo])
    NP = V[ui] + (V[uo] - V[ui]) * t[:, None]
    NN = N[ui] + (N[uo] - N[ui]) * t[:, None]; NN = NN / np.maximum(_len(NN)[:, None], 1e-9)
    if f is not None: NP = project(f, NP, 1)
    i_ab, i_ac = inv[:m1] + nV, inv[m1:2 * m1] + nV
    i_ca, i_cb = inv[2 * m1:2 * m1 + m2] + nV, inv[2 * m1 + m2:] + nV
    tris = [full]
    if m1: tris.append(np.stack([F1[:, 0], i_ab, i_ac], axis=1))
    if m2:
        a, b = F2[:, 1], F2[:, 2]
        tris.append(np.stack([a, b, i_cb], axis=1)); tris.append(np.stack([a, i_cb, i_ca], axis=1))
    return _compact(np.concatenate([V, NP]), np.concatenate(tris), np.concatenate([N, NN]))

def area(mesh):
    a = mesh.V[mesh.F[:, 0]]; b = mesh.V[mesh.F[:, 1]]; c = mesh.V[mesh.F[:, 2]]
    return float(0.5 * np.sum(_len(np.cross(b - a, c - a))))


if __name__ == '__main__':
    import time
    t = time.time()
    f = lambda P: union(sphere(P, [0, 0, 0], 0.5), capsule(P, [0, 0, 0], [0.8, 0.3, 0], 0.2, 0.1), k=0.1)
    m = build(f, [-1, -1, -1], [1.5, 1, 1], 0.05)
    print('sommets', len(m.V), 'faces', len(m.F), '%.2f s' % (time.time() - t))
    # fermeture : chaque arête doit être partagée par deux faces
    E = np.sort(np.concatenate([m.F[:, [0, 1]], m.F[:, [1, 2]], m.F[:, [2, 0]]]), axis=1)
    u, c = np.unique(E, axis=0, return_counts=True)
    print('arêtes', len(u), 'non manifold (≠2 faces)', int(np.sum(c != 2)))

# ----------------------------------------------------------------------------------------------- maillages directs : tubes et disques (montures, sangles, verres)
def tube(pts, r, sides=6, closed=False, caps=True):
    """Tube à section circulaire le long d'un chemin (parallel transport). Peu de triangles : idéal pour montures, sangles rondes, anneaux."""
    pts = np.asarray(pts, float); n = len(pts)
    t = (np.roll(pts, -1, 0) - np.roll(pts, 1, 0)) if closed else np.gradient(pts, axis=0)
    t = t / np.maximum(_len(t)[:, None], 1e-9)
    ref = np.array([0., 1., 0.]) if abs(t[0][1]) < 0.9 else np.array([1., 0., 0.])
    u = np.cross(t[0], ref); u /= np.linalg.norm(u)
    U = np.zeros((n, 3)); W = np.zeros((n, 3))
    for i in range(n):
        if i:
            u = u - t[i] * np.dot(u, t[i]); u /= max(np.linalg.norm(u), 1e-9)
        U[i] = u; W[i] = np.cross(t[i], u)
    ang = np.linspace(0, 2 * np.pi, sides, endpoint=False)
    rad = np.cos(ang)[None, :, None] * U[:, None, :] + np.sin(ang)[None, :, None] * W[:, None, :]        # (n, sides, 3)
    V = (pts[:, None, :] + r * rad).reshape(-1, 3); N = rad.reshape(-1, 3)
    shift = 0
    if closed:   # raccorde le dernier anneau au premier en cherchant le décalage qui limite la torsion
        best = 1e9
        for s in range(sides):
            d = np.sum((V.reshape(n, sides, 3)[0][(np.arange(sides) + s) % sides] - V.reshape(n, sides, 3)[-1]) ** 2)
            if d < best: best, shift = d, s
    F = []
    for i in range(n if closed else n - 1):
        i2 = (i + 1) % n
        for j in range(sides):
            j2 = (j + 1) % sides
            a, b = i * sides + j, i * sides + j2
            if closed and i2 == 0: c, d = i2 * sides + (j2 + shift) % sides, i2 * sides + (j + shift) % sides
            else: c, d = i2 * sides + j2, i2 * sides + j
            F.append((a, b, c)); F.append((a, c, d))
    F = np.array(F, np.int64)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    if np.sum(fn * N[F[:, 0]]) < 0: F = F[:, [0, 2, 1]]
    if caps and not closed:
        for end, k in ((0, 0), (n - 1, 1)):
            c = len(V); V = np.concatenate([V, pts[end][None]]); N = np.concatenate([N, (-t[end] if end == 0 else t[end])[None]])
            ring = np.arange(sides) + end * sides
            for j in range(sides):
                tri = (c, ring[(j + 1) % sides], ring[j]) if k == 0 else (c, ring[j], ring[(j + 1) % sides])
                F = np.concatenate([F, np.array([tri], np.int64)])
    return Mesh(V, F, N)

def disc(center, u, v, ru, rv, nr=3, nt=20, bulge=0.0):
    """Disque elliptique face à w = u x v, bombé de `bulge` au centre (verres, écussons)."""
    u = np.asarray(u, float); v = np.asarray(v, float); w = np.cross(u, v); w /= np.linalg.norm(w)
    V = [np.asarray(center, float) + w * bulge]; N = [w]
    for i in range(1, nr + 1):
        rho = i / nr
        for j in range(nt):
            a = 2 * np.pi * j / nt
            p = np.asarray(center, float) + u * (ru * rho * np.cos(a)) + v * (rv * rho * np.sin(a)) + w * bulge * (1 - rho * rho)
            V.append(p); N.append(w * 1.0 + (u * np.cos(a) / max(ru, 1e-6) + v * np.sin(a) / max(rv, 1e-6)) * bulge * 2 * rho * 0.5)
    V = np.array(V); N = np.array(N); N /= np.linalg.norm(N, axis=1)[:, None]
    F = []
    for j in range(nt): F.append((0, 1 + j, 1 + (j + 1) % nt))
    for i in range(1, nr):
        for j in range(nt):
            a, b = 1 + (i - 1) * nt + j, 1 + (i - 1) * nt + (j + 1) % nt
            c, d = 1 + i * nt + (j + 1) % nt, 1 + i * nt + j
            F.append((a, d, c)); F.append((a, c, b))
    F = np.array(F, np.int64)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    if np.sum(fn * w) < 0: F = F[:, [0, 2, 1]]
    return Mesh(V, F, N)
