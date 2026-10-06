/* L'AMBIANCE SONORE DU VILLAGE TALAS : tout est synthétisé avec l'API Web Audio (bruit filtré, oscillateurs), aucun fichier audio.
 *   quai    : houle, vent, cloche de bouée au loin, mouettes le jour, grillons et hibou la nuit, pas sur les planches
 *   grenier : ronflement grave, vent dans la charpente, craquements, crépitement des bougies, rire du fantôme
 * TALAS_SON.monde(w) est appelé par setWorld ; TALAS_SON.pas() par le joueur ; TALAS_SON.nuit(k) règle jour / nuit ; ?son=non coupe tout.
 * L'AudioContext est celui du jeu (variable globale AC de beep()) : il ne démarre qu'après un geste de l'utilisateur. */
(function () {
  'use strict'
  const S = window.TALAS_SON = { on: !/[?&]son=non/.test(location.search), courant: null }
  if (!S.on) { S.monde = S.pas = S.nuit = S.rire = S.aboie = () => {}; return }
  let ctx = null, master = null, buf = null, couches = {}, nuitK = 0, timers = []
  try { S.on = localStorage.getItem('talasSon') !== 'non' } catch (e) {}
  const rnd = (a, b) => a + Math.random() * (b - a)
  function init() {
    if (ctx) return ctx
    try {
      if (typeof AC !== 'undefined' && AC) ctx = AC
      else { ctx = new (window.AudioContext || window.webkitAudioContext)(); if (typeof AC !== 'undefined') AC = ctx }
    } catch (e) { return null }
    if (ctx.state === 'suspended') ctx.resume()
    master = ctx.createGain(); master.gain.value = S.on ? .55 : 0; master.connect(ctx.destination)
    buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    ;['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => { if (ctx && ctx.state === 'suspended') ctx.resume() }, { passive: true }))
    construire(); return ctx
  }
  const bruit = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s }
  const filtre = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 1; return b }
  const lfo = (freq, prof, cible) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.value = prof; o.connect(g); g.connect(cible); o.start(); return o }
  function couche(nom) { const g = ctx.createGain(); g.gain.value = 0; g.connect(master); couches[nom] = g; return g }

  function construire() {
    /* --- quai : houle (deux bruits filtrés qui gonflent à des rythmes différents), vent --- */
    const q = couche('quai')
    { const s = bruit(), lp = filtre('lowpass', 650, .4), g = ctx.createGain(); g.gain.value = .16; s.connect(lp); lp.connect(g); g.connect(q); lfo(.11, .11, g.gain)
      const s2 = bruit(), bp = filtre('bandpass', 1500, .5), g2 = ctx.createGain(); g2.gain.value = .05; s2.connect(bp); bp.connect(g2); g2.connect(q); lfo(.083, .045, g2.gain)
      const s3 = bruit(), bp3 = filtre('bandpass', 320, 1.1), g3 = ctx.createGain(); g3.gain.value = .07; s3.connect(bp3); bp3.connect(g3); g3.connect(q); lfo(.05, 130, bp3.frequency); lfo(.07, .04, g3.gain)
      // grillons : une porteuse aiguë hachée, audible seulement la nuit
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 4300; const gg = ctx.createGain(); gg.gain.value = 0; const hp = filtre('highpass', 3500, .7); o.connect(hp); hp.connect(gg); gg.connect(q); lfo(23, .004, gg.gain); o.start(); couches.grillons = gg }
    /* --- grenier --- */
    const gr = couche('grenier')
    { const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(); o1.frequency.value = 55.2; o2.frequency.value = 82.9; o1.type = 'sine'; o2.type = 'triangle'; g.gain.value = .06; o1.connect(g); o2.connect(g); g.connect(gr); lfo(.09, .03, g.gain); o1.start(); o2.start()
      const s = bruit(), bp = filtre('bandpass', 520, 1.6), gw = ctx.createGain(); gw.gain.value = .07; s.connect(bp); bp.connect(gw); gw.connect(gr); lfo(.06, 260, bp.frequency); lfo(.13, .04, gw.gain) }
    /* événements ponctuels */
    boucle(() => { if (S.courant === 'quai') cloche() }, 13, 28)
    boucle(() => { if (S.courant === 'quai' && nuitK < .4) mouette(); else if (S.courant === 'quai' && nuitK > .7 && Math.random() < .5) hibou() }, 7, 17)
    boucle(() => { if (S.courant === 'grenier') craque() }, 3, 8)
    boucle(() => { if (S.courant === 'grenier') crepite() }, .25, 1.2)
  }
  function boucle(f, a, b) { const t = () => { try { f() } catch (e) {} timers.push(setTimeout(t, rnd(a, b) * 1000)) }; timers.push(setTimeout(t, rnd(a, b) * 1000)) }
  const env = (g, t, a, pic, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pic, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d) }
  function cloche() { const t = ctx.currentTime; [[520, .05, 3.2], [1046, .022, 2.2], [1571, .012, 1.4], [787, .01, 1.8]].forEach(([f, v, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * (1 + Math.random() * .002); o.connect(g); g.connect(couches.quai); env(g, t, .005, v, d); o.start(t); o.stop(t + d + .1) }) }
  function mouette() { const t = ctx.currentTime, n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) { const o = ctx.createOscillator(), g = ctx.createGain(), bp = filtre('bandpass', 1900, 2), t0 = t + i * .42; o.type = 'sawtooth'; o.frequency.setValueAtTime(1400, t0); o.frequency.linearRampToValueAtTime(2300, t0 + .12); o.frequency.linearRampToValueAtTime(1200, t0 + .34); o.connect(bp); bp.connect(g); g.connect(couches.quai); env(g, t0, .03, .022 * (1 - nuitK), .3); o.start(t0); o.stop(t0 + .45) } }
  function hibou() { const t = ctx.currentTime;[[430, 0], [360, .38]].forEach(([f, dt]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.connect(g); g.connect(couches.quai); env(g, t + dt, .06, .03, .3); o.start(t + dt); o.stop(t + dt + .5) }) }
  function craque() { const t = ctx.currentTime, s = bruit(), bp = filtre('bandpass', 260, 9), g = ctx.createGain(); bp.frequency.setValueAtTime(rnd(180, 300), t); bp.frequency.exponentialRampToValueAtTime(rnd(90, 160), t + .6); s.connect(bp); bp.connect(g); g.connect(couches.grenier); env(g, t, .05, .09, .55); s.stop(t + .8) }
  function crepite() { const t = ctx.currentTime, s = bruit(), hp = filtre('highpass', 2800, .8), g = ctx.createGain(); s.connect(hp); hp.connect(g); g.connect(couches.grenier); env(g, t, .002, rnd(.006, .02), .015); s.stop(t + .05) }

  /* pas sur les planches : un souffle de bruit filtré et un coup sourd */
  S.pas = function (course) {
    if (!ctx || !S.on || S.courant !== 'quai') return
    const t = ctx.currentTime, s = bruit(), bp = filtre('bandpass', rnd(140, 220), 1.3), g = ctx.createGain(); s.connect(bp); bp.connect(g); g.connect(master); env(g, t, .004, course ? .16 : .11, .07); s.stop(t + .12)
    const o = ctx.createOscillator(), go = ctx.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + .07); o.connect(go); go.connect(master); env(go, t, .003, .07, .07); o.start(t); o.stop(t + .12)
  }
  S.rire = function () { // rire du fantôme : deux dents de scie désaccordées, vibrato rapide, formants
    if (!ctx || !S.on || S.courant !== 'grenier') return
    const t = ctx.currentTime;[0, .16, .32].forEach((dt, i) => { [1, 1.5].forEach((m) => { const o = ctx.createOscillator(), bp = filtre('bandpass', 900 + i * 120, 4), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(330 * m * (1 + i * .06), t + dt); o.frequency.linearRampToValueAtTime(240 * m, t + dt + .13); o.connect(bp); bp.connect(g); g.connect(couches.grenier); env(g, t + dt, .02, .035, .12); o.start(t + dt); o.stop(t + dt + .2) }) })
  }
  S.aboie = function () { // wouf : une dent de scie grave qui chute, avec un souffle
    if (!ctx || !S.on) return
    const t = ctx.currentTime, o = ctx.createOscillator(), bp = filtre('bandpass', 700, 1.4), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(140, t + .16); o.connect(bp); bp.connect(g); g.connect(master); env(g, t, .01, .09, .16); o.start(t); o.stop(t + .25)
  }
  S.nuit = function (k) { nuitK = k; if (couches.grillons) couches.grillons.gain.value = Math.max(0, k - .4) * .012 }
  let geste = false // le navigateur n'autorise le son qu'après un geste de l'utilisateur : avant, on retient seulement le monde courant
  ;['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => { if (!geste) { geste = true; if (S.dernier) S.monde(S.dernier) } }, { passive: true }))
  S.monde = function (w) {
    S.dernier = w
    const nom = w && w.quai ? 'quai' : w && w.grenier ? 'grenier' : null
    if (!geste || !init()) return
    if (ctx.state === 'suspended') ctx.resume()
    if (nom === S.courant) return
    S.courant = nom
    const t = ctx.currentTime; ;['quai', 'grenier'].forEach((n) => { const g = couches[n].gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(n === nom ? 1 : 0, t + 1.4) })
  }
  S.regler = function (oui) { S.on = !!oui; try { localStorage.setItem('talasSon', oui ? 'oui' : 'non') } catch (e) {} if (master) master.gain.value = oui ? .55 : 0 }
})()
