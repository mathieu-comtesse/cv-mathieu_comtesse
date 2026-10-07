import { THREE, mat, mesh, box, cyl, sph, group, rbox, bone, canvasTexture, rng, inkify } from './kit.js?v=8ca0d7c';

/* ───────────────────────── Rituel du thé (chanoyu, matcha) ─────────────────────────
 * Repère « invité » : origine au centre du zabuton de l'invité, +z vers l'hôte, +y vers le haut, y = 0 sur la surface du tatami.
 * Conventions suivies (école Urasenke, temae simplifié) :
 *  - tatami (igusa, bordure noire en long) ; zabutons de l'invité et de l'hôte face à face ;
 *  - côté hôte : furo (réchaud en terre) + kama (marmite en fonte, deux anses, couvercle à bouton) à gauche de l'hôte,
 *    hishaku (louche en bambou) posé en travers de la kama, futaoki (repose-couvercle) à côté,
 *    mizusashi (jarre à eau, couvercle laqué) à droite, kensui (bol à eaux usées en bronze) devant,
 *    bon (plateau laqué) avec natsume (boîte à thé laquée noire), chashaku (cuillère en bambou) posée en travers du natsume,
 *    chakin (linge blanc plié) et chasen (fouet en bambou) sur son support ;
 *  - côté invité : chawan servi, face décorée (shomen) tournée vers l'invité ; kashibachi avec wagashi sur kaishi, pique kuromoji ;
 *  - chaussures ôtées au bord du tatami, bout vers l'extérieur ; chaussettes tabi ; tabouret avec chabana (une seule fleur) en guise de tokonoma. */

const LACQ = () => mat('#1b1411', { roughness: 0.22, metalness: 0.1 });
const BAMBOO = () => mat('#d3c486', { roughness: 0.7 });

function lathe(pts, m, seg = 28) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  return mesh(g, m);
}
const dbl = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide, ...o });

/* ── tatami ── */
export function tatami() {
  const g = group();
  const tex = canvasTexture(128, 256, (c, w, h) => {
    c.fillStyle = '#b6bf86'; c.fillRect(0, 0, w, h);
    const r = rng(2);
    for (let y = 0; y < h; y += 2) { c.fillStyle = r() > 0.5 ? '#a8b27a' : '#bdc690'; c.fillRect(0, y, w, 1); }
    c.fillStyle = 'rgba(70,80,40,.12)'; for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 1, h);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.055, 1.9), [mat('#4a4a30'), mat('#4a4a30'), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), mat('#4a4a30'), mat('#4a4a30'), mat('#4a4a30')]);
  top.position.set(0, 0.0275, 0.75); top.castShadow = top.receiveShadow = true; g.add(top);
  for (const s of [-1, 1]) g.add(box(0.05, 0.057, 1.9, mat('#1c1915', { roughness: 0.9 }), s * 0.45, 0.0285, 0.75));      // heri
  return g;
}

export function zabuton() {
  const g = group();
  g.add(rbox(0.46, 0.07, 0.46, 0.03, mat('#34456e', { roughness: 0.95 }), 0, 0.035, 0));
  g.add(cyl(0.03, 0.03, 0.01, mat('#20294a'), 0, 0.072, 0, 14));
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(sph(0.016, mat('#e3d9c0'), x * 0.225, 0.035, z * 0.225, 8, 6));
  return g;
}

