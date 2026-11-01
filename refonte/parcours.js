import * as THREE from 'three';

/* CV en parcours 3D. Une piste, six sections (une couleur chacune), des dalles qui portent le contenu du CV.
   Toutes les données viennent de cv/cv.html ; rien n'est inventé. */

const L = 70;            // longueur d'une section (m)
const HALF = 6;          // demi-largeur de la piste
const SW = 8, SD = 5, SH = 0.6; // dalle : largeur, profondeur, hauteur

const SECTIONS = [
  { name: 'Profil', color: 0x1c1cb4, slabs: [
    { x: 0, k: 'Profil', t: 'Ingénieur Maintenance et Qualité', m: 'Master 2 MQSE',
      b: "Alternant à l'Université Sorbonne Paris Nord et ingénieur maintenance et qualité chez SNCF Gares et Connexions. Je conçois des solutions qui simplifient le travail des équipes, fiabilisent les données et produisent des résultats mesurables.",
      co: 'Ma méthode', cs: 'Auditer, retirer le superflu, automatiser ce qui rapporte' },
    { x: 0, k: 'Méthode', t: 'Auditer. Retirer. Automatiser.', m: '3 temps',
      b: "Auditer le processus, retirer le superflu, puis automatiser uniquement ce qui apporte un gain mesurable. Ancien technicien supérieur de la circulation ferroviaire à SNCF Réseau.",
      co: 'Avant SNCF Gares et Connexions', cs: 'Technicien supérieur de la circulation, SNCF Réseau' },
  ] },
  { name: 'Réalisations', color: 0xb83a10, slabs: [
    { x: -1, k: 'Rapports de vérification électrique', t: '4 000 à 5 000 rapports par an', m: '30 + 15 + 25 min',
      b: "Machine virtuelle Windows (30 min économisées par rapport), Reporteur Q18 (15 min) et extracteur de comptage (25 min, capacité théorique). Trois outils, trois tâches distinctes d'un même rapport.",
      href: 'projet-vre.html', co: 'Rapports de vérification électrique', cs: 'Lire la fiche projet' },
    { x: 1, k: 'Plans de prévention', t: 'Portail PP & MOSO', m: '10 s au lieu de 3 à 5 min',
      b: "Extraction automatique des PDF, rangement et archivage dans SharePoint, portail Power BI. 100 à 167 heures par an, plan retrouvé en 10 secondes.",
      href: 'projet-pa.html', co: 'Plans de prévention et portail', cs: 'Lire la fiche projet' },
    { x: -1, k: 'Studio d\'extracteurs PDF sans code', t: '300 fiches CERFA en 1 min 20', m: '20 à 25 h évitées',
      b: "Un extracteur en quelques heures. Pénalités appliquées, non-conformités remontées, audit national sur les fluides frigorigènes.",
      href: 'projet-studio.html', co: 'Studio d\'extracteurs PDF', cs: 'Lire la fiche projet' },
    { x: 1, k: 'Total sur les volumes fournis', t: '3 200 à 4 000 h par an libérées', m: '2 à 2,5 postes',
      b: "Environ 335 000 à 420 000 euros de temps valorisé à 104,74 euros l'heure. Temps libéré, pas dépense évitée. Méthode de calcul sur la page Gains.",
      href: 'gains.html', co: 'Total des gains', cs: 'Voir la méthode de calcul' },
  ] },
  { name: 'Expérience', color: 0xa00e5c, slabs: [
    { x: 0, k: 'Juin 2025 · présent', t: 'Ingénieur Maintenance et Qualité (alternance)', m: 'SNCF Gares et Connexions',
      b: "ABE Sud Île-de-France. Plans de prévention et co-activité, PAM SSI, accès et habilitations. Rapports de vérification électrique, studio d'extracteurs PDF, contrôle des fiches CERFA.",
      co: 'SNCF Gares et Connexions', cs: 'ABE Sud Île-de-France, depuis juin 2025' },
    { x: 0, k: 'Outils livrés', t: 'Recherche unique, Power BI, flux', m: '5 outils en 1',
      b: "Recherche par OT, équipement et bâtiment pour 14 utilisateurs (10 à 15 min gagnées). Rapport Power BI Gares prioritaires (13 pages, 159 mesures DAX). Point financier : 4 flux Power Automate.",
      href: 'projet-finance.html', co: 'Recherche, Power BI, Power Automate', cs: 'Lire la fiche Point financier' },
    { x: 0, k: 'Enquête terrain EPM / EPTx', t: '16 arbitrages obtenus', m: 'EPM light',
      b: "Gemba, entretiens, RACI. 16 arbitrages obtenus en réunion d'agence et un processus « EPM light ».",
      co: 'Enquête terrain', cs: 'Gemba, entretiens, RACI' },
    { x: 0, k: '2022 · janvier 2025', t: 'Technicien supérieur de la circulation ferroviaire', m: 'SNCF Réseau',
      b: "Poste d'aiguillage : sécurité des circulations, commande des itinéraires et des signaux. Protection des équipes de maintenance et de travaux, gestion des incidents, service continu en 3x8.",
      co: 'SNCF Réseau', cs: 'Sécurité des circulations, 3x8' },
  ] },
  { name: 'Compétences', color: 0x0f8f30, slabs: [
    { x: -1, k: 'Compétences métier', t: 'Management QSE et prévention', m: 'ISO 9001 · 45001',
      b: "Approche processus, audit, évaluation des risques. Plans de prévention, co-activité, PAM SSI, fluides frigorigènes, vérifications électriques. Lean Six Sigma Yellow Belt, DMAIC, PDCA, Pareto, Ishikawa, Gemba, RACI.",
      co: 'Qualité, sécurité, méthodes', cs: 'Yellow Belt Lean Six Sigma' },
    { x: 1, k: 'Données et automatisation', t: 'Power BI, DAX, Power Automate', m: 'Excel avancé',
      b: "Power Query, SharePoint, machine virtuelle Windows de lecture et d'extraction de PDF, GMAO. Développement : HTML, CSS, JavaScript (Three.js, Node.js), Python, VBA, SQL, Git.",
      co: 'Données et développement', cs: 'Power BI, Python, JavaScript' },
    { x: -1, k: 'Intelligence artificielle', t: 'Agents LLM, OCR, MCP', m: 'autodidacte',
      b: "Agents LLM, connecteurs MCP, OCR et PDF vers JSON, décisions à score de confiance, serveur interne et LLM open source. Formé seul à l'IA depuis trois ans.",
      co: 'Intelligence artificielle', cs: 'Formé seul depuis trois ans' },
  ] },
  { name: 'Formation', color: 0x4b22b8, slabs: [
    { x: 0, k: '2026 · 2027', t: 'Master 2 MQSE', m: 'en cours',
      b: "Maintenance, Qualité, Sécurité, Environnement. Université Sorbonne Paris Nord. Master 1 MQSE validé en 2025 · 2026.",
      co: 'Université Sorbonne Paris Nord', cs: 'Master 2 en cours' },
    { x: 0, k: 'Parcours antérieur', t: 'Histoire puis classe préparatoire', m: '2016 · 2022',
      b: "Master d'histoire, Avignon Université (2017 · 2022). Classe préparatoire ECE puis baccalauréat ES, Lycée Jean Calvin, Noyon (2016 · 2017).",
      co: 'Avignon Université', cs: 'Master d\'histoire' },
    { x: 0, k: 'Certifications · langues', t: 'Yellow Belt Lean Six Sigma', m: 'Anglais courant',
      b: "Obtenu : Yellow Belt. En préparation : Green Belt Lean Six Sigma, NEBOSH IGC. Français niveau soutenu, anglais niveau courant.",
      co: 'Certifications', cs: 'Green Belt et NEBOSH IGC en préparation' },
  ] },
  { name: 'Contact', color: 0x161616, slabs: [
    { x: 0, k: 'Me joindre', t: 'mathieu@comtesse.me', m: 'Île-de-France',
      b: "Portfolio : comtesse.me. LinkedIn : mathieu-comtesse-a226a1433. CV à jour en octobre 2026.",
      href: 'mailto:mathieu@comtesse.me', co: 'Écrire', cs: 'mathieu@comtesse.me' },
    { x: 0, k: 'Version texte', t: 'CV en PDF', m: '2 pages',
      b: "Version lisible par les outils de recrutement : noir et blanc, texte dans l'ordre de lecture, liens cliquables.",
      href: 'assets/cv-ats-mathieu-comtesse.pdf', co: 'CV en PDF', cs: 'Télécharger' },
  ] },
];
const TOTAL = SECTIONS.length * L;

