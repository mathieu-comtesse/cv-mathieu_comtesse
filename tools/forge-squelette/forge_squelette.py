"""Forge du squelette de bureau (Talas), en code : chaque pièce est posée os par os sur l'armature des personnages du village.

    bpy (pip install bpy) :  python forge_squelette.py <homme.glb> <sortie.glb>

1. importe l'armature de homme.glb (mêmes noms d'os que la bibliothèque d'animations : les clips s'appliquent tels quels) ;
2. modèle, pièce par pièce : bassin, quatorze vertèbres, sept paires de côtes, sternum, clavicules, omoplates, crâne, mâchoire, dents, bras, mains, jambes, pieds,
   casque de chantier, cravate et badge de stagiaire ; chaque pièce est pesée à 100 % sur son os ;
3. ajoute un os « jaw » (mâchoire) sous Head, pour que le jeu la fasse claquer ;
4. exporte un GLB ; fix_squelette.py remet ensuite les repos exacts des os et recalcule les matrices de liaison.
Un maillage par rôle (nom « pièce__rôle ») : le jeu recolore par rôle, comme pour tous les personnages."""
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix

SRC, OUT = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
for o in [o for o in bpy.data.objects if o.type == 'MESH']: bpy.data.objects.remove(o, do_unlink=True)

# --- os « jaw » sous Head -------------------------------------------------------------------------------------------------------------------
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
hd = arm.data.edit_bones['Head']
jw = arm.data.edit_bones.new('jaw'); jw.parent = hd; jw.head = Vector((0, -0.03, 2.1)); jw.tail = Vector((0, -0.2, 2.06)); jw.roll = 0
bpy.ops.object.mode_set(mode='OBJECT')
BONES = [b.name for b in arm.data.bones]

ROLES = {  # rôle : (objet, couleur)
    'bone': ('os', '#f1ecda'), 'bone2': ('vertebres', '#cfc7a8'), 'socket': ('orbites', '#16121c'), 'pupil': ('lueurs', '#ffd66b'),
    'tooth': ('dents', '#ffffff'), 'hat': ('casque', '#ffd43b'), 'strap': ('jugulaire', '#2b2b2b'), 'tie': ('cravate', '#e03131'), 'badge': ('badge', '#fffaf0'),
}
BM = {r: bmesh.new() for r in ROLES}
for r in BM: BM[r].verts.layers.deform.verify()

def weigh(bm, verts, bone):
    dl = bm.verts.layers.deform.active; idx = BONES.index(bone)
    for v in verts: v[dl][idx] = 1.0

def M(loc, scale=(1, 1, 1), rot=None):
    m = Matrix.Translation(Vector(loc)) @ (rot.to_4x4() if rot is not None else Matrix.Identity(4))
    return m @ Matrix.Diagonal(Vector((*scale, 1)))

def sphere(role, bone, c, r, sc=(1, 1, 1), seg=10):
    bm = BM[role]; g = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(5, seg - 3), radius=r, matrix=M(c, sc))
    weigh(bm, g['verts'], bone)

def box(role, bone, c, size, rot=None):
    bm = BM[role]; g = bmesh.ops.create_cube(bm, size=1.0, matrix=M(c, size, rot)); weigh(bm, g['verts'], bone)

def align(a, b):
    d = (Vector(b) - Vector(a)); L = d.length
    q = Vector((0, 0, 1)).rotation_difference(d.normalized()); return L, q.to_matrix()

def bone_between(role, bone, a, b, r0, r1=None, knobs=True, seg=7):
    """os long : fût conique entre deux points, avec une articulation arrondie à chaque bout"""
    r1 = r0 if r1 is None else r1; L, R = align(a, b); mid = (Vector(a) + Vector(b)) / 2; bm = BM[role]
    g = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r0, radius2=r1, depth=L, matrix=M(mid, rot=R)); weigh(bm, g['verts'], bone)
    if knobs: sphere(role, bone, a, r0 * 1.55, seg=8); sphere(role, bone, b, r1 * 1.55, seg=8)

