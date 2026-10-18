/* Contrôle de ligne par vision, en temps réel, dans le navigateur.
   Repérer -> suivre -> compter à une ligne virtuelle -> juger chaque pièce par des règles géométriques réglables.
   Aucune image ne quitte l'appareil. */

const MODES = { precis: 'assets/vision/detecteur-precis.bin', rapide: 'assets/vision/detecteur-rapide.bin' };
const TAILLE = 640;                              // côté de l'image donnée au détecteur
const CLASSES = new Set([39, 40, 41, 75]);       // familles de contenants : bouteille, verre, tasse, vase
const BASE_LIGNE = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/36/Cha%C3%AEne_embouteillage_effervescent.ogv/Cha%C3%AEne_embouteillage_effervescent.ogv';
const LIGNE_REELLE = [BASE_LIGNE + '.720p.vp9.webm', BASE_LIGNE + '.480p.vp9.webm', BASE_LIGNE + '.360p.vp9.webm', 'https://upload.wikimedia.org/wikipedia/commons/3/36/Cha%C3%AEne_embouteillage_effervescent.ogv'];   // du plus net au plus léger, puis le fichier d'origine       // familles de contenants : bouteille, verre, tasse, vase

const $ = (id) => document.getElementById(id);
const vue = $('vue'), ctx = vue.getContext('2d');
const tampon = document.createElement('canvas'); tampon.width = tampon.height = TAILLE;
const tctx = tampon.getContext('2d', { willReadFrequently: true });
const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.crossOrigin = 'anonymous';

const etat = {
  ort: null, session: null, mode: null, source: 'reel', axe: 'x', actif: false, boucle: 0, flux: null, hls: null, img: null, urlFichier: null,
  trame: 0, nbTotal: 0, nbOk: 0, nbNok: 0, evenements: [], references: [], recents: [],
  pistes: [], prochainId: 1, ligne: 0.5, sens: 'les-deux-x', msInference: 0, t0: 0,
};

