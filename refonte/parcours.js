import * as THREE from 'three';
import { drawMat, blueprintMaterial } from './blueprint-hero.js';

// Hébergement sans .glb (page publiée) : si un modèle n'est pas servi, sa copie en base64 (.glb.b64.txt) prend le relais.
// Sur le site, les .glb répondent et cette cale ne fait rien.
{
  const raw = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url, r = await raw(input, init);
    if (r.ok || !/\.glb(\?|$)/.test(url)) return r;
    const alt = await raw(url.replace(/\.glb(\?.*)?$/, '.glb.b64.txt')).catch(() => null);
    if (!alt || !alt.ok) return r;
    const b = atob((await alt.text()).trim()), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new Response(u, { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } });
  };
}

/* « Expo » du CV : la page HTML (#page) est mise en page normalement, puis chaque élément marqué devient un objet 3D
   à la même place (1 px de page = 1 cm). data-box : boîte de verre extrudée ; data-plane : texte posé au sol ;
   data-float : texte qui flotte ; data-step : étape révélée par « Cliquez ici pour voir la magie » ; data-extrude : titre en volume.
   Texture : l'élément lui-même via HTML-in-Canvas quand le navigateur le permet, sinon une image de la section (SVG foreignObject).
   Le défilement natif pilote la caméra : vue de face à l'échelle 1:1 au départ, puis la page se rabat en chemin et se relève au loin. */

const ROOM_K = 0.9;               // échelle de la pièce du site (et de son plan blueprint) dans le parcours
const PXM = 100;                  // px de page par mètre
const PAGE_W = 1000;
const HALF = PAGE_W / PXM / 2;    // demi-largeur de la piste (m)
const FOLD_A = 120, FOLD_B = 900; // la page se rabat entre ces deux positions de défilement (px)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const page = $('#page');

// couleurs de section, aussi pour la lecture sans 3D
$$('[data-section]').forEach((s) => { s.style.background = s.dataset.color; });

/* ---------- courbure : le fond du chemin se relève comme une rampe, les côtés remontent (même calcul en GLSL et en JS) ---------- */
// La feuille ne se plie pas : elle se cintre de façon continue. Au-delà de d0 devant la caméra, la hauteur croît en t²/2R
// (la pente augmente doucement jusqu'à presque la verticale au loin) ; les côtés remontent aussi, comme une gouttière.
const CURL = { k: 2.4, off: 12, R: 20, side: 0.035 };
const CURL_GLSL = `
vec4 curlW( vec4 w ) {
  float sx = max( abs( w.x ) - ${(HALF + 0.6).toFixed(2)}, 0.0 ); w.y += ${CURL.side} * sx * sx;
  float d0 = ${CURL.k.toFixed(2)} * cameraPosition.y - ${CURL.off.toFixed(1)};
  float t = max( cameraPosition.z - w.z - d0, 0.0 ), h = w.y, s = t / ${CURL.R.toFixed(1)}, c = inversesqrt( 1.0 + s * s );
  w.y = t * t / ${(2 * CURL.R).toFixed(1)} + h * c;
  w.z += h * s * c;
  return w;
}`;
function curlJS(v, cam) {
  const sx = Math.max(Math.abs(v.x) - (HALF + 0.6), 0); v.y += CURL.side * sx * sx;
  const d0 = CURL.k * cam.y - CURL.off, t = Math.max(cam.z - v.z - d0, 0), h = v.y, sl = t / CURL.R, c = 1 / Math.sqrt(1 + sl * sl);
  v.y = t * t / (2 * CURL.R) + h * c; v.z += h * sl * c;
  return v;
}
const PROJECT = THREE.ShaderChunk.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;', 'mvPosition = viewMatrix * curlW( modelMatrix * mvPosition );');
// un seul onBeforeCompile par matériau : courbure + options (linéarisation HTML-in-Canvas, découpe du plan blueprint)
function patch(mat) {
  if (mat.userData.pc) return; mat.userData.pc = true;
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + CURL_GLSL)
      .replace('#include <project_vertex>', PROJECT)
      .replace('vec4 mvPosition = modelViewMatrix[ 3 ];', 'vec4 mvPosition = viewMatrix * curlW( modelMatrix[ 3 ] );');
    let f = '';
    if (mat.userData.lin) f += '\n diffuseColor.rgb = pow(diffuseColor.rgb, vec3(2.2));';
    if (mat.userData.clip) f += '\n' + mat.userData.clip;
    if (f) sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>' + f);
  };
  mat.customProgramCacheKey = () => 'pc' + (mat.userData.lin ? 'L' : '') + (mat.userData.clip ? 'C' + mat.userData.clip.length : '');
  mat.needsUpdate = true;
}
function patchTree(root) { root.traverse((o) => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(patch); }); }

/* ---------- sans WebGL, la page reste une page ---------- */
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true }); } catch { /* lecture 2D */ }
if (renderer) await start();

