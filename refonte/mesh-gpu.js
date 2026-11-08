/* Rendu GPU partagé de maillages : module original, remplace mesh.wgsl (rendu externe).
   Contrat conservé : register(canvas, { frame, clear, redraw }) -> { publish(), drop(), unregister() }.
   `frame()` fournit les volumes d'une machine (positions, normales, indices, matrice monde, couleur linéaire, facteurs métal/rugosité),
   la lumière, la caméra (view, projection) ; ce module reconstruit la scène et la dessine avec WebGPURenderer de Three.js
   (WebGPU si disponible, sinon WebGL2 automatiquement), dans UN seul renderer partagé par toutes les machines, puis recopie
   l'image dans le canvas 2D de la machine visible. Un seul périphérique GPU, un seul swapchain, aucune ressource par machine hors géométries.
   Perte de périphérique : les machines retombent aussitôt sur le rendu Three.js local (source.redraw()), puis le moteur se reconstruit. */
const THREE_URL = new URL('../vendor/three-r187/three.webgpu.js', import.meta.url).href, TSL_URL = new URL('../vendor/three-r187/three.tsl.js', import.meta.url).href;

const sources = new Map();        // canvas -> { source, geoms:Set, ready }
let engine = null, starting = null, failed = false, webglOnly = false, strikes = 0;

async function start() {
  const [THREE, TSL] = await Promise.all([import(THREE_URL), import(TSL_URL)]);
  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true, forceWebGL: webglOnly });
  await renderer.init();
  renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  camera.matrixAutoUpdate = false;
  const sun = new THREE.DirectionalLight(0xffffff, 1), sky = new THREE.HemisphereLight(0xffffff, 0x8a96c0, 0.6);
  scene.add(sky, sun, sun.target);
  const geos = new WeakMap(), pool = [];
  const backend = renderer.backend;
  const e = { THREE, TSL, renderer, scene, camera, sun, sky, geos, pool, size: [0, 0], webgpu: !!backend?.isWebGPUBackend };
  const device = backend?.device;
  if (device?.lost) device.lost.then((info) => { console.warn('Périphérique GPU perdu :', info.reason, info.message); lose(e); });   // déclenche le repli puis la reconstruction
  return e;
}

function lose(e) {
  if (engine !== e) return;
  engine = null; starting = null;
  if (e.webgpu && !webglOnly) webglOnly = true;                  /* périphérique WebGPU perdu : on reconstruit en WebGL2 plutôt que de réessayer le même chemin */
  else if (++strikes > 3) { failed = true; }
  for (const s of sources.values()) if (s.ready) { s.ready = false; try { s.source.redraw?.(); } catch {} }
  try { e.renderer.dispose(); } catch {}
  setTimeout(() => ensure(), 1500);
}

function ensure() {
  if (engine || starting || failed) return starting;
  starting = start().then((e) => { engine = e; starting = null; return e; }).catch((err) => { failed = true; starting = null; console.warn('Rendu GPU partagé indisponible, rendu Three.js local conservé', err); });
  return starting;
}

/* Un seul matériau pour toutes les pièces : la couleur linéaire et (métal, rugosité) sont portées par deux attributs constants par pièce.
   Un seul pipeline GPU à compiler au lieu d'un par couleur (plusieurs dizaines par machine). */
