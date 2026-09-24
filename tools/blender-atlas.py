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
    def export(self, name, jitter=0.012, tint=0.06, outward=True):
        bm = self.bm; bmesh.ops.triangulate(bm, faces=bm.faces[:]); rng = random.Random('atlas:' + name)
        for v in bm.verts: v.co += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * jitter
        bm.normal_update(); pos, nor, col = [], [], []
        centre = sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
        for f in bm.faces:
            n = f.normal.copy(); verts = list(f.verts); base = self.colors[f.material_index]; k = 1 + rng.uniform(-tint, tint)
            # Faces are built as loose triangles: make every one face away from the model's centre so none is culled.
            if outward and n.dot(f.calc_center_median() - centre - Vector((0, 0, 0.001))) < 0: n = -n; verts.reverse()
            c = [max(0, min(255, int(ch*k*255))) for ch in base]
            for v in verts:
                p = v.co; pos += [round(p.x, 4), round(p.z, 4), round(-p.y, 4)]; nor += [round(n.x, 4), round(n.z, 4), round(-n.y, 4)]
            col += c
        models[name] = {'position': pos, 'normal': nor, 'color': col}; bm.free()


# --- Shared shapes for the two landmark buildings ----------------------------
def disc(p, at, r, col, segs=12):
    """A flat round face in the x-z plane (a clock dial, a porthole), seen from the front."""
    x, y, z = at
    ring = [(x + math.cos(i/segs*2*math.pi)*r, y, z + math.sin(i/segs*2*math.pi)*r) for i in range(segs)]
    for i in range(segs): p.tri((x, y, z), ring[i], ring[(i+1) % segs], col)

def hand(p, at, ang, length, wide, col):
    """A clock hand: a thin blade lying in the same plane as the dial."""
    x, y, z = at; dx, dz = math.cos(ang)*length, math.sin(ang)*length
    px, pz = -math.sin(ang)*wide, math.cos(ang)*wide
    p.quad((x-px, y, z-pz), (x+px, y, z+pz), (x+dx+px, y, z+dz+pz), (x+dx-px, y, z+dz-pz), col)

def arch(p, cx, z0, w, h, y, col, spring=0.62):
    """A tall round-headed bay: straight jambs, then a three-facet fan folded over them."""
    hw = w/2; zs = z0 + h*spring; zt = z0 + h; sh = hw*0.55
    p.quad((cx-hw, y, z0), (cx+hw, y, z0), (cx+hw, y, zs), (cx-hw, y, zs), col)
    p.tri((cx-hw, y, zs), (cx-sh, y, zt - h*0.06), (cx, y, zs), col)
    p.tri((cx+sh, y, zt - h*0.06), (cx+hw, y, zs), (cx, y, zs), col)
    p.tri((cx-sh, y, zt - h*0.06), (cx, y, zt), (cx, y, zs), col)
    p.tri((cx, y, zt), (cx+sh, y, zt - h*0.06), (cx, y, zs), col)

def shed(p, x0, x1, y0, y1, eave, ridge, col, alt, wall='#cbb894'):
    """A train-shed span: two long folded slopes meeting on a ridge, closed by gables and end walls."""
    ym = (y0+y1)/2
    for x in (x0, x1): p.quad((x, y0, 0), (x, y1, 0), (x, y1, eave), (x, y0, eave), wall)
    p.quad((x0, y0, eave), (x1, y0, eave), (x1, ym, ridge), (x0, ym, ridge), col)
    p.quad((x0, ym, ridge), (x1, ym, ridge), (x1, y1, eave), (x0, y1, eave), alt)
    p.tri((x0, y0, eave), (x0, ym, ridge), (x0, y1, eave), alt)
    p.tri((x1, y0, eave), (x1, ym, ridge), (x1, y1, eave), alt)

# --- Buildings ---------------------------------------------------------------
# Universite Sorbonne Paris Nord: the brick wings under their white cornices, and the clock tower above them.
BRICK, BRICK2, TRIM, PANE = '#b04b30', '#c76044', '#f4f0e6', '#bcd8e4'
p = Paper()
p.faceted_wall(1.9, 0.95, 0.9, (-0.55, 0, 0), BRICK, BRICK2, cols=5)                      # long teaching wing
p.box((1.98, 1.0, 0.09), (-0.55, 0, 0.94), TRIM)                                          # white cornice slab
for k in range(5):                                                                        # two bands of windows
    for zz in (0.3, 0.62): p.box((0.2, 0.06, 0.2), (-1.36 + k*0.4, -0.56, zz), PANE)
p.box((0.5, 0.1, 0.16), (-1.2, -0.52, 0.08), TRIM); p.box((0.34, 0.06, 0.4), (-1.2, -0.55, 0.0), INK)   # entrance canopy and door
p.faceted_wall(0.62, 2.35, 0.62, (0.72, 0, 0), BRICK, BRICK2, cols=2)                     # the tower shaft
for x in (0.52, 0.92):                                                                    # white pilasters running its full height
    p.box((0.07, 0.66, 2.3), (x, 0, 1.15), TRIM)
for k in range(7):
    for x in (0.72,): p.box((0.1, 0.06, 0.14), (x, -0.39, 0.35 + k*0.27), PANE)
