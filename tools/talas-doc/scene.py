"""Construit le centre de doc dans Blender puis pré-calcule :
 - bg.jpg : sols, pelouse, murs et mobilier avec leurs ombres (le fond fixe) ;
 - occ.png + manifest : chaque mur, meuble, porte ou arbre qui peut passer DEVANT un personnage,
   rendu seul mais avec l'éclairage et les ombres de toute la scène, pour le tri de profondeur du canvas.
Lancer : python3 scene.py  (module bpy 4.2)
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'talas-doc')
TMP = '/tmp/talasdoc'; os.makedirs(TMP, exist_ok=True); os.makedirs(OUT, exist_ok=True)
FAST = '--fast' in sys.argv

sc, co = reset()
if FAST: sc.cycles.samples = 12
# --- plan identique au jeu ---
GI, GJ = 21, 9
M = [[0] * GJ for _ in range(GI)]
def fill(i0, i1, j0, j1, v):
    for i in range(i0, i1 + 1):
        for j in range(j0, j1 + 1): M[i][j] = v
fill(1, 18, 5, 6, 'C'); fill(16, 18, 1, 4, 'C'); fill(1, 3, 1, 4, 'A'); fill(4, 6, 1, 4, 'B'); fill(7, 9, 1, 4, 'D2'); fill(10, 12, 1, 4, 'E'); fill(13, 15, 1, 4, 'F'); fill(19, 20, 5, 5, 'P'); fill(19, 19, 6, 8, 'P')
DOORS = [(2, 4, 2, 5), (5, 4, 5, 5), (8, 4, 8, 5), (11, 4, 11, 5), (14, 4, 14, 5), (18, 5, 19, 5)]
inb = lambda i, j: 0 <= i < GI and 0 <= j < GJ
def is_door(a, b, c, d): return any((p, q, r, s) in ((a, b, c, d), (c, d, a, b)) for p, q, r, s in DOORS)

BG = coll('bg')          # sols, pelouse, haies : jamais devant un personnage
OCC = []                 # (nom, z, collection)
def occ(name, z):
    c = coll('occ_' + name); OCC.append((name, z, c)); return c

# --- sols ---
lawn = add('cube', (11, -4, -0.05), (46, 34, 0.1), noise_mat('#3f9c35', '#58b94c', scale=3, stripes=.35, name='lawn'), c=BG)
FLOOR = {'C': lambda i, j: mat('#8d86bf' if (i * 7 + j * 3) % 9 else '#8780b8', .6), 'A': lambda i, j: mat('#dde1e8' if (i + j) % 2 else '#9aa0ad', .35),
         'B': lambda i, j: noise_mat('#a8683a', '#c4844e', scale=6, name='wood'), 'D2': lambda i, j: mat('#f1f3f5' if (i + j) % 2 else '#bfe8d4', .3),
         'E': lambda i, j: noise_mat('#4f78bc', '#6a8fd0', scale=60, name='carpet'), 'F': lambda i, j: mat('#e0aaa2', .55), 'P': lambda i, j: mat('#c4c0b4' if (i + j) % 2 else '#b4b0a4', .8)}
for i in range(GI):
    for j in range(GJ):
        v = M[i][j]
        if v: add('cube', (i + .5, -j - .5, 0.005), (0.998, 0.998, 0.01), FLOOR[v](i, j), c=BG)

# --- murs : hauts au fond des salles, bas côté couloir ---
PAINT = {'A': '#72cfe6', 'B': '#8fdca2', 'D2': '#72cfe6', 'E': '#b9a8ee', 'F': '#f4f1ea', 'C': '#f4f1ea'}
T = 0.12
walls = []
for i in range(GI):
    for j in range(GJ):
        v = M[i][j]
        if not v or v == 'P': continue
        for di, dj, side in ((0, -1, 'back'), (-1, 0, 'back'), (0, 1, 'front'), (1, 0, 'front')):
            x, y = i + di, j + dj
            o = M[x][y] if inb(x, y) else 0
            if o == v or is_door(i, j, x, y): continue
            if side == 'front' and o and o != 'P': continue
            outer = (not o) or o == 'P'
            walls.append(dict(i=i, j=j, di=di, dj=dj, tall=side == 'back' and (v != 'C' or outer), outer=outer, v=v))
def edge(i, j, di, dj):
    """centre et orientation de l'arête (monde Blender)"""
    if dj: return (i + .5, -(j + (1 if dj > 0 else 0)), 'X')
    return (i + (1 if di > 0 else 0), -j - .5, 'Y')
