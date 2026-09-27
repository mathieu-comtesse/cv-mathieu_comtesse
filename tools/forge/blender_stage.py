"""Forge Talas, étape 2 (Blender --background) : budget de triangles, GLB final, aperçu « toon » Talas.

blender --background --factory-startup --python tools/forge/blender_stage.py -- \
    --in raw.glb [--out final.glb] [--png apercu.png] [--max-tris 6000] [--yaw 35] [--pitch 22] [--px 640]

- Si le modèle dépasse --max-tris, un Decimate (collapse) répartit la réduction sur chaque maillage ;
  les couleurs de sommets (ombrage cuit) sont interpolées. Sinon le GLB brut est recopié tel quel
  (aucune dérive de noms ni de matériaux due à l'aller-retour Blender).
- L'aperçu imite le rendu du Village Talas : dégradé toon à 4 paliers (#8a8a8a -> #ffffff),
  couleur du rôle x COLOR_0, contour encre par coque inversée (x1,06 dans le jeu), lumière hémisphère + soleil.
"""
import bpy, bmesh, sys, os, math, shutil, json
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
A = {'in': None, 'out': None, 'png': None, 'max-tris': '0', 'yaw': '35', 'pitch': '22', 'px': '640', 'bg': '#f4ead8', 'palette': None}
i = 0
while i < len(argv):
    k = argv[i].lstrip('-'); A[k] = argv[i + 1]; i += 2
src = os.path.abspath(A['in'])
max_tris = int(A['max-tris'])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']

def tri_count(objs):
    n = 0
    for o in objs:
        o.data.calc_loop_triangles(); n += len(o.data.loop_triangles)
    return n

before = tri_count(meshes)
after = before
if max_tris and before > max_tris:
    # réduction prise sur les gros maillages : chaque maillage garde au moins FLOOR triangles,
    # sinon les petits détails (charnières, voyants) disparaissent les premiers
    FLOOR = 48
    counts = {o.name: tri_count([o]) for o in meshes}
    kept = sum(min(t, FLOOR) for t in counts.values())
    big = sum(max(0, t - FLOOR) for t in counts.values())
    f = max(0.02, (max_tris - kept) / big) if big else 1
    for o in meshes:
        t = counts[o.name]
        if t <= FLOOR or f >= 1: continue
        m = o.modifiers.new('budget', 'DECIMATE'); m.decimate_type = 'COLLAPSE'
        m.ratio = (FLOOR + (t - FLOOR) * f) / t; m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o
        with bpy.context.temp_override(object=o, active_object=o):
            bpy.ops.object.modifier_apply(modifier=m.name)
    for o in list(meshes):  # un maillage vidé par la décimation ne doit pas laisser de nœud creux
        if tri_count([o]) == 0:
            meshes.remove(o); bpy.data.objects.remove(o, do_unlink=True)
    after = tri_count(meshes)

if A['out']:
    out = os.path.abspath(A['out']); os.makedirs(os.path.dirname(out), exist_ok=True)
    if after == before:
        shutil.copyfile(src, out)
    else:
        kw = dict(filepath=out, export_format='GLB', use_selection=False, export_apply=True, export_yup=True,
                  export_texcoords=False, export_normals=True, export_materials='EXPORT', export_animations=False,
                  export_skins=False, export_morph=False, export_extras=False, export_cameras=False, export_lights=False)
        for colour_kw in ({'export_vertex_color': 'ACTIVE'}, {'export_colors': True}, {}):
            try:
                bpy.ops.export_scene.gltf(**kw, **colour_kw); break
            except TypeError:
                continue

