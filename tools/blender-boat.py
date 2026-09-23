"""Sponge divers' sailing boat and a cliffy island for Abysses & babioles.
Run: Blender --background --python tools/blender-boat.py -- assets/boat.glb [preview.png]
The boat is ~11 m long, waterline at z = 0 (glTF y = 0), bow towards +X. Empties: deck_spot (where the diver waits),
ladder_top, ladder_bottom (the side ladder), pump_out (the air pump outlet for the hose), lamp.
A separate object 'island' (about 300 m wide) is placed far off in the game."""
import bpy, bmesh, sys, math, random
from mathutils import Vector, Matrix, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'assets/boat.glb'
PREVIEW = argv[1] if len(argv) > 1 else None
random.seed(5)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, col, rough=.7, metal=0.0, vc=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if vc:
        ca = m.node_tree.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
        m.node_tree.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    return m
M = {'hull': mat('hull', (1, 1, 1), .55, vc=True), 'deck': mat('deck', (.5, .36, .22), .8), 'wood': mat('wood', (.38, .25, .14), .7),
     'dark': mat('dark', (.08, .07, .07), .6), 'canvas': mat('canvas', (.86, .78, .6), .9), 'rope': mat('rope', (.55, .45, .3), .95),
     'red': mat('red', (.55, .12, .08), .6), 'iron': mat('iron', (.15, .15, .16), .5, .7), 'brass': mat('brass', (.85, .62, .28), .3, 1),
     'blue': mat('blue', (.08, .16, .45), .8), 'white': mat('white', (.9, .9, .88), .8), 'lamp': mat('lamp', (1, .75, .4), .3),
     'island': mat('island', (1, 1, 1), .95, vc=True)}

BOAT = []
def put(obj, m):
    obj.data.materials.clear(); obj.data.materials.append(M[m])
    for p in obj.data.polygons: p.use_smooth = True
    BOAT.append(obj); return obj
def prim(kind, **kw):
    getattr(bpy.ops.mesh, 'primitive_' + kind + '_add')(**kw); return bpy.context.active_object
def realize(o):
    me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get())); o.modifiers.clear(); o.data = me; return o
def rod(a, b, r, m, seg=8):
    a, b = Vector(a), Vector(b); d = b - a
    o = prim('cylinder', radius=r, depth=d.length, location=(a + b) / 2, vertices=seg)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); return put(o, m)

# ---------------------------------------------------------------- hull: lofted U sections
L, B = 5.5, 1.6
def half_beam(t):  # t in [-1, 1], bow at +1 is finer than the stern
    k = 1 - abs(t) ** (1.8 if t > 0 else 2.6)
    return B * max(0.0, k) ** .55
def sheer(t): return .95 + .45 * t * t + (.15 * t if t > 0 else 0)
def keel(t): return -.75 * max(0.0, 1 - abs(t) ** 3) ** .5 - .05
NS, NU = 64, 56
bm = bmesh.new(); grid = []
for i in range(NS + 1):
    t = -1 + 2 * i / NS; x = t * L; b = half_beam(t); zd, zk = sheer(t), keel(t)
    row = []
    for j in range(NU + 1):
        s = j / NU  # 0 = port deck edge, .5 = keel, 1 = starboard deck edge
        a = abs(s - .5) * 2
        y = (1 if s > .5 else -1) * b * math.sin(a * math.pi / 2) ** .55
        z = zk + (zd - zk) * (1 - math.cos(a * math.pi / 2)) ** .8
        row.append(bm.verts.new((x, y, z)))
    grid.append(row)
for i in range(NS):
    for j in range(NU):
        bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
