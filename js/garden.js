import { THREE, group, rng, canvasTexture } from './kit.js?v=b1e8f97';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { bladeGeo, plantMaterial, scatter, rockGeo, TAU } from './pond.js?v=b1e8f97';

/* ───────────── Jardin japonais autour de l'étang ─────────────
 * Repère : celui de la pièce du thé (y = 0 : sol). Le jardin n'a pas de bord : la mousse et l'herbe sont des traits (lames) dont la densité
 * décroît avec la distance à l'étang, et se dissout dans la page. Modèle : jardin de promenade avec lanternes de pierre, pins taillés en nuages,
 * érable, arbustes arrondis, rochers moussus, pas japonais, fougères. */

const stone = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });

/** tronc effilé qui suit une courbe */
function taperTube(pts, r0, r1, seg = 14, rad = 7) {
  const curve = new THREE.CatmullRomCurve3(pts), pos = [], idx = [];
  const fr = curve.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, p = curve.getPoint(t), r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= rad; j++) { const a = (j / rad) * TAU, n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).add(fr.binormals[i].clone().multiplyScalar(Math.sin(a))); pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r); }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** pin taillé en nuages : tronc tortueux + coussins de feuillage aplatis */
function pin(seed, H = 2.0) {
  const r = rng(seed), g = group();
  const lean = (r() - 0.5) * 0.5, pts = [0, 0.25, 0.5, 0.75, 1].map((t, i) => new THREE.Vector3(Math.sin(t * 3 + seed) * 0.12 + lean * t * t, H * t * 0.78, Math.cos(t * 2.4 + seed) * 0.1));
  g.add(new THREE.Mesh(taperTube(pts, 0.075, 0.035), stone('#5b4332')));
  const pads = [], tops = [];
  const mk = (cx, cy, cz, sx, sy, sz) => { const a = new THREE.IcosahedronGeometry(1, 1); const p = a.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.12 * Math.sin(p.getX(i) * 5 + cy * 3 + seed) * Math.cos(p.getZ(i) * 4 + seed); p.setXYZ(i, p.getX(i) * k, p.getY(i) * (p.getY(i) > 0 ? 1 : 0.55), p.getZ(i) * k); } a.scale(sx, sy, sz); a.translate(cx, cy, cz); a.computeVertexNormals(); return a; };
  const tp = pts[4], mid = pts[3], low = pts[2];
  pads.push(mk(tp.x, tp.y + 0.1, tp.z, 0.42, 0.16, 0.38), mk(mid.x - 0.28, mid.y - 0.05, mid.z + 0.12, 0.5, 0.15, 0.42), mk(mid.x + 0.32, mid.y - 0.12, mid.z - 0.14, 0.4, 0.14, 0.36), mk(low.x - 0.38, low.y + 0.02, low.z - 0.1, 0.38, 0.13, 0.34), mk(low.x + 0.3, low.y - 0.08, low.z + 0.16, 0.34, 0.12, 0.3));
  g.add(new THREE.Mesh(mergeGeometries(pads), stone('#2f5a37')));
  for (const [a, b] of [[tp, 0.42], [mid, 0.5]]) tops.push(mk(a.x + (a === mid ? -0.28 : 0), a.y + (a === tp ? 0.18 : 0.06), a.z + (a === mid ? 0.12 : 0), b * 0.78, 0.07, b * 0.68));
  g.add(new THREE.Mesh(mergeGeometries(tops), stone('#4d8143')));
  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}

/** érable (momiji) : tronc fin, nuages rouges et orangés */
function erable(seed) {
  const r = rng(seed), g = group();
  const pts = [0, 0.4, 0.75, 1].map((t, i) => new THREE.Vector3(Math.sin(t * 2 + seed) * 0.1, 1.5 * t, Math.cos(t * 2 + seed) * 0.08));
  g.add(new THREE.Mesh(taperTube(pts, 0.05, 0.025), stone('#5a4636')));
  const cols = ['#c9462b', '#e0713a', '#b8352a'], parts = cols.map(() => []);
  for (let i = 0; i < 9; i++) { const a = new THREE.IcosahedronGeometry(1, 1), k = i % 3, s = 0.2 + r() * 0.16; a.scale(s * 1.2, s * 0.8, s); a.translate((r() - 0.5) * 0.7, 1.15 + r() * 0.5, (r() - 0.5) * 0.6); parts[k].push(a); }
  parts.forEach((ps, i) => { const m = new THREE.Mesh(mergeGeometries(ps), stone(cols[i])); m.castShadow = true; g.add(m); });
  return g;
}

