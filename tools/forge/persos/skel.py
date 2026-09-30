"""Squelette des personnages du Village Talas = squelette de la Universal Animation Library (mêmes noms, mêmes rotations de repos)
   sans les doigts, avec des proportions de dessin animé (multiplicateurs sur les longueurs d'os) et des poids de skinning analytiques."""
import os
import numpy as np
from ual import UAL, qmul, qmat, qrot, qconj

HERE = os.path.dirname(os.path.abspath(__file__))
UAL_PATH = os.path.join(HERE, 'src', 'UAL1_Standard.glb')

KEEP = ['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
        'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r',
        'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r']

# proportions : facteur appliqué au décalage de repos de l'os par rapport à son parent
PROPORTIONS = {
    'pelvis': 1.20,                                   # hauteur des hanches
    'spine_01': 1.20, 'spine_02': 1.20, 'spine_03': 1.20, 'neck_01': 1.30, 'Head': 1.30,
    'clavicle_l': 1.25, 'clavicle_r': 1.25, 'upperarm_l': 1.20, 'upperarm_r': 1.20, 'lowerarm_l': 1.25, 'lowerarm_r': 1.25, 'hand_l': 1.25, 'hand_r': 1.25,
    'thigh_l': 1.75, 'thigh_r': 1.75, 'calf_l': 1.12, 'calf_r': 1.12, 'foot_l': 1.12, 'foot_r': 1.12, 'ball_l': 1.15, 'ball_r': 1.15,
}

# segment de chaque os pour les poids : (os d'arrivée ou décalage), rayon nominal du membre
SEGMENTS = {
    'pelvis': ('spine_01', 0.17), 'spine_01': ('spine_02', 0.16), 'spine_02': ('spine_03', 0.17), 'spine_03': ('neck_01', 0.19), 'neck_01': ('Head', 0.07), 'Head': ((0, 0.30, 0.02), 0.30),
    'clavicle_l': ('upperarm_l', 0.08), 'upperarm_l': ('lowerarm_l', 0.08), 'lowerarm_l': ('hand_l', 0.07), 'hand_l': ('#dir', 0.07),
    'clavicle_r': ('upperarm_r', 0.08), 'upperarm_r': ('lowerarm_r', 0.08), 'lowerarm_r': ('hand_r', 0.07), 'hand_r': ('#dir', 0.07),
    'thigh_l': ('calf_l', 0.12), 'calf_l': ('foot_l', 0.09), 'foot_l': ('ball_l', 0.08), 'ball_l': ((0, 0, 0.10), 0.06),
    'thigh_r': ('calf_r', 0.12), 'calf_r': ('foot_r', 0.09), 'foot_r': ('ball_r', 0.08), 'ball_r': ((0, 0, 0.10), 0.06),
}

