"""Outils partagés pour pré-calculer les sprites du centre de doc (Village Talas) avec Blender.

Convention : une case de jeu (i, j) = 1 m. Blender X = i, Y = -j, Z = hauteur.
La caméra orthographique est isométrique 2:1, comme Theme Hospital : une case fait
32*S px de large et 16*S px de haut à l'écran, 1 m de hauteur fait 19,6*S px.
"""
import bpy, math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

_mats = {}
S = 2.7                       # pixels par unité de jeu, identique au canvas
K = 16 * S / math.cos(math.radians(45))   # pixels par mètre, perpendiculairement à la vue

def srgb(h):
    h = h.lstrip('#')
    c = [int(h[k:k + 2], 16) / 255 for k in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.render.filter_size = 1.0
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (*srgb('#c9d6f0'), 1); bg.inputs[1].default_value = 0.9
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(12)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    d = Vector((-0.35, 1.0, -1.45)).normalized()   # la lumière vient du côté +j (gauche de l'écran) et d'en haut
    so.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (math.radians(60), 0, math.radians(45))
    return sc, co

def place_camera(sc, co, w, h, ax, ay, origin=(0, 0, 0)):
    """Image w x h px ; le point monde `origin` tombe sur le pixel (ax, ay) compté depuis le haut à gauche."""
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    cam = co.data; m = max(w, h)
    cam.ortho_scale = m / K
    direction = co.rotation_euler.to_matrix() @ Vector((0, 0, -1))
    co.location = Vector(origin) - direction * 60
    cam.shift_x = (w / 2 - ax) / m
    cam.shift_y = (ay - h / 2) / m
    cam.clip_end = 200

def proj(sc, co, p):
    v = world_to_camera_view(sc, co, Vector(p))
    return v.x * sc.render.resolution_x, (1 - v.y) * sc.render.resolution_y

def mat(col, rough=0.55, spec=0.35, name=None, emit=0.0):
    key = (col, rough, spec, emit, name)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name or col); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(col), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = spec
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(col), 1); b.inputs['Emission Strength'].default_value = emit
    _mats[key] = m
    return m

def tile_mat(c1, c2, mortar, axis, scale=(6, 9), name=None, brick=False):
    """Carrelage (ou briques) procédural sur un mur vertical ; axis = 'X' ou 'Y' selon l'orientation du mur."""
    key = ('tile', c1, c2, mortar, axis, scale, brick)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name or 'tile'); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.45 if not brick else 0.8
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    nt.links.new(sep.outputs[axis], comb.inputs[0]); nt.links.new(sep.outputs['Z'], comb.inputs[1])
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.inputs['Color1'].default_value = (*srgb(c1), 1); br.inputs['Color2'].default_value = (*srgb(c2), 1); br.inputs['Mortar'].default_value = (*srgb(mortar), 1)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = 0.012 if not brick else 0.018
    br.inputs['Brick Width'].default_value = 1 / scale[0]; br.inputs['Row Height'].default_value = 1 / scale[1]
    br.offset = 0.5 if brick else 0.0
    nt.links.new(comb.outputs[0], br.inputs['Vector']); nt.links.new(br.outputs['Color'], b.inputs['Base Color'])
    _mats[key] = m
    return m

def noise_mat(c1, c2, scale=40, rough=0.8, stripes=None, name=None):
    key = ('noise', c1, c2, scale, stripes)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name or 'noise'); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Specular IOR Level'].default_value = 0.15
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (*srgb(c1), 1); ramp.color_ramp.elements[1].color = (*srgb(c2), 1)
    ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[1].position = 0.65
    fac = nz.outputs['Fac']
    if stripes:
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'; wv.inputs['Scale'].default_value = stripes; wv.wave_profile = 'SAW'
        nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
        mix = nt.nodes.new('ShaderNodeMath'); mix.operation = 'ADD'
        sq = nt.nodes.new('ShaderNodeMath'); sq.operation = 'GREATER_THAN'; sq.inputs[1].default_value = 0.5
        nt.links.new(wv.outputs['Fac'], sq.inputs[0])
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.22
        nt.links.new(sq.outputs[0], mul.inputs[0]); nt.links.new(nz.outputs['Fac'], mix.inputs[0]); nt.links.new(mul.outputs[0], mix.inputs[1]); fac = mix.outputs[0]
    nt.links.new(fac, ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    _mats[key] = m
    return m

def coll(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(c)
    return c

def add(kind, loc, scale=(1, 1, 1), m=None, rot=(0, 0, 0), c=None, bevel=0.0, smooth=False, v=24, r2=0.0, parent=None):
    if kind == 'cube': bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    elif kind == 'cyl': bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=0.5, depth=1, location=loc)
    elif kind == 'sph': bpy.ops.mesh.primitive_uv_sphere_add(segments=v, ring_count=max(8, v // 2), radius=0.5, location=loc)
    elif kind == 'cone': bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=0.5, radius2=r2, depth=1, location=loc)
    elif kind == 'torus': bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.12, location=loc)
    o = bpy.context.active_object
    o.scale = scale; o.rotation_euler = rot
    if bevel:
        md = o.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    if m: o.data.materials.append(m)
    if c:
        for u in list(o.users_collection): u.objects.unlink(o)
        c.objects.link(o)
    if parent:
        o.parent = parent
    return o

def empty(name, loc, parent=None, c=None):
    e = bpy.data.objects.new(name, None); e.location = loc
    (c or bpy.context.scene.collection).objects.link(e)
    if parent: e.parent = parent
    return e
