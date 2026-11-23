// THALEOLITHIC papier : les sons du village, tous synthétisés (Web Audio, aucun fichier) et tenus bas, comme le veut le
// skill : le papier (les rabats et les pas viennent du kit paper-sound), le monde préhistorique (vent dans les pins,
// pluie, feu qui crépite, oiseaux, mammouth au loin, tonnerre) et la trame (marimba d'os à chaque quête, carillon de
// preuve, bûche sourde à l'erreur, cor d'alarme au feu, tambours et cor du duel, chant de victoire, mort grotesque).
// Chaque son s'écrit play(ac, sortie, instant) : le même code joue en direct et se rend hors ligne pour une vidéo.

const NOTES = { A2: 110, C3: 130.8, D3: 146.8, E3: 164.8, G3: 196, A3: 220, C4: 261.6, D4: 293.7, E4: 329.6, G4: 392, A4: 440, C5: 523.3, D5: 587.3 };
let NOISE = null;
const noise = (ac) => {   // 4 s of pink-ish noise, shared
  if (NOISE && NOISE.sampleRate === ac.sampleRate) return NOISE;
  const n = ac.sampleRate * 4, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + 0.029 * w; b1 = 0.985 * b1 + 0.032 * w; b2 = 0.95 * b2 + 0.048 * w; d[i] = (b0 + b1 + b2 + w * 0.18) * 0.55; }
  return (NOISE = b);
};
const env = (ac, t, a, hold, r, peak = 1) => { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r); return g; };
const src = (ac, t, dur, rate = 1) => { const s = ac.createBufferSource(); s.buffer = noise(ac); s.playbackRate.value = rate; s.start(t, Math.random() * 3, dur + 0.05); return s; };
const filt = (ac, type, f, q = 1) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
const osc = (ac, type, f, t, dur) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o; };
const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };

