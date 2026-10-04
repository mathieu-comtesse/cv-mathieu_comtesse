"""Outils de champ de distance signée (SDF) pour l'île flottante : grille, bruit spectral, primitives, extraction.

Principes repris de la compétence « vibe-terrain » :
 - la structure géologique d'abord (forme, strates, lobes, surplombs), le bruit ensuite et chaque bruit a une longueur
   d'onde en unités du monde (jamais une pile d'octaves partagée) ;
 - la dureté vient des booléens (blocs retirés, joints cellulaires), pas de l'amplitude du bruit ;
 - une longueur d'onde L n'apparaît dans le maillage que si la grille l'échantillonne au moins 3 fois : en dessous, le
   détail est laissé au shader ;
 - le champ est évalué analytiquement à chaque échantillon (aucun rééchantillonnage d'un champ plus grossier).
Les calculs sont en float32, vectorisés avec numpy / scipy."""
import numpy as np
import scipy.fft as sfft
import scipy.ndimage as ndi

class Grille:
    """Boîte régulière d'échantillons. Les axes sont diffusés (x : (nx,1,1), y : (1,ny,1), z : (1,1,nz))."""
    def __init__(self, bornes, res):
        (x0, x1), (y0, y1), (z0, z1) = bornes
        self.res = float(res); self.o = np.array([x0, y0, z0], np.float32)
        self.n = (int(round((x1 - x0) / res)), int(round((y1 - y0) / res)), int(round((z1 - z0) / res)))
        nx, ny, nz = self.n
        self.x = (x0 + np.arange(nx, dtype=np.float32) * res).reshape(nx, 1, 1)
        self.y = (y0 + np.arange(ny, dtype=np.float32) * res).reshape(1, ny, 1)
        self.z = (z0 + np.arange(nz, dtype=np.float32) * res).reshape(1, 1, nz)
    def vers_indice(self, p):
        """Coordonnées monde (N,3) -> indices fractionnaires de la grille (3,N) pour map_coordinates."""
        return ((np.asarray(p, np.float32) - self.o) / self.res).T

def bruit(g, longueur, largeur=0.55, graine=0, ridge=False):
    """Bruit isotrope à bande étroite autour de la longueur d'onde donnée (unités du monde), d'écart-type 1.
    Bruit blanc filtré dans l'espace de Fourier : spectre en cloche sur log|f|, sans artefact d'axe."""
    rng = np.random.default_rng(graine)
    nx, ny, nz = g.n
    w = rng.standard_normal((nx, ny, nz), dtype=np.float32)
    W = sfft.rfftn(w, workers=-1); del w
    fx = sfft.fftfreq(nx, g.res).astype(np.float32)[:, None, None]
    fy = sfft.fftfreq(ny, g.res).astype(np.float32)[None, :, None]
    fz = sfft.rfftfreq(nz, g.res).astype(np.float32)[None, None, :]
    f = np.sqrt(fx * fx + fy * fy + fz * fz); f[0, 0, 0] = 1e-6
    W *= np.exp(-0.5 * (np.log(f * longueur) / largeur) ** 2).astype(np.float32); del f
    out = sfft.irfftn(W, s=(nx, ny, nz), workers=-1).astype(np.float32); del W
    out /= out.std() + 1e-9
    if ridge: out = 1.0 - np.abs(out) * 1.25          # crêtes : la valeur 1 aux lignes de fracture
    return out

def lisse(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)

def smin(a, b, k):
    """Union douce polynomiale (distance négative = intérieur)."""
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)

def smax(a, b, k):
    return -smin(-a, -b, k)

# ------------------------------------------------------------------------------------------------ primitives
def ellipsoide(g, c, r, ang=0.0, sl=None):
    """Distance approchée à un ellipsoïde de demi-axes r=(rx,ry,rz) tourné de ang autour de y."""
    dx = g.x - c[0]; dy = g.y - c[1]; dz = g.z - c[2]
    ca, sa = np.cos(ang), np.sin(ang)
    qx = (dx * ca + dz * sa) / r[0]; qz = (-dx * sa + dz * ca) / r[2]; qy = dy / r[1]
    k0 = np.sqrt(qx * qx + qy * qy + qz * qz)
    return (k0 - 1.0) * min(r)

