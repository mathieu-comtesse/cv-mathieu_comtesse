/* ATLAS · DÉCOR : place la flore sur l'île selon des règles (hauteur, pente, distance à l'eau, aux chemins et aux bâtiments), toujours
 * de la même façon (graine fixe). Un arbre = deux InstancedMesh (écorce, feuillage) qui partagent les mêmes matrices.
 *
 *   const decor = peupler({ carte, flore, ciel })   ->  { groupe, mises à jour: tick(dt, t) }                                          */
import * as THREE from './three.module.js';
import { aleatoire } from './atlas-flore.js';

/* distance (en unités) de chaque cellule de la carte à l'eau du lagon : deux passes de chanfrein */
function champDistanceEau(carte) {
  const { nx, nz, res, eauU8 } = carte, D = new Float32Array(nx * nz).fill(1e3);
  for (let i = 0; i < nx * nz; i++) if (eauU8[i] > 0) D[i] = 0;
  const r2 = res * Math.SQRT2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { let d = D[i * nz + j];
    if (i > 0) d = Math.min(d, D[(i - 1) * nz + j] + res); if (j > 0) d = Math.min(d, D[i * nz + j - 1] + res);
    if (i > 0 && j > 0) d = Math.min(d, D[(i - 1) * nz + j - 1] + r2); if (i > 0 && j < nz - 1) d = Math.min(d, D[(i - 1) * nz + j + 1] + r2); D[i * nz + j] = d; }
  for (let i = nx - 1; i >= 0; i--) for (let j = nz - 1; j >= 0; j--) { let d = D[i * nz + j];
    if (i < nx - 1) d = Math.min(d, D[(i + 1) * nz + j] + res); if (j < nz - 1) d = Math.min(d, D[i * nz + j + 1] + res);
    if (i < nx - 1 && j < nz - 1) d = Math.min(d, D[(i + 1) * nz + j + 1] + r2); if (i < nx - 1 && j > 0) d = Math.min(d, D[(i + 1) * nz + j - 1] + r2); D[i * nz + j] = d; }
  return (x, z) => { const i = Math.round((x - carte.x0) / res), j = Math.round((z - carte.z0) / res); return i < 0 || j < 0 || i >= nx || j >= nz ? 1e3 : D[i * nz + j]; };
}
const distSegment = (x, z, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz + 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / L2)); return Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)); };

const ECH = 0.55;                                          // les végétaux sont à l'échelle des bâtiments (2-3 m), pas de l'île