win = 0
POSTS = {}
for w in walls:
    cx, cy, ax = edge(w['i'], w['j'], w['di'], w['dj'])
    h = 1.85 if w['tall'] else 0.5
    z = w['i'] + w['j'] + (w['di'] + w['dj']) * .5 + (-.01 if w['tall'] else .02)
    c = occ('w%d_%d_%d_%d' % (w['i'], w['j'], w['di'], w['dj']), z)
    L = 1
    # poteau d'angle aux deux extrémités (un seul par sommet, à la hauteur du mur le plus haut)
    for e in ((cx - .5, cy) if ax == 'X' else (cx, cy - .5), (cx + .5, cy) if ax == 'X' else (cx, cy + .5)):
        key = (round(e[0], 2), round(e[1], 2))
        if POSTS.get(key, (0,))[0] < h: POSTS[key] = (h, c, w['outer'] and not w['tall'])
    sz = lambda hh: (L, T, hh) if ax == 'X' else (T, L, hh)
    if w['outer'] and not w['tall']:
        add('cube', (cx, cy, h / 2), sz(h), tile_mat('#b5623a', '#a4552f', '#e8d8c8', ax, (4, 7), brick=True), c=c)
        add('cube', (cx, cy, h + .02), sz(.04), mat('#d9b89a'), c=c)
        continue
    paint = PAINT[w['v']]
    low = min(h, .95)
    add('cube', (cx, cy, low / 2), sz(low), tile_mat(paint, paint, '#9aa0b8', ax, (5, 8)), c=c)
    if h > low:
        add('cube', (cx, cy, low + (h - low) / 2), sz(h - low), tile_mat('#f6f5f0', '#ecebe6', '#b8b8c8', ax, (5, 8)), c=c)
        band = (L, T + .025, .07) if ax == 'X' else (T + .025, L, .07)
        add('cube', (cx, cy, low - .02), band, mat('#9a8fd0', .4), c=c)
    add('cube', (cx, cy, h + .015), sz(.03), mat('#fbfbff', .5), c=c)
    # fenêtre verte à cadre brun sur les murs du fond, une arête sur deux
    if w['tall'] and (w['outer'] or w['v'] == 'C') and (w['i'] * 3 + w['j']) % 2 == 0:
        side = -1 if w['dj'] else 1          # la face intérieure regarde vers la salle
        off = (0, -T / 2 * 1.2) if ax == 'X' else (T / 2 * 1.2, 0)
        fx, fy = cx + off[0], cy + off[1]
        fs = (0.62, 0.03, 0.62) if ax == 'X' else (0.03, 0.62, 0.62)
        gs = (0.52, 0.035, 0.52) if ax == 'X' else (0.035, 0.52, 0.52)
        add('cube', (fx, fy, 1.3), fs, mat('#8a5a2e', .5), c=c)
        add('cube', (fx, fy, 1.3), gs, mat('#4fb84a', .08, .8), c=c)
        add('cube', (fx, fy, 1.3), (0.035, .04, .52) if ax == 'X' else (.04, .035, .52), mat('#8a5a2e'), c=c)
        add('cube', (fx + (0 if ax == 'X' else .03), fy + (-.03 if ax == 'X' else 0), .98), (0.68, .08, .04) if ax == 'X' else (.08, .68, .04), mat('#6b4423'), c=c)

for (px, py), (h, c, brick) in POSTS.items():
    # un peu plus fin que les murs : caché dedans, il ne bouche que le coin (sinon auto-ombre noire)
    add('cube', (px, py, h / 2 - .002), (T - .01, T - .01, h - .004), mat('#b5623a') if brick else mat('#f6f5f0', .45), c=c)
    add('cube', (px, py, h + .012), (T - .01, T - .01, .03), mat('#d9b89a') if brick else mat('#fbfbff', .5), c=c)
