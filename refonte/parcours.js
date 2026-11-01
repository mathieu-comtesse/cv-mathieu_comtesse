import * as THREE from 'three';

/* CV en parcours 3D. Une piste (le CV posé au sol, vu de dessus), six sections de couleur, des blocs qui portent le contenu,
   un menu à gauche relié par des traits courbes aux notes de la section, des repères d'échelle sur les bords.
   Tout le texte vient de cv/cv.html ; rien n'est inventé. */

/* ---------- monde en tunnel : les côtés remontent vers la caméra, le fond s'éloigne (patch global, avant toute compilation) ---------- */
const KX = 0.005, KZ = 0.0011, XCAP = 1000;
THREE.ShaderChunk.common += `\nvec4 bendMV( vec4 p ) { p.z += ${KX} * min( p.x * p.x, ${XCAP}.0 ); p.y -= ${KZ} * p.z * p.z; return p; }\n`;
THREE.ShaderChunk.project_vertex = THREE.ShaderChunk.project_vertex.replace(
  'gl_Position = projectionMatrix * mvPosition;', 'mvPosition = bendMV( mvPosition );\n\tgl_Position = projectionMatrix * mvPosition;');
THREE.ShaderChunk.sprite_vert = THREE.ShaderChunk.sprite_vert.replace('vec4 mvPosition = modelViewMatrix[ 3 ];', 'vec4 mvPosition = bendMV( modelViewMatrix[ 3 ] );');
THREE.ShaderLib.sprite.vertexShader = THREE.ShaderChunk.sprite_vert;

const HALF = 6.4;          // demi-largeur de la piste
const CD = 4.2, SH = 0.7;  // profondeur et hauteur des blocs
const PX = 100;            // 1 m = 100 px (affichage vitesse et distance)
const PRO = 34;            // longueur du prologue (l'affiche)

