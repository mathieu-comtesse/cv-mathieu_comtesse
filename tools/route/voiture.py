"""Voitures de « Route & vigilance » : carrosserie balayée (sections superelliptiques) + habitacle vitré + roues détaillées (pneu à rainures, jante
à cinq bras, disque et étrier), phares, feux, rétroviseurs, plaques, habitacle intérieur. Plusieurs silhouettes (citadine, hatch du joueur, berline, SUV)
et deux niveaux de détail (« hd » pour la voiture du joueur, « trafic » pour les autres).
usage : python3 tools/route/voiture.py [hatch|citadine|berline|suv|tous] [hd|trafic] [apercu]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bl_common import *

VARIANTES = {
    # st : (a, demi-largeur, bas, haut, exposant) de l'arrière (a = 0) vers l'avant (a = L)
    'hatch': dict(L=4.15, st=[(0, .78, .50, .97, 4.2), (.03, .83, .38, 1.0, 4.2), (.3, .875, .27, 1.04, 4), (1.0, .89, .22, 1.045, 3.5), (2.2, .895, .20, 1.05, 3.5), (3.0, .885, .21, .985, 3.5), (3.5, .87, .24, .90, 3.5), (3.9, .83, .28, .85, 3.8), (4.08, .76, .32, .80, 4.2), (4.15, .64, .38, .72, 4.2)],
                  roof=[(.95, 1.04, .74), (1.2, 1.22, .70), (1.6, 1.40, .65), (2.0, 1.465, .62), (2.4, 1.46, .62), (2.7, 1.36, .645), (2.95, 1.20, .70), (3.1, 1.0, .76)], toit=(1.65, 2.5), piliers=((.95, 1.3), (1.98, 2.12), (2.9, 3.1)),
                  axes=(.95, 3.2), voie=.745, R=.315, hab=1.0),
    'citadine': dict(L=3.72, st=[(0, .74, .48, .99, 4.2), (.03, .79, .36, 1.03, 4.2), (.3, .845, .26, 1.07, 4), (.9, .86, .22, 1.08, 3.5), (1.9, .865, .20, 1.08, 3.5), (2.6, .855, .21, 1.03, 3.5), (3.05, .84, .24, .95, 3.5), (3.45, .80, .28, .90, 3.8), (3.66, .72, .32, .86, 4.2), (3.72, .60, .38, .78, 4.2)],
                     roof=[(.78, 1.06, .72), (1.0, 1.25, .69), (1.4, 1.45, .64), (1.8, 1.52, .62), (2.2, 1.52, .62), (2.5, 1.42, .64), (2.75, 1.22, .70), (2.92, 1.05, .75)], toit=(1.45, 2.25), piliers=((.78, 1.1), (1.75, 1.9), (2.62, 2.95)),
                     axes=(.78, 2.85), voie=.715, R=.29, hab=1.0),
    'berline': dict(L=4.68, st=[(0, .80, .52, 1.0, 4.2), (.03, .85, .40, 1.03, 4.2), (.4, .895, .28, 1.07, 4), (1.1, .905, .22, 1.08, 3.5), (2.5, .91, .20, 1.075, 3.5), (3.4, .9, .21, 1.03, 3.5), (3.95, .88, .24, .95, 3.5), (4.35, .84, .28, .89, 3.8), (4.6, .77, .32, .85, 4.2), (4.68, .66, .38, .76, 4.2)],
                    roof=[(1.25, 1.07, .74), (1.55, 1.22, .70), (1.9, 1.38, .66), (2.2, 1.455, .63), (2.8, 1.455, .63), (3.05, 1.40, .65), (3.35, 1.22, .71), (3.62, 1.04, .77)], toit=(1.95, 2.95), piliers=((1.25, 1.65), (2.4, 2.55), (3.35, 3.65)),
                    axes=(1.05, 3.65), voie=.77, R=.335, hab=1.0, coffre=True),
    'fourgon': dict(L=5.35, st=[(0, .86, .62, 1.55, 5), (.03, .9, .48, 1.62, 5), (.4, .925, .38, 1.9, 5), (1.2, .93, .32, 2.0, 5), (3.3, .93, .30, 2.0, 5), (3.9, .92, .31, 1.62, 5), (4.5, .9, .34, 1.1, 5), (5.2, .84, .40, .96, 4.6), (5.35, .7, .46, .86, 4.2)],
                    roof=[(2.9, 2.0, .82), (3.2, 2.0, .82), (3.5, 1.98, .8), (3.85, 1.85, .78), (4.1, 1.55, .8), (4.3, 1.12, .84)], toit=(3.0, 3.6), piliers=((2.9, 3.0), (3.4, 3.5), (4.2, 4.3)),
                    axes=(1.0, 4.0), voie=.8, R=.34, hab=1.0, vitre_min=2.9),
    'suv': dict(L=4.45, st=[(0, .82, .58, 1.1, 4.2), (.03, .88, .44, 1.14, 4.2), (.35, .925, .32, 1.185, 4), (1.0, .935, .27, 1.19, 3.5), (2.3, .94, .25, 1.19, 3.5), (3.2, .93, .26, 1.14, 3.5), (3.75, .91, .30, 1.06, 3.5), (4.15, .87, .35, 1.0, 3.8), (4.38, .8, .40, .96, 4.2), (4.45, .68, .46, .88, 4.2)],
                roof=[(.82, 1.18, .78), (1.1, 1.42, .74), (1.5, 1.62, .70), (2.0, 1.69, .68), (2.8, 1.69, .68), (3.15, 1.60, .70), (3.45, 1.40, .75), (3.62, 1.17, .80)], toit=(1.5, 3.0), piliers=((.82, 1.3), (2.2, 2.4), (3.25, 3.62)),
                axes=(.95, 3.45), voie=.80, R=.375, hab=1.0),
}
POIDS_DETAIL = {'hd': dict(n_st=70, n_ring=48, sub=1, pneu_seg=72, cabine=44), 'trafic': dict(n_st=44, n_ring=32, sub=1, pneu_seg=36, cabine=28)}

def interp(lst, a, k):
    """interpolation lisse (cosinus) de la colonne k d'une liste de stations triées par a"""
    if a <= lst[0][0]: return lst[0][k]
    for i in range(len(lst) - 1):
        a0, a1 = lst[i][0], lst[i + 1][0]
        if a0 <= a <= a1:
            t = (a - a0) / (a1 - a0); t = t * t * (3 - 2 * t)
            return lst[i][k] + (lst[i + 1][k] - lst[i][k]) * t
    return lst[-1][k]

