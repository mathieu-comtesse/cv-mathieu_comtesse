// Barre de commandes commune des machines (accueil, vue agrandie, fiches).
// Deux niveaux : une capsule silencieuse (lecture, progression, étape, réglages) et un panneau « Explorer » qui s'ouvre au-dessus,
// organisé en sections (Démonstration, Scénarios, Vues, Inspection, Réglages métier). Rien d'autre n'est affiché au premier regard.
// Contrat : buildControlBar(root, machine, ctl, { label, onClose }) ; ctl = { time, seek, paused, setPaused, speed, setSpeed, scenario, focus }.
const CSS = `.cv-cb{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;font:500 13px/1.25 "Shopify Inter",Inter,system-ui,sans-serif;letter-spacing:.01em;color:#f4f7fb;max-width:100%}
.cv-cb *{box-sizing:border-box}
.cv-cb-cap{display:flex;align-items:center;max-width:100%;gap:6px;min-height:52px;padding:4px 6px 4px 4px;border-radius:9999px;border:1px solid rgb(255 255 255 / .2);background:linear-gradient(180deg,rgb(18 26 52 / .5),rgb(10 16 36 / .38));-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:inset 0 1px 0 rgb(255 255 255 / .22),0 16px 36px -16px rgb(2 6 24 / .7)}
.cv-cb button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;min-width:44px;padding:0 14px;border-radius:9999px;white-space:nowrap;transition:background .25s,color .25s,transform .15s}
.cv-cb button:hover{background:rgb(255 255 255 / .1)}.cv-cb button:active{transform:scale(.95)}
.cv-cb button:focus-visible,.cv-cb input:focus-visible{outline:1.5px solid rgb(255 255 255 / .9);outline-offset:2px}
.cv-cb button svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.cv-cb .cv-cb-play{padding:0;width:44px;background:linear-gradient(180deg,rgb(255 255 255 / .96),rgb(255 255 255 / .8));color:#0b1020;box-shadow:0 6px 16px -8px rgb(2 6 24 / .8)}
.cv-cb .cv-cb-play:hover{background:#fff}.cv-cb .cv-cb-play svg{fill:currentColor;stroke:none}
.cv-cb .cv-cb-step{display:flex;align-items:center;gap:12px;padding:0 8px;min-width:0}
.cv-cb .cv-cb-step input[type=range]{width:min(220px,34vw)}
.cv-cb input[type=range]{-webkit-appearance:none;appearance:none;height:22px;background:transparent;cursor:pointer;margin:0}
.cv-cb input[type=range]::-webkit-slider-runnable-track{height:2px;border-radius:2px;background:linear-gradient(90deg,#fff var(--p,0%),rgb(255 255 255 / .28) var(--p,0%))}
.cv-cb input[type=range]::-moz-range-track{height:2px;border-radius:2px;background:rgb(255 255 255 / .28)}
.cv-cb input[type=range]::-moz-range-progress{height:2px;background:#fff}
.cv-cb input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-6px;border-radius:50%;background:#fff;border:0;box-shadow:0 2px 8px rgb(2 6 24 / .6)}
.cv-cb input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:0}
.cv-cb output{font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgb(244 247 251 / .78);min-width:3.4em;max-width:16em;text-align:right}
.cv-cb .cv-cb-more[aria-expanded="true"]{background:rgb(255 255 255 / .16)}
.cv-cb .cv-cb-more i{position:absolute;top:9px;right:9px;width:7px;height:7px;border-radius:50%;background:#ffd028;display:none}.cv-cb .cv-cb-more.has-note i{display:block}.cv-cb .cv-cb-more{position:relative}
.cv-cb-panel{position:absolute;left:50%;bottom:calc(100% + 10px);width:min(460px,calc(100vw - 24px));max-height:min(52vh,420px);overflow:auto;padding:6px 18px 14px;border-radius:24px;border:1px solid rgb(255 255 255 / .2);background:linear-gradient(180deg,rgb(18 26 52 / .62),rgb(10 16 36 / .5));-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);box-shadow:inset 0 1px 0 rgb(255 255 255 / .2),0 24px 50px -20px rgb(2 6 24 / .8);transform:translate(-50%,8px) scale(.98);transform-origin:50% 100%;opacity:0;visibility:hidden;transition:opacity .3s,transform .4s cubic-bezier(.22,1,.36,1),visibility .3s}
.cv-cb-grip{display:none}
@media (min-width:900px){.cv-cb-panel{position:fixed;left:auto;right:calc(env(safe-area-inset-right,0px) + 24px);top:50%;bottom:auto;width:330px;max-height:min(74vh,600px);transform:translate(28px,-50%);transform-origin:100% 50%}.cv-cb-panel.is-open{transform:translate(0,-50%)}}
@media (max-width:899px){.cv-cb-panel{position:fixed;left:8px;right:8px;width:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 78px);max-height:38vh;border-radius:22px;transform:translateY(18px)}.cv-cb-panel.is-open{transform:translateY(0)}.cv-cb-grip{display:block;position:sticky;top:0;height:22px;margin:0 auto;width:44px;cursor:grab;touch-action:none}.cv-cb-grip::before{content:"";display:block;width:36px;height:4px;border-radius:2px;margin:9px auto 0;background:rgb(255 255 255 / .4)}}
.cv-cb-panel.is-open{opacity:1;visibility:visible}
@media (min-width:900px){.cv-cb-panel.is-open{transform:translate(0,-50%)}}
@media (max-width:899px){.cv-cb-panel.is-open{transform:translateY(0)}}
.cv-cb-sec{padding:12px 0 2px}.cv-cb-sec+.cv-cb-sec{border-top:1px solid rgb(255 255 255 / .1)}
.cv-cb-sec>h4{margin:0 0 8px;font:500 10.5px/1 "Shopify Inter",Inter,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:rgb(244 247 251 / .55)}
.cv-cb-row{display:flex;flex-wrap:wrap;gap:4px}
.cv-cb-row button{padding:0 14px;min-height:40px;color:rgb(244 247 251 / .8)}
.cv-cb-row button[aria-pressed="true"]{background:linear-gradient(180deg,rgb(255 255 255 / .95),rgb(255 255 255 / .8));color:#0b1020}
.cv-cb-note{margin:8px 0 0;font-size:12.5px;line-height:1.45;color:rgb(244 247 251 / .72);white-space:normal}
.cv-cb-x{margin-left:2px}
@media (max-width:600px){.cv-cb-cap{gap:2px;padding:3px}.cv-cb .cv-cb-step{gap:8px;padding:0 4px;flex:1 1 auto;min-width:0}.cv-cb .cv-cb-step input[type=range]{flex:1 1 60px;min-width:60px;width:auto}.cv-cb output{max-width:7.5em;min-width:0}.cv-cb .cv-cb-more span{display:none}.cv-cb .cv-cb-more{padding:0;width:44px}}
@media (prefers-reduced-motion:reduce){.cv-cb-panel,.cv-cb button{transition:none}}`;
let styled = false;
const SPEEDS = [.5, 1, 2];
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l10.5-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.8" height="14" rx="1"/><rect x="13.7" y="5" width="3.8" height="14" rx="1"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
};
export function buildControlBar(root, machine, ctl, { label = 'machine', onClose = null, onGuide = null, onToggle = null } = {}) {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
  const api = machine.api || {}, c = machine.controls && machine.controls.seek ? machine.controls : null;
  const bar = document.createElement('div'); bar.className = 'cv-cb'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Commandes : ' + label);
  const cap = document.createElement('div'); cap.className = 'cv-cb-cap';
  const panel = document.createElement('div'); panel.className = 'cv-cb-panel'; panel.id = 'cb-' + Math.random().toString(36).slice(2, 8); panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Explorer la machine');
  const mkBtn = (html, onclick, aria, cls) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = html; if (cls) b.className = cls; if (aria) b.setAttribute('aria-label', aria); b.onclick = onclick; return b; };
  const choice = (text, onclick, { pressed = false, aria } = {}) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; if (aria) b.setAttribute('aria-label', aria); b.setAttribute('aria-pressed', String(pressed)); b.onclick = onclick; return b; };
  const section = (name) => { const s = document.createElement('section'); s.className = 'cv-cb-sec'; const h = document.createElement('h4'); h.textContent = name; const r = document.createElement('div'); r.className = 'cv-cb-row'; s.append(h, r); panel.append(s); return { s, r, h }; };

  /* niveau 1 : lecture, progression, réglages */
  const play = mkBtn('', () => { ctl.setPaused(!ctl.paused); syncPlay(); }, 'Mettre en pause ou reprendre la démonstration', 'cv-cb-play');
  const syncPlay = () => { play.innerHTML = ctl.paused ? ICON.play : ICON.pause; play.setAttribute('aria-label', ctl.paused ? 'Reprendre la démonstration' : 'Mettre en pause'); };
  syncPlay(); cap.append(play);
  let slider = null, out = null;
  if (c) {
    const wrap = document.createElement('label'); wrap.className = 'cv-cb-step';
    slider = document.createElement('input'); slider.type = 'range'; slider.min = c.min; slider.max = c.max; slider.step = c.step || 1; slider.setAttribute('aria-label', c.label || 'Étape');
    out = document.createElement('output'); out.setAttribute('aria-live', 'off');
    const fmt = (v) => (c.fmt ? c.fmt(v) : v);
    const paint = () => slider.style.setProperty('--p', ((slider.value - c.min) / Math.max(1e-9, c.max - c.min) * 100).toFixed(1) + '%');
    slider.oninput = () => { ctl.seek(c.seek(+slider.value)); out.textContent = fmt(+slider.value); paint(); };
    wrap.append(slider, out); cap.append(wrap); slider.__paint = paint; out.__fmt = fmt;
  }
  const more = mkBtn(ICON.more + '<span>Explorer</span><i></i>', () => setOpen(!panel.classList.contains('is-open')), 'Explorer la machine : scénarios, vues, inspection', 'cv-cb-more');
  more.setAttribute('aria-expanded', 'false'); more.setAttribute('aria-controls', panel.id); cap.append(more);
  if (onClose) cap.append(mkBtn(ICON.close, () => onClose(), 'Fermer la démonstration', 'cv-cb-x'));
  const setOpen = (v) => { panel.classList.toggle('is-open', v); more.setAttribute('aria-expanded', String(v)); if (v) more.classList.remove('has-note'); root.closest?.('.cv-zoom')?.classList.toggle('has-panel', v); if (onToggle) onToggle(v); };
  const grip = document.createElement('div'); grip.className = 'cv-cb-grip'; grip.setAttribute('aria-hidden', 'true'); panel.prepend(grip);
  { let y0 = null; grip.addEventListener('pointerdown', (e) => { y0 = e.clientY; grip.setPointerCapture(e.pointerId); }); grip.addEventListener('pointermove', (e) => { if (y0 !== null && e.clientY - y0 > 48) { y0 = null; setOpen(false); } }); grip.addEventListener('pointerup', () => { y0 = null; }); }
  bar.append(panel, cap);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open') && bar.isConnected) { setOpen(false); e.stopPropagation(); } }, true);

  /* section Démonstration */
  const sd = section('Démonstration');
  const replay = choice('Rejouer', () => { ctl.scenario(null); ctl.seek(0); ctl.setPaused(false); syncPlay(); markScenario(null); refreshEdit(); }, { aria: 'Rejouer depuis le début' });
  const speed = choice('1×', () => { const i = (SPEEDS.indexOf(ctl.speed) + 1) % SPEEDS.length; ctl.setSpeed(SPEEDS[i]); speed.textContent = SPEEDS[i] + '×'; }, { aria: 'Vitesse de lecture' });
  sd.r.append(replay, speed);
  if (onGuide) sd.r.prepend(choice('Démonstration guidée', () => { onGuide(); syncPlay(); }, { aria: 'Lancer la démonstration guidée depuis le début' }));

  /* section Scénarios */
  let markScenario = () => {};
  if (api.scenarios?.length) {
    const ss = section('Scénarios'), bs = [];
    const mk = (text, i, aria) => { const b = choice(text, () => { ctl.scenario(i); const sc = i === null ? null : api.scenarios[i]; if (sc?.edit && sc.hold !== false) { ctl.seek(sc.editT); ctl.setPaused(true); } else if (sc?.edit) { ctl.setPaused(false); } else { ctl.seek(0); ctl.setPaused(false); } syncPlay(); markScenario(i); refreshEdit(); }, { pressed: i === null, aria }); bs.push([b, i]); ss.r.append(b); };
    mk('Auto', null, 'Scénarios en boucle'); api.scenarios.forEach((s, i) => mk(s.short, i, s.label));
    markScenario = (k) => bs.forEach(([b, i]) => b.setAttribute('aria-pressed', String(i === k)));
  }

  /* section Vues */
  const views = api.views || [], vb = [];
  const setView = (name, b) => { ctl.focus(name); vb.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); };
  const sv = section('Vues');
  const over = choice('Ensemble', () => setView(null, over), { pressed: true, aria: 'Vue d’ensemble' }); vb.push(over); sv.r.append(over);
  views.forEach((v) => { const b = choice(v.label, () => setView(v.anchor, b), { aria: 'Gros plan : ' + v.label }); vb.push(b); sv.r.append(b); });
  if (!views.length) sv.s.hidden = true;

  /* section Inspection */
  if (api.setInspect) {
    const si = section('Inspection'); let on = false;
    const b = choice('Séparer les organes', () => { on = !on; api.setInspect(on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Rassembler les organes' : 'Séparer les organes'; }, { aria: 'Inspection : séparer ou rassembler les organes' });
    si.r.append(b);
  }

  /* section Réglages métier : cadres à placer (Studio PDF) et choix libres (api.params), visibles seulement quand le scénario les expose */
  let refreshEdit = () => {};
  const flag = () => { if (!panel.classList.contains('is-open')) more.classList.add('has-note'); };
  if (api.frames || api.params) {
    const sm = section('Réglages métier'); sm.s.hidden = true;
    const st = document.createElement('p'); st.className = 'cv-cb-note'; st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    let wasShown = false; const parts = [];
    if (api.frames) {
      const g = document.createElement('div'); g.className = 'cv-cb-row'; let cur = 0;
      const sel = api.frames.names.map((n, i) => { const b = choice(n, () => { cur = i; sel.forEach((x, k) => x.setAttribute('aria-pressed', String(k === cur))); }, { pressed: i === 0, aria: 'Choisir le cadre ' + n }); g.append(b); return b; });
      const arrow = (txt, dx, dy, aria) => { const b = choice(txt, () => { api.frames.nudge(cur, dx, dy); st.textContent = api.status(); }, { aria }); g.append(b); };
      arrow('←', -2, 0, 'Déplacer le cadre vers la gauche'); arrow('→', 2, 0, 'Déplacer le cadre vers la droite'); arrow('↑', 0, -2, 'Déplacer le cadre vers le haut'); arrow('↓', 0, 2, 'Déplacer le cadre vers le bas');
      g.append(choice('Remettre', () => { api.frames.reset(); st.textContent = api.status(); }, { aria: 'Remettre les cadres sur leurs champs' }), choice('Lancer l’essai', () => { ctl.setPaused(false); syncPlay(); }, { aria: 'Lancer la fabrication de la cartouche et l’essai' }));
      sm.s.insertBefore(g, null); parts.push(() => api.frames.editing());
    }
    let paramSync = () => {};
    if (api.params) {
      const groups = api.params.groups.map((gd) => { const h = document.createElement('div'); h.className = 'cv-cb-row'; h.style.marginTop = '6px'; const lab = document.createElement('span'); lab.textContent = gd.name; lab.style.cssText = 'flex:1 1 100%;font-size:12px;color:rgb(244 247 251 / .6)'; h.append(lab); const bs = gd.options.map((o) => { const b = choice(o.label, () => { o.run(); paramSync(); }, { aria: gd.name + ' : ' + o.label }); h.append(b); return b; }); sm.s.append(h); return { gd, bs }; });
      paramSync = () => groups.forEach(({ gd, bs }) => { const cur = gd.get(); bs.forEach((b, i) => b.setAttribute('aria-pressed', String(i === cur))); });
      parts.push(() => api.params.visible());
    }
    sm.s.append(st);
    refreshEdit = () => { const on = parts.some((p) => p()); sm.s.hidden = !on; if (on && !wasShown) flag(); wasShown = on; paramSync(); st.textContent = on && api.status ? api.status() : ''; };
    const t = setInterval(() => { if (!root.isConnected) return clearInterval(t); refreshEdit(); }, 450);
    bar.__edit = sm.s;
  }

  root.replaceChildren(bar);
  /* synchronisation de la tête de lecture avec le temps réel de la démonstration */
  const timer = setInterval(() => {
    if (!root.isConnected) { clearInterval(timer); return; }
    syncPlay();
    if (slider && document.activeElement !== slider) { const v = c.get(ctl.time()); slider.value = v; out.textContent = out.__fmt(v); slider.__paint(); }
  }, 250);
  if (slider) { slider.__paint(); out.textContent = out.__fmt(+slider.value); }
  return { bar, open: setOpen, isOpen: () => panel.classList.contains('is-open'), sync: syncPlay, dispose() { clearInterval(timer); bar.remove(); } };
}