def capsule_conique(g, a, b, ra, rb):
    """Capsule à rayon variable de a (rayon ra) à b (rayon rb) : stalactites, racines de roche, pointe du socle."""
    a = np.array(a, np.float32); b = np.array(b, np.float32); ba = b - a
    px = g.x - a[0]; py = g.y - a[1]; pz = g.z - a[2]
    t = np.clip((px * ba[0] + py * ba[1] + pz * ba[2]) / float(ba @ ba), 0, 1)
    dx = px - ba[0] * t; dy = py - ba[1] * t; dz = pz - ba[2] * t
    return np.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t)

def boite_orientee(g, c, demi, rx=0.0, ry=0.0, rz=0.0, arrondi=0.0):
    """Distance à une boîte orientée (angles d'Euler) : blocs de roche retirés ou ajoutés."""
    dx = g.x - c[0]; dy = g.y - c[1]; dz = g.z - c[2]
    # rotation inverse : y, puis x, puis z
    cy, sy = np.cos(ry), np.sin(ry); x1 = dx * cy - dz * sy; z1 = dx * sy + dz * cy
    cx, sx = np.cos(rx), np.sin(rx); y2 = dy * cx - z1 * sx; z2 = dy * sx + z1 * cx
    cz, sz = np.cos(rz), np.sin(rz); x3 = x1 * cz - y2 * sz; y3 = x1 * sz + y2 * cz
    qx = np.abs(x3) - demi[0] + arrondi; qy = np.abs(y3) - demi[1] + arrondi; qz = np.abs(z2) - demi[2] + arrondi
    ext = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
    return ext + np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0) - arrondi

def sous_grille(g, c, rayon):
    """Sous-boîte de la grille autour de c (monde) : (tranches, vue exposant x, y, z) pour n'évaluer une primitive que là
    où elle compte. Renvoie None si la boîte sort de la grille."""
    lo = np.floor((np.array(c, np.float32) - rayon - g.o) / g.res).astype(int)
    hi = np.ceil((np.array(c, np.float32) + rayon - g.o) / g.res).astype(int) + 1
    lo = np.maximum(lo, 0); hi = np.minimum(hi, np.array(g.n))
    if (hi <= lo).any(): return None
    sl = (slice(lo[0], hi[0]), slice(lo[1], hi[1]), slice(lo[2], hi[2]))
    class V: pass
    v = V(); v.x = g.x[sl[0]]; v.y = g.y[:, sl[1]]; v.z = g.z[:, :, sl[2]]; v.res = g.res
    return sl, v

def bruit2d(g, longueur, largeur=0.55, graine=0):
    """Même chose en 2D (nx,1,nz) : relief de la prairie, du sable, des drips de terre."""
    rng = np.random.default_rng(graine)
    nx, nz = g.n[0], g.n[2]
    W = sfft.rfft2(rng.standard_normal((nx, nz), dtype=np.float32), workers=-1)
    fx = sfft.fftfreq(nx, g.res).astype(np.float32)[:, None]; fz = sfft.rfftfreq(nz, g.res).astype(np.float32)[None, :]
    f = np.sqrt(fx * fx + fz * fz); f[0, 0] = 1e-6
    W *= np.exp(-0.5 * (np.log(f * longueur) / largeur) ** 2).astype(np.float32)
    o = sfft.irfft2(W, s=(nx, nz), workers=-1).astype(np.float32); o /= o.std() + 1e-9
    return o.reshape(nx, 1, nz)

