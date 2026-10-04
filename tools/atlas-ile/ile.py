"""L'île flottante : champ de distance signée complet (plateau, lagon, lèvre de terre, socle rocheux) puis maillage.

    python tools/atlas-ile/ile.py [--res 0.1] [--sortie assets/atlas]

Géologie (ce que le champ exprime, dans l'ordre) :
  1. emprise de l'île, qui se resserre en profondeur comme une montagne inversée (rayon relatif s(y)), centre qui dérive ;
  2. strates : couches dures qui font saillie et couches tendres en retrait (profil 1D tordu par le champ de déformation) ;
  3. masses : lobes de roche, pointe profonde, stalactites, gros blocs accrochés à la falaise ;
  4. surface : prairie, colline, plate-forme, cuvette du lagon, plage (hauteur_base de ile_carte.py + relief doux) ;
  5. lèvre de terre : une couche meuble en surplomb autour de l'emprise, au bord inférieur frangé de racines ;
  6. dureté : blocs retirés (arêtes vives), corniches ajoutées, joints cellulaires et fractures en crêtes (jamais de
     simple amplitude de bruit pour « faire rocheux »).
Le résultat est un tableau F (négatif = matière) dont ile_maillage.py tire le maillage, l'AO et les couleurs."""
import sys, time, math
import numpy as np
from ile_carte import *
from ile_champ import *

PROFONDEUR = 13.4          # distance de la surface à la pointe du socle
BORNES = ((-13.5, 13.5), (-15.6, 3.6), (-11.8, 12.4))

def horloge():
    t0 = time.time()
    return lambda m: print(f'  [{time.time() - t0:5.1f} s] {m}', flush=True)

def profil_strates(graine, y0=-16.0, y1=1.0, pas=0.02):
    """Profil 1D des couches : A = dureté (+ saillie, calcaire dur ; - retrait, marne tendre), B = teinte propre à chaque
    couche (0..1). Épaisseurs de 0,25 à 1,1 m. Renvoie (ys, A, B) à interpoler avec np.interp."""
    rng = np.random.default_rng(graine)
    ys = np.arange(y0, y1, pas, dtype=np.float32); A = np.zeros_like(ys); B = np.zeros_like(ys)
    y = y1; dur = True
    while y > y0:
        ep = rng.uniform(0.25, 1.1) * (1.3 if dur else 0.8)
        m = (ys <= y) & (ys > y - ep)
        A[m] = rng.uniform(0.6, 1.0) if dur else rng.uniform(-1.0, -0.35)
        B[m] = rng.random()
        y -= ep; dur = not dur if rng.random() < 0.8 else dur
    k = np.ones(9, np.float32) / 9                              # biseau des corniches
    lis = lambda v: np.convolve(np.pad(v, 4, mode='edge'), k, mode='valid').astype(np.float32)
    return ys, lis(A), B


def s_prof(y):
    """Rayon relatif de l'emprise à la profondeur y (scalaire ou tableau) : mêmes formules que dans le champ."""
    t = np.clip((-np.asarray(y, np.float32) - 0.4) / (PROFONDEUR - 0.4), 0, 1)
    return np.maximum(((1 - t ** 1.55) ** 0.9) * (1 - 0.05 * t), 0.045)

def centre_y(y):
    t = np.clip((-np.asarray(y, np.float32) - 0.4) / (PROFONDEUR - 0.4), 0, 1)
    return CENTRE[0] + 0.9 * t ** 1.3, CENTRE[1] - 1.0 * t ** 1.2

def point_falaise(a, y):
    """Point de la falaise à l'azimut a (rad, repère de l'emprise) et à l'altitude y."""
    R = rayon_emprise(a); s = s_prof(y); cx, cz = centre_y(y)
    return np.array([cx + ETIRE[0] * R * math.cos(a) * s, y, cz + ETIRE[1] * R * math.sin(a) * s], np.float32)

