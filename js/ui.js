import { PAGES } from './pages.js?v=cv-projects-v15';
import { PERSO, PRO, CV } from './data.js?v=cv-projects-v20';

/* Deux interfaces plein écran ouvertes depuis la pièce 3D :
 *  - « retro » : la télé cathodique + PS1 → menu de jeux façon console (projets perso), écran de chargement, écran titre, jeu, bouton retour ;
 *  - « xp »    : le PC de bureau → « L’atelier des processus » (atelier.html), île 3D à explorer. */

const CSS = `
.ov{position:fixed;inset:0;z-index:100;display:none;opacity:0;transition:opacity .35s}
.ov.on{display:block}.ov.show{opacity:1}
#monde-ov.ov{transition:opacity .9s ease,transform .9s ease;transform:scale(.985)}#monde-ov.ov.show{transform:scale(1)}
@media(prefers-reduced-motion:reduce){#monde-ov.ov{transition:none;transform:none}}
.ov *{box-sizing:border-box}
/* ───── console ───── */
#retro{background:#000;font-family:"Press Start 2P","Courier New",monospace;color:#cfe6ff;image-rendering:pixelated}
#retro .scr{position:absolute;inset:0;display:flex;flex-direction:column;padding:clamp(14px,3vw,34px);background:radial-gradient(ellipse at 50% 40%,#0c1a4a 0%,#050a1f 62%,#02040c 100%);animation:flick 4s infinite}
#retro .lines{position:absolute;inset:0;pointer-events:none;z-index:3;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px),radial-gradient(ellipse at center,transparent 58%,rgba(0,0,0,.65) 100%)}
@keyframes flick{0%,100%{filter:brightness(1)}48%{filter:brightness(1.04)}50%{filter:brightness(.96)}52%{filter:brightness(1.02)}}
#retro h1{margin:0;font-size:clamp(12px,2.2vw,22px);font-weight:400;letter-spacing:.06em;color:#ffd34a;text-shadow:2px 2px 0 #3a2a00}
#retro .sub{font-size:clamp(7px,1vw,10px);color:#7fa6d6;margin-top:10px}
#retro .head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #28418a;padding-bottom:14px}
#retro .body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(12px,2.4vw,30px);padding:18px 0}
#retro ul{list-style:none;margin:0;padding:0;overflow:auto;display:flex;flex-direction:column;gap:6px}
#retro li{display:flex;gap:10px;align-items:center;padding:9px 10px;font-size:clamp(8px,1.15vw,12px);line-height:1.5;cursor:var(--cv-action);border:2px solid transparent;color:#a9c4ee}
#retro li i{font-style:normal;color:#5d79b8;min-width:2ch}
#retro li.sel{background:#1a2f78;border-color:#5f86ff;color:#fff}
#retro li.sel::before{content:"";border:6px solid transparent;border-left:10px solid #ffd34a;animation:blk 1s steps(2) infinite}
#retro li:not(.sel)::before{content:"";width:10px}
@keyframes blk{50%{opacity:0}}
#retro .card{border:2px solid #28418a;background:#07123a;padding:clamp(10px,1.6vw,18px);display:flex;flex-direction:column;gap:14px;min-height:0;overflow:auto}
#retro .cover{aspect-ratio:4/3;max-height:36vh;align-self:center;max-width:100%;border:2px solid #000;position:relative;display:flex;align-items:flex-end;padding:0;background-size:100% 100%;image-rendering:pixelated;filter:saturate(.78) contrast(1.08) sepia(.12);box-shadow:0 0 0 2px #28418a,0 0 18px rgba(80,120,255,.35);font-size:clamp(10px,1.8vw,18px);line-height:1.4;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.6);overflow:hidden}
#retro .cover::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.25) 0 1px,transparent 1px 3px)}
#retro .cover span{position:relative;width:100%;padding:18px 12px 8px;background:linear-gradient(transparent,rgba(2,6,24,.9))}
#retro .tag{font-size:clamp(7px,1vw,10px);color:#ffd34a}
#retro .desc{font-family:"Courier New",monospace;font-size:clamp(12px,1.5vw,16px);line-height:1.5;color:#d6e4ff}
#retro .btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:auto}
#retro button,#retro a.b{font:inherit;font-size:clamp(8px,1.1vw,11px);color:#fff;background:#2144c9;border:2px solid #7f9cff;padding:10px 14px;cursor:var(--cv-action);text-decoration:none;display:inline-block;text-shadow:1px 1px 0 #000}
#retro button:hover,#retro a.b:hover{background:#3558ea}
#retro button.alt{background:#2b2f40;border-color:#6a728f}
#retro .foot{display:flex;gap:clamp(12px,3vw,34px);align-items:center;border-top:2px solid #28418a;padding-top:12px;font-size:clamp(7px,1vw,10px);color:#9db6e2;flex-wrap:wrap}
#retro .foot span{display:flex;align-items:center;gap:8px;cursor:var(--cv-action)}
#retro .foot svg{width:22px;height:22px}
#retro .center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center}
#retro .bar{width:min(420px,70vw);height:22px;border:2px solid #7f9cff;padding:2px}
#retro .bar b{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,#ffd34a 0 12px,transparent 12px 15px)}
#retro .play{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px;padding-top:12px}
#retro iframe{flex:1;min-height:0;width:100%;border:2px solid #28418a;background:#000}
#retro .title{font-size:clamp(16px,4vw,38px);color:#fff;text-shadow:4px 4px 0 var(--c,#2144c9);line-height:1.3}
#retro .press{color:#ffd34a;animation:blk 1s steps(2) infinite;font-size:clamp(9px,1.4vw,14px)}
#retro.off .scr{animation:none}
#retro .collapse{position:absolute;inset:0;background:#000;z-index:5;pointer-events:none;opacity:0}
#retro.closing .scr{animation:crt .45s forwards}
@keyframes crt{0%{transform:scale(1,1);filter:brightness(1)}60%{transform:scale(1,.004);filter:brightness(4)}100%{transform:scale(0,0);filter:brightness(0)}}
@media (max-width:720px){#retro .body{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) minmax(0,1fr)}}
`;

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PSX = { x: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#7aa2ff" stroke-width="2"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="#7aa2ff" stroke-width="2.2"/></svg>`, o: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#ff7a7a" stroke-width="2"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="#ff7a7a" stroke-width="2.2"/></svg>`, t: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#6fe3a0" stroke-width="2"/><path d="M12 6.5l5.2 9H6.8z" fill="none" stroke="#6fe3a0" stroke-width="2.2" stroke-linejoin="round"/></svg>` };

let css = null;
function inject() {
  if (css) return; const theme=el('link');theme.rel='stylesheet';theme.href='ps1-menu.css?v=cv-scene-v52';document.head.append(theme);css = el('style', null, CSS); document.head.append(css);
  const l = el('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'; document.head.append(l);
}
function show(root) { root.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('show'))); }
function hide(root, cb) { root.classList.remove('show'); setTimeout(() => { root.classList.remove('on'); cb && cb(); }, 360); }

