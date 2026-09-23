"""Build the brass-helmet diver for Abysses & babioles: mesh, armature, weights, materials and animations.
Run: Blender --background --python tools/blender-diver.py -- assets/diver.glb [preview-prefix]
Everything is modelled from primitives and a skin-modifier skeleton, then joined into one skinned mesh.
Actions exported: idle, walk, bound, brush (in place, no root motion). Empties mark the hose, valve, lamp and brush tip."""
import bpy, bmesh, sys, math, random
from mathutils import Vector, Matrix, Euler, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'assets/diver.glb'
PREVIEW = argv[1] if len(argv) > 1 else None
random.seed(4)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
dg = lambda: bpy.context.evaluated_depsgraph_get()

# ---------------------------------------------------------------- textures (generated, packed in the GLB)
def image(name, w, h, fn, alpha=False, non_color=False):
    img = bpy.data.images.new(name, w, h, alpha=alpha)
    px = [0.0] * (w * h * 4)
    for j in range(h):
        for i in range(w):
            r, g, b = fn(i / w, j / h)
            k = (j * w + i) * 4
            px[k:k + 4] = [r, g, b, 1.0]
    img.pixels = px
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    img.pack()
    return img

def weave_h(u, v):
    # plain canvas weave: alternating warp and weft bumps, plus coarse wrinkles
    a = math.sin(u * math.pi * 2 * 40); b = math.sin(v * math.pi * 2 * 40)
    cell = (math.floor(u * 40) + math.floor(v * 40)) % 2
    wv = (abs(a) if cell else abs(b)) * 0.5
    wr = noise.noise(Vector((u * 6, v * 6, 0.3))) * 0.9
    return wv + wr

def normal_from(hfn, strength):
    e = 1 / 256
    def fn(u, v):
        dx = (hfn(u + e, v) - hfn(u - e, v)) * strength
        dy = (hfn(u, v + e) - hfn(u, v - e)) * strength
        n = Vector((-dx, -dy, 1)).normalized()
        return (n.x * .5 + .5, n.y * .5 + .5, n.z * .5 + .5)
    return fn

def suit_col(u, v):
    p = Vector((u * 5, v * 5, 1.7))
    k = noise.noise(p) * .5 + .5
    stain = max(0, noise.noise(p * .6 + Vector((3, 1, 0)))) * .35
    base = Vector((.95, .62, .2)) * (0.88 + .18 * k) * (1 - stain)
    seam = 1.0 if abs((u * 4) % 1 - .5) < .012 else 0.0
    base = base * (1 - .35 * seam)
    return tuple(base)

def copper_col(u, v):
    p = Vector((u * 7, v * 7, .2))
    k = noise.noise(p) * .5 + .5
    pat = max(0.0, noise.noise(p * 1.7 + Vector((5, 2, 1)))) ** 1.5
    c = Vector((.72, .36, .17)) * (0.8 + .3 * k)
    c = c.lerp(Vector((.22, .42, .34)), min(.55, pat * .9))
    return tuple(c)

def leather_col(u, v):
    k = noise.noise(Vector((u * 20, v * 20, .5))) * .5 + .5
    return tuple(Vector((.28, .15, .07)) * (.8 + .35 * k))

TEX_SUIT = image('suit_col', 256, 256, suit_col)
TEX_SUIT_N = image('suit_nrm', 256, 256, normal_from(weave_h, 3.0), non_color=True)
TEX_COPPER = image('copper_col', 256, 256, copper_col)
TEX_LEATHER = image('leather_col', 128, 128, leather_col)

