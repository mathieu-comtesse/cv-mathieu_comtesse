/* Mini-jeu de la sphère : intégration dans la scène Expo (même projection, mêmes coordonnées que le reste du chemin).
 * La physique est dans jeu-coeur.js (pure, déterministe). Ici : plan tiré de la page, commandes, caméra, rendu dans le canevas d'annotations de
 * l'Expo (`N.p(view, colonne, rangée, hauteur)`), particules, son synthétisé, interface, entrée et sortie progressives.
 * Le moteur d'images de l'Expo appelle `window.__cvJeu.dessine(ctx, view, P, maintenant, dt)` à chaque image, par-dessus le décor. */
import * as J from './jeu-coeur.js?v=j1';

const S = { phase: 'repos', plan: null, etat: null, touches: new Set(), tactile: { dir: 0, haut: false, bas: false }, saut: false, gazDelta: 0, acc: 0, t0: 0, tPhase: 0, yEntree: 0, yDepart: 0,
  parts: [], trainee: [], cam: { v: 0, d: 0 }, secousse: 0, son: true, audio: null, dom: null, lisible: null, vue: null, reduit: matchMedia('(prefers-reduced-motion: reduce)'), meilleur: 0, pasEnCours: 0, dtMax: 0.25 };
const bornes = (v, a, b) => Math.max(a, Math.min(b, v)), lisse = (x) => { x = bornes(x, 0, 1); return x * x * (3 - 2 * x); };
const ID = () => window.__cvStandardPath, MONDE = () => window.__cvParity.jeuMonde();
const T = { entree: 1.8, compte: 2.4, sortie: 0.9 };

/* ---------- plan tiré de la page (positions mesurées par le moteur de l'Expo) ---------- */
function construit() {
  const m = MONDE(), chapitres = m.chapitres.map((c) => ({ id: c.id, nom: c.nom, top: c.top, bas: c.bas })), mots = [];
  for (const c of m.chapitres) { const l = c.cartes; l.forEach((k, j) => mots.push({ texte: k.titre, row: k.row ?? c.top + 400 + (j + 0.5) * Math.max(200, c.bas - c.top - 800) / l.length, chapitre: c.id, id: k.id })); }
  return J.construitPlan({ chapitres, mots, fin: m.fin });
}

/* ---------- son : synthèse originale (Web Audio), démarrée sur un geste de l'utilisateur ---------- */
const Son = {
  init() { if (S.audio || !S.son) return; try { const A = new (window.AudioContext || window.webkitAudioContext)(); const sortie = A.createGain(); sortie.gain.value = 0.5; sortie.connect(A.destination);
      const bruit = A.createBuffer(1, A.sampleRate, A.sampleRate), d = bruit.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 2 - 1;
      const vent = A.createBufferSource(); vent.buffer = bruit; vent.loop = true; const f = A.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7; const vg = A.createGain(); vg.gain.value = 0; vent.connect(f); f.connect(vg); vg.connect(sortie); vent.start();
      S.audio = { A, sortie, bruit, vg, f }; } catch { S.audio = null; } },
  ton(f0, f1, d, type = 'sine', g = 0.2, delai = 0) { const a = S.audio; if (!a || !S.son) return; const t = a.A.currentTime + delai, o = a.A.createOscillator(), v = a.A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(v); v.connect(a.sortie); o.start(t); o.stop(t + d + 0.05); },
  souffle(d, g = 0.2, f = 1200) { const a = S.audio; if (!a || !S.son) return; const t = a.A.currentTime, s = a.A.createBufferSource(), v = a.A.createGain(), fl = a.A.createBiquadFilter(); s.buffer = a.bruit; fl.type = 'lowpass'; fl.frequency.value = f; v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl); fl.connect(v); v.connect(a.sortie); s.start(t); s.stop(t + d + 0.05); },
  joue(ev) {
    switch (ev.t) {
      case 'collecte': { const base = ev.type === 'etoile' ? 660 : ev.type === 'noeud' ? 880 : 520, k = Math.pow(1.0595, Math.min(12, ev.combo * 2)); Son.ton(base * k, base * k * 1.5, 0.14, 'triangle', 0.16); if (ev.type === 'etoile') Son.ton(base * k * 2, base * k * 3, 0.3, 'sine', 0.1, 0.05); break; }
      case 'saut': Son.ton(220, 460, 0.16, 'sine', 0.14); break;
      case 'atterrit': Son.ton(110, 60, 0.12, 'sine', Math.min(0.3, ev.v / 4000)); break;
      case 'tremplin': Son.ton(160, 760, 0.32, 'square', 0.1); Son.souffle(0.25, 0.12, 3000); break;
      case 'rebond': Son.ton(300, 200, 0.08, 'triangle', 0.08); break;
      case 'choc': Son.souffle(0.18, 0.28, 700); Son.ton(130, 55, 0.2, 'sawtooth', 0.12); break;
      case 'aspire': Son.ton(340, 40, 0.95, 'sawtooth', 0.12); Son.ton(170, 30, 0.95, 'sine', 0.2); break;
      case 'chute': Son.ton(420, 60, 0.9, 'triangle', 0.14); break;
      case 'relance': [392, 523, 659].forEach((f, i) => Son.ton(f, f * 1.01, 0.18, 'triangle', 0.12, i * 0.07)); break;
      case 'arrivee': [523, 659, 784, 1047].forEach((f, i) => Son.ton(f, f, 0.5, 'triangle', 0.14, i * 0.14)); break;
      case 'compte': Son.ton(ev.fin ? 880 : 440, ev.fin ? 880 : 440, ev.fin ? 0.4 : 0.15, 'sine', 0.16); break;
    }
  },
  vent(vit, gaz) { const a = S.audio; if (!a) return; const t = a.A.currentTime; a.vg.gain.setTargetAtTime(S.son ? Math.min(0.09, vit / J.VMAX * 0.09) : 0, t, 0.1); a.f.frequency.setTargetAtTime(350 + gaz * 2200, t, 0.1); },
  stop() { const a = S.audio; if (a) a.vg.gain.value = 0; },
};