hull = bpy.data.meshes.new('hull'); bm.to_mesh(hull); bm.free()
ho = bpy.data.objects.new('hull', hull); scene.collection.objects.link(ho)
sol = ho.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .06; realize(ho)
hull = ho.data
ca = hull.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
for v in hull.vertices:
    x, y, z = v.co; t = max(-1, min(1, x / L)); zd = sheer(t)
    c = (.86, .85, .8)
    if z < .02: c = (.32, .12, .08)                              # antifouling below the waterline
    elif zd - .3 < z < zd - .16: c = (.06, .08, .16)             # dark band
    elif zd - .36 < z < zd - .3: c = (.62, .16, .1)              # thin red line
    elif z > zd - .08: c = (.25, .18, .12)                        # capping rail
    ca.data[v.index].color = (*c, 1)
put(ho, 'hull')
# deck planks and the rail
bm = bmesh.new(); pts = []
for i in range(NS + 1):
    t = -1 + 2 * i / NS; pts.append((t * L * .985, half_beam(t) * .96, sheer(t) - .1))
vs = [bm.verts.new((x, -y, z)) for x, y, z in pts] + [bm.verts.new((x, y, z)) for x, y, z in reversed(pts)]
bm.faces.new(vs); bmesh.ops.triangulate(bm, faces=bm.faces[:])
dm = bpy.data.meshes.new('deck'); bm.to_mesh(dm); bm.free(); do = bpy.data.objects.new('deck', dm); scene.collection.objects.link(do); put(do, 'deck')
for side in (-1, 1):
    for i in range(0, NS, 2):
        t0, t1 = -1 + 2 * i / NS, -1 + 2 * (i + 2) / NS
        rod((t0 * L, side * half_beam(t0), sheer(t0) + .02), (t1 * L, side * half_beam(t1), sheer(t1) + .02), .045, 'wood', 6)
    for i in range(4, NS - 3, 5):
        t = -1 + 2 * i / NS
        rod((t * L, side * half_beam(t) * .98, sheer(t)), (t * L, side * half_beam(t) * .98, sheer(t) + .35), .025, 'wood', 6)

# ---------------------------------------------------------------- masts, spars, sails, rigging
MAST = Vector((1.3, 0, sheer(1.3 / L) - .1)); MTOP = MAST + Vector((0, 0, 8.2))
rod(MAST, MTOP, .12, 'wood', 12)
rod(MTOP, MTOP + Vector((0, 0, .25)), .08, 'dark')
YA, YB = MAST + Vector((-3.2, 0, 1.4)), MAST + Vector((3.6, 0, 8.8))
rod(YA, YB, .07, 'wood')
# furled sail along the yard: a lumpy canvas roll
YD = (YB - YA).normalized()
furl = prim('cylinder', radius=1, depth=1, location=(0, 0, 0), vertices=16)
bmf = bmesh.new(); bmf.from_mesh(furl.data)
for v in bmf.verts:  # a sail rolled along the yard: thick in the middle, lashed every metre
    u = v.co.z + .5; r = (.05 + .17 * math.sin(u * math.pi) ** .7) * (1 - .18 * (math.sin(u * 44) > .8))
    v.co.x *= r; v.co.y *= r; v.co.z = 0
    v.co = YA.lerp(YB, u) + Vector((0, 0, -.13)) + (Matrix.Rotation(0, 3, 'Z') @ Vector((v.co.x, v.co.y, 0)))
bmf.to_mesh(furl.data); bmf.free(); furl.location = (0, 0, 0); put(furl, 'canvas')
MZ = Vector((-3.9, 0, sheer(-3.9 / L) - .1)); rod(MZ, MZ + Vector((0, 0, 4.5)), .07, 'wood')
rod(MZ + Vector((.3, 0, .6)), MZ + Vector((-1.4, 0, 4.2)), .04, 'wood')
BOW = Vector((L, 0, sheer(1) + .05)); rod(BOW - Vector((.4, 0, .05)), BOW + Vector((2.4, 0, .45)), .07, 'wood')
for a, b in ((MTOP, BOW + Vector((2.3, 0, .45))), (MTOP, Vector((-L + .2, 0, sheer(-1) + .1))), (MTOP, Vector((1.2, -1.5, sheer(.2) + .05))), (MTOP, Vector((1.2, 1.5, sheer(.2) + .05))),
             (MTOP, Vector((.2, -1.5, sheer(.04) + .05))), (MTOP, Vector((.2, 1.5, sheer(.04) + .05))), (MZ + Vector((0, 0, 4.5)), Vector((-L + .1, 0, sheer(-1) + .1))),
             (YB, MAST + Vector((4.5, 0, .6)))):
    rod(a, b, .012, 'rope', 5)
