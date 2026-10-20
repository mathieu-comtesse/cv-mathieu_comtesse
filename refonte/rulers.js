// Règles graduées (mêmes que la page d'accueil) : horizontale = « Déplacer » (glisser dans tous les sens), verticale = « Tourner ».
// Cliquet sonore à chaque graduation. onView({ offX, offY, rot, yaw, px, py }) est appelé à chaque changement.
const DEG = Math.PI / 180, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initRulers(onView) {
  const off = { x: 0, y: 0 }; let rot = 0;
  const K = .06, LIM = 250, DEG_PER_PX = .36;
  let ac = null, lastTick = 0;
  const tick = (major) => {
    if (reduced) return;
    const now = performance.now(); if (now - lastTick < 16) return; lastTick = now;
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, f = 1 + (Math.random() - .5) * .1;
      const len = Math.floor(ac.sampleRate * .018), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * .16));
      const n = ac.createBufferSource(); n.buffer = buf;
      const bq = ac.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = (major ? 3900 : 3100) * f; bq.Q.value = 1.4;
      const gn = ac.createGain(); gn.gain.value = major ? .55 : .32;
      n.connect(bq).connect(gn).connect(ac.destination); n.start(t);
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime((major ? 2300 : 1750) * f, t); o.frequency.exponentialRampToValueAtTime(900, t + .02);
      og.gain.setValueAtTime(major ? .07 : .045, t); og.gain.exponentialRampToValueAtTime(.0001, t + .022);
      o.connect(og).connect(ac.destination); o.start(t); o.stop(t + .03);
    } catch {}
  };
  const lastIdx = { x: 0, y: 0, r: 0 };
  const curVal = (k) => (k === 'r' ? rot : off[k]);
  function apply(moved) {
    for (const k of moved || []) {
      const idx = Math.floor(curVal(k) / 5), n = Math.min(3, Math.abs(idx - lastIdx[k]));
      for (let i = 0; i < n; i++) tick((idx - i * Math.sign(idx - lastIdx[k])) % 10 === 0);
      lastIdx[k] = idx;
    }
    if (!moved) for (const k of ['x', 'y', 'r']) lastIdx[k] = Math.floor(curVal(k) / 5);
    document.getElementById('rf-track').style.transform = 'translateY(' + rot + 'px)';   // les graduations défilent sous le repère fixe
    document.getElementById('rf-track-h').style.transform = 'translateX(' + off.x + 'px)';
    onView({ offX: off.x, offY: off.y, rot, yaw: (36 + rot * DEG_PER_PX) * DEG, px: -off.x * K, py: off.y * K });
  }
  function buildTicks(track, horizontal) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i <= 100; i++) {
      const t = document.createElement('div');
      t.className = 'rf-tick' + (i % 10 === 0 ? ' rf-maj' : '');
      t.style[horizontal ? 'left' : 'top'] = i * 5 + 'px';
      if (i % 10 === 0) t.innerHTML = `<span>${(i / 100).toFixed(2)}</span>`;
      frag.append(t);
    }
    track.append(frag);
  }
  function drag(el, mode) {
    let d = null;
    el.addEventListener('pointerdown', (e) => { if (ac && ac.state === 'suspended') ac.resume(); d = { px: e.clientX, py: e.clientY, x: off.x, y: off.y, r: rot }; el.setPointerCapture(e.pointerId); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => {
      if (!d) return;
      if (mode === 'move') { off.x = clamp(d.x + e.clientX - d.px, -LIM, LIM); off.y = clamp(d.y + e.clientY - d.py, -LIM, LIM); apply(['x', 'y']); }
      else { rot = clamp(d.r + e.clientY - d.py, -LIM, LIM); apply(['r']); }
    });
    const end = () => { d = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => { if (mode === 'move') { off.x = 0; off.y = 0; } else rot = 0; apply(); });
    el.addEventListener('keydown', (e) => {
      const step = 20, kmap = mode === 'move'
        ? { ArrowLeft: () => (off.x = clamp(off.x - step, -LIM, LIM), ['x']), ArrowRight: () => (off.x = clamp(off.x + step, -LIM, LIM), ['x']), ArrowUp: () => (off.y = clamp(off.y - step, -LIM, LIM), ['y']), ArrowDown: () => (off.y = clamp(off.y + step, -LIM, LIM), ['y']) }
        : { ArrowUp: () => (rot = clamp(rot - step, -LIM, LIM), ['r']), ArrowDown: () => (rot = clamp(rot + step, -LIM, LIM), ['r']), ArrowLeft: () => (rot = clamp(rot - step, -LIM, LIM), ['r']), ArrowRight: () => (rot = clamp(rot + step, -LIM, LIM), ['r']) };
      if (e.key in kmap) { apply(kmap[e.key]()); e.preventDefault(); } else if (e.key === 'Home') { if (mode === 'move') { off.x = 0; off.y = 0; } else rot = 0; apply(); }
    });
  }
  const v = document.getElementById('rf-ruler'), h = document.getElementById('rf-ruler-h');
  buildTicks(document.getElementById('rf-track'), false); buildTicks(document.getElementById('rf-track-h'), true);
  drag(h, 'move'); drag(v, 'turn');
  apply();
}
