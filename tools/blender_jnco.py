# Blender (bpy) : monte le jean « JNCO Twin Cannon baggy jeans » sur le squelette du personnage.
# Usage : FLIP=0 python tools/blender_jnco.py   (depuis la racine du dépôt ; module bpy requis)
# Entrée : assets/mathieu-character.glb (squelette, jambes d'origine) + /tmp/jnco.glb (modèle fourni)   Sortie : assets/jeans-jnco.glb
# Méthode : 1) fusion des deux maillages du jean, décimation (~190 000 → ~15 000 triangles) ; 2) mise à l'échelle : taille à la hauteur du haut des jambes (z 7,4),
#           ourlet sous le col des chaussures (z ≈ 0,45) pour retomber sur les chaussures, largeur ajustée aux hanches ;
#           3) poids de peau transférés par plus proche face depuis les jambes d'origine, 4 influences maximum ; 4) textures ramenées à 512 px ; 5) export glTF.
import bpy, bmesh, os
from mathutils import Vector, Matrix

FLIP = os.environ.get('FLIP', '0') == '1'            # le jean est-il orienté vers l'arrière ? (faire pivoter de 180° autour de Z)
TARGET_FACES = int(os.environ.get('FACES', '15000'))
WAIST_Z, HEM_Z = 7.40, float(os.environ.get('HEM', '0.45'))

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath='assets/mathieu-character.glb')
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
legs = next(o for o in bpy.context.scene.objects if o.name == 'legs')
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath='/tmp/jnco.glb')
new = [o for o in bpy.context.scene.objects if o not in before]
jm = [o for o in new if o.type == 'MESH' and o.name.startswith('JNCO_Twin_Cannon__0')]
for o in new:
    if o.type == 'MESH' and o not in jm: bpy.data.objects.remove(o, do_unlink=True)
for o in jm: o.parent = None; o.matrix_world = o.matrix_world        # on garde la transformation du monde, on coupe la hiérarchie importée (échelle 0,01)
for o in jm:
    bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.join()
jean = bpy.context.view_layer.objects.active; jean.name = 'legs'
jean.data.transform(jean.matrix_world); jean.matrix_world = Matrix.Identity(4)
print('jean avant :', len(jean.data.vertices), 'sommets')

# décimation
bpy.context.view_layer.objects.active = jean
mod = jean.modifiers.new('Decimate', 'DECIMATE'); mod.ratio = min(1.0, TARGET_FACES / max(1, len(jean.data.polygons)))
bpy.ops.object.modifier_apply(modifier='Decimate')
print('jean après :', len(jean.data.vertices), 'sommets', len(jean.data.polygons), 'faces')

# mise à l'échelle et placement
vs = [v.co for v in jean.data.vertices]
zmin, zmax = min(v.z for v in vs), max(v.z for v in vs)
s = (WAIST_Z - HEM_Z) / (zmax - zmin)
top = [v.co for v in jean.data.vertices if v.co.z > zmax - 0.03]
wx = (max(v.x for v in top) - min(v.x for v in top)) * s
print('largeur à la taille après échelle :', round(wx, 2), '(jambes d\'origine : 3,24)')
sx = max(0.8, min(1.35, 3.30 / wx)) if wx > 0 else 1.0
for v in jean.data.vertices:
    v.co = Vector((v.co.x * s * sx, v.co.y * s, (v.co.z - zmax) * s + WAIST_Z))
if FLIP:
    for v in jean.data.vertices: v.co.x, v.co.y = -v.co.x, -v.co.y
cy = sum(v.co.y for v in jean.data.vertices if v.co.z > WAIST_Z - 0.2) / max(1, sum(1 for v in jean.data.vertices if v.co.z > WAIST_Z - 0.2))
for v in jean.data.vertices: v.co.y += 0.45 - cy                                  # centre avant-arrière sur le bassin du personnage
jean.data.update()

# poids de peau : transfert depuis les jambes d'origine
bpy.context.view_layer.objects.active = jean
for g in legs.vertex_groups: jean.vertex_groups.new(name=g.name)
dt = jean.modifiers.new('DT', 'DATA_TRANSFER'); dt.object = legs; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier='DT')
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
am = jean.modifiers.new('Armature', 'ARMATURE'); am.object = arm; jean.parent = arm

# textures 512 px
for img in bpy.data.images:
    if img.size[0] > 512 and img.users: img.scale(512, 512)

bpy.data.objects.remove(legs, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT'); jean.select_set(True); arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath='assets/jeans-jnco.glb', export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_yup=True, export_image_format='JPEG', export_jpeg_quality=82)
print('exporté')