p.box((0.74, 0.74, 0.1), (0.72, 0, 2.38), TRIM)                                           # stepped crown
p.box((0.66, 0.66, 0.42), (0.72, 0, 2.63), TRIM)                                          # the clock box
for y, sgn in ((-0.34, -1), (0.34, 1)):                                                   # a dial front and back
    disc(p, (0.72, y, 2.63), 0.23, PAPER, segs=14); disc(p, (0.72, y*1.02, 2.63), 0.2, '#f8fbfd', segs=14)
    hand(p, (0.72, y*1.04, 2.63), math.pi/2 + sgn*0.5, 0.15, 0.015, INK)
    hand(p, (0.72, y*1.04, 2.63), math.pi/2 - sgn*1.9, 0.11, 0.02, INK)
for dx in (-0.15, 0.15):                                                                  # an open belfry on the clock box
    for dy in (-0.15, 0.15): p.box((0.05, 0.05, 0.26), (0.72 + dx, dy, 2.97), TRIM)
p.box((0.4, 0.4, 0.05), (0.72, 0, 3.12), TRIM); p.cone(0.25, 0.18, (0.72, 0, 3.14), TRIM, segs=4, top_r=0.0)
p.export('campus')

# Avignon Universite, campus Hannah Arendt (the old Hotel-Dieu): a pale limestone front, its projecting centre with
# two orders of columns around the arched door and the arched balcony window, a clock in the pediment under an iron
# bell-cote, a balustrade along the roof, and two plane trees and clipped hedges on the paved forecourt.
LIME, LIME2, LIGHT, SHADE, GLASS2, ZINC = '#ecdcb8', '#dcc89f', '#f6ecd4', '#b9a47e', '#5f6f78', '#b8b2a6'
p = Paper(); W, D, H = 2.3, 0.85, 1.25; fy = -D/2
p.faceted_wall(W, H, D, (0, 0, 0), LIME, LIME2, cols=6)                                   # the long front block
p.box((W + 0.08, D + 0.06, 0.04), (0, 0, 0.6), LIGHT)                                     # string course between the floors
p.box((W + 0.1, D + 0.1, 0.07), (0, 0, H + 0.035), LIGHT)                                 # cornice
p.box((W - 0.3, D - 0.25, 0.12), (0, 0.06, H + 0.13), ZINC)                               # low roof behind the balustrade
for x in (-W/2 + 0.04, W/2 - 0.04): p.box((0.09, 0.07, H), (x, fy - 0.01, H/2), LIGHT)    # corner pilasters
for side in (-1, 1):                                                                      # two bays of windows each side, both floors
    for x in (0.66, 0.96):
        for zc, h in ((0.3, 0.34), (0.92, 0.4)):
            p.box((0.2, 0.04, h + 0.06), (side*x, fy - 0.045, zc), LIGHT)
            p.box((0.14, 0.04, h), (side*x, fy - 0.07, zc), GLASS2)
            p.box((0.02, 0.03, h), (side*x, fy - 0.09, zc), LIGHT)                        # mullion
# Balustrade along the roof, broken by the pediment.
for side in (-1, 1):
    x0, x1 = 0.52, W/2
    p.box((x1 - x0, 0.07, 0.04), (side*(x0 + x1)/2, fy - 0.01, H + 0.09), LIGHT)
    p.box((x1 - x0, 0.07, 0.04), (side*(x0 + x1)/2, fy - 0.01, H + 0.27), LIGHT)
    n = 8
    for i in range(n): p.box((0.035, 0.035, 0.16), (side*(x0 + (i + 0.5)*(x1 - x0)/n), fy - 0.01, H + 0.18), LIGHT)
# The projecting centre.
cy = fy - 0.07
p.box((1.0, 0.14, H), (0, cy + 0.07, H/2), LIGHT)
p.box((0.34, 0.03, 0.58), (0, cy - 0.02, 0.29), LIME2)                                     # door surround
arch(p, 0, 0.0, 0.28, 0.5, cy - 0.045, '#3a3430')                                        # the arched door
p.box((0.32, 0.03, 0.54), (0, cy - 0.02, 0.93), LIME2)                                     # window surround
arch(p, 0, 0.66, 0.26, 0.48, cy - 0.045, GLASS2)                                          # the arched balcony window
for zb, zt in ((0.0, 0.58), (0.64, 1.2)):                                                 # two orders of columns
    for x in (-0.4, -0.23, 0.23, 0.4):
        p.cone(0.045, zt - zb - 0.06, (x, cy - 0.05, zb + 0.03), LIGHT, segs=8, top_r=0.04)
        p.box((0.11, 0.11, 0.035), (x, cy - 0.05, zb + 0.015), SHADE)                     # base
        p.box((0.12, 0.12, 0.04), (x, cy - 0.05, zt - 0.02), LIGHT)                       # capital
