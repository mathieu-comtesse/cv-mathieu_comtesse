import { THREE, group, rng, canvasTexture } from './kit.js?v=cv-scene-v29';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { bladeGeo, plantMaterial, scatter, rockGeo, TAU } from './pond.js?v=bf01a16';
import { instanced } from './garden-models2.js?v=jardin2';
import { makeTree, treeTime, treeTint } from './tree-gen.js?v=eng2';

/* ───────────── Jardin japonais autour de l'étang ─────────────
 * Repère : celui de la pièce du thé (y = 0 : sol). Le jardin n'a pas de bord : la mousse et l'herbe sont des traits (lames) dont la densité
 * décroît avec la distance à l'étang, et se dissout dans la page. Modèle : jardin de promenade avec lanternes de pierre, pins taillés en nuages,
 * érable, arbustes arrondis, rochers moussus, pas japonais, fougères. */

const stone = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });

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
  // mousse : cône à 8 pans posé sur le toit (rayon du toit r(y) = 0,34 − 2·(y − 0,76), en unités u), un peu plus large que lui, bord inférieur irrégulier
  const mg = new THREE.CylinderGeometry(0.024 * u, 0.268 * u, 0.12 * u, 8, 3, true); mg.translate(0, 0.865 * u, 0);
  { const p = mg.attributes.position, rr = rng(7);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), low = (0.925 * u - y) / (0.12 * u), x = p.getX(i), z = p.getZ(i), ang = Math.atan2(z, x);
      const k = 1 + low * (0.08 * Math.sin(ang * 3 + low * 4) + 0.05 * (rr() - 0.5)), drip = low > 0.9 ? -0.014 * u * Math.abs(Math.sin(ang * 5)) : 0;
      p.setXYZ(i, x * k, y + drip + 0.004 * u * Math.sin(x * 40 + z * 33), z * k);
    }
    mg.computeVertexNormals(); }
  const cap = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ color: '#5f8a3f', roughness: 1, side: THREE.DoubleSide })); g.add(cap);
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.036 * u, 8, 5, 0, TAU, 0, 1.6), moss); capTop.scale.set(1, 0.7, 1); capTop.position.set(0, 0.918 * u, 0); g.add(capTop);       // mousse au pied de la boule
  g.userData.glow = glow; void kind; return g;
}

/** arbuste taillé en nuage : demi-sphère bosselée faite de sphères qui se chevauchent, plus sombre en bas, plus claire dessus (couleurs de sommets) */
function cloudGeo() {
  const parts = [], spots = [[0, 0.1, 0, 0.78], [0.5, 0.0, 0.1, 0.55], [-0.48, 0.02, 0.15, 0.56], [0.12, 0.05, -0.5, 0.55], [-0.15, 0.04, 0.52, 0.52], [0.3, 0.35, -0.25, 0.42], [-0.28, 0.38, -0.12, 0.4]];
  for (const [x, y, z, rad] of spots) {
    const a = new THREE.IcosahedronGeometry(rad, 2), p = a.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + 0.05 * Math.sin(p.getX(i) * 9 + p.getZ(i) * 7 + x * 5); p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i), -0.05) * k, p.getZ(i) * k); }
    a.translate(x, y, z); parts.push(a);
  }
  const g = mergeGeometries(parts), p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const h = Math.min(1, Math.max(0, (p.getY(i) + 0.05) / 0.95)), v = 0.62 + 0.45 * h + Math.sin(p.getX(i) * 13 + p.getZ(i) * 11) * 0.04; col[i * 3] = v * 0.95; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 0.9; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}
/** touffe de fougère : neuf frondes qui partent du centre et retombent en arc, de longueurs différentes */
function fernGeo() {
  const parts = [], r = rng(17);
  for (let k = 0; k < 9; k++) {
    const g = bladeGeo(7, 0.085), p = g.attributes.position, a = (k / 9) * TAU + r() * 0.4, lean = 0.55 + r() * 0.5, sc = 0.7 + r() * 0.4;
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i), w = p.getX(i), out = h * lean * (0.7 + 0.5 * h), up = h * (1 - 0.45 * h * lean) * sc, x = w * (1 + h), z = out;   // la fronde s'élargit puis s'arque vers l'extérieur
      p.setXYZ(i, x * Math.cos(a) + z * Math.sin(a), up, -x * Math.sin(a) + z * Math.cos(a));
    }
    parts.push(g);
  }
  return mergeGeometries(parts);
}

