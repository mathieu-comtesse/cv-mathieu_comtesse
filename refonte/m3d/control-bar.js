// Barre de commandes commune à toutes les machines (accueil, vue agrandie, fiches) : un seul contrat, quel que soit le module.
// Contrat machine : controls {label,min,max,step,fmt,get(t),seek(v)->t} ; api {views[{label,anchor}], scenarios[{short,label}], setScenario(i|null), setInspect(bool)}.
// Contrat hôte (ctl) : { time(), seek(t), paused, setPaused(b), speed, setSpeed(v), focus(anchorName|null), scenario(i|null) }.
const CSS = `.cv-cb{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font:12px/1.2 "Sohne Mono",monospace;color:#fff;max-width:100%}
.cv-cb button{font:inherit;color:#fff;background:#07142bef;border:1px solid #7398c9;padding:6px 10px;cursor:pointer;min-height:32px}
.cv-cb button:hover{background:#12305f}.cv-cb button[aria-pressed="true"]{background:#fff;color:#051daa}
.cv-cb button:focus-visible,.cv-cb input:focus-visible{outline:2px solid #fff;outline-offset:2px}
.cv-cb .cv-cb-step{display:flex;align-items:center;gap:8px}.cv-cb input[type=range]{width:min(220px,40vw)}
.cv-cb .cv-cb-grp{display:flex;gap:4px;flex-wrap:wrap;align-items:center}.cv-cb .cv-cb-grp>span{opacity:.7;margin-right:2px}
.cv-cb svg{display:block}
.cv-cb output{white-space:nowrap;margin-right:14px}`;
let styled = false;
const SPEEDS = [.5, 1, 2];
export function buildControlBar(root, machine, ctl, { label = 'machine' } = {}) {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
  const api = machine.api || {}, c = machine.controls && machine.controls.seek ? machine.controls : null;
  const bar = document.createElement('div'); bar.className = 'cv-cb'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Commandes : ' + label);
  const btn = (text, onclick, { pressed = null, aria } = {}) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; if (aria) b.setAttribute('aria-label', aria); if (pressed !== null) b.setAttribute('aria-pressed', String(pressed)); b.onclick = onclick; return b; };
  const grp = (name) => { const g = document.createElement('div'); g.className = 'cv-cb-grp'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', name); const s = document.createElement('span'); s.textContent = name; s.setAttribute('aria-hidden', 'true'); g.append(s); return g; };
  // lecture
  const play = btn(ctl.paused ? 'Lecture' : 'Pause', () => { ctl.setPaused(!ctl.paused); play.textContent = ctl.paused ? 'Lecture' : 'Pause'; }, { aria: 'Mettre en pause ou reprendre la démonstration' });
  const replay = btn('Rejouer', () => { ctl.scenario(null); ctl.seek(0); markScenario(null); refreshEdit(); }, { aria: 'Rejouer depuis le début' });
  const speed = btn('1×', () => { const i = (SPEEDS.indexOf(ctl.speed) + 1) % SPEEDS.length; ctl.setSpeed(SPEEDS[i]); speed.textContent = SPEEDS[i] + '×'; }, { aria: 'Vitesse de lecture' });
  const g0 = grp('Lecture'); g0.append(play, replay, speed); bar.append(g0);
  // étape / tête de lecture
  let slider = null, out = null;
  if (c) {
    const wrap = document.createElement('label'); wrap.className = 'cv-cb-step';
    const name = document.createElement('span'); name.textContent = c.label || 'Étape';
    slider = document.createElement('input'); slider.type = 'range'; slider.min = c.min; slider.max = c.max; slider.step = c.step || 1; slider.setAttribute('aria-label', c.label || 'Étape');
    out = document.createElement('output');
    slider.oninput = () => { ctl.seek(c.seek(+slider.value)); out.textContent = c.fmt ? c.fmt(+slider.value) : slider.value; };
    wrap.append(name, slider, out); bar.append(wrap);
  }
  // scénarios
  let markScenario = () => {};
  if (api.scenarios?.length) {
    const g = grp('Scénario'), bs = [];
    const mk = (text, i, aria) => { const b = btn(text, () => { ctl.scenario(i); const sc = i === null ? null : api.scenarios[i]; if (sc?.edit && sc.hold !== false) { ctl.seek(sc.editT); ctl.setPaused(true); play.textContent = 'Lecture'; } else if (sc?.edit) { ctl.setPaused(false); play.textContent = 'Pause'; } else { ctl.seek(0); ctl.setPaused(false); play.textContent = 'Pause'; } markScenario(i); refreshEdit(); }, { pressed: i === null, aria }); bs.push([b, i]); g.append(b); };
    mk('Auto', null, 'Scénarios en boucle'); api.scenarios.forEach((s, i) => mk(s.short, i, s.label));
    markScenario = (k) => bs.forEach(([b, i]) => b.setAttribute('aria-pressed', String(i === k))); bar.append(g);
  }
  // édition des cadres (machines qui l'exposent : api.frames) : choisir un cadre, le déplacer, lancer l'essai
  let refreshEdit = () => {};
  if (api.frames) {
    const g = grp('Cadres'), st = document.createElement('span'); st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite'); st.style.cssText = 'opacity:.9;white-space:nowrap';
    let cur = 0; const sel = api.frames.names.map((n, i) => { const b = btn(n, () => { cur = i; sel.forEach((x, k) => x.setAttribute('aria-pressed', String(k === cur))); }, { pressed: i === 0, aria: 'Choisir le cadre ' + n }); g.append(b); return b; });
    const arrow = (txt, dx, dy, aria) => { const b = btn(txt, () => { api.frames.nudge(cur, dx, dy); st.textContent = api.status(); }, { aria }); b.style.minWidth = '32px'; g.append(b); };
    arrow('←', -2, 0, 'Déplacer le cadre vers la gauche'); arrow('→', 2, 0, 'Déplacer le cadre vers la droite'); arrow('↑', 0, -2, 'Déplacer le cadre vers le haut'); arrow('↓', 0, 2, 'Déplacer le cadre vers le bas');
    const rs = btn('Remettre', () => { api.frames.reset(); st.textContent = api.status(); }, { aria: 'Remettre les cadres sur leurs champs' });
    const run = btn('Lancer l’essai', () => { ctl.setPaused(false); play.textContent = 'Pause'; }, { aria: 'Lancer la fabrication de la cartouche et l’essai' });
    g.append(rs, run, st); bar.append(g); g.hidden = true;
    refreshEdit = () => { g.hidden = !api.frames.editing(); st.textContent = api.status(); }; setInterval(function t() { if (!root.isConnected) return clearInterval(t); st.textContent = api.frames.editing() ? api.status() : ''; }, 400);
    bar.__edit = g;
  }
  // réglages libres (api.params : groupes de choix) : visibles seulement pendant le scénario qui les expose
  if (api.params) {
    const wrap = document.createElement('div'); wrap.className = 'cv-cb'; wrap.style.cssText = 'gap:6px 14px'; const st = document.createElement('span'); st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite'); st.style.cssText = 'white-space:nowrap;opacity:.9';
    const groups = api.params.groups.map((gd) => { const g = grp(gd.name), bs = gd.options.map((o, i) => { const b = btn(o.label, () => { o.run(); sync(); }, { pressed: false, aria: gd.name + ' : ' + o.label }); g.append(b); return b; }); wrap.append(g); return { gd, bs }; });
    const sync = () => groups.forEach(({ gd, bs }) => { const cur = gd.get(); bs.forEach((b, i) => b.setAttribute('aria-pressed', String(i === cur))); });
    wrap.append(st); wrap.hidden = true; bar.append(wrap);
    const refresh = () => { wrap.hidden = !api.params.visible(); sync(); st.textContent = api.params.visible() && api.status ? api.status() : ''; };
    const prevRefresh = refreshEdit; refreshEdit = () => { prevRefresh(); refresh(); }; setInterval(function t() { if (!root.isConnected) return clearInterval(t); refresh(); }, 500);
  }
  // vues et inspection
  const views = api.views || [], gv = grp('Vue'), vb = [];
  const setView = (name, b) => { ctl.focus(name); vb.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); };
  const over = btn('Ensemble', () => setView(null, over), { pressed: true, aria: 'Vue d’ensemble' }); vb.push(over); gv.append(over);
  views.forEach((v) => { const b = btn(v.label, () => setView(v.anchor, b), { pressed: false, aria: 'Gros plan : ' + v.label }); vb.push(b); gv.append(b); });
  if (views.length) bar.append(gv);
  if (api.setInspect) { let on = false; const b = btn('Inspecter', () => { on = !on; api.setInspect(on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Refermer' : 'Inspecter'; }, { pressed: false, aria: 'Inspection : séparer ou rassembler les organes' }); bar.append(b); }
  root.replaceChildren(bar);
  // synchronisation de la tête de lecture avec le temps réel de la démonstration
  const timer = setInterval(() => { if (!root.isConnected) { clearInterval(timer); return; } if (slider && document.activeElement !== slider) { const v = c.get(ctl.time()); slider.value = v; out.textContent = c.fmt ? c.fmt(v) : v; } }, 250);
  return { bar, dispose() { clearInterval(timer); bar.remove(); } };
}