def champ(res=0.1, graine=7, log=print):
    g = Grille(BORNES, res)
    log(f'grille {g.n[0]}x{g.n[1]}x{g.n[2]} = {np.prod(g.n) / 1e6:.1f} M échantillons, pas {res} (plus petite longueur d’onde nette : {3 * res:.2f})')
    X, Y, Z = g.x, g.y, g.z
    rng = np.random.default_rng(graine)

    # ------------------------------------------------------------------ 1. déformation lente (grandes ondes)
    w1 = bruit(g, 7.0, 0.5, graine + 1); w2 = bruit(g, 5.5, 0.5, graine + 2); w3 = bruit(g, 6.0, 0.5, graine + 3)
    log('déformation')
    prof = np.clip((-Y - 0.3) / PROFONDEUR, 0, 1)                      # 0 en haut, 1 à la pointe
    amp = 0.25 + 0.9 * prof                                           # la roche profonde est plus tourmentée
    # ------------------------------------------------------------------ 2. rayon relatif s(y) et strates
    ys, A, B = profil_strates(graine)
    yw = Y + 0.55 * w3
    strate = np.interp(yw, ys, A).astype(np.float32)
    t = np.clip((-Y - 0.4) / (PROFONDEUR - 0.4), 0, 1)
    s = ((1 - t ** 1.55) ** 0.9) * (1 - 0.05 * t)                      # montagne inversée, haut de falaise presque vertical
    s = np.maximum(s, 0.045)
    dx = 0.9 * t ** 1.3 * 1.0; dz = -1.0 * t ** 1.2                    # la pointe dérive
    cx = CENTRE[0] + dx; cz = CENTRE[1] + dz
    xs = cx + (X - cx + amp * w1 * 0.55) / s
    zs = cz + (Z - cz + amp * w2 * 0.55) / s
    F_out = dist_emprise(xs, zs) * s - 0.30 * strate * lisse(0.0, 0.12, t)     # les couches dures saillent de 30 cm
    del w1, w2
    log('emprise et strates')

    # ------------------------------------------------------------------ 3. masses
    F = F_out + 0.62 * lisse(-0.6, -1.6, Y)                    # corps en retrait sous la lèvre : les blocs de la falaise font saillie
    # gros lobes de roche accrochés sous l'île (position en polaire autour du centre)
    lobes = []
    for i in range(7):
        a = rng.uniform(0, 2 * math.pi); d = rng.uniform(2.0, 5.5); yy = rng.uniform(-9.5, -1.8)
        rr = rng.uniform(1.5, 3.1) * (1 - 0.35 * (-yy / 10))
        lobes.append(((CENTRE[0] + math.cos(a) * d * ETIRE[0] * (1 - (-yy) / 17), yy, CENTRE[1] + math.sin(a) * d * ETIRE[1] * (1 - (-yy) / 17)),
                      (rr * rng.uniform(0.9, 1.5), rr * rng.uniform(0.7, 1.1), rr * rng.uniform(0.9, 1.5)), rng.uniform(0, 6.28)))
    for c, r, ang in lobes:
        r0 = sous_grille(g, c, max(r) + 1.2)
        if r0 is None: continue
        sl, v = r0
        d = ellipsoide(v, c, r, ang)
        # facettes : le bloc est taillé par 4 à 6 plans, ce qui donne des arêtes vives et des faces planes
        for _ in range(int(rng.integers(4, 7))):
            nrm = rng.normal(size=3); nrm /= np.linalg.norm(nrm)
            off = rng.uniform(0.45, 0.8) * min(r)
            d = smax(d, (v.x - c[0]) * nrm[0] + (v.y - c[1]) * nrm[1] + (v.z - c[2]) * nrm[2] - off, 0.06)
        F[sl] = smin(F[sl], d, 0.55)
    # la pointe : une colonne de roche qui s'effile
    p0 = (CENTRE[0] + 0.6, -2.5, CENTRE[1] - 0.6); p1 = (CENTRE[0] + 1.7, -PROFONDEUR - 0.9, CENTRE[1] - 1.6)
    r0 = sous_grille(g, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), 8.0)
    sl, v = r0
    F[sl] = smin(F[sl], capsule_conique(v, p0, p1, 2.6, 0.12), 1.2)
    # stalactites : racines de roche qui prennent naissance SUR la falaise et pendent vers le vide
    for i in range(26):
        a = rng.uniform(0, 2 * math.pi); yt = -rng.uniform(1.6, 8.5)
        base = point_falaise(a, yt) + np.array([math.cos(a), 0, math.sin(a)], np.float32) * -0.35
        long = rng.uniform(1.6, 5.2) * (1.15 - 0.5 * (-yt) / 13)
        tip = base + np.array([math.cos(a) * rng.uniform(0.0, 0.5), -long, math.sin(a) * rng.uniform(0.0, 0.5)], np.float32)
        c = (base + tip) / 2
        r0 = sous_grille(g, c, long / 2 + 1.5)
        if r0 is None: continue
        sl, v = r0
        F[sl] = smin(F[sl], capsule_conique(v, base, tip, rng.uniform(0.75, 1.35), 0.05), 0.5)
    # ------------------------------------------------------------------ blocs de falaise (couches de grès empilées)
    # Chaque couche est une ronde de blocs à faces planes (boîtes à arêtes un peu arrondies, coins coupés par des plans) posés
    # en quinconce autour de la falaise : c'est ce qui donne les arêtes vives, les surplombs et les joints.
    couches = []
    y = -0.95
    while y > -PROFONDEUR + 1.0:
        couches.append(y); y -= rng.uniform(0.85, 1.45)
    nb = 0
    for j, yc in enumerate(couches):
        sy_ = float(s_prof(yc)); R = 9.6 * 0.5 * (ETIRE[0] + ETIRE[1])
        n = max(4, int(2 * math.pi * R * sy_ / 2.15))
        deca = rng.uniform(0, 2 * math.pi)
        for k in range(n):
            a = deca + (k + rng.uniform(-0.28, 0.28)) / n * 2 * math.pi
            y_ = yc + rng.uniform(-0.18, 0.18)
            p = point_falaise(a, y_)
            nrm = gradient(F_out, g, p[None], 0.3)[0]; nrm[1] *= 0.55; nrm /= max(np.linalg.norm(nrm), 1e-6)
            tg = np.cross([0, 1, 0], nrm); tg /= max(np.linalg.norm(tg), 1e-6)
            up = np.cross(nrm, tg)
            lar = 2 * math.pi * R * sy_ / n
            demi = (np.clip(lar * rng.uniform(0.55, 0.8), 0.55, 2.4), rng.uniform(0.38, 0.75), rng.uniform(0.7, 1.35))
            yaw = rng.uniform(-0.45, 0.45); ca, sa = math.cos(yaw), math.sin(yaw)
            ex = tg * ca + nrm * sa; ez = nrm * ca - tg * sa
            ey = up + rng.normal(size=3) * 0.05; ey /= np.linalg.norm(ey)
            c = p - nrm * demi[2] * rng.uniform(0.35, 0.8) + tg * rng.uniform(-0.2, 0.2)
            rad = max(demi) + 0.7
            r0 = sous_grille(g, c, rad)
            if r0 is None: continue
            sl, v = r0
            d, (ux, uy, uz) = boite_axes(v, c, ex, ey, ez, demi, rng.uniform(0.06, 0.22))
            for _ in range(int(rng.integers(1, 3))):                                   # coins cassés
                m = rng.normal(size=3); m /= np.linalg.norm(m)
                dm = ux * m[0] + uy * m[1] + uz * m[2] - rng.uniform(0.55, 0.95) * math.sqrt(demi[0] ** 2 + demi[1] ** 2 + demi[2] ** 2)
                d = smax(d, dm, 0.05)
            F[sl] = smin(F[sl], d, 0.11); nb += 1
    log(f'blocs de falaise : {nb} sur {len(couches)} couches')
    log('masses : lobes, pointe, stalactites')

    # ------------------------------------------------------------------ 4. surface
    x2 = X[:, 0, :]; z2 = Z[:, 0, :]
    H = hauteur_base(x2, z2).astype(np.float32).reshape(g.n[0], 1, g.n[2])
    n_gd = bruit2d(g, 4.5, 0.6, graine + 11); n_md = bruit2d(g, 1.5, 0.5, graine + 12); n_pt = bruit2d(g, 0.55, 0.5, graine + 13)
    # la prairie ondule doucement, le sable fait des rides ; le fond du lagon reste lisse
    fl = forme_lagon(x2, z2).reshape(g.n[0], 1, g.n[2]).astype(np.float32)
    terre = lisse(-0.2, 0.9, fl)
    H = H + terre * (0.10 * n_gd + 0.035 * n_md + 0.008 * n_pt) + (1 - terre) * 0.025 * n_md
    gy, gx_ = np.gradient(H[:, 0, :], res, res)
    inv = (1 / np.sqrt(1 + gx_ * gx_ + gy * gy)).reshape(g.n[0], 1, g.n[2]).astype(np.float32)
    F_top = (Y - H) * inv
    log('surface')

    # ------------------------------------------------------------------ 5. lèvre de terre (surplomb frangé)
    n_dr = bruit2d(g, 0.7, 0.5, graine + 14); n_dr2 = bruit2d(g, 2.2, 0.5, graine + 15)
    bas = -0.85 - 0.45 * n_dr2 - 0.55 * np.maximum(n_dr, 0) ** 2            # racines et gouttes de terre
    F_sol = smax(F_out - (0.22 + 0.07 * n_dr2), bas - Y, 0.08)
    F = np.minimum(F, F_sol)
    del n_dr, n_dr2

    # ------------------------------------------------------------------ 5b. colonnes de basalte (secteur avant-gauche) et arches
    cote = 0.64
    th_c = 2.35; larg = 0.62                                              # azimut du secteur (rad) et demi-largeur
    ang = np.arctan2((Z - CENTRE[1]) / ETIRE[1], (X - CENTRE[0]) / ETIRE[0])
    dang = np.abs(np.arctan2(np.sin(ang - th_c), np.cos(ang - th_c)))
    w_sec = lisse(larg, larg * 0.55, dang) * lisse(-0.9, -1.8, Y) * lisse(-8.2, -6.4, Y)
    del ang, dang
    # réseau hexagonal (pointes vers +z) : conversion axiale puis arrondi cubique
    q_ = (math.sqrt(3) / 3 * X - Z / 3) / cote; r_ = (2 / 3 * Z) / cote
    xq = q_; zq = r_; yq = -xq - zq
    rx = np.round(xq); ry = np.round(yq); rz = np.round(zq)
    dx_ = np.abs(rx - xq); dy_ = np.abs(ry - yq); dz_ = np.abs(rz - zq)
    fix_x = (dx_ > dy_) & (dx_ > dz_); fix_y = (~fix_x) & (dy_ > dz_)
    rx = np.where(fix_x, -ry - rz, rx); rz = np.where(~fix_x & ~fix_y, -rx - ry, rz)
    ccx = cote * math.sqrt(3) * (rx + rz / 2); ccz = cote * 1.5 * rz          # centre de la colonne
    px = X - ccx; pz = Z - ccz
    d_hex = np.maximum.reduce([np.abs(px * math.cos(a_) + pz * math.sin(a_)) for a_ in (0, math.pi / 3, 2 * math.pi / 3)]) - cote * 0.866 + 0.015
    ix = np.clip(np.round((ccx - g.o[0]) / res).astype(np.int32), 0, g.n[0] - 1); iz = np.clip(np.round((ccz - g.o[2]) / res).astype(np.int32), 0, g.n[2] - 1)
    iyy = np.arange(g.n[1], dtype=np.int32).reshape(1, g.n[1], 1)
    Fc = F[ix, iyy, iz]                                                       # le champ au centre de chaque colonne
    haz = np.sin(rx * 12.9898 + rz * 78.233) * 43758.5453; haz = haz - np.floor(haz)
    F_col = np.maximum(d_hex, Fc + 0.55 * (haz - 0.5) + 0.12)
    F = np.where(w_sec > 0.02, F + w_sec * (F_col - F), F).astype(np.float32)
    del q_, r_, xq, zq, yq, rx, ry, rz, dx_, dy_, dz_, ccx, ccz, px, pz, d_hex, ix, iz, Fc, haz, F_col, w_sec
    log('colonnes de basalte')
    # arches et grottes : tunnels de roche retirés près de la pointe et en façade
    for (a0, a1, yy, ra) in ((3.9, 4.6, -6.6, 1.15), (0.6, 1.3, -4.4, 0.95)):
        p0 = point_falaise(a0, yy) + np.array([math.cos(a0), 0, math.sin(a0)], np.float32) * 0.5
        p1 = point_falaise(a1, yy - 0.5) + np.array([math.cos(a1), 0, math.sin(a1)], np.float32) * 0.5
        c = (p0 + p1) / 2
        r0 = sous_grille(g, c, np.linalg.norm(p1 - p0) / 2 + ra + 1.2)
        sl, v = r0
        F[sl] = smax(F[sl], -capsule_conique(v, p0, p1, ra, ra), 0.18)
    # rainure des chutes d'eau : l'eau a creusé un couloir sur la falaise, du seuil jusqu'au vide
    for (cx_, cz_) in CHUTES:
        a_ = math.atan2((cz_ - CENTRE[1]) / ETIRE[1], (cx_ - CENTRE[0]) / ETIRE[0])
        for yy in np.linspace(0.0, -7.0, 22):
            pf = point_falaise(a_, float(yy))
            r0 = sous_grille(g, pf, 1.4)
            if r0 is None: continue
            sl, v = r0
            F[sl] = smax(F[sl], -ellipsoide(v, pf + np.array([math.cos(a_), 0, math.sin(a_)], np.float32) * 0.1, (0.55, 0.5, 0.55)), 0.2)
    log('arches et rainures')
    ctx_sol = F_sol

    # coupe par la surface : tout ce qui est au-dessus du relief disparaît
    F = smax(F, F_top, 0.14)
    log('lèvre de terre, coupe')

    # ------------------------------------------------------------------ 6. dureté : blocs retirés et corniches
    # points candidats sur la falaise (surface de F à peu près, sous la lèvre de terre)
    bande = (np.abs(F) < 0.12) & (Y < -1.2) & (Y > -12.5) & (np.abs(F_out) < 1.2)     # la falaise seulement, pas le fond du lagon
    pts = np.argwhere(bande)
    if len(pts) == 0: raise SystemExit('pas de falaise')
    sel = pts[rng.choice(len(pts), size=min(len(pts), 420), replace=False)]
    cand = (sel * res + g.o).astype(np.float32)
    # direction vers l'extérieur de l'île (horizontal) en ce point, pour enfoncer le bloc dans la paroi
    nb_cut = 0
    for c in cand[:150]:
        out = np.array([c[0] - CENTRE[0], 0, c[2] - CENTRE[1]], np.float32); out /= max(np.linalg.norm(out), 1e-3)
        sz = rng.uniform(0.45, 1.3)
        pos = c + out * sz * 0.35
        r0 = sous_grille(g, pos, sz * 1.8)
        if r0 is None: continue
        sl, v = r0
        bx = boite_orientee(v, pos, (sz * rng.uniform(0.7, 1.4), sz * rng.uniform(0.4, 0.9), sz * rng.uniform(0.7, 1.4)), rng.uniform(-.5, .5), rng.uniform(0, 3.1), rng.uniform(-.5, .5), 0.02)
        F[sl] = smax(F[sl], -bx, 0.03); nb_cut += 1
    # corniches : dalles minces qui saillent dans les couches dures
    nb_led = 0
    for c in cand[150:]:
        if rng.random() < 0.45: continue
        out = np.array([c[0] - CENTRE[0], 0, c[2] - CENTRE[1]], np.float32); out /= max(np.linalg.norm(out), 1e-3)
        L = rng.uniform(1.0, 2.6); D = rng.uniform(0.5, 1.1); T = rng.uniform(0.07, 0.17)
        pos = c + out * D * 0.4
        r0 = sous_grille(g, pos, L + 0.6)
        if r0 is None: continue
        sl, v = r0
        ang = math.atan2(out[0], out[2])
        bx = boite_orientee(v, pos, (L / 2, T, D / 2), 0.0, ang, rng.uniform(-.12, .12), 0.03)
        # la corniche ne doit pas sortir du ciel de l'île ni dépasser la lèvre de terre
        F[sl] = smin(F[sl], smax(bx, F_top[sl], 0.02), 0.06); nb_led += 1
    log(f'dureté : {nb_cut} blocs retirés, {nb_led} corniches')

    # ------------------------------------------------------------------ 7. relief de la roche : fractures, joints, bosses
    # poids : la roche sous la lèvre de terre est tourmentée, la prairie et le sable restent lisses
    wr = (lisse(-0.55, -1.6, Y) * lisse(2.0, 0.8, -F_out)).astype(np.float32)             # relief de roche : sous la lèvre ET près du contour (pas sur le fond du lagon)
    bosse = bruit(g, 3.8, 0.5, graine + 21)
    F = F - wr * 0.07 * bosse * (0.5 + 0.5 * prof); del bosse
    crete = bruit(g, 2.0, 0.45, graine + 22, ridge=True)
    F = F + wr * 0.30 * lisse(0.66, 1.0, crete); del crete               # fractures : crêtes ôtées
    mid = bruit(g, 0.9, 0.5, graine + 23)
    F = F + wr * 0.045 * mid; del mid                                    # grain de la roche (≥ 3 pas)
    # facettes : la roche devient polyédrique (plans de Voronoï à deux échelles), sauf sous la lèvre de terre
    F = facettes(g, F, wr, 2.7, 16.0, 0.85, graine + 41, bande=1.5); log('facettes 2.7')
    F = facettes(g, F, wr, 1.25, 11.0, 0.7, graine + 42, bande=0.9); log('facettes 1.25')
    # joints cellulaires : blocs de maçonnerie naturelle
    from scipy.spatial import cKDTree
    boite = np.array([[g.o[i] - 1, g.o[i] + g.n[i] * res + 1] for i in range(3)])
    for lam, amp_j, amp_c, seed in ((2.6, 0.17, 0.10, 31), (1.15, 0.09, 0.06, 32)):
        npts = int(np.prod(boite[:, 1] - boite[:, 0]) / lam ** 3 * 1.1)
        r2 = np.random.default_rng(graine + seed)
        P = r2.uniform(boite[:, 0], boite[:, 1], size=(npts, 3)).astype(np.float32)
        tree = cKDTree(P)
        masque = (np.abs(F) < 0.5) & (wr > 0.05)
        ii = np.nonzero(masque)
        Q = np.stack([ii[0] * res + g.o[0], ii[1] * res + g.o[1], ii[2] * res + g.o[2]], 1).astype(np.float32)
        # le motif cellulaire est tordu par un bruit lent pour ne pas être cristallin
        Qw = Q + 0.35 * lam * np.stack([w3[ii], np.roll(w3, 7, 0)[ii], np.roll(w3, 13, 1)[ii]], 1) * 0.5
        d, k = tree.query(Qw, k=2, workers=-1)
        joint = 1 - lisse(0.0, 0.16 * lam ** 0.5, d[:, 1] - d[:, 0])       # 1 le long des joints
        cell = (np.sin(k[:, 0] * 12.9898 + 78.233 * seed) * 43758.5453) % 1.0    # décalage par bloc
        F[ii] = F[ii] + wr[ii] * (amp_j * joint + amp_c * (cell - 0.5))
        log(f'joints λ={lam} : {len(Q) / 1e6:.2f} M échantillons')
    # le tout dernier : un peu de bruit fin sur la lèvre de terre (mottes)
    F = F.astype(np.float32)
    log('relief')
    return g, F, dict(H=H, F_out=F_out, F_sol=ctx_sol, w3=w3, strate=(ys, A, B), prof=prof)
