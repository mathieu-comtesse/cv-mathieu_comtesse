"""Origami models for the Atlas du parcours: buildings, trees, boat, cranes, vehicles, waves and the island.
Run: Blender --background --python tools/blender-atlas.py -- atlas-models.json
Every mesh is triangulated, lightly creased (vertex jitter) so flat shading reads as folded paper, and exported with
flat normals plus one RGB colour per triangle (with a small per-facet tint variation, like paper catching light)."""
import bpy, bmesh, json, math, random, sys
from mathutils import Vector, Matrix, noise
out = sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(11)
models = {}

def hex_to_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))
PAPER, CREAM, YELLOW, CORAL, TEAL, LILAC = '#fefefe', '#fff4e3', '#ffd166', '#f28c6a', '#7fc8c0', '#c9b7e8'
ORANGE, RED, DEEP, INK = '#ff7a3d', '#e63946', '#2a9d8f', '#2b2b33'
GREENS = ['#6ab04c', '#8fd18a', '#3d8b5f', '#a3d977']; BLOSSOM = '#ff9ecf'
GRASS = ['#8bd35c', '#63b94a', '#a9e07a', '#4fa83d']; SAND = ['#f6d98c', '#fbe7a6', '#ecc978']; ROCK = ['#a89f91', '#8b8073', '#c2b8a8', '#7a7066']

class Paper:
    """A bmesh whose faces each carry a colour (kept in a parallel list, indexed by material_index)."""
    def __init__(self): self.bm = bmesh.new(); self.colors = []
    def paint(self, faces, color):
        self.colors.append(hex_to_rgb(color)); idx = len(self.colors) - 1
        for f in faces: f.material_index = idx
    def owned(self, verts):
        vs = set(verts); return [f for f in self.bm.faces if all(v in vs for v in f.verts)]
    def box(self, size, at, color, rot=0.0):
        ret = bmesh.ops.create_cube(self.bm, size=1.0); verts = ret['verts']
        m = Matrix.Translation(Vector(at)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal(Vector(size)).to_4x4()
        bmesh.ops.transform(self.bm, matrix=m, verts=verts); self.paint(self.owned(verts), color); return verts
    def cone(self, r, h, at, color, segs=6, top_r=0.0):
        ret = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=segs, radius1=r, radius2=top_r, depth=h); verts = ret['verts']
        bmesh.ops.transform(self.bm, matrix=Matrix.Translation(Vector(at) + Vector((0, 0, h/2))), verts=verts); self.paint(self.owned(verts), color); return verts
    def tri(self, a, b, c, color):
        v = self.bm.verts.new; f = self.bm.faces.new((v(Vector(a)), v(Vector(b)), v(Vector(c)))); self.paint([f], color); return f
    def quad(self, a, b, c, d, color):
        v = self.bm.verts.new; f = self.bm.faces.new((v(Vector(a)), v(Vector(b)), v(Vector(c)), v(Vector(d)))); self.paint([f], color); return f
    def pleated_roof(self, w, d, h, at, color, pleats=4, overhang=0.12, alt=None):
        """Accordion roof: alternating ridges and valleys folded along the depth, with an overhang."""
        x, y, z = at; W = w + overhang*2; D = d + overhang*2
        for side in (-1, 1):
            for i in range(pleats):
                x0 = x + side*(W/2)*i/pleats; x1 = x + side*(W/2)*(i+1)/pleats
                z0 = z + h*(1 - i/pleats); z1 = z + h*(1 - (i+1)/pleats)
                mid = (z0 + z1)/2 + (0.06 if i % 2 else -0.02)
                col = color if i % 2 == 0 else (alt or color)
                self.quad((x0, y-D/2, z0), (x1, y-D/2, z1), (x1, y+D/2, z1), (x0, y+D/2, z0), col)
        # gable ends
        self.tri((x-W/2, y-D/2, z), (x, y-D/2, z+h), (x+W/2, y-D/2, z), alt or color)
        self.tri((x+W/2, y+D/2, z), (x, y+D/2, z+h), (x-W/2, y+D/2, z), alt or color)
    def pagoda_roof(self, w, d, h, at, color, curl=0.12, overhang=0.25):
        x, y, z = at; W = w + overhang*2; D = d + overhang*2
        corners = [(x-W/2, y-D/2), (x+W/2, y-D/2), (x+W/2, y+D/2), (x-W/2, y+D/2)]
        top = (x, y, z+h)
        for i in range(4):
            a = corners[i]; b = corners[(i+1) % 4]; m = ((a[0]+b[0])/2, (a[1]+b[1])/2)
            self.tri((a[0], a[1], z+curl), (m[0], m[1], z-0.02), top, color)
            self.tri((m[0], m[1], z-0.02), (b[0], b[1], z+curl), top, color)
    def faceted_wall(self, w, h, d, at, color, alt, cols=3):
        """Walls folded into shallow diamonds so the light breaks across them."""
        x, y, z = at
        for face, (dx, dy, nx, ny) in enumerate([(w, 0, 0, -1), (0, d, 1, 0), (w, 0, 0, 1), (0, d, -1, 0)]):
            length = w if dx else d
            for i in range(cols):
                t0 = -length/2 + length*i/cols; t1 = -length/2 + length*(i+1)/cols; tm = (t0+t1)/2
                def P(t, zz, bulge=0.0):
                    if dx: return (x+t, y+ny*(d/2+bulge), z+zz)
                    return (x+nx*(w/2+bulge), y+t, z+zz)
                c1 = color if i % 2 == 0 else alt
                # each column is two triangles meeting on a raised centre vertex
                self.tri(P(t0, 0), P(t1, 0), P(tm, h/2, 0.05), c1)
                self.tri(P(t1, 0), P(t1, h), P(tm, h/2, 0.05), alt if i % 2 == 0 else color)
                self.tri(P(t1, h), P(t0, h), P(tm, h/2, 0.05), c1)
                self.tri(P(t0, h), P(t0, 0), P(tm, h/2, 0.05), alt if i % 2 == 0 else color)
        # flat top and base
        self.quad((x-w/2, y-d/2, z+h), (x+w/2, y-d/2, z+h), (x+w/2, y+d/2, z+h), (x-w/2, y+d/2, z+h), color)
    def export(self, name, jitter=0.012, tint=0.06):
        bm = self.bm; bmesh.ops.triangulate(bm, faces=bm.faces[:])
        for v in bm.verts: v.co += Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))) * jitter
        bm.normal_update(); pos, nor, col = [], [], []
        for f in bm.faces:
            n = f.normal; base = self.colors[f.material_index]; k = 1 + random.uniform(-tint, tint)
            c = [max(0, min(255, int(ch*k*255))) for ch in base]
            for v in f.verts:
                p = v.co; pos += [round(p.x, 4), round(p.z, 4), round(-p.y, 4)]; nor += [round(n.x, 4), round(n.z, 4), round(-n.y, 4)]
            col += c
        models[name] = {'position': pos, 'normal': nor, 'color': col}; bm.free()

