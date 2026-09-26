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

# sol blanc brillant (reflète piliers, poteaux et soucoupe)
floor = mat('#e9edf2', .12, .6)
add('cube', (0, 8, -.05), (60, 44, .1), floor)
for x in (-3.5, 3.5, -10.5, 10.5): pillar(x, 13)
for x in (0, -7, 7): post(x, 11)
# rebord du fond
add('cube', (0, 30.5, .15), (80, .6, .3), METAL)
# la soucoupe : disque bleu acier, bande nervurée, rangée d'ampoules, dôme
U = (0, 160, 6.0)
steel = mat('#5d7fb0', .3, .5); steel2 = mat('#2f4d80', .35, .5); bulb = mat('#ffffff', .2, emit=1.6)
s1 = add('sph', U, (150, 150, 16), steel, smooth=True, v=96)
add('cyl', (U[0], U[1], U[2] + 1.2), (104, 104, 7), steel2, v=128)
for k in range(160):
    a = k * math.pi / 80; add('cube', (U[0] + math.cos(a) * 52.2, U[1] + math.sin(a) * 52.2, U[2] + 1.2), (1.1, 1.1, 6.6), mat('#8fb0dc', .3, .5), rot=(0, 0, a))
for k in range(120):
    a = k * math.pi / 60; add('sph', (U[0] + math.cos(a) * 73, U[1] + math.sin(a) * 73, U[2] + 2.2), (1.9, 1.9, 1.9), bulb, smooth=True, v=16)
add('sph', (U[0], U[1], U[2] + 6), (84, 84, 34), mat('#c7d7ee', .15, .6), smooth=True, v=96)

sc.render.filepath = os.path.join(OUT, 'stage.jpg'); sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
bpy.ops.render.render(write_still=True)
print('ok')
