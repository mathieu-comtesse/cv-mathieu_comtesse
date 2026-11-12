/* Sons fabriqués à la volée (aucun fichier) : pas, sauts, cristaux, mécanismes, et un fond très discret. */
export function creerSon() {
  let ctx = null, sortie = null, muet = false, fond = null;
  try { muet = localStorage.getItem('monde-muet') === '1'; } catch {}
  const pret = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); sortie = ctx.createGain(); sortie.gain.value = muet ? 0 : 0.5; sortie.connect(ctx.destination);
    /* fond : deux notes tenues et un souffle */
    fond = ctx.createGain(); fond.gain.value = 0.05; fond.connect(sortie);
    for (const f of [110, 164.8, 220.6]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.3; const l = ctx.createOscillator(); l.frequency.value = 0.05 + f / 4000; const lg = ctx.createGain(); lg.gain.value = 0.25; l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(fond); o.start(); l.start(); }
    return true;
  };
  const note = (f, d, { type = 'sine', vol = 0.3, vers = 0, att = 0.005, quand = 0 } = {}) => {
    const t = ctx.currentTime + quand, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (vers) o.frequency.exponentialRampToValueAtTime(vers, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(sortie); o.start(t); o.stop(t + d + 0.05);
  };
  const souffle = (d, f, vol) => {
    const n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = b; const fi = ctx.createBiquadFilter(); fi.type = 'lowpass'; fi.frequency.value = f; const g = ctx.createGain(); g.gain.value = vol; s.connect(fi); fi.connect(g); g.connect(sortie); s.start();
  };
  const GAMME = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5];
  const sons = {
    pas: () => souffle(0.05, 900 + Math.random() * 500, 0.1),
    saut: () => note(260, 0.16, { vers: 520, vol: 0.16, type: 'triangle' }),
    double: () => note(420, 0.18, { vers: 900, vol: 0.16, type: 'triangle' }),
    atterri: () => souffle(0.1, 420, 0.22),
    gros: () => { souffle(0.2, 260, 0.4); note(90, 0.2, { vers: 50, vol: 0.3 }); },
    rebond: () => note(180, 0.35, { vers: 950, vol: 0.22, type: 'square' }),
    plaque: () => { note(190, 0.1, { vol: 0.25, type: 'square' }); note(285, 0.14, { vol: 0.2, type: 'square', quand: 0.09 }); },
    pont: () => [0, 2, 4, 5, 7].forEach((i, k) => note(GAMME[i] / 2, 0.5, { vol: 0.2, type: 'triangle', quand: k * 0.16 })),
    portail: () => [0, 2, 4].forEach((i, k) => note(GAMME[i], 0.7, { vol: 0.15, quand: k * 0.07 })),
    chute: () => note(500, 0.5, { vers: 90, vol: 0.2, type: 'triangle' }),
    fete: () => [0, 2, 4, 7, 4, 7].forEach((i, k) => note(GAMME[i], 0.4, { vol: 0.2, type: 'triangle', quand: k * 0.13 })),
  };
  return {
    pret,
    joue(nom, n = 0) { if (!ctx || muet) return; if (nom === 'cristal') { note(GAMME[n % GAMME.length], 0.6, { vol: 0.22, type: 'triangle' }); note(GAMME[n % GAMME.length] * 2, 0.4, { vol: 0.08, quand: 0.04 }); return; } sons[nom]?.(); },
    get muet() { return muet; },
    bascule() { muet = !muet; try { localStorage.setItem('monde-muet', muet ? '1' : '0'); } catch {} if (sortie) sortie.gain.value = muet ? 0 : 0.5; return muet; },
  };
}
