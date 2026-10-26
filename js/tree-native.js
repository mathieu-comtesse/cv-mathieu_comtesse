/* Arbres du jardin par le moteur d'arbres natif (vendor-trees) : vraie géométrie 3D, saisons tirées au hasard
   (jamais l'hiver), vent aléatoire commun et feuilles qui tombent. Si le moteur ne démarre pas, l'arbre low poly
   de tree-gen.js prend sa place. */
import { THREE } from './kit.js?v=cv-scene-v29';
import { makeTree, treeWind, stepWind } from './tree-gen.js?v=lp1';

const SEASONS = ['spring', 'summer', 'autumn'];
const FILES = ['loader', 'a', 'b', 'c', 'gen', 'forest'];
let enginePromise = null;
const loadScript = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
function engine() {
  if (!enginePromise) enginePromise = (async () => {
    if (!window.NativeTreeForest) for (const f of FILES) await loadScript(new URL(`../vendor-trees/${f}.js?v=nt3`, import.meta.url).href);
    // les arbres sont rattachés au jardin : la scène et le rendu demandés par la forêt ne servent qu'à sa vérification
    return window.NativeTreeForest.create({ scene: new THREE.Scene(), renderer: { isWebGLRenderer: true }, tint: '#ffffff' });
  })();
  return enginePromise;
}

const living = [];
let forest = null, last = 0;

/** silhouette d'une feuille, de hauteur 1 environ, pétiole à l'origine */
function leafShape(species) {
  const s = new THREE.Shape();
  if (species === 'ginkgo') {   // éventail
    s.moveTo(0, 0); s.lineTo(-0.08, 0.3); s.quadraticCurveTo(-0.55, 0.55, -0.45, 0.95);
    s.quadraticCurveTo(-0.2, 1.05, -0.02, 0.85); s.lineTo(0.02, 0.85); s.quadraticCurveTo(0.2, 1.05, 0.45, 0.95);
    s.quadraticCurveTo(0.55, 0.55, 0.08, 0.3); s.lineTo(0, 0);
  } else if (species === 'maple') {   // cinq lobes pointus
    const pts = [[0, 0], [-0.12, 0.2], [-0.5, 0.15], [-0.35, 0.4], [-0.55, 0.7], [-0.2, 0.62], [0, 1], [0.2, 0.62], [0.55, 0.7], [0.35, 0.4], [0.5, 0.15], [0.12, 0.2]];
    s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); s.lineTo(0, 0);
  } else if (species === 'cherry' || species === 'weeping') {   // pétale arrondi, encoché au bout
    s.moveTo(0, 0); s.bezierCurveTo(-0.45, 0.25, -0.4, 0.9, -0.12, 0.95); s.lineTo(0, 0.85); s.lineTo(0.12, 0.95);
    s.bezierCurveTo(0.4, 0.9, 0.45, 0.25, 0, 0);
  } else {   // aiguille fine
    s.moveTo(0, 0); s.quadraticCurveTo(-0.07, 0.5, 0, 1); s.quadraticCurveTo(0.07, 0.5, 0, 0);
  }
  return s;
}