/* ------------------------------------------------------------------ interface */
const ui = { total: $('n-total'), ok: $('n-ok'), nok: $('n-nok'), taux: $('n-taux'), ms: $('n-ms'), message: $('message'), journal: $('journal').querySelector('tbody'), conf: $('r-conf'), ratio: $('r-ratio'), tol: $('r-tol') };
const regles = () => ({ conf: +ui.conf.value, ratioMin: +ui.ratio.value, tol: +ui.tol.value });
const majSortie = () => { const r = regles(); $('v-conf').textContent = r.conf.toFixed(2); $('v-ratio').textContent = r.ratioMin.toFixed(1); $('v-tol').textContent = '± ' + r.tol + ' %'; };
['r-conf', 'r-ratio', 'r-tol'].forEach((id) => $(id).addEventListener('input', majSortie)); majSortie();
const dire = (t) => { ui.message.textContent = t; ui.message.hidden = !t; };
const majCompteurs = () => {
  ui.total.textContent = etat.nbTotal; ui.ok.textContent = etat.nbOk; ui.nok.textContent = etat.nbNok;
  ui.taux.textContent = etat.nbTotal ? Math.round((100 * etat.nbOk) / etat.nbTotal) + ' %' : '–';
};
const ajouterLigne = (e) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${e.n}</td><td>${e.t.toFixed(1)} s</td><td><span class="ly-badge ${e.ok ? 'ok' : 'nok'}">${e.ok ? 'Conforme' : 'Non conforme'}</span></td><td>${e.ratio.toFixed(2)}</td><td>${Math.round(e.h)} px</td><td>${e.motif}</td>`;
  ui.journal.prepend(tr);
  while (ui.journal.children.length > 60) ui.journal.lastChild.remove();
};

/* ------------------------------------------------------------------ détecteur */
async function chargerDetecteur(mode) {
  if (etat.session && etat.mode === mode) return;
  dire('Chargement du détecteur…');
  if (!etat.ort) {
    etat.ort = await import('../vendor/vision/moteur.mjs');
    etat.ort.env.wasm.wasmPaths = { mjs: new URL('../vendor/vision/moteur-ext.mjs', import.meta.url).href, wasm: new URL('../vendor/vision/moteur-ext.wasm', import.meta.url).href };
    etat.ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
  }
  const rep = await fetch(MODES[mode]);
  if (!rep.ok) throw new Error('détecteur introuvable');
  etat.session = await etat.ort.InferenceSession.create(new Uint8Array(await rep.arrayBuffer()), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  etat.mode = mode; dire('');
}

/* image -> tenseur (cadre carré, fond gris) -> détections {x,y,w,h,score} en pixels de l'image d'origine */
async function detecter(source, W, H) {
  const echelle = Math.min(TAILLE / W, TAILLE / H), nw = Math.round(W * echelle), nh = Math.round(H * echelle);
  const px = Math.floor((TAILLE - nw) / 2), py = Math.floor((TAILLE - nh) / 2);
  tctx.fillStyle = 'rgb(114,114,114)'; tctx.fillRect(0, 0, TAILLE, TAILLE); tctx.drawImage(source, px, py, nw, nh);
  const { data } = tctx.getImageData(0, 0, TAILLE, TAILLE), plan = TAILLE * TAILLE, entree = new Float32Array(3 * plan);
  for (let i = 0, p = 0; i < plan; i++, p += 4) { entree[i] = data[p] / 255; entree[plan + i] = data[p + 1] / 255; entree[2 * plan + i] = data[p + 2] / 255; }
  const t0 = performance.now();
  const sortie = await etat.session.run({ images: new etat.ort.Tensor('float32', entree, [1, 3, TAILLE, TAILLE]) });
  etat.msInference = performance.now() - t0;
  const o = sortie[Object.keys(sortie)[0]].data, n = o.length / 6, seuil = regles().conf, dets = [];
  for (let k = 0; k < n; k++) {
    const sc = o[k * 6 + 4], cl = o[k * 6 + 5] | 0; if (sc < seuil || !CLASSES.has(cl)) continue;
    const x1 = (o[k * 6] - px) / echelle, y1 = (o[k * 6 + 1] - py) / echelle, x2 = (o[k * 6 + 2] - px) / echelle, y2 = (o[k * 6 + 3] - py) / echelle;
    dets.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1, score: sc });
  }
  return dets;
}

/* ------------------------------------------------------------------ suivi (appariement glouton, vitesse constante) */
function suivre(dets) {
  const P = etat.pistes;
  for (const p of P) { p.px = p.x + p.vx; p.py = p.y + p.vy; p.vu = false; }
  const couples = [];
  dets.forEach((d, i) => P.forEach((p, j) => { const dist = Math.hypot(d.x - p.px, d.y - p.py), ech = Math.max(d.h, p.h); if (dist < 0.8 * ech) couples.push([dist / ech, i, j]); }));
  couples.sort((a, b) => a[0] - b[0]);
  const prisD = new Set(), prisP = new Set();
  for (const [, i, j] of couples) {
    if (prisD.has(i) || prisP.has(j)) continue; prisD.add(i); prisP.add(j);
    const d = dets[i], p = P[j];
    p.vx = 0.5 * p.vx + 0.5 * (d.x - p.x); p.vy = 0.5 * p.vy + 0.5 * (d.y - p.y);
    p.x = d.x; p.y = d.y; p.w = d.w; p.h = d.h; p.score = d.score; p.touches++; p.rate = 0; p.vu = true;
    p.hist.push({ w: d.w, h: d.h }); if (p.hist.length > 8) p.hist.shift();
  }
  dets.forEach((d, i) => { if (!prisD.has(i)) P.push({ id: etat.prochainId++, x: d.x, y: d.y, w: d.w, h: d.h, vx: 0, vy: 0, px: d.x, py: d.y, score: d.score, touches: 1, rate: 0, vu: true, compte: null, cote: 0, hist: [{ w: d.w, h: d.h }] }); });
  for (const p of P) if (!p.vu) { p.rate++; p.x += p.vx; p.y += p.vy; }
  etat.pistes = P.filter((p) => p.rate <= 4);
}

const mediane = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* verdict : debout (rapport hauteur/largeur) et gabarit (hauteur proche de la référence calibrée sur les trois premières pièces) */
function juger(p) {
  const r = regles(), h = mediane(p.hist.map((v) => v.h)), w = mediane(p.hist.map((v) => v.w)), ratio = h / Math.max(w, 1), motifs = [];
  if (ratio < r.ratioMin) motifs.push('renversée ou inclinée');
  if (etat.references.length >= 3) { const ref = mediane(etat.references); if (Math.abs(h - ref) / ref > r.tol / 100) motifs.push(h < ref ? 'trop petite' : 'trop grande'); }
  return { ok: !motifs.length, motif: motifs.join(' + ') || 'dans la tolérance', ratio, h };
}

function compter(tempsVideo) {
  const Lpos = etat.ligne * (etat.axe === 'x' ? vue.width : vue.height);
  for (const p of etat.pistes) {
    const cote = Math.sign((etat.axe === 'x' ? p.x : p.y) - Lpos);
    if (p.touches >= 3 && p.cote && cote && cote !== p.cote && !p.compte) {
      const sensOk = etat.sens.startsWith('les-deux') || (etat.sens === 'droite' || etat.sens === 'bas' ? cote > 0 : cote < 0);
      const voisinVisible = !p.vu && etat.pistes.some((q) => q !== p && q.vu && Math.abs(q.x - p.x) < 0.7 * Math.max(p.w, q.w) && Math.abs(q.y - p.y) < 0.5 * p.h);   // même pièce suivie sous un autre numéro
      const doublon = etat.recents.some((e) => etat.trame - e.trame < 2 && Math.hypot(e.x - p.x, e.y - p.y) < 0.6 * Math.max(p.w, p.h));
      if (sensOk && !voisinVisible && !doublon) {
        const v = juger(p);
        p.compte = v.ok ? 'ok' : 'nok';
        if (etat.references.length < 3) etat.references.push(v.h);
        etat.nbTotal++; v.ok ? etat.nbOk++ : etat.nbNok++;
        etat.recents.push({ trame: etat.trame, x: p.x, y: p.y });
        const e = { n: etat.nbTotal, t: tempsVideo, ok: v.ok, ratio: v.ratio, h: v.h, motif: v.motif }; etat.evenements.push(e); ajouterLigne(e); majCompteurs();
      }
    }
    if (cote) p.cote = cote;
  }
}

/* ------------------------------------------------------------------ dessin */
function dessiner(source, W, H) {
  if (vue.width !== W || vue.height !== H) { vue.width = W; vue.height = H; vue.parentElement.style.aspectRatio = W + ' / ' + H; vue.parentElement.style.setProperty('--ar', W / H); }
  ctx.drawImage(source, 0, 0, W, H);
  const Lp = etat.ligne * (etat.axe === 'x' ? W : H);
  ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeStyle = '#8fe0ff'; ctx.beginPath();
  if (etat.axe === 'x') { ctx.moveTo(Lp, 0); ctx.lineTo(Lp, H); } else { ctx.moveTo(0, Lp); ctx.lineTo(W, Lp); }
  ctx.stroke(); ctx.restore();
  ctx.font = '600 12px Arial'; ctx.fillStyle = '#8fe0ff';
  if (etat.axe === 'x') ctx.fillText('ligne de comptage', Math.min(Lp + 6, W - 112), 16); else ctx.fillText('ligne de comptage', 8, Math.max(14, Lp - 6));
  for (const p of etat.pistes) {
    if (p.touches < 2) continue;
    const col = p.compte === 'ok' ? '#8cf5bf' : p.compte === 'nok' ? '#ff9a9a' : '#f2f7ff';
    ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.setLineDash(p.compte ? [] : [5, 4]); ctx.strokeRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h); ctx.setLineDash([]);
    const t = '#' + p.id + (p.compte ? (p.compte === 'ok' ? ' OK' : ' NOK') : '');
    ctx.fillStyle = col; ctx.font = '700 12px Arial'; const tw = ctx.measureText(t).width + 8;
    ctx.fillRect(p.x - p.w / 2, Math.max(0, p.y - p.h / 2 - 16), tw, 16); ctx.fillStyle = '#0a2250'; ctx.fillText(t, p.x - p.w / 2 + 4, Math.max(12, p.y - p.h / 2 - 4));
  }
  ui.ms.textContent = etat.msInference ? Math.round(etat.msInference) + ' ms' : '–';
}

function attente(texte) {
  vue.width = 640; vue.height = 480; ctx.fillStyle = '#06142f'; ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#aac6f0'; ctx.font = '600 16px Arial'; ctx.textAlign = 'center'; ctx.fillText(texte, 320, 240); ctx.textAlign = 'start';
}

/* ------------------------------------------------------------------ sources : tout fonctionne en temps réel sur l'image la plus récente */
function remettreAZero() {
  Object.assign(etat, { trame: 0, nbTotal: 0, nbOk: 0, nbNok: 0, evenements: [], references: [], recents: [], pistes: [], prochainId: 1 });
  ui.journal.replaceChildren(); majCompteurs();
}
const attendre = (el, nom, ms = 20000) => new Promise((ok, ko) => {
  const fin = setTimeout(() => ko(new Error('source illisible ou trop lente')), ms);
  el.addEventListener(nom, () => { clearTimeout(fin); ok(); }, { once: true });
  el.addEventListener('error', () => { clearTimeout(fin); ko(new Error('source illisible')); }, { once: true });
});
const charger = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('lecteur de flux indisponible')); document.head.append(s); });

function arreter() {
  etat.actif = false; cancelAnimationFrame(etat.boucle);
  if (etat.flux) { etat.flux.getTracks().forEach((t) => t.stop()); etat.flux = null; }
  if (etat.hls) { etat.hls.destroy(); etat.hls = null; }
  etat.img = null; video.pause(); $('btn-go').textContent = 'Lancer l’analyse';
}

async function ouvrirSource() {                          // renvoie l'élément à lire (vidéo ou image de flux)
  video.srcObject = null; video.removeAttribute('src');
  if (etat.source === 'reel') {                          // vidéo d'une vraie ligne, lue depuis son hébergeur : on essaie plusieurs définitions
    for (const url of LIGNE_REELLE) {
      video.src = url;
      try { await video.play(); return video; } catch (e) { /* définition suivante */ }
    }
    throw new Error('la vidéo de la ligne n\u2019a pas pu être chargée (connexion ou blocage du site hébergeur)');
  }
  if (etat.source === 'camera') {
    etat.flux = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' } });
    video.srcObject = etat.flux; await video.play(); return video;
  }
  if (etat.source === 'fichier') {
    if (!etat.urlFichier) throw new Error('choisis d’abord une vidéo');
    video.src = etat.urlFichier; await video.play(); return video;
  }
  const url = $('url').value.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('indique l’adresse du flux (http ou https)');
  if (/\.m3u8(\?|$)/i.test(url)) {
    if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = url;
    else { if (!window.Hls) await charger('vendor/vision/flux-direct.js'); etat.hls = new window.Hls({ lowLatencyMode: true }); etat.hls.loadSource(url); etat.hls.attachMedia(video); }
    await video.play(); return video;
  }
  if (/\.(mp4|webm|ogv)(\?|$)/i.test(url)) { video.src = url; await video.play(); return video; }
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; await img.decode(); etat.img = img; return img;   // flux d'images en continu (MJPEG)
}

async function lancer() {
  if (etat.actif) { arreter(); return; }
  try {
    dire('Préparation…');
    await chargerDetecteur($('mode').value);
    remettreAZero(); etat.actif = true; etat.t0 = performance.now(); $('btn-go').textContent = 'Arrêter';
    const src = await ouvrirSource(); dire('');
    const tour = async () => {
      if (!etat.actif) return;
      if (src === video && video.ended) { arreter(); dire('Fin de la vidéo : ' + etat.nbTotal + ' pièces comptées.'); return; }
      const W = src.videoWidth || src.naturalWidth || src.width, H = src.videoHeight || src.naturalHeight || src.height;
      if (W && H) { etat.trame++; suivre(await detecter(src, W, H)); compter((performance.now() - etat.t0) / 1000); dessiner(src, W, H); }
      etat.boucle = requestAnimationFrame(tour);
    };
    tour();
  } catch (e) { arreter(); dire('Impossible de lancer l’analyse : ' + (e && e.message ? e.message : e)); }
}

$('btn-go').addEventListener('click', lancer);
$('source').addEventListener('change', (e) => {
  arreter(); etat.source = e.target.value;
  $('fichier-ligne').hidden = etat.source !== 'fichier'; $('url-ligne').hidden = etat.source !== 'flux'; $('credit-ligne').hidden = etat.source !== 'reel';
  dire(etat.source === 'reel' ? 'Vidéo d’une vraie ligne d’embouteillage, lue depuis son hébergeur.' : etat.source === 'camera' ? 'La caméra reste dans ton navigateur : aucune image n’est envoyée.' : etat.source === 'flux' ? 'Le flux doit autoriser sa lecture depuis un site web.' : '');
});
$('fichier').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) { if (etat.urlFichier) URL.revokeObjectURL(etat.urlFichier); etat.urlFichier = URL.createObjectURL(f); dire('Fichier prêt : ' + f.name); } });
$('sens').addEventListener('change', (e) => { etat.sens = e.target.value; etat.axe = e.target.value === 'haut' || e.target.value === 'bas' || e.target.value === 'les-deux-y' ? 'y' : 'x'; });
$('btn-csv').addEventListener('click', () => {
  const lignes = ['n;temps_s;verdict;ratio_h_sur_l;hauteur_px;motif', ...etat.evenements.map((e) => [e.n, e.t.toFixed(2), e.ok ? 'conforme' : 'non conforme', e.ratio.toFixed(2), Math.round(e.h), e.motif].join(';'))];
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lignes.join('\n')], { type: 'text/csv' })); a.download = 'comptage-ligne.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

/* ligne de comptage : glisser sur l'image */
let glisse = false;
const placer = (e) => { const r = vue.getBoundingClientRect(); etat.ligne = Math.min(0.95, Math.max(0.05, etat.axe === 'x' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height)); };
vue.addEventListener('pointerdown', (e) => { glisse = true; vue.setPointerCapture(e.pointerId); placer(e); });
vue.addEventListener('pointermove', (e) => { if (glisse) placer(e); });
vue.addEventListener('pointerup', () => { glisse = false; });

attente('En attente d’une source');