# ------------------------------------------------------------------------------------------------ extraction
def surface_nets(F, o, res):
    """Surface nets vectorisé : un sommet par cellule coupée (moyenne des croisements d'arêtes), un quad par arête
    coupée. Renvoie (sommets (N,3) monde, triangles (M,3)). L'intérieur est F < 0."""
    nx, ny, nz = F.shape
    s = (F < 0)
    c = np.zeros((nx - 1, ny - 1, nz - 1), np.uint8)
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                c += s[dx:nx - 1 + dx, dy:ny - 1 + dy, dz:nz - 1 + dz]
    actif = (c > 0) & (c < 8)
    ii = np.nonzero(actif)
    n = ii[0].size
    idx = np.full(actif.shape, -1, np.int64); idx[ii] = np.arange(n)
    somme = np.zeros((n, 3), np.float32); cnt = np.zeros(n, np.float32)
    coins = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    aretes = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
    val = [F[ii[0] + dx, ii[1] + dy, ii[2] + dz] for (dx, dy, dz) in coins]
    for a, b in aretes:
        fa, fb = val[a], val[b]
        cut = (fa < 0) != (fb < 0)
        t = np.where(cut, fa / np.where(cut, fa - fb, 1.0), 0.0).astype(np.float32)
        pa = np.array(coins[a], np.float32); pb = np.array(coins[b], np.float32)
        somme += cut[:, None] * (pa[None] + t[:, None] * (pb - pa)[None]); cnt += cut
    local = somme / np.maximum(cnt, 1)[:, None]
    P = (np.stack(ii, 1).astype(np.float32) + local) * res + o
    quads = []
    for ax in range(3):
        a1, a2 = (ax + 1) % 3, (ax + 2) % 3
        sl0 = [slice(None)] * 3; sl1 = [slice(None)] * 3
        sl0[ax] = slice(0, -1); sl1[ax] = slice(1, None)
        cross = s[tuple(sl0)] != s[tuple(sl1)]           # arête de la grille entre le point i et i+1 selon ax
        e = np.nonzero(cross)
        # les quatre cellules qui partagent l'arête (i, j, k) selon ax : décalages -1/0 sur les deux autres axes
        def cell(d1, d2):
            c3 = [e[0].copy(), e[1].copy(), e[2].copy()]
            c3[a1] = c3[a1] + d1; c3[a2] = c3[a2] + d2
            ok = (c3[0] >= 0) & (c3[1] >= 0) & (c3[2] >= 0) & (c3[0] < nx - 1) & (c3[1] < ny - 1) & (c3[2] < nz - 1)
            out = np.full(e[0].size, -1, np.int64)
            out[ok] = idx[c3[0][ok], c3[1][ok], c3[2][ok]]
            return out
        v = [cell(-1, -1), cell(0, -1), cell(0, 0), cell(-1, 0)]
        ok = (v[0] >= 0) & (v[1] >= 0) & (v[2] >= 0) & (v[3] >= 0)
        inside = s[tuple(sl0)][e]                         # le coin de départ est-il plein ?
        q = np.stack([v[0], v[1], v[2], v[3]], 1)[ok]
        q = np.where(inside[ok][:, None], q, q[:, ::-1])
        # orientation : normale vers l'extérieur ; l'ordre dépend de l'axe (permutation cyclique)
        if ax == 1: q = q[:, ::-1]
        quads.append(q)
    Q = np.concatenate(quads, 0)
    T = np.concatenate([Q[:, [0, 1, 2]], Q[:, [0, 2, 3]]], 0)
    return P, T.astype(np.int32)

def projeter(F, g, P, iters=2, pas_max=0.6):
    """Ramène les sommets sur l'isosurface F=0 par pas de Newton (gradient trilinéaire) : garde les arêtes vives plus
    nettes que la simple moyenne des croisements."""
    e = g.res * 0.75
    for _ in range(iters):
        f0 = ndi.map_coordinates(F, g.vers_indice(P), order=1, mode='nearest')
        G = gradient(F, g, P, e)
        n2 = (G * G).sum(1) + 1e-9
        step = -(f0 / n2)[:, None] * G
        L = np.linalg.norm(step, axis=1, keepdims=True)
        step *= np.minimum(1.0, pas_max * g.res / np.maximum(L, 1e-9))
        P = P + step
    return P

