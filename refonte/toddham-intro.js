/*
  Intro inspired by Toddham, reconstructed from a timestamped DOM/animation
  trace (2026-10-21). Independent, no source-site code or assets required.
  Include as the FIRST element under <body>:
    <script src="toddham-intro.js"></script>
  Options, declare before this script:
    window.ToddhamIntroOptions = { minDuration: 1026, color: '#C5EA81' };
  Replay: window.ToddhamIntro.replay();
*/
(() => {
  'use strict';
  if (window.ToddhamIntro) return;

  const opts = Object.assign({
    minDuration: 1026,
    color: '#C5EA81', // The source JSON names a green CSS variable, but not its hex value.
    background: '#232324',
    duration: 500,
    waitForLoad: true,
    manual: false,        // true : le chargeur ne s'ouvre que lorsque la page appelle ToddhamIntro.done()
    maxWait: 15000,       // sécurité : ouverture forcée si done() n'est jamais appelé
    text: 'LOADING • '    // motif répété pour faire 60 caractères (donc de 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30 ou 60 caractères)
  }, window.ToddhamIntroOptions || {});
  const css = `
  #th-intro-cover {
    position:fixed!important;inset:0!important;z-index:2147483000!important;
    background:var(--th-bg,#232324)!important;
    transform:scaleY(1);transform-origin:50% 0%;pointer-events:all;
    will-change:transform;contain:paint;
  }
  #th-intro-spinner {
    position:fixed!important;top:50%!important;left:50%!important;
    width:120px!important;height:120px!important;z-index:2147483001!important;
    transform:translate(-50%,-50%);color:var(--th-green,#C5EA81);
    pointer-events:none;overflow:visible!important;
  }
  #th-intro-ring {position:absolute;inset:0;display:block;animation:th-spin 6000ms linear infinite;
    font-family:'Google Sans Code', 'Courier New',monospace;font-size:11px;
    font-weight:500;line-height:1;}
  #th-intro-ring > span {position:absolute;top:50%;left:50%;display:block;white-space:pre;
    transform:translate(-50%,-50%) rotate(calc(var(--i) * 360deg / var(--n,60))) translateY(-76px);
    transform-origin:center center;}
  @keyframes th-spin {from{rotate:0deg}to{rotate:-360deg}}
  /* These normalized intermediate scaleY values come from the supplied trace. */
  @keyframes th-reveal {
    0%{transform:scaleY(1)}
    5%{transform:scaleY(.785550)}
    10%{transform:scaleY(.597646)}
    15%{transform:scaleY(.446256)}
    20%{transform:scaleY(.325359)}
    25%{transform:scaleY(.234052)}
    30%{transform:scaleY(.167880)}
    35%{transform:scaleY(.117989)}
    40%{transform:scaleY(.082741)}
    45%{transform:scaleY(.057111)}
    50%{transform:scaleY(.038621)}
    55%{transform:scaleY(.025482)}
    60%{transform:scaleY(.016315)}
    65%{transform:scaleY(.010030)}
    70%{transform:scaleY(.005791)}
    75%{transform:scaleY(.003080)}
    80%{transform:scaleY(.001443)}
    85%{transform:scaleY(.000573)}
    90%{transform:scaleY(.000160)}
    95%{transform:scaleY(.000018)}
    100%{transform:scaleY(0)}
  }
  `;

  const style = document.createElement('style');
  style.id = 'th-intro-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  let cover, spinner, cycle = 0, startedAt = 0, loadReady = false;
  const reduced = false;   // l'animation est toujours jouée, même si « réduire les animations » est activé

  function clear() {
    cover?.remove();spinner?.remove();cover=null;spinner=null;
  }

  function mount() {
    clear();
    cover = document.createElement('div');
    cover.id = 'th-intro-cover';
    cover.setAttribute('aria-hidden','true');
    cover.style.setProperty('--th-bg', opts.background);
    spinner = document.createElement('div');
    spinner.id = 'th-intro-spinner';
    spinner.setAttribute('aria-label','Chargement');
    spinner.setAttribute('role','status');
    spinner.style.setProperty('--th-green', opts.color);
    const ring = document.createElement('span');
    ring.id = 'th-intro-ring';
    ring.setAttribute('aria-hidden','true');
    // Six repetitions, sixty letters, exactly as observed in the DOM trace.
    const letters = opts.text.repeat(Math.max(1, Math.round(60 / opts.text.length)));   // le motif est répété en entier : les lettres se répartissent sur tout le cercle, sans trou
    ring.style.setProperty('--n', letters.length);
    for (let i=0; i<letters.length; i++) {
      const span = document.createElement('span');
      span.style.setProperty('--i', i);
      span.textContent = letters[i];
      ring.appendChild(span);
    }
    spinner.appendChild(ring);
    // Append over the entire page, regardless of layout containers.
    (document.body || document.documentElement).append(cover, spinner);
  }

  function reveal(id) {
    if (id !== cycle || !cover) return;
    if (reduced) { clear();return; }
    spinner.style.opacity = '0';
    spinner.style.visibility = 'hidden';
    cover.style.animation = `th-reveal ${opts.duration}ms linear both`;
    const currentCover = cover;
    const currentSpinner = spinner;
    currentCover.addEventListener('animationend', () => {
      if (id !== cycle) return;
      currentCover.remove();currentSpinner.remove();
      if (cover === currentCover) cover = null;
      if (spinner === currentSpinner) spinner = null;
      document.dispatchEvent(new CustomEvent('toddham-intro-complete'));
    }, {once:true});
  }

  function maybeReveal(id) {
    if (id !== cycle || !loadReady) return;
    const remaining = Math.max(0, opts.minDuration - (performance.now() - startedAt));
    setTimeout(() => reveal(id), remaining);
  }

  function start(replay = false) {
    const id = ++cycle;
    startedAt = performance.now();
    mount();
    loadReady = replay || (!opts.manual && (!opts.waitForLoad || document.readyState === 'complete'));
    if (loadReady) maybeReveal(id);
    else if (opts.manual) {
      setTimeout(() => { if (id === cycle) { loadReady = true; maybeReveal(id); } }, opts.maxWait);
    } else {
      const done = () => { if (id === cycle) { loadReady = true;maybeReveal(id); } };
      window.addEventListener('load', done, {once:true});
      // Do not leave the user on a permanent loader if some resource fails.
      setTimeout(done, 8000);
    }
  }

  window.ToddhamIntro = {
    replay() {start(true);},
    skip() {++cycle;clear();},
    done() {loadReady = true;maybeReveal(cycle);},
    setColor(color) {opts.color=color;spinner?.style.setProperty('--th-green',color);},
    setDuration(milliseconds) {opts.minDuration=Math.max(0,milliseconds);},
    options:opts
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', () => start(), {once:true});
})();
