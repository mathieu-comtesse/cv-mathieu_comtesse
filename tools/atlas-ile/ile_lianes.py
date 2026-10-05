"""Atlas du parcours, île flottante : lianes et racines qui suivent réellement la roche.

Le volume de l'île (assets/atlas/ile.bin) est relu ; chaque brin est « posé » sur la surface : à chaque pas on cherche le sommet le plus proche
(arbre k-d) et on recolle le brin à 3 cm de la roche, selon sa normale. Trois familles sortent dans assets/atlas/ile-lianes.json :
  - lianes   : fines, accrochées sous la lèvre de terre, qui tombent en épousant la falaise (puis pendent dans le vide sous un surplomb) ;
  - racines  : épaisses, qui sortent de la couche de terre, rampent le long de la roche en s'amincissant, avec des ramifications ;
  - sorties  : racines qui jaillissent d'un creux de la roche, arquent la surface sur 0,5 à 1,5 m puis s'y renfoncent.
Chaque brin : {t: type, r: [rayon_base, rayon_fin], p: [x, y, z, ...]} (mètres du monde, arrondis au millimètre).

    python tools/atlas-ile/ile_lianes.py"""
import json, os, struct, sys
import numpy as np
from scipy.spatial import cKDTree

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

def lire_maillage(chemin):
    f = open(chemin, 'rb').read(); n = struct.unpack('<I', f[:4])[0]; h = json.loads(f[4:4 + n]); d = f[4 + n:]
    p = h['pieces'][0]; N = p['n']
    pos = np.frombuffer(d, np.int16, N * 4, p['pos'][0]).reshape(N, 4)[:, :3].astype(np.float32) / 32767 * np.array(p['demi'], np.float32) + np.array(p['centre'], np.float32)
    nor = np.frombuffer(d, np.int8, N * 4, p['nor'][0]).reshape(N, 4)[:, :3].astype(np.float32) / 127
    nor /= np.maximum(np.linalg.norm(nor, axis=1, keepdims=True), 1e-6)
    return pos, nor

