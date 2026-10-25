import { THREE, rng } from './kit.js?v=cv-scene-v29';
import { makeTree, treeTime } from './tree-gen.js?v=arb2';
import { ANNUAL_DECLARED, euroCoinRhythm } from './annual-gains.js?v=cv-scene-v60';

/* ───────────── L'atelier des processus ─────────────
 * Une île low poly flottante, de nuit : un personnage à guider, une forge (projets), des portails (Blog, Expériences, Gains, Contact),
 * une tirelire qui laisse tomber une pièce de 1 € au rythme des gains annuels, un étang, des lanternes. Tout est écrit pour ce site :
 * modèles construits en code, aucun fichier de tiers. Déplacement au clavier (ZQSD / flèches), au clic ou au doigt (joystick). */

const TAU = Math.PI * 2, $ = (id) => document.getElementById(id);
const mobile = matchMedia('(max-width:760px)').matches || matchMedia('(pointer:coarse)').matches;
const ISLAND_TOP = 0;
const R = (a) => 6.6 * (1 + 0.05 * Math.sin(3 * a + 1) + 0.035 * Math.sin(5 * a + 2.3) + 0.02 * Math.sin(9 * a));   // rayon de l'île selon l'angle
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, flatShading: true, ...o });

/* ───────── rendu, scène, lumières ───────── */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  [[0, '#040818'], [0.5, '#101a4c'], [0.82, '#2e2a72'], [1, '#6a4a8f']].forEach(([t, col]) => gr.addColorStop(t, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
scene.fog = new THREE.FogExp2('#1a2262', 0.016);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight('#7f93d8', '#241d3c', 1.35));
const moon = new THREE.DirectionalLight('#aebfff', 2.2); moon.position.set(-9, 14, 7); moon.castShadow = !mobile;
Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0006; scene.add(moon, moon.target);
{ // étoiles et lune
  const n = 420, p = new Float32Array(n * 3), r = rng(5);
  for (let i = 0; i < n; i++) { const a = r() * TAU, e = 0.12 + r() * 1.2, d = 80; p[i * 3] = Math.cos(a) * Math.cos(e) * d; p[i * 3 + 1] = Math.sin(e) * d; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * d - 20; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false })); scene.add(stars);
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 1), new THREE.MeshBasicMaterial({ color: '#eef2ff', fog: false })); m.position.set(-36, 34, -70); scene.add(m);
}

/* ───────── l'île ───────── */
const world = new THREE.Group(); scene.add(world);
{
  const g = new THREE.CylinderGeometry(1, 0.84, 0.8, 44, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (Math.hypot(x, z) > 1e-4) { const k = R(Math.atan2(z, x)); p.setX(i, x * k); p.setZ(i, z * k); } }
  g.computeVertexNormals();
  const top = new THREE.Mesh(g, [mat('#5b4a3a'), mat('#4a8a48'), mat('#3c3a40')]); top.position.y = ISLAND_TOP - 0.4; top.receiveShadow = true; top.castShadow = true; world.add(top);
  const prof = [[5.5, 0], [5.0, -1.2], [3.9, -2.6], [2.8, -4.0], [1.6, -5.3], [0.6, -6.4], [0.02, -7.2]].map(([r, y]) => new THREE.Vector2(r, y)), lg = new THREE.LatheGeometry(prof, 12), lp = lg.attributes.position;
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i), a = Math.atan2(z, x), k = 1 + 0.12 * Math.sin(a * 3 + y * 0.9) + 0.07 * Math.sin(a * 7 - y * 1.7); lp.setXYZ(i, x * k, y + 0.25 * Math.sin(a * 5 + y), z * k); }
  lg.computeVertexNormals();
  const rock = new THREE.Mesh(lg, mat('#4c4f63', { side: THREE.DoubleSide })); rock.position.y = ISLAND_TOP - 0.8; rock.castShadow = true; world.add(rock);
}
const floaters = [];
{ const r = rng(9); for (let i = 0; i < 6; i++) { const a = r() * TAU, d = 8.6 + r() * 3, s = 0.3 + r() * 0.5, m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat('#555a70')); m.position.set(Math.cos(a) * d, -1.4 + r() * 2.2, Math.sin(a) * d); m.userData = { y: m.position.y, ph: r() * TAU, sp: 0.3 + r() * 0.4 }; m.castShadow = true; world.add(m); floaters.push(m); } }