# ---------------------------------------------------------------- materials
def mat(name, col, metal=0.0, rough=0.5, tex=None, ntex=None, nstr=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*col, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    if ntex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = ntex
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m

M = {
    'copper': mat('copper', (.72, .38, .2), 1, .34, TEX_COPPER),
    'brass': mat('brass', (.86, .64, .3), 1, .26),
    'suit': mat('suit', (.78, .56, .24), 0, .92, TEX_SUIT, TEX_SUIT_N, 1.0),
    'leather': mat('leather', (.3, .17, .08), 0, .62, TEX_LEATHER),
    'rubber': mat('rubber', (.05, .045, .04), 0, .55),
    'lead': mat('lead', (.27, .28, .3), .45, .58),
    'glass': mat('glass', (.015, .04, .05), .15, .04),
    'net': mat('net', (.35, .24, .12), 0, .9),
    'wood': mat('wood', (.42, .26, .12), 0, .7),
    'bristle': mat('bristle', (.82, .72, .5), 0, .9),
}

# ---------------------------------------------------------------- helpers
PARTS = []  # (object, bone or None for automatic weights)

def add(obj, material, bone=None):
    obj.data.materials.clear(); obj.data.materials.append(M[material])
    for p in obj.data.polygons:
        p.use_smooth = True
    PARTS.append((obj, bone))
    return obj

def realize(obj):
    """Apply all modifiers by rebuilding the mesh from the evaluated object."""
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg()))
    obj.modifiers.clear(); old = obj.data; obj.data = me; bpy.data.meshes.remove(old)
    return obj

def prim(kind, **kw):
    getattr(bpy.ops.mesh, 'primitive_' + kind + '_add')(**kw)
    return bpy.context.active_object

def box_uv(obj, scale=3.0):
    me = obj.data
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        n = poly.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            co = obj.matrix_world @ me.vertices[me.loops[li].vertex_index].co
            a, b = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
            uv.data[li].uv = (a * scale, b * scale)

# ---------------------------------------------------------------- armature
BONES = {
    # name: (head, tail, parent)
    'hips': ((0, 0, .92), (0, 0, 1.08), None),
    'spine': ((0, 0, 1.08), (0, 0, 1.26), 'hips'),
    'chest': ((0, 0, 1.26), (0, 0, 1.5), 'spine'),
    'upper_arm.L': ((.25, 0, 1.36), (.35, .01, 1.07), 'chest'),
    'forearm.L': ((.35, .01, 1.07), (.4, -.05, .82), 'upper_arm.L'),
    'hand.L': ((.4, -.05, .82), (.42, -.07, .69), 'forearm.L'),
    'thigh.L': ((.12, 0, .92), (.13, .01, .52), 'hips'),
    'shin.L': ((.13, .01, .52), (.13, .03, .14), 'thigh.L'),
    'foot.L': ((.13, .03, .14), (.13, -.13, .05), 'shin.L'),
}
for n in list(BONES):
    if n.endswith('.L'):
        h, t, p = BONES[n]
        BONES[n[:-2] + '.R'] = ((-h[0], h[1], h[2]), (-t[0], t[1], t[2]), p[:-2] + '.R' if p and p.endswith('.L') else p)

arm_data = bpy.data.armatures.new('DiverRig')
rig = bpy.data.objects.new('DiverRig', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
for n, (h, t, p) in BONES.items():
    b = arm_data.edit_bones.new(n); b.head = h; b.tail = t
    b.roll = 0
    eb[n] = b
for n, (h, t, p) in BONES.items():
    if p: eb[n].parent = eb[p]; eb[n].use_connect = Vector(eb[n].head) == Vector(eb[p].tail)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- suit (skin modifier skeleton)
def skin_body(name, verts, edges, radii, subdiv=2, disp=0.0):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, edges, []); obj = bpy.data.objects.new(name, me)
    scene.collection.objects.link(obj); bpy.context.view_layer.objects.active = obj
    sk = obj.modifiers.new('skin', 'SKIN'); sk.use_smooth_shade = True
    for i, r in enumerate(radii):
        me.skin_vertices[0].data[i].radius = r
    me.skin_vertices[0].data[0].use_root = True
    obj.modifiers.new('sub', 'SUBSURF').levels = subdiv
    if disp:
        tex = bpy.data.textures.new(name + '_w', 'CLOUDS'); tex.noise_scale = .06; tex.noise_depth = 2
        d = obj.modifiers.new('wrinkles', 'DISPLACE'); d.texture = tex; d.strength = disp; d.mid_level = .5
    return realize(obj)

sv = [(0, 0, .86), (0, 0, 1.0), (0, 0, 1.16), (0, 0, 1.32),                       # 0-3 torso
      (.13, 0, .9), (.135, .01, .52), (.135, .03, .2),                               # 4-6 left leg
      (-.13, 0, .9), (-.135, .01, .52), (-.135, .03, .2),                            # 7-9 right leg
      (.25, 0, 1.33), (.35, .01, 1.07), (.395, -.045, .84),                          # 10-12 left arm
      (-.25, 0, 1.33), (-.35, .01, 1.07), (-.395, -.045, .84)]                       # 13-15 right arm
