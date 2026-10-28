// Règles graduées (mêmes que la page d'accueil) : horizontale = « Tourner » (glisser à gauche / à droite), verticale = « Incliner » (angle de vue, de bas en haut).
// Cliquet sonore à chaque graduation. onView({ rot, tilt, yaw, pitch }) est appelé à chaque changement.
const DEG = Math.PI / 180, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initRulers(onView) {
  let rot = 0, tilt = 0;
  const LIM = 250, DEG_PER_PX = .36, EL0 = 26;
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
  const lastIdx = { r: 0, t: 0 };
  const curVal = (k) => (k === 'r' ? rot : tilt);
  function apply(moved) {
    for (const k of moved || []) {
      const idx = Math.floor(curVal(k) / 5), n = Math.min(3, Math.abs(idx - lastIdx[k]));
      for (let i = 0; i < n; i++) tick((idx - i * Math.sign(idx - lastIdx[k])) % 10 === 0);
      lastIdx[k] = idx;
    }
    if (!moved) for (const k of ['r', 't']) lastIdx[k] = Math.floor(curVal(k) / 5);
    document.getElementById('rf-track').style.transform = 'translateY(' + tilt + 'px)';   // les graduations défilent sous le repère fixe
    document.getElementById('rf-track-h').style.transform = 'translateX(' + rot + 'px)';
    for(const [id,value] of [['rf-ruler',tilt],['rf-ruler-h',rot]]){const el=document.getElementById(id);el.setAttribute('aria-valuemin',String(-LIM));el.setAttribute('aria-valuemax',String(LIM));el.setAttribute('aria-valuenow',String(Math.round(value)));el.setAttribute('aria-valuetext',Math.round(value)===0?'Angle d’origine':Math.round(value)+' graduations');}
    onView({ rot, tilt, yaw: (36 + rot * DEG_PER_PX) * DEG, pitch: (tilt >= 0 ? EL0 + tilt * (82 - EL0) / LIM : EL0 + tilt * (EL0 - 6) / LIM) * DEG });
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
    const horiz = mode === 'turn', key = horiz ? 'r' : 't';
    const get = () => (horiz ? rot : tilt), set = (v) => { v = clamp(v, -LIM, LIM); if (horiz) rot = v; else tilt = v; };
    el.addEventListener('pointerdown', (e) => { if (ac && ac.state === 'suspended') ac.resume(); d = { px: e.clientX, py: e.clientY, v: get() }; el.setPointerCapture(e.pointerId); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (!d) return; set(d.v + (horiz ? e.clientX - d.px : e.clientY - d.py)); apply([key]); });
    const end = () => { d = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => { set(0); apply(); });
    el.addEventListener('keydown', (e) => {
      const step = 20, dir = horiz ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
      if (e.key in dir) { set(get() + dir[e.key] * step); apply([key]); e.preventDefault(); } else if (e.key === 'Home') { set(0); apply(); }
    });
  }
  const v = document.getElementById('rf-ruler'), h = document.getElementById('rf-ruler-h');
  buildTicks(document.getElementById('rf-track'), false); buildTicks(document.getElementById('rf-track-h'), true);
  drag(h, 'turn'); drag(v, 'tilt');
  apply();
}