async function start() {
  const canvas = renderer.domElement;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const HIC = 'texElementImage2D' in renderer.getContext() && 'requestPaint' in canvas;
  document.documentElement.dataset.htmlInCanvas = HIC;
  await Promise.all(['500 22px Inter', 'italic 400 16px Inter', '700 68px Inter', '500 12px iAWriterQuattroV'].map((f) => document.fonts.load(f))).catch(() => {});
  // page Gains : construite par les scripts du site (tableau de bord, graphique, tableau) ; la tirelire 3D du parcours prend la place de la sienne
  if ($('#work')) {
    try {
      const [{ initGainsDashboard }, { initGainsTable }] = await Promise.all([import('../js/gains-dashboard.js?v=monde-20261025'), import('../js/gains-table.js?v=ind-20261101')]);
      initGainsDashboard(); initGainsTable(); $('.annual-pig-wrap')?.setAttribute('data-pig', '');
    } catch (e) { console.warn('page Gains indisponible', e); }
  }
  const flowTops = [], flows = [];
  if ($('[data-flow]')) {
    const { initFlow } = await import('./flow.js');
    $$('[data-flow]').forEach((w, i) => { const api = initFlow(w.querySelector('.rf-flow'), { tops: () => flowTops[i] }); flows.push({ w, api }); });
  }
  document.documentElement.classList.add('expo');
  if (!HIC) page.classList.add('pc-fallback');

  /* relevé de la mise en page */
  // premier écran plein cadre : la page (1000 px) occupe toute la largeur, et l'accueil toute la hauteur visible
  const KF = Math.max(1, innerWidth / PAGE_W); $('.pc-home')?.style.setProperty('--hh', Math.round(innerHeight / KF) + 'px');
  const P = page.getBoundingClientRect();
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - P.left, y: r.top - P.top, w: r.width, h: r.height }; };
  const W = (r) => ({ cx: (r.x + r.w / 2 - PAGE_W / 2) / PXM, cz: (r.y + r.h / 2) / PXM, w: r.w / PXM, d: r.h / PXM });
  const PAGE_H = P.height;
  const tlEl = $('[data-tl]'), tlRect = tlEl && rectOf(tlEl), tlLine = tlEl?.querySelector('#rf-tl-line'), tlDot = tlEl?.querySelector('#rf-tl-dot');
  const tlS = { p: 0, v: 0 };
  // liens d'un bloc dessiné sur la feuille (contact) : zones actives transparentes recalées sur l'image, mêmes survols que le site
  const hots = $$('[data-hot] .rf-link').map((a) => { const r = rectOf(a), box = a.closest('.rf-contact-in'), h = document.createElement('a');
    h.className = 'pc-hot'; h.setAttribute('aria-label', a.getAttribute('aria-label') || a.textContent.trim());
    if (a.getAttribute('href')) { h.href = a.getAttribute('href'); h.target = '_blank'; h.rel = 'noopener'; } else { h.href = '#'; h.addEventListener('click', (e) => { e.preventDefault(); a.click(); }); }
    h.addEventListener('pointerenter', () => { a.classList.add('hov'); box?.classList.add('hov-in'); }); h.addEventListener('pointerleave', () => { a.classList.remove('hov'); box?.classList.remove('hov-in'); });
    document.body.append(h); return { h, r }; });
  /* cadres relevables : au clic, le bloc du site monte devant le lecteur, vivant (ses scripts, ses survols, ses sons), et défile à la molette */
  const LIFT_SEL = '.pc-card, [data-flow], .pc-blogcol, .gains-stats, .gains-chart, .gx-table, [data-tl], .pc-hublot, .pc-exp-title, .pc-float';
  const lifts = $$(LIFT_SEL).filter((el) => !el.parentElement.closest(LIFT_SEL)).map((el) => {
    const h = document.createElement('button'); h.type = 'button'; h.className = 'pc-hot pc-lift-hot'; h.setAttribute('aria-label', 'Relever ce cadre');
    const L = { el, r: rectOf(el), h }; h.addEventListener('click', () => openLift(L)); document.body.append(h); hots.push(L); return L;
  });
  flows.forEach((f, i) => { flowTops[i] = $$('.rf-flow-step', f.w).map((li) => rectOf(li).y); });
  const sigSvg0 = $('#pc-sign svg'), sigRect = sigSvg0 && rectOf(sigSvg0); // relevé avant tout déplacement d'élément

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 30, 120);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400); camera.up.set(0, 0, -1);
  const white = (o = 0.4) => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: o });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // toute surface est découpée tous les 40 cm pour suivre la courbure
  const N = (d) => Math.max(1, Math.ceil(d / 0.4));
  const plane = (w, d) => new THREE.PlaneGeometry(w, d, 1, N(d));
  /* sections : bandes de couleur */
  const sections = $$('[data-section]').map((el) => ({ el, name: el.dataset.section, color: el.dataset.color, r: rectOf(el) }));
  for (const s of sections) {
    if ('blueprint' in s.el.dataset) continue; // le plan blueprint du site tient lieu de fond
    const g = W(s.r), m = new THREE.Mesh(plane(g.w, g.d), new THREE.MeshBasicMaterial({ color: s.color }));
    m.rotation.x = -Math.PI / 2; m.position.set(g.cx, 0, g.cz); scene.add(m);
  }
  const endZ = PAGE_H / PXM; // le haut de la page est au loin (z = 0), la suite arrive vers la caméra
  { const tail = new THREE.Mesh(plane(HALF * 2, 60), new THREE.MeshBasicMaterial({ color: 0x141414 })); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0, endZ + 30); scene.add(tail); }
  for (const sx of [-HALF, HALF]) { const pts = []; for (let z = -60; z <= endZ + 60; z += 0.5) pts.push(new THREE.Vector3(sx, 0.01, z)); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), white(0.7))); }

  // le vrai plan blueprint de l'accueil du site (même tracé, même shader : grille, lueur, vignettage, grain), à l'échelle de la pièce
  const bps = [];
  for (const el of $$('[data-blueprint]')) {
    const sec = W(rectOf(el)), spot = el.querySelector('[data-room]'), c = spot ? W(rectOf(spot)) : sec, S = 30 * ROOM_K;
    const t = new THREE.CanvasTexture(drawMat(2048)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const mat = blueprintMaterial(t);
    mat.uniforms.uClip = { value: new THREE.Vector4(sec.cx - sec.w / 2, sec.cx + sec.w / 2, sec.cz - sec.d / 2, sec.cz + sec.d / 2) };
    mat.uniforms.uK = { value: 3.6667 / ROOM_K }; mat.uniforms.uC = { value: new THREE.Vector2(c.cx, c.cz) };
    mat.vertexShader = 'uniform vec2 uC;\n' + CURL_GLSL + '\n' + mat.vertexShader.replace('gl_Position=projectionMatrix*viewMatrix*w;', 'gl_Position=projectionMatrix*viewMatrix*curlW(w);');
    mat.fragmentShader = 'uniform vec4 uClip;uniform float uK;uniform vec2 uC;\n' + mat.fragmentShader
      .replace('const float K=3.6667;', 'float K=uK;').replace('vec2 p=vW.xz*K;', 'if(vW.x<uClip.x||vW.x>uClip.y||vW.z<uClip.z||vW.z>uClip.w)discard;vec2 p=(vW.xz-uC)*K;');
    mat.userData.pc = true; // déjà courbé
    mat.depthWrite = false; const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S, N(S), N(S)), mat); // découpé dans les deux sens : il suit la courbure jusqu'aux bords
    m.rotation.x = -Math.PI / 2; m.position.set(c.cx, 0, c.cz); m.renderOrder = -2; scene.add(m);
    bps.push(mat);
  }

  /* frise du parcours (mode image) : le trait plein et le point descendent avec la molette, comme sur la page Expériences */
  let tl3 = null;
  if (tlEl && !HIC) {
    const rr = rectOf(tlEl.querySelector('.rf-tl-rail')), x = (rr.x + 1 - PAGE_W / 2) / PXM, z0 = rr.y / PXM, len = rr.h / PXM;
    const lm = new THREE.Mesh(plane(2 / PXM, len), new THREE.MeshBasicMaterial({ color: 0xe0ebfd, transparent: true, opacity: 0.85, depthWrite: false }));
    lm.geometry.translate(0, -len / 2, 0); lm.rotation.x = -Math.PI / 2; lm.position.set(x, 0.03, z0); lm.renderOrder = 6; scene.add(lm);
    const dm = new THREE.Mesh(new THREE.CircleGeometry(8 / PXM, 24), new THREE.MeshBasicMaterial({ color: 0xe0ebfd, depthWrite: false })); dm.rotation.x = -Math.PI / 2; dm.renderOrder = 7; scene.add(dm);
    tl3 = { lm, dm, x, z0, len };
  }

  /* décor : arcs, bâtiments filaires, cotes, formules */
  const Z0 = -40, Z1 = endZ + 40;
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, r = 20 + (i >> 1) * 6, cz = Z0 + (Z1 - Z0) * rnd(), cx = side * (HALF + 24 + (i >> 1) * 2.5), pts = [], a0 = rnd() * 6.28, sp = 1 + rnd();
    for (let j = 0; j <= 64; j++) { const a = a0 + sp * j / 64; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0.02, cz + Math.sin(a) * r)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), white(0.28)));
  }
  { // grille du sol, en segments courts pour se courber avec la feuille
    const v = [], A = Z0 - 40, B = Z1 + 40;
    for (let x = -60; x <= 60; x += 4) if (Math.abs(x) > HALF) for (let z = A; z < B; z += 1) v.push(x, -0.02, z, x, -0.02, z + 1);
    for (let z = Math.ceil(A / 4) * 4; z < B; z += 4) for (let x = -60; x < 60; x += 1) if (Math.abs(x + 0.5) > HALF) v.push(x, -0.02, z, x + 1, -0.02, z); // hors de la page
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1d1d1d })));
  }
  // étiquette : la toile prend la largeur du texte (jamais tronqué), en double résolution
  const label = (text, { w = 3, h = 0.6, font = '400 26px iAWriterQuattroV, monospace', color = '#cfd3da', bg = null, op = 0.85 } = {}) => {
    const c = document.createElement('canvas'), g = c.getContext('2d'), F = font.replace(/(\d+)px/, (m, n) => n * 2 + 'px');
    g.font = F; const tw = g.measureText(text).width + 16; c.width = Math.max(Math.round(w * 180), Math.ceil(tw)); c.height = Math.round(h * 180);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
    g.fillStyle = color; g.font = F; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: op, depthWrite: false, fog: false })); sp.scale.set(c.width / 180, h, 1); return sp;
  };
  const FORM = ['y = sin(2πx + φ)', 'x = cos φ', 'eᵗ = Σ tⁿ / n!', 'dx/dt = x', 'y = e^(1 − (x − μ)²)', 'φ = 0,86', 'θ = 54,6°', 'd/dx eˣ = eˣ'];
  for (let z = Z0; z < Z1; z += 9) for (const side of [-1, 1]) if (rnd() < 0.3) {
    const f = label(FORM[Math.floor(rnd() * FORM.length)], { w: 4.2, h: 0.55 }); f.position.set(side * (HALF + 3 + rnd() * 7), 0.2, z); scene.add(f);
  }

  /* éléments de la page → objets 3D */
  const items = [];
  const glassSide = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false });
  const edgeMat = white(0.6);
  const topMat = () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, opacity: 1, visible: false }); // visible dès que l'image de la section est prête
  for (const el of $$('[data-box]')) {
    const r = rectOf(el), g = W(r), h = parseFloat(el.dataset.box) || 0.4, mat = topMat();
    const m = new THREE.Mesh(new THREE.BoxGeometry(g.w, h, g.d, 1, 1, N(g.d)), [glassSide, glassSide, mat, glassSide, glassSide, glassSide]);
    m.position.set(g.cx, h / 2, g.cz); m.renderOrder = 2; scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat); e.position.copy(m.position); scene.add(e);
    items.push({ el, r, mats: [mat], top: h, art: el.closest('.pc-proj') });
  }
  for (const el of $$('[data-plane]')) {
    const r = rectOf(el), g = W(r), mats = [];
    const layers = el.dataset.extrude ? parseInt(el.dataset.extrude, 10) : 1;
    const group = new THREE.Group(); group.position.set(g.cx, 0, g.cz); scene.add(group);
    for (let k = 0; k < layers; k++) {
      const mat = topMat(); if (layers > 1 && k < layers - 1) mat.color.setScalar(0.45 + 0.4 * k / layers);
      const m = new THREE.Mesh(plane(g.w, g.d), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.012 + k * 0.045; m.renderOrder = 3 + k;
      group.add(m); mats.push(mat);
    }
    const it = { el, r, mats, group, top: 0, art: el.closest('.pc-proj'), float: 'float' in el.dataset, step: 'step' in el.dataset };
    if (it.float) { group.position.y = 0.9; group.rotation.x = 0.32; }
    if (it.step) { group.visible = false; it.mats.forEach((m) => { m.opacity = 0; }); }
    items.push(it);
  }

  /* graphe des thématiques, façon cerveau de notes : une étoile par thème, une vignette par page, et des liens entre les pages
     qui partagent des outils ou des sujets. Il ondule doucement ; au survol, la page et ses voisines s'éclairent, le reste s'efface. */
  const loader = new THREE.TextureLoader(), graphs = [];
  for (const el of $$('[data-graph]')) {
    // 11 thématiques-phares réparties dans le cadre ; chacune rayonne vers ses compétences, projets, étapes ou articles,
    // et les feuilles qui partagent une étiquette d'une thématique à l'autre sont reliées (cerveau Obsidian)
    const r = rectOf(el), hubs = $$(':scope > ul > li', el), nodes = [], edges = [];
    const P3 = (x, y, z) => new THREE.Vector3(x, y, z), X = (px) => (px - PAGE_W / 2) / PXM, Z = (py) => py / PXM;
    const add = (o) => { o.ph = rnd() * 6.283; o.ph2 = rnd() * 6.283; o.cur = o.base.clone(); nodes.push(o); return nodes.length - 1; };
    const SL = [[.16, .17], [.47, .12], [.8, .2], [.3, .4], [.63, .36], [.9, .5], [.12, .6], [.45, .66], [.76, .74], [.25, .88], [.58, .9]]; // emplacements des phares
    const rad = Math.min(r.w, r.h) * 0.16;
    { const g0 = W(r), bg = new THREE.Mesh(plane(g0.w, g0.d), new THREE.MeshBasicMaterial({ color: 0x060a2e })); bg.rotation.x = -Math.PI / 2; bg.position.set(g0.cx, 0.004, g0.cz); bg.renderOrder = 1; scene.add(bg); }
    const inX = (x) => Math.max(X(r.x + 6), Math.min(X(r.x + r.w - 6), x)), inZ = (z) => Math.max(Z(r.y + 6), Math.min(Z(r.y + r.h - 6), z));
    hubs.forEach((li, i) => {
      const [u, v] = SL[i % SL.length], cx = r.x + u * r.w + (rnd() - .5) * 18, cy = r.y + v * r.h + (rnd() - .5) * 18;
      const leaves = $$('a', li), hp = P3(X(cx), 0.22, Z(cy));
      const h = add({ kind: 'hub', base: hp, label: `${li.dataset.n} ${li.dataset.hub}`, meta: leaves.length + ' liens' });
      const lb = label(`${li.dataset.hub}  ${leaves.length}`, { w: 1.5, h: 0.16, font: '400 13px iAWriterQuattroV, monospace', color: '#e6ecff', op: 0.95 });
      lb.position.set(hp.x + 0.1, 0.06, hp.z + 0.14); scene.add(lb);
      const n = leaves.length + 16;
      for (let k = 0; k < n; k++) {
        const ang = k / n * 6.283 + rnd() * 0.35, rr = (0.35 + rnd() * 0.75) * rad / PXM * (k < leaves.length ? 1 : 1.25);
        const p = P3(inX(hp.x + Math.cos(ang) * rr), 0.05 + rnd() * 0.35, inZ(hp.z + Math.sin(ang) * rr));
        const L = leaves[k], img = L && L.querySelector('img');
        const id = add(L ? { kind: 'leaf', base: p, label: L.textContent.trim(), meta: L.dataset.meta || '', href: L.getAttribute('href'), k: L.dataset.k, tags: new Set((L.dataset.tags || '').split(' ').filter(Boolean)), hub: h } : { kind: 'dot', base: p, hub: h });
        edges.push([h, id, L ? 1 : 3]);
        if (!L || L.dataset.k === 'skill') continue;
        const fr = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, fog: false, transparent: true })); fr.scale.set(0.2, 0.15, 1); scene.add(fr);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: img ? 0xffffff : 0x8fa6ff, fog: false, depthTest: false, transparent: true })); sp.renderOrder = 5; scene.add(sp);
        if (img) loader.load(img.getAttribute('src'), (t) => { t.colorSpace = THREE.SRGBColorSpace; sp.material.map = t; sp.material.needsUpdate = true; });
        Object.assign(nodes[id], { sp, fr, small: true });
      }
    });
    // liens entre feuilles de thématiques différentes : une étiquette commune suffit si l'une est une compétence, deux sinon ; quatre liens au plus
    const leafIds = nodes.map((o, i) => (o.kind === 'leaf' ? i : -1)).filter((i) => i >= 0), deg = new Map(), seen = new Set();
    for (const i of leafIds) {
      const cand = leafIds.filter((j) => j !== i && nodes[j].hub !== nodes[i].hub).map((j) => {
        const common = [...nodes[i].tags].filter((t) => nodes[j].tags.has(t) && t !== 'soft').length + (nodes[i].tags.has('soft') && nodes[j].tags.has('soft') && (nodes[i].k === 'exp' || nodes[j].k === 'exp') ? 1 : 0);
        return [j, common, (nodes[i].k === 'skill' || nodes[j].k === 'skill') ? 1 : 2];
      }).filter(([, c, need]) => c >= need).sort((a, b) => b[1] - a[1] || rnd() - .5);
      for (const [j] of cand) {
        const key = Math.min(i, j) + ':' + Math.max(i, j); if (seen.has(key) || (deg.get(i) || 0) >= 2 || (deg.get(j) || 0) >= 2) continue;
        seen.add(key); edges.push([i, j, 2]); deg.set(i, (deg.get(i) || 0) + 1); deg.set(j, (deg.get(j) || 0) + 1);
      }
    }
    const pos = new Float32Array(edges.length * 6), col = new Float32Array(edges.length * 6), lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); lines.frustumCulled = false; scene.add(lines);
    const pp = new Float32Array(nodes.length * 3), pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.045 })); dots.frustumCulled = false; scene.add(dots);
    const nb = nodes.map(() => new Set()); for (const [a, b] of edges) { nb[a].add(b); nb[b].add(a); }
    graphs.push({ nodes, edges, pos, col, lg, pp, pg, nb, z: (r.y + r.h / 2) / PXM, hover: -1 });
  }

  /* règles d'une machine : celles du site (graduations, repère, « Tourner » / « Incliner »), une paire par machine ; glisser ne bouge que cette machine */
  /* vignettes de l'accueil : une machine 3D qui tourne, la pièce avec Mathieu dedans (rendue en direct), un flux de particules */
  const minis = [];
  for (const card of $$('[data-mini]')) {
    const slot = card.querySelector('.pc-mini-slot'), r = rectOf(slot), g = W(r), top = parseFloat(card.dataset.box) || 0.12, kind = card.dataset.mini;
    if (kind === 'machine') import('./m3d/finance.js').then(({ build, WIDTH = 236 }) => {
      const m = build(), grp = new THREE.Group(); grp.add(m.group); const k = g.w * 0.42 / WIDTH; grp.scale.setScalar(k);
      const box = new THREE.Box3().setFromObject(grp), c = box.getCenter(new THREE.Vector3()); m.group.position.sub(c.divideScalar(k)); m.group.position.y += (box.max.y - box.min.y) / 2 / k;
      const piv = new THREE.Group(); piv.add(grp); piv.position.set(g.cx, top + 0.05, g.cz); piv.rotation.x = -1.1; scene.add(piv); patchTree(piv); // couchée vers le lecteur, elle tourne sur elle-même
      minis.push({ kind, piv, grp, m });
    }).catch((e) => console.warn('vignette machine', e));
    else if (kind === 'room') {
      const rt2 = new THREE.WebGLRenderTarget(640, Math.round(640 * g.d / g.w), { samples: 4 }); rt2.texture.colorSpace = THREE.SRGBColorSpace;
      const cam2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
      const pm = new THREE.Mesh(plane(g.w, g.d), new THREE.MeshBasicMaterial({ map: rt2.texture, transparent: true })); pm.rotation.x = -Math.PI / 2; pm.position.set(g.cx, top + 0.005, g.cz); pm.renderOrder = 6; scene.add(pm);
      minis.push({ kind, rt2, cam2, z: g.cz, asp: g.w / g.d });
    } else if (kind === 'flux') {
      const cv = document.createElement('canvas'); cv.width = 420; cv.height = Math.round(420 * g.d / g.w); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const pm = new THREE.Mesh(plane(g.w, g.d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); pm.rotation.x = -Math.PI / 2; pm.position.set(g.cx, top + 0.005, g.cz); pm.renderOrder = 6; scene.add(pm);
      const P = Array.from({ length: 320 }, () => ({ x: Math.random(), y: Math.random(), l: Math.floor(Math.random() * 7), v: 0.12 + Math.random() * 0.2 }));
      minis.push({ kind, cv, t, P, z: g.cz });
    }
  }
  function animMinis(now, focusZ) {
    const tt = now / 1000;
    for (const M of minis) {
      if (M.kind === 'machine') { M.grp.rotation.y = tt * 0.45; M.m.update?.(tt); continue; }
      if (Math.abs(focusZ - M.z) > 25) continue;
      if (M.kind === 'room') {
        const rg = roomRul?.g; if (!rg) continue;
        const c = new THREE.Box3().setFromObject(rg).getCenter(new THREE.Vector3()), hh = 2.2 * rg.scale.x / ROOM_K;
        M.cam2.left = -hh * M.asp; M.cam2.right = hh * M.asp; M.cam2.top = hh; M.cam2.bottom = -hh; M.cam2.updateProjectionMatrix();
        M.cam2.position.set(c.x + 9, 30, c.z + 9); M.cam2.up.set(0, 1, 0); M.cam2.lookAt(c.x, c.y, c.z);
        renderer.setRenderTarget(M.rt2); renderer.setClearColor(0x14249a, 1); renderer.clear(); renderer.render(rg, M.cam2); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
      } else {
        // comme la vignette de référence : un nuage de points qui dérive à gauche, une ligne de tri lumineuse, puis quatre conduits où le flux file
        const c = M.cv.getContext('2d'), w = M.cv.width, h = M.cv.height, mx = w * 0.5, L4 = [0.2, 0.42, 0.64, 0.86].map((v) => h * (0.12 + v * 0.8)); c.clearRect(0, 0, w, h);
        c.lineWidth = 1;
        for (let i = 0; i < 4; i++) { const g2 = c.createLinearGradient(0, L4[i] - 9, 0, L4[i] + 9); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(.5, 'rgba(255,255,255,.28)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.fillRect(w * 0.78, L4[i] - 9, w * 0.22, 18); }
        for (let k = 0; k < 28; k++) { const y0 = h * (0.12 + 0.8 * ((k * 0.37) % 1)), y1 = L4[k % 4]; c.strokeStyle = `rgba(220,230,255,${0.1 + (k % 5) * 0.04})`; c.beginPath(); c.moveTo(mx, y0); c.bezierCurveTo(w * 0.66, y0, w * 0.64, y1, w * 0.8, y1); c.lineTo(w, y1 + ((k % 3) - 1) * 2); c.stroke(); }
        const gl = c.createLinearGradient(mx - 3, 0, mx + 3, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(.5, 'rgba(255,255,255,.95)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.fillRect(mx - 3, h * 0.08, 6, h * 0.88);
        c.fillStyle = '#fff';
        for (const p of M.P) {
          if (p.x < 0.5) { p.x += p.v / 900 + Math.sin(tt * 1.3 + p.l + p.y * 9) / 2400; p.y += Math.cos(tt * 0.9 + p.x * 11) / 2600; }
          else p.x += p.v / 110;
          if (p.x > 1) { p.x = Math.random() * 0.45; p.y = Math.random(); }
          let yy;
          if (p.x < 0.5) yy = h * (0.12 + 0.8 * p.y);
          else { const u = Math.min(1, (p.x - 0.5) / 0.3), e2 = u * u * (3 - 2 * u), y0 = h * (0.12 + 0.8 * p.y); yy = y0 + (L4[p.l % 4] - y0) * e2; }
          const r0 = p.x < 0.5 ? (p.l === 0 ? 2.4 : 1.6) : 1.6; c.beginPath(); c.arc(p.x * w, yy, r0, 0, 6.283); c.fill();
          if (p.l === 0 && p.x < 0.5) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(p.x * w, yy, 4, 0, 6.283); c.stroke(); }
        }
        M.t.needsUpdate = true;
      }
    }
  }

  // cliquet des règles, le même son synthétisé que sur le site, à chaque graduation franchie
  let ac = null, lastTick = 0;
  function tick(major) {
    if (reduce) return; const now = performance.now(); if (now - lastTick < 16) return; lastTick = now;
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, f = 1 + (Math.random() - .5) * .1, len = Math.floor(ac.sampleRate * .018), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * .16));
      const n = ac.createBufferSource(); n.buffer = buf; const bq = ac.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = (major ? 3900 : 3100) * f; bq.Q.value = 1.4;
      const gn = ac.createGain(); gn.gain.value = major ? .55 : .32; n.connect(bq).connect(gn).connect(ac.destination); n.start(t);
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime((major ? 2300 : 1750) * f, t); o.frequency.exponentialRampToValueAtTime(900, t + .02);
      og.gain.setValueAtTime(major ? .07 : .045, t); og.gain.exponentialRampToValueAtTime(.0001, t + .022); o.connect(og).connect(ac.destination); o.start(t); o.stop(t + .03);
    } catch {}
  }
  function makeRulers() {
    const el = document.createElement('div'); el.className = 'pc-rul'; el.setAttribute('aria-hidden', 'true');
    const ruler = (h) => `<aside class="rf-ruler${h ? ' rf-ruler--h' : ''}" tabindex="-1"><i class="rf-ruler-mark"></i><div class="rf-ruler-track"></div><span class="rf-ruler-label rf-mono">${h ? 'Tourner' : 'Incliner'}</span></aside>`;
    el.innerHTML = ruler(false) + ruler(true); document.body.append(el);
    const [v, hz] = el.children, LIM = 250, R = { el, rot: 0, tilt: 0, onview: null };
    for (const [ru, horiz] of [[v, false], [hz, true]]) {
      const tr = ru.querySelector('.rf-ruler-track'), f = document.createDocumentFragment();
      for (let i = 0; i <= 100; i++) { const t = document.createElement('div'); t.className = 'rf-tick' + (i % 10 === 0 ? ' rf-maj' : ''); t.style[horiz ? 'left' : 'top'] = i * 5 + 'px'; if (i % 10 === 0) t.innerHTML = `<span>${(i / 100).toFixed(2)}</span>`; f.append(t); }
      tr.append(f);
      const set = (x) => { x = Math.max(-LIM, Math.min(LIM, x)); const i0 = Math.floor((horiz ? R.rot : R.tilt) / 5), i1 = Math.floor(x / 5); if (i0 !== i1) tick(i1 % 10 === 0); if (horiz) R.rot = x; else R.tilt = x; tr.style.transform = horiz ? `translateX(${x}px)` : `translateY(${x}px)`; R.onview?.(R); };
      let d = null;
      ru.addEventListener('pointerdown', (e) => { d = { p: horiz ? e.clientX : e.clientY, v: horiz ? R.rot : R.tilt }; ru.setPointerCapture(e.pointerId); e.preventDefault(); });
      ru.addEventListener('pointermove', (e) => { if (d) set(d.v + (horiz ? e.clientX : e.clientY) - d.p); });
      ru.addEventListener('pointerup', () => { d = null; }); ru.addEventListener('pointercancel', () => { d = null; });
      ru.addEventListener('dblclick', () => set(0));
    }
    return R;
  }

  /* machines 3D des projets, en longueur sur les côtés */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96c0, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25); sun.position.set(-9, 16, 8); scene.add(sun);
  const machines = []; let pendingM = 0; const T0 = 0; // posée sur sa base
  for (const art of $$('[data-fig]')) {
    // en longueur le long des deux bords, alternées, la face tournée vers le chemin (jamais de dos)
    const r = rectOf(art), k = machines.length + pendingM++, side = k % 2 ? 1 : -1, sc = 4.2, x = side * (HALF + sc * 0.24), z = (r.y + 0.12 * r.h) / PXM, rot = -side * Math.PI / 2; // la longueur suit le bord, la face vers le chemin
    const mod = art.dataset.fig === 'vrestudio-musicbox' ? 'vrestudio' : art.dataset.fig;
    import(`./m3d/${mod}.js`).then(({ build, WIDTH = 236 }) => {
      const m = build(), g = new THREE.Group(); g.add(m.group); g.scale.setScalar(sc / WIDTH); scene.add(g);
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
      // pivot au centre de la machine, posé au sol : les règles la tournent et l'inclinent sur place
      m.group.position.sub(c.clone().divideScalar(sc / WIDTH)).add(new THREE.Vector3(0, (c.y - box.min.y) / (sc / WIDTH), 0));
      g.rotation.y = 0; const pivot = new THREE.Group(); pivot.add(g); g.position.set(0, 0, 0); scene.add(pivot);
      pivot.position.set(side * (HALF + 0.35 + box.getSize(new THREE.Vector3()).z / 2), 0, z); void x; // même écart au bord de la page pour toutes les machines pivot.rotation.y = rot; patchTree(pivot);
      const M = { m, z, pivot, rot, yaw: 0, tilt: T0, half: box.getSize(new THREE.Vector3()).z / 2, name: art.querySelector('[data-callout]')?.dataset.callout || mod, rul: makeRulers() };
      M.rul.onview = ({ rot: r0, tilt: t0 }) => { M.yaw = r0 * 0.36 * Math.PI / 180; M.tilt = Math.max(-Math.PI / 2, Math.min(0.3, T0 + t0 / 250 * 1.2)); };
      machines.push(M);
    }).catch((e) => console.warn('machine indisponible', mod, e));
  }

  /* décor : la vraie pièce du site (js/room.js) ; ses objets sont déplacés dans cette scène et posés sur la section Décor.
     Son propre moteur continue d'animer le personnage et les objets, il ne dessine plus rien lui-même. */
  const roomSpot = $('[data-room]'); let roomRul = null;
  if (roomSpot && !reduce) {
    const rr = W(rectOf(roomSpot)), host = document.createElement('div'), bubble = document.createElement('div');
    host.className = 'pc-room-host'; host.setAttribute('aria-hidden', 'true'); bubble.className = 'bubble'; host.append(bubble); document.body.append(host);
    Promise.all([import('../js/room.js?v=nt6-20261026'), import('three/addons/RoomEnvironment.js')]).then(async ([{ createRoom }, { RoomEnvironment }]) => {
      const room = await createRoom(host, bubble, { noTea: true }); // sans la pièce du thé, ni les déplacements et pensées qui s'y rapportent
      // la scène entière de la pièce est rattachée (le personnage et les objets ajoutés plus tard suivent) ;
      // ni sol d'ombre ni ombres de contact : sur la feuille courbée elles glissaient pendant le défilement
      const g = new THREE.Group(); g.add(room.scene);
      const hideShadows = () => room.scene.traverse((o) => { if (o.material?.isShadowMaterial || (o.isMesh && o.renderOrder === -1 && o.geometry?.type === 'PlaneGeometry' && o.material?.map && o.material.transparent && !o.material.depthWrite)) o.visible = false; });
      hideShadows(); setInterval(hideShadows, 2000);
      g.scale.setScalar(ROOM_K); g.rotation.y = -36 * Math.PI / 180; g.position.set(rr.cx, 0, rr.cz);
      // les arbres de la pièce (vendor-trees) embarquent leur propre Three.js, plus ancien : on complète leurs matrices
      g.traverse((o) => { const P = Object.getPrototypeOf(o.matrixWorld); if (!P.determinantAffine) P.determinantAffine = THREE.Matrix4.prototype.determinantAffine; });
      scene.add(g); patchTree(g);
      const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;
      window.__room = room;
      // règles du décor : « Tourner » fait pivoter la pièce, « Incliner » sert de zoom (pièce et plan ensemble)
      const R = makeRulers(); R.el.querySelector('.rf-ruler:not(.rf-ruler--h) .rf-ruler-label').textContent = 'Zoom';
      R.onview = ({ rot, tilt }) => { const z = Math.max(0.5, Math.min(2.2, 1 - tilt / 250 * 1.2)); g.scale.setScalar(ROOM_K * z); g.rotation.y = (-36 + rot * 0.36) * Math.PI / 180; for (const b of bps) b.uniforms.uK.value = 3.6667 / (ROOM_K * z); };
      roomRul = { g, rul: R, p: new THREE.Vector3(rr.cx, 0, rr.cz + rr.d * 0.32), z: rr.cz };
    }).catch((e) => console.warn('pièce indisponible', e));
  }

  /* tirelire des gains : le modèle du site, une pièce de 1 € tombe régulièrement dans la fente */
  const pigSpot = $('[data-pig]'), pigs = [];
  if (pigSpot) {
    const pr = W(rectOf(pigSpot));
    import('three/addons/GLTFLoader.js').then(async ({ GLTFLoader }) => {
      const [pig, coin] = await Promise.all(['piggy-bank-user', 'one-euro-coin-user'].map((n) => new GLTFLoader().loadAsync('assets/' + n + '.glb?v=cv-scene-v40')));
      const asm = new THREE.Group(); asm.add(pig.scene);
      const falling = coin.scene; falling.scale.setScalar(0.5 / 0.17); falling.visible = false; asm.add(falling);
      const slot = pig.scene.getObjectByName('CoinSlotAnchor');
      const box = new THREE.Box3().setFromObject(asm), size = box.getSize(new THREE.Vector3()), k = Math.min(2.6, Math.max(pr.w, pr.d) * 0.9) / Math.max(size.x, size.y, size.z);
      const g = new THREE.Group(); g.add(asm); asm.scale.setScalar(k); asm.position.y = -box.min.y * k;
      g.position.set(pr.cx, 0, pr.cz); g.rotation.y = 0.5; scene.add(g); patchTree(g);
      const anchor = slot ? asm.worldToLocal(slot.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3(0, size.y, 0);
      falling.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      pigs.push({ falling, anchor, z: pr.cz });
    }).catch((e) => console.warn('tirelire indisponible', e));
  }

  /* éléments vivants (hublot et sa vidéo, symbole infini) : le vrai DOM, posé dans la 3D par CSS3D, toujours interactif */
  // symbole infini : son canvas tourne dans un hôte invisible mais à l'écran (il se met en pause hors écran),
  // et son image est recopiée sur la feuille à chaque image, courbure comprise
  const infEl = $('[data-live="infini"]'), infs = [];
  if (infEl && !reduce) {
    const r = rectOf(infEl), g = W(r);
    const ph = document.createElement('div'); ph.style.cssText = `width:${r.w}px;height:${r.h}px;margin:${getComputedStyle(infEl).margin}`; infEl.before(ph);
    infEl.classList.add('pc-inf-host'); infEl.style.width = r.w + 'px'; infEl.style.height = r.h + 'px'; infEl.style.margin = '0'; document.body.append(infEl);
    const cv = infEl.querySelector('canvas'), t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(plane(g.w, g.d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(g.cx, 0.006, g.cz); m.renderOrder = 1; scene.add(m);
    infs.push({ t, z: g.cz });
    import('./infinity.js').then((mod) => mod.initInfinity(cv)).catch((e) => console.warn('symbole infini indisponible', e));
  }
  // hublot : le vrai DOM tourne dans un hôte invisible (mécanique du site), son image est peinte sur la feuille à chaque image
  const huEl = $('[data-live="hublot"]'), hublots = [];
  if (huEl) {
    const r = rectOf(huEl), g = W(r), win = huEl.querySelector('.rf-win');
    const ph = document.createElement('div'); ph.style.cssText = `width:${r.w}px;height:${r.h}px;margin:${getComputedStyle(huEl).margin}`; huEl.before(ph);
    huEl.classList.add('pc-inf-host'); huEl.style.width = r.w + 'px'; huEl.style.height = r.h + 'px'; huEl.style.margin = '0'; document.body.append(huEl);
    const Q = 2, cv = document.createElement('canvas'); cv.width = Math.round(r.w * Q); cv.height = Math.round(r.h * Q);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.Mesh(plane(g.w, g.d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    const A = 1.05; // relevé comme une vitre de train, posé sur son bord bas
    m.rotation.x = -Math.PI / 2 + A; m.position.set(g.cx, 0.01 + g.d / 2 * Math.sin(A), g.cz + g.d / 2 * (1 - Math.cos(A))); m.renderOrder = 2; scene.add(m);
    m.updateMatrixWorld(); const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => new THREE.Vector3(a * g.w / 2, b * g.d / 2, 0).applyMatrix4(m.matrixWorld));
    const poster = new Image(); poster.src = huEl.querySelector('video')?.getAttribute('poster') || '';
    const LH = lifts.find((L) => L.el === huEl); if (LH) LH.pts = corners; // le hublot relevé se manipule comme sur le site
    hublots.push({ t, z: g.cz, cv, win, poster });
    import('./hublot.js').catch((e) => console.warn('hublot indisponible', e));
  }
  const rr = (c, x, y, w, h, rad) => { c.beginPath(); c.roundRect(x, y, w, h, rad); };
  function paintHublot(H) {
    const c = H.cv.getContext('2d'), wr = H.win.getBoundingClientRect(), hr = H.win.parentElement.getBoundingClientRect(), Q = H.cv.width / hr.width;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, H.cv.width, H.cv.height);
    c.setTransform(Q, 0, 0, Q, (wr.left - hr.left) * Q, (wr.top - hr.top) * Q);
    const w = wr.width, h = wr.height, img = (sel) => H.win.querySelector(sel);
    c.save(); rr(c, 4, 4, w - 8, h - 8, 80); c.clip(); c.fillStyle = '#5fa4ec'; c.fillRect(0, 0, w, h);
    const v = img('video'), src = v && v.readyState >= 2 ? v : H.poster.complete ? H.poster : null;
    if (src) { const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight, k = Math.max((w - 8) / sw, (h - 8) / sh); c.drawImage(src, w / 2 - sw * k / 2, h / 2 - sh * k / 2, sw * k, sh * k); }
    c.restore();
    const inn = img('.rf-win-inner'); if (inn?.complete) c.drawImage(inn, w * 0.05, h * 0.05, w * 0.9, h * 0.9);
    const gx = w * 0.05333, gy = h * 0.06667, gw = w - 2 * gx, gh = h - 2 * gy, sh = img('.rf-win-shutter'), tf = getComputedStyle(sh).transform, dy = tf === 'none' ? 0 : new DOMMatrixReadOnly(tf).m42;
    c.save(); rr(c, gx, gy, gw, gh, 16); c.clip(); const pan = img('.rf-win-panel'); if (pan?.complete) c.drawImage(pan, gx, gy + dy, gw, gh); c.restore();
    const out = img('.rf-win-outer'); if (out?.complete) c.drawImage(out, 0, 0, w, h);
    H.t.needsUpdate = true;
  }

  // contact : l'adresse se copie au clic (comme sur le site), icône « copié » un instant
  const mail = $('#rf-mail');
  if (mail) {
    const copy = async () => {
      try { await navigator.clipboard.writeText(mail.dataset.copy); } catch { /* presse-papiers indisponible */ }
      mail.classList.add('rf-copied'); clearTimeout(copy.t); copy.t = setTimeout(() => mail.classList.remove('rf-copied'), 1800);
    };
    mail.addEventListener('click', copy); mail.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } });
  }

  /* superpositions : légendes, « voir la magie », menu, traits courbes, repères d'échelle (relevés avant de déplacer les éléments) */
  const svg = $('#leaders'), NS = 'http://www.w3.org/2000/svg';
  const mkp = () => { const p = document.createElementNS(NS, 'path'); svg.append(p); return p; };
  const mkc = () => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 3); svg.append(c); return c; };
  const callouts = items.filter((it) => it.el.dataset.callout).map((it) => {
    const href = it.el.dataset.href || it.el.getAttribute('href');
    const el = document.createElement(href ? 'a' : 'div'); if (href) el.href = href;
    const side = (it.r.x + it.r.w / 2) < PAGE_W / 2 ? -1 : 1;
    el.className = 'co ' + (side < 0 ? 'l' : 'r'); el.innerHTML = `${it.el.dataset.callout}<small>${it.el.dataset.calloutSub || ''}</small>`; $('#callouts').append(el);
    const p = new THREE.Vector3(((side < 0 ? it.r.x : it.r.x + it.r.w) - PAGE_W / 2) / PXM, it.top, it.r.y / PXM);
    return { el, side, p, path: mkp(), dot: mkc() };
  });
  const magics = flows.map(({ w, api }) => {
    const r = rectOf(w), card = items.find((x) => x.art === w.closest('.pc-proj') && x.el.matches('[data-box]'));
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pc-magic'; b.textContent = 'Cliquez ici pour voir la magie';
    b.setAttribute('aria-label', 'Voir comment fonctionne : ' + (card?.el.dataset.callout || 'ce projet'));
    document.body.append(b); b.onclick = () => api?.open();
    return { b, p: new THREE.Vector3((r.x + r.w - 260 - PAGE_W / 2) / PXM, 0.05, (r.y + 40) / PXM) };
  });
  // ancres des traits du menu : les notes et le coin haut gauche de chaque cadre de la section, comme sur la page de référence
  const anchors = sections.map((s) => [
    ...$$('[data-note]', s.el).map((n) => { const r = rectOf(n); return new THREE.Vector3((r.x + 3 - PAGE_W / 2) / PXM, 0.02, (r.y + 9) / PXM); }),
    ...items.filter((it) => it.el.matches('[data-box]') && it.r.y >= s.r.y && it.r.y < s.r.y + s.r.h).map((it) => new THREE.Vector3((it.r.x + 6 - PAGE_W / 2) / PXM, it.top, (it.r.y + 6) / PXM))]);
  const navPaths = [0, 1, 2, 3].map(() => ({ path: mkp(), dot: mkc() }));
  const ul = $('#nav ul');
  sections.forEach((s, i) => {
    const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.textContent = s.name;
    b.onclick = () => scrollTo({ top: i === 0 ? 0 : Math.max(0, s.r.y + 260 - innerHeight / 2), behavior: reduce ? 'auto' : 'smooth' });
    li.append(b); ul.append(li);
  });
  const navItems = [...ul.children];
  const ticks = []; for (let i = 0; i < 40; i++) { const d = document.createElement('div'); d.className = 'tick'; $('#ticks').append(d); ticks.push(d); }

  /* textures : HTML-in-Canvas (l'élément vivant) ou image de la section */
  let cssP = null; // feuilles de style embarquées, préparées une fois
  let introReady = false; // la signature attend que la feuille soit peinte, sinon elle s'écrit pendant le chargement
  const linearize = (mat) => { mat.userData.lin = true; mat.needsUpdate = true; };
  if (HIC) {
    canvas.setAttribute('layoutsubtree', 'true');
    const byEl = new Map();
    canvas.addEventListener('paint', (e) => {
      for (const el of e.changedElements) {
        const it = byEl.get(el); if (!it) continue;
        if (!it.tex) { it.tex = new THREE.HTMLTexture(el); canvas.onpaint = null; it.mats.forEach((m) => { linearize(m); m.map = it.tex; m.visible = true; m.needsUpdate = true; }); introReady = true; }
        else it.tex.needsUpdate = true;
      }
    });
    for (const it of items) { it.el.style.width = it.r.w + 'px'; it.el.style.height = it.r.h + 'px'; it.el.style.margin = '0'; byEl.set(it.el, it); canvas.append(it.el); }
    canvas.requestPaint();
  } else rasterAll().catch((e) => console.warn('rendu des textures impossible', e));

  async function redraw(s) {
    const css = await (cssP ??= inlineCss()), mine = items.filter((it) => s.el.contains(it.el)); if (!mine.length) return;
    const c = await rasterize(s.el, s.r, css), base = new THREE.CanvasTexture(c); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 8;
    for (const it of mine) {
      const t = base.clone(); t.repeat.set(it.r.w / s.r.w, it.r.h / s.r.h); t.offset.set((it.r.x - s.r.x) / s.r.w, 1 - (it.r.y - s.r.y + it.r.h) / s.r.h); t.needsUpdate = true;
      it.mats.forEach((m) => { m.map = t; m.visible = true; m.needsUpdate = true; });
    }
  }
  async function rasterAll() {
    const css = await (cssP ??= inlineCss());
    for (const s of [...sections].sort((a, b) => Math.abs(a.r.y - scrollY) - Math.abs(b.r.y - scrollY))) { // la section à l'écran d'abord
      const mine = items.filter((it) => s.el.contains(it.el)); if (!mine.length) continue;
      const draw = async () => {
        const c = await rasterize(s.el, s.r, css), base = new THREE.CanvasTexture(c); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 8;
        for (const it of mine) {
          const t = base.clone(); t.repeat.set(it.r.w / s.r.w, it.r.h / s.r.h); t.offset.set((it.r.x - s.r.x) / s.r.w, 1 - (it.r.y - s.r.y + it.r.h) / s.r.h); t.needsUpdate = true;
          it.mats.forEach((m) => { m.map = t; m.visible = true; m.needsUpdate = true; });
        }
      };
      await draw(); introReady = true;
    }
  }
  async function inlineCss() {
    // toutes les feuilles de la page (rf.css, gains.css, project-dioramas.css, parcours.css), url() embarquées en data:
    const cache = new Map();
    const b64 = (u) => { if (!cache.has(u)) cache.set(u, fetch(u).then((r) => (r.ok ? r.blob() : null)).then((b) => b && new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); })).catch(() => null)); return cache.get(u); };
    const out = [];
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      const base = sh.href || location.href;
      for (const r of rules) {
        let t = r.cssText;
        if (r instanceof CSSFontFaceRule) { const m = t.match(/url\(["']?([^"')]+\.(?:woff2|ttf|otf|woff))["']?\)/); if (!m) continue; t = t.replace(/src:[^;]+;/, `src: url("${m[1]}");`); }
        const urls = [...t.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:') && !u.startsWith('#'));
        for (const u of new Set(urls)) { const d = await b64(new URL(u, base).href); t = t.split(u).join(d || ''); }
        out.push(t);
      }
    }
    return out.join('\n');
  }
  async function rasterize(el, r, css) {
    const S = Math.min(1.5, 8000 / r.h);
    const clone = el.cloneNode(true); clone.style.background = 'transparent'; clone.style.margin = '0'; clone.style.width = r.w + 'px'; clone.style.height = r.h + 'px';
    clone.querySelectorAll('[data-graph], [data-sign] svg, [data-tl] .rf-tl-line, [data-tl] .rf-tl-dot').forEach((n) => n.remove()); // la signature a son propre calque animé
    await Promise.all([...clone.querySelectorAll('img')].map(async (im) => { try { const b = await (await fetch(im.getAttribute('src'))).blob(); im.setAttribute('src', await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); })); } catch { im.remove(); } }));
    const xml = new XMLSerializer().serializeToString(clone);
    const svgDoc = `<svg xmlns="http://www.w3.org/2000/svg" width="${r.w}" height="${r.h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css.replace(/</g, '\\3c ')}</style>${xml}</div></foreignObject></svg>`;
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgDoc); await img.decode();
    const c = document.createElement('canvas'); c.width = Math.round(r.w * S); c.height = Math.round(r.h * S);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
  }

  let lifted = null;
  const lift = document.createElement('div'); lift.className = 'pc-lift'; lift.setAttribute('role', 'dialog'); lift.setAttribute('aria-modal', 'true'); lift.hidden = true;
  lift.innerHTML = '<div class="pc-lift-bg"></div><div class="pc-lift-card"><div class="pc-lift-bar"><button type="button" class="pc-lift-back" hidden>← Revenir au cadre</button><button type="button" class="pc-lift-x" aria-label="Rabaisser le cadre">Rabaisser</button></div><div class="pc-lift-sc"><div class="pc-lift-in"></div><iframe class="pc-lift-page" title="Page détaillée" hidden></iframe></div></div>';
  document.body.append(lift);
  const lcard = lift.querySelector('.pc-lift-card'), lsc = lift.querySelector('.pc-lift-sc'), lin = lift.querySelector('.pc-lift-in'), lframe = lift.querySelector('iframe'), lback = lift.querySelector('.pc-lift-back');
  const showPage = (href) => { lframe.src = href; lframe.hidden = false; lin.hidden = true; lback.hidden = false; lsc.scrollTop = 0; };
  const hidePage = () => { lframe.hidden = true; lframe.removeAttribute('src'); lin.hidden = false; lback.hidden = true; };
  lback.onclick = hidePage;
  lin.addEventListener('click', (ev) => { const a = ev.target.closest('a[href]'); if (!a) return; const href = a.getAttribute('href'); if (/^(https?:|mailto:|#)/.test(href) || !/\.html|^[\w-]+$/.test(href)) return; ev.preventDefault(); showPage(href); });
  function openLift(L) {
    if (lifted) return; lifted = L;
    const sec = L.el.closest('[data-section]'), bgc = sec?.dataset.color || '#0b0e12';
    L.home = { parent: L.el.parentElement, next: L.el.nextSibling, width: L.el.style.width, host: L.el.classList.contains('pc-inf-host') };
    if (!L.home.host) { L.ph = document.createElement('div'); L.ph.style.cssText = `width:${L.r.w}px;height:${L.r.h}px`; L.el.before(L.ph); }
    // le contexte du site (classes des parents) est recréé sans boîte, pour que ses styles s'appliquent à l'identique
    let inner = lin; inner.replaceChildren();
    for (const a of (L.home.host ? [] : (() => { const o = []; for (let q = L.el.parentElement; q && q !== document.body; q = q.parentElement) o.unshift(q); return o; })())) { const d = document.createElement('div'); d.className = a.className; d.style.display = 'contents'; inner.append(d); inner = d; }
    L.el.classList.remove('pc-inf-host'); L.el.style.width = L.r.w + 'px'; inner.append(L.el);
    lcard.style.setProperty('--lw', Math.min(L.r.w + 56, innerWidth * 0.94) + 'px'); lcard.style.background = bgc;
    lift.hidden = false; document.documentElement.classList.add('pc-lifted');
    const hr = L.h.getBoundingClientRect(), cr = lcard.getBoundingClientRect();
    const from = `translate(-50%,-50%) translate(${hr.left + hr.width / 2 - innerWidth / 2}px,${hr.top + hr.height / 2 - innerHeight / 2}px) scale(${Math.max(0.15, hr.width / cr.width)}) rotateX(58deg)`;
    lcard.animate([{ transform: from, opacity: 0.4 }, { transform: 'translate(-50%,-50%)', opacity: 1 }], { duration: reduce ? 1 : 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
    lift.querySelector('.pc-lift-bg').animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 1 : 500, fill: 'forwards' });
    lsc.scrollTop = 0; lsc.focus?.({ preventScroll: true });
    for (const f of flows) if (L.el.contains(f.w)) { lsc.onscroll = () => f.api?.kick(); requestAnimationFrame(() => f.api?.remeasure()); }
  }
  async function closeLift() {
    const L = lifted; if (!L) return;
    const hr = L.h.getBoundingClientRect(), cr = lcard.getBoundingClientRect();
    const to = `translate(-50%,-50%) translate(${hr.left + hr.width / 2 - innerWidth / 2}px,${hr.top + hr.height / 2 - innerHeight / 2}px) scale(${Math.max(0.15, (hr.width || 200) / cr.width)}) rotateX(58deg)`;
    lift.querySelector('.pc-lift-bg').animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 1 : 450, fill: 'forwards' });
    await lcard.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: to, opacity: 0.3 }], { duration: reduce ? 1 : 600, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.catch(() => {});
    lift.hidden = true; document.documentElement.classList.remove('pc-lifted'); hidePage(); lsc.onscroll = null;
    L.el.style.width = L.home.width;
    if (L.home.host) { L.el.classList.add('pc-inf-host'); document.body.append(L.el); } else { L.ph.replaceWith(L.el); }
    lin.replaceChildren(); lifted = null;
    for (const f of flows) if (L.el.contains(f.w)) f.api?.remeasure();
    if (!HIC) { const s = sections.find((q) => q.el.contains(L.el)); if (s) redraw(s); } // l'image de la feuille reprend l'état laissé par le lecteur
  }
  lift.querySelector('.pc-lift-x').onclick = closeLift; lift.querySelector('.pc-lift-bg').onclick = closeLift;
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && lifted && !document.querySelector('.fl-ov.is-open')) closeLift(); });

  /* rendu dans une cible, puis flou de profondeur sur le lointain et les bords */
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), postScene = new THREE.Scene();
  const postMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: rt.texture }, px: { value: new THREE.Vector2() }, amt: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D t; uniform vec2 px; uniform float amt; varying vec2 vUv;
      void main(){
        float r = amt * (smoothstep(0.55, 1.0, vUv.y) * 5.0 + smoothstep(0.38, 0.5, abs(vUv.x - 0.5)) * 2.0);
        vec4 c = texture2D(t, vUv);
        if (r > 0.25) { vec4 acc = c; for (int i = 0; i < 16; i++) { float a = float(i) * 2.39996, rr = r * sqrt((float(i) + 0.5) / 16.0); acc += texture2D(t, vUv + vec2(cos(a), sin(a)) * rr * px); } c = acc / 17.0; }
        gl_FragColor = c;
        #include <colorspace_fragment>
      }`, depthTest: false, depthWrite: false });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
    const d = renderer.getPixelRatio(); rt.setSize(Math.round(innerWidth * d), Math.round(innerHeight * d)); postMat.uniforms.px.value.set(1 / (innerWidth * d), 1 / (innerHeight * d));
    page.style.height = Math.round(PAGE_H + innerHeight * 1.3) + 'px'; // la fin de la page peut venir au centre
  }
  addEventListener('resize', resize); resize();

  /* projection d'un point du monde avec la même courbure que le shader */
  const tmp = new THREE.Vector3();
  const toScreen = (v) => {
    tmp.copy(v); curlJS(tmp, camera.position); tmp.applyMatrix4(camera.matrixWorldInverse);
    const behind = tmp.z > -0.1; tmp.applyMatrix4(camera.projectionMatrix);
    return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight, behind ? 2 : tmp.z];
  };

  /* graphe : ondulation, couleurs des liens, mise en avant au survol */
  const EC = [[0.45, 0.55, 1], [0.55, 0.68, 1], [0.35, 0.95, 0.65], [0.4, 0.5, 0.9]], EW = [0.55, 0.55, 0.2, 0.32];
  function animGraph(G, t) {
    const h = G.hover, rel = h >= 0 ? G.nb[h] : null;
    G.nodes.forEach((o, i) => {
      const a = o.kind === 'hub' ? 0.04 : o.kind === 'dot' ? 0.1 : 0.08;
      o.cur.set(o.base.x + Math.sin(t * 0.55 + o.ph) * a, o.base.y + Math.sin(t * 0.8 + o.ph2) * a * 1.4, o.base.z + Math.cos(t * 0.45 + o.ph) * a);
      G.pp[i * 3] = o.cur.x; G.pp[i * 3 + 1] = o.cur.y; G.pp[i * 3 + 2] = o.cur.z;
      if (o.sp) {
        const on = h < 0 || i === h || rel.has(i), k = i === h ? 1.9 : (h >= 0 && on ? 1.35 : 1);
        o.sc = (o.sc || 1) + (k - (o.sc || 1)) * 0.18;
        const q = o.small ? 0.5 : 1; o.sp.position.copy(o.cur); o.fr.position.copy(o.cur); o.sp.scale.set(0.35 * o.sc * q, 0.25 * o.sc * q, 1); o.fr.scale.set(0.4 * o.sc * q, 0.3 * o.sc * q, 1);
        const op = on ? 1 : 0.25; o.sp.material.opacity += (op - o.sp.material.opacity) * 0.2; o.fr.material.opacity = o.sp.material.opacity;
      }
    });
    G.edges.forEach(([a, b, k], e) => {
      const A = G.nodes[a].cur, B = G.nodes[b].cur, j = e * 6;
      G.pos[j] = A.x; G.pos[j + 1] = A.y; G.pos[j + 2] = A.z; G.pos[j + 3] = B.x; G.pos[j + 4] = B.y; G.pos[j + 5] = B.z;
      const hot = h >= 0 && (a === h || b === h), f = h < 0 ? (k === 2 ? 0 : EW[k]) : hot ? 1.4 : (k === 2 ? 0 : 0.12), c = hot ? [1, 1, 1] : EC[k]; // liens entre thématiques : visibles seulement au survol
      for (const q of [0, 3]) { G.col[j + q] = c[0] * f; G.col[j + q + 1] = c[1] * f; G.col[j + q + 2] = c[2] * f; }
    });
    G.lg.attributes.position.needsUpdate = G.lg.attributes.color.needsUpdate = G.pg.attributes.position.needsUpdate = true;
  }
  const mouse = { x: -1, y: -1 }, gtip = document.createElement('div'); gtip.className = 'pc-gtip'; gtip.setAttribute('aria-hidden', 'true'); document.body.append(gtip);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener('click', (e) => { if (e.target !== canvas) return; for (const G of graphs) { const o = G.nodes[G.hover]; if (o && o.href) { location.href = o.href; return; } } });
  function hoverGraphs(e) {
    let any = false;
    for (const G of graphs) {
      G.hover = -1;
      let best = 24 * 24;
      G.nodes.forEach((o, i) => { if (o.kind !== 'leaf' && o.kind !== 'hub') return; const [px, py, pz] = toScreen(o.cur); if (pz >= 1) return; const d = (px - mouse.x) ** 2 + (py - mouse.y) ** 2; if (d < best) { best = d; G.hover = i; } });
      const o = G.nodes[G.hover];
      if (o) { any = true; gtip.innerHTML = `<b>${o.label}</b>${o.meta ? `<span>${o.meta}</span>` : ''}${o.href ? '<i>Ouvrir →</i>' : ''}`; gtip.style.transform = `translate(${mouse.x + 16}px,${mouse.y + 12}px)`; canvas.style.cursor = o.href ? 'pointer' : 'default'; }
    }
    gtip.classList.toggle('on', any); if (!any) canvas.style.cursor = '';
  }

  /* boucle */
  const ease = (u) => u * u * (3 - 2 * u);
  const flatPos = new THREE.Vector3(), runPos = new THREE.Vector3(), flatLook = new THREE.Vector3(), runLook = new THREE.Vector3(), look = new THREE.Vector3();
  let frameN = 0, sSm = scrollY, last = performance.now(), dtS = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    dtS = Math.min(0.1, (now - last) / 1000); last = now;
    sSm += (scrollY - sSm) * (reduce ? 1 : 1 - Math.exp(-dtS * 7)); if (Math.abs(scrollY - sSm) < 0.05) sSm = scrollY;
    const s = sSm, e = ease(Math.max(0, Math.min(1, (s - FOLD_A) / (FOLD_B - FOLD_A))));
    const H = innerHeight, kf = KF + (1 - KF) * e, focusZ = (s + H / kf / 2) / PXM;
    // vue de face : la page à l'échelle 1:1, comme un site normal (champ 30°)
    const fovFlat = 30, dist = (H / kf / PXM / 2) / Math.tan(fovFlat / 2 * Math.PI / 180);
    flatPos.set(0, dist, focusZ); flatLook.set(0, 0, focusZ - 0.0001);
    runPos.set(0, 8.6, focusZ + 5.2); runLook.set(0, 0, focusZ - 6);
    camera.position.lerpVectors(flatPos, runPos, e); look.lerpVectors(flatLook, runLook, e); camera.lookAt(look);
    camera.fov = fovFlat + (62 - fovFlat) * e; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    document.documentElement.classList.toggle('flat', e < 0.01);
    if (!HIC) page.style.transform = `translateY(${(scrollY - s).toFixed(2)}px)`;
    // étapes de « Comment ça marche » : elles s'élèvent et se tournent vers le lecteur
    for (const it of items) if (it.step && it.dir) {
      const u = Math.max(0, Math.min(1, (now - it.t0) / 600)), v = it.dir > 0 ? ease(u) : 1 - ease(u);
      it.group.position.y = 0.02 + v * 1.1; it.group.rotation.x = v * 0.45; it.mats.forEach((m) => { m.opacity = v; });
      if (u >= 1) { if (it.dir < 0) it.group.visible = false; it.dir = 0; }
    }
    for (const G of graphs) if (Math.abs(focusZ - G.z) < 45) animGraph(G, now / 1000);
    for (const it of items) if (it.float) it.group.position.y = 0.9 + Math.sin(now / 900 + it.r.y) * 0.06;
    for (const k of machines) {
      k.pivot.rotation.set(k.tilt, k.rot + k.yaw, 0, 'YXZ'); k.pivot.position.y = k.half * Math.abs(Math.sin(k.tilt));
      if (Math.abs(focusZ - k.z) < 40) k.m.update(now / 1000);
    }
    for (const p of pigs) { // une pièce toutes les 2,4 s
      const u = (now / 2400) % 1, v = Math.min(1, u / 0.55); p.falling.visible = u < 0.6;
      p.falling.position.set(p.anchor.x, p.anchor.y + (1 - v * v) * 1.6, p.anchor.z); p.falling.rotation.y = u * 6;
    }
    animMinis(now, focusZ);
    for (const f of infs) if (Math.abs(focusZ - f.z) < 30) f.t.needsUpdate = true;
    for (const H of hublots) if (Math.abs(focusZ - H.z) < 30) paintHublot(H);
    for (const b of bps) { b.uniforms.uTime.value = now / 1000; b.uniforms.uRes.value.set(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()); }
    if (tlLine) { // ressort raideur 45 / amortissement 20, comme sur la page Expériences
      const to = Math.max(0, Math.min(1, (s + innerHeight * 0.6 - tlRect.y) / tlRect.h));
      tlS.v += (-45 * (tlS.p - to) - 20 * tlS.v) * Math.min(0.032, dtS); tlS.p += tlS.v * Math.min(0.032, dtS);
      if (tl3) { const p = Math.max(0.0005, tlS.p); tl3.lm.scale.y = p; tl3.dm.position.set(tl3.x, 0.035, tl3.z0 + p * tl3.len); }
      if (Math.abs(tlS.p - (tlS.shown ?? -1)) > 0.0008) { tlS.shown = tlS.p; tlLine.style.transform = `scaleY(${tlS.p.toFixed(4)})`; tlDot.style.top = (tlS.p * 100).toFixed(2) + '%'; }
    }
    postMat.uniforms.amt.value = e;
    if ((frameN++ & 31) === 0) patchTree(scene);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    overlay(e, focusZ, s);
  }
  function overlay(e, focusZ, s) {
    hoverGraphs(e);
    const w = innerWidth, h = innerHeight, narrow = w < 760, bw = narrow ? 150 : 230;
    let active = 0; sections.forEach((sec, i) => { if (sec.r.y <= s + h / 2) active = i; });
    navItems.forEach((li, i) => li.classList.toggle('on', i === active));
    for (const c of callouts) {
      const dz = focusZ + 6 - c.p.z, [px, py, pz] = toScreen(c.p);
      const vis = e > 0.5 && dz > -2 && dz < 30 && pz < 1 && py > 30 && py < h * 0.95;
      c.el.style.display = c.path.style.display = c.dot.style.display = vis ? '' : 'none'; if (!vis) continue;
      const a = Math.min(1, (e - 0.5) * 4, (30 - dz) / 10);
      const lx = c.side < 0 ? (narrow ? 8 : 150) : w - bw - 12, ly = Math.max(10, Math.min(py - 50, h * 0.82));
      c.el.style.transform = `translate(${lx}px,${ly}px)`; c.el.style.opacity = a; c.el.style.width = bw + 'px';
      const ey = ly + c.el.offsetHeight;
      c.path.setAttribute('d', `M${c.side < 0 ? lx : lx + bw},${ey} L${c.side < 0 ? lx + bw : lx},${ey} L${px},${py}`); c.path.style.opacity = a * 0.8;
      c.dot.setAttribute('cx', px); c.dot.setAttribute('cy', py); c.dot.style.opacity = a;
    }
    for (const o of hots) { // rectangle à l'écran = enveloppe des points visibles du bord du cadre
      let pts = o.pts;
      if (!pts) { pts = []; const n = Math.max(1, Math.ceil(o.r.h / 140)); for (let i = 0; i <= n; i++) { const y = o.r.y + o.r.h * i / n; for (const x of [o.r.x, o.r.x + o.r.w]) pts.push(new THREE.Vector3((x - PAGE_W / 2) / PXM, 0.02, y / PXM)); } }
      const c = pts.map((v) => toScreen(v)).filter((q) => q[2] < 1 && q[1] > -h && q[1] < 2 * h), xs = c.map((q) => Math.max(0, Math.min(w, q[0]))), ys = c.map((q) => Math.max(0, Math.min(h, q[1])));
      const x0 = Math.min(...xs), y0 = Math.min(...ys), ww = Math.max(...xs) - x0, hh = Math.max(...ys) - y0, ok = !lifted && e > 0.5 && c.length >= 2 && ww > 20 && hh > 12;
      o.h.style.display = ok ? '' : 'none'; if (ok) { o.h.style.transform = `translate(${x0}px,${y0}px)`; o.h.style.width = ww + 'px'; o.h.style.height = hh + 'px'; }
    }
    for (const m of magics) {
      const [px, py, pz] = toScreen(m.p), vis = e > 0.5 && pz < 1 && py > 40 && py < h - 30 && px > 0 && px < w;
      m.b.style.display = vis ? '' : 'none'; if (vis) m.b.style.transform = `translate(${px}px,${py + 10}px)`;
    }
    if (roomRul) {
      const [px, py, pz] = toScreen(roomRul.p), vis = e > 0.5 && pz < 1 && py > 60 && py < h - 40 && Math.abs(focusZ - roomRul.z) < 14;
      roomRul.rul.el.style.display = vis ? '' : 'none'; if (vis) roomRul.rul.el.style.transform = `translate(${Math.min(w - 260, Math.max(200, px + 330)).toFixed(1)}px,${Math.min(h - 140, py).toFixed(1)}px)`;
    }
    for (const k of machines) {
      const [px, py, pz] = toScreen(k.pivot.position), vis = e > 0.5 && pz < 1 && py > 60 && py < h - 40 && px > 40 && px < w - 40 && Math.abs(focusZ - k.z) < 12;
      k.rul.el.style.display = vis ? '' : 'none'; if (vis) k.rul.el.style.transform = `translate(${px.toFixed(1)}px,${(py + 18).toFixed(1)}px)`;
    }
    const btn = navItems[active] && navItems[active].firstChild, dots = (anchors[active] || []).map((v) => [v, toScreen(v)]).filter(([, q]) => q[2] < 1 && q[1] > 60 && q[1] < h * 0.92 && q[0] > 0 && q[0] < w).sort((a, b) => b[1][1] - a[1][1]).slice(0, 4).map(([v]) => v);
    if (btn && !narrow && e > 0.5) {
      const r = btn.getBoundingClientRect(), ox = r.right + 2, oy = r.top + r.height / 2;
      navPaths.forEach((n, j) => {
        const v = dots[j]; let ok = !!v, px = 0, py = 0, pz = 2; if (ok) [px, py, pz] = toScreen(v);
        ok = ok && pz < 1 && py > 10 && py < h * 0.95 && px > 0 && px < w;
        n.path.style.display = n.dot.style.display = ok ? '' : 'none'; if (!ok) return;
        const dx = px - ox; n.path.setAttribute('d', `M${ox},${oy} C${ox + dx * 0.15},${oy - 120 - j * 20} ${px - dx * 0.45},${py + 30} ${px},${py}`);
        n.dot.setAttribute('cx', px); n.dot.setAttribute('cy', py);
      });
    } else navPaths.forEach((n) => { n.path.style.display = n.dot.style.display = 'none'; });
    // repères en px de page le long des bords
    let n = 0;
    if (e > 0.05) for (let y = Math.max(0, Math.floor((s - 400) / 500) * 500); y < Math.min(PAGE_H, s + 6000) && n < ticks.length - 1; y += 500) for (const sx of [-1, 1]) {
      const [px, py, pz] = toScreen(new THREE.Vector3(sx * (HALF + 0.35), 0, y / PXM)), el = ticks[n++], ok = pz < 1 && py > 0 && py < h && px > 0 && px < w;
      el.style.display = ok ? '' : 'none'; if (ok) { el.textContent = y.toLocaleString('fr-FR'); el.style.opacity = e; el.style.transform = `translate(${px}px,${py}px) translate(${sx < 0 ? '-100%' : '0'},-50%)`; }
    }
    for (; n < ticks.length; n++) ticks[n].style.display = 'none';
  }
  requestAnimationFrame(frame);
  // signature : trait après trait, comme sur le site (délais et durées de chaque trait, déclenchée quand elle entre dans l'écran),
  // dessinée dans un canvas posé sur la feuille ; la page réelle (vue de face) joue la même animation au même instant
  const sigEl = $('#pc-sign'), sigSvg = sigEl && sigEl.querySelector('svg');
  if (sigSvg) {
    const r = sigRect, g = W(r), K = 2, cv = document.createElement('canvas'); cv.width = r.w * K; cv.height = r.h * K;
    const ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.Mesh(plane(g.w, g.d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); pm.rotation.x = -Math.PI / 2; pm.position.set(g.cx, 0.02, g.cz); pm.renderOrder = 4; scene.add(pm);
    const vb = sigSvg.viewBox.baseVal, k = r.w / vb.width;
    const strokes = $$('path', sigSvg).map((p) => { const tr = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(p.getAttribute('transform') || ''); return { p2: new Path2D(p.getAttribute('d')), len: p.getTotalLength(), w: parseFloat(p.getAttribute('stroke-width')), d: parseFloat(p.dataset.d), t: parseFloat(p.dataset.t), tx: tr ? +tr[1] : 0, ty: tr ? +tr[2] : 0, el: p }; });
    const bez = (t) => { let a = t; for (let i = 0; i < 6; i++) { const x = 3 * .25 * a * (1 - a) ** 2 + 3 * .25 * a * a * (1 - a) + a ** 3; a -= (x - t) / Math.max(1e-3, 3 * .25 * (1 - a) ** 2 + 6 * (.25 - .25) * a * (1 - a) + 3 * (1 - .25) * a * a); a = Math.min(1, Math.max(0, a)); } return 3 * .1 * a * (1 - a) ** 2 + 3 * a * a * (1 - a) + a ** 3; };
    let t0 = null;
    const draw = (now) => {
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.strokeStyle = '#e0ebfd'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let done = true;
      for (const st of strokes) {
        const u = reduce ? 1 : t0 === null ? 0 : Math.min(1, Math.max(0, (now - t0 - st.d * 1000) / (st.t * 1000))); if (u < 1) done = false; if (u <= 0) continue;
        ctx.setTransform(K * k, 0, 0, K * k, K * k * (-vb.x + st.tx), K * k * (-vb.y + st.ty)); ctx.lineWidth = st.w;
        ctx.setLineDash([st.len * bez(u), st.len * 2]); ctx.stroke(st.p2);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); tex.needsUpdate = true; return done;
    };
    if (!reduce) strokes.forEach((st) => { st.el.style.strokeDasharray = '1 1'; st.el.style.strokeDashoffset = '1'; });
    const tick = (now) => {
      if (t0 === null && introReady && scrollY + innerHeight > r.y + 100) { // entrée dans l'écran (marge 100 px, comme le site)
        t0 = now + 700;
        if (!reduce) strokes.forEach((st) => st.el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: st.t * 1000, delay: 700 + st.d * 1000, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' }).finished.then(() => { st.el.style.strokeDashoffset = '0'; }).catch(() => {}));
      }
      if (!draw(now) || t0 === null) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  window.__expo = { camera, sections, items, HIC, hots, toScreen, V: THREE.Vector3 };
}
