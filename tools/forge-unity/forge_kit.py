"""Forge du kit de décor « peint main » de Talas, tout en code (Blender, module bpy) :

    python forge_kit.py <dossier de sortie> [apercu.png]

Étapes (celles du tutoriel Unity + Blender) :
  1. chaque pièce est modelée à la main en code, par morceaux, avec des bords biseautés et un léger tremblé (rien n'est parfaitement droit) ;
  2. les matériaux sont fusionnés dans UN atlas de 1024 px : 16 cases de 256, peintes en code (pierre lunaire, mousse, bois, cuivre à runes, fer riveté, flamme, cage de verre, herbe, bambou…) ;
  3. chaque face reçoit les UV de sa case ;
  4. un seul FBX (Y haut, -Z devant, mètres) contient toutes les pièces, nommées, prêtes à devenir des préfabriqués ;
  5. un aperçu rendu (Cycles, lune bleue + braseros chauds) sert de preuve visuelle.
Le style est choisi pour tenir dans du code : volumes simples et bombés, détail porté par la peinture, lumière froide + points chauds."""
import bpy, bmesh, math, random, struct, sys, zlib, os
import numpy as np
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else sys.argv[-2 if len(sys.argv) > 2 and sys.argv[-1].endswith('.png') else -1]
PREVIEW = sys.argv[-1] if sys.argv[-1].endswith('.png') else None
os.makedirs(OUT, exist_ok=True)
RS = np.random.RandomState(45001); random.seed(45001)

# ============================================================ 1. L'ATLAS PEINT (16 cases de 256 px) =====================================================
N = 256
def value_noise(scale, seed=0):
    r = np.random.RandomState(seed); g = r.rand(scale + 1, scale + 1); g[-1] = g[0]; g[:, -1] = g[:, 0]
    xs = np.linspace(0, scale, N, endpoint=False); i = xs.astype(int); f = xs - i; f = f * f * (3 - 2 * f)
    a = g[np.ix_(i, i)]; b = g[np.ix_(i, i + 1)]; c = g[np.ix_(i + 1, i)]; d = g[np.ix_(i + 1, i + 1)]
    fx = f[None, :]; fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
def fbm(seed, base=4, octaves=4):
    t = 0; amp = 1; tot = 0
    for o in range(octaves): t = t + value_noise(base * 2 ** o, seed + o) * amp; tot += amp; amp *= .5
    return t / tot
def streak(a, length, axis=1):
    k = np.ones(length) / length
    return np.apply_along_axis(lambda v: np.convolve(np.r_[v[-length:], v, v[:length]], k, 'same')[length:-length], axis, a)
def col(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
def mix(c0, c1, t): return c0[None, None, :] * (1 - t[..., None]) + c1[None, None, :] * t[..., None]
YY, XX = np.mgrid[0:N, 0:N] / N

def cell_stone(light, seed):
    b0, b1 = (col('#a9c4d6'), col('#e9f3f8')) if light else (col('#4f6f86'), col('#8fb0c4'))
    img = mix(b0, b1, fbm(seed, 3) * .8 + streak(fbm(seed + 9, 6), 9, 1) * .5)
    bx, by = 4, 4; fx = (XX * bx) % 1; fy = (YY * by) % 1; row = (YY * by).astype(int); fx = ((XX * bx + row * .5) % 1)
    edge = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy)); line = np.clip(1 - edge / .035, 0, 1)
    tint = np.random.RandomState(seed).rand(by + 1, bx + 2)[(YY * by).astype(int), (((XX * bx + row * .5)).astype(int)) % (bx + 1)]
    img = img * (.9 + .16 * tint[..., None]) * (1 - .55 * line[..., None]) + col('#ffffff') * (np.clip((.06 - edge) / .06, 0, 1) * .12 * (fy < .5))[..., None]
    pits = (value_noise(40, seed + 3) > .83) * .22; cracks = (np.abs(fbm(seed + 5, 5, 3) - .5) < .012) * .5
    return np.clip(img - pits[..., None] * .5 - cracks[..., None] * .55, 0, 1)
