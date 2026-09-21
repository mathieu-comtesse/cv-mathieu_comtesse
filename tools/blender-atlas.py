"""Origami models for the Atlas du parcours: buildings, trees, boat, cranes, vehicles and the island itself.
Run: Blender --background --python tools/blender-atlas.py -- atlas-models.json
Every mesh is triangulated, lightly creased (vertex jitter) so flat shading reads as folded paper,
and exported with flat normals plus a material index per triangle: 0 paper, 1 accent, 2 ink, 3 leaf, 4 ground, 5 rock."""
import bpy, bmesh, json, math, random, sys
from mathutils import Vector, Matrix, noise
out = sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(7)
PAPER, ACCENT, INK, LEAF, GROUND, ROCK = range(6)
models = {}

def crease(bm, amount):
    """Tiny random offsets so each triangle catches the light differently, like hand-folded paper."""
    for v in bm.verts:
        v.co += Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))) * amount

def export(name, bm, jitter=0.012, smooth=False):
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    crease(bm, jitter)
    bm.normal_update()
    pos, nor, mat = [], [], []
    for f in bm.faces:
        n = f.normal
        for v in f.verts:
            c = v.co
            pos += [round(c.x, 4), round(c.z, 4), round(-c.y, 4)]   # Blender Z-up -> three.js Y-up
            nor += [round(n.x, 4), round(n.z, 4), round(-n.y, 4)]
        mat.append(f.material_index)
    models[name] = {'position': pos, 'normal': nor, 'material': mat}
    bm.free()

def add_box(bm, size, at, mat=PAPER, rot=0):
    ret = bmesh.ops.create_cube(bm, size=1.0)
    verts = ret['verts']
    m = Matrix.Translation(Vector(at)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal(Vector(size)).to_4x4()
    bmesh.ops.transform(bm, matrix=m, verts=verts)
    for f in bm.faces:
        if all(v in verts for v in f.verts): f.material_index = mat
    return verts

def add_prism(bm, w, d, h, at, mat=ACCENT, ridge=0.0, curl=0.0):
    """Gable roof: two folded planes; `curl` lifts the eaves like a pagoda."""
    x, y, z = at
    v = lambda p: bm.verts.new(Vector(p))
    a = v((x-w/2, y-d/2, z+curl)); b = v((x+w/2, y-d/2, z+curl)); c = v((x+w/2, y+d/2, z+curl)); dd = v((x-w/2, y+d/2, z+curl))
    r1 = v((x, y-d/2-ridge, z+h)); r2 = v((x, y+d/2+ridge, z+h))
    faces = [bm.faces.new((a, b, r1)), bm.faces.new((dd, r2, c)), bm.faces.new((b, c, r2, r1)), bm.faces.new((a, r1, r2, dd)), bm.faces.new((a, dd, c, b))]
    for f in faces: f.material_index = mat
    return faces

def add_cone(bm, r, h, at, segs=6, mat=LEAF, top_r=0.0):
    ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=top_r, depth=h)
    verts = ret['verts']
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(at) + Vector((0, 0, h/2))), verts=verts)
    for f in bm.faces:
        if all(v in verts for v in f.verts): f.material_index = mat
    return verts

# --- Buildings -------------------------------------------------------------
bm = bmesh.new()
add_box(bm, (2.0, 1.1, 1.3), (0, 0, 0.65)); add_prism(bm, 2.15, 1.2, 0.65, (0, 0, 1.3), ACCENT, ridge=0.05)
add_box(bm, (0.5, 0.5, 2.3), (0, 0, 1.15)); add_prism(bm, 0.62, 0.62, 0.42, (0, 0, 2.3), INK)
add_box(bm, (0.9, 0.06, 0.5), (0, -0.58, 0.55), INK)     # folded doorway
export('campus', bm)

bm = bmesh.new()
add_box(bm, (2.4, 1.2, 1.0), (0, 0, 0.5)); add_prism(bm, 2.7, 1.5, 0.28, (0, 0, 1.0), INK, ridge=0.02)
add_box(bm, (0.4, 0.06, 0.4), (0, -0.62, 0.72), INK)     # clock plate
add_box(bm, (2.2, 0.16, 0.06), (0, -0.66, 0.05), ACCENT) # platform edge
export('station', bm)