/* ───────── lieux : positions et collisions ───────── */
const tirelireSecs = (() => { try { return euroCoinRhythm(ANNUAL_DECLARED, 225, 7).secondsPerEuro; } catch { return 15; } })();
const fmt = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const PLACES = [
  { id: 'forge', name: 'La forge', x: -3.9, z: -1.6, reach: 2.7, url: './#projets', text: 'Dix projets professionnels : chacun est une machine que l’on peut manipuler.', cta: 'Voir les projets' },
  { id: 'blog', name: 'Blog', x: -2.4, z: -4.2, reach: 2.2, url: 'blog', text: 'Des études sur la qualité et le numérique, avec leur code.', cta: 'Entrer dans le blog' },
  { id: 'exp', name: 'Expériences', x: -0.1, z: -4.8, reach: 2.2, url: 'experiences', text: 'Le parcours, de la circulation ferroviaire à la qualité.', cta: 'Voir les expériences' },
  { id: 'gains', name: 'Gains', x: 2.3, z: -4.3, reach: 2.2, url: 'gains', text: 'Du temps libéré, valorisé au taux horaire de 104,74 €.', cta: 'Voir les gains' },
  { id: 'contact', name: 'Contact', x: 4.5, z: -2.1, reach: 2.2, url: './#contact', text: 'Écrire à Mathieu.', cta: 'Me contacter' },
  { id: 'tirelire', name: 'La tirelire', x: 0, z: -0.2, reach: 2.0, url: 'gains', text: '1 € toutes les ' + fmt(tirelireSecs) + ' s, d’après les volumes fournis.', cta: 'Voir les gains' },
];
const BLOCKS = [[-3.9, -1.6, 1.25], [-2.7, 2.6, 1.15], [0, -0.2, 0.7], [-2.4, -4.2, 0.75], [-0.1, -4.8, 0.75], [2.3, -4.3, 0.75], [4.5, -2.1, 0.75]];   // cercles où le personnage ne marche pas

/* ───────── végétation ───────── */
const TREES = [['cherry', 5.0, 1.4, 2.3, 3], ['pine', -5.4, 0.6, 2.7, 5], ['maple', 5.2, 3.2, 1.9, 7], ['ginkgo', -4.9, 3.6, 2.2, 9], ['weeping', 2.7, 4.9, 2.2, 11], ['pine', -1.9, -5.4, 2.4, 13]];
for (const [k, x, z, h, sd] of TREES) { const t = makeTree(k, sd, h); t.position.set(x, ISLAND_TOP, z); t.rotation.y = sd; world.add(t); BLOCKS.push([x, z, 0.4]); }
{
  const r = rng(21), tufts = [], cone = new THREE.ConeGeometry(0.05, 0.26, 4), dummy = new THREE.Object3D();
  for (let i = 0, t = 0; i < 320 && t < 4000; t++) {
    const a = r() * TAU, d = Math.sqrt(r()) * (R(a) - 0.35), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (BLOCKS.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br + 0.25)) continue; tufts.push([x, z]); i++;
  }
  const im = new THREE.InstancedMesh(cone, mat('#ffffff'), tufts.length), col = new THREE.Color();
  tufts.forEach(([x, z], i) => { dummy.position.set(x, ISLAND_TOP + 0.1, z); dummy.rotation.set((r() - 0.5) * 0.4, r() * TAU, (r() - 0.5) * 0.4); dummy.scale.setScalar(0.7 + r() * 0.9); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); col.setHSL(0.27 + r() * 0.06, 0.45, 0.28 + r() * 0.16); im.setColorAt(i, col); });
  world.add(im);
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), mat('#ffffff'), 60), cols = ['#f6b8cb', '#ffffff', '#ffe08a', '#c9b5ff'];
  for (let i = 0; i < 60; i++) { const t = tufts[(r() * tufts.length) | 0]; dummy.position.set(t[0] + (r() - 0.5) * 0.3, ISLAND_TOP + 0.09, t[1] + (r() - 0.5) * 0.3); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.8 + r() * 0.6); dummy.updateMatrix(); fl.setMatrixAt(i, dummy.matrix); fl.setColorAt(i, col.set(cols[(r() * cols.length) | 0])); }
  world.add(fl);
}

