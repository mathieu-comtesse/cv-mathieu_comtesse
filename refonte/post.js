// Page de projet : barre, pied de page, apparitions ; pour les projets pro, la machine animée est posée sur le plan blueprint
// de l'accueil (même caméra en perspective, mêmes règles « Tourner » / « Incliner »).
import './footer.js';
import './navfx.js';
import './viewbtn.js';
if (document.querySelector('.rf-code')) import('./hl.js').catch(() => {});   // coloration des extraits de code des études
import * as THREE from 'three';
import { initBlueprint } from './blueprint-hero.js';
import { initRulers } from './rulers.js';

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
const BP_FIG = /[?&]machines=old\b/.test(location.search) ? { moteur: '16', pp: '52', vm: '69' } : { pp: '52' };
const fig = document.querySelector('.rf-post-fig[data-fig]');
const bpCanvas = document.getElementById('rf-bp');
const stage = document.getElementById('stage');

if (fig && bpCanvas && stage) {
  /* ---- caméra : azimut 36° comme la pièce de l'accueil, en perspective, liée au plan ---- */
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 400);
  const AIM_Y = 3.2;                       // la visée est un peu au-dessus du plan : la machine, au centre du plan, se place sous le titre
  const focus = { f: 0, to: 0, p: null, yaw: 0, pitch: 26 * Math.PI / 180 };   // vue rapprochée : la caméra principale reste, elle s'approche d'un point d'ancrage
  const placeCam = (yaw, pitch = 26 * Math.PI / 180) => {
    focus.yaw = yaw; focus.pitch = pitch;
    const F = focus.f * focus.f * (3 - 2 * focus.f), P = focus.p, cp = Math.cos(pitch), dist = 40 + (11 - 40) * F;
    const tx = .1 + ((P ? P.x : .1) - .1) * F, ty = AIM_Y + ((P ? P.y : AIM_Y) - AIM_Y) * F, tz = -.2 + ((P ? P.z : -.2) + .2) * F;
    cam.position.set(tx + Math.sin(yaw) * cp * dist, ty + Math.sin(pitch) * dist, tz + Math.cos(yaw) * cp * dist);
    cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(true);
  };
  const bp = initBlueprint(bpCanvas, stage);
  bp.plane.scale.setScalar(2.6);          // plan plus étendu : pas d'horizon noir à ce faible angle

  /* ---- la machine : modèle 3D posé sur le plan, rendu avec la même caméra (même perspective, même profondeur) ---- */
  const view = { yaw: 36 * Math.PI / 180 };
  const aspect = () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); machine?.resize(); };
  let machine = null;
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
  import('./m3d/index.js').then(({ mountMachine }) => mountMachine(fig.dataset.fig, canvas, cam)).then((m) => {
    machine = m; machine.resize(); fig.querySelector('img')?.remove();
    const t0 = performance.now();
    /* Interaction directement sur la machine 3D, comme sur la figure d'origine : on attrape la machine et on glisse (ou flèches gauche / droite)
       pour changer son réglage propre (seuil en %, pondération, lot, jour, heure, rapport…) ; un clic sur la machine avance d'un cran. */
    let shift = 0, drag = null;
    const clock = () => (performance.now() - t0) / 1000 + shift;
    const ctl = machine.controls || { label: 'temps', min: 0, max: 100, step: 5, fmt: (v) => v + ' %', get: (t) => ((t % 60) / 60) * 100, seek: (v) => v / 100 * 60 };
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const apply = (v) => {
      v = clamp(Math.round(v / ctl.step) * ctl.step, ctl.min, ctl.max);
      const r = ctl.set ? ctl.set(v) : undefined;
      const to = ctl.seek ? ctl.seek(v) : (typeof r === 'number' ? r : null);
      if (to !== null) shift += to - clock();
    };
    const cur = (t) => ctl.get(t);
    /* un clic sur une étape de « Comment ça marche » conduit la machine à cette séquence */
    if (ctl.max === 9) document.querySelectorAll('.rf-flow-step').forEach((li, i) => { li.style.cursor = 'pointer'; li.addEventListener('click', () => apply(i + 1)); });
    /* inspection (éclaté) et vues rapprochées, sans remplacer la caméra principale */
    if (machine.api) {
      const bar = document.createElement('div'); bar.className = 'rf-m3d-tools'; bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;display:flex;gap:8px;padding:6px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 6px 24px rgba(0,0,0,.25)';
      const mk = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.style.cssText = 'font:600 13px/1 system-ui,sans-serif;white-space:nowrap;padding:9px 12px;border:0;border-radius:999px;background:transparent;color:#0b1020;cursor:pointer'; b.addEventListener('click', () => { fn(); [...bar.children].forEach((c) => { if (c.dataset.sc || c.tagName === 'SPAN') return; c.style.background = c.dataset.on === '1' ? '#0b1020' : 'transparent'; c.style.color = c.dataset.on === '1' ? '#fff' : '#0b1020'; }); }); bar.append(b); return b; };
      const setFocus = (name) => { focus.to = name ? 1 : 0; if (name) focus.p = machine.api.anchor(name) || focus.p; };
      const views = machine.api.views || [{ label: 'La main', anchor: 'hand' }, { label: 'La forge', anchor: 'forge' }];
      const offAll = () => [...bar.children].forEach((c) => { c.dataset.on = '0'; });
      const bAll = mk('Ensemble', () => { setFocus(null); machine.api.inspect(false); offAll(); bAll.dataset.on = '1'; });
      const bIns = mk('Inspecter', () => { const on = bIns.dataset.on !== '1'; machine.api.inspect(on); setFocus(null); offAll(); (on ? bIns : bAll).dataset.on = '1'; });
      views.forEach((v) => { const bv = mk(v.label, () => { machine.api.inspect(false); setFocus(v.anchor); offAll(); bv.dataset.on = '1'; }); });
      /* scénarios de démonstration (machines qui en proposent) : Auto enchaîne les cas, un cas isolé boucle sur lui-même */
      if (machine.api.scenarios) {
        const sep = document.createElement('span'); sep.style.cssText = 'width:1px;background:#0b102033;margin:4px 2px'; bar.append(sep);
        const sc = [{ short: 'Auto', i: null }, ...machine.api.scenarios.map((x, i) => ({ short: x.short, i }))];
        const sbs = sc.map((x) => { const bs = mk(x.short, () => { machine.api.setScenario(x.i); sbs.forEach((o) => { o.dataset.on = o === bs ? '1' : '0'; o.style.background = o.dataset.on === '1' ? '#0b1020' : 'transparent'; o.style.color = o.dataset.on === '1' ? '#fff' : '#0b1020'; }); }); bs.dataset.sc = '1'; return bs; });
        sbs[0].dataset.on = '1';
      }
      bAll.dataset.on = '1'; bAll.style.background = '#0b1020'; bAll.style.color = '#fff'; document.body.append(bar); machine.bar = bar;
    }
    const cap = fig.querySelector('figcaption'); if (cap) cap.textContent += (fig.dataset.fig === 'vrestudio-musicbox' ? ', attrapez la machine et glissez : ' : ' · attrapez la machine et glissez : ') + ctl.label.toLowerCase();
    const isUI = (t) => !!(t.closest && t.closest('a,button,input,textarea,select,summary,nav,dialog,.rf-ruler,.rf-post-pn,.rf-post-head,.rf-post-body'));
    let over = false;
    document.addEventListener('pointermove', (e) => {
      if (drag) { drag.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); apply(drag.v + (e.clientX - drag.x) / Math.max(320, innerWidth * .6) * (ctl.max - ctl.min)); return; }
      const hit = e.pointerType !== 'touch' && !isUI(e.target) && machine.pick(e.clientX, e.clientY);
      if (hit !== over) { over = hit; document.body.classList.toggle('rf-over-machine', hit); }
    });
    document.addEventListener('pointerdown', (e) => {
      if (e.button || isUI(e.target) || !machine.pick(e.clientX, e.clientY)) return;
      drag = { x: e.clientX, v: cur(clock()), moved: 0 }; document.body.classList.add('rf-grabbing'); e.preventDefault();
    });
    const drop = () => {
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
      const o = Math.min(1, Math.max(0, 1 - scrollY / (innerHeight * .75)));   // les règles s’effacent ; l’objet, lui, reste en arrière-plan
      const study = document.body.classList.contains('rf-article');   // étude : l'objet et le plan s'effacent presque entièrement, voile sombre progressif
      const bg = Math.max(study ? .1 : .32, o);
      if (study) document.documentElement.style.setProperty('--veil', ((1 - o) * .82).toFixed(3));
      canvas.style.opacity = bg.toFixed(3);
      if (machine.bar) { machine.bar.style.opacity = o.toFixed(3); machine.bar.style.pointerEvents = o < .05 ? 'none' : ''; }
      rulers.forEach((r) => { r.style.opacity = o.toFixed(3); r.style.pointerEvents = o < .05 ? 'none' : ''; });
      if (document.hidden) return;
      if (Math.abs(focus.to - focus.f) > .001) { focus.f += (focus.to - focus.f) * .08; placeCam(focus.yaw, focus.pitch); }
      machine.render(reduced ? 6 + shift : clock());
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
if (document.querySelector('.rf-flow')) import('./flow.js').then(({ initFlow }) => document.querySelectorAll('.rf-flow').forEach((r) => { try { initFlow(r); } catch (e) { console.warn('schéma indisponible', e); } })).catch((e) => console.warn('schéma indisponible', e));