/* ---------- interface ---------- */
function creeDom() {
  if (S.dom) return S.dom;
  const el = document.createElement('div'); el.className = 'cv-jeu'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Mini-jeu : traverser le site en sphère');
  el.innerHTML = `<div class="cv-jeu-hud"><div class="cv-jeu-bloc"><b data-j="score">0</b><span>points</span></div><div class="cv-jeu-bloc"><b data-j="temps">0:00</b><span>temps</span></div>
    <div class="cv-jeu-bloc cv-jeu-compte-objets"><span data-j="mots">0</span><span>mots</span><span data-j="etoiles">0</span><span>étoiles</span><span data-j="noeuds">0</span><span>nœuds</span></div>
    <div class="cv-jeu-jauges"><label>vitesse<i data-j="vitesse"></i></label><label>sphère<i data-j="croiss"></i></label></div><div class="cv-jeu-combo" data-j="combo"></div></div>
    <div class="cv-jeu-piste" aria-hidden="true"><i data-j="progres"></i></div>
    <div class="cv-jeu-annonce" role="status" aria-live="assertive" data-j="annonce"></div>
    <p class="cv-jeu-aide" data-j="aide">Flèches ou A D pour diriger · W S ou molette pour la vitesse · Espace pour sauter · Échap pour quitter</p>
    <div class="cv-jeu-barre"><button type="button" data-j="son" aria-pressed="true">Son</button><button type="button" data-j="quitter">Quitter</button></div>
    <div class="cv-jeu-tactile"><div class="cv-jeu-glisse" data-j="glisse" role="slider" aria-label="Direction : faire glisser"><span></span></div><div class="cv-jeu-boutons"><button type="button" data-j="plus">Vite</button><button type="button" data-j="moins">Frein</button><button type="button" data-j="sauter">Saut</button></div></div>
    <div class="cv-jeu-fin" data-j="fin" role="dialog" aria-modal="true" aria-labelledby="cv-jeu-fin-t" hidden><h2 id="cv-jeu-fin-t">Arrivée</h2><p class="cv-jeu-note" data-j="note"></p><dl data-j="bilan"></dl><div class="cv-jeu-actions"><button type="button" data-j="rejouer">Rejouer</button><button type="button" data-j="finquitter">Revenir au site</button></div></div>`;
  document.body.append(el); S.dom = el; const q = (n) => el.querySelector(`[data-j="${n}"]`);
  q('quitter').onclick = () => ferme(); q('finquitter').onclick = () => ferme(); q('rejouer').onclick = () => relancePartie();
  q('son').onclick = () => { S.son = !S.son; q('son').setAttribute('aria-pressed', String(S.son)); if (!S.son) Son.stop(); else Son.init(); };
  /* commandes tactiles : glisser pour diriger (la commande observée sur la référence se saisit et se glisse), boutons de vitesse et de saut */
  const g = q('glisse'); let x0 = null, id = null;
  g.addEventListener('pointerdown', (e) => { x0 = e.clientX; id = e.pointerId; g.setPointerCapture(id); g.classList.add('tenu'); e.preventDefault(); Son.init(); });
  g.addEventListener('pointermove', (e) => { if (e.pointerId !== id || x0 === null) return; S.tactile.dir = bornes((e.clientX - x0) / 55, -1, 1); g.firstElementChild.style.transform = `translateX(${S.tactile.dir * 44}px)`; });
  const fin = (e) => { if (e.pointerId !== id) return; x0 = null; id = null; S.tactile.dir = 0; g.classList.remove('tenu'); g.firstElementChild.style.transform = ''; };
  g.addEventListener('pointerup', fin); g.addEventListener('pointercancel', fin);
  const tient = (b, f) => { b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('tenu'); f(true); Son.init(); }); const r = () => { b.classList.remove('tenu'); f(false); }; b.addEventListener('pointerup', r); b.addEventListener('pointercancel', r); };
  tient(q('plus'), (v) => { S.tactile.haut = v; }); tient(q('moins'), (v) => { S.tactile.bas = v; }); tient(q('sauter'), (v) => { if (v) S.saut = true; });
  return el;
}
const dq = (n) => S.dom.querySelector(`[data-j="${n}"]`);
const annonce = (t, ms = 1500) => { const a = dq('annonce'); a.textContent = t; a.classList.add('vu'); clearTimeout(S.tAnn); S.tAnn = setTimeout(() => a.classList.remove('vu'), ms); };