bm = bmesh.new()
add_box(bm, (1.6, 1.4, 1.0), (0, 0, 0.5))
for i in range(3): add_prism(bm, 0.55, 1.45, 0.42, (-0.53 + i*0.53, 0, 1.0), ACCENT)   # sawtooth roof
add_box(bm, (0.2, 0.2, 0.6), (0.5, -0.3, 1.3), INK)
export('workshop', bm)

bm = bmesh.new()
add_cone(bm, 0.62, 2.6, (0, 0, 0), segs=6, mat=PAPER, top_r=0.52)
add_cone(bm, 0.72, 0.18, (0, 0, 2.6), segs=6, mat=ACCENT, top_r=0.72)
add_cone(bm, 0.5, 0.5, (0, 0, 2.78), segs=6, mat=PAPER, top_r=0.0)
export('tower', bm)

bm = bmesh.new()
add_box(bm, (1.8, 1.5, 0.9), (0, 0, 0.45)); add_prism(bm, 2.3, 1.9, 0.45, (0, 0, 0.9), INK, ridge=0.08, curl=0.06)
add_box(bm, (1.2, 1.0, 0.45), (0, 0, 1.55)); add_prism(bm, 1.6, 1.3, 0.35, (0, 0, 2.0), ACCENT, ridge=0.06, curl=0.05)
export('dojo', bm)

bm = bmesh.new()
add_box(bm, (1.4, 1.1, 1.1), (0, 0, 0.55), INK); add_box(bm, (1.0, 0.04, 0.6), (0, -0.57, 0.65), ACCENT)
add_box(bm, (1.5, 0.2, 0.25), (0, -0.2, 1.22), ACCENT)
export('arcade', bm)

# --- Nature ---------------------------------------------------------------
bm = bmesh.new()
for i, (r, h, z) in enumerate([(0.34, 0.5, 0.15), (0.27, 0.45, 0.42), (0.18, 0.4, 0.68)]): add_cone(bm, r, h, (0, 0, z), segs=6, mat=LEAF)
add_cone(bm, 0.05, 0.2, (0, 0, 0), segs=5, mat=INK, top_r=0.05)
export('pine', bm, jitter=0.02)

bm = bmesh.new()
ret = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.36)
bmesh.ops.transform(bm, matrix=Matrix.Translation((0, 0, 0.6)), verts=ret['verts'])
for f in bm.faces: f.material_index = LEAF
add_cone(bm, 0.05, 0.3, (0, 0, 0), segs=5, mat=INK, top_r=0.05)
export('bush', bm, jitter=0.03)

bm = bmesh.new()
ret = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.34)
bmesh.ops.transform(bm, matrix=Matrix.Translation((0, 0, 0.6)), verts=ret['verts'])
for f in bm.faces: f.material_index = ACCENT
add_cone(bm, 0.05, 0.3, (0, 0, 0), segs=5, mat=INK, top_r=0.05)
export('blossom', bm, jitter=0.03)

# --- Paper boat: the classic folded hull with a central sail. ---------------
bm = bmesh.new()
v = lambda p: bm.verts.new(Vector(p))
bow = v((0.55, 0, 0.12)); stern = v((-0.55, 0, 0.12)); pl = v((0.0, -0.22, 0.14)); pr = v((0.0, 0.22, 0.14)); keel = v((0.0, 0, -0.08))
for f in (bm.faces.new((bow, pl, keel)), bm.faces.new((pl, stern, keel)), bm.faces.new((stern, pr, keel)), bm.faces.new((pr, bow, keel))): f.material_index = PAPER
top = v((0.0, 0, 0.48)); sail = [bm.faces.new((bow, top, pl)), bm.faces.new((pl, top, stern)), bm.faces.new((stern, top, pr)), bm.faces.new((pr, top, bow))]
for f in sail: f.material_index = ACCENT
export('boat', bm, jitter=0.008)