def tube(role, bone, pts, radii, seg=6):
    """tube le long d'un chemin (côtes) : anneaux pontés"""
    bm = BM[role]; rings = []
    for i, p in enumerate(pts):
        t = (Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
        n = t.cross(Vector((0, 0, 1)))
        if n.length < .01: n = t.cross(Vector((1, 0, 0)))
        n.normalize(); b2 = t.cross(n).normalized(); r = radii[i] if isinstance(radii, list) else radii
        rings.append([bm.verts.new(Vector(p) + (n * math.cos(a) + b2 * math.sin(a)) * r) for a in [k * 2 * math.pi / seg for k in range(seg)]])
    for i in range(len(rings) - 1):
        for k in range(seg): bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    weigh(bm, [v for ring in rings for v in ring], bone)

import json, struct, numpy as np
def _bind_positions(path):
    """position des os dans la pose de LIAISON de homme.glb (inverse des matrices de liaison), repère Blender : les bras y sont plus bas que dans la pose de repos"""
    d = open(path, 'rb').read(); l = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + l]); off = 20 + l; bl = struct.unpack('<I', d[off:off + 4])[0]; b = d[off + 8:off + 8 + bl]
    s = j['skins'][0]; a = j['accessors'][s['inverseBindMatrices']]; v = j['bufferViews'][a['bufferView']]
    arr = np.frombuffer(b, dtype='<f4', count=16 * a['count'], offset=v.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, 4, 4)
    out = {}
    for k, ji in enumerate(s['joints']):
        g = np.linalg.inv(arr[k].T)[:3, 3]; out[j['nodes'][ji]['name']] = Vector((g[0], -g[2], g[1]))
    return out
BIND = _bind_positions(SRC)
ARMS = ('upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r')
def B(name, which='head'):
    if name in ARMS:   # bras : pose de liaison ; la queue d'un os est la tête du suivant
        nxt = {'upperarm_l': 'lowerarm_l', 'lowerarm_l': 'hand_l', 'upperarm_r': 'lowerarm_r', 'lowerarm_r': 'hand_r'}
        if which == 'head': return BIND[name]
        if name in nxt: return BIND[nxt[name]]
        return BIND[name] + (BIND[name] - BIND[{'hand_l': 'lowerarm_l', 'hand_r': 'lowerarm_r'}[name]]) * 0.45
    b = arm.data.bones[name]; return arm.matrix_world @ (b.head_local if which == 'head' else b.tail_local)

# --- bassin ---------------------------------------------------------------------------------------------------------------------------------
sphere('bone', 'pelvis', (0, 0.05, 1.2), 0.1, (1, .55, 1.2))
for s in (1, -1):
    sphere('bone', 'pelvis', (s * 0.2, 0.02, 1.2), 0.17, (.55, .32, .9), seg=12)
    sphere('bone', 'pelvis', (s * 0.12, -0.07, 1.1), 0.05)
    sphere('bone', 'pelvis', (s * 0.06, -0.12, 1.14), 0.035)

# --- colonne : quatorze vertèbres + apophyses ---------------------------------------------------------------------------------------------------
chain = ['pelvis'] * 0 + ['spine_01'] * 4 + ['spine_02'] * 5 + ['spine_03'] * 3 + ['neck_01'] * 2
for i, bn in enumerate(chain):
    t = i / (len(chain) - 1); z = 1.27 + t * (1.93 - 1.27); y = 0.04 - math.sin(t * math.pi) * 0.04 + 0.01 * (1 - t)
    rad = 0.062 - 0.016 * t
    bm = BM['bone2'] if i % 2 else BM['bone']
    g = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=rad, radius2=rad * .96, depth=0.044, matrix=M((0, y, z))); weigh(bm, g['verts'], bn)
    box('bone2' if i % 2 else 'bone', bn, (0, y + 0.07, z + 0.005), (0.03, 0.08, 0.04))
    box('bone', bn, (0, y + 0.05, z), (0.16 - 0.05 * t, 0.025, 0.02))