def cell_moss(seed):
    n = fbm(seed, 6, 4); img = mix(col('#3d8f2a'), col('#9ee05a'), n)
    dabs = (value_noise(28, seed + 2) > .72) * .35; return np.clip(img + dabs[..., None] * col('#d8ff8a') * .6 - .12 * (value_noise(60, seed + 4) > .8)[..., None], 0, 1)
def cell_wood(seed, warm=True, cool=False):
    c0, c1 = (col('#8a4a1c'), col('#d98a3a')) if warm else (col('#2d6a72'), col('#5fa6a8'))
    planks = 5; px = (XX * planks).astype(int); fx = (XX * planks) % 1
    grain = streak(fbm(seed, 14, 3), 31, 0)
    img = mix(c0, c1, np.clip(grain * 1.4 - .2 + np.random.RandomState(seed).rand(planks)[px] * .3 - .15, 0, 1))
    img = img * (1 - .6 * np.clip(1 - np.minimum(fx, 1 - fx) / .03, 0, 1))[..., None]
    nails = ((np.abs((YY * 4) % 1 - .5) < .03) & (np.abs(fx - .5) < .08)) * .4
    return np.clip(img * (1 - nails[..., None]), 0, 1)
def cell_copper(seed):
    n = fbm(seed, 5, 4); img = mix(col('#a84f2a'), col('#e08a52'), n); rust = (value_noise(18, seed + 1) > .68) * .5
    img = img * (1 - rust[..., None] * .35) + col('#e9f0f2') * ((value_noise(70, seed + 2) > .9) * .5)[..., None]
    band = (np.abs(((YY * 5) % 1) - .5) < .06) * 1.0; rune = (np.abs(((XX * 6) % 1) - .5) < .04) * ((YY * 5) % 1 > .2) * ((YY * 5) % 1 < .8)
    return np.clip(img * (1 - .5 * np.maximum(band, rune)[..., None]) + col('#3b6fa0') * (.7 * np.maximum(band, rune))[..., None] * .8, 0, 1)
def cell_iron(seed):
    img = mix(col('#26343b'), col('#5b7480'), fbm(seed, 6, 3)); rv = ((np.abs((XX * 8) % 1 - .5) < .1) & (np.abs((YY * 2) % 1 - .5) < .1)) * 1.0
    return np.clip(img + rv[..., None] * .22 - .18 * (value_noise(50, seed + 3) > .85)[..., None], 0, 1)
def cell_flame():
    t = np.clip(1 - YY, 0, 1); c = np.where(t[..., None] > .55, mix(col('#ff8a1e'), col('#fff3a6'), (t - .55) / .45), mix(col('#d62d12'), col('#ff8a1e'), t / .55)); return np.clip(c, 0, 1)
def cell_cage(seed):
    img = mix(col('#0e5e5c'), col('#3de0c0'), fbm(seed, 4, 3)); gx = np.abs((XX * 4) % 1 - .5) > .44; gy = np.abs((YY * 4) % 1 - .5) > .44
    return np.clip(np.where((gx | gy)[..., None], col('#0a3e4a')[None, None, :] + 0 * img, img * 1.15), 0, 1)
def cell_rope(seed):
    return np.clip(mix(col('#8a7048'), col('#d6c08c'), streak(fbm(seed, 18, 2), 25, 1)), 0, 1)
def cell_grass(seed):
    r = np.random.RandomState(seed); img = np.zeros((N, N, 4)); img[..., :3] = mix(col('#7a9a2a'), col('#d6e060'), fbm(seed, 5, 3)); a = np.zeros((N, N))
    for k in range(26):
        x0 = r.rand(); h = .45 + r.rand() * .55; w = .035 + r.rand() * .03; lean = (r.rand() - .5) * .25
        xc = x0 + lean * (1 - YY); a = np.maximum(a, ((np.abs(XX - xc) < w * (1 - (1 - YY) / h * .0) * np.clip((YY - (1 - h)) / h, 0, 1) * 1.6)) * (YY > 1 - h))
    img[..., 3] = a; return img