/** lanterne de pierre (ishi-doro) : socle, fût, plateau, boîte à feu qui s'allume la nuit, chapeau, boule */
function toro(H = 0.95, kind = 'tall') {
  const g = group(), sm = stone('#8d8f90'), moss = stone('#5f7f45'), glow = new THREE.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffb347', emissiveIntensity: 0, roughness: 0.6 });
  const parts = [];
  const add = (geo, y) => { geo.translate(0, y, 0); parts.push(geo); };
  const u = H / 0.95;
  add(new THREE.CylinderGeometry(0.17 * u, 0.2 * u, 0.1 * u, 8), 0.05 * u);                              // base
  add(new THREE.CylinderGeometry(0.06 * u, 0.07 * u, 0.4 * u, 8), 0.3 * u);                              // fût
  add(new THREE.CylinderGeometry(0.2 * u, 0.15 * u, 0.06 * u, 8), 0.53 * u);                              // plateau
  const box = new THREE.BoxGeometry(0.2 * u, 0.2 * u, 0.2 * u); box.translate(0, 0.66 * u, 0);
  const roofG = new THREE.CylinderGeometry(0.02 * u, 0.34 * u, 0.16 * u, 8); roofG.translate(0, 0.84 * u, 0); parts.push(roofG);
  const roofRim = new THREE.CylinderGeometry(0.34 * u, 0.3 * u, 0.035 * u, 8); roofRim.translate(0, 0.755 * u, 0); parts.push(roofRim);
  const ball = new THREE.SphereGeometry(0.06 * u, 8, 6); ball.translate(0, 0.96 * u, 0); parts.push(ball);
  const body = new THREE.Mesh(mergeGeometries(parts), sm); body.castShadow = true; g.add(body);
  const fire = new THREE.Mesh(new THREE.BoxGeometry(0.205 * u, 0.12 * u, 0.205 * u), glow); fire.position.y = 0.66 * u; g.add(fire);
  const fireFrame = new THREE.Mesh(box, sm); fireFrame.scale.set(1, 0.9, 1); fireFrame.position.y = 0; g.add(fireFrame);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2 * u, 8, 5, 0, TAU, 0, 1.0), moss); cap.scale.set(1, 0.34, 1); cap.position.set(0.04 * u, 0.9 * u, 0); g.add(cap);
  g.userData.glow = glow; void kind; return g;
}

