"""Modélise et anime les personnages du centre de doc dans Blender, puis rend leurs planches de sprites.
Chaque personnage : marche de face (8 images) et de dos (8), repos de face et de dos, assis, vomi (2),
regarde sa montre, travaille (4), passe la serpillière (4). Ombre douce captée au sol (shadow catcher).
Lancer : python3 chars.py
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'talas-doc')
TMP = '/tmp/talaschars'; os.makedirs(TMP, exist_ok=True)
CW, CH, AX, AY = 84, 128, 36, 118
FRAMES = ['wf%d' % k for k in range(8)] + ['wb%d' % k for k in range(8)] + ['if', 'ib', 'sit', 'pk0', 'pk1', 'wat'] + ['wk%d' % k for k in range(4)] + ['mp%d' % k for k in range(4)]

CHARS = [
 # visiteurs grotesques
 dict(n='bloat', coat='#7f5fb8', pants='#3c4a8c', skin='#ffb3c1', hair=None, ail='bloat'),
 dict(n='tongue', coat='#3fae8e', pants='#4a4f58', skin='#f1c27d', hair=('short', '#6b3e1c'), glasses=1, ail='tongue'),
 dict(n='hairy', coat='#8a5a2e', pants='#2b2f36', skin='#e0ac69', hair=('curly', '#3b2412'), ail='hairy'),
 dict(n='invisible', coat='#8a8f99', pants='#4a4f58', skin='#f1c27d', hair=None, glasses=1, tie='#c92a2a', ail='invisible'),
 dict(n='bald', coat='#d9773a', pants='#5c3a1e', skin='#f5c6a5', hair=('sides', '#c9cdd2'), fat=1, ail='bald'),
 dict(n='lady', coat='#e46f9a', pants='#35684a', skin='#ffd8b1', hair=('long', '#e8b84a'), skirt=1),
 dict(n='tie', coat='#5d7fd0', pants='#2b2f36', skin='#c68642', hair=('flat', '#2b2320'), tie='#e03131', shirt='#f1f3f5'),
 dict(n='granny', coat='#2f8f8a', pants='#6a4c93', skin='#f1c27d', hair=('bun', '#dee2e6'), glasses=1, short=1, skirt=1),
 # personnel
 dict(n='juriste', coat='#2b2f36', pants='#2b2f36', skin='#ffd8b1', hair=None, hat='wig', long=1, shirt='#f8f9fa'),
 dict(n='inrs', coat='#f4f5f7', pants='#4a4f58', skin='#c68642', hair=('short', '#2b2320'), glasses=1, long=1, tie='#1c7ed6'),
 dict(n='labo', coat='#e9f5ea', pants='#4a4f58', skin='#f1c27d', hair=('short', '#6b3e1c'), hat='mask', long=1),
 dict(n='vigile', coat='#2b3a67', pants='#2b3a67', skin='#8d5524', hair=None, hat='guard', tie='#1c2150'),
 dict(n='archiviste', coat='#c2b59b', pants='#5c5444', skin='#ffd8b1', hair=('sides', '#dee2e6'), glasses=1, long=1),
 dict(n='accueil', coat='#f8f9fa', pants='#f8f9fa', skin='#8d5524', hair=('bun', '#2b2320'), hat='nurse', skirt=1),
 dict(n='agent', coat='#2f6fc4', pants='#2f6fc4', skin='#c68642', hair=('short', '#2b2320'), hat='cap', shirt='#f8f9fa'),
]

def build(ch):
    sc, co = reset(); sc.cycles.samples = 40
    place_camera(sc, co, CW, CH, AX, AY)
    catcher = None
    sc.render.film_transparent = True
    k = 0.93 if ch.get('short') else 1.0
    fat = 1.28 if ch.get('fat') else 1.0
    skin = mat(ch['skin'], .45, .35) if ch.get('ail') != 'hairy' else noise_mat('#5a3a1e', '#8a5a2e', scale=30, name='fur')
    face_skin = mat(ch['skin'], .45, .35) if ch.get('ail') != 'bald' else mat(ch['skin'], .15, .9)
    coat = mat(ch['coat'], .6, .25); pants = mat(ch['pants'], .7, .2); shoe = mat('#2b2320', .3, .6)
    inv = ch.get('ail') == 'invisible'
    R = {}
    root = empty('root', (0, 0, 0)); R['root'] = root
    hips = empty('hips', (0, 0, .88 * k), root); R['hips'] = hips
    add('cube', (0, 0, 0), (.28, .42 * fat, .24), pants, bevel=.08, parent=hips)
    for side, s in (('L', 1), ('R', -1)):
        leg = empty('leg' + side, (0, .1 * s * fat, -.02), hips); R['leg' + side] = leg
        add('cyl', (0, 0, -.22 * k), (.21 * fat, .21 * fat, .46 * k), pants, parent=leg, smooth=True, v=16)
        add('sph', (0, 0, -.44 * k), (.19, .19, .19), pants, parent=leg, smooth=True, v=12)
        knee = empty('knee' + side, (0, 0, -.44 * k), leg); R['knee' + side] = knee
        add('cyl', (0, 0, -.2 * k), (.17, .17, .42 * k), pants, parent=knee, smooth=True, v=16)
        add('cube', (.06, 0, -.42 * k), (.3, .15, .11), shoe, bevel=.045, parent=knee, smooth=True)
    torso = empty('torso', (0, 0, .06), hips); R['torso'] = torso
    add('cube', (0, 0, .27 * k), (.32 * fat, .5 * fat, .56 * k), coat, bevel=.13, parent=torso, smooth=True)
    for s in (1, -1): add('sph', (0, .25 * s * fat, .47 * k), (.2, .2, .2), coat, parent=torso, smooth=True, v=14)
    if fat > 1: add('sph', (.1, 0, .12), (.36, .5, .42), coat, parent=torso, smooth=True)
    if ch.get('long') or ch.get('skirt'):
        ln = .62 if ch.get('long') else .4
        add('cone', (0, 0, .06 - ln / 2), (.46 * fat, .6 * fat, ln), coat, parent=torso, smooth=True, r2=.62, v=24)
    add('cube', (.13 * fat, 0, .44 * k), (.02, .14, .14), mat(ch.get('shirt', '#f1f3f5'), .5), parent=torso, rot=(0, 0, 0))
    if ch.get('tie'): add('cube', (.14 * fat, 0, .3 * k), (.02, .05, .3), mat(ch['tie'], .4), parent=torso)
    if not inv: add('cyl', (0, 0, .58 * k), (.1, .1, .1), skin, parent=torso, smooth=True, v=12)
    for side, s in (('L', 1), ('R', -1)):
        arm = empty('arm' + side, (0, .29 * s * fat, .47 * k), torso); R['arm' + side] = arm
        add('cyl', (0, 0, -.15 * k), (.15, .15, .32 * k), coat, parent=arm, smooth=True, v=14)
        add('sph', (0, 0, -.3 * k), (.14, .14, .14), coat, parent=arm, smooth=True, v=12)
        el = empty('elb' + side, (0, 0, -.3 * k), arm); R['elb' + side] = el
        add('cyl', (0, 0, -.13 * k), (.13, .13, .28 * k), coat, parent=el, smooth=True, v=14)
        if not inv: add('sph', (0, 0, -.31 * k), (.13, .11, .15), skin, parent=el, smooth=True, v=12)
    head = empty('head', (0, 0, .66 * k), torso); R['head'] = head
    hs = 1.75 if ch.get('ail') == 'bloat' else 1.0
    if not inv:
        add('sph', (0, 0, .13 * hs), (.27 * hs, .25 * hs, .29 * hs), face_skin, parent=head, smooth=True, v=24)
        for s in (1, -1): add('sph', (-.01, .125 * hs * s, .12 * hs), (.05, .03, .08), face_skin, parent=head, smooth=True, v=10)
        add('sph', (.13 * hs, 0, .1 * hs), (.07, .06, .07), mat(ch['skin'], .3, .5), parent=head, smooth=True, v=12)
        for s in (1, -1):
            add('sph', (.11 * hs, .048 * hs * s, .16 * hs), (.05, .045, .05), mat('#ffffff', .2), parent=head, smooth=True, v=10)
            add('sph', (.135 * hs, .048 * hs * s, .16 * hs), (.024, .024, .03), mat('#1a1030', .2), parent=head, smooth=True, v=8)
            add('cube', (.12 * hs, .05 * hs * s, .205 * hs), (.02, .07, .015), mat(ch['hair'][1] if ch.get('hair') else '#6b6b6b'), parent=head)
        add('cube', (.125 * hs, 0, .05 * hs), (.02, .08, .018), mat('#5c1a1a'), parent=head)
        if ch.get('ail') == 'tongue':
            t = add('cube', (.15, 0, -.08), (.03, .07, .28), mat('#e8506a', .25, .6), parent=head, bevel=.012, smooth=True); t.rotation_euler = (0, -.15, 0)
        if ch.get('ail') == 'bloat':
            for kk in range(3): add('cyl', (.02 + kk * .06, .1 - kk * .1, .3), (.01, .01, .16), mat('#c2255c', .4), parent=head, rot=(.6, .3, 0), v=6)
    hair = ch.get('hair')
    if hair:
        st, hc = hair; hm = mat(hc, .55, .3)
        if st in ('short', 'curly', 'long', 'bun'):
            add('sph', (-.015, 0, .19), (.29, .27, .2), hm, parent=head, smooth=True, v=20)
            add('sph', (-.05, 0, .12), (.22, .26, .2), hm, parent=head, smooth=True, v=16)
        if st == 'curly':
            for kk in range(8): add('sph', (-.06 + (kk % 3) * .06, -.1 + (kk % 4) * .065, .27), (.09, .09, .09), hm, parent=head, smooth=True, v=10)
        if st == 'flat': add('cube', (-.01, 0, .28), (.24, .25, .08), hm, parent=head, bevel=.02)
        if st == 'sides':
            for s in (1, -1): add('sph', (-.03, .12 * s, .14), (.12, .06, .12), hm, parent=head, smooth=True, v=12)
        if st == 'long': add('cube', (-.08, 0, -.02), (.12, .28, .36), hm, parent=head, bevel=.05, smooth=True)
        if st == 'bun': add('sph', (-.13, 0, .24), (.14, .14, .14), hm, parent=head, smooth=True, v=12)
    if ch.get('glasses'):
        gm = mat('#1a1030', .3, .6)
        for s in (1, -1):
            g = add('torus', (.14 * hs, .05 * hs * s, .16 * hs), (.06, .06, .06), gm, parent=head, rot=(0, math.pi / 2, 0))
        add('cube', (.145 * hs, 0, .165 * hs), (.01, .04, .01), gm, parent=head)
    hat = ch.get('hat')
    if hat == 'wig':
        wm = mat('#f8f9fa', .7, .2)
        for kk in range(7): add('sph', (-.04 + (kk % 2) * .04, (kk - 3) * .045, .27 - abs(kk - 3) * .015), (.1, .1, .1), wm, parent=head, smooth=True, v=10)
        for s in (1, -1):
            for kk in range(3): add('sph', (-.03, .14 * s, .12 - kk * .07), (.09, .09, .09), wm, parent=head, smooth=True, v=10)
    if hat == 'nurse':
        add('cube', (0, 0, .3), (.16, .22, .07), mat('#ffffff', .5), parent=head, bevel=.01)
        add('cube', (.08, 0, .3), (.01, .06, .05), mat('#e03131'), parent=head)
    if hat in ('guard', 'cap'):
        cm = mat('#1c3f8a' if hat == 'guard' else '#1c7ed6', .5)
        add('cyl', (0, 0, .28), (.29, .28, .1), cm, parent=head, smooth=True, v=20)
        add('cube', (.14, 0, .24), (.14, .22, .02), mat('#111111' if hat == 'guard' else '#1864ab', .4), parent=head, bevel=.01)
        if hat == 'guard': add('cube', (.14, 0, .29), (.02, .05, .04), mat('#fcc419', .2, .9), parent=head)
    if hat == 'mask':
        add('sph', (.12, 0, .08), (.13, .19, .15), mat('#495057', .4), parent=head, smooth=True)
        add('cyl', (.2, 0, .04), (.1, .1, .08), mat('#868e96', .4), parent=head, rot=(0, math.pi / 2, 0), smooth=True)
        for s in (1, -1): add('cyl', (.13, .05 * s, .17), (.07, .07, .03), mat('#74c0fc', .05, .9), parent=head, rot=(0, math.pi / 2, 0))
    if ch.get('ail') == 'hairy':
        fm = mat('#6b4a2a', .8)
        for kk in range(14):
            a = kk * 2.4
            add('cone', (.1 * math.cos(a), .2 * math.sin(a), .1 + (kk % 5) * .1), (.05, .05, .1), fm, parent=torso, rot=(math.cos(a) * 1.2, math.sin(a) * 1.2, 0), v=5)
    if inv and ch.get('glasses'):
        pass
    # ombrage lisse partout
    for ob in bpy.data.objects:
        if ob.type == 'MESH':
            md = ob.modifiers.new('sub', 'SUBSURF'); md.levels = 1; md.render_levels = 1
    return sc, co, R

def pose(R, fr, k=1.0):
    """règle les articulations pour une image de l'animation"""
    for n, o in R.items():
        if n != 'root': o.rotation_euler = (0, 0, 0)
    R['root'].rotation_euler = (0, 0, 0 if fr in ('if', 'sit', 'pk0', 'pk1', 'wat') or fr.startswith(('wf', 'wk', 'mp')) else math.pi)
    R['hips'].location.z = .88 * k
    R['torso'].rotation_euler = (0, .05, 0)
    for s in 'LR':
        R['arm' + s].rotation_euler = (.1 if s == 'L' else -.1, 0, 0)
        R['elb' + s].rotation_euler = (0, -.15, 0)
    if fr[:2] in ('wf', 'wb'):
        t = int(fr[2]) / 8 * 2 * math.pi
        for s, ph in (('L', 0), ('R', math.pi)):
            sw = math.sin(t + ph)
            R['leg' + s].rotation_euler = (0, -.5 * sw, 0)
            R['knee' + s].rotation_euler = (0, .55 * max(0, math.sin(t + ph + 1.9)), 0)
            R['arm' + s].rotation_euler = (.08 if s == 'L' else -.08, .45 * sw, 0)
            R['elb' + s].rotation_euler = (0, -.35 - .2 * max(0, -sw), 0)
        R['hips'].location.z = .88 * k + .025 * abs(math.cos(t))
        R['torso'].rotation_euler = (0, .1, 0)
    elif fr == 'sit':
        R['hips'].location.z = .5
        for s in 'LR':
            R['leg' + s].rotation_euler = (0, -1.5, 0); R['knee' + s].rotation_euler = (0, 1.5, 0)
            R['arm' + s].rotation_euler = (.1 if s == 'L' else -.1, -.35, 0); R['elb' + s].rotation_euler = (0, -.9, 0)
    elif fr in ('pk0', 'pk1'):
        b = .75 if fr == 'pk0' else .95
        R['torso'].rotation_euler = (0, b, 0); R['head'].rotation_euler = (0, .35, 0)
        for s in 'LR':
            R['arm' + s].rotation_euler = (.2 if s == 'L' else -.2, -.9, 0); R['elb' + s].rotation_euler = (0, -1.2, 0)
            R['knee' + s].rotation_euler = (0, .25, 0); R['leg' + s].rotation_euler = (0, -.2, 0)
    elif fr == 'wat':
        R['armL'].rotation_euler = (.3, -.9, 0); R['elbL'].rotation_euler = (1.4, -.8, 0); R['head'].rotation_euler = (.25, .35, 0)
    elif fr.startswith('wk'):
        t = int(fr[2]) / 4 * 2 * math.pi
        for s, ph in (('L', 0), ('R', math.pi)):
            R['arm' + s].rotation_euler = (.15 if s == 'L' else -.15, -.9 - .25 * math.sin(t + ph), 0); R['elb' + s].rotation_euler = (0, -.7 + .3 * math.sin(t + ph), 0)
        R['head'].rotation_euler = (0, .2, 0)
    elif fr.startswith('mp'):
        t = int(fr[2]) / 4 * 2 * math.pi
        R['torso'].rotation_euler = (0, .35, math.sin(t) * .25)
        for s in 'LR':
            R['arm' + s].rotation_euler = (.25 if s == 'L' else -.25, -.7 + .2 * math.sin(t), 0); R['elb' + s].rotation_euler = (0, -.4, 0)