// ---- the sounds ------------------------------------------------------------------------------------------------------
export const SFX = {
  // a dry bone or wood knock (a click, a pick in the menus)
  bone(ac, out, t, { f = 1900, v = 0.35 } = {}) { for (const [k, ff] of [[0, f], [0.012, f * 1.37]]) chain(src(ac, t + k, 0.06, 1.5), filt(ac, 'bandpass', ff, 12), env(ac, t + k, 0.002, 0, 0.07, v), out); },
  // a hollow log: the mistake
  log(ac, out, t, { v = 0.5 } = {}) { const o = osc(ac, 'sine', 140, t, 0.5); o.frequency.exponentialRampToValueAtTime(70, t + 0.35); chain(o, env(ac, t, 0.005, 0.02, 0.4, v), out); chain(src(ac, t, 0.1), filt(ac, 'lowpass', 600), env(ac, t, 0.002, 0, 0.12, v * 0.5), out); },
  // a skin drum: a membrane that drops in pitch, and the slap of the hand
  drum(ac, out, t, { f = 90, v = 0.6, slap = 0.3 } = {}) { const o = osc(ac, 'sine', f * 1.8, t, 0.6); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); chain(o, env(ac, t, 0.003, 0.02, 0.45, v), out); chain(src(ac, t, 0.08), filt(ac, 'bandpass', 900, 0.8), env(ac, t, 0.001, 0, 0.09, v * slap), out); },
  // a bone marimba note: a fundamental and a quick fourth partial
  note(ac, out, t, { f = 440, v = 0.25, len = 0.9 } = {}) { chain(osc(ac, 'sine', f, t, len), env(ac, t, 0.004, 0, len, v), out); chain(osc(ac, 'sine', f * 3.98, t, 0.2), env(ac, t, 0.002, 0, 0.18, v * 0.35), out); chain(src(ac, t, 0.03, 2), filt(ac, 'bandpass', f * 2, 6), env(ac, t, 0.001, 0, 0.03, v * 0.3), out); },
  // a conch or mammoth-horn call: a buzzing low saw through a closing mouth, with vibrato
  horn(ac, out, t, { f = 110, dur = 1.1, v = 0.22, bend = 0 } = {}) {
    const o = osc(ac, 'sawtooth', f, t, dur + 0.5), lfo = osc(ac, 'sine', 5.2, t, dur + 0.5), lg = ac.createGain(); lg.gain.value = f * 0.02; chain(lfo, lg); lg.connect(o.frequency);
    if (bend) o.frequency.exponentialRampToValueAtTime(f * bend, t + dur);
    const lp = filt(ac, 'lowpass', 500, 4); lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1100, t + 0.25); lp.frequency.linearRampToValueAtTime(600, t + dur);
    chain(o, lp, env(ac, t, 0.15, dur - 0.2, 0.4, v), out);
  },
  // air moved fast: the jump, a swing
  whoosh(ac, out, t, { v = 0.3, from = 400, to = 2200, dur = 0.35 } = {}) { const b = filt(ac, 'bandpass', from, 3); b.frequency.exponentialRampToValueAtTime(to, t + dur); chain(src(ac, t, dur), b, env(ac, t, dur * 0.4, 0, dur * 0.6, v), out); },
  // a blow that lands: a bone crack and a thump
  hit(ac, out, t, { v = 0.5 } = {}) { SFX.drum(ac, out, t, { f: 70, v: v * 0.9, slap: 0.6 }); chain(src(ac, t, 0.05, 2), filt(ac, 'highpass', 2500), env(ac, t, 0.001, 0, 0.05, v * 0.6), out); },
  // wicker raised: a dry rustle
  rustle(ac, out, t, { v = 0.25, dur = 0.3 } = {}) { chain(src(ac, t, dur, 1.6), filt(ac, 'bandpass', 3200, 1.5), env(ac, t, 0.02, dur * 0.4, dur * 0.5, v), out); },
  // paper crumpled: dense crackles
  crumple(ac, out, t, { v = 0.35, dur = 0.6 } = {}) { for (let k = 0; k < 22; k++) { const tt = t + Math.random() * dur; chain(src(ac, tt, 0.03, 1.4), filt(ac, 'bandpass', 1500 + Math.random() * 4000, 3), env(ac, tt, 0.001, 0, 0.03 + Math.random() * 0.04, v * (0.4 + Math.random() * 0.6)), out); } },
  // the grotesque death: a wet squelch, falling, bubbling
  squelch(ac, out, t, { v = 0.55 } = {}) {
    const o = osc(ac, 'sine', 180, t, 0.7); o.frequency.exponentialRampToValueAtTime(38, t + 0.55); const am = osc(ac, 'sine', 23, t, 0.7), ag = ac.createGain(); ag.gain.value = 0.5; chain(am, ag);
    const g = env(ac, t, 0.01, 0.15, 0.45, v); ag.connect(g.gain); chain(o, g, out);
    const b = filt(ac, 'lowpass', 1200, 6); b.frequency.exponentialRampToValueAtTime(140, t + 0.5); chain(src(ac, t, 0.6, 0.7), b, env(ac, t, 0.005, 0.1, 0.4, v * 0.8), out);
  },
  // the paper ghost: a wobbling, rising moan
  ghost(ac, out, t, { v = 0.12, dur = 2.4 } = {}) { const o = osc(ac, 'sine', 320, t, dur); o.frequency.exponentialRampToValueAtTime(760, t + dur); const l = osc(ac, 'sine', 6.5, t, dur), lg = ac.createGain(); lg.gain.value = 22; chain(l, lg); lg.connect(o.frequency); chain(o, env(ac, t, 0.4, dur - 0.9, 0.5, v), out); },
  // water thrown on embers: a splash, then a long hiss of steam that dies away
  hiss(ac, out, t, { v = 0.3, dur = 1.4 } = {}) { chain(src(ac, t, 0.18, 0.8), filt(ac, 'lowpass', 900, 1), env(ac, t, 0.004, 0.03, 0.15, v * 0.9), out); const b = filt(ac, 'highpass', 3800, 0.7); chain(src(ac, t + 0.05, dur, 1.3), b, env(ac, t + 0.05, 0.06, dur * 0.2, dur * 0.8, v * 0.6), out); },
  // a grunt, a mumble: one syllable of cave speech. A buzzing glottal saw at the speaker's pitch through two vowel
  // formants (the syllable's own vowel, scaled by the speaker's size), a growl (a fast tremor) for the rough voices, a
  // waver for the old, a breath of noise; the pitch falls (a statement) or rises (a question)
  grunt(ac, out, t, { f0 = 120, dur = 0.16, vowel = 'a', v = 0.2, rough = 0, trem = 0, breath = 0.15, bend = -0.12, size = 1, closed = false } = {}) {
    const ok = (x, d) => (Number.isFinite(x) ? x : d); f0 = Math.max(40, ok(f0, 120)); dur = Math.max(0.05, ok(dur, 0.16)); size = ok(size, 1) || 1; rough = ok(rough, 0); trem = ok(trem, 0); bend = ok(bend, -0.1); v = ok(v, 0.15);
    const F = { a: [760, 1250], e: [520, 1800], i: [330, 2250], o: [500, 880], u: [350, 760], y: [330, 1900] }[vowel] || [600, 1300];
    const o = osc(ac, 'sawtooth', f0, t, dur + 0.1); o.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * (1 + bend)), t + dur);
    if (trem) { const l = osc(ac, 'sine', 6.5, t, dur + 0.1), lg = ac.createGain(); lg.gain.value = f0 * trem; chain(l, lg); lg.connect(o.frequency); }
    const g = env(ac, t, 0.012, dur * 0.55, dur * 0.45 + 0.04, v);
    if (rough) { const am = osc(ac, 'square', 31 + Math.random() * 12, t, dur + 0.1), ag = ac.createGain(); ag.gain.value = v * rough * 0.7; chain(am, ag); ag.connect(g.gain); }
    // the two formants that make the vowel
    for (const [k, [ff, q, lv]] of [[F[0] * size, 7, 1], [F[1] * size, 9, 0.55]].entries()) { const b = filt(ac, 'bandpass', ff, q), bg = ac.createGain(); bg.gain.value = lv * (closed ? (k ? 0.25 : 0.8) : 1) * 3.2; chain(o, b, bg, g); }
    if (closed) { const lp = filt(ac, 'lowpass', 380, 1), lg = ac.createGain(); lg.gain.value = 0.9; chain(o, lp, lg, g); }
    g.connect(out);
    if (breath) chain(src(ac, t, dur, 1.2), filt(ac, 'bandpass', F[1] * size * 1.3, 2), env(ac, t, 0.01, dur * 0.3, dur * 0.5, v * breath), out);
  },
  // a slide whistle down: beaten
  slide(ac, out, t, { v = 0.15 } = {}) { const o = osc(ac, 'triangle', 1300, t, 1.0); o.frequency.exponentialRampToValueAtTime(240, t + 0.9); chain(o, env(ac, t, 0.02, 0.6, 0.3, v), out); },
  // the tribe shouts and sings: a short vowel chord
  chant(ac, out, t, { v = 0.16, dur = 1.4, root = 'D3' } = {}) {
    for (const [k, m] of [[0, 1], [1, 1.25], [2, 1.5], [3, 2]]) { const o = osc(ac, 'sawtooth', NOTES[root] * m * (1 + (Math.random() - 0.5) * 0.008), t + k * 0.03, dur), f1 = filt(ac, 'bandpass', 700, 4), f2 = filt(ac, 'bandpass', 1150, 5), g = env(ac, t + k * 0.03, 0.08, dur - 0.5, 0.4, v * 0.5); chain(o, f1, g); chain(o, f2, g); g.connect(out); }
    SFX.drum(ac, out, t, { f: 60, v: 0.5 });
  },
  // a far mammoth: a high horn that rises then falls
  trumpet(ac, out, t, { v = 0.06 } = {}) { SFX.horn(ac, out, t, { f: 300, dur: 1.2, v, bend: 0.7 }); },
  // a small bird chirp
  bird(ac, out, t, { v = 0.04 } = {}) { for (let k = 0; k < 3; k++) { const tt = t + k * 0.09, o = osc(ac, 'sine', 2600 + Math.random() * 900, tt, 0.07); o.frequency.exponentialRampToValueAtTime(3800, tt + 0.05); chain(o, env(ac, tt, 0.005, 0.02, 0.04, v), out); } },
  // thunder far off
  thunder(ac, out, t, { v = 0.35 } = {}) { chain(src(ac, t, 3.2, 0.4), filt(ac, 'lowpass', 160, 0.7), env(ac, t, 0.25, 0.4, 2.4, v), out); chain(src(ac, t + 0.05, 0.4, 0.8), filt(ac, 'lowpass', 900), env(ac, t + 0.05, 0.01, 0, 0.35, v * 0.4), out); },
  // a stone that rolls: the wheel
  rumble(ac, out, t, { v = 0.3, dur = 3 } = {}) { const b = filt(ac, 'lowpass', 180, 1.5); const am = osc(ac, 'sine', 3, t, dur), ag = ac.createGain(); ag.gain.value = 0.4; chain(am, ag); const g = env(ac, t, 0.5, dur - 1, 0.8, v); ag.connect(g.gain); chain(src(ac, t, dur, 0.5), b, g, out); },
  // one fire crackle
  crackle(ac, out, t, { v = 0.12 } = {}) { chain(src(ac, t, 0.03, 1.8), filt(ac, 'bandpass', 1800 + Math.random() * 3500, 4), env(ac, t, 0.001, 0, 0.015 + Math.random() * 0.03, v * (0.3 + Math.random())), out); },
};
// the motifs of the story, on the bone marimba (a minor pentatonic, A C D E G)
export const MOTIF = {
  action(ac, out, t) { SFX.note(ac, out, t, { f: NOTES.E4, v: 0.14 }); SFX.note(ac, out, t + 0.12, { f: NOTES.A4, v: 0.14 }); },
  evidence(ac, out, t) { SFX.note(ac, out, t, { f: NOTES.G4, v: 0.12, len: 1.4 }); SFX.note(ac, out, t + 0.02, { f: NOTES.D5, v: 0.08, len: 1.4 }); },
  quest(ac, out, t) { [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4, NOTES.A4].forEach((f, k) => SFX.note(ac, out, t + k * 0.14, { f, v: 0.17 })); SFX.drum(ac, out, t + 0.7, { f: 70, v: 0.45 }); },
  alarm(ac, out, t) { for (let k = 0; k < 3; k++) SFX.horn(ac, out, t + k * 1.3, { f: 98, dur: 0.9, v: 0.2 }); },
  ending(ac, out, t) { MOTIF.quest(ac, out, t); SFX.chant(ac, out, t + 0.9, { dur: 2.2 }); },
  stinger(ac, out, t) { SFX.horn(ac, out, t, { f: 73.4, dur: 2.2, v: 0.12 }); SFX.note(ac, out, t + 0.4, { f: NOTES.E4, v: 0.1, len: 1.6 }); SFX.note(ac, out, t + 0.9, { f: NOTES.A4, v: 0.08, len: 1.6 }); },
  death(ac, out, t) { SFX.squelch(ac, out, t); SFX.crumple(ac, out, t + 0.35); SFX.ghost(ac, out, t + 0.8); },
};