/* ---------- commandes clavier et molette ---------- */
const GAUCHE = new Set(['arrowleft', 'a', 'q']), DROITE = new Set(['arrowright', 'd']), HAUT = new Set(['arrowup', 'w', 'z']), BAS = new Set(['arrowdown', 's']);
function touche(e, bas) {
  if (S.phase === 'repos') return; const k = e.key.toLowerCase(), connue = GAUCHE.has(k) || DROITE.has(k) || HAUT.has(k) || BAS.has(k) || k === ' ' || k === 'spacebar' || k === 'escape' || k === 'enter';
  if (!connue) return; e.preventDefault(); e.stopImmediatePropagation();
  if (bas) { Son.init(); if (k === 'escape') { ferme(); return; } if (k === ' ' || k === 'spacebar') { if (!e.repeat) S.saut = true; } else if (k === 'enter') { if (S.phase === 'compte') debut(); } else S.touches.add(k); }
  else S.touches.delete(k);
}
function molette(e) { if (S.phase === 'repos') return; e.preventDefault(); e.stopImmediatePropagation(); S.gazDelta += bornes(e.deltaY, -300, 300) / 100 * 0.06; }
let ecoutes = false;
function ecoute(on) { if (on === ecoutes) return; ecoutes = on; const f = on ? addEventListener : removeEventListener; f('keydown', kd, true); f('keyup', ku, true); f('wheel', molette, { capture: true, passive: false }); }
const kd = (e) => touche(e, true), ku = (e) => touche(e, false);
function entrees() {
  const T_ = S.touches, dir = (DROITE_.some((k) => T_.has(k)) ? 1 : 0) - (GAUCHE_.some((k) => T_.has(k)) ? 1 : 0) + S.tactile.dir, dgaz = (HAUT_.some((k) => T_.has(k)) || S.tactile.haut ? 1 : 0) - (BAS_.some((k) => T_.has(k)) || S.tactile.bas ? 1 : 0);
  const e = { dir: bornes(dir, -1, 1), dgaz, saut: S.saut, gazDelta: S.gazDelta }; S.saut = false; S.gazDelta = 0; return e;
}
const GAUCHE_ = [...GAUCHE], DROITE_ = [...DROITE], HAUT_ = [...HAUT], BAS_ = [...BAS];

/* ---------- cycle : entrée progressive, compte à rebours, partie, résultats, sortie ---------- */
export async function ouvre() {
  if (S.phase !== 'repos') return; const id = ID(); if (!id) return;
  if (!id.active) { id.bascule(); await new Promise((r) => { const t0 = performance.now(), v = () => (id.active && id.progress > 0.999) || performance.now() - t0 > 20000 ? r() : setTimeout(v, 60); v(); }); }
  S.plan = construit(); S.etat = J.creeEtat(S.plan); S.priseHorloge = {}; creeDom(); S.yEntree = scrollY; S.yDepart = Math.max(0, S.plan.depart - innerHeight * 0.7);   /* cadrage de la course : la sphère aux trois quarts de la hauteur */ S.parts.length = 0; S.trainee.length = 0; S.cam = { v: 0, d: 0 }; S.compteur = 4;
  S.meilleur = 0; try { S.meilleur = +localStorage.getItem('cv-jeu-meilleur') || 0; } catch { /* stockage indisponible */ }
  document.documentElement.classList.add('cv-jeu-actif'); S.dom.hidden = false; S.dom.classList.remove('sortie'); requestAnimationFrame(() => S.dom.classList.add('vu')); dq('fin').hidden = true;
  Son.init(); ecoute(true); phase('entree'); window.dispatchEvent(new CustomEvent('cv-jeu', { detail: { etat: 'ouvert' } }));
}
function phase(p) { S.phase = p; S.tPhase = 0; if (S.dom) S.dom.dataset.phase = p; }
function debut() { J.demarre(S.etat); phase('course'); annonce('Go !', 900); Son.joue({ t: 'compte', fin: true }); }
function relancePartie() { S.etat = J.creeEtat(S.plan); S.parts.length = 0; S.trainee.length = 0; S.priseHorloge = {}; S.compteur = 4; dq('fin').hidden = true; phase('entree'); S.tPhase = T.entree * 0.55; }
export function ferme() {
  if (S.phase === 'repos' || S.phase === 'sortie') return; S.sortieDepuis = scrollY; phase('sortie'); S.dom.classList.add('sortie'); dq('fin').hidden = true; Son.stop(); S.touches.clear();
}
function termine() { S.phase = 'repos'; ecoute(false); S.dom.hidden = true; S.dom.classList.remove('vu', 'sortie'); document.documentElement.classList.remove('cv-jeu-actif'); S.etat = null; window.dispatchEvent(new CustomEvent('cv-jeu', { detail: { etat: 'ferme' } })); }