# --- portes : cadre dans le fond, battant fermé / ouvert en sprites séparés ---
DOORM = mat('#9a6236', .45); FRAME = mat('#6b4423', .5); GLASS = mat('#cfe8ff', .1, .8)
door_leaves = []
for k, (a, b, c2, d) in enumerate(DOORS):
    di, dj = c2 - a, d - b
    cx, cy, ax = edge(a, b, di, dj)
    z = a + b + .52
    fc = occ('dframe%d' % k, z - .005)
    for s in (-.44, .44):
        p = (cx + s, cy) if ax == 'X' else (cx, cy + s)
        add('cube', (*p, .8), (.08, .16, 1.6) if ax == 'X' else (.16, .08, 1.6), FRAME, c=fc)
    add('cube', (cx, cy, 1.62), (.96, .16, .08) if ax == 'X' else (.16, .96, .08), FRAME, c=fc)
    for state in ('closed', 'open'):
        c = occ('door%d_%s' % (k, state), z)
        hinge = (cx - .4, cy) if ax == 'X' else (cx, cy + .4)
        pv = empty('hinge%d%s' % (k, state), (*hinge, 0), c=c)
        ang = 0 if state == 'closed' else (-math.pi / 2 if ax == 'X' else math.pi / 2)
        pv.rotation_euler = (0, 0, ang)
        lx = .38
        leaf = add('cube', (lx, 0, .76) if ax == 'X' else (0, -lx, .76), (.76, .05, 1.52) if ax == 'X' else (.05, .76, 1.52), DOORM, c=c, bevel=.01, parent=pv)
        add('cube', (lx, 0, 1.12) if ax == 'X' else (0, -lx, 1.12), (.3, .055, .34) if ax == 'X' else (.055, .3, .34), GLASS, c=c, parent=pv)
        add('sph', (lx + .3, .04, .78) if ax == 'X' else (.04, -lx - .3, .78), (.05, .05, .05), mat('#fcc419', .2, .9), c=c, parent=pv, smooth=True)
        door_leaves.append(c)

# --- mobilier ---
def book_row(c, x0, y0, along, n, z, cols, depth=.22):
    for k in range(n):
        h = .22 + (k * 37 % 7) / 60
        p = (x0 + along * k * .1, y0, z + h / 2) if abs(along) else (x0, y0, z + h / 2)
        add('cube', p, (.08, depth, h), mat(cols[k % len(cols)], .5), c=c)
def shelf(name, x, y, cols):
    c = occ(name, x + (-y))
    add('cube', (x, y, .95), (.9, .3, 1.9), mat('#8a5a2e', .6), c=c, bevel=.01)
    add('cube', (x, y - .02, .95), (.82, .28, 1.82), mat('#3b2412', .8), c=c)
    for r in range(4):
        add('cube', (x, y - .02, .1 + r * .45), (.84, .28, .03), mat('#8a5a2e'), c=c)
        book_row(c, x - .36, y - .04, 1, 8, .12 + r * .45, cols)
def plant(name, x, y):
    c = occ(name, x - y)
    add('cone', (x, y, .2), (.34, .34, .4), mat('#f8f9fa', .35), c=c, r2=.7, smooth=True, v=20)
    add('cyl', (x, y, .4), (.3, .3, .02), mat('#4a2c12', .9), c=c)
    for k in range(9):
        a = k * 2.4; L = .45 + (k % 3) * .1
        o = add('cone', (x + math.cos(a) * .18, y + math.sin(a) * .18, .62), (.12, .03, L), mat('#2f9e44' if k % 2 else '#51cf66', .5), c=c, v=6)
        o.rotation_euler = (math.cos(a + 1.57) * .9, math.sin(a + 1.57) * .9 * -1, a)
def bench(name, x, y):
    c = occ(name, x - y)
    for dx in (-.4, .4):
        for dy in (-.12, .12): add('cyl', (x + dx, y + dy, .2), (.03, .03, .4), mat('#ced4da', .2, .9), c=c, v=8)
    for k in range(3): add('cube', (x, y + .12 - k * .1, .42), (1.0, .08, .04), mat('#40c057', .4), c=c, bevel=.01)
    for dx in (-.4, .4): add('cyl', (x + dx, y + .2, .6), (.025, .025, .4), mat('#ced4da', .2, .9), c=c, v=8)
    for k in range(2): add('cube', (x, y + .2, .62 + k * .12), (1.0, .04, .08), mat('#40c057', .4), c=c, bevel=.01)