# --- Buildings ---------------------------------------------------------------
p = Paper(); p.faceted_wall(2.0, 1.3, 1.1, (0, 0, 0), CREAM, YELLOW, cols=4); p.pleated_roof(2.0, 1.1, 0.7, (0, 0, 1.3), ORANGE, pleats=4, alt=RED)
p.faceted_wall(0.5, 2.3, 0.5, (0, 0, 0), PAPER, CREAM, cols=2); p.pagoda_roof(0.5, 0.5, 0.5, (0, 0, 2.3), DEEP, curl=0.06, overhang=0.1)
p.box((0.5, 0.05, 0.6), (0, -0.58, 0.3), INK); p.export('campus')

p = Paper(); p.faceted_wall(2.4, 1.0, 1.2, (0, 0, 0), TEAL, '#a6dcd6', cols=5); p.pleated_roof(2.4, 1.2, 0.35, (0, 0, 1.0), INK, pleats=3, alt='#44444f')
p.box((2.4, 0.16, 0.08), (0, -0.7, 0.04), YELLOW); p.cone(0.16, 0.05, (0, -0.63, 0.75), PAPER, segs=8, top_r=0.16); p.export('station')

p = Paper(); p.faceted_wall(1.6, 1.0, 1.4, (0, 0, 0), CORAL, '#f7ad95', cols=3)
for i in range(3):
    x = -0.55 + i*0.55; p.tri((x-0.28, -0.75, 1.0), (x+0.28, -0.75, 1.0), (x+0.1, -0.75, 1.45), ORANGE)
    p.quad((x-0.28, -0.75, 1.0), (x+0.1, -0.75, 1.45), (x+0.1, 0.75, 1.45), (x-0.28, 0.75, 1.0), ORANGE)
    p.quad((x+0.1, -0.75, 1.45), (x+0.28, -0.75, 1.0), (x+0.28, 0.75, 1.0), (x+0.1, 0.75, 1.45), YELLOW)
    p.tri((x+0.28, 0.75, 1.0), (x-0.28, 0.75, 1.0), (x+0.1, 0.75, 1.45), ORANGE)
