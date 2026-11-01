// Vue spatiale de comtesse.me (version de test). Assemble les composants : registre, trajectoire, défilement, états, monde, annotations, panneau.
import { buildRegistry, DOMAINS } from './registry.js';
import { CameraTimeline } from './camera-path.js';
import { buildKeys } from './sequences.js';
import { SpatialScrollController, normalizeWheel } from './scroll.js';
import { InteractionStateManager, STATE } from './state.js';
import { PerformanceManager, detectGpu } from './perf.js';
import { RotationRulerController } from './rulers.js';

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const registry = buildRegistry();
const items = registry.items;
for (const e of items) e.domainLabel = DOMAINS[e.domain];
const timeline = new CameraTimeline(buildKeys(registry));
for (const e of items) e.u = timeline.tags[e.id];                         // position de défilement du cadrage de chaque point d'intérêt
const pOf = (id) => registry.byId[id].u;
const ORDER = [...items].sort((a, b) => a.u - b.u);
const state = new InteractionStateManager();
const live = $('sp-live');
const say = (t) => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };
const store = { get() { try { return JSON.parse(sessionStorage.getItem('sp-state') || 'null'); } catch { return null; } }, set(v) { try { sessionStorage.setItem('sp-state', JSON.stringify(v)); } catch {} } };

/* ---------------------------------------------------------------- index accessible : même données, sans 3D */
function buildIndex() {
  const host = $('sp-index-list'); const groups = {};
  for (const e of items) if (e.kind !== 'hub') (groups[e.domain] ??= []).push(e);
  groups.experimentation = [...(groups.experimentation || []), ...registry.plates.map((p) => ({ ...p, domain: 'experimentation', id: p.id, kind: 'plate', index: -1 }))];
  host.innerHTML = Object.entries(groups).map(([d, list]) => `<section aria-labelledby="ix-${d}"><h3 id="ix-${d}">${DOMAINS[d]}</h3><ul>${list.map((e) => {
    const full = (e.study || e.slug) + '.html';
    return `<li><a class="sp-ix-t" href="${e.index >= 0 ? '#/' + e.id : full}" ${e.index >= 0 ? `data-id="${e.id}"` : ''}>${e.title}</a><span class="sp-ix-s">${e.sub || ''}</span>${e.stat ? `<span class="sp-ix-m">${e.stat.value}</span>` : ''}<a class="sp-ix-f" href="${full}">${e.study ? 'Étude' : 'Page du projet'}</a></li>`;
  }).join('')}</ul></section>`).join('');
}
buildIndex();

/* ---------------------------------------------------------------- rail de position (navigation directe) */
const rail = $('sp-rail');
rail.innerHTML = items.map((e) => `<li><button type="button" data-id="${e.id}" aria-label="${e.title}" title="${e.title}"></button></li>`).join('');

/* ---------------------------------------------------------------- cartes des zones sans objet : accueil, explorations, parcours */
const hub = $('sp-hubcards');
hub.innerHTML = `
<section class="sp-hubcard" data-hub="experiences" hidden aria-label="Explorations"><h2>Explorations</h2><p>Jeux, simulations et interfaces expérimentales. Chaque plaque ouvre le projet.</p>
<ul>${registry.plates.map((p) => `<li><a href="${p.slug}.html">${p.title}</a></li>`).join('')}</ul></section>
<section class="sp-hubcard" data-hub="parcours" hidden aria-label="Parcours et contact"><h2>Parcours et contact</h2>
<ul><li><a href="assets/cv-ats-mathieu-comtesse.pdf" type="application/pdf" target="_blank" rel="noopener">CV (PDF)</a></li><li><a href="experiences.html">Parcours et expériences</a></li><li><a href="gains.html">Gains et méthodologie</a></li><li><a href="blog.html">Études et publications</a></li><li><a href="https://www.linkedin.com/in/mathieu-comtesse-a226a1433/" target="_blank" rel="noopener">LinkedIn</a></li><li><a href="https://github.com/mathieu-comtesse" target="_blank" rel="noopener">GitHub</a></li><li><a href="mailto:mathieu@comtesse.me">mathieu@comtesse.me</a></li></ul></section>`;