# --- Paper crane. -------------------------------------------------------------
bm = bmesh.new()
v = lambda p: bm.verts.new(Vector(p))
body_f = v((0.16, 0, 0.0)); body_b = v((-0.16, 0, 0.0)); body_t = v((0, 0, 0.12)); body_d = v((0, 0, -0.06))
wl = v((0.02, -0.55, 0.26)); wr = v((0.02, 0.55, 0.26))
neck = v((0.42, 0, 0.22)); head = v((0.5, 0, 0.16)); tail = v((-0.46, 0, 0.24))
faces = [bm.faces.new((body_f, body_t, body_b)), bm.faces.new((body_f, body_b, body_d)),
         bm.faces.new((body_f, wl, body_b)), bm.faces.new((body_f, body_b, wr)),
         bm.faces.new((body_f, neck, body_t)), bm.faces.new((neck, head, body_t)), bm.faces.new((body_b, body_t, tail))]
for f in faces: f.material_index = PAPER
export('crane', bm, jitter=0.004)

# --- Vehicles ----------------------------------------------------------------
bm = bmesh.new()
add_box(bm, (0.55, 0.3, 0.32), (0, 0, 0.2), ACCENT); add_box(bm, (0.12, 0.12, 0.2), (0.18, 0, 0.44), INK)
add_box(bm, (0.42, 0.28, 0.26), (-0.55, 0, 0.17)); add_box(bm, (0.42, 0.28, 0.26), (-1.05, 0, 0.17))
export('train', bm, jitter=0.006)

bm = bmesh.new()
add_box(bm, (0.3, 0.16, 0.1), (0, 0, 0.09)); add_prism(bm, 0.16, 0.15, 0.1, (-0.02, 0, 0.14), INK, ridge=0.0)
export('car', bm, jitter=0.004)

bm = bmesh.new()
add_cone(bm, 0.26, 1.3, (0, 0, 0), segs=8, mat=PAPER, top_r=0.18)
for i in range(3): add_cone(bm, 0.27 - i*0.03, 0.12, (0, 0, 0.22 + i*0.4), segs=8, mat=ACCENT, top_r=0.27 - i*0.03)
add_cone(bm, 0.15, 0.25, (0, 0, 1.3), segs=8, mat=INK, top_r=0.15); add_cone(bm, 0.18, 0.2, (0, 0, 1.55), segs=8, mat=ACCENT, top_r=0.0)
export('lighthouse', bm)

# --- Island: a folded disc with a rock skirt. ---------------------------------
bm = bmesh.new()
segs, rings = 40, 5
top, skirt = [], []
for ring in range(rings + 1):
    rr = []
    for i in range(segs):
        a = i / segs * math.tau
        radius = 4.6 + math.sin(a*3)*0.35 + math.sin(a*7+1)*0.22
        r = radius * ring / rings
        z = 0.0 if ring == 0 else noise.noise(Vector((math.cos(a)*r*0.5, math.sin(a)*r*0.5, 0.3))) * 0.12 * (1 - ring/rings) - 0.04 * (ring/rings)**2
        rr.append(bm.verts.new(Vector((math.cos(a)*r, math.sin(a)*r, z))))
    top.append(rr)
for ring in range(rings):
    for i in range(segs):
        a, b = top[ring][i], top[ring][(i+1) % segs]; c, d = top[ring+1][(i+1) % segs], top[ring+1][i]
        if ring == 0:
            f = bm.faces.new((a, c, d)) if a is not b else None
            if f: f.material_index = GROUND
        else:
            for tri in ((a, b, c), (a, c, d)):
                try: bm.faces.new(tri).material_index = GROUND
                except ValueError: pass
bmesh.ops.remove_doubles(bm, verts=top[0], dist=0.001)
bottom = [bm.verts.new(Vector((v.co.x*1.06, v.co.y*1.06, -1.15))) for v in top[rings]]
for i in range(segs):
    a, b = top[rings][i], top[rings][(i+1) % segs]; c, d = bottom[(i+1) % segs], bottom[i]
    for tri in ((a, b, c), (a, c, d)): bm.faces.new(tri).material_index = ROCK
bm.faces.new(bottom[::-1]).material_index = ROCK
export('island', bm, jitter=0.02)

json.dump(models, open(out, 'w'), separators=(',', ':'))
print('written', out, {k: len(v['material']) for k, v in models.items()})