def cell_bark(seed):
    img = mix(col('#4c6f78'), col('#a9c0b8'), streak(fbm(seed, 10, 3), 41, 0)); ring = (np.abs((YY * 5) % 1 - .5) < .03) * .5
    return np.clip(img * (1 - ring[..., None]), 0, 1)
def cell_leaf(seed):
    n = fbm(seed, 5, 3); img = mix(col('#a8451c'), col('#f0a24a'), n); vein = (np.abs(XX - .5) < .012) * .35
    return np.clip(img - vein[..., None] + (value_noise(22, seed + 1) > .75)[..., None] * col('#ffd27a') * .25, 0, 1)
def cell_dirt(seed):
    img = mix(col('#8c4a3a'), col('#d98a6a'), fbm(seed, 4, 4)); cr = (np.abs(fbm(seed + 5, 6, 3) - .5) < .014) * .5
    return np.clip(img - cr[..., None] * .5, 0, 1)
def cell_glow():
    d = np.sqrt((XX - .5) ** 2 + (YY - .5) ** 2) * 2; return np.clip(mix(col('#ffffff'), col('#1fc8ff'), np.clip(d, 0, 1)), 0, 1)
def cell_cap(seed):
    img = mix(col('#1c5a66'), col('#4fb0a8'), fbm(seed, 4, 3)); dots = (value_noise(12, seed + 2) > .78) * .6
    return np.clip(img + dots[..., None] * col('#d6fff2') * .5, 0, 1)

