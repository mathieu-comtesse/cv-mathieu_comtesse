"""Poids lourd de « Route & vigilance » : tracteur routier à cabine avancée + semi-remorque bâchée (≈ 16,5 m), roues jumelées partagées.
usage : python3 tools/route/camion.py [apercu]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bl_common import *
from voiture import interp, sp, pneu, jante

def roue_camion(M, R, larg, seg=30):
    parts = [pneu(M, R, larg, seg, 'p')] + jante(M, R, larg, 20, 'j', -1)
    return join(parts, 'roue_camion_mesh')

def construire(apercu=False):
    reset(); M = palette(); M['remorque'] = mat('remorque', (.92, .92, .9), .55, .1); M['chassis'] = mat('chassis', (.06, .06, .07), .7, .3)
    M['orange'] = M['clignotant']; racine = empty('camion')
    L = 16.4; y_av = -L / 2                       # pare-chocs avant
    def lie(o): parent(o, racine); return o
    # --- cabine : balayage superelliptique, pare-brise incliné ---
    cab_l = 2.45; zb = 1.0
    zt_t = [(0, 2.9), (.18, 3.3), (.55, 3.62), (1.1, 3.74), (2.3, 3.78), (2.45, 3.7)]
    def ring(a):
        zt = interp([(x, z, 0, 0) for x, z in zt_t], a, 1) if False else None
        # interpolation simple
        pts = zt_t; zt = pts[-1][1]
        for i in range(len(pts) - 1):
            if pts[i][0] <= a <= pts[i + 1][0]:
                t = (a - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); t = t * t * (3 - 2 * t); zt = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t; break
        w = 1.25 - (0.0 if a > .1 else (.1 - a) * 1.2)
        zc = (zb + zt) / 2; h = (zt - zb) / 2; e = 6
        return [(sp(math.cos(p), e) * w, y_av + .06 + a, zc + sp(math.sin(p), e) * h) for p in [2 * math.pi * k / 40 for k in range(40)]]
    stations = [cab_l * (.5 - .5 * math.cos(math.pi * i / 39)) for i in range(40)]
    cab = loft('cabine', stations, ring, 40, mats=[M['peinture'], M['verre'], M['plastique'], M['chrome']], cap=True); subsurf(cab, 1)
    for p in cab.data.polygons:
        c = p.center; n = p.normal; a = c.y - (y_av + .06)
        if c.z > 2.2 and ((n.y < -.35 and a < .75) or (abs(n.x) > .6 and .25 < a < 1.75 and c.z > 2.15)): p.material_index = 1
        elif c.z < 1.55 and n.y < -.5: p.material_index = 2
    lie(cab)
    # calandre, phares, pare-chocs, marchepieds
    lie(box('calandre', (1.7, .06, .8), loc=(0, y_av + .05, 1.78), mat_=M['plastique'], bevel_w=.03))
    for k in range(6): lie(box('calandre_barre', (1.7, .02, .035), loc=(0, y_av + .015, 1.5 + k * .12), mat_=M['chrome'], bevel_w=.006))
    for sx in (-1, 1):
        lie(box('phare_cadre', (.46, .08, .26), loc=(sx * 1.0, y_av + .06, 1.55), mat_=M['plastique_gris'], bevel_w=.05))
        lie(sphere('phare', 1, loc=(sx * 1.0, y_av + .02, 1.55), scale=(.2, .04, .1), mat_=M['phare'], seg=20, rings=10))
        lie(sphere('clignotant_av', 1, loc=(sx * 1.17, y_av + .05, 1.2), scale=(.07, .03, .05), mat_=M['clignotant'], seg=10, rings=6))
        lie(box('marchepied', (.32, .5, .08), loc=(sx * 1.38, y_av + .75, .85), mat_=M['plastique_gris'], bevel_w=.02))
        lie(box('retro_bras', (.55, .05, .05), loc=(sx * 1.52, y_av + .7, 2.45), mat_=M['plastique']))
        lie(box('retro', (.1, .22, .52), loc=(sx * 1.82, y_av + .7, 2.55), mat_=M['plastique'], bevel_w=.02))
        lie(box('retro_glace', (.012, .2, .48), loc=(sx * 1.77, y_av + .7, 2.55), mat_=M['chrome']))
        lie(cylinder('reservoir', .3, 1.1, loc=(sx * 1.2, y_av + 2.6, .8), axis='Y', mat_=M['chrome'], seg=20))
        lie(cylinder('echappement', .07, 1.75, loc=(sx * 1.2, y_av + 2.75, 2.6), mat_=M['chrome'], seg=12))
    lie(box('pare_chocs', (2.5, .3, .42), loc=(0, y_av + .0, .72), mat_=M['plastique_gris'], bevel_w=.06))
    lie(box('plaque_av', (.52, .012, .12), loc=(0, y_av - .02, .72), mat_=M['plaque']))
    lie(box('pare_soleil', (2.3, .45, .1), loc=(0, y_av + .55, 3.62), mat_=M['peinture'], bevel_w=.03))
    for k in range(5): lie(sphere('gyro', 1, loc=((k - 2) * .38, y_av + 1.25, 3.88), scale=(.07, .07, .05), mat_=M['orange'], seg=8, rings=5))
    lie(box('deflecteur', (2.3, .5, .85), loc=(0, y_av + cab_l + .22, 3.4), mat_=M['peinture'], bevel_w=.1))
    # --- châssis ---
    lie(box('chassis', (1.0, 12.5, .22), loc=(0, -.1, .95), mat_=M['chassis'], bevel_w=.03))
    for sx in (-1, 1): lie(box('longeron', (.14, 15.3, .3), loc=(sx * .5, 0, .93), mat_=M['chassis'], bevel_w=.02))
    lie(box('sellette', (1.1, 1.3, .12), loc=(0, y_av + 4.8, 1.12), mat_=M['metal'], bevel_w=.03))
    # --- semi-remorque ---
    ty0 = y_av + 4.0; ty1 = L / 2; tl = ty1 - ty0; tz0 = 1.15; th = 2.6; tw = 2.55
    box_ = box('remorque', (tw, tl, th), loc=(0, (ty0 + ty1) / 2, tz0 + th / 2), mat_=M['remorque'], bevel_w=.07); box_.data.materials.append(M['plastique']); lie(box_)
    for i in range(14):                                         # nervures verticales
        y = ty0 + .5 + i * (tl - 1) / 13
        for sx in (-1, 1): lie(box('nervure', (.045, .09, th - .1), loc=(sx * (tw / 2 + .012), y, tz0 + th / 2), mat_=M['remorque'], bevel_w=.01))
    for sx in (-1, 1):
        lie(box('bavolet', (.05, tl * .6, .28), loc=(sx * (tw / 2 - .1), ty0 + tl * .5, tz0 + .1), mat_=M['plastique_gris'], bevel_w=.02))
        lie(box('feu_ar', (.34, .05, .16), loc=(sx * 1.0, ty1 + .02, tz0 + .35), mat_=M['feu_ar'], bevel_w=.025))
        lie(box('clignotant_ar', (.16, .05, .1), loc=(sx * 1.0, ty1 + .02, tz0 + .62), mat_=M['clignotant'], bevel_w=.02))
        lie(box('catadioptre', (.12, .03, .12), loc=(sx * 1.15, ty1 + .02, tz0 + .1), mat_=M['etrier']))
        lie(box('porte_poignee', (.03, .05, .9), loc=(sx * .08, ty1 + .03, tz0 + th / 2), mat_=M['chrome'], bevel_w=.008))
    lie(box('porte_joint', (.02, .03, th - .1), loc=(0, ty1 + .005, tz0 + th / 2), mat_=M['chassis']))
    lie(box('pare_cycliste', (tw - .3, .12, .22), loc=(0, ty1 - .4, tz0 - .22), mat_=M['plastique_gris'], bevel_w=.03))
    lie(box('plaque_ar', (.52, .012, .12), loc=(0, ty1 + .02, tz0 + .08), mat_=M['plaque']))
    lie(box('bandeau_rouge', (tw + .02, .04, .1), loc=(0, ty1 + .015, tz0 + th - .25), mat_=M['etrier']))
    # --- roues (partagées) ---
    Rw = .52; lw = .32
    base = roue_camion(M, Rw, lw); me = base.data; base.parent = None
    axes = [('av', y_av + 1.15, False)] + [('ar1', y_av + 5.0, True), ('ar2', y_av + 6.35, True)] + [('rem%d' % k, ty1 - 1.4 - k * 1.35, True) for k in range(3)]
    premiere = True
    for nom, y, jum in axes:
        for sx in (-1, 1):
            for j in (0, 1) if jum else (0,):
                dx = sx * (1.02 + (0.34 if j else 0.0)) if jum else sx * 1.02
                pivot = empty(f'roue_{nom}_{"g" if sx < 0 else "d"}{j}', loc=(dx, y, Rw), par=racine)
                if premiere: o = base; premiere = False
                else: o = bpy.data.objects.new('roue_m', me); bpy.context.scene.collection.objects.link(o)
                o.rotation_euler = (0, 0, 0 if sx < 0 else math.pi); o.location = (0, 0, 0); parent(o, pivot, monde=False)
    print('camion', tris(list(bpy.data.objects)), 'triangles')
    return racine

if __name__ == '__main__':
    ap = 'apercu' in sys.argv
    construire()
    if ap: preview('/tmp/apercu_camion.png', views=('3q', 'side', 'rear'), target=(0, 0, 1.8), dist=24, size=(1000, 560))
    export_glb(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'route', 'camion.glb')))
