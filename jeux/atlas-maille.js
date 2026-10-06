/* Lecteur des maillages binaires de l'atlas (format « MAILLE1 », voir tools/atlas-ile/ile_export.py).
 *   const m = await chargerMailles('assets/atlas/ile.bin')  ->  { nom: { geo: BufferGeometry, extra } }
 * Chaque pièce : positions et normales décodées en float32, couleurs sRGB converties en linéaire (rgb) et occlusion ambiante cuite
 * (attribut `ao`, 0..1) lus depuis un seul tableau uint8 à quatre composantes ; identifiant de matière (attribut `mat`) dans la
 * quatrième composante des normales. */
import * as THREE from './three.module.js';

const S2L = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });

export async function chargerMailles(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const n = new DataView(buf).getUint32(0, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
  const base = 4 + n, out = {};
  for (const p of meta.pieces) {
    const pos = new Int16Array(buf, base + p.pos[0], p.n * 4);
    const nor = new Int8Array(buf, base + p.nor[0], p.n * 4);
    const col = new Uint8Array(buf, base + p.col[0], p.n * 4);
    const idx = new Uint32Array(buf, base + p.idx[0], p.tri * 3);
    const P = new Float32Array(p.n * 3), N = new Float32Array(p.n * 3), C = new Float32Array(p.n * 3), A = new Float32Array(p.n), M = new Float32Array(p.n);
    const [cx, cy, cz] = p.centre, [dx, dy, dz] = p.demi;
    for (let i = 0; i < p.n; i++) {
      P[i * 3] = cx + pos[i * 4] / 32767 * dx; P[i * 3 + 1] = cy + pos[i * 4 + 1] / 32767 * dy; P[i * 3 + 2] = cz + pos[i * 4 + 2] / 32767 * dz;
      N[i * 3] = nor[i * 4] / 127; N[i * 3 + 1] = nor[i * 4 + 1] / 127; N[i * 3 + 2] = nor[i * 4 + 2] / 127;
      C[i * 3] = S2L[col[i * 4]]; C[i * 3 + 1] = S2L[col[i * 4 + 1]]; C[i * 3 + 2] = S2L[col[i * 4 + 2]]; A[i] = col[i * 4 + 3] / 255; M[i] = nor[i * 4 + 3];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    geo.setAttribute('ao', new THREE.BufferAttribute(A, 1));
    geo.setAttribute('mat', new THREE.BufferAttribute(M, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    out[p.nom] = { geo, extra: p.extra || {} };
  }
  return out;
}