const SECTIONS = [
  { name: 'Profil', color: 0x1c1cb4, notes: ["Plans de prévention et co-activité", "PAM SSI, accès et habilitations", "Ancien technicien supérieur de la circulation, SNCF Réseau", "Formé seul à l'IA depuis trois ans"], cards: [
    { k: 'Profil', t: 'Ingénieur Maintenance et Qualité', m: 'Master 2 MQSE',
      b: "Alternant à l'Université Sorbonne Paris Nord et ingénieur maintenance et qualité chez SNCF Gares et Connexions. Je conçois des solutions qui simplifient le travail des équipes, fiabilisent les données et produisent des résultats mesurables.",
      co: 'Ma méthode', cs: 'Auditer, retirer le superflu, automatiser' },
    { k: 'Méthode', t: 'Auditer. Retirer. Automatiser.', m: '3 temps',
      b: "Auditer le processus, retirer le superflu, puis automatiser uniquement ce qui apporte un gain mesurable.",
      co: 'Avant SNCF Gares et Connexions', cs: 'Technicien supérieur de la circulation' },
  ] },
  { name: 'Réalisations', color: 0xb83a10, notes: ["Trois outils, trois tâches distinctes d'un même rapport", "Plan retrouvé en 10 secondes au lieu de 3 à 5 minutes", "Pénalités appliquées, non-conformités remontées", "Temps libéré, pas dépense évitée"], cards: [
    { k: 'Rapports de vérification électrique', t: '4 000 à 5 000 rapports par an', m: '30 + 15 + 25 min',
      b: "Machine virtuelle Windows (30 min économisées par rapport), Reporteur Q18 (15 min) et extracteur de comptage (25 min, capacité théorique).",
      href: 'projet-vre.html', co: 'Rapports de vérification électrique', cs: 'Lire la fiche projet', mach: 'vre' },
    { k: 'Plans de prévention', t: 'Portail PP & MOSO', m: '10 s au lieu de 3 à 5 min',
      b: "Extraction automatique des PDF, rangement et archivage dans SharePoint, portail Power BI. 100 à 167 heures par an.",
      href: 'projet-pa.html', co: 'Plans de prévention et portail', cs: 'Lire la fiche projet', mach: 'pp' },
    { k: "Studio d'extracteurs PDF sans code", t: '300 fiches CERFA en 1 min 20', m: '20 à 25 h évitées',
      b: "Un extracteur en quelques heures. Contrôle des fiches sur les fluides frigorigènes, audit national.",
      href: 'projet-studio.html', co: "Studio d'extracteurs PDF", cs: 'Lire la fiche projet', mach: 'studio' },
    { k: 'Total sur les volumes fournis', t: '3 200 à 4 000 h par an libérées', m: '2 à 2,5 postes',
      b: "Environ 335 000 à 420 000 euros de temps valorisé à 104,74 euros l'heure. Temps libéré, pas dépense évitée.",
      href: 'gains.html', co: 'Total des gains', cs: 'Voir la méthode de calcul' },
  ] },
  { name: 'Expérience', color: 0xa00e5c, notes: ["Gemba, entretiens, RACI", "Rapport Power BI : 13 pages, 19 tables, 159 mesures DAX", "4 flux Power Automate sur seuils Excel, environ 94 h par an", "Service continu en 3x8 à SNCF Réseau"], cards: [
    { k: 'Juin 2025 · présent', t: 'Ingénieur Maintenance et Qualité (alternance)', m: 'SNCF Gares et Connexions',
      b: "ABE Sud Île-de-France. Plans de prévention et co-activité, PAM SSI, accès et habilitations, rapports de vérification électrique, fiches CERFA.",
      co: 'SNCF Gares et Connexions', cs: 'ABE Sud Île-de-France, depuis juin 2025' },
    { k: 'Outils livrés', t: 'Recherche unique, Power BI, flux', m: '5 outils en 1',
      b: "Recherche par OT, équipement et bâtiment pour 14 utilisateurs (10 à 15 min gagnées par recherche). Rapport Power BI Gares prioritaires. Point financier.",
      href: 'projet-finance.html', co: 'Recherche, Power BI, Power Automate', cs: 'Lire la fiche Point financier', mach: 'finance' },
    { k: 'Enquête terrain EPM / EPTx', t: '16 arbitrages obtenus', m: 'EPM light',
      b: "Gemba, entretiens, RACI. 16 arbitrages obtenus en réunion d'agence et un processus « EPM light ».",
      co: 'Enquête terrain', cs: 'Gemba, entretiens, RACI' },
    { k: '2022 · janvier 2025', t: 'Technicien supérieur de la circulation ferroviaire', m: 'SNCF Réseau',
      b: "Poste d'aiguillage : sécurité des circulations, commande des itinéraires et des signaux. Protection des équipes de maintenance et de travaux, gestion des incidents.",
      co: 'SNCF Réseau', cs: 'Sécurité des circulations, 3x8' },
  ] },
  { name: 'Compétences', color: 0x0f8f30, notes: ["Lean Six Sigma Yellow Belt, DMAIC, PDCA", "Power Query, DAX, SharePoint, GMAO", "HTML, CSS, JavaScript, Python, VBA, SQL, Git", "ISO 9001, 45001, 14001, 22301, 27001, 19443 étudiés ou pratiqués"], cards: [
    { k: 'Compétences métier', t: 'Management QSE et prévention', m: 'ISO 9001 · 45001',
      b: "Approche processus, audit, évaluation des risques. Plans de prévention, co-activité, PAM SSI, fluides frigorigènes, vérifications électriques.",
      co: 'Qualité, sécurité, méthodes', cs: 'Yellow Belt Lean Six Sigma' },
    { k: 'Données et automatisation', t: 'Power BI, DAX, Power Automate', m: 'Excel avancé',
      b: "Power Query, SharePoint, machine virtuelle Windows de lecture et d'extraction de PDF, GMAO. HTML, CSS, JavaScript, Python, VBA, SQL, Git.",
      co: 'Données et développement', cs: 'Power BI, Python, JavaScript' },
    { k: 'Intelligence artificielle', t: 'Agents LLM, OCR, MCP', m: 'autodidacte',
      b: "Agents LLM, connecteurs MCP, OCR et PDF vers JSON, décisions à score de confiance, serveur interne et LLM open source.",
      co: 'Intelligence artificielle', cs: 'Formé seul depuis trois ans' },
  ] },
  { name: 'Formation', color: 0x4b22b8, notes: ["Master 1 MQSE validé (2025 · 2026)", "Master d'histoire, Avignon Université (2017 · 2022)", "Green Belt Lean Six Sigma en préparation", "NEBOSH IGC en préparation"], cards: [
    { k: '2026 · 2027', t: 'Master 2 MQSE', m: 'en cours',
      b: "Maintenance, Qualité, Sécurité, Environnement. Université Sorbonne Paris Nord.",
      co: 'Université Sorbonne Paris Nord', cs: 'Master 2 en cours' },
    { k: 'Parcours antérieur', t: 'Histoire puis classe préparatoire', m: '2016 · 2022',
      b: "Master d'histoire, Avignon Université (2017 · 2022). Classe préparatoire ECE puis baccalauréat ES, Lycée Jean Calvin, Noyon.",
      co: 'Avignon Université', cs: "Master d'histoire" },
    { k: 'Certifications · langues', t: 'Yellow Belt Lean Six Sigma', m: 'Anglais courant',
      b: "Obtenu : Yellow Belt. En préparation : Green Belt, NEBOSH IGC. Français niveau soutenu, anglais niveau courant.",
      co: 'Certifications', cs: 'Green Belt et NEBOSH IGC en préparation' },
  ] },
  { name: 'Contact', color: 0x141414, notes: ["Portfolio : comtesse.me", "LinkedIn : mathieu-comtesse", "CV à jour en octobre 2026", "Île-de-France"], cards: [
    { k: 'Me joindre', t: 'mathieu@comtesse.me', m: 'Île-de-France',
      b: "Portfolio : comtesse.me. LinkedIn : mathieu-comtesse-a226a1433.",
      href: 'mailto:mathieu@comtesse.me', co: 'Écrire', cs: 'mathieu@comtesse.me' },
    { k: 'Version texte', t: 'CV en PDF', m: '2 pages',
      b: "Version lisible par les outils de recrutement : noir et blanc, texte dans l'ordre de lecture, liens cliquables.",
      href: 'assets/cv-ats-mathieu-comtesse.pdf', co: 'CV en PDF', cs: 'Télécharger' },
  ] },
];

