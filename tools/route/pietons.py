"""Piéton, cycliste et animaux de « Route & vigilance » (Blender). Hiérarchie de nœuds nommés pour l'animation par le jeu :
piéton : bras_g, bras_d, jambe_g, jambe_d (pivots à l'épaule et à la hanche, rotation autour de X) ;
cycliste : roue_av, roue_ar, pedalier (rotation autour de X) ; quadrupèdes : patte_av_g, patte_av_d, patte_ar_g, patte_ar_d, queue, tete.
usage : python3 tools/route/pietons.py [pieton|cycliste|cerf|chien|vache|tous] [apercu]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bl_common import *

def M_extra(M):
    M['vetement1'] = mat('vetement1', (.18, .32, .62), .85); M['vetement2'] = mat('vetement2', (.1, .1, .13), .9)
    M['chaussure'] = mat('chaussure', (.06, .05, .05), .7); M['sac'] = mat('sac', (.15, .15, .17), .85)
    M['pelage'] = mat('pelage', (.45, .30, .17), .95); M['pelage_clair'] = mat('pelage_clair', (.78, .68, .55), .95)
    M['pelage_fonce'] = mat('pelage_fonce', (.16, .11, .08), .95); M['corne'] = mat('corne', (.82, .78, .66), .6)
    M['oeil'] = mat('oeil', (.02, .02, .02), .2); M['nez'] = mat('nez', (.05, .03, .03), .5); M['pneu_velo'] = mat('pneu_velo', (.03, .03, .035), .8)
    M['cadre'] = mat('cadre', (.75, .1, .1), .35, .6)
    return M

def pivot(nom, loc, par): return empty(nom, loc, par)
def lie(o, p, monde=True): parent(o, p, monde)

# ------------------------------------------------------------------------------------------------ piéton
def pieton():
    reset(); M = M_extra(palette()); racine = empty('pieton')
    z0 = 0.0
    # tronc
    bassin = sphere('bassin', 1, loc=(0, 0, .99), scale=(.165, .1, .13), mat_=M['vetement2'], seg=24, rings=14)
    torse = sphere('torse', 1, loc=(0, 0, 1.28), scale=(.19, .115, .3), mat_=M['vetement1'], seg=32, rings=18)
    epaules = sphere('epaules', 1, loc=(0, 0, 1.47), scale=(.235, .1, .075), mat_=M['vetement1'], seg=24, rings=12)
    cou = cylinder('cou', .045, .1, loc=(0, 0, 1.55), mat_=M['peau'], seg=12)
    tete = sphere('tete', 1, loc=(0, -.01, 1.66), scale=(.092, .105, .115), mat_=M['peau'], seg=28, rings=16)
    cheveux = sphere('cheveux', 1, loc=(0, .012, 1.685), scale=(.096, .108, .115), mat_=M['cheveux'], seg=28, rings=16)
    nez = sphere('nez', 1, loc=(0, -.105, 1.655), scale=(.015, .02, .02), mat_=M['peau'], seg=8, rings=6)
    yeux = [sphere('oeil', 1, loc=(sx * .036, -.092, 1.675), scale=(.012, .008, .01), mat_=M['oeil'], seg=8, rings=6) for sx in (-1, 1)]
    sac = box('sac', (.26, .12, .34), loc=(0, .14, 1.3), mat_=M['sac'], bevel_w=.03)
    sangle = [box('sangle', (.02, .13, .36), loc=(sx * .09, .0, 1.34), mat_=M['sac']) for sx in (-1, 1)]
    for o in [bassin, torse, epaules, cou, tete, cheveux, nez, sac] + yeux + sangle: lie(o, racine)
    # jambes (pivot à la hanche)
    for nm, sx in (('g', -1), ('d', 1)):
        p = pivot('jambe_' + nm, (sx * .1, 0, .95), racine)
        cuisse = limb('cuisse', (0, 0, 0), (0, 0, -.45), .082, .062, M['vetement2'], seg=14); mollet = limb('mollet', (0, 0, -.45), (0, 0, -.87), .062, .045, M['vetement2'], seg=14)
        genou = sphere('genou', .062, loc=(0, 0, -.45), mat_=M['vetement2'], seg=12, rings=8)
        pied = box('pied', (.095, .26, .075), loc=(0, -.05, -.905), mat_=M['chaussure'], bevel_w=.025); semelle = box('semelle', (.1, .27, .02), loc=(0, -.05, -.945), mat_=M['vetement1'])
        for o in (cuisse, mollet, genou, pied, semelle):
            lie(o, p)      # coordonnées monde = locales à la hanche (le pivot est à (sx*.09, 0, .95) : on décale)
        for o in (cuisse, mollet, genou, pied, semelle): o.location += Vector((sx * .1, 0, .95))
    # bras (pivot à l'épaule)
    for nm, sx in (('g', -1), ('d', 1)):
        p = pivot('bras_' + nm, (sx * .27, 0, 1.46), racine)
        bras = limb('bras', (0, 0, 0), (0, 0, -.29), .052, .043, M['vetement1'], seg=12); av = limb('avant_bras', (0, 0, -.29), (0, -.02, -.56), .043, .035, M['peau'], seg=12)
        coude = sphere('coude', .045, loc=(0, 0, -.29), mat_=M['vetement1'], seg=10, rings=6); main = sphere('main', 1, loc=(0, -.025, -.6), scale=(.04, .045, .06), mat_=M['peau'], seg=10, rings=6)
        for o in (bras, av, coude, main): lie(o, p); o.location += Vector((sx * .27, 0, 1.46))
    return racine

# ------------------------------------------------------------------------------------------------ cycliste
def cycliste():
    reset(); M = M_extra(palette()); racine = empty('cycliste'); R = .34
    # cadre : tubes (avant = -Y)
    P = {'boite': (0, .03, .33), 'selle': (0, .2, .93), 'direction': (0, -.38, .84), 'moyeu_ar': (0, .5, R), 'moyeu_av': (0, -.5, R)}
    tubes = [(P['boite'], P['selle']), (P['boite'], P['direction']), (P['selle'], P['direction']), (P['boite'], P['moyeu_ar']), (P['selle'], P['moyeu_ar']), (P['direction'], P['moyeu_av'])]
    for i, (a, b) in enumerate(tubes): lie(tube('cadre', [a, b], .018, M['cadre'], seg=10), racine)
    lie(tube('tige_selle', [P['selle'], (0, .22, 1.0)], .012, M['metal']), racine)
    lie(box('selle', (.13, .26, .05), loc=(0, .24, 1.03), mat_=M['plastique'], bevel_w=.02), racine)
    lie(tube('potence', [P['direction'], (0, -.4, .95), (0, -.43, .97)], .015, M['metal']), racine)
    lie(tube('guidon', [(-.24, -.46, .99), (-.2, -.43, .97), (.2, -.43, .97), (.24, -.46, .99)], .013, M['metal']), racine)
    for sx in (-1, 1):
        lie(tube('fourche', [(sx * .035, -.38, .84), (sx * .045, -.5, R)], .013, M['metal']), racine)
        lie(tube('hauban', [(sx * .03, .22, .93), (sx * .06, .5, R)], .01, M['cadre']), racine)
        lie(tube('base', [(sx * .03, .03, .33), (sx * .06, .5, R)], .01, M['cadre']), racine)
    # roues (pivots)
    for nm, y in (('av', -.5), ('ar', .5)):
        p = pivot('roue_' + nm, (0, y, R), racine)
        pn = revolve('pneu', [(R - .03, -.017), (R - .005, -.022), (R + .005, -.012), (R + .008, 0), (R + .005, .012), (R - .005, .022), (R - .03, .017)], axis='X', seg=64, mats=[M['pneu_velo']], mat_index=0); lie(pn, p, False)
        jt = revolve('jante', [(R - .035, -.01), (R - .05, 0), (R - .035, .01)], axis='X', seg=64, mats=[M['jante']], mat_index=0); lie(jt, p, False)
        moy = cylinder('moyeu', .02, .1, axis='X', mat_=M['metal'], seg=12); lie(moy, p, False)
        for k in range(16):
            a = k * math.pi / 8; r = R - .04
            sp = tube('rayon', [(.014 * (1 if k % 2 else -1), math.cos(a) * .02, math.sin(a) * .02), (0, math.cos(a) * r, math.sin(a) * r)], .0022, M['metal'], seg=4, caps=False); lie(sp, p, False)
    # pédalier
    ped = pivot('pedalier', (0, .03, .33), racine)
    lie(tube('manivelle', [(-.09, 0, 0), (-.09, 0, 0)], .001), ped, False)
    m1 = tube('manivelle_g', [(-.085, 0, 0), (-.085, .0, -.17)], .012, M['metal']); m2 = tube('manivelle_d', [(.085, 0, 0), (.085, 0, .17)], .012, M['metal'])
    for o in (m1, m2): lie(o, ped, False)
    for (x, z) in ((-.1, -.17), (.1, .17)): lie(box('pedale', (.09, .1, .025), loc=(x, 0, z), mat_=M['plastique'], bevel_w=.008), ped, False)
    chaine = sphere('plateau', 1, loc=(.05, .03, .33), scale=(.005, .09, .09), mat_=M['metal'], seg=24, rings=2); lie(chaine, racine)
    # cycliste penché vers l'avant (assis sur la selle à y=.24, mains au guidon)
    bassin = sphere('bassin', 1, loc=(0, .24, 1.08), scale=(.16, .12, .1), mat_=M['vetement2'], seg=20, rings=12)
    torse = sphere('torse', 1, loc=(0, .0, 1.3), scale=(.18, .27, .14), mat_=M['vetement1'], seg=28, rings=16); torse.rotation_euler = (math.radians(-38), 0, 0); torse.location = (0, .0, 1.3)
    cou = limb('cou', (0, -.19, 1.44), (0, -.24, 1.53), .045, .042, M['peau']); tete = sphere('tete', 1, loc=(0, -.29, 1.58), scale=(.092, .105, .11), mat_=M['peau'], seg=24, rings=14)
    casque = sphere('casque', 1, loc=(0, -.285, 1.615), scale=(.105, .125, .09), mat_=M['jante'], seg=28, rings=14)
    visiere = box('visiere', (.14, .07, .015), loc=(0, -.375, 1.6), mat_=M['plastique'], bevel_w=.006); visiere.rotation_euler = (math.radians(20), 0, 0)
    for o in (bassin, torse, cou, tete, casque, visiere): lie(o, racine)
    for sx in (-1, 1):
        epaule = Vector((sx * .2, -.12, 1.4)); coude = Vector((sx * .22, -.28, 1.2)); main = Vector((sx * .22, -.43, .98))
        lie(limb('bras', epaule, coude, .05, .04, M['vetement1']), racine); lie(limb('avant_bras', coude, main, .04, .032, M['peau']), racine)
        hanche = Vector((sx * .1, .24, 1.06)); genou = Vector((sx * .105, -.12 if sx < 0 else .05, .8 if sx < 0 else .66)); pied = Vector((sx * .1, .03, .5 if sx < 0 else .16))
        genou = Vector((sx * .105, -.08, .86)) if sx < 0 else Vector((sx * .105, -.1, .68)); pied = Vector((sx * .1, 0.03, .16)) if sx > 0 else Vector((sx * .1, 0.03, .5))
        if sx < 0: pied = Vector((sx * .1, -.01, .5)); genou = Vector((sx * .105, -.22, .93))
        lie(limb('cuisse', hanche, genou, .08, .06, M['vetement2']), racine); lie(limb('mollet', genou, pied, .058, .04, M['peau']), racine)
        lie(box('chaussure', (.09, .24, .07), loc=pied + Vector((0, -.03, -.03)), mat_=M['chaussure'], bevel_w=.02), racine)
    sac = box('sac', (.24, .16, .28), loc=(0, .08, 1.38), mat_=M['sac'], bevel_w=.04); sac.rotation_euler = (math.radians(-38), 0, 0); lie(sac, racine)
    return racine

# ------------------------------------------------------------------------------------------------ quadrupèdes
def quadrupede(nom, P):
    reset(); M = M_extra(palette()); racine = empty(nom)
    cor, cla = M[P['pelage']], M.get(P.get('ventre', P['pelage']), M[P['pelage']])
    hb = P['haut_corps']; Lc = P['long']
    T = [0, .1, .26, .45, .62, .78, .92, 1.0]
    W = [.50, .88, 1.0, .98, .92, .96, .84, .5]; TOP = [.55, .92, 1.0, .96, .95, 1.0, .9, .6]; BAS = [.15, .72, .98, .9, .7, .62, .45, .2]
    def interpl(arr, t):
        for i in range(len(T) - 1):
            if T[i] <= t <= T[i + 1]:
                u = (t - T[i]) / (T[i + 1] - T[i]); u = u * u * (3 - 2 * u); return arr[i] + (arr[i + 1] - arr[i]) * u
        return arr[-1]
    def anneau(t):
        y = -Lc * 1.02 + t * Lc * 2.04; w = P['larg'] * interpl(W, t); zt = hb + P['haut'] * (interpl(TOP, t) - .1); zb = hb - P['haut'] * (interpl(BAS, t) + .08)
        zc, h = (zt + zb) / 2, (zt - zb) / 2
        return [(math.copysign(abs(math.cos(a)) ** (2 / 2.4), math.cos(a)) * w, y, zc + math.copysign(abs(math.sin(a)) ** (2 / 2.4), math.sin(a)) * h) for a in [2 * math.pi * k / 28 for k in range(28)]]
    corps = loft('corps', [i / 24 for i in range(25)], anneau, 28, mats=[cor], cap=True); subsurf(corps, 1)
    lie(corps, racine)
    # cou et tête (pivot « tete » à la base du cou)
    bc = Vector((0, -Lc * .88, hb + P['haut'] * .45)); sommet = bc + Vector((0, -P['cou_l'] * .7, P['cou_h']))
    lie(limb('cou', bc, sommet, P['cou_r'], P['cou_r'] * .72, cor, seg=20), racine)
    pt = pivot('tete', sommet, racine)
    crane = sphere('crane', 1, loc=(0, 0, 0), scale=(P['tete_l'] * .42, P['tete_l'] * .55, P['tete_l'] * .45), mat_=cor, seg=28, rings=16)
    museau = limb('museau', (0, -P['tete_l'] * .3, -P['tete_l'] * .05), (0, -P['tete_l'] * 1.05, -P['tete_l'] * .22), P['tete_l'] * .24, P['tete_l'] * .16, M[P.get('museau', P['pelage'])], seg=16)
    nez = sphere('nez', 1, loc=(0, -P['tete_l'] * 1.07, -P['tete_l'] * .22), scale=(P['tete_l'] * .13, P['tete_l'] * .1, P['tete_l'] * .1), mat_=M['nez'], seg=10, rings=6)
    for o in (crane, museau, nez): lie(o, pt, False)
    for sx in (-1, 1):
        lie(sphere('oeil', 1, loc=(sx * P['tete_l'] * .3, -P['tete_l'] * .22, P['tete_l'] * .12), scale=(.012, .014, .012), mat_=M['oeil'], seg=8, rings=6), pt, False)
        oreille = sphere('oreille', 1, loc=(sx * P['tete_l'] * .38, P['tete_l'] * .12, P['tete_l'] * .42), scale=(P['oreille'][0], P['oreille'][1], P['oreille'][2]), mat_=cor, seg=14, rings=8); oreille.rotation_euler = (math.radians(-25), math.radians(sx * 28), 0); lie(oreille, pt, False)
    if P.get('bois'):
        for sx in (-1, 1):
            base = Vector((sx * P['tete_l'] * .28, P['tete_l'] * .15, P['tete_l'] * .5))
            pts = [base, base + Vector((sx * .05, .02, .22)), base + Vector((sx * .12, .0, .4)), base + Vector((sx * .17, -.06, .6))]
            lie(tube('bois', pts, .016, M['corne'], seg=8), pt, False)
            for k, off in enumerate((.28, .45)):
                t0 = pts[1] + (pts[2] - pts[1]) * (off - .22) / .18 if off < .4 else pts[2] + (pts[3] - pts[2]) * (off - .4) / .2
                lie(tube('andouiller', [t0, t0 + Vector((sx * .04, -.1, .17))], .011, M['corne'], seg=6), pt, False)
    if P.get('cornes'):
        for sx in (-1, 1):
            base = Vector((sx * P['tete_l'] * .36, P['tete_l'] * .1, P['tete_l'] * .4))
            lie(tube('corne', [base, base + Vector((sx * .1, .0, .05)), base + Vector((sx * .14, -.02, .18))], .02, M['corne'], seg=8), pt, False)
    # pattes : pivots à l'épaule / à la hanche
    for nm, y, sx in (('av_g', -Lc * .66, -1), ('av_d', -Lc * .66, 1), ('ar_g', Lc * .6, -1), ('ar_d', Lc * .6, 1)):
        top = Vector((sx * P['larg'] * .62, y, hb - P['haut'] * .1)); p = pivot('patte_' + nm, top, racine)
        L1, L2 = P['patte'] * .52, P['patte'] * .48; gen = Vector((0, .0 if 'av' in nm else .05, -L1))
        if 'ar' in nm: gen = Vector((0, .13, -L1))
        cuisse = limb('haut', Vector((0, 0, 0)), gen, P['patte_r'] * 2.1, P['patte_r'] * .95, cor, seg=14)
        pied = Vector((0, 0.04, -L1 - L2)) if 'ar' in nm else gen + Vector((0, 0, -L2))
        bas = limb('bas', gen, pied, P['patte_r'] * .95, P['patte_r'] * .62, M[P.get('pattes_bas', P['pelage'])], seg=12)
        art = sphere('articulation', P['patte_r'] * 1.05, loc=gen, mat_=cor, seg=10, rings=6)
        sabot = limb('sabot', pied, pied + Vector((0, -.012, -.07)), P['patte_r'] * .8, P['patte_r'] * .55, M['nez'], seg=10)
        for o in (cuisse, bas, art, sabot):
            lie(o, p, False)
    # queue
    q = pivot('queue', (0, Lc * 1.0, hb + P['haut'] * .2), racine)
    lie(limb('queue', Vector((0, 0, 0)), Vector((0, P['queue'][0], P['queue'][1])), P['queue'][2], P['queue'][2] * .55, M[P.get('queue_m', P['pelage'])], seg=10), q, False)
    return racine

PARAMS = {
    'cerf': dict(pelage='pelage', ventre='pelage_clair', haut_corps=1.05, long=.78, larg=.27, haut=.34, cou_l=.35, cou_h=.5, cou_r=.12, tete_l=.3, oreille=(.04, .015, .1), bois=True, patte=.95, patte_r=.034, queue=(.07, .05, .04), museau='pelage_clair', pattes_bas='pelage_fonce'),
    'chien': dict(pelage='pelage_clair', ventre='pelage_clair', haut_corps=.42, long=.4, larg=.12, haut=.15, cou_l=.12, cou_h=.14, cou_r=.07, tete_l=.2, oreille=(.04, .015, .07), patte=.4, patte_r=.025, queue=(.2, .18, .025), museau='pelage_fonce', queue_m='pelage'),
    'vache': dict(pelage='pelage_clair', ventre='pelage_clair', haut_corps=.98, long=.95, larg=.4, haut=.46, cou_l=.35, cou_h=.2, cou_r=.17, tete_l=.38, oreille=(.07, .02, .09), cornes=True, patte=.78, patte_r=.05, queue=(.04, -.55, .018), museau='pelage_fonce', pattes_bas='pelage_clair', queue_m='pelage_fonce'),
}

def exporter(nom, constructeur, ap):
    racine = constructeur()
    n = tris(list(bpy.data.objects)); print(nom, n, 'triangles')
    if ap:
        from bl_common import preview
        preview(f'/tmp/apercu_{nom}.png', views=('3q', 'side'), target=(0, 0, 1.0 if nom != 'chien' else .4), dist=4.8 if nom not in ('chien',) else 2.4)
    export_glb(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'route', nom + '.glb')))

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('-')]; ap = 'apercu' in args
    cible = args[0] if args and args[0] != 'apercu' else 'tous'
    table = {'pieton': pieton, 'cycliste': cycliste, 'cerf': lambda: quadrupede('cerf', PARAMS['cerf']), 'chien': lambda: quadrupede('chien', PARAMS['chien']), 'vache': lambda: quadrupede('vache', PARAMS['vache'])}
    for nm in (table if cible == 'tous' else [cible]): exporter(nm, table[nm], ap)
