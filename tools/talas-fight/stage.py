"""Arène du combat (Village Talas), d'après la borne de référence : soucoupe bleu acier à ampoules,
piliers roses gravés de circuits avec un œil, chapiteaux mécaniques, poteaux chromés à boule,
sol blanc brillant qui reflète tout, ciel glacé. Rendu 480 x 240, caméra de face.
Lancer : python3 stage.py
"""
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'talas-doc'))
import bpy
from mathutils import Vector
from common import srgb, add, mat, noise_mat, coll
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'talas-fight'); os.makedirs(OUT, exist_ok=True)
TMP = '/tmp/talasfight'; os.makedirs(TMP, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
import common; common._mats.clear()
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 96; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
sc.render.resolution_x, sc.render.resolution_y = 480, 240
sc.view_settings.view_transform = 'Standard'
# ciel glacé en dégradé vertical
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; nt = w.node_tree
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(tc.outputs['Window'], sep.inputs[0]); nt.links.new(sep.outputs['Y'], ramp.inputs[0])
ramp.color_ramp.elements[0].color = (*srgb('#f4f8fc'), 1); ramp.color_ramp.elements[1].color = (*srgb('#8fb4dc'), 1)
ramp.color_ramp.elements[0].position = .35; ramp.color_ramp.elements[1].position = 1
bgn = nt.nodes['Background']; nt.links.new(ramp.outputs[0], bgn.inputs[0]); bgn.inputs[1].default_value = 1.0
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.0; sun.angle = math.radians(20)
so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(-25))
cam = bpy.data.cameras.new('cam'); cam.lens = 77.7; cam.sensor_width = 36
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, -14, 1.2); co.rotation_euler = (math.radians(90), 0, 0)

# --- texture du fût des piliers : cuivre rose, pistes de circuit rouges, un œil au centre ---
TW, TH = 1024, 512
im = Image.new('RGB', (TW, TH), (226, 150, 138)); d = ImageDraw.Draw(im)
for y in range(0, TH, 6): d.line([(0, y), (TW, y)], fill=(214, 136, 124), width=2)
import random; random.seed(3)
for k in range(150):
    x = random.randrange(0, TW); y = random.randrange(0, TH); pts = [(x, y)]
    for s in range(random.randint(3, 7)):
        if s % 2: y += random.choice((-1, 1)) * random.randint(20, 70)
        else: x += random.choice((-1, 1)) * random.randint(10, 50)
        pts.append((x, y))
    d.line(pts, fill=(196, 52, 48), width=3); d.ellipse([x - 5, y - 5, x + 5, y + 5], outline=(196, 52, 48), width=2)
for cx in (TW * .125, TW * .375, TW * .625, TW * .875):   # l'œil, deux fois autour du fût
    cy = TH * .75
    d.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=(226, 150, 138))
    d.ellipse([cx - 56, cy - 30, cx + 56, cy + 30], outline=(180, 30, 30), width=7)
    d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(180, 30, 30)); d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(250, 210, 200))
    for a in range(0, 360, 30):
        r = math.radians(a); d.line([(cx + math.cos(r) * 66, cy + math.sin(r) * 40), (cx + math.cos(r) * 100, cy + math.sin(r) * 70)], fill=(180, 30, 30), width=4)