se = [(0, 1), (1, 2), (2, 3), (0, 4), (4, 5), (5, 6), (0, 7), (7, 8), (8, 9), (3, 10), (10, 11), (11, 12), (3, 13), (13, 14), (14, 15)]
sr = [(.2, .15), (.215, .16), (.235, .17), (.21, .16),
      (.12, .12), (.1, .1), (.09, .09), (.12, .12), (.1, .1), (.09, .09),
      (.09, .09), (.08, .08), (.065, .065), (.09, .09), (.08, .08), (.065, .065)]
suit = skin_body('suit', sv, se, sr, 2, .025)
box_uv(suit, 3.0)
add(suit, 'suit')

# rubber cuffs at the wrists and the tops of the boots
for s in (1, -1):
    add(prim('cylinder', radius=.068, depth=.06, location=(s * .397, -.048, .83), rotation=(math.radians(12), math.radians(-s * 10), 0)), 'rubber', 'hand.' + ('L' if s > 0 else 'R'))

# gloves: palm, thumb and a mitten of fingers
for s, side in ((1, 'L'), (-1, 'R')):
    g = skin_body('glove' + side, [(s * .4, -.05, .8), (s * .41, -.07, .72), (s * .42, -.08, .65), (s * .37, -.09, .74), (s * .355, -.11, .7)],
                  [(0, 1), (1, 2), (0, 3), (3, 4)], [(.052, .045), (.058, .036), (.045, .03), (.025, .025), (.02, .02)], 2)
    box_uv(g, 6); add(g, 'leather', 'hand.' + side)

# boots: heavy leather with brass toe caps and lead soles
for s, side in ((1, 'L'), (-1, 'R')):
    b = prim('cube', size=1, location=(s * .135, -.035, .09)); b.scale = (.17, .34, .15)
    bev = b.modifiers.new('bev', 'BEVEL'); bev.width = .05; bev.segments = 2
    b.modifiers.new('sub', 'SUBSURF').levels = 2
    realize(b); box_uv(b, 6); add(b, 'leather', 'foot.' + side)
    cap = prim('uv_sphere', radius=.09, location=(s * .135, -.165, .085), segments=20, ring_count=12); cap.scale = (1, .8, .75)
    add(realize(cap), 'brass', 'foot.' + side)
    sole = prim('cube', size=1, location=(s * .135, -.04, .015)); sole.scale = (.19, .38, .04)
    sole.modifiers.new('bev', 'BEVEL').width = .01
    add(realize(sole), 'lead', 'foot.' + side)
    for k in range(3):  # lace straps
        st = prim('cube', size=1, location=(s * .135, .02 - k * .06, .17)); st.scale = (.18, .015, .02)
        add(realize(st), 'brass' if k == 1 else 'leather', 'foot.' + side)

# ---------------------------------------------------------------- helmet, corselet, weights (rigid, on the chest)
HC = Vector((0, 0, 1.66))
dome = prim('uv_sphere', radius=.27, location=HC, segments=48, ring_count=32); dome.scale = (1, 1, 1.04)
box_uv(realize(dome), 4); add(dome, 'copper', 'chest')
# ports: collar, rim, glass, bolts, grille
def port(center, normal, r, bars=0):
    n = Vector(normal).normalized(); rot = n.to_track_quat('Z', 'Y').to_euler()
    c = Vector(center)
    add(realize(prim('cylinder', radius=r * 1.2, depth=.07, location=c - n * .01, rotation=rot, vertices=32)), 'brass', 'chest')
    add(realize(prim('torus', major_radius=r * 1.13, minor_radius=.02, location=c + n * .025, rotation=rot, major_segments=36, minor_segments=10)), 'brass', 'chest')
    add(realize(prim('cylinder', radius=r * 1.05, depth=.01, location=c + n * .022, rotation=rot, vertices=32)), 'glass', 'chest')
    rm = rot.to_matrix()
    for i in range(6):
        a = i / 6 * math.tau
        p = c + rm @ Vector((math.cos(a) * r * 1.34, math.sin(a) * r * 1.34, .03))
        add(realize(prim('cylinder', radius=.014, depth=.03, location=p, rotation=rot, vertices=6)), 'brass', 'chest')
    for i in range(bars):
        x = (i - (bars - 1) / 2) * r * .6
        p = c + rm @ Vector((x, 0, .05))
        add(realize(prim('cylinder', radius=.008, depth=r * 2.1, location=p, rotation=(rot.to_matrix() @ Euler((math.pi / 2, 0, 0)).to_matrix()).to_euler(), vertices=8)), 'brass', 'chest')