def cabinet(name, x, y):
    c = occ(name, x - y)
    add('cube', (x, y, .8), (.7, .5, 1.6), mat('#8e959e', .35, .6), c=c, bevel=.01)
    for r in range(4):
        add('cube', (x, y - .255, .2 + r * .4), (.6, .01, .34), mat('#a4abb4', .3, .6), c=c)
        add('cube', (x, y - .265, .3 + r * .4), (.16, .02, .04), mat('#dee2e6', .2, .9), c=c)
    web = add('cone', (x + .3, y - .2, 1.62), (.3, .3, .02), mat('#f1f3f5', .9), c=c, v=8)

# Légifrance : photocopieuse et Code du travail
c = occ('copier', 1.6 + 1.7)
add('cube', (1.6, -1.7, .45), (.9, .75, .9), mat('#c9ced6', .4), c=c, bevel=.02)
add('cube', (1.6, -1.7, .93), (.92, .77, .06), mat('#e9ecef', .3), c=c, bevel=.01)
add('cube', (1.15, -1.7, .7), (.12, .5, .04), mat('#f8f9fa', .5), c=c)
add('cube', (1.95, -2.05, .8), (.18, .03, .1), mat('#212529', .3), c=c)
add('cube', (1.95, -2.07, .82), (.05, .02, .03), mat('#51cf66', .2, emit=2), c=c)
shelf('lawshelf', 3.05, -1.3, ['#c92a2a', '#a51111', '#e03131', '#f8f9fa'])
# INRS : brochures et table de lecture
shelf('inrs1', 4.5, -1.3, ['#ff922b', '#fab005', '#1c7ed6', '#2f9e44', '#f8f9fa'])
shelf('inrs2', 5.55, -1.3, ['#fab005', '#e8590c', '#74c0fc', '#f8f9fa'])
c = occ('readtable', 6.1 + 3.2)
add('cube', (6.1, -3.2, .7), (.8, .6, .05), mat('#d9a066', .5), c=c, bevel=.01)
for dx in (-.34, .34):
    for dy in (-.24, .24): add('cube', (6.1 + dx, -3.2 + dy, .35), (.05, .05, .7), mat('#8a5a2e'), c=c)
add('cube', (5.95, -3.15, .74), (.22, .3, .02), mat('#ff922b'), c=c); add('cube', (6.25, -3.3, .74), (.22, .3, .02), mat('#f8f9fa'), c=c)
# FDS : paillasse, fioles, armoire des produits dangereux
c = occ('labbench', 7.8 + 1.6)
add('cube', (7.8, -1.6, .45), (1.4, .6, .9), mat('#f1f3f5', .3), c=c, bevel=.01)
add('cube', (7.8, -1.6, .92), (1.44, .64, .05), mat('#2b2f36', .2, .7), c=c)
for k, col in enumerate(['#40c057', '#fab005', '#e03131', '#4dabf7']):
    add('cone', (7.3 + k * .3, -1.6, 1.05), (.14, .14, .22), mat(col, .05, .9), c=c, r2=.25, smooth=True, v=16)
    add('cyl', (7.3 + k * .3, -1.6, 1.2), (.05, .05, .1), mat('#e9ecef', .05, .9), c=c, v=10)
c = occ('hazcab', 9.4 + 1.6)
add('cube', (9.4, -1.6, .85), (.55, .75, 1.7), mat('#fcc419', .35), c=c, bevel=.015)
for k in (-.18, .18):
    d = add('cube', (9.4 - .28, -1.6 + k, 1.2), (.02, .22, .22), mat('#f8f9fa'), c=c); d.rotation_euler = (math.pi / 4, 0, 0)
# ISO 45001 : la norme sur son piédestal, cordons, caisse
c = occ('pedestal', 11.2 + 2.1)
add('cyl', (11.2, -2.1, .5), (.5, .5, 1.0), mat('#f1f3f5', .25), c=c, v=24)
add('cube', (11.2, -2.1, 1.06), (.36, .26, .08), mat('#1c7ed6', .3), c=c, bevel=.01)
for x in (10.5, 11.9):
    c = occ('stanchion%d' % int(x * 10), x + 3.0)
    add('cyl', (x, -3.0, .45), (.06, .06, .9), mat('#fcc419', .15, .9), c=c, v=12)
    add('cyl', (x, -3.0, .02), (.3, .3, .04), mat('#fcc419', .15, .9), c=c, v=16)