im.save(os.path.join(TMP, 'circuit.png'))
circ = bpy.data.materials.new('circuit'); circ.use_nodes = True; n2 = circ.node_tree
tex = n2.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(os.path.join(TMP, 'circuit.png'))
bs = n2.nodes['Principled BSDF']; n2.links.new(tex.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = .35; bs.inputs['Metallic'].default_value = .25

METAL = mat('#9aa6b8', .3, .6); METAL2 = mat('#5e6878', .35, .6); CHROME = mat('#e8edf4', .05, 1.0)
for o in (METAL, METAL2, CHROME): o.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = .9

def pillar(x, y):
    add('cyl', (x, y, .3), (1.75, 1.75, .6), METAL2, v=48, bevel=.03)
    for k in range(16):   # grilles d'aération du socle
        a = k * math.pi / 8; add('cube', (x + math.cos(a) * .88, y + math.sin(a) * .88, .3), (.06, .34, .38), METAL, rot=(0, 0, a))
    add('cyl', (x, y, .66), (1.6, 1.6, .12), METAL, v=48, bevel=.02)
    add('cyl', (x, y, 1.72), (1.4, 1.4, 2.0), circ, v=64, smooth=True)
    add('cyl', (x, y, 2.78), (1.6, 1.6, .12), METAL, v=48, bevel=.02)
    add('cyl', (x, y, 3.02), (1.8, 1.8, .36), METAL2, v=48, bevel=.03)
    red = mat('#b4281e', .4); pale = mat('#fad2c8', .4)
    e = add('torus', (x, y - .71, 1.72), (.62, .3, .9), red, rot=(math.pi / 2, 0, 0))   # l'œil gravé, face à la caméra
    add('sph', (x, y - .68, 1.72), (.22, .08, .22), red, smooth=True, v=16); add('sph', (x, y - .72, 1.72), (.08, .03, .08), pale, smooth=True, v=12)
    for k in range(16):   # boulons du chapiteau
        a = k * math.pi / 8; add('sph', (x + math.cos(a) * .9, y + math.sin(a) * .9, 3.02), (.13, .13, .13), CHROME, smooth=True, v=12)
    add('cyl', (x, y, 3.28), (1.5, 1.5, .18), METAL, v=48, bevel=.03)
    for k in range(6):
        a = k * math.pi / 3; add('cube', (x + math.cos(a) * .55, y + math.sin(a) * .55, 3.42), (.22, .22, .12), METAL2, rot=(0, 0, a))
def post(x, y):
    add('cyl', (x, y, .06), (.7, .7, .12), CHROME, v=32, bevel=.02)
    for k in range(10): add('torus', (x, y, .35 + k * .17), (.34, .34, .6), CHROME)
    add('cyl', (x, y, 1.2), (.12, .12, 2.1), CHROME, v=16)
    add('sph', (x, y, 2.45), (.62, .62, .62), CHROME, smooth=True, v=32)

# sol de marbre blanc brillant (reflète piliers, lampadaires et baie vitrée)
floor = mat('#e9edf2', .12, .6)
add('cube', (0, 8, -.05), (60, 44, .1), floor)
for x in (-3.5, 3.5, -10.5, 10.5): pillar(x, 13)
for x in (-7, 7): post(x, 11)
# --- le bureau du PDG en haut de la tour : baie vitrée sur la ville, bandeau de spots, bureau, fauteuil, plantes ---
SW, SH = 2048, 512
sky = Image.new('RGB', (SW, SH)); d = ImageDraw.Draw(sky)
for y in range(SH):
    t = y / SH; d.line([(0, y), (SW, y)], fill=(int(150 + 90 * t), int(190 + 55 * t), int(232 + 18 * t)))
random.seed(7)
x = 0
while x < SW:   # silhouettes de la ville et des hangars, bleutées par la distance
    w_ = random.randint(40, 120); h_ = random.randint(60, 230); col = random.choice([(150, 172, 205), (138, 160, 196), (164, 184, 214)])
    d.rectangle([x, SH - h_, x + w_, SH], fill=col)
    for wy in range(SH - h_ + 8, SH - 6, 14):
        for wx in range(x + 6, x + w_ - 6, 12):
            if random.random() < .55: d.rectangle([wx, wy, wx + 5, wy + 6], fill=(214, 228, 244))
    x += w_ + random.randint(4, 20)
for hx in (300, 1400):   # hangars Airbus en voûte
    d.pieslice([hx, SH - 170, hx + 360, SH + 170], 180, 360, fill=(176, 194, 220)); d.rectangle([hx + 150, SH - 80, hx + 210, SH], fill=(130, 150, 186))
d.polygon([(1650, 120), (1780, 112), (1800, 104), (1812, 112), (1790, 120), (1720, 126)], fill=(240, 244, 250)); d.polygon([(1712, 116), (1740, 96), (1752, 96), (1735, 118)], fill=(240, 244, 250))
sky.save(os.path.join(TMP, 'city.png'))
cm = bpy.data.materials.new('city'); cm.use_nodes = True; nc = cm.node_tree; nc.nodes.clear()
o_ = nc.nodes.new('ShaderNodeOutputMaterial'); em = nc.nodes.new('ShaderNodeEmission'); tx = nc.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(os.path.join(TMP, 'city.png'))
nc.links.new(tx.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = 1.0; nc.links.new(em.outputs[0], o_.inputs[0])
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 80, 19)); city = bpy.context.active_object
city.scale = (170, 42, 1); city.rotation_euler = (math.pi / 2, 0, 0); city.data.materials.append(cm)
# baie vitrée : montants et traverses chromés, allège, puis plafond bleu nuit et son bandeau de spots
for k in range(-14, 15): add('cube', (k * 3.2, 34, 3.5), (.16, .16, 7), METAL)
for z_ in (.02, 3.3, 6.6): add('cube', (0, 34, z_), (100, .2, .16), METAL)
add('cube', (0, 34.2, .4), (100, .4, .8), mat('#d8dfe9', .3, .5))
add('cube', (0, 24, 7.2), (100, 24, .3), mat('#2f4d80', .4, .4))
add('cube', (0, 33.6, 6.4), (100, 1.2, 1.6), mat('#5d7fb0', .3, .5))
bulb = mat('#ffffff', .2, emit=1.6)
for k in range(-30, 31): add('sph', (k * 1.6, 33.0, 6.2), (.7, .7, .7), bulb, smooth=True, v=16)
add('cube', (0, 33.4, 5.1), (100, .3, .5), mat('#8fb0dc', .3, .5))
# le bureau du PDG, son fauteuil de cuir, sa plaque dorée, ses dossiers
wood = mat('#5a3418', .35, .5)
add('cube', (0, 26, .45), (5.0, 1.4, .9), wood, bevel=.04); add('cube', (0, 26, .93), (5.2, 1.6, .08), mat('#3b2412', .2, .7), bevel=.02)
add('cube', (0, 25.15, .7), (1.2, .05, .22), mat('#fcc419', .15, .9))
add('cube', (1.3, 26, 1.1), (.9, .6, .06), mat('#212529', .3)); add('cube', (1.3, 26.25, 1.35), (.9, .05, .55), mat('#74c0fc', .1, emit=.6))
for k in range(4): add('cube', (-1.6 + k * .12, 26, 1.02 + k * .05), (.7, .5, .05), mat(['#f8f9fa', '#ffe066', '#ff8787', '#a5d8ff'][k], .5))
add('cube', (0, 27.6, 1.5), (1.6, .5, 3.0), mat('#1c1c22', .25, .6), bevel=.15); add('cube', (0, 27.2, .6), (1.6, 1.2, .4), mat('#1c1c22', .25, .6), bevel=.1)
# grandes plantes et armoires
for x_ in (-5.2, 5.2):
    add('cyl', (x_, 20, .45), (1.4, 1.4, .9), mat('#f8f9fa', .3), v=24)
    for k in range(12):
        a = k * .52; lf = add('cone', (x_ + math.cos(a) * .4, 20 + math.sin(a) * .4, 1.6), (.5, .12, 2.2), mat('#2f9e44' if k % 2 else '#51cf66', .5), v=6); lf.rotation_euler = (math.cos(a) * .6, math.sin(a) * .6, a)
for x_ in (-15, -13.2, 13.2, 15):
    add('cube', (x_, 30, 1.2), (1.6, .9, 2.4), mat('#adb5bd', .35, .6), bevel=.03)
    for r in range(3): add('cube', (x_, 29.54, .5 + r * .75), (1.3, .02, .5), mat('#ced4da', .3, .6))
sc.render.filepath = os.path.join(OUT, 'stage.jpg'); sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
bpy.ops.render.render(write_still=True)
print('ok')
