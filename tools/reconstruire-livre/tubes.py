import json, math, sys
sys.path.insert(0, '.')
from recon import inv2, mul, pip, dist_poly

def run(src, placed_json, proj, dst):
    data = json.load(open(src)); placed = json.load(open(placed_json))
    o = proj['o']; X, Y, Zv = proj['x'], proj['y'], proj['z']
    M = [[X[0], Y[0]], [X[1], Y[1]]]; Mi = inv2(M); zh = -Zv[1]; d0 = mul(Mi, (0, zh))
    k = math.hypot(X[0], Y[0])
    xl, yl = math.hypot(*X), math.hypot(*Y)
    ang = lambda v: math.degrees(math.atan2(v[1], v[0])) % 180
    ax = {'x': ang(X), 'y': ang(Y), 'z': 90.0}
    def prism_dist(pt, pl):
        z0, z1 = pl['z0'], pl['z0'] + pl['h']
        inside = pip((pt[0], pt[1]), pl['poly'])
        dz = max(z0 - pt[2], 0, pt[2] - z1)
        dp = 0 if inside else dist_poly((pt[0], pt[1]), pl['poly'])
        return math.hypot(dp, dz)
    # paroi : le solide mince le plus haut (panneau dressé) ; face avant = y maximal de son plan
    thin = [p for p in placed if (max(q[1] for q in p['poly']) - min(q[1] for q in p['poly'])) < 6 and p['h'] > 40]
    wall = max(thin, key=lambda p: p['h']) if thin else None
    yf = max(q[1] for q in wall['poly']) if wall else None
    wx0 = min(q[0] for q in wall['poly']) if wall else 0
    wx1 = max(q[0] for q in wall['poly']) if wall else 0
    plate_top = 6.5
    out = []
    for t in data['tubes']:
        pts = [p for sub in t['body'] for p in sub]
        cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
        # axe principal (ACP)
        sxx = sum((p[0] - cx) ** 2 for p in pts); syy = sum((p[1] - cy) ** 2 for p in pts); sxy = sum((p[0] - cx) * (p[1] - cy) for p in pts)
        th = 0.5 * math.atan2(2 * sxy, sxx - syy); ux, uy = math.cos(th), math.sin(th)
        proj_a = [(p[0] - cx) * ux + (p[1] - cy) * uy for p in pts]; proj_p = [-(p[0] - cx) * uy + (p[1] - cy) * ux for p in pts]
        a0, a1 = min(proj_a), max(proj_a); w = max(proj_p) - min(proj_p)
        mid_p = (max(proj_p) + min(proj_p)) / 2
        cx += -uy * mid_p; cy += ux * mid_p
        p1 = (cx + ux * a0, cy + uy * a0); p2 = (cx + ux * a1, cy + uy * a1)
        a = math.degrees(math.atan2(p2[1] - p1[1], p2[0] - p1[0])) % 180
        best = min(ax, key=lambda kx: min(abs(a - ax[kx]), 180 - abs(a - ax[kx])))
        if min(abs(a - ax[best]), 180 - abs(a - ax[best])) > 12:
            continue
        L = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        length = L / {'x': xl, 'y': yl, 'z': zh}[best]
        # sens : p1 -> p2 dans le sens de l'axe monde
        s = (p2[0] - p1[0], p2[1] - p1[1])
        vec = {'x': X, 'y': Y, 'z': (0, -zh)}[best]
        sign = 1 if (s[0] * vec[0] + s[1] * vec[1]) > 0 else -1
        d = {'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1)}[best]
        r = max(w / 2 / k, 0.3)
        base = mul(Mi, (p1[0] - o[0], p1[1] - o[1]))
        bestz, bests = None, 1e9
        z = 0.0
        while z <= 90:
            P1 = (base[0] + d0[0] * z, base[1] + d0[1] * z, z)
            P2 = (P1[0] + sign * d[0] * length, P1[1] + sign * d[1] * length, P1[2] + sign * d[2] * length)
            if P1[2] < -0.1 or P2[2] < -0.1:
                z += 0.25; continue
            score = 0
            for P in (P1, P2):
                score += min(prism_dist(P, pl) for pl in placed)
            # pénétration le long du tube
            pen = 0
            for f in (0.25, 0.5, 0.75):
                Q = tuple(P1[i] + (P2[i] - P1[i]) * f for i in range(3))
                for pl in placed:
                    if pl['z0'] + 0.1 < Q[2] - r * 0.5 and Q[2] + r * 0.5 < pl['z0'] + pl['h'] - 0.1 and pip((Q[0], Q[1]), pl['poly']):
                        pen += 1
            score += 3 * pen
            # tuyaux de paroi : plaqués contre la face avant du panneau (centre à rayon de la face)
            if wall:
                for P in (P1, P2):
                    if wx0 - 3 < P[0] < wx1 + 3 and P[2] > plate_top + 4:
                        score += min(abs(P[1] - (yf + r)), 8) * 0.8
            if score < bests - 1e-6:
                bests, bestz = score, z
            z += 0.25
        z = bestz
        P1 = (base[0] + d0[0] * z, base[1] + d0[1] * z, z)
        P2 = (P1[0] + sign * d[0] * length, P1[1] + sign * d[1] * length, P1[2] + sign * d[2] * length)
        out.append({'i': t['i'], 'p1': P1, 'p2': P2, 'r': r, 'c': t['c'], 'score': bests})
    json.dump(out, open(dst, 'w'))
    print(len(out), 'tubes', 'score moyen', sum(o['score'] for o in out) / max(1, len(out)))

if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]), sys.argv[4])
