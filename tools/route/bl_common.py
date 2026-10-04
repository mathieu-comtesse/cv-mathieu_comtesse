"""Outils communs des modèles 3D de « Route & vigilance » (Blender, module bpy ou `blender --background --python`).
Conventions : l'avant du véhicule regarde vers -Y (Blender) = +Z (glTF), Z haut, largeur le long de X, mètres.
Matériaux nommés : le jeu reconnaît « peinture » (recoloré par véhicule), « verre », « phare », « feu_ar », « frein_feu », « clignotant », « plaque »…"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

_MATS = {}
def reset():
    _MATS.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene

def mat(name, col=(.8, .8, .8), rough=.5, metal=0.0, emit=None, emit_strength=1.0, alpha=1.0):
    key = name
    if key in _MATS and _MATS[key].name in bpy.data.materials: return _MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.diffuse_color = (*col, 1)
    if emit is not None: m.diffuse_color = (*emit, 1)
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    _MATS[key] = m; return m

def palette():
    return {
        'peinture': mat('peinture', (1, 1, 1), .28, .55),
        'verre': mat('verre', (.05, .09, .12), .05, .0, alpha=.55),
        'chrome': mat('chrome', (.86, .87, .9), .12, 1.0),
        'caoutchouc': mat('caoutchouc', (.02, .02, .022), .82),
        'plastique': mat('plastique', (.045, .047, .052), .6),
        'plastique_gris': mat('plastique_gris', (.16, .165, .18), .55),
        'jante': mat('jante', (.72, .74, .78), .22, 1.0),
        'frein': mat('frein', (.35, .36, .38), .45, .9),
        'etrier': mat('etrier', (.7, .1, .08), .5, .2),
        'phare': mat('phare', (1, .97, .85), .15, 0, emit=(1, .95, .8), emit_strength=.7),
        'feu_ar': mat('feu_ar', (.55, .02, .03), .25, 0, emit=(1, .05, .04), emit_strength=.5),
        'clignotant': mat('clignotant', (.9, .45, .05), .3, 0, emit=(1, .5, .05), emit_strength=.25),
        'recul': mat('recul', (.9, .9, .9), .3),
        'plaque': mat('plaque', (.95, .95, .95), .4),
        'interieur': mat('interieur', (.1, .1, .115), .8),
        'siege': mat('siege', (.16, .16, .19), .85),
        'tissu_clair': mat('tissu_clair', (.5, .5, .52), .9),
        'peau': mat('peau', (.86, .66, .52), .7),
        'peau_fonce': mat('peau_fonce', (.45, .3, .22), .7),
        'cheveux': mat('cheveux', (.1, .07, .05), .8),
        'cheveux_clair': mat('cheveux_clair', (.62, .45, .22), .8),
        'metal': mat('metal', (.55, .56, .6), .35, .9),
        'bois': mat('bois', (.38, .25, .14), .8),
    }

def collection(): return bpy.context.scene.collection

def make_obj(name, me):
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o

def from_bm(name, bm, mats=None, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if mats:
        for m in mats: me.materials.append(m)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = make_obj(name, me); return o

def activate(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o

def modif(o, kind, **kw):
    m = o.modifiers.new(kind, kind); 
    for k, v in kw.items(): setattr(m, k, v)
    return m

def apply_all(o):
    activate(o)
    for m in list(o.modifiers):
        try: bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception as e: print('modifier non appliqué', o.name, m.name, e); o.modifiers.remove(m)
    return o

def subsurf(o, level=1, apply=True):
    m = modif(o, 'SUBSURF', levels=level, render_levels=level, subdivision_type='CATMULL_CLARK'); 
    if apply: apply_all(o)
    return o

def bevel(o, width=.01, segments=2, angle=35, apply=True):
    m = modif(o, 'BEVEL', width=width, segments=segments, limit_method='ANGLE', angle_limit=math.radians(angle))
    if apply: apply_all(o)
    return o

def box(name, size, loc=(0, 0, 0), mat_=None, bevel_w=0.0, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    o = from_bm(name, bm, [mat_] if mat_ else None, smooth=False); o.location = loc; o.rotation_euler = rot
    if bevel_w > 0:
        bevel(o, bevel_w, 2, 40); 
        for p in o.data.polygons: p.use_smooth = True
    return o

def cylinder(name, r, depth, loc=(0, 0, 0), axis='Z', mat_=None, seg=24, r2=None, caps=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=depth)
    o = from_bm(name, bm, [mat_] if mat_ else None, smooth=True); o.location = loc
    if axis == 'X': o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'Y': o.rotation_euler = (math.pi / 2, 0, 0)
    return o

def sphere(name, r, loc=(0, 0, 0), scale=(1, 1, 1), mat_=None, seg=24, rings=14):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    o = from_bm(name, bm, [mat_] if mat_ else None, smooth=True); o.location = loc; o.scale = scale; return o

def tube(name, pts, r, mat_=None, seg=8, caps=True):
    """tube de rayon r suivant une polyligne (cadre de vélo, membres)."""
    bm = bmesh.new()
    for a, b in zip(pts[:-1], pts[1:]):
        a, b = Vector(a), Vector(b); d = b - a
        if d.length < 1e-6: continue
        c = bmesh.ops.create_cone(bm, cap_ends=caps, segments=seg, radius1=r, radius2=r, depth=d.length)
        q = d.to_track_quat('Z', 'Y'); M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=M, verts=c['verts'])
    return from_bm(name, bm, [mat_] if mat_ else None, smooth=True)

def limb(name, a, b, r0, r1, mat_=None, seg=10):
    """segment conique de a à b (rayon r0 en a, r1 en b), extrémités arrondies."""
    a, b = Vector(a), Vector(b); d = b - a
    bm = bmesh.new(); c = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r0, depth=d.length)
    q = d.to_track_quat('Z', 'Y'); M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=c['verts'])
    o = from_bm(name, bm, [mat_] if mat_ else None, smooth=True)
    return o

def loft(name, stations, ring_fn, n_ring, mats=None, cap=True, closed=True):
    """balayage : stations = liste de paramètres ; ring_fn(station) -> liste de n_ring points (x, y, z) formant une boucle. Retourne l'objet."""
    bm = bmesh.new(); rings = []
    for st in stations:
        pts = ring_fn(st); rings.append([bm.verts.new(p) for p in pts])
    n = len(rings[0])
    for i in range(len(rings) - 1):
        for j in range(n):
            j2 = (j + 1) % n if closed else j + 1
            if not closed and j2 >= n: continue
            try: bm.faces.new((rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]))
            except ValueError: pass
    if cap and closed:
        for r in (rings[0], rings[-1]):
            try: bm.faces.new(r)
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return from_bm(name, bm, mats)

