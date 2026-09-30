"""Fabrique les personnages du Village Talas : modélisation par champs de distance autour du squelette Quaternius (UAL),
   poids de skinning analytiques, écriture d'un GLB skinné dont les pièces portent le nom « pièce__rôle » (le rôle donne la couleur,
   comme pour les anciens personnages) — les animations de la bibliothèque s'appliquent telles quelles.
   Les EPI (casque, gilet, lunettes, protection auditive, harnais, coques de sécurité, gants) sont des pièces séparées : le jeu les
   montre ou les cache (ISO 45001 : le port des EPI est ce que le joueur doit apprendre à vérifier).
   Usage :  python persos.py dylan aurelien ...  [--lod 1]     ->  ../../../assets/talas/persos/<nom>.glb"""
import os, sys, time, copy
import numpy as np
import sdf as S
from skel import Skel, PROPORTIONS
from glbwrite import GLB

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'assets', 'talas', 'persos'))

# couleurs de repos par rôle (informatif : le jeu recolore par palette)
ROLE_RGB = {'skin': '#e6ad86', 'nose': '#d89c78', 'shirt': '#6cb0e8', 'shirt2': '#4f8fc8', 'vest': '#ff8420', 'vest2': '#d9600e', 'stripe': '#e8ecef', 'pants': '#3a58b8', 'pants2': '#2a4494',
            'belt': '#3a2210', 'shoe': '#6e4220', 'sole': '#3a2210', 'hair': '#5a3214', 'hat': '#ffd02a', 'hat2': '#e0aa10', 'white': '#ffffff', 'pupil': '#1f4f9a', 'mouth': '#6a2418',
            'stubble': '#c99472', 'badge': '#ffffff', 'metal': '#b8bcc8', 'jacket': '#2c3470', 'collar': '#f4f6fa', 'tie': '#c81e1e', 'gold': '#e8b923', 'cigar': '#6a3e1e',
            'ember': '#ff5010', 'frame': '#22222a', 'strap': '#25252c', 'lens': '#bfe4ff', 'muff': '#e03131', 'harness': '#e8590c', 'toecap': '#98a0ac', 'glove': '#f0c419',
            'lace': '#e9e2d0', 'cuff': '#4f8fc8', 'brow': '#3a2410', 'lip': '#c86a5a', 'freckle': '#c8784a', 'blush': '#f08a80'}
def rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def V(*a): return np.array(a, float)
def box(xr, yr, zr): return np.array([xr[0], yr[0], zr[0]], float), np.array([xr[1], yr[1], zr[1]], float)
def mnf(*fs): return lambda P: np.minimum.reduce([f(P) for f in fs])          # intersection de champs « > 0 : on garde »
def mxf(*fs): return lambda P: np.maximum.reduce([f(P) for f in fs])          # union de champs « > 0 : on garde »