/* ───────── étang et poissons ───────── */
const fishes = [];
{
  const [px, pz, pr] = BLOCKS[1], water = new THREE.Mesh(new THREE.CircleGeometry(pr, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1b3b73', roughness: 0.25, metalness: 0.1, emissive: '#0a1a44', emissiveIntensity: 0.6 }));
  water.position.set(px, ISLAND_TOP + 0.03, pz); world.add(water);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(pr + 0.05, 0.1, 5, 14).rotateX(Math.PI / 2), mat('#77757e')); ring.position.set(px, ISLAND_TOP + 0.06, pz); ring.castShadow = true; world.add(ring);
  const fishMat = [mat('#ff8a3d', { emissive: '#552200', emissiveIntensity: 0.4 }), mat('#f4f1ea', { emissive: '#333333', emissiveIntensity: 0.3 }), mat('#ffb347', { emissive: '#442a00', emissiveIntensity: 0.4 })];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Group(), body = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0).scale(1, 0.55, 2.1), fishMat[i]), tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 3).rotateX(-Math.PI / 2), fishMat[i]); tail.position.z = -0.38; tail.name = 'tail';
    f.add(body, tail); f.userData = { r: pr * (0.35 + 0.15 * i), ph: i * 2.1, sp: 0.5 + i * 0.12 }; world.add(f); fishes.push({ f, px, pz });
  }
  for (let i = 0; i < 5; i++) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.17, 7).rotateX(-Math.PI / 2), mat('#3f8f4f')); pad.position.set(px + Math.cos(i * 1.7) * pr * 0.55, ISLAND_TOP + 0.04, pz + Math.sin(i * 1.7) * pr * 0.55); world.add(pad); }
}

/* ───────── la forge ───────── */
const forge = new THREE.Group(), forgeParts = {};
{
  const [fx, fz] = [PLACES[0].x, PLACES[0].z]; forge.position.set(fx, ISLAND_TOP, fz); forge.rotation.y = Math.atan2(-fx, -fz);
  const stone = mat('#6f6c76'), dark = mat('#3d2f2a'), add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; forge.add(m); return m; };
  add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.3), stone), 0, 0.35, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.95), mat('#7d7a84')), 0, 1.15, -0.05);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.3, 0.38), stone), 0.35, 2.2, -0.2);
  const roof = add(new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.75, 4), dark), 0, 1.98, -0.05); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.8);
  const fire = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.06), new THREE.MeshBasicMaterial({ color: '#ff8a2a' })); add(fire, 0, 1.0, 0.43); forgeParts.fire = fire;
  const glow = new THREE.PointLight('#ff8a3d', 9, 7, 2); glow.position.set(0, 1.1, 1.1); forge.add(glow); forgeParts.glow = glow;
  // enclume et marteau
  add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.28), mat('#4a4c58')), 0, 0.82, 1.35).position.y = 0.82;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.22), mat('#3c3e49')), 0, 0.56, 1.35);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.42), mat('#34353f')), 0, 0.4, 1.35);
  const h = new THREE.Group(); h.position.set(0.3, 1.0, 1.35);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), mat('#7a5a3a')); handle.position.y = 0.2; const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.12), mat('#5b5e6b')); head.position.y = 0.46; h.add(handle, head); forge.add(h); forgeParts.hammer = h;
  forgeParts.smoke = Array.from({ length: 6 }, (_, i) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: '#9aa0b8', transparent: true, opacity: 0 })); s.userData.i = i; forge.add(s); return s; });
  world.add(forge);
}