# pennants on a line from the mast
for k, (m, h) in enumerate((('white', .7), ('blue', .9))):
    p = MTOP.lerp(BOW + Vector((2.3, 0, .45)), .35 + k * .12)
    f = prim('plane', size=1, location=p + Vector((0, 0, -h / 2))); f.scale = (.35, 1, h); f.rotation_euler = (math.pi / 2, 0, 0)
    f.modifiers.new('sub', 'SUBSURF').levels = 2; put(realize(f), m)
# awning aft on four poles
AW = Vector((-2.4, 0, sheer(-.44) - .1))
for dx in (-1.2, 1.2):
    for dy in (-1.1, 1.1): rod(AW + Vector((dx, dy, 0)), AW + Vector((dx, dy, 2.1)), .035, 'wood')
aw = prim('plane', size=1, location=AW + Vector((0, 0, 2.15))); aw.scale = (2.6, 2.4, 1)
aw.modifiers.new('sub', 'SUBSURF').levels = 3; dd = aw.modifiers.new('sag', 'DISPLACE'); tx2 = bpy.data.textures.new('sag', 'CLOUDS'); tx2.noise_scale = .8; dd.texture = tx2; dd.strength = .12
aw.modifiers.new('sol', 'SOLIDIFY').thickness = .015; put(realize(aw), 'canvas')

# ---------------------------------------------------------------- air pump with two flywheels, deck clutter
PUMP = Vector((-.6, 0, sheer(-.1) - .1))
pb = prim('cube', size=1, location=PUMP + Vector((0, 0, .45))); pb.scale = (.6, .7, .9); put(realize(pb), 'red')
pt = prim('cube', size=1, location=PUMP + Vector((0, 0, .93))); pt.scale = (.66, .76, .06); put(realize(pt), 'wood')
for side in (-1, 1):
    c = PUMP + Vector((0, side * .48, .75))
    w = prim('torus', major_radius=.45, minor_radius=.035, location=c, rotation=(math.pi / 2, 0, 0), major_segments=32, minor_segments=8); put(realize(w), 'iron')
    for k in range(6):
        a = k / 6 * math.tau; rod(c, c + Vector((math.cos(a) * .44, 0, math.sin(a) * .44)), .018, 'iron', 6)
    rod(c, c + Vector((0, side * .2, 0)), .04, 'brass', 10)
    rod(c + Vector((.44, side * .12, 0)), c + Vector((.44, side * .12, .35)), .025, 'wood', 6)  # crank handle
for k in range(5):  # barrels, crates, coiled rope, sponges
    x = -1.8 + k * .75 + random.random() * .2; y = (random.random() - .5) * 1.6
    if k % 2: put(realize(prim('cylinder', radius=.22, depth=.5, location=(x, y, sheer(x / L) + .15), vertices=16)), 'wood')
    else:
        cr = prim('cube', size=1, location=(x, y, sheer(x / L) + .05)); cr.scale = (.5, .4, .35); put(realize(cr), 'deck')
for k in range(3):
    r = prim('torus', major_radius=.22, minor_radius=.05, location=(2.8 + k * .5, .6 - k * .5, sheer(.5) - .03), major_segments=24, minor_segments=8); put(realize(r), 'rope')
lamp = prim('cylinder', radius=.08, depth=.2, location=MAST + Vector((.18, 0, 2.2)), vertices=10); put(realize(lamp), 'lamp')

