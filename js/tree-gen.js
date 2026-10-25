import { THREE, group, rng } from './kit.js?v=cv-scene-v29';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

/* ───────────── Arbres du jardin : générateur procédural (écrit pour ce site) ─────────────
 * Cinq espèces : cerisier, érable, pin, cerisier pleureur, ginkgo. Un arbre = un squelette de branches (courbes effilées, récursives)
 * + des amas de feuilles instanciés (un seul InstancedMesh par arbre, couleur par instance). Le vent est un décalage de sommets dans le shader,
 * qui augmente avec la hauteur ; le temps vient de `treeTime`, mis à jour par le jardin à chaque image. */

const TAU = Math.PI * 2;
export const treeTime = { value: 0 };

/** tube effilé le long d'une courbe */
function tube(pts, r0, r1, rad) {
  const curve = new THREE.CatmullRomCurve3(pts), seg = Math.max(4, pts.length * 2), fr = curve.computeFrenetFrames(seg, false), pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, p = curve.getPoint(t), r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * TAU, n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).add(fr.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** réglages par espèce : tronc, charpente, feuillage */
const SPECIES = {
  cherry: { trunk: 0.36, trunkR: 0.05, prim: [4, 5], primAngle: [0.7, 1.0], primLen: [0.42, 0.56], kids: 3, kidAngle: 0.75, kidLen: 0.62, depth: 2, wob: 0.28, droop: 0.15, puffs: 5, puffR: 0.16, puff: 0.1, leaf: 0.095, flat: 0.8, bark: '#4a3a33', colors: ['#f6b8cb', '#f9d3df', '#ee9db8', '#fbe4ec'] },
  maple: { trunk: 0.3, trunkR: 0.045, prim: [3, 4], primAngle: [0.55, 0.85], primLen: [0.5, 0.62], kids: 3, kidAngle: 0.9, kidLen: 0.6, depth: 2, wob: 0.3, droop: 0.1, puffs: 9, puffR: 0.2, puff: 0.11, leaf: 0.1, flat: 0.62, bark: '#5a4636', colors: ['#c9462b', '#e0713a', '#b8352a', '#d9822f'] },
  weeping: { trunk: 0.3, trunkR: 0.05, prim: [5, 5], primAngle: [0.3, 0.55], primLen: [0.4, 0.5], kids: 3, kidAngle: 0.5, kidLen: 0.55, depth: 2, wob: 0.22, droop: 1.5, puffs: 2, puffR: 0.08, puff: 0.07, leaf: 0.07, flat: 1, bark: '#43342d', colors: ['#f4b3c7', '#f8cfdc', '#e98fae', '#fbe0e9'], hang: 7 },
  ginkgo: { trunk: 0.9, trunkR: 0.045, levels: 13, levelLen: [0.2, 0.34], kidAngle: 0.5, wob: 0.12, droop: 0.05, puffs: 14, puffR: 0.15, puff: 0.12, leaf: 0.12, flat: 0.5, bark: '#6a5a45', colors: ['#e6c84a', '#f0d95c', '#c9a92f', '#d9b93b'], fan: true },
  pine: { trunk: 0.9, trunkR: 0.06, whorls: 4, wob: 0.1, droop: 0.2, puffs: 6, puffR: 0.12, puff: 0.13, leaf: 0.085, flat: 0.2, bark: '#5b4332', colors: ['#2f5a37', '#3a6a42', '#27503a', '#45774a'] },
};

/** palettes par saison : le même arbre, quatre ambiances */
const SEASONS = {
  spring: { default: ['#9bd16a', '#7fc05a', '#b6e07f', '#8fcf6e'], cherry: ['#f6b8cb', '#f9d3df', '#ee9db8', '#e8a6c8'], weeping: ['#f4b3c7', '#f8cfdc', '#e98fae', '#e8a6c8'] },
  summer: ['#2f7d4f', '#3f9a5c', '#58b070', '#2a6a45'],
  autumn: { default: ['#e07b2a', '#f0a030', '#c9602a', '#f5c04a'], maple: ['#c9462b', '#e0713a', '#b8352a', '#d9822f'], ginkgo: ['#e6c84a', '#f0d95c', '#c9a92f', '#d9b93b'] },
  winter: ['#f4f8ff', '#e2ecfb', '#ffffff', '#cfdcf2'],
};
const paletteOf = (sp, species, season) => {
  const S = SEASONS[season]; if (!S) return sp.colors;
  if (species === 'pine') return season === 'winter' ? ['#dfeee9', '#c4dccf', '#f4faf7', '#9fc4b4'] : sp.colors;
  return Array.isArray(S) ? S : (S[species] || S.default);
};
const SEASON_LIST = ['spring', 'summer', 'autumn', 'winter'];
export const treeTint = new THREE.Color(1, 1, 1);   // atténué la nuit par le jardin
/** vent aléatoire commun au jardin : intensité cible retirée au hasard toutes les quelques secondes, avec de brèves rafales */
export const treeWind = { value: 0.5 };
const windState = { target: 0.5, next: 0, frame: -1 };
const stepWind = (now) => {
  if (windState.frame === now) return; const dt = Math.min(0.1, windState.frame < 0 ? 0.016 : now - windState.frame); windState.frame = now;
  if (now > windState.next) { windState.target = Math.random() < 0.22 ? 1.2 + Math.random() * 0.9 : 0.1 + Math.random() * 0.8; windState.next = now + 3 + Math.random() * 11; }
  treeWind.value += (windState.target - treeWind.value) * Math.min(1, dt * 0.6);
};

/** petite feuille en losange (cerisier, érable, pin, saule) */
function leafGeo() {
  const g = new THREE.BufferGeometry();   // losange à deux triangles : le moins cher possible pour des milliers d'instances
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -0.5, 0, 0.42, 0, 0, 0, 0.5, 0, -0.42, 0, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
}

/** feuille en éventail (ginkgo) */
function fanGeo() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(-0.9, 0.35, -1, 1.1, -0.5, 1.2); s.lineTo(-0.1, 1.05); s.lineTo(0.1, 1.2); s.bezierCurveTo(1, 1.1, 0.9, 0.35, 0, 0);
  const g = new THREE.ShapeGeometry(s, 4); g.translate(0, -0.5, 0); return g;
}