p.box((0.2, 0.2, 0.6), (0.5, -0.3, 1.4), INK); p.export('workshop')

p = Paper(); p.cone(0.62, 2.6, (0, 0, 0), LILAC, segs=6, top_r=0.5); p.cone(0.66, 0.9, (0, 0, 0.9), '#dccff2', segs=6, top_r=0.58)
p.cone(0.72, 0.16, (0, 0, 2.6), ORANGE, segs=6, top_r=0.72); p.cone(0.5, 0.55, (0, 0, 2.76), YELLOW, segs=6, top_r=0.0); p.export('tower')

p = Paper(); p.faceted_wall(1.8, 0.9, 1.5, (0, 0, 0), PAPER, CREAM, cols=3); p.pagoda_roof(1.8, 1.5, 0.5, (0, 0, 0.9), RED, curl=0.14, overhang=0.3)
p.faceted_wall(1.2, 0.5, 1.0, (0, 0, 1.4), PAPER, CREAM, cols=2); p.pagoda_roof(1.2, 1.0, 0.42, (0, 0, 1.9), ORANGE, curl=0.12, overhang=0.25); p.export('dojo')

p = Paper(); p.faceted_wall(1.4, 1.1, 1.1, (0, 0, 0), INK, '#44444f', cols=3); p.box((1.0, 0.04, 0.6), (0, -0.57, 0.65), TEAL)
p.pleated_roof(1.4, 1.1, 0.25, (0, 0, 1.1), YELLOW, pleats=3, alt=ORANGE); p.export('arcade')

# --- Nature ------------------------------------------------------------------
p = Paper()
for i, (r, h, z) in enumerate([(0.36, 0.5, 0.15), (0.28, 0.45, 0.45), (0.19, 0.4, 0.72)]): p.cone(r, h, (0, 0, z), GREENS[i % 3], segs=6)
p.cone(0.05, 0.2, (0, 0, 0), '#8b5e3c', segs=5, top_r=0.05); p.export('pine', jitter=0.02, tint=0.1)
p = Paper(); ret = bmesh.ops.create_icosphere(p.bm, subdivisions=1, radius=0.36); bmesh.ops.transform(p.bm, matrix=Matrix.Translation((0, 0, 0.62)), verts=ret['verts']); p.paint(p.bm.faces[:], GREENS[1])
p.cone(0.05, 0.3, (0, 0, 0), '#8b5e3c', segs=5, top_r=0.05); p.export('bush', jitter=0.035, tint=0.12)
p = Paper(); ret = bmesh.ops.create_icosphere(p.bm, subdivisions=1, radius=0.34); bmesh.ops.transform(p.bm, matrix=Matrix.Translation((0, 0, 0.62)), verts=ret['verts']); p.paint(p.bm.faces[:], BLOSSOM)
p.cone(0.05, 0.3, (0, 0, 0), '#8b5e3c', segs=5, top_r=0.05); p.export('blossom', jitter=0.035, tint=0.1)
p = Paper(); ret = bmesh.ops.create_icosphere(p.bm, subdivisions=1, radius=0.3); p.paint(p.bm.faces[:], ROCK[0]); p.export('stone', jitter=0.06, tint=0.15)

# --- Paper boat, crane, wave -------------------------------------------------
p = Paper(); bow, stern, pl, pr, keel, top = (0.55, 0, 0.12), (-0.55, 0, 0.12), (0, -0.22, 0.14), (0, 0.22, 0.14), (0, 0, -0.08), (0, 0, 0.5)
for a, b in ((bow, pl), (pl, stern), (stern, pr), (pr, bow)): p.tri(a, b, keel, PAPER)
for a, b in ((bow, pl), (pl, stern), (stern, pr), (pr, bow)): p.tri(a, top, b, RED)
p.export('boat', jitter=0.008)
p = Paper(); bf, bb, bt, bd = (0.16, 0, 0), (-0.16, 0, 0), (0, 0, 0.12), (0, 0, -0.06); wl, wr = (0.02, -0.55, 0.26), (0.02, 0.55, 0.26); neck, head, tail = (0.42, 0, 0.22), (0.5, 0, 0.16), (-0.46, 0, 0.24)
for t in ((bf, bt, bb), (bf, bb, bd), (bf, wl, bb), (bf, bb, wr), (bf, neck, bt), (neck, head, bt), (bb, bt, tail)): p.tri(*t, PAPER)
p.export('crane', jitter=0.004)
# a folded wave crest: zigzag strip of paper, blue with a white lip
p = Paper(); n = 5
for i in range(n):
    x0 = -0.6 + 1.2*i/n; x1 = -0.6 + 1.2*(i+1)/n; xm = (x0+x1)/2
    p.tri((x0, -0.12, 0), (x1, -0.12, 0), (xm, -0.04, 0.22), '#4fb3c7'); p.tri((x1, -0.12, 0), (x1, 0.12, 0.05), (xm, -0.04, 0.22), '#7fd0de')
    p.tri((x1, 0.12, 0.05), (x0, 0.12, 0.05), (xm, -0.04, 0.22), PAPER); p.tri((x0, 0.12, 0.05), (x0, -0.12, 0), (xm, -0.04, 0.22), '#4fb3c7')