# ---------------------------------------------------------------- side ladder (port side, near the pump)
LX = -1.5; LY = -half_beam(LX / L) - .05; LZ0 = sheer(LX / L) + .35
for dx in (-.22, .22): rod((LX + dx, LY, LZ0), (LX + dx, LY - .25, -1.6), .03, 'wood', 6)
for k in range(9):
    z = LZ0 - .25 - k * .23; y = LY - .25 * (LZ0 - z) / (LZ0 + 1.6)
    rod((LX - .22, y, z), (LX + .22, y, z), .022, 'wood', 6)

def empty(name, loc):
    e = bpy.data.objects.new(name, None); e.location = loc; scene.collection.objects.link(e); BOAT.append(e); return e
empty('deck_spot', (LX, LY + .7, sheer(LX / L) - .1))
empty('ladder_top', (LX, LY - .1, sheer(LX / L) - .1))
empty('ladder_bottom', (LX, LY - .45, -1.9))
empty('pump_out', PUMP + Vector((0, -.4, .3)))
empty('lamp', MAST + Vector((.18, 0, 2.2)))

EMPTIES = [o for o in BOAT if o.type == 'EMPTY']
bpy.ops.object.select_all(action='DESELECT')
for o in BOAT:
    if o.type == 'MESH': o.select_set(True)
bpy.context.view_layer.objects.active = ho; bpy.ops.object.join(); ho.name = 'boat'
for o in EMPTIES: o.parent = ho

# ---------------------------------------------------------------- island: cliffs rising out of the sea
NX, NY, SX, SY = 180, 70, 360.0, 140.0
bm = bmesh.new(); vs = []
for j in range(NY + 1):
    row = []
    for i in range(NX + 1):
        x = (i / NX - .5) * SX; y = (j / NY - .5) * SY
        ridge = 1 - abs(noise.noise(Vector((x * .012, y * .02, 1.3))))
        mass = max(0.0, 1 - (x / (SX * .5)) ** 2) * max(0.0, 1 - (y / (SY * .5)) ** 2)
        h = (ridge ** 2 * 70 + noise.noise(Vector((x * .03, y * .03, 4))) * 12 + 18) * mass ** .6
        h = h if h < 40 else 40 + (h - 40) * .6
        edge = min(1.0, max(0.0, (mass - .08) * 6))           # sheer cliffs where the island meets the water
        h = h * edge - 6 * (1 - edge)
        row.append(bm.verts.new((x, y, h)))
    vs.append(row)
for j in range(NY):
    for i in range(NX):
        bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
bm.normal_update()
im = bpy.data.meshes.new('island'); bm.to_mesh(im); bm.free(); io = bpy.data.objects.new('island', im); scene.collection.objects.link(io)
ca = im.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
for v in im.vertices:
    z = v.co.z; n = v.normal
    strata = .5 + .5 * math.sin(z * .9 + noise.noise(v.co * .05) * 3)
    c = Vector((.55, .42, .3)).lerp(Vector((.68, .55, .4)), strata)
    if n.z > .8 and z > 8: c = c.lerp(Vector((.42, .4, .26)), .6)     # scrub on the gentle slopes
    if z < 1.5: c = Vector((.3, .27, .22))
    ca.data[v.index].color = (*c, 1)
im.materials.append(M['island'])
for p in im.polygons: p.use_smooth = True

if PREVIEW:
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
    cam.location = (9, -13, 3.5); cam.rotation_euler = (math.radians(82), 0, math.radians(35)); scene.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 4; sun.rotation_euler = (math.radians(50), 0, math.radians(-30)); scene.collection.objects.link(sun)
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.35, .5, .7, 1); scene.world = w
    io.hide_render = True
    scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x = 800; scene.render.resolution_y = 500
    scene.render.filepath = PREVIEW; bpy.ops.render.render(write_still=True); io.hide_render = False

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, use_selection=True)
print('boat exported', OUT, len(ho.data.polygons), 'faces; island', len(im.polygons))