/* ── chawan : bol, face décorée (shomen) repérée par une plage claire côté invité (−z) ── */
export function chawan() {
  const g = group();
  const outer = [[0, 0], [0.027, 0], [0.03, 0.008], [0.045, 0.014], [0.058, 0.032], [0.064, 0.056], [0.0625, 0.074]];
  const inner = [[0.0565, 0.072], [0.05, 0.052], [0.04, 0.026], [0, 0.019]];
  const geo = new THREE.LatheGeometry([...outer, ...inner].map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const dark = new THREE.Color('#3a2a24'), ash = new THREE.Color('#b9a98c'), drip = new THREE.Color('#6d4a35'), inside = new THREE.Color('#2b201c');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ang = Math.atan2(x, -z);          // 0 = face tournée vers −z
    let c = dark;
    if (Math.abs(ang) < 0.75 && y > 0.032 && y < 0.07 && Math.hypot(x, z) > 0.05) c = ash.clone().lerp(drip, Math.min(1, Math.abs(ang) / 0.75) * 0.6 + (0.07 - y) * 4);
    else if (y < 0.03) c = dark.clone().lerp(drip, 0.4);
    if (Math.hypot(x, z) < 0.058 && y > 0.03 && i > outer.length * 41) c = inside;
    c.toArray(col, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const bowl = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
  g.add(bowl);
  const foam = canvasTexture(64, 64, (c, w, h) => {
    c.fillStyle = '#7fb352'; c.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 90; i++) { c.fillStyle = r() > 0.5 ? '#9ccb6a' : '#65983f'; c.beginPath(); c.arc(r() * w, r() * h, 1 + r() * 2.4, 0, 6.3); c.fill(); }
  });
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.0495, 32), new THREE.MeshStandardMaterial({ map: foam, roughness: 0.6 }));
  tea.rotation.x = -Math.PI / 2; tea.position.y = 0.05; g.add(tea);
  g.userData.tea = tea; g.userData.top = 0.074;
  return g;
}

export function kashibachi() {
  const g = group();
  g.add(rbox(0.12, 0.014, 0.12, 0.005, LACQ(), 0, 0.007, 0));
  const paper = box(0.1, 0.002, 0.1, mat('#f7f3ea', { roughness: 1 }), 0, 0.0155, 0); paper.rotation.y = 0.5; g.add(paper);
  const sweet = sph(0.026, mat('#f2b6c4', { roughness: 0.6 }), 0, 0.03, 0, 14, 10); sweet.scale.y = 0.7; g.add(sweet);
  g.add(sph(0.008, mat('#7cae5a'), 0.01, 0.047, 0.01, 8, 6));
  const pick = box(0.15, 0.004, 0.004, mat('#3a2a1c', { roughness: 0.6 }), 0.0, 0.02, 0.07); g.add(pick);
  g.userData.sweet = sweet;
  return g;
}

/* ── côté hôte ── */
export function furoKama() {
  const g = group();
  const clay = mat('#7a5646', { roughness: 0.95 }), iron = mat('#2a2724', { roughness: 0.5, metalness: 0.35 });
  const furo = lathe([[0, 0], [0.085, 0], [0.098, 0.02], [0.105, 0.085], [0.1, 0.15], [0.116, 0.16], [0.116, 0.172], [0.086, 0.172]], new THREE.MeshStandardMaterial({ color: '#7a5646', roughness: 0.95, side: THREE.DoubleSide }));
  g.add(furo);
  g.add(mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 18), iron, 0, 0.173, 0)).rotation.x = Math.PI / 2;
  const kama = group();
  kama.add(lathe([[0, 0], [0.07, 0], [0.1, 0.03], [0.108, 0.072], [0.1, 0.112], [0.072, 0.134], [0.064, 0.142], [0.057, 0.14]], new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide })));
  const lid = lathe([[0, 0.178], [0.03, 0.174], [0.058, 0.15], [0.062, 0.141]], new THREE.MeshStandardMaterial({ color: '#33302c', roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide }));
  kama.add(lid); kama.add(sph(0.013, iron, 0, 0.184, 0, 10, 8));
  for (const s of [-1, 1]) { const ear = mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), iron, s * 0.109, 0.1, 0); ear.rotation.y = Math.PI / 2; kama.add(ear); }
  kama.position.y = 0.172; g.add(kama);
  // hishaku en travers de la kama
  const hi = group();
  const cup = mesh(new THREE.CylinderGeometry(0.032, 0.03, 0.055, 14, 1, true), dbl('#d5c58a'));
  hi.add(cup, mesh(new THREE.CircleGeometry(0.03, 14), dbl('#d5c58a'), 0, -0.027, 0)).children[1].rotation.x = -Math.PI / 2;
  const handle = box(0.24, 0.007, 0.013, BAMBOO(), 0.14, 0.01, 0); hi.add(handle);
  hi.position.set(-0.07, 0.36, 0.0); hi.rotation.set(0, 0.0, 0.0); hi.position.y = 0.172 + 0.152 + 0.025;
  g.add(hi);
  g.userData.steamAnchor = new THREE.Vector3(0, 0.172 + 0.19, 0);
  return g;
}

