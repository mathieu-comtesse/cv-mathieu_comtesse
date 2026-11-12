/* L'exposition : tout le profil en WebGL, sur un chemin que l'on parcourt à la molette ou au doigt.
 * Deux modes : « expo » (cadres dressés à 55 degrés, vue en perspective) et « à plat » (cadres couchés, vue de dessus).
 * Un tronc relie les chapitres, des branches en partent vers chaque cadre et poussent devant le visiteur ; Mathieu marche le long du tronc.
 * Code original : rendu encre et hachures de monde3d/jeu/rendu.js, contenu de expo/donnees.js. */
import * as THREE from 'three';
import { creerRendu, encre } from '../monde3d/jeu/rendu.js';
import { Batisseur, K, ile, rocher, eclat, touffe, alea } from '../monde3d/jeu/monde.js';
import { charger } from '../monde3d/jeu/perso.js';
import { CHAPITRES } from './donnees.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene'), PI = Math.PI, INCLINAISON = 55 * PI / 180;
const ENCRE = '#2a2530', PAPIER = '#fbf7ec', RECIT = '#f5e6a6', ORANGE = '#ee8a3a', TURQUOISE = '#7cc4b4';
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
await (document.fonts?.load('400 40px "Lettrage"') || Promise.resolve()).catch(() => {});   // le lettrage doit être là avant de dessiner les textes

let rendu;
try { rendu = creerRendu(canvas); } catch (e) { document.body.classList.add('texte'); throw e; }
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, 2, 2400);
scene.add(new THREE.HemisphereLight(0xffffff, 0xa397a8, 1.1));
const soleil = new THREE.DirectionalLight(0xffffff, 2.6), dirSoleil = new THREE.Vector3(-0.55, 0.8, 0.45).normalize();
soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048); soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.05;
Object.assign(soleil.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 150 }); soleil.shadow.camera.updateProjectionMatrix();
scene.add(soleil, soleil.target);

/* ───────── mise en place : chapitres et cadres le long de -z ───────── */
const portrait = () => innerWidth / innerHeight < 0.82;
const ETROIT = portrait();
const W = 3.5, H = 2.25, PAS = ETROIT ? 3.3 : 2.45, COTE = ETROIT ? 0.55 : 2.75, TRONC_X = ETROIT ? -2.15 : 0;
const tx = (z) => TRONC_X + (ETROIT ? 0.12 : 0.5) * Math.sin(z * 0.21);
const cadres = [], chapitres = [];
{
  let z = -1;
  CHAPITRES.forEach((c, k) => {
    const ch = { ...c, k, z, s: -z - 3.2, cadres: [] }; chapitres.push(ch);
    z -= 5.2;
    c.cadres.forEach((d, i) => {
      const cote = i % 2 ? 1 : -1, f = { ...d, ch, i, n: cadres.length, x: (c.cadres.length === 1 ? 0 : cote * COTE) + (ETROIT ? 0.5 : 0), z, cote, survol: 0, ouvert: 0 };
      cadres.push(f); ch.cadres.push(f); z -= PAS;
    });
    ch.fin = z; z -= 4.5;
  });
}
const FIN = -cadres[cadres.length - 1].z + 1.5, DEBUT = -3;