/* ───────── portails ───────── */
const portalTime = { value: 0 };
function portal(place, color) {
  const g = new THREE.Group(); g.position.set(place.x, ISLAND_TOP, place.z); g.rotation.y = Math.atan2(-place.x, -place.z);
  const stone = mat('#706d7a');
  for (const sx of [-0.95, 0.95]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), stone); p.position.set(sx, 1.1, 0); p.castShadow = true; g.add(p); const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), mat('#8a8794')); cap.position.set(sx, 2.25, 0); g.add(cap); }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.15, 5, 14, Math.PI), stone); arch.position.y = 2.2; arch.castShadow = true; g.add(arch);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 28), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: portalTime, c: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;uniform float t;uniform vec3 c;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float s=.5+.5*sin(a*3.+r*9.-t*2.4);float m=smoothstep(1.,.78,r);gl_FragColor=vec4(c*(.35+1.0*s*(1.-r*.55)),m*.8);}',
  }));
  disc.position.y = 2.2 - 0.0; disc.scale.set(1, 1, 1); disc.position.y = 1.15; disc.geometry.translate(0, 1.05, 0); g.add(disc);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.12, 8), mat('#5e5c68')); base.position.y = 0.06; base.receiveShadow = true; g.add(base);
  world.add(g); return g;
}
const portalColors = { blog: '#6aa0ff', exp: '#8ee0b8', gains: '#ffd36a', contact: '#ff9ac0' };
for (const p of PLACES.filter((q) => portalColors[q.id])) portal(p, portalColors[p.id]);

/* ───────── tirelire ───────── */
const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12).rotateX(Math.PI / 2), mat('#ffd24a', { emissive: '#7a5200', emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.4 })); coin.visible = false; world.add(coin);
{
  const [x, z] = [PLACES[5].x, PLACES[5].z];
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.5, 8), mat('#76737f')); ped.position.set(x, ISLAND_TOP + 0.25, z); ped.castShadow = ped.receiveShadow = true; world.add(ped);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.1), mat('#26242c')); slot.position.set(x, ISLAND_TOP + 0.51, z); world.add(slot);
  const l = new THREE.PointLight('#ffd24a', 2.2, 4.5, 2); l.position.set(x, 1.3, z); world.add(l); coin.userData.light = l;
}

/* ───────── pas japonais et lanternes ───────── */
{
  const spawn = [0, 3.8], center = [PLACES[5].x, PLACES[5].z + 0.9], lines = [[spawn, center], [center, [-2.9, -1.0]], ...PLACES.filter((q) => portalColors[q.id]).map((q) => [center, [q.x * 0.82, q.z * 0.82 + 0.5]])];
  const stones = [], r = rng(33);
  for (const [a, b] of lines) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 0.62); for (let i = 1; i < n; i++) { const t = i / n; stones.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.1, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 0.1]); } }
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.23, 0.05, 6), mat('#8a8794'), stones.length), dummy = new THREE.Object3D();
  stones.forEach(([x, z], i) => { dummy.position.set(x, ISLAND_TOP + 0.02, z); dummy.rotation.set(0, r() * TAU, 0); dummy.scale.setScalar(0.85 + r() * 0.3); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); im.receiveShadow = true; world.add(im);
  const posts = [[-0.9, 3.1], [0.9, 3.1], [-0.9, 1.7], [0.9, 1.7], [-1.9, -0.9], [2.1, -0.7], [-3.4, -3.0], [3.4, -3.6], [1.2, -3.0]];
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffc46b' }), halo = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,200,110,.9)'); gr.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  window.__lanterns = [];
  for (const [x, z] of posts) {
    const g = new THREE.Group(); g.position.set(x, ISLAND_TOP, z);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), mat('#5a4a40')); post.position.y = 0.31; post.castShadow = true;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), lanternMat.clone()); lamp.position.y = 0.72;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.12, 4).rotateY(Math.PI / 4), mat('#3d2f2a')); cap.position.y = 0.9;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.position.y = 0.72; sp.scale.setScalar(1.3);
    g.add(post, lamp, cap, sp); world.add(g); window.__lanterns.push({ lamp, sp, ph: x * 3 + z });
    BLOCKS.push([x, z, 0.15]);
  }
}