export function mizusashi() {
  const g = group();
  const geo = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.085, 0.03], [0.089, 0.12], [0.08, 0.15], [0.074, 0.158], [0.066, 0.156]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), base = new THREE.Color('#ebe5d2'), band = new THREE.Color('#7f95a8');
  for (let i = 0; i < p.count; i++) (p.getY(i) > 0.05 && p.getY(i) < 0.075 ? band : base).toArray(col, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.add(mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide })));
  g.add(cyl(0.078, 0.078, 0.014, LACQ(), 0, 0.165, 0, 28));
  g.add(cyl(0.011, 0.011, 0.012, LACQ(), 0, 0.178, 0, 10));
  return g;
}

export function kensui() {
  const g = group();
  const bronze = new THREE.MeshStandardMaterial({ color: '#8b6b3c', roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide });
  g.add(lathe([[0, 0], [0.06, 0], [0.075, 0.02], [0.079, 0.07], [0.073, 0.082], [0.066, 0.078]], bronze));
  g.add(cyl(0.07, 0.07, 0.006, bronze, 0, 0.085, 0, 24));
  return g;
}

export function bonSet() {
  const g = group();
  g.add(cyl(0.15, 0.15, 0.012, LACQ(), 0, 0.006, 0, 36));
  g.add(mesh(new THREE.TorusGeometry(0.15, 0.005, 6, 36), LACQ(), 0, 0.012, 0)).rotation.x = Math.PI / 2;
  const nat = lathe([[0, 0], [0.03, 0], [0.037, 0.012], [0.037, 0.05], [0.033, 0.062], [0, 0.065]], new THREE.MeshStandardMaterial({ color: '#15100e', roughness: 0.18, metalness: 0.1, side: THREE.DoubleSide }));
  nat.position.set(0.05, 0.012, 0.0); g.add(nat);
  const sc = group(box(0.18, 0.003, 0.011, BAMBOO(), 0, 0, 0), box(0.02, 0.003, 0.011, BAMBOO(), 0.095, 0.006, 0)); sc.children[1].rotation.z = 0.5;
  sc.position.set(0.05, 0.081, 0.0); sc.rotation.y = 0.1; g.add(sc);
  g.add(box(0.05, 0.02, 0.032, mat('#f7f4ec', { roughness: 1 }), -0.07, 0.022, 0.03));                 // chakin
  return g;
}
export function chasen() {
  const g = group();
  g.add(lathe([[0, 0], [0.036, 0], [0.04, 0.012], [0.036, 0.04], [0, 0.04]], dbl('#9a8c6c', { roughness: 0.6 })));      // kusenaoshi (support)
  const tines = mesh(new THREE.CylinderGeometry(0.015, 0.032, 0.06, 14, 1), mat('#dcc88c', { roughness: 0.8 })); tines.position.y = 0.048 + 0.02; g.add(tines);
  const h = cyl(0.012, 0.014, 0.05, mat('#cdbb7e'), 0, 0.1, 0, 10); g.add(h);
  return g;
}
export function futaoki() { return mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.04, 12, 1, true), dbl('#a8b061'), 0, 0.02, 0); }