export function makeGarden({ shape, pc, uni, exclude, seed = 41 }) {
  const g = group(), r = rng(seed), [cx, cz] = pc;
  const R = (th) => shape.radius(th);
  const at = (th, f) => [cx + Math.cos(th) * R(th) * f, cz + Math.sin(th) * R(th) * f];
  const fracOf = (x, z) => shape.frac(x - cx, z - cz);
  const ok = (x, z, fMin = 1.12) => fracOf(x, z) > fMin && !exclude(x, z) && z > -2.1;
  const fadeBack = (z) => { const t = Math.min(1, Math.max(0, (z + 2.2) / 1.2)); return t * t * (3 - 2 * t); };     // la mousse se dissout vers la pièce principale

  /* mousse et herbe : des traits dont la densité décroît, sans bord */
  const mossI = [], grassI = [];
  for (let tries = 0; (mossI.length < 4200 || grassI.length < 1500) && tries < 40000; tries++) {
    const th = r() * TAU, f = 1.05 + -Math.log(1 - r()) * 0.75, [cx0, cz0] = at(th, f);
    if (!ok(cx0, cz0, 1.05)) continue;
    const p = Math.exp(-(f - 1.05) * 0.95) * fadeBack(cz0); if (r() > p) continue;
    const n = 7 + ((r() * 10) | 0), rad = 0.08 + r() * 0.2, herb = r() < 0.3;               // une touffe : lames serrées autour d'un point
    for (let k = 0; k < n; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rad, x = cx0 + Math.cos(a) * d, z = cz0 + Math.sin(a) * d;
      if (!ok(x, z, 1.04)) continue;
      if (herb) grassI.push({ x, y: -0.045, z, ry: r() * 6.28, sy: 0.08 + r() * 0.18, sx: 1, tz: (r() - 0.5) * 0.35 });
      else mossI.push({ x, y: -0.045, z, ry: r() * 6.28, sy: 0.04 + r() * 0.07, sx: 1.5, tz: (r() - 0.5) * 0.5 });
    }
  }
  g.add(scatter(bladeGeo(4, 0.05), plantMaterial(uni, '#4f7d36', '#a9cf63', 0.025), mossI));
  g.add(scatter(bladeGeo(5, 0.022), plantMaterial(uni, '#4d7a38', '#c5d36b', 0.05), grassI));

  /* pas japonais : de la porte du balcon (côté droit) vers la pièce principale, puis un sentier qui longe la rive */
  const stones = [], sg = rng(seed + 3);
  const path = [[2.75, 2.1], [2.95, 1.5], [2.7, 0.85], [2.95, 0.2], [2.7, -0.5], [2.95, -1.2], [2.8, -1.9]];
  for (const [x, z] of path) stones.push({ x: x + (sg() - 0.5) * 0.06, y: -0.035, z, ry: sg() * 6, sx: 0.15 + sg() * 0.04, sy: 1 });
  for (let k = 0; k < 14; k++) { const th = Math.PI * (0.05 + k * 0.075) , [x, z] = at(th, 1.32 + Math.sin(k * 1.3) * 0.06); if (ok(x, z, 1.2)) stones.push({ x, y: -0.035, z, ry: sg() * 6, sx: 0.12 + sg() * 0.05, sy: 1 }); }
  const stoneM = scatter(new THREE.CylinderGeometry(1, 1.05, 0.05, 9), stone('#ffffff'), stones);
  stones.forEach((_, i) => stoneM.setColorAt(i, new THREE.Color().setHSL(0.1, 0.04, 0.42 + sg() * 0.2)));
  g.add(stoneM);

  /* arbustes arrondis (karikomi) et fougères */
  const shrubs = [], ferns = [], sr = rng(seed + 5);
  for (let i = 0, t = 0; shrubs.length < 11 && t < 400; t++) { const th = sr() * TAU, f = 1.18 + sr() * 0.55, [x, z] = at(th, f); if (!ok(x, z, 1.15) || Math.sin(th) > 0.55 && f < 1.4) continue; const s = 0.17 + sr() * 0.17; shrubs.push({ x, y: -0.02 + s * 0.15, z, ry: sr() * 6, sx: s, sy: s * 0.72 }); i++; }
  const shrubM = scatter(new THREE.IcosahedronGeometry(1, 2), stone('#ffffff'), shrubs); shrubs.forEach((_, i) => shrubM.setColorAt(i, new THREE.Color().setHSL(0.27 + sr() * 0.04, 0.45, 0.22 + sr() * 0.1))); g.add(shrubM);
  for (const s of shrubs) for (let k = 0; k < 4; k++) { const a = sr() * TAU; ferns.push({ x: s.x + Math.cos(a) * s.sx * 1.15, y: -0.04, z: s.z + Math.sin(a) * s.sx * 1.15, ry: a, sy: 0.14 + sr() * 0.1, sx: 1.2, tz: 0.35 }); }
  g.add(scatter(bladeGeo(5, 0.1), plantMaterial(uni, '#3b7a40', '#86c065', 0.03), ferns));

  /* rochers moussus */
  const rockParts = [], mossParts = [], rr = rng(seed + 8);
  for (let i = 0, t = 0; i < 6 && t < 200; t++) { const th = rr() * TAU, f = 1.3 + rr() * 0.7, [x, z] = at(th, f); if (!ok(x, z, 1.25) || z > 3.9 && Math.abs(x) < 3) continue; const s = 0.2 + rr() * 0.22; const rg = rockGeo(i + 20, s); rg.rotateY(rr() * 6); rg.translate(x, -0.02, z); rockParts.push(rg); const mg = new THREE.SphereGeometry(1, 9, 6, 0, TAU, 0, 1.0); mg.scale(s * 1.0, s * 0.42, s * 0.9); mg.translate(x, s * 0.36, z); mossParts.push(mg); i++; }
  const rockMesh = new THREE.Mesh(mergeGeometries(rockParts), stone('#555b63')); rockMesh.castShadow = rockMesh.receiveShadow = true; g.add(rockMesh);
  g.add(new THREE.Mesh(mergeGeometries(mossParts), stone('#5a7f42')));

  /* lanternes, pins, érable */
  const lanterns = [];
  const place = (obj, th, f, ry = 0, y = -0.02) => { const [x, z] = at(th, f); obj.position.set(x, y, z); obj.rotation.y = ry; g.add(obj); return obj; };
  const l1 = toro(0.95); const [lx, lz] = at(Math.PI * 0.82, 1.22); l1.position.set(lx, -0.02, lz); g.add(l1); lanterns.push(l1);
  const l2 = toro(0.62); l2.position.set(2.35, -0.02, 2.6 - 0.0); g.add(l2); lanterns.push(l2);
  if (exclude(l2.position.x, l2.position.z) || fracOf(l2.position.x, l2.position.z) < 1.1) { const [x, z] = at(Math.PI * 0.12, 1.25); l2.position.set(x, -0.02, z); }
  const pines = [[-3.5, 0.6, 2.2, 5], [3.9, 1.0, 2.5, 7], [-4.4, 3.2, 1.7, 9]];
  for (const [x, z, h, sd] of pines) if (z > -2 && !exclude(x, z) && fracOf(x, z) > 1.2) { const p = pin(sd, h); p.position.set(x, -0.02, z); p.rotation.y = sd; g.add(p); }
  const mp = erable(3); const [mx, mz] = at(Math.PI * 1.02, 1.55); if (!exclude(mx, mz) && mz > -1.8) { mp.position.set(mx, -0.02, mz); g.add(mp); }
  const mp2 = erable(6); mp2.position.set(3.4, -0.02, 3.9); if (fracOf(3.4, 3.9) > 1.2) g.add(mp2);
  void place;

  g.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = true; } });
  g.userData.update = (night) => { for (const l of lanterns) l.userData.glow.emissiveIntensity += ((night ? 1.6 : 0.0) - l.userData.glow.emissiveIntensity) * 0.05; };
  void canvasTexture;
  return g;
}