// ---- the beds: wind, rain, fire; levels set every frame (live) or sampled into automation (offline) ---------------------
function beds(ac, out) {
  const loop = (rate) => { const s = ac.createBufferSource(); s.buffer = noise(ac); s.loop = true; s.playbackRate.value = rate; s.start(); return s; };
  const wind = filt(ac, 'bandpass', 500, 0.7), wg = ac.createGain(); wg.gain.value = 0; chain(loop(0.6), wind, wg, out);
  const leaves = filt(ac, 'highpass', 3500, 0.5), lg = ac.createGain(); lg.gain.value = 0; chain(loop(1.2), leaves, lg, out);
  const rain = filt(ac, 'bandpass', 2600, 0.4), rg = ac.createGain(); rg.gain.value = 0; chain(loop(1.0), rain, rg, out);
  const fire = filt(ac, 'lowpass', 220, 0.8), fg = ac.createGain(); fg.gain.value = 0; chain(loop(0.35), fire, fg, out);
  // the river: a babble, two bands of water noise whose levels wobble out of step
  const rv1 = filt(ac, 'bandpass', 420, 1.2), rv2 = filt(ac, 'bandpass', 1350, 1.6), vg = ac.createGain(); vg.gain.value = 0;
  const wob = (f, d) => { const o = ac.createOscillator(); o.frequency.value = f; const g = ac.createGain(); g.gain.value = d; o.connect(g); o.start(); return g; };
  const b1 = ac.createGain(), b2 = ac.createGain(); b1.gain.value = 0.6; b2.gain.value = 0.4; wob(3.1, 0.35).connect(b1.gain); wob(4.7, 0.3).connect(b2.gain);
  chain(loop(0.9), rv1, b1, vg); chain(loop(1.3), rv2, b2, vg); vg.connect(out);
  return { set(at, { gust = 0.4, rain: r = 0, fire: f = 0, river: rv = 0 }, ramp = 0.1) {
    vg.gain.linearRampToValueAtTime(0.13 * rv, at + ramp);
    wg.gain.linearRampToValueAtTime(0.045 + 0.09 * gust, at + ramp); wind.frequency.linearRampToValueAtTime(320 + 420 * gust, at + ramp);
    lg.gain.linearRampToValueAtTime(0.012 * Math.max(0, gust - 0.5), at + ramp); rg.gain.linearRampToValueAtTime(0.11 * r, at + ramp); fg.gain.linearRampToValueAtTime(0.12 * f, at + ramp);
  } };
}
// master: a gentle compressor and a short "open air" reverb
function master(ac, dest, volume = 0.8) {
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; const vol = ac.createGain(); vol.gain.value = volume; chain(comp, vol, dest);
  const n = Math.round(ac.sampleRate * 1.6), ir = ac.createBuffer(2, n, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * 0.5; }
  const verb = ac.createConvolver(); verb.buffer = ir; const send = ac.createGain(); send.gain.value = 0.22; const bus = ac.createGain(); chain(bus, comp); chain(bus, send, verb, comp);
  return { bus, vol };
}