/* ---------- projection : la piste dans le repère de l'Expo ---------- */
let V = null, PR = null, COL0 = 0, COLW = 1;
const pt = (x, r, h = 0) => { const q = PR(COL0 + x / J.LARGEUR * COLW, r - V.offset, h);   /* PR(colonne, rangée, hauteur) : la vue est déjà liée par le moteur */ return q && Number.isFinite(q.x) && Number.isFinite(q.y) ? q : null; };
function disque(ctx, x, y, ray, c0, c1) { const g = ctx.createRadialGradient(x - ray * 0.3, y - ray * 0.35, ray * 0.1, x, y, ray); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, ray, 0, 6.283); ctx.fill(); }
function quad(ctx, x0, x1, r0, r1, h, remplir, trait) { const a = pt(x0, r0, h), b = pt(x1, r0, h), c = pt(x1, r1, h), d = pt(x0, r1, h); if (!a || !b || !c || !d) return null; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); if (remplir) { ctx.fillStyle = remplir; ctx.fill(); } if (trait) { ctx.strokeStyle = trait; ctx.stroke(); } return [a, b, c, d]; }
const echelle = (x, r, h, ray) => { const a = pt(x - ray, r, h), b = pt(x + ray, r, h); return a && b ? Math.max(2, Math.hypot(b.x - a.x, b.y - a.y) / 2) : 0; };

function fenetre(arr, r0, r1, cle) { const o = []; for (const a of arr) { const k = cle ? a[cle] : a.r0; if (k >= r0 - 1100 && k <= r1) o.push(a); } return o; }