export function makeGarden({ shape, pc, uni, exclude, seed = 41 }) {
  const g = group(), r = rng(seed), [cx, cz] = pc;
  const R = (th) => shape.radius(th);
  const at = (th, f) => [cx + Math.cos(th) * R(th) * f, cz + Math.sin(th) * R(th) * f];
  const fracOf = (x, z) => shape.frac(x - cx, z - cz);
  const ok = (x, z, fMin = 1.12) => fracOf(x, z) > fMin && !exclude(x, z) && z > -2.1;
  const fadeBack = (z) => { const t = Math.min(1, Math.max(0, (z + 2.2) / 1.2)); return t * t * (3 - 2 * t); };     // la mousse se dissout vers la pièce principale

  /* mousse et herbe : des traits dont la densité décroît, sans bord */
  const proc = (o) => { o.userData.proc = true; g.add(o); return o; };                    // formes procédurales : masquées quand les modèles 3D arrivent
  const mossI = [], grassI = [], tufts = [];
  const mossB = [], carpetI = [];
  for (let tries = 0; (mossI.length + mossB.length < 9000 || grassI.length < 3300) && tries < 90000; tries++) {
    const th = r() * TAU, f = 1.05 + -Math.log(1 - r()) * 1.1, [cx0, cz0] = at(th, f);
    if (!ok(cx0, cz0, 1.05)) continue;
    const p = Math.exp(-(f - 1.05) * 0.7) * fadeBack(cz0); if (r() > p) continue;
    tufts.push({ x: cx0, z: cz0, f });
    const n = 7 + ((r() * 10) | 0), rad = 0.08 + r() * 0.2, herb = r() < 0.3;               // une touffe : lames serrées autour d'un point
    for (let k = 0; k < n; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rad, x = cx0 + Math.cos(a) * d, z = cz0 + Math.sin(a) * d;
      if (!ok(x, z, 1.04)) continue;
      if (herb) grassI.push({ x, y: -0.045, z, ry: r() * 6.28, sy: 0.08 + r() * 0.18, sx: 1, tz: (r() - 0.5) * 0.35 });
      else (r() < 0.45 ? mossB : mossI).push({ x, y: -0.045, z, ry: r() * 6.28, sy: 0.04 + r() * 0.07, sx: 1.5, tz: (r() - 0.5) * 0.5 });
      if (!herb && r() < 0.22) carpetI.push({ x, y: -0.047, z, ry: r() * 6.28, sy: 0.018 + r() * 0.026, sx: 2.6, tz: (r() - 0.5) * 0.9 });
    }
  }
  proc(scatter(bladeGeo(4, 0.05), plantMaterial(uni, '#4f7d36', '#a9cf63', 0.025), mossI));
  proc(scatter(bladeGeo(4, 0.05), plantMaterial(uni, '#2f5e2c', '#7fb04c', 0.02), mossB));                // seconde teinte : mousse plus sombre
  proc(scatter(bladeGeo(3, 0.09), plantMaterial(uni, '#37652f', '#86b55a', 0.01), carpetI));           // tapis de mousse très bas
  proc(scatter(bladeGeo(5, 0.022), plantMaterial(uni, '#4d7a38', '#c5d36b', 0.05), grassI));
  // taches de mousse : disques à bord flou posés au sol, teintes variées
  {
    const tex = canvasTexture(64, 64, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const patches = [], pr = rng(seed + 21);
    for (let i = 0, t = 0; i < 120 && t < 4000; t++) { const th = pr() * TAU, f = 1.06 + pr() * 1.6, [x, z] = at(th, f); if (!ok(x, z, 1.06) || pr() > fadeBack(z)) continue; patches.push({ x, y: -0.043, z, ry: pr() * 6, sx: 0.22 + pr() * 0.5, sy: 1 }); i++; }
    const pm = scatter(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, color: '#ffffff', transparent: true, depthWrite: false, roughness: 1 }), patches);
    patches.forEach((_, i) => pm.setColorAt(i, new THREE.Color().setHSL(0.24 + pr() * 0.07, 0.42 + pr() * 0.12, 0.2 + pr() * 0.14)));
    pm.renderOrder = 1; proc(pm);
  }

  /* pas japonais : de la porte du balcon (côté droit) vers la pièce principale, puis un sentier qui longe la rive */
  const stones = [], sg = rng(seed + 3);
  const path = [[2.75, 2.1], [2.95, 1.5], [2.7, 0.85], [2.95, 0.2], [2.7, -0.5], [2.95, -1.2], [2.8, -1.9]];
  for (const [x, z] of path) stones.push({ x: x + (sg() - 0.5) * 0.06, y: -0.035, z, ry: sg() * 6, sx: 0.15 + sg() * 0.04, sy: 1 });
  for (let k = 0; k < 14; k++) { const th = Math.PI * (0.05 + k * 0.075) , [x, z] = at(th, 1.32 + Math.sin(k * 1.3) * 0.06); if (ok(x, z, 1.2)) stones.push({ x, y: -0.035, z, ry: sg() * 6, sx: 0.12 + sg() * 0.05, sy: 1 }); }
  const stoneM = scatter(new THREE.CylinderGeometry(1, 1.05, 0.05, 9), stone('#ffffff'), stones);
  stones.forEach((_, i) => stoneM.setColorAt(i, new THREE.Color().setHSL(0.1, 0.04, 0.42 + sg() * 0.2)));
  proc(stoneM);

  /* arbustes arrondis (karikomi) et fougères */
  const shrubs = [], ferns = [], sr = rng(seed + 5);
  for (let i = 0, t = 0; shrubs.length < 11 && t < 400; t++) { const th = sr() * TAU, f = 1.18 + sr() * 0.55, [x, z] = at(th, f); if (!ok(x, z, 1.15) || Math.sin(th) > 0.55 && f < 1.4) continue; const s = 0.17 + sr() * 0.17; shrubs.push({ x, y: -0.02 + s * 0.15, z, ry: sr() * 6, sx: s, sy: s * 0.72 }); i++; }
  const shrubM = scatter(cloudGeo(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, vertexColors: true }), shrubs); shrubs.forEach((_, i) => shrubM.setColorAt(i, new THREE.Color().setHSL(0.26 + sr() * 0.05, 0.5, 0.3 + sr() * 0.1))); shrubM.castShadow = true; proc(shrubM);
  { // azalées : une partie des arbustes porte de petites fleurs roses ou blanches
    const fl = [], fc = rng(seed + 31);
    for (const sh of shrubs) if (fc() < 0.45) for (let k = 0; k < 16; k++) { const sz = 0.012 + fc() * 0.012, a = fc() * TAU, e = Math.acos(0.25 + fc() * 0.75), rx = Math.sin(e) * Math.cos(a), rz = Math.sin(e) * Math.sin(a), ry = Math.cos(e); fl.push({ x: sh.x + rx * sh.sx * 0.98, y: sh.y + ry * sh.sy * 0.98, z: sh.z + rz * sh.sx * 0.98, ry: fc() * 6, sx: sz, sy: sz * 0.85 }); }
    if (fl.length) { const fm = scatter(new THREE.IcosahedronGeometry(1, 0), stone('#ffffff'), fl), cols = ['#ee7aa5', '#f6b7cf', '#fdf1f4', '#d9508a']; fl.forEach((_, i) => fm.setColorAt(i, new THREE.Color(cols[(fc() * cols.length) | 0]))); proc(fm); }
  }
  for (const s of shrubs) for (let k = 0; k < 5; k++) { const a = sr() * TAU; ferns.push({ x: s.x + Math.cos(a) * s.sx * 1.25, y: -0.04, z: s.z + Math.sin(a) * s.sx * 1.25, ry: a, sy: 0.16 + sr() * 0.12, sx: 0.9 + sr() * 0.5 }); }
  proc(scatter(fernGeo(), plantMaterial(uni, '#2f6e38', '#8fcb6a', 0.035), ferns));

  /* rochers moussus */
  const rockParts = [], mossParts = [], rr = rng(seed + 8), rockSpots = [];
  for (let i = 0, t = 0; i < 6 && t < 200; t++) { const th = rr() * TAU, f = 1.3 + rr() * 0.7, [x, z] = at(th, f); if (!ok(x, z, 1.25) || z > 3.9 && Math.abs(x) < 3) continue; const s = 0.2 + rr() * 0.22; const rg = rockGeo(i + 20, s); rg.rotateY(rr() * 6); rg.translate(x, -0.02, z); rockParts.push(rg); rockSpots.push({ x, z, s, ry: rr() * 6 }); const mg = new THREE.SphereGeometry(1, 9, 6, 0, TAU, 0, 1.0); mg.scale(s * 1.0, s * 0.42, s * 0.9); mg.translate(x, s * 0.36, z); mossParts.push(mg); i++; }
  const rockMesh = new THREE.Mesh(mergeGeometries(rockParts), stone('#555b63')); rockMesh.castShadow = rockMesh.receiveShadow = true; proc(rockMesh);
  proc(new THREE.Mesh(mergeGeometries(mossParts), stone('#5a7f42')));

  /* lanternes, pins, érable */
  const lanterns = [];
  const place = (obj, th, f, ry = 0, y = -0.02) => { const [x, z] = at(th, f); obj.position.set(x, y, z); obj.rotation.y = ry; g.add(obj); return obj; };
  const l1 = toro(0.95); const [lx, lz] = at(Math.PI * 0.82, 1.22); l1.position.set(lx, -0.02, lz); g.add(l1); lanterns.push(l1);
  const l2 = toro(0.62); l2.position.set(2.35, -0.02, 2.6 - 0.0); g.add(l2); lanterns.push(l2);
  if (exclude(l2.position.x, l2.position.z) || fracOf(l2.position.x, l2.position.z) < 1.1) { const [x, z] = at(Math.PI * 0.12, 1.25); l2.position.set(x, -0.02, z); }
  const pines = [[-3.5, 0.6, 2.5, 5, 'pine'], [3.9, 1.0, 2.3, 7, 'cherry', 'spring'], [-4.4, 3.2, 2.2, 9, 'weeping', 'spring'], [-6.2, 1.2, 2.7, 11, 'pine'], [-7.4, 4.0, 2.2, 13, 'ginkgo', 'autumn'], [-5.6, 6.0, 1.9, 15, 'maple', 'autumn']];
  for (const [x, z, h, sd, kind, season] of pines) if (z > -2 && !exclude(x, z) && fracOf(x, z) > 1.2) { const p = makeTree(kind, sd, h, season); p.position.set(x, -0.02, z); p.rotation.y = sd; g.add(p); }
  const mp = makeTree('maple', 3, 1.9, 'autumn'); const [mx, mz] = at(Math.PI * 1.02, 1.55); if (!exclude(mx, mz) && mz > -1.8) { mp.position.set(mx, -0.02, mz); g.add(mp); }
  const mp2 = makeTree('ginkgo', 6, 2.0, 'autumn'); mp2.position.set(3.4, -0.02, 3.9); if (fracOf(3.4, 3.9) > 1.2) g.add(mp2);
  void place;

  /* modèles 3D (js/garden-models2.js) : arbres, herbes, buissons, fougères et rochers remplacent les formes procédurales */
  g.userData.useModels2 = (M) => {
    g.traverse((o) => { if (o.userData.proc) o.visible = false; });
    const rn = rng(seed + 77);
    // arbres : les groupes existants gardent leur identité (feuilles qui tombent, ombres), seul leur contenu change
    const kinds = ['pine', 'juniper', 'jeffrey', 'pine', 'jeffrey', 'juniper'], H = { willow: 2.5, pine: 2.3, juniper: 2.6, jeffrey: 2.4 };
    let ip = 0;
    g.children.forEach((c) => {
      if (!c.userData.tree) return;
      const k = c.name === 'GardenMaple' ? 'willow' : kinds[ip++ % kinds.length];
      for (const ch of [...c.children]) c.remove(ch);
      const m = M.trees[k].clone(true); m.scale.setScalar(H[k] * (0.9 + rn() * 0.2)); m.rotation.y = rn() * 6.28; c.add(m);
    });
    // buissons (fleurs violettes, couvre-sol) à la place des arbustes taillés ; fougères
    const flo = [], cov = [];
    shrubs.forEach((s, i) => (i % 5 < 3 ? flo : cov).push({ x: s.x, y: -0.03, z: s.z, ry: rn() * 6.28, s: s.sx * (i % 5 < 3 ? 4.4 : 4.8) }));
    g.add(instanced(M.purpleflower, flo)); g.add(instanced(M.groundcover, cov));
    g.add(instanced(M.fern, ferns.map((f) => ({ x: f.x, y: -0.035, z: f.z, ry: f.ry, s: f.sy * 3.2 }))));
    // herbes : cercles de gazon et touffes
    const patches = [], tuftsI = [];
    tufts.forEach((t, i) => { if (i % 14 === 0) patches.push({ x: t.x, y: -0.045, z: t.z, ry: rn() * 6.28, s: 0.7 + rn() * 0.7 }); else if (i % 3 === 0) tuftsI.push({ x: t.x, y: -0.04, z: t.z, ry: rn() * 6.28, s: 0.4 + rn() * 0.5 }); });
    g.add(instanced(M.grasspatch, patches)); g.add(instanced(M.grasstuft, tuftsI));
    // sol de terre : maillage en cases autour du bassin (texture de sol de « Realistic Water and Plants », relief fin), qui se fond dans la page ; il évite l'eau, la pièce et le fond
    {
      const X0 = cx - 11, X1 = cx + 11, Z0 = -2.0, Z1 = cz + 9.5, CS = 0.4, nx = Math.round((X1 - X0) / CS), nz = Math.round((Z1 - Z0) / CS);
      const alphaAt = (x, z) => { const f = fracOf(x, z), a = 1 - Math.min(1, Math.max(0, (f - 1.25) / 3.0)); return a * fadeBack(z) * Math.min(1, Math.max(0, (11 - Math.abs(x - cx)) / 3)) * Math.min(1, Math.max(0, (Z1 - z) / 2.5)); };
      const pos = [], col = [], uv = [], idx = [], id = (i, j) => j * (nx + 1) + i;
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = X0 + i * CS, z = Z0 + j * CS; pos.push(x, -0.042, z); const a = alphaAt(x, z); col.push(1, 1, 1, a); uv.push(x / 9, z / 9); }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x = X0 + (i + 0.5) * CS, z = Z0 + (j + 0.5) * CS;
        if (exclude(x, z) || fracOf(x, z) < 1.06 || z < Z0 + 0.1) continue;
        idx.push(id(i, j), id(i, j + 1), id(i + 1, j), id(i + 1, j), id(i, j + 1), id(i + 1, j + 1));
      }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(idx); gg.computeVertexNormals();
      const nrm = M.bedN.clone(); nrm.repeat.set(10, 10); nrm.needsUpdate = true;
      const gm = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: M.soil, normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, vertexColors: true, transparent: true, depthWrite: false }));
      gm.receiveShadow = true; gm.renderOrder = -1; g.add(gm);
    }
    // herbes de « Realistic Water and Plants » : hautes herbes, herbe, trèfle, plantain, laitue, pissenlit, quelques buissons
    {
      const W = M.wp, kinds = [['tall_grass', 0.6, 0.35], ['grass', 0.5, 0.3], ['clover', 0.5, 0.3], ['tall_grass', 0.55, 0.3], ['plantain', 0.4, 0.2], ['grass', 0.45, 0.3], ['lactuc', 0.5, 0.2], ['dandelion', 0.3, 0.15], ['clover', 0.45, 0.3]], by = {};
      tufts.forEach((t, i) => {
        for (let k = 0; k < 2; k++) {
          const [name, base, spread] = kinds[(i * 2 + k) % kinds.length]; if (!W[name]) continue;
          (by[name] = by[name] || []).push({ x: t.x + (rn() - 0.5) * 0.3, y: -0.04, z: t.z + (rn() - 0.5) * 0.3, ry: rn() * 6.28, s: base * (1 - spread * 0.5 + rn() * spread) });
        }
        if (i % 45 === 0 && W.bush) (by.bush = by.bush || []).push({ x: t.x, y: -0.04, z: t.z, ry: rn() * 6.28, s: 0.55 + rn() * 0.45 });
      });
      for (const [name, items] of Object.entries(by)) g.add(instanced(W[name], items));
    }
    // pas japonais : des rochers aplatis (rochers fournis) à la place des galets blancs
    {
      const pool = [...M.rocks, ...M.mossy];
      g.add(instanced(pool[0], stones.filter((_, i) => i % 5 === 0).map((s) => ({ x: s.x, y: -0.04, z: s.z, ry: s.ry, s: s.sx * 2.4, k: 0.3 }))));
      for (let q = 1; q < 5; q++) g.add(instanced(pool[q % pool.length], stones.filter((_, i) => i % 5 === q).map((s) => ({ x: s.x, y: -0.04, z: s.z, ry: s.ry, s: s.sx * 2.4, k: 0.3 }))));
    }
    // rochers du jardin : tous les rochers fournis (Rocks, rocher moussu, rochers de la scène d'eau)
    const pool = M.rocks.flatMap((rk, q) => (M.mossy[q] ? [rk, M.mossy[q]] : [rk])).concat(M.mossy.slice(M.rocks.length));
    rockSpots.forEach((r, i) => { const rock = pool[i % pool.length].clone(true), w = r.s * 3.6; rock.scale.setScalar(w); rock.position.set(r.x, -0.05, r.z); rock.rotation.y = r.ry; g.add(rock); });
  };

  g.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = true; } });
  g.userData.update = (night) => { treeTime.value = performance.now() / 1000; treeTint.setScalar(night ? 0.5 : 1); for (const l of lanterns) l.userData.glow.emissiveIntensity += ((night ? 1.6 : 0.0) - l.userData.glow.emissiveIntensity) * 0.05; };
  void canvasTexture;
  return g;
}