/* ───────── textes dessinés (toile 2D vers texture) ───────── */
const POLICE = '"Lettrage", "Trebuchet MS", sans-serif';
const images = new Map();
function image(url, quand) {
  let e = images.get(url);
  if (!e) { e = { img: new Image(), pret: false, attente: [] }; images.set(url, e); e.img.onload = () => { e.pret = true; e.attente.forEach((f) => f()); e.attente = []; }; e.img.src = url; }
  if (!e.pret) e.attente.push(quand);
  return e.pret ? e.img : null;
}
function lignes(g, texte, largeur, max = 99) {
  const out = []; let l = '';
  for (const mot of String(texte).split(/\s+/)) { const t = l ? l + ' ' + mot : mot; if (g.measureText(t).width > largeur && l) { out.push(l); l = mot; } else l = t; }
  if (l) out.push(l);
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s+\S*$/, '') + '…'; }
  return out;
}
function cadreMain(g, x, y, w, h, graine, ep = 5) {   // trait à main levée : quatre côtés légèrement tremblés
  const rd = alea(graine), j = () => (rd() - 0.5) * 5;
  g.lineWidth = ep; g.lineJoin = 'round'; g.strokeStyle = ENCRE; g.beginPath();
  g.moveTo(x + j(), y + j()); g.lineTo(x + w / 2 + j(), y + j() * 0.6); g.lineTo(x + w + j(), y + j()); g.lineTo(x + w + j() * 0.6, y + h / 2 + j()); g.lineTo(x + w + j(), y + h + j());
  g.lineTo(x + w / 2 + j(), y + h + j() * 0.6); g.lineTo(x + j(), y + h + j()); g.lineTo(x + j() * 0.6, y + h / 2 + j()); g.closePath(); g.stroke();
}
const TW = 960, TH = Math.round(TW * H / W);
function dessine(f) {
  const c = f.toile, g = c.getContext('2d');
  g.fillStyle = PAPIER; g.fillRect(0, 0, TW, TH);
  cadreMain(g, 16, 16, TW - 32, TH - 32, f.n + 3, 6);
  let x = 52, larg = TW - 104;
  if (f.img) {
    const iw = 356, ih = TH - 104, im = image(f.img, () => { if (f.tex) { dessine(f); f.tex.needsUpdate = true; } });
    g.fillStyle = '#e9dcc0'; g.fillRect(52, 52, iw, ih);
    if (im) { const k = Math.max(iw / im.width, ih / im.height), sw = iw / k, sh = ih / k; g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 52, 52, iw, ih); }
    cadreMain(g, 52, 52, iw, ih, f.n + 40, 4);
    x = 52 + iw + 34; larg = TW - x - 52;
  }
  let y = 62; g.textBaseline = 'top'; g.textAlign = 'left';
  if (f.kicker) { g.font = `400 30px ${POLICE}`; const kw = g.measureText(f.kicker).width + 26; g.fillStyle = f.type === 'projet' ? ORANGE : TURQUOISE; g.fillRect(x, y, kw, 42); g.lineWidth = 3; g.strokeStyle = ENCRE; g.strokeRect(x, y, kw, 42); g.fillStyle = ENCRE; g.fillText(f.kicker, x + 13, y + 4); y += 58; }
  g.fillStyle = ENCRE; g.font = `400 ${f.img ? 56 : 72}px ${POLICE}`;
  for (const l of lignes(g, f.titre, larg, 3)) { g.fillText(l, x, y); y += f.img ? 56 : 72; }
  if (f.sous) { y += 2; g.font = `400 34px ${POLICE}`; g.fillStyle = '#6b6072'; for (const l of lignes(g, f.sous, larg, 2)) { g.fillText(l, x, y); y += 37; } }
  y += 12; g.fillStyle = ENCRE;
  const bas = TH - 56 - (f.puce ? (f.puce2 ? 116 : 62) : 0);
  if (f.liste) {
    g.font = `400 35px ${POLICE}`; let lx = x, ly = y;
    for (const mot of f.liste) { const w = g.measureText(mot).width + 30; if (lx + w > x + larg) { lx = x; ly += 60; } if (ly + 50 > bas) break; g.fillStyle = RECIT; g.fillRect(lx, ly, w, 50); g.lineWidth = 3; g.strokeRect(lx, ly, w, 50); g.fillStyle = ENCRE; g.fillText(mot, lx + 15, ly + 6); lx += w + 12; }
  } else if (f.texte) {
    g.font = `400 ${f.img ? 32 : 39}px ${POLICE}`; const hl = f.img ? 36 : 45;
    for (const l of lignes(g, f.texte, larg, Math.max(1, Math.floor((bas - y) / hl)))) { g.fillText(l, x, y); y += hl; }
  }
  let py = TH - 52;
  for (const p of [f.puce2, f.puce].filter(Boolean)) {
    g.font = `400 34px ${POLICE}`; const t = lignes(g, p, larg - 28, 1)[0], w = Math.min(larg, g.measureText(t).width + 30); py -= 52;
    g.fillStyle = RECIT; g.fillRect(x, py, w, 46); g.lineWidth = 3; g.strokeStyle = ENCRE; g.strokeRect(x, py, w, 46); g.fillStyle = ENCRE; g.fillText(t, x + 15, py + 4); py -= 6;
  }
}
function texteSol(texte, { taille = 190, larg = 2048, haut = 300, couleur = ENCRE } = {}) {   // lettrage peint au sol : texture à fond transparent
  const c = document.createElement('canvas'); c.width = larg; c.height = haut; const g = c.getContext('2d');
  g.fillStyle = couleur; g.textAlign = 'center'; g.textBaseline = 'middle'; let t = taille; g.font = `400 ${t}px ${POLICE}`;
  while (g.measureText(texte).width > larg - 60 && t > 40) { t -= 6; g.font = `400 ${t}px ${POLICE}`; }
  try { g.letterSpacing = '8px'; } catch {}
  g.fillText(texte, larg / 2, haut / 2 + 6);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}

