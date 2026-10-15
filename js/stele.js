/* Stèle de Burdigala : un clic sur la pierre de la pièce l'affiche en 3D au premier plan (comme le livre photo et la télé), et son inscription latine
 * « se traduit » sous les yeux, lettre à lettre (le latin et le grec brouillés se posent en français) : trois ans de latin, trois ans de grec, racontés avec l'humour des épitaphes.
 * Modèle : « Low Poly Bordeaux 2 Game Ready » d'Arthur.Zim, CC BY 4.0. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const MODEL = 'assets/stele-bordeaux.glb?v=stele1';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** [latin gravé, traduction]. Les formules sont authentiques (D.M., Veni vidi, Graecum est non legitur, S.T.T.L., H.S.E.) ; l'humour est de la maison. */
export const LINES = [
  ['D · M · ET · MAGISTRIS · SVIS', 'Aux dieux Mânes et à ses professeurs (qui ne sont pas morts, mais ont beaucoup souffert).'],
  ['MATTHAEO · COMITISSAE · VIRO · FORTISSIMO', 'À Mathieu Comtesse, homme très courageux. Son nom est féminin (comitissa, « la comtesse »), sa grammaire, impeccable : il a toujours accordé.'],
  ['QVI · TRES · ANNOS · LINGVAM · LATINAM · ET · TRES · ALIOS · GRAECAM · DOMVIT', 'Qui dompta la langue latine pendant trois ans et la grecque pendant trois autres : six ans de déclinaisons, pas une seule remboursée.'],
  ['VENI · VIDI · DECLINAVI', 'Je suis venu, j’ai vu, j’ai décliné. (Rosa, rosa, rosam… et toute la famille.)'],
  ['GRAECVM · EST · NON · LEGITVR · SED · ILLE · LEGIT', '« C’est du grec, cela ne se lit pas », disaient les copistes du Moyen Âge. Lui, si.'],
  ['VERSIONEM · SINE · LEXICO · NVNQVAM · RELIQVIT', 'Il n’a jamais quitté une version sans son dictionnaire. Le Gaffiot, lui, pèse encore sur sa conscience.'],
  ['QVICQVID · LATINE · DICTVM · SIT · ALTVM · VIDETVR', 'Tout ce qui est dit en latin paraît profond. Y compris cette stèle.'],
  ['SIT · EI · TERRA · LEVIS · ET · SVBIVNCTIVVS · FACILIS', 'Que la terre lui soit légère, et le subjonctif plus léger encore.'],
  ['H · S · E', 'Hic situs est : « ci-gît ». Rassurez-vous, la stèle est honorifique : l’intéressé se porte très bien et s’est remis à la grammaire, par plaisir.'],
];
const DESC = 'Trois ans de latin, trois ans de grec ancien : de quoi apprendre que toute règle a ses exceptions, que tout verbe a ses irrégularités, et que « ça se traduit facilement » est la phrase la plus dangereuse de l’Antiquité.';
const GLYPHS = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩABCDEFGHIJLMNOPQRSTVXY·';

