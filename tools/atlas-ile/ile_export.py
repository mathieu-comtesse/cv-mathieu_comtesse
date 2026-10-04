"""Écriture des maillages de l'atlas au format binaire compact lu par atlas-maille.js (« MAILLE1 »).

Disposition : [u32 longueur de l'en-tête][en-tête JSON complété d'espaces à 4 octets][données alignées sur 4 octets]
 - pos   : int16 x4 (x, y, z, 0), normalisé dans la boîte englobante (précision ~0,4 mm sur 27 m) ;
 - nor   : int8  x4 (nx, ny, nz, matière) normalisé, matière = entier 0..127 ;
 - col   : uint8 x4 (r, v, b en sRGB, AO) ;
 - idx   : uint32 x3 par triangle.
Plusieurs maillages peuvent partager un fichier (rochers, fragments) : l'en-tête liste chaque pièce."""
import json, struct
import numpy as np

ZERO = bytes([0])

def _pad(b, remplissage=ZERO):
    return b + remplissage * ((-len(b)) % 4)

def ecrire(chemin, pieces):
    """pieces : liste de dicts {nom, P (N,3), N (N,3), C (N,4 uint8), T (M,3), extra?}"""
    entetes = []; blocs = []; off = 0
    for p in pieces:
        P = np.asarray(p['P'], np.float32); lo = P.min(0); hi = P.max(0)
        ctr = (lo + hi) / 2; dem = np.maximum((hi - lo) / 2, 1e-6)
        q = np.round((P - ctr) / dem * 32767).astype(np.int16)
        pos = np.zeros((len(P), 4), np.int16); pos[:, :3] = q
        nor = np.zeros((len(P), 4), np.int8); nor[:, :3] = np.clip(np.round(np.asarray(p['N']) * 127), -127, 127).astype(np.int8)
        if 'M' in p: nor[:, 3] = np.asarray(p['M'], np.int8)                  # identifiant de matière
        col = np.ascontiguousarray(np.asarray(p['C'], np.uint8))
        idx = np.asarray(p['T'], np.uint32)
        h = dict(nom=p['nom'], n=int(len(P)), tri=int(len(idx)), centre=ctr.tolist(), demi=dem.tolist(), extra=p.get('extra', {}))
        for k, a in (('pos', pos), ('nor', nor), ('col', col), ('idx', idx)):
            b = _pad(a.tobytes()); h[k] = [off, len(b)]; blocs.append(b); off += len(b)
        entetes.append(h)
    head = _pad(json.dumps(dict(version=1, pieces=entetes), separators=(',', ':')).encode('utf-8'), b' ')
    with open(chemin, 'wb') as f:
        f.write(struct.pack('<I', len(head))); f.write(head)
        for b in blocs: f.write(b)
    return sum(len(b) for b in blocs) + len(head) + 4

def srgb_vers_lineaire(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lineaire_vers_srgb(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.maximum(c, 1e-9), 1 / 2.4) - 0.055)

def hex_vers_lineaire(h):
    h = h.lstrip('#'); return srgb_vers_lineaire(np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32))