function dessinePiste(ctx, e, plan, haut, fond, alpha) {
  const r0 = e.r - 500, r1 = e.r + 3600;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineWidth = 1.5;
  /* rambardes et lignes de départ, de points de passage et d'arrivée */
  for (const x of [0, J.LARGEUR]) { const a = pt(x, r0, 0), b = pt(x, r1, 0); if (a && b) { ctx.strokeStyle = 'rgba(120,200,255,.55)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  for (const p of plan.points) if (p.r > r0 && p.r < r1) quad(ctx, 0, J.LARGEUR, p.r, p.r + 14, 0, 'rgba(110,255,200,.28)', 'rgba(110,255,200,.7)');
  quad(ctx, 0, J.LARGEUR, plan.arrivee, plan.arrivee + 40, 0, 'rgba(255,255,255,.4)', '#fff');
  /* trous : gouffre noir à parois visibles (profondeur par projections successives sous le sol) */
  for (const t of fenetre(plan.trous, r0, r1)) { if (t.r1 < r0) continue; for (const [h, c] of [[0, 'rgba(20,10,60,.9)'], [-90, 'rgba(8,4,30,.95)'], [-200, 'rgba(0,0,8,1)']]) quad(ctx, t.x0, t.x1, t.r0, t.r1, h, c, h === 0 ? 'rgba(200,120,255,.8)' : null); }
  /* tremplins : plan incliné lumineux, chevrons dans le sens de la marche */
  for (const q of fenetre(plan.rampes, r0, r1)) { if (q.r1 < r0) continue; const f = quad(ctx, q.x0, q.x1, q.r0, q.r1, 0, 'rgba(255,200,80,.35)', 'rgba(255,220,120,.95)'); if (f) { quad(ctx, q.x0, q.x1, q.r1 - 30, q.r1, 40, 'rgba(255,230,140,.8)', null); for (let i = 0; i < 4; i++) { const cx = q.x0 + (i + 0.5) * (q.x1 - q.x0) / 4, a = pt(cx - 22, q.r0 + 20, 2), b = pt(cx, q.r0 + 70, 2), c = pt(cx + 22, q.r0 + 20, 2); if (a && b && c) { ctx.strokeStyle = '#ffe9a8'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke(); } } } }
  /* obstacles : blocs, dessus et face avant */
  for (const o of fenetre(plan.obstacles, r0, r1)) { if (o.r1 < r0) continue; quad(ctx, o.x0, o.x1, o.r0, o.r0 + 0.01, 0, null, null); const f = pt(o.x0, o.r0, 0), g = pt(o.x1, o.r0, 0), h2 = pt(o.x1, o.r0, o.hh), i = pt(o.x0, o.r0, o.hh); if (f && g && h2 && i) { ctx.fillStyle = 'rgba(255,90,120,.75)'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(g.x, g.y); ctx.lineTo(h2.x, h2.y); ctx.lineTo(i.x, i.y); ctx.closePath(); ctx.fill(); } quad(ctx, o.x0, o.x1, o.r0, o.r1, o.hh, 'rgba(255,150,170,.85)', '#fff'); }
  /* trous noirs : entonnoir à anneaux concentriques qui s'enfoncent, filets en spirale, horizon dense */
  for (const b of plan.noirs) { if (b.r < r0 - 300 || b.r > r1) continue; const t = S.horloge;
    for (let k = 7; k >= 0; k--) { const q = k / 7, ray = J.BN_INFLUENCE * (0.15 + 0.85 * q), prof = -330 * (1 - q) * (1 - q), pas = 28; ctx.beginPath(); let ok = true; for (let a = 0; a <= pas; a++) { const an = a / pas * 6.283, p = pt(b.x + Math.cos(an) * ray, b.r + Math.sin(an) * ray, prof); if (!p) { ok = false; break; } a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } if (!ok) continue; ctx.strokeStyle = `rgba(${120 + 100 * q},${60 + 40 * q},255,${0.15 + 0.5 * (1 - q)})`; ctx.lineWidth = 1 + (1 - q) * 2; ctx.stroke(); if (k === 0) { ctx.fillStyle = 'rgba(0,0,0,.92)'; ctx.fill(); } }
    for (let s = 0; s < 5; s++) { ctx.beginPath(); let ok = true; for (let a = 0; a < 18; a++) { const q = a / 17, an = s * 1.2566 + q * 5 + t * 1.2, ray = J.BN_INFLUENCE * (1 - q * 0.9), p = pt(b.x + Math.cos(an) * ray, b.r + Math.sin(an) * ray, -330 * q * q); if (!p) { ok = false; break; } a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } if (ok) { ctx.strokeStyle = 'rgba(190,150,255,.55)'; ctx.lineWidth = 1.2; ctx.stroke(); } } }
  ctx.restore();
}

function dessineObjets(ctx, e, plan, alpha) {
  const r0 = e.r - 300, r1 = e.r + 3200; ctx.save(); ctx.textAlign = 'center'; ctx.font = '500 13px "JetBrains Mono",ui-monospace,monospace'; ctx.lineJoin = 'round';
  const centre = pt(e.x, e.r, e.h + e.rayon);
  for (let i = 0; i < plan.objets.length; i++) {
    const o = plan.objets[i]; if (o.r < r0 || o.r > r1) continue; const pris = e.pris[i]; let x = o.x, r = o.r, h = o.h + o.ray, k = 1, a = alpha;
    if (pris >= 0) { const q = (S.horloge - S.priseHorloge[i]) / 0.34; if (q >= 1 || !(i in S.priseHorloge)) continue; const w = q * q * (3 - 2 * q); x += (e.x - x) * w; r += (e.r - r) * w; h += (e.h + e.rayon - h) * w; k = 1 - 0.75 * w; a *= 1 - w * 0.5; }   /* attirés puis absorbés par la sphère */
    const p = pt(x, r, h); if (!p) continue; const s = echelle(x, r, h, o.ray) * k; ctx.globalAlpha = a;
    const lueur = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 3); lueur.addColorStop(0, o.type === 'etoile' ? 'rgba(255,230,140,.55)' : 'rgba(150,230,255,.4)'); lueur.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lueur; ctx.beginPath(); ctx.arc(p.x, p.y, s * 3, 0, 6.283); ctx.fill();
    if (o.type === 'etoile') { ctx.fillStyle = '#ffe58a'; ctx.beginPath(); for (let j = 0; j < 10; j++) { const an = -1.5708 + j * 0.6283 + S.horloge * 0.8, rr = j % 2 ? s * 0.45 : s; ctx.lineTo(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr * 0.9); } ctx.closePath(); ctx.fill(); }
    else if (o.type === 'noeud') { disque(ctx, p.x, p.y, Math.max(2, s), '#e8fbff', '#4ab8ff'); }
    else { const w = Math.min(190, 20 + o.texte.length * 7.5) * Math.max(0.35, Math.min(1.6, s / 18)) * k; ctx.fillStyle = 'rgba(8,16,70,.62)'; ctx.fillRect(p.x - w / 2, p.y - 11 * Math.min(1.4, s / 14), w, 22 * Math.min(1.4, s / 14)); ctx.strokeStyle = 'rgba(160,230,255,.9)'; ctx.lineWidth = 1; ctx.strokeRect(p.x - w / 2, p.y - 11 * Math.min(1.4, s / 14), w, 22 * Math.min(1.4, s / 14)); ctx.fillStyle = '#fff'; ctx.font = `500 ${Math.max(8, Math.min(18, 12 * s / 16)).toFixed(0)}px "JetBrains Mono",ui-monospace,monospace`; ctx.fillText(o.texte.length > 26 ? o.texte.slice(0, 25) + '…' : o.texte, p.x, p.y + 4); }
  }
  ctx.restore(); void centre;
}

function dessineSphere(ctx, e, alpha) {
  const R = e.rayon, p = pt(e.x, e.r, e.h + R); if (!p) return; const s = echelle(e.x, e.r, e.h + R, R), ombre = pt(e.x, e.r, 0), ec = Math.max(0.6, 1 - e.h / 700);
  ctx.save(); ctx.globalAlpha = alpha;
  if (ombre) { ctx.fillStyle = `rgba(0,0,0,${0.35 * ec})`; ctx.beginPath(); ctx.ellipse(ombre.x, ombre.y, s * 1.1 * ec, s * 0.38 * ec, 0, 0, 6.283); ctx.fill(); }
  /* traînée : positions passées dans l'espace de la piste, reprojetées */
  const tr = S.trainee; for (let i = 1; i < tr.length; i++) { const a = pt(tr[i - 1].x, tr[i - 1].r, tr[i - 1].h + R * 0.6), b = pt(tr[i].x, tr[i].r, tr[i].h + R * 0.6); if (!a || !b) continue; const q = i / tr.length; ctx.strokeStyle = `rgba(150,235,255,${0.5 * q * Math.min(1, e.vr / 800)})`; ctx.lineWidth = Math.max(1, s * 1.5 * q); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  const etire = 1 + Math.min(0.18, Math.abs(e.vh) / 9000);
  ctx.translate(p.x, p.y); ctx.scale(1 / etire, etire); disque(ctx, 0, 0, s, '#ffffff', '#3aa8ff'); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.283); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.35, s * 0.22, s * 0.12, -0.6, 0, 6.283); ctx.fill();
  ctx.restore();
}