sheet = Image.new('RGBA', (len(FRAMES) * (CW + 1), len(CHARS) * (CH + 1)))
man = dict(cw=CW, ch=CH, ax=AX, ay=AY, frames=FRAMES, chars=[c['n'] for c in CHARS])
if len(sys.argv) > 1: CHARS = [c for c in CHARS if c['n'] in sys.argv[1:]]
sheet = Image.new('RGBA', (len(FRAMES) * (CW + 1), len(CHARS) * (CH + 1)))
for row, ch in enumerate(CHARS):
    sc, co, R = build(ch)
    k = 0.93 if ch.get('short') else 1.0
    for col, fr in enumerate(FRAMES):
        pose(R, fr, k); bpy.context.view_layer.update()
        f = os.path.join(TMP, '%s_%s.png' % (ch['n'], fr)); sc.render.filepath = f
        bpy.ops.render.render(write_still=True)
        sheet.paste(Image.open(f), (col * (CW + 1), row * (CH + 1)))
    print('perso', ch['n'], flush=True)
sheet.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(OUT, 'chars.png'), optimize=True)   # 256 couleurs, comme le jeu d'origine
json.dump(man, open(os.path.join(OUT, 'chars.json'), 'w'), separators=(',', ':'))
print('ok', sheet.size)