port(HC + Vector((0, -.255, -.01)), (0, -1, -.05), .105, 3)
port(HC + Vector((.25, -.06, -.01)), (.97, -.25, 0), .075)
port(HC + Vector((-.25, -.06, -.01)), (-.97, -.25, 0), .075)
port(HC + Vector((0, -.17, .2)), (0, -.62, .78), .055)
# exhaust valve (right), air inlet gooseneck (back left)
add(realize(prim('cylinder', radius=.03, depth=.12, location=HC + Vector((-.27, .02, -.16)), rotation=(0, math.pi / 2, 0), vertices=16)), 'brass', 'chest')
add(realize(prim('cylinder', radius=.04, depth=.03, location=HC + Vector((-.33, .02, -.16)), rotation=(0, math.pi / 2, 0), vertices=16)), 'brass', 'chest')
add(realize(prim('cylinder', radius=.034, depth=.14, location=HC + Vector((.08, .27, -.12)), rotation=(math.radians(60), 0, 0), vertices=16)), 'brass', 'chest')
add(realize(prim('torus', major_radius=.27, minor_radius=.032, location=(0, 0, 1.43), major_segments=48, minor_segments=12)), 'brass', 'chest')
# corselet: a flared, slightly flattened collar that rests on the shoulders
cors = prim('cone', radius1=.39, radius2=.27, depth=.24, location=(0, 0, 1.33), vertices=48, end_fill_type='NOTHING')
cors.scale = (1, .84, 1)
sol = cors.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .025
b2 = cors.modifiers.new('bev', 'BEVEL'); b2.width = .008; b2.segments = 2
box_uv(realize(cors), 4); add(cors, 'copper', 'chest')
for i in range(12):
    a = i / 12 * math.tau
    p = Vector((math.cos(a) * .365, math.sin(a) * .365 * .84, 1.235))
    add(realize(prim('cylinder', radius=.024, depth=.035, location=p, vertices=6)), 'brass', 'chest')
    wn = prim('cube', size=1, location=p + Vector((0, 0, .025))); wn.scale = (.05, .012, .02); wn.rotation_euler = (0, 0, a + math.pi / 2)
    add(realize(wn), 'brass', 'chest')
# lead weights hung front and back, with brass straps
for y, tilt in ((-.2, -.12), (.2, .12)):
    w = prim('cube', size=1, location=(0, y, 1.1), rotation=(tilt, 0, 0)); w.scale = (.34, .07, .22)
    w.modifiers.new('bev', 'BEVEL').width = .015
    add(realize(w), 'lead', 'chest')
    for x in (-.1, .1):
        st = prim('cube', size=1, location=(x, y * 1.02, 1.21), rotation=(tilt, 0, 0)); st.scale = (.03, .075, .06)
        add(realize(st), 'brass', 'chest')
# belt, buckle, knife, net bag
belt = prim('torus', major_radius=.215, minor_radius=.03, location=(0, 0, .9), major_segments=48, minor_segments=8); belt.scale = (1, .78, .9)
add(realize(belt), 'leather', 'hips')
add(realize(prim('cube', size=1, location=(0, -.175, .9), scale=(.07, .02, .06))), 'brass', 'hips')
sh = prim('cube', size=1, location=(-.22, -.02, .76), rotation=(0, math.radians(-6), 0)); sh.scale = (.06, .035, .26)
sh.modifiers.new('bev', 'BEVEL').width = .01; add(realize(sh), 'leather', 'hips')
add(realize(prim('cylinder', radius=.018, depth=.1, location=(-.225, -.02, .93), vertices=10)), 'brass', 'hips')
bag = prim('uv_sphere', radius=.12, location=(.24, .02, .7), segments=12, ring_count=8); bag.scale = (.75, .6, 1.2)
wf = bag.modifiers.new('wire', 'WIREFRAME'); wf.thickness = .008
add(realize(bag), 'net', 'hips')
# brush in the right hand
add(realize(prim('cylinder', radius=.013, depth=.26, location=(-.43, -.12, .64), rotation=(math.radians(75), 0, 0), vertices=8)), 'wood', 'hand.R')
add(realize(prim('cube', size=1, location=(-.43, -.25, .6), scale=(.06, .05, .03))), 'bristle', 'hand.R')

