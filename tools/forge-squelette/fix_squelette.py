"""Finition du GLB du squelette (python, numpy) :  python fix_squelette.py <homme.glb> <brut.glb> <sortie.glb>
- remet les repos exacts des os de homme.glb (Blender recalcule le roulis de certains os : les clips d'animation tourneraient autour d'un autre axe) ;
- reprend les matrices de liaison de homme.glb (la pose de liaison des bras n'est pas la pose de repos : les clips sont faits pour elle), et calcule celle de jaw ;
- nettoie les noms de matériaux (rôles) et pose les extras lus par TALAS_PERSO (pièces amovibles : casque, cravate)."""
import json, struct, sys, re
import numpy as np

def lire(p):
    d = open(p, 'rb').read(); l = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + l]); off = 20 + l; bl = struct.unpack('<I', d[off:off + 4])[0]
    return j, bytearray(d[off + 8:off + 8 + bl])

def trs(n):
    t = np.array(n.get('translation', [0, 0, 0]), float); x, y, z, w = n.get('rotation', [0, 0, 0, 1]); s = np.array(n.get('scale', [1, 1, 1]), float)
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t; return M

A, _ = lire(sys.argv[1]); B, bin_ = lire(sys.argv[2]); OUT = sys.argv[3]
na = {n['name']: n for n in A['nodes']}
for n in B['nodes']:
    if n['name'] in na and n['name'] != 'jaw' and 'mesh' not in n:
        for k in ('translation', 'rotation', 'scale'):
            if k in na[n['name']]: n[k] = na[n['name']][k]
            elif k in n: del n[k]
parent = {}
for i, n in enumerate(B['nodes']):
    for c in n.get('children', []): parent[c] = i
def monde(i):
    M = trs(B['nodes'][i]); return monde(parent[i]) @ M if i in parent else M
skin = B['skins'][0]; ibm_acc = B['accessors'][skin['inverseBindMatrices']]; bv = B['bufferViews'][ibm_acc['bufferView']]
off = bv.get('byteOffset', 0) + ibm_acc.get('byteOffset', 0)
ia_acc = A['accessors'][A['skins'][0]['inverseBindMatrices']]; iv = A['bufferViews'][ia_acc['bufferView']]
A_bin = lire(sys.argv[1])[1]; a_off = iv.get('byteOffset', 0) + ia_acc.get('byteOffset', 0)
a_ibm = {A['nodes'][ji]['name']: bytes(A_bin[a_off + k * 64:a_off + (k + 1) * 64]) for k, ji in enumerate(A['skins'][0]['joints'])}
for k, ji in enumerate(skin['joints']):
    nom = B['nodes'][ji]['name']
    bin_[off + k * 64:off + (k + 1) * 64] = a_ibm[nom] if nom in a_ibm else np.linalg.inv(monde(ji)).T.astype('<f4').tobytes()
print('os liés :', len(skin['joints']))
COUL = {'bone': '#f1ecda', 'bone2': '#cfc7a8', 'socket': '#16121c', 'pupil': '#ffd66b', 'tooth': '#ffffff', 'hat': '#ffd43b', 'strap': '#2b2b2b', 'tie': '#e03131', 'badge': '#fffaf0'}
for m in B['materials']:
    m['name'] = re.sub(r'\.\d+$', '', m['name'])
    h = COUL[m['name']]   # le jeu lit baseColorFactor tel quel (sRGB direct), comme les autres modèles du village
    m['pbrMetallicRoughness'] = {'baseColorFactor': [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)] + [1.0], 'metallicFactor': 0, 'roughnessFactor': 1}
for m in B['meshes']:
    for p in m['primitives']: pass
E = A['extras']
B['extras'] = {'hauteur': E['hauteur'], 'centreTete': E['centreTete'], 'pelvisEchelle': E['pelvisEchelle'], 'visibles': ['casque', 'cravate'], 'epiListe': ['casque'],
               'epi': {'casque': ['casque__hat', 'jugulaire__strap'], 'cravate': ['cravate__tie']}}
js = json.dumps(B, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
bn = bytes(bin_); bn += b'\0' * ((4 - len(bn) % 4) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bn)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bn), 0x004E4942) + bn
open(OUT, 'wb').write(out); print('écrit', OUT, len(out) // 1024, 'Ko')
