/* ATLAS · NAVIGATION ET PÊCHE DANS LE LAGON. On prend la barre du bateau de pêche (ZQSD ou flèches, Espace pour s'arrêter, Échap pour quitter) ; près d'un
 * banc : « F · Pêcher », lancer, touche, puis « Maintenir pour ramener » avec les jauges Prise / Tension (la ligne casse à 100 %). Fiche de prise,
 * carnet de bord (7 espèces, stocké dans le navigateur). Même mécanique que la version « récif » de l'atlas en papier, transposée dans le lagon de
 * l'île flottante : la profondeur vient de la carte (carte.hauteur), le bateau s'échoue sur les hauts-fonds et ne quitte pas l'eau du lagon.
 *
 *   const P = creerPeche(J)     J : { M, ui, son: { tone, splash }, camera: { but(zoom, pitch), suivre(pos) }, indice, oeuf }
 *   P.entrer() P.sortir() P.tick(dt, t) P.surLeLagon (bool)  P.etat (sail)                                                                     */
import * as THREE from './three.module.js';

const ESPECES = [
  { id: 'sardine', nom: 'Sardine', rar: 0, cm: [12, 20], c: ['#9fb8c8', '#eef4f6', '#5f7f99'], d: 0.8 }, { id: 'clown', nom: 'Poisson-clown', rar: 0, cm: [8, 11], c: ['#ff8a3d', '#fefefe', '#1e1e1e'], d: 0.9, rayures: true },
  { id: 'papillon', nom: 'Poisson-papillon', rar: 1, cm: [12, 18], c: ['#ffd23f', '#fefefe', '#1e1e1e'], d: 1 }, { id: 'chirurgien', nom: 'Chirurgien bleu', rar: 1, cm: [20, 30], c: ['#2f6fdb', '#1e3f8f', '#ffd23f'], d: 1.1 },
  { id: 'perroquet', nom: 'Poisson-perroquet', rar: 2, cm: [30, 60], c: ['#2ec4b6', '#ff9ecf', '#ff6f61'], d: 1.3 }, { id: 'merou', nom: 'Mérou', rar: 2, cm: [40, 90], c: ['#8c6b4f', '#c9a27e', '#5a4432'], d: 1.5 },
  { id: 'lune', nom: 'Poisson-lune', rar: 3, cm: [120, 180], c: ['#b8c4cc', '#e6ecef', '#7d8b94'], d: 1.7 }];
const RARETE = ['Commun', 'Peu commun', 'Rare', 'Légendaire'], POIDS = [46, 24, 9, 2], FAVORIS = { usp: 'papillon', sncf: 'merou', reseau: 'chirurgien', studio: 'perroquet', bi: 'clown', lean: 'sardine' };
const NOMS_BANCS = { avignon: 'Rade du Rhône', usp: 'Anse de la fac', sncf: 'Récif de la gare', reseau: 'Passe du signal', studio: 'Chenal de l’atelier', bi: 'Lagon de la tour', lean: 'Banc du dojo' };
const lireCarnet = () => { try { return JSON.parse(localStorage.getItem('atlas-carnet') || '{}'); } catch (_) { return {}; } }, ecrireCarnet = (l) => { try { localStorage.setItem('atlas-carnet', JSON.stringify(l)); } catch (_) {} };
const melange = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
function poissonSVG(sp, connu = true) {
  const [b, be, ac] = connu ? sp.c : ['#d8d3c8', '#e6e2d9', '#c4beb2'], L = (h) => melange(h, '#ffffff', 0.2), D = (h) => melange(h, '#000000', 0.18), poly = (pt, f) => `<polygon points="${pt}" fill="${f}" stroke="#1e1e1e" stroke-opacity=".2" stroke-width=".8" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 200 120" aria-hidden="true"><ellipse cx="100" cy="110" rx="60" ry="5" fill="#1e1e1e" opacity=".08"/>${poly('150,60 186,26 174,60', ac)}${poly('150,60 174,60 186,96', D(ac))}${poly('78,27 122,12 116,38', ac)}${poly('28,60 95,22 95,58', L(b))}${poly('95,22 142,48 95,58', b)}${poly('142,48 152,60 95,58', D(b))}${poly('28,60 95,58 95,96', be)}${poly('95,58 152,60 140,74', D(be))}${poly('95,58 140,74 95,96', melange(be, b, 0.35))}${sp.rayures && connu ? poly('70,33 82,29 84,87 72,83', '#fefefe') + poly('118,35 128,41 128,77 118,84', '#fefefe') : ''}${poly('92,66 112,74 96,86', ac)}<circle cx="50" cy="52" r="5" fill="#1e1e1e"/><circle cx="51.5" cy="50.5" r="1.6" fill="#fefefe"/></svg>`;
}

