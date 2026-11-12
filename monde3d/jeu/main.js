/* Boucle du jeu : entrées (clavier, souris, tactile), caméra, cristaux, portails, retours après chute, réglage automatique de la définition. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { creerRendu, encre } from './rendu.js';
import { creerMonde, chargerPiece, dedans } from './monde.js';
import { creerPerso } from './perso.js';
import { creerSon } from './son.js';
import { creerPensee } from './pensee.js';
import { creerAuto } from './auto.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene'), liens = window.CONFIG_LIENS_3D || {};
const rendu = creerRendu(canvas), son = creerSon();
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2600);
scene.add(new THREE.HemisphereLight(0xffffff, 0xa397a8, 1.1));
const soleil = new THREE.DirectionalLight(0xffffff, 2.6), dirSoleil = new THREE.Vector3(-0.5, 0.82, 0.42).normalize();
soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048); soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.05;
Object.assign(soleil.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 150 }); soleil.shadow.camera.updateProjectionMatrix();
scene.add(soleil, soleil.target);

const monde = creerMonde(scene, liens, await chargerPiece());
/* lampes de la pièce : allumées, chacune éclaire son coin */
for (const l of monde.lampes.filter((q) => q.id !== 'screenbar')) { const pl = new THREE.PointLight(l.couleur, 9, 9, 2); pl.position.copy(l.p); scene.add(pl); }
const SOUS = { 'La pièce': 'là où tout commence', 'La platine': 'trente-trois tours au-dessus du vide', 'Le jardin': 'un bonsaï grand comme une maison', "L'atelier": 'ici, les formulaires deviennent des tableaux de bord', 'Le belvédère': 'trois portes vers ailleurs' };
const dit = (txt, sous = SOUS[txt] || '') => { const el = $('lieu'); el.firstElementChild.textContent = txt; el.lastElementChild.textContent = sous; el.classList.remove('vu'); void el.offsetWidth; el.classList.add('vu'); };
monde.son = (n) => son.joue(n); monde.dit = dit;

/* cristaux */
const total = monde.cristaux.length;
const geoCristal = mergeGeometries([new THREE.CylinderGeometry(0, 0.27, 0.5, 5).translate(0, 0.25, 0), new THREE.CylinderGeometry(0.27, 0, 0.5, 5).translate(0, -0.25, 0)]);
const cristaux = new THREE.InstancedMesh(geoCristal, encre({ color: '#f3eca5', emissive: '#8a8040' }), total);
cristaux.castShadow = true; cristaux.frustumCulled = false; scene.add(cristaux);
let pris = 0;
const majCompteur = () => { $('compte').textContent = `${pris} / ${total}`; };
majCompteur();

/* particules : petits cailloux opaques (poussière, éclats) */
const NP = 90, parts = Array.from({ length: NP }, () => ({ vie: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1, g: 0 }));
const nuage = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), encre({ color: '#ffffff' }), NP);
nuage.frustumCulled = false; nuage.castShadow = false; scene.add(nuage);
const cPoussiere = new THREE.Color('#efe3c8'), cEclat = new THREE.Color('#f6ee9c'), cOrange = new THREE.Color('#ee8a3a');
let iPart = 0;
function jaillit(pos, n, { c = cPoussiere, v = 2, haut = 1.5, s = 1, g = 3, vie = 0.5 } = {}) {
  for (let i = 0; i < n; i++) {
    const q = parts[iPart]; nuage.setColorAt(iPart, c); iPart = (iPart + 1) % NP;
    const a = Math.random() * Math.PI * 2, r = v * (0.5 + Math.random() * 0.6);
    q.p.copy(pos); q.v.set(Math.cos(a) * r, haut * (0.4 + Math.random() * 0.8), Math.sin(a) * r); q.vie = q.max = vie * (0.7 + Math.random() * 0.6); q.s = s * (0.6 + Math.random() * 0.8); q.g = g;
  }
  if (nuage.instanceColor) nuage.instanceColor.needsUpdate = true;
}
const _mat = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();

/* entrées */
const entree = { x: 0, y: 0, saut: false, sautPresse: false, sprint: false };
const touches = new Set();
let action = false, sautTactile = false, manette = null, dernierCam = -10;
const cam = { cap: 0.25, pente: 0.36, dist: 8.5, cible: new THREE.Vector3().copy(monde.depart) };
let auto = null, dernierGeste = 0, tPensee = 0, tEffet = 0;
const pensee = creerPensee($('pensee'), monde.piece), tete = new THREE.Vector3();
let demarre = false, heros = null, temps = 0, fondu = 1, fonduCible = 1, enRetour = 0, fete = false;

addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (!demarre) { if (e.code === 'Enter' || e.code === 'Space') lancer(); return; }
  if (e.repeat) return;
  touches.add(e.code); geste();
  if (e.code === 'Space') entree.sautPresse = true;
  if (e.code === 'KeyE' || e.code === 'Enter') action = true;
  if (e.code === 'KeyM') basculeSon();
});
addEventListener('keyup', (e) => touches.delete(e.code));
addEventListener('blur', () => { touches.clear(); manette = null; sautTactile = false; });
const tactile = matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('tactile', tactile);

/* souris ou doigt : la moitié gauche de l'écran tactile sert de manette, le reste tourne la caméra */
const glisse = new Map();
canvas.addEventListener('pointerdown', (e) => {
  if (!demarre) return;
  if (e.pointerType !== 'mouse' || !auto?.actif) geste(); else dernierGeste = temps;
  canvas.setPointerCapture(e.pointerId);
  if (e.pointerType !== 'mouse' && !manette && e.clientX < innerWidth * 0.45 && e.clientY > innerHeight * 0.3) {
    manette = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, y: 0 };
    const b = $('manette'); b.style.left = e.clientX + 'px'; b.style.top = e.clientY + 'px'; b.classList.add('vu'); $('pouce').style.transform = 'translate(-50%,-50%)';
  } else glisse.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
canvas.addEventListener('pointermove', (e) => {
  if (manette && e.pointerId === manette.id) {
    let dx = e.clientX - manette.x0, dy = e.clientY - manette.y0; const l = Math.hypot(dx, dy), R = 58; if (l > R) { dx *= R / l; dy *= R / l; }
    manette.x = dx / R; manette.y = -dy / R; $('pouce').style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; return;
  }
  const g = glisse.get(e.pointerId); if (!g) return;
  const k = e.pointerType === 'mouse' ? 0.0052 : 0.0075;
  cam.cap -= (e.clientX - g.x) * k; cam.pente = Math.min(1.25, Math.max(-0.3, cam.pente + (e.clientY - g.y) * k));
  g.x = e.clientX; g.y = e.clientY; dernierCam = temps;
});
const lache = (e) => { if (manette && e.pointerId === manette.id) { manette = null; $('manette').classList.remove('vu'); } glisse.delete(e.pointerId); };
canvas.addEventListener('pointerup', lache); canvas.addEventListener('pointercancel', lache);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = Math.min(16, Math.max(4.5, cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
const bSaut = $('saut');
bSaut.addEventListener('pointerdown', (e) => { e.preventDefault(); sautTactile = true; entree.sautPresse = true; geste(); });
for (const n of ['pointerup', 'pointercancel', 'pointerleave']) bSaut.addEventListener(n, () => { sautTactile = false; });
$('invite').addEventListener('click', () => { action = true; });
const basculeSon = () => { son.pret(); const m = son.bascule(); $('son').classList.toggle('coupe', m); $('son').setAttribute('aria-pressed', String(!m)); };
$('son').addEventListener('click', basculeSon); $('son').classList.toggle('coupe', son.muet);

/* exploration autonome : bouton, ou 14 secondes sans rien toucher ; le moindre geste rend la main */
function geste() { dernierGeste = temps; if (auto?.actif) { auto.arrete(); majAuto(); } }
function majAuto() { $('auto').classList.toggle('actif', !!auto?.actif); $('auto').setAttribute('aria-pressed', String(!!auto?.actif)); }
$('auto').addEventListener('click', () => { if (!auto) return; if (auto.actif) auto.arrete(); else { auto.demarre(); dit('Errance', 'Mathieu explore seul, un geste et il vous revient'); } dernierGeste = temps; majAuto(); });

/* pensées en jeu libre : près d'un objet de la pièce, Mathieu pense à ce qu'il y ferait */
const IDEES = { desk: 'Travailler au bureau', usm: 'Écouter un vinyle', bike: 'Regonfler les pneus du vélo', dracaena: 'Arroser le dragonnier', ekstrem: 'Lire dans le fauteuil', tv: 'Jouer à la console', bonsai: 'Arroser le bonsaï', alocasia: 'Arroser l’alocasia', buddha: 'Respirer un instant', sofa: 'S’asseoir un moment', shelf1: 'Choisir un livre', stele: 'Relire la stèle', backpack: 'Partir marcher' };
let ideeVue = null;
function majIdees(dt) {
  tPensee -= dt; if (tPensee > 0 || auto?.actif || heros.pos.y > 2.5 || Math.hypot(heros.pos.x, heros.pos.z) > 13) return; tPensee = 0.4;
  let id = null, best = 1.5;
  for (const [k, o] of monde.piece.objets) { if (!IDEES[k]) continue; const cx = (o.bb[0] + o.bb[3]) / 2 * 1.35 + 0.47, cz = (o.bb[2] + o.bb[5]) / 2 * 1.35 - 0.34, hx = (o.bb[3] - o.bb[0]) / 2 * 1.35, hz = (o.bb[5] - o.bb[2]) / 2 * 1.35; const d = Math.hypot(Math.max(0, Math.abs(heros.pos.x - cx) - hx), Math.max(0, Math.abs(heros.pos.z - cz) - hz)); if (d < best) { best = d; id = k; } }
  if (id && id !== ideeVue) pensee.montre(id, IDEES[id], 3.5);
  ideeVue = id;
}
/* effets d'ambiance : fumée de la machine, feuilles du grand bonsaï */
const cFeuille = [new THREE.Color('#6fa487'), new THREE.Color('#e0a85a'), new THREE.Color('#3f8a5f')], cFumee = new THREE.Color('#f3ecdc');
function majEffets(dt) {
  tEffet -= dt; if (tEffet > 0) return; tEffet = 0.22;
  for (const ef of monde.effets) {
    if (Math.hypot(ef.p.x - cam.cible.x, ef.p.z - cam.cible.z) > 45) continue;
    if (ef.type === 'fumee') jaillit(ef.p, 1, { c: cFumee, v: 0.5, haut: 1.6, s: 3.2, g: -0.6, vie: 2.4 });
    else if (Math.random() < 0.6) jaillit(_p.set(ef.p.x + (Math.random() - 0.5) * 7, ef.p.y + Math.random() * 2, ef.p.z + (Math.random() - 0.5) * 7), 1, { c: cFeuille[Math.floor(Math.random() * 3)], v: 0.7, haut: -0.2, s: 0.9, g: 0.5, vie: 4 });
  }
}

function lireEntrees() {
  const t = (c) => (touches.has(c) ? 1 : 0);
  let x = t('KeyD') + t('ArrowRight') - t('KeyA') - t('ArrowLeft'), y = t('KeyW') + t('ArrowUp') - t('KeyS') - t('ArrowDown');
  let sprint = touches.has('ShiftLeft') || touches.has('ShiftRight');
  if (touches.size || manette || sautTactile) { if (auto?.actif) geste(); else dernierGeste = temps; }
  if (manette) { x = manette.x; y = manette.y; const m = Math.hypot(x, y); sprint = m > 0.93; if (m < 0.16) { x = 0; y = 0; } }
  else if (x && y) { x *= 0.7071; y *= 0.7071; }
  entree.x = x; entree.y = y; entree.sprint = sprint; entree.saut = touches.has('Space') || sautTactile;
}

/* portails */
let proche = null;
function majPortails() {
  let p = null;
  for (const q of monde.portails) if (q.url && Math.hypot(q.x - heros.pos.x, q.z - heros.pos.z) < 2.1 && Math.abs(q.y - heros.pos.y) < 2.5) p = q;
  if (p !== proche) { proche = p; const el = $('invite'); el.classList.toggle('vu', !!p); if (p) $('invite-nom').textContent = p.nom; }
  if (action && proche) { son.joue('portail'); jaillit(_p.set(proche.x, proche.y + 1.5, proche.z), 14, { c: cEclat, v: 3, haut: 3, vie: 0.8 }); window.open(proche.url, '_blank', 'noopener'); touches.clear(); }
  action = false;
}

function majCristaux(dt) {
  monde.cristaux.forEach((c, i) => {
    if (!c.pris && heros && Math.hypot(c.x - heros.pos.x, c.z - heros.pos.z) < 1.05 && Math.abs(c.y - (heros.pos.y + 0.9)) < 1.5) {
      c.pris = true; pris++; majCompteur(); son.joue('cristal', pris - 1); jaillit(_p.set(c.x, c.y, c.z), 12, { c: cEclat, v: 3.2, haut: 3.5, vie: 0.7 });
      $('cristaux').classList.remove('gagne'); void $('cristaux').offsetWidth; $('cristaux').classList.add('gagne');
      if (pris === total) { fete = true; setTimeout(() => { dit('Vingt cristaux', 'ils sont tous réunis'); son.joue('fete'); heros.danse = true; jaillit(_p.copy(heros.pos).setY(heros.pos.y + 1), 40, { c: cEclat, v: 5, haut: 7, vie: 1.4, g: 6 }); }, 500); }
    }
    const k = c.pris ? 0 : 1 + Math.sin(temps * 2 + i) * 0.06;
    _mat.compose(_p.set(c.x, c.y + Math.sin(temps * 1.6 + i * 1.3) * 0.14, c.z), _q.setFromEuler(_e.set(0, temps * 1.2 + i, 0.18)), _s.set(k * 0.8, k, k * 0.8));
    cristaux.setMatrixAt(i, _mat);
  });
  cristaux.instanceMatrix.needsUpdate = true;
}
function majParticules(dt) {
  for (let i = 0; i < NP; i++) {
    const q = parts[i];
    if (q.vie > 0) { q.vie -= dt; q.v.y -= q.g * dt; q.p.addScaledVector(q.v, dt); const k = Math.max(0, q.vie / q.max) * q.s; _mat.compose(q.p, _q.identity(), _s.set(k, k, k)); }
    else _mat.makeScale(0, 0, 0);
    nuage.setMatrixAt(i, _mat);
  }
  nuage.instanceMatrix.needsUpdate = true;
}

function majCamera(dt) {
  const cible = heros ? heros.pos : monde.depart;
  if (!demarre) cam.cap += dt * 0.07;
  else if (heros && temps - dernierCam > 1.4) {
    const vh = Math.hypot(heros.vit.x, heros.vit.z);
    if (vh > 2 && entree.y > -0.3) { let d = heros.cap - Math.PI - cam.cap; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < 2.4) cam.cap += d * Math.min(1, dt * 0.9); }
  }
  const kh = 1 - Math.exp(-dt * 11), kv = 1 - Math.exp(-dt * (heros && !heros.auSol ? 4 : 7));
  cam.cible.x += (cible.x - cam.cible.x) * kh; cam.cible.z += (cible.z - cam.cible.z) * kh; cam.cible.y += (cible.y - cam.cible.y) * kv;
  let d = demarre ? cam.dist : 15; const pente = demarre ? cam.pente : 0.42, cy = cam.cible.y + 1.25, cp = Math.cos(pente);
  /* la caméra ne traverse pas le décor : on avance le long du rayon jusqu'au premier volume rencontré, puis on lisse */
  if (demarre) {
    const ux = Math.sin(cam.cap) * cp, uy = Math.sin(pente), uz = Math.cos(cam.cap) * cp; let libre = d;
    boucle: for (let r = 1.2; r <= d; r += 0.45) { const x = cam.cible.x + ux * r, y = cy + uy * r, z = cam.cible.z + uz * r; for (const c of monde.cols) if (c.actif && y < c.top - 0.05 && y > c.bas && Math.abs(x - c.x) < 20 && dedans(c, x, z, 0.25)) { libre = Math.max(1.4, r - 0.5); break boucle; } }
    cam.reel = libre < (cam.reel ?? d) ? libre : Math.min(libre, (cam.reel ?? d) + dt * 6); d = cam.reel;
  }
  camera.position.set(cam.cible.x + Math.sin(cam.cap) * cp * d, cy + Math.sin(pente) * d, cam.cible.z + Math.cos(cam.cap) * cp * d);
  camera.lookAt(cam.cible.x, cy, cam.cible.z);
  /* le soleil suit le joueur, par pas d'un mètre, pour garder des ombres nettes et stables */
  const sx = Math.round(cam.cible.x), sy = Math.round(cam.cible.y), sz = Math.round(cam.cible.z);
  soleil.target.position.set(sx, sy, sz); soleil.position.set(sx + dirSoleil.x * 70, sy + dirSoleil.y * 70, sz + dirSoleil.z * 70);
}

function evenements() {
  for (const ev of heros.evenements) {
    if (ev === 'pas') { son.joue('pas'); if (heros.sprint) jaillit(heros.pos, 1, { v: 0.6, haut: 0.8, s: 0.8, vie: 0.35 }); }
    else if (ev === 'saut') { son.joue('saut'); jaillit(heros.pos, 5, { v: 1.6, haut: 0.7, vie: 0.4 }); }
    else if (ev === 'double') { son.joue('double'); jaillit(_p.copy(heros.pos).setY(heros.pos.y + 0.2), 8, { c: cEclat, v: 2.2, haut: -0.5, vie: 0.45, g: 0 }); }
    else if (ev === 'atterri') { son.joue('atterri'); jaillit(heros.pos, 6, { v: 2, haut: 0.8, vie: 0.4 }); }
    else if (ev === 'gros') { son.joue('gros'); jaillit(heros.pos, 14, { v: 3.4, haut: 1.4, s: 1.4, vie: 0.6 }); }
    else if (ev === 'rebond') { son.joue('rebond'); jaillit(heros.pos, 10, { c: cOrange, v: 3, haut: 2.5, vie: 0.5 }); }
    else if (ev === 'lieu') dit(heros.sur);
    else if (ev === 'chute' && !enRetour) { enRetour = 0.001; fonduCible = 1; son.joue('chute'); }
  }
  heros.evenements.length = 0;
}

/* boucle */
let avant = performance.now(), nImages = 0, cumul = 0, lents = 0;
function image(maintenant) {
  requestAnimationFrame(image);
  const brut = (maintenant - avant) / 1000; avant = maintenant;
  const dt = Math.min(0.05, Math.max(0.001, brut)); temps += dt;
  monde.maj(temps, dt);
  if (heros) {
    lireEntrees();
    if (demarre && !auto.actif && temps - dernierGeste > 14 && !fete) { auto.demarre(); majAuto(); dit('Errance', 'Mathieu explore seul, un geste et il vous revient'); }
    if (auto.actif) { auto.maj(dt, entree, cam.cap); if (entree.x || entree.y) dernierCam = Math.min(dernierCam, temps - 2); }
    if (demarre && !enRetour) heros.maj(dt, entree, cam.cap); else heros.maj(dt, { x: 0, y: 0, saut: false, sautPresse: false, sprint: false }, cam.cap);
    entree.sautPresse = false;
    evenements();
    if (enRetour) { enRetour += dt; if (enRetour > 0.32 && fonduCible === 1) { heros.retour(); cam.cible.copy(heros.pos); fonduCible = 0; } if (enRetour > 0.7) enRetour = 0; }
    if (demarre) { majPortails(); majIdees(dt); majEffets(dt); }
    pensee.maj(dt, tete.copy(heros.pos).setY(heros.pos.y + 2.05), camera);
  }
  majCristaux(dt); majParticules(dt); majCamera(dt);
  fondu += Math.sign(fonduCible - fondu) * Math.min(Math.abs(fonduCible - fondu), dt * 3.6); rendu.fondu.value = fondu * fondu * (3 - 2 * fondu) * (demarre ? 1 : 0.55);
  rendu.rendre(scene, camera);
  /* définition adaptée : si la moyenne dépasse 26 ms sur 80 images, on allège d'un cran */
  if (demarre && brut < 0.2) { cumul += brut; if (++nImages >= 80) { if (cumul / nImages > 0.026 && lents < 6) { lents++; if (!rendu.allege(camera) && soleil.shadow.mapSize.x > 1024) { soleil.shadow.mapSize.set(1024, 1024); soleil.shadow.map?.dispose(); soleil.shadow.map = null; } } nImages = 0; cumul = 0; } }
}

function lancer() {
  if (demarre || !heros) return;
  demarre = true; dernierGeste = temps; son.pret(); fonduCible = 0; cam.cap = 0.25; dernierCam = -10;
  document.body.classList.add('jeu'); canvas.focus(); dit('La pièce'); heros.sur = 'La pièce';
  setTimeout(() => $('aide').classList.add('discret'), 9000);
}
$('jouer').addEventListener('click', lancer);

addEventListener('resize', () => rendu.taille(camera));
rendu.taille(camera);
requestAnimationFrame(image);
creerPerso(scene, monde).then((h) => {
  heros = h; auto = creerAuto(monde, heros, pensee); $('jouer').disabled = false; $('jouer').textContent = 'Entrer'; fonduCible = 1;
}).catch((err) => { console.error(err); $('jouer').textContent = 'Le rêve ne répond pas'; });
window.__monde = { monde, cam, rendu, get auto() { return auto; }, get heros() { return heros; }, get pris() { return pris; }, lancer };