c = occ('rope', 11.2 + 3.0 + .01)
add('cyl', (11.2, -3.0, .72), (.05, .05, 1.35), mat('#c92a2a', .6), c=c, rot=(0, math.pi / 2, 0), v=8)
c = occ('till', 10.4 + 1.4)
add('cube', (10.4, -1.4, .4), (.5, .4, .8), mat('#495057', .4), c=c, bevel=.01)
add('cube', (10.4, -1.45, .9), (.36, .26, .2), mat('#343a40', .3), c=c, bevel=.01)
add('cube', (10.4, -1.6, .96), (.26, .02, .08), mat('#8ce99a', .2, emit=1.5), c=c)
# Archives : classeurs
for k, x in enumerate((13.4, 14.3, 15.2)): cabinet('cab%d' % k, x, -1.4)
# Accueil : comptoir, distributeur, palmier, télé
c = occ('desk', 17 + 3.35)
add('cube', (17, -3.35, .55), (1.5, .45, 1.1), mat('#e03131', .35), c=c, bevel=.02)
add('cube', (17, -3.35, 1.12), (1.56, .5, .05), mat('#f8f9fa', .3), c=c, bevel=.01)
add('cube', (17, -3.6, .75), (.9, .02, .2), mat('#f8f9fa', .4), c=c)
add('sph', (17.5, -3.35, 1.17), (.1, .1, .07), mat('#fcc419', .2, .9), c=c, smooth=True)
c = occ('drinks', 18.5 + 1.3)
add('cube', (18.5, -1.3, .9), (.6, .55, 1.8), mat('#1c7ed6', .3), c=c, bevel=.02)
add('cube', (18.5 - .31, -1.3, 1.1), (.02, .4, .8), mat('#e7f5ff', .2, emit=.6), c=c)
for k, col in enumerate(['#ffd43b', '#40c057', '#fa5252']): add('cube', (18.5 - .33, -1.3, .85 + k * .22), (.02, .3, .12), mat(col, .3), c=c)
plant('plant_rec', 16.4, -1.4)
c = occ('tv', 18.5 + 4.3)
for k in range(3): add('cyl', (18.5 + math.cos(k * 2.1) * .2, -4.3 + math.sin(k * 2.1) * .2, .35), (.03, .03, .7), mat('#343a40', .3), c=c, v=6)
add('cube', (18.5, -4.3, .95), (.5, .45, .42), mat('#2b2f36', .3), c=c, bevel=.03)
add('cube', (18.5 - .26, -4.3, .97), (.02, .34, .3), mat('#74c0fc', .1, emit=.8), c=c)
# couloir
for x in (15.5, 13.5, 12.5, 9.5): bench('bench%d' % int(x * 10), x, -5.35)   # contre le mur des salles, assis face au couloir
for k, (x, y) in enumerate(((17.8, 6.5), (11, 6.6), (6.5, 6.6), (2.5, 6.6), (1.4, 5.3))): plant('plant%d' % k, x, -y)
for k, x in enumerate((7.6, 3.6)):
    c = occ('ext%d' % k, x + 6.8)
    add('cyl', (x, -6.8, .35), (.16, .16, .6), mat('#e03131', .25), c=c, smooth=True, v=16); add('cyl', (x, -6.8, .72), (.06, .06, .12), mat('#212529'), c=c, v=8)
# dehors : haies, arbres, parterre
for k in range(19):
    add('cube', (k + 1.5, -.3, .35), (1.0, .45, .7), noise_mat('#2b7a33', '#4cb050', scale=12, name='hedge'), c=BG, bevel=.12)
for k in range(5):
    add('cube', (.3, -(k + 1.5), .35), (.45, 1.0, .7), noise_mat('#2b7a33', '#4cb050', scale=12, name='hedge'), c=BG, bevel=.12)
def tree(name, x, y):
    c = occ(name, x - y)
    add('cyl', (x, y, .8), (.22, .22, 1.6), noise_mat('#5a3418', '#8a5a2e', scale=20, name='bark'), c=c, v=12)
    for dx, dy, dz, r in ((0, 0, 2.1, 1.3), (-.5, .2, 1.8, .9), (.5, -.2, 1.85, .9), (.1, .1, 2.6, .8)):
        add('sph', (x + dx, y + dy, dz), (r, r, r * .9), noise_mat('#246b2c', '#4cb050', scale=8, name='leaf'), c=c, smooth=True, v=16)
