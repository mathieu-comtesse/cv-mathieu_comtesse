/* ATLAS · LE JEU : tout ce qui répond à la main sur l'île flottante. Caméra en orbite (glisser, molette, pincer, flèches, +/-), étiquettes de verre posées sur
 * chaque bâtiment, fiches, 21 œufs de Pâques cachés (cloches, chat, PDF, signal, ampoule, ceinture, billot, Rubik, sable, haie, phare, train, voiture,
 * voilier, poisson, bateau de pêche, canard, mouettes, première prise, photo), jour / nuit, marche à la première personne, navigation et pêche (atlas-peche.js),
 * feu d'artifice quand tout est trouvé.
 *
 *   const J = creerJeu(M, R, { canvas, hote, ... })      J.tick(dt, t)  J.redimensionner()  J.vue(spin, pitch, zoom)                                      */
import * as THREE from './three.module.js';
import { creerPeche } from './atlas-peche.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const bornes = (v, a, b) => Math.min(b, Math.max(a, v));

export function creerJeu(M, R, dom) {
  const { canvas, hote } = dom, camera = M.camera, carte = M.carte;
  const $ = (id) => document.getElementById(id);
  const ui = { fiche: $('world-card'), oeufs: $('world-eggs'), indice: $('world-hint'), peche: $('world-fish'), bulle: $('world-bubble'), hudBarre: $('world-sailhud'), hudMarche: $('world-walkhud'), pad: $('world-pad'), btnBarre: $('world-sail'), btnMarche: $('world-walk'), carnet: $('world-log'), etiquettes: $('world-labels') };
  const J = { M, R, canvas, hote, ui, oeufs: new Map(), camera: { obj: camera } };

  /* ------------------------------------------------------------------------------------------------ son : petites notes et ambiance synthétisées */
  let audio = null, muet = false, ambiance = null;
  const ctx = () => { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); return audio; };
  const tone = (freqs, dur) => { if (muet) return; const a = ctx(); freqs.forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = f; const t = a.currentTime + i * dur * 0.8; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05); }); };
  const splash = (v = 0.12) => { if (muet) return; const a = ctx(), n = a.sampleRate * 0.25 | 0, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = 900; g.gain.value = v; s.connect(f).connect(g).connect(a.destination); s.start(); };
  const mouette = () => { if (!ambiance || muet) return; const a = audio, t = a.currentTime; for (let k = 0; k < 1 + (Math.random() * 3 | 0); k++) { const o = a.createOscillator(), v = a.createOscillator(), vg = a.createGain(), g = a.createGain(), s = t + k * 0.28; o.type = 'sawtooth'; o.frequency.setValueAtTime(1500 + Math.random() * 400, s); o.frequency.exponentialRampToValueAtTime(1050, s + 0.22); v.frequency.value = 28; vg.gain.value = 60; v.connect(vg).connect(o.frequency); g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.045, s + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.26); const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 2; o.connect(f).connect(g).connect(a.destination); o.start(s); v.start(s); o.stop(s + 0.3); v.stop(s + 0.3); } setTimeout(mouette, 4000 + Math.random() * 9000); };
  const demarrerAmbiance = () => { if (ambiance || muet) return; const a = ctx(), buf = a.createBuffer(1, a.sampleRate * 4, a.sampleRate), d = buf.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = (b + (Math.random() * 2 - 1) * 0.05) / 1.02; d[i] = b; }
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(); src.buffer = buf; src.loop = true; f.type = 'lowpass'; f.frequency.value = 460; g.gain.value = 0.05; lfo.frequency.value = 0.13; lg.gain.value = 0.03; lfo.connect(lg).connect(g.gain); src.connect(f).connect(g).connect(a.destination); src.start(); lfo.start(); ambiance = { g }; mouette(); };
  canvas.addEventListener('pointerdown', demarrerAmbiance);
  $('world-sound').onclick = (e) => { muet = !muet; e.target.textContent = muet ? 'Son : non' : 'Son : oui'; e.target.setAttribute('aria-pressed', !muet); if (ambiance) ambiance.g.gain.setTargetAtTime(muet ? 0 : 0.05, audio.currentTime, 0.2); if (!muet && !ambiance) demarrerAmbiance(); if (!muet && ambiance) mouette(); };
  J.son = { tone, splash };

  /* ------------------------------------------------------------------------------------------------ indices, œufs, feu d'artifice */
  let trouves = 0; const indice = (txt, flash) => { ui.indice.textContent = txt; if (flash) { ui.indice.classList.add('is-flash'); setTimeout(() => ui.indice.classList.remove('is-flash'), 900); } };
  J.indice = indice;
  const oeuf = (id, texte) => { const e = J.oeufs.get(id); if (!e) return; if (!e.trouve) { e.trouve = true; trouves++; ui.oeufs.textContent = `Easter eggs : ${trouves} / ${J.oeufs.size}`; if (trouves === J.oeufs.size) feuArtifice(); } indice(texte, true); };
  J.oeuf = oeuf;
  const declarer = (obj, id, texte, action) => { obj.traverse((o) => { o.userData.oeuf = id; }); J.oeufs.set(id, { obj, texte, action, trouve: false }); };
  let feux = null;
  function feuArtifice() {
    tone([523, 659, 784, 1047], 0.3); const N = 520, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vit = [];
    for (let i = 0; i < N; i++) { const g = Math.floor(i / 130), cx = [-4, 3, 0, -1][g], cz = [-2, 3, 0, -5][g], cy = 8 + g * 1.4, d = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2 + Math.random() * 2.4); pos.set([cx, cy, cz], i * 3); vit.push(d); const c = new THREE.Color(['#ffc400', '#ff7a1a', '#2fe0ff', '#ff5fa2'][g]); col.set([c.r, c.g, c.b], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; M.scene.add(pts); feux = { pts, vit, age: 0 };
    indice('Tous les easter eggs sont trouvés : feu d’artifice !');
  }

  /* ------------------------------------------------------------------------------------------------ jour / nuit */
  let nuit = false, nuitK = 0;
  const reglerNuit = (on) => { nuit = on; document.body.classList.toggle('is-night', on); };
  J.reglerNuit = reglerNuit; J.estNuit = () => nuit;

  /* ------------------------------------------------------------------------------------------------ œufs : objets posés sur les ancres des bâtiments */
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
  const poseSurAncre = (idBat, nomAncre, obj) => { const a = M.bats[idBat].ancres[nomAncre]; a.add(obj); obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return obj; };
  const cloche = (s) => { const m = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.1], [0.03, 0.095], [0.05, 0.06], [0.06, 0.02], [0.085, -0.02], [0.085, -0.035], [0, -0.035]].map(([x, y]) => new THREE.Vector2(x * s, y * s)), 20), mat('#d9a441', { metalness: 0.7, roughness: 0.35 })); return m; };
  { const c1 = poseSurAncre('usp', 'cloche', cloche(1.0)); declarer(c1, 'cloche', 'La cloche de la fac sonne la fin du cours.', () => tone([880, 1175, 1480], 0.5));
    const c2 = poseSurAncre('avignon', 'cloche', cloche(1.0)); declarer(c2, 'cloche-avignon', 'La cloche de l’Hôtel-Dieu sonne : retour sur les bancs d’Avignon.', () => { tone([784, 659, 523], 0.45); c2.rotation.z = 0.5; setTimeout(() => (c2.rotation.z = 0), 350); }); }
  // chat sur le toit de la gare (noir, yeux jaunes ; se grattent la tête et la queue ondule)
  const chat = (() => {
    const g = new THREE.Group(), C = mat('#25232b', { roughness: 0.85 }), D = mat('#17161c'), yeux = mat('#ffd23f', { emissive: '#ffb000', emissiveIntensity: 0.5 });
    const hanche = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), C); hanche.scale.set(1.15, 0.85, 1); hanche.position.set(-0.04, 0.08, 0);
    const poitrine = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.2, 12), C); poitrine.position.set(0.06, 0.15, 0); poitrine.rotation.z = -0.35;
    const tete = new THREE.Group(); tete.position.set(0.12, 0.27, 0); const crane = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), C); crane.scale.set(1, 0.9, 1.05); tete.add(crane);
    const museau = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.06), mat('#3c3a46')); museau.position.set(0.06, -0.02, 0); tete.add(museau);
    for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.07, 6), C); o.position.set(-0.005, 0.075, s * 0.04); o.rotation.set(s * 0.25, 0, -0.15); tete.add(o); const e = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.022), yeux); e.position.set(0.068, 0.012, s * 0.03); tete.add(e);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.13, 8), C); p.position.set(0.11, 0.065, s * 0.035); g.add(p); }
    const queue = new THREE.Group(); queue.position.set(-0.13, 0.05, 0); let prec = queue; for (let i = 0; i < 6; i++) { const seg = new THREE.Group(); seg.position.set(i ? -0.045 : 0, i ? 0.03 : 0, 0); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018 - i * 0.002, 0.02 - i * 0.002, 0.05, 8), i === 5 ? D : C); m.rotation.z = 1.1; seg.add(m); prec.add(seg); prec = seg; queue.userData['s' + i] = seg; }
    g.add(hanche, poitrine, tete, queue); g.userData = { tete, queue, yeux }; g.scale.setScalar(1.25); return g;
  })();
  poseSurAncre('sncf', 'chat', chat); declarer(chat, 'chat', 'Un chat sur le toit de la gare : il miaule et saute.', () => { tone([660, 520], 0.25); chat.userData.saut = 1; });
  // horloge de la gare : une aiguille qui tourne
  const aiguille = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.12, 0.01), mat('#17161c')); aiguille.position.set(0, 0.05, 0.012); const pivotH = new THREE.Group(); pivotH.add(aiguille); poseSurAncre('sncf', 'horloge', pivotH);
  // signal : un voyant qui change d'aspect
  const signal = (() => { const feu = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), new THREE.MeshBasicMaterial({ color: '#39d98a' })), halo = new THREE.PointLight('#39d98a', 0.5, 1.6); feu.add(halo);
    const aspects = [{ c: '#39d98a', a: 'feu', d: 7 }, { c: '#ff9a2e', a: 'feu_orange', d: 3.5 }, { c: '#9b5cf0', a: 'feu_violet', d: 3.5 }]; const S = { aspect: 0, t: 0, feu, halo, aspects, regler(k) { this.aspect = (k % 3 + 3) % 3; this.t = 0; const a = aspects[this.aspect]; feu.material.color.set(a.c); halo.color.set(a.c); feu.position.copy(M.bats.reseau.ancres[a.a].position); } };
    M.bats.reseau.ancres.feu.parent.add(feu); S.regler(0); return S; })();
  declarer(signal.feu, 'signal', 'Le signal change d’aspect : vert, voie libre · orange, avertissement · violet, carré de manœuvre.', () => { signal.regler(signal.aspect + 1); tone([988], 0.08); });
  // PDF qui traîne devant le studio
  { const pdf = new THREE.Group(), feuille = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.012), mat('#fefefe', { roughness: 0.9 })), onglet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.014), mat('#e63946')); onglet.position.set(0.045, -0.1, 0.002); const lignes = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.014), mat('#b8bcc2')); lignes.position.set(0, 0.07, 0.002); const l2 = lignes.clone(); l2.position.y = 0.035; pdf.add(feuille, onglet, lignes, l2); pdf.position.y = 0.16; pdf.rotation.set(-0.15, 0.4, 0.05);
    poseSurAncre('studio', 'pdf', pdf); declarer(pdf, 'pdf', 'Un PDF qui traîne : l’extracteur l’a déjà lu.', () => { tone([440, 880], 0.15); pdf.rotation.y += Math.PI; }); }
  // ampoule au sommet de la tour : bascule le jour et la nuit
  const ampoule = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff2b0', emissive: '#ffcc55', emissiveIntensity: 0.7 })); poseSurAncre('bi', 'ampoule', ampoule);
  declarer(ampoule, 'ampoule', 'L’ampoule bascule le jour et la nuit.', () => reglerNuit(!nuit));
  // ceinture jaune à la porte du dojo
  const ceinture = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 10, 28), mat('#ffd23f', { roughness: 0.5 })); poseSurAncre('lean', 'ceinture', ceinture);
  declarer(ceinture, 'ceinture', 'Une Yellow Belt Lean Six Sigma accrochée à la porte.', () => { tone([523, 659, 784], 0.2); ceinture.userData.tourne = 1; });
  // le stade : billot, Rubik, flaque de sable, haie
  const billot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 18), mat('#e0c9a6')); billot.position.y = 0.07; poseSurAncre('perso', 'billot', billot);
  declarer(billot, 'billot', 'Le billot de Timber ! — un coup de hache.', () => { tone([120, 90], 0.12); billot.scale.y = 0.6; setTimeout(() => (billot.scale.y = 1), 300); });
  const rubik = new THREE.Group(); { const cl = ['#e63946', '#ff8a3d', '#f4d03f', '#ffffff', '#2a7de1', '#3dbb5a'], s = 0.04;
    for (let i = -1; i < 2; i++) for (let j = -1; j < 2; j++) for (let k = -1; k < 2; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(s * 0.95, s * 0.95, s * 0.95), cl.map((c, n) => mat(Math.abs(i) + Math.abs(j) + Math.abs(k) === 0 ? '#1a1a1a' : [i === 1 ? c : '#161616', i === -1 ? c : '#161616', j === 1 ? c : '#161616', j === -1 ? c : '#161616', k === 1 ? c : '#161616', k === -1 ? c : '#161616'][n]))); m.position.set(i * s, j * s, k * s); rubik.add(m); } }
  rubik.position.y = 0.08; poseSurAncre('perso', 'rubik', rubik); declarer(rubik, 'rubik', 'Le Rubik’s Cube du banc tourne d’un quart.', () => { rubik.rotation.y += Math.PI / 2; tone([700], 0.08); });
  const sable = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), mat('#ffd9a8', { roughness: 1 })); sable.rotation.x = -Math.PI / 2; sable.position.y = 0.005; poseSurAncre('perso', 'sable', sable);
  declarer(sable, 'sable', 'Une flaque de sable : le Sandboard en miniature.', () => { tone([300, 240], 0.2); sable.material.color.set('#ff9a3d'); });
  const haie = new THREE.Group(); for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.24), mat('#5aa84a')); h.position.set(i * 0.08 - 0.08, 0.07, 0); haie.add(h); } poseSurAncre('perso', 'haie', haie);
  declarer(haie, 'haie', 'La haie du Labyrinthe, taillée au carré.', () => { tone([500, 600, 700, 800], 0.1); haie.scale.y = 1.4; setTimeout(() => (haie.scale.y = 1), 400); });
  // phare : lampe et faisceau ; bascule la nuit
  const pharePivot = new THREE.Group(), faisceau = new THREE.Mesh(new THREE.ConeGeometry(0.5, 5, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  faisceau.rotation.z = Math.PI / 2; faisceau.position.x = 2.5; pharePivot.add(faisceau); M.objets.phare.userData.ancres.lampe.add(pharePivot);
  declarer(M.objets.phare, 'phare', 'Le phare s’allume et la nuit tombe sur l’île.', () => { reglerNuit(!nuit); tone([330, 330], 0.3); });
  // véhicules et animaux
  M.objets.rames.slice(1).forEach((g) => g.traverse((o) => { o.userData.oeuf = 'train'; }));
  declarer(M.objets.train, 'train', 'Le train siffle et prend de la vitesse.', () => { tone([520, 520, 690], 0.35); M.vitesseTrain = 0.11; setTimeout(() => (M.vitesseTrain = 0.04), 4000); });
  declarer(M.objets.voiture, 'voiture', 'La voiture blanche de Route & vigilance respecte la limite.', () => tone([200, 260], 0.15));
  declarer(M.objets.voilier, 'voilier', 'Le voilier hisse ses voiles et file, avant de revenir les ranger au quai.', () => { const e = M.etatVoilier; if (e.etat === 'quai') e.go = 1; else if (e.etat === 'nav') e.t = Math.max(e.t, 12); tone([392, 494], 0.2); });
  declarer(M.objets.canard, 'canard', 'Un canard : coin.', () => { tone([740, 620], 0.12); M.objets.canard.userData.fuit = 1; });
  M.objets.mouettes.forEach((m, i) => { if (i) m.traverse((o) => { o.userData.oeuf = 'oiseau'; }); }); declarer(M.objets.mouettes[0], 'oiseau', 'Les mouettes tournent autour de l’île, comme les flux Power Automate.', () => tone([1200, 1500, 1200], 0.08));
  M.objets.poissons.slice(1).forEach((p) => p.traverse((o) => { o.userData.oeuf = 'poisson'; }));
  declarer(M.objets.poissons[0], 'poisson', 'Un poisson saute hors de l’eau du lagon.', () => { M.objets.poissons.forEach((f) => { if (!f.userData.saut) { f.userData.saut = 0.001; f.userData.dx = Math.cos(f.userData.a); f.userData.dz = Math.sin(f.userData.a); } }); tone([900, 1300], 0.1); });
  // poissons du lagon : visibles près de l'eau profonde, sautent de temps en temps
  { const c = carte.meta.lagon.c; M.objets.poissons.forEach((f, i) => { const u = f.userData; let ok = false; for (let k = 0; k < 40 && !ok; k++) { const a = Math.random() * 6.3, r = 1.8 + Math.random() * 3.5; u.x = c[0] + Math.cos(a) * r * 1.2; u.z = c[1] + Math.sin(a) * r * 0.9; ok = carte.eau(u.x, u.z) && carte.hauteur(u.x, u.z) < -0.5; } f.visible = ok; }); }
  declarer(M.objets.bateau, 'pêcheur', 'Le bateau de pêche est à vous : ZQSD ou flèches pour naviguer, F pour pêcher près d’un banc.', () => { tone([220, 330], 0.25); pecher.entrer(); });
  J.oeufs.set('pêche', { texte: '', trouve: false }); J.oeufs.set('photo', { texte: '', trouve: false });

  /* ------------------------------------------------------------------------------------------------ fiches et étiquettes de verre */
  const fiche = ui.fiche; J.fermerFiche = () => { fiche.hidden = true; document.body.classList.remove('has-card'); };
  const montrerFiche = (e) => {
    fiche.innerHTML = `<button class="world-close" aria-label="Fermer">×</button><span class="world-kicker">${e.role}</span><h2>${e.nom}</h2><p>${e.texte}</p>${e.lien ? `<a href="${e.lien}">Ouvrir <span>↗</span></a>` : ''}`;
    fiche.hidden = false; document.body.classList.add('has-card'); fiche.querySelector('.world-close').onclick = J.fermerFiche; J.fiche = e; };
  J.montrerFiche = montrerFiche;
  const pins = M.ETAPES.map((e) => {
    const b = document.createElement('button'); b.className = 'world-pin'; b.type = 'button'; b.setAttribute('aria-label', `${e.nom} : ouvrir la fiche`);
    b.innerHTML = `<i class="pin-ico">${e.icone}</i><span class="pin-txt"><b>${e.nom}</b><small>${e.tag}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    b.onclick = () => montrerFiche(e); b.onmouseenter = () => { b.classList.add('is-hot'); }; b.onmouseleave = () => b.classList.remove('is-hot'); ui.etiquettes.appendChild(b);
    const bt = M.bats[e.id]; return { b, e, base: V3(bt.x, carte.hauteur(bt.x, bt.z) + 0.05, bt.z), r: bt.rayon };
  });
  const _pp = V3(), _dv = V3(); const placerPins = () => {
    const w = hote.clientWidth, h = hote.clientHeight;
    _dv.set(camera.position.x - cam.cible.x, 0, camera.position.z - cam.cible.z).normalize();
    for (const q of pins) {
      _pp.copy(q.base).addScaledVector(_dv, q.r * 0.75).project(camera); const dehors = _pp.z > 1 || _pp.z < -1 || marche.on || sail.on;
      q.b.style.opacity = dehors ? 0 : 1; q.b.style.pointerEvents = dehors ? 'none' : 'auto'; if (dehors) continue;
      const x = (_pp.x * 0.5 + 0.5) * w, y = (-_pp.y * 0.5 + 0.5) * h; q.b.style.transform = `translate(${x}px,${y}px) translate(-50%,-30%)`; q.b.style.zIndex = String(1000 - Math.round(_pp.z * 500));
    }
  };

  /* ------------------------------------------------------------------------------------------------ caméra : orbite autour de l'île */
  const cam = { spin: 0.25, pitch: 0.82, zoom: 40, but: null, cible: V3(0, -1, 0.4), vitesse: 0.1, pause: false, glisse: null };
  J.camera.but = (zoom, pitch) => { cam.but = { zoom, pitch }; };
  J.vue = (spin, pitch, zoom) => { cam.spin = spin; cam.pitch = pitch; cam.zoom = zoom; cam.pause = true; };
  J.cam = cam;
  const _t = V3();
  function placerCamera(dt) {
    if (cam.but) { const k = Math.min(1, dt * 2.2); cam.zoom += (cam.but.zoom - cam.zoom) * k; cam.pitch += (cam.but.pitch - cam.pitch) * k; if (Math.abs(cam.but.zoom - cam.zoom) < 0.05) cam.but = null; }
    const dessous = (1 - bornes((cam.pitch + 0.4) / 0.8, 0, 1)) * (1 - 0.0);                // regarde le socle quand on passe sous l'horizon
    const cibleY = -1 + dessous * -5.5;
    if (sail.on) { _t.set(bateauPos().x, 0, bateauPos().z); cam.cible.lerp(_t, Math.min(1, dt * 3)); } else cam.cible.lerp(_t.set(0, cibleY, 0.4), Math.min(1, dt * 1.6));
    const d = cam.zoom * Math.max(1, 0.78 / camera.aspect), decal = innerWidth > 850 && !sail.on ? -4.4 * (cam.zoom / 40) : 0;
    camera.position.set(cam.cible.x + Math.sin(cam.spin) * d * Math.cos(cam.pitch), cam.cible.y + Math.sin(cam.pitch) * d, cam.cible.z + Math.cos(cam.spin) * d * Math.cos(cam.pitch));
    camera.lookAt(cam.cible); camera.translateX(decal); camera.lookAt(camera.position.clone().add(camera.getWorldDirection(V3())));
  }
  const bateauPos = () => M.objets.bateau.position;

  /* ------------------------------------------------------------------------------------------------ marche à la première personne */
  const marche = { on: false, pos: V3(), yaw: 0, regard: -0.08, touches: new Set(), court: false, pas: 0, proche: null, fov: 30 };
  J.marche = marche; const OEIL = 0.36;
  const pon = M.objets.ponton, yawPon = pon.rotation.y, pontY = M.objets.pont, yawPont = pontY.rotation.y;
  const surfaceMarche = (x, z) => { // hauteur du sol sous (x, z) : terrain, ponton ou pont ; null si on ne peut pas y aller
    const dx = x - pon.position.x, dz = z - pon.position.z, t = dx * Math.sin(yawPon) + dz * Math.cos(yawPon), l = dx * Math.cos(yawPon) - dz * Math.sin(yawPon);
    if (t > -0.1 && t < 2.8 && Math.abs(l) < 0.26) return 0.24;
    const px = x - pontY.position.x, pz = z - pontY.position.z, tp = px * Math.sin(yawPont) + pz * Math.cos(yawPont), lp = px * Math.cos(yawPont) - pz * Math.sin(yawPont);
    if (tp > -0.05 && tp < 1.8 && Math.abs(lp) < 0.17) return 0.47 + 0.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, tp / 1.75)));
    const h = carte.hauteur(x, z); if (h < -20) return null; if (h < -0.3) return null; return h;
  };
  const batiments = Object.values(M.bats);
  const obstacle = (x, z) => { for (const b of batiments) { const bb = b.box; if (x > bb.min.x - 0.12 && x < bb.max.x + 0.12 && z > bb.min.z - 0.12 && z < bb.max.z + 0.12 && carte.hauteur(x, z) > -0.3 && Math.hypot(x - b.x, z - b.z) < b.rayon * 0.82) return true; } const ph = M.objets.phare.position; return Math.hypot(x - ph.x, z - ph.z) < 0.4; };
  function entrerMarche() {
    if (marche.on) return; pecher.sortir(); J.fermerFiche(); marche.on = true; marche.touches.clear();
    const a = Math.atan2(Math.cos(cam.spin), Math.sin(cam.spin)); marche.pos.set(0.0, 0.5, -0.5); marche.yaw = Math.PI; marche.regard = -0.12; marche.fov = camera.fov; camera.fov = 62; camera.near = 0.02; camera.updateProjectionMatrix(); camera.rotation.order = 'YXZ';
    document.body.classList.add('is-sailing', 'is-walking'); ui.hudMarche.hidden = false; ui.pad.hidden = false; ui.btnMarche.textContent = 'Quitter la marche'; ui.btnMarche.setAttribute('aria-pressed', 'true');
    indice('À pied sur l’île : approchez un bâtiment et appuyez sur E pour ouvrir sa fiche.'); canvas.focus({ preventScroll: true });
  }
  function sortirMarche() {
    if (!marche.on) return; marche.on = false; marche.touches.clear(); camera.fov = marche.fov; camera.near = 0.3; camera.updateProjectionMatrix(); camera.rotation.order = 'XYZ';
    document.body.classList.remove('is-sailing', 'is-walking'); ui.hudMarche.hidden = true; ui.pad.hidden = true; ui.btnMarche.textContent = 'Marcher'; ui.btnMarche.setAttribute('aria-pressed', 'false');
  }
  J.sortirMarche = sortirMarche; ui.btnMarche.onclick = () => { marche.on ? sortirMarche() : entrerMarche(); ui.btnMarche.blur(); canvas.focus({ preventScroll: true }); };
  const procheBat = () => { let best = null, bd = 1.6; for (const b of batiments) { const bb = b.box, dx = Math.max(bb.min.x - marche.pos.x, 0, marche.pos.x - bb.max.x), dz = Math.max(bb.min.z - marche.pos.z, 0, marche.pos.z - bb.max.z), d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = b; } } return best; };
  J.interagirMarche = () => { const b = procheBat(); if (b) montrerFiche(b.etape); };
  function tickMarche(dt, t) {
    const k = marche.touches, tourne = (k.has('left') ? 1 : 0) - (k.has('right') ? 1 : 0); marche.yaw += tourne * dt * 1.9;
    const av = (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0), cote = (k.has('sright') ? 1 : 0) - (k.has('sleft') ? 1 : 0), vit = (marche.court ? 2.3 : 1.15) * dt, bouge = av || cote;
    if (bouge) { const sy = Math.sin(marche.yaw), cy = Math.cos(marche.yaw), v = V3(-sy * av + cy * cote, 0, -cy * av - sy * cote).normalize();
      for (const d of [v, V3(v.x, 0, 0), V3(0, 0, v.z)]) { if (d.lengthSq() < 1e-4) continue; const dir = d.clone().normalize(), nx = marche.pos.x + dir.x * vit, nz = marche.pos.z + dir.z * vit; if (surfaceMarche(nx, nz) !== null && !obstacle(nx, nz)) { marche.pos.x = nx; marche.pos.z = nz; break; } }
      marche.pas += dt * (marche.court ? 13 : 9); }
    const gy = surfaceMarche(marche.pos.x, marche.pos.z) ?? marche.pos.y; marche.pos.y += (gy - marche.pos.y) * Math.min(1, dt * 12);
    camera.position.set(marche.pos.x, marche.pos.y + OEIL + (bouge ? Math.sin(marche.pas) * 0.012 : 0), marche.pos.z); camera.rotation.set(marche.regard, marche.yaw, 0);
    const b = procheBat(); if (b !== marche.proche) { marche.proche = b; indice(b ? `E · ouvrir la fiche : ${b.etape.nom}` : (matchMedia('(pointer:coarse)').matches ? 'À pied · flèches pour marcher, glisser pour regarder' : 'À pied · ZQSD, glisser pour regarder')); }
  }
  const touchesMarche = (e, bas) => {
    if (!marche.on || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return false;
    const K = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'sleft', KeyD: 'sright', ArrowLeft: 'left', ArrowRight: 'right' }[e.code];
    if (K) { e.preventDefault(); bas ? marche.touches.add(K) : marche.touches.delete(K); return true; }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { marche.court = bas; return true; }
    if ((e.code === 'KeyE' || e.code === 'Enter') && bas && !e.repeat) { e.preventDefault(); J.interagirMarche(); return true; }
    if (e.code === 'Escape' && bas) { ui.fiche.hidden ? sortirMarche() : J.fermerFiche(); return true; } return false;
  };

  const pecher = creerPeche({ ...J, camera: { ...J.camera, obj: camera, but: J.camera.but }, ui: { peche: ui.peche, bulle: ui.bulle, hudBarre: ui.hudBarre, pad: ui.pad, btnBarre: ui.btnBarre, carnet: ui.carnet }, marche, interagirMarche: () => J.interagirMarche(), sortirMarche, oeufs: J.oeufs });
  const sail = pecher.sail; J.pecher = pecher; J.sail = sail;

  /* ------------------------------------------------------------------------------------------------ interaction à la souris, au doigt et au clavier */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let appui = null, glisse = null, pincement = null;
  const cibles = () => [...Object.values(M.bats).map((b) => b.groupe), M.objets.pont, M.objets.ponton, M.objets.yacht, M.objets.bateau, M.objets.voilier, M.objets.phare, ...M.objets.rames, M.objets.voiture, M.objets.canard, ...M.objets.mouettes, ...M.objets.poissons.filter((p) => p.visible)];
  function viser(e, clic) {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(cibles(), true).find((h) => h.object.visible && !h.object.isLineSegments);
    canvas.style.cursor = hit && (hit.object.userData.oeuf || hit.object.userData.batiment) ? 'pointer' : 'grab';
    if (!clic || !hit) return; const o = hit.object;
    if (o.userData.oeuf) { const e2 = J.oeufs.get(o.userData.oeuf); e2.action?.(); oeuf(o.userData.oeuf, e2.texte); return; }
    if (o.userData.batiment) montrerFiche(o.userData.batiment.userData.etape);
  }
  canvas.addEventListener('pointerdown', (e) => { appui = { x: e.clientX, y: e.clientY, spin: cam.spin }; glisse = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (glisse && marche.on) { marche.yaw -= (e.clientX - glisse.x) * 0.004; marche.regard = bornes(marche.regard - (e.clientY - glisse.y) * 0.003, -1.1, 0.9); glisse.x = e.clientX; glisse.y = e.clientY; }
    else if (glisse) { cam.spin = appui.spin - (e.clientX - appui.x) * 0.006; cam.pitch = bornes(cam.pitch + (e.clientY - glisse.y) * 0.003, -0.6, 1.38); glisse.y = e.clientY; }
    else viser(e, false); });
  canvas.addEventListener('pointerup', (e) => { const bouge = appui && Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > 5; glisse = null; if (!bouge) viser(e, true); });
  canvas.addEventListener('pointercancel', () => (glisse = null));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (marche.on) return; cam.zoom = bornes(cam.zoom + e.deltaY * 0.03, 10, 70); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pincement) cam.zoom = bornes(cam.zoom * (pincement / d), 10, 70); pincement = d; e.preventDefault(); } }, { passive: false });
  canvas.addEventListener('touchend', () => (pincement = null));
  window.addEventListener('keyup', (e) => { touchesMarche(e, false); pecher.touche(e, false); });
  window.addEventListener('blur', () => { marche.touches.clear(); marche.court = false; });
  window.addEventListener('keydown', (e) => {
    if (touchesMarche(e, true) || pecher.touche(e, true)) return; if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return; if (/^Arrow/.test(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft') cam.spin += 0.08; if (e.code === 'ArrowRight') cam.spin -= 0.08; if (e.code === 'ArrowUp') cam.pitch = Math.min(1.38, cam.pitch + 0.05); if (e.code === 'ArrowDown') cam.pitch = Math.max(-0.6, cam.pitch - 0.05);
    if (e.key === '+' || e.key === '=') cam.zoom = Math.max(10, cam.zoom - 3); if (e.key === '-') cam.zoom = Math.min(70, cam.zoom + 3); if (e.code === 'Space') { e.preventDefault(); $('world-pause').click(); } });
  $('world-zoom-in').onclick = (e) => { cam.zoom = Math.max(10, cam.zoom - 5); e.currentTarget.blur(); };
  $('world-zoom-out').onclick = (e) => { cam.zoom = Math.min(70, cam.zoom + 5); e.currentTarget.blur(); };
  $('world-pause').onclick = (e) => { cam.pause = !cam.pause; e.currentTarget.innerHTML = cam.pause ? '<svg class="ico" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"><path d="M20 12 5 21V3z" fill="currentColor"/></svg>' : 'Ⅱ'; e.currentTarget.setAttribute('aria-label', cam.pause ? 'Reprendre la rotation' : 'Mettre en pause'); };
  $('world-reset').onclick = () => { sortirMarche(); pecher.sortir(); cam.spin = 0.25; cam.pitch = 0.82; cam.zoom = 40; J.fermerFiche(); reglerNuit(false); };
  $('world-photo').onclick = () => { R.rendre(M.scene, M.sceneNuages, camera, performance.now() / 1000); const a = document.createElement('a'); a.download = 'atlas-du-parcours.png'; a.href = canvas.toDataURL('image/png'); a.click(); oeuf('photo', 'Une photo souvenir de l’île, enregistrée sur votre appareil.'); };

  /* ------------------------------------------------------------------------------------------------ boucle de jeu */
  const mixHex = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
  J.tick = (dt, t) => {
    // nuit : transition douce
    const cible = nuit ? 1 : 0; nuitK += (cible - nuitK) * Math.min(1, dt * 1.6); if (Math.abs(cible - nuitK) < 0.002) nuitK = cible; M.ciel.nuit(nuitK); R.reglages.nuit = nuitK;
    faisceau.material.opacity = 0.3 * nuitK; M.objets.phare.userData.ancres.lampe.parent.traverse(() => {}); pharePivot.rotation.y = t * 0.6;
    ampoule.material.emissiveIntensity = 0.5 + 1.4 * nuitK;
    if (!cam.pause && !glisse && !sail.on && !marche.on) cam.spin += cam.vitesse * dt;
    if (marche.on) tickMarche(dt, t); else placerCamera(dt);
    M.tick(dt, t);
    pecher.tick(dt, t);
    // signal
    signal.t += dt; if (signal.t > signal.aspects[signal.aspect].d) signal.regler(signal.aspect + 1); signal.halo.intensity = 0.5 + nuitK * 1.2;
    // horloge de la gare et chat
    pivotH.rotation.z = -t * 0.2; { const u = chat.userData; u.tete.rotation.y = Math.sin(t * 0.6) * 0.5; u.tete.rotation.z = Math.sin(t * 0.9) * 0.08; for (let i = 0; i < 6; i++) u.queue.userData['s' + i].rotation.z = 0.22 + Math.sin(t * 2.2 - i * 0.6) * 0.18; u.queue.rotation.y = Math.sin(t * 0.8) * 0.4; u.yeux.emissiveIntensity = 0.4 + nuitK * 1.2;
      if (u.saut) { u.saut += dt * 4; chat.position.y = Math.sin(Math.min(Math.PI, u.saut)) * 0.35; chat.rotation.z = Math.sin(Math.min(Math.PI, u.saut)) * 0.3; if (u.saut > Math.PI) { u.saut = 0; chat.position.y = 0; chat.rotation.z = 0; } } }
    if (ceinture.userData.tourne) { ceinture.rotation.y += dt * 6; ceinture.userData.tourne += dt; if (ceinture.userData.tourne > 1.5) { ceinture.userData.tourne = 0; ceinture.rotation.y = 0; } }
    // poissons : nage et sauts
    M.objets.poissons.forEach((f, i) => { if (!f.visible) return; const u = f.userData; u.t += dt;
      if (u.saut > 0) { u.saut += dt * 1.6; const h = Math.sin(Math.min(Math.PI, u.saut * Math.PI)) * 0.55; f.position.set(u.x + u.dx * u.saut * 0.8, h - 0.05, u.z + u.dz * u.saut * 0.8); f.rotation.z = (0.5 - u.saut) * 1.6; if (u.saut >= 1) { u.saut = 0; u.x += u.dx * 0.8; u.z += u.dz * 0.8; u.a = Math.atan2(u.dz, u.dx); } }
      else { u.a += Math.sin(u.t * 0.7 + i) * dt * 0.4; const nx = u.x + Math.cos(u.a) * dt * 0.4, nz = u.z + Math.sin(u.a) * dt * 0.4; if (!carte.eau(nx, nz) || carte.hauteur(nx, nz) > -0.45) u.a += Math.PI; else { u.x = nx; u.z = nz; } f.position.set(u.x, -0.28 + Math.sin(u.t * 3) * 0.02, u.z); f.rotation.z = 0; if (Math.random() < dt * 0.05) { u.saut = 0.001; u.dx = Math.cos(u.a); u.dz = Math.sin(u.a); } }
      f.rotation.y = -u.a; f.rotation.x = Math.sin(u.t * 9) * 0.15; });
    // feu d'artifice
    if (feux) { feux.age += dt; const p = feux.pts.geometry.attributes.position; for (let i = 0; i < feux.vit.length; i++) { const v = feux.vit[i]; v.y -= dt * 2.2; p.setXYZ(i, p.getX(i) + v.x * dt, p.getY(i) + v.y * dt, p.getZ(i) + v.z * dt); } p.needsUpdate = true; feux.pts.material.opacity = Math.max(0, 1 - feux.age / 4.5); if (feux.age > 4.5) { M.scene.remove(feux.pts); feux = null; } }
    placerPins();
  };
  J.redimensionner = () => { const r = hote.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio, J.densite || 1.5); R.dimensionner(r.width, r.height, dpr); camera.aspect = r.width / r.height; if (!marche.on) camera.fov = camera.aspect < 0.9 ? 42 : 30; camera.updateProjectionMatrix(); };
  ui.oeufs.textContent = `Easter eggs : 0 / ${J.oeufs.size}`;
  if (matchMedia('(pointer:coarse)').matches) indice('Glisser pour tourner · toucher un bâtiment · pincer pour zoomer');
  window.AtlasGame = { oeufs: J.oeufs, oeuf, vue: J.vue, jeu: J, entrerMarche, sortirMarche };
  J.entrerMarche = entrerMarche;
  return J;
}