/* ---------------------------------------------------------------- mode : immersif ou liste */
const canWebGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
let listMode = !canWebGL || qs.get('vue') === 'liste' || store.get()?.list === true;
const modeBtn = $('sp-mode');
function setList(on, persist = true) {
  listMode = on; document.body.classList.toggle('sp-list', on);
  $('sp-index').hidden = !on && !indexOpen; modeBtn.setAttribute('aria-pressed', String(on)); modeBtn.textContent = on ? 'Vue spatiale' : 'Vue liste';
  if (persist) store.set({ ...(store.get() || {}), list: on });
  if (on) { panel?.close(); }
}
let indexOpen = false, panel = null;
$('sp-open-index').addEventListener('click', () => { indexOpen = !indexOpen; $('sp-index').hidden = !indexOpen && !listMode; document.body.classList.toggle('sp-index-open', indexOpen); $('sp-open-index').setAttribute('aria-expanded', String(indexOpen)); if (indexOpen) $('sp-index').querySelector('a')?.focus(); });
$('sp-index').addEventListener('keydown', (e) => { if (e.key === 'Escape' && indexOpen) { $('sp-open-index').click(); $('sp-open-index').focus(); } });

if (!canWebGL) { document.body.classList.add('sp-nogl'); setList(true, false); modeBtn.hidden = true; say('Le rendu 3D n’est pas disponible. La liste des réalisations est affichée.'); }
else { setList(listMode, false); }
if (reduced) { document.body.classList.add('sp-reduced'); }
if (!canWebGL) { /* la suite exige WebGL */ }
else init();

