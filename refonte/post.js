import './comtesse-motion.js';
// Page de projet : barre, pied de page, apparitions ; pour les projets pro, la machine animée est posée sur le plan blueprint
// de l'accueil (même caméra en perspective, mêmes règles « Tourner » / « Incliner »).
import './footer.js';
import './navfx.js';
import './viewbtn.js';
if (document.querySelector('.rf-code')) import('./hl.js').catch(() => {});   // coloration des extraits de code des études
import * as THREE from 'three';
import { initBlueprint } from './blueprint-hero.js';
import { diagOn, mark } from './diag.js';
import { initRulers } from './rulers.js';
import { framingOf } from './m3d/registry.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const els = document.querySelectorAll('.rf-post-body > *');
els.forEach((e) => e.classList.add('rf-rv'));
if (reduced || !('IntersectionObserver' in window)) els.forEach((e) => e.classList.add('rf-in'));
else {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rf-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .05 });
  els.forEach((e) => io.observe(e));
}

/* Dessins d'origine du livre posés sur le blueprint (piscine, Reporteur Q18, VRE VM) : figures-livre/NN.html, sans plaque ni commandes */
/* figures du livre (iframe) à la place de la machine 3D ; le Reporteur Q18 (moteur) a sa machine : ?machines=old rend l'ancienne figure pour comparaison */
const BP_FIG = /[?&]machines=old\b/.test(location.search) ? { moteur: '16', pp: '52', vm: '69' } : {};
const fig = document.querySelector('.rf-post-fig[data-fig]');
const bpCanvas = document.getElementById('rf-bp');
const stage = document.getElementById('stage');