export function makeTree(species, seed = 1, H = 2, season = '') {
  const sp = SPECIES[species], r = rng(seed), g = group(); g.name = 'GardenTree'; g.userData.tree = true; g.userData.generated = true;
  const geos = [], tips = [], V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lod = typeof matchMedia === 'function' && matchMedia('(max-width:809px)').matches ? 0.6 : 1;

  /** une branche : courbe qui dérive, s'affaisse, puis se ramifie */
  function limb(p, d, len, rad, depth, droop = sp.droop) {
    const n = 5, pts = [p.clone()], dir = d.clone(); let cur = p.clone();
    for (let i = 0; i < n; i++) {
      dir.x += (r() - 0.5) * sp.wob; dir.z += (r() - 0.5) * sp.wob; dir.y += (r() - 0.5) * sp.wob * 0.5 - droop * 0.3 * (i + 1) / n; dir.normalize();
      cur = cur.clone().addScaledVector(dir, len / n); pts.push(cur);
    }
    geos.push(tube(pts, rad, Math.max(rad * 0.4, 0.004), depth > 0 ? 5 : 4));
    tips.push({ p: cur, d: dir.clone(), w: 1 });
    if (depth <= 0) return;
    const k = sp.kids ?? 3;
    for (let q = 0; q < k; q++) {
      const t = 0.4 + 0.5 * r(), at = pts[Math.min(n, 1 + Math.floor(t * n))], axis = dir.clone().cross(V(r() - 0.5, r() - 0.5, r() - 0.5)).normalize(), nd = dir.clone().applyAxisAngle(axis, (sp.kidAngle ?? 0.7) * (0.7 + 0.6 * r()));
      limb(at, nd, len * (sp.kidLen ?? 0.6) * (0.75 + 0.5 * r()), rad * 0.55, depth - 1, droop);
    }
  }

  const trunkH = H * sp.trunk, lean = (r() - 0.5) * 0.12, tp = [];
  for (let i = 0; i <= 4; i++) { const t = i / 4; tp.push(V(Math.sin(t * 2.6 + seed) * 0.05 + lean * t * t * H, trunkH * t, Math.cos(t * 2.2 + seed) * 0.04)); }
  geos.push(tube(tp, sp.trunkR * (species === 'pine' ? 1.25 : 1.4), sp.trunkR * 0.55, 7));
  const top = tp[4];

  if (species === 'pine') {
    // pin : tronc haut, étages de branches en verticilles (silhouette conique), un sommet
    const total = H - trunkH * 0.35;
    for (let w = 0; w < sp.whorls; w++) {
      const t = w / (sp.whorls - 1), y = trunkH * 0.3 + total * (0.12 + 0.8 * t) * 0.92, len = (0.78 - 0.5 * t) * H * 0.42, nb = 5 - (w > 1 ? 1 : 0), off = r() * TAU;
      for (let b = 0; b < nb; b++) { const a = off + (b / nb) * TAU + (r() - 0.5) * 0.4, base = V(0, y, 0); limb(base, V(Math.cos(a), 0.18, Math.sin(a)), len, 0.018 * (1 - 0.5 * t), 0, sp.droop); }
    }
    tips.push({ p: V(top.x, H * 0.97, top.z), d: V(0, 1, 0), w: 1.4 });
  } else if (species === 'ginkgo') {
    // ginkgo : tronc vertical, niveaux de petites branches qui raccourcissent vers le haut
    const L = sp.levels;
    for (let i = 0; i < L; i++) {
      const t = i / (L - 1), y = H * (0.28 + 0.66 * t), len = H * (sp.levelLen[1] - (sp.levelLen[1] - sp.levelLen[0]) * t) * (0.9 + 0.3 * r()), a = r() * TAU, base = V(0, y, 0);
      limb(base, V(Math.cos(a), 0.55 + 0.4 * t, Math.sin(a)), len, 0.013 * (1 - 0.5 * t), 0);
    }
    geos.push(tube([V(0, trunkH, 0), V(0, H * 0.7, 0), V(0, H * 0.96, 0)], sp.trunkR * 0.55, 0.01, 5));
    tips.push({ p: V(0, H, 0), d: V(0, 1, 0), w: 1.3 });
  } else {
    // cerisier, érable, cerisier pleureur : charpente de grosses branches qui partent du haut du tronc
    const n = sp.prim[0] + Math.floor(r() * (sp.prim[1] - sp.prim[0] + 1)), off = r() * TAU;
    for (let b = 0; b < n; b++) {
      const a = off + (b / n) * TAU + (r() - 0.5) * 0.5, el = sp.primAngle[0] + (sp.primAngle[1] - sp.primAngle[0]) * r(), len = H * (sp.primLen[0] + (sp.primLen[1] - sp.primLen[0]) * r()) * 0.9;
      limb(top, V(Math.cos(a) * Math.sin(el), Math.cos(el), Math.sin(a) * Math.sin(el)), len, sp.trunkR * 0.7, sp.depth);
    }
  }

  // feuillage : amas autour des extrémités ; le cerisier pleureur ajoute des chutes de fleurs
  const clusters = [];
  for (const tip of tips) {
    const n = Math.max(1, Math.round(sp.puffs * lod * (tip.w || 1)));
    for (let i = 0; i < n; i++) {
      const o = V((r() - 0.5) * 2, (r() - 0.5) * 1.4, (r() - 0.5) * 2).multiplyScalar(sp.puffR * (tip.w || 1));
      clusters.push({ p: tip.p.clone().add(o), s: sp.puff * (0.7 + 0.7 * r()) * (tip.w || 1) });
    }
    for (let h = 0; h < (sp.hang || 0) && lod > 0.7; h++) for (let k = 1; k <= 7; k++) clusters.push({ p: tip.p.clone().add(V((r() - 0.5) * 0.16 + (h - 3) * 0.05, -0.12 * k - r() * 0.03, (r() - 0.5) * 0.16)), s: sp.puff * Math.max(0.3, 0.62 - 0.05 * k) });
  }
  const bark = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ color: sp.bark, roughness: 0.95 })); bark.castShadow = bark.receiveShadow = true; g.add(bark);

  const geo = sp.fan ? fanGeo() : leafGeo();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (s) => {
    s.uniforms.treeTime = treeTime; s.uniforms.treeWind = treeWind;
    s.vertexShader = 'uniform float treeTime; uniform float treeWind;\n' + s.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 lw = vec4(transformed, 1.0); float lsc = 1.0;
      #ifdef USE_INSTANCING
        lw = instanceMatrix * lw; lsc = max(.001, length(instanceMatrix[0].xyz));
      #endif
      float lh = smoothstep(.25, 1.6, lw.y);
      transformed.x += sin(treeTime * (1.0 + treeWind * 0.7) + lw.x * 3.1 + lw.z * 2.2) * .026 * (0.35 + treeWind) * lh / lsc;
      transformed.z += cos(treeTime * (0.8 + treeWind * 0.6) + lw.x * 2.0) * .01 * (0.35 + treeWind) * lh / lsc;`);
  };
  const palette = paletteOf(sp, species, season), budget = (sp.fan ? 2600 : 15000) * lod, per = Math.max(3, Math.round(budget / clusters.length)), total = clusters.length * per;
  const leaves = new THREE.InstancedMesh(geo, mat, total), d = new THREE.Object3D(), c = new THREE.Color(), base = new THREE.Color();
  const pick = new Float32Array(clusters.length), jit = new Float32Array(total * 2), cidOf = new Uint16Array(total);
  let idx = 0, ci = 0;
  for (const cl of clusters) {
    pick[ci] = r(); base.set(palette[Math.min(palette.length - 1, (pick[ci] * palette.length) | 0)]);
    const reach = cl.s * 1.5;
    for (let k = 0; k < per; k++) {
      const u = r() * 2 - 1, an = r() * TAU, q = Math.sqrt(1 - u * u), rad = Math.cbrt(r());
      d.position.set(cl.p.x + q * Math.cos(an) * rad * reach, cl.p.y + u * rad * reach * sp.flat, cl.p.z + q * Math.sin(an) * rad * reach);
      d.rotation.set(r() * TAU, r() * TAU, r() * TAU);
      const sc = sp.leaf * 1.2 * (0.7 + 0.6 * r()); d.scale.set(sc, sc * (sp.fan ? 1 : 1.3), sc); d.updateMatrix(); leaves.setMatrixAt(idx, d.matrix);
      jit[idx * 2] = (r() - 0.5) * 0.02; jit[idx * 2 + 1] = (r() - 0.5) * 0.1; cidOf[idx] = ci; c.copy(base).offsetHSL(jit[idx * 2], 0, jit[idx * 2 + 1]); leaves.setColorAt(idx, c); idx++;
    }
    ci++;
  }
  leaves.instanceMatrix.needsUpdate = true; leaves.castShadow = true; leaves.frustumCulled = false; g.add(leaves);

  /* saisons : le feuillage passe en fondu d'une saison à l'autre, à un moment tiré au hasard pour chaque arbre */
  let cur = Math.max(0, SEASON_LIST.indexOf(season));
  if (!season) cur = (Math.random() * 4) | 0;
  const colorsFor = (se) => { const pal = paletteOf(sp, species, se), out = new Float32Array(total * 3), cc = new THREE.Color(); for (let k = 0; k < total; k++) { cc.set(pal[Math.min(pal.length - 1, (pick[cidOf[k]] * pal.length) | 0)]).offsetHSL(jit[k * 2], 0, jit[k * 2 + 1]); out[k * 3] = cc.r; out[k * 3 + 1] = cc.g; out[k * 3 + 2] = cc.b; } return out; };
  let from = colorsFor(SEASON_LIST[cur]), to = from, fade = 1, nextChange = performance.now() / 1000 + 12 + Math.random() * 40;
  leaves.instanceColor.array.set(from); leaves.instanceColor.needsUpdate = true;
  const setSeason = (k) => { from = Float32Array.from(leaves.instanceColor.array); cur = k; to = colorsFor(SEASON_LIST[k]); fade = 0; };

  /* feuilles qui tombent : quelques feuilles détachées de la couronne, plus nombreuses au printemps et à l'automne */
  const NF = sp.fan ? 10 : 20, fall = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true, side: THREE.DoubleSide }), NF);
  fall.frustumCulled = false; fall.castShadow = false; g.add(fall);
  const fl = Array.from({ length: NF }, () => ({ x: 0, y: -9, z: 0, vy: 0, ph: Math.random() * TAU, sp: 0.8 + Math.random() * 1.2, on: false, rot: Math.random() * TAU }));
  const rate = () => [0.6, 0.12, 1, 0.1][cur] * (0.4 + treeWind.value * 0.6);
  const fd = new THREE.Object3D(), fc = new THREE.Color(), hide = (n) => { fd.position.set(0, -9, 0); fd.rotation.set(0, 0, 0); fd.scale.setScalar(0.0001); fd.updateMatrix(); fall.setMatrixAt(n, fd.matrix); };
  let last = performance.now() / 1000;
  const crown = clusters.map((cl) => cl.p);
  leaves.onBeforeRender = () => {
    const now = performance.now() / 1000, dt = Math.min(0.1, now - last); last = now; stepWind(now); mat.color.copy(treeTint); fall.material.color.copy(treeTint);
    if (fade < 1) {
      fade = Math.min(1, fade + dt / 5); const arr = leaves.instanceColor.array, k = fade * fade * (3 - 2 * fade);
      for (let n = 0; n < arr.length; n++) arr[n] = from[n] + (to[n] - from[n]) * k;
      leaves.instanceColor.needsUpdate = true;
    } else if (now > nextChange) { let nx; do { nx = (Math.random() * 4) | 0; } while (nx === cur); setSeason(nx); nextChange = now + 20 + Math.random() * 60; }
    const pal = paletteOf(sp, species, SEASON_LIST[cur]);
    for (let n = 0; n < NF; n++) {
      const p = fl[n];
      if (!p.on) {
        if (Math.random() < dt * rate() * 0.8) { const o = crown[(Math.random() * crown.length) | 0]; p.x = o.x + (Math.random() - 0.5) * 0.3; p.y = o.y; p.z = o.z + (Math.random() - 0.5) * 0.3; p.vy = 0.12 + Math.random() * 0.15; p.on = true; fc.set(pal[(Math.random() * pal.length) | 0]); fall.setColorAt(n, fc); fall.instanceColor.needsUpdate = true; }
        else { hide(n); continue; }
      }
      p.y -= p.vy * dt * (0.6 + treeWind.value * 0.5); p.x += (Math.sin(now * p.sp + p.ph) * 0.05 + 0.03 * treeWind.value) * dt; p.z += Math.cos(now * p.sp * 0.7 + p.ph) * 0.03 * dt; p.rot += dt * p.sp * 1.6;
      if (p.y < 0.02) { p.on = false; hide(n); continue; }
      fd.position.set(p.x, p.y, p.z); fd.rotation.set(p.rot, p.ph + p.rot * 0.5, p.rot * 0.7); fd.scale.set(sp.leaf * 1.1, sp.leaf * 1.4, sp.leaf * 1.1); fd.updateMatrix(); fall.setMatrixAt(n, fd.matrix);
    }
    fall.instanceMatrix.needsUpdate = true;
  };
  for (let n = 0; n < NF; n++) { hide(n); fc.set('#ffffff'); fall.setColorAt(n, fc); }
  // l'arbre est ramené à la taille demandée : hauteur H, couronne pas plus large que son espèce ne le permet
  const box = new THREE.Box3().setFromObject(bark);
  for (const cl of clusters) box.expandByPoint(cl.p.clone().addScalar(cl.s * 1.8)).expandByPoint(cl.p.clone().addScalar(-cl.s * 1.8));
  const hh = Math.max(0.1, box.max.y), ww = Math.max(box.max.x - box.min.x, box.max.z - box.min.z), wide = species === 'pine' ? 0.62 : species === 'ginkgo' ? 0.55 : 1.05;
  g.scale.setScalar(Math.min(1.2, H / hh, (H * wide) / ww));
  return g;
}