export function creerPeche(J) {
  const { M, ui } = J, { carte } = M, bateau = M.objets.bateau, canne0 = bateau.userData.canne;
  const ondes = (x, z, t) => Math.sin(x * 2.1 + t * 1.3) * 0.006 + Math.sin(z * 2.6 - t * 1.1) * 0.005;
  const sail = { on: false, vitesse: 0, cap: 0, roulis: 0, touches: new Set(), frein: false };
  const peche = { phase: null, t: 0, spot: null, tient: false, prise: 0, tension: 0, sp: null, cm: 0, de: new THREE.Vector3(), vers: new THREE.Vector3(), attente: 0, mord: 0, lutte: 0, tic: 0, ui: {} };
  const P = { sail, peche, ESPECES, poissonSVG };

  /* ------------------------------------------------------------ bancs de poissons : sept zones d'eau profonde réparties autour de l'îlot */
  const spots = [];
  { const c = carte.meta.ilot.c, ids = Object.keys(NOMS_BANCS);
    ids.forEach((id, i) => {
      let meilleur = null, md = 0; const a0 = (i + 0.5) / ids.length * Math.PI * 2 + 0.35;
      for (let da = -0.25; da <= 0.25; da += 0.05) for (let r = 1.9; r <= 4.6; r += 0.1) { const x = c[0] + Math.cos(a0 + da) * r, z = c[1] + Math.sin(a0 + da) * r * 0.85; if (!carte.eau(x, z)) continue;
        const prof = -carte.hauteur(x, z); const pont = Math.hypot(x - M.amarrage.voilier.p.x, z - M.amarrage.voilier.p.z); if (prof > md && pont > 1.2) { md = prof; meilleur = { x, z }; } }
      if (meilleur && md > 0.55) spots.push({ id, nom: NOMS_BANCS[id], x: meilleur.x, z: meilleur.z });
    }); }
  P.spots = spots;
  const ondeBanc = spots.map(() => [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.28, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 6; M.scene.add(m); return m; }));
  const banc = (() => {
    const g = new THREE.BufferGeometry(), n = [0.09, 0, 0], l = [0, 0.014, 0.032], t = [-0.06, 0, 0], r = [0, 0.014, -0.032], fl = [-0.1, 0.004, 0.034], fr = [-0.1, 0.004, -0.034];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...n, ...l, ...t, ...n, ...t, ...r, ...t, ...fl, ...fr], 3)); g.computeVertexNormals();
    const COL = ['#ffd166', '#4cc9f0', '#ff8fa3', '#b8c4cc', '#ff8a3d', '#7ad3c4'], N = Math.max(24, spots.length * 14), mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), N), liste = [], c = new THREE.Color();
    for (let i = 0; i < N; i++) { const s = spots[i % Math.max(1, spots.length)] || { x: 0, z: 4 }, r2 = 0.3 + Math.random() * 0.55; liste.push({ cx: s.x, cz: s.z, r: r2, w: (0.5 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6.3, y: -0.35 - Math.random() * 0.2, flee: 0, s: 0.8 + Math.random() * 0.6 }); mesh.setColorAt(i, c.set(COL[i % COL.length])); }
    mesh.frustumCulled = false; M.scene.add(mesh); return { mesh, liste };
  })();

  /* ------------------------------------------------------------ canne, bouchon, ligne, prise */
  const canne = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.7, 6).translate(0, 0.35, 0), new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.8 }));
  canne.rotation.set(0.5, 0, 0.62); canne.visible = false; bateau.add(canne);
  const ancreCanne = bateau.userData.ancres?.canne; if (ancreCanne) canne.position.copy(ancreCanne.position).add(new THREE.Vector3(0, 0, 0.02)); else canne.position.set(-0.45, 0.22, 0.12);
  const pointe = new THREE.Object3D(); pointe.position.set(0, 0.7, 0); canne.add(pointe);
  const bouchon = new THREE.Group(); { const h = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 8), new THREE.MeshStandardMaterial({ color: '#e63946' })), b = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.04, 8), new THREE.MeshStandardMaterial({ color: '#fefefe' })); h.position.y = 0.03; b.rotation.x = Math.PI; b.position.y = -0.02; bouchon.add(h, b); }
  bouchon.visible = false; M.scene.add(bouchon);
  const geoLigne = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, () => new THREE.Vector3())), ligne = new THREE.Line(geoLigne, new THREE.LineBasicMaterial({ color: '#fefefe', transparent: true, opacity: 0.9 })); ligne.visible = false; ligne.frustumCulled = false; M.scene.add(ligne);
  const accroche = M.objets.poissons[0].clone(true); accroche.visible = false; M.scene.add(accroche);
  const peindre = (sp) => accroche.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(sp.c[0]); } });

  const panneau = ui.peche;
  const carte_ = (interieur, vue = '') => {
    panneau.dataset.view = vue; panneau.classList.remove('is-strained');
    panneau.innerHTML = `<span class="world-kicker">${vue === 'log' || !peche.spot ? 'Carnet de bord' : peche.spot.nom}</span><button class="world-close" aria-label="Fermer">×</button>${interieur}`; panneau.hidden = false;
    panneau.querySelector('.world-close').onclick = () => { peche.phase ? arreterPeche() : (panneau.hidden = true); };
    panneau.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => ({ encore: () => lancer(peche.spot), barre: () => arreterPeche(), carnet: () => montrerCarnet(), retour: () => (peche.phase === 'log' ? montrerResultat() : (panneau.hidden = true)) })[b.dataset.act]());
  };
  const bancProche = () => { let best = null, bd = 1.5; for (const s of spots) { const d = Math.hypot(s.x - bateau.position.x, s.z - bateau.position.z); if (d < bd) { bd = d; best = s; } } return best; };
  const tirer = (spot) => { const w = ESPECES.map((s) => POIDS[s.rar] * (FAVORIS[spot.id] === s.id ? 3 : 1)), tot = w.reduce((a, b) => a + b); let r = Math.random() * tot; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return ESPECES[i]; } return ESPECES[0]; };

  function lancer(spot) {
    if (!sail.on) return; arreterPeche(true);
    Object.assign(peche, { phase: 'lance', t: 0, spot, tient: false, prise: 0, tension: 0, sp: null }); sail.vitesse = 0; canne.visible = bouchon.visible = ligne.visible = true; accroche.visible = false; ui.bulle.hidden = true;
    bateau.updateMatrixWorld(true); pointe.getWorldPosition(peche.de);
    const dx = spot.x - bateau.position.x, dz = spot.z - bateau.position.z, d = Math.hypot(dx, dz), cote = new THREE.Vector3(0, 0, 1).applyQuaternion(bateau.quaternion);
    const dir = d > 0.35 ? new THREE.Vector3(dx / d, 0, dz / d) : cote.setY(0).normalize(), portee = THREE.MathUtils.clamp(d, 0.9, 1.4);
    peche.vers.set(bateau.position.x + dir.x * portee, 0, bateau.position.z + dir.z * portee); J.son.tone([300, 500], 0.12);
    carte_('<h2>On lance…</h2><p class="fish-help">La ligne file vers le banc.</p>');
  }
  function arreterPeche(garder) { peche.phase = null; peche.tient = false; canne.visible = bouchon.visible = ligne.visible = accroche.visible = false; if (!garder) panneau.hidden = true; }
  function montrerRamener() {
    carte_(`<h2>Un peu de mou, un peu de tension</h2><div class="fish-meter"><div class="fish-row"><span>Prise</span><b data-p>0 %</b></div><div class="fish-bar"><i data-pb></i></div></div>
      <div class="fish-meter"><div class="fish-row"><span>Tension de la ligne</span><b data-t>0 %</b></div><div class="fish-bar fish-tension"><em data-tm></em></div><div class="fish-zones"><span>Sûr</span><span>Attention</span><span>Rupture</span></div></div>
      <p class="fish-help">Maintenir pour ramener · relâcher pour donner du mou</p><button class="fish-hold" data-hold>Maintenir pour ramener</button>`);
    const q = (s) => panneau.querySelector(s); peche.ui = { p: q('[data-p]'), pb: q('[data-pb]'), t: q('[data-t]'), tm: q('[data-tm]') }; const h = q('[data-hold]');
    h.addEventListener('pointerdown', (e) => { e.preventDefault(); peche.tient = true; h.setPointerCapture(e.pointerId); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((k) => h.addEventListener(k, () => peche.tient = false));
  }
  function montrerResultat() {
    const f = peche, log = lireCarnet();
    if (f.phase === 'perdu') { carte_(`<h2>${f.pourquoi}</h2><p class="fish-help">Le poisson est reparti dans le lagon.</p><div class="fish-actions"><button data-act="encore">Pêcher encore</button><button data-act="barre">Reprendre la barre</button></div>`); return; }
    f.phase = 'pris'; const e = log[f.sp.id];
    carte_(`<h2>Belle journée sur le lagon</h2><div class="fish-art">${poissonSVG(f.sp)}</div><p class="fish-rarity r${f.sp.rar}">${RARETE[f.sp.rar]}</p><p class="fish-name">${f.sp.nom}</p><p class="fish-size">${f.cm} cm</p>
      <p class="fish-note">${f.nouveau ? 'Nouvelle espèce au carnet !' : f.record ? 'Record personnel !' : `Déjà ${e.n} au carnet · record ${e.best} cm`}</p><p class="fish-help">Relâché dans le lagon.</p>
      <div class="fish-actions"><button data-act="encore">Pêcher encore</button><button data-act="barre">Reprendre la barre</button><button data-act="carnet">Carnet de bord ↗</button></div>`);
  }
  function montrerCarnet() {
    const log = lireCarnet(), n = ESPECES.filter((s) => log[s.id]).length, enPeche = peche.phase === 'pris'; if (enPeche) peche.phase = 'log';
    carte_(`<h2>${n} / ${ESPECES.length} espèces</h2><ul class="fish-log">${ESPECES.map((s) => { const e = log[s.id]; return `<li class="${e ? '' : 'is-unknown'}">${poissonSVG(s, !!e)}<b>${e ? s.nom : '???'}</b><span>${RARETE[s.rar]}${e ? ` · ×${e.n} · ${e.best} cm` : ''}</span></li>`; }).join('')}</ul>
      <div class="fish-actions">${enPeche ? '<button data-act="retour">← Retour</button><button data-act="encore">Pêcher encore</button>' : '<button data-act="retour">Fermer</button>'}</div>`, 'log');
  }
  ui.carnet.onclick = (e) => { e.currentTarget.blur(); if (/lance|attend|touche|ramene|saut/.test(peche.phase || '')) return; if (!panneau.hidden && panneau.dataset.view === 'log') { peche.phase === 'log' ? montrerResultat() : (panneau.hidden = true); } else montrerCarnet(); };

  const _p = new THREE.Vector3(), _c = new THREE.Vector3(), _b = new THREE.Vector3();
  function tickPeche(dt, t) {
    const f = peche; if (!f.phase) return; f.t += dt; bateau.updateMatrixWorld(true); pointe.getWorldPosition(_p);
    const sy = ondes(f.vers.x, f.vers.z, t) + 0.01; let creux = 0.3;
    if (f.phase === 'lance') { const k = Math.min(1, f.t / 0.65); _b.lerpVectors(_p, _c.set(f.vers.x, sy, f.vers.z), k); _b.y += Math.sin(k * Math.PI) * 0.5; creux = 0.05;
      if (k >= 1) { J.son.splash(0.1); f.phase = 'attend'; f.t = 0; f.attente = 2 + Math.random() * 3.5; f.mord = 0; carte_('<h2>Ça mordille. Attendez la touche.</h2><button class="fish-hold" disabled>Attendre la touche…</button>'); } }
    else if (f.phase === 'attend') { _b.set(f.vers.x, sy, f.vers.z); f.mord -= dt; if (f.mord < -0.2 && Math.random() < dt * 1.2) { f.mord = 0.25; J.son.tone([620], 0.04); } if (f.mord > 0) _b.y -= Math.sin(f.mord / 0.25 * Math.PI) * 0.03;
      if (f.t > f.attente) { f.phase = 'touche'; f.t = 0; f.sp = tirer(f.spot); f.cm = Math.round(f.sp.cm[0] + Math.pow(Math.random(), 1.6) * (f.sp.cm[1] - f.sp.cm[0])); peindre(f.sp); accroche.scale.setScalar(0.5 + f.cm / 110); J.son.splash(0.2); J.son.tone([880, 660], 0.1); carte_('<h2>Ça mord !</h2><button class="fish-hold" disabled>Ferrer…</button>'); } }
    else if (f.phase === 'touche') { _b.set(f.vers.x, sy - 0.06, f.vers.z); if (f.t > 0.55) { f.phase = 'ramene'; f.t = 0; f.prise = 10; f.tension = 25; montrerRamener(); } }
    else if (f.phase === 'ramene') {
      const d = f.sp.d; f.lutte = Math.max(0, Math.sin(t * 2.3 + f.cm) * 0.6 + Math.sin(t * 5.1) * 0.4) + (Math.random() < dt * 0.5 ? 1.5 : 0);
      if (f.tient) { f.prise += dt * (17 / d) * (1 - f.tension / 220); f.tension += dt * (26 + 30 * d * f.lutte); f.tic -= dt; if (f.tic < 0) { f.tic = 0.08; J.son.tone([1500 + Math.random() * 200], 0.025); } } else { f.tension -= dt * 50; f.prise -= dt * 3.5 * d; }
      f.tension = THREE.MathUtils.clamp(f.tension, 0, 100); f.prise = THREE.MathUtils.clamp(f.prise, 0, 100);
      const k = f.prise / 100; _b.lerpVectors(_c.set(f.vers.x, 0, f.vers.z), bateau.position, k * 0.8); _b.x += Math.sin(t * 3.1) * 0.1 * f.lutte; _b.z += Math.cos(t * 2.7) * 0.1 * f.lutte; _b.y = ondes(_b.x, _b.z, t) - 0.02 * f.lutte; creux = 0.3 * (1 - f.tension / 100);
      accroche.visible = true; accroche.position.set(_b.x - 0.08, -0.3, _b.z - 0.04); accroche.rotation.set(0, t * 2.4 + Math.sin(t * 9) * 0.4, Math.sin(t * 12) * 0.2);
      const u = f.ui; if (u.p) { u.p.textContent = Math.round(f.prise) + ' %'; u.pb.style.width = f.prise + '%'; u.t.textContent = Math.round(f.tension) + ' %'; u.tm.style.left = f.tension + '%'; panneau.classList.toggle('is-strained', f.tension > 80); }
      if (f.tension >= 100) { f.phase = 'perdu'; f.pourquoi = 'La ligne a cassé'; J.son.tone([180, 90], 0.25); canne.visible = bouchon.visible = ligne.visible = accroche.visible = false; montrerResultat(); return; }
      if (f.prise >= 100) { f.phase = 'saut'; f.t = 0; J.son.splash(0.25); const log = lireCarnet(), e = log[f.sp.id]; f.nouveau = !e; f.record = !!e && f.cm > e.best; log[f.sp.id] = { n: (e?.n || 0) + 1, best: Math.max(e?.best || 0, f.cm) }; ecrireCarnet(log); f.deSaut = _b.clone(); } }
    else if (f.phase === 'saut') { const k = Math.min(1, f.t / 0.9); accroche.visible = true; accroche.position.lerpVectors(f.deSaut, bateau.position, k); accroche.position.y = -0.1 + Math.sin(k * Math.PI) * 0.9; accroche.rotation.z = (0.5 - k) * 3; _b.copy(accroche.position); creux = 0;
      if (k >= 1) { accroche.visible = false; bouchon.visible = ligne.visible = false; J.son.tone([523, 659, 784], 0.18); montrerResultat(); if (!J.oeufs.get('pêche').trouve) J.oeuf('pêche', 'Première prise : le carnet de bord s’ouvre dans le coin.'); } }
    if (!bouchon.visible) return; bouchon.position.copy(_b);
    const pa = geoLigne.attributes.position; _c.lerpVectors(_p, _b, 0.5); _c.y -= creux;
    for (let i = 0; i < 32; i++) { const s = i / 31, a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s; pa.setXYZ(i, _p.x * a + _c.x * b + _b.x * c, _p.y * a + _c.y * b + _b.y * c, _p.z * a + _c.z * b + _b.z * c); } pa.needsUpdate = true;
  }

  /* ------------------------------------------------------------ navigation */
  function entrer() {
    if (sail.on) return; J.sortirMarche(); sail.on = true; M.barreSail = true; bateau.userData.go = 0;
    sail.cap = -Math.atan2(bateau.position.z - carte.meta.lagon.c[1], bateau.position.x - carte.meta.lagon.c[0]) + Math.PI; sail.vitesse = 0;
    J.camera.but(14, 1.12); J.fermerFiche(); document.body.classList.add('is-sailing'); ui.hudBarre.hidden = false; ui.pad.hidden = false; ui.btnBarre.textContent = 'Quitter la barre'; ui.btnBarre.setAttribute('aria-pressed', 'true');
    J.indice('Vous tenez la barre : approchez un banc de poissons pour pêcher.'); J.canvas.focus({ preventScroll: true });
  }
  function sortir() {
    if (!sail.on) return; arreterPeche(); sail.on = false; sail.touches.clear(); M.barreSail = false; J.camera.but(40, 0.82);
    document.body.classList.remove('is-sailing'); ui.hudBarre.hidden = true; ui.pad.hidden = true; ui.bulle.hidden = true; ui.btnBarre.textContent = 'Naviguer'; ui.btnBarre.setAttribute('aria-pressed', 'false');
    bateau.userData.retour = 0.001;
  }
  ui.btnBarre.onclick = () => { sail.on ? sortir() : entrer(); ui.btnBarre.blur(); J.canvas.focus({ preventScroll: true }); };
  ui.pad.querySelectorAll('button').forEach((b) => { const k = b.dataset.k, on = (e) => { e.preventDefault(); if (J.marche.on) { k === 'fish' ? J.interagirMarche() : J.marche.touches.add(k); return; } k === 'fish' ? (bancProche() && lancer(bancProche())) : sail.touches.add(k); }, off = () => { sail.touches.delete(k); J.marche.touches.delete(k); }; b.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach((e) => b.addEventListener(e, off)); });
  ui.bulle.onclick = () => { const s = bancProche(); if (s) lancer(s); };
  function tickBarre(dt, t) {
    const u = sail, poussee = (u.touches.has('up') ? 1 : 0) - (u.touches.has('down') ? 0.55 : 0), tourne = (u.touches.has('left') ? 1 : 0) - (u.touches.has('right') ? 1 : 0);
    if (peche.phase) u.vitesse *= Math.pow(0.15, dt); else { u.vitesse += (poussee * 1.6 - u.vitesse * 1.05) * dt; if (u.frein) u.vitesse *= Math.pow(0.04, dt); }
    u.cap += tourne * dt * 1.5 * (0.3 + 0.7 * Math.min(1, Math.abs(u.vitesse) / 0.9)) * (u.vitesse < -0.05 ? -1 : 1);
    const fx = Math.cos(u.cap), fz = -Math.sin(u.cap), sens = u.vitesse < 0 ? -1 : 1, nx = bateau.position.x + fx * u.vitesse * dt, nz = bateau.position.z + fz * u.vitesse * dt;
    const libre = (x, z) => carte.eau(x, z) && carte.hauteur(x, z) < -0.3 && Math.hypot(x - M.objets.ponton.position.x, z - M.objets.ponton.position.z) > 0.0;
    if (!libre(nx + fx * 0.5 * sens, nz + fz * 0.5 * sens) || !libre(nx, nz)) { if (Math.abs(u.vitesse) > 0.5) J.son.tone([140, 95], 0.12); u.vitesse *= -0.3; } else { bateau.position.x = nx; bateau.position.z = nz; }
    u.roulis += ((-tourne * u.vitesse * 0.1) - u.roulis) * Math.min(1, dt * 4);
    bateau.position.y = ondes(bateau.position.x, bateau.position.z, t) + 0.01; bateau.rotation.set(u.roulis + Math.sin(t * 1.3) * 0.03, u.cap, Math.sin(t * 1.1) * 0.035 + u.vitesse * 0.03);
  }
  const wakes = []; { const geo = new THREE.CircleGeometry(0.09, 10).rotateX(-Math.PI / 2); for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.renderOrder = 6; M.scene.add(m); wakes.push({ m, vie: 0, vx: 0, vz: 0 }); } }
  let wakeNext = 0; const traine = (obj, dt) => { const u = obj.userData, p = obj.position; if (!u.dernier) { u.dernier = p.clone(); return; } const vx = (p.x - u.dernier.x) / dt, vz = (p.z - u.dernier.z) / dt, sp = Math.hypot(vx, vz); u.dernier.copy(p); u.wakeT = (u.wakeT || 0) - dt; if (sp < 0.15 || u.wakeT > 0) return; u.wakeT = 0.07; const fx = vx / sp, fz = vz / sp;
    for (const s of [-1, 1]) { const w = wakes[wakeNext++ % wakes.length]; w.m.visible = true; w.vie = 1; w.m.position.set(p.x - fx * 0.5 + fz * s * 0.09, 0.012, p.z - fz * 0.5 - fx * s * 0.09); w.vx = fz * s * 0.2; w.vz = -fx * s * 0.2; } };

  P.tick = (dt, t) => {
    // poissons des bancs : tournent autour de leur zone, fuient devant la coque
    const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), m4 = new THREE.Matrix4(), pos = new THREE.Vector3();
    banc.liste.forEach((f, i) => { const bx = bateau.position.x - f.cx, bz = bateau.position.z - f.cz; if (Math.hypot(bx, bz) < f.r + 0.6 && (sail.on)) f.flee = Math.min(1, f.flee + dt * 3); else f.flee = Math.max(0, f.flee - dt * 0.4);
      const a = f.ph + t * f.w * (1 + f.flee * 1.5), r = f.r * (1 + 0.15 * Math.sin(t * 0.7 + f.ph) + f.flee * 0.9), x = f.cx + Math.cos(a) * r, z = f.cz + Math.sin(a) * r, tx = -Math.sin(a) * Math.sign(f.w), tz = Math.cos(a) * Math.sign(f.w);
      _e.set(0, Math.atan2(-tz, tx) + Math.sin(t * 8 + i) * 0.25, 0); m4.compose(pos.set(x, f.y + Math.sin(t * 2 + i) * 0.015, z), _q.setFromEuler(_e), _s.setScalar(f.s)); banc.mesh.setMatrixAt(i, m4); });
    banc.mesh.instanceMatrix.needsUpdate = true;
    spots.forEach((s, i) => ondeBanc[i].forEach((m, k) => { const ph = ((t * 0.35 + k * 0.5 + i * 0.13) % 1); m.position.set(s.x, 0.012, s.z); m.scale.setScalar(0.7 + ph * 1.8); m.material.opacity = 0.16 * Math.sin(ph * Math.PI) * (1 - 0.6 * M.ciel.uniformes.uNuit.value); }));
    traine(bateau, dt); traine(M.objets.voilier, dt);
    wakes.forEach((w) => { if (w.vie <= 0) return; w.vie -= dt / 1.8; if (w.vie <= 0) { w.m.visible = false; return; } w.m.position.x += w.vx * dt; w.m.position.z += w.vz * dt; w.m.scale.setScalar(1 + (1 - w.vie) * 2.4); w.m.material.opacity = 0.5 * w.vie * w.vie; });
    if (sail.on) tickBarre(dt, t);
    else if (bateau.userData.retour) { // le bateau regagne son amarre après qu'on a quitté la barre
      const r = bateau.userData.retour += dt, a = M.amarrage.bateau; bateau.position.lerp(_s.set(a.p.x, 0, a.p.z), Math.min(1, dt * 0.8)); bateau.rotation.y += (a.yaw - bateau.rotation.y) * Math.min(1, dt * 1.6); bateau.rotation.z *= 0.9; bateau.rotation.x *= 0.9;
      if (r > 6 || bateau.position.distanceTo(_s) < 0.02) { bateau.userData.retour = 0; bateau.position.set(a.p.x, 0, a.p.z); bateau.rotation.set(0, a.yaw, 0); } }
    tickPeche(dt, t);
    const s = sail.on && !peche.phase ? bancProche() : null; ui.bulle.hidden = !s;
    if (s) { if (ui.bulle.dataset.spot !== s.nom) { ui.bulle.dataset.spot = s.nom; ui.bulle.innerHTML = `<small>${s.nom}</small><span><kbd>F</kbd> · Pêcher</span>`; } _p.copy(bateau.position).setY(bateau.position.y + 0.9).project(J.camera.obj); ui.bulle.style.transform = `translate(${(_p.x * 0.5 + 0.5) * J.hote.clientWidth}px,${(-_p.y * 0.5 + 0.5) * J.hote.clientHeight}px) translate(-50%,-100%)`; }
  };
  P.touche = (e, bas) => {
    if (!sail.on || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return false;
    const K = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' }[e.code];
    if (peche.phase) {
      if (e.code === 'Space' || e.code === 'KeyF') { e.preventDefault(); if (peche.phase === 'ramene') peche.tient = bas; else if (bas && !e.repeat && /pris|perdu|log/.test(peche.phase)) lancer(peche.spot); return true; }
      if (e.code === 'Escape' && bas) { arreterPeche(); return true; }
      if (K) { e.preventDefault(); if (bas && /pris|perdu|log/.test(peche.phase)) { arreterPeche(); sail.touches.add(K); } else if (!bas) sail.touches.delete(K); return true; } return false;
    }
    if (K) { e.preventDefault(); bas ? sail.touches.add(K) : sail.touches.delete(K); return true; }
    if (e.code === 'Space') { e.preventDefault(); sail.frein = bas; return true; }
    if (e.code === 'KeyF') { if (bas && !e.repeat) { const s = bancProche(); if (s) lancer(s); } return true; }
    if (e.code === 'Escape' && bas) { sortir(); return true; } return false;
  };
  P.entrer = entrer; P.sortir = sortir; P.arreter = arreterPeche;
  return P;
}