# ---------------------------------------------------------------- weights and join
def seg_dist(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length

bone_segs = {n: (Vector(h), Vector(t)) for n, (h, t, _) in BONES.items()}
def auto_weights(obj):
    vgs = {n: obj.vertex_groups.new(name=n) for n in BONES}
    for v in obj.data.vertices:
        p = obj.matrix_world @ v.co
        ds = sorted(((seg_dist(p, *bone_segs[n]), n) for n in BONES))[:3]
        # arms and legs should not borrow from the other side or the torso across the gap
        w = [(n, 1 / (d + .02) ** 4) for d, n in ds]
        tot = sum(x for _, x in w)
        for n, x in w:
            if x / tot > .02: vgs[n].add([v.index], x / tot, 'REPLACE')

for obj, bone in PARTS:
    obj.data.transform(obj.matrix_world); obj.matrix_world = Matrix()
    if bone:
        obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    else:
        auto_weights(obj)

bpy.ops.object.select_all(action='DESELECT')
for obj, _ in PARTS: obj.select_set(True)
body = PARTS[0][0]; bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = 'Diver'
mod = body.modifiers.new('rig', 'ARMATURE'); mod.object = rig
body.parent = rig

# attachment points
def empty(name, bone, loc):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e)
    e.parent = rig; e.parent_type = 'BONE'; e.parent_bone = bone
    pb = rig.data.bones[bone]
    e.matrix_world = Matrix.Translation(loc)
    return e
empty('hose_anchor', 'chest', (.08, .31, 1.58))
empty('valve', 'chest', (-.36, .02, 1.5))
empty('lamp_anchor', 'chest', (0, -.3, 1.64))
empty('brush_tip', 'hand.R', (-.43, -.27, .58))

# ---------------------------------------------------------------- animation
FPS = 30; scene.render.fps = FPS
for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'
D = math.radians

def action(name, frames, fn, loop=True):
    act = bpy.data.actions.new(name)
    rig.animation_data_create(); rig.animation_data.action = act
    for f in range(frames + 1):
        t = f / frames
        pose = fn(t)
        for pb in rig.pose.bones:
            pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
        for bn, val in pose.items():
            pb = rig.pose.bones[bn]
            if 'rot' in val: pb.rotation_euler = [D(x) for x in val['rot']]
            if 'loc' in val: pb.location = val['loc']
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_euler', frame=f + 1); pb.keyframe_insert('location', frame=f + 1)
    act.use_fake_user = True
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 1, act); tr.mute = True
    return act

# Bone rotations are in each bone's local frame: for a limb hanging down, +X swings the tip backwards.
def idle(t):
    s = math.sin(t * math.tau); c = math.cos(t * math.tau)
    return {'hips': {'loc': (0, .008 * s, 0)}, 'spine': {'rot': (1.5 * s, 0, .8 * c)}, 'chest': {'rot': (1.2 * s, 0, 0)},
            'upper_arm.L': {'rot': (-4 + 3 * c, 0, 6 + 2 * s)}, 'upper_arm.R': {'rot': (-4 - 3 * c, 0, -6 - 2 * s)},
            'forearm.L': {'rot': (-14 - 3 * s, 0, 0)}, 'forearm.R': {'rot': (-12 + 3 * s, 0, 0)},
            'thigh.L': {'rot': (-2, 0, 0)}, 'thigh.R': {'rot': (-2, 0, 0)}, 'shin.L': {'rot': (4, 0, 0)}, 'shin.R': {'rot': (4, 0, 0)}}