p.box((0.56, 0.2, 0.04), (0, cy - 0.1, 0.64), LIGHT)                                      # the balcony slab and its railing
for i in range(7): p.box((0.03, 0.03, 0.14), (-0.24 + i*0.08, cy - 0.18, 0.72), LIGHT)
p.box((0.56, 0.035, 0.03), (0, cy - 0.18, 0.8), LIGHT)
# Pediment with its clock, folded back to the roof.
pz, ph, pw = H + 0.07, 0.36, 0.56
p.tri((-pw, cy - 0.02, pz), (pw, cy - 0.02, pz), (0, cy - 0.02, pz + ph), LIGHT)
p.quad((-pw, cy - 0.02, pz), (0, cy - 0.02, pz + ph), (0, 0.1, pz + ph), (-pw, 0.1, pz), LIME2)
p.quad((0, cy - 0.02, pz + ph), (pw, cy - 0.02, pz), (pw, 0.1, pz), (0, 0.1, pz + ph), LIME)
disc(p, (0, cy - 0.03, pz + 0.14), 0.1, PAPER, segs=14)
hand(p, (0, cy - 0.04, pz + 0.14), math.pi/2 + 0.4, 0.075, 0.009, INK)
hand(p, (0, cy - 0.04, pz + 0.14), math.pi/2 - 2.0, 0.055, 0.012, INK)
for x in (-0.07, 0.07): p.box((0.025, 0.025, 0.24), (x, cy + 0.05, pz + ph + 0.1), INK)  # the iron bell-cote
p.box((0.18, 0.025, 0.025), (0, cy + 0.05, pz + ph + 0.22), INK)
p.cone(0.06, 0.08, (0, cy + 0.05, pz + ph + 0.23), INK, segs=4)
# Forecourt: paving, clipped hedges and two plane trees.
p.box((1.2, 1.1, 0.03), (0, fy - 0.62, 0.0), '#e6d6bb')
for side in (-1, 1):
    p.box((0.36, 0.18, 0.14), (side*0.62, fy - 1.0, 0.07), '#3f7d46')
    tx, ty = side*1.32, fy - 0.8
    p.cone(0.055, 0.95, (tx, ty, 0), '#c9b89c', segs=6, top_r=0.035)                     # pale mottled trunk
    for k, a in enumerate((0.4, 2.5, 4.4)):
        p.box((0.03, 0.03, 0.34), (tx + math.cos(a)*0.08, ty + math.sin(a)*0.08, 0.95), '#b9a88c', rot=a)
    p.cone(0.24, 0.24, (tx, ty, 1.0), '#a9c46f', segs=6, top_r=0.14)                       # a thin spring crown
    p.cone(0.14, 0.14, (tx, ty, 1.24), '#c2d78a', segs=6, top_r=0.0)
p.export('avignon')

# Gare du Nord: the magenta train sheds rising behind a long stone screen of arched bays, statues on its cornice.
MAGENTA, PLUM, STONE, STONE2, PANE2 = '#a4127e', '#7d0c60', '#f1e3c8', '#dfcba6', '#a9dcf1'
p = Paper()
for (y0, y1, eave, ridge) in ((-0.48, 0.06, 0.72, 1.42), (0.02, 0.50, 0.66, 1.26), (0.46, 0.86, 0.60, 1.10)):
    shed(p, -1.52, 1.52, y0, y1, eave, ridge, MAGENTA, PLUM)          # the spans over the platforms
    p.box((3.04, 0.04, eave), (0, y0, eave/2), '#cbb894')             # the side wall carrying the eaves
p.box((3.04, 0.04, 0.6), (0, 0.86, 0.3), '#cbb894')                   # and the back wall of the last span
p.faceted_wall(2.8, 0.82, 0.26, (0, -0.62, 0), STONE, STONE2, cols=8) # the screen facade
p.box((2.9, 0.34, 0.09), (0, -0.62, 0.86), STONE)                     # its cornice
for k in range(8):                                                    # the row of arched bays
    cx = -1.19 + k*0.34
    if abs(cx) < 0.32: continue
    arch(p, cx, 0.1, 0.21, 0.6, -0.84, PANE2)
    p.box((0.06, 0.06, 0.82), (cx + 0.17, -0.83, 0.41), STONE2)       # the pilaster between them
for cx in (-1.19, -0.85, -0.51, 0.51, 0.85, 1.19):                    # statues standing on the cornice
    p.box((0.08, 0.08, 0.06), (cx, -0.7, 0.93), STONE2)
    p.cone(0.045, 0.2, (cx, -0.7, 0.96), '#c9b998', segs=6, top_r=0.03)
p.faceted_wall(0.78, 1.26, 0.4, (0, -0.66, 0), STONE, STONE2, cols=2) # the taller central pavilion
arch(p, 0, 0.12, 0.46, 0.84, -0.95, PANE2)
p.box((0.9, 0.48, 0.09), (0, -0.66, 1.28), STONE)
p.tri((-0.45, -0.95, 1.33), (0.45, -0.95, 1.33), (0, -0.95, 1.56), STONE)   # pediment
disc(p, (0, -0.97, 1.06), 0.11, PAPER, segs=12)
hand(p, (0, -0.99, 1.06), 1.9, 0.075, 0.011, INK); hand(p, (0, -0.99, 1.06), -0.6, 0.055, 0.015, INK)
p.box((0.28, 0.05, 0.11), (-0.95, -0.84, 0.98), STONE); p.box((0.28, 0.05, 0.11), (0.95, -0.84, 0.98), STONE)  # the NORD plaques
p.export('station')