if (fig && bpCanvas && stage) {
  /* ---- caméra : azimut 36° comme la pièce de l'accueil, en perspective, liée au plan ---- */
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 400);
  const FR = framingOf(fig.dataset.fig);   // cadrage propre à la machine (refonte/m3d/registry.js)
  const mobile = () => innerWidth < 700;
  const AIM_Y = () => (mobile() ? FR.aimYm : FR.aimY);   // la visée est au-dessus du plan : la machine se place sous le titre et les boutons
  const focus = { f: 0, to: 0, d: 0, sz: 0, lv: 0, p: null, yaw: 0, pitch: FR.pitch * Math.PI / 180 };   // vue rapprochée : la caméra principale reste, elle s'approche d'un point d'ancrage
  const projV = new THREE.Vector3();
  const visH = () => 2 * Math.hypot(...cam.position.toArray().map((v, i) => v - [cam.__tx ?? 0, cam.__ty ?? AIM_Y(), cam.__tz ?? 0][i])) * Math.tan(15 * Math.PI / 180);
  const placeCam = (yaw, pitch = FR.pitch * Math.PI / 180) => {
    focus.yaw = yaw; focus.pitch = pitch;
    const F = focus.f * focus.f * (3 - 2 * focus.f), P = focus.p, cp = Math.cos(pitch), fitK = cam.aspect < 1.1 ? Math.min(2.1, Math.max(1, 1.1 / Math.max(.4, cam.aspect) * .85)) : 1, base = FR.dist * fitK, near = Math.max(11, base * (mobile() ? .6 : .38)), dist = (base + (near - base) * F) * (1 - .2 * focus.d);   // gros plan sur un organe : plus mesuré sur mobile
    const tx = .1 + ((P ? P.x : .1) - .1) * F, ty = AIM_Y() + ((P ? P.y : AIM_Y()) - AIM_Y()) * F, tz = -.2 + ((P ? P.z : -.2) + .2) * F;
    /* panneau Explorer ouvert : la composition se décale (bureau : vers la gauche, mobile : vers le haut) au lieu d'être recouverte */
    const vis = 2 * dist * Math.tan(15 * Math.PI / 180), panX = innerWidth < 900 ? 0 : focus.sz / 2 * cam.aspect * vis, liftY = innerWidth < 900 ? focus.lv : .3 * focus.sz * vis;   // le décalage suit la taille réelle du panneau (bureau : largeur ; mobile : hauteur du tiroir)
    const tx2 = tx + Math.cos(yaw) * panX, tz2 = tz - Math.sin(yaw) * panX, ty2 = ty - liftY;
    cam.position.set(tx2 + Math.sin(yaw) * cp * dist, ty2 + Math.sin(pitch) * dist, tz2 + Math.cos(yaw) * cp * dist);
    cam.lookAt(tx2, ty2, tz2); cam.__tx = tx2; cam.__ty = ty2; cam.__tz = tz2; cam.updateMatrixWorld(true);
  };
  const bp = initBlueprint(bpCanvas, stage);
  bp.plane.scale.setScalar(2.6);          // plan plus étendu : pas d'horizon noir à ce faible angle

  /* ---- la machine : modèle 3D posé sur le plan, rendu avec la même caméra (même perspective, même profondeur) ---- */
  const view = { yaw: FR.yaw * Math.PI / 180 };
  const aspect = () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); placeCam(focus.yaw, focus.pitch); machine?.resize(); };
  let machine = null, firstR = 0;
  placeCam(view.yaw); bp.link(cam);
  aspect(); addEventListener('resize', aspect);
  const rulers = document.querySelectorAll('.rf-ruler');   // les règles ne se voient que sur le blueprint, tant que la machine est visible
  const canvas = document.createElement('canvas'); canvas.className = 'rf-m3d'; canvas.setAttribute('aria-hidden', 'true'); document.body.append(canvas);
  if (BP_FIG[fig.dataset.fig]) {
    canvas.remove(); fig.classList.add('rf-bp-fig'); document.body.classList.add('rf-bp-page');
    const fr = document.createElement('iframe');
    fr.className = 'rf-bp-frame'; fr.src = 'figures-livre/' + BP_FIG[fig.dataset.fig] + '.html?v=b6'; fr.scrolling = 'no'; fr.title = fig.querySelector('figcaption')?.textContent || 'Figure';
    fig.querySelector('img')?.replaceWith(fr);
  } else
  import('./m3d/index.js').then(({ mountMachine }) => (mark('machine-start'), mountMachine(fig.dataset.fig, canvas, cam))).then((m) => {
    mark('machine-built'); machine = m; machine.resize(); fig.querySelector('img')?.remove();
    const t0 = performance.now();
    /* Interaction directement sur la machine 3D, comme sur la figure d'origine : on attrape la machine et on glisse (ou flèches gauche / droite)
       pour changer son réglage propre (seuil en %, pondération, lot, jour, heure, rapport…) ; un clic sur la machine avance d'un cran. */
    let drag = null, shift = 0, rate = 1;
    let hold = null;   // temps figé : pause, ou scénario à cadres à placer (la machine attend « Lancer l'essai »)
    const since = () => (performance.now() - t0) / 1000;
    const clock = () => (hold !== null ? hold : shift + since() * rate);
    const setClock = (t) => { if (hold !== null) hold = t; else shift = t - since() * rate; };
    const setRate = (r) => { const t = clock(); rate = r; if (hold === null) shift = t - since() * rate; };
    const pauseClock = () => { if (hold === null) hold = clock(); };
    const resumeClock = () => { if (hold !== null) { const t = hold; hold = null; shift = t - since() * rate; } };
    const ctl = machine.controls || { label: 'temps', min: 0, max: 100, step: 5, fmt: (v) => v + ' %', get: (t) => ((t % 60) / 60) * 100, seek: (v) => v / 100 * 60 };
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const apply = (v) => {
      v = clamp(Math.round(v / ctl.step) * ctl.step, ctl.min, ctl.max);
      const r = ctl.set ? ctl.set(v) : undefined;
      const to = ctl.seek ? ctl.seek(v) : (typeof r === 'number' ? r : null);
      if (to !== null) setClock(to);
    };
    const cur = (t) => ctl.get(t);
    /* un clic sur une étape de « Comment ça marche » conduit la machine à cette séquence */
    document.querySelectorAll('.rf-marche-steps>li').forEach((li, i, all) => { li.style.cursor = 'pointer'; li.addEventListener('click', () => apply(ctl.min + (ctl.max - ctl.min) * (+li.dataset.at || i / all.length))); });
    /* Commandes : une capsule silencieuse (refonte/m3d/control-bar.js, la même qu'à l'accueil) ; elle n'apparaît qu'avec la démonstration ou le mode Explorer. */
    const setFocus = (name) => { focus.to = name ? 1 : 0; if (name) focus.p = machine.api.anchor(name) || focus.p; };
    let lastRender = 0, demoTick = 0;   // dernier relevé de l'état observable (200 ms)
    const dock = document.createElement('div'); dock.className = 'rf-cb-dock'; document.body.append(dock); machine.bar = dock;
    const how = document.querySelector('.rf-marche'), howSteps = how ? [...how.querySelectorAll('.rf-marche-steps>li')] : [];
    const cap2 = document.createElement('div'); cap2.className = 'rf-demo-cap'; cap2.setAttribute('role', 'status'); cap2.setAttribute('aria-live', 'polite'); document.body.append(cap2);
    const demo = { on: false, explore: false, mode: 'idle', finished: false, end: null, step: -1 };
    let barUI = null, panelOpen = false, panelSize = 0, pendingView = null;
    /* API de test, activée seulement par ?uxtest (jamais en production) : positionne la machine à un instant donné */
    if (/[?&]uxtest\b/.test(location.search)) window.__rfTest = { gpuInfo: () => machine.info?.(), seek: (t) => setClock(t), time: clock, end: () => demo.end, min: () => (ctl.seek ? ctl.seek(ctl.min) : 0), max: () => (ctl.seek ? ctl.seek(ctl.max) : 0) };
    const mountBar = () => {
      if (barUI) return;
      const mc = { ...machine, api: machine.api && { ...machine.api, setInspect: machine.api.inspect } };
      const ctlBar = { time: clock, seek: setClock, get paused() { return hold !== null; }, setPaused: (b) => { if (b) pauseClock(); else { if (demo.finished) { demo.finished = false; document.body.classList.remove('rf-demo-done'); setClock(ctl.seek ? ctl.seek(ctl.min) : 0); } resumeClock(); } dock.dataset.paused = String(hold !== null); dock.dataset.t = clock().toFixed(2); }, get speed() { return rate; }, setSpeed: setRate, scenario: (i) => machine.api?.setScenario?.(i), focus: (n) => setFocus(n) };
      import('./m3d/control-bar.js').then(({ buildControlBar }) => { barUI = buildControlBar(dock, mc, ctlBar, { label: fig.querySelector('figcaption')?.textContent || 'machine', onClose: () => exitDemo(), onGuide: () => enter(false), onToggle: (v, g) => { panelOpen = v; panelSize = v ? g.size : 0; } }); if (demo.explore) barUI.open(true); if (pendingView) barUI.markView(pendingView); });
    };
    const showStep = (i) => {
      if (!howSteps.length || i === demo.step) return; demo.step = i;
      howSteps.forEach((li, k) => { li.classList.toggle('is-active', k === i); li.classList.toggle('is-done', k < i); });
      howSteps[0].parentElement.style.setProperty('--pf', ((i + .5) / howSteps.length).toFixed(3));
      const li = howSteps[i]; if (li) cap2.innerHTML = '<small>Étape ' + (i + 1) + ' / ' + howSteps.length + '</small><b>' + li.querySelector('h3').innerHTML + '</b><span>' + li.querySelector('p').innerHTML + '</span>';
    };
    /* Deux entrées distinctes : « guidée » rejoue le scénario depuis le début et s'arrête sur son résultat (légende des étapes) ;
       « explorer » ouvre tout de suite les commandes avancées et laisse la machine libre (aucune démonstration imposée). */
    const guided = () => {
      demo.explore = false; demo.finished = false; demo.mode = dock.dataset.mode = 'guided';
      document.body.classList.remove('rf-explore', 'rf-demo-done'); document.body.classList.add('rf-demo');
      machine.api?.setScenario?.(null); const t1 = ctl.seek ? ctl.seek(ctl.max) : null; demo.end = Number.isFinite(t1) && t1 > 3 ? t1 : null;
      setClock(ctl.seek ? ctl.seek(ctl.min) : 0); resumeClock(); barUI?.open(false);
    };
    const explore = () => {
      demo.explore = true; demo.finished = false; demo.mode = dock.dataset.mode = 'explore'; demo.end = null;
      document.body.classList.remove('rf-demo', 'rf-demo-done'); document.body.classList.add('rf-explore'); resumeClock(); barUI?.open(true);
    };
    const enter = (wantExplore) => {
      const first = !demo.on; demo.on = true; demo.to = 1;
      if (first) { mountBar(); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }
      if (wantExplore) explore(); else guided();
      document.querySelector('.rf-demo-start')?.setAttribute('aria-pressed', 'true');
    };
    const exitDemo = () => {
      pendingView = null; demo.on = false; demo.mode = dock.dataset.mode = 'idle'; demo.to = 0; document.body.classList.remove('rf-demo', 'rf-explore', 'rf-demo-done'); setFocus(null); machine.api?.inspect?.(false); barUI?.open(false); resumeClock();
      document.querySelector('.rf-demo-start')?.setAttribute('aria-pressed', 'false');
    };
    demo.f = 0; demo.to = 0;
    document.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-demo]'); if (!b) return;
      e.preventDefault();
      if (b.dataset.demo === 'magic') {   // le moteur d'icônes se charge à part : le bouton attend qu'il soit prêt au lieu de rester sans effet
        b.setAttribute('aria-busy', 'true'); (window.__rfFlowReady || Promise.resolve()).then(() => { b.removeAttribute('aria-busy'); document.querySelector('.rf-flow-magic')?.click(); });
      } else enter(b.dataset.demo === 'explore');
    });
    document.addEventListener('rf-explore-machine', (e) => { enter(true); if (e.detail?.fromMagic && FR.focus) { setFocus(FR.focus); pendingView = FR.focus; barUI?.markView(FR.focus); } });   // depuis la magie : la caméra va droit au mécanisme principal
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && demo.on) exitDemo(); });
    const cap = fig.querySelector('figcaption'); if (cap) cap.textContent += (fig.dataset.fig === 'vrestudio-musicbox' ? ', attrapez la machine et glissez : ' : ' · attrapez la machine et glissez : ') + ctl.label.toLowerCase();
    const isUI = (t) => !!(t.closest && t.closest('a,button,input,textarea,select,summary,nav,dialog,.rf-ruler,.rf-post-pn,.rf-post-head,.rf-post-body'));
    let over = false;
    document.addEventListener('pointermove', (e) => {
      if (held) { machine.api.drag.move(machine.rayAt(e.clientX, e.clientY)); return; }
      if (drag) { drag.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); apply(drag.v + (e.clientX - drag.x) / Math.max(320, innerWidth * .6) * (ctl.max - ctl.min)); return; }
      const hit = e.pointerType !== 'touch' && !isUI(e.target) && machine.pick(e.clientX, e.clientY);
      if (hit !== over) { over = hit; document.body.classList.toggle('rf-over-machine', hit); }
    });
    let held = false;   // glisser un élément de la machine (api.drag) : prioritaire sur le réglage par glissé
    document.addEventListener('pointerdown', (e) => {
      if (e.button || isUI(e.target)) return;
      if (machine.api?.drag && machine.api.drag.pick(machine.rayAt(e.clientX, e.clientY))) { held = true; document.body.classList.add('rf-grabbing'); e.preventDefault(); return; }
      if (!machine.pick(e.clientX, e.clientY)) return;
      drag = { x: e.clientX, v: cur(clock()), moved: 0 }; document.body.classList.add('rf-grabbing'); e.preventDefault();
    });
    const drop = () => {
      if (held) { held = false; machine.api.drag.end(); document.body.classList.remove('rf-grabbing'); return; }
      if (!drag) return;
      if (drag.moved < 5) { const n = cur(clock()) + ctl.step; apply(n > ctl.max ? ctl.min : n); }   // simple clic : un cran de plus
      drag = null; document.body.classList.remove('rf-grabbing');
    };
    document.addEventListener('pointerup', drop); document.addEventListener('pointercancel', () => { drag = null; document.body.classList.remove('rf-grabbing'); });
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('input,textarea,select,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { apply(cur(clock()) + k * ctl.step); e.preventDefault(); }
    });
    const loop = () => {
      requestAnimationFrame(loop);
      const o = demo.on ? 1 : Math.min(1, Math.max(0, 1 - scrollY / (innerHeight * .75)));   // les règles s’effacent ; l’objet, lui, reste en arrière-plan
      const study = document.body.classList.contains('rf-article');   // étude : l'objet et le plan s'effacent presque entièrement, voile sombre progressif
      const bg = Math.max(study ? .1 : .32, o);
      if (study) document.documentElement.style.setProperty('--veil', ((1 - o) * .82).toFixed(3));
      canvas.style.opacity = bg.toFixed(3);
      if (machine.bar) { machine.bar.style.opacity = o.toFixed(3); machine.bar.style.pointerEvents = o < .05 ? 'none' : ''; }
      rulers.forEach((r) => { r.style.opacity = o.toFixed(3); r.style.pointerEvents = o < .05 ? 'none' : ''; });
      if (document.hidden) return;
      const nowMs = performance.now(); if (nowMs - demoTick > 200) { demoTick = nowMs; dock.dataset.mode = demo.mode; dock.dataset.t = clock().toFixed(2); dock.dataset.paused = String(hold !== null); }
      const dTo = demo.on ? 1 : 0, pTo = demo.on && panelOpen ? panelSize : 0;
      /* mobile : la machine est recentrée dans l'espace réellement libre entre la navigation et le tiroir (boucle fermée sur sa position à l'écran, propre à chaque machine) */
      let lvMoving = false;
      if (innerWidth < 900) {
        let want = 0;
        if (pTo > 0 && machine.center) { const top = .13, bottom = 1 - focus.sz - .02, tgt = 1 - 2 * ((top + bottom) / 2); const e = (projV.copy(focus.f > .5 && focus.p ? focus.p : machine.center()).project(cam).y - tgt); want = focus.lv - e * (visH() / 2) * .5; }
        if (Math.abs(want - focus.lv) > .004) { focus.lv += (want - focus.lv) * .35; lvMoving = true; }
      }
      if (Math.abs(focus.to - focus.f) > .001 || Math.abs(dTo - focus.d) > .001 || Math.abs(pTo - focus.sz) > .001 || lvMoving) { focus.f += (focus.to - focus.f) * .08; focus.d += (dTo - focus.d) * .06; focus.sz += (pTo - focus.sz) * .09; placeCam(focus.yaw, focus.pitch); }
      if (howSteps.length) { const span = ctl.max - ctl.min || 1, pr = Math.min(.9999, Math.max(0, (cur(clock()) - ctl.min) / span)); showStep(Math.min(howSteps.length - 1, Math.floor(pr * howSteps.length))); }
      if (demo.on && !demo.explore && !demo.finished && demo.end !== null && hold === null && clock() >= demo.end) { pauseClock(); setClock(demo.end); demo.finished = true; document.body.classList.add('rf-demo-done'); }
      if (demo.finished && !demo.on) demo.finished = false;
      /* pendant « Voir la magie » la machine n'est qu'un fond à 16 % d'opacité : elle ne se redessine plus qu'à 4 images par seconde (le temps reste celui de l'horloge, rien ne saute au retour) */
      const nowR = performance.now(); if (document.body.classList.contains('fl-lock') && nowR - lastRender < 250) return; lastRender = nowR;
      if (diagOn('machine')) return;
      machine.render(reduced ? 6 + shift : clock());
      if (!firstR) { firstR = 1; mark('first-render'); }
    };
    loop();
  }).catch((e) => { console.warn('machine 3D indisponible', e); canvas.remove(); fig.classList.add('rf-fallback'); });

  initRulers((v) => { view.yaw = v.yaw; placeCam(v.yaw, v.pitch); });
}