/* ── chabana : une seule fleur dans un hanaire en bambou ── */
export function chabana() {
  const g = group();
  g.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 14, 1, true), dbl('#a89c5a'), 0, 0.11, 0));
  g.add(mesh(new THREE.TorusGeometry(0.037, 0.004, 5, 14), mat('#8a7f44'), 0, 0.13, 0)).rotation.x = Math.PI / 2;
  g.add(bone([0, 0.1, 0], [0.02, 0.36, 0.01], 0.004, 0.003, mat('#3f6a38'), 6));
  const pet = mat('#d1405a', { roughness: 0.6 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const p = sph(0.021, pet, 0.02 + Math.cos(a) * 0.022, 0.375, 0.01 + Math.sin(a) * 0.022, 8, 6); p.scale.y = 0.6; g.add(p); }
  g.add(sph(0.014, mat('#e8c43a'), 0.02, 0.385, 0.01, 8, 6));
  for (const [x, z, r] of [[0.0, 0.0, 0.5], [0.03, 0.02, 2.4]]) { const l = box(0.06, 0.006, 0.03, mat('#2f6034'), x, 0.3, z); l.rotation.y = r; l.rotation.z = 0.3; g.add(l); }
  return g;
}

/* ── chaussures ôtées, bout vers l'extérieur ── */
export function shoePair() {
  const g = group();
  const red = mat('#8f1d0a'), sole = mat('#d9d19a'), dark = mat('#4a0e05'), heel = mat('#4a5348');
  for (const s of [-1, 1]) {
    const sh = group();
    sh.add(rbox(0.1, 0.02, 0.2, 0.006, sole, 0, 0.01, 0));
    sh.add(box(0.09, 0.07, 0.1, dark, 0, 0.06, -0.04));
    sh.add(box(0.085, 0.04, 0.1, red, 0, 0.04, 0.05));
    sh.add(box(0.07, 0.04, 0.05, heel, 0, 0.035, -0.09));
    sh.position.set(s * 0.09, 0, 0); sh.rotation.y = s * 0.12; g.add(sh);
  }
  return g;
}

/* ── vapeur ── */
let steamTex = null;
export function steamSprites(n = 6) {
  if (!steamTex) steamTex = canvasTexture(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const g = group(), list = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    g.add(s); list.push({ s, ph: i / n, seed: Math.random() * 6 });
  }
  g.userData.list = list;
  return g;
}
export function updateSteam(g, t, rise = 0.28, size = 0.12, strength = 1) {
  for (const p of g.userData.list) {
    const k = (t * 0.35 + p.ph) % 1;
    p.s.position.set(Math.sin(k * 6 + p.seed) * 0.02 * (0.3 + k), k * rise, Math.cos(k * 5 + p.seed) * 0.02 * (0.3 + k));
    const sc = size * (0.35 + k * 1.1); p.s.scale.set(sc, sc, 1);
    p.s.material.opacity = Math.sin(k * Math.PI) * 0.55 * strength;
  }
}

/* ── installation complète, dans le repère invité ── */
export function teaSet({ mat: withMat = true } = {}) {
  const g = group();
  if (withMat) g.add(tatami());
  const zg = zabuton(); zg.position.set(0, 0.055, 0); g.add(zg);
  const zh = zabuton(); zh.position.set(0, 0.055, 1.42); zh.rotation.y = Math.PI; g.add(zh);
  const bowl = chawan(); bowl.position.set(0, 0.055, 0.42); g.add(bowl);
  const sweets = kashibachi(); sweets.position.set(-0.23, 0.055, 0.34); sweets.rotation.y = 0.15; g.add(sweets);
  const fk = furoKama(); fk.position.set(0.34, 0.055, 1.04); g.add(fk);                // côté gauche de l'hôte (il regarde −z)
  const mz = mizusashi(); mz.position.set(-0.26, 0.055, 1.06); g.add(mz);               // à droite de l'hôte
  const bon = bonSet(); bon.position.set(0.0, 0.055, 0.96); g.add(bon);
  const ch = chasen(); ch.position.set(0.17, 0.055, 0.84); g.add(ch);
  const ks = kensui(); ks.position.set(0.11, 0.055, 1.22); g.add(ks);
  const fo = futaoki(); fo.position.set(0.19, 0.055, 1.18); g.add(fo);
  for (const o of [bowl, sweets, fk, mz, bon, ch, ks, fo]) inkify(o, { skip: (m) => m.material.vertexColors || m.userData.isTea });
  const sBowl = steamSprites(7), sKama = steamSprites(7);
  g.add(sBowl, sKama);
  g.userData = { bowl, sweets, fk, sBowl, sKama, zg, zh };
  return g;
}