def sp(c, e): return math.copysign(abs(c) ** (2.0 / e), c)

def pneu(M, R, larg, seg, nom):
    r_j = R * .64                           # rayon de jante
    w = larg / 2
    gr = lambda r, h: (r, h)
    prof = [(r_j * .98, -w * .97), (r_j * 1.18, -w), (R * .83, -w * 1.02), (R * .95, -w * .93), (R * .985, -w * .8), (R * .995, -w * .75)]
    # bande de roulement à rainures
    bande = [(R, -w * .70), (R, -w * .52), (R * .985, -w * .47), (R * .985, -w * .30), (R, -w * .25), (R, w * .25), (R * .985, w * .30), (R * .985, w * .47), (R, w * .52), (R, w * .70)]
    prof += bande
    prof += [(R * .995, w * .75), (R * .985, w * .8), (R * .95, w * .93), (R * .83, w * 1.02), (r_j * 1.18, w), (r_j * .98, w * .97)]
    o = revolve(nom, prof, axis='X', seg=seg, mats=[M['caoutchouc']], mat_index=0)
    return o

def jante(M, R, larg, seg, nom, cote=-1):
    r_j = R * .64; w = larg / 2
    objs = []
    # fût : lèvre extérieure, cuvette
    barrel = [(r_j * 1.02, cote * w * .95), (r_j * 1.0, cote * w * .8), (r_j * .93, cote * w * .45), (r_j * .9, 0), (r_j * .93, -cote * w * .5), (r_j * 1.0, -cote * w * .9)]
    objs.append(revolve(nom + '_fut', barrel, axis='X', seg=seg, mats=[M['jante']], mat_index=0))
    # cinq bras
    hub = r_j * .26; x_face = cote * w * .62
    for k in range(5):
        a = 2 * math.pi * k / 5 + .3
        d = Vector((0, math.cos(a), math.sin(a)))
        p0 = d * hub * .9 + Vector((x_face, 0, 0)); p1 = d * (r_j * .93) + Vector((cote * w * .45, 0, 0))
        bras = limb(f'{nom}_bras{k}', p0, p1, r_j * .075, r_j * .06, M['jante'], seg=6)
        objs.append(bras)
        # liseré en V entre bras (second bras fin)
    objs.append(cylinder(nom + '_moyeu', r_j * .27, w * .26, loc=(x_face + cote * w * .05, 0, 0), axis='X', mat_=M['chrome'], seg=20))
    for k in range(5):
        a = 2 * math.pi * k / 5
        objs.append(cylinder(f'{nom}_vis{k}', r_j * .025, w * .1, loc=(x_face + cote * w * .13, math.cos(a) * r_j * .17, math.sin(a) * r_j * .17), axis='X', mat_=M['chrome'], seg=6))
    return objs

