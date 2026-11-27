/* Filtre de prévention : une foule désordonnée d'événements arrive à gauche, rencontre une ligne de protection et repart en quatre flux ordonnés.
   Les événements bloqués rebondissent sur la ligne puis s'éteignent. Comportement relevé sur le composant « checkpoint » de la référence
   (thème mono, variante ledger : 5 000 arrivées par minute, 3,5 % rejetés, ligne à 0,5, flux à 0,2 / 0,4 / 0,6 / 0,8, 384 particules au plus),
   réécrit ici. Animation illustrative, sans lien avec des données réelles. */
const FLUX = [0.2, 0.4, 0.6, 0.8], LIGNE = 0.5, PAR_S = 5000 / 60, REJET = 3.5, CAP = 384, VIE = 4.6, VIE_REJET = 1.1, ANGLE = [0.17, 0.49], T = 22;
const borne = (v, a, b) => Math.max(a, Math.min(b, v)), lisse = (a, b, x) => { const s = borne((x - a) / Math.max(1e-9, b - a), 0, 1); return s * s * (3 - 2 * s); };
const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, Math.random()))) * Math.cos(6.283185 * Math.random());
const ressort = (y, vy, cible, k, amorti, dt) => (vy + (cible - y) * k * dt) * Math.exp(-amorti * dt);