/** The live sound of the game: unlocked by the first gesture; mute with N. */
export function createSound() {
  let ac = null, M = null, B = null, muted = false, nextCrackle = 0, nextAmbient = 0;
  const S = {
    get ready() { return !!ac; },
    unlock() { if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); M = master(ac, ac.destination); B = beds(ac, M.bus); } if (ac.state === 'suspended') ac.resume(); },
    play(name, opts) { if (!ac || muted) return; const f = SFX[name] || MOTIF[name]; if (f) f(ac, M.bus, ac.currentTime + 0.01, opts); },
    mute(m = !muted) { muted = m; if (M) M.vol.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.05); return muted; },
    get muted() { return muted; },
    // every frame: the beds follow the weather and the nearest fire; now and then a bird, a crackle, a far mammoth, thunder
    step(dt, { gust, rain, fire, river = 0, night = 0 }) {
      if (!ac || muted) return; const t = ac.currentTime; B.set(t, { gust, rain, fire, river });
      if (fire > 0.05 && t > nextCrackle) { SFX.crackle(ac, M.bus, t, { v: 0.1 * fire }); nextCrackle = t + 0.05 + Math.random() * 0.25 / fire; }
      if (t > nextAmbient) { nextAmbient = t + 4 + Math.random() * 9; const r = Math.random(); if (rain > 0.6 && r < 0.25) SFX.thunder(ac, M.bus, t); else if (rain < 0.3 && r < 0.7) SFX.bird(ac, M.bus, t); else if (r < 0.85) SFX.trumpet(ac, M.bus, t); }
    },
  };
  return S;
}

/**
 * Render a soundtrack offline (for a video): events [[time, name, opts]] and beds sampled from levels(t) -> { gust,
 * rain, fire }. Returns a 16-bit stereo WAV as an ArrayBuffer.
 */
export async function renderOffline(events, duration, levels = () => ({ gust: 0.4, rain: 0, fire: 0.3 }), { sampleRate = 44100 } = {}) {
  const ac = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate), M = master(ac, ac.destination), B = beds(ac, M.bus);
  for (let t = 0; t < duration; t += 0.1) B.set(t, levels(t), 0.1);
  for (const [t, name, opts] of events) { const f = SFX[name] || MOTIF[name]; if (f) try { f(ac, M.bus, t, opts); } catch { /* one bad sound is skipped, never the whole soundtrack */ } }
  let crack = 0; for (let t = 0; t < duration; t += 0.05) { const f = levels(t).fire; if (f > 0.05 && t > crack) { SFX.crackle(ac, M.bus, t, { v: 0.1 * f }); crack = t + 0.05 + Math.random() * 0.25 / f; } }
  const buf = await ac.startRendering(), n = buf.length, wav = new ArrayBuffer(44 + n * 4), v = new DataView(wav);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0), R = buf.getChannelData(1); for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  return wav;
}