/* ---------- particules (cosmétiques : la physique ne les lit jamais) ---------- */
let graine = 12345; const hasard = () => { graine = (graine * 1664525 + 1013904223) >>> 0; return graine / 4294967296; };
function emet(n, x, r, h, c, v = 300, vie = 0.7, grav = 1500) { if (S.reduit.matches) n = Math.ceil(n / 3); for (let i = 0; i < n; i++) { const a = hasard() * 6.283, w = (0.3 + hasard()) * v; S.parts.push({ x, r, h, vx: Math.cos(a) * w, vr: Math.sin(a) * w * 0.6, vh: (0.2 + hasard()) * v, vie, t: 0, c, g: grav }); } if (S.parts.length > 400) S.parts.splice(0, S.parts.length - 400); }
function avance(dt) { for (const q of S.parts) { q.t += dt; q.x += q.vx * dt; q.r += q.vr * dt; q.vh -= q.g * dt; q.h = Math.max(0, q.h + q.vh * dt); } S.parts = S.parts.filter((q) => q.t < q.vie); }
function dessineParticules(ctx) { ctx.save(); for (const q of S.parts) { const p = pt(q.x, q.r, q.h + 4); if (!p) continue; const a = 1 - q.t / q.vie; ctx.fillStyle = q.c.replace('A', a.toFixed(2)); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, 3 * a + 1), 0, 6.283); ctx.fill(); } ctx.restore(); }

function reagit(ev, e) {
  for (const v of ev) { Son.joue(v); const R = e.rayon;
    if (v.t === 'collecte') { emet(v.type === 'etoile' ? 18 : 8, e.x, e.r, e.h + R, v.type === 'etoile' ? 'rgba(255,225,120,A)' : 'rgba(150,235,255,A)', 260, 0.55, 300); S.priseHorloge[v.i] = S.horloge; if (v.combo > 1) annonce(`combo ×${v.combo}`, 900); if (v.type === 'etoile') annonce('Étoile !', 900); }
    else if (v.t === 'saut') emet(6, e.x, e.r, 0, 'rgba(200,220,255,A)', 160, 0.4);
    else if (v.t === 'atterrit') { emet(10, e.x, e.r, 0, 'rgba(210,230,255,A)', 260, 0.5); S.cam.v += 300; S.secousse = Math.max(S.secousse, Math.min(6, v.v / 400)); }
    else if (v.t === 'tremplin') { emet(26, e.x, e.r, 0, 'rgba(255,220,120,A)', 520, 0.7); S.cam.v -= 700; S.secousse = 5; annonce('Tremplin !', 800); }
    else if (v.t === 'choc') { emet(14, e.x, e.r, R, 'rgba(255,120,140,A)', 420, 0.5); S.secousse = Math.min(10, 3 + v.v / 200); }
    else if (v.t === 'rebond') emet(5, e.x, e.r, R, 'rgba(180,220,255,A)', 200, 0.35);
    else if (v.t === 'chute') { emet(24, e.x, e.r, Math.max(0, e.h), 'rgba(190,150,255,A)', 380, 0.9, 700); annonce('Chute…', 1100); }
    else if (v.t === 'aspire') annonce('Trou noir !', 1000);
    else if (v.t === 'relance') { emet(30, e.x, e.r, e.h, 'rgba(110,255,200,A)', 420, 0.8, 300); annonce('Relance au point de passage', 1400); S.trainee.length = 0; }
    else if (v.t === 'arrivee') { emet(80, e.x, e.r, e.h + R, 'rgba(255,230,140,A)', 700, 1.4, 600); termineManche(); }
  }
}

