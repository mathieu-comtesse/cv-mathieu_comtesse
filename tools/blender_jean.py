# Blender (bpy) : prolonge le bas du jean du personnage pour qu'il tombe sur les chaussures.
# Usage : python tools/blender_jean.py   (depuis la racine du dépôt ; nécessite le module bpy)
# Entrée : assets/mathieu-character.glb   Sortie : assets/jean-legs.glb (maillage « legs » modifié + armature, sans animation)
# Méthode : on repère les deux boucles de bord du bas du jean (z < 3), puis on extrude trois anneaux vers le bas :
#   1. un fût légèrement évasé, 2. un évasement qui recouvre le haut de la chaussure (NB992 ×1,3 : col à z ≈ 2,15), 3. une lèvre d'ourlet rentrée.
# Les poids de peau sont copiés depuis l'anneau d'origine (l'ourlet suit le mollet) ; de petits plis sinusoïdaux cassent la régularité.
import bpy, bmesh, math
from mathutils import Vector

HEM_Z = 3.0                       # on cherche les arêtes de bord sous cette hauteur
RINGS = [(-0.45, 1.05, 0.020), (-0.98, 1.24, 0.045), (-1.02, 1.00, 0.0)]     # (descente en z, échelle radiale, amplitude des plis)

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath='assets/mathieu-character.glb')
legs = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('legs'))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
bpy.context.view_layer.objects.active = legs
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(legs.data); bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table()
deform = bm.verts.layers.deform.verify()

# boucles de bord du bas, une par jambe (séparées par le signe de x)
border = [e for e in bm.edges if e.is_boundary and all(v.co.z < HEM_Z for v in e.verts)]
verts = {v for e in border for v in e.verts}
loops = {}
for v in verts: loops.setdefault(v.co.x > 0, []).append(v)
print('boucles :', {k: len(v) for k, v in loops.items()})
phase = {True: 0.7, False: 2.1}
for side, ring in loops.items():
    cx = sum(v.co.x for v in ring) / len(ring); cy = sum(v.co.y for v in ring) / len(ring)
    edges = [e for e in border if e.verts[0] in ring]
    cur = edges
    for k, (dz, sc, amp) in enumerate(RINGS):
        res = bmesh.ops.extrude_edge_only(bm, edges=cur)
        nv = [g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)]
        ne = [g for g in res['geom'] if isinstance(g, bmesh.types.BMEdge)]
        # on part de l'anneau précédent (centre et rayon) : ici tout est exprimé par rapport au centre de la jambe
        for v in nv:
            dx, dy = v.co.x - cx, v.co.y - cy
            ang = math.atan2(dy, dx)
            r = 1 + (sc - 1) if k == 0 else sc
            wob = 1 + amp * math.sin(5 * ang + phase[side] + k) if amp else 1
            v.co.x = cx + dx * (sc if k == 0 else sc / RINGS[k - 1][1]) * wob
            v.co.y = cy + dy * (sc if k == 0 else sc / RINGS[k - 1][1]) * wob
            v.co.z += dz if k == 0 else dz - RINGS[k - 1][0]
        bm.verts.ensure_lookup_table()
        cur = [e for e in ne if e.is_boundary]
    # les faces créées reprennent le matériau d'un voisin d'origine
bm.faces.ensure_lookup_table()
old_mats = [f.material_index for f in bm.faces if f.material_index is not None]
jean_idx = max(set(old_mats), key=old_mats.count)           # matériau principal du jean
for f in bm.faces:
    if all(v.co.z < HEM_Z + 0.001 for v in f.verts) and any(v.co.z < 2.55 for v in f.verts): f.material_index = jean_idx
bmesh.update_edit_mesh(legs.data)
bpy.ops.object.mode_set(mode='OBJECT')
legs.data.update(); legs.data.calc_loop_triangles()
print('sommets :', len(legs.data.vertices))
bpy.ops.object.select_all(action='DESELECT'); legs.select_set(True); arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath='assets/jean-legs.glb', export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_yup=True)
print('exporté')
