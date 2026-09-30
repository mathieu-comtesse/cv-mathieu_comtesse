"""Paquet d'animations du jeu : sélection de clips de la Universal Animation Library (Quaternius, CC0), réduits aux os des personnages
   (sans doigts), rotations seules + translation du bassin. Sortie : assets/talas/persos/anims.glb (squelette + animations).
   Les clips d'armes (pistolet, épée, sorts) sont volontairement écartés : le jeu parle de sécurité au travail.
   Usage : python pack_anims.py"""
import os, sys, json
import numpy as np
from skel import Skel, KEEP
from glbwrite import GLB
from ual import UAL

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'assets', 'talas', 'persos', 'anims.glb'))
CLIPS = ['A_TPose', 'Idle_Loop', 'Idle_Talking_Loop', 'Idle_Torch_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop',
         'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Roll', 'Interact', 'PickUp_Table', 'Push_Loop', 'Punch_Cross', 'Punch_Jab', 'Hit_Chest', 'Hit_Head', 'Death01', 'Dance_Loop',
         'Sitting_Enter', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Sitting_Exit', 'Fixing_Kneeling', 'Driving_Loop', 'Swim_Fwd_Loop', 'Swim_Idle_Loop']

def stride_speed(u, sk, clip):
    """Vitesse d'avance (m/s, repère UAL) estimée d'après le pied qui glisse vers l'arrière pendant l'appui."""
    n = len(u.clips[clip]['pelvis']['rotation'][0]); dt = u.clips[clip]['pelvis']['rotation'][0][1] - u.clips[clip]['pelvis']['rotation'][0][0]
    pos = []
    for k in range(n):
        rq, tt = u.sample(clip, k)
        P, Q = u.fk(rq, tt); pos.append((P[u.index('foot_l')], P[u.index('foot_r')]))
    pos = np.array(pos)  # (n, 2, 3)
    best = 0
    for f in (0, 1):
        y = pos[:, f, 1]; z = pos[:, f, 2]
        low = y < np.percentile(y, 35)
        vz = -(np.diff(z)) / dt
        best = max(best, float(np.mean(vz[low[:-1]])))
    return best

def main():
    u = UAL(os.path.join(HERE, 'src', 'UAL1_Standard.glb')); sk = Skel(ual=u)
    g = GLB(); node_of = {}
    for i, nm in enumerate(sk.names): node_of[i] = g.node(nm, t=u.rest_t[u.index(nm)], q=sk.rest_q[i])
    for i in range(sk.n):
        if sk.parent[i] >= 0: g.nodes[node_of[sk.parent[i]]].setdefault('children', []).append(node_of[i])
    g.scene_nodes = [node_of[0]]
    meta = {'pelvisRepos': [float(x) for x in u.rest_t[u.index('pelvis')]], 'clips': {}}
    for c in CLIPS:
        if c not in u.clips: print('absent', c); continue
        ch = []
        for i, nm in enumerate(sk.names):
            if nm == 'root': continue
            tr = u.clips[c].get(nm)
            if not tr: continue
            t, q = tr['rotation']
            ch.append((node_of[i], 'rotation', t - t[0], q))
            if nm == 'pelvis' and 'translation' in tr: ch.append((node_of[i], 'translation', t - t[0], tr['translation'][1]))
        g.animation(c, ch)
        dur = float(u.clips[c]['pelvis']['rotation'][0][-1] - u.clips[c]['pelvis']['rotation'][0][0])
        meta['clips'][c] = {'duree': round(dur, 3)}
        if c in ('Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'):
            meta['clips'][c]['vitesse'] = round(stride_speed(u, sk, c), 2)
    size = g.save(OUT, extras=meta)
    print('paquet :', OUT, '%.0f Ko' % (size / 1024)); print(json.dumps(meta['clips'], ensure_ascii=False))

if __name__ == '__main__':
    main()