def revolve(name, profile, axis='Y', seg=48, mats=None, mat_index=None):
    """révolution d'un profil [(rayon, position_axiale)] autour de l'axe X (roues : axe latéral). axis='X' : axe de la roue."""
    bm = bmesh.new(); rings = []
    for (r, h) in profile:
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            if axis == 'X': ring.append(bm.verts.new((h, r * math.cos(a), r * math.sin(a))))
            else: ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), h)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(seg):
            k2 = (k + 1) % seg
            try:
                f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
                if mat_index: f.material_index = mat_index[i] if isinstance(mat_index, (list, tuple)) else mat_index
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return from_bm(name, bm, mats)

def join(objs, name):
    activate(objs[0])
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.active_object; o.name = name; o.data.name = name; return o

def set_origin(o, point):
    activate(o); bpy.context.scene.cursor.location = point
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); bpy.context.scene.cursor.location = (0, 0, 0)

def tris(objs):
    n = 0
    for o in objs:
        if o.type == 'MESH':
            n += sum(max(1, len(p.vertices) - 2) for p in o.data.polygons)
    return n

def parent(child, par, monde=True):
    """monde=True : l'enfant garde sa position dans le monde ; False : ses coordonnées deviennent locales au parent."""
    child.parent = par
    if monde: child.matrix_parent_inverse = par.matrix_world.inverted()

def empty(name, loc=(0, 0, 0), par=None):
    o = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(o); o.location = loc
    if par: parent(o, par, monde=False)
    return o

def export_glb(path, objs=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for x in bpy.context.selected_objects: x.select_set(False)
    for o in bpy.data.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_materials='EXPORT', export_cameras=False, export_lights=False, export_extras=False,
                              export_texcoords=True, export_normals=True, export_tangents=False)
    print('exporté', path, round(os.path.getsize(path) / 1024), 'Ko')

def preview(path, views=('3q', 'side', 'rear', 'front'), size=(900, 560), target=(0, 0, .8), dist=7.5, center=None):
    """planche de vues (moteur Workbench : fonctionne sans GPU)."""
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x, sc.render.resolution_y = size
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'; sc.display.shading.show_cavity = True
    sc.display.shading.cavity_type = 'BOTH'; sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w'); sc.world.color = (.55, .6, .68)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 45
    pos = {'3q': (1, -1, .45), 'side': (1, 0, .12), 'rear': (0, 1, .22), 'front': (0, -1, .25), 'top': (0, 0.01, 1)}
    t = Vector(target); outs = []
    for v in views:
        d = Vector(pos[v]).normalized() * dist; cam.location = t + d
        cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
        p = path.replace('.png', f'_{v}.png'); sc.render.filepath = p; bpy.ops.render.render(write_still=True); outs.append(p)
    return outs