/* ───────── décor fixe : sol, cailloux, cristaux, mesas, îles au loin ───────── */
const mat = encre({ vertexColors: true, side: THREE.DoubleSide });
{
  const B = new Batisseur({ col: () => ({}), cols: [] }), rd = alea(2026), L = FIN + 60;
  /* sol en dalles de 14 m : un seul très grand triangle perd de la précision de profondeur et fait naître de faux traits d'encre */
  { const t = [], C = 14; for (let x = -266; x < 266; x += C) for (let z = 56; z > -L - 400; z -= C) t.push(x, 0, z, x + C, 0, z, x + C, 0, z - C, x, 0, z, x + C, 0, z - C, x, 0, z - C); B.tris(K.sable, t); }
  for (let z = 6; z > -L; z -= 2.1) {
    const cote = rd() < 0.5 ? -1 : 1, d = (ETROIT ? 5.2 : 8.2) + rd() * 15, x = cote * d + tx(z), t = rd();
    if (t < 0.34) rocher(B, x, 0, z, 0.3 + rd() * 0.7, rd() < 0.5 ? K.rose : K.mauve, z | 0);
    else if (t < 0.5) eclat(B, x, 0, z, 0.7 + rd() * 1.3, K.cristal, 0.1 + rd() * 0.25, rd() * 6);
    else if (t < 0.93) touffe(B, x, 0, z, rd() < 0.5 ? K.herbe2 : K.feuille, 0.3 + rd() * 0.35);
    else { let r = 1.2 + rd() * 1.6, y = 0; for (let k = 0; k < 3; k++) { const h = 0.8 + rd() * 1.4; B.c(k % 2 ? K.mauve : K.rose, r * 0.8, r, h, 7, x + cote * 9, y, z, 0, rd() * 3); y += h; r *= 0.66; } }
  }
  for (let z = -10; z > -L; z -= 38) for (const cote of [-1, 1]) { const r = 5 + rd() * 5; ile(B, { x: cote * (30 + rd() * 22), z: z - rd() * 20, y: 7 + rd() * 12, r, graine: (z | 0) + cote, sol: rd() < 0.5 ? K.herbe : K.sable, roche: rd() < 0.5 ? [K.rose, K.mauve] : [K.ocre, K.rose] }); }
  for (let i = 0; i < 26; i++) { const a = rd() * PI * 2, d = 240 + rd() * 500, x = Math.cos(a) * d, z = -L / 2 + Math.sin(a) * (d + L / 2); let r = 24 + rd() * 50, y = -4; for (let k = 0; k < 3; k++) { const h = 18 + rd() * 40; B.c(k % 2 ? K.mauve : K.rose, r * 0.82, r, h, 7, x, y, z, 0, rd() * 3); y += h; r *= 0.66; } }
  /* porte du jeu, au bout du chemin */
  const zf = cadres[cadres.length - 1].z - 3.6;
  for (const s of [-1, 1]) { B.b(K.sable2, 1.0, 0.4, 1.1, s * 2.6, 0, zf); B.b(K.rose, 0.8, 2.2, 0.9, s * 2.6, 0.4, zf); B.b(K.mauve, 0.72, 2.2, 0.8, s * 2.6, 2.6, zf); B.b(K.sable2, 0.96, 0.3, 1.06, s * 2.6, 4.8, zf); }
  B.b(K.rose, 6.8, 0.8, 1.1, 0, 5.1, zf); B.b(K.sable2, 4.2, 0.45, 0.95, 0, 5.9, zf); B.c(K.orange, 0.5, 0.5, 0.14, 8, 0, 5.5 - 0.07, zf + 0.6, PI / 2);
  eclat(B, 4.6, 0, zf + 0.6, 2.4, K.cristal, 0.25, 1); eclat(B, -4.8, 0, zf + 0.2, 1.8, '#e9dc9a', -0.2, 2);
  const me = B.maillage(mat); scene.add(me);
}
/* nuages */
{
  const B = new Batisseur({ col: () => ({}) }), rd = alea(5);
  for (let i = 0; i < 22; i++) { const x = (rd() - 0.5) * 700, z = 80 - rd() * (FIN + 500), y = 30 + rd() * 90, s = 8 + rd() * 12; for (let k = 0; k < 5; k++) B.s(k % 2 ? '#f6efdf' : '#eadfca', s * (0.55 + rd() * 0.5), 1, x + (k - 2) * s * 0.7, y + (rd() - 0.3) * s * 0.3, z + (rd() - 0.5) * s * 0.6, 1.2, 0.42, 1); }
  const me = B.maillage(encre({ vertexColors: true, emissive: '#6b6b6b' })); me.castShadow = me.receiveShadow = false; scene.add(me);
}

