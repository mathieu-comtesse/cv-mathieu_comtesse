// VRE, TRAITEMENT PAR VM : centre de tri postal miniature.
// Une enveloppe (le rapport PDF) entre sur le convoyeur, une demande est imprimée dans la file physique, la relève de la VM (horloge) la libère ; le lecteur vérifie le code R004
// et l'OT ; la pince de portique range le lien dans le bon casier Excel (tampon, voyant, journal), ou le poussoir envoie l'enveloppe à la voie des doublons ou au module de rejet.
// À 17 h le distributeur imprime le récapitulatif. La seconde cabine VM est une architecture cible : emplacement et verrou partagé, non actifs.
// Contrat : build() -> { group, update(time), controls, api } ; tout est fonction pure du temps partagé. Rapports et OT fictifs.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, TAU } from './machine-kit.js';
import * as T from './vm-timeline.js';
import { industrial } from './pro-materials.js';

export const WIDTH = 460;
const plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' };

function envTexture(ot) { const c = cv(176, 112), x = c.getContext('2d'); x.fillStyle = '#efe7d0'; x.fillRect(0, 0, 176, 112); x.strokeStyle = '#8a8272'; x.lineWidth = 3; x.strokeRect(3, 3, 170, 106); x.fillStyle = '#2a251d'; x.font = '700 16px ui-monospace,Menlo,Consolas,monospace'; x.fillText('PDF  R004', 12, 30); x.font = '700 22px ui-monospace,Menlo,Consolas,monospace'; x.fillText('OT ' + ot, 12, 62); x.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; x.fillText('RAPPORT  DEMO FICTIVE', 12, 96); return tex(c, 8); }
function cardTexture() { const c = cv(112, 72), x = c.getContext('2d'); x.fillStyle = '#d9e6f5'; x.fillRect(0, 0, 112, 72); x.strokeStyle = '#2f6fb3'; x.lineWidth = 3; x.strokeRect(2, 2, 108, 68); x.fillStyle = '#1b2f4a'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DEMANDE', 10, 28); x.fillRect(10, 40, 70, 4); x.fillRect(10, 50, 50, 4); return tex(c); }
function cabinetTexture() {
  const c = cv(1104, 528), x = c.getContext('2d'); x.fillStyle = '#2f3138'; x.fillRect(0, 0, 1104, 528);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) { const px = k * 138 + 8, py = (2 - r) * 176 + 10; x.fillStyle = '#d9dde4'; x.fillRect(px, py, 122, 156); x.strokeStyle = '#8b909a'; x.lineWidth = 3; x.strokeRect(px, py, 122, 156); x.fillStyle = '#23252b'; x.font = '700 24px ui-monospace,Menlo,Consolas,monospace'; x.fillText('L' + (r * 8 + k + 1), px + 10, py + 34); x.fillStyle = '#a9aeb8'; x.fillRect(px + 38, py + 118, 46, 10); }
  return tex(c, 8);
}
function clockTexture() { const c = cv(256, 256), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.beginPath(); x.arc(128, 128, 124, 0, TAU); x.fill(); x.strokeStyle = '#2a251d'; for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = i % 5 ? 112 : 100; x.lineWidth = i % 5 ? 2 : 5; x.beginPath(); x.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); x.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120); x.stroke(); } x.fillStyle = '#2a251d'; x.font = '700 22px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (const h of [12, 3, 6, 9]) { const a = h / 12 * TAU; x.fillText(String(h), 128 + Math.sin(a) * 82, 128 - Math.cos(a) * 82); } x.font = '700 13px ui-monospace,Menlo,Consolas,monospace'; x.fillText('RELEVE 2 MIN', 128, 170); return tex(c, 8); }
function slipTexture(lines) { const c = cv(176, 112), x = c.getContext('2d'); x.fillStyle = '#f6efdc'; x.fillRect(0, 0, 176, 112); x.fillStyle = '#2a251d'; x.font = '700 13px ui-monospace,Menlo,Consolas,monospace'; lines.forEach((l, i) => x.fillText(l, 10, 24 + i * 22)); return tex(c); }

