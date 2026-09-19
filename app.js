'use strict';
(() => {
  const stage = document.querySelector('.rail-art');
  if (!stage) return;
  const steam = document.getElementById('steam-sprite');
  const video = document.getElementById('steam-video');
  const tgv = document.getElementById('tgv-sprite');
  const motion = document.getElementById('motion');
  const label = document.getElementById('motion-label');
  const icon = document.getElementById('motion-icon');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation = null, userPaused = preference.matches, inView = true;
  let phase = 'steam', modernReady = false;
  video.muted = true;
  function sync() {
    const paused = phase === 'steam' ? video.paused : !animation || animation.playState !== 'running';
    motion.setAttribute('aria-pressed', String(paused));
    motion.setAttribute('aria-label', paused ? 'Lire l’animation' : 'Mettre l’animation en pause');
    label.textContent = paused ? 'Lecture' : 'Pause';
    icon.setAttribute('d', paused ? 'M6 4l9 6-9 6z' : 'M7 5v10M13 5v10');
  }
  function updatePlayback() {
    const paused = userPaused || document.hidden || !inView;
    if (phase === 'steam') {
      if (paused) video.pause();
      else video.play().catch(() => { sync(); });
    } else if (animation) {
      if (paused) animation.pause(); else animation.play();
    }
    sync();
  }
  function startSteam() {
    if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
    phase = stage.dataset.train = 'steam';
    steam.hidden = false;
    tgv.hidden = true;
    video.currentTime = 0;
    updatePlayback();
  }
  function startModern() {
    if (!modernReady) { startSteam(); return; }
    video.pause();
    phase = stage.dataset.train = 'tgv';
    steam.hidden = true;
    tgv.hidden = false;
    animation = tgv.animate([
      {transform:'translate3d(-100%,0,0)',offset:0},
      {transform:'translate3d(-100%,0,0)',offset:.025},
      {transform:'translate3d(80%,0,0)',offset:.95},
      {transform:'translate3d(80%,0,0)',offset:1}
    ],{duration:12000,easing:'linear',fill:'both'});
    animation.onfinish = startSteam;
    updatePlayback();
  }
  tgv.querySelector('img').decode().then(() => { modernReady = true; }).catch(() => {});
  video.addEventListener('ended', startModern);
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  video.addEventListener('loadedmetadata', () => {
    if (userPaused && phase === 'steam' && video.currentTime === 0) video.currentTime = Math.min(3, video.duration / 2);
  });
  video.addEventListener('error', () => { if (modernReady) startModern(); else { userPaused = true; sync(); } });
  motion.addEventListener('click', () => { userPaused = !userPaused; updatePlayback(); });
  preference.addEventListener('change', event => { userPaused = event.matches; updatePlayback(); });
  document.addEventListener('visibilitychange', updatePlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; updatePlayback(); },{rootMargin:'100px',threshold:0}).observe(stage);
  }
  stage.dataset.train = phase;
  if (userPaused && video.readyState >= 1) video.currentTime = Math.min(3, video.duration / 2);
  updatePlayback();
})();

// Each animation is a schematic explanation, independent of the real applications.
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [...document.querySelectorAll('[data-scene]')].map(element => {
    const scene = { element, frames: [...element.querySelectorAll('[data-frame]')], descriptions: [...element.querySelectorAll('[data-description]')], steps: [...element.querySelectorAll('[data-step]')], nodes: [...element.querySelectorAll('.flow-steps li')], toggle: element.querySelector('.scene-toggle'), index: 0, paused: preference.matches, visible: false };
    function render() {
      element.classList.add('is-ready');
      element.dataset.active = String(scene.index);
      const counter = element.querySelector('.scene-counter');
      if(counter) counter.textContent = String(scene.index + 1).padStart(2,'0') + ' / ' + String(scene.frames.length).padStart(2,'0');
      scene.frames.forEach((frame, i) => frame.classList.toggle('is-active', i === scene.index));
      scene.descriptions.forEach((description, i) => description.classList.toggle('is-active', i === scene.index));
      scene.nodes.forEach((node, i) => node.classList.toggle('is-active', i === scene.index));
      scene.steps.forEach((step, i) => { if (i === scene.index) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current'); });
      scene.toggle.textContent = scene.paused ? 'Lire' : 'Pause';
      scene.toggle.setAttribute('aria-pressed', String(!scene.paused));
    }
    scene.render = render;
    scene.toggle.addEventListener('click', () => { scene.paused = !scene.paused; render(); });
    scene.steps.forEach((step, i) => step.addEventListener('click', () => { scene.paused = true; scene.index = i; render(); }));
    render();
    return scene;
  });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const scene = scenes.find(item => item.element === entry.target);
      if (scene) scene.visible = entry.isIntersecting;
    }
  }, { threshold: 0.15 });
  scenes.forEach(scene => observer.observe(scene.element));
  preference.addEventListener('change', event => {
    scenes.forEach(scene => { scene.paused = event.matches; scene.render(); });
  });
  window.setInterval(() => {
    if (document.hidden) return;
    scenes.forEach(scene => {
      if (!scene.visible || scene.paused) return;
      scene.index = (scene.index + 1) % scene.frames.length;
      scene.render();
    });
  }, 3800);
})();