/* ---- étapes : rail « serveur / machine » ----
   Un trait relie les étapes ; chaque étape est un nœud (anneau en pointillés + cœur). Le trait se remplit avec le défilement (ressort 45 / 20), des paquets
   de données descendent le long de la partie remplie, et quand le trait atteint une étape son nœud s'allume : l'anneau tourne, une onde part du nœud
   et un paquet file depuis l'étape précédente. */
{
  const tl = document.querySelector('.rf-post-tl');
  if (tl) {
    const rail = tl.querySelector('.rf-tl-rail'), line = tl.querySelector('.rf-tl-line'), head = tl.querySelector('.rf-tl-dot');
    const cols = tl.querySelector('.rf-post-steps'), steps = [...tl.querySelectorAll('.rf-post-step')];
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const flow = document.createElement('div'); flow.className = 'rf-tl-flow';
    flow.innerHTML = '<i></i><i></i><i></i>'; rail.append(flow);
    const nodes = steps.map(() => { const n = document.createElement('i'); n.className = 'rf-tl-node'; n.innerHTML = '<b class="rf-tl-ring"></b><b class="rf-tl-core"></b><b class="rf-tl-ping"></b>'; rail.append(n); return { el: n, top: 0, on: false }; });
    const layout = () => { steps.forEach((s, i) => { nodes[i].top = s.offsetTop + 14; nodes[i].el.style.top = nodes[i].top + 'px'; }); };
    const fire = (i) => {
      const n = nodes[i]; n.el.classList.remove('rf-ping'); void n.el.offsetWidth; n.el.classList.add('rf-ping');
      if (i === 0) return;
      const hop = document.createElement('i'); hop.className = 'rf-tl-hop'; hop.style.top = nodes[i - 1].top + 'px'; hop.style.setProperty('--dy', (n.top - nodes[i - 1].top) + 'px');
      rail.append(hop); hop.addEventListener('animationend', () => hop.remove(), { once: true });
    };
    let pr = 0, vel = 0, last = 0, raf = 0;
    const target = () => { const top = tl.getBoundingClientRect().top + scrollY, h = tl.offsetHeight; return clamp((scrollY + innerHeight * .55 - top) / Math.max(1, h), 0, 1); };
    const paint = () => {
      const h = rail.offsetHeight, px = pr * h;
      line.style.transform = 'scaleY(' + pr.toFixed(4) + ')'; head.style.top = px.toFixed(1) + 'px'; flow.style.height = px.toFixed(1) + 'px';
      nodes.forEach((n, i) => { const on = px >= n.top - 2; if (on !== n.on) { n.on = on; n.el.classList.toggle('rf-on', on); if (on) fire(i); } });
    };
    const frame = (now) => {
      const dt = Math.min(.032, last ? (now - last) / 1000 : .016); last = now;
      const to = target(), k = 45, c = 20;
      vel += (-k * (pr - to) - c * vel) * dt; pr += vel * dt; paint();
      if (Math.abs(pr - to) > .0005 || Math.abs(vel) > .002) raf = requestAnimationFrame(frame); else { pr = to; vel = 0; paint(); raf = 0; last = 0; }
    };
    const kick = () => { if (reduced) { pr = target(); paint(); return; } if (!raf) raf = requestAnimationFrame(frame); };
    layout(); addEventListener('load', () => { layout(); kick(); });
    new ResizeObserver(() => { layout(); kick(); }).observe(cols);
    addEventListener('scroll', kick, { passive: true }); addEventListener('resize', () => { layout(); kick(); }); kick();
    const io = !reduced && 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rf-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 }) : null;
    steps.forEach((s) => io ? io.observe(s) : s.classList.add('rf-in'));
  }
}

/* ---- schéma des étapes (d'après la reconstitution fournie) ---- */
if (document.querySelector('.rf-flow')) window.__rfFlowReady = import('./flow.js').then(({ initFlow }) => document.querySelectorAll('.rf-flow').forEach((r) => { try { initFlow(r); } catch (e) { console.warn('schéma indisponible', e); } })).catch((e) => console.warn('schéma indisponible', e));