def spline(ctrl, per=8):
    """Courbe de Catmull-Rom passant par les points de contrôle (chemins des rubans)."""
    c = [np.asarray(p, float) for p in ctrl]; c = [c[0]] + c + [c[-1]]; out = []
    for i in range(1, len(c) - 2):
        p0, p1, p2, p3 = c[i - 1], c[i], c[i + 1], c[i + 2]
        for t in np.linspace(0, 1, per, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(c[-2]); return np.array(out)

def ring_pts(y0, rx, rz, cz=0.0, n=80):
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    return np.stack([rx * np.cos(th), np.full(n, y0), cz + rz * np.sin(th)], axis=1)

def circle_pts(c, u, v, r, n=48):
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    return np.asarray(c) + np.outer(np.cos(th), np.asarray(u) * r) + np.outer(np.sin(th), np.asarray(v) * r)

def poly_capsule(P, pts, r, r2=None, k=0.01):
    d = None
    for a, b in zip(pts[:-1], pts[1:]):
        ri = r if r2 is None else r
        c = S.capsule(P, a, b, r, r if r2 is None else r2)
        d = c if d is None else S.union(d, c, k=k)
    return d

# ------------------------------------------------------------------------------------------ description d'un personnage
DEFAUT = dict(
    build=dict(largeur=1.0, ventre=0.0, cuisse=1.0, bras=1.0, main=1.0, taille=1.0),
    tete=dict(taille=1.0, machoire=1.0, nez=1.0, oreilles=1.0, joues=1.0, sourcils=1.0, yeux=1.0, ecart=1.0, front=0.0, bec=0.0),
    haut='chemise',            # chemise | veston | pull | aucun
    manches='longues',         # longues | courtes
    gilet=True, bandes=True, badge=True,
    bas='pantalon',            # pantalon | jupe | aucun
    chaussures='bottes',       # bottes | ville
    coiffures=('courts',),     # coiffures modélisées, chacune une pièce commutable : courts | ras | cotes | coiffe | carre | longs | chignon
    casque='chantier',         # chantier | casquette | aucun
    barbes=('chaume',),        # pièces commutables : chaume | moustache
    lunettes_vue=False,        # lunettes de vue rondes (pièce commutable)
    cravate=False, cigare=False, ceinture=True, poches=True, cils=False, boutons=False, medailles=False,
    epi=('casque', 'gilet', 'lunettes', 'auditive', 'harnais', 'chaussures', 'gants'),   # EPI modélisés (pièces séparées, groupes commutables)
    visibles=('casque', 'gilet', 'chaussures', 'cheveux:courts', 'barbe:chaume'),        # groupes montrés par défaut
)

def fusion(base, sur):
    r = copy.deepcopy(base)
    for k, v in (sur or {}).items():
        if isinstance(v, dict) and isinstance(r.get(k), dict): r[k].update(v)
        else: r[k] = v
    return r

class Builder:
    def __init__(self, sk):
        self.sk = sk; self.parts = []; self.epi = {}
    def add_mesh(self, nom, role, m, mode='skin', bone=None, tau=0.045, pivot=None, epi=None):   # epi : nom du groupe commutable
        if m is None or not len(m.F): print('  %-14s (vide)' % nom); return None
        self.parts.append(dict(nom=nom, role=role, m=m, mode=mode, bone=bone, tau=tau, pivot=pivot))
        if epi: self.epi.setdefault(epi, []).append(nom + '__' + role)
        print('  %-14s %-8s %6d tris%s' % (nom, role, len(m.F), ' (rigide sur %s)' % bone if mode == 'rigid' else '')); return m
    def skinned(self, nom, role, f, lo, hi, h, smooth=2, kf=None, tau=0.045, epi=None):
        m = S.build(f, lo, hi, h, smooth=smooth)
        if kf is not None and len(m.F): m = S.clip_mesh(m, kf, f)
        return self.add_mesh(nom, role, m, 'skin', tau=tau, epi=epi)
    def rigid(self, nom, role, f, lo, hi, h, bone='Head', smooth=2, kf=None, pivot=None, epi=None):
        m = S.build(f, lo, hi, h, smooth=smooth)
        if kf is not None and len(m.F): m = S.clip_mesh(m, kf, f)
        return self.add_mesh(nom, role, m, 'rigid', bone, pivot=pivot, epi=epi)

    def save(self, path, extras=None):
        sk = self.sk; g = GLB(); node_of = {}
        for i, nm in enumerate(sk.names): node_of[i] = g.node(nm, t=sk.rest_t[i], q=sk.rest_q[i])
        for i in range(sk.n):
            p = sk.parent[i]
            if p >= 0: g.nodes[node_of[p]].setdefault('children', []).append(node_of[i])
        skin = g.skin([node_of[i] for i in range(sk.n)], sk.inv_bind.transpose(0, 2, 1), 'Armature', skeleton=node_of[0])
        scene = [node_of[0]]; tris = 0
        for p in self.parts:
            nom, role, m = p['nom'], p['role'], p['m']; c = rgb(ROLE_RGB.get(role, '#cccccc')); nm = nom + '__' + role
            if p['mode'] == 'skin':
                J, W = sk.weights(m.V, tau=p['tau'])
                mi = g.mesh(nm, m.V, m.F, m.N, role, J=J, W=W, rgb=c)
                scene.append(g.node(nm, mesh=mi, skin=skin))
            else:
                bi = sk.names.index(p['bone']); M = sk.inv_bind[bi]
                Vl = m.V @ M[:3, :3].T + M[:3, 3]; Nl = m.N @ M[:3, :3].T; t = None
                if p['pivot'] is not None: t = M[:3, :3] @ np.asarray(p['pivot']) + M[:3, 3]; Vl = Vl - t
                mi = g.mesh(nm, Vl, m.F, Nl, role, rgb=c)
                n = g.node(nm, t=t, mesh=mi); g.nodes[node_of[bi]].setdefault('children', []).append(n)
            tris += len(m.F)
        g.scene_nodes = scene
        ex = dict(extras or {}); ex['epi'] = self.epi
        u = sk.u; lg = lambda P, a, b, c: float(np.linalg.norm(P[a] - P[b]) + np.linalg.norm(P[b] - P[c]))
        Pu, _ = u.fk()
        ex['pelvisEchelle'] = round(lg(sk.P, sk.names.index('thigh_l'), sk.names.index('calf_l'), sk.names.index('foot_l')) / lg(Pu, u.index('thigh_l'), u.index('calf_l'), u.index('foot_l')), 4)
        size = g.save(path, ex)
        print('  -> %s : %d triangles, %.0f Ko' % (os.path.basename(path), tris, size / 1024)); return tris

# ======================================================================================================================
def fabriquer(nom, spec_perso, out=OUT, lod=0):
    sp = fusion(DEFAUT, spec_perso); hs = 1.12 if lod == 0 else 1.55
    B, T = sp['build'], sp['tete']
    props = {k: PROPORTIONS[k] * B['taille'] for k in ('pelvis', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'spine_01', 'spine_02', 'spine_03')}
    sk = Skel(props=props); J = sk.J; b = Builder(sk)
    print('%s :' % nom)
    pel, s1, s2, s3, nk, hd = J('pelvis'), J('spine_01'), J('spine_02'), J('spine_03'), J('neck_01'), J('Head')
    uaL, uaR, laL, laR, haL, haR = J('upperarm_l'), J('upperarm_r'), J('lowerarm_l'), J('lowerarm_r'), J('hand_l'), J('hand_r')
    thL, thR, caL, caR, foL, foR, baL, baR = J('thigh_l'), J('thigh_r'), J('calf_l'), J('calf_r'), J('foot_l'), J('foot_r'), J('ball_l'), J('ball_r')
    belt_y = pel[1] + 0.16; yy = lambda P: P[:, 1]; xx = lambda P: np.abs(P[:, 0])
    bw, bl, cu, br, mn = B['largeur'], B['ventre'], B['cuisse'], B['bras'], B['main']
    ts = T['taille']; short = sp['manches'] == 'courtes'; EPI = set(sp['epi']); vis = list(sp['visibles'])
    chest_y = s3[1] + 0.05

    # ---------------------------------------------------------------- corps nu (repère monde, pose de repos)
    dz = 0.28 * bl      # saillie du ventre vers l'avant, en mètres
    hips_base = lambda P: S.ellipsoid(P, pel + V(0, 0.06, 0.02 + 0.35 * dz), [0.235 * bw, 0.17, 0.17 + 0.35 * dz])
    belly_low = lambda P: S.ellipsoid(P, V(0, pel[1] + 0.13, 0.10 + 0.62 * dz), [0.25 * bw * 0.8 + 0.04 * bl, 0.20, 0.14 + 0.70 * dz])
    hips_e = (lambda P: S.union(hips_base(P), belly_low(P), k=0.06)) if bl > 0.9 else hips_base
    hem_y = pel[1] + 0.04 - (0.13 if bl > 0.9 else 0.0)
    def torso(P):
        hips = hips_e(P)
        sho = S.capsule(P, uaR, uaL, 0.10)
        nek = S.capsule(P, nk + V(0, -0.10, 0), hd + V(0, 0.02, 0), 0.068)
        if bl > 0.9:      # corpulent : un vrai ventre rond sous une poitrine qui reste de largeur normale (les épaules ne bougent pas, elles tiennent les bras)
            bwc = 1 + 0.45 * (bw - 1)
            waist = S.ellipsoid(P, V(0, s2[1], -0.015 + 0.45 * dz), [0.215 * bw * 0.92 + 0.05 * bl, 0.20, 0.16 + 0.5 * dz])
            belly = S.ellipsoid(P, V(0, pel[1] + 0.17, 0.10 + 0.60 * dz), [0.25 * bw * 0.8 + 0.04 * bl, 0.23, 0.14 + 0.66 * dz])
            chest = S.ellipsoid(P, V(0, chest_y, 0.005 + 0.10 * dz), [0.255 * bwc, 0.22, 0.18 + 0.10 * dz])
            return S.union(hips, waist, belly, chest, sho, nek, k=0.11)
        waist = S.ellipsoid(P, V(0, s2[1], -0.015 + 0.5 * dz), [0.215 * bw + 0.1 * bl, 0.20, 0.16 + 0.5 * dz])
        chest = S.ellipsoid(P, V(0, chest_y, 0.005 + 0.2 * dz), [0.255 * bw, 0.22, 0.18 + 0.2 * dz])
        return S.union(hips, waist, chest, sho, nek, k=0.09)
    def arm(P, s):
        ua, la, ha = (uaL, laL, haL) if s > 0 else (uaR, laR, haR)
        return S.union(S.capsule(P, ua, la, 0.092 * br, 0.078 * br), S.capsule(P, la, ha, 0.078 * br, 0.064 * br), k=0.04)
    def hand(P, s, grow=0.0):
        ha = haL if s > 0 else haR; la = laL if s > 0 else laR
        d = ha - la; d /= np.linalg.norm(d); a = ha + d * 0.11 * mn
        palm = S.ellipsoid(P, a, [0.058 * mn + grow, 0.12 * mn + grow, 0.078 * mn + grow], S.rot_from_y(d))
        thumb = S.capsule(P, ha + d * 0.05 + V(0, -0.005, 0.05), ha + d * 0.15 * mn + V(0, -0.02, 0.12), 0.036 * mn + grow, 0.03 * mn + grow)
        return S.union(palm, thumb, k=0.03)
    def leg(P, s):
        th, ca, fo = (thL, caL, foL) if s > 0 else (thR, caR, foR)
        return S.union(S.capsule(P, th, ca, 0.122 * cu, 0.096 * cu), S.capsule(P, ca, fo, 0.096 * cu, 0.076 * cu), k=0.05)
    def body_upper(P): return S.union(torso(P), arm(P, 1), arm(P, -1), k=0.06)
    def hips_legs(P): return S.union(hips_e(P), leg(P, 1), leg(P, -1), k=0.07)
    neck_d = lambda P: S.capsule(P, nk + V(0, -0.05, 0.0), nk + V(0, 0.5, 0.0), 0.0)     # distance à l'axe du cou

    # le bras est en A dans la pose de liaison : les coupes de manches se mesurent le long de l'axe du bras, pas en x
    dL = haL - uaL; L_arm = float(np.linalg.norm(dL)); dL = dL / L_arm; dR = (haR - uaR) / np.linalg.norm(haR - uaR)
    t_arm = lambda P: np.where(P[:, 0] >= 0, (P - uaL) @ dL, (P - uaR) @ dR)
    arm_d = lambda P: np.minimum(S.capsule(P, uaL, haL, 0.0), S.capsule(P, uaR, haR, 0.0))
    Lcuff = L_arm - 0.12; Lsl = 0.20
    cuff_kf = lambda Lc: (lambda P: np.maximum(Lc - t_arm(P), arm_d(P) - 0.17))
    def arm_box(ua, ha): return np.minimum(ua, ha) - 0.25, np.maximum(ua, ha) + 0.25
    zb = (-0.42, 0.50 + dz)
    lo_u, hi_u = box((-0.9, 0.9), (belt_y - 0.15, 2.0), zb)
    hg = 0.031 * hs

    # ---------------------------------------------------------------- peau visible : cou, avant-bras (manches courtes) et mains
    def skin_f(P):
        neck = S.capsule(P, nk + V(0, -0.02, 0), hd + V(0, 0.03, 0), 0.07)
        fore = lambda la, ha: S.capsule(P, la, ha, 0.075 * br, 0.062 * br)
        return S.union(neck, fore(laL, haL), fore(laR, haR), hand(P, 1), hand(P, -1), k=0.03)
    t_skin = (Lsl if short else Lcuff) - 0.04
    b.skinned('peau', 'skin', skin_f, *box((-0.95, 0.95), (0.85, 2.0), (-0.45, 0.45)), 0.024 * hs, kf=mxf(lambda P: t_arm(P) - t_skin, lambda P: yy(P) - (nk[1] - 0.01)))

    # ---------------------------------------------------------------- haut : chemise / veston / pull
    haut = sp['haut']
    if haut in ('chemise', 'pull'):
        shirt_base = lambda P: S.offset(body_upper(P), 0.022 if haut == 'chemise' else 0.03)
        shirt_kf = mnf(cuff_kf(Lsl if short else Lcuff), lambda P: yy(P) - (belt_y - 0.06), lambda P: (nk[1] + 0.06) - yy(P), lambda P: neck_d(P) - 0.076)
        b.skinned('chemise', 'shirt', shirt_base, lo_u, hi_u, hg, kf=shirt_kf)
        if not short and sp['manches'] == 'longues' and haut == 'chemise':      # poignets
            for s, (ua_, ha_) in ((1, (uaL, haL)), (-1, (uaR, haR))):
                cuff_base = lambda P, s=s: S.offset(arm(P, s), 0.03)
                b.skinned('poignet' + ('L' if s > 0 else 'R'), 'shirt2', cuff_base, *arm_box(ua_, ha_), 0.020 * hs, kf=mnf(cuff_kf(Lcuff), lambda P: t_arm(P) - (Lcuff - 0.06)))
    elif haut == 'veston':
        vest_base = lambda P: S.offset(body_upper(P), 0.05)
        y_lo, y_hi = belt_y + 0.03, nk[1] - 0.02
        wedge = lambda P: np.maximum.reduce([xx(P) - (0.025 + 0.095 * np.clip((yy(P) - y_lo) / (y_hi - y_lo), 0, 1)), 0.02 - P[:, 2], y_lo - yy(P)])   # > 0 : hors du V de devant
        kf = mnf(cuff_kf(Lcuff), lambda P: yy(P) - hem_y, lambda P: (nk[1] + 0.06) - yy(P), lambda P: neck_d(P) - 0.088, wedge)
        b.skinned('veston', 'jacket', vest_base, *box((-0.9, 0.9), (pel[1] - 0.15, 2.0), zb), hg, kf=kf)
        # chemise sous le veston : plastron et col
        plast = lambda P: S.offset(torso(P), 0.026)
        b.skinned('plastron', 'collar', plast, *box((-0.5, 0.5), (belt_y - 0.15, 1.95), zb), 0.022 * hs,
                  kf=mnf(lambda P: yy(P) - (belt_y - 0.05), lambda P: (nk[1] + 0.05) - yy(P), lambda P: neck_d(P) - 0.075, lambda P: 0.19 - xx(P), lambda P: P[:, 2] + 0.02))

    # ---------------------------------------------------------------- gilet haute visibilité + rubans rétroréfléchissants
    if sp['gilet']:
        vest_surf = lambda P: S.offset(torso(P), 0.06)
        def vest_kf(P):
            return np.minimum.reduce([yy(P) - (belt_y - 0.02), np.maximum(0.20 - xx(P), 1.66 - yy(P)),
                                      S.capsule(P, uaL + V(-0.06, 0, 0), haL, 0.135), S.capsule(P, uaR + V(0.06, 0, 0), haR, 0.135),
                                      neck_d(P) - 0.135,
                                      S.ellipsoid(P, V(0, chest_y + 0.13, 0.17), [0.115, 0.22, 0.16]), S.ellipsoid(P, V(0, nk[1] + 0.06, -0.05), [0.11, 0.09, 0.14])])
        b.skinned('gilet', 'vest', vest_surf, *box((-0.5, 0.5), (belt_y - 0.12, 1.98), zb), 0.026 * hs, kf=vest_kf, epi='gilet')
        vk = lambda P: vest_kf(P) - 0.006
        decal = lambda m: S.clip_mesh(m, vk, None) if m is not None and len(m.F) else m
        if sp['bandes']:
            ms = []
            for y0 in (belt_y + 0.09, chest_y - 0.085):
                ms.append(decal(S.ribbon(vest_surf, ring_pts(y0, 0.36, 0.32, n=84), 0.032, off=0.006, closed=True, rows=3)))
            for sx in (-1, 1):
                ctrl = [V(sx * 0.10, belt_y + 0.02, 0.34), V(sx * 0.11, belt_y + 0.25, 0.32), V(sx * 0.13, chest_y - 0.02, 0.28), V(sx * 0.15, 1.80, 0.20), V(sx * 0.16, 1.93, 0.05),
                        V(sx * 0.16, 1.92, -0.10), V(sx * 0.14, 1.80, -0.22), V(sx * 0.12, chest_y - 0.02, -0.26), V(sx * 0.10, belt_y + 0.25, -0.24), V(sx * 0.10, belt_y + 0.02, -0.22)]
                ms.append(decal(S.ribbon(vest_surf, spline(ctrl, 6), 0.030, off=0.006, rows=3)))
            b.add_mesh('bandes', 'stripe', S.merge_meshes(*ms), epi='gilet')
        if sp['badge']:
            b.add_mesh('badge', 'badge', decal(S.rect_patch(vest_surf, V(0.14, chest_y + 0.06, 0.40), V(1, 0, 0), V(0, 1, 0), 0.105, 0.075, off=0.008, nu=5, nv=5)), epi='gilet')
        if sp['poches']:
            ms = [decal(S.rect_patch(vest_surf, V(sx * 0.14, belt_y + 0.20, 0.40), V(1, 0, 0), V(0, 1, 0), 0.10, 0.09, off=0.005, nu=4, nv=4)) for sx in (-1, 1)]
            zp = S.ribbon(vest_surf, spline([V(0.0, chest_y + 0.05, 0.40), V(0.0, belt_y + 0.10, 0.40), V(0.0, belt_y, 0.40)], 8), 0.008, off=0.007, rows=2)
            b.add_mesh('poches', 'vest2', S.merge_meshes(*[decal(m) for m in ms], decal(zp)), epi='gilet')

    # ---------------------------------------------------------------- bas
    if sp['bas'] == 'pantalon':
        pants_base = lambda P: S.offset(hips_legs(P), 0.028)
        b.skinned('pantalon', 'pants', pants_base, *box((-0.5, 0.5), (0.2, belt_y + 0.12), zb), hg, kf=mnf(lambda P: (belt_y + 0.04) - yy(P), lambda P: yy(P) - 0.27))
        if sp['poches']:
            ms = []
            for sx in (-1, 1):
                ms.append(S.rect_patch(pants_base, V(sx * 0.19, belt_y - 0.10, 0.22), V(1, 0, 0), V(0, 1, 0), 0.09, 0.12, off=0.005, nu=4, nv=5))
                ms.append(S.rect_patch(pants_base, V(sx * 0.17, belt_y - 0.13, -0.24), V(1, 0, 0), V(0, 1, 0), 0.10, 0.10, off=0.005, nu=4, nv=4))
            b.add_mesh('poches_bas', 'pants2', S.merge_meshes(*ms))
    if sp['ceinture'] and haut != 'veston':
        belt_surf = lambda P: S.offset(torso(P), 0.048)
        b.skinned('ceinture', 'belt', belt_surf, *box((-0.5, 0.5), (belt_y - 0.1, belt_y + 0.1), zb), 0.024 * hs, kf=lambda P: 0.033 - np.abs(yy(P) - belt_y))
        b.add_mesh('boucle', 'metal', S.rect_patch(belt_surf, V(0, belt_y, 0.40), V(1, 0, 0), V(0, 1, 0), 0.075, 0.05, off=0.008, nu=4, nv=4))

    # ---------------------------------------------------------------- chaussures
    def boot(P, s, ville=False):
        th, ca, fo, ba = (thL, caL, foL, baL) if s > 0 else (thR, caR, foR, baR)
        top = 0.20 if not ville else 0.09
        shaft = S.capsule(P, fo + V(0, top, 0.005), fo + V(0, -0.02, 0.0), 0.108 if not ville else 0.098, 0.098)
        heel = S.capsule(P, fo + V(0, -0.06, -0.02), ba + V(0, -0.02, 0.0), 0.095, 0.092)
        toe = S.capsule(P, ba + V(0, -0.02, 0.0), ba + V(0, -0.015, 0.115), 0.092, 0.078)
        return S.smax(S.union(shaft, heel, toe, k=0.06), -yy(P), 0.0)
    ville = sp['chaussures'] == 'ville'
    boots = lambda P: S.union(boot(P, 1, ville), boot(P, -1, ville))
    shoe_f = lambda P: S.smax(boots(P), 0.045 - yy(P), 0.012)
    sole_f = lambda P: S.smax(S.smax(S.offset(boots(P), 0.012), yy(P) - 0.05, 0.004), -yy(P), 0.0)
    blo, bhi = box((-0.5, 0.5), (0.0, 0.5), (-0.2, 0.45))
    b.skinned('bottes', 'shoe', shoe_f, blo, bhi, 0.022 * hs, kf=lambda P: 0.31 - yy(P))
    b.skinned('semelles', 'sole', sole_f, *box((-0.5, 0.5), (0.0, 0.1), (-0.2, 0.45)), 0.024 * hs)
    if 'chaussures' in EPI and not ville:
        def coque_f(P):
            d = None
            for ba in (baL, baR):
                c = S.capsule(P, ba + V(0, -0.02, 0.0), ba + V(0, -0.015, 0.115), 0.092 + 0.010, 0.078 + 0.010)
                d = c if d is None else S.union(d, c)
            return d
        b.skinned('coques', 'toecap', coque_f, *box((-0.5, 0.5), (0.0, 0.3), (0.0, 0.45)), 0.02 * hs,
                  kf=mnf(lambda P: P[:, 2] - (baL[2] - 0.035), lambda P: 0.16 - yy(P)), epi='chaussures')
    # les coques posées sur les bottes ; les lacets sont des rubans en travers du coup-de-pied
    if not ville:
        ms = []
        for s, fo in ((1, foL), (-1, foR)):
            for dz in (0.03, 0.08, 0.13):
                surf = lambda P, s=s: boot(P, s)
                pts = spline([V(fo[0] - 0.08, fo[1] + 0.02 + dz * 0.4, fo[2] + dz + 0.02), V(fo[0], fo[1] + 0.06 + dz * 0.25, fo[2] + dz + 0.02), V(fo[0] + 0.08, fo[1] + 0.02 + dz * 0.4, fo[2] + dz + 0.02)], 5)
                # ruban en travers, collé à la botte
                ms.append(S.ribbon(surf, pts, 0.008, off=0.004, rows=2))
        b.add_mesh('lacets', 'lace', S.clip_mesh(S.merge_meshes(*ms), lambda P: 0.31 - yy(P), None))

    # ---------------------------------------------------------------- gants
    if 'gants' in EPI:
        def gant_f(P): return S.union(hand(P, 1, 0.012), hand(P, -1, 0.012), k=0.0)
        b.skinned('gants', 'glove', gant_f, *box((-0.95, 0.95), (0.8, 1.7), (-0.3, 0.45)), 0.022 * hs, kf=lambda P: t_arm(P) - (Lcuff + 0.02), epi='gants')

    # ---------------------------------------------------------------- harnais antichute
    if 'harnais' in EPI:
        tsurf = lambda P: S.offset(torso(P), 0.078)
        ms = []
        for sx in (-1, 1):
            ctrl = [V(sx * 0.10, belt_y - 0.08, 0.34), V(sx * 0.10, belt_y + 0.14, 0.32), V(sx * 0.12, chest_y - 0.02, 0.28), V(sx * 0.17, 1.78, 0.20), V(sx * 0.19, 1.91, 0.04),
                    V(sx * 0.18, 1.90, -0.10), V(sx * 0.15, 1.78, -0.22), V(sx * 0.12, chest_y - 0.02, -0.26), V(sx * 0.10, belt_y + 0.14, -0.24), V(sx * 0.10, belt_y - 0.08, -0.22)]
            ms.append(S.ribbon(tsurf, spline(ctrl, 7), 0.022, off=0.004, rows=3))
            th = thL if sx > 0 else thR
            ms.append(S.ribbon(lambda P, sx=sx: S.offset(leg(P, sx), 0.04), circle_pts(th + V(0, -0.20, 0), V(1, 0, 0), V(0, 0, 1), 0.2, 36), 0.022, off=0.004, closed=True, rows=3))
        ms.append(S.ribbon(lambda P: S.offset(torso(P), 0.05), ring_pts(belt_y - 0.09, 0.34, 0.3, n=100), 0.024, off=0.004, closed=True, rows=3))
        ms.append(S.ribbon(tsurf, spline([V(-0.13, chest_y + 0.02, 0.34), V(0, chest_y + 0.02, 0.36), V(0.13, chest_y + 0.02, 0.34)], 6), 0.015, off=0.004, rows=2))
        b.add_mesh('harnais', 'harness', S.merge_meshes(*ms), epi='harnais')
        mm = [S.rect_patch(tsurf, V(0, chest_y + 0.02, 0.4), V(1, 0, 0), V(0, 1, 0), 0.06, 0.05, off=0.012, nu=4, nv=4),
              S.rect_patch(tsurf, V(0, belt_y - 0.09, 0.4), V(1, 0, 0), V(0, 1, 0), 0.06, 0.05, off=0.012, nu=4, nv=4)]
        ring = S.build(lambda P: S.torus(P, V(0, chest_y + 0.11, -0.275), 0.035, 0.01, axis=2), V(-0.06, chest_y + 0.05, -0.32), V(0.06, chest_y + 0.17, -0.23), 0.008, smooth=1)
        b.add_mesh('harnais_metal', 'metal', S.merge_meshes(*mm, ring), epi='harnais')

    # ============================================================== tête (pièces rigides sur l'os Head)
    H0 = hd + V(0, 0.30 * ts, 0.03)
    fr, bec = T['front'], T['bec']
    def skull(P):
        cr = S.ellipsoid(P, H0 + V(0, 0.03, -0.01), [0.315 * ts, 0.30 * ts + 0.02 * fr, 0.31 * ts])
        jaw = S.ellipsoid(P, H0 + V(0, -0.125 * ts, 0.04), [0.245 * ts * T['machoire'], 0.185 * ts, 0.265 * ts])
        chin = S.ellipsoid(P, H0 + V(0, -0.235 * ts, 0.10), [0.11 * ts * T['machoire'], 0.07, 0.10])
        cheek = lambda s: S.ellipsoid(P, H0 + V(0.14 * s * ts, -0.06, 0.15), [0.11 * T['joues'], 0.09 * T['joues'], 0.10 * T['joues']])
        ear = lambda s: S.ellipsoid(P, H0 + V(0.315 * s * ts, -0.02, -0.02), [0.045 * T['oreilles'], 0.085 * T['oreilles'], 0.065 * T['oreilles']])
        d = S.union(cr, jaw, chin, cheek(1), cheek(-1), k=0.11)
        return S.union(d, ear(1), ear(-1), k=0.03)
    lo_h, hi_h = H0 + V(-0.55, -0.55, -0.55), H0 + V(0.55, 0.62, 0.55)
    b.rigid('tete', 'skin', skull, lo_h, hi_h, 0.03 * hs)
    nz = T['nez']; ec = T['ecart']; ye = T['yeux']
    nose_c = H0 + V(0, -0.075, 0.305)
    b.rigid('nez', 'nose', lambda P: S.union(S.ellipsoid(P, nose_c + V(0, 0, 0.01 + 0.02 * bec), [0.068 * nz, 0.06 * nz, 0.07 * nz + 0.03 * bec]),
                                             S.capsule(P, H0 + V(0, 0.0, 0.28), nose_c + V(0, 0, 0.01), 0.03, 0.05 * nz), k=0.04), lo_h, hi_h, 0.024)
    for s, nm in ((1, 'L'), (-1, 'R')):
        ce = H0 + V(0.115 * s * ec, -0.005, 0.28)
        b.rigid('eye_' + nm, 'white', lambda P, ce=ce: S.ellipsoid(P, ce, [0.086 * ye, 0.098 * ye, 0.06]), lo_h, hi_h, 0.026, pivot=ce)
        cp = H0 + V(0.117 * s * ec + 0.006 * s, -0.01, 0.318)
        b.rigid('pupil_' + nm, 'pupil', lambda P, cp=cp: S.ellipsoid(P, cp, [0.046 * ye, 0.058 * ye, 0.038]), lo_h, hi_h, 0.018, smooth=1, pivot=cp)
        cl = H0 + V(0.117 * s * ec + 0.026 * s, 0.028, 0.345)
        b.rigid('reflet_' + nm, 'white', lambda P, cl=cl: S.ellipsoid(P, cl, [0.017, 0.017, 0.012]), lo_h, hi_h, 0.01, smooth=1, pivot=cl)
        sb = T['sourcils']
        cb = H0 + V(0.13 * s * ec, 0.135, 0.27)
        b.rigid('brow_' + nm, 'brow', lambda P, s=s, sb=sb, ec=ec: S.capsule(P, H0 + V(0.045 * s * ec, 0.14, 0.285), H0 + V(0.20 * s * ec, 0.15 + 0.012 * (sb - 1), 0.23), 0.026 * sb, 0.019 * sb),
                lo_h, hi_h, 0.018, smooth=1, pivot=cb)
    # bouche : sourire collé au visage, bouche ouverte (criée) en ellipsoïde ; le jeu montre l'un ou l'autre
    mouth_pts = np.array([[H0[0] + 0.115 * np.sin(t), H0[1] - 0.15 + 0.085 * (1 - np.cos(t)), H0[2] + 0.36] for t in np.linspace(-1.0, 1.0, 21)])
    b.add_mesh('mouthS', 'mouth', S.ribbon(skull, mouth_pts, 0.013, off=0.012, rows=3), 'rigid', 'Head')
    mo = S.project(skull, [H0 + V(0, -0.135, 0.34)], 4)[0]
    b.rigid('mouthO', 'mouth', lambda P: S.ellipsoid(P, mo, [0.052, 0.042, 0.022]), lo_h, hi_h, 0.016, smooth=1, pivot=mo)
    if 'chaume' in sp['barbes']:
        b.rigid('barbe', 'stubble', lambda P: S.offset(skull(P), 0.006), lo_h, hi_h, 0.034, smooth=1, epi='barbe:chaume',
                kf=mnf(lambda P: (H0[1] - 0.085) - yy(P), lambda P: P[:, 2] - (H0[2] + 0.06), lambda P: -np.abs(P[:, 0]) + 0.27))
    if 'moustache' in sp['barbes']:
        b.rigid('moustache', 'hair', lambda P: S.union(S.capsule(P, H0 + V(0.0, -0.105, 0.325), H0 + V(0.11, -0.115, 0.29), 0.032, 0.02), S.capsule(P, H0 + V(0.0, -0.105, 0.325), H0 + V(-0.11, -0.115, 0.29), 0.032, 0.02), k=0.02),
                lo_h, hi_h, 0.02, smooth=1, epi='barbe:moustache')

    # cheveux : une pièce par coiffure, le jeu montre celle qu'il veut
    hx = lambda P: P[:, 0] - H0[0]; hy = lambda P: yy(P) - H0[1]; hz = lambda P: P[:, 2] - H0[2]
    def coiffure(style):
        if style == 'coiffe':
            def f(P):
                d = S.offset(skull(P), 0.036)
                d = S.union(d, S.ellipsoid(P, H0 + V(0, 0.30 * ts, 0.06), [0.22, 0.08, 0.2]), k=0.05)
                for s in (1, -1): d = S.union(d, S.ellipsoid(P, H0 + V(0.315 * s * ts, 0.06, -0.06), [0.08, 0.13, 0.12]), k=0.04)
                return d
        elif style in ('courts', 'cotes'): f = lambda P: S.offset(skull(P), 0.032)
        elif style == 'ras': f = lambda P: S.offset(skull(P), 0.012)
        else:
            def f(P):
                d = S.offset(skull(P), 0.055)
                if style == 'longs': d = S.union(d, S.capsule(P, H0 + V(0, -0.1, -0.22), H0 + V(0, -0.62, -0.22), 0.20, 0.13), S.capsule(P, H0 + V(0.24, -0.1, -0.05), H0 + V(0.25, -0.5, -0.12), 0.07, 0.06),
                                                S.capsule(P, H0 + V(-0.24, -0.1, -0.05), H0 + V(-0.25, -0.5, -0.12), 0.07, 0.06), k=0.05)
                if style == 'chignon': d = S.union(d, S.sphere(P, H0 + V(0, 0.36, -0.15), 0.13), k=0.05)
                return d
        face_hole = lambda P: S.ellipsoid(P, H0 + V(0, -0.05, 0.22), [0.27, 0.27, 0.16])
        if style == 'courts':   kfh = mnf(lambda P: hy(P) + 0.16, mxf(lambda P: hy(P) - 0.20 + 0.25 * (hz(P) - 0.25), lambda P: 0.06 - hz(P)))
        elif style == 'ras':    kfh = mnf(lambda P: hy(P) + 0.05, mxf(lambda P: hy(P) - 0.22, lambda P: 0.04 - hz(P)))
        elif style == 'coiffe': kfh = mnf(lambda P: hy(P) + 0.14, mxf(lambda P: hy(P) - 0.19 + 0.25 * (hz(P) - 0.25), lambda P: 0.02 - hz(P)))
        elif style == 'cotes':  kfh = mnf(lambda P: hy(P) + 0.15, lambda P: 0.16 - hy(P), lambda P: 0.05 - hz(P))
        elif style in ('carre', 'longs'): kfh = mnf(lambda P: hy(P) + (0.30 if style == 'carre' else 0.62), mxf(lambda P: hy(P) - 0.17 + 0.35 * (hz(P) - 0.25), lambda P: 0.10 - hz(P)), face_hole)
        else:                   kfh = mnf(lambda P: hy(P) + 0.05, mxf(lambda P: hy(P) - 0.16 + 0.3 * (hz(P) - 0.25), lambda P: 0.1 - hz(P)), face_hole)
        return f, kfh
    for style in sp['coiffures']:
        f, kfh = coiffure(style)
        b.rigid('cheveux_' + style, 'hair', f, H0 + V(-0.6, -0.8, -0.6), H0 + V(0.6, 0.65, 0.6), 0.034 * hs, kf=kfh, epi='cheveux:' + style)

    # lunettes de vue (commutables)
    if sp['lunettes_vue']:
        r0 = 0.115; zl = H0[2] + 0.345
        rings = [S.tube(circle_pts(V(H0[0] + s * 0.117 * ec, H0[1] - 0.005, zl), V(1, 0, 0), V(0, 1, 0), r0, 26), 0.010, 6, closed=True) for s in (1, -1)]
        bridge = S.tube(spline([V(H0[0] - 0.117 * ec + r0, H0[1] + 0.02, zl), V(H0[0], H0[1] + 0.04, zl + 0.008), V(H0[0] + 0.117 * ec - r0, H0[1] + 0.02, zl)], 4), 0.010, 6)
        arms = [S.tube(spline([V(H0[0] + s * (0.117 * ec + r0), H0[1] + 0.02, zl - 0.01), V(H0[0] + s * 0.30, H0[1] + 0.03, H0[2] + 0.12), V(H0[0] + s * 0.325, H0[1] + 0.02, H0[2] - 0.04)], 5), 0.008, 5) for s in (1, -1)]
        b.add_mesh('lunettes_vue', 'frame', S.merge_meshes(*rings, bridge, *arms), 'rigid', 'Head', epi='lunettes_vue')
    if sp['cils']:
        cl = []
        for s in (1, -1):
            for k, (dx, dy) in enumerate(((0.05, 0.10), (0.095, 0.105), (0.14, 0.09))):
                a = V(H0[0] + s * (0.117 * ec + dx - 0.09 + 0.04), H0[1] + dy, H0[2] + 0.30); q = a + V(s * 0.03, 0.035, 0.02)
                cl.append(S.tube([a, q], 0.006, 4))
        b.add_mesh('cils', 'brow', S.merge_meshes(*cl), 'rigid', 'Head')

    # cravate et cigare
    if sp['cravate']:
        tie_surf = lambda P: S.offset(torso(P), 0.03)
        knot = S.rect_patch(tie_surf, V(0, nk[1] - 0.06, 0.38), V(1, 0, 0), V(0, 1, 0), 0.06, 0.05, off=0.012, nu=4, nv=4)
        blade = S.ribbon(tie_surf, spline([V(0, nk[1] - 0.09, 0.40), V(0, chest_y, 0.42 + 0.2 * dz), V(0, belt_y + 0.10, 0.44 + dz)], 8), 0.034, off=0.010, rows=3)
        b.add_mesh('cravate', 'tie', S.merge_meshes(knot, blade), epi='cravate')
    if sp['boutons'] or sp['medailles']:
        jac = lambda P: S.offset(body_upper(P), 0.05)
        def stud(pt, r, off=0.006, bulge=0.008, nt=14):
            c = S.project(jac, np.array([pt], float), 6)[0]; n = S.gradient(jac, c[None])[0]
            u = np.cross(n, [0, 1, 0]);
            if np.linalg.norm(u) < 1e-3: u = np.cross(n, [1, 0, 0])
            u /= np.linalg.norm(u); v = np.cross(n, u)
            return S.disc(c + n * off, u, v, r, r, 2, nt, bulge)
        if sp['boutons']:
            b.add_mesh('boutons', 'gold', S.merge_meshes(*[stud(V(sx * 0.10, y, 0.33 + 0.4 * dz * (1 if y < chest_y - 0.2 else 0.3)), 0.022) for sx in (-1, 1) for y in (chest_y - 0.16, chest_y - 0.30, chest_y - 0.44)]))
        if sp['medailles']:
            b.add_mesh('medailles', 'gold', S.merge_meshes(stud(V(0.16, chest_y + 0.10, 0.30), 0.035, bulge=0.012), stud(V(0.24, chest_y + 0.08, 0.26), 0.028, bulge=0.010)))
            b.add_mesh('medailles_rub', 'tie', S.merge_meshes(stud(V(0.20, chest_y + 0.04, 0.30), 0.03, bulge=0.010), stud(V(0.12, chest_y + 0.03, 0.31), 0.025, bulge=0.010)))
    if sp['cigare']:
        b.rigid('cigar', 'cigar', lambda P: S.capsule(P, H0 + V(0.05, -0.135, 0.32), H0 + V(0.26, -0.20, 0.46), 0.03), lo_h, hi_h, 0.012, smooth=1)
        b.rigid('ember', 'ember', lambda P: S.sphere(P, H0 + V(0.27, -0.205, 0.47), 0.033), lo_h, hi_h, 0.01, smooth=1)

    # ---------------------------------------------------------------- casque de chantier (EPI)
    if sp['casque'] == 'chantier':
        c = H0 + V(0, 0.13 * ts, -0.02 * ts); rx, ry, rz = 0.345 * ts, 0.30 * ts, 0.37 * ts
        def dome(P):
            d = S.ellipsoid(P, c, [rx, ry, rz])
            return S.smax(d, (H0[1] + 0.14 * ts + 0.14 * (P[:, 2] - H0[2])) - P[:, 1], 0.012)
        def ridge(P):
            zs = np.array([0.27, 0.13, 0.0, -0.14, -0.28]); ys = c[1] + ry * np.sqrt(np.maximum(1 - ((zs + 0.02 * ts) / rz) ** 2, 0)) - 0.014
            return poly_capsule(P, [V(0, ys[i], H0[2] + zs[i]) for i in range(len(zs))], 0.032, k=0.02)
        th = 0.16; Rt = np.array([[1, 0, 0], [0, np.cos(th), np.sin(th)], [0, -np.sin(th), np.cos(th)]])
        def hat_f(P):
            d = S.union(dome(P), ridge(P), k=0.035)
            return S.union(d, S.ellipsoid(P, H0 + V(0, 0.2 * ts, 0.345 * ts), [0.215 * ts, 0.03, 0.105], Rt), k=0.02)
        b.rigid('casque', 'hat', hat_f, H0 + V(-0.55, -0.3, -0.5), H0 + V(0.55, 0.66, 0.65), 0.03 * hs, epi='casque')
        # jugulaire : sangle collée au visage
        js = []
        for s in (1, -1):
            js.append(S.ribbon(skull, spline([H0 + V(0.285 * s * ts, 0.11, 0.02), H0 + V(0.27 * s * ts, -0.02, 0.06), H0 + V(0.22 * s * ts, -0.16, 0.12), H0 + V(0.12 * s * ts, -0.285, 0.15)], 6), 0.008, off=0.006, rows=2))
        js.append(S.ribbon(skull, spline([H0 + V(0.12, -0.285, 0.15), H0 + V(0.0, -0.305, 0.19), H0 + V(-0.12, -0.285, 0.15)], 6), 0.008, off=0.006, rows=2))
        b.add_mesh('jugulaire', 'strap', S.merge_meshes(*js), 'rigid', 'Head', epi='casque')
    elif sp['casque'] == 'casquette':
        c = H0 + V(0, 0.10, -0.02)
        def cas_f(P):
            d = S.smax(S.ellipsoid(P, c, [0.34 * ts, 0.28 * ts, 0.36 * ts]), (H0[1] + 0.13 + 0.10 * (P[:, 2] - H0[2])) - P[:, 1], 0.012)
            return S.union(d, S.ellipsoid(P, H0 + V(0, 0.13, 0.33), [0.22, 0.018, 0.16], np.array([[1, 0, 0], [0, 0.99, 0.14], [0, -0.14, 0.99]])), k=0.02)
        b.rigid('casquette', 'hat', cas_f, H0 + V(-0.55, -0.3, -0.5), H0 + V(0.55, 0.65, 0.65), 0.03 * hs, epi='casque')

    # ---------------------------------------------------------------- lunettes de protection et casque antibruit (EPI)
    if 'lunettes' in EPI:
        ecx = 0.117 * ec; r0 = 0.122; zg = H0[2] + 0.362
        rings = []
        for s in (1, -1):
            rings.append(S.tube(circle_pts(V(H0[0] + s * ecx, H0[1] - 0.005, zg), V(1, 0, 0), V(0, 1, 0), r0, 28), 0.014, 6, closed=True))
        bridge = S.tube(spline([V(H0[0] - ecx + r0, H0[1] + 0.0, zg), V(H0[0], H0[1] + 0.02, zg + 0.012), V(H0[0] + ecx - r0, H0[1] + 0.0, zg)], 4), 0.014, 6)
        strap_ctrl = [V(H0[0] + 0.235, H0[1] + 0.0, H0[2] + 0.29), V(H0[0] + 0.335, H0[1] + 0.05, H0[2] + 0.10), V(H0[0] + 0.335, H0[1] + 0.075, H0[2] - 0.12), V(H0[0] + 0.18, H0[1] + 0.075, H0[2] - 0.31),
                      V(H0[0], H0[1] + 0.075, H0[2] - 0.345), V(H0[0] - 0.18, H0[1] + 0.075, H0[2] - 0.31), V(H0[0] - 0.335, H0[1] + 0.075, H0[2] - 0.12), V(H0[0] - 0.335, H0[1] + 0.05, H0[2] + 0.10), V(H0[0] - 0.235, H0[1] + 0.0, H0[2] + 0.29)]
        strap = S.tube(spline(strap_ctrl, 6), 0.012, 6)
        b.add_mesh('lunettes', 'frame', S.merge_meshes(*rings, bridge, strap), 'rigid', 'Head', epi='lunettes')
        lens = [S.disc(V(H0[0] + s * ecx, H0[1] - 0.005, zg + 0.004), V(1, 0, 0), V(0, 1, 0), r0 - 0.004, r0 + 0.004, 3, 24, 0.018) for s in (1, -1)]
        b.add_mesh('verres', 'lens', S.merge_meshes(*lens), 'rigid', 'Head', epi='lunettes')
    if 'auditive' in EPI:
        def muff_f(P):
            d = None
            for s in (1, -1):
                cup = S.ellipsoid(P, H0 + V(0.385 * s * ts, -0.02, -0.02), [0.085, 0.13, 0.115])
                d = cup if d is None else S.union(d, cup)
                d = S.union(d, S.capsule(P, H0 + V(0.37 * s * ts, 0.09, -0.02), H0 + V(0.33 * s * ts, 0.24, -0.02), 0.022), k=0.02)
            return d
        b.rigid('antibruit', 'muff', muff_f, lo_h, hi_h, 0.024, epi='auditive')

    path = os.path.join(out, nom + '.glb')
    b.save(path, extras={'hauteur': float(H0[1] + 0.45), 'centreTete': [float(x) for x in H0], 'visibles': vis, 'epiListe': sorted(EPI)})

# ======================================================================================================================
AUTRES = dict(gilet=True, bandes=True, badge=True)
KIT_HOMME = dict(coiffures=('courts', 'ras', 'coiffe', 'cotes'), barbes=('chaume', 'moustache'), lunettes_vue=True, cravate=True, epi=('casque', 'gilet', 'chaussures', 'lunettes', 'gants'),
                 visibles=('cheveux:courts',))
PERSOS = {
    'dylan': (dict(tete=dict(nez=1.12, bec=1.0)), 0),   # le nez un peu proéminent de l'ancien Dylan
    # figurants : trois corps, tout le reste (coiffure, barbe, lunettes, cravate, casque, gilet) est commutable et se recolore par palette
    'homme': (dict(KIT_HOMME), 1),
    'femme': (dict(build=dict(largeur=0.9, cuisse=0.94, bras=0.9, main=0.9, taille=0.98), tete=dict(machoire=0.86, joues=0.92, yeux=1.1, nez=0.82, sourcils=0.8, taille=0.98),
                   coiffures=('carre', 'longs', 'chignon', 'courts'), barbes=(), lunettes_vue=True, cils=True, cravate=False, epi=('casque', 'gilet', 'chaussures', 'lunettes', 'gants'),
                   visibles=('cheveux:carre',)), 1),
    'costaud': (dict(build=dict(largeur=1.12, ventre=0.45, cuisse=1.1, bras=1.08, main=1.06), tete=dict(machoire=1.1, joues=1.25, nez=1.25, taille=1.02),
                     coiffures=('cotes', 'coiffe', 'courts', 'ras'), barbes=('chaume', 'moustache'), lunettes_vue=True, cravate=True, epi=('casque', 'gilet', 'chaussures', 'lunettes', 'gants'),
                     visibles=('cheveux:cotes',)), 1),
    'aurelien': (dict(build=dict(largeur=1.42, ventre=0.9, cuisse=1.22, bras=1.18, main=1.1, taille=0.97), tete=dict(machoire=1.32, joues=1.75, nez=1.6, sourcils=1.5, taille=1.08),
                      haut='veston', gilet=False, badge=False, bandes=False, chaussures='ville', coiffures=('coiffe',), barbes=('moustache',), cravate=True, cigare=True, boutons=True, medailles=True,
                      casque='aucun', epi=(), poches=False, visibles=('cheveux:coiffe', 'barbe:moustache', 'cravate')), 1),
    'bernard': (dict(build=dict(largeur=1.1, ventre=0.4, cuisse=1.06, bras=1.06), tete=dict(machoire=1.08, joues=1.2, nez=1.4, sourcils=1.3, taille=1.02), manches='courtes', gilet=False, badge=False, bandes=False,
                     coiffures=('cotes',), barbes=('chaume',), epi=('casque', 'chaussures'), visibles=('casque', 'cheveux:cotes', 'barbe:chaume')), 1),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lod = int(sys.argv[sys.argv.index('--lod') + 1]) if '--lod' in sys.argv else 0
    args = [a for a in args if a not in ('0', '1')]
    for k in (args or list(PERSOS)):
        spec, lod_defaut = PERSOS[k]
        t = time.time(); fabriquer(k, spec, lod=(lod if '--lod' in sys.argv else lod_defaut)); print('  (%.0f s)' % (time.time() - t))