function init() {
  const canvas = $('sp-canvas');
  const gl = canvas.getContext('webgl2');
  const perf = new PerformanceManager({ gpu: detectGpu(gl), onProfile: () => world.setProfile() });
  let world, annotations, rulers, hic, panelC;
  Promise.all([import('./world.js'), import('./annotations.js'), import('./panel.js'), import('./html-canvas.js')]).then(([W, A, P, H]) => {
    world = new W.SceneManager(canvas, registry, timeline, perf);
    try { world.init(); } catch (e) { console.warn(e); document.body.classList.add('sp-nogl'); setList(true, false); modeBtn.hidden = true; return; }
    addEventListener('resize', () => world.resize());
    const scroll = new SpatialScrollController({ length: timeline.length, reduced });
    let selectedId = null;
    panelC = new P.ProjectDetailPanel($('sp-panel'), { onClose: () => closeFiche(true) }); panel = panelC;
    hic = new H.HTMLCanvasAdapter(world); let hicOn = hic.init();
    // garde d'exécution : si l'API détectée refuse l'envoi de la texture (signature différente selon la version du navigateur), on retombe sur le DOM
    world.onRenderError = (e) => { if (hic.active) { hic.disable(String(e.message).slice(0, 140)); hicOn = false; } else console.error(e); };
    rulers = new RotationRulerController((rot, tilt) => { const m = world.machines.get(selectedId); if (m) { m.setRulers(rot, tilt); saveState(); } });
    annotations = new A.FloatingAnnotationManager($('sp-notes'), world, registry, { onSelect: (id) => select(id, { push: true }), onDeepen: (id, opener) => openFiche(id, opener), domains: DOMAINS }); annotations.addTags(world.pieces.tags);

    /* ---------- sélection, inspection, lecture ---------- */
    function saveState() { const rots = {}; for (const m of world.machines.values()) if (m.rot || m.tilt) rots[m.id] = [m.rot, m.tilt]; store.set({ ...(store.get() || {}), p: scroll.current, sel: selectedId, rots }); }
    function setHash(h, replace) { const u = location.pathname + location.search + h; if (location.hash === h) return; (replace ? history.replaceState : history.pushState).call(history, { sp: 1 }, '', u); }
    function select(id, { push = false, instant = false } = {}) {
      const e = registry.byId[id]; if (!e) return;
      if (e.kind === 'hub') { selectedId = null; rulers.show(false); $('sp-inspect').hidden = true; state.to(STATE.EXPLORATION); scroll.goTo(pOf(id), instant ? 0 : undefined); if (push) setHash(id === 'accueil' ? '' : '#/' + id); say(e.title); return; }
      selectedId = id; world.want(id);
      const m = world.machines.get(id);
      state.to(STATE.INSPECTION);
      const near = Math.abs(scroll.current - pOf(id)) < 140;
      if (!near) scroll.goTo(pOf(id), instant ? 0 : undefined);
      rulers.show(!!m); $('sp-inspect').hidden = false; $('sp-reset-view').hidden = !m;
      if (m) rulers.set(m.rot, m.tilt);
      if (push) setHash('#/' + id);
      say(e.title + '. ' + (e.sub || '') + (m ? ' Règles de rotation et d’inclinaison disponibles.' : ''));
      saveState();
    }
    function exitInspect(push) { selectedId = null; rulers.show(false); $('sp-inspect').hidden = true; state.to(STATE.EXPLORATION); if (push) setHash('', false); }
    function openFiche(id, opener) {
      const e = registry.byId[id]; if (!e) return; if (selectedId !== id) select(id);
      state.to(STATE.LECTURE); scroll.setLocked(true); document.body.classList.add('sp-reading');
      setHash('#/' + id + '/fiche'); panelC.open(e, e.domainLabel, opener);
    }
    function closeFiche(push) {
      if (!panelC.isOpen) return; panelC.close(); scroll.setLocked(false); document.body.classList.remove('sp-reading');
      state.to(selectedId ? STATE.INSPECTION : STATE.EXPLORATION); if (push) setHash(selectedId ? '#/' + selectedId : '', true);
    }

    /* ---------- routage : l'URL identifie le projet actif ---------- */
    function route(instant) {
      const m = location.hash.match(/^#\/([a-z0-9-]+)(\/fiche)?$/), saved = store.get();
      if (!m) { if (panelC.isOpen) closeFiche(false); if (selectedId) exitInspect(false); return false; }
      const id = m[1]; if (!registry.byId[id]) return false;
      if (panelC.isOpen && (!m[2] || selectedId !== id)) closeFiche(false);
      select(id, { instant });
      if (m[2]) { if (!panelC.isOpen || panelC.entry?.id !== id) openFiche(id); }
      return true;
    }
    addEventListener('popstate', () => route(false));
    addEventListener('hashchange', () => { if (!history.state?.sp) route(false); });

    /* ---------- entrées : molette, glisser, clavier ---------- */
    addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;                                              // zoom du navigateur : intact
      if (listMode || e.target.closest?.('.sp-index,.sp-panel,.sp-hubcard,.rf-ruler')) return;
      e.preventDefault();
      if (!state.cameraFree) return;
      if (selectedId && state.is(STATE.INSPECTION)) exitInspect(false);     // la molette rend la main à la caméra, qui revient exactement sur sa trajectoire
      const d = normalizeWheel(e);
      if (reduced) { stepBy(Math.sign(d), 250); return; }
      scroll.addPixels(d); hideHint();
    }, { passive: false });
    let lastStep = 0;
    function stepBy(dir, gap = 0) {
      const now = performance.now(); if (now - lastStep < gap || !dir) return; lastStep = now;
      const u = scroll.current, next = dir > 0 ? ORDER.find((e) => e.u > u + 60) : [...ORDER].reverse().find((e) => e.u < u - 60);
      if (next) select(next.id, { push: true });
    }
    let drag = null;
    const UI = 'button,a,input,select,textarea,summary,.sp-panel,.sp-index,.rf-ruler,.sp-hubcard,.sp-inspect,.sp-top,.sp-rail,.sp-blk';
    document.addEventListener('pointerdown', (e) => {
      if (e.button || listMode || e.target.closest?.(UI)) return;
      const hit = world.pick(e.clientX, e.clientY), m = hit && world.machines.get(hit);
      const onSel = !!hit && hit === selectedId && state.is(STATE.INSPECTION);
      drag = { x: e.clientX, y: e.clientY, hit, onSel, mode: null, v: onSel && m?.controls ? m.controlValue(world.t) : 0, moved: 0, t: e.pointerType };
      try { document.documentElement.setPointerCapture(e.pointerId); } catch {}
    });
    document.addEventListener('pointermove', (e) => {
      if (!drag) { if (e.pointerType !== 'touch') { const hit = world.pick(e.clientX, e.clientY); canvas.classList.toggle('sp-over', !!hit); } return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, my = e.clientY - (drag.ly ?? drag.y); drag.moved += Math.abs(e.clientX - (drag.lx ?? drag.x)) + Math.abs(my); drag.lx = e.clientX; drag.ly = e.clientY;   // écarts calculés : movementX/Y n'existe pas pour le toucher
      if (!drag.mode && drag.moved > 6) drag.mode = drag.onSel && Math.abs(dx) >= Math.abs(dy) ? 'control' : (drag.t === 'touch' ? 'scroll' : 'none');
      if (drag.mode === 'control') { const m = world.machines.get(selectedId); const ctl = m?.controls; if (ctl) m.setControl(drag.v + dx / Math.max(320, innerWidth * .6) * (ctl.max - ctl.min), world.t); canvas.classList.add('sp-grab'); }
      else if (drag.mode === 'scroll' && state.cameraFree) { scroll.addPixels(-my * 2.2); hideHint(); }
    });
    const endDrag = () => {
      if (!drag) return; const d = drag; drag = null; canvas.classList.remove('sp-grab');
      if (d.moved < 6) {                                                  // simple clic
        if (d.hit) { if (d.hit === selectedId) { const m = world.machines.get(d.hit); if (m?.controls) { const c = m.controls, n = m.controlValue(world.t) + c.step; m.setControl(n > c.max ? c.min : n, world.t); } } else select(d.hit, { push: true }); }
        else if (selectedId && state.is(STATE.INSPECTION)) { /* clic dans le vide : on garde l'inspection, Échap ou le bouton la quitte */ }
      }
    };
    document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('input,textarea,select,[contenteditable],.rf-ruler') || e.metaKey || e.ctrlKey || e.altKey) { if (e.key !== 'Escape') return; }
      if (e.key === 'Escape') { if (panelC.isOpen) { closeFiche(true); e.preventDefault(); } else if (indexOpen) { $('sp-open-index').click(); } else if (selectedId) { exitInspect(true); } return; }
      if (listMode || panelC.isOpen) return;
      if (e.target.closest?.('button,a,summary')) { if (!['PageDown', 'PageUp'].includes(e.key)) return; }
      const k = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (k) { stepBy(k, 180); e.preventDefault(); hideHint(); return; }
      if (e.key === 'Home') { select('accueil', { push: true }); e.preventDefault(); return; }
      const side = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (side && selectedId) { const m = world.machines.get(selectedId); if (m?.controls) { m.setControl(m.controlValue(world.t) + side * m.controls.step, world.t); e.preventDefault(); } }
    });

    /* ---------- navigation directe ---------- */
    document.addEventListener('click', (ev) => {
      const g = ev.target.closest?.('[data-goto]');
      if (g) { ev.preventDefault(); if (listMode) setList(false); const id = g.dataset.goto; select(id, { push: true }); if (g.hasAttribute('data-contact')) say('Contact : adresse e-mail et profils en bas à droite.'); return; }
      const r = ev.target.closest?.('#sp-rail button, a[data-id]');
      if (r) { ev.preventDefault(); if (listMode) setList(false); if (indexOpen) $('sp-open-index').click(); select(r.dataset.id, { push: true }); }
    });
    modeBtn.addEventListener('click', () => { setList(!listMode); if (!listMode) route(true); });
    $('sp-reset-view').addEventListener('click', () => { rulers.reset(); });
    $('sp-close-inspect').addEventListener('click', () => exitInspect(true));

    /* ---------- boucle ---------- */
    const hint = $('sp-hint'); let hintGone = false; function hideHint() { if (!hintGone) { hintGone = true; hint.classList.add('sp-gone'); } }
    const intro = $('sp-intro'), cards = [...document.querySelectorAll('.sp-hubcard')], dots = [...rail.querySelectorAll('button')];
    let last = performance.now(), lastCur = -1, lastSave = 0;
    const saved = store.get();
    if (!route(true) && saved && typeof saved.p === 'number' && !qs.has('reset')) { scroll.current = scroll.target = Math.min(timeline.length, Math.max(0, saved.p)); for (const [id, [r, t]] of Object.entries(saved.rots || {})) { const m = world.machines.get(id); if (m) { m.rot = r; m.tilt = t; } } }
    else for (const [id, [r, t]] of Object.entries(saved?.rots || {})) { const m = world.machines.get(id); if (m) { m.rot = r; m.tilt = t; } }
    world.resize(); document.body.classList.add('sp-ready');
    let inspectE = 0;
    function tick(now, raw, dt) {
      perf.frame(raw);
      const u = scroll.update(dt, now);
      if (state.is(STATE.NAVIGATION) && !scroll.moving) state.to(selectedId ? STATE.INSPECTION : STATE.EXPLORATION);
      // inspection : la pose d'inspection se superpose à la trajectoire, sans saut ; à la sortie la caméra revient sur la trajectoire au même u
      const want = selectedId && !scroll.tween && Math.abs(u - pOf(selectedId)) < 90 && (state.is(STATE.INSPECTION) || state.is(STATE.LECTURE)) ? 1 : 0;
      inspectE += (want - inspectE) * (1 - Math.exp(-dt * 4.2)); if (Math.abs(want - inspectE) < .002) inspectE = want;
      world.frame(u, dt, now, selectedId, inspectE);
      if (selectedId && state.is(STATE.INSPECTION) && !scroll.tween && Math.abs(u - pOf(selectedId)) > 700) exitInspect(true);
      annotations.update(world.camera.position, selectedId, state.is(STATE.LECTURE), inspectE); annotations.updateTags(world.camera.position, state.is(STATE.LECTURE));
      if (hicOn) hic.show(selectedId ? registry.byId[selectedId] : null);
      intro.classList.toggle('sp-away', u > 380);
      let nearCard = null, nd = 750; for (const c of cards) { const d = Math.abs(u - registry.byId[c.dataset.hub].u); if (d < nd) { nd = d; nearCard = c; } }
      for (const c of cards) { const on = c === nearCard && !state.is(STATE.LECTURE); if (c.hidden === on) c.hidden = !on; }
      let near = 0, bd = Infinity; items.forEach((e, i) => { const d = Math.abs(e.u - u); if (d < bd) { bd = d; near = i; } });
      if (near !== lastCur) { lastCur = near; dots.forEach((d, i) => { d.classList.toggle('sp-cur', i === near); if (i === near) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); }
      if (now - lastSave > 1500 && scroll.moving === false) { lastSave = now; saveState(); }
      if (qs.has('debug')) { const s = perf.stats; $('sp-debug').hidden = false; $('sp-debug').textContent = `u ${u.toFixed(0)} / ${timeline.length.toFixed(0)} · état ${state.state} · fov ${world.camera.fov.toFixed(1)}\nprofil ${s.profile} · ${s.fps} i/s mesurées · ${s.frameMs} ms (moy.) · pire ${s.worstMs} ms · ${s.frames} images\nWebGL init ${world.stats.webglInitMs} ms · modèles ${JSON.stringify(world.stats.modelMs)}\nHTML-in-Canvas : ${hic.status}\nGPU : ${s.gpu || 'inconnu'}\ndraw calls ${world.renderer.info.render.calls} · triangles ${world.renderer.info.render.triangles}`; }
    }
    let paused = false;
    function loop(now) {
      requestAnimationFrame(loop);
      const raw = Math.max(0, now - last), dt = Math.min(.05, raw / 1000); last = now;
      if (document.hidden || listMode || paused) { perf.winT = performance.now(); perf.win = 0; return; }
      tick(now, raw, dt);
    }
    requestAnimationFrame(loop);
    window.__spatial = { state, scroll, world, perf, registry, timeline, select, openFiche, closeFiche, hic, get hicOn() { return hic.active; }, get selected() { return selectedId; }, panel: panelC,
      /** Capture déterministe (vidéo, comparaisons) : suspend la boucle puis rend une image avec un pas de temps fixe. */
      pause(v = true) { paused = v; }, step(dt = 1 / 24) { last = performance.now(); tick(performance.now(), dt * 1000, dt); } };
    document.dispatchEvent(new CustomEvent('spatial-ready'));
  }).catch((e) => { console.error(e); document.body.classList.add('sp-nogl'); setList(true, false); modeBtn.hidden = true; });
}