def gradient(F, g, P, e=None):
    e = e or g.res * 0.75
    out = np.zeros_like(P, dtype=np.float32)
    for a in range(3):
        d = np.zeros(3, np.float32); d[a] = e
        fp = ndi.map_coordinates(F, g.vers_indice(P + d), order=1, mode='nearest')
        fm = ndi.map_coordinates(F, g.vers_indice(P - d), order=1, mode='nearest')
        out[:, a] = (fp - fm) / (2 * e)
    return out

def echantillonne(V, g, P):
    return ndi.map_coordinates(V, g.vers_indice(P), order=1, mode='nearest')

def facettes(g, F, poids, lam, tilt, melange, graine, bande=1.3):
    """Facettage de la roche par plans de Voronoï : les semences sont posées sur la surface (une par maille de côté 0,8 lam),
    chaque cellule remplace la surface lisse par son plan tangent (légèrement incliné d'un angle aléatoire <= tilt) ; les
    arêtes vives apparaissent aux limites de cellules. C'est la « dureté par les booléens » : aucun bruit, que des plans.
    poids : tableau (ou diffusé) de 0..1 qui dit où facetter ; melange : part du plan dans le champ final."""
    from scipy.spatial import cKDTree
    rng = np.random.default_rng(graine)
    poids = np.broadcast_to(np.asarray(poids, np.float32), F.shape)
    proche = np.nonzero((np.abs(F) < 0.22) & (poids > 0.3))
    S = np.stack(proche, 1).astype(np.float32) * g.res + g.o
    if len(S) < 10: return F
    cle = np.floor(S / (lam * 0.8)).astype(np.int64)
    cle = cle[:, 0] * 73856093 ^ cle[:, 1] * 19349663 ^ cle[:, 2] * 83492791
    ordre = rng.permutation(len(S)); _, premier = np.unique(cle[ordre], return_index=True)
    S = S[ordre[premier]]
    Fs = echantillonne(F, g, S); G = gradient(F, g, S, g.res)
    G /= np.maximum(np.linalg.norm(G, axis=1, keepdims=True), 1e-6)
    R = rng.normal(size=G.shape).astype(np.float32); R -= (R * G).sum(1, keepdims=True) * G
    R /= np.maximum(np.linalg.norm(R, axis=1, keepdims=True), 1e-6)
    G = G + R * np.tan(np.deg2rad(tilt)) * rng.uniform(0.3, 1.0, size=(len(G), 1)).astype(np.float32)
    G /= np.linalg.norm(G, axis=1, keepdims=True)
    # le plan est ramené sur la surface lisse : on retire Fs pour que chaque plan passe par sa semence
    ii = np.nonzero(np.abs(F) < bande)
    Q = np.stack(ii, 1).astype(np.float32) * g.res + g.o
    d, k = cKDTree(S).query(Q, k=1, workers=-1)
    Ff = (Q - S[k]) * G[k]
    Ff = Ff.sum(1)                                                  # plan passant par la semence (distance signée)
    w = melange * lisse(bande, bande * 0.45, np.abs(F[ii])) * poids[ii]
    Fn = F.copy()
    Fn[ii] = F[ii] + w * (Ff - F[ii])
    return Fn

def boite_axes(g, c, ex, ey, ez, demi, arrondi=0.0):
    """Boîte à axes quelconques (ex, ey, ez orthonormés) : distance signée approchée, arêtes arrondies d'un rayon donné."""
    dx = g.x - c[0]; dy = g.y - c[1]; dz = g.z - c[2]
    ux = dx * ex[0] + dy * ex[1] + dz * ex[2]; uy = dx * ey[0] + dy * ey[1] + dz * ey[2]; uz = dx * ez[0] + dy * ez[1] + dz * ez[2]
    qx = np.abs(ux) - demi[0] + arrondi; qy = np.abs(uy) - demi[1] + arrondi; qz = np.abs(uz) - demi[2] + arrondi
    ext = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
    return ext + np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0) - arrondi, (ux, uy, uz)