# --- cage thoracique : sept paires de côtes en arc, sternum, clavicules, omoplates -----------------------------------------------------------------
RX = [.13, .17, .2, .21, .2, .17, .14]
for i in range(7):
    z0 = 1.72 - i * 0.05
    for s in (1, -1):
        pts = []
        for k in range(11):
            phi = k / 10 * math.pi * 0.96
            pts.append((s * RX[i] * math.sin(phi), -0.015 + 0.105 * math.cos(phi) + 0.03, z0 - 0.035 * math.sin(phi / 2) - (0.012 * k / 10)))
        tube('bone' if i % 2 else 'bone2', 'spine_03' if i < 3 else 'spine_02', pts, 0.0125, 5)
box('bone', 'spine_03', (0, -0.145, 1.62), (0.07, 0.025, 0.2))
box('bone', 'spine_02', (0, -0.145, 1.45), (0.05, 0.022, 0.1))
sphere('bone', 'spine_02', (0, -0.145, 1.38), 0.022)
for s in (1, -1):
    bone_between('bone', 'clavicle_l' if s > 0 else 'clavicle_r', (s * 0.025, -0.115, 1.745), (s * 0.235, 0.0, 1.745), 0.014)
    sphere('bone', 'spine_03', (s * 0.14, 0.095, 1.63), 0.115, (1, .22, 1.15), seg=9)

# --- crâne, orbites, nez, dents, mâchoire ---------------------------------------------------------------------------------------------------------
sphere('bone', 'Head', (0, -0.01, 2.17), 0.27, (.93, 1.05, 1.06), seg=14)
sphere('bone', 'Head', (0, -0.1, 2.07), 0.15, (.8, .55, .7), seg=10)
for s in (1, -1):
    sphere('bone', 'Head', (s * 0.15, -0.17, 2.08), 0.065, (1, .6, .8))
    sphere('socket', 'Head', (s * 0.095, -0.215, 2.16), 0.075, (1, .55, 1))
    sphere('pupil', 'Head', (s * 0.095, -0.255, 2.165), 0.026, seg=6)
bm = BM['socket']; g = bmesh.ops.create_cone(bm, cap_ends=True, segments=3, radius1=0.045, radius2=0.012, depth=0.05, matrix=M((0, -0.255, 2.075), rot=Matrix.Rotation(math.pi / 2, 3, 'X'))); weigh(bm, g['verts'], 'Head')
for i in range(8):
    box('tooth', 'Head', ((i - 3.5) * 0.034, -0.23 + abs(i - 3.5) * 0.012, 2.015), (0.03, 0.02, 0.045))
for i in range(7):
    box('tooth', 'jaw', ((i - 3) * 0.034, -0.215 + abs(i - 3) * 0.012, 2.0), (0.028, 0.02, 0.04))
box('bone', 'jaw', (0, -0.12, 2.0), (0.22, 0.2, 0.05))
for s in (1, -1): box('bone', 'jaw', (s * 0.115, -0.04, 2.07), (0.03, 0.04, 0.17))
sphere('bone', 'neck_01', (0, 0.0, 1.95), 0.04)

# --- casque de chantier, cravate et badge de stagiaire ---------------------------------------------------------------------------------------------
bm = BM['hat']; g = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.335, matrix=M((0, -0.01, 2.27), (1, 1.05, .9))); weigh(bm, g['verts'], 'Head')
bmesh.ops.delete(bm, geom=[v for v in g['verts'] if v.co.z < 2.27 - 0.01], context='VERTS')
box('hat', 'Head', (0, -0.3, 2.265), (0.52, 0.22, 0.03), Matrix.Rotation(0.12, 3, 'X'))
box('hat', 'Head', (0, -0.01, 2.56), (0.06, 0.6, 0.06))
for s in (1, -1): box('strap', 'Head', (s * 0.27, -0.06, 2.1), (0.02, 0.03, 0.26)); 
box('tie', 'spine_03', (0, -0.165, 1.62), (0.07, 0.02, 0.2), Matrix.Rotation(0.0, 3, 'X'))
box('tie', 'spine_03', (0, -0.168, 1.47), (0.1, 0.02, 0.2))
box('tie', 'spine_03', (0, -0.165, 1.77), (0.11, 0.03, 0.05))
box('badge', 'spine_03', (0.1, -0.175, 1.52), (0.12, 0.012, 0.08))