/* ───────── tronc, branches et étoiles : un seul ruban, qui pousse devant le visiteur ───────── */
const uTete = { value: 0 }, uTemps = { value: 0 };
const etoiles = [];
{
  const P = [], T = [], I = [];
  const ruban = (pts, larg, g0, gPas) => {   // pts : [x, z] ; g : coordonnée de croissance
    const base = P.length / 3; let g = g0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * larg / 2, nz = dx / l * larg / 2;
      if (i) g += gPas == null ? Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) : gPas;
      P.push(pts[i][0] + nx, 0.045, pts[i][1] + nz, pts[i][0] - nx, 0.045, pts[i][1] - nz); T.push(g, g);
      if (i) { const k = base + i * 2; I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
  };
  const tronc = []; for (let z = 5; z >= -FIN - 9; z -= 0.4) tronc.push([tx(z), z]);
  ruban(tronc, 0.17, -5, 0.4);
  for (const f of cadres) {
    const z0 = f.z + 1.5, x0 = tx(z0), x1 = f.x - Math.sign(f.x - x0 || 1) * 0.2, z1 = f.z + 0.5, pts = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14, cx = x0 + (x1 - x0) * 0.25, cz = z1 + 0.1; pts.push([(1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * cx + u * u * x1, (1 - u) * (1 - u) * z0 + 2 * u * (1 - u) * cz + u * u * z1]); }
    ruban(pts, 0.085, -z0, null);
    f.naissance = -z0 + Math.hypot(x1 - x0, z1 - z0) * 1.1;
    etoiles.push({ x: x0, z: z0, g: -z0, s: 0.2 }, { x: x1, z: z1, g: f.naissance, s: 0.3 });
  }
  for (const ch of chapitres) etoiles.push({ x: tx(ch.z - 2.4), z: ch.z - 2.4, g: -ch.z + 2.4, s: 0.5 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('aT', new THREE.Float32BufferAttribute(T, 1)); geo.setIndex(I); geo.computeVertexNormals();
  const m = encre({ color: ENCRE, side: THREE.DoubleSide }, { plat: true }), avant = m.onBeforeCompile;
  m.onBeforeCompile = (s) => {
    avant(s); s.uniforms.uTete = uTete; s.uniforms.uTemps = uTemps;
    s.vertexShader = 'attribute float aT; varying float vT;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vT = aT;');
    s.fragmentShader = 'uniform float uTete; uniform float uTemps; varying float vT;\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      if (vT > uTete) discard;
      float onde_ = fract((vT - uTemps * 3.2) / 11.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.26, 0.045), smoothstep(0.075, 0.0, onde_) + smoothstep(0.55, 0.0, uTete - vT));`);
  };
  m.customProgramCacheKey = () => 'encre-branches';
  const me = new THREE.Mesh(geo, m); me.frustumCulled = false; me.receiveShadow = false; scene.add(me);
}
const geoEtoile = (() => { const s = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2, r = i % 2 ? 0.32 : 1; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return new THREE.ShapeGeometry(s).rotateX(-PI / 2); })();
const maillageEtoiles = new THREE.InstancedMesh(geoEtoile, encre({ color: '#f3eca5', side: THREE.DoubleSide }, { plat: true }), etoiles.length);
maillageEtoiles.frustumCulled = false; scene.add(maillageEtoiles); etoiles.forEach((e) => { e.k = 0; });

/* ───────── cadres ───────── */
const matBord = encre({ color: K.noyer }), matDos = encre({ color: '#e9dcc0' }), matPied = encre({ color: K.noyer });
const geoCadre = new THREE.BoxGeometry(W, H, 0.09).translate(0, H / 2, 0), geoPied = new THREE.BoxGeometry(0.09, 1, 0.09).translate(0, 0.5, 0);
const faces = [];
for (const f of cadres) {
  const pivot = new THREE.Group(); pivot.position.set(f.x, 0.07, f.z); pivot.rotation.y = ETROIT ? 0 : -f.cote * 0.17 * (f.ch.cadres.length === 1 ? 0 : 1); scene.add(pivot);
  const face = encre({ color: PAPIER }, { plat: true });
  const panneau = new THREE.Mesh(geoCadre, [matBord, matBord, matBord, matBord, face, matDos]); panneau.castShadow = true; pivot.add(panneau);
  const pieds = [-1, 1].map((s) => { const p = new THREE.Mesh(geoPied, matPied); p.position.x = s * W * 0.32; p.castShadow = true; pivot.add(p); return p; });
  Object.assign(f, { pivot, panneau, pieds, face, tex: null, toile: null, yaw: pivot.rotation.y }); panneau.userData.cadre = f; faces.push(panneau);
}
function texture(f, proche) {
  if (proche && !f.tex) {
    f.toile = document.createElement('canvas'); f.toile.width = TW; f.toile.height = TH; dessine(f);
    f.tex = new THREE.CanvasTexture(f.toile); f.tex.colorSpace = THREE.SRGBColorSpace; f.tex.anisotropy = 8; f.face.map = f.tex; f.face.color.set('#ffffff'); f.face.needsUpdate = true;
  } else if (!proche && f.tex) { f.tex.dispose(); f.tex = null; f.toile = null; f.face.map = null; f.face.color.set(PAPIER); f.face.needsUpdate = true; }
}
/* titres de chapitre peints au sol */
for (const ch of chapitres) {
  const l = ETROIT ? 5.2 : 10.5, g = new THREE.PlaneGeometry(l, l * 300 / 2048).rotateX(-PI / 2);
  const t = new THREE.Mesh(g, encre({ map: texteSol(ch.titre.toUpperCase()), alphaTest: 0.45, side: THREE.DoubleSide }, { plat: true })); t.position.set(ETROIT ? 0.4 : 0, 0.05, ch.z - 1.2); scene.add(t);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(l * 0.8, l * 0.8 * 150 / 2048).rotateX(-PI / 2), encre({ map: texteSol(`${String(ch.k + 1).padStart(2, '0')} · ${ch.sous}`, { taille: 110, haut: 150, couleur: '#5b5062' }), alphaTest: 0.45, side: THREE.DoubleSide }, { plat: true })); s.position.set(ETROIT ? 0.4 : 0, 0.05, ch.z - 1.2 + l * 0.115); scene.add(s);
}

/* ───────── anneau sous le curseur ───────── */
const anneau = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.39, 24).rotateX(-PI / 2), encre({ color: ENCRE, side: THREE.DoubleSide }, { plat: true })); anneau.position.y = 0.06; anneau.visible = false; scene.add(anneau);
const anneau2 = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.445, 24).rotateX(-PI / 2), anneau.material); anneau2.position.y = 0.06; anneau2.visible = false; scene.add(anneau2);

/* ───────── état, entrées ───────── */
let s = DEBUT, sCible = DEBUT, mode = 0, modeCible = 0, temps = 0, survole = null, ouvert = null, heros = null, herosZ = 2, monde = null, dernier = performance.now();
const souris = new THREE.Vector2(9, 9), rayon = new THREE.Raycaster(), solPlan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pointSol = new THREE.Vector3();
const borne = (v) => Math.min(FIN, Math.max(DEBUT, v));
const va = (v) => { sCible = borne(v); ferme(); };
addEventListener('wheel', (e) => { if (monde) return; e.preventDefault(); if (ouvert) ferme(); sCible = borne(sCible + e.deltaY * (e.deltaMode ? 0.5 : 0.011)); }, { passive: false });
addEventListener('keydown', (e) => {
  if (monde) return;
  const p = { ArrowDown: 2.5, ArrowUp: -2.5, PageDown: 9, PageUp: -9, ' ': 9 }[e.key];
  if (p) { e.preventDefault(); va(sCible + p); } else if (e.key === 'Home') va(DEBUT); else if (e.key === 'End') va(FIN); else if (e.key === 'Escape') ferme(); else if (e.key === 'Enter' && survole) ouvre(survole);
});
let doigt = null;
canvas.addEventListener('pointerdown', (e) => { doigt = { y: e.clientY, x: e.clientX, y0: e.clientY, x0: e.clientX, t: e.pointerType }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  souris.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  $('curseur').style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; document.body.classList.toggle('souris', e.pointerType === 'mouse');
  if (doigt && (doigt.t !== 'mouse' || Math.abs(e.clientY - doigt.y0) > 6)) { if (ouvert && Math.abs(e.clientY - doigt.y0) > 12) ferme(); sCible = borne(sCible - (e.clientY - doigt.y) * 0.03); doigt.y = e.clientY; }
});
canvas.addEventListener('pointerup', (e) => {
  const clic = doigt && Math.hypot(e.clientX - doigt.x0, e.clientY - doigt.y0) < 8; doigt = null;
  if (!clic) return;
  souris.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); vise();
  if (survole) (ouvert === survole ? active(survole) : ouvre(survole)); else ferme();
});
canvas.addEventListener('pointerleave', () => { souris.set(9, 9); });

function vise() {
  rayon.setFromCamera(souris, camera);
  const t = rayon.intersectObjects(faces, false)[0]; survole = t ? t.object.userData.cadre : null;
  if (t) survole.uv = t.uv;
  if (rayon.ray.intersectPlane(solPlan, pointSol)) { anneau.position.x = anneau2.position.x = pointSol.x; anneau.position.z = anneau2.position.z = pointSol.z; }
  anneau.visible = anneau2.visible = !survole && souris.x < 5 && !ouvert;
  document.body.classList.toggle('vise', !!survole); canvas.style.cursor = survole ? 'pointer' : '';
  $('curseur-mot').textContent = survole ? (ouvert === survole ? (survole.lienTexte || '') : 'Regarder') : '';
}
function ouvre(f) {
  ouvert = f; sCible = borne(-f.z - 1.2);
  const p = $('fiche'); p.querySelector('b').textContent = f.titre; p.querySelector('small').textContent = [f.kicker, f.sous].filter(Boolean).join(' · ');
  const a = $('fiche-lien'), a2 = $('fiche-lien2');
  a.hidden = !(f.lien || f.jeu); a.textContent = f.lienTexte || 'Ouvrir'; a.href = f.lien || '#jeu'; a.target = /^https?:/.test(f.lien || '') ? '_blank' : ''; a.rel = a.target ? 'noopener' : '';
  a.onclick = f.jeu ? (e) => { e.preventDefault(); jouer(); } : null;
  a2.hidden = !f.lien2; if (f.lien2) { a2.textContent = f.lien2Texte; a2.href = f.lien2; }
  p.classList.add('vu');
}
function ferme() { if (!ouvert) return; ouvert = null; $('fiche').classList.remove('vu'); }
function active(f) { if (f.jeu) jouer(); else if (f.lien) { if (/^https?:/.test(f.lien)) window.open(f.lien, '_blank', 'noopener'); else location.href = f.lien; } }
$('fiche-fermer').addEventListener('click', ferme);

/* le jeu, à la fin : la pièce flottante, en surimpression */
function jouer() {
  if (monde) return; monde = document.createElement('iframe'); monde.src = 'monde3d/index.html?v=m16'; monde.title = 'La pièce flottante'; monde.allow = 'fullscreen'; monde.id = 'monde'; document.body.append(monde); document.body.classList.add('en-jeu'); monde.focus();
}
addEventListener('message', (e) => { if (e.data && e.data.type === 'monde-close' && monde) { monde.remove(); monde = null; document.body.classList.remove('en-jeu'); canvas.focus(); } });

/* mode expo ou à plat */
const bMode = $('mode');
function basculeMode(v = modeCible ? 0 : 1) { modeCible = v; bMode.setAttribute('aria-pressed', String(!!v)); bMode.querySelector('span').textContent = v ? 'Mode expo' : 'Mode à plat'; document.body.classList.toggle('a-plat', !!v); try { localStorage.setItem('expo-mode', v ? 'plat' : 'expo'); } catch {} }
bMode.addEventListener('click', () => basculeMode());
try { if (localStorage.getItem('expo-mode') === 'plat' || new URLSearchParams(location.search).get('mode') === 'plat') basculeMode(1); } catch {}

/* sommaire : la liaison avec les chapitres */
const nav = $('sommaire');
chapitres.forEach((ch) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<i>${String(ch.k + 1).padStart(2, '0')}</i><span></span>`; b.lastChild.textContent = ch.court; b.addEventListener('click', () => va(ch.s)); nav.append(b); ch.bouton = b; });