/* ───────────────────────── Console : projets perso ───────────────────────── */
function retroApp(onClose) {
  const root = el('div', 'ov'); root.id = 'retro';
  const scr = el('div', 'scr'); const lines = el('div', 'lines'); root.append(scr, lines); document.body.append(root);
  let view = 'boot', idx = 0, timer = null, closing=false;
  const psSound=action=>window.dispatchEvent(new CustomEvent('ps1-ui',{detail:{action}}));
  const done = () => { if(closing)return;closing=true;psSound('menu-off');clearTimeout(timer); root.classList.add('closing'); setTimeout(() => { hide(root, () => { root.remove(); root.classList.remove('closing'); }); onClose(); }, 420); window.removeEventListener('keydown', key); };
  const foot = (a) => `<div class="foot">${a.map(([ic, t, k]) => `<button type="button" data-k="${k}">${PSX[ic]}${t}</button>`).join('')}</div>`;
  const bind = () => scr.querySelectorAll('[data-k]').forEach((n) => n.addEventListener('click', (e) => { e.stopPropagation(); act(n.dataset.k); }));
  function act(k) {
    if(closing)return;
    const valid=(k==='back'&&['boot','load','menu','title','play'].includes(view))||(k==='ok'&&['menu','title'].includes(view))||(['up','down'].includes(k)&&view==='menu');
    if(!valid)return;
    if(!(k==='back'&&['boot','menu'].includes(view)))psSound('action');
    if (k === 'back') { if (view === 'menu'||view==='boot') done(); else if (view === 'title' || view === 'play'||view==='load') menu(); }
    else if (k === 'ok') { if (view === 'menu') load(); else if (view === 'title') play(); }
    else if (k === 'up' && view === 'menu') { idx = (idx + PERSO.length - 1) % PERSO.length; menu(true); }
    else if (k === 'down' && view === 'menu') { idx = (idx + 1) % PERSO.length; menu(true); }
  }
  function key(e) {
    const m = { ArrowLeft: 'up', ArrowRight: 'down', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back' }[e.key];
    if (m) { e.preventDefault(); act(m); }
  }
  function boot() {
    view = 'boot';
    scr.innerHTML = `<div class="center"><h1>PROJETS PERSO</h1><div class="sub">MATHIEU ENTERTAINMENT SYSTEM</div><div class="bar"><b></b></div><div class="sub">LECTURE DE LA CARTE MEMOIRE 1…</div></div>`;
    const b = scr.querySelector('b'); let p = 0;
    (function step() { p += 8 + Math.random() * 10; b.style.width = Math.min(p, 100) + '%'; if (p < 100) timer = setTimeout(step, 90); else timer = setTimeout(() => menu(), 250); })();
  }
  function menu(keep) {
    view = 'menu';root.dataset.view=view;psSound('menu-on');clearTimeout(timer);
    const g = PERSO[idx];
    scr.innerHTML = `<div class="ps-library" aria-label="Choisir un jeu">${PERSO.map((p,i)=>`<button class="ps-case ${i===idx?'selected':''}" data-i="${i}" aria-label="${esc(p.n)} — ${p.year}" aria-pressed="${i===idx}" style="--tilt:${Math.max(-12,Math.min(12,(i-idx)*-2))}deg;--drop:${Math.min(35,Math.abs(i-idx)*6)}px"><img src="${p.img}" alt="" width="160" height="120"><span>${esc(p.n)}</span></button>`).join('')}</div>
      <div class="ps-selection"><figure><img class="ps-shot" src="${g.img}" alt="Capture de ${esc(g.n)}" width="640" height="480"><button class="ps-read" data-k="ok">LIRE</button></figure><div class="ps-details"><h1>${esc(g.n)}</h1><p class="ps-publisher">Comt’Star Games</p><p class="ps-year">${g.year}</p></div></div>
      <div class="ps-dock" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h16v11H4zM8 8V5h8v3M4 12h16M10 10v4h4v-4" fill="none" stroke="currentColor" stroke-width="2"/></svg><svg viewBox="0 0 24 24"><path d="M7 7h10l4 11-5-2-2-3h-4l-2 3-5 2zM8 9v5M5.5 11.5h5M16 10v1M18 12v1" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><svg viewBox="0 0 24 24"><path d="M6 3h12v18H6zM9 5h6v5H9zM8 15h8v5H8z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></div>
      ${foot([['x','Valider','ok'],['o','Quitter','back'],['t','Précédent','up'],['t','Suivant','down']])}`;
    scr.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;if(i===idx)act('ok');else{psSound('action');idx=i;menu(true);}}));
    if(keep)scr.querySelector('.ps-case.selected')?.scrollIntoView({block:'nearest',inline:'center'});
    bind();
  }
  function load() {
    view = 'load';root.dataset.view=view;psSound('menu-off');const g = PERSO[idx];
    scr.innerHTML = `<div class="center"><div class="cover" style="background-image:url('${g.img}');width:min(300px,50vw);max-height:30vh"><span></span></div><div class="title" style="--c:${g.color}">${esc(g.n)}</div><div class="sub">NOW LOADING</div><div class="bar"><b></b></div></div>`;
    const b = scr.querySelector('b'); let p = 0;
    (function step() { p += 6 + Math.random() * 14; b.style.width = Math.min(p, 100) + '%'; if (p < 100) timer = setTimeout(step, 80); else timer = setTimeout(title, 220); })();
  }
  function title() {
    view = 'title';root.dataset.view=view;const g = PERSO[idx];
    scr.innerHTML = `<div class="center"><div class="cover" style="background-image:url('${g.img}');width:min(300px,45vw);max-height:26vh"><span></span></div><div class="title" style="--c:${g.color}">${esc(g.n)}</div><div class="sub">Comt’Star Games · ${g.year}</div><div class="press" data-k="ok" style="cursor:var(--cv-action)">PRESS START</div>
      <div class="btns"><button data-k="ok">▶ START</button><a class="b alt" target="_blank" rel="noopener" href="${CV}${g.url}">↗ NOUVEL ONGLET</a></div></div>${foot([['x', 'START', 'ok'], ['o', 'RETOUR', 'back']])}`;
    bind();
  }
  function play() {
    view = 'play';root.dataset.view=view;const g = PERSO[idx];
    scr.innerHTML = `<div class="head"><div><h1>${esc(g.n)}</h1><div class="sub">${g.year} · Comt’Star Games</div></div><button class="alt" data-k="back">◀ RETOUR</button></div>
      <div class="play"><iframe title="${esc(g.n)}" allow="autoplay; fullscreen" src="${CV}${g.url}"></iframe>
      <div class="sub">SI L’ECRAN RESTE NOIR, OUVREZ LE JEU DANS UN ONGLET : <a style="color:#ffd34a" target="_blank" rel="noopener" href="${CV}${g.url}">${CV}${g.url}</a></div></div>${foot([['o', 'RETOUR AU MENU', 'back']])}`;
    bind();
  }
  window.addEventListener('keydown', key);
  show(root); menu();
  return { close: done };
}

