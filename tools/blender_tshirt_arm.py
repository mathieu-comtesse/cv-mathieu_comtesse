# Blender (bpy) : T-shirt à manches courtes à la place de la chemise, bras droit tatoué en noir (bras et main).
# Usage : python tools/blender_tshirt_arm.py   (depuis la racine du dépôt ; module bpy requis)
# Entrée : assets/mathieu-character.glb   Sortie : assets/tshirt-arm.glb (maillages « shirt » et « arm » refaits + armature, sans animation)
# Méthode : 1) T-shirt gris d'une seule pièce fermée (torse en anneaux + deux manches courtes), l'ancienne chemise est supprimée ; la veste disparaît à l'exécution ;
#           2) le bras nu, qui n'existait que sous les manches de la veste, est complété en pontant les deux boucles du coude ;
#           3) tous les polygones du bras droit (bras, avant-bras, main) reçoivent le matériau « Tatouage » (noir uni).
import bpy, bmesh

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath='assets/mathieu-character.glb')
ob = {o.name: o for o in bpy.context.scene.objects}
jacket, arm, shirt = ob['jacket'], ob['arm'], ob['shirt']
ARM_BONES = {'upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'hand_l', 'hand_r'}

def dominant(obj):
    names = {g.index: g.name for g in obj.vertex_groups}
    return [names[max(v.groups, key=lambda g: g.weight).group] if v.groups else '' for v in obj.data.vertices]

# 1) T-shirt d'une seule pièce fermée, gris foncé à col rond (référence : « T-Shirt » de Lucas Soler) : torse en anneaux elliptiques du bas du ventre au col,
#    deux manches courtes en tubes qui traversent le flanc du torse (aucun vide à l'épaule), col en côte plus sombre, ourlet arrondi.
#    L'ancienne chemise (blanche, grise et noire), le badge et le clip sont supprimés.
import math
from mathutils import Vector
arm_obj = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
for n in ('shirt', 'id', 'clip'):
    o = ob.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
mats = []
for name, col in (('Material #82', (0.24, 0.25, 0.23, 1)), ('Material #577', (0.16, 0.17, 0.16, 1))):     # étoffe, col et ourlet (plus sombres)
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = col; m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
    m.diffuse_color = col; mats.append(m)
me = bpy.data.meshes.new('shirt'); shirt = bpy.data.objects.new('shirt', me); bpy.context.collection.objects.link(shirt)
me.materials.append(mats[0]); me.materials.append(mats[1])
bm = bmesh.new()
SEG = 24
CY = 0.5
# (z, rx, ry, matériau des faces sous cet anneau, [(os, poids)])
TORSO = [
    (7.12, 1.66, 0.98, 1, [('pelvis', .6), ('spine_01', .4)]), (7.22, 1.70, 1.00, 1, [('pelvis', .5), ('spine_01', .5)]),
    (7.55, 1.72, 1.00, 0, [('spine_01', 1)]), (8.2, 1.66, 0.96, 0, [('spine_01', 1)]), (8.8, 1.64, 0.92, 0, [('spine_01', .5), ('spine_02', .5)]),
    (9.4, 1.70, 0.88, 0, [('spine_02', 1)]), (10.0, 1.72, 0.86, 0, [('spine_02', 1)]), (10.35, 1.58, 0.84, 0, [('spine_02', 1)]),
    (10.58, 1.12, 0.82, 0, [('spine_02', .7), ('neck_01', .3)]), (10.70, 0.86, 0.80, 1, [('spine_02', .4), ('neck_01', .6)]), (10.76, 0.78, 0.76, 1, [('neck_01', 1)]),
]
rings = []
for (z, rx, ry, mi, w) in TORSO:
    ring = []
    for j in range(SEG):
        a = 2 * math.pi * j / SEG
        v = bm.verts.new((math.cos(a) * rx, CY + math.sin(a) * ry * (1.0 if math.sin(a) > 0 else 0.95), z)); ring.append((v, w))
    rings.append((ring, mi))
for k in range(len(rings) - 1):
    r0, _ = rings[k]; r1, mi = rings[k + 1]
    for j in range(SEG):
        f = bm.faces.new((r0[j][0], r1[j][0], r1[(j + 1) % SEG][0], r0[(j + 1) % SEG][0])); f.material_index = mi; f.smooth = True
# fermeture du bas (ventre) : le vêtement est fermé, le jean le cache
bot = [v for v, _ in rings[0][0]]; bm.faces.new(bot[::-1])
weights = {}
for ring, _ in rings:
    for v, w in ring: weights[v] = w
# manches
nm = {g.index: g.name for g in arm.vertex_groups}
for side in ('l', 'r'):
    sx = 1 if side == 'l' else -1
    pu = [v.co.copy() for v in arm.data.vertices if v.groups and nm[max(v.groups, key=lambda g: g.weight).group] == 'upperarm_' + side]
    pl = [v.co.copy() for v in arm.data.vertices if v.groups and nm[max(v.groups, key=lambda g: g.weight).group] == 'lowerarm_' + side]
    cen = lambda pts: sum(pts, Vector()) / len(pts)
    shoulder = cen(pu); shoulder.x = sx * 1.25; elbow = cen(pl); axis = (elbow - shoulder).normalized(); length = (elbow - shoulder).length
    u = axis.cross(Vector((0, 0, 1))).normalized(); w = axis.cross(u).normalized()
    sl = []
    KS = 7
    for k in range(KS):
        t = 0.58 * k / (KS - 1); c = shoulder + axis * (length * t); r = 0.74 - 0.10 * k / (KS - 1)
        ring = []
        for j in range(SEG // 2):
            a = 2 * math.pi * j / (SEG // 2)
            v = bm.verts.new(c + (u * math.cos(a) + w * math.sin(a)) * r)
            weights[v] = [('spine_02', 1.0 - min(1.0, k / 2.0)), ('upperarm_' + side, min(1.0, k / 2.0))] if k < 3 else [('upperarm_' + side, 1.0)]
            ring.append(v)
        sl.append(ring)
    N = SEG // 2
    for k in range(KS - 1):
        for j in range(N):
            f = bm.faces.new((sl[k][j], sl[k + 1][j], sl[k + 1][(j + 1) % N], sl[k][(j + 1) % N])); f.material_index = 0; f.smooth = True
    # ourlet de manche : anneau rentré, plus sombre
    hem = sl[-1]; ctr = shoulder + axis * (length * 0.58)
    inner = []
    for v in hem:
        nv = bm.verts.new(v.co - axis * 0.06 - (v.co - ctr) * 0.10); weights[nv] = [('upperarm_' + side, 1.0)]; inner.append(nv)
    for j in range(N):
        f = bm.faces.new((hem[j], hem[(j + 1) % N], inner[(j + 1) % N], inner[j])); f.material_index = 1
bm.normal_update(); bm.to_mesh(me)
idx = {v: i for i, v in enumerate(bm.verts)}
for g in arm_obj.data.bones: shirt.vertex_groups.new(name=g.name)
for v, w in weights.items():
    for bone, wt in w:
        if wt > 0: shirt.vertex_groups[bone].add([idx[v]], wt, 'REPLACE')
bm.free()
mod = shirt.modifiers.new('Armature', 'ARMATURE'); mod.object = arm_obj; shirt.parent = arm_obj
print('T-shirt : sommets', len(me.vertices), 'faces', len(me.polygons))

# 2) bras nu : on ponte les deux boucles du coude de chaque côté
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(arm.data); bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table()
border = [e for e in bm.edges if e.is_boundary]
mx = lambda e: (e.verts[0].co.x + e.verts[1].co.x) / 2
for side in (1, -1):
    near = [e for e in border if side * mx(e) > 0 and 3.2 < abs(mx(e)) < 4.4]
    a = [e for e in near if abs(mx(e)) < 3.85]; b = [e for e in near if abs(mx(e)) >= 3.85]
    print('pont', side, len(a), len(b))
    if a and b:
        try: bmesh.ops.bridge_loops(bm, edges=a + b)
        except Exception as ex: print('échec du pont', ex)
bmesh.update_edit_mesh(arm.data); bpy.ops.object.mode_set(mode='OBJECT')

# 3) bras droit tatoué : matériau noir sur tous les polygones du bras droit
tat = bpy.data.materials.new('Tatouage'); tat.use_nodes = True
bsdf = tat.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value = (0.012, 0.012, 0.016, 1); bsdf.inputs['Roughness'].default_value = 0.62
tat.diffuse_color = (0.012, 0.012, 0.016, 1)
arm.data.materials.append(tat); ti = len(arm.data.materials) - 1
dom = dominant(arm); n = 0
for p in arm.data.polygons:
    if all(dom[i].endswith('_r') and dom[i] in ARM_BONES for i in p.vertices): p.material_index = ti; n += 1
print('polygones tatoués :', n, 'sur', len(arm.data.polygons))

bpy.ops.object.select_all(action='DESELECT'); shirt.select_set(True); arm.select_set(True)
arm_obj = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.export_scene.gltf(filepath='assets/tshirt-arm.glb', export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_yup=True)
print('exporté')
