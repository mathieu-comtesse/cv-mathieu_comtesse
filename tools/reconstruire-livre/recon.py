"""Reconstruit des volumes 3D depuis un SVG isométrique de la bibliothèque « anatomy » (figures du livre).
Chaque solide du SVG = anneau du dessus + silhouette (anneau étiré à la verticale). Le plan et la hauteur se déduisent de la
projection ; la position en profondeur (Z0, inconnue : tout solide glisse le long du rayon de vue sans changer l'image)
est choisie par contact : posé sur le sol / sur un solide dessous, ou appuyé contre un solide derrière."""
import json, math, sys

def inv2(m):
    (a, b), (c, d) = m
    det = a * d - b * c
    return [[d / det, -b / det], [-c / det, a / det]]

def mul(m, v):
    return (m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1])

def pip(pt, poly):
    x, y = pt
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
            inside = not inside
        j = i
    return inside

def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))

def samples(poly):
    c = centroid(poly)
    pts = [c]
    for p in poly[:: max(1, len(poly) // 12)]:
        pts.append((c[0] + (p[0] - c[0]) * 0.8, c[1] + (p[1] - c[1]) * 0.8))
    return pts

def dist_poly(pt, poly):
    best = 1e9
    n = len(poly)
    for i in range(n):
        ax, ay = poly[i]
        bx, by = poly[(i + 1) % n]
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / ((dx * dx + dy * dy) or 1e-12)))
        best = min(best, math.hypot(pt[0] - ax - t * dx, pt[1] - ay - t * dy))
    return best

def reconstruct(data, proj, zstep=0.25, zmax=90):
    o = proj['o']
    X, Y, Zv = proj['x'], proj['y'], proj['z']
    M = [[X[0], Y[0]], [X[1], Y[1]]]
    Mi = inv2(M)
    zh = -Zv[1]                      # pixels d'écran par unité de hauteur
    d0 = mul(Mi, (0, zh))            # glissement du plan par unité de Z0
    placed = []
    out = []
    for s in data['solids']:
        top = s['top'][0] if s['top'] else None
        fill = s['fill'][0]
        flat = top is None
        ring = top if top else fill
        hs = (max(p[1] for p in fill) - max(p[1] for p in ring)) if top else 0.0
        h = max(hs / zh, 0.06)
        base_screen = [(p[0], p[1] + hs) for p in ring]
        base0 = [mul(Mi, (p[0] - o[0], p[1] - o[1])) for p in base_screen]
        sm = samples(base0)

        def foot(z0):
            return [(p[0] + d0[0] * z0, p[1] + d0[1] * z0) for p in base0]

        def evaluate(z0):
            f = foot(z0)
            pts = [(q[0] + d0[0] * z0, q[1] + d0[1] * z0) for q in sm]
            pen = 0
            sup = 0
            for pt in pts:
                top_under = 0.0 if abs(z0) < 0.06 else -1
                best_support = -1
                hit = False
                for pl in placed:
                    if not pip(pt, pl['poly']):
                        continue
                    zt = pl['z0'] + pl['h']
                    if abs(zt - z0) < 0.12:
                        best_support = max(best_support, zt)
                    elif pl['z0'] < z0 + h - 0.08 and zt > z0 + 0.08:
                        hit = True
                if hit:
                    pen += 1
                if best_support >= 0 or (abs(z0) < 0.06 and len(placed) < 2):
                    sup += 1
            # contact latéral : distance minimale du pied de ce solide aux solides placés qui le recouvrent verticalement
            contact = 1e9
            for pl in placed:
                if pl['z0'] < z0 + h - 0.08 and pl['z0'] + pl['h'] > z0 + 0.08:
                    for q in f[:: max(1, len(f) // 10)]:
                        contact = min(contact, dist_poly(q, pl['poly']))
            return pen / len(pts), sup / len(pts), contact

        cands = []
        z = 0.0
        while z <= zmax:
            cands.append((z, evaluate(z)))
            z += zstep
        # 1) posé : aucune pénétration, appui ≥ 60 %
        rest = [(z, e) for z, e in cands if e[0] == 0 and e[1] >= 0.6]
        choice = None
        if rest:
            choice = min(rest, key=lambda ze: (-round(ze[1][1], 2), ze[0]))
            how = 'pose'
        else:
            # 2) appuyé : première hauteur sans pénétration après une zone de pénétration, au contact (< 0,6)
            prev_pen = False
            for z, e in cands:
                if prev_pen and e[0] == 0 and e[2] < 0.6:
                    choice = (z, e)
                    how = 'appui'
                    break
                if e[0] > 0:
                    prev_pen = True
            if choice is None:
                free = [(z, e) for z, e in cands if e[0] == 0]
                choice = min(free, key=lambda ze: ze[1][2]) if free else cands[0]
                how = 'libre'
        z0 = choice[0]
        poly = foot(z0)
        placed.append({'poly': poly, 'z0': z0, 'h': h})
        out.append({'i': s['i'], 'poly': poly, 'z0': z0, 'h': h, 'how': how, 'flat': flat,
                    'cTop': s['cTop'], 'cSide': (next((sh['c'] for sh in s['shades'][1:3] if sh), None) or (s['shades'][0] or {}).get('c') or s['cFill']), 'cFill': s['cFill'],
                    'cls': s['cls']})
    return out

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    proj = json.loads(sys.argv[3])
    data = json.load(open(src))
    res = reconstruct(data, proj)
    json.dump(res, open(dst, 'w'))
    from collections import Counter
    print(Counter(r['how'] for r in res), 'zmax', max(r['z0'] + r['h'] for r in res))
