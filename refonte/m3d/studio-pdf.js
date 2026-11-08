// STUDIO D'EXTRACTEURS PDF : atelier qui fabrique une autre machine.
// Un exemple de PDF est posé sur la table lumineuse ; un portique place trois cadres de détection (un par champ) ; une tête de découpe taille un gabarit
// à la même position ; le gabarit glisse jusqu'à la presse à levier, qui forme une cartouche de configuration ; la cartouche descend la rampe jusqu'au lecteur,
// qui lit un nouveau document et compare ses mesures aux valeurs attendues. Écart : la cartouche part au rebut et le cadre fautif est corrigé sur l'établi.
// La cartouche matérialise une configuration d'extracteur, pas les poids d'un modèle d'IA. Démonstration fictive : aucune donnée réelle.
// Contrat : build() -> { group, update(time), controls, api } ; tout est une fonction pure du temps partagé (voir studio-timeline.js).
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, springGeoZ, prismXZ, ringGeo, gearXGeo, TAU } from './machine-kit.js';
import * as T from './studio-timeline.js';
import { industrial } from './pro-materials.js';

export const WIDTH = 520;
const FCOL = ['#c8372d', '#2f6fb3', '#d79a2b'], FZ = 33.8, FH = 1.2;

/* ---------------- textures (contenu fictif) ---------------- */
function sheetTexture() {
  const S = 4, c = cv(T.SHEET.w * S, T.SHEET.d * S), x = c.getContext('2d');
  x.fillStyle = '#f7f2e4'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#5d564a'; x.font = '700 22px ui-monospace,Menlo,Consolas,monospace'; x.fillText('PDF EXEMPLE', 14, 30); x.fillRect(14, 40, 120, 4);
  for (let i = 0; i < 22; i++) x.fillRect(14, 70 + i * 10, 70 + ((i * 41) % 150), 3);
  T.FRAMES.forEach((f, i) => {
    const cx = (T.SHEET.w / 2 + f.dx) * S, cy = (T.SHEET.d / 2 + f.dy) * S, w = f.w * S, d = f.d * S;
    x.fillStyle = '#fff'; x.fillRect(cx - w / 2, cy - d / 2, w, d); x.strokeStyle = '#8a8272'; x.lineWidth = 2; x.strokeRect(cx - w / 2, cy - d / 2, w, d);
    x.fillStyle = '#2a251d'; x.font = '700 20px ui-monospace,Menlo,Consolas,monospace'; x.textBaseline = 'middle'; x.fillText(['4417', '08/11', '1 250,00'][i], cx - w / 2 + 8, cy);
  });
  x.fillStyle = '#7a2b24'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.textBaseline = 'alphabetic'; x.fillText('DEMO FICTIVE', 14, c.height - 14);
  return tex(c, 8);
}
function drawCard(x, S, prog, fade, sc = null) {
  x.fillStyle = '#c9b389'; x.fillRect(0, 0, T.SHEET.w * S, T.SHEET.d * S); x.strokeStyle = '#8a7650'; x.lineWidth = 3; x.strokeRect(2, 2, T.SHEET.w * S - 4, T.SHEET.d * S - 4);
  x.fillStyle = '#6c5b3a'; x.font = '700 16px ui-monospace,Menlo,Consolas,monospace'; x.fillText('GABARIT', 12, 24);
  T.FRAMES.forEach((f0, j) => {
    const f = { ...f0, ...T.pos(j, sc) }, cx = (T.SHEET.w / 2 + f.dx) * S, cy = (T.SHEET.d / 2 + f.dy) * S, w = (f.w - 4) * S, d = (f.d - 4) * S, p = prog[j] * fade;
    x.strokeStyle = '#8a7650'; x.setLineDash([6, 5]); x.lineWidth = 1.5; x.strokeRect(cx - w / 2, cy - d / 2, w, d); x.setLineDash([]);
    if (p > 0) { x.fillStyle = '#f4f8ff'; x.fillRect(cx - w / 2, cy - d / 2, w * p, d); x.strokeStyle = '#3d3320'; x.lineWidth = 2; x.strokeRect(cx - w / 2, cy - d / 2, w * p, d); }
  });
}
function cartridgeTex() {
  const c = cv(128, 80), x = c.getContext('2d'); x.fillStyle = '#d8dce3'; x.fillRect(0, 0, 128, 80); x.strokeStyle = '#4a4f5a'; x.lineWidth = 3; x.strokeRect(3, 3, 122, 74);
  x.fillStyle = '#23252b'; x.font = '700 15px ui-monospace,Menlo,Consolas,monospace'; x.fillText('CARTOUCHE', 12, 24); x.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; x.fillText('CONFIG', 12, 38);
  T.FRAMES.forEach((f, i) => { x.fillStyle = FCOL[i]; x.fillRect(12 + i * 36, 48, 28, 8 + 2 * i); });
  return tex(c);
}
function dialTexture(name) {
  const c = cv(128, 128), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
  x.strokeStyle = '#2a251d'; x.lineWidth = 2; for (let i = 0; i <= 10; i++) { const a = Math.PI * .75 + (i / 10) * Math.PI * 1.5, r0 = i % 5 ? 50 : 44; x.beginPath(); x.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); x.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); x.stroke(); }
  x.fillStyle = '#2a251d'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.fillText(name, 64, 98); return tex(c);
}
function slipTexture() {
  const c = cv(160, 96), x = c.getContext('2d'); x.fillStyle = '#f6efdc'; x.fillRect(0, 0, 160, 96); x.fillStyle = '#4b4536'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText('EXPORT', 10, 22);
  ['OT 4417', '08/11', '1 250,00'].forEach((t, i) => x.fillText(t, 10, 46 + i * 18)); x.fillStyle = '#2d7a4f'; x.fillText('CONFORME', 84, 22); return tex(c);
}
const plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' };