p.export('wave', jitter=0.01, tint=0.08)

# --- Vehicles --------------------------------------------------------------
p = Paper(); p.box((0.55, 0.3, 0.32), (0, 0, 0.2), RED); p.box((0.12, 0.12, 0.2), (0.18, 0, 0.44), INK); p.box((0.42, 0.28, 0.26), (-0.55, 0, 0.17), YELLOW); p.box((0.42, 0.28, 0.26), (-1.05, 0, 0.17), TEAL); p.export('train', jitter=0.006)
p = Paper(); p.box((0.3, 0.16, 0.1), (0, 0, 0.09), PAPER); p.box((0.15, 0.14, 0.1), (-0.02, 0, 0.19), '#3a6ea5'); p.export('car', jitter=0.004)
p = Paper(); p.cone(0.26, 1.3, (0, 0, 0), PAPER, segs=8, top_r=0.18)
for i in range(3): p.cone(0.27 - i*0.03, 0.12, (0, 0, 0.22 + i*0.4), RED, segs=8, top_r=0.27 - i*0.03)
p.cone(0.15, 0.25, (0, 0, 1.3), INK, segs=8, top_r=0.15); p.cone(0.18, 0.2, (0, 0, 1.55), ORANGE, segs=8, top_r=0.0); p.export('lighthouse')

# --- Island: folded hills, a sandy shore and a rock skirt ---------------------
p = Paper(); bm = p.bm; segs, rings = 44, 7; R = 4.8
def radius_at(a): return R + math.sin(a*3)*0.35 + math.sin(a*7+1)*0.22
grid = []
for ring in range(rings + 1):
    row = []
    for i in range(segs):
        a = i/segs*math.tau; t = ring/rings; r = radius_at(a)*t
        hill = noise.noise(Vector((math.cos(a)*r*0.45, math.sin(a)*r*0.45, 0.7)))*0.35 + 0.12
        z = max(0.02, hill*(1 - t**3)) if ring else hill + 0.05
        if t > 0.86: z = 0.02 + (1-t)*0.3   # beach slopes down to the water
        row.append(bm.verts.new(Vector((math.cos(a)*r, math.sin(a)*r, z))))
    grid.append(row)
centre = grid[0][0]
for ring in range(rings):
    for i in range(segs):
        a, b = grid[ring][i], grid[ring][(i+1) % segs]; c, d = grid[ring+1][(i+1) % segs], grid[ring+1][i]
        t = (ring + 0.5)/rings
        col = SAND[i % 3] if t > 0.86 else GRASS[(i + ring) % 4]
        if ring == 0: p.paint([bm.faces.new((centre, c, d))], col)
        else:
            for tri in ((a, b, c), (a, c, d)):
                try: p.paint([bm.faces.new(tri)], col)
                except ValueError: pass
bottom = [bm.verts.new(Vector((v.co.x*1.05, v.co.y*1.05, -1.2))) for v in grid[rings]]
mid = [bm.verts.new(Vector((v.co.x*1.09, v.co.y*1.09, -0.45 + random.uniform(-0.12, 0.12)))) for v in grid[rings]]
for i in range(segs):
    a, b = grid[rings][i], grid[rings][(i+1) % segs]; m1, m2 = mid[i], mid[(i+1) % segs]; c, d = bottom[(i+1) % segs], bottom[i]
    for tri in ((a, b, m2), (a, m2, m1)): p.paint([bm.faces.new(tri)], ROCK[i % 4])
    for tri in ((m1, m2, c), (m1, c, d)): p.paint([bm.faces.new(tri)], ROCK[(i+2) % 4])
p.paint([bm.faces.new(bottom[::-1])], ROCK[3])
p.export('island', jitter=0.03, tint=0.09)

json.dump(models, open(out, 'w'), separators=(',', ':'))
print('written', out, {k: len(v['color'])//3 for k, v in models.items()})
