// Mini-jeu de fin de page, d'après la page de référence (vidéo fournie) :
// · le texte de la page est en colonnes ; en le survolant, les mots à portée se surlignent en rose ;
// · maintenir le clic détache les mots : ils deviennent des pastilles inclinées qui rejoignent l'essaim (carré blanc, rayons et points) autour de l'anneau du curseur ;
// · des trous noirs en entonnoir (grille polaire, « hole r = … px · fall in: game over ») aspirent les pastilles ; le centre du curseur dedans = partie perdue ;
// · un tremplin « boost jump » fait sauter le curseur par-dessus les trous (v = 200 px/s) ;
// · relâcher sur l'anneau « déposer ici » dépose les mots (objectif 18).
// Dessiné en 2D sur une toile posée sur la feuille ; parcours.js donne la position du curseur sur la toile et l'état du bouton.

const TEXT = [
  'Salut, je suis Mathieu, ingénieur maintenance et qualité en alternance. Je construis des outils qui retirent les tâches répétitives : suivi financier, rapports de vérification, plans de prévention, recherche du suivi d’un équipement ou d’un bâtiment.',
  'Power Automate déclenche les flux, Excel garde la source de vérité, Power BI rend les écarts visibles et l’OCR lit les rapports PDF. Chaque outil est construit une seule fois, puis réutilisé par les équipes de terrain et de maintenance.',
  'Mon appétit d’apprendre m’a mené vers l’avenir de mon métier : l’IA appliquée, les agents LLM, les connecteurs MCP et la mémoire sous Obsidian. Les modèles proposent, les règles métiers valident, personne ne copie plus à la main.',
  'Prévention et sécurité, coactivité, plans de prévention, analyse de risques, actions correctives et suivi des écarts : la qualité se mesure sur le terrain, avec ISO 9001, ISO 45001, PDCA, DMAIC et un audit rigoureux.',
  'Quand je ne construis pas d’outils, je partage mes découvertes sur mon blog : machines manipulables, jeux et mondes en 3D. Retrouvez-moi aussi dans la pièce derrière ces lignes, entre un vinyle, un bonsaï ou sur un cycle.',
  'Curiosité, rigueur, autonomie, esprit critique, goût du détail, détermination et transmission : ce que j’apprends, je le documente pour que d’autres puissent le refaire sans moi.'];
const GOAL = 18, MAX_FLOCK = 10, HIT = 58, RING = 15;
const PINK = '#e6007e', ORANGE = '#e8431c', FONT = '"Inter", system-ui, sans-serif', MONO = '"iAWriterQuattroV", ui-monospace, monospace';

