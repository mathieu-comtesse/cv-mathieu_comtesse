"""Écrivain glTF binaire minimal (nœuds, maillages skinnés, matériaux nommés, animations) : pas de dépendance.
   Les personnages sont écrits ici plutôt qu'exportés par Blender pour garder la main sur la hiérarchie du squelette
   (mêmes noms et mêmes rotations de repos que la Universal Animation Library, pour que ses clips s'appliquent tels quels)."""
import json, struct
import numpy as np

class GLB:
    def __init__(self):
        self.nodes = []; self.meshes = []; self.materials = []; self.accessors = []; self.views = []; self.skins = []; self.anims = []
        self.bin = bytearray(); self.scene_nodes = []; self._mat = {}

    # -- tampons
    def _view(self, data, target=None):
        while len(self.bin) % 4: self.bin.append(0)
        off = len(self.bin); self.bin += data
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target: v['target'] = target
        self.views.append(v); return len(self.views) - 1

    def accessor(self, arr, comp, typ, target=None, minmax=False, normalized=False):
        arr = np.ascontiguousarray(arr)
        v = self._view(arr.tobytes(), target)
        a = {'bufferView': v, 'componentType': comp, 'count': int(arr.shape[0]), 'type': typ}
        if normalized: a['normalized'] = True
        if minmax: a['min'] = [float(x) for x in np.min(arr.reshape(arr.shape[0], -1), axis=0)]; a['max'] = [float(x) for x in np.max(arr.reshape(arr.shape[0], -1), axis=0)]
        self.accessors.append(a); return len(self.accessors) - 1

    # -- matériaux : un matériau par rôle (nom = rôle), couleur de base informative
    def material(self, role, rgb=(0.8, 0.8, 0.8)):
        if role in self._mat: return self._mat[role]
        self.materials.append({'name': role, 'pbrMetallicRoughness': {'baseColorFactor': [float(rgb[0]), float(rgb[1]), float(rgb[2]), 1.0], 'metallicFactor': 0.0, 'roughnessFactor': 1.0}})
        self._mat[role] = len(self.materials) - 1; return self._mat[role]

    # -- nœuds
    def node(self, name, t=None, q=None, s=None, mesh=None, skin=None, children=None):
        n = {'name': name}
        if t is not None and np.any(np.abs(np.asarray(t)) > 1e-9): n['translation'] = [float(x) for x in t]
        if q is not None and np.any(np.abs(np.asarray(q) - [0, 0, 0, 1]) > 1e-9): n['rotation'] = [float(x) for x in q]
        if s is not None and np.any(np.abs(np.asarray(s) - 1) > 1e-9): n['scale'] = [float(x) for x in s]
        if mesh is not None: n['mesh'] = mesh
        if skin is not None: n['skin'] = skin
        if children: n['children'] = list(children)
        self.nodes.append(n); return len(self.nodes) - 1

    def mesh(self, name, V, F, N, role, J=None, W=None, rgb=(0.8, 0.8, 0.8)):
        att = {'POSITION': self.accessor(np.asarray(V, np.float32), 5126, 'VEC3', 34962, True), 'NORMAL': self.accessor(np.asarray(N, np.float32), 5126, 'VEC3', 34962)}
        if J is not None:
            att['JOINTS_0'] = self.accessor(np.asarray(J, np.uint8), 5121, 'VEC4', 34962)
            att['WEIGHTS_0'] = self.accessor(np.asarray(W, np.float32), 5126, 'VEC4', 34962)
        idx = np.asarray(F, np.uint32).reshape(-1)
        ia = self.accessor(idx.astype(np.uint16) if idx.max() < 65535 else idx, 5123 if idx.max() < 65535 else 5125, 'SCALAR', 34963)
        self.meshes.append({'name': name, 'primitives': [{'attributes': att, 'indices': ia, 'material': self.material(role, rgb), 'mode': 4}]})
        return len(self.meshes) - 1

    def skin(self, joints, inverse_bind, name='Armature', skeleton=None):
        ib = self.accessor(np.asarray(inverse_bind, np.float32).reshape(-1, 16), 5126, 'MAT4')
        s = {'name': name, 'joints': list(joints), 'inverseBindMatrices': ib}
        if skeleton is not None: s['skeleton'] = skeleton
        self.skins.append(s); return len(self.skins) - 1

    def animation(self, name, channels):
        """channels : liste de (nœud, 'rotation'|'translation', temps(n,), valeurs(n,3|4))"""
        samplers = []; chs = []
        for node, path, t, vals in channels:
            ti = self.accessor(np.asarray(t, np.float32).reshape(-1, 1), 5126, 'SCALAR', None, True)
            vi = self.accessor(np.asarray(vals, np.float32), 5126, 'VEC4' if path == 'rotation' else 'VEC3')
            samplers.append({'input': ti, 'output': vi, 'interpolation': 'LINEAR'}); chs.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': path}})
        self.anims.append({'name': name, 'samplers': samplers, 'channels': chs})

    def save(self, path, extras=None):
        j = {'asset': {'version': '2.0', 'generator': 'Village Talas - tools/forge/persos'}, 'scene': 0, 'scenes': [{'nodes': self.scene_nodes}], 'nodes': self.nodes,
             'buffers': [{'byteLength': len(self.bin)}], 'bufferViews': self.views, 'accessors': self.accessors}
        if self.meshes: j['meshes'] = self.meshes
        if self.materials: j['materials'] = self.materials
        if self.skins: j['skins'] = self.skins
        if self.anims: j['animations'] = self.anims
        if extras: j['extras'] = extras
        js = json.dumps(j, separators=(',', ':')).encode('utf8')
        while len(js) % 4: js += b' '
        b = bytes(self.bin)
        while len(b) % 4: b += b'\0'
        out = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(b)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(b), 0x004E4942) + b
        open(path, 'wb').write(out); return len(out)