/* version texte : le même contenu, en page ordinaire (lecteurs d'écran, absence de WebGL, choix du visiteur) */
{
  const m = $('texte');
  for (const ch of CHAPITRES) {
    const sec = document.createElement('section'); sec.innerHTML = '<h2></h2><p class="sous"></p>'; sec.children[0].textContent = ch.titre; sec.children[1].textContent = ch.sous;
    for (const d of ch.cadres) {
      const a = document.createElement('article'); a.innerHTML = '<h3></h3><p></p>'; a.children[0].textContent = d.titre; a.children[1].textContent = [d.sous, d.texte, d.liste?.join(', '), d.puce, d.puce2].filter(Boolean).join('. ').replace(/\.\./g, '.');
      for (const [u, t] of [[d.lien || (d.jeu ? 'monde3d/index.html' : ''), d.lienTexte], [d.lien2, d.lien2Texte]]) if (u) { const l = document.createElement('a'); l.href = u; l.textContent = t; a.append(l, ' '); }
      sec.append(a);
    }
    m.append(sec);
  }
  $('lire').addEventListener('click', () => { const t = document.body.classList.toggle('texte'); $('lire').querySelector('span').textContent = t ? 'Revenir à l’expo' : 'Version texte'; if (t) m.focus(); });
}

/* ───────── boucle ───────── */
const _v = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), HAUT = new THREE.Vector3(0, 1, 0), LOIN = new THREE.Vector3(0, 0, -1);
const pos = new THREE.Vector3(0, 7, 12), cible = new THREE.Vector3(0, 1, 0), haut = new THREE.Vector3(0, 1, 0);
let chActif = -1, nIm = 0, cumul = 0, lents = 0;
function image3d(maintenant) {
  requestAnimationFrame(image3d);
  if (monde || document.body.classList.contains('texte')) { dernier = maintenant; return; }
  const brut = (maintenant - dernier) / 1000, dt = Math.min(0.05, Math.max(0.001, brut)); dernier = maintenant; temps += dt;
  const k = reduit ? 1 : 1 - Math.exp(-dt * 6);
  s += (sCible - s) * k; mode += (modeCible - mode) * (reduit ? 1 : 1 - Math.exp(-dt * 5));
  const zc = -s, m = mode * mode * (3 - 2 * mode), etroit = Math.min(1.9, Math.max(1, 1.25 / camera.aspect));
  /* caméra : expo (perspective plongeante) vers à plat (vue de dessus) ; un cadre ouvert attire la caméra face à lui */
  _v.set(ETROIT ? 0.4 : 0, 7.8 * etroit, zc + 10.6 * etroit).lerp(_c.set(ETROIT ? 0.4 : 0, 11.5 * etroit, zc - 1.2), m);
  _c.set(ETROIT ? 0.4 : 0, 0.7, zc - 3.6).lerp(_n.set(ETROIT ? 0.4 : 0, 0, zc - 1.25), m);
  let hx = 0, hy = 1 - m, hz = -m;
  if (ouvert) {
    ouvert.panneau.updateWorldMatrix(true, false); const cc = ouvert.panneau.localToWorld(new THREE.Vector3(0, H / 2, 0)), nn = new THREE.Vector3(0, 0, 1).transformDirection(ouvert.panneau.matrixWorld);
    _v.copy(cc).addScaledVector(nn, 4.3 * Math.max(1, 1.5 / camera.aspect)); _c.copy(cc); const up = new THREE.Vector3(0, 1, 0).transformDirection(ouvert.panneau.matrixWorld); hx = up.x; hy = up.y; hz = up.z;
  }
  pos.lerp(_v, k); cible.lerp(_c, k); haut.lerp(_n.set(hx, hy, hz), k).normalize();
  camera.position.copy(pos); camera.up.copy(haut); camera.lookAt(cible);
  soleil.target.position.set(0, 0, Math.round(zc - 4)); soleil.position.copy(soleil.target.position).addScaledVector(dirSoleil, 70);
  uTemps.value = temps; uTete.value += ((s + 15) - uTete.value) * (1 - Math.exp(-dt * 1.6)); if (s + 15 < uTete.value - 30) uTete.value = s + 15;   // la pousse précède le visiteur
  vise();
  /* cadres : inclinaison selon le mode, levée et bascule vers le curseur au survol, apparition quand la branche les atteint */
  const theta = INCLINAISON * (1 - m);
  for (const f of cadres) {
    const d = Math.abs(f.z - zc + 2);
    texture(f, d < 24); if (d > 40) continue;
    const vu = f === survole && !ouvert ? 1 : 0; f.survol += (vu - f.survol) * (1 - Math.exp(-dt * 10));
    const ne = Math.min(1, Math.max(0, (uTete.value - f.naissance + 0.4) / 1.6)), e = 1 - Math.pow(1 - ne, 3), o = f === ouvert ? 1 : 0; f.ouvert += (o - f.ouvert) * k;
    const th = theta + (PI / 2 - theta) * 0 + f.survol * 0.1 * (1 - m) - (1 - e) * theta * 0.9;
    f.panneau.rotation.x = -(PI / 2 - th); f.panneau.rotation.z = 0;
    f.pivot.rotation.y = f.yaw * (1 - m) + (vu && f.uv ? (f.uv.x - 0.5) * -0.22 : 0) * f.survol;
    f.pivot.position.y = 0.07 + f.survol * 0.28 + m * 0.0; f.pivot.scale.setScalar((0.3 + 0.7 * e) * (1 + f.survol * 0.05));
    const hp = 0.72 * H * Math.sin(th), zp = -0.72 * H * Math.cos(th) + 0.02;
    for (const p of f.pieds) { p.visible = hp > 0.12; p.scale.y = Math.max(0.01, hp - 0.04); p.position.z = zp; }
  }
  /* étoiles */
  etoiles.forEach((e, i) => {
    const vis = uTete.value > e.g && Math.abs(-e.z - s) < 60 ? 1 : 0; e.k += (vis - e.k) * (1 - Math.exp(-dt * 6));
    const sc = e.s * e.k * (1 + 0.22 * Math.sin(temps * 3 + i)); _m.compose(_v.set(e.x, 0.07, e.z), _q.setFromAxisAngle(HAUT, temps * 0.6 + i), _s.set(sc, sc, sc)); maillageEtoiles.setMatrixAt(i, _m);
  });
  maillageEtoiles.instanceMatrix.needsUpdate = true;
  anneau.scale.setScalar(1 + 0.08 * Math.sin(temps * 5)); const a2 = (temps * 0.9) % 1; anneau2.scale.setScalar(1 + a2 * 1.4); anneau2.visible = anneau.visible && a2 < 0.8;
  /* Mathieu marche le long du tronc, à hauteur du visiteur */
  if (heros) {
    const but = zc - 0.4, dz = but - herosZ, v = Math.sign(dz) * Math.min(Math.abs(dz) * 3, 9); herosZ += v * dt;
    const g = heros.perso.group; g.position.set(tx(herosZ) + 0.55, 0, herosZ); const marche = Math.abs(v) > 0.5;
    if (marche) g.rotation.y += (Math.atan2(Math.sin((v < 0 ? PI : 0) - g.rotation.y), Math.cos((v < 0 ? PI : 0) - g.rotation.y))) * Math.min(1, dt * 10);
    const anim = marche ? (Math.abs(v) > 6.5 ? 'Sprint_Loop' : 'Jog_Fwd_Loop') : 'Idle_Loop';
    if (anim !== heros.anim) { heros.anim = anim; heros.perso.setNativePose(anim === 'Idle_Loop' ? 'debout' : null); heros.perso.play(anim, { fade: 0.18, speed: 1 }); }
    heros.perso.update(dt, temps); heros.visage();
  }
  /* chapitre courant */
  let actif = 0; for (const ch of chapitres) if (s >= ch.s - 4) actif = ch.k;
  if (actif !== chActif) { chActif = actif; chapitres.forEach((ch) => ch.bouton.classList.toggle('actif', ch.k === actif)); $('lieu').firstElementChild.textContent = chapitres[actif].titre; $('lieu').lastElementChild.textContent = chapitres[actif].sous; $('lieu').classList.remove('vu'); void $('lieu').offsetWidth; $('lieu').classList.add('vu'); }
  $('jauge').style.transform = `scaleY(${((s - DEBUT) / (FIN - DEBUT)).toFixed(4)})`;
  rendu.rendre(scene, camera);
  if (brut < 0.2) { cumul += brut; if (++nIm >= 80) { if (cumul / nIm > 0.026 && lents < 5) { lents++; if (!rendu.allege(camera) && soleil.shadow.mapSize.x > 1024) { soleil.shadow.mapSize.set(1024, 1024); soleil.shadow.map?.dispose(); soleil.shadow.map = null; } } nIm = 0; cumul = 0; } }
}

addEventListener('resize', () => rendu.taille(camera));
rendu.taille(camera); rendu.fondu.value = 0;
document.body.classList.add('pret'); requestAnimationFrame(image3d);
charger().then((h) => {
  h.perso.group.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(h.perso.group); h.perso.setNativePose('debout'); h.perso.play('Idle_Loop', { fade: 0 }); h.anim = 'Idle_Loop'; h.perso.group.rotation.y = PI; heros = h;
}).catch((e) => console.warn('personnage indisponible', e));
window.__expo = { cadres, chapitres, va, ouvre, ferme, basculeMode, jouer, get s() { return s; }, get mode() { return mode; }, get survole() { return survole; }, camera, rendu };