/* ───────── nuages bas ───────── */
const clouds = [];
{ const r = rng(14); for (let i = 0; i < 9; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + r() * 0.7, 0), new THREE.MeshStandardMaterial({ color: '#c9d2f2', roughness: 1, flatShading: true, transparent: true, opacity: 0.7, fog: true })); b.position.set(k * 1.1 - 1.6, (r() - 0.5) * 0.3, (r() - 0.5) * 0.8); b.scale.y = 0.55; c.add(b); } const a = r() * TAU, d = 12 + r() * 12; c.position.set(Math.cos(a) * d, -5 - r() * 3, Math.sin(a) * d); c.userData = { a, d, sp: 0.01 + r() * 0.015, y: c.position.y }; world.add(c); clouds.push(c); } }

/* ───────── lucioles ───────── */
const fireflies = (() => { const n = 34, r = rng(77), p = new Float32Array(n * 3), seeds = []; for (let i = 0; i < n; i++) { const a = r() * TAU, d = r() * 5.6; p[i * 3] = Math.cos(a) * d; p[i * 3 + 1] = 0.4 + r() * 2; p[i * 3 + 2] = Math.sin(a) * d; seeds.push([r() * TAU, 0.3 + r() * 0.6]); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: '#d9ff8a', size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); world.add(pts); return { pts, base: p.slice(), seeds }; })();

/* ───────── le personnage ───────── */
const hero = new THREE.Group(), limbs = {};
{
  const skin = mat('#e8b99a'), jacket = mat('#e6ebf6'), scarf = mat('#1254fa'), pants = mat('#2a3550'), hair = mat('#2b2320');
  const box = (w, h, d, m, x, y, z, parent = hero) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; parent.add(b); return b; };
  box(0.42, 0.5, 0.26, jacket, 0, 0.72, 0); box(0.46, 0.1, 0.3, scarf, 0, 0.99, 0.0);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), skin); head.position.y = 1.22; head.castShadow = true; hero.add(head);
  const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.215, 0), hair); cap.scale.set(1, 0.7, 1); cap.position.set(0, 1.3, -0.02); hero.add(cap);
  const pivot = (x, y) => { const g = new THREE.Group(); g.position.set(x, y, 0); hero.add(g); return g; };
  limbs.armL = pivot(-0.29, 0.93); box(0.12, 0.42, 0.12, jacket, 0, -0.2, 0, limbs.armL);
  limbs.armR = pivot(0.29, 0.93); box(0.12, 0.42, 0.12, jacket, 0, -0.2, 0, limbs.armR);
  limbs.legL = pivot(-0.11, 0.47); box(0.15, 0.46, 0.17, pants, 0, -0.23, 0, limbs.legL);
  limbs.legR = pivot(0.11, 0.47); box(0.15, 0.46, 0.17, pants, 0, -0.23, 0, limbs.legR);
  hero.position.set(0, ISLAND_TOP, 3.8); hero.rotation.y = Math.PI; world.add(hero);
}

/* ───────── étiquettes des lieux ───────── */
const tags = PLACES.map((p) => { const d = document.createElement('div'); d.className = 'tag'; d.textContent = p.name; $('ui').append(d); return d; });
const tmp = new THREE.Vector3();