def roue(M, R, larg, det, nom, cote=-1):
    """une roue complète (pneu, jante, disque, étrier) centrée sur l'origine, face visible du côté `cote` (-1 = x négatif)."""
    seg = det['pneu_seg']
    parts = [pneu(M, R, larg, seg, nom + '_pneu')] + jante(M, R, larg, max(24, seg // 2), nom + '_jante', cote)
    disque = cylinder(nom + '_disque', R * .5, larg * .09, loc=(-cote * larg * .08, 0, 0), axis='X', mat_=M['frein'], seg=36); parts.append(disque)
    etrier = box(nom + '_etrier', (larg * .16, R * .22, R * .3), loc=(-cote * larg * .08 + cote * larg * .04, R * .35, R * .22), mat_=M['etrier'], bevel_w=.012); parts.append(etrier)
    return parts

def carrosserie(v, det, M):
    L = v['L']; st = v['st']
    n_st, n_ring = det['n_st'], det['n_ring']
    def ring(a):
        w = interp(st, a, 1); zb = interp(st, a, 2); zt = interp(st, a, 3); e = interp(st, a, 4)
        mid = max(0.0, min(1.0, (a - .25) / .6)) * max(0.0, min(1.0, (L - .35 - a) / .8))      # milieu de la caisse : flancs presque verticaux, arêtes vives (adoucies par la subdivision)
        e = max(e, 4.8) + (6.2 - max(e, 4.8)) * mid
        zc = (zb + zt) / 2; h = (zt - zb) / 2
        pts = []
        for k in range(n_ring):
            ph = 2 * math.pi * k / n_ring
            pts.append((sp(math.cos(ph), e) * w, L / 2 - a, zc + sp(math.sin(ph), e) * h))
        return pts
    # stations plus serrées aux extrémités (courbure forte)
    ts = [(.5 - .5 * math.cos(math.pi * i / (n_st - 1))) for i in range(n_st)]
    stations = [t * L for t in ts]
    corps = loft('carrosserie', stations, ring, n_ring, mats=[M['peinture']], cap=True)
    return corps

def habitacle(v, det, M):
    st = v['st']; roof = v['roof']; nc = det['cabine']; n_ring = 28 if det['cabine'] > 30 else 20
    a0, a1 = roof[0][0], roof[-1][0]
    stations = [a0 + (a1 - a0) * (.5 - .5 * math.cos(math.pi * i / (nc - 1))) for i in range(nc)]
    def ring(a):
        z0 = interp(st, a, 3) - .035; zt = interp(roof, a, 1); wt = interp(roof, a, 2)
        zt = max(zt, z0 + .01); zc = (z0 + zt) / 2; hh = (zt - z0) / 2
        wb = min(interp(st, a, 1) - .08, wt + .13)
        pts = []
        for k in range(n_ring):
            ph = 2 * math.pi * k / n_ring; c = math.cos(ph); s = math.sin(ph)
            ww = wb - (wb - wt) * max(0.0, s)              # rétrécit vers le haut
            pts.append((sp(c, 5.0) * ww, L_for(v) / 2 - a, zc + sp(s, 4.0) * hh))
        return pts
    def L_for(v): return v['L']
    hab = loft('habitacle', stations, ring, n_ring, mats=[M['verre'], M['peinture']], cap=True)
    # attribution des matériaux : toit, montant central et pourtour des pare-brise peints, le reste vitré
    r0, r1 = v['toit']; Lh = v['L']; me = hab.data
    pb = v['piliers'][1]
    for p in me.polygons:
        c = p.center; n = p.normal; a = Lh / 2 - c.y; zt = interp(roof, a, 1); wt = interp(roof, a, 2); z0 = interp(st, a, 3) - .035
        if r0 <= a <= r1 and c.z > zt - .13 and abs(c.x) < wt * 1.05: peint = True                     # toit
        elif abs(n.x) > .55: peint = (pb[0] <= a <= pb[1]) or c.z < z0 + .07                            # flancs : vitres, sauf montant central et ceinture
        else: peint = abs(c.x) > wt * .83 or c.z < z0 + .05                                              # pare-brise et lunette : cadre peint
        if 'vitre_min' in v and a < v['vitre_min'] + .05: peint = True
        p.material_index = 1 if peint else 0
    return hab

def sur_surface(cible, origine, direction):
    """point d'impact (et normale) d'un rayon sur la carrosserie ; None si rien."""
    ok, loc, nor, idx = cible.ray_cast(Vector(origine), Vector(direction).normalized())
    return (loc, nor) if ok else (None, None)

def poser(o, loc, nor, decalage=0.0, haut=Vector((0, 0, 1))):
    """oriente l'objet : Z local le long de la normale, Y local vers le haut du véhicule"""
    nor = nor.normalized(); droite = haut.cross(nor)
    if droite.length < 1e-4: droite = Vector((1, 0, 0))
    droite.normalize(); up = nor.cross(droite).normalized()
    from mathutils import Matrix
    R = Matrix(((droite.x, up.x, nor.x), (droite.y, up.y, nor.y), (droite.z, up.z, nor.z)))
    o.rotation_euler = R.to_euler(); o.location = loc + nor * decalage
    return o

def feux_et_details(v, M, det, corps, hab):
    L = v['L']; st = v['st']; objs = []
    def y_(a): return L / 2 - a
    # --- phares avant : lentille + cadre posés sur le nez ---
    for sx in (-1, 1):
        z = interp(st, L - .22, 3) - .13; x = sx * interp(st, L - .12, 1) * .66
        loc, nor = sur_surface(corps, (x, -L / 2 - 1.0, z), (0, 1, 0))
        if loc is None: continue
        cad = sphere('phare_cadre', 1, scale=(.17, .075, .035), mat_=M['plastique_gris'], seg=20, rings=10); poser(cad, loc, nor, -.004); objs.append(cad)
        len_ = sphere('phare', 1, scale=(.155, .058, .03), mat_=M['phare'], seg=20, rings=10); poser(len_, loc, nor, .008); objs.append(len_)
        drl = box('drl', (.19, .012, .01), mat_=M['phare']); poser(drl, loc + Vector((0, 0, -.07)), nor, .004); objs.append(drl)
        loc2, nor2 = sur_surface(corps, (sx * 1.6, -L / 2 + .42, z - .02), (-sx, 0, 0))
        if loc2 is not None:
            cl = sphere('clignotant_av', 1, scale=(.075, .035, .018), mat_=M['clignotant'], seg=10, rings=6); poser(cl, loc2, nor2, .003); objs.append(cl)
    za = interp(st, L - .02, 2) + .18
    loc, nor = sur_surface(corps, (0, -L / 2 - 1, za + .02), (0, 1, 0))
    if loc is not None:
        g = box('calandre', (.72, .03, .15), mat_=M['plastique'], bevel_w=.025); poser(g, loc, nor, .004); objs.append(g)
        f = box('calandre_filet', (.74, .012, .02), mat_=M['chrome'], bevel_w=.004); poser(f, loc + Vector((0, 0, .09)), nor, .012); objs.append(f)
    loc, nor = sur_surface(corps, (0, -L / 2 - 1, za - .13), (0, 1, 0))
    if loc is not None:
        g = box('prise_air', (.88, .03, .07), mat_=M['plastique'], bevel_w=.012); poser(g, loc, nor, .004); objs.append(g)
        pl = box('plaque_av', (.52, .012, .12), mat_=M['plaque']); poser(pl, loc + Vector((0, 0, -.1)), nor, .006); objs.append(pl)
    for sx in (-1, 1):
        loc, nor = sur_surface(corps, (sx * .62, -L / 2 - 1, za - .12), (0, 1, 0))
        if loc is not None:
            f = sphere('antibrouillard', 1, scale=(.05, .035, .018), mat_=M['phare'], seg=12, rings=6); poser(f, loc, nor, .004); objs.append(f)
    # --- feux arrière : bloc enveloppant tout en hauteur, recul, clignotant ---
    zr = interp(st, .12, 3) - .18
    for sx in (-1, 1):
        x = sx * interp(st, .1, 1) * .78
        loc, nor = sur_surface(corps, (x, L / 2 + 1.0, zr), (0, -1, 0))
        if loc is None: continue
        cad = sphere('feu_cadre', 1, scale=(.15, .105, .03), mat_=M['plastique'], seg=20, rings=10); poser(cad, loc, nor, -.003); objs.append(cad)
        blk = sphere('feu_ar', 1, scale=(.135, .088, .03), mat_=M['feu_ar'], seg=20, rings=10); poser(blk, loc, nor, .006); objs.append(blk)
        rec = sphere('recul_', 1, scale=(.045, .028, .02), mat_=M['recul'], seg=10, rings=6); poser(rec, loc + Vector((-sx * .02, 0, -.12)), nor, .004); objs.append(rec)
        cli = sphere('clignotant_ar', 1, scale=(.05, .028, .018), mat_=M['clignotant'], seg=10, rings=6); poser(cli, loc + Vector((sx * .03, 0, -.19)), nor, .004); objs.append(cli)
    loc, nor = sur_surface(corps, (0, L / 2 + 1.0, zr), (0, -1, 0))
    if loc is not None:
        b = box('feu_ar_barre', (.42, .014, .022), mat_=M['feu_ar'], bevel_w=.006); poser(b, loc, nor, .006); objs.append(b)
        pl = box('plaque_ar', (.52, .012, .12), mat_=M['plaque']); poser(pl, loc + Vector((0, 0, -.2)), nor, .006); objs.append(pl)
    a_hl = v['roof'][0][0] + .35
    loc, nor = sur_surface(hab, (0, y_(a_hl), 3), (0, 0, -1))
    if loc is not None:
        b = box('feu_stop_haut', (.5, .03, .03), mat_=M['feu_ar'], bevel_w=.008); poser(b, loc, nor, .008); b.rotation_euler = (math.radians(55), 0, 0); objs.append(b)
    # --- rétroviseurs ---
    a_m = v['axes'][1] - .38
    for sx in (-1, 1):
        z = interp(st, a_m, 3) + .07
        loc, nor = sur_surface(hab, (sx * 2, y_(a_m), z), (-sx, 0, 0))
        if loc is None: loc = Vector((sx * (interp(st, a_m, 1) - .1), y_(a_m), z)); nor = Vector((sx, 0, 0))
        r = sphere('retro', 1, scale=(.085, .06, .1), mat_=M['peinture'], seg=16, rings=10); r.location = loc + Vector((sx * .12, 0, .0)); objs.append(r)
        g = box('retro_glace', (.01, .1, .07), mat_=M['chrome']); g.location = loc + Vector((sx * .12 - sx * .055, .0, .0)); g.rotation_euler = (0, 0, sx * .1); objs.append(g)
        t = box('retro_tige', (.14, .03, .03), mat_=M['plastique'], bevel_w=.008); t.location = loc + Vector((sx * .05, .02, -.03)); objs.append(t)
    # --- poignées, joints de portes, baguette de bas de caisse (lancer de rayons : suivent la caisse) ---
    a_porte = [v['axes'][0] + .05, (v['axes'][0] + v['axes'][1]) / 2 - .05, v['axes'][1] - .62]
    for sx in (-1, 1):
        for k, a in enumerate((a_porte[0] + .55, a_porte[1] + .45)):
            loc, nor = sur_surface(corps, (sx * 2, y_(a), interp(st, a, 3) - .1), (-sx, 0, 0))
            if loc is not None:
                h = box('poignee', (.012, .15, .026), mat_=M['chrome'], bevel_w=.007); h.location = loc + Vector((sx * .008, 0, 0)); objs.append(h)
        for a in (a_porte[0] + .02, a_porte[1] + .0, a_porte[2] - .04):
            pts = []
            zt = interp(st, a, 3)
            for zz in [.42 + (zt - .06 - .42) * i / 9 for i in range(10)]:
                loc, nor = sur_surface(corps, (sx * 2, y_(a), zz), (-sx, 0, 0))
                if loc is not None: pts.append(loc + nor * .002)
            if len(pts) > 3: objs.append(tube('joint', pts, .0042, M['plastique'], seg=4))
        pts = []
        for i in range(24):
            a = .6 + (L - 1.1) * i / 23
            loc, nor = sur_surface(corps, (sx * 2, y_(a), .43), (-sx, 0, 0))
            if loc is not None and not (abs(a - v['axes'][0]) < .42 or abs(a - v['axes'][1]) < .42): pts.append(loc + nor * .002)
            elif len(pts) > 3: objs.append(tube('jonc', pts, .0075, M['plastique_gris'], seg=5)); pts = []
        if len(pts) > 3: objs.append(tube('jonc', pts, .0075, M['plastique_gris'], seg=5))
    return objs

def interieur(v, M):
    L = v['L']; st = v['st']; a_a = v['axes'][1]; objs = []
    y_seat = L / 2 - (a_a - .55); zs = interp(st, 2, 2) + .30
    for sx in (-.37, .37):
        objs.append(box('siege_assise', (.46, .5, .13), loc=(sx, y_seat, zs), mat_=M['siege'], bevel_w=.03))
        dos = box('siege_dos', (.46, .1, .55), loc=(sx, y_seat + .26, zs + .3), mat_=M['siege'], bevel_w=.03); dos.rotation_euler = (math.radians(-14), 0, 0); objs.append(dos)
        objs.append(box('appuie_tete', (.22, .08, .17), loc=(sx, y_seat + .32, zs + .66), mat_=M['siege'], bevel_w=.025))
    banq = L / 2 - (v['axes'][0] + .85)
    objs.append(box('banquette', (1.3, .5, .13), loc=(0, banq, zs), mat_=M['siege'], bevel_w=.03))
    objs.append(box('banquette_dos', (1.3, .1, .5), loc=(0, banq + .24, zs + .28), mat_=M['siege'], bevel_w=.03))
    ytb = L / 2 - (a_a + .12)
    objs.append(box('planche', (1.45, .4, .16), loc=(0, ytb, interp(st, a_a, 3) - .2), mat_=M['interieur'], bevel_w=.04))
    objs.append(tube('volant', [(math.cos(t) * .17 - .37, ytb + .33 + math.sin(t) * .03, zs + .52 + math.sin(t) * .13) for t in [i * math.pi * 2 / 24 for i in range(25)]], .014, M['interieur'], seg=6))
    objs.append(box('console', (.22, .55, .14), loc=(0, y_seat, zs - .02), mat_=M['interieur'], bevel_w=.03))
    objs.append(box('plancher', (1.5, L * .6, .02), loc=(0, 0, interp(st, 2, 2) + .12), mat_=M['interieur']))
    return objs

def construire(nom, det_nom='hd', apercu=False):
    reset(); M = palette(); v = VARIANTES[nom]; det = POIDS_DETAIL[det_nom]; L = v['L']; R = v['R']; larg = R * .66
    corps = carrosserie(v, det, M); subsurf(corps, det['sub'])
    # passages de roues : soustraction de cylindres
    y_av, y_ar = L / 2 - v['axes'][1], L / 2 - v['axes'][0]
    cutters = []
    for sx in (-1, 1):
        for y in (y_av, y_ar):
            c = cylinder('decoupe', R + .06, .62, loc=(sx * (v['voie'] + .07), y, R), axis='X', mat_=M['plastique'], seg=36); cutters.append(c)
    for c in cutters:
        modif(corps, 'BOOLEAN', operation='DIFFERENCE', object=c, solver='EXACT')
        apply_all(corps); bpy.data.objects.remove(c, do_unlink=True)
    # matériaux du bas de caisse / pare-chocs
    me = corps.data; sl = [m.name for m in me.materials]
    if 'plastique' not in sl: me.materials.append(M['plastique'])
    ip = [m.name for m in me.materials].index('plastique'); ipe = [m.name for m in me.materials].index('peinture')
    for p in me.polygons:
        c = p.center; a = L / 2 - c.y
        bas = c.z < interp(v['st'], a, 2) + .13 and (a < .55 or a > L - .6 or abs(c.x) > interp(v['st'], a, 1) * .55)
        if bas and p.material_index == ipe: p.material_index = ip
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(38)) if corps.select_get() else None
    hab = habitacle(v, det, M); subsurf(hab, 1)
    parts = [corps, hab]
    extras = feux_et_details(v, M, det, corps, hab)
    inter = interieur(v, M)
    # --- roues : une seule géométrie partagée par les quatre roues ---
    racine = empty('voiture')
    for o in [corps, hab] + extras + inter: parent(o, racine)
    parts = roue(M, R, larg, det, 'rm', cote=-1)
    roue_mesh = join(parts, 'roue_mesh'); me_roue = roue_mesh.data
    roue_mesh.parent = None
    premiere = True
    for nm, (sx, y, av) in {'av_g': (-1, y_av, True), 'av_d': (1, y_av, True), 'ar_g': (-1, y_ar, False), 'ar_d': (1, y_ar, False)}.items():
        pivot = empty('braq_' + nm if av else 'essieu_' + nm, loc=(sx * v['voie'], y, R), par=racine)
        spin = empty('roue_' + nm, par=pivot)
        if premiere: o = roue_mesh; premiere = False
        else: o = bpy.data.objects.new('roue_' + nm + '_m', me_roue); bpy.context.scene.collection.objects.link(o)
        o.name = 'roue_' + nm + '_m'; o.location = (0, 0, 0)
        o.rotation_euler = (0, 0, 0 if sx < 0 else math.pi)
        parent(o, spin, monde=False)
    n = tris([o for o in bpy.data.objects])
    print(f'{nom} [{det_nom}] : {n} triangles')
    return racine, M, n

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    cible = args[0] if args else 'hatch'; det = args[1] if len(args) > 1 else 'hd'; ap = 'apercu' in args
    racine, M, n = construire(cible, det)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'route', f'voiture-{cible}{"" if det == "hd" else "-" + det}.glb')
    if ap: preview(os.path.join('/tmp', f'apercu_{cible}.png'), views=('3q', 'side', 'rear', 'front'), target=(0, 0, .75), dist=7.5)
    export_glb(os.path.normpath(out))
