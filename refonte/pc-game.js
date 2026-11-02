// Mini-jeu de fin de page (tout en bas, après Contact) : des mots à ramasser, un essaim qui suit le curseur, des trous noirs en entonnoir.
// Mécanique inspirée de la page de référence : survol = surlignage rose, appui = les mots proches rejoignent l'essaim, relâcher sur la boîte
// aux lettres les dépose, un trou aspire les mots, le centre du curseur dans un trou = partie perdue (« hole r = … · fall in: game over »).
// Dessiné en 2D sur une toile posée sur la feuille ; parcours.js fournit la position du curseur sur la toile et l'état du bouton.

const WORDS = ['Power BI', 'Power Automate', 'Excel', 'OCR', 'JSON', 'Agents LLM', 'MCP', 'PDF', 'VRE', 'CERFA', 'SharePoint', 'ISO 9001', 'ISO 45001', 'PDCA', 'DMAIC',
  'SIPOC', 'Prévention', 'Maintenance', 'Rigueur', 'Curiosité', 'Autonomie', 'Fiabilité', 'Audit', 'Lean', 'Données', 'Qualité'];
const GOAL = 18, MAX_FLOCK = 10;

export function createGame(W, H, reduce) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mail = { x: W / 2, y: 96, r: 62 };
  const holes = [{ x: W * 0.2, y: H * 0.62, r: 84 }, { x: W * 0.52, y: H * 0.5, r: 62 }, { x: W * 0.82, y: H * 0.66, r: 96 }];
  let words = [], flock = [], score = 0, state = 'play', t0 = 0, msg = '', cur = { x: W / 2, y: H * 0.8, down: false, in: false }, last = 0, fx = [];
  const spawn = (n) => { for (let i = 0; i < n; i++) { let p, ok, tries = 0; do { p = { x: rnd(60, W - 60), y: rnd(170, H - 50) }; ok = holes.every((h) => Math.hypot(h.x - p.x, h.y - p.y) > h.r + 40); } while (!ok && ++tries < 30);
    words.push({ t: WORDS[(Math.random() * WORDS.length) | 0], x: p.x, y: p.y, vx: rnd(-6, 6), vy: rnd(-6, 6), a: rnd(-0.25, 0.25), hot: 0, fall: 0 }); } };
  const reset = () => { words = []; flock = []; score = 0; state = 'play'; msg = ''; fx = []; spawn(26); };
  reset();

  const widthOf = (t) => { c.font = '500 20px "iAWriterQuattroV", ui-monospace, monospace'; return c.measureText(t).width + 18; };
  const chip = (w, x, y, a, hot, alpha = 1, k = 1) => {
    const ww = widthOf(w.t) * k;
    c.save(); c.translate(x, y); c.rotate(a); c.scale(k, k); c.globalAlpha = alpha;
    if (hot) { c.fillStyle = '#e6007e'; c.beginPath(); c.roundRect(-ww / 2 / k, -15, ww / k, 30, 3); c.fill(); c.fillStyle = '#fff'; } else c.fillStyle = 'rgba(224,235,253,.92)';
    c.font = '500 20px "iAWriterQuattroV", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(w.t, 0, 1);
    c.restore();
  };
  const hole = (h, now) => { // entonnoir : disque noir, anneaux qui se resserrent en tournant, rayons de grille
    const g = c.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r * 1.05); g.addColorStop(0, '#000'); g.addColorStop(0.72, '#02030a'); g.addColorStop(1, 'rgba(2,3,10,0)');
    c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, h.r * 1.05, 0, 6.283); c.fill();
    c.strokeStyle = 'rgba(210,225,255,.38)'; c.lineWidth = 1;
    for (let i = 1; i <= 7; i++) { const u = i / 7, r = h.r * (0.12 + 0.88 * u * u); c.beginPath(); c.ellipse(h.x, h.y + (1 - u) * h.r * 0.12, r, r * (0.8 + 0.2 * u), 0, 0, 6.283); c.stroke(); }
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + now / 6000; c.beginPath(); c.moveTo(h.x + Math.cos(a) * h.r * 0.12, h.y + Math.sin(a) * h.r * 0.1); c.lineTo(h.x + Math.cos(a) * h.r, h.y + Math.sin(a) * h.r * 0.8); c.stroke(); }
    c.fillStyle = 'rgba(207,211,218,.8)'; c.font = '10px ui-monospace, monospace'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText(`hole r = ${Math.round(h.r * 2.6)} px`, h.x + h.r + 8, h.y - 6); c.fillText('fall in: game over', h.x + h.r + 8, h.y + 8);
  };

  function update(now, p) { // p : { x, y, down, in } position du curseur sur la toile
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; if (!t0) t0 = now;
    const wasDown = cur.down; cur = p;
    if (state === 'play') {
      // appui : les mots proches rejoignent l'essaim ; relâchement : dépôt sur la boîte aux lettres, sinon ils retombent là où on est
      if (cur.in && cur.down) for (let i = words.length - 1; i >= 0 && flock.length < MAX_FLOCK; i--) { const w = words[i]; if (w.fall === 0 && Math.hypot(w.x - cur.x, w.y - cur.y) < 96) { flock.push({ ...w, o: rnd(0, 6.283), rr: rnd(36, 70) }); words.splice(i, 1); } }
      if (wasDown && !cur.down && flock.length) {
        if (Math.hypot(cur.x - mail.x, cur.y - mail.y) < mail.r + 20) { score += flock.length; for (const f of flock) fx.push({ x: f.x, y: f.y, t: 0, w: f.t }); flock = []; spawn(Math.max(0, 26 - words.length)); if (score >= GOAL) { state = 'win'; msg = 'Merci d’avoir joué : écris-moi, la boîte aux lettres est juste au-dessus.'; } }
        else for (const f of flock) words.push({ t: f.t, x: f.x, y: f.y, vx: rnd(-14, 14), vy: rnd(-14, 14), a: f.a || 0, hot: 0, fall: 0 }), flock = [];
      }
      for (const w of words) { // dérive douce, gravité des trous, rebond sur les bords
        w.hot += ((cur.in && Math.hypot(w.x - cur.x, w.y - cur.y) < 96 ? 1 : 0) - w.hot) * Math.min(1, dt * 14);
        if (w.fall > 0) { w.fall += dt * 1.6; const h = w.h; w.x += (h.x - w.x) * dt * 6; w.y += (h.y - w.y) * dt * 6; continue; }
        w.x += w.vx * dt; w.y += w.vy * dt; if (w.x < 40 || w.x > W - 40) w.vx *= -1; if (w.y < 150 || w.y > H - 30) w.vy *= -1;
        for (const h of holes) { const d = Math.hypot(h.x - w.x, h.y - w.y); if (d < h.r * 1.5) { w.vx += (h.x - w.x) / d * 90 * dt; w.vy += (h.y - w.y) / d * 90 * dt; } if (d < h.r * 0.7) { w.fall = 0.01; w.h = h; } }
      }
      words = words.filter((w) => w.fall < 1);
      if (words.length < 18) spawn(1);
      for (const f of flock) { // l'essaim suit le curseur en orbite, chaque mot sur son rayon
        f.o += dt * 1.6; const tx = cur.x + Math.cos(f.o) * f.rr, ty = cur.y + Math.sin(f.o) * f.rr * 0.8;
        f.x += (tx - f.x) * Math.min(1, dt * 9); f.y += (ty - f.y) * Math.min(1, dt * 9); f.a = Math.sin(f.o) * 0.3;
        for (const h of holes) if (Math.hypot(h.x - f.x, h.y - f.y) < h.r * 0.6) f.lost = true;
      }
      const lost = flock.filter((f) => f.lost); flock = flock.filter((f) => !f.lost); for (const f of lost) fx.push({ x: f.x, y: f.y, t: 0, w: f.t, sink: true });
      for (const h of holes) if (cur.in && Math.hypot(h.x - cur.x, h.y - cur.y) < h.r * 0.5) { state = 'over'; msg = 'Tombé dans le trou. Clique pour rejouer.'; flock = []; }
    } else if (cur.in && cur.down && !wasDown && now - t0 > 400) { reset(); t0 = now; }
    for (const f of fx) f.t += dt; fx = fx.filter((f) => f.t < 0.9);

    // rendu
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(6,10,40,.9)'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(160,190,255,.5)'; c.lineWidth = 1.5; c.strokeRect(1, 1, W - 2, H - 2);
    c.strokeStyle = 'rgba(160,190,255,.07)'; c.lineWidth = 1; for (let x = 0; x < W; x += 50) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 50) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (const h of holes) hole(h, now);
    // boîte aux lettres : anneau qui respire, libellé
    const br = mail.r + Math.sin(now / 500) * 3; c.strokeStyle = '#7ff6ff'; c.lineWidth = 2; c.beginPath(); c.arc(mail.x, mail.y, br, 0, 6.283); c.stroke();
    c.fillStyle = '#7ff6ff'; c.font = '600 15px ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('déposer ici', mail.x, mail.y - 6); c.font = '11px ui-monospace, monospace'; c.fillText('relâcher sur l’anneau', mail.x, mail.y + 12);
    for (const w of words) chip(w, w.x, w.y, w.a, w.hot > 0.5, w.fall ? 1 - w.fall : 1, w.fall ? 1 - w.fall * 0.9 : 1);
    for (const f of flock) chip(f, f.x, f.y, f.a || 0, true);
    for (const f of fx) { const u = f.t / 0.9; c.save(); c.globalAlpha = 1 - u; c.fillStyle = f.sink ? '#fff' : '#7ff6ff'; c.font = '500 18px ui-monospace, monospace'; c.textAlign = 'center'; c.fillText(f.w, f.x, f.y + (f.sink ? 0 : -u * 50)); c.restore(); }
    if (cur.in) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(cur.x, cur.y, cur.down ? 9 : 14, 0, 6.283); c.stroke(); }
    c.fillStyle = '#fff'; c.font = '600 18px ui-monospace, monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(`${score} / ${GOAL} mots déposés`, 22, 20);
    c.fillStyle = 'rgba(207,211,218,.8)'; c.font = '12px ui-monospace, monospace'; c.fillText('survole : les mots roses sont à portée · maintiens le clic : ils te suivent · relâche sur l’anneau', 22, 46);
    c.fillText('évite les trous noirs : le centre du curseur dedans, c’est perdu', 22, 64);
    if (state !== 'play') { c.fillStyle = 'rgba(3,5,10,.7)'; c.fillRect(0, H / 2 - 50, W, 100); c.fillStyle = '#fff'; c.font = '600 24px ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(msg, W / 2, H / 2); }
  }
  return { cv, update, reset };
}