for k, (x, y) in enumerate(((-1.5, 2), (21, 1), (-1, 8), (22, 6.5))): tree('tree%d' % k, x, -y)
for k in range(12):
    add('sph', (20.3 + (k % 2) * .4, -(6 + k * .25), .06), (.12, .12, .1), mat(['#ff6b6b', '#ffd43b', '#f783ac', '#ffffff'][k % 4]), c=BG, smooth=True, v=8)

# échelle appliquée : les textures procédurales (carrelage, briques, bois) se mesurent alors en mètres
for ob in bpy.data.objects: ob.select_set(ob.type == 'MESH')
bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
# --- rendu du fond ---
PX = lambda i, j: ((i - j) * 16 * S, (i + j) * 8 * S)
x0 = PX(-3, GJ + 3)[0]; x1 = PX(GI + 3, -3)[0]; y0 = PX(-3, -3)[1] - 170; y1 = PX(GI + 3, GJ + 3)[1]
BW, BH = int(x1 - x0), int(y1 - y0); BX, BY = -x0, -y0
place_camera(sc, co, BW, BH, BX, BY)
for c in door_leaves: bpy.context.view_layer.layer_collection.children[c.name].exclude = True
sc.render.film_transparent = False
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.quality = 88
sc.render.filepath = os.path.join(OUT, 'bg.jpg')
if '--no-bg' not in sys.argv: bpy.ops.render.render(write_still=True)
for c in door_leaves: bpy.context.view_layer.layer_collection.children[c.name].exclude = False

# --- rendu de chaque élément de premier plan, découpé, le reste de la scène restant « indirect » (ombres et reflets gardés) ---
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.use_border = True; sc.render.use_crop_to_border = True
LC = bpy.context.view_layer.layer_collection
allc = [BG] + [c for _, _, c in OCC]
sprites = []
for name, z, c in OCC:
    for o in allc:
        lc = LC.children[o.name]; lc.exclude = False; lc.indirect_only = (o is not c)
    # les autres battants de porte ne doivent ni se voir ni projeter d'ombre
    for d in door_leaves:
        if d is not c: LC.children[d.name].exclude = True
    bpy.context.view_layer.update()
    pts = []
    for ob in c.all_objects:
        if ob.type != 'MESH': continue
        for corner in ob.bound_box: pts.append(proj(sc, co, ob.matrix_world @ Vector(corner)))
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    a0 = max(0, int(min(xs)) - 3); a1 = min(BW, int(max(xs)) + 4); b0 = max(0, int(min(ys)) - 3); b1 = min(BH, int(max(ys)) + 4)
    sc.render.border_min_x = (a0 + .01) / BW; sc.render.border_max_x = (a1 + .01) / BW
    sc.render.border_min_y = (BH - b1 + .01) / BH; sc.render.border_max_y = (BH - b0 + .01) / BH
    f = os.path.join(TMP, name + '.png'); sc.render.filepath = f
    bpy.ops.render.render(write_still=True)
    im = Image.open(f); bb = im.getbbox()
    if not bb: continue
    im = im.crop(bb); im.save(f)
    sprites.append(dict(n=name, z=round(z, 3), x=a0 + bb[0] - BX, y=b0 + bb[1] - BY, f=f))
    print('sprite', name, im.size, flush=True)
for d in door_leaves: LC.children[d.name].exclude = False

# --- atlas ---
sprites.sort(key=lambda s: -Image.open(s['f']).size[1])
AW = 2048; cx = cy = rowh = 0; places = []
for s in sprites:
    im = Image.open(s['f']); w, h = im.size
    if cx + w > AW: cx = 0; cy += rowh + 1; rowh = 0
    places.append((s, im, cx, cy)); cx += w + 1; rowh = max(rowh, h)
atlas = Image.new('RGBA', (AW, cy + rowh + 1))
man = dict(S=S, BX=BX, BY=BY, BW=BW, BH=BH, occ=[])
for s, im, ax, ay in places:
    atlas.paste(im, (ax, ay))
    man['occ'].append(dict(n=s['n'], z=s['z'], x=round(s['x']), y=round(s['y']), u=ax, v=ay, w=im.size[0], h=im.size[1]))
atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(OUT, 'occ.png'), optimize=True)
json.dump(man, open(os.path.join(OUT, 'scene.json'), 'w'), separators=(',', ':'))
print('ok', len(sprites), 'sprites, atlas', atlas.size, 'fond', BW, BH)