function sharedMaterial(e, glass) {
  const k = glass ? 'glass' : 'solid'; if (e[k]) return e[k];
  const { MeshStandardNodeMaterial, DoubleSide } = e.THREE, { attribute, float } = e.TSL;
  const m = new MeshStandardNodeMaterial({ side: DoubleSide });
  const pbr = attribute('ppbr', 'vec3');
  m.colorNode = attribute('pcolor', 'vec3'); m.metalnessNode = pbr.x; m.roughnessNode = pbr.y.max(float(.0525));
  if (glass) { m.transparent = true; m.depthWrite = false; m.opacityNode = pbr.z; }
  return (e[k] = m);
}
function variantOf(e, g, color, f, opacity, owner) {
  const key = color[0].toFixed(3) + ',' + color[1].toFixed(3) + ',' + color[2].toFixed(3) + ',' + f[0].toFixed(2) + ',' + f[1].toFixed(2) + ',' + opacity.toFixed(2);
  let per = e.geos.get(g); if (!per) { per = new Map(); e.geos.set(g, per); }
  let bg = per.get(key);
  if (!bg) {
    const { BufferGeometry, BufferAttribute } = e.THREE; let base = per.base;
    if (!base) { base = per.base = { position: new BufferAttribute(g.positions, 3), normal: new BufferAttribute(g.normals, 3), index: new BufferAttribute(g.indices, 1) }; }
    const n = g.positions.length / 3, c = new Float32Array(n * 3), q = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = color[0]; c[i * 3 + 1] = color[1]; c[i * 3 + 2] = color[2]; q[i * 3] = f[0]; q[i * 3 + 1] = f[1]; q[i * 3 + 2] = opacity; }
    bg = new BufferGeometry(); bg.setAttribute('position', base.position); bg.setAttribute('normal', base.normal); bg.setIndex(base.index);
    bg.setAttribute('pcolor', new BufferAttribute(c, 3)); bg.setAttribute('ppbr', new BufferAttribute(q, 3));
    per.set(key, bg); owner.geoms.add(bg);
  }
  return bg;
}

function paint(e, frame, canvas, ctx, owner) {
  const { THREE, renderer, scene, camera, pool } = e, w = canvas.width, h = canvas.height;
  if (e.size[0] !== w || e.size[1] !== h) { renderer.setSize(w, h, false); e.size = [w, h]; }
  camera.projectionMatrix.fromArray(frame.projection); camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.matrixWorldInverse.fromArray(frame.view); camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
  const L = frame.lighting.light, d = L.direction;
  e.sun.color.setRGB(L.color[0], L.color[1], L.color[2]); e.sun.intensity = L.intensity * LIGHT_GAIN;
  e.sun.position.set(-d[0] * 50, -d[1] * 50, -d[2] * 50); e.sun.target.position.set(0, 0, 0); e.sun.target.updateMatrixWorld();
  e.sky.intensity = SKY_GAIN;
  let n = 0;
  for (const dr of frame.draws) {
    let m = pool[n];
    if (!m) { m = new THREE.Mesh(); m.matrixAutoUpdate = false; m.frustumCulled = false; pool.push(m); scene.add(m); }
    const op = dr.opacity ?? 1; m.geometry = variantOf(e, dr.geometry, dr.color, dr.factors, op, owner); m.material = sharedMaterial(e, op < 1); m.renderOrder = op < 1 ? 2 : 0;
    m.matrix.fromArray(dr.world); m.matrixWorld.copy(m.matrix); m.visible = true; n++;
  }
  for (let i = n; i < pool.length; i++) pool[i].visible = false;
  renderer.render(scene, camera);
  ctx.drawImage(renderer.domElement, 0, 0, w, h);
}
const LIGHT_GAIN = 2.2, SKY_GAIN = 1.6;

export function register(canvas, source) {
  const entry = { source, geoms: new Set(), ready: false, ctx: null };
  sources.set(canvas, entry);
  const bridge = {
    publish() {
      if (failed) return false;
      if (!engine) { ensure(); return false; }                       // pas prêt : l'appelant dessine avec Three.js local
      if (!entry.ctx) { entry.ctx = canvas.getContext('2d'); if (!entry.ctx) return false; }   // canvas déjà pris par un contexte WebGL : rendu propre conservé
      const frame = source.frame(); if (!frame || !frame.view) return false;
      if (!entry.ready) { entry.ready = true; source.clear?.(); }
      try { paint(engine, frame, canvas, entry.ctx, entry); } catch (err) { console.warn('Rendu GPU partagé : image abandonnée', err); entry.ready = false; source.redraw?.(); lose(engine); return false; }
      return true;
    },
    defer() { return false; },
    drop() { if (entry.ready) { entry.ready = false; source.redraw?.(); } },
    unregister() { entry.ready = false; for (const g of entry.geoms) g.dispose(); entry.geoms.clear(); sources.delete(canvas); }
  };
  ensure();
  return bridge;
}
export { register as r };
