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

const ROOM_K = 0.62;              // échelle de la pièce du site (et de son plan blueprint) dans le parcours
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
  document.documentElement.classList.add('expo');
  if (!HIC) page.classList.add('pc-fallback');

  /* relevé de la mise en page */
  const P = page.getBoundingClientRect();
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - P.left, y: r.top - P.top, w: r.width, h: r.height }; };
  const W = (r) => ({ cx: (r.x + r.w / 2 - PAGE_W / 2) / PXM, cz: (r.y + r.h / 2) / PXM, w: r.w / PXM, d: r.h / PXM });
  const PAGE_H = P.height;
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
    mat.depthWrite = false; const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S, 1, N(S)), mat); m.rotation.x = -Math.PI / 2; m.position.set(c.cx, 0, c.cz); m.renderOrder = -2; scene.add(m);
    bps.push(mat);
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
  const label = (text, { w = 3, h = 0.6, font = '400 26px iAWriterQuattroV, monospace', color = '#cfd3da', bg = null, op = 0.85 } = {}) => {
    const c = document.createElement('canvas'); c.width = Math.round(w * 90); c.height = Math.round(h * 90); const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: op, depthWrite: false, fog: false })); sp.scale.set(w, h, 1); return sp;
  };
  const FORM = ['y = sin(2πx + φ)', 'x = cos φ', 'eᵗ = Σ tⁿ / n!', 'dx/dt = x', 'y = e^(1 − (x − μ)²)', 'φ = 0,86', 'θ = 54,6°', 'd/dx eˣ = eˣ'];
  for (let z = Z0; z < Z1; z += 9) for (const side of [-1, 1]) if (rnd() < 0.3) {
    const f = label(FORM[Math.floor(rnd() * FORM.length)], { w: 4.2, h: 0.55 }); f.position.set(side * (HALF + 3 + rnd() * 7), 0.2, z); scene.add(f);
  }

  /* éléments de la page → objets 3D */
  const items = [];
  const glassSide = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false });
  const edgeMat = white(0.6);
  const topMat = () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, opacity: 1 });
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

  /* graphe des thématiques : une étoile par thème, reliée aux illustrations de ses pages */
  const loader = new THREE.TextureLoader();
  for (const el of $$('[data-graph]')) {
    const r = rectOf(el), hubs = $$(':scope > ul > li', el);
    const cols = 3, rows = Math.ceil(hubs.length / cols), all = [], seg = [];
    const hubPos = hubs.map((li, i) => {
      const cx = r.x + (i % cols + 0.5) / cols * r.w + (rnd() - 0.5) * 60, cy = r.y + (Math.floor(i / cols) + 0.5) / rows * r.h * 0.82 + (rnd() - 0.5) * 60;
      return new THREE.Vector3((cx - PAGE_W / 2) / PXM, 0.8 + rnd() * 1.2, cy / PXM);
    });
    const center = hubPos.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / hubPos.length);
    hubs.forEach((li, i) => {
      const hp = hubPos[i]; all.push(hp); seg.push(center, hp);
      const ring = []; for (let j = 0; j <= 48; j++) ring.push(new THREE.Vector3(hp.x + Math.cos(j / 48 * 6.283) * 0.95, 0.02, hp.z + Math.sin(j / 48 * 6.283) * 0.95));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), white(0.45)));
      const name = li.dataset.hub, lb = label(name.length > 24 ? name.slice(0, 23) + '…' : name, { w: 2.6, h: 0.3, font: '400 16px iAWriterQuattroV, monospace', color: '#e6ecff', op: 0.95 });
      lb.position.set(hp.x, 0.05, hp.z + 1.25); scene.add(lb);
      const leaves = $$('a', li), n = leaves.length + 10;
      for (let k = 0; k < n; k++) {
        const a = k / n * 6.283 + rnd() * 0.4, rr = 0.5 + rnd() * 0.9, p = new THREE.Vector3(hp.x + Math.cos(a) * rr, Math.max(0.1, hp.y + (rnd() - 0.5) * 1.6), hp.z + Math.sin(a) * rr);
        seg.push(hp, p); all.push(p);
        const img = leaves[k] && leaves[k].querySelector('img'); if (!img) continue;
        const fr = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, fog: false })); fr.scale.set(0.4, 0.3, 1); fr.position.copy(p); scene.add(fr);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, fog: false, depthTest: false })); sp.scale.set(0.35, 0.25, 1); sp.position.copy(p); sp.renderOrder = 5; scene.add(sp);
        loader.load(img.getAttribute('src'), (t) => { t.colorSpace = THREE.SRGBColorSpace; sp.material.map = t; sp.material.needsUpdate = true; });
      }
    });
    scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(all), new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.55 })));
    // courbe exponentielle numérotée sous le graphe
    const y0 = r.y + r.h + 40, pts = [];
    for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push(new THREE.Vector3((60 + u * 880 - PAGE_W / 2) / PXM, 0.02, (y0 + 60 - 55 * (Math.exp(3 * u) - 1) / (Math.exp(3) - 1)) / PXM)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), white(0.75)));
    const axZ = (y0 + 62) / PXM;
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4.4, 0.02, axZ), new THREE.Vector3(4.4, 0.02, axZ)]), white(0.5)));
    hubs.forEach((_, i) => { const p = pts[Math.round((i + 1) / (hubs.length + 1) * 60)], t = label(String(i + 1).padStart(2, '0'), { w: 0.6, h: 0.3, font: '400 22px iAWriterQuattroV, monospace', color: '#fff' }); t.position.set(p.x, 0.05, p.z + 0.25); scene.add(t); });
    for (let i = 0; i <= 5; i++) { const t = label(String(i), { w: 0.4, h: 0.3, font: '400 22px iAWriterQuattroV, monospace' }); t.position.set(-4.4 + i * 1.76, 0.05, axZ + 0.3); scene.add(t); }
    const xl = label('x = 4,00', { w: 1.6, h: 0.35, font: '500 24px iAWriterQuattroV, monospace', color: '#fff' }); xl.position.set(2.6, 0.05, axZ + 0.6); scene.add(xl);
  }

  /* machines 3D des projets, dispersées sur les côtés */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b8e6, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(-9, 16, 8); scene.add(sun);
  const machines = [];
  for (const art of $$('[data-fig]')) {
    const r = rectOf(art), side = rnd() < 0.5 ? -1 : 1, sc = 3.2 + rnd() * 1.6, x = side * (HALF + 0.9 + sc / 2 + rnd() * 1.8), z = (r.y + (0.15 + rnd() * 0.5) * r.h) / PXM, rot = side * (0.5 + rnd() * 0.5);
    const mod = art.dataset.fig === 'vrestudio-musicbox' ? 'vrestudio' : art.dataset.fig;
    import(`./m3d/${mod}.js`).then(({ build, WIDTH = 236 }) => {
      const m = build(), g = new THREE.Group(); g.add(m.group); g.scale.setScalar(sc / WIDTH); g.rotation.y = rot; scene.add(g);
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
      g.position.set(x - c.x, -box.min.y, z - c.z); patchTree(g); machines.push({ m, z });
    }).catch((e) => console.warn('machine indisponible', mod, e));
  }

  /* décor : la vraie pièce du site (js/room.js) ; ses objets sont déplacés dans cette scène et posés sur la section Décor.
     Son propre moteur continue d'animer le personnage et les objets, il ne dessine plus rien lui-même. */
  const roomSpot = $('[data-room]');
  if (roomSpot && !reduce) {
    const rr = W(rectOf(roomSpot)), host = document.createElement('div'), bubble = document.createElement('div');
    host.className = 'pc-room-host'; host.setAttribute('aria-hidden', 'true'); bubble.className = 'bubble'; host.append(bubble); document.body.append(host);
    Promise.all([import('../js/room.js?v=nt6-20261026'), import('three/addons/RoomEnvironment.js')]).then(async ([{ createRoom }, { RoomEnvironment }]) => {
      const room = await createRoom(host, bubble);
      room.setSceneMuted?.(true);
      const g = new THREE.Group();
      for (const o of [...room.scene.children]) if (!(o.material && o.material.isShadowMaterial)) g.add(o);
      g.scale.setScalar(ROOM_K); g.rotation.y = -36 * Math.PI / 180; g.position.set(rr.cx, 0, rr.cz);
      // les arbres de la pièce (vendor-trees) embarquent leur propre Three.js, plus ancien : on complète leurs matrices
      g.traverse((o) => { const P = Object.getPrototypeOf(o.matrixWorld); if (!P.determinantAffine) P.determinantAffine = THREE.Matrix4.prototype.determinantAffine; });
      scene.add(g); patchTree(g);
      const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;
      window.__room = room;
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
      const box = new THREE.Box3().setFromObject(asm), size = box.getSize(new THREE.Vector3()), k = 2.6 / Math.max(size.x, size.y, size.z);
      const g = new THREE.Group(); g.add(asm); asm.scale.setScalar(k); asm.position.y = -box.min.y * k;
      g.position.set(pr.cx, 0, pr.cz); g.rotation.y = 0.5; scene.add(g); patchTree(g);
      const anchor = slot ? asm.worldToLocal(slot.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3(0, size.y, 0);
      falling.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      pigs.push({ falling, anchor, z: pr.cz });
    }).catch((e) => console.warn('tirelire indisponible', e));
  }

  /* éléments vivants (hublot et sa vidéo, symbole infini) : le vrai DOM, posé dans la 3D par CSS3D, toujours interactif */
  const lives = [];
  const liveEls = $$('[data-live]').filter((el) => el.dataset.live !== 'infini');
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
  let css = null; const cssScene = new THREE.Scene();
  if (liveEls.length) {
    const { CSS3DRenderer, CSS3DObject } = await import('../vendor/three-r187/CSS3DRenderer.js');
    css = new CSS3DRenderer(); css.domElement.id = 'live3d'; document.body.append(css.domElement);
    for (const el of liveEls) {
      const r = rectOf(el), g = W(r);
      const ph = document.createElement('div'); ph.style.cssText = `width:${r.w}px;height:${r.h}px;margin:${getComputedStyle(el).margin}`; el.before(ph); // la mise en page ne bouge pas
      el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; el.style.margin = '0';
      const o = new CSS3DObject(el); o.scale.setScalar(1 / PXM); cssScene.add(o);
      lives.push({ el, o, g, tilt: el.dataset.live === 'hublot' ? 0.75 : 0.45 });
    }
    if ($('#rf-win')) import('./hublot.js').catch((e) => console.warn('hublot indisponible', e));
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
  const magics = $$('[data-steps]').map((ol) => {
    const art = ol.closest('.pc-proj'), card = items.find((x) => x.art === art && x.el.matches('[data-box]'));
    const steps = items.filter((x) => x.step && x.art === art);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pc-magic'; b.textContent = 'Cliquez ici pour voir la magie';
    b.setAttribute('aria-label', 'Voir comment fonctionne : ' + (card.el.dataset.callout || 'ce projet'));
    document.body.append(b);
    const m = { b, steps, on: false, p: new THREE.Vector3((card.r.x - PAGE_W / 2) / PXM + 0.25, card.top, (card.r.y + card.r.h) / PXM) };
    b.onclick = () => {
      m.on = !m.on; b.textContent = m.on ? 'Masquer la magie' : 'Cliquez ici pour voir la magie';
      steps.forEach((s, i) => { s.t0 = performance.now() + (m.on ? i * 90 : 0); s.dir = m.on ? 1 : -1; s.group.visible = true; });
    };
    return m;
  });
  const notes = sections.map((s) => $$('[data-note]', s.el).map((n) => { const r = rectOf(n); return new THREE.Vector3((r.x + 3 - PAGE_W / 2) / PXM, 0.02, (r.y + 9) / PXM); }));
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
  const linearize = (mat) => { mat.userData.lin = true; mat.needsUpdate = true; };
  if (HIC) {
    canvas.setAttribute('layoutsubtree', 'true');
    const byEl = new Map();
    canvas.addEventListener('paint', (e) => {
      for (const el of e.changedElements) {
        const it = byEl.get(el); if (!it) continue;
        if (!it.tex) { it.tex = new THREE.HTMLTexture(el); canvas.onpaint = null; it.mats.forEach((m) => { linearize(m); m.map = it.tex; m.needsUpdate = true; }); }
        else it.tex.needsUpdate = true;
      }
    });
    for (const it of items) { it.el.style.width = it.r.w + 'px'; it.el.style.height = it.r.h + 'px'; it.el.style.margin = '0'; byEl.set(it.el, it); canvas.append(it.el); }
    canvas.requestPaint();
  } else rasterAll().catch((e) => console.warn('rendu des textures impossible', e));

  async function rasterAll() {
    const css = await inlineCss();
    for (const s of sections) {
      const mine = items.filter((it) => s.el.contains(it.el)); if (!mine.length) continue;
      const draw = async () => {
        const c = await rasterize(s.el, s.r, css), base = new THREE.CanvasTexture(c); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 8;
        for (const it of mine) {
          const t = base.clone(); t.repeat.set(it.r.w / s.r.w, it.r.h / s.r.h); t.offset.set((it.r.x - s.r.x) / s.r.w, 1 - (it.r.y - s.r.y + it.r.h) / s.r.h); t.needsUpdate = true;
          it.mats.forEach((m) => { m.map = t; m.needsUpdate = true; });
        }
      };
      await draw();
    }
  }
  async function inlineCss() {
    const b64 = async (u) => { const b = await (await fetch(u)).blob(); return await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); };
    let css = await (await fetch(new URL('parcours.css', import.meta.url))).text();
    css = css.replace(/@font-face\{[^}]*\}/g, '');
    const fonts = [['Inter', 'normal', 'fonts/Inter-latin.woff2'], ['Inter', 'italic', 'fonts/Inter-italic-latin.woff2'], ['iAWriterQuattroV', 'normal', 'fonts/iAWriterQuattroV.ttf']];
    const faces = await Promise.all(fonts.map(async ([f, st, u]) => `@font-face{font-family:"${f}";font-style:${st};font-weight:100 900;src:url(${await b64(new URL(u, import.meta.url))})}`));
    return faces.join('') + css;
  }
  async function rasterize(el, r, css) {
    const S = Math.min(1.5, 8000 / r.h);
    const clone = el.cloneNode(true); clone.style.background = 'transparent'; clone.style.margin = '0'; clone.style.width = r.w + 'px'; clone.style.height = r.h + 'px';
    clone.querySelectorAll('[data-graph]').forEach((n) => n.remove());
    const xml = new XMLSerializer().serializeToString(clone);
    const svgDoc = `<svg xmlns="http://www.w3.org/2000/svg" width="${r.w}" height="${r.h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css.replace(/</g, '\\3c ')}</style>${xml}</div></foreignObject></svg>`;
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgDoc); await img.decode();
    const c = document.createElement('canvas'); c.width = Math.round(r.w * S); c.height = Math.round(r.h * S);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
  }

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
    if (css) css.setSize(innerWidth, innerHeight);
    renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
    const d = renderer.getPixelRatio(); rt.setSize(Math.round(innerWidth * d), Math.round(innerHeight * d)); postMat.uniforms.px.value.set(1 / (innerWidth * d), 1 / (innerHeight * d));
    page.style.height = Math.round(PAGE_H + innerHeight * 0.5) + 'px'; // la fin de la page peut venir au centre
  }
  addEventListener('resize', resize); resize();

  /* projection d'un point du monde avec la même courbure que le shader */
  const tmp = new THREE.Vector3();
  const toScreen = (v) => {
    tmp.copy(v); curlJS(tmp, camera.position); tmp.applyMatrix4(camera.matrixWorldInverse);
    const behind = tmp.z > -0.1; tmp.applyMatrix4(camera.projectionMatrix);
    return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight, behind ? 2 : tmp.z];
  };

  /* boucle */
  const ease = (u) => u * u * (3 - 2 * u);
  const flatPos = new THREE.Vector3(), runPos = new THREE.Vector3(), flatLook = new THREE.Vector3(), runLook = new THREE.Vector3(), look = new THREE.Vector3();
  let frameN = 0, sSm = scrollY, last = performance.now(), dtS = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    dtS = Math.min(0.05, (now - last) / 1000); last = now;
    sSm += (scrollY - sSm) * (reduce ? 1 : 1 - Math.exp(-dtS * 7)); if (Math.abs(scrollY - sSm) < 0.05) sSm = scrollY;
    const s = sSm, e = ease(Math.max(0, Math.min(1, (s - FOLD_A) / (FOLD_B - FOLD_A))));
    const H = innerHeight, focusZ = (s + H / 2) / PXM;
    // vue de face : la page à l'échelle 1:1, comme un site normal (champ 30°)
    const fovFlat = 30, dist = (H / PXM / 2) / Math.tan(fovFlat / 2 * Math.PI / 180);
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
    for (const it of items) if (it.float) it.group.position.y = 0.9 + Math.sin(now / 900 + it.r.y) * 0.06;
    for (const k of machines) if (Math.abs(focusZ - k.z) < 40) k.m.update(now / 1000);
    for (const p of pigs) { // une pièce toutes les 2,4 s
      const u = (now / 2400) % 1, v = Math.min(1, u / 0.55); p.falling.visible = u < 0.6;
      p.falling.position.set(p.anchor.x, p.anchor.y + (1 - v * v) * 1.6, p.anchor.z); p.falling.rotation.y = u * 6;
    }
    for (const f of infs) if (Math.abs(focusZ - f.z) < 30) f.t.needsUpdate = true;
    if (css) {
      const d0 = CURL.k * camera.position.y - CURL.off;
      for (const L of lives) {
        const a = L.tilt * e, far = L.g.cz - L.g.d / 2 * Math.cos(a);
        L.o.rotation.set(-Math.PI / 2 + a, 0, 0); L.o.position.set(L.g.cx, 0.03 + L.g.d / 2 * Math.sin(a), L.g.cz + (L.g.d / 2) * (1 - Math.cos(a)));
        const t = camera.position.z - far - d0, near = L.g.cz + L.g.d / 2 - camera.position.z;
        L.el.style.opacity = Math.max(0, Math.min(1, 1 - t / 2, 1 - near / 3)).toFixed(3);
        L.el.style.visibility = L.el.style.opacity === '0.000' ? 'hidden' : '';
      }
      css.render(cssScene, camera);
    }
    for (const b of bps) { b.uniforms.uTime.value = now / 1000; b.uniforms.uRes.value.set(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()); }
    postMat.uniforms.amt.value = e;
    if ((frameN++ & 31) === 0) patchTree(scene);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    overlay(e, focusZ, s);
  }
  function overlay(e, focusZ, s) {
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
    for (const m of magics) {
      const [px, py, pz] = toScreen(m.p), vis = e > 0.5 && pz < 1 && py > 40 && py < h - 30 && px > 0 && px < w;
      m.b.style.display = vis ? '' : 'none'; if (vis) m.b.style.transform = `translate(${px}px,${py + 10}px)`;
    }
    const btn = navItems[active] && navItems[active].firstChild, dots = notes[active] || [];
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
      if (t0 === null && scrollY + innerHeight > r.y + 100) { // entrée dans l'écran (marge 100 px, comme le site)
        t0 = now + 300;
        if (!reduce) strokes.forEach((st) => st.el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: st.t * 1000, delay: 300 + st.d * 1000, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' }).finished.then(() => { st.el.style.strokeDashoffset = '0'; }).catch(() => {}));
      }
      if (!draw(now) || t0 === null) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  window.__expo = { camera, sections, items, HIC };
}