# ---------------- aperçu toon ----------------
if A['png']:
    def rgb(h):
        h = h.lstrip('#'); c = [int(h[j:j + 2], 16) / 255 for j in (0, 2, 4)]
        return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
    ink = bpy.data.materials.new('ink'); ink.use_nodes = True; ink.use_backface_culling = True
    nt = ink.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value = rgb('#2b2233')
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])

    # couleurs des rôles : le fichier .roles.json à côté du GLB brut fait foi
    roles_path = src[:-4] + '.roles.json'
    roles = json.load(open(roles_path, encoding='utf8'))['roles'] if os.path.exists(roles_path) else {}
    # direction artistique : même résolution par famille que TalasProps.themePalette
    theme = json.load(open(A['palette'], encoding='utf8')) if A['palette'] else {}
    tmap, tstyle = theme.get('roles', {}), theme.get('style', {})
    if tstyle.get('background'): A['bg'] = tstyle['background']
    for k, v in roles.items():
        if k.startswith('lum_'): continue
        fam = k.rstrip('0123456789'); hue = fam.split('_')[0]
        if fam in tmap or hue in tmap: v['hex'] = tmap.get(fam) or tmap[hue]
    outline = tstyle.get('outline', True)
    for mat in {s.material for ob in meshes for s in ob.material_slots if s.material}:
        key = mat.name.split('.')[0]
        base = rgb(roles[key]['hex']) if key in roles else list(mat.diffuse_color)
        unlit = key.startswith('lum_')
        mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear(); L = nt.links.new
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        col = nt.nodes.new('ShaderNodeVertexColor')  # COLOR_0 importé (ombrage cuit)
        mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
        mul.inputs[6].default_value = base; L(col.outputs['Color'], mul.inputs[7])
        emi = nt.nodes.new('ShaderNodeEmission')
        if unlit:
            L(mul.outputs[2], emi.inputs[0])
        else:
            dif = nt.nodes.new('ShaderNodeBsdfDiffuse'); s2r = nt.nodes.new('ShaderNodeShaderToRGB')
            ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
            steps = [(0.0, '#8a8a8a'), (0.18, '#b8b8b8'), (0.42, '#e6e6e6'), (0.7, '#ffffff')]
            cr.elements[0].position, cr.elements[0].color = steps[0][0], rgb(steps[0][1])
            cr.elements[1].position, cr.elements[1].color = steps[1][0], rgb(steps[1][1])
            for p, h in steps[2:]:
                el = cr.elements.new(p); el.color = rgb(h)
            bw = nt.nodes.new('ShaderNodeRGBToBW')
            L(dif.outputs[0], s2r.inputs[0]); L(s2r.outputs[0], bw.inputs[0]); L(bw.outputs[0], ramp.inputs[0])
            m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.blend_type = 'MULTIPLY'; m2.inputs['Factor'].default_value = 1
            L(mul.outputs[2], m2.inputs[6]); L(ramp.outputs[0], m2.inputs[7]); L(m2.outputs[2], emi.inputs[0])
        L(emi.outputs[0], out.inputs[0])

    # boîte englobante -> contour et caméra
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for ob in meshes:
        for c in ob.bound_box:
            w = ob.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    size = hi - lo; centre = (hi + lo) / 2; radius = max(size.length / 2, 1e-3)
    for ob in (meshes if outline else []):
        ob.data.materials.append(ink)
        # coque inversée vers l'extérieur ; épaisseur bornée par la plus petite dimension du maillage
        # (sinon la coque d'une plaque fine recouvre les couches posées dessus)
        dims = sorted(ob.dimensions)
        thin = dims[0] if dims[0] > 1e-4 else dims[1]
        s = ob.modifiers.new('contour', 'SOLIDIFY'); s.thickness = min(radius * 0.02, max(thin * 0.3, radius * 0.002))
        s.offset = 1; s.use_even_offset = False; s.use_flip_normals = True  # even_offset explose sur les coins dégénérés après décimation
        s.use_rim = False; s.material_offset = len(ob.data.materials) - 1

    sc = bpy.context.scene
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'BLENDER_WORKBENCH'):
        try:
            sc.render.engine = eng; break
        except TypeError:
            continue
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x = sc.render.resolution_y = int(A['px'])
    sc.render.film_transparent = False
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = rgb(A['bg'])
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 3.2; sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50
    yaw, pitch = math.radians(float(A['yaw'])), math.radians(float(A['pitch']))
    dist = radius / math.sin(math.atan(18 / cam.data.lens)) * 1.08
    # glTF Y-up importé en Z-up : l'avant du modèle (+Z glTF) devient -Y Blender
    d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    cam.location = centre + d * dist
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.abspath(A['png'])
    bpy.ops.render.render(write_still=True)

print('FORGE_BLENDER ' + json.dumps({'tris_before': before, 'tris_after': after, 'out': A['out'], 'png': A['png']}))
