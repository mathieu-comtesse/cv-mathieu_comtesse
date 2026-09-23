"""Seabed props for Abysses & babioles: sculpted rocks, cliff walls, sea fans, brain corals, tube sponges.
Run: Blender --background --python tools/blender-reef.py -- assets/reef.glb
Each prop is a separate mesh with baked vertex colours (moss on top, dark crevices), named rock0..4, cliff0..1,
fan0..2, brain0..1, tubes0. The game instances them across the seabed."""
import bpy, bmesh, sys, math, random
from mathutils import Vector, noise, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'assets/reef.glb'
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def vc_material(name, rough=.9, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m
MAT_ROCK = vc_material('rock', .93)
MAT_FAN = vc_material('fan', .8)
MAT_CORAL = vc_material('coral', .85)

def finish(obj, mat, colour):
    me = obj.data
    if not me.color_attributes.get('Col'):
        me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    ca = me.color_attributes['Col']
    for v in me.vertices:
        ca.data[v.index].color = (*colour(v.co, v.normal), 1)
    me.materials.clear(); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return obj

def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    obj = bpy.data.objects.new(name, me); scene.collection.objects.link(obj); return obj

def fbm(p, oct=5):
    s, a, f = 0.0, .5, 1.0
    for _ in range(oct):
        s += a * noise.noise(p * f); a *= .5; f *= 2.1
    return s

# ---------------------------------------------------------------- rocks and cliffs
def rock(name, seed, sub=5, flat=.7, crag=.35, stretch=(1, 1, 1), strata=0.0):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
    off = Vector((seed * 3.1, seed * 1.7, seed * 2.3)); disp = {}
    for v in bm.verts:
        p = v.co.copy()
        big = fbm(p * 1.1 + off, 3) * crag
        vor = noise.voronoi(p * 2.2 + off)[0][0] if hasattr(noise, 'voronoi') else 0
        cell = -abs(noise.noise(p * 3.3 + off)) * .12
        fine = fbm(p * 7 + off, 3) * .04
        band = math.sin(p.z * 9 + noise.noise(p * 2 + off) * 2) * strata
        k = 1 + big + cell + fine + band
        v.co = Vector((p.x * k * stretch[0], p.y * k * stretch[1], p.z * k * flat * stretch[2]))
        disp[v.index] = cell + fine * 2 + band
    for v in bm.verts:
        if v.co.z < -.25 * flat: v.co.z = -.25 * flat + (v.co.z + .25 * flat) * .15  # flat buried base
    bm.normal_update()
    obj = mesh_obj(name, bm)
    dec = obj.modifiers.new('dec', 'DECIMATE'); dec.ratio = .45 if sub >= 6 else .6
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get())); obj.modifiers.clear(); obj.data = me
    def colour(co, n):
        p = co + off
        t = noise.noise(p * 1.7) * .5 + .5
        base = Vector((.2, .2, .19)).lerp(Vector((.3, .27, .22)), t)
        crev = max(0, -noise.noise(co * 3.3 + off)) * 1.6
        base *= 1 - min(.55, crev * .5)
        moss = max(0.0, min(1.0, (n.z - .35) / .45)) * (.6 + .4 * (noise.noise(p * 4) * .5 + .5))
        base = base.lerp(Vector((.12, .2, .09)), moss * .8)
        if noise.noise(p * 5.5) > .55: base = base.lerp(Vector((.55, .25, .45)), .6)   # coralline algae
        if noise.noise(p * 6.1 + Vector((9, 0, 0))) > .6: base = base.lerp(Vector((.75, .6, .35)), .5)  # sponge crust
        return tuple(base)
    return finish(obj, MAT_ROCK, colour)

for i in range(5):
    rock(f'rock{i}', i + 1, 5, .62 + random.random() * .25, .3 + random.random() * .15)
rock('cliff0', 21, 6, 1.0, .45, (1.6, 1, 1.3), .03)
rock('cliff1', 34, 6, 1.1, .5, (1.2, 1.4, 1.5), .04)