def walk(t):
    # one full cycle = two heavy steps; the lead boot drags forward, the body rolls over it
    a = t * math.tau; s = math.sin(a); c = math.cos(a)
    lift_l = max(0, math.sin(a + math.pi / 2)) ; lift_r = max(0, math.sin(a - math.pi / 2))
    bob = -abs(math.sin(a)) * .035 + .012
    return {'hips': {'loc': (0, bob, 0), 'rot': (6, 0, 4 * s)},
            'spine': {'rot': (4, 5 * s, -2 * s)}, 'chest': {'rot': (2, 5 * s, 0)},
            'thigh.L': {'rot': (-17 * s - 4, 0, 0)}, 'thigh.R': {'rot': (17 * s - 4, 0, 0)},
            'shin.L': {'rot': (6 + 30 * lift_l, 0, 0)}, 'shin.R': {'rot': (6 + 30 * lift_r, 0, 0)},
            'foot.L': {'rot': (-4 * s - 6 * lift_l, 0, 0)}, 'foot.R': {'rot': (4 * s - 6 * lift_r, 0, 0)},
            'upper_arm.L': {'rot': (16 * s - 4, 0, 8)}, 'upper_arm.R': {'rot': (-16 * s - 4, 0, -8)},
            'forearm.L': {'rot': (-22 + 8 * s, 0, 0)}, 'forearm.R': {'rot': (-22 - 8 * s, 0, 0)}}

def bound(t):
    # crouch, push, tuck in the air, reach down for the landing
    k = math.sin(min(1, t * 1.6) * math.pi)
    return {'hips': {'loc': (0, -.05 * (1 - k), 0), 'rot': (10 * k, 0, 0)},
            'thigh.L': {'rot': (-40 * k - 8, 0, 0)}, 'thigh.R': {'rot': (-30 * k - 8, 0, 0)},
            'shin.L': {'rot': (55 * k + 10, 0, 0)}, 'shin.R': {'rot': (45 * k + 10, 0, 0)},
            'upper_arm.L': {'rot': (-35 * k, 0, 25 * k + 8)}, 'upper_arm.R': {'rot': (-35 * k, 0, -25 * k - 8)},
            'forearm.L': {'rot': (-30, 0, 0)}, 'forearm.R': {'rot': (-30, 0, 0)}, 'spine': {'rot': (6 * k, 0, 0)}}

def brush(t):
    # kneel on the sand and sweep the brush left and right
    s = math.sin(t * math.tau)
    return {'hips': {'loc': (0, -.3, .02), 'rot': (8, 0, 0)}, 'spine': {'rot': (22, 0, 0)}, 'chest': {'rot': (14, 3 * s, 0)},
            'thigh.L': {'rot': (-68, 0, 6)}, 'shin.L': {'rot': (105, 0, 0)}, 'foot.L': {'rot': (-38, 0, 0)},
            'thigh.R': {'rot': (-62, 0, -6)}, 'shin.R': {'rot': (100, 0, 0)}, 'foot.R': {'rot': (-38, 0, 0)},
            'upper_arm.R': {'rot': (-55, 0, -10 + 16 * s)}, 'forearm.R': {'rot': (-30, 12 * s, 0)}, 'hand.R': {'rot': (0, 0, 20 * s)},
            'upper_arm.L': {'rot': (-30, 0, 12)}, 'forearm.L': {'rot': (-45, 0, 0)}}

action('idle', 120, idle)
action('walk', 42, walk)
action('bound', 36, bound, loop=False)
action('brush', 24, brush)
rig.animation_data.action = None

# ---------------------------------------------------------------- preview renders (optional)
if PREVIEW:
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
    cam.location = (2.2, -3.2, 1.4); cam.rotation_euler = (math.radians(84), 0, math.radians(34)); scene.camera = cam
    sunl = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sunl.data.energy = 4; sunl.rotation_euler = (math.radians(40), 0, math.radians(30)); scene.collection.objects.link(sunl)
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.05, .2, .26, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.2; scene.world = w
    scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x = 480; scene.render.resolution_y = 600
    for name, fr in (('idle', 1), ('walk', 11), ('bound', 12), ('brush', 6)):
        rig.animation_data.action = bpy.data.actions[name]; scene.frame_set(fr)
        scene.render.filepath = f'{PREVIEW}-{name}.png'; bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None

# ---------------------------------------------------------------- export
bpy.ops.object.select_all(action='DESELECT')
for o in (rig, body, *[o for o in scene.objects if o.type == 'EMPTY']): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animation_mode='ACTIONS',
                          export_apply=False, export_yup=True, export_skins=True, export_def_bones=False, export_image_format='AUTO')
print('diver exported', OUT, len(body.data.polygons), 'faces')
