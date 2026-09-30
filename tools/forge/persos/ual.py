"""Lecture du squelette et des animations de la Universal Animation Library (Quaternius, CC0) :
   UAL1_Standard.glb -> noms d'os, hiérarchie, pose de repos locale, clips (rotations par os, translation du bassin).
   Sert à (1) modeler des personnages au bon endroit autour du squelette, (2) fabriquer le paquet d'animations du jeu."""
import struct, json
import numpy as np

def _acc(j, bin_, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    ct = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(bin_, dtype=ct, count=a['count'] * n, offset=off).reshape(a['count'], n).astype(np.float64)

def qmul(a, b):
    x1, y1, z1, w1 = a; x2, y2, z2, w2 = b
    return np.array([w1*x2 + x1*w2 + y1*z2 - z1*y2, w1*y2 - x1*z2 + y1*w2 + z1*x2, w1*z2 + x1*y2 - y1*x2 + z1*w2, w1*w2 - x1*x2 - y1*y2 - z1*z2])

def qmat(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])

def qconj(q): return np.array([-q[0], -q[1], -q[2], q[3]])

def qrot(q, v):  # applique le quaternion q au vecteur v
    return qmat(q) @ v

class UAL:
    def __init__(self, path):
        d = open(path, 'rb').read()
        cl, _ = struct.unpack('<II', d[12:20]); self.j = j = json.loads(d[20:20+cl])
        bl = struct.unpack('<I', d[20+cl:24+cl])[0]; self.bin = d[28+cl:28+cl+bl]
        nodes = j['nodes']; skin = j['skins'][0]
        self.names = [nodes[i]['name'] for i in skin['joints']]
        self.node_of = {nodes[i]['name']: i for i in skin['joints']}
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get('children', []): parent[c] = i
        self.parent = [self.names.index(nodes[parent[i]]['name']) if (i in parent and nodes[parent[i]].get('name') in self.names) else -1 for i in skin['joints']]
        self.rest_t = np.array([nodes[i].get('translation', [0, 0, 0]) for i in skin['joints']], float)
        self.rest_q = np.array([nodes[i].get('rotation', [0, 0, 0, 1]) for i in skin['joints']], float)
        self.clips = {}
        for a in j['animations']:
            tr = {}
            for ch in a['channels']:
                nm = nodes[ch['target']['node']]['name']; path = ch['target']['path']; s = a['samplers'][ch['sampler']]
                tr.setdefault(nm, {})[path] = (_acc(j, self.bin, s['input'])[:, 0], _acc(j, self.bin, s['output']))
            self.clips[a['name']] = tr

    def index(self, name): return self.names.index(name)

    def fk(self, rq=None, tt=None):
        """Cinématique directe : positions et rotations monde des os. rq/tt : rotations/translations locales (par défaut le repos)."""
        n = len(self.names); rq = self.rest_q if rq is None else rq; tt = self.rest_t if tt is None else tt
        P = np.zeros((n, 3)); Q = np.zeros((n, 4)); Q[:, 3] = 1
        for i in range(n):
            p = self.parent[i]
            if p < 0: P[i] = tt[i]; Q[i] = rq[i]
            else: P[i] = P[p] + qrot(Q[p], tt[i]); Q[i] = qmul(Q[p], rq[i])
        return P, Q

    def sample(self, clip, k):
        """Rotations locales (n,4) et translations locales à l'image k du clip (le repos si l'os n'a pas de piste)."""
        rq = self.rest_q.copy(); tt = self.rest_t.copy()
        for i, nm in enumerate(self.names):
            t = self.clips[clip].get(nm)
            if not t: continue
            if 'rotation' in t: rq[i] = t['rotation'][1][min(k, len(t['rotation'][1]) - 1)]
            if 'translation' in t: tt[i] = t['translation'][1][min(k, len(t['translation'][1]) - 1)]
        return rq, tt

if __name__ == '__main__':
    import sys
    u = UAL(sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\pihan\AppData\Local\Temp\ual\UAL1.glb')
    P, Q = u.fk()
    print('os', len(u.names), 'avec parent', sum(p >= 0 for p in u.parent))
    for nm in ['root', 'pelvis', 'spine_01', 'spine_03', 'neck_01', 'Head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'ball_leaf_l']:
        print(nm.ljust(12), np.round(P[u.index(nm)], 3))