export function createGame(W, H, reduce, hooks = {}) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* sons : les mêmes petits sons synthétisés que les règles du site (aucun fichier) */
  let ac = null;
  const snd = (type) => {
    if (reduce) return;
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.connect(g).connect(ac.destination);
      const P = { pick: [880, 1320, .05, .06], drop: [520, 1040, .18, .08], fall: [420, 70, .5, .1], boost: [180, 900, .35, .09], over: [260, 55, .7, .12], win: [520, 1560, .5, .09] }[type];
      o.type = type === 'fall' || type === 'over' ? 'sawtooth' : 'sine'; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
      g.gain.setValueAtTime(P[3], t); g.gain.exponentialRampToValueAtTime(.0001, t + P[2] + .05); o.start(t); o.stop(t + P[2] + .08);
    } catch { /* pas de son */ }
  };

  /* texte en colonnes : chaque mot a sa boîte (survol, détachement) */
  const NARROW = W < 800, COLS = NARROW ? 1 : 3, CW = NARROW ? W - 90 : 330, GAP = NARROW ? 0 : (W - 2 * 60 - COLS * CW) / (COLS - 1), LH = 21, TOP = NARROW ? 150 : 176;
  c.font = `400 14px ${FONT}`;
  const slots = []; let yStack = TOP;
  (NARROW ? TEXT.slice(0, 3) : TEXT).forEach((para, k) => {
    const col = k % COLS, row = Math.floor(k / COLS); let x = (NARROW ? 45 : 60) + col * (CW + GAP), y = NARROW ? yStack : TOP + row * 150, x0 = x;
    for (const raw of para.split(' ')) {
      const w = c.measureText(raw + ' ').width; if (x - x0 + w > CW) { x = x0; y += LH; }
      const clean = raw.replace(/[.,;:()«»]/g, ''); slots.push({ t: raw, x, y, w: w - 4, h: 17, cx: x + (w - 4) / 2, cy: y + 8, grab: clean.length >= 5, state: 'rest', back: 0 }); x += w;
    }
    yStack = y + LH + 16;
  });
  const mail = { x: W - (W < 800 ? 90 : 130), y: 96, r: W < 800 ? 46 : 58 };
  const holes = [{ x: W * 0.17, y: H * 0.8, r: 90 }, { x: W * 0.55, y: H * 0.86, r: 66 }, { x: W * 0.88, y: H * 0.73, r: 97 }];
  const pad = { x: W * (W < 800 ? 0.4 : 0.37), y: H * 0.66, w: W < 800 ? 140 : 168, h: 64 };
  const BTN = { again: { x: W / 2 - 150, y: H - 58, w: 130, h: 34, t: 'Rejouer' }, top: { x: W / 2 + 10, y: H - 58, w: 150, h: 34, t: 'Haut de page' } };

  let flock = [], score = 0, state = 'play', t0 = 0, msg = '', cur = { x: W / 2, y: H * 0.5, down: false, in: false }, last = 0, fx = [], air = 0, airDir = 0, hub = [], hubT = 0, pressed = false;
  for (let i = 0; i < 22; i++) hub.push({ a: i / 22 * 6.283 + rnd(-.15, .15), r: rnd(26, 92), s: rnd(.6, 1.4), p: rnd(0, 6.28) });
  const reset = () => { flock = []; score = 0; state = 'play'; msg = ''; fx = []; air = 0; for (const s of slots) { s.state = 'rest'; s.back = 0; } };

  const chipW = (t) => { c.font = `600 15px ${FONT}`; return c.measureText(t).width + 16; };
  const chip = (f, x, y, a, alpha = 1, k = 1) => {
    const ww = chipW(f.t); c.save(); c.translate(x, y); c.rotate(a); c.scale(k, k); c.globalAlpha = alpha;
    c.fillStyle = f.col; c.beginPath(); c.roundRect(-ww / 2, -12, ww, 24, 4); c.fill();
    c.fillStyle = '#fff'; c.font = `600 15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.t.replace(/[.,;:()«»]/g, ''), 0, 1); c.restore();
  };
  const hole = (h, now) => { // entonnoir : disque noir, anneaux resserrés vers le centre, rayons de la grille polaire qui tournent lentement
    const g = c.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r * 1.1); g.addColorStop(0, '#000'); g.addColorStop(.6, '#030303'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(h.x, h.y, h.r * 1.1, h.r * .9, 0, 0, 6.283); c.fill();
    c.strokeStyle = 'rgba(205,210,220,.34)'; c.lineWidth = 1;
    for (let i = 1; i <= 9; i++) { const u = i / 9, r = h.r * (.08 + .92 * u * u); c.beginPath(); c.ellipse(h.x, h.y + (1 - u) * h.r * .12, r, r * (.78 + .12 * u), 0, 0, 6.283); c.stroke(); }
    c.strokeStyle = 'rgba(205,210,220,.26)';
    for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283 + now / 9000; c.beginPath(); c.moveTo(h.x + Math.cos(a) * h.r * .1, h.y + Math.sin(a) * h.r * .08); c.lineTo(h.x + Math.cos(a) * h.r, h.y + Math.sin(a) * h.r * .82); c.stroke(); }
    c.fillStyle = 'rgba(207,211,218,.85)'; c.font = `10px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText(`hole  r = ${Math.round(h.r * 2.6)} px`, h.x + h.r * .9, h.y - h.r * .55); c.fillText('fall in: game over', h.x + h.r * .9, h.y - h.r * .55 + 13);
  };
  const boostPad = (now) => { // rectangle noir à chevrons, avec sa cote
    c.save(); c.fillStyle = '#000'; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.fillRect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h); c.strokeRect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h);
    c.beginPath(); c.rect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h); c.clip(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5;
    const off = (now / 40) % 24; for (let i = -1; i < 9; i++) { const x = pad.x - pad.w / 2 + i * 24 + off; c.beginPath(); c.moveTo(x, pad.y - 16); c.lineTo(x + 12, pad.y); c.lineTo(x, pad.y + 16); c.stroke(); } c.restore();
    c.fillStyle = 'rgba(207,211,218,.85)'; c.font = `10px ${MONO}`; c.textAlign = 'left'; c.fillText('boost  jump', pad.x + pad.w / 2 + 8, pad.y - 6); c.fillText(W < 800 ? 'v = 200 px/s' : 'v = 200 px/s   x = 326 px', pad.x + pad.w / 2 + 8, pad.y + 8);
  };
  const pill = (b, hot) => { c.fillStyle = hot ? '#fff' : 'rgba(255,255,255,.1)'; c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.roundRect(b.x, b.y, b.w, b.h, 17); c.fill(); c.stroke(); c.fillStyle = hot ? '#05080d' : '#fff'; c.font = `500 13px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 1); };
  const inB = (b, p) => p.in && p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;

  function update(now, p) { // p : { x, y, down, in } : position du curseur sur la toile
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; if (!t0) t0 = now;
    const wasDown = cur.down, edge = p.down && !wasDown; cur = p; hubT += dt;
    // boutons (toujours actifs)
    if (edge) { if (inB(BTN.again, p)) { reset(); t0 = now; snd('pick'); } else if (inB(BTN.top, p)) hooks.onTop?.(); }
    if (state === 'play') {
      if (cur.in && cur.down && air <= 0) { // appui : les mots à portée se détachent en pastilles et rejoignent l'essaim
        for (const s of slots) if (s.grab && s.state === 'rest' && flock.length < MAX_FLOCK && Math.hypot(s.cx - cur.x, s.cy - cur.y) < HIT) {
          s.state = 'away'; flock.push({ t: s.t, slot: s, x: s.cx, y: s.cy, a: 0, ta: rnd(-.8, .8), o: rnd(0, 6.283), rr: rnd(34, 78), col: Math.random() < .78 ? PINK : ORANGE }); snd('pick'); }
      }
      if (wasDown && !cur.down && flock.length) {
        if (Math.hypot(cur.x - mail.x, cur.y - mail.y) < mail.r + 22) { score += flock.length; for (const f of flock) { fx.push({ x: f.x, y: f.y, t: 0, w: f.t }); f.slot.state = 'gone'; f.slot.back = 7; } flock = []; snd('drop'); if (score >= GOAL) { state = 'win'; msg = 'Merci d’avoir joué : la boîte aux lettres est juste au-dessus.'; snd('win'); } }
        else { for (const f of flock) { f.slot.state = 'back'; f.slot.back = 0; } flock = []; }
      }
      // tremplin : le curseur saute par-dessus les trous, l'anneau grossit puis retombe
      if (air <= 0 && cur.in && Math.abs(cur.x - pad.x) < pad.w / 2 && Math.abs(cur.y - pad.y) < pad.h / 2) { air = .9; snd('boost'); }
      if (air > 0) air -= dt;
      for (const f of flock) { // l'essaim suit le curseur ; chaque pastille orbite sur son rayon et s'incline
        f.o += dt * 1.5; const tx = cur.x + Math.cos(f.o) * f.rr, ty = cur.y + Math.sin(f.o) * f.rr * .75 - (air > 0 ? Math.sin(Math.PI * (1 - air / .9)) * 40 : 0);
        f.x += (tx - f.x) * Math.min(1, dt * 8); f.y += (ty - f.y) * Math.min(1, dt * 8); f.a += (f.ta + Math.sin(f.o) * .35 - f.a) * Math.min(1, dt * 6);
        if (air <= 0) for (const h of holes) { const d = Math.hypot(h.x - f.x, h.y - f.y); if (d < h.r * .62) { f.lost = true; } else if (d < h.r * 1.2) { f.x += (h.x - f.x) * dt * 2.4; f.y += (h.y - f.y) * dt * 2.4; } }
      }
      const lost = flock.filter((f) => f.lost); flock = flock.filter((f) => !f.lost); for (const f of lost) { fx.push({ x: f.x, y: f.y, t: 0, w: f.t, sink: true }); f.slot.state = 'gone'; f.slot.back = 3; snd('fall'); }
      if (air <= 0) for (const h of holes) if (cur.in && Math.hypot(h.x - cur.x, h.y - cur.y) < h.r * .5) { state = 'over'; msg = 'Tombé dans le trou. Clique sur Rejouer.'; for (const f of flock) f.slot.state = 'back'; flock = []; snd('over'); }
      for (const s of slots) { if (s.state === 'gone') { s.back -= dt; if (s.back <= 0) s.state = 'back'; } if (s.state === 'back') { s.back = Math.min(1, s.back + dt * 2); if (s.back >= 1) { s.state = 'rest'; s.back = 0; } } }
    }
    for (const f of fx) f.t += dt; fx = fx.filter((f) => f.t < .9);

    // rendu : fond transparent, la feuille sombre reste visible comme dans la vidéo
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#fff'; c.font = `600 17px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(`${score} / ${GOAL} mots déposés`, W < 800 ? 45 : 60, 30);
    c.fillStyle = 'rgba(207,211,218,.78)'; c.font = `12px ${MONO}`; if (W < 800) { c.fillText('touche et glisse : les mots te suivent', 45, 62); c.fillText('lâche sur l’anneau · évite les trous', 45, 80); } else { c.fillText('survole les mots · maintiens le clic pour les détacher · relâche sur l’anneau · évite les trous noirs', 60, 66); c.fillText('le tremplin « boost jump » fait sauter par-dessus les trous', 60, 84); }
    // boîte aux lettres
    const br = mail.r + Math.sin(now / 500) * 3; c.strokeStyle = '#7ff6ff'; c.lineWidth = 2; c.beginPath(); c.arc(mail.x, mail.y, br, 0, 6.283); c.stroke(); c.fillStyle = '#7ff6ff'; c.font = `600 14px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('déposer ici', mail.x, mail.y - 6); c.font = `10px ${MONO}`; c.fillText('relâcher sur l’anneau', mail.x, mail.y + 11);
    // texte : mots survolés surlignés en rose, mots détachés estompés
    c.textBaseline = 'alphabetic';
    for (const s of slots) {
      const hot = state === 'play' && cur.in && s.grab && s.state === 'rest' && Math.hypot(s.cx - cur.x, s.cy - cur.y) < HIT;
      const a = s.state === 'away' || s.state === 'gone' ? .16 : s.state === 'back' ? .16 + .84 * s.back : 1;
      if (hot) { c.fillStyle = PINK; c.fillRect(s.x - 2, s.y - 1, s.w + 4, s.h + 1); }
      c.globalAlpha = a; c.fillStyle = hot ? '#fff' : 'rgba(224,235,253,.78)'; c.font = `400 14px ${FONT}`; c.textAlign = 'left'; c.fillText(s.t, s.x, s.y + 13); c.globalAlpha = 1;
    }
    for (const h of holes) hole(h, now);
    boostPad(now);
    for (const f of flock) chip(f, f.x, f.y, f.a);
    // essaim : carré blanc, rayons et points qui ondulent, comme sur la page de référence
    if (cur.in) {
      const lift = air > 0 ? Math.sin(Math.PI * (1 - air / .9)) : 0, cy = cur.y - lift * 40, n = Math.min(hub.length, 6 + flock.length * 2);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.fillStyle = '#fff';
      for (let i = 0; i < n; i++) { const d = hub[i], r = d.r * (.8 + .2 * Math.sin(hubT * d.s + d.p)), a = d.a + Math.sin(hubT * .7 + d.p) * .08, x = cur.x + Math.cos(a) * r, y = cy + Math.sin(a) * r * .8; c.beginPath(); c.moveTo(cur.x, cy); c.lineTo(x, y); c.stroke(); c.beginPath(); c.arc(x, y, 2.4, 0, 6.283); c.fill(); }
      if (lift > 0) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cur.x, cur.y + 14, 18 * (1 - lift * .3), 6, 0, 0, 6.283); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(cur.x - 6, cy - 6, 12, 12);
      c.strokeStyle = '#6d7dff'; c.lineWidth = 2; c.beginPath(); c.arc(cur.x, cy, (RING + lift * 16) * (cur.down ? .8 : 1), 0, 6.283); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cur.x + 4, cy - 3, 2.5, 0, 6.283); c.fill();
    }
    for (const f of fx) { const u = f.t / .9; c.save(); c.globalAlpha = 1 - u; c.fillStyle = f.sink ? '#fff' : '#7ff6ff'; c.font = `500 16px ${MONO}`; c.textAlign = 'center'; c.fillText(f.w.replace(/[.,;:()«»]/g, ''), f.x, f.y + (f.sink ? u * 22 : -u * 50)); c.restore(); }
    pill(BTN.again, inB(BTN.again, cur)); pill(BTN.top, inB(BTN.top, cur));
    if (state !== 'play') { c.fillStyle = 'rgba(3,5,10,.78)'; c.fillRect(0, H / 2 - 46, W, 92); c.fillStyle = '#fff'; c.font = `600 24px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(msg, W / 2, H / 2); }
  }
  reset();
  return { cv, update, reset };
}