export function peupler({ carte, flore, ciel, densite = 1 }) {
  const meta = carte.meta, rng = aleatoire(20261004), groupe = new THREE.Group();
  const distEau = champDistanceEau(carte); carte.distEau = distEau;
  const segs = []; for (const ch of meta.chemins) for (let i = 0; i < ch.length - 1; i++) segs.push([ch[i], ch[i + 1]]);
  const distChemin = (x, z) => { let d = 1e3; for (const s of segs) d = Math.min(d, distSegment(x, z, s[0], s[1])); return d; };
  carte.distChemin = distChemin;
  const bats = Object.values(meta.batiments);
  const voie = meta.voie, pont = meta.pont, ponton = meta.ponton;
  /* l'endroit est-il libre de bâtiment, de pont, de voie ferrée ? marge en unités */
  const libre = (x, z, marge = 0.5) => {
    for (const b of bats) if (Math.hypot(x - b.pos[0], z - b.pos[1]) < b.r + marge) return false;
    if (distSegment(x, z, pont.a, pont.b) < 0.9 + marge) return false;
    if (distSegment(x, z, ponton.a, ponton.b) < 1.2 + marge) return false;
    const ex = (x - voie.c[0]) / (voie.rx + 0.7 + marge), ez = (z - voie.c[1]) / (voie.rz + 0.7 + marge); if (ex * ex + ez * ez < 1) return false;
    return true;
  };
  const pts = new Map();                                   // grille de rejet : pas deux végétaux trop proches (par famille)
  const prise = (fam, x, z, d) => { const k = fam; if (!pts.has(k)) pts.set(k, []); for (const p of pts.get(k)) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < d * d) return false; pts.get(k).push([x, z]); return true; };

  const lots = new Map();                                  // (type:variante) -> matrices
  const poser = (type, variante, x, z, echelle, yaw, pitch = 0) => {
    const y = carte.hauteur(x, z); if (y < -20) return;
    const k = type + ':' + variante; if (!lots.has(k)) lots.set(k, { type, variante, m: [] });
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.03, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')), new THREE.Vector3(echelle * ECH, echelle * ECH * (0.9 + rng() * 0.25), echelle * ECH));
    lots.get(k).m.push(m);
  };
  const nv = 4;                                            // variantes de forme par espèce
  const choisir = () => 1 + ((rng() * nv) | 0);

  const essais = (n, f) => { for (let i = 0; i < n; i++) f(); };
  const aleaIle = () => { for (let k = 0; k < 40; k++) { const x = carte.x0 + 2 + rng() * (carte.nx * carte.res - 4), z = carte.z0 + 2 + rng() * (carte.nz * carte.res - 4); const h = carte.hauteur(x, z); if (h > -20) return [x, z, h]; } return [0, 0, 0]; };
  const bordRive = (x, z) => { // direction de l'eau la plus proche
    let best = null, bd = 1e9; for (let a = 0; a < 16; a++) { const th = a / 16 * Math.PI * 2; for (const r of [0.8, 1.6, 2.6]) { const px = x + Math.cos(th) * r, pz = z + Math.sin(th) * r; if (carte.eau(px, pz) && r < bd) { bd = r; best = th; } } } return best;
  };

  /* palmiers : sur la bande de rive, penchés vers l'eau (la courbe du modèle part vers +x : le lacet est celui de la rive) */
  let np = 0;
  essais(900, () => { if (np >= 34 * densite) return; const [x, z, h] = aleaIle(); const de = distEau(x, z);
    if (h < 0.15 || h > 0.9 || de < 0.5 || de > 2.6 || !libre(x, z, .5) || carte.pente(x, z) > 0.5 || distChemin(x, z) < 0.55 || !prise('palm', x, z, 1.15)) return;
    const th = bordRive(x, z); const yaw = th === null ? rng() * 6.3 : -th;
    poser('palmier', choisir(), x, z, 0.95 + rng() * 0.4, yaw); np++; });
  /* bananiers : par touffes, un peu plus haut sur la rive */
  let nb = 0;
  essais(700, () => { if (nb >= 12 * densite) return; const [x, z, h] = aleaIle(); const de = distEau(x, z);
    if (h < 0.3 || h > 1.2 || de < 1.4 || de > 4.2 || !libre(x, z, .8) || carte.pente(x, z) > .5 || distChemin(x, z) < 0.8 || !prise('ban', x, z, 2.4)) return;
    for (let k = 0; k < 3; k++) { const a = rng() * 6.3, r = 0.2 + rng() * 0.5; poser('bananier', choisir(), x + Math.cos(a) * r, z + Math.sin(a) * r, 0.85 + rng() * 0.4, rng() * 6.3); } nb++; });
  /* cerisiers : autour de la colline du dojo et du pont */
  const col = meta.colline;
  let ns = 0;
  essais(900, () => { if (ns >= 11 * densite) return; const a = rng() * 6.3, r = 1.8 + rng() * 3.2, x = col.c[0] + Math.cos(a) * r, z = col.c[1] + Math.sin(a) * r;
    const h = carte.hauteur(x, z); if (h < 0.3 || !libre(x, z, .8) || carte.pente(x, z) > 0.55 || distChemin(x, z) < 0.7 || !prise('sak', x, z, 1.9)) return;
    poser('sakura', choisir(), x, z, 1 + rng() * 0.45, rng() * 6.3); ns++; });
  /* feuillus et pins : prairies du fond et des côtés */
  let nf = 0, npn = 0;
  essais(2500, () => { if (nf >= 26 * densite && npn >= 18 * densite) return; const [x, z, h] = aleaIle(); const de = distEau(x, z);
    if (h < 0.3 || de < 2.8 || !libre(x, z, 1.0) || carte.pente(x, z) > 0.6 || distChemin(x, z) < 0.9) return;
    const dehors = Math.hypot(x - 0, z - 0.3) > 6.5;                                    // pins et feuillus sur le pourtour
    if (rng() < 0.55 && nf < 26 * densite && prise('feu', x, z, 2.2)) { poser('feuillu', choisir(), x, z, 0.95 + rng() * 0.55, rng() * 6.3); nf++; }
    else if (npn < 18 * densite && (dehors || h > 1.2) && prise('pin', x, z, 1.7)) { poser('pin', choisir(), x, z, 0.95 + rng() * 0.5, rng() * 6.3); npn++; } });
  /* buissons */
  let nbu = 0;
  essais(1800, () => { if (nbu >= 70 * densite) return; const [x, z, h] = aleaIle(); const de = distEau(x, z);
    if (h < 0.3 || de < 0.9 || !libre(x, z, .5) || carte.pente(x, z) > 0.65 || distChemin(x, z) < 0.5 || !prise('bus', x, z, 0.9)) return;
    poser('buisson', choisir(), x, z, 0.8 + rng() * 0.7, rng() * 6.3); nbu++; });

  /* matérialisation : un lot = un InstancedMesh d'écorce + un de feuillage */
  const depth = new Map();
  const matDepth = (map, alpha) => { const k = map.uuid; if (!depth.has(k)) depth.set(k, new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: alpha, side: THREE.DoubleSide })); return depth.get(k); };
  for (const lot of lots.values()) {
    const A = flore.arbre(lot.type, lot.variante * 7 + 11);
    const faire = (geo, mat, feuille) => { const im = new THREE.InstancedMesh(geo, mat, lot.m.length); lot.m.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; if (feuille) im.customDepthMaterial = matDepth(mat.map, mat.alphaTest); groupe.add(im); };
    if (A.ecorce) faire(A.ecorce, A.matEcorce, false); faire(A.feuillage, A.matFeuille, true);
  }
  /* herbe : touffes semées sur les prairies (instancing dense) */
  const nHerbe = Math.round(6500 * densite), gH = flore.herbes(), im = new THREE.InstancedMesh(gH, flore.mats.herbe, nHerbe), m4 = new THREE.Matrix4(); let ih = 0;
  for (let k = 0; k < nHerbe * 6 && ih < nHerbe; k++) { const [x, z, h] = aleaIle(); const de = distEau(x, z);
    if (h < 0.32 || de < 1.0 || !libre(x, z, 0.25) || carte.pente(x, z) > 0.7 || distChemin(x, z) < 0.42) continue;
    m4.compose(new THREE.Vector3(x, h - 0.02, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng() * 6.3, 0)), new THREE.Vector3(0.8 + rng() * 0.9, 0.7 + rng() * 0.9, 0.8 + rng() * 0.9)); im.setMatrixAt(ih++, m4); }
  im.count = ih; im.instanceMatrix.needsUpdate = true; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; groupe.add(im);
  return { groupe, comptes: { palmiers: np, bananiers: nb, cerisiers: ns, feuillus: nf, pins: npn, buissons: nbu, herbes: ih }, libre, distEau, distChemin, tick(dt, t) { flore.vent.uTemps.value = t; } };
}