/** feuilles qui tombent : prises au hasard dans la couronne, couleurs de la palette courante de l'arbre */
function fallingLeaves(t) {
  const u = t.leaves.material.uniforms, size = (u.uLeafSize?.value || 0.15) * 1.3, NF = t.species === 'pine' ? 6 : 18;
  const geo = new THREE.ShapeGeometry(leafShape(t.species), 3); geo.scale(size, size, size);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), NF);
  mesh.frustumCulled = false;
  const src = t.leaves.geometry.attributes.iPos, d = new THREE.Object3D(), c = new THREE.Color();
  const parts = Array.from({ length: NF }, () => ({ on: false, x: 0, y: 0, z: 0, vy: 0, ph: Math.random() * 6.28, sp: 0.8 + Math.random() * 1.2, rot: Math.random() * 6.28 }));
  const hide = (n) => { d.position.set(0, -50, 0); d.scale.setScalar(1e-4); d.updateMatrix(); mesh.setMatrixAt(n, d.matrix); };
  for (let n = 0; n < NF; n++) { hide(n); mesh.setColorAt(n, c.set('#ffffff')); }
  mesh.userData.step = (dt, now, rate, sc) => {
    for (let n = 0; n < NF; n++) {
      const p = parts[n];
      if (!p.on) {
        if (Math.random() > dt * rate) { hide(n); continue; }
        const k = (Math.random() * src.count) | 0, pal = u['uPal' + ((Math.random() * 4) | 0)]?.value;
        p.x = src.getX(k); p.y = src.getY(k); p.z = src.getZ(k); p.vy = (0.12 + Math.random() * 0.15) / sc; p.on = true;
        if (pal) { mesh.setColorAt(n, c.setRGB(pal.x, pal.y, pal.z)); mesh.instanceColor.needsUpdate = true; }
      }
      p.y -= p.vy * dt * (0.6 + treeWind.value * 0.5);
      p.x += (Math.sin(now * p.sp + p.ph) * 0.05 + 0.04 * treeWind.value) * dt / sc; p.z += Math.cos(now * p.sp * 0.7 + p.ph) * 0.03 * dt / sc; p.rot += dt * p.sp * 1.6;
      if (p.y < 0.02) { p.on = false; hide(n); continue; }
      d.position.set(p.x, p.y, p.z); d.rotation.set(p.rot, p.ph + p.rot * 0.5, p.rot * 0.7); d.scale.setScalar(1); d.updateMatrix(); mesh.setMatrixAt(n, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return mesh;
}

/** arbre du jardin : un groupe vide tout de suite, rempli par l'arbre natif (ou, à défaut, par l'arbre low poly) */
export function makeLivingTree(species, seed = 1, H = 2) {
  const g = new THREE.Group();
  engine().then((f) => {
    forest = f;
    const season = SEASONS[(Math.random() * SEASONS.length) | 0];
    const tree = f.addTree({ species, season, seed, wind: treeWind.value });
    const L = { g, tree, species, H, fall: null, next: performance.now() / 1000 + 40 + Math.random() * 80 };
    attach(L); living.push(L);
  }).catch((e) => { console.warn('arbres natifs indisponibles', e); g.add(makeTree(species, seed, H)); });
  return g;
}
function attach(L) {
  const o = L.tree.object3D, d = forest.trees.find((t) => t.group === o);
  const sc = L.H / (d.leaves.material.uniforms.uHeight?.value || 4);
  o.position.set(0, 0, 0); o.scale.setScalar(sc); L.g.add(o); L.sc = sc;
  L.fall = fallingLeaves(d); L.data = d; o.add(L.fall);
}

/** à appeler à chaque image par le jardin */
export function updateLivingTrees(night) {
  if (!forest) return;
  const now = performance.now() / 1000, dt = Math.min(0.05, last ? now - last : 0.016); last = now;
  stepWind(now);
  const k = night ? 0.5 : 1;
  for (const L of living) {
    // changement de saison de temps en temps : l'arbre est régénéré dans la nouvelle saison
    if (now > L.next) {
      const cur = L.tree.season; let nx; do { nx = SEASONS[(Math.random() * 3) | 0]; } while (nx === cur);
      L.tree.setSeason(nx); attach(L); L.next = now + 60 + Math.random() * 120;
    }
    L.tree.setWind(0.25 + treeWind.value * 0.6);
    L.data.tint = L.species === 'pine' || L.tree.season === 'summer' ? [k * 0.8, k * 0.95, k * 0.6] : [k, k, k];   // le vert d'été du moteur tire sur le cyan : ramené vers le vert
    const rate = L.species === 'pine' ? 0.15 : ({ spring: 0.5, summer: 0.15, autumn: 1.1 }[L.tree.season] || 0.3) * (0.4 + treeWind.value * 0.6);
    L.fall.material.color.setScalar(k);
    L.fall.userData.step(dt, now, rate, L.sc);
  }
  forest.update(dt);
}