p = Paper(); p.faceted_wall(1.6, 1.0, 1.4, (0, 0, 0), CORAL, '#f7ad95', cols=3)
for i in range(3):
    x = -0.55 + i*0.55; p.tri((x-0.28, -0.75, 1.0), (x+0.28, -0.75, 1.0), (x+0.1, -0.75, 1.45), ORANGE)
    p.quad((x-0.28, -0.75, 1.0), (x+0.1, -0.75, 1.45), (x+0.1, 0.75, 1.45), (x-0.28, 0.75, 1.0), ORANGE)
    p.quad((x+0.1, -0.75, 1.45), (x+0.28, -0.75, 1.0), (x+0.28, 0.75, 1.0), (x+0.1, 0.75, 1.45), YELLOW)
    p.tri((x+0.28, 0.75, 1.0), (x-0.28, 0.75, 1.0), (x+0.1, 0.75, 1.45), ORANGE)
p.box((0.2, 0.2, 0.6), (0.5, -0.3, 1.4), INK); p.export('workshop')

def face_windows(p, verts, rows, col, cols=2, margin=0.16, proud=0.03):
    """Glaze every side face of a prism made by p.cone: `rows` are (bottom, top) fractions of its height."""
    zs = sorted({round(v.co.z, 4) for v in verts}); z0, z1 = zs[0], zs[-1]
    ring = lambda z: sorted([v.co.copy() for v in verts if abs(v.co.z - z) < 1e-3], key=lambda c: math.atan2(c.y, c.x))
    bot, top = ring(z0), ring(z1); n = len(bot)
    for i in range(n):
        b0, b1, t0, t1 = bot[i], bot[(i+1) % n], top[i], top[(i+1) % n]
        mid = (b0 + b1 + t0 + t1)/4; out = Vector((mid.x, mid.y, 0)).normalized()*proud
        P = lambda u, f: tuple(b0.lerp(b1, u).lerp(t0.lerp(t1, u), f) + out)
        for f0, f1 in rows:
            for c in range(cols):
                u0 = margin + (1 - 2*margin)*c/cols + 0.05; u1 = margin + (1 - 2*margin)*(c + 1)/cols - 0.05
                p.quad(P(u0, f0), P(u1, f0), P(u1, f1), P(u0, f1), col)
p = Paper(); shaft = p.cone(0.62, 2.6, (0, 0, 0), LILAC, segs=6, top_r=0.5); band = p.cone(0.66, 0.9, (0, 0, 0.9), '#dccff2', segs=6, top_r=0.58)
face_windows(p, shaft, [(0.05, 0.13), (0.18, 0.26), (0.73, 0.8), (0.85, 0.93)], '#bfe3f2')   # below and above the band
face_windows(p, band, [(0.16, 0.42), (0.58, 0.84)], '#9fd0e8', proud=0.035)                  # the band's own storeys
p.cone(0.72, 0.16, (0, 0, 2.6), ORANGE, segs=6, top_r=0.72); p.cone(0.5, 0.55, (0, 0, 2.76), YELLOW, segs=6, top_r=0.0); p.export('tower')

p = Paper(); p.faceted_wall(1.8, 0.9, 1.5, (0, 0, 0), PAPER, CREAM, cols=3); p.pagoda_roof(1.8, 1.5, 0.5, (0, 0, 0.9), RED, curl=0.14, overhang=0.3)
p.faceted_wall(1.2, 0.5, 1.0, (0, 0, 1.4), PAPER, CREAM, cols=2); p.pagoda_roof(1.2, 1.0, 0.42, (0, 0, 1.9), ORANGE, curl=0.12, overhang=0.25); p.export('dojo')

