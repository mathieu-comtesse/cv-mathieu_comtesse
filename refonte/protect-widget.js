/* Cadre « contrôle » de l'accueil, 3e carte de la colonne de gauche.
 * Relevé sur la carte « Shopify Payments prevents 12K+ high-risk payments each minute » :
 *  - à gauche, une foule désordonnée de points (quelques anneaux = événements à bloquer) qui dérive vers la droite ;
 *  - au centre, une ligne de contrôle : les événements bloqués disparaissent dessus et la teintent d'une ellipse qui s'éteint ;
 *  - à droite, les autres repartent dans quatre flux ordonnés, tracés par les couloirs du poster (SVG déjà présent dans la carte).
 * Les couloirs sont lus dans le poster : la géométrie reste donc celle du repli statique. */

const SELECTEUR = '[data-cv-hero-gains] .checkpoint-stage';
const TEXTE = 'Animation locale illustrative. Des opérations arrivent en foule désordonnée, rencontrent la ligne de contrôle et repartent en quatre flux ordonnés. Les événements bloqués disparaissent sur la ligne et la teintent.';
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2;

/* générateur déterministe : la carte se ressemble d'une visite à l'autre */
function graine(n) { let s = n >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function lis(stage) {
  /* couloirs : M x0 y0 C c1x c1y c2x c2y ex ey L lx ly (repère 1000 x 1000 du poster) */
  const couloirs = [];
  /* un même attribut d regroupe tous les couloirs : un segment par « M » */
  for (const p of stage.querySelectorAll('.checkpoint-stage__flow path')) {
    for (const seg of (p.getAttribute('d') || '').split(/(?=M)/)) {
      if (!/C/.test(seg)) continue;
      const n = seg.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
      if (n && n.length >= 10) couloirs.push({ x0: n[0], y0: n[1], c1x: n[2], c1y: n[3], c2x: n[4], c2y: n[5], ex: n[6], ey: n[7], lx: n[8], ly: n[9] });
    }
  }
  return couloirs;
}

function monte(stage) {
  if (stage.querySelector('.protect-widget')) return;
  const couloirs = lis(stage);
  if (!couloirs.length) return;

  const widget = document.createElement('div');
  widget.className = 'protect-widget protect-checkpoint protect-mono protect-ledger';
  widget.style.cssText = 'position:absolute;inset:0;z-index:0';
  const cv = document.createElement('canvas');
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', TEXTE);
  const sr = document.createElement('span');
  sr.className = 'protect-sr';
  sr.textContent = 'Animation illustrative locale, sans lien avec un outil réel. Les chiffres de l’en-tête sont saisis à la main.';
  widget.append(cv, sr);
  stage.prepend(widget);
  const ctx = cv.getContext('2d');
  const hasard = graine(2611);

  let W = 0, H = 0, dpr = 1;
  let fx = 6, fy = 12, fw = 0, fh = 0, cx = 0;
  let lanes = [], sorties = [], enveloppes = [];
  const X = u => fx + u / 1000 * fw, Y = v => fy + v / 1000 * fh;

  /* échantillonne chaque couloir en polyligne (px) avec abscisses curvilignes */
  function geometrie() {
    fx = 6; fy = 12; fw = W - 12; fh = H - 22; cx = fx + fw / 2;
    lanes = couloirs.map(c => {
      const pts = [];
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const t = i / n, m = 1 - t;
        const ux = m * m * m * c.x0 + 3 * m * m * t * c.c1x + 3 * m * t * t * c.c2x + t * t * t * c.ex;
        const vy = m * m * m * c.y0 + 3 * m * m * t * c.c1y + 3 * m * t * t * c.c2y + t * t * t * c.ey;
        pts.push([X(ux), Y(vy)]);
      }
      pts.push([X(c.lx), Y(c.ly)]);
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, total: cum[cum.length - 1], y0: c.y0, sortie: Math.round((c.ey - 193) / 200) };
    });
    /* quatre sorties, une enveloppe (bande) par sortie : min et max des couloirs à chaque pas */
    sorties = [0, 1, 2, 3].map(k => lanes.filter(l => l.sortie === k));
    enveloppes = sorties.map(g => {
      if (!g.length) return null;
      const n = g[0].pts.length, haut = [], bas = [];
      for (let i = 0; i < n; i++) {
        let lo = 1e9, hi = -1e9;
        for (const l of g) { lo = Math.min(lo, l.pts[i][1]); hi = Math.max(hi, l.pts[i][1]); }
        const e = epaisseur(i / (n - 1));
        haut.push([g[0].pts[i][0], lo - e]); bas.push([g[0].pts[i][0], hi + e]);
      }
      return { haut, bas };
    });
  }

  /* demi-épaisseur d'un flux : nulle à la ligne, pleine une fois les couloirs rassemblés */
  const EPAISSEUR = 5.4;
  const epaisseur = u => { const k = Math.max(0, Math.min(1, u * 1.15)); return EPAISSEUR * k * k * (3 - 2 * k); };

  function place(lane, s) {
    const { pts, cum } = lane;
    if (s <= 0) return pts[0];
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], k = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }

  /* foule d'entrée */
  const foule = [];
  const impacts = [];
  const flux = [];
  const NB = 112;
  function neuve(p, depart) {
    p.x = depart ? hasard() * cx : -hasard() * 14;
    p.y = fy + 6 + hasard() * (fh - 12);
    p.vx = 17 + hasard() * 22;
    p.vy = 0;
    p.phase = hasard() * TAU;
    p.fr = .6 + hasard() * 1.4;
    p.amp = 3 + hasard() * 9;
    p.r = .7 + hasard() * .9;
    p.mauvais = hasard() < .07;
    p.a = .55 + hasard() * .45;
    return p;
  }
  function init() {
    foule.length = 0; flux.length = 0; impacts.length = 0;
    for (let i = 0; i < NB; i++) foule.push(neuve({}, true));
  }

  function taille() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    if (w !== W || h !== H) {
      W = w; H = h;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.cssText = 'display:block;width:' + W + 'px;height:' + H + 'px';
      geometrie();
      if (!foule.length) init();
      for (const p of foule) { p.x = Math.min(p.x, cx); p.y = Math.min(Math.max(p.y, fy), fy + fh); }
    }
  }

  function passe(p) {
    /* un événement valide rejoint le couloir le plus proche de sa hauteur, puis avance en ordre */
    const v = (p.y - fy) / fh * 1000;
    let meilleur = null, ecart = 1e9;
    for (const l of lanes) { const d = Math.abs(l.y0 - v) + hasard() * 70; if (d < ecart) { ecart = d; meilleur = l; } }
    if (!meilleur) return;
    flux.push({ lane: meilleur, s: 0, v: 52 + hasard() * 22, r: 1.05 + hasard() * .5, a: p.a, dy: p.y - meilleur.pts[0][1], lat: hasard() * 2 - 1 });
  }

  function pas(dt, t) {
    for (const p of foule) {
      p.x += p.vx * dt;
      p.y += Math.cos(t * p.fr + p.phase) * p.amp * dt;
      if (p.y < fy + 4) p.y = fy + 4; else if (p.y > fy + fh - 2) p.y = fy + fh - 2;
      if (p.x >= cx) {
        if (p.mauvais) impacts.push({ y: p.y, age: 0 });
        else passe(p);
        neuve(p, false);
      }
    }
    for (let i = flux.length - 1; i >= 0; i--) {
      const f = flux[i];
      f.s += f.v * dt;
      f.dy *= Math.exp(-5 * dt);
      if (f.s > f.lane.total + 4) flux.splice(i, 1);
    }
    for (let i = impacts.length - 1; i >= 0; i--) { impacts[i].age += dt; if (impacts[i].age > 1.1) impacts.splice(i, 1); }
  }

  function trace(pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }

  function dessine(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    /* bandes des quatre flux : remplissage léger, bords nets, couloirs en filigrane */
    for (const e of enveloppes) {
      if (!e) continue;
      ctx.beginPath(); trace(e.haut);
      for (let i = e.bas.length - 1; i >= 0; i--) ctx.lineTo(e.bas[i][0], e.bas[i][1]);
      ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.075)'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); trace(e.haut); ctx.stroke(); ctx.beginPath(); trace(e.bas); ctx.stroke();
    }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath(); for (const l of lanes) trace(l.pts); ctx.stroke();

    /* ligne de contrôle : léger halo permanent, renforcé par les impacts */
    const halo = ctx.createLinearGradient(0, fy, 0, fy + fh);
    halo.addColorStop(0, 'rgba(255,255,255,0)'); halo.addColorStop(.5, 'rgba(255,255,255,.09)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(cx - 3, fy, 6, fh);
    for (const im of impacts) {
      const k = 1 - im.age / 1.1, e = k * k;
      const g = ctx.createLinearGradient(0, im.y - 34, 0, im.y + 34);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,' + (.55 * e) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 1, im.y - 34, 2, 68);
      ctx.strokeStyle = 'rgba(255,255,255,' + (.85 * e) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, im.y, 3 + 2.2 * (1 - k), 7 + 5 * (1 - k), 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + e + ')'; ctx.beginPath(); ctx.arc(cx, im.y, 1.6 * k + .4, 0, TAU); ctx.fill();
    }

    /* foule d'entrée */
    for (const p of foule) {
      if (p.mauvais) { ctx.strokeStyle = 'rgba(255,255,255,' + (.8 * p.a) + ')'; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(p.x, p.y, 2.7, 0, TAU); ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(255,255,255,' + p.a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    }
    /* flux ordonnés */
    ctx.fillStyle = '#fff';
    for (const f of flux) {
      const q = place(f.lane, f.s);
      ctx.globalAlpha = Math.min(1, f.a + .2);
      ctx.beginPath(); ctx.arc(q[0], q[1] + f.dy + f.lat * epaisseur(f.s / f.lane.total) * .85, f.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* boucle : suspendue hors écran et onglet masqué ; en mouvement réduit, une seule image fixe */
  let vu = false, dernier = 0, horloge = 0, tour = 0;
  const image = now => {
    tour = 0;
    if (!vu || document.hidden || reduit.matches) return;
    const dt = Math.min(.05, dernier ? (now - dernier) / 1000 : 1 / 60); dernier = now; horloge += dt;
    pas(dt, horloge); dessine(horloge);
    tour = requestAnimationFrame(image);
  };
  const reveille = () => { if (!tour && vu && !document.hidden && !reduit.matches) { dernier = 0; tour = requestAnimationFrame(image); } };
  new ResizeObserver(() => { taille(); if (reduit.matches || !tour) dessine(horloge); }).observe(stage);
  new IntersectionObserver(([e]) => { vu = e.isIntersecting; reveille(); }).observe(stage);
  document.addEventListener('visibilitychange', reveille);
  taille();
  if (W) {
    /* amorçage : la carte n'apparaît jamais vide, ni les flux ni la foule */
    for (let i = 0; i < 160; i++) pas(1 / 30, (horloge += 1 / 30));
    dessine(horloge);
  }
  reduit.addEventListener('change', () => { if (reduit.matches) dessine(horloge); else reveille(); });
}

function demarre() { document.querySelectorAll(SELECTEUR).forEach(monte); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarre, { once: true }); else demarre();
