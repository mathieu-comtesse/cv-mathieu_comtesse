/* Télé JVC Video Capsule : sur l'étagère elle reste repliée en pyramide ; un clic la fait apparaître au premier plan, comme le livre photo.
   Le modèle s'y déploie avec son animation d'origine (le capot et l'écran basculent de 90° autour de la charnière arrière), puis un film tiré au hasard
   se lance sur l'écran (voir jvc-screen.js). Rien n'est hébergé ici : la lecture est assurée par YouTube. La télé se fait pivoter en 3D au doigt ou à la souris. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { createJvcScreen } from './jvc-screen.js?v=jvc3';

const MODEL = 'assets/jvc-video-capsule-3100r.glb';
const DEG = Math.PI / 180, DELAY = 0.45, OPEN_S = 1.3, VIEW_S = 1.9;
const ease = (t) => t * t * (3 - 2 * t);
const lerp = THREE.MathUtils.lerp;

export function createJvcTv({ onChange = () => {}, fallback = () => {} } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'film-album jvc-dialog';
  dialog.setAttribute('aria-label', 'Télé JVC Video Capsule : bandes-annonces de films');
  dialog.innerHTML = `<header><button class="film-close" type="button" aria-label="Quitter la télé"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
<div class="film-book jvc-stage"><canvas tabindex="0" role="application" aria-label="Télé JVC en 3D. Glisser pour la faire pivoter, plus et moins pour zoomer, Échap pour quitter."></canvas><p class="film-loading" role="status">Préparation de la télé…</p></div>`;
  document.body.append(dialog);
  const stage = dialog.querySelector('.jvc-stage'), canvas = stage.querySelector('canvas'), status = stage.querySelector('.film-loading');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let renderer, scene, camera, hinge, hingeQ, jvcGlass = null, corners, normal, hInv, loadTask, ready = false;
  let raf = 0, t0 = 0, hp = 0, returnFocus = null, press = null, screenOn = false, userZoom = 1, token = 0;
  const M = new THREE.Matrix4(), look = new THREE.Vector3(), nrm = new THREE.Vector3(), pts = [0, 1, 2, 3].map(() => new THREE.Vector3());
  const out = { pts: [[0, 0], [0, 0], [0, 0], [0, 0]], facing: 0, aspect: 1.13 };
  const view = { yaw: -38 * DEG, pitch: 22 * DEG, zoom: 1, target: new THREE.Vector3() };
  const from = { yaw: -38 * DEG, pitch: 22 * DEG, zoom: 1, target: new THREE.Vector3(), half: 4 };
  const goal = new THREE.Vector3(), to = { yaw: -90 * DEG, pitch: 8 * DEG, zoom: 1, target: new THREE.Vector3() };

  const common = (a, b) => { const s = new Set(); for (let p = a; p; p = p.parent) s.add(p); for (let p = b; p; p = p.parent) if (s.has(p)) return p; return null; };

  async function setup() {
    if (loadTask) return loadTask;
    loadTask = (async () => {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width:809px)').matches ? 1.5 : 2));
      renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose();
      scene.add(new THREE.HemisphereLight('#fff8ed', '#6f7768', 1.1));
      const key = new THREE.DirectionalLight('#fff8eb', 2.2); key.position.set(-3, 5, 6); scene.add(key);
      const rim = new THREE.DirectionalLight('#cfe0f5', 1.1); rim.position.set(4, 2, -5); scene.add(rim);
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
      const gltf = await new GLTFLoader().loadAsync(MODEL), model = gltf.scene; scene.add(model);
      const find = (re) => { let r = null; model.traverse((o) => { if (o.isMesh && re.test(o.name)) r = o; }); return r; };
      const hood = find(/^BodyTop_low/), screen = find(/^Screen_low/), glassMesh = find(/^ScreenGlass/), body = find(/^Body_low/);
      hinge = hood && screen ? common(hood, screen) : null;                        // « Empty.004 » : le pivot qui porte capot, cadre, écran et verre
      if (!hinge || hinge === model) throw new Error('charnière introuvable');
      // Le fichier n'a qu'un matériau « alpha BLEND » : corps opaque, verre seul transparent, écran à matériau propre (lueur animée).
      const opaque = screen.material.clone(); opaque.transparent = false; opaque.depthWrite = true; opaque.alphaTest = 0;
      const glass = screen.material.clone(); glass.transparent = true; glass.depthWrite = false;
      model.traverse((o) => { if (o.isMesh) { o.material = opaque; o.frustumCulled = false; } });
      glassMesh.material = glass;
      jvcGlass = opaque.clone(); jvcGlass.emissive.setRGB(0, 0, 0); screen.material = jvcGlass;
      const clip = (gltf.animations || []).flatMap((a) => a.tracks).find((t) => t.name.endsWith('.quaternion'));   // 1re image de l'animation = télé ouverte ; la pose chargée = fermée
      hingeQ = { closed: hinge.quaternion.clone(), open: clip ? new THREE.Quaternion().fromArray(clip.values, 0) : new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2) };
      const frame = (b) => { const bb = new THREE.Box3().setFromObject(body, true).union(new THREE.Box3().setFromObject(hinge, true)); return b ? b.copy(bb) : bb; };
      const shut = frame();                                                          // cadrage de la pyramide (sans le câble, hors champ)
      from.target.copy(shut.getCenter(new THREE.Vector3())); from.half = shut.getSize(new THREE.Vector3()).length() / 2 * 1.04;
      hinge.quaternion.copy(hingeQ.open); model.updateMatrixWorld(true);
      const bs = new THREE.Box3().setFromObject(screen, true), gb = new THREE.Box3().setFromObject(glassMesh, true), sz = bs.getSize(new THREE.Vector3()), c = bs.getCenter(new THREE.Vector3()), gc = gb.getCenter(new THREE.Vector3());
      const ax = sz.x < sz.z ? 'x' : 'z', rax = ax === 'x' ? 'z' : 'x', s = Math.sign(gc[ax] - c[ax]) || -1;   // normale = axe le plus mince, côté du verre
      normal = new THREE.Vector3(); normal[ax] = s;
      const up = new THREE.Vector3(0, 1, 0), r = new THREE.Vector3().crossVectors(up, normal), hw = sz[rax] / 2, hh = sz.y / 2;
      c[ax] = gc[ax] + s * 0.012;
      corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => c.clone().addScaledVector(r, a * hw).addScaledVector(up, b * hh));   // haut-gauche, haut-droit, bas-droit, bas-gauche
      hInv = hinge.matrixWorld.clone().invert();
      to.yaw = Math.atan2(normal.x, normal.z); to.target.copy(c);
      to.screenW = hw * 2; to.screenH = hh * 2;
      hinge.quaternion.copy(hingeQ.closed); model.updateMatrixWorld(true);
      new ResizeObserver(resize).observe(stage);
      ready = true; resize();
    })();
    return loadTask;
  }

  function resize() { if (renderer && stage.clientWidth) renderer.setSize(stage.clientWidth, stage.clientHeight, false); }

  function quad() {                                                                 // quadrilatère de l'écran en pixels de la scène ; caméra orthographique → parallélogramme exact
    if (!ready) return null;
    hinge.updateWorldMatrix(true, false); M.multiplyMatrices(hinge.matrixWorld, hInv);   // l'écran suit la charnière pendant l'ouverture
    const w = stage.clientWidth, h = stage.clientHeight;
    for (let i = 0; i < 4; i++) { pts[i].copy(corners[i]).applyMatrix4(M).project(camera); out.pts[i][0] = (pts[i].x + 1) / 2 * w; out.pts[i][1] = (1 - pts[i].y) / 2 * h; }
    out.aspect = corners[0].distanceTo(corners[1]) / corners[0].distanceTo(corners[3]);
    nrm.copy(normal).transformDirection(M); camera.getWorldDirection(look); out.facing = -nrm.dot(look);
    return out;
  }

  const jvc = createJvcScreen({
    container: stage, getScreen: quad, focus: () => {}, release: () => {}, getGlass: () => jvcGlass, isReady: () => hp > 0.98, fallback,
    onChange: (open) => { if (!open && dialog.open) dialog.close(); },
  });

  function orbit(half) {
    const a = stage.clientWidth / Math.max(1, stage.clientHeight);
    camera.left = -half * a; camera.right = half * a; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    const r = 60, cp = Math.cos(view.pitch);
    camera.position.set(view.target.x + Math.sin(view.yaw) * cp * r, view.target.y + Math.sin(view.pitch) * r, view.target.z + Math.cos(view.yaw) * cp * r);
    camera.lookAt(view.target); camera.updateMatrixWorld(true);
  }

  function tick(now) {
    raf = 0; if (!dialog.open || !ready) return;
    const t = reduced.matches ? 99 : (now - t0) / 1000;
    hp = Math.min(1, Math.max(0, (t - DELAY) / OPEN_S));
    hinge.quaternion.slerpQuaternions(hingeQ.closed, hingeQ.open, ease(hp));
    const vt = ease(Math.min(1, Math.max(0, (t - DELAY) / VIEW_S)));
    const asp = stage.clientWidth / Math.max(1, stage.clientHeight);
    if (vt < 1 || !screenOn) {                                                       // l'écran occupe ~44 % de la hauteur de la scène et au plus ~70 % de sa largeur, remonté pour laisser la place à la télécommande en bas
      const zoomOpen = from.half / Math.max(to.screenH * Math.cos(to.pitch) / 0.88, to.screenW / (1.4 * asp));
      goal.copy(to.target); goal.y -= from.half / zoomOpen * 0.2;
      view.yaw = lerp(from.yaw, to.yaw, vt); view.pitch = lerp(from.pitch, to.pitch, vt); view.target.lerpVectors(from.target, goal, vt); view.zoom = lerp(from.zoom, zoomOpen, vt);
    }
    if (!screenOn && hp >= 1 && vt >= 1) { screenOn = true; jvc.open(); }
    orbit(from.half / (view.zoom * userZoom));
    renderer.render(scene, camera);
    jvc.update(now);
    raf = requestAnimationFrame(tick);
  }

  const kick = () => { if (!raf && dialog.open) raf = requestAnimationFrame(tick); };

  function reset() {
    token++; cancelAnimationFrame(raf); raf = 0; screenOn = false; hp = 0; userZoom = 1; press = null;
    view.yaw = from.yaw; view.pitch = from.pitch; view.zoom = 1; view.target.copy(from.target);
    if (ready) hinge.quaternion.copy(hingeQ.closed);
  }

  const zoomBy = (k) => { userZoom = THREE.MathUtils.clamp(userZoom * k, 0.6, 4); };
  stage.addEventListener('pointerdown', (e) => { if (!ready || e.button !== 0) return; stage.setPointerCapture(e.pointerId); press = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointermove', (e) => {
    if (!press || press.id !== e.pointerId || !screenOn) return;
    view.yaw -= (e.clientX - press.x) * 0.008; view.pitch = THREE.MathUtils.clamp(view.pitch + (e.clientY - press.y) * 0.006, -1.2, 1.3);
    press.x = e.clientX; press.y = e.clientY;
  });
  stage.addEventListener('pointerup', () => { press = null; });
  stage.addEventListener('pointercancel', () => { press = null; });
  stage.addEventListener('wheel', (e) => { if (!screenOn) return; e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0012)); }, { passive: false });
  dialog.addEventListener('keydown', (e) => {
    if (e.target.closest?.('select,input,textarea,iframe')) return;
    if (e.key === '+' || e.key === '=') zoomBy(1.15); else if (e.key === '-') zoomBy(1 / 1.15);
  });

  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelector('.film-close').onclick = close;
  dialog.addEventListener('click', (e) => { if (e.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); });
  dialog.addEventListener('close', () => {
    jvc.close(); reset(); onChange(false);
    document.dispatchEvent(new CustomEvent('film-album-change', { detail: { open: false } }));
    returnFocus?.focus?.({ preventScroll: true });
  });

  return {
    open() {
      if (dialog.open) return;
      returnFocus = document.activeElement; dialog.showModal(); onChange(true);
      document.dispatchEvent(new CustomEvent('film-album-change', { detail: { open: true } }));
      const mine = ++token; status.hidden = false;
      setup().then(() => {
        if (mine !== token || !dialog.open) return;
        status.hidden = true; reset(); token = mine; resize(); t0 = performance.now(); kick();
      }).catch(() => { if (mine !== token) return; dialog.close(); fallback(); });
      dialog.querySelector('.film-close').focus({ preventScroll: true });
    },
    close,
    get isOpen() { return dialog.open; },
  };
}