/* ---------- résultats ---------- */
function termineManche() {
  const e = S.etat, pl = S.plan, tot = { mot: pl.objets.filter((o) => o.type === 'mot').length, etoile: pl.objets.filter((o) => o.type === 'etoile').length, noeud: pl.objets.filter((o) => o.type === 'noeud').length };
  const sc = Math.round(e.score), grade = sc >= 2300 ? 'S' : sc >= 1700 ? 'A' : sc >= 1100 ? 'B' : 'C'; if (sc > S.meilleur) { S.meilleur = sc; try { localStorage.setItem('cv-jeu-meilleur', String(sc)); } catch { /* sans stockage */ } }
  const mm = Math.floor(e.t / 60), ss = Math.floor(e.t % 60).toString().padStart(2, '0');
  dq('bilan').innerHTML = `<div><dt>Score</dt><dd>${sc} points</dd></div><div><dt>Temps</dt><dd>${mm}:${ss}</dd></div><div><dt>Mots</dt><dd>${e.mots} / ${tot.mot}</dd></div><div><dt>Étoiles</dt><dd>${e.etoiles} / ${tot.etoile}</dd></div><div><dt>Nœuds</dt><dd>${e.noeuds} / ${tot.noeud}</dd></div><div><dt>Chutes</dt><dd>${e.chutes}</dd></div><div><dt>Sphère</dt><dd>${Math.round(e.rayon)} px</dd></div>`;
  dq('note').textContent = `Note ${grade}${sc >= S.meilleur ? ' · meilleur score' : ' · record ' + S.meilleur}`; S.finDans = 1.6;
}

/* ---------- boucle : appelée par le moteur de l'Expo à chaque image, après le dessin des étoiles ---------- */
S.horloge = 0; S.priseHorloge = {};
export function dessine(ctx, view, P, now, dt) {
  if (S.phase === 'repos' || !S.etat) return; V = view; PR = P; S.horloge += dt; S.tPhase += dt; const W = view.W, H = view.H, e = S.etat, pl = S.plan;
  COL0 = W * 0.09; COLW = W * 0.82;
  /* machine d'états */
  if (S.phase === 'entree') { const q = S.tPhase / T.entree; e.hRend = 900 * Math.pow(1 - lisse(q), 2); if (S.tPhase >= T.entree) { phase('compte'); S.compteur = 4; } }
  else if (S.phase === 'compte') { const n = 3 - Math.floor(S.tPhase / (T.compte / 3)); if (n !== S.compteur && n >= 1) { S.compteur = n; dq('annonce').textContent = String(n); dq('annonce').classList.add('vu'); Son.joue({ t: 'compte' }); } if (S.tPhase >= T.compte) debut(); }
  else if (S.phase === 'course' || S.phase === 'fin') {
    S.acc = Math.min(S.acc + dt, S.dtMax); const en = entrees(); let n = 0;
    while (S.acc >= J.PAS) { const ev = J.pas(e, pl, n === 0 ? en : { dir: en.dir, dgaz: en.dgaz }); n++; S.acc -= J.PAS; if (ev.length) reagit(ev, e); if (e.n % 3 === 0 && e.etat === 'course') { S.trainee.push({ x: e.x, r: e.r, h: e.h }); if (S.trainee.length > 26) S.trainee.shift(); } }
    if (e.etat === 'arrive' && S.phase === 'course') phase('fin');
    if (S.phase === 'fin' && S.finDans > 0) { S.finDans -= dt; if (S.finDans <= 0) { dq('fin').hidden = false; dq('fin').querySelector('button').focus?.(); } }
  }
  if (S.phase !== 'sortie') { if (S.phase !== 'entree') e.hRend = e.h; }
  avance(dt); S.secousse *= Math.exp(-9 * dt);
  /* caméra : suit la rangée de la sphère avec avance selon la vitesse, ressort sur les sauts et les chocs ; l'entrée et la sortie glissent depuis et vers la position de lecture */
  let cible;
  if (S.phase === 'entree') cible = S.yEntree + (S.yDepart - S.yEntree) * lisse(S.tPhase / T.entree);
  else if (S.phase === 'sortie') { const q = lisse(S.tPhase / T.sortie); cible = S.sortieDepuis + (S.yEntree - S.sortieDepuis) * q; if (S.tPhase >= T.sortie) { scrollTo({ top: S.yEntree, behavior: 'instant' }); termine(); return; } }
  else { const mil = pt(e.x, e.r, 0); const cy = H * (0.72 + 0.1 * (e.gaz ?? 0.4)) + S.cam.d, a = pt(e.x, e.r + 60, 0);
    S.dbg = { sy: mil && mil.y, cy, ppr: mil && a ? (a.y - mil.y) / 60 : null, off: V.offset, sc: scrollY };
    if (mil && a) { const ppr = (a.y - mil.y) / 60; if (Math.abs(ppr) > 0.01) cible = scrollY + (cy - mil.y) / -ppr * (1 - Math.exp(-dt * 9)); } }
  S.cam.v += (-S.cam.d * 90 - S.cam.v * 12) * dt; S.cam.d += S.cam.v * dt * 0.4;   /* ressort amorti : impulsions de saut, d'atterrissage et de tremplin */
  if (cible !== undefined && Math.abs(cible - scrollY) > 0.4) scrollTo({ top: Math.max(0, cible), behavior: 'instant' });
  /* rendu par-dessus la scène */
  const ent = S.phase === 'entree' ? lisse(S.tPhase / (T.entree * 0.8)) : S.phase === 'sortie' ? 1 - lisse(S.tPhase / T.sortie) : 1;
  ctx.save(); if (S.secousse > 0.05 && !S.reduit.matches) ctx.translate((hasard() - 0.5) * S.secousse, (hasard() - 0.5) * S.secousse);
  dessinePiste(ctx, e, pl, 0, 0, ent); dessineObjets(ctx, e, pl, ent);
  const sauve = e.h; if (S.phase === 'entree') e.h = e.hRend; dessineSphere(ctx, e, ent); e.h = sauve; dessineParticules(ctx);
  if (e.vr > J.VMAX * 0.7 && !S.reduit.matches) { ctx.strokeStyle = `rgba(200,235,255,${0.25 * (e.vr / J.VMAX)})`; ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + S.horloge * 0.3, r0 = Math.min(W, H) * (0.42 + 0.1 * hasard()), r1 = r0 + 60 + 90 * (e.vr / J.VMAX); ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0 * 0.7); ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1 * 0.7); ctx.stroke(); } }
  ctx.restore();
  Son.vent(e.etat === 'course' ? e.vr : 0, e.gaz);
  majInterface(e);
}
function majInterface(e) {
  const mm = Math.floor(e.t / 60), ss = Math.floor(e.t % 60).toString().padStart(2, '0'), pl = S.plan;
  dq('score').textContent = String(Math.round(e.score)); dq('temps').textContent = `${mm}:${ss}`; dq('mots').textContent = e.mots; dq('etoiles').textContent = e.etoiles; dq('noeuds').textContent = e.noeuds;
  dq('vitesse').style.setProperty('--v', (bornes((e.vr - J.VMIN) / (J.VMAX - J.VMIN), 0, 1) * 100).toFixed(0) + '%'); dq('croiss').style.setProperty('--v', (bornes((e.rayon - J.RAYON_MIN) / (J.RAYON_MAX - J.RAYON_MIN), 0, 1) * 100).toFixed(0) + '%');
  dq('progres').style.setProperty('--v', (bornes((e.r - pl.depart) / (pl.arrivee - pl.depart), 0, 1) * 100).toFixed(1) + '%'); dq('combo').textContent = e.combo > 1 && e.t - e.tCombo < 1.6 ? `combo ×${e.combo}` : '';
}