def main():
    pos, nor = lire_maillage(os.path.join(RACINE, 'assets', 'atlas', 'ile.bin'))
    arbre = cKDTree(pos)
    carte = json.load(open(os.path.join(RACINE, 'assets', 'atlas', 'ile-carte.json'), encoding='utf-8'))
    bord = carte['bord']; rng = np.random.default_rng(20261005)
    UP = np.array([0, 1, 0], np.float32)

    def coller(p, rayon_max=0.4):
        d, i = arbre.query(p)
        if d > rayon_max: return None, None
        return pos[i] + nor[i] * 0.03, nor[i]

    def descente(p0, pas, n, derive, rayon_max=0.4, gravite=1.0):
        """Brin qui descend le long de la roche. Retourne la liste de points."""
        pts = [p0.copy()]; p = p0.copy(); lat = derive
        for k in range(n):
            q = p + np.array([0, -pas * gravite, 0], np.float32) + lat * pas * 0.55 + rng.normal(0, pas * 0.12, 3).astype(np.float32) * np.array([1, 0.2, 1], np.float32)
            s, nn = coller(q, rayon_max)
            if s is not None and nn[1] < 0.85:
                tang = np.cross(nn, UP); lng = np.linalg.norm(tang)
                if lng > 1e-3: lat = lat * 0.85 + tang / lng * 0.3 * np.sign(np.dot(tang, lat) + 1e-6) * 0.5
                q = s
            p = q; pts.append(p.copy())
        return pts

    brins = []
    # 1. lianes sous la lèvre
    for k in range(120):
        bx, by, bz, dx, dz = bord[k]
        for rep in range(2 if k % 3 == 0 else 1):
            if rng.random() < 0.18: continue
            a0 = np.array([bx - dx * rng.uniform(0.0, 0.35) + dz * rng.uniform(-0.5, 0.5), by - rng.uniform(0.25, 0.7), bz - dz * rng.uniform(0.0, 0.35) - dx * rng.uniform(-0.5, 0.5)], np.float32)
            s, nn = coller(a0, 1.0)
            if s is None: continue
            longueur = rng.uniform(1.2, 5.2); n = int(longueur / 0.22) + 2
            pts = descente(s, 0.22, n, np.array([rng.normal(0, 0.3), 0, rng.normal(0, 0.3)], np.float32), 0.35)
            brins.append({'t': 'liane', 'r': [float(rng.uniform(0.016, 0.03)), 0.006], 'p': pts})
    # 2. grosses racines qui sortent de la terre et rampent sur la falaise
    for k in range(120):
        if rng.random() < 0.45: continue
        bx, by, bz, dx, dz = bord[k]
        a0 = np.array([bx - dx * 0.12, by - rng.uniform(0.15, 0.45), bz - dz * 0.12], np.float32)
        s, nn = coller(a0, 1.0)
        if s is None: continue
        longueur = rng.uniform(2.0, 5.5); n = int(longueur / 0.25) + 2
        tang = np.cross(nn, UP); tang = tang / max(np.linalg.norm(tang), 1e-3) * rng.choice([-1, 1]) * rng.uniform(0.4, 1.4)
        pts = descente(s, 0.25, n, tang.astype(np.float32), 0.45, gravite=rng.uniform(0.45, 0.85))
        r0 = float(rng.uniform(0.07, 0.16))
        brins.append({'t': 'racine', 'r': [r0, 0.012], 'p': pts})
        for b in range(rng.integers(1, 4)):                                            # ramifications
            i = int(rng.integers(len(pts) // 4, max(len(pts) // 4 + 1, len(pts) * 3 // 4)))
            lat = np.cross(UP, nn) * rng.choice([-1, 1]) * rng.uniform(0.6, 1.4)
            sous = descente(pts[i], 0.2, int(rng.integers(4, 9)), lat.astype(np.float32), 0.4, gravite=rng.uniform(0.3, 0.7))
            brins.append({'t': 'racine', 'r': [r0 * rng.uniform(0.3, 0.5), 0.006], 'p': sous})
    # 3. racines qui sortent de la roche : arc de 0,5 à 1,5 m posé sur la surface
    essais = 0
    while sum(1 for b in brins if b['t'] == 'sortie') < 110 and essais < 4000:
        essais += 1
        i = int(rng.integers(len(pos))); p = pos[i]
        if p[1] > -1.2 or p[1] < -11.5 or nor[i][1] > 0.35: continue
        if np.hypot(p[0] - 0.15, p[2] - 0.3) < 2.0: continue
        n0 = nor[i]; tang = np.cross(n0, UP); lng = np.linalg.norm(tang)
        if lng < 0.2: continue
        tang = tang / lng; bas = np.cross(n0, tang)                                      # tang horizontale, bas = pente de la surface
        if bas[1] > 0: bas = -bas
        d = tang * np.cos(rng.uniform(-1.1, 1.1)) + bas * np.sin(rng.uniform(-1.1, 1.1)) * 0.8
        d /= np.linalg.norm(d); L = rng.uniform(0.6, 1.8); m = 9; pts = []
        for j in range(m):
            t = j / (m - 1); q = p + d * L * t
            s, nn = coller(q, 0.5)
            base = s if s is not None else q
            arc = np.sin(np.pi * t) ** 0.8 * rng.uniform(0.07, 0.16) * (1 + L * 0.3)
            pts.append(base + (nn if nn is not None else n0) * arc - (nn if nn is not None else n0) * 0.03)
        brins.append({'t': 'sortie', 'r': [float(rng.uniform(0.04, 0.09)), 0.015], 'p': pts})
    out = []
    for b in brins:
        P = np.round(np.array(b['p'], np.float32), 3).reshape(-1).tolist()
        out.append({'t': b['t'], 'r': [round(b['r'][0], 4), round(b['r'][1], 4)], 'p': P})
    chemin = os.path.join(RACINE, 'assets', 'atlas', 'ile-lianes.json')
    json.dump(out, open(chemin, 'w'), separators=(',', ':'))
    print({t: sum(1 for b in out if b['t'] == t) for t in ('liane', 'racine', 'sortie')}, os.path.getsize(chemin), 'octets')

if __name__ == '__main__': main()
