# Blender (bpy) : T-shirt à manches courtes à la place de la chemise, bras droit tatoué en noir (bras et main).
# Usage : python tools/blender_tshirt_arm.py   (depuis la racine du dépôt ; module bpy requis)
# Entrée : assets/mathieu-character.glb   Sortie : assets/tshirt-arm.glb (maillages « shirt » et « arm » refaits + armature, sans animation)
# Méthode : 1) deux manches courtes (tubes autour des os des bras, arrêtées au milieu du bras) sont ajoutées au torse du T-shirt, même tissu ; la veste disparaît à l'exécution ;
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

# 1) manches courtes : deux tubes autour des os des bras, dans le tissu du torse du T-shirt (la veste d'origine n'a que des panneaux plats)
import math
from mathutils import Vector
arm_obj = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
body_mat = next(i for i, m in enumerate(shirt.data.materials) if m.name == 'Material #577')
bm = bmesh.new(); bm.from_mesh(shirt.data); bm.verts.ensure_lookup_table()
deform = bm.verts.layers.deform.verify()
SEG, RINGS_N = 14, 9
for side in ('l', 'r'):
    # axe du bras : de l'épaule au coude, mesuré sur les sommets du bras nu pondérés « upperarm » / « lowerarm » (les os du glTF importé sont tournés)
    sx = 1 if side == 'l' else -1
    nm = {g.index: g.name for g in arm.vertex_groups}
    pu = [v.co.copy() for v in arm.data.vertices if v.groups and nm[max(v.groups, key=lambda g: g.weight).group] == 'upperarm_' + side]
    pl = [v.co.copy() for v in arm.data.vertices if v.groups and nm[max(v.groups, key=lambda g: g.weight).group] == 'lowerarm_' + side]
    cen = lambda pts: sum(pts, Vector()) / len(pts)
    shoulder = cen(pu); shoulder.x = sx * 1.3; elbow = cen(pl)       # la manche démarre dans le torse : plus de vide à l'épaule une fois la veste retirée
    head = shoulder; axis = (elbow - shoulder).normalized(); length = (elbow - shoulder).length
    print('axe', side, [round(c, 2) for c in head], [round(c, 2) for c in axis], round(length, 2))
    u = axis.cross(Vector((0, 0, 1))); u = u.normalized() if u.length > 1e-4 else Vector((0, 1, 0)); w = axis.cross(u).normalized()
    rings = []
    for k in range(RINGS_N):
        t = 0.0 + 0.66 * k / (RINGS_N - 1)                       # du pied de l'épaule jusqu'au milieu du bras
        c = head + axis * (length * t); w_ = max(0.0, 1.0 - k / 3.0)                        # les premiers anneaux forment une épaulette : plus larges et relevés
        r = 0.64 + 0.40 * w_; c = c + Vector((0, 0, 0.34 * w_))
        ring = []
        for j in range(SEG):
            a = 2 * math.pi * j / SEG
            v = bm.verts.new(c + (u * math.cos(a) + w * math.sin(a)) * r)
            wt = 0.55 if k == 0 else 1.0
            v[deform][shirt.vertex_groups['upperarm_' + side].index] = wt
            if k == 0: v[deform][shirt.vertex_groups['spine_02'].index] = 1 - wt
            ring.append(v)
        rings.append(ring)
    for k in range(RINGS_N - 1):
        for j in range(SEG):
            f = bm.faces.new((rings[k][j], rings[k + 1][j], rings[k + 1][(j + 1) % SEG], rings[k][(j + 1) % SEG]))
            f.material_index = body_mat; f.smooth = True
    # fermeture du bord libre de la manche (ourlet) : anneau rentré
    hem = rings[-1]; inner = [bm.verts.new(v.co - axis * 0.05 - (v.co - (head + axis * length * 0.66)) * 0.12) for v in hem]
    for v, nv in zip(hem, inner):
        for g in shirt.vertex_groups: pass
        nv[deform][shirt.vertex_groups['upperarm_' + side].index] = 1.0
    for j in range(SEG):
        f = bm.faces.new((hem[j], hem[(j + 1) % SEG], inner[(j + 1) % SEG], inner[j])); f.material_index = body_mat
bm.normal_update()
bm.to_mesh(shirt.data); bm.free()
shirt.data.update()
print('manches générées : sommets du T-shirt', len(shirt.data.vertices))

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