CELLS = ['stone_light', 'stone_dark', 'moss', 'wood_warm', 'copper', 'iron', 'flame', 'cage', 'rope', 'grass', 'bark', 'leaf', 'plank_cool', 'dirt', 'glow', 'cap']
def build_atlas():
    atlas = np.ones((1024, 1024, 4)); painters = [lambda: cell_stone(True, 1), lambda: cell_stone(False, 2), lambda: cell_moss(3), lambda: cell_wood(4, True), lambda: cell_copper(5), lambda: cell_iron(6), cell_flame,
                                                  lambda: cell_cage(8), lambda: cell_rope(9), lambda: cell_grass(10), lambda: cell_bark(11), lambda: cell_leaf(12), lambda: cell_wood(13, False), lambda: cell_dirt(14), cell_glow, lambda: cell_cap(16)]
    for i, p in enumerate(painters):
        c = p(); c = c if c.shape[-1] == 4 else np.dstack([c, np.ones((N, N))])
        # posterisation douce : l'aplat peint garde ses nuances mais perd le dégradé numérique
        c[..., :3] = np.round(c[..., :3] * 14) / 14 * .55 + c[..., :3] * .45
        cx, cy = (i % 4) * N, (i // 4) * N; atlas[cy:cy + N, cx:cx + N] = c
    return atlas
def write_png(path, a):
    a8 = (np.clip(a, 0, 1) * 255).astype(np.uint8)[::-1]   # PNG : origine en haut
    raw = b''.join(b'\x00' + a8[y].tobytes() for y in range(a8.shape[0])); chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', a8.shape[1], a8.shape[0], 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
ATLAS = os.path.join(OUT, 'TalasPainted_Atlas.png'); AT = build_atlas(); write_png(ATLAS, AT); print('atlas', ATLAS)
# atlas d'émission : seules les cases « flamme » (6) et « lueur » (14) brillent ; Unity en fait la _EmissionMap (bloom des braseros, lanternes)
EM = np.zeros_like(AT); EM[..., 3] = 1
for c in (cid_ := [CELLS.index('flame'), CELLS.index('glow')]): EM[(c // 4) * N:(c // 4 + 1) * N, (c % 4) * N:(c % 4 + 1) * N, :3] = AT[(c // 4) * N:(c // 4 + 1) * N, (c % 4) * N:(c % 4 + 1) * N, :3]
EMISSION = os.path.join(OUT, 'TalasPainted_Emission.png'); write_png(EMISSION, EM)

# ============================================================ 2. MODELAGE : pièces en code ================================================================
bpy.ops.wm.read_factory_settings(use_empty=True)
img = bpy.data.images.load(ATLAS); img.colorspace_settings.name = 'sRGB'
mt = bpy.data.materials.new('TalasPainted'); mt.use_nodes = True
tex = mt.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Closest'
bsdf = mt.node_tree.nodes['Principled BSDF']; mt.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color']); mt.node_tree.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
em = mt.node_tree.nodes.new('ShaderNodeTexImage'); em.image = bpy.data.images.load(EMISSION); em.interpolation = 'Closest'
mt.node_tree.links.new(em.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = 4.0
bsdf.inputs['Roughness'].default_value = .9; mt.blend_method = 'CLIP' if hasattr(mt, 'blend_method') else None

def cid(name): return CELLS.index(name)
class Piece:
    def __init__(self, name): self.name = name; self.bm = bmesh.new(); self.layer = self.bm.faces.layers.int.new('cell')
    def face_cells(self, geom, cell):
        for f in geom:
            if isinstance(f, bmesh.types.BMFace): f[self.layer] = cid(cell)
    def box(self, cell, c, size, bevel=.04, rot=None, jitter=.012):
        g = bmesh.ops.create_cube(self.bm, size=1.0, matrix=Matrix.Translation(c) @ (rot.to_4x4() if rot else Matrix.Identity(4)) @ Matrix.Diagonal((*size, 1)))
        self.finish(g['verts'], cell, bevel, jitter)
    def cyl(self, cell, c, r0, r1, h, seg=10, bevel=.02, axis='Z', jitter=.01, cap=True):
        rot = {'Z': Matrix.Identity(4), 'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Y': Matrix.Rotation(math.pi / 2, 4, 'X')}[axis]
        g = bmesh.ops.create_cone(self.bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r0, radius2=r1, depth=h, matrix=Matrix.Translation(c) @ rot)
        self.finish(g['verts'], cell, bevel, jitter)
    def sphere(self, cell, c, r, sc=(1, 1, 1), seg=10, jitter=.02):
        g = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(5, seg // 2 + 1), radius=r, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*sc, 1)))
        self.finish(g['verts'], cell, 0, jitter)
    def cone(self, cell, c, r, h, seg=8, jitter=.01):
        g = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=seg, radius1=r, radius2=0, depth=h, matrix=Matrix.Translation(c)); self.finish(g['verts'], cell, 0, jitter)
    def finish(self, verts, cell, bevel, jitter):
        faces = {f for v in verts for f in v.link_faces if all(w in verts for w in f.verts)}
        for v in verts: v.co += Vector((random.uniform(-jitter, jitter), random.uniform(-jitter, jitter), random.uniform(-jitter, jitter)))
        self.face_cells(faces, cell)
        if bevel > 0:
            edges = list({e for f in faces for e in f.edges})
            r = bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=2, profile=.55, affect='EDGES')
            self.face_cells(r['faces'], cell)
    def build(self):
        bm = self.bm; bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bb = [v.co.copy() for v in bm.verts]; mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb))); sz = mx - mn
        sz = Vector((max(sz.x, .01), max(sz.y, .01), max(sz.z, .01))); uvl = bm.loops.layers.uv.new('UVMap')
        for f in bm.faces:
            f.smooth = True; n = f.normal; ax = max(range(3), key=lambda i: abs(n[i])); c = f[self.layer]; ox, oy = (c % 4) * .25, (c // 4) * .25
            for l in f.loops:
                p = (l.vert.co - mn); a, b = [(1, 2), (0, 2), (0, 1)][ax]
                u = min(max(p[a] / sz[a], 0), 1); v = min(max(p[b] / sz[b], 0), 1)
                l[uvl].uv = (ox + .012 + u * (.25 - .024), oy + .012 + v * (.25 - .024))
        me = bpy.data.meshes.new(self.name); bm.to_mesh(me); bm.free(); me.materials.append(mt)
        ob = bpy.data.objects.new(self.name, me); bpy.context.collection.objects.link(ob); return ob

PIECES = []
def piece(fn):
    p = Piece(fn.__name__); fn(p); PIECES.append(p); return fn

@piece
def SlabStone(p):
    p.box('stone_light', Vector((0, 0, .1)), (2, 2, .2), .05)
    p.box('stone_dark', Vector((0, 0, .26)), (1.5, 1.5, .1), .03)
    for s in (-1, 1): p.box('stone_light', Vector((s * .88, 0, .27)), (.14, 1.9, .14), .03); p.box('stone_light', Vector((0, s * .88, .27)), (1.9, .14, .14), .03)
@piece
def SlabStoneMoss(p):
    p.box('stone_light', Vector((0, 0, .1)), (2, 2, .2), .05)
    for i in range(6): p.sphere('moss', Vector((random.uniform(-.7, .7), random.uniform(-.7, .7), .21)), random.uniform(.25, .45), (1, 1, .22), 8, .03)
@piece
def StoneBlock(p): p.box('stone_light', Vector((0, 0, .5)), (1, 1, 1), .08, jitter=.03); p.sphere('moss', Vector((.1, 0, 1.0)), .3, (1.1, 1, .25), 8, .03)
@piece
def Pillar(p):
    p.box('stone_dark', Vector((0, 0, .15)), (1.1, 1.1, .3), .06); p.cyl('stone_light', Vector((0, 0, 1.6)), .42, .36, 2.6, 8, .03, jitter=.02); p.box('stone_dark', Vector((0, 0, 3.05)), (1, 1, .35), .06)
@piece
def Steps(p):
    for i in range(4): p.box('stone_light', Vector((0, i * .5, .15 + i * .15)), (2, .5, .3 + i * .3), .04)
@piece
def Barrel(p):
    p.cyl('wood_warm', Vector((0, 0, .55)), .5, .5, 1.1, 12, .03, jitter=.015)
    for z in (.3, .8): p.cyl('iron', Vector((0, 0, z)), .535, .535, .1, 12, .01, jitter=0)
    p.cyl('wood_warm', Vector((0, 0, 1.12)), .44, .44, .05, 12, .01, jitter=0)
    p.cyl('wood_warm', Vector((0, 0, 1.0)), .52, .44, .24, 12, .01, jitter=.01)
@piece
def Crate(p):
    p.box('wood_warm', Vector((0, 0, .5)), (1, 1, 1), .04)
    for sx in (-1, 1):
        for sy in (-1, 1): p.box('iron', Vector((sx * .47, sy * .47, .5)), (.1, .1, 1.04), .01, jitter=0)
@piece
def Brazier(p):
    p.box('stone_light', Vector((0, 0, .3)), (.9, .9, .6), .06); p.cyl('iron', Vector((0, 0, .8)), .55, .4, .4, 10, .02); p.cyl('iron', Vector((0, 0, 1.02)), .6, .6, .06, 10, .01)
    p.cone('flame', Vector((0, 0, 1.4)), .32, .75, 7, .02); p.cone('flame', Vector((.2, .1, 1.25)), .2, .5, 6, .02); p.cone('flame', Vector((-.2, -.1, 1.2)), .18, .42, 6, .02)
@piece
def TorchPost(p):
    p.cyl('wood_warm', Vector((0, 0, 1.1)), .08, .1, 2.2, 7, .01); p.cyl('iron', Vector((0, 0, 2.25)), .24, .16, .25, 8, .01); p.cone('flame', Vector((0, 0, 2.7)), .2, .6, 6, .01)
@piece
def PipeStraight(p):
    p.cyl('copper', Vector((0, 0, .5)), .5, .5, 3, 14, .02, axis='Y', jitter=.008)
    for y in (-1.45, 1.45): p.cyl('iron', Vector((0, y, .5)), .56, .56, .16, 14, .02, axis='Y', jitter=0)
@piece
def PipeElbow(p):
    p.cyl('copper', Vector((0, 0, .5)), .5, .5, 1.6, 14, .02, axis='Y', jitter=.008); p.cyl('copper', Vector((.55, .55, .5)), .5, .5, 1.6, 14, .02, axis='X', jitter=.008); p.sphere('copper', Vector((0, .55, .5)), .6, (1, 1, 1), 12, .008)
    p.cyl('iron', Vector((0, -.78, .5)), .56, .56, .16, 14, .02, axis='Y', jitter=0); p.cyl('iron', Vector((1.33, .55, .5)), .56, .56, .16, 14, .02, axis='X', jitter=0)
@piece
def LanternCage(p):
    p.box('stone_dark', Vector((0, 0, .15)), (1.2, 1.2, .3), .05); p.box('cage', Vector((0, 0, 1.35)), (.8, .8, 2.1), .03)
    p.box('stone_dark', Vector((0, 0, 2.55)), (1.0, 1.0, .25), .04); p.sphere('glow', Vector((0, 0, 1.35)), .3, (1, 1, 1.5), 10, 0)
@piece
def DockPlank(p):
    for i in range(6): p.box('plank_cool', Vector((0, -1.25 + i * .5, .05)), (3, .46, .1), .02, jitter=.01)
@piece
def MossPatch(p):
    for i in range(5): p.sphere('moss', Vector((random.uniform(-.5, .5), random.uniform(-.5, .5), .02)), random.uniform(.25, .5), (1, 1, .12), 8, .04)
@piece
def GrassClump(p):
    for k in range(3):
        a = k * math.pi / 3; bm = p.bm; v = [bm.verts.new(Vector((math.cos(a) * s * .6, math.sin(a) * s * .6, z))) for z, s in ((0, -1), (0, 1), (1.1, 1), (1.1, -1))]
        f = bm.faces.new(v); f[p.layer] = cid('grass')   # une face : le matériau Unity est à double face (Cull Off)
@piece
def BambooTree(p):
    for k, (x, y, lean) in enumerate([(0, 0, .05), (.5, .3, -.08), (-.4, .2, .1)]):
        h = 5.5 + k * .8
        for i in range(6): p.cyl('bark', Vector((x + lean * i * .5, y, .5 + i * h / 6)), .16 - i * .01, .15 - i * .01, h / 6 + .05, 7, .01, jitter=.01)
    for i in range(7): p.cone('leaf', Vector((random.uniform(-.8, .8), random.uniform(-.8, .8), 5.2 + random.uniform(0, 1.3))), random.uniform(.45, .8), random.uniform(.9, 1.5), 5, .05)
@piece
def MushroomTree(p):
    p.cyl('bark', Vector((0, 0, 1.6)), .3, .2, 3.2, 8, .02, jitter=.03); p.sphere('cap', Vector((0, 0, 3.35)), 1.7, (1, 1, .28), 12, .04); p.sphere('cap', Vector((.9, .2, 2.7)), .7, (1, 1, .3), 9, .04)
@piece
def Boulder(p): p.sphere('stone_dark', Vector((0, 0, .5)), .9, (1.2, 1, .7), 9, .12); p.sphere('moss', Vector((.1, 0, .98)), .4, (1.1, 1, .25), 8, .04)
@piece
def Rope(p):
    for i in range(7): p.sphere('rope', Vector((i * .22 - .66, 0, .12)), .13, (1.1, 1, 1), 6, .01)

# ---------------------------------------------------------------- 3. PLANCHE DE PIÈCES, FBX ------------------------------------------------------------------
objs = []
for i, p in enumerate(PIECES):
    ob = p.build(); ob.location = Vector(((i % 6) * 5.2, -(i // 6) * 6.5, 0)); objs.append(ob)
bpy.context.view_layer.update()
fbx = os.path.join(OUT, 'TalasPaintedKit.fbx')
for o in bpy.data.objects: o.select_set(o.type == 'MESH')
bpy.ops.export_scene.fbx(filepath=fbx, use_selection=True, object_types={'MESH'}, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', path_mode='COPY', embed_textures=False, mesh_smooth_type='FACE', add_leaf_bones=False)
print('FBX', fbx, len(objs), 'pièces')
open(os.path.join(OUT, 'TalasPaintedKit.json'), 'w').write('{"pieces":[' + ','.join('"%s"' % p.name for p in PIECES) + '],"cells":[' + ','.join('"%s"' % c for c in CELLS) + ']}')

# ---------------------------------------------------------------- 4. APERÇU : une petite scène composée avec le kit, lune bleue + braseros chauds -----------------------------------
if PREVIEW:
    by = {o.name: o for o in objs}
    def put(name, x, y, z=0, rz=0, s=1.0):
        o = by[name].copy(); o.data = by[name].data; o.location = Vector((x, y, z)); o.rotation_euler = (0, 0, math.radians(rz)); o.scale = (s, s, s); bpy.context.collection.objects.link(o); return o
    for o in objs: o.location = Vector((200, 200, 0))   # la planche de pièces sort du cadre
    for i in range(4):
        for j in range(3): put('SlabStoneMoss' if (i * 3 + j) % 4 == 1 else 'SlabStone', i * 2, j * 2 - 1, 0)
    for i in range(3): put('SlabStone', 10, i * 2 - 1, 0)
    put('Pillar', -1.4, 3.6); put('Pillar', 7.2, 3.6); put('Pillar', -1.4, -3.4)
    put('Brazier', -1.2, 1.9, .3); put('Brazier', 7.0, 1.9, .3); put('TorchPost', 3.2, -3.3, 0)
    for k, (x, y, r) in enumerate([(1.2, 2.9, 10), (2.3, 3.1, 40), (1.8, 2.2, 0)]): put('Barrel', x, y, 0 if k < 2 else 1.1, r)
    put('Crate', 5.4, 2.8, 0, 20); put('Crate', 5.6, 2.9, 1, 55, .8)
    put('PipeStraight', 4.2, -.4, 0, 90); put('PipeElbow', 6.2, -1.2, 0, 90)
    put('LanternCage', 10, 0, 0.0)
    put('Steps', 3.5, -5.0, 0, 0)
    put('MossPatch', 2.4, -.2, .22); put('MossPatch', 6.3, .8, .22, 40); put('Boulder', -3.2, 1, 0, 30, 1.2); put('Boulder', 11.6, 3.8, 0, 100)
    for gx, gy in [(-1.6, -.4), (8.2, -.8), (9.0, 2.6), (-2.3, 2.9)]: put('GrassClump', gx, gy, 0, gx * 30)
    put('BambooTree', 4, 6.5); put('BambooTree', 9, 7, 0, 90); put('MushroomTree', -4.5, 5.5)
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.location.x < 150]: pass
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'; sc.render.resolution_x = 1280; sc.render.resolution_y = 720
    try: sc.cycles.use_denoising = True
    except Exception: pass
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.025, .06, .12, 1); w.node_tree.nodes['Background'].inputs[1].default_value = .9; sc.world = w
    moon = bpy.data.lights.new('moon', 'SUN'); moon.energy = 2.6; moon.color = (.5, .72, 1); mo = bpy.data.objects.new('moon', moon); mo.rotation_euler = (math.radians(48), math.radians(8), math.radians(150)); bpy.context.collection.objects.link(mo)
    for (x, y, z, c, e) in [(-1.2, 1.9, 1.8, (1, .55, .2), 650), (7.0, 1.9, 1.8, (1, .55, .2), 650), (3.2, -3.3, 2.9, (1, .6, .25), 300), (10, 0, 1.4, (.2, 1, .85), 420)]:
        L = bpy.data.lights.new('p', 'POINT'); L.energy = e; L.color = c; L.shadow_soft_size = .25; lo = bpy.data.objects.new('p', L); lo.location = Vector((x, y, z)); bpy.context.collection.objects.link(lo)
    cam = bpy.data.cameras.new('c'); cam.lens = 34; co = bpy.data.objects.new('c', cam); co.location = Vector((4.5, -12.5, 9.5)); bpy.context.collection.objects.link(co)
    d = Vector((4.6, 1.2, .5)) - co.location; co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sc.camera = co
    sc.render.filepath = PREVIEW; bpy.ops.render.render(write_still=True); print('APERCU', PREVIEW)