/* ───────────────────────── PC de bureau : l'atelier des processus (monde.html, île low poly à explorer) ───────────────────────── */
function mondeApp(onClose) {
  const root = el('div', 'ov'); root.id = 'monde-ov';
  const frame = document.createElement('iframe');
  frame.src = 'monde3d/index.html?v=m11'; frame.title = 'L’atelier des processus de Mathieu Comtesse'; frame.setAttribute('allow', 'fullscreen');
  frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#0b1330';
  root.append(frame); document.body.append(root);
  let closing = false;
  function off() { if (closing) return; closing = true; window.removeEventListener('message', msg); window.removeEventListener('keydown', key); hide(root, () => { root.remove(); onClose(); }); }
  function msg(e) { if (e.data && e.data.type === 'monde-close') off(); }
  function key(e) { if (e.key === 'Escape') off(); }
  window.addEventListener('message', msg); window.addEventListener('keydown', key);
  show(root);
  return { close: off };
}

/* ───────────────────────── liaison avec la pièce 3D ───────────────────────── */
export function initUI() {
  inject();
  let cur = null;
  window.addEventListener('room-request-close',()=>cur?.close());
  window.addEventListener('room-open', (e) => {
    if (cur) return;
    const done = () => { cur = null; window.dispatchEvent(new CustomEvent('room-close', { detail: e.detail })); };
    cur = e.detail.kind === 'xp' ? mondeApp(done) : retroApp(done);
  });
}