export function createStele(onChange = () => {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'film-album stele-dialog';
  dialog.setAttribute('aria-label', 'Stèle de Burdigala : trois ans de latin, trois ans de grec');
  dialog.innerHTML = `<header><button class="film-close" type="button" aria-label="Quitter la stèle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
<div class="stele-wrap"><div class="film-book stele-view"><canvas tabindex="0" role="application" aria-label="Stèle en 3D. Glisser pour la faire pivoter, plus et moins pour zoomer, Échap pour quitter."></canvas><p class="film-loading" role="status">Préparation de la stèle…</p></div>
<div class="stele-text"><p class="stele-kicker">Burdigala · stèle commémorative</p><div class="stele-lines" aria-live="polite"></div><p class="stele-desc" hidden></p>
<button class="stele-translate" type="button">Traduire du latin</button></div></div>`;
  document.body.append(dialog);
  const stage = dialog.querySelector('.stele-view'), canvas = stage.querySelector('canvas'), status = stage.querySelector('.film-loading');
  const box = dialog.querySelector('.stele-lines'), desc = dialog.querySelector('.stele-desc'), toggle = dialog.querySelector('.stele-translate');
  const rows = LINES.map(([la, fr]) => { const p = document.createElement('p'); p.className = 'stele-row'; p.textContent = la; p.dataset.la = la; p.dataset.fr = fr; p.lang = 'la'; box.append(p); return p; });
  desc.textContent = DESC;
  let french = false, timers = [], frames = new Set(), runId = 0;

  /* ─── effet de traduction : chaque ligne se brouille (latin et grec mêlés) puis se pose, de gauche à droite, en français ─── */
  function morph(p, to, delay, id) {
    const from = p.textContent, N = Math.max(from.length, to.length), dur = reduced.matches ? 0 : 620 + N * 7;
    const start = performance.now() + delay;
    const step = (now) => {
      frames.delete(raf);
      if (id !== runId) return;
      const k = dur ? Math.min(1, Math.max(0, (now - start) / dur)) : 1;
      if (k <= 0) { raf = requestAnimationFrame(step); frames.add(raf); return; }
      let out = '';
      const settled = Math.floor(k * to.length), scrambleTo = Math.min(N, Math.floor(k * N * 1.15) + 3);
      for (let i = 0; i < N; i++) {
        if (i < settled) out += to[i];
        else if (i < scrambleTo) out += to[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += from[i] ?? '';
      }
      p.textContent = k >= 1 ? to : out;
      p.classList.toggle('settling', k < 1);
      if (k < 1) { raf = requestAnimationFrame(step); frames.add(raf); }
    };
    let raf = requestAnimationFrame(step); frames.add(raf);
  }
  function translate(toFrench) {
    french = toFrench; runId++; frames.forEach(cancelAnimationFrame); frames.clear();
    const id = runId;
    rows.forEach((p, i) => { p.lang = toFrench ? 'fr' : 'la'; p.classList.toggle('fr', toFrench); morph(p, toFrench ? p.dataset.fr : p.dataset.la, i * (reduced.matches ? 0 : 340), id); });
    desc.hidden = !toFrench;
    toggle.textContent = toFrench ? 'Revoir le latin' : 'Traduire du latin';
  }
  toggle.onclick = () => translate(!french);

  /* ─── la pierre en 3D ─── */
  let renderer, scene, camera, pivot, loadTask, ready = false, raf = 0, press = null, auto = true, userZoom = 1, size = 1, idle = 0;
  const view = { yaw: 0.45, pitch: 0.08 };
  async function setup() {
    if (loadTask) return loadTask;
    loadTask = (async () => {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width:809px)').matches ? 1.5 : 2)); renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; pm.dispose();
      scene.add(new THREE.HemisphereLight('#fff6e6', '#5d6458', 1.1));
      const key = new THREE.DirectionalLight('#fff3dc', 2.6); key.position.set(-2.4, 2.2, 3.4); scene.add(key);
      const rim = new THREE.DirectionalLight('#cddcf0', 1.2); rim.position.set(3, 1, -3); scene.add(rim);
      camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60); pivot = new THREE.Group(); scene.add(pivot);
      const g = (await new GLTFLoader().loadAsync(MODEL)).scene;
      g.traverse((o) => { if (o.isMesh) { o.material.side = THREE.DoubleSide; o.frustumCulled = false; } });
      const bb = new THREE.Box3().setFromObject(g, true), c = bb.getCenter(new THREE.Vector3()); size = bb.getSize(new THREE.Vector3()).y;
      g.position.sub(c); pivot.add(g); g.scale.setScalar(1);
      new ResizeObserver(resize).observe(stage); ready = true; resize();
    })();
    return loadTask;
  }
  function resize() { if (renderer && stage.clientWidth) { renderer.setSize(stage.clientWidth, stage.clientHeight, false); camera.aspect = stage.clientWidth / stage.clientHeight; camera.updateProjectionMatrix(); } }
  function tick(now) {
    raf = 0; if (!dialog.open || !ready) return;
    if (auto && !press && !reduced.matches) view.yaw += 0.0035;
    pivot.rotation.set(view.pitch, view.yaw, 0, 'YXZ');
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2, d = Math.max(size * 0.62 / Math.tan(vf), (size * 0.38) / (Math.tan(vf) * camera.aspect)) / userZoom;
    camera.position.set(0, 0, d); camera.lookAt(0, 0, 0); renderer.render(scene, camera);
    raf = requestAnimationFrame(tick); void now;
  }
  const kick = () => { if (!raf && dialog.open) raf = requestAnimationFrame(tick); };
  const zoomBy = (k) => { userZoom = THREE.MathUtils.clamp(userZoom * k, 0.7, 3); };
  stage.addEventListener('pointerdown', (e) => { if (!ready || e.button !== 0) return; stage.setPointerCapture(e.pointerId); press = { id: e.pointerId, x: e.clientX, y: e.clientY }; auto = false; });
  stage.addEventListener('pointermove', (e) => { if (!press || press.id !== e.pointerId) return; view.yaw += (e.clientX - press.x) * 0.008; view.pitch = THREE.MathUtils.clamp(view.pitch + (e.clientY - press.y) * 0.006, -1.1, 1.1); press.x = e.clientX; press.y = e.clientY; });
  stage.addEventListener('pointerup', () => { press = null; });
  stage.addEventListener('pointercancel', () => { press = null; });
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0012)); auto = false; }, { passive: false });
  dialog.addEventListener('keydown', (e) => { if (e.key === '+' || e.key === '=') zoomBy(1.15); else if (e.key === '-') zoomBy(1 / 1.15); else if (e.key === 'ArrowLeft') { view.yaw -= 0.2; auto = false; } else if (e.key === 'ArrowRight') { view.yaw += 0.2; auto = false; } });

  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelector('.film-close').onclick = close;
  dialog.addEventListener('click', (e) => { if (e.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); });
  let returnFocus = null;
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(raf); raf = 0; frames.forEach(cancelAnimationFrame); frames.clear(); runId++; timers.forEach(clearTimeout); timers = []; press = null;
    onChange(false); document.dispatchEvent(new CustomEvent('film-album-change', { detail: { open: false } })); returnFocus?.focus?.({ preventScroll: true });
  });
  return {
    open() {
      if (dialog.open) return;
      returnFocus = document.activeElement; dialog.showModal(); onChange(true); document.dispatchEvent(new CustomEvent('film-album-change', { detail: { open: true } }));
      french = false; rows.forEach((p) => { p.textContent = p.dataset.la; p.classList.remove('fr', 'settling'); p.lang = 'la'; }); desc.hidden = true; toggle.textContent = 'Traduire du latin';
      view.yaw = 0.45; view.pitch = 0.08; auto = true; userZoom = 1; status.hidden = false;
      setup().then(() => { if (!dialog.open) return; status.hidden = true; resize(); kick(); }).catch(() => { status.textContent = 'La stèle n’a pas pu être chargée.'; });
      timers.push(setTimeout(() => { if (dialog.open && !french) translate(true); }, reduced.matches ? 0 : 2300));          // la traduction se lance d'elle-même, le bouton permet de revenir au latin
      dialog.querySelector('.film-close').focus({ preventScroll: true });
    },
    close,
    get isOpen() { return dialog.open; },
  };
}