# Stade des projets perso: an oval bowl of stepped stands in four colours, a striped pitch, canopies over the long
# sides, four floodlight masts and a scoreboard. About the footprint of the other buildings.
p = Paper()
AI, BI, AO, BO = 0.72, 0.46, 0.98, 0.72                                 # inner and outer half-axes of the bowl
TIERS = [(0.0, 0.04), (0.34, 0.2), (0.67, 0.35), (1.0, 0.5)]            # (fraction from inner to outer, height)
STAND = [(ORANGE, '#d9602b'), (YELLOW, '#e0b24a'), (TEAL, '#5aa9a0'), (CORAL, '#d06e4f')]
E = lambda a, f, z: ((AI + (AO-AI)*f)*math.cos(a), (BI + (BO-BI)*f)*math.sin(a), z)
N = 24
for i in range(N):
    a0, a1 = 2*math.pi*i/N, 2*math.pi*(i+1)/N; seat, riser = STAND[(i*4)//N]
    for k in range(3):
        (f0, z0), (f1, z1) = TIERS[k], TIERS[k+1]
        p.quad(E(a0, f0, z0), E(a1, f0, z0), E(a1, f0, z1), E(a0, f0, z1), riser)     # riser
        p.quad(E(a0, f0, z1), E(a1, f0, z1), E(a1, f1, z1), E(a0, f1, z1), seat)      # tread
    p.quad(E(a0, 1, 0), E(a1, 1, 0), E(a1, 1, 0.5), E(a0, 1, 0.5), CREAM if i % 2 else PAPER)   # outer wall
    if abs(math.sin((a0+a1)/2)) > 0.62:                                  # folded canopies over the long sides
        p.quad(E(a0, 1, 0.5), E(a1, 1, 0.5), E(a1, 0.52, 0.66), E(a0, 0.52, 0.66), PAPER if i % 2 else '#e6e6e6')
    p.tri((0, 0, 0.03), E(a0, 0, 0.03), E(a1, 0, 0.03), '#c8603f')      # running track under the pitch
for s in range(6):                                                      # the pitch, mown in stripes
    x0 = -0.55 + 1.1*s/6; x1 = -0.55 + 1.1*(s+1)/6
    p.quad((x0, -0.31, 0.045), (x1, -0.31, 0.045), (x1, 0.31, 0.045), (x0, 0.31, 0.045), '#4caf50' if s % 2 else '#66c066')
p.box((0.012, 0.62, 0.004), (0, 0, 0.049), PAPER)                       # halfway line
for a in (math.pi/4, 3*math.pi/4, 5*math.pi/4, 7*math.pi/4):            # floodlights
    x, y, _ = E(a, 1.06, 0)
    p.box((0.04, 0.04, 1.05), (x, y, 0.525), INK); p.box((0.2, 0.06, 0.1), (x, y, 1.08), YELLOW, rot=a + math.pi/2)
p.box((0.05, 0.38, 0.22), (0.93, 0, 0.62), INK); p.box((0.02, 0.32, 0.16), (0.9, 0, 0.62), TEAL)   # scoreboard
p.export('arcade')


# --- Signal box for SNCF Réseau: brick base, glazed upper floor, balcony and a signal mast.
p = Paper(); p.faceted_wall(1.2, 1.0, 1.0, (0, 0, 0), '#b8623f', '#d07d55', cols=3)
p.faceted_wall(1.35, 0.7, 1.15, (0, 0, 1.0), '#e9f6ff', '#cfe7f5', cols=3)
p.pleated_roof(1.45, 1.2, 0.3, (0, 0, 1.7), INK, pleats=3, alt='#44444f', overhang=0.16)
p.box((1.6, 1.35, 0.05), (0, 0, 1.0), YELLOW)                       # balcony deck
p.box((0.06, 0.06, 1.7), (0.95, 0.4, 0.85), INK)                    # signal mast
p.box((0.22, 0.07, 0.6), (0.95, 0.4, 1.55), INK)                     # signal head
for k, col in enumerate(['#6a3fb5', '#e8892b', '#2f9e5b']):          # violet, orange, green, dimmed until lit
    for y in (0.36, 0.44): disc(p, (0.95, y, 1.37 + k*0.18), 0.065, col, segs=10)
p.export('signal', jitter=0.008)
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

p = Paper(); bf, bb, bt, bd = (0.16, 0, 0), (-0.16, 0, 0), (0, 0, 0.12), (0, 0, -0.06); wl, wr = (0.02, -0.55, 0.26), (0.02, 0.55, 0.26); neck, head, tail = (0.42, 0, 0.22), (0.5, 0, 0.16), (-0.46, 0, 0.24)
for t in ((bf, bt, bb), (bf, bb, bd), (bf, wl, bb), (bf, bb, wr), (bf, neck, bt), (neck, head, bt), (bb, bt, tail)): p.tri(*t, PAPER)
p.export('crane', jitter=0.004, outward=False)
# a folded wave crest: zigzag strip of paper, blue with a white lip
p = Paper()
# Cross-section of the breaker (y seaward-positive, z up): back slope, crest, curling lip, hollow underneath.
PROFILE = [(0.26, 0.0), (0.14, 0.09), (0.04, 0.19), (-0.06, 0.21), (-0.14, 0.15), (-0.12, 0.08), (-0.04, 0.06), (0.0, 0.0)]
SHADES = ['#1f7f99', '#2f97b0', '#6cc6d6', '#e9f7f9', PAPER, '#bfe6ee', '#2a8aa3']
n = 9
for i in range(n):
    s0, s1 = i/n, (i+1)/n
    h0, h1 = math.sin(math.pi*s0)**0.7, math.sin(math.pi*s1)**0.7                    # the crest tapers into the sea at both ends
    x0, x1 = -0.7 + 1.4*s0, -0.7 + 1.4*s1
    for k in range(len(PROFILE)-1):
        (ya, za), (yb, zb) = PROFILE[k], PROFILE[k+1]
        w0, w1 = 0.45 + 0.55*h0, 0.45 + 0.55*h1
        p.quad((x0, ya*w0, za*h0), (x1, ya*w1, za*h1), (x1, yb*w1, zb*h1), (x0, yb*w0, zb*h0), SHADES[k])
p.export('wave', jitter=0.006, tint=0.06, outward=False)


# --- Harbour: a plank pier on posts, a mooring bollard and a lantern post.
p = Paper()
for i in range(9):
    p.box((0.42, 1.1, 0.05), (i*0.44, 0, 0.32), ['#c9a06a', '#b8905c', '#d4ad78'][i % 3])
for x in (0.0, 1.76, 3.52):
    for y in (-0.42, 0.42): p.cone(0.05, 0.9, (x, y, -0.5), '#7a5a3a', segs=6, top_r=0.05)
p.cone(0.07, 0.25, (3.4, 0.35, 0.35), INK, segs=6, top_r=0.06); p.box((0.05, 0.05, 0.8), (0.3, -0.4, 0.75), INK); p.box((0.14, 0.14, 0.14), (0.3, -0.4, 1.18), YELLOW)
p.export('pier', jitter=0.006)
# --- Vehicles --------------------------------------------------------------
# Steam locomotive, tender and wagon exported separately: on the island each car rides its own pair of bogies,
# so the rake pitches on the slopes and swings through the curves instead of moving as one rigid block.
p = Paper(); p.box((0.9, 0.34, 0.06), (0, 0, 0.14), INK)                                    # frame
ret = bmesh.ops.create_cone(p.bm, cap_ends=True, segments=8, radius1=0.14, radius2=0.14, depth=0.55); bmesh.ops.transform(p.bm, matrix=Matrix.Rotation(math.pi/2, 4, 'Y') @ Matrix.Translation((0, 0, 0)), verts=ret['verts']); bmesh.ops.transform(p.bm, matrix=Matrix.Translation((0.14, 0, 0.32)), verts=ret['verts']); p.paint(p.owned(ret['verts']), RED)
p.cone(0.05, 0.16, (0.34, 0, 0.44), INK, segs=8, top_r=0.07); p.cone(0.06, 0.08, (0.12, 0, 0.45), YELLOW, segs=8, top_r=0.04)
p.faceted_wall(0.28, 0.34, 0.3, (-0.25, 0, 0.17), RED, '#f06a5c', cols=2); p.pleated_roof(0.28, 0.3, 0.06, (-0.25, 0, 0.51), INK, pleats=2, overhang=0.04)
p.tri((0.44, -0.17, 0.11), (0.44, 0.17, 0.11), (0.56, 0, 0.04), YELLOW)
for x in (-0.3, -0.05, 0.22):
    for y in (-0.18, 0.18): p.cone(0.07, 0.03, (x, y, 0.07), INK, segs=8, top_r=0.07)
p.export('loco', jitter=0.005)
p = Paper(); p.box((0.42, 0.3, 0.26), (0, 0, 0.17), YELLOW); p.box((0.34, 0.24, 0.08), (0, 0, 0.34), INK)
p.export('tender', jitter=0.005)
p = Paper(); p.faceted_wall(0.46, 0.3, 0.3, (0, 0, 0.04), TEAL, '#a6dcd6', cols=2); p.pleated_roof(0.46, 0.3, 0.07, (0, 0, 0.34), '#44444f', pleats=2, overhang=0.04)
p.export('wagon', jitter=0.005)
# Sailboat: pointed folded hull, keel, mast and two sails.
p = Paper(); bow, stern_l, stern_r, keel = (0.6, 0, 0.14), (-0.5, -0.2, 0.16), (-0.5, 0.2, 0.16), (0.05, 0, -0.1)
p.tri(bow, (0.05, -0.26, 0.18), keel, PAPER); p.tri((0.05, -0.26, 0.18), stern_l, keel, CREAM); p.tri(stern_l, stern_r, keel, PAPER); p.tri(stern_r, (0.05, 0.26, 0.18), keel, CREAM); p.tri((0.05, 0.26, 0.18), bow, keel, PAPER)
p.quad(bow, (0.05, -0.26, 0.18), stern_l, (0.05, 0, 0.18), RED); p.quad(bow, (0.05, 0, 0.18), stern_r, (0.05, 0.26, 0.18), RED)  # deck
p.box((0.03, 0.03, 0.9), (0.05, 0, 0.6), INK)
p.export('boat', jitter=0.006)
# The sails are a separate piece so the boat can furl them at the quay.
def pleated_sail(p, mast_x, foot, top, reach, col, alt, n=7, depth=0.028):
    """A sail cut into horizontal pleats that fold alternately forward and back, like an accordion."""
    for i in range(n):
        t0, t1 = i/n, (i+1)/n
        z0, z1 = foot + (top-foot)*t0, foot + (top-foot)*t1
        e0, e1 = mast_x + reach*(1-t0), mast_x + reach*(1-t1)
        y0, y1 = (depth, -depth) if i % 2 else (-depth, depth)
        p.quad((mast_x, y0, z0), (e0, y0, z0), (e1, y1, z1), (mast_x, y1, z1), col if i % 2 else alt)
p = Paper(); pleated_sail(p, 0.06, 0.27, 1.0, 0.44, ORANGE, '#ffb27a'); pleated_sail(p, 0.04, 0.27, 0.96, -0.46, PAPER, CREAM)
p.export('sails', jitter=0.002, outward=False)
# Fishing boat: rounded hull, wheelhouse, folded flag.
p = Paper(); p.faceted_wall(0.7, 0.18, 0.3, (0, 0, 0), '#3a6ea5', '#5b8ec4', cols=3); p.tri((0.35, -0.15, 0.18), (0.35, 0.15, 0.18), (0.55, 0, 0.2), '#3a6ea5'); p.tri((0.35, -0.15, 0), (0.55, 0, 0.2), (0.35, -0.15, 0.18), '#5b8ec4'); p.tri((0.35, 0.15, 0.18), (0.55, 0, 0.2), (0.35, 0.15, 0), '#5b8ec4')
p.box((0.24, 0.22, 0.2), (-0.12, 0, 0.28), CREAM); p.pleated_roof(0.24, 0.22, 0.05, (-0.12, 0, 0.38), RED, pleats=2, overhang=0.03); p.box((0.02, 0.02, 0.4), (0.15, 0, 0.5), INK); p.tri((0.16, 0, 0.7), (0.16, 0, 0.6), (0.3, 0, 0.66), YELLOW)
p.export('fisher', jitter=0.006)
# Origami fish: folded body, tail and dorsal fin.
p = Paper(); nose, top, bottom, tailroot, tail_t, tail_b = (0.3, 0, 0.0), (0.02, 0, 0.12), (0.02, 0, -0.11), (-0.22, 0, 0.0), (-0.4, 0, 0.12), (-0.4, 0, -0.12)
for side in (-0.05, 0.05):
    mid = (0.02, side, 0.0)
    p.tri(nose, top, mid, ORANGE); p.tri(nose, mid, bottom, '#ffb27a'); p.tri(top, tailroot, mid, ORANGE); p.tri(mid, tailroot, bottom, '#ffb27a')
p.tri(tailroot, tail_t, tail_b, RED); p.tri((0.08, 0, 0.1), (-0.1, 0, 0.1), (-0.02, 0, 0.22), RED)
p.export('fish', jitter=0.003, outward=False)

# The white hatchback of Route & vigilance: chamfered bonnet, glasshouse with pillars, four wheels, lamps.
GLASS, TYRE, GREY = '#8fbbd6', '#26262c', '#9aa0a6'
p = Paper()
p.box((0.36, 0.18, 0.075), (0, 0, 0.085), PAPER)                                          # lower body
p.quad((0.18, -0.09, 0.122), (0.18, 0.09, 0.122), (0.07, 0.085, 0.15), (0.07, -0.085, 0.15), CREAM)   # bonnet
p.quad((-0.18, -0.09, 0.122), (-0.18, 0.09, 0.122), (-0.165, 0.085, 0.15), (-0.165, -0.085, 0.15), CREAM)
for sgn in (-1, 1):                                                                       # flanks under the bonnet line
    y = 0.09*sgn
    p.quad((0.18, y, 0.122), (0.07, 0.085*sgn, 0.15), (-0.165, 0.085*sgn, 0.15), (-0.18, y, 0.122), PAPER)
bl, br = (0.07, 0.15), (-0.165, 0.15)                                                     # glasshouse
tf, tr = (0.0, 0.24), (-0.125, 0.24)
p.quad((bl[0], -0.085, bl[1]), (bl[0], 0.085, bl[1]), (tf[0], 0.07, tf[1]), (tf[0], -0.07, tf[1]), GLASS)        # windscreen
p.quad((tf[0], -0.07, tf[1]), (tf[0], 0.07, tf[1]), (tr[0], 0.07, tr[1]), (tr[0], -0.07, tr[1]), PAPER)          # roof
p.quad((tr[0], -0.07, tr[1]), (tr[0], 0.07, tr[1]), (br[0], 0.085, br[1]), (br[0], -0.085, br[1]), GLASS)        # rear window
for sgn in (-1, 1):
    yb, yt = 0.085*sgn, 0.07*sgn
    p.quad((bl[0], yb, bl[1]), (br[0], yb, br[1]), (tr[0], yt, tr[1]), (tf[0], yt, tf[1]), GLASS)                 # side glass
    p.quad((-0.045, yb*1.01, 0.15), (-0.03, yb*1.01, 0.15), (-0.052, yt*1.01, 0.24), (-0.067, yt*1.01, 0.24), PAPER)  # B-pillar
    p.box((0.02, 0.025, 0.018), (0.06, 0.1*sgn, 0.16), PAPER)                             # mirror
    for x in (0.105, -0.11):                                                              # wheels
        ret = bmesh.ops.create_cone(p.bm, cap_ends=True, segments=10, radius1=0.047, radius2=0.047, depth=0.03)
        bmesh.ops.transform(p.bm, matrix=Matrix.Translation((x, 0.085*sgn, 0.047)) @ Matrix.Rotation(math.pi/2, 4, 'X'), verts=ret['verts'])
        p.paint(p.owned(ret['verts']), TYRE)
    p.box((0.012, 0.035, 0.022), (0.181, 0.055*sgn, 0.105), YELLOW)                      # headlamps
    p.box((0.012, 0.03, 0.022), (-0.181, 0.06*sgn, 0.108), RED)                          # tail lamps
p.box((0.02, 0.19, 0.025), (0.183, 0, 0.062), GREY); p.box((0.02, 0.19, 0.025), (-0.183, 0, 0.062), GREY)   # bumpers
p.export('car', jitter=0.002)
p = Paper(); p.cone(0.26, 1.3, (0, 0, 0), PAPER, segs=8, top_r=0.18)
for i in range(3): p.cone(0.27 - i*0.03, 0.12, (0, 0, 0.22 + i*0.4), RED, segs=8, top_r=0.27 - i*0.03)
p.cone(0.15, 0.25, (0, 0, 1.3), '#e9f6ff', segs=8, top_r=0.15); p.cone(0.18, 0.2, (0, 0, 1.55), RED, segs=8, top_r=0.0); p.export('lighthouse')
p = Paper(); rng = random.Random('islet'); RINGS = [(0.62, -0.2), (0.56, 0.18), (0.44, 0.42), (0.3, 0.5)]
pts = [[((r*(0.86 + 0.28*rng.random()))*math.cos(2*math.pi*i/9), (r*(0.86 + 0.28*rng.random()))*math.sin(2*math.pi*i/9), z + 0.05*rng.random()) for i in range(9)] for r, z in RINGS]
for k in range(len(pts)-1):
    for i in range(9):
        a, b, c, d = pts[k][i], pts[k][(i+1) % 9], pts[k+1][(i+1) % 9], pts[k+1][i]
        col = ROCK[(i + k) % len(ROCK)] if k < 2 else GREENS[(i + k) % len(GREENS)]
        p.tri(a, b, c, col); p.tri(a, c, d, ROCK[(i + k + 1) % len(ROCK)] if k < 2 else GREENS[(i + k + 1) % len(GREENS)])
top = pts[-1]; cz = sum(v[2] for v in top)/9
for i in range(9): p.tri((0, 0, cz + 0.02), top[i], top[(i+1) % 9], GREENS[i % len(GREENS)])
p.export('islet', jitter=0.01)

# --- Island: folded hills, a sandy shore and a rock skirt ---------------------
p = Paper(); bm = p.bm; segs, rings = 56, 8; R = 4.8
def radius_at(a): return R + math.sin(a*3)*0.35 + math.sin(a*7+1)*0.22
grid = []
for ring in range(rings + 1):
    row = []
    for i in range(segs):
        a = i/segs*math.tau; t = ring/rings; r = radius_at(a)*t
        hill = noise.noise(Vector((math.cos(a)*r*0.45, math.sin(a)*r*0.45, 0.7)))*0.35 + 0.12
        z = max(0.02, hill*(1 - t**3)) if ring else hill + 0.05
        if t > 0.8: z = 0.02 + (1-t)*0.35   # beach slopes down to the water
        row.append(bm.verts.new(Vector((math.cos(a)*r, math.sin(a)*r, z))))
    grid.append(row)
centre = grid[0][0]
for ring in range(rings):
    for i in range(segs):
        a, b = grid[ring][i], grid[ring][(i+1) % segs]; c, d = grid[ring+1][(i+1) % segs], grid[ring+1][i]
        t = (ring + 0.5)/rings
        col = SAND[i % 3] if t > 0.8 else GRASS[(i + ring) % 4]
        if ring == 0: p.paint([bm.faces.new((centre, c, d))], col)
        else:
            for tri in ((a, b, c), (a, c, d)):
                try: p.paint([bm.faces.new(tri)], col)
                except ValueError: pass
# The sand runs on past the tide line and shelves gently under the sea (the water sits at -0.3 here), so the
# lagoon reads shallow and turquoise over it before the sea floor drops away.
SHORE = [(1.06, -0.1, '#f4dc9f'), (1.13, -0.27, '#f0d9a4'), (1.21, -0.42, '#ecd6a6'), (1.3, -0.58, '#e3cfa2'), (1.36, -1.2, '#cdbf98')]
prev = grid[rings]
for k, (s, z, col) in enumerate(SHORE):
    ring = [bm.verts.new(Vector((v.co.x*s/(1 + 0.02*k) * (1 + 0.02*k), v.co.y*s, z + (random.uniform(-0.03, 0.03) if k < 4 else 0)))) for v in grid[rings]]
    for i in range(segs):
        a, b = prev[i], prev[(i+1) % segs]; c, d = ring[(i+1) % segs], ring[i]
        for j, tri in enumerate(((a, b, c), (a, c, d))): p.paint([bm.faces.new(tri)], col if (i + j) % 3 else SAND[(i + k) % 3] if k < 2 else col)
    prev = ring
p.paint([bm.faces.new(prev[::-1])], ROCK[3])
p.export('island', jitter=0.03, tint=0.09, outward=False)

# --- Beach palm: a leaning trunk of stacked folded rings and seven fronds, each creased down its spine.
p = Paper(); lean = 0.22; seg = 6; H = 1.25
for i in range(seg):
    t0, t1 = i/seg, (i+1)/seg
    x0, x1 = lean*t0*t0, lean*t1*t1
    p.cone(0.075 - 0.025*t0, H/seg*1.02, (x0, 0, H*t0), ['#a8805a', '#8f6a48'][i % 2], segs=6, top_r=0.07 - 0.025*t1)
top = (lean, 0, H)
for i in range(7):
    a = i/7*math.tau + 0.3; L = 0.62 + 0.08*(i % 2); ca, sa = math.cos(a), math.sin(a)
    mid = (top[0] + ca*L*0.55, sa*L*0.55, H + 0.1); tip = (top[0] + ca*L, sa*L, H - 0.28)
    w = 0.14; nx, ny = -sa*w, ca*w
    for side, col in ((1, GREENS[0]), (-1, GREENS[2])):
        edge = (mid[0] + nx*side, mid[1] + ny*side, mid[2] - 0.05)
        p.tri(top, mid, edge, col); p.tri(mid, tip, edge, GREENS[3] if side > 0 else GREENS[2])
for i in range(3): p.cone(0.045, 0.08, (lean + math.cos(i*2.1)*0.06, math.sin(i*2.1)*0.06, H - 0.1), '#6b4a2e', segs=5, top_r=0.03)
p.export('palm', jitter=0.004, outward=False)

json.dump(models, open(out, 'w'), separators=(',', ':'))
print('written', out, {k: len(v['color'])//3 for k, v in models.items()})