/* ───────── commandes ───────── */
const keys = new Set(), joy = { x: 0, z: 0 }; let target = null, near = null;
addEventListener('keydown', (e) => { if (e.repeat) return; if (['Enter', 'KeyE', 'Space'].includes(e.code) && near) { e.preventDefault(); go(near.url); return; } if (e.code === 'Escape') closeIt(); keys.add(e.code); target = null; });
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ISLAND_TOP), pt = new THREE.Vector3(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); if (ray.ray.intersectPlane(plane, pt)) target = pt.clone(); });
{ // joystick tactile
  const zone = $('stick'), knob = zone.firstElementChild; let id = null, c0 = null;
  zone.addEventListener('pointerdown', (e) => { id = e.pointerId; zone.setPointerCapture(id); const b = zone.getBoundingClientRect(); c0 = [b.left + b.width / 2, b.top + b.height / 2]; target = null; move(e); });
  const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - c0[0], dz = e.clientY - c0[1]; const m = Math.hypot(dx, dz), max = 38; if (m > max) { dx = dx / m * max; dz = dz / m * max; } knob.style.transform = `translate(${dx}px,${dz}px)`; joy.x = dx / max; joy.z = dz / max; };
  zone.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.z = 0; knob.style.transform = ''; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
}
const go = (url) => { try { (window.top && window.top !== window ? window.top : window).location.href = url; } catch { location.href = url; } };
const closeIt = () => { if (window.parent !== window) window.parent.postMessage({ type: 'monde-close' }, '*'); else location.href = './'; };
$('close').addEventListener('click', (e) => { if (window.parent !== window) { e.preventDefault(); closeIt(); } });
$('act').addEventListener('click', () => near && go(near.url));

