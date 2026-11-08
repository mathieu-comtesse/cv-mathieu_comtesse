// La Manufacture de Nisaru : trieuse postale, presse d'imprimerie inversée, instrument de métrologie et atelier de matrices.
// Pédagogie : démonstration fictive de la lecture documentaire et de l'apprentissage supervisé. Aucune donnée réelle, aucune mesure de performance.
// Trois masses : à gauche lecture et classification, au centre la chambre de validation (la main de La Création), à droite mémoire, forge et presse.
// Contrat : build() -> { group, update(time), controls } ; WIDTH ; tout est une fonction pure du temps partagé (voir nisaru-timeline.js).
import * as THREE from 'three';
import { Part, makeMats, mergeGeos, label, lamp, setLamp, clamp, seg, ease, easeOut, lerp, at, PAL } from './nisaru-geometry.js';
import * as T from './nisaru-timeline.js';
import { makeHand, handPose } from './nisaru-hand.js';

export const WIDTH = 560;
const { LOOP_T, CHAMBER, BIN_X, Z_BELT, Z_PAGE } = T;
const TAU = Math.PI * 2;

/* ---------------- textures des pages et des fiches (contenu fictif, aucune donnée réelle) ---------------- */
function paperTex(kind, v = 0) {
  const w = kind === 'page' ? 240 : 150, h = kind === 'page' ? 170 : 200, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#f6efdc'; x.fillRect(0, 0, w, h); x.strokeStyle = '#6a6252'; x.fillStyle = '#6a6252'; x.lineWidth = 2;
  if (kind === 'page') {
    x.fillRect(12, 12, 90, 9); x.fillRect(w - 52, 12, 40, 9);
    for (let i = 0; i < 10; i++) x.fillRect(12, 34 + i * 9, 50 + ((i * 53 + v * 31) % 150), 3);
    x.strokeRect(w - 100, 80, 86, 64); x.fillStyle = '#c4b99c'; x.fillRect(w - 94, 112, 14, 26); x.fillRect(w - 74, 98, 14, 40); x.fillRect(w - 54, 120, 14, 18);
  } else {
    x.fillRect(10, 10, 60, 12); x.strokeRect(6, 6, w - 12, h - 12); x.font = '700 13px monospace'; x.fillText('FICHE DEMO', 10, 40);
    for (let i = 0; i < 6; i++) { x.fillRect(10, 56 + i * 20, 46, 3); x.fillRect(66, 56 + i * 20, 40 + ((i * 29 + v * 17) % 44), 3); }
    if (v === 'valid') { x.strokeStyle = '#2d7a4f'; x.lineWidth = 5; x.beginPath(); x.moveTo(98, 168); x.lineTo(112, 184); x.lineTo(136, 150); x.stroke(); }
    else if (v === 'fix') { x.strokeStyle = '#a5681f'; x.lineWidth = 4; x.strokeRect(62, 110, 78, 14); x.beginPath(); x.moveTo(62, 138); x.lineTo(140, 138); x.stroke(); }
    else if (v === 'reject') { x.strokeStyle = '#9b3a30'; x.lineWidth = 5; x.beginPath(); x.moveTo(98, 150); x.lineTo(134, 184); x.moveTo(134, 150); x.lineTo(98, 184); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function build() {
  const g = new THREE.Group(), M = makeMats();
  const parts = [];                                   // tous les Part, pour compter les pièces
  const zones = {}; let cz = 'base';                  // zones d'inspection : chaque masse se désolidarise en mode éclaté
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const A = (...o) => o.forEach((m) => zoneGroup(cz).add(m));
  const zstat = (n) => { cz = n; const p = new Part('chassis ' + n, M); p.zone = n; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const glow = (c) => new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: c, emissiveIntensity: 0, roughness: .4, metalness: 0 });
  let S = zstat('base');

  /* ================= bâti commun ================= */
  S.box(35, 0, 3, 560, 178, 6, 'iron', 1.4);
  for (const [x, y] of [[-238, -84], [308, -84], [-238, 84], [308, 84]]) S.cylZ(x, y, -4, 5, 4, 'graphite', 14);
  S.box(35, 87, 7, 540, 4, 2, 'steelDk');
  for (let i = 0; i < 108; i++) S.box(-232 + i * 5, 85.2, 8.2, .5, .6, i % 5 === 0 ? 2.2 : 1.2, 'steel');                     // règle graduée
  for (const [x, y] of [[-232, -80], [302, -80], [-232, 80], [302, 80]]) S.bolts([[x, y, 6.4]], 'z', 1.4);
  S.box(120, -86, 12, 90, 3, 12, 'bronze', .5);                                                                                  // plaque de constructeur au dos

  /* ================= masse gauche : lecture et classification ================= */
  S = zstat('lecture');
  // chargeur d'entrée : trémie, deux flasques, plateau de pages en attente, rouleau d'entraînement
  S.box(-224, 0, 54, 18, 24, 3, 'graphite', .6);
  for (const y of [-12.5, 12.5]) S.box(-224, y, 62, 18, 1.4, 14, 'steel', .4);
  S.box(-232, 0, 63, 2, 24, 16, 'graphite', .5);
  for (let i = 0; i < 4; i++) S.box(-224, 0, 56.3 + i * .4, 22, 15.6, .3, 'paperEdge');
  S.cylY(-9, 9, -213, 56.6, 1.6, 'steelDk', 18);
  S.box(-224, 0, 29, 12, 12, 48, 'iron', .6);
  // piste de transport : deux rails, montants, rouleaux de guidage (tournent à vitesse d'avance)
  for (const y of [-11.5, 11.5]) { S.box(-146, y, 55, 150, 1.8, 1.8, 'steel', .4); }
  for (let i = 0; i < 7; i++) for (const y of [-11.5, 11.5]) S.cylZ(-216 + i * 24, y, 6, 1.1, 49, 'iron', 10);
  const hex = (r, len) => new THREE.CylinderGeometry(r, r, len, 6).rotateX(Math.PI / 2);
  const rollerPool = [];
  const roller = (x, y, z, r, len, key = 'steelDk') => { const m = new THREE.Mesh(hex(r, len), M[key]); at(m, x, y, z); m.userData.noGlow = true; m.castShadow = true; A(m); rollerPool.push(m); S.count++; return m; };
  for (let i = 0; i < 10; i++) roller(-210 + i * 14, 0, Z_PAGE - 1.2, 1.2, 18);
  // trois organes de lecture (portiques)
  const arch = (x, name) => {
    S.box(x, 0, 94, 26, 34, 3.2, 'graphite', .8); S.box(x, 0, 6.6, 30, 36, 1.2, 'steelDk', .4);
    for (const sx of [-11, 11]) for (const y of [-15.5, 15.5]) S.box(x + sx, y, 50, 3, 3, 86, 'iron', .5);
    for (const y of [-15.5, 15.5]) S.cylY(y - 1.2, y + 1.2, x, 72, 3.2, 'bronze', 14);
    S.bolts([[x - 10, -15, 95.8], [x + 10, -15, 95.8], [x - 10, 15, 95.8], [x + 10, 15, 95.8]], 'z', 1); S.add(label(name, x, 17.3, 94, 22, 3.4, 'y', { w: 256, h: 40 }));
  };
  arch(T.STATION_X.layout, 'LAYOUTLMV3'); arch(T.STATION_X.distil, 'DISTILBERT'); arch(T.STATION_X.mini, 'MINI BERT');
  // 1. tambour optique (LayoutLMv3) : tambour à fenêtres, lentille, barre de balayage lumineuse sous la page
  const drumL = mover('tambour optique', [T.STATION_X.layout, 0, 72]);
  drumL.cylY(-11, 11, T.STATION_X.layout, 72, 8.4, 'bronze', 32).cylY(-12.5, 12.5, T.STATION_X.layout, 72, 2, 'steel', 14);
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; drumL.box(T.STATION_X.layout + Math.cos(a) * 9, 0, 72 + Math.sin(a) * 9, 3, 17, 1.4, 'brass', .3); }
  for (const y of [-12, 12]) drumL.cylY(y - 1, y + 1, T.STATION_X.layout, 72, 3, 'steelDk', 14);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, .8, 8, 26), M.glass); ring.rotation.x = Math.PI / 2; at(ring, T.STATION_X.layout, -16.5, 72); ring.userData.noGlow = true; A(ring);
  const scanM = glow(PAL.blue), scan = new THREE.Mesh(new THREE.BoxGeometry(24, .5, .8), scanM); scan.userData.noGlow = true; A(scan);
  // 2. tambour sélecteur (DistilBERT) : nervures de sélection et bandeau de jetons
  const drumD = mover('tambour selecteur', [T.STATION_X.distil, 0, 72]);
  drumD.cylY(-10, 10, T.STATION_X.distil, 72, 7, 'graphite', 32).cylY(-12.5, 12.5, T.STATION_X.distil, 72, 1.8, 'steel', 14);
  for (let i = 0; i < 18; i++) { const a = i * TAU / 18; drumD.box(T.STATION_X.distil + Math.cos(a) * 7.6, 0, 72 + Math.sin(a) * 7.6, 1.2, 16, 1.6, i % 3 === 0 ? 'brass' : 'steel', .2); }
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .2; drumD.box(T.STATION_X.distil + Math.cos(a) * 8.6, 0, 72 + Math.sin(a) * 8.6, 2.2, 5, 1, 'ceramic', .2); }
  const tokM = glow(PAL.amber), tok = new THREE.Mesh(new THREE.BoxGeometry(18, .5, 1.1), tokM); tok.userData.noGlow = true; A(tok);
  // 3. matrice à verrous (Mini BERT) : plaque, 6 x 4 verrous, tiroir de page
  S.box(T.STATION_X.mini, 0, 70, 24, 18, 2.2, 'graphite', .5);
  const latchGeo = new THREE.CylinderGeometry(.9, .9, 4, 10), latchM = glow(PAL.green), latches = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(latchGeo, M.brass); at(m, T.STATION_X.mini - 9 + i * 3.6, -5.4 + j * 3.6, 66.8); m.userData.noGlow = true; m.castShadow = true; A(m); latches.push(m); S.count++; }
  const miniLamp = lamp(T.STATION_X.mini + 11, 17.2, 80, 1.1, PAL.green); A(miniLamp);
  const layLamp = lamp(T.STATION_X.layout + 11, 17.2, 80, 1.1, PAL.blue); A(layLamp);
  const disLamp = lamp(T.STATION_X.distil + 11, 17.2, 80, 1.1, PAL.amber); A(disLamp);
  // tour de rangement : magasin de pages fermé en haut, imprimerie inversée en bas (émet les fiches)
  const tx = -83;
  S.box(tx - 13, 0, 63, 2, 28, 22, 'ceramic', .5); S.box(tx - 13, 0, 53.3, 2, 28, 3.4, 'ceramic', .5); S.box(tx - 13, 0, 56, 2, 28, 4, 'ceramic', .5);
  S.box(tx + 1, -13, 63, 26, 2, 22, 'ceramic', .5); S.box(tx + 1, 13, 63, 26, 2, 22, 'ceramic', .5); S.box(tx + 1, 0, 74.8, 28, 28, 2.4, 'ceramic', .6); S.box(tx + 14, 0, 63, 2, 28, 22, 'ceramic', .5);
  S.box(tx + 1, 0, 56.4, 26, 26, 1.6, 'graphite');
  S.box(tx - 1, 0, 27, 28, 28, 42, 'graphite', .8); S.box(tx - 1, 0, 49.4, 30, 30, 1.4, 'steelDk', .4);
  S.box(tx + 14, 0, 40.4, 3, 28, 18.6, 'iron', .5); S.box(tx + 14, 0, 54.2, 3, 28, 2, 'iron', .5);
  S.add(label('MAGASIN', tx + 1, 14.2, 66, 18, 5, 'y')); S.add(label('IMPRIMERIE', tx - 1, 15.1, 30, 22, 5, 'y'));
  S.box(tx + 9, 14.9, 40, 5, .8, 5, 'brass', .2); const pressLamp = lamp(tx + 9, 15.2, 40, 1.2, PAL.amber); A(pressLamp);
  S = zstat('trieuse');
  // trieuse : plateau de rouleaux, glissières, cinq trappes, cinq bacs à façade vitrée, rouleau de sortie
  for (const y of [-9.4, 9.4]) S.box(-26, y, 50, 98, 1.2, 4.4, 'steel', .4);
  const doors = [];
  const sorterRollers = [];
  for (let x = -66; x <= 14; x += 4) {
    if (BIN_X.some((bx) => Math.abs(x - bx) < 6.2)) continue;
    sorterRollers.push(roller(x, 0, Z_BELT - .8, 1, 17));
  }
  for (let k = 0; k < 5; k++) {
    const bx = BIN_X[k], d = mover('trappe ' + k, [bx + 5.5, 0, Z_BELT - 1.1]);
    d.box(bx, 0, Z_BELT - 1.1, 11, 16.6, 1, 'steel', .3).box(bx, 0, Z_BELT - 1.55, 8, 12, .5, 'bronze');
    d.cylY(-9, 9, bx + 5.5, Z_BELT - 1.1, .9, 'steelDk', 10); doors.push(d);
    S.box(bx - 6.5, 0, 29, .8, 19, 37, 'ceramic', .3); S.box(bx, 0, 29, 11, 1.2, 37, 'ceramic', .3).box(bx, -9.2, 29, 11, 1, 37, 'ceramic');
    S.box(bx, 10.1, 31, 10.4, .6, 30, 'glass'); S.add(label(T.BIN_NAMES[k], bx, 10.6, 44, 10.2, 3, 'y', { w: 160, h: 48 }));
    const f = mover('plancher ' + k, [bx + 4.8, 0, 8.1]); f.box(bx, 0, 8.1, 9.6, 17, .9, 'graphite', .2); doors.push(f);
  }
  S.box(BIN_X[4] + 6.5, 0, 29, .8, 19, 37, 'ceramic', .3);
  S.box(-26, 0, 7.5, 90, 21, 1.6, 'iron');
  for (let i = 0; i < 12; i++) S.box(-66 + i * 7.6, -10.2, 49.6, 1, 1, 1.5, 'steelDk');
  const trapLamps = BIN_X.map((bx) => { const l = lamp(bx, 10.2, 50, .8, PAL.amber); A(l); return l; });
  S.box(19, 0, 47.4, 4, 17, 3.4, 'graphite', .4); roller(18, 0, Z_BELT - .8, 1.4, 17);

  /* ================= centre : la chambre de validation ================= */
  S = zstat('chambre');
  S.box(68, 0, 20, 84, 52, 4, 'iron', 1);
  for (const [x, y] of [[28, -23], [28, 23], [108, -23], [108, 23]]) { S.cylZ(x, y, 22, 1.8, 28, 'steel', 14); S.cylZ(x, y, 50, 2.6, 2.4, 'steelDk', 14); }
  S.box(68, -23, 50.4, 84, 3, 2.4, 'graphite', .6); for (const x of [28, 108]) S.box(x, 0, 50.4, 3, 46, 2.4, 'graphite', .6);
  S.box(64, 0, 24.6, 28, 22, 2.2, 'ceramic', .5);
  const lightM = new THREE.MeshStandardMaterial({ color: '#d8e6f2', emissive: '#e9f3ff', emissiveIntensity: .05, roughness: .5 }), light = new THREE.Mesh(new THREE.BoxGeometry(24, .4, 18), lightM); at(light, 64, 0, 26); light.userData.noGlow = true; A(light);
  for (const y of [-14, 14]) S.box(66, y, 27.6, 80, 1.6, 1.6, 'steel', .4);
  S.add(label('TABLE LUMINEUSE', 64, 12.4, 25.5, 24, 3.6, 'y'));
  for (let x = 32; x <= 100; x += 4) S.box(x, 21.6, 22.3, .5, .6, x % 8 === 0 ? 1.4 : .8, 'steel');
  // chariot de la chambre : cadre, patins, rouleaux
  const car = mover('chariot', [0, 0, 0]);
  car.box(0, -8, 29.7, 14, 1.6, 1.2, 'bronze', .3).box(0, 8, 29.7, 14, 1.6, 1.2, 'bronze', .3).box(-6.2, 0, 29.7, 1.6, 16, 1.2, 'bronze', .3).box(6.2, 0, 29.7, 1.6, 16, 1.2, 'bronze', .3);
  for (const y of [-14, 14]) car.box(0, y, 29.2, 8, 3, 1.4, 'steelDk', .3);
  car.box(0, -14, 30, 2, 1, .6, 'steel'); car.box(0, 14, 30, 2, 1, .6, 'steel');
  // plateau basculant (rejet) : bascule autour du bord avant du chariot
  const tray = mover('plateau basculant', [0, 8, 30]);
  tray.box(0, -2, 30, 11, 14, .5, 'ceramic', .2).cylX(-6, 6, 8.6, 30, .8, 'steelDk', 10);
  // loupe : bras en console depuis le montant du fond, anneau de verre
  S.box(54, -22, 40, 6, 3, 18, 'iron', .5).box(54, -14, 48.4, 6, 18, 2, 'iron', .5).cylZ(62, -8, 38, 1, 11, 'steelDk', 10);
  const lens = mover('loupe', [62, -8, 38]);
  lens.cylZ(62, -8, 38.8, 4.8, .8, 'brass', 26).cylZ(62, -8, 40.2, 4.8, .8, 'steel', 26);
  const lensGlass = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, .5, 26), M.glass); at(lensGlass, 62, -8, 39.8); lensGlass.userData.noGlow = true; lens.add(lensGlass);
  // tête de correction : stylet sur un rail transversal
  const head = mover('tete de correction', [58, 0, 40]);
  head.box(58, 0, 44, 4, 4, 3, 'graphite', .5).cylZ(58, 0, 36, .6, 8, 'brass', 8).cylZ(58, 0, 35.2, 1.1, 1.2, 'bronze', 8);
  S.box(58, 0, 47.4, 4, 40, 1.6, 'steel', .3);
  // plateau de réception des fiches validées et bac des rejets
  S.box(110, 0, 25.4, 14, 18, 2, 'ceramic', .5); for (const y of [-9.6, 9.6]) S.box(110, y, 28.6, 14, .8, 6, 'steelDk');
  S.box(52, 52, 8.6, 22, 20, 3, 'iron', .5);
  for (const [x, y] of [[41.5, 42], [62.5, 42], [41.5, 62], [62.5, 62]]) S.box(x, y, 14, 1.2, 1.2, 12, 'iron');
  S.box(52, 62.4, 14.4, 22, 1, 12, 'ceramic'); S.box(52, 41.6, 14.4, 22, 1, 8, 'ceramic');
  S.add(label('REJET', 52, 63.1, 17, 14, 3.6, 'y'));
  { const ch = new THREE.BoxGeometry(14, .8, 40).rotateX(.4); S.geo('steelDk', ch, 58, 24, 22); }
  const deskLamp = lamp(30, 24.4, 30, 1.1, PAL.green); A(deskLamp);
  // zone d'annotation : trois traits gravés sur la table, le registre de réception
  S.add(label('ZONE', 70, 12.1, 26.4, 6, 2.4, 'y', { w: 96, h: 40 }));

  /* ================= masse droite : mémoire partagée ================= */
  S = zstat('memoire');
  // registre rotatif : deux flasques, noyau, huit cassettes, voyants
  const reg = mover('registre', [T.REG.x, 0, T.REG.z]);
  for (const y of [-11, 11]) reg.cylY(y - .8, y + .8, T.REG.x, T.REG.z, 28, 'graphite', 48).cylY(y - 1, y + 1, T.REG.x, T.REG.z, 9, 'bronze', 24);
  reg.cylY(-10, 10, T.REG.x, T.REG.z, 21, 'iron', 36).cylY(-14, 14, T.REG.x, T.REG.z, 3.4, 'steel', 18);
  const cass = [];
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8, cx = T.REG.x + Math.cos(a) * 24.5, cz = T.REG.z + Math.sin(a) * 24.5;
    const bg = new THREE.BoxGeometry(5.2, 16.4, 8.4); bg.rotateZ(a); reg.geo('ceramic', bg.rotateX(-Math.PI / 2).rotateX(Math.PI / 2), cx, 0, cz);
    reg.box(cx + Math.cos(a) * 2.6, 0, cz + Math.sin(a) * 2.6, .6, 12, .6, 'brass'); cass.push(k); }
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; reg.cylY(-13, -11.4, T.REG.x + Math.cos(a) * 15, T.REG.z + Math.sin(a) * 15, 1.5, 'steelDk', 8); }
  for (const x of [T.REG.x - 30, T.REG.x + 30]) S.box(x, 0, 40, 6, 28, 70, 'iron', .6);
  S.box(T.REG.x, 0, 8.6, 74, 30, 5, 'iron', .8).box(T.REG.x, 0, 10, 20, 4, 8, 'graphite');
  for (const y of [-16, 16]) { S.box(T.REG.x, y, 58, 8, 3, 8, 'iron', .5); S.cylY(y - 1.4, y + 1.4, T.REG.x, T.REG.z, 4.2, 'steelDk', 18); }
  S.box(T.REG.x, 0, 92.4, 18, 8, 2, 'steelDk', .4);
  S.add(label('MEMOIRE PARTAGEE', T.REG.x, 17.6, 27, 34, 5.4, 'y'));
  const regLamps = [0, 1].map((i) => { const l = lamp(T.REG.x - 5 + i * 10, 12.3, 84, 1.1, PAL.green); A(l); return l; });
    // distributeur de la presse et rampe de sortie du registre
  S.box(169, 8, 23, 14, 22, 10, 'graphite', .8); S.box(169, 8, 28.4, 16, 24, 1.2, 'steelDk', .4); S.box(169, 19.4, 25, 12, 1.2, 8, 'iron');

  S = zstat('forge');
  /* ================= forge des modèles : tambour de matrices, portique, aiguilles, magasin de versions, banc d'essai, verrou ================= */
  const FX = T.FORGE.x, FR = 12, BASEH = (i) => 1 + .35 * T.cassettePattern(i + 100);
  const rail = (y) => { S.box(FX, y, 24, 70, 5, 3, 'steel', .5); };
  rail(T.FORGE.yCand); rail(T.FORGE.yServ); rail(T.FORGE.yMag);
  S.box(FX, -48, 12, 120, 100, 12, 'iron', 1.2); S.box(FX, -48, 20, 108, 90, 4, 'graphite', .8);
  for (const x of [FX - 54, FX + 54]) { S.box(x, -46, 78, 6, 94, 4, 'iron', .6); for (const y of [-92, -4]) S.box(x, y, 62, 6, 6, 104, 'iron', .6); }
  S.box(FX, -92, 112, 114, 6, 4, 'iron', .6).box(FX, -4, 112, 114, 6, 4, 'iron', .6);
  // magasin de versions (étagère arrière) : trois alvéoles, étiquettes de version
  for (let k = 0; k < 3; k++) S.add(label('V' + (k + 1), FX - 24 + k * 24, T.FORGE.yMag + 14.2, 30, 10, 3, 'y', { w: 120, h: 48 }));
  S.box(FX, T.FORGE.yMag, 23.4, 70, 22, 1.6, 'bronze', .4);
  S.box(FX, -94.6, 72, 112, 1.2, 80, 'graphite', .6);
  // tambours : actif (A) et candidat (C), même constructeur de matrice
  const makeDrum = (name, y0, base) => {
    const d = mover(name, [FX, y0, 0]);
    d.cylX(FX - 20, FX + 20, y0, 0, FR, 'iron', 36).cylX(FX - 28, FX + 28, y0, 0, 2.2, 'steel', 12);
    for (const sg of [-1, 1]) d.cylX(FX + sg * 19 - .8, FX + sg * 19 + .8, y0, 0, FR + 1.2, 'bronze', 36);
    /* une colonne de 12 picots = un seul maillage ; la hauteur de la colonne porte le motif de la matrice */
    const cols = [];
    for (let i = 0; i < 20; i++) {
      const gs = [];
      for (let j = 0; j < 12; j++) { const a = j * TAU / 12; const pg = new THREE.CylinderGeometry(.55, .55, 3, 6); pg.translate(0, 1.5 + FR, 0); pg.rotateZ(0); const q = new THREE.Matrix4().makeRotationX(-a); pg.applyMatrix4(q); gs.push(pg); }
      const m = new THREE.Mesh(mergeGeos(gs), base === 'A' ? M.brass : M.steel); m.position.set(-16 + i * 1.7, 0, 0); m.userData.noGlow = true; m.castShadow = true;
      m.scale.y = m.scale.z = BASEH(i); d.root.add(m); cols.push(m); d.count += 12;
    }
    const pins = cols;
    return { d, pins };
  };
  const dA = makeDrum('tambour actif', T.FORGE.yServ, 'A'), dC = makeDrum('tambour candidat', T.FORGE.yCand, 'C');
  // portique à aiguilles, chariot de réglage de tête, banc d'essai, verrou
  const gan = mover('portique', [FX, 0, 100]);
  gan.box(FX, -22, 104, 62, 5, 4, 'steel', .6).box(FX, -22, 98, 62, 3, 6, 'graphite').box(FX, -22, 96, 5, 6, 6, 'bronze', .5);
  for (let i = 0; i < 7; i++) gan.cylZ(FX - 24 + i * 8, -22, 78, .5, 14, 'steelDk', 6).cylZ(FX - 24 + i * 8, -22, 74.4, .9, 3.4, 'brass', 6);
  const needle = mover('aiguilles', [FX, -22, 0]);
  S.box(FX - 29, -22, 90, 3, 5, 44, 'iron', .5).box(FX + 29, -22, 90, 3, 5, 44, 'iron', .5);
  S.box(FX + 22, -63, 29, 22, 22, 10, 'ceramic', .5);                                                                     // banc d'essai
  const benchF = [0, 1].map(() => { const d = mover('cadran', [FX + 18, -63, 38]); return d; });
  for (let i = 0; i < 2; i++) { const cx = FX + 15 + i * 14; S.cylY(-74.4, -73.5, cx, 40, 5.4, 'steel', 28); S.box(cx, -73.6, 40, 8, .4, .4, 'bronze'); }
  const needleF = [0, 1].map((i) => { const cx = FX + 15 + i * 14, m = new THREE.Mesh(new THREE.BoxGeometry(.5, 4.4, .3), M.rubber); m.userData.noGlow = true; m.geometry.translate(0, 2.2, 0); at(m, cx, -74.8, 40); A(m); return m; });
  const lock = mover('verrou', [FX - 38, -48, 60]); lock.box(FX - 38, -48, 60, 5, 12, 4, 'brass', .5);
  S.box(FX - 44, -48, 56, 4, 14, 22, 'iron', .5); S.cylY(-42, -38, FX - 38, 60, 2.6, 'steelDk', 14);
  const forgeLamps = [0, 1, 2, 3, 4, 5].map((i) => { const l = lamp(FX - 15 + i * 6, -93.4, 104, 1.1, [PAL.blue, PAL.blue, PAL.amber, PAL.amber, PAL.green, PAL.green][i], 'y'); A(l); return l; });
  S.add(label('FORGE DES MODELES', FX, -93.6, 96, 52, 5.4, 'y'));
  // portique : le seuil de réentraînement profond ne se lève jamais pour une simple correction (voir timeline)

  S = zstat('presse');
  /* ================= presse de restitution ================= */
  const PX = T.PRESS.x, PY = T.PRESS.y;
  S.box(PX, PY, 12, 40, 36, 12, 'iron', 1).box(PX, PY, 20.4, 28, 22, 1.4, 'steelDk', .4).box(PX, PY, 18.4, 30, 24, 2.4, 'graphite', .5);
  for (const [x, y] of [[PX - 17, PY - 14], [PX + 17, PY - 14], [PX - 17, PY + 14], [PX + 17, PY + 14]]) S.cylZ(x, y, 22, 1.8, 34, 'steel', 14);
  S.box(PX, PY - 14, 58, 36, 3, 4, 'iron', .5).box(PX, PY + 14, 58, 36, 3, 4, 'iron', .5);
  const platen = mover('platine', [PX, PY, 50]); platen.box(PX, PY, 46, 24, 22, 4, 'bronze', .6).cylZ(PX, PY, 48, 2, 10, 'steel', 14);
  for (const x of [PX - 6, PX + 6]) platen.cylY(PY - 12, PY + 12, x, 42, 1.6, 'steelDk', 10);
  S.box(PX + 28, PY, 14, 14, 20, 8, 'ceramic', .5); S.box(PX + 28, PY, 18.6, 15, 21, 1, 'steelDk');                         // bac d'export
  S.box(PX + 34.6, PY, 22, 1.4, 22, 14, 'ceramic', .4).box(PX + 28, PY + 10.6, 22, 14, 1.2, 14, 'ceramic', .4).box(PX + 28, PY - 10.6, 22, 14, 1.2, 14, 'ceramic', .4).box(PX + 28, PY, 29.4, 14, 22, 1.2, 'ceramic', .4);
  S.add(label('RESTITUTION', PX, PY + 18.4, 12, 30, 5.4, 'y')); S.add(label('EXPORT', PX + 28, PY + 11.4, 22, 12, 4, 'y'));
  for (let i = 0; i < 2; i++) roller(PX - 12 + i * 24, PY, 22.4, 1.1, 20);

  /* ================= chemin des pages et des fiches ================= */
  const pageGeo = new THREE.BoxGeometry(T.PAGE.l, .25, T.PAGE.w), ficheGeo = new THREE.BoxGeometry(T.FICHE.l, .2, T.FICHE.w);
  const edge = M.paperEdge, pageTex = [...Array(T.NP)].map((_, i) => paperTex('page', i));
  const pages = pageTex.map((t) => { const m = new THREE.Mesh(pageGeo, [edge, edge, new THREE.MeshStandardMaterial({ map: t, roughness: .9 }), edge, edge, edge]); m.userData.noGlow = true; m.castShadow = true; g.add(m); return m; });
  const ficheTex = { plain: [0, 1, 2, 3, 4, 5].map((i) => paperTex('fiche', i)), valid: paperTex('fiche', 'valid'), fix: paperTex('fiche', 'fix'), reject: paperTex('fiche', 'reject') };
  const ficheMats = [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial({ map: ficheTex.plain[i], roughness: .9 }));
  const fiches = ficheMats.map((mt) => { const m = new THREE.Mesh(ficheGeo, [edge, edge, mt, edge, edge, edge]); m.userData.noGlow = true; m.castShadow = true; g.add(m); return m; });
  const outSheets = [0, 1].map(() => { const m = new THREE.Mesh(ficheGeo, [edge, edge, new THREE.MeshStandardMaterial({ map: ficheTex.valid, roughness: .9 }), edge, edge, edge]); m.userData.noGlow = true; g.add(m); return m; });
  const place = (obj, p) => { obj.visible = p.vis; if (!p.vis) return; at(obj, p.x, p.y, p.z); obj.rotation.set(0, 0, -p.pitch); };

  /* ================= la main de La Création ================= */
  const hand = makeHand(); g.add(hand.group, hand.spark);

  /* ================= finalisation ================= */
  car.root.add(tray.done());                          /* le plateau basculant suit le chariot */
  for (const p of parts) if (p !== tray) zoneGroup(p.zone).add(p.done());
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + pages.length + fiches.length + 1;

  /* gate de rotation des rouleaux : ils s'arrêtent quand la main touche (la machine marque une pause presque totale) */
  const N = 4000, cum = new Float32Array(N + 1);
  { const holdW = (s) => { let h = 0; for (let j = 0; j < 3; j++) { const tc = T.TC[j]; h = Math.max(h, ease(seg(s, tc - 1.5, tc - .8)) * (1 - ease(seg(s, tc + 2.6, tc + 3.4)))); } return 1 - .94 * h; };
    for (let i = 1; i <= N; i++) cum[i] = cum[i - 1] + holdW(i / N * LOOP_T); }
  const run = (s) => { const u = clamp(s / LOOP_T) * N, i = Math.min(N - 1, Math.floor(u)); return (cum[i] + (cum[i + 1] - cum[i]) * (u - i)) / cum[N]; };

  /* inspection : les masses s'écartent le long de directions fixes (mode éclaté) ; le papier et la main s'effacent pendant l'écart */
  const ZOFF = { base: [0, 0, -12], lecture: [-50, 0, 8], trieuse: [-10, 0, 30], chambre: [0, 6, 42], memoire: [48, 0, 26], forge: [60, -30, 18], presse: [40, 50, 12] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { hand: new THREE.Object3D(), forge: new THREE.Object3D(), all: new THREE.Object3D() };
  at(anchors.hand, T.DESK_C[0] + 9, T.DESK_C[1] + 6, T.DESK_C[2] + 12); at(anchors.forge, FX, -40, 56); at(anchors.all, 35, 0, 40);
  for (const o of Object.values(anchors)) g.add(o);
  const go = (p, dx = 0, dy = 0, dz = 0) => at(p.root, p.o[0] + dx, p.o[1] + dy, p.o[2] + dz);
  /* modes de lecture : le cycle détaillé de 130 s reste la référence ; la séquence courte (environ 50 s) rejoue la même chronologie en avance rapide entre les temps forts
     et ralentit sur le cycle humain choisi (validation, correction ou rejet). Rien n'est recalculé : seul le temps lu par la chronologie change. */
  anchors.register = new THREE.Object3D(); at(anchors.register, T.REG.x, 0, 58); g.add(anchors.register);
  let shortJ = -1;
  const segs = (j) => { const b = T.B[j], e = Math.min(b + 15, 80); return [[0, 14, 2.6], [14, 30, 2.6], [30, b, 3], [b, e, 1], [e, 80, 5], [80, 92, 3], [92, 112, 2.6], [112, 130, 2.6]].filter(([x, y]) => y > x); };
  const SEGS = [0, 1, 2].map(segs), DUR = SEGS.map((sg) => sg.reduce((a, [x, y, v]) => a + (y - x) / v, 0));
  const toS = (time, j) => { let t = ((time % DUR[j]) + DUR[j]) % DUR[j]; for (const [x, y, v] of SEGS[j]) { const d = (y - x) / v; if (t < d) return x + t * v; t -= d; } return 0; };
  const toTime = (sv, j) => { let t = 0; for (const [x, y, v] of SEGS[j]) { if (sv < y) return t + Math.max(0, sv - x) / v; t += (y - x) / v; } return t; };
  const sOf = (time) => (shortJ < 0 ? T.wrap(time) : toS(time, shortJ));
  function update(time) {
    const s = sOf(time), u = run(s);
    { const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now; inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
      for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); } }
    rollerPool.forEach((r, i) => { r.rotation.z = -TAU * (i % 2 ? 6 : 8) * u; });          /* un nombre entier de tours par boucle */
    for (let i = 0; i < T.NP; i++) place(pages[i], T.pageTracks[i](s));
    /* organes de lecture : chacun s'active quand une page est sous lui */
    const aL = T.actAny('layout', s), aD = T.actAny('distil', s), aM = T.actAny('mini', s);
    drumL.root.rotation.z = -TAU * 2 * u - aL * 1.6; drumD.root.rotation.z = TAU * 3 * u + aD * 1.3;
    { const w = T.winNow('layout', s); scan.visible = w.i >= 0; if (scan.visible) { at(scan, T.STATION_X.layout, lerp(-8, 8, w.u), Z_PAGE + .7); scanM.emissiveIntensity = 2 * aL; } }
    { const w = T.winNow('distil', s); tok.visible = w.i >= 0; if (tok.visible) { at(tok, T.STATION_X.distil, lerp(-8, 8, w.u), Z_PAGE + .7); tokM.emissiveIntensity = 2 * aD; } }
    { const w = T.winNow('mini', s), pg = w.i; latches.forEach((m, k) => { const bit = ((Math.imul(k + 3, 2654435761 + 97 * (pg + 2)) >>> 14) & 1); m.position.y = Z_PAGE + 3.6 + (pg >= 0 ? bit * 1.6 * aM : 0); }); }
    setLamp(layLamp, aL); setLamp(disLamp, aD); setLamp(miniLamp, aM);
    /* fiches émises par l'imprimerie, puis triées ou conduites à la chambre */
    setLamp(pressLamp, T.fichePoses.reduce((a, _, i) => Math.max(a, ease(seg(s, T.tf(i) - 1.1, T.tf(i) - .6)) * (1 - ease(seg(s, T.tf(i) + .6, T.tf(i) + 1.1)))), 0));
    for (let i = 0; i < 6; i++) { place(fiches[i], T.fichePoses[i](s)); if (i >= 3) ficheMats[i].map = s >= T.TC[i - 3] ? ficheTex[T.OUTCOME[i - 3]] : ficheTex.plain[i]; }
    /* trappes des bacs : ouvertes à l'arrivée de la fiche, puis refermées */
    for (let k = 0; k < 5; k++) {
      let v = 0; for (let i = 0; i < 3; i++) if (T.FDEST[i] === k) { const w = T.trapdoorWindow(i); v = Math.max(v, ease(seg(s, w[0], w[0] + .5)) * (1 - ease(seg(s, w[1] - .5, w[1])))); }
      doors[2 * k].root.rotation.z = -v * 1.35; setLamp(trapLamps[k], v);
      const fl = ease(seg(s, LOOP_T - 11, LOOP_T - 9.5)) * (1 - ease(seg(s, LOOP_T - 3, LOOP_T - 1.5)));
      doors[2 * k + 1].root.rotation.z = (T.FDEST.includes(k) ? fl : 0) * 1.45;               /* planchers : vidange en fin de boucle */
    }
    /* chambre */
    const c = T.chamber(s);
    go(car, c.x); tray.root.rotation.x = c.tilt * .5;
    go(lens, 0, 0, (1 - c.lens) * 14);
    go(head, 0, T.headSweep(s) * c.head, (1 - c.head) * 26);
    lightM.emissiveIntensity = .05 + 1.5 * c.deskLight; setLamp(deskLamp, c.deskLight);
    /* la main : approche lente, contact, geste propre à l'issue */
    let hp = null; for (let j = 0; j < 3 && !hp; j++) hp = handPose(s, T.TC[j], T.OUTCOME[j], T.DESK_C);
    hand.group.visible = !!hp;
    if (hp) { hand.setTip(...hp.tip); hand.setAlpha(hp.alpha); hand.flash(hp.press, hp.kind); } else hand.spark.visible = false;
    /* mémoire partagée */
    const r = T.register(s); reg.root.rotation.z = -r.ang; regLamps.forEach((l, i) => setLamp(l, r.count > i ? 1 : 0));
    /* forge */
    const f = T.forge(s); forgeLamps.forEach((l, i) => setLamp(l, f.lamps[i]));
    const lift = (w) => Math.sin(Math.PI * w) * 5;
    go(dA.d, 0, 0, 0); at(dA.d.root, FX, lerp(T.FORGE.yServ, T.FORGE.yMag, f.swapA), T.FORGE.zLow + lift(f.swapA));
    at(dC.d.root, FX, lerp(T.FORGE.yCand, T.FORGE.yServ, f.swapB), T.FORGE.zLow + lift(f.swapB));
    dC.d.root.rotation.x = f.train * TAU * 2 + f.head * .5 * (1 - ease(seg(s, 125, 129))); dA.d.root.rotation.x = f.swapA * TAU * .5;
    const mix = T.patternMix(s); dC.pins.forEach((m, i) => { m.scale.y = m.scale.z = lerp(BASEH(i), 1 + .55 * T.cassettePattern(i), mix); });
    const stroke = f.train > 0 && f.train < 1 ? Math.abs(Math.sin(f.train * Math.PI * 10)) : f.head > 0 && f.head < 1 ? .22 * Math.sin(f.head * Math.PI) : 0;
    go(gan, Math.sin(f.train * TAU * 2) * 5 * (f.train > 0 && f.train < 1 ? 1 : 0), 0, -21 * stroke);
    needleF.forEach((n, i) => { const b = T.bench(s); n.rotation.z = 1.1 - (i ? b.u1 : b.f1) * 2.2; });
    go(lock, 0, f.lockOpen * 8, 0);
    const pr = T.press(s); go(platen, 0, 0, -21.4 * pr.platen);
    for (let n = 0; n < 2; n++) place(outSheets[n], T.outTrack[n](s));
    if (inspect.v > .02) { pages.forEach((q) => { q.visible = false; }); fiches.forEach((q) => { q.visible = false; }); outSheets.forEach((q) => { q.visible = false; }); hand.group.visible = false; hand.spark.visible = false; }
  }
  update(0);
  return {
    group: g, update, count,
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'La main', anchor: 'hand' }, { label: 'La forge', anchor: 'forge' }, { label: 'Le registre', anchor: 'register' }],
      scenarios: [{ id: 'valid', short: 'Court : validation', label: 'Séquence courte, validation' }, { id: 'fix', short: 'Court : correction', label: 'Séquence courte, correction' }, { id: 'reject', short: 'Court : rejet', label: 'Séquence courte, rejet' }],
      setScenario(i) { shortJ = i == null ? -1 : ((i % 3) + 3) % 3; }, get scenario() { return shortJ < 0 ? null : shortJ; }
    },
    controls: { label: 'Étape', min: 1, max: 9, step: 1, fmt: (v) => v + ' : ' + T.STEPS[v - 1], get: (t) => T.stationAt(sOf(t)) + 1, seek: (v) => (shortJ < 0 ? T.TS[v - 1] + 1.5 : toTime(T.TS[v - 1] + 1.5, shortJ)) }
  };
}