class Skel:
    def __init__(self, props=None, ual=None, apose=55):
        self.u = ual or UAL(UAL_PATH)
        u = self.u
        self.names = KEEP
        self.n = len(KEEP)
        idx = [u.index(nm) for nm in KEEP]
        self.parent = []
        for nm in KEEP:
            p = u.parent[u.index(nm)]
            while p >= 0 and u.names[p] not in KEEP: p = u.parent[p]
            self.parent.append(KEEP.index(u.names[p]) if p >= 0 else -1)
        pr = dict(PROPORTIONS); pr.update(props or {})
        self.mult = np.array([pr.get(nm, 1.0) for nm in KEEP])
        self.rest_q = u.rest_q[idx].copy()
        self.rest_t = u.rest_t[idx] * self.mult[:, None]
        self.children = [[j for j in range(self.n) if self.parent[j] == i] for i in range(self.n)]
        # pose de liaison en A : les bras du maillage sont modelés à `apose` degrés sous l'horizontale, ce qui divise par deux la déformation
        # aux aisselles quand les clips (bras le long du corps) s'appliquent. Les nœuds gardent la pose de repos T de la bibliothèque : les clips
        # sont des rotations locales absolues, ils s'appliquent donc tels quels ; seul l'inverse de liaison change.
        self.P_T, self.Q_T = self.fk()
        rq_b = self.rest_q.copy()
        if apose:
            for nm, sgn in (('upperarm_l', -1), ('upperarm_r', 1)):
                i = KEEP.index(nm); p = self.parent[i]; ph = np.radians(apose) * sgn
                Rw = np.array([0.0, 0.0, np.sin(ph / 2), np.cos(ph / 2)])
                rq_b[i] = qmul(qconj(self.Q_T[p]), qmul(Rw, qmul(self.Q_T[p], self.rest_q[i])))
        self.apose = apose
        self.P, self.Q = self.fk(rq_b)
        self.bind = np.zeros((self.n, 4, 4)); self.inv_bind = np.zeros((self.n, 4, 4))
        for i in range(self.n):
            M = np.eye(4); M[:3, :3] = qmat(self.Q[i]); M[:3, 3] = self.P[i]; self.bind[i] = M; self.inv_bind[i] = np.linalg.inv(M)
        self._segments()

    def fk(self, rq=None, tt=None):
        rq = self.rest_q if rq is None else rq; tt = self.rest_t if tt is None else tt
        P = np.zeros((self.n, 3)); Q = np.zeros((self.n, 4)); Q[:, 3] = 1
        for i in range(self.n):
            p = self.parent[i]
            if p < 0: P[i] = tt[i]; Q[i] = rq[i]
            else: P[i] = P[p] + qrot(Q[p], tt[i]); Q[i] = qmul(Q[p], rq[i])
        return P, Q

    def J(self, nm): return self.P[self.names.index(nm)].copy()

    def _segments(self):
        """Segments (a,b) et rayons des os pour les poids, dans la pose de repos."""
        A = []; B = []; R = []; self.wbones = []
        for nm, (end, r) in SEGMENTS.items():
            i = self.names.index(nm); a = self.P[i]
            if isinstance(end, str) and end.startswith('#'):  # main : prolonge la direction de l'avant-bras
                fa = self.P[self.names.index(nm.replace('hand', 'lowerarm'))]; d = a - fa; d /= np.linalg.norm(d); b = a + d * 0.16
            elif isinstance(end, str): b = self.P[self.names.index(end)]
            else: b = a + np.array(end)
            A.append(a); B.append(b); R.append(r); self.wbones.append(i)
        self.segA = np.array(A); self.segB = np.array(B); self.segR = np.array(R); self.wbones = np.array(self.wbones)
        # voisinage autorisé : l'os, son parent, ses enfants (racine exclue)
        nb = len(self.wbones); pos = {int(b): k for k, b in enumerate(self.wbones)}
        allow = np.zeros((nb, nb), bool)
        for k, b in enumerate(self.wbones):
            allow[k, k] = True
            p = self.parent[b]
            if p in pos: allow[k, pos[p]] = True
            for c in self.children[b]:
                if c in pos: allow[k, pos[c]] = True
        self.allow = allow

    def weights(self, V, tau=0.045, max_infl=4):
        """Poids de skinning analytiques : distance à la surface du membre le plus proche, mélange doux le long de la chaîne d'os."""
        V = np.asarray(V, float); n = len(V); nb = len(self.wbones)
        E = np.zeros((n, nb))
        for k in range(nb):
            a, b = self.segA[k], self.segB[k]; ab = b - a
            t = np.clip(((V - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
            d = np.linalg.norm(V - (a + t[:, None] * ab), axis=1)
            E[:, k] = d - self.segR[k]
        near = np.argmin(E, axis=1)
        allowed = self.allow[near]
        emin = E[np.arange(n), near]
        W = np.exp(-(E - emin[:, None]) / tau) * allowed
        # garde les max_infl plus forts
        order = np.argsort(-W, axis=1)[:, :max_infl]
        Wk = np.take_along_axis(W, order, axis=1)
        Wk = Wk / np.maximum(Wk.sum(axis=1, keepdims=True), 1e-12)
        J = self.wbones[order]
        return J.astype(np.uint8), Wk.astype(np.float32)

if __name__ == '__main__':
    s = Skel()
    for nm in ['pelvis', 'spine_03', 'neck_01', 'Head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'thigh_l', 'calf_l', 'foot_l', 'ball_l']:
        print(nm.ljust(11), np.round(s.J(nm), 3))