// Calque « négatif » : une silhouette du croquis suit le pointeur (sous le curseur système) et inverse ce qu'elle recouvre.
(() => {
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)');
  const supported = window.CSS && (CSS.supports('backdrop-filter', 'invert(1)') || CSS.supports('-webkit-backdrop-filter', 'invert(1)'));
  if (!fine.matches || !supported) return;
  const W = 49, H = 62, TIP_X = 1, TIP_Y = 0; // même géométrie et même point chaud que le curseur système
  const ghost = document.createElement('div');
  ghost.className = 'cursor-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.hidden = true;
  document.body.append(ghost);
  document.documentElement.classList.add('has-ghost');
  let x = -200, y = -200, raf = 0;
  const paint = () => {
    raf = 0;
    ghost.style.transform = 'translate3d(' + (x - TIP_X) + 'px,' + (y - TIP_Y) + 'px,0)';
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    ghost.hidden = false;
    if (!raf) raf = requestAnimationFrame(paint);
  }, {passive: true});
  document.documentElement.addEventListener('mouseleave', () => { ghost.hidden = true; });
})();

// Schémas animés : chaque boîte reçoit une barre de titre « fenêtre » pour rejoindre la charte des panneaux.
(() => {
  document.querySelectorAll('.scene-stage svg .scene-frame').forEach(frame => {
    frame.querySelectorAll('rect:not(.diagram-shadow):not(.selected):not(.bar):not(.win-bar)').forEach(r => {
      const w = +r.getAttribute('width'), h = +r.getAttribute('height');
      if (!(w >= 60 && h >= 40)) return;
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('class', 'win-bar');
      bar.setAttribute('x', r.getAttribute('x')); bar.setAttribute('y', r.getAttribute('y'));
      bar.setAttribute('width', w); bar.setAttribute('height', 9);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      dot.setAttribute('class', 'win-dot');
      dot.setAttribute('x', +r.getAttribute('x') + 3); dot.setAttribute('y', +r.getAttribute('y') + 3);
      dot.setAttribute('width', 3); dot.setAttribute('height', 3);
      r.after(bar, dot);
    });
  });
})();

// Barre de nuances : chaque nuance devient la couleur d'accent des bandes en direct ; l'encre des bandes suit la luminance.
(() => {
  const bar = document.querySelector('.shade-bar'); if (!bar) return;
  const root = document.documentElement;
  const lum = hex => { const n = parseInt(hex, 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const apply = hex => {
    const dark = lum(hex) < .35;
    root.style.setProperty('--pink', '#' + hex);
    root.style.setProperty('--pink-ink', dark ? '#fefefe' : '#1e1e1e');
    root.style.setProperty('--pink-ink-86', dark ? 'rgba(254,254,254,.9)' : 'rgba(30,30,30,.86)');
    bar.querySelectorAll('.shade').forEach(b => b.classList.toggle('is-current', b.dataset.hex === hex));
    try { localStorage.setItem('cv-accent', hex); } catch (_) {}
  };
  bar.querySelectorAll('.shade').forEach(b => { b.classList.toggle('is-dark', lum(b.dataset.hex) < .35); b.addEventListener('click', () => apply(b.dataset.hex)); });
  let saved = null; try { saved = localStorage.getItem('cv-accent'); } catch (_) {}
  apply(saved && bar.querySelector(`.shade[data-hex="${saved}"]`) ? saved : '272AF5');
})();