/* ---------- utilitaires canvas ---------- */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function wrap(ctx, text, x, y, maxW, lh, maxLines = 99) {
  const words = text.split(' '); let line = '', n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines) return y; }
    else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}
function cardTexture(s) {
  const c = mk(1024, 640), g = c.getContext('2d');
  g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.strokeRect(6, 6, 1012, 628);
  g.textBaseline = 'alphabetic'; g.fillStyle = '#8e939d'; g.font = '500 28px iAWriterQuattroV, monospace';
  wrap(g, s.k.toUpperCase(), 48, 70, 930, 34, 2);
  g.fillStyle = '#fff'; g.font = '700 52px Inter, sans-serif';
  let y = wrap(g, s.t, 48, 140, 930, 58, 2);
  g.fillStyle = '#ffd24a'; g.font = '600 40px Inter, sans-serif';
  y = wrap(g, s.m, 48, y + 14, 930, 46, 1);
  g.fillStyle = '#c9ccd3'; g.font = '400 31px Inter, sans-serif';
  wrap(g, s.b, 48, y + 22, 930, 42, 7);
  if (s.href) {
    g.fillStyle = '#e6e6e6'; g.fillRect(48, 560, 260, 54);
    g.fillStyle = '#000'; g.font = '600 26px Inter, sans-serif';
    g.fillText(s.href.startsWith('mailto') ? 'Écrire →' : 'Ouvrir →', 72, 596);
  }
  return tex(c);
}
// API HTML-in-Canvas (Chrome) : la carte est un vrai élément DOM, enfant du canvas, rendu en texture par HTMLTexture.
let htmlInCanvas = false;
function cardElement(d) {
  const el = document.createElement('div'); el.className = 'card';
  const add = (tag, cls, txt) => { const n = document.createElement(tag); n.className = cls; n.textContent = txt; el.append(n); };
  add('p', 'k', d.k); add('h3', 't', d.t); add('p', 'm', d.m); add('p', 'b', d.b);
  if (d.href) add('span', 'btn', d.href.startsWith('mailto') ? 'Écrire →' : 'Ouvrir →');
  return el;
}
// Repli canvas 2D affiché d'abord ; la carte DOM prend le relais après son premier paint.
const htmlCards = new Set();
function cardMap(d, mat) {
  const fb = cardTexture(d);
  if (htmlInCanvas) htmlCards.add({ el: cardElement(d), mat, fb });
  return fb;
}
function startHtmlCards() {
  if (!htmlInCanvas || !htmlCards.size) return;
  canvas.setAttribute('layoutsubtree', 'true');
  const pending = new Set(htmlCards);
  canvas.addEventListener('paint', (e) => {
    for (const c of pending) if (e.changedElements.includes(c.el)) {
      // texElementImage2D envoie des octets sRGB bruts (RGBA8) : on les linéarise dans le shader.
      c.mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = pow(diffuseColor.rgb, vec3(2.2));'); };
      c.mat.customProgramCacheKey = () => 'html-card';
      c.mat.map = new THREE.HTMLTexture(c.el); c.mat.needsUpdate = true; pending.delete(c);
    }
  });
  for (const c of htmlCards) canvas.append(c.el);
  canvas.requestPaint();
}
function dropHtmlCards() { // si le navigateur refuse : retour au repli
  for (const c of htmlCards) { c.mat.onBeforeCompile = () => {}; c.mat.customProgramCacheKey = () => 'plain'; c.mat.map = c.fb; c.mat.needsUpdate = true; c.el.remove(); }
  htmlCards.clear(); htmlInCanvas = false; document.documentElement.dataset.htmlInCanvas = false;
}
function titleTexture(text, big) {
  const c = mk(1024, 256), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${big ? 112 : 150}px Inter, sans-serif`;
  g.fillText(text, 512, 128);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}

/* ---------- scène ---------- */
await Promise.all(['700 52px Inter','400 31px Inter','600 40px Inter','500 28px iAWriterQuattroV'].map((f) => document.fonts.load(f))).catch(() => {});
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
htmlInCanvas = 'texElementImage2D' in renderer.getContext() && 'HTMLTexture' in THREE;
document.documentElement.dataset.htmlInCanvas = htmlInCanvas;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 28, 95);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const white = (o = 0.4) => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: o });

// grille de fond
const grid = new THREE.GridHelper(TOTAL + 200, (TOTAL + 200) / 4, 0x2c2c2c, 0x1a1a1a);
grid.position.set(0, -0.02, -TOTAL / 2); scene.add(grid);

// bandes de couleur
SECTIONS.forEach((s, i) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, L), new THREE.MeshBasicMaterial({ color: s.color }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0, -(i + 0.5) * L); scene.add(m);
  s.z0 = -i * L;
});
// bords de piste
for (const sx of [-HALF, HALF]) {
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx, 0.02, 10), new THREE.Vector3(sx, 0.02, -TOTAL)]), white(0.8)));
}

// arcs et boîtes filaires (décor « plan technique »)
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 14; i++) {
  const side = i % 2 ? 1 : -1, r = 18 + rnd() * 40, cz = -rnd() * TOTAL, cx = side * (14 + rnd() * 10);
  const pts = [], a0 = rnd() * 6, span = 1 + rnd() * 1.6;
  for (let k = 0; k <= 48; k++) { const a = a0 + span * k / 48; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0.03, cz + Math.sin(a) * r)); }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), white(0.28)));
}
const boxMat = white(0.45);
for (let i = 0; i < TOTAL / 5; i++) {
  const side = i % 2 ? 1 : -1, w = 1 + rnd() * 2.2, h = 1.5 + rnd() * 5, d = 1 + rnd() * 2.2;
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  const b = new THREE.LineSegments(g, boxMat);
  b.position.set(side * (HALF + 3 + rnd() * 9), h / 2, -rnd() * TOTAL); scene.add(b);
}

// grappes de points aux frontières de sections, avec étiquette bleue
const nodeMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, sizeAttenuation: true });
function cluster(z, label) {
  const pts = [], seg = [], hub = new THREE.Vector3(0, 3, z);
  for (let k = 0; k < 18; k++) {
    const a = rnd() * Math.PI * 2, r = 1.2 + rnd() * 2.6, p = new THREE.Vector3(Math.cos(a) * r, 3 + (rnd() - 0.5) * 2.4, z + Math.sin(a) * r);
    pts.push(p); seg.push(hub, p);
  }
  scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints([hub, ...pts]), nodeMat));
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), white(0.6)));
  const c = mk(256, 64), g = c.getContext('2d');
  g.fillStyle = '#1736ff'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#fff'; g.font = '600 32px iAWriterQuattroV, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 128, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), fog: false })); sp.scale.set(3.4, 0.85, 1); sp.position.set(0, 4.8, z); scene.add(sp);
}

// titres de section posés sur la piste (légère extrusion par empilement)
function floorTitle(text, z, big) {
  const t = titleTexture(text, big);
  const layers = big ? 8 : 4;
  for (let k = 0; k < layers; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, color: k === layers - 1 ? 0xffffff : new THREE.Color().setScalar(0.35 + 0.4 * k / layers), depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.03 + k * (big ? 0.05 : 0.03), z); m.renderOrder = 2 + k; scene.add(m);
  }
}

// dalles
const platforms = [], links = [], callouts = [];
const sideMat = new THREE.MeshBasicMaterial({ color: 0x232323 });
const edgeMat = white(0.55);
SECTIONS.forEach((s, i) => {
  cluster(-i * L - (i === 0 ? 40 : 3), s.name);
  if (i === 0) floorTitle('Mathieu Comtesse', -i * L - 14, true); else floorTitle(s.name, -i * L - 9, false);
  const n = s.slabs.length, start = -i * L - (i === 0 ? 30 : 22), step = (L - (i === 0 ? 34 : 26)) / Math.max(n, 1);
  s.slabs.forEach((d, k) => {
    const z = start - k * Math.max(step, 11.5) - (SD / 2 - 2);
    const x = d.x * 1.6, top = new THREE.MeshBasicMaterial(); top.map = cardMap(d, top);
    const m = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, SD), [sideMat, sideMat, top, sideMat, sideMat, sideMat]);
    m.position.set(x, SH / 2, z); scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat); e.position.copy(m.position); scene.add(e);
    platforms.push({ x, z, hw: SW / 2, hd: SD / 2 }); d.z = z;
    callouts.push({ d, side: k % 2 ? 1 : -1, p: new THREE.Vector3(x + (k % 2 ? 1 : -1) * SW / 2, SH, z - SD / 2 + 0.6) });
    if (d.href) links.push({ mesh: m, href: d.href });
  });
});
cluster(-TOTAL + 1, 'Arrivée');

startHtmlCards();

// Machines 3D du site (refonte/m3d), posées au sol de chaque côté de la piste, en face de la dalle du projet.
scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b8e6, 1.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(-9, 16, 8); scene.add(sun);
const machines = [];
const MACH = [['vre', 1, 0, -1], ['pp', 1, 1, 1], ['studio', 1, 2, -1], ['finance', 2, 1, 1]]; // module, section, dalle, côté
MACH.forEach(async ([mod, si, ki, side]) => {
  try {
    const { build, WIDTH = 236 } = await import(`./m3d/${mod}.js`);
    const m = build(), g = new THREE.Group(); g.add(m.group); g.scale.setScalar(11 / WIDTH); scene.add(g);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
    g.position.set(side * (HALF + 8) - c.x, -box.min.y, SECTIONS[si].slabs[ki].z - c.z);
    machines.push({ m, z: SECTIONS[si].slabs[ki].z });
  } catch (err) { console.warn('machine ' + mod + ' indisponible', err); }
});

// ligne d'arrivée
const finish = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
finish.rotation.x = -Math.PI / 2; finish.position.set(0, 0.04, -TOTAL + 4); scene.add(finish);

// joueur
const player = new THREE.Group();
const cube = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
cube.position.y = 0.4; player.add(cube);
const pe = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0x000000 })); pe.position.y = 0.4; player.add(pe);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
scene.add(player);

/* ---------- état et commandes ---------- */
const S = { x: 0, y: 0, z: -4, vy: 0, v: 0, running: false, done: false, keys: new Set(), tz: null };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const groundAt = (x, z) => {
  let h = 0;
  for (const p of platforms) if (Math.abs(x - p.x) < p.hw + 0.4 && Math.abs(z - p.z) < p.hd + 0.4) h = SH;
  return h;
};
const $ = (id) => document.getElementById(id);
const hop = () => { if (S.running && S.y <= groundAt(S.x, S.z) + 0.01) S.vy = 11; };
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.key === ' ') { e.preventDefault(); hop(); return; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd', 'z', 'q'].includes(k)) { if (S.running) e.preventDefault(); S.keys.add(k); }
});
addEventListener('keyup', (e) => S.keys.delete(e.key.toLowerCase()));
addEventListener('wheel', (e) => { if (S.running) S.v = Math.min(22, Math.max(0, S.v - Math.sign(e.deltaY) * 1.2)); }, { passive: true });
// tactile : glisser pour diriger, toucher pour sauter
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, t: performance.now(), sx: S.x }; });
canvas.addEventListener('pointermove', (e) => { if (drag && e.pointerType !== 'mouse') S.x = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, drag.sx + (e.clientX - drag.x) / innerWidth * 18)); });
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const moved = Math.abs(e.clientX - drag.x) > 6; drag = null;
  if (moved) return;
  // clic sur une dalle liée
  const r = new THREE.Raycaster(), v = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  r.setFromCamera(v, camera);
  const hit = r.intersectObjects(links.map((l) => l.mesh))[0];
  if (hit) location.href = links.find((l) => l.mesh === hit.object).href; else hop();
});

// navigation latérale
const ul = document.querySelector('#nav ul');
SECTIONS.forEach((s, i) => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.textContent = s.name; b.onclick = () => { S.tz = -i * L - 4; start(); };
  li.append(b); ul.append(li);
});
const navItems = [...ul.children];

function start() {
  if (!S.running) { S.running = true; S.v = reduce ? 3 : 6; document.body.classList.add('run'); $('start').classList.add('off'); }
}
$('go').onclick = start;
$('again').onclick = () => { Object.assign(S, { x: 0, y: 0, z: -4, vy: 0, v: 6, done: false, tz: null }); $('end').hidden = true; };

// callouts HTML + traits
const layer = $('callouts'), svg = $('leaders');
callouts.forEach((c) => {
  const el = document.createElement(c.d.href ? 'a' : 'div');
  el.className = 'co ' + (c.side > 0 ? 'r' : 'l');
  if (c.d.href) el.href = c.d.href;
  el.innerHTML = `${c.d.co}<small>${c.d.cs}</small>`;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'), dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', 3); svg.append(path, dot); layer.append(el);
  Object.assign(c, { el, path, dot });
});
const tmp = new THREE.Vector3();
function updateCallouts() {
  const w = innerWidth, h = innerHeight, narrow = w < 760, bw = narrow ? 150 : 210;
  for (const c of callouts) {
    const dz = S.z - c.p.z; // > 0 : devant le joueur
    tmp.copy(c.p).project(camera);
    const px = (tmp.x * 0.5 + 0.5) * w, py = (-tmp.y * 0.5 + 0.5) * h;
    const vis = dz > 2 && dz < 55 && tmp.z < 1 && px > -50 && px < w + 50 && py > 0 && py < h * 0.93;
    c.el.style.display = c.path.style.display = c.dot.style.display = vis ? '' : 'none';
    if (!vis) continue;
    const a = Math.min(1, (55 - dz) / 25, (dz - 2) / 6);
    let lx = px + c.side * (narrow ? 40 : 90) - (c.side < 0 ? bw : 0);
    lx = Math.max(narrow ? 6 : 70, Math.min(w - bw - 6, lx));
    const ly = Math.max(8, py - 56);
    c.el.style.transform = `translate(${lx}px,${ly}px)`; c.el.style.opacity = a;
    const ex = c.side > 0 ? lx : lx + bw, ey = ly + 12;
    c.path.setAttribute('d', `M${ex},${ey} L${(ex + px) / 2},${ey} L${px},${py}`);
    c.path.style.opacity = a * 0.75; c.dot.setAttribute('cx', px); c.dot.setAttribute('cy', py); c.dot.style.opacity = a;
  }
}

/* ---------- boucle ---------- */
const timer = new THREE.Timer();
let camY = 7, camD = 10;
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  const K = S.keys;
  if (S.running && !S.done) {
    if (K.has('arrowup') || K.has('w') || K.has('z')) S.v = Math.min(22, S.v + 9 * dt);
    if (K.has('arrowdown') || K.has('s')) S.v = Math.max(0, S.v - 16 * dt);
    const dir = (K.has('arrowright') || K.has('d') ? 1 : 0) - (K.has('arrowleft') || K.has('a') || K.has('q') ? 1 : 0);
    S.x = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, S.x + dir * 9 * dt));
    if (S.tz !== null) { // saut vers une section
      const d = S.tz - S.z; S.z += Math.sign(d) * Math.min(Math.abs(d), 90 * dt);
      if (Math.abs(S.tz - S.z) < 0.5) { S.tz = null; if (S.v === 0) S.v = 3; }
    } else S.z -= S.v * dt;
    const g = groundAt(S.x, S.z);
    S.vy -= 30 * dt; S.y += S.vy * dt;
    if (S.y <= g) { S.y = g; S.vy = 0; }
    if (S.z <= -TOTAL + 4) { S.done = true; S.z = -TOTAL + 4; $('end').hidden = false; }
  }
  player.position.set(S.x, S.y, S.z);
  shadow.position.set(S.x, 0.05 + groundAt(S.x, S.z), S.z);
  cube.rotation.y += dt * (S.v * 0.04);
  // caméra : se rapproche quand on freine pour lire
  const slow = 1 - Math.min(1, S.v / 6);
  camY += ((7 - slow * 2.6) - camY) * Math.min(1, dt * 3);
  camD += ((10 - slow * 3.4) - camD) * Math.min(1, dt * 3);
  camera.position.set(S.x * 0.55, camY + S.y * 0.4, S.z + camD);
  camera.lookAt(S.x * 0.45, 0, S.z - 9);
  // vitesse / reste / section active
  const idx = Math.max(0, Math.min(SECTIONS.length - 1, Math.floor(-S.z / L)));
  navItems.forEach((li, i) => li.classList.toggle('on', i === idx));
  $('spd').textContent = `v ≈ ${S.v.toFixed(1).replace('.', ',')} m/s`;
  $('left').textContent = `↑ ${Math.max(0, Math.round(TOTAL - 4 + S.z)).toLocaleString('fr-FR')} m`;
  const now = timer.getElapsed();
  for (const k of machines) if (Math.abs(S.z - k.z) < 70) k.m.update(now);
  try { renderer.render(scene, camera); } catch (err) { console.warn('HTML-in-Canvas indisponible, repli canvas 2D', err); dropHtmlCards(); }
  updateCallouts();
  requestAnimationFrame(frame);
}
camera.position.set(0, 7, S.z + 10);
$('left').textContent = `↑ ${(TOTAL - 8).toLocaleString('fr-FR')} m`;
window.__parcours = S;
frame();