/* mise en page : prologue, puis pour chaque section titre, rangées de blocs (2 par rangée), bande de notes */
let zc = -PRO;
for (const s of SECTIONS) {
  s.z0 = zc;
  const rows = []; for (let i = 0; i < s.cards.length; i += 2) rows.push(s.cards.slice(i, i + 2));
  s.rows = rows; s.len = 22 + rows.length * 11 + 14;
  rows.forEach((r, k) => r.forEach((d, j) => {
    d.w = r.length === 1 ? 8.8 : 5.4; d.x = r.length === 1 ? 0 : (j ? 3.2 : -3.2); d.z = s.z0 - 22 - k * 11;
  }));
  s.zNotes = s.z0 - 22 - rows.length * 11 - 1.5;
  zc -= s.len;
}
const TOTAL = -zc;
const END = zc + 4;

/* ---------- utilitaires ---------- */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const mix = (n, to, a) => { const ch = (v, sh) => (v >> sh) & 255; let o = 0; for (const sh of [16, 8, 0]) o = (o << 8) | Math.round(ch(n, sh) + (ch(to, sh) - ch(n, sh)) * a); return o; }; // mélange en sRGB
function wrap(g, text, x, y, maxW, lh, maxLines = 99) {
  const words = text.split(' '); let line = '', n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines) return y; } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}
const PPM = 160; // pixels de texture par mètre de bloc
function cardCanvas(d, sec) {
  const W = Math.round(d.w * PPM), H = Math.round(CD * PPM), c = mk(W, H), g = c.getContext('2d');
  const dark = sec.color === 0x141414, bg = dark ? '#1d1d1f' : hex(mix(sec.color, 0xffffff, 0.1));
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.strokeRect(3, 3, W - 6, H - 6);
  g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '500 20px iAWriterQuattroV, monospace';
  wrap(g, d.k.toUpperCase(), 34, 52, W - 68, 26, 1);
  g.fillStyle = '#fff'; g.font = '700 40px Inter, sans-serif';
  const y = wrap(g, d.t, 34, 106, W - 68, 46, 2);
  const bw = Math.round(W * 0.56);
  g.fillStyle = 'rgba(255,255,255,.92)'; g.font = 'italic 400 25px Inter, sans-serif';
  wrap(g, d.b, 34, y + 18, bw, 33, 8);
  // panneau blanc à droite : la mesure clé, comme une capture d'interface
  const pw = Math.round(W * 0.36), px = W - pw - 30, ph = Math.round(H * 0.3), py = H - ph - 78;
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(px, py, pw, ph, 12); g.fill();
  g.fillStyle = '#0d0d0d'; g.font = '700 30px Inter, sans-serif'; g.textAlign = 'center';
  wrap(g, d.m, px + pw / 2, py + ph / 2 - 6, pw - 24, 36, 3); g.textAlign = 'left';
  if (d.href) {
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect(34, H - 62, 190, 38, 19); g.fill();
    g.fillStyle = '#fff'; g.font = '500 20px iAWriterQuattroV, monospace'; g.fillText(d.href.startsWith('mailto') ? 'Écrire →' : 'Ouvrir →', 56, H - 37);
  }
  return c;
}
let htmlInCanvas = false;
function cardElement(d, sec) {
  const el = document.createElement('div'); el.className = 'card';
  el.style.width = Math.round(d.w * PPM) + 'px'; el.style.height = Math.round(CD * PPM) + 'px';
  el.style.setProperty('--bg', sec.color === 0x141414 ? '#1d1d1f' : hex(mix(sec.color, 0xffffff, 0.1)));
  const add = (tag, cls, txt) => { const n = document.createElement(tag); n.className = cls; n.textContent = txt; el.append(n); };
  add('p', 'k', d.k); add('h3', 't', d.t); add('p', 'b', d.b); add('div', 'panel', d.m);
  if (d.href) add('span', 'btn', d.href.startsWith('mailto') ? 'Écrire →' : 'Ouvrir →');
  return el;
}
const htmlCards = new Set();
function cardMap(d, sec, mat) {
  const fb = tex(cardCanvas(d, sec));
  if (htmlInCanvas) htmlCards.add({ el: cardElement(d, sec), mat, fb });
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
function dropHtmlCards() {
  for (const c of htmlCards) { c.mat.onBeforeCompile = () => {}; c.mat.customProgramCacheKey = () => 'plain'; c.mat.map = c.fb; c.mat.needsUpdate = true; c.el.remove(); }
  htmlCards.clear(); htmlInCanvas = false; document.documentElement.dataset.htmlInCanvas = false;
}
function labelSprite(text, { w = 3.2, h = 0.8, font = '500 30px iAWriterQuattroV, monospace', color = '#fff', bg = null, op = 1 } = {}) {
  const c = mk(Math.round(w * 90), Math.round(h * 90)), g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, opacity: op, depthWrite: false, fog: false }));
  sp.scale.set(w, h, 1); return sp;
}