export function build() {
  const g = new THREE.Group(), M = industrial(workshopMats(makeMats()));
  M.ghost = new THREE.MeshStandardMaterial({ color: '#9ec8ff', roughness: .3, metalness: .1, transparent: true, opacity: .28, depthWrite: false });
  M.green = new THREE.MeshStandardMaterial({ color: '#1f4d3a', roughness: .5, metalness: .15 });
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [];

  /* ================= bâti : plinthe, mur du fond, plaque ================= */
  Z('bati'); let S = stat('bati');
  S.box(0, 0, 3, 440, 170, 6, 'enamel', 1.4); for (const [x, y] of [[-208, -70], [208, -70], [-208, 70], [208, 70]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);   // table émaillée
  S.box(0, 84.3, 3, 440, 1.4, 5, 'alu', .4); S.box(0, -84.3, 3, 440, 1.4, 5, 'alu', .4);
  for (let i = 0; i < 12; i++) S.box(-165 + i * 30, 85.2, 3, 14, .5, 1.8, 'ink', .2);                 // ouïes de ventilation en façade
  S.box(0, -72, 68, 440, 6, 124, 'enamelDk', 1.2);
  for (const z of [30, 60, 90]) S.box(0, -75.4, z, 420, 1.2, 2.4, 'enamel', .5);                     // plis de rigidité du mur du fond
  S.box(0, 86.7, 3, 150, 1.2, 6, 'alu', .3);
  put(label('VRE  TRAITEMENT PAR VM', -22, 87.4, 3, 112, 5, 'y', plateLabel)); put(label('DEMO FICTIVE', 62, 87.4, 3, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= convoyeur : table, bande, rails, rouleaux, trémie, file de demandes, imprimante de demandes ================= */
  Z('convoyeur'); S = stat('convoyeur');
  S.box(-70, 20, 18, 280, 44, 24, 'green', 2); S.box(-70, 20, 30.4, 284, 48, .8, 'steelDk', .3);
  const beltTex = (() => { const c = cv(64, 64), x = c.getContext('2d'); x.fillStyle = '#1b1c20'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2b2d34'; for (let i = 0; i < 4; i++) x.fillRect(i * 16 + 2, 0, 6, 64); x.fillStyle = '#33363f'; x.fillRect(0, 0, 64, 2); const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(260 / 16, 1); return t; })(), beltM = new THREE.MeshStandardMaterial({ map: beltTex, roughness: .9 }), belt = new THREE.Mesh(new THREE.BoxGeometry(260, 1, 22), beltM); belt.position.set(-60, 36.6, 20); belt.receiveShadow = true; belt.userData.noGlow = true; put(belt);
  for (const y of [8, 32]) { S.box(-100, y, 37, 184, 2, 6, 'steel', .5); for (const x of [-185, -145, -105, -65, -25]) S.box(x, y, 32.5, 4, 3, 3.4, 'steelDk', .4); }
  const rollers = []; for (let i = 0; i < 12; i++) { const rl = mover('rouleau ' + (i + 1), [-180 + i * 22, 20, 35.2]); rl.cylY(9.5, 30.5, -180 + i * 22, 35.2, 1.4, 'steel', 12); rl.cylY(8.6, 9.5, -180 + i * 22, 35.2, .6, 'steelDk', 8); rl.cylY(30.5, 31.4, -180 + i * 22, 35.2, .6, 'steelDk', 8); put(rl.root); rollers.push(rl); }
  S.cylY(8, 32, -192, 34.4, 2.6, 'steelDk', 18); S.cylY(8, 32, 68, 34.4, 2.6, 'steelDk', 18);
  S.box(-194, 20, 41, 32, 28, 22, 'iron', 1); S.box(-194, 20, 53, 30, 26, 2, 'alu', .5); S.box(-178.2, 20, 38, .6, 24, 4, 'ink'); put(label('TREMIE', -194, 34.4, 46, 20, 3, 'y', plateLabel));
  /* imprimante de demandes et file physique à trois emplacements */
  S.box(-150, 66, 34, 28, 24, 18, 'iron', 1); S.box(-150, 66, 43.4, 24, 20, 1.2, 'alu', .4); S.box(-150, 53.8, 32, 20, .6, 3, 'ink');
  S.box(-150, 66, 18, 30, 26, 2, 'steel', .5); for (const x of [-162, -150, -138]) S.box(x, 66, 22, 1.4, 26, 10, 'steelDk', .3);
  S.box(-150, 78.6, 22, 30, 1.2, 10, 'steel', .4);
  put(label('FILE', -150, 79.4, 22, 14, 3, 'y', plateLabel));
  /* lecteur sous cabine VM 1 : voûte, lentille, voyants R004 / OT */
  for (const y of [6, 34]) S.box(-75, y, 46, 34, 2, 22, 'iron', .6);
  S.box(-75, 20, 56, 34, 34, 10, 'alu', 1); S.cylY(8, 32, -75, 49, 3.2, 'glass', 18); S.box(-75, 20, 62, 20, 22, 3, 'brass', .5);
  S.box(-75, 37.4, 54, 34, .8, 8, 'steelDk', .3);
  const lampR = lamp(-85, 37.9, 54, 1.9, '#5fd39a', 'y'), lampO = lamp(-75, 37.9, 54, 1.9, '#5aa0ff', 'y'), lampD = lamp(-65, 37.9, 54, 1.9, '#ffb347', 'y'), lampX = lamp(-55, 37.9, 54, 1.9, '#e5584b', 'y'); [lampR, lampO, lampD, lampX].forEach((l) => put(l));
  ['R004', 'OT', 'DEJA', 'ECART'].forEach((t, i) => put(label(t, -85 + i * 10, 37.5, 49.2, 9, 2.6, 'y', plateLabel)));
  put(label('CABINE VM 1', -75, 37.5, 59.4, 30, 3, 'y', plateLabel));
  const scanM = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: '#5aa0ff', emissiveIntensity: 0 }), scanBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, .5, 22), scanM); scanBar.userData.noGlow = true; put(scanBar);
  /* voies de doublons et de rejet : bac à fenêtre vitrée et poussoir */
  const pushers = [];
  [[T.DUP_X, 'DOUBLONS'], [T.REJ_X, 'REJET']].forEach(([x, name], i) => {
    S.box(x, 60, 8, 28, 36, 2, 'steel', .5); S.box(x - 13.4, 60, 25, 1.2, 36, 36, 'alu', .5); S.box(x + 13.4, 60, 25, 1.2, 36, 36, 'alu', .5); S.box(x, 78.4, 44, 28, 1.2, 8, 'alu', .5); S.box(x, 60, 43.4, 28, 36, 1.2, 'iron', .6);
    S.box(x, 42.6, 18, 28, 1.2, 22, 'iron', .6); S.box(x, 42.6, 43, 28, 1.2, 8, 'iron', .6); S.box(x, 78.8, 25, 26, .4, 34, 'glass');
    put(label(name, x, 79.1, 41, 24, 3, 'y', plateLabel));
    S.box(x, -2, 39, 12, 10, 8, 'graphite', .8); S.cylY(-6, -2, x, 39, 3.4, 'steelDk', 16); S.box(x, -2, 33.4, 8, 8, 5, 'steelDk', .5);
    const p = mover('poussoir ' + name, [x, 4, 39]); p.cylY(-2, 4.5, x, 39, 1.3, 'steel', 10); p.box(x, 5, 39.2, 20, 1.6, 3.4, 'steelDk', .5); p.box(x, 5.8, 39.2, 16, .6, 2, 'alu', .3); put(p.root); pushers.push(p);
  });
  const lampDup = lamp(T.DUP_X, 79.2, 36, 1.8, '#ffb347', 'y'), lampRej = lamp(T.REJ_X, 79.2, 36, 1.8, '#e5584b', 'y'); put(lampDup); put(lampRej);
  const envMats = T.SCEN.map((s) => new THREE.MeshStandardMaterial({ map: envTexture(s.ot), roughness: .9 }));
  const env = new THREE.Mesh(new THREE.PlaneGeometry(20, 12.5).rotateX(-Math.PI / 2), envMats[0]); env.castShadow = true; env.userData.noGlow = true; put(env);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(9, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: .85 })); card.castShadow = true; card.userData.noGlow = true; put(card);

  /* ================= portique : montants, rails, chariot, bras, tige, mâchoires ================= */
  Z('portique'); S = stat('portique');
  for (const x of [-56, 166]) for (const y of [-14, 4]) { S.box(x, y, 53, 6, 6, 94, 'cast', 1); S.bolts([[x, y, 100.4]], 'z', 1.2, 'steelDk'); }
  for (const y of [-14, 4]) { S.cylX(-60, 170, y, 100, 2.1, 'steel', 12); S.box(55, y, 97.4, 230, 3, 3, 'steelDk', .4); }
  S.box(-56, -5, 103, 6, 24, 4, 'steelDk', .5); S.box(166, -5, 103, 6, 24, 4, 'steelDk', .5);
  const car = new THREE.Group(); zoneGroup('portique').add(car); extra++;
  const cp = new Part('chariot', M); cp.zone = 'portique'; parts.push(cp);
  cp.box(0, -5, 103, 26, 24, 5, 'alu', 1); cp.box(0, -5, 108, 14, 10, 6, 'graphite', .8); cp.cylX(-6, 6, -5, 112, 2.2, 'steel', 14);
  for (const sx of [-1, 1]) for (const y of [-14, 4]) cp.box(sx * 9, y, 99.6, 5, 5, 4, 'steelDk', .5);
  cp.box(0, -5, 98.4, 8, 26, 2, 'steelDk', .4); for (const y of [-14, 4]) { cp.box(0, y, 98.8, 20, 3.2, 1.6, 'bronze', .3); }
  car.add(cp.done());
  const wheels = []; for (const sx of [-1, 1]) for (const y of [-14, 4]) { const w = mover('galet', [sx * 9, y, 101.8]); w.cylY(y - 1.6, y + 1.6, sx * 9, 101.8, 2.6, 'steel', 18); car.add(w.done()); wheels.push(w); }
  const arm = mover('bras', [0, 0, 92]); arm.box(0, 0, 92, 5, 60, 5, 'alu', .8); arm.box(0, -26, 92, 9, 5, 9, 'steelDk', .6); arm.box(0, 25, 92, 9, 5, 9, 'brass', .6); arm.cylX(-3, 3, 24, 94.4, 1.2, 'steelDk', 10); arm.cylZ(0, 22, 69, 2.8, 24, 'steelDk', 14); car.add(arm.done());
  const sl = new Part('coulisseau du bras', M); sl.zone = 'portique'; parts.push(sl); sl.box(0, -5, 96.5, 12, 14, 7, 'steel', .8); sl.box(0, -5, 92, 9, 14, 3, 'steelDk', .5); car.add(sl.done());
  const rod = mover('tige', [0, 22, 62]); rod.cylZ(0, 22, 62, 1.5, 34, 'steel', 12); rod.box(0, 22, 62.4, 7, 5, 2.4, 'steelDk', .4); car.add(rod.done());
  const jaws = [-1, 1].map((s) => { const j = mover('mâchoire', [s * 2.6, 22, 61]); j.box(s * 2.6, 22, 60.6, 1, 4, 3, 'alu', .3); j.box(s * 2.6, 22, 63.2, 1.4, 3, 3, 'steelDk', .3); car.add(j.done()); return j; });

  /* ================= casiers : meuble, tiroir cible, tampon, voyant, journal, distributeur de récapitulatif ================= */
  Z('casiers'); S = stat('casiers');
  S.box(81, -37, 44, 140, 30, 72, 'iron', 1.4); S.box(81, -37, 83, 144, 34, 3, 'alu', .8); S.box(81, -37, 6.4, 144, 34, 2.4, 'steelDk', .6);
  const cabM = new THREE.MeshStandardMaterial({ map: cabinetTexture(), roughness: .6, metalness: .1 }), cabF = new THREE.Mesh(new THREE.PlaneGeometry(138, 66), cabM); cabF.position.set(81, 44, -21.95); cabF.userData.noGlow = true; put(cabF);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (!(c === T.CAS.c && r === T.CAS.r)) S.cylY(-22.6, -21.2, T.CX(c), T.CZ(r) - 6, 1.6, 'steel', 12);
  put(label('CASIERS EXCEL', 81, -19.8, 86.4, 50, 3.4, 'y', plateLabel));
  const dr = mover('tiroir cible', [T.CAS.x, -22, T.CAS.z]); dr.box(T.CAS.x, -21.5, T.CAS.z, 15.4, 1.6, 19.4, 'steel', .5); dr.cylY(-21, -19, T.CAS.x, T.CAS.z - 6, 1.8, 'brass', 12);
  dr.box(T.CAS.x, -34, T.CAS.z - 7, 14, 24, 1.2, 'steelDk', .4); dr.box(T.CAS.x - 7, -34, T.CAS.z - 3, 1.2, 24, 8, 'steelDk', .4); dr.box(T.CAS.x + 7, -34, T.CAS.z - 3, 1.2, 24, 8, 'steelDk', .4); dr.box(T.CAS.x, -45.6, T.CAS.z - 3, 14, 1.2, 8, 'steelDk', .4); put(dr.root);
  const stamp = mover('tampon', [T.CAS.x, -19, 74]); stamp.cylX(T.CAS.x - 6, T.CAS.x + 6, -19, 74, 1.3, 'steel', 10); stamp.box(T.CAS.x, -19, 67, 3, 2, 14, 'steel', .5); stamp.box(T.CAS.x, -20.2, 58.4, 11, 2.6, 4, 'bakelite', .6); stamp.box(T.CAS.x, -21, 58.4, 10, .8, 3, 'red', .2); put(stamp.root);
  const markMat = new THREE.MeshStandardMaterial({ color: '#2d7a4f', roughness: .6 }), mark = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.6), markMat); mark.position.set(T.CAS.x, T.CAS.z + 14, -21.85); mark.userData.noGlow = true; put(mark);
  const lampCas = lamp(T.CAS.x + 5.4, -21.6, T.CAS.z + 8, 1.5, '#5fd39a', 'y'); put(lampCas);
  S.box(176, -37, 26, 26, 26, 40, 'iron', 1.2); S.box(176, -23.6, 22, 20, .6, 3, 'ink'); put(label('JOURNAL', 176, -23.2, 34, 18, 3, 'y', plateLabel));
  S.box(208, -37, 26, 26, 26, 40, 'iron', 1.2); S.box(208, -23.6, 22, 20, .6, 3, 'ink'); put(label('RECAP 17H', 208, -23.2, 34, 20, 3, 'y', plateLabel));
  const jMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: slipTexture(['OT 4417', 'R004 INTEGRE', 'CASIER L14']), roughness: .9 })); jMesh.userData.noGlow = true; put(jMesh);
  const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 11).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: slipTexture(['RECAPITULATIF', '17 H  DEMO', '1 INTEGRATION']), roughness: .9 })); rMesh.userData.noGlow = true; put(rMesh);

  /* ================= horloge de relève et architecture cible ================= */
  Z('horloge'); S = stat('horloge');
  S.cylY(-71, -66, 81, 108, 21.5, 'cast', 40); S.cylY(-66, -64.6, 81, 108, 20.4, 'brass', 40);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(19.4, 48), new THREE.MeshStandardMaterial({ map: clockTexture(), roughness: .55 })); clockFace.position.set(81, 108, -64.5); clockFace.userData.noGlow = true; put(clockFace);
  const hh = mover('aiguille des heures', [81, -63.6, 108]); hh.box(81, -63.8, 112, 1.6, .6, 11, 'ink'); hh.cylY(-64.4, -62.8, 81, 108, 1.8, 'steel', 12); put(hh.root);
  const mh = mover('aiguille des minutes', [81, -63, 108]); mh.box(81, -63.2, 114.5, 1, .6, 16, 'red'); mh.cylY(-63.8, -62.2, 81, 108, 1.2, 'brass', 12); put(mh.root);
  const lampTick = lamp(60, -68.4, 90, 2.1, '#ffb347', 'y'), lampFive = lamp(102, -68.4, 90, 2.1, '#5aa0ff', 'y'); put(lampTick); put(lampFive); put(label('RELEVE', 60, -68.2, 85, 14, 3, 'y', plateLabel)); put(label('17 H', 102, -68.2, 85, 12, 3, 'y', plateLabel));
  Z('architecture'); S = stat('architecture');
  for (const x of [-196, -128]) for (const y of [-64, -36]) S.cylZ(x, y, 6, 1.6, 64, 'ghost', 10);
  S.box(-162, -50, 70, 72, 34, 1.4, 'ghost'); for (const y of [-64, -36]) S.box(-162, y, 40, 68, .8, .8, 'ghost'); S.box(-162, -50, 6.6, 72, 34, .6, 'ghost');
  S.box(-110, -52, 36, 10, 8, 14, 'steelDk', .8); S.box(-100, -52, 36, 12, 3, 3, 'brass', .4); S.cylX(-128, -110, -52, 36, 1.3, 'steel', 10);   // verrou mécanique partagé
  put(label('CABINE VM 2', -162, -35.6, 54, 50, 3.6, 'y', { ...plateLabel, bg: '#b9d3ef' })); put(label('ARCHITECTURE CIBLE', -162, -35.6, 47, 60, 3, 'y', { ...plateLabel, bg: '#b9d3ef', fg: '#7a2b24' })); put(label('NON ACTIVE', -162, -35.6, 41, 36, 3, 'y', { ...plateLabel, bg: '#b9d3ef', fg: '#7a2b24' })); put(label('VERROU PARTAGE', -108, -47.4, 28, 30, 3, 'y', plateLabel));

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [...pushers, arm, rod, ...jaws, dr, stamp, hh, mh].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + 28;
  meshes.push(belt, env, card, cabF);

  const ZOFF = { bati: [0, 0, 0], convoyeur: [0, 0, 16], portique: [0, 0, 70], casiers: [0, 40, 8], horloge: [0, -30, 20], architecture: [-20, -20, 0] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), reader: new THREE.Object3D(), gantry: new THREE.Object3D(), cabinet: new THREE.Object3D() };
  at(anchors.all, 0, 0, 55); at(anchors.reader, -75, 20, 50); at(anchors.gantry, 40, 0, 90); at(anchors.cabinet, 100, -30, 50);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, lastK = 0, bx = -190;

  function update(time) {
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced); lastK = k;
    /* horloge */
    const ck = T.clock(u); mh.root.rotation.z = -(ck.min % 60) / 60 * TAU; hh.root.rotation.z = -ck.min / 720 * TAU; setLamp(lampTick, ck.tick ? 1 : 0); setLamp(lampFive, ck.five ? 1 : 0);
    /* pince */
    const gr = T.gripper(u, sc); car.position.x = gr.x; arm.root.position.z = gr.y - 22; rod.root.position.set(0, gr.z, gr.y); jaws.forEach((j, i) => { j.root.position.set((i ? 1 : -1) * (2.6 - 1.3 * gr.jaw), gr.z - 1, gr.y); });
    wheels.forEach((w) => { w.root.rotation.z = -gr.x / 2.6; });
    /* bande et rouleaux : ils suivent l'enveloppe qu'ils portent (un tour de rouleau = 2π × 1,4) */
    const evx = T.envelope(u, sc, gr); if (evx.vis && u < 14) bx = evx.x; beltM.map.offset.x = -bx / 16; rollers.forEach((rl) => { rl.root.rotation.z = -bx / 1.4; });
    /* enveloppe, demande */
    if (env.material !== envMats[k]) env.material = envMats[k];
    const ev = T.envelope(u, sc, gr); env.visible = !!ev.vis; if (ev.vis) at(env, ev.x, ev.y, ev.z); env.rotation.y = sc.out === 'ok' ? Math.PI / 2 * ease(seg(u, 19, 21.5)) : 0;
    const rq = T.request(u, sc); card.visible = rq.vis && !(ev.vis === false && rq.taken > .99);
    if (card.visible) { const rx = -150, ry = 66, rz = 40 - 26 * rq.drop; if (rq.taken < .01) at(card, rx, ry, rz); else { const tx = ev.vis ? ev.x : rx, ty = ev.vis ? ev.y : ry, tz = ev.vis ? ev.z + 1 : rz; at(card, rx + (tx - rx) * rq.taken, ry + (ty - ry) * rq.taken, rz + (tz - rz) * rq.taken); } }
    /* lecteur */
    const rd = T.reading(u, sc); scanBar.visible = rd.on; at(scanBar, -75 - 10 + 20 * rd.f, 20, 41.2); scanM.emissiveIntensity = rd.on ? 2.4 : 0; setLamp(lampR, rd.r004); setLamp(lampO, rd.ot); setLamp(lampD, rd.dup); setLamp(lampX, rd.bad);
    /* voies */
    pushers[0].root.position.z = 4 + 34 * T.pusher(0, u, sc); pushers[1].root.position.z = 4 + 34 * T.pusher(1, u, sc); setLamp(lampDup, sc.out === 'dup' && u > 18 && u < 47 ? 1 : 0); setLamp(lampRej, sc.out === 'rej' && u > 20 && u < 47 ? 1 : 0);
    /* casier cible */
    const cs = T.casier(u, sc); dr.root.position.z = -22 + 14 * cs.drawer; stamp.root.rotation.x = .35 * (1 - cs.stamp); mark.visible = cs.mark > .02; markMat.opacity = cs.mark; markMat.transparent = true; setLamp(lampCas, cs.lamp);
    jMesh.visible = cs.journal > .01; at(jMesh, 176, -30 + 14 * cs.journal, 26); rMesh.visible = cs.recap > .01; at(rMesh, 208, -30 + 16 * cs.recap, 26);
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'Le lecteur', anchor: 'reader' }, { label: 'Le portique', anchor: 'gantry' }, { label: 'Les casiers', anchor: 'cabinet' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short })), setScenario(i) { forced = i == null ? null : ((i % 5) + 5) % 5; }, get scenario() { return forced; }
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + T.STEPS[lastK][v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u, l.k) + 1; }, seek: (v) => T.STEP_T[lastK][v - 1] + .4 }
  };
}