/* ---------- accès pour les tests et le pilote automatique ---------- */
window.__cvJeu = { ouvre, ferme, dessine, phase: () => S.phase,
  etat: () => { const e = S.etat; return e ? { phase: S.phase, etat: e.etat, t: e.t, n: e.n, r: e.r, x: e.x, h: e.h, vr: e.vr, vx: e.vx, vh: e.vh, gaz: e.gaz, rayon: e.rayon, score: e.score, mots: e.mots, etoiles: e.etoiles, noeuds: e.noeuds, chutes: e.chutes, chocs: e.chocs, sauts: e.sauts, tremplins: e.tremplins, combo: e.combo, empreinte: J.empreinte(e), pris: e.pris.reduce((s, v) => s + (v >= 0 ? 1 : 0), 0), scrollY: Math.round(scrollY), dbg: S.dbg, depart: S.plan.depart, arrivee: S.plan.arrivee } : { phase: S.phase }; },
  plan: () => S.plan && { depart: S.plan.depart, arrivee: S.plan.arrivee, trous: S.plan.trous.length, rampes: S.plan.rampes.length, obstacles: S.plan.obstacles.length, noirs: S.plan.noirs.length, objets: S.plan.objets.length },
  pilote: (opts) => (S.etat && S.phase === 'course' ? J.pilote(S.etat, S.plan, opts) : { dir: 0, dgaz: 0, saut: false }),
  sonde: (col, rowRel, h = 0) => { const q = PR && PR(col, rowRel, h); return q ? { x: q.x, y: q.y, z: q.z } : q; }, vue: () => V && { W: V.W, H: V.H, T: V.T, e: V.e, offset: V.offset, focusRow: V.focusRow },
  reglages: (o = {}) => { if (o.dtMax) S.dtMax = bornes(o.dtMax, 0.01, 0.25); return { dtMax: S.dtMax }; },   /* test : pas de temps maximal par image ; une valeur basse ralentit la simulation sans la changer */
  donneesPlan: () => S.plan && JSON.parse(JSON.stringify({ depart: S.plan.depart, arrivee: S.plan.arrivee, trous: S.plan.trous, rampes: S.plan.rampes, obstacles: S.plan.obstacles, noirs: S.plan.noirs, points: S.plan.points, objets: S.plan.objets.length })),
  noyau: J };