/* ───────── boucle ───────── */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(), look = new THREE.Vector3(), want = new THREE.Vector3(); let walk = 0, dropAt = 2, dropT = -1, lastFrame = 0;
const heroR = 0.3;
function step(dt, t) {
  // direction voulue : clavier, joystick ou point cliqué
  let dx = 0, dz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dz -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) dz += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  dx += joy.x; dz += joy.z;
  if (!dx && !dz && target) { const vx = target.x - hero.position.x, vz = target.z - hero.position.z, m = Math.hypot(vx, vz); if (m < 0.12) target = null; else { dx = vx / m; dz = vz / m; } }
  const m = Math.hypot(dx, dz), speed = 3.1; let moving = false;
  if (m > 0.05) {
    const k = Math.min(1, m) / m; let nx = hero.position.x + dx * k * speed * dt, nz = hero.position.z + dz * k * speed * dt;
    for (const [bx, bz, br] of BLOCKS) { const vx = nx - bx, vz = nz - bz, d = Math.hypot(vx, vz), min = br + heroR; if (d < min && d > 1e-4) { nx = bx + vx / d * min; nz = bz + vz / d * min; } }
    const a = Math.atan2(nz, nx), lim = R(a) - 0.6, d = Math.hypot(nx, nz); if (d > lim) { nx = nx / d * lim; nz = nz / d * lim; }
    hero.position.x = nx; hero.position.z = nz; moving = true;
    let da = Math.atan2(dx, dz) - hero.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); hero.rotation.y += da * Math.min(1, dt * 12);
  }
  walk += dt * (moving ? 9 : 0); const sw = moving ? 0.8 : 0;
  limbs.legL.rotation.x = Math.sin(walk) * sw; limbs.legR.rotation.x = -Math.sin(walk) * sw; limbs.armL.rotation.x = -Math.sin(walk) * sw * 0.8; limbs.armR.rotation.x = Math.sin(walk) * sw * 0.8;
  hero.position.y = ISLAND_TOP + (moving ? Math.abs(Math.sin(walk)) * 0.05 : Math.sin(t * 2) * 0.008);
  // lieu proche
  let best = null, bd = 1e9; for (const p of PLACES) { const d = Math.hypot(hero.position.x - p.x, hero.position.z - p.z); if (d < p.reach && d < bd) { best = p; bd = d; } }
  if (best !== near) { near = best; const act = $('act'), info = $('info'); $('hint').style.display = near ? 'none' : ''; if (near) { act.hidden = false; act.textContent = near.cta; info.hidden = false; info.innerHTML = '<b></b><span></span>'; info.firstChild.textContent = near.name; info.lastChild.textContent = near.text; } else { act.hidden = true; info.hidden = true; } }
}
function animate(t) {
  // forge : feu qui vacille, marteau, fumée
  forgeParts.fire.material.color.setHSL(0.07 + Math.sin(t * 9) * 0.01, 1, 0.5 + Math.sin(t * 13) * 0.06); forgeParts.glow.intensity = 8 + Math.sin(t * 11) * 1.6 + Math.sin(t * 17) * 0.9;
  const hp = (t % 3.2) / 3.2; forgeParts.hammer.rotation.x = hp < 0.18 ? -Math.sin(hp / 0.18 * Math.PI) * 1.2 : 0;
  forgeParts.smoke.forEach((s, i) => { const u = ((t * 0.25 + i / 6) % 1); s.position.set(0.35 + Math.sin(u * 5 + i) * 0.12, 2.9 + u * 1.6, -0.2); s.scale.setScalar(0.6 + u * 1.3); s.material.opacity = Math.sin(u * Math.PI) * 0.28; });
  portalTime.value = t; treeTime.value = t;
  for (const f of floaters) f.position.y = f.userData.y + Math.sin(t * f.userData.sp + f.userData.ph) * 0.2, f.rotation.y = t * 0.1;
  for (const c of clouds) { c.userData.a += c.userData.sp * 0.016; c.position.x = Math.cos(c.userData.a) * c.userData.d; c.position.z = Math.sin(c.userData.a) * c.userData.d; }
  for (const l of window.__lanterns) { const k = 0.85 + Math.sin(t * 7 + l.ph) * 0.08 + Math.sin(t * 13 + l.ph * 2) * 0.05; l.sp.material.opacity = k; l.lamp.scale.setScalar(0.96 + (k - 0.85) * 0.5); }
  for (const { f, px, pz } of fishes) { const u = f.userData, a = t * u.sp + u.ph; f.position.set(px + Math.cos(a) * u.r, ISLAND_TOP + 0.01 - 0.0, pz + Math.sin(a) * u.r); f.rotation.y = -a; f.getObjectByName('tail').rotation.y = Math.sin(t * 8 + u.ph) * 0.5; }
  { const p = fireflies.pts.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const [ph, sp] = fireflies.seeds[i]; p.setXYZ(i, fireflies.base[i * 3] + Math.sin(t * sp + ph) * 0.4, fireflies.base[i * 3 + 1] + Math.sin(t * sp * 1.3 + ph) * 0.25, fireflies.base[i * 3 + 2] + Math.cos(t * sp + ph) * 0.4); } p.needsUpdate = true; fireflies.pts.material.opacity = 0.55 + Math.sin(t * 2) * 0.3; }
  // tirelire : une pièce tombe toutes les secondsPerEuro secondes (au moins 2 s d'écart pour rester lisible)
  const gap = Math.max(2, tirelireSecs);
  if (t >= dropAt) { dropT = t; dropAt = t + gap; }
  const u = (t - dropT) / 1.2; if (dropT >= 0 && u >= 0 && u < 1) { coin.visible = true; coin.position.set(PLACES[5].x, ISLAND_TOP + 3.4 - 2.8 * u * u, PLACES[5].z); coin.rotation.y = u * 12; } else coin.visible = false;
  coin.userData.light.intensity = 1.6 + (u >= 0.9 && u < 1.4 ? 3 : 0) + Math.sin(t * 3) * 0.3;
}
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  if (mobile && now - lastFrame < 33) return;   // téléphone : 30 images par seconde
  lastFrame = now;
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  step(dt, t); animate(t);
  // caméra : suit le personnage, un peu plus haut et plus loin en portrait
  const portrait = innerHeight > innerWidth, k = portrait ? 1.35 : 1;
  look.set(hero.position.x * 0.8, 0.8, hero.position.z * 0.8 - 0.4); want.set(hero.position.x * 0.55, 7.2 * k, hero.position.z * 0.55 + 9.6 * k);
  camera.position.lerp(want, 1 - Math.exp(-dt * 3.2)); camera.lookAt(look);
  // étiquettes
  tags.forEach((el, i) => { const p = PLACES[i]; tmp.set(p.x, p.id === 'tirelire' ? 1.5 : p.id === 'forge' ? 3.2 : 3.0, p.z).project(camera); const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1; el.style.opacity = vis ? (near === p ? 1 : 0.78) : 0; el.style.transform = `translate(-50%,-50%) translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px,${(-tmp.y * 0.5 + 0.5) * innerHeight}px)`; });
  renderer.render(scene, camera);
}
camera.position.set(0, 8.5, 14); requestAnimationFrame(frame);
document.body.classList.add('ready');