export function build() {
  const g = new THREE.Group(), M = industrial(workshopMats(makeMats()));
  M.frost = new THREE.MeshStandardMaterial({ color: '#dfe7f2', roughness: .6, metalness: 0, emissive: '#ffffff', emissiveIntensity: 0 });
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [];

  /* ================= bâti : plinthe, établi, plaque ================= */
  Z('bati'); let S = stat('bati');
  /* soubassement noir en retrait, table émaillée sur patins réglables, chants et façade en aluminium brossé, ouïes, poignées */
  S.box(0, 0, 2.2, 496, 156, 4.4, 'castDk', 1);
  S.box(0, 0, 10, 520, 172, 11.2, 'enamel', 2.4);
  S.box(0, 84.3, 10, 520, 3.4, 9, 'alu', .9); S.box(0, -84.3, 10, 520, 3.4, 9, 'alu', .9);
  for (const x of [-260.8, 260.8]) S.box(x, 0, 10, 2.6, 172, 9, 'alu', .8);
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) S.box(sx * (100 + i * 20), 86.1, 10, 12, .8, 3.2, 'ink', .3);
  for (const x of [-246, 246]) { S.cylX(x - 7, x + 7, 86.4, 10, 1.1, 'steel', 12); S.box(x - 7, 85.2, 10, 2, 2.4, 5, 'steelDk', .4); S.box(x + 7, 85.2, 10, 2, 2.4, 5, 'steelDk', .4); }
  for (const [x, y] of [[-244, -70], [244, -70], [-244, 70], [244, 70], [0, -70], [0, 70]]) { S.cylZ(x, y, -4.4, 7, 2.2, 'steelDk', 18); S.cylZ(x, y, -2.2, 6.2, 2.2, 'rubber', 18); S.cylZ(x, y, 0, 3, 3, 'steel', 14); }
  S.box(-85, 0, 22, 330, 150, 16, 'enamelDk', 2);                                              // établi (z 14 à 30) sous la table et la presse
  for (let i = 0; i < 10; i++) S.bolts([[-245 + i * 55, 86.3, 13]], 'y', .9, 'steel');
  S.box(-85, 0, 29.7, 334, 154, 1.2, 'steelDk', .4);                                           // tôle de recouvrement
  S.bolts([[-240, -60, 30.2], [-240, 60, 30.2], [70, -60, 30.2], [70, 60, 30.2], [-85, -72, 30.2], [-85, 72, 30.2]], 'z', 1.3, 'steelDk');
  S.box(0, 86.8, 10, 150, 1.2, 7, 'alu', .3);
  put(label('STUDIO PDF', -22, 87.5, 10, 112, 5, 'y', plateLabel));
  put(label('DEMO FICTIVE', 64, 87.5, 10, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= table lumineuse : cadre, deux dalles dépolies, magasin d'exemples, étagère des cadres ================= */
  Z('table'); S = stat('table');
  S.box(-122, 0, 31.5, 196, 112, 3, 'alu', 1);
  S.box(-122, 0, 33.05, 196, 112, .3, 'steelDk');                                              // liseré
  S.box(-236, 0, 31, 48, 100, 2, 'steel', .5); for (let i = 0; i < 3; i++) S.box(-228, 0, 32.4 + i * .35, 64, 84, .3, 'paperEdge');   // magasin et pile d'exemples
  for (const y of [-52, 52]) S.box(-236, y, 33.4, 48, 2, 4, 'steelDk', .4);
  S.box(-122, 66, 31.5, 196, 22, 3, 'alu', .8);                                                // étagère de rangement des cadres
  for (let i = 0; i < 3; i++) { const d = T.DOCK(i); S.box(d[0], d[1], 33.2, 40, 16, .25, 'ink'); }
  S.bolts([[-216, -54, 33.3], [-216, 54, 33.3], [-28, -54, 33.3], [-28, 54, 33.3], [-216, 74, 33.3], [-28, 74, 33.3]], 'z', 1.3, 'steelDk');
  const frostGeo = new THREE.PlaneGeometry(72, 94).rotateX(-Math.PI / 2);
  for (const x of [-165, -75]) { const f = new THREE.Mesh(frostGeo, M.frost); f.position.set(x, 33.26, 0); f.userData.noGlow = true; put(f); }
  /* feuilles : exemple PDF (fondu à la fin) et gabarit */
  const sheetMat = new THREE.MeshStandardMaterial({ map: sheetTexture(), roughness: .9, transparent: true }), sheetMesh = new THREE.Mesh(new THREE.PlaneGeometry(T.SHEET.w, T.SHEET.d).rotateX(-Math.PI / 2), sheetMat);
  sheetMesh.castShadow = true; sheetMesh.userData.noGlow = true; put(sheetMesh);
  const CS = 4, cardCanvas = cv(T.SHEET.w * CS, T.SHEET.d * CS), cardCtx = cardCanvas.getContext('2d'), cardTex = tex(cardCanvas, 8); drawCard(cardCtx, CS, [0, 0, 0], 1);
  const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, roughness: .85, transparent: true }), cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(T.SHEET.w, T.SHEET.d).rotateX(-Math.PI / 2), cardMat);
  cardMesh.castShadow = true; cardMesh.userData.noGlow = true; put(cardMesh);
  let cardKey = '';
  /* trois cadres de détection anodisés, avec leur étiquette de champ */
  const frames = T.FRAMES.map((f, i) => {
    const gr = new THREE.Group(), m = new THREE.Mesh(ringGeo(f.w, f.d, 1.6, FH), new THREE.MeshStandardMaterial({ color: FCOL[i], roughness: .38, metalness: .35 })); m.castShadow = true; m.userData.noGlow = true;
    gr.add(m); const lb = label(f.name, f.w / 2 + 8, -f.d / 2 - 2.2, FH + .05, 14, 3.6, 'z', plateLabel); lb.position.set(-f.w / 2 + 7, FH + .06, -f.d / 2 - 2.6); lb.userData.noGlow = true; gr.add(lb); put(gr); return gr;
  });

  /* ================= portique : montants, rails, poutre mobile, tête (pince, fraise, molette) ================= */
  Z('portique'); S = stat('portique');
  for (const x of [-224, -18]) for (const y of [-82, 82]) { S.box(x, y, 34, 8, 8, 56, 'cast', 1); S.bolts([[x, y, 62.4]], 'z', 1.2, 'steelDk'); }
  for (const y of [-82, 82]) { S.cylX(-228, -14, y, 62, 2.2, 'steel', 14); S.box(-121, y, 58.4, 214, 4, 3, 'steelDk', .4); }
  S.box(-18, 0, 64, 6, 172, 5, 'steelDk', .6); S.box(-224, 0, 64, 6, 172, 5, 'steelDk', .6);    // entretoises d'extrémité
  const beam = mover('poutre', [0, 0, 0]);
  beam.box(0, 0, 67, 8, 172, 7, 'alu', 1);
  for (const y of [-82, 82]) { beam.box(0, y, 63.5, 14, 10, 11, 'steel', .8); beam.cylX(-7, 7, y, 57.6, 2.4, 'steelDk', 12); beam.bolts([[0, y, 69.4]], 'z', 1.1, 'steelDk'); }
  for (let i = 0; i < 48; i++) beam.cylY(-80 + i * 3.4, -79 + i * 3.4, 0, 71.4, 1.4, 'steelDk', 10);   // vis-mère de la tête (filets)
  beam.cylY(-84, 84, 0, 71.4, 1.1, 'steel', 8);
  const beamG = new THREE.Group(); beam.done(); beamG.add(beam.root); zoneGroup('portique').add(beamG);
  const headG = new THREE.Group(); beamG.add(headG);
  const hp = new Part('tête', M); hp.zone = 'portique'; parts.push(hp);
  hp.box(0, 0, 66, 16, 14, 10, 'steel', 1); hp.box(0, 0, 53, 12, 12, 16, 'alu', 1); hp.bolts([[-5, 6.2, 53], [5, 6.2, 53]], 'y', .8, 'brass');
  hp.cylY(7, 11, 0, 59, 3.6, 'brass', 24);                                                        // support de la molette
  headG.add(hp.done());
  const molette = mover('molette', [0, 11, 59]); molette.cylY(11, 15, 0, 59, 4.4, 'brass', 26); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; molette.box(Math.cos(a) * 4.5, 13, 59 + Math.sin(a) * 4.5, .9, 4, .9, 'steelDk'); } headG.add(molette.done());
  const gripper = mover('pince', [0, 0, 44]); gripper.cylZ(0, 0, 45, 1.5, 14, 'steel', 12); gripper.box(0, 0, 45.1, 6, 4, 2.2, 'steelDk', .4); gripper.box(-2.8, 0, 44.7, 1, 4, 1.4, 'alu', .3); gripper.box(2.8, 0, 44.7, 1, 4, 1.4, 'alu', .3); headG.add(gripper.done());
  const cutter = mover('fraise', [0, -9, 44]); cutter.cylZ(0, -9, 49, 3.2, 13, 'graphite', 18); cutter.cylZ(0, -9, 46, 1.3, 4, 'steel', 10); cutter.cylZ(0, -9, 43, .5, 3.2, 'steel', 8, 1.3); headG.add(cutter.done());
  hp.box(0, -9, 56, 8, 8, 6, 'alu', .6);

  /* ================= presse à levier : cadre en C, coulisseau à crémaillère, pignon, manette en bakélite, lit, rails de guidage ================= */
  Z('presse'); S = stat('presse'); const PX = T.PRESS_X;
  S.box(PX, -47, 64, 40, 10, 68, 'cast', 1.2); S.box(PX, -19, 93, 44, 66, 10, 'cast', 1.2);       // montant arrière et couronne
  S.box(PX, 0, 32, 54, 54, 4, 'steel', .8); S.box(PX, 0, 30.6, 58, 58, 1.4, 'steelDk', .5);        // lit
  S.cylZ(PX, 0, 98, 6.8, 2, 'steelDk', 20); S.box(PX, -19, 100, 20, 14, 4, 'cast', .8);
  S.bolts([[PX - 16, -47, 98], [PX + 16, -47, 98], [PX - 16, 12, 98.2], [PX + 16, 12, 98.2]], 'z', 1.4, 'steelDk');
  for (const dx of [-16, 14]) S.box(PX + dx, 15, 80, 2, 8, 20, 'cast', .6);                       // flasques de palier du pignon
  S.cylX(PX - 18, PX + 23, 18.5, 78, 1.6, 'steel', 12);
  for (const y of [-45, 45]) S.box(-2, y, 33, 48, 3, 2, 'steelDk', .4);                           // rails de guidage du gabarit
  const ram = mover('coulisseau', [PX, 0, 0]);
  ram.cylZ(PX, 0, 52, 4, 72, 'steel', 20); ram.box(PX, 0, 54, 40, 40, 6, 'steelDk', 1.2); ram.box(PX, 0, 51.2, 36, 36, 2, 'alu', .6); ram.cylZ(PX, 0, 120, 6.4, 2.4, 'bronze', 20);
  for (let i = 0; i < 10; i++) ram.box(PX, 7.2, 62 + i * 4.3, 2, 4, 2.1, 'brass');                  // crémaillère (pas 4,3)
  ram.box(PX, 4.8, 72, 3, 3.6, 34, 'steelDk', .4);
  const spring = mover('ressort de rappel', [PX, 0, 100]); spring.geo('steelDk', springGeoZ(PX, 0, 100, 120, 5.4, 7, .5), 0, 0, 0);
  const pinion = mover('pignon de presse', [PX, 18.5, 78]); pinion.geo('brass', gearXGeo(11, 16, 3, 1.8), PX, 18.5, 78); pinion.cylX(PX - 4, PX + 4, 18.5, 78, 2.6, 'steel', 12);
  const lever = mover('manette', [PX + 20, 18.5, 78]); lever.cylX(PX + 18, PX + 22, 18.5, 78, 3.4, 'steel', 14); lever.box(PX + 20, 18.5, 60, 3.6, 3, 36, 'bakelite', .9); lever.cylY(16.5, 22, PX + 20, 42, 3.8, 'bakelite', 18);
  /* cartouche (sort du lit) */
  const cartMat = new THREE.MeshStandardMaterial({ map: cartridgeTex(), roughness: .5, metalness: .3 }), cartMesh = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 16), [M.steel, M.steel, cartMat, M.steelDk, M.steel, M.steel]); cartMesh.castShadow = true; cartMesh.userData.noGlow = true; put(cartMesh, 'rampe');
  /* poussoir pneumatique */
  Z('rampe'); S = stat('rampe');
  S.cylX(-6, 16, 0, 41, 3.4, 'steel', 18); S.box(-8, 0, 41, 4, 12, 10, 'cast', .6); S.cylX(-8, -6, 0, 41, 4.2, 'steelDk', 18);
  const pusher = mover('poussoir', [20, 0, 40]); pusher.cylX(14, 20, 0, 40, 1.4, 'steel', 10); pusher.box(20, 0, 40, 2, 16, 8, 'steelDk', .5); pusher.cylX(16, 18, 0, 40, 2.2, 'bronze', 12);
  S.geo('steelDk', prismXZ([[70, 34], [128, 28], [70, 28]], -15, 33), 0, 0, 0);
  for (const y of [-15, 32]) S.geo('steel', prismXZ([[70, 37.4], [128, 31.4], [128, 28], [70, 34]], y, y + 1.6), 0, 0, 0);

  /* ================= lecteur : caisse, module de lecture, voûte, cadrans, voyants, rack de livraison, goulotte de rebut ================= */
  Z('lecteur'); S = stat('lecteur');
  S.box(180, 0, 22, 116, 90, 12, 'enamelDk', 1.6); S.box(180, 0, 28.3, 118, 92, 1, 'steelDk', .4);
  S.box(136, -23.5, 36, 28, 43, 16, 'iron', 1); S.box(150.2, -23.5, 31, .6, 36, 3, 'ink');       // module de lecture, fente noire
  S.box(175, -44, 34, 34, 2, 12, 'iron', .6); S.box(175, -3, 34, 34, 2, 12, 'iron', .6); S.box(175, -23.5, 41, 34, 43, 10, 'alu', 1);   // voûte
  S.cylY(-36, -10, 175, 36, 3, 'glass', 18); S.box(175, -23.5, 47, 16, 22, 3, 'brass', .5);
  S.box(228, -23, 29.2, 28, 40, 1.4, 'steel', .5); for (let i = 0; i < 3; i++) S.box(228, -23, 30.2 + i * .3, 28, 36, .3, 'paperEdge');   // bac des documents
  S.box(243, -23, 32, 2, 40, 7, 'steelDk', .4);
  S.box(160, 10, 30, 30, 1.6, 3, 'steelDk', .4); S.box(160, 30, 30, 30, 1.6, 3, 'steelDk', .4); S.box(146, 20, 30, 2, 20, 3, 'steelDk', .4);   // berceau
  S.box(160, 63, 36, 34, 36, 16, 'iron', 1); S.box(160, 44.8, 36, 30, .6, 8, 'ink');             // goulotte de rebut (devant)
  S.box(231, 20, 36, 26, 30, 16, 'iron', 1); S.box(217.8, 20, 36, .6, 22, 8, 'ink');             // rack de livraison (à droite)
  S.box(180, 45.4, 17, 112, 1.6, 20, 'alu', .6);                                                  // façade
  for (const [x, z] of [[130, 22], [230, 22], [130, 12], [230, 12]]) S.bolts([[x, 46.4, z]], 'y', 1.2, 'brass');
  S.box(205, 46, 8, 22, 1.6, 4, 'ink');                                                           // fente de sortie
  put(label('LECTURE', 136, -1.8, 38, 22, 3.2, 'y', plateLabel)); put(label('REBUT', 160, 81.2, 36, 20, 3.2, 'y', plateLabel)); put(label('LIVRAISON', 231, 35.2, 38, 22, 3.2, 'y', plateLabel));
  const stopper = mover('butée', [175, 20, 31]); stopper.box(175, 20, 31, 2, 16, 6, 'bronze', .4);
  /* cadrans : attendu / obtenu */
  const dials = [[148, 'ATTENDU'], [180, 'OBTENU']].map(([x, name]) => {
    S.cylY(45.8, 46.9, x, 17, 8.6, 'brass', 30);
    const d = new THREE.Mesh(new THREE.CircleGeometry(7.4, 36), new THREE.MeshStandardMaterial({ map: dialTexture(name), roughness: .6 })); d.position.set(x, 17, 47.05); d.userData.noGlow = true; put(d);
    const n = mover('aiguille ' + name, [x, 47.5, 17]); n.box(x, 47.6, 20, .8, .5, 7.2, 'red'); n.cylY(47.3, 48.6, x, 17, 1.2, 'steel', 12); return n;
  });
  const LAMPS = [['#5fd39a', 218], ['#ffb347', 226], ['#e5584b', 234]].map(([c, x]) => { const l = lamp(x, 46.6, 17, 2.1, c, 'y'); put(l); return l; });
  put(label('ESSAI', 226, 46.6, 10.6, 24, 3.2, 'y', plateLabel));
  /* document de l'essai, barre de lecture, bordereau d'export */
  const docMat = new THREE.MeshStandardMaterial({ map: sheetTexture(), roughness: .9 }), docMesh = new THREE.Mesh(new THREE.PlaneGeometry(28, 36).rotateX(-Math.PI / 2), docMat); docMesh.castShadow = true; docMesh.userData.noGlow = true; put(docMesh);
  const scanM = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: '#5aa0ff', emissiveIntensity: 0 }), scanBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, .5, 38), scanM); scanBar.userData.noGlow = true; put(scanBar);
  const slipMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: slipTexture(), roughness: .9, side: THREE.DoubleSide })); slipMesh.userData.noGlow = true; put(slipMesh);

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [ram, spring, pinion, lever, pusher, stopper, gripper, cutter, molette, ...dials].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + 24;
  meshes.push(sheetMesh, cardMesh, ...frames.map((f) => f.children[0]), cartMesh, docMesh);

  /* ---------------- inspection (éclaté) : chaque ensemble glisse le long de son axe de démontage ---------------- */
  const ZOFF = { bati: [0, 0, 0], table: [0, 0, 22], portique: [0, 0, 80], presse: [0, 0, 64], rampe: [0, 44, 4], lecteur: [46, 0, 22] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), table: new THREE.Object3D(), press: new THREE.Object3D(), reader: new THREE.Object3D() };
  at(anchors.all, -10, 0, 40); at(anchors.table, -140, 10, 40); at(anchors.press, 50, 10, 60); at(anchors.reader, 180, 20, 30);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null;

  const RP = 11;
  function update(time) {
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { u, sc } = T.locate(time, forced);
    /* table lumineuse, exemple et gabarit */
    M.frost.emissiveIntensity = .12 + .75 * T.lampTable(u);
    const sh = T.sheet(u); sheetMesh.visible = sh.vis; at(sheetMesh, sh.x, T.SHEET.y, sh.z); sheetMat.opacity = sh.alpha;
    const cd = T.card(u); at(cardMesh, cd.x, 0, cd.z); cardMat.opacity = cd.alpha;
    const prog = [0, 1, 2].map((j) => T.cutProgress(j, u)), fd = T.cutFade(u), key = prog.map((p) => Math.round(p * 24)).join('|') + '|' + Math.round(fd * 12) + (sc.custom ? '|' + T.LIVE.map((l) => l.dx.toFixed(1) + ',' + l.dy.toFixed(1)).join(';') : '');
    if (key !== cardKey) { cardKey = key; drawCard(cardCtx, CS, prog, fd, sc); cardTex.needsUpdate = true; }
    /* portique : poutre (x), tête (y), pince et fraise (z), molette */
    const h = T.head(u, sc); beamG.position.x = h.x; headG.position.z = h.y; molette.root.rotation.z = h.mol; gripper.root.position.y = 44 - 9.6 * h.grip; cutter.root.position.y = 44 - 9.4 * h.cut; cutter.root.rotation.y = u * 40 * (h.cut > .1 ? 1 : 0);
    frames.forEach((f, i) => { const p = T.frame(i, u, sc); at(f, p.x, p.y, p.z - FH / 2); });
    /* presse : manette -> pignon -> crémaillère -> coulisseau */
    const pr = T.press(u), d = 15.5 * pr.ram; ram.root.position.y = -d; spring.root.scale.y = (20 - d) / 20; pinion.root.rotation.x = lever.root.rotation.x = d / RP;
    /* poussoir, cartouche, butée du berceau */
    pusher.root.position.x = T.pusherX(u) - 20; const ct = T.cartridge(u, sc); cartMesh.visible = ct.vis; if (ct.vis) at(cartMesh, ct.x, ct.y, ct.z);
    stopper.root.position.y = -6 * ease(seg(u, T.K.decide[0] - .4, T.K.decide[0] + .3)) * (sc.ok ? 1 : 0) * (1 - seg(u, T.K.fade[0], T.K.fade[1]));
    /* lecteur : document, balayage, cadrans, voyants, bordereau */
    const pg = T.page(u); docMesh.visible = pg.vis; at(docMesh, pg.x, -23, 30.7);
    const sb = T.scanBar(u); scanBar.visible = sb.on; at(scanBar, 175 + (sb.f - .5) * 20, -23, 36); scanM.emissiveIntensity = sb.on ? 2.2 : 0;
    const ga = T.gauges(u, sc); dials[0].root.rotation.z = 2.356 - 4.712 * ga.expect; dials[1].root.rotation.z = 2.356 - 4.712 * ga.got;
    setLamp(LAMPS[0], ga.ok); setLamp(LAMPS[1], ga.busy); setLamp(LAMPS[2], ga.bad);
    const sl = T.slip(u, sc); slipMesh.visible = sl > .01; at(slipMesh, 205, 38 + 18 * sl, 8.4);
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'La table', anchor: 'table' }, { label: 'La presse', anchor: 'press' }, { label: 'Le lecteur', anchor: 'reader' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short, edit: !!s.edit, editT: s.editT })), setScenario(i) { forced = i == null ? null : ((i % 3) + 3) % 3; }, get scenario() { return forced; },
      /* scénario C : les trois cadres de détection sont à déplacer (souris, doigt, flèches) ; la cartouche en dépend */
      frames: { names: T.FRAMES.map((f) => f.name), get: (i) => ({ ...T.LIVE[i] }), move: (i, dx, dy) => T.setFrame(i, dx, dy), nudge: (i, ddx, ddy) => T.setFrame(i, T.LIVE[i].dx + ddx, T.LIVE[i].dy + ddy), reset: () => T.resetFrames(), coverage: T.coverage, editing: () => forced === 2 },
      status() { const c = T.coverage(); return T.FRAMES.map((f, i) => f.name + ' ' + Math.round(c.per[i] * 100) + ' %').join(' · ') + (c.ok ? ' : conforme' : ' : écart'); },
      /* glisser un cadre : le rayon est en repère monde ; le plan des cadres est horizontal (z = 34,6 en repère de figure) */
      drag: (() => {
        const inv = new THREE.Matrix4(), r = new THREE.Ray(), hit = new THREE.Vector3(), PLANE = FZ + FH / 2 + .6;
        const onPlane = (ray) => { inv.copy(g.matrixWorld).invert(); r.copy(ray).applyMatrix4(inv); if (Math.abs(r.direction.y) < 1e-6) return null; const t = (PLANE - r.origin.y) / r.direction.y; if (t < 0) return null; r.at(t, hit); return { x: hit.x, y: hit.z }; };
        let grab = null;
        return {
          pick(ray) {
            if (forced !== 2 || inspect.v > .05) return null; const pt = onPlane(ray); if (!pt) return null; let best = -1, bd = 1e9;
            T.FRAMES.forEach((f, i) => { const c = [T.SHEET.x + T.LIVE[i].dx, T.SHEET.y + T.LIVE[i].dy], ax = Math.abs(pt.x - c[0]) - f.w / 2, ay = Math.abs(pt.y - c[1]) - f.d / 2, d = Math.max(ax, ay); if (d < 2.5 && d < bd) { bd = d; best = i; } });
            if (best < 0) return null; grab = { i: best, ox: pt.x - (T.SHEET.x + T.LIVE[best].dx), oy: pt.y - (T.SHEET.y + T.LIVE[best].dy) }; return { id: best, name: T.FRAMES[best].name };
          },
          move(ray) { if (!grab) return; const pt = onPlane(ray); if (pt) T.setFrame(grab.i, pt.x - T.SHEET.x - grab.ox, pt.y - T.SHEET.y - grab.oy); },
          end() { grab = null; }
        };
      })()
    },
    controls: { label: 'Étape', min: 1, max: 7, step: 1, fmt: (v) => v + ' : ' + T.STEPS[v - 1], get: (t) => T.stepAt(T.locate(t, forced).u) + 1, seek: (v) => T.STEP_T[v - 1] + .4 }
  };
}