/* ---------- scène ---------- */
await Promise.all(['700 40px Inter', 'italic 400 25px Inter', '700 150px Inter', '500 20px iAWriterQuattroV'].map((f) => document.fonts.load(f))).catch(() => {});
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
htmlInCanvas = 'texElementImage2D' in renderer.getContext() && 'HTMLTexture' in THREE;
document.documentElement.dataset.htmlInCanvas = htmlInCanvas;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 40, 150);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 300); camera.up.set(0, 0, -1);
const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), postScene = new THREE.Scene();
const postMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: rt.texture }, px: { value: new THREE.Vector2() }, amt: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D t; uniform vec2 px; uniform float amt; varying vec2 vUv;
    void main(){
      float r = amt * (smoothstep(0.52, 1.0, vUv.y) * 5.0 + smoothstep(0.36, 0.5, abs(vUv.x - 0.5)) * 2.0);
      vec4 c = texture2D(t, vUv);
      if (r > 0.25) { vec4 acc = c; for (int i = 0; i < 16; i++) { float a = float(i) * 2.39996, rr = r * sqrt((float(i) + 0.5) / 16.0); acc += texture2D(t, vUv + vec2(cos(a), sin(a)) * rr * px); } c = acc / 17.0; }
      gl_FragColor = c;
      #include <colorspace_fragment>
    }`, depthTest: false, depthWrite: false });
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const d = renderer.getPixelRatio(); rt.setSize(Math.round(innerWidth * d), Math.round(innerHeight * d)); postMat.uniforms.px.value.set(1 / (innerWidth * d), 1 / (innerHeight * d));
}
addEventListener('resize', resize); resize();
const white = (o = 0.4) => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: o });
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const Z_MID = (-PRO + END) / 2, Z_LEN = PRO + TOTAL + 260;

// grille de fond et piste
const grid = new THREE.GridHelper(Z_LEN, Z_LEN / 4, 0x2a2a2a, 0x181818); grid.position.set(0, -0.02, Z_MID); scene.add(grid);
const bandMat = (n) => new THREE.MeshBasicMaterial({ color: n });
const pro = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, PRO + 60), bandMat(0x1c1cb4)); pro.rotation.x = -Math.PI / 2; pro.position.set(0, 0, 30 - PRO / 2); scene.add(pro);
SECTIONS.forEach((s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, s.len), bandMat(s.color)); m.rotation.x = -Math.PI / 2; m.position.set(0, 0, s.z0 - s.len / 2); scene.add(m); });
for (const sx of [-HALF, HALF]) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx, 0.03, 30), new THREE.Vector3(sx, 0.03, END - 20)]), white(0.7)));

// arcs concentriques sur les côtés (comme dans la vidéo)
for (let i = 0; i < 18; i++) {
  const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), r = 26 + k * 7, cz = Z_MID + (rnd() - 0.5) * Z_LEN * 0.8, cx = side * (HALF + 30 + k * 3.5), pts = [], a0 = rnd() * 6.28, span = 0.9 + rnd() * 1.1;
  for (let j = 0; j <= 60; j++) { const a = a0 + span * j / 60; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0.03, cz + Math.sin(a) * r)); }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), white(0.3)));
}
// bâtiments filaires (blocs noirs empilés, arêtes blanches) et cotes
const edgeW = white(0.55), blackM = new THREE.MeshBasicMaterial({ color: 0x050505 });
function building(x, z) {
  const n = 2 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const w = 1 + rnd() * 2, h = 1.5 + rnd() * 5, d = 1 + rnd() * 2, ox = (rnd() - 0.5) * 3, oz = (rnd() - 0.5) * 3;
    const geo = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(geo, blackM); m.position.set(x + ox, h / 2, z + oz); scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeW); e.position.copy(m.position); scene.add(e);
  }
  if (rnd() < 0.7) { const t = labelSprite((0.2 + Math.floor(rnd() * 15) / 10).toFixed(1).replace('.', ',') + ' m', { w: 1.6, h: 0.45, font: '400 24px iAWriterQuattroV, monospace', color: '#cfd3da', op: 0.8 }); t.position.set(x + (rnd() - 0.5) * 3, 0.3, z + 2.2); scene.add(t); }
}
const FORM = ['y = sin(2πx + φ)', 'x = cos φ', 'e^t = Σ tⁿ / n!', 'dx/dt = x', 'y = e^(1−(x−μ)²)', 'φ = 0,86'];
for (let z = 12; z > END - 20; z -= 9) for (const side of [-1, 1]) {
  if (rnd() < 0.8) building(side * (HALF + 4 + rnd() * 9), z + rnd() * 6);
  if (rnd() < 0.18) { const f = labelSprite(FORM[Math.floor(rnd() * FORM.length)], { w: 4.4, h: 0.6, font: '400 26px iAWriterQuattroV, monospace', color: '#cfd3da', op: 0.75 }); f.position.set(side * (HALF + 5 + rnd() * 8), 0.2, z); scene.add(f); }
}

// grappes de points aux frontières, étiquette bleue, anneau et nom de section au sol de chaque côté
const nodeMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true });
function cluster(x, z, label, sideTags, k0 = 1) {
  const pts = [], seg = [], hub = new THREE.Vector3(x, 2.5, z);
  for (let k = 0; k < 22; k++) { const a = rnd() * 6.283, r = (1 + rnd() * 3) * k0, p = new THREE.Vector3(x + Math.cos(a) * r, 2.5 + (rnd() - 0.5) * 2.4 * k0, z + Math.sin(a) * r); pts.push(p); seg.push(hub, p); }
  scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints([hub, ...pts]), nodeMat));
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), white(0.6)));
  if (label) { const sp = labelSprite(label, { w: 3, h: 0.7, font: '600 30px iAWriterQuattroV, monospace', bg: '#1736ff' }); sp.position.set(x - 1, 2.5, z); scene.add(sp); }
  if (sideTags) for (const sx of [-1, 1]) { const t = labelSprite(label, { w: 3, h: 0.6, font: '500 28px Inter, sans-serif', color: '#9a9ea8', op: 0.9 }); t.position.set(sx * (HALF + 4.5), 0.2, z - 1); scene.add(t); }
}
function ring(x, z, r, label) {
  const pts = []; for (let j = 0; j <= 48; j++) pts.push(new THREE.Vector3(x + Math.cos(j / 48 * 6.283) * r, 0.04, z + Math.sin(j / 48 * 6.283) * r));
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), white(0.5)));
  const t = labelSprite(label, { w: 2.6, h: 0.5, font: '400 24px iAWriterQuattroV, monospace', color: '#fff', op: 0.85 }); t.position.set(x, 0.1, z + r + 0.6); scene.add(t);
}

// titre posé sur la piste, légèrement extrudé par empilement de plans
function textTexture(text, size) {
  const c = mk(1024, 256), g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `700 ${size}px Inter, sans-serif`; g.fillText(text, 30, 128);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
function extruded(text, size, wM, hM, x, z, layers, step, rotY = 0) {
  const t = textTexture(text, size);
  for (let k = 0; k < layers; k++) {
    const top = k === layers - 1, m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), new THREE.MeshBasicMaterial({ map: t, transparent: true, color: top ? 0xffffff : new THREE.Color().setScalar(0.4 + 0.35 * k / layers), depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = rotY; m.position.set(x, 0.04 + k * step, z); m.renderOrder = 3 + k; scene.add(m);
  }
}

// blocs : face supérieure = carte, flancs plus sombres, ombre et cotes
const platforms = [], links = [], callouts = [], machines = [];
const edgeMat = white(0.6);
function slabBlock(d, sec, withCallout = true) {
  const top = new THREE.MeshBasicMaterial(); top.map = cardMap(d, sec, top);
  const side = new THREE.MeshBasicMaterial({ color: mix(sec.color, 0x000000, 0.35) });
  const m = new THREE.Mesh(new THREE.BoxGeometry(d.w, SH, CD), [side, side, top, side, side, side]);
  m.position.set(d.x, SH / 2, d.z); scene.add(m);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat); e.position.copy(m.position); scene.add(e);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(d.w + 0.6, CD + 0.6), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(d.x + 0.25, 0.05, d.z + 0.25); scene.add(sh);
  for (const [txt, px, pz] of [['Δx', d.x, d.z + CD / 2 + 0.7], ['z(t)', d.x + d.w / 2 + 0.7, d.z + CD / 2 - 0.2], ['y(t)', d.x - d.w / 2 - 0.7, d.z - CD / 2 + 0.2]]) {
    const t = labelSprite(txt, { w: 1.1, h: 0.4, font: '400 22px iAWriterQuattroV, monospace', color: '#fff', op: 0.6 }); t.position.set(px, 0.15, pz); scene.add(t);
  }
  platforms.push({ x: d.x, z: d.z, hw: d.w / 2, hd: CD / 2 });
  if (withCallout) {
    const sd = d.x < 0 ? -1 : d.x > 0 ? 1 : (callouts.length % 2 ? 1 : -1);
    callouts.push({ d, side: sd, p: new THREE.Vector3(d.x + sd * d.w / 2, SH, d.z - CD / 2) });
  }
  if (d.href) links.push({ mesh: m, href: d.href });
}

/* prologue : l'affiche (titre extrudé, sommaire en bloc, graphe de nœuds) */
extruded('Comtesse', 150, 11, 2.75, -4.6, -14.5, 10, 0.09, Math.PI / 2);
extruded('Mathieu', 150, 11, 2.75, -2.2, -12.6, 10, 0.09, Math.PI / 2);
{
  slabBlock({ k: 'Sommaire', t: 'Un CV à parcourir', m: '01 à 06', b: SECTIONS.map((s, i) => `0${i + 1} ${s.name}`).join(' · '), w: 4.4, x: 2.9, z: -8.6 }, SECTIONS[0], false);
  SECTIONS.forEach((s, i) => { const x = 2.2 + (i % 2) * 2.6, z = -13.2 - i * 1.7; cluster(x, z, null, false, 0.35); ring(x, z, 1.2, `0${i + 1} ${s.name}`); });
  const curve = []; for (let i = 0; i <= 40; i++) { const u = i / 40; curve.push(new THREE.Vector3(-5.6 + u * 11.2, 0.05, -24.5 + 3 * (1 - Math.exp(-3.2 * u * u)))); }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve), white(0.7)));
  const xl = labelSprite('x = 4,00', { w: 2, h: 0.5, font: '400 24px iAWriterQuattroV, monospace', op: 0.9 }); xl.position.set(4.2, 0.1, -23.2); scene.add(xl);
}

SECTIONS.forEach((s) => {
  cluster(0, s.z0 - 3, s.name, true);
  extruded(s.name, 140, 9, 2.25, -1.4, s.z0 - 10, 3, 0.04);
  s.rows.forEach((r) => r.forEach((d) => slabBlock(d, s)));
  // bande de notes : quatre colonnes, un point par note
  const W = 12.4, c = mk(1240, 260), g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = 'italic 400 21px Inter, sans-serif';
  s.notes.forEach((n, j) => { g.beginPath(); g.arc(18 + j * 310, 18, 6, 0, 6.283); g.fill(); wrap(g, n, 18 + j * 310, 54, 262, 28, 6); });
  const np = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.6), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  np.rotation.x = -Math.PI / 2; np.position.set(0, 0.05, s.zNotes - 1.3); scene.add(np);
  s.dots = s.notes.map((_, j) => new THREE.Vector3(-W / 2 + (18 + j * 310) / 100, 0.06, s.zNotes - 0.18));
});
cluster(0, END - 9, 'Arrivée', false);
{ const tail = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 40), bandMat(0x141414)); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0, zc - 20); scene.add(tail); }
const finish = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
finish.rotation.x = -Math.PI / 2; finish.position.set(0, 0.05, END); scene.add(finish);
startHtmlCards();

// machines 3D du site (refonte/m3d), posées au sol de chaque côté de la piste, en face de leur bloc
scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b8e6, 1.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(-9, 16, 8); scene.add(sun);
SECTIONS.forEach((s) => s.cards.filter((d) => d.mach).forEach(async (d) => {
  try {
    const { build, WIDTH = 236 } = await import(`./m3d/${d.mach}.js`);
    const m = build(), g = new THREE.Group(); g.add(m.group); g.scale.setScalar(11 / WIDTH); scene.add(g);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), side = d.x < 0 ? -1 : 1;
    g.position.set(side * (HALF + 8.5) - c.x, -box.min.y, d.z - c.z);
    machines.push({ m, z: d.z });
  } catch (err) { console.warn('machine ' + d.mach + ' indisponible', err); }
}));

// joueur
const player = new THREE.Group();
const cube = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff })); cube.position.y = 0.35; player.add(cube);
const pe = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0x000000 })); pe.position.y = 0.35; player.add(pe);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow); scene.add(player);

/* ---------- état et commandes ---------- */
const S = { x: 0, y: 0, z: 2, target: 2, vy: 0, v: 0, vis: 0, mode: 'scroll', running: false, done: false, keys: new Set(), lean: 0 };
const TOP = 2, FOLD = 16; // la première page se rabat sur les 20 premiers mètres de défilement
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const groundAt = (x, z) => { let h = 0; for (const p of platforms) if (Math.abs(x - p.x) < p.hw + 0.35 && Math.abs(z - p.z) < p.hd + 0.35) h = SH; return h; };
const $ = (id) => document.getElementById(id);
const hop = () => { if (S.running && S.y <= groundAt(S.x, S.z) + 0.01) S.vy = 11; };
const VMAX = 22;
const scrollBy = (m) => { S.target = Math.max(END, Math.min(TOP, S.target - m)); };
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (S.mode === 'scroll') {
    const step = { arrowdown: 3, arrowup: -3, pagedown: 14, pageup: -14, ' ': e.shiftKey ? -14 : 14, home: 1e4 * -1, end: 1e4 }[k];
    if (step !== undefined) { e.preventDefault(); if (k === 'home') S.target = TOP; else if (k === 'end') S.target = END; else scrollBy(step); }
    return;
  }
  if (e.key === ' ') { e.preventDefault(); hop(); return; }
  if (k === 'escape') { leaveGame(); return; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd', 'z', 'q'].includes(k)) { e.preventDefault(); S.keys.add(k); }
});
addEventListener('keyup', (e) => S.keys.delete(e.key.toLowerCase()));
// la molette fait avancer sur le chemin ; en mode jeu elle accélère et freine
addEventListener('wheel', (e) => {
  e.preventDefault();
  const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
  if (S.mode === 'scroll') scrollBy(dy * 0.012);
  else S.v = Math.min(VMAX, Math.max(0, S.v - Math.sign(dy) * 1.4));
}, { passive: false });
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: S.x, moved: false }; });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
  if (S.mode === 'scroll') { if (e.buttons || e.pointerType !== 'mouse') { scrollBy(-(e.clientY - drag.y) * 0.05); drag.y = e.clientY; } }
  else if (e.pointerType !== 'mouse') S.x = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, drag.sx + (e.clientX - drag.x) / innerWidth * 18));
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return; const moved = drag.moved; drag = null; if (moved) return;
  const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = r.intersectObjects(links.map((l) => l.mesh))[0];
  if (hit) location.href = links.find((l) => l.mesh === hit.object).href; else hop();
});

const ul = document.querySelector('#nav ul');
SECTIONS.forEach((s) => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.textContent = s.name; b.onclick = () => { leaveGame(); S.target = s.z0 - 6; };
  li.append(b); ul.append(li);
});
const navItems = [...ul.children];
// mode jeu (comme dans la vidéo, le bouton attend en fin de parcours) : on repart du début de la piste, au clavier
function start() {
  Object.assign(S, { mode: 'game', running: true, done: false, x: 0, y: 0, vy: 0, v: reduce ? 2 : 3.5, z: SECTIONS[0].z0 + 4 });
  S.target = S.z; document.body.classList.add('game'); $('end').hidden = true;
}
function leaveGame() { if (S.mode !== 'game') return; Object.assign(S, { mode: 'scroll', running: false, target: S.z, x: 0, y: 0, lean: 0 }); S.keys.clear(); document.body.classList.remove('game'); }
$('go').onclick = start;
$('again').onclick = () => { $('end').hidden = true; leaveGame(); S.z = S.target = TOP; };

/* légendes, traits courbes du menu vers les notes, repères d'échelle */
const layer = $('callouts'), svg = $('leaders'), NS = 'http://www.w3.org/2000/svg';
const mkp = () => { const p = document.createElementNS(NS, 'path'); svg.append(p); return p; };
const mkc = () => { const p = document.createElementNS(NS, 'circle'); p.setAttribute('r', 3); svg.append(p); return p; };
callouts.forEach((c) => {
  const el = document.createElement(c.d.href ? 'a' : 'div'); el.className = 'co ' + (c.side > 0 ? 'r' : 'l');
  if (c.d.href) el.href = c.d.href;
  el.innerHTML = `${c.d.co}<small>${c.d.cs}</small>`; layer.append(el);
  Object.assign(c, { el, path: mkp(), dot: mkc() });
});
const navPaths = [0, 1, 2, 3].map(() => ({ path: mkp(), dot: mkc() }));
const tickEls = []; const tl = $('ticks');
for (let i = 0; i < 36; i++) { const d = document.createElement('div'); d.className = 'tick'; tl.append(d); tickEls.push(d); }
const tmp = new THREE.Vector3();
const toScreen = (v) => {
  tmp.copy(v).applyMatrix4(camera.matrixWorldInverse);
  tmp.z += KX * Math.min(tmp.x * tmp.x, XCAP); tmp.y -= KZ * tmp.z * tmp.z;
  const behind = tmp.z > -0.1; tmp.applyMatrix4(camera.projectionMatrix);
  return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight, behind ? 2 : tmp.z];
};
let activeIdx = 0;
function updateOverlay() {
  const w = innerWidth, h = innerHeight, narrow = w < 760, bw = narrow ? 150 : 230;
  for (const c of callouts) {
    const dz = S.z - c.p.z;
    const [px, py, pz] = toScreen(c.p);
    const vis = dz > 1 && dz < 50 && pz < 1 && px > -40 && px < w + 40 && py > 20 && py < h * 0.94;
    c.el.style.display = c.path.style.display = c.dot.style.display = vis ? '' : 'none';
    if (!vis) continue;
    const a = Math.min(1, (50 - dz) / 20, (dz - 1) / 5);
    const lx = c.side < 0 ? (narrow ? 8 : 150) : w - bw - 12, ly = Math.max(10, Math.min(py - 46, h * 0.8));
    c.el.style.transform = `translate(${lx}px,${ly}px)`; c.el.style.opacity = a; c.el.style.width = bw + 'px';
    const ex = c.side < 0 ? lx + bw : lx, ey = ly + c.el.offsetHeight;
    c.path.setAttribute('d', `M${c.side < 0 ? lx : lx + bw},${ey} L${ex},${ey} L${px},${py}`);
    c.path.style.opacity = a * 0.8; c.dot.setAttribute('cx', px); c.dot.setAttribute('cy', py); c.dot.style.opacity = a;
  }
  // traits courbes : du point actif du menu vers les quatre notes de la section
  const btn = navItems[activeIdx] && navItems[activeIdx].firstChild, sec = SECTIONS[activeIdx];
  if (btn && !narrow) {
    const r = btn.getBoundingClientRect(), ox = r.right + 2, oy = r.top + r.height / 2;
    navPaths.forEach((n, j) => {
      const [px, py, pz] = toScreen(sec.dots[j]); const ok = pz < 1 && py > 10 && py < h * 0.95 && px > 0 && px < w;
      n.path.style.display = n.dot.style.display = ok ? '' : 'none'; if (!ok) return;
      const dx = px - ox; n.path.setAttribute('d', `M${ox},${oy} C${ox + dx * 0.1},${oy - 150 - j * 25} ${px - dx * 0.5},${py + 20} ${px},${py}`);
      n.path.style.opacity = 0.85; n.dot.setAttribute('cx', px); n.dot.setAttribute('cy', py);
    });
  } else navPaths.forEach((n) => { n.path.style.display = n.dot.style.display = 'none'; });
  // repères d'échelle (px) le long des deux bords, tous les 5 m
  const zStart = Math.ceil((S.z + 12) / 5) * 5; let n = 0;
  for (let zt = zStart; zt > Math.max(S.z - 55, END - 1) && n < tickEls.length - 1; zt -= 5) for (const sx of [-1, 1]) {
    const [px, py, pz] = toScreen(new THREE.Vector3(sx * (HALF + 0.9), 0, zt));
    const el = tickEls[n++]; const ok = pz < 1 && py > 0 && py < h && px > 0 && px < w;
    el.style.display = ok ? '' : 'none'; if (ok) { el.textContent = Math.max(0, Math.round(-zt * PX)).toLocaleString('fr-FR'); el.style.transform = `translate(${px}px,${py}px) translate(${sx < 0 ? '-100%' : '0'},-50%)`; }
  }
  for (; n < tickEls.length; n++) tickEls[n].style.display = 'none';
}

/* ---------- boucle ---------- */
const timer = new THREE.Timer();
const ease = (u) => u * u * (3 - 2 * u);
const posePos = new THREE.Vector3(), poseLook = new THREE.Vector3(), runPos = new THREE.Vector3(), runLook = new THREE.Vector3(), lk = new THREE.Vector3();
function frame() {
  timer.update(); const dt = Math.min(timer.getDelta(), 0.05), K = S.keys;
  const z0 = S.z;
  if (S.mode === 'scroll') S.z += (S.target - S.z) * Math.min(1, dt * 5);
  if (S.mode === 'game' && S.running && !S.done) {
    if (K.has('arrowup') || K.has('w') || K.has('z')) S.v = Math.min(VMAX, S.v + 9 * dt);
    if (K.has('arrowdown') || K.has('s')) S.v = Math.max(0, S.v - 16 * dt);
    const dir = (K.has('arrowright') || K.has('d') ? 1 : 0) - (K.has('arrowleft') || K.has('a') || K.has('q') ? 1 : 0);
    S.x = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, S.x + dir * 9 * dt)); S.lean += (dir - S.lean) * Math.min(1, dt * 6);
    S.z -= S.v * dt;
    const g = groundAt(S.x, S.z); S.vy -= 30 * dt; S.y += S.vy * dt; if (S.y <= g) { S.y = g; S.vy = 0; }
    if (S.z <= END) { S.done = true; S.running = false; S.z = END; $('end').hidden = false; }
  }
  S.vis += (Math.abs(S.z - z0) / Math.max(dt, 1e-3) - S.vis) * Math.min(1, dt * 4);
  // la première page, vue de face, se rabat au fil des 20 premiers mètres pour devenir le début du chemin
  const e = S.mode === 'game' ? 1 : ease(Math.max(0, Math.min(1, (TOP - S.z) / FOLD)));
  player.visible = shadow.visible = S.mode === 'game';
  player.position.set(S.x, S.y, S.z); shadow.position.set(S.x, 0.06 + groundAt(S.x, S.z), S.z); cube.rotation.y += dt * S.v * 0.05;
  // caméra : affiche vue de haut au départ, puis suivi quasi vertical ; elle se rapproche quand on freine pour lire
  const slow = S.mode === 'game' ? 1 - Math.min(1, S.v / 5) : 0;
  posePos.set(0, 19, -13.2); poseLook.set(0, 0, -13.201);
  runPos.set(S.x * 0.45, 15.5 - slow * 3.5 + S.y * 0.3, S.z + 6.5 - slow * 1.5); runLook.set(S.x * 0.4, 0, S.z - 8);
  camera.position.lerpVectors(posePos, runPos, e);
  lk.lerpVectors(poseLook, runLook, e); camera.lookAt(lk); camera.rotateZ(-S.lean * 0.035 * e);
  const sp = S.mode === 'game' ? S.v : S.vis;
  const fov = (60 + Math.min(1, sp / VMAX) * 9 - slow * 4) * e + 50 * (1 - e); if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  activeIdx = 0; for (let i = 0; i < SECTIONS.length; i++) if (S.z <= SECTIONS[i].z0 + 1) activeIdx = i;
  navItems.forEach((li, i) => li.classList.toggle('on', i === activeIdx));
  $('spd').textContent = `v ≈ ${Math.round(sp * PX)} px/s`;
  document.body.classList.toggle('near-end', S.mode === 'scroll' && S.z < END + 22);
  $('left').textContent = `↑ ${Math.max(0, Math.round((S.z - END) * PX)).toLocaleString('fr-FR')} px`;
  const now = timer.getElapsed(); for (const k of machines) if (Math.abs(S.z - k.z) < 70) k.m.update(now);
  postMat.uniforms.amt.value = e;
  try { renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam); } catch (err) { console.warn('HTML-in-Canvas indisponible, repli canvas 2D', err); dropHtmlCards(); }
  updateOverlay();
  requestAnimationFrame(frame);
}
$('left').textContent = `↑ ${Math.round((2 - END) * PX).toLocaleString('fr-FR')} px`;
window.__parcours = S; window.__sections = SECTIONS;
frame();