# ---------------------------------------------------------------- sea fans: branching tubes in a gently curved plane
def fan(name, seed):
    random.seed(seed)
    bm = bmesh.new()
    def tube(a, b, r0, r1, seg=5):
        d = (b - a); L = d.length; z = d.normalized()
        x = z.cross(Vector((0, 1, 0))) if abs(z.y) < .9 else z.cross(Vector((1, 0, 0)))
        x.normalize(); y = z.cross(x)
        ring = lambda c, r: [bm.verts.new(c + (x * math.cos(t) + y * math.sin(t)) * r) for t in [k / seg * math.tau for k in range(seg)]]
        A = ring(a, r0); B = ring(b, r1)
        for k in range(seg):
            bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    def branch(p, ang, length, r, depth):
        q = p + Vector((math.cos(ang) * length, 0, math.sin(ang) * length))
        q.y = .12 * math.sin(q.x * 2.5 + seed) + .08 * q.z * q.z   # curve out of plane
        tube(p, q, r, r * .8)
        if depth > 0:
            n = 3 if random.random() < .3 else 2
            for k in range(n):
                branch(q, ang + (k - (n - 1) / 2) * (.45 + random.random() * .35), length * (.72 + random.random() * .12), r * .75, depth - 1)
    branch(Vector((0, 0, 0)), math.pi / 2, .28, .03, 7)
    bm.normal_update(); obj = mesh_obj(name, bm)
    hue = [(.72, .12, .2), (.8, .3, .15), (.6, .15, .45)][seed % 3]
    return finish(obj, MAT_FAN, lambda co, n: tuple(Vector(hue) * (.55 + .45 * min(1, co.z / 1.2)) + Vector((.1, .06, .05)) * (co.z > 1.0)))
for i in range(3): fan(f'fan{i}', i + 3)

# ---------------------------------------------------------------- brain corals: a dome with meandering grooves
def brain(name, seed):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=5, radius=1)
    off = Vector((seed, seed * 2, 0))
    for v in bm.verts:
        p = v.co.copy()
        groove = abs(math.sin(noise.noise(p * 2.2 + off) * 11 + p.z * 5)) ** .5
        k = 1 + groove * .07 + fbm(p * 1.5 + off, 2) * .12
        v.co = Vector((p.x * k, p.y * k, max(-.1, p.z) * k * .7))
    bm.normal_update(); obj = mesh_obj(name, bm)
    col = [(.66, .5, .42), (.5, .56, .4)][seed % 2]
    return finish(obj, MAT_CORAL, lambda co, n: tuple(Vector(col) * (.7 + .3 * (abs(math.sin(noise.noise(co * 2.2 + off) * 9 + co.z * 4)) ** .5))))
brain('brain0', 1); brain('brain1', 2)

# ---------------------------------------------------------------- tube sponges: a clump of open cylinders
bm = bmesh.new()
for k in range(6):
    a = k / 6 * math.tau + random.random(); r = .18 + random.random() * .12
    base = Vector((math.cos(a) * r, math.sin(a) * r, 0)); h = .5 + random.random() * .7; rad = .07 + random.random() * .04
    tilt = Vector((math.cos(a), math.sin(a), 0)) * .12
    rings = []
    for j in range(7):
        t = j / 6; c = base + Vector((0, 0, h * t)) + tilt * t * t
        rr = rad * (1 + .25 * t) * (1.18 if j == 6 else 1)
        rings.append([bm.verts.new(c + Vector((math.cos(q / 10 * math.tau) * rr, math.sin(q / 10 * math.tau) * rr, 0))) for q in range(10)])
    for j in range(6):
        for q in range(10):
            bm.faces.new((rings[j][q], rings[j][(q + 1) % 10], rings[j + 1][(q + 1) % 10], rings[j + 1][q]))
bm.normal_update(); obj = mesh_obj('tubes0', bm)
sol = obj.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .015
obj.data = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get())); obj.modifiers.clear()
finish(obj, MAT_CORAL, lambda co, n: (.75, .45 + .15 * min(1, co.z), .18))

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True)
for o in scene.objects: print(o.name, len(o.data.polygons))
print('reef exported', OUT)
