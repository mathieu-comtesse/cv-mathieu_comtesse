// Jeu de fin de page, d'après la vidéo du fil de Danetag : un tableau de commandes au bas du CV (touches, vitesse, distance à l'arrivée) autour
// d'un gros bouton « start ». Au départ, des trous noirs apparaissent à différents endroits du CV et la page défile vers le haut à 350 px/s ;
// le curseur (un essaim de points autour d'un carré blanc) doit les éviter. Ce module dessine le tableau ; parcours.js gère la course.
const MONO = '"iAWriterQuattroV", ui-monospace, monospace';

export function createGame(W, H, reduce, hooks = {}) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), NARROW = W < 800, rnd = (a, b) => a + Math.random() * (b - a);
  let ac = null;
  const snd = (type) => {
    if (reduce) return;
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.connect(g).connect(ac.destination);
      const P = { start: [300, 1200, .35, .09], pause: [700, 400, .15, .07], fall: [420, 60, .6, .11], over: [260, 50, .8, .12], win: [520, 1560, .6, .09] }[type];
      o.type = type === 'fall' || type === 'over' ? 'sawtooth' : 'sine'; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
      g.gain.setValueAtTime(P[3], t); g.gain.exponentialRampToValueAtTime(.0001, t + P[2] + .05); o.start(t); o.stop(t + P[2] + .08);
    } catch { /* pas de son */ }
  };
  // géométrie du tableau : trois cases, le bouton, trois cases (grand écran) ; bouton puis grille 2 × 3 (portrait)
  const CH = NARROW ? 64 : 76, TOP = NARROW ? 250 : 210;
  const START = NARROW ? { x: W / 2 - 110, y: 190, w: 220, h: 64 } : { x: W / 2 - 110, y: TOP - 14, w: 220, h: CH + 28 };
  const mk = (label, val, i, side) => {
    if (NARROW) { const col = i % 2, row = Math.floor(i / 2), cw = (W - 60) / 2; return { label, val, x: 30 + col * cw, y: TOP + 20 + row * (CH + 4), w: cw, h: CH }; }
    const cw = (W - 80 - START.w - 24) / 6; return { label, val, x: side < 0 ? 40 + (i % 3) * cw : START.x + START.w + 12 + (i % 3) * cw, y: TOP, w: cw, h: CH };
  };
  const cells = [mk('key', 'space', 0, -1), mk('slow', '← H 5', 1, -1), mk('scroll up', '↑ W', 2, -1), mk('scroll down', '↓ S', 3, 1), mk('speed', '', 4, 1), mk('to the finish', '', 5, 1)];
  const BACK = { x: 40, y: H - 52, w: 92, h: 32 };
  let cur = { x: W / 2, y: 110, down: false, in: false }, last = 0, t = 0, pressed = false; const hub = Array.from({ length: 22 }, (_, i) => ({ a: i / 22 * 6.283 + rnd(-.15, .15), r: rnd(22, 78), s: rnd(.6, 1.4), p: rnd(0, 6.28) }));
  const inB = (b, p) => p.in && p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;
  const cell = (b, label, val, dim) => { // case sombre à épaisseur : bord clair, dessous plus pâle
    c.fillStyle = '#9a9a9a'; c.fillRect(b.x, b.y + b.h, b.w, 6); c.fillStyle = '#050505'; c.fillRect(b.x, b.y, b.w, b.h);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    c.fillStyle = 'rgba(207,211,218,.55)'; c.font = `10px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(label, b.x + 12, b.y + 11);
    c.fillStyle = dim ? 'rgba(255,255,255,.6)' : '#fff'; c.font = `13px ${MONO}`; c.textBaseline = 'alphabetic'; c.fillText(val, b.x + 12, b.y + b.h - 14);
  };
  function update(now, p, info) { // p : curseur sur la toile ; info : { st, remaining, speed, total, pageW }
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    const edge = p.down && !cur.down; cur = p;
    if (edge) { if (inB(START, p)) { hooks.onStart?.(); snd(info.st === 'run' ? 'pause' : 'start'); } else if (inB(BACK, p)) hooks.onTop?.(); }
    c.clearRect(0, 0, W, H);
    // essaim : carré blanc, rayons et points qui ondulent autour du curseur (ou du bouton au repos)
    const cx = p.in ? p.x : W / 2, cy = p.in ? Math.min(p.y, START.y - 20) : 100;
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.fillStyle = '#fff';
    for (const d of hub) { const r = d.r * (.8 + .2 * Math.sin(t * d.s + d.p)), a = d.a + Math.sin(t * .7 + d.p) * .08, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .8; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); c.beginPath(); c.arc(x, y, 2.2, 0, 6.283); c.fill(); }
    c.fillRect(cx - 6, cy - 6, 12, 12);
    cells[4].val = `≈ ${info.speed} px/s`; cells[5].val = `↑ ${info.remaining.toLocaleString('fr-FR')} px`;
    for (const b of cells) cell(b, b.label, b.val, b.label === 'speed' && info.st !== 'run');
    // bouton start : blanc, en relief, avec la main au survol
    const hot = inB(START, p), dy = hot ? 2 : 0;
    c.fillStyle = '#8c8c8c'; c.fillRect(START.x, START.y + START.h - 2, START.w, 8); c.fillStyle = hot ? '#fff' : '#ededed'; c.fillRect(START.x, START.y + dy, START.w, START.h - 2);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeRect(START.x + .5, START.y + dy + .5, START.w - 1, START.h - 3);
    c.fillStyle = '#000'; c.font = `13px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText({ run: 'pause', pause: 'resume', over: 'restart', win: 'restart' }[info.st] || 'start', START.x + START.w / 2, START.y + START.h / 2 + dy);
    c.fillStyle = 'rgba(207,211,218,.7)'; c.font = `11px ${MONO}`; c.fillText(`page ${info.pageW} × ${info.total.toLocaleString('fr-FR')} px`, W / 2, START.y + START.h + 38);
    // retour
    const hb = inB(BACK, p); c.strokeStyle = hb ? '#fff' : 'rgba(255,255,255,.6)'; c.strokeRect(BACK.x + .5, BACK.y + .5, BACK.w, BACK.h); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText('⬡  Back', BACK.x + 12, BACK.y + BACK.h / 2 + 1);
    if (cur.in) { c.strokeStyle = '#fff'; c.beginPath(); c.arc(cur.x, cur.y, 3, 0, 6.283); c.stroke(); }
  }
  return { cv, update, snd };
}