# --- bras : humérus, radius + ulna, poignet, main à cinq doigts -----------------------------------------------------------------------------------
for s, sx in (('l', 1), ('r', -1)):
    ua, la, ha = 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s
    bone_between('bone', ua, B(ua), B(la), 0.027, 0.022)
    a, b = B(la), B(ha)
    for o in (-0.012, 0.012): bone_between('bone', la, a + Vector((o, 0, 0)), b + Vector((o, 0, 0)), 0.014, 0.011, knobs=False)
    sphere('bone', la, a, 0.04); sphere('bone', ha, b, 0.032)
    hd0 = B(ha); hd1 = B(ha, 'tail'); dirv = (hd1 - hd0).normalized()
    palm = hd0 + dirv * 0.07
    box('bone', ha, palm, (0.075, 0.025, 0.1), Vector((0, 0, 1)).rotation_difference(dirv).to_matrix())
    for i in range(5):
        off = (i - 2) * 0.017 * (1.0 if i < 4 else 1.2); base = palm + Vector((off * sx * -1 + 0, 0, 0)) + dirv * 0.05
        ln = 0.095 if i not in (0, 4) else (0.07 if i == 4 else 0.1)
        bone_between('bone', ha, base, base + dirv * ln + Vector((off * 0.4 * sx * -1, -0.01, 0)), 0.0085, 0.007, knobs=False)

# --- jambes : fémur, rotule, tibia + péroné, pied (tarse, métatarses, orteils) --------------------------------------------------------------------
for s in ('l', 'r'):
    th, ca, fo, ba = 'thigh_' + s, 'calf_' + s, 'foot_' + s, 'ball_' + s
    sx = 1 if s == 'l' else -1
    bone_between('bone', th, B(th), B(ca), 0.034, 0.028)
    sphere('bone', ca, B(ca) + Vector((0, -0.045, 0)), 0.04, (1, .6, 1))
    a, b = B(ca), B(fo)
    bone_between('bone', ca, a, b, 0.026, 0.02)
    bone_between('bone', ca, a + Vector((sx * 0.035, 0.01, 0.0)), b + Vector((sx * 0.04, 0.01, 0.0)), 0.011, 0.009, knobs=False)
    f0, f1 = B(fo), B(ba)
    box('bone', fo, (f0 + f1) / 2 + Vector((0, 0.02, 0.0)), (0.1, 0.17, 0.06), Matrix.Rotation(0.0, 3, 'X'))
    for i in range(5):
        x = (i - 2) * 0.02 * (1) 
        bone_between('bone', ba, f1 + Vector((x, 0.04, 0.0)), f1 + Vector((x, -0.1 - 0.02 * (1 - abs(i - 2) / 2), -0.0)), 0.009, 0.0075, knobs=False)

# --- objets : un maillage par rôle -------------------------------------------------------------------------------------------------------------
for role, (obj, hexc) in ROLES.items():
    bm = BM[role]
    if not bm.verts: continue
    for f in bm.faces: f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(obj + '__' + role); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(obj + '__' + role, me); bpy.context.collection.objects.link(ob)
    for bn in BONES: ob.vertex_groups.new(name=bn)
    # bmesh ne porte pas les noms de groupes : les indices du calque deform suivent l'ordre BONES
    m = bpy.data.materials.new(role); m.use_nodes = True
    c = tuple(int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c)
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin, 1)
    me.materials.append(m)
    ob.parent = arm; md = ob.modifiers.new('Armature', 'ARMATURE'); md.object = arm
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_animations=False, export_skins=True, export_texcoords=False, export_apply=False,
                          export_materials='EXPORT', export_image_format='NONE', export_extras=False, export_cameras=False, export_lights=False)
print('EXPORT OK', OUT)