export function monteFiltre(hote, { encre = '#fff' } = {}) {
  const cv = document.createElement('canvas'); cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Animation illustrative : des événements désordonnés rencontrent une ligne de protection et repartent en quatre flux ordonnés ; les événements bloqués rebondissent sur la ligne.');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; hote.append(cv);
  const ctx = cv.getContext('2d'); if (!ctx) return () => {};
  const reduit = matchMedia('(prefers-reduced-motion: reduce)');
  let W = 220, H = 130, R = 1, raf = 0, t0 = 0, visible = true, fini = false, reste = 0, cumulRejet = 0, horloge = 0;
  const parts = [], impacts = [], ptr = { x: 0, y: 0, vx: 0, vy: 0, actif: false }; let prec = null;
  const cadre = () => ({ g: Math.max(6, W * 0.012), d: W - Math.max(6, W * 0.012), h: 12, b: Math.max(40, H - 10) });
  const px = (p) => { const c = cadre(); return { x: c.g + p.x * (c.d - c.g), y: c.h + p.y * (c.b - c.h) }; };
  const stats = FLUX.map((f) => ({ moy: new Float64Array(T).fill(f), et: new Float64Array(T).fill(0.2) })); let statsPretes = false;

  function nait(source) {
    const b = Math.floor(Math.random() * FLUX.length), y = 0.14 + Math.random() * 0.72, v = 0.2 + Math.random() * 0.2;
    let rejet; if (source === 'flux') { cumulRejet += REJET / PAR_S; rejet = cumulRejet >= 1; if (rejet) cumulRejet -= 1; } else rejet = Math.random() < REJET / PAR_S;
    const p = { x: -0.055 - Math.random() * 0.025, y, vx: v, vy: 0, y0: y, etat: 'arrive', ageEtat: 0, rejet, age: 0, source, r: 1.1, phase: Math.random() * 6.283, phase2: Math.random() * 6.283,
      v, flux: b, decal: gauss() * 0.0035, xChoc: 0, yChoc: y, oscil: 0.05 + Math.random() * 0.1, freq: 1.4 + Math.random() * 3.8 };
    return p;
  }
  function pousse(p, dt) {                                                       // le pointeur écarte les événements, l'élan du geste les emporte
    if (!ptr.actif) return; const asp = W / Math.max(1, H), dx = (p.x - ptr.x) * asp, dy = p.y - ptr.y, d = Math.hypot(dx, dy), port = Math.min(0.26, 0.16 + 70 / Math.max(420, W));
    if (d < 0.004 || d >= port) return; const q = (1 - d / port) ** 2, f = p.etat === 'rejete' ? 4.4 : 8.6, e = p.etat === 'rejete' ? 0.045 : 0.105;
    p.vx += dx / d / asp * f * q * dt + ptr.vx * q * e; p.vy += dy / d * f * q * dt + ptr.vy * q * e;
  }
  function cible(p) {
    const f = FLUX[p.flux];
    if (p.etat === 'arrive') { const a = lisse(LIGNE - 0.17, LIGNE + 0.02, p.x);
      const o = (Math.sin(p.x * 3.1 + p.y0 * 2.4 + horloge * 0.45) * 0.07 + Math.sin(p.x * 1.7 - p.y0 * 3.3 - horloge * 0.3 + 1.3) * 0.045 + Math.sin(p.phase + p.age * p.freq * 0.3) * p.oscil * 0.25) * (1 - a);
      return 0.5 + 0.4 * Math.tanh((p.y0 + (f - p.y0) * a * 0.45 + o - 0.5) / 0.4); }
    return p.yChoc + (f + p.decal - p.yChoc) * lisse(p.xChoc, p.xChoc + 0.1, p.x);
  }
  function rebond(p) { if (p.y < 0.06 || p.y > 0.94) { p.y = p.y < 0.06 ? 0.12 - p.y : 1.88 - p.y; p.vy = -p.vy * 0.6; } }
  function avance(p, dt) {
    p.age += dt; p.ageEtat += dt;
    if (p.etat === 'rejete') { if (p.ageEtat > 0.04) { pousse(p, dt); const a = Math.exp(-0.9 * dt); p.vx *= a; p.vy *= a; p.x = Math.min(LIGNE - 0.002, p.x + p.vx * dt); p.y += p.vy * dt; rebond(p); } return; }
    pousse(p, dt);
    const ok = p.etat === 'passe'; p.vy = ressort(p.y, p.vy, cible(p), ok ? 300 : 20, ok ? 32 : 4.4, dt);
    let v = p.v; if (!ok) { const r = lisse(LIGNE - 0.14, LIGNE, p.x); p.vy += gauss() * 0.12 * Math.sqrt(dt) * (1 - r); v *= 1 + 0.12 * Math.sin(p.phase2 + p.age * p.freq * 0.3) * (1 - r); }
    p.vy = borne(p.vy, ok ? -2.4 : -0.92, ok ? 2.4 : 0.92); p.vx += (v - p.vx) * (1 - Math.exp(-1.65 * dt)); p.vx = borne(p.vx, 0.075, 0.48);
    p.x += p.vx * dt; p.y += p.vy * dt; rebond(p); p.y = borne(p.y, 0.045, 0.955);
    if (p.etat === 'arrive' && p.x >= LIGNE) {
      p.xChoc = LIGNE; p.yChoc = p.y; p.ageEtat = 0;
      if (!p.rejet) { p.etat = 'passe'; p.vx = Math.max(p.v, p.vx); p.vy *= 0.34; return; }
      p.etat = 'rejete'; p.x = LIGNE - 0.002; const c = cadre(), s = (Math.random() < 0.5 ? -1 : 1) * (ANGLE[0] + Math.random() * (ANGLE[1] - ANGLE[0]));
      p.vx = -(0.24 + Math.random() * 0.12); p.vy = -p.vx * Math.tan(s) * (c.d - c.g) / Math.max(1, c.b - c.h);
      impacts.push({ y: p.y, age: 0 }); if (impacts.length > 18) impacts.shift();
    }
  }
  const mort = (p) => p.etat === 'rejete' ? p.ageEtat > VIE_REJET : p.x > 1.09 || p.age > VIE;
  function etape(dt) {
    reste += dt * PAR_S; const n = Math.floor(reste + 1e-10); reste -= n;
    for (let i = 0; i < n; i++) if (parts.length < CAP) parts.push(nait('flux'));
    for (const p of parts) avance(p, dt);
    ptr.vx *= Math.exp(-10 * dt); ptr.vy *= Math.exp(-10 * dt);
    for (let i = parts.length - 1; i >= 0; i--) if (mort(parts[i])) parts.splice(i, 1);
    for (const m of impacts) m.age += dt; while (impacts.length && impacts[0].age > 0.52) impacts.shift();
    horloge += dt; enveloppes(dt);
  }
  function enveloppes(dt) {                                                      // moyenne et écart des positions par flux, sur 22 tranches : les « tubes »
    const n = FLUX.map(() => new Float64Array(T)), s = FLUX.map(() => new Float64Array(T)), s2 = FLUX.map(() => new Float64Array(T));
    for (const p of parts) { if (p.etat === 'rejete') continue; const c = Math.floor((p.x + 0.01) / 1.04 * T); if (c < 0 || c >= T) continue; n[p.flux][c]++; s[p.flux][c] += p.y; s2[p.flux][c] += p.y * p.y; }
    const k = statsPretes ? 1 - Math.exp(-dt * 1.6) : 1;
    stats.forEach((st, f) => { for (let i = 0; i < T; i++) { let a = 0, b = 0, c = 0; for (let j = Math.max(0, i - 1); j <= Math.min(T - 1, i + 1); j++) { a += n[f][j]; b += s[f][j]; c += s2[f][j]; }
      if (a < 3) continue; const m = b / a, e = Math.sqrt(Math.max(0, c / a - m * m)); st.moy[i] += (m - st.moy[i]) * k; st.et[i] += (Math.max(0.008, e) - st.et[i]) * k; } });
    statsPretes = true;
  }
  function amorce() { parts.length = 0; impacts.length = 0; const n = 150; for (let i = 0; i < n; i++) { const p = nait('graine'), a = 0.15 + i / n * 3.7 + Math.random() * 0.08; for (let k = 0, m = Math.ceil(a * 40); k < m && !mort(p); k++) avance(p, 1 / 40); if (!mort(p)) parts.push(p); } impacts.length = 0; statsPretes = false; enveloppes(1); }
  const trait = (c, a, l) => { ctx.strokeStyle = c; ctx.globalAlpha = a; ctx.lineWidth = l; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
  function courbe(path, pts, debut = true) { debut ? path.moveTo(pts[0].x, pts[0].y) : path.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) path.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2); path.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); }
  function perles(pts, decal, t) {                                               // points qui défilent le long des bords des tubes
    if (pts.length < 2) return; const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const tot = L[L.length - 1]; if (tot < 8) return; ctx.fillStyle = encre;
    for (let d = (t * 34 + decal * 46) % 46; d < tot; d += 46) { let i = 1; while (i < L.length - 1 && L[i] < d) i++; const u = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      ctx.globalAlpha = 0.95 * Math.min(1, d / 12, (tot - d) / 12); ctx.beginPath(); ctx.arc(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u, 1.2, 0, 6.283); ctx.fill(); }
  }
  function dessine(t) {
    ctx.setTransform(R, 0, 0, R, 0, 0); ctx.clearRect(0, 0, W, H);
    const c = cadre(), xl = px({ x: LIGNE, y: 0 }).x, petit = Math.min(W, H) < 190, nb = petit ? 24 : 42;
    for (let s = 0; s < nb; s++) {                                               // faisceau de fond : de la ligne vers chaque flux
      const f = s % FLUX.length, i = Math.floor(s / FLUX.length), l = 0.09 + (s * 0.137 + i * 0.041) % 0.82, g = FLUX[f] + (i - nb / (2 * FLUX.length)) * 0.0022, k = l + (g - l) * (0.5 + s % 3 * 0.055);
      const A = px({ x: LIGNE, y: k }), B = px({ x: LIGNE + 0.15, y: g }), C = px({ x: 1.08, y: g });
      trait(encre, 0.23 * (0.82 + Math.sin(t * 0.22 + s * 1.7) * 0.18) * 0.4, petit ? 0.42 : 0.72); ctx.beginPath(); ctx.moveTo(A.x, A.y);
      ctx.bezierCurveTo(A.x + (c.d - c.g) * 0.045, A.y, B.x - (c.d - c.g) * 0.04, B.y, B.x, B.y); ctx.lineTo(C.x, C.y); ctx.stroke();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(xl, 0, W - xl, H); ctx.clip();          // tubes des quatre flux, à droite de la ligne
    stats.forEach((st, f) => { const bas = [], haut = [];
      for (let i = 0; i < T; i++) { const x = -0.01 + (i + 0.5) / T * 1.04, e = Math.max(0.024, st.et[i]); bas.push(px({ x, y: borne(st.moy[i] - e, 0.02, 0.98) })); haut.push(px({ x, y: borne(st.moy[i] + e, 0.02, 0.98) })); }
      const zone = new Path2D(); courbe(zone, bas); courbe(zone, haut.slice().reverse(), false); zone.closePath(); ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.globalAlpha = 1; ctx.fill(zone);
      for (const bord of [bas, haut]) { const p = new Path2D(); courbe(p, bord); trait(encre, 0.6, 0.75); ctx.stroke(p); perles(bord.filter((q) => q.x >= xl - 2), f * 0.37 + (bord === haut ? 0.5 : 0), t); }
    }); ctx.restore();
    ctx.save(); ctx.fillStyle = encre;                                            // événements en vol
    ctx.globalAlpha = 0.92; for (const p of parts) if (p.etat !== 'rejete' && !p.rejet) { const q = px(p); ctx.beginPath(); ctx.arc(q.x, q.y, p.r, 0, 6.283); ctx.fill(); }
    trait(encre, 0.92, 0.8); for (const p of parts) if (p.etat !== 'rejete' && p.rejet) { const q = px(p); ctx.beginPath(); ctx.arc(q.x, q.y, 1.3, 0, 6.283); ctx.stroke(); }   // un événement qui sera bloqué : un anneau
    ctx.restore();
    const fond = getComputedStyle(hote).getPropertyValue('--cv-filtre-fond').trim() || '#051daa';   // la ligne : un voile couleur page de part et d'autre, un trait fondu aux extrémités
    ctx.save(); ctx.globalAlpha = 1; const gx = ctx.createLinearGradient(xl - 6, 0, xl + 7, 0), h0 = c.h + 4;
    gx.addColorStop(0, fond + '00'); gx.addColorStop(0.35, fond + 'cc'); gx.addColorStop(0.65, fond + 'cc'); gx.addColorStop(1, fond + '00'); ctx.fillStyle = gx; ctx.fillRect(xl - 6, h0, 13, c.b - h0);
    const gy = ctx.createLinearGradient(0, h0, 0, c.b); gy.addColorStop(0, 'rgba(255,255,255,0)'); gy.addColorStop(0.2, 'rgba(255,255,255,.72)'); gy.addColorStop(0.8, 'rgba(255,255,255,.72)'); gy.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = gy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xl + 0.5, h0); ctx.lineTo(xl + 0.5, c.b); ctx.stroke(); ctx.restore();
    const k = borne(Math.min(W, H) / 420, 0.5, 1.3) * 0.9;                       // impacts sur la ligne
    for (const m of impacts) { const q = px({ x: LIGNE, y: m.y }), n = borne(m.age / 0.52, 0, 1), a = (1 - n) ** 2, r = (5 + 21 * (1 - (1 - n) ** 3)) * k;
      ctx.save(); const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r); g.addColorStop(0, encre); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.globalAlpha = a * 0.22; ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 0.55, r, 0, 0, 6.283); ctx.fill();
      trait(encre, a * 0.9, 1.1 + a * 0.6); ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 0.36, r, 0, 0, 6.283); ctx.stroke();
      trait(encre, a * 0.5, 0.7); ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 0.58, r * 0.62, 0, 0, 6.283); ctx.stroke();
      trait(encre, a * 0.85, (2.5 + a * 2) * k); ctx.beginPath(); ctx.moveTo(q.x, q.y - 5 * k * a); ctx.lineTo(q.x, q.y + 5 * k * a); ctx.stroke(); ctx.restore(); }
    ctx.save(); for (const p of parts) if (p.etat === 'rejete') { const q = px(p); trait(encre, 0.92 * (1 - lisse(VIE_REJET - 0.5, VIE_REJET, p.ageEtat)), 0.8); ctx.beginPath(); ctx.arc(q.x, q.y, 1.3, 0, 6.283); ctx.stroke(); } ctx.restore();
    ctx.globalAlpha = 1; hote.dataset.particules = parts.length; hote.dataset.rejetes = parts.filter((p) => p.etat === 'rejete').length; hote.dataset.passes = parts.filter((p) => p.etat === 'passe').length;
  }
  const actif = () => !fini && !reduit.matches && visible && !document.hidden;
  function boucle(ms) { if (!actif()) { raf = 0; t0 = 0; return; } if (t0) { const dt = borne((ms - t0) / 1000, 0, 0.05); if (dt > 0) etape(dt); dessine(ms / 1000); } t0 = ms; raf = requestAnimationFrame(boucle); }
  function relance() { cancelAnimationFrame(raf); raf = 0; t0 = 0; actif() ? raf = requestAnimationFrame(boucle) : dessine(performance.now() / 1000); }
  function taille() { const r = hote.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)), d = Math.min(2, Math.max(1, devicePixelRatio || 1));
    if (w === W && h === H && d === R) return; const vide = !parts.length; W = w; H = h; R = d; cv.width = Math.round(W * R); cv.height = Math.round(H * R); if (vide) amorce(); dessine(performance.now() / 1000); }
  cv.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(), c = cadre(), p = { x: borne((e.clientX - r.left - c.g) / Math.max(1, c.d - c.g), -0.1, 1.1), y: borne((e.clientY - r.top - c.h) / Math.max(1, c.b - c.h), -0.1, 1.1) };
    const dt = prec ? borne((e.timeStamp - prec.t) / 1000, 0.008, 0.08) : 1; Object.assign(ptr, p, { actif: true, vx: prec ? borne((p.x - prec.x) / dt, -3.2, 3.2) : 0, vy: prec ? borne((p.y - prec.y) / dt, -3.2, 3.2) : 0 }); prec = { ...p, t: e.timeStamp }; }, { passive: true });
  cv.addEventListener('pointerleave', () => { ptr.actif = false; ptr.vx = ptr.vy = 0; prec = null; });
  const ro = new ResizeObserver(taille); ro.observe(hote);
  const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; relance(); }, { threshold: 0.01 }); io.observe(hote);
  document.addEventListener('visibilitychange', relance); reduit.addEventListener?.('change', relance);
  taille(); if (!parts.length) amorce(); relance();
  hote.__filtre = { etape, parts, impacts };
  return () => { fini = true; ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); cv.remove(); };
}
