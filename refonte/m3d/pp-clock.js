// POWER AUTOMATE, CHAÎNE DES PLANS DE PRÉVENTION : horloge-calendrier d'archivage.
// Une grande horloge verticale (cadran, couronne de dates, train d'engrenages visible, échappement, tambours du jour) surmonte un poste de classement : lecteur, portique à pince, armoire à tiroirs,
// compartiment d'archives, module de relance. Le calendrier avance : les roues tournent proportionnellement au jour simulé ; un témoin s'allume à l'approche de l'échéance, puis la cloche
// sonne et une languette de relance sort. Démonstration fictive. Contrat : build() -> { group, update(time), controls, api } ; tout est fonction pure du temps partagé.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, TAU } from './machine-kit.js';
import * as T from './pp-timeline.js';
import { industrial } from './pro-materials.js';

export const WIDTH = 500;
const CX = -72, FZ = 150, plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' };
const CATS = ['PLANS SECTEUR A', 'PLANS SECTEUR B', 'ECHEANCES 30 J', 'RELANCES', 'ENTREPRISES', 'MODES OPERATOIRES', 'VISITES', 'EN ATTENTE'];

function faceTexture() { const c = cv(256, 256), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.beginPath(); x.arc(128, 128, 124, 0, TAU); x.fill(); x.strokeStyle = '#2a251d'; for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = i % 5 ? 112 : 100; x.lineWidth = i % 5 ? 2 : 5; x.beginPath(); x.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); x.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120); x.stroke(); } x.fillStyle = '#2a251d'; x.font = '700 22px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let h = 1; h <= 12; h++) { const a = h / 12 * TAU; x.fillText(String(h), 128 + Math.sin(a) * 82, 128 - Math.cos(a) * 82); } return tex(c, 8); }
function ringTexture() { const c = cv(512, 512), x = c.getContext('2d'); x.fillStyle = '#23252b'; x.fillRect(0, 0, 512, 512); x.fillStyle = '#efe6cf'; x.font = '700 22px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let d = 1; d <= 31; d++) { const a = (d / 31) * TAU; x.fillText(String(d), 256 + Math.sin(a) * 224, 256 - Math.cos(a) * 224); } return tex(c, 8); }
function digitDrum() { const c = cv(640, 64), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 640, 64); x.fillStyle = '#1d1a14'; x.font = '700 50px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let d = 0; d < 10; d++) { x.save(); x.translate((9 - d) * 64 + 32, 33); x.rotate(Math.PI / 2); x.fillText(String(d), 0, 2); x.restore(); x.fillStyle = '#b9ae92'; x.fillRect((9 - d) * 64, 0, 1, 64); x.fillStyle = '#1d1a14'; } return tex(c, 8); }
function cabinetTexture() { const c = cv(640, 832), x = c.getContext('2d'); x.fillStyle = '#2f3138'; x.fillRect(0, 0, 640, 832); CATS.forEach((n, i) => { const col = i % 2, row = 3 - Math.floor(i / 2), px = col * 320 + 10, py = row * 208 + 10; x.fillStyle = '#c9b389'; x.fillRect(px, py, 300, 188); x.strokeStyle = '#8a7650'; x.lineWidth = 4; x.strokeRect(px, py, 300, 188); x.fillStyle = '#efe3c6'; x.fillRect(px + 30, py + 24, 240, 56); x.fillStyle = '#2a251d'; x.font = '700 26px ui-monospace,Menlo,Consolas,monospace'; x.fillText(n, px + 40, py + 62); x.fillStyle = '#6c5b3a'; x.fillRect(px + 100, py + 130, 100, 14); }); return tex(c, 8); }
function folderTexture() { const c = cv(144, 96), x = c.getContext('2d'); x.fillStyle = '#d8bb7c'; x.fillRect(0, 0, 144, 96); x.strokeStyle = '#a58a4e'; x.lineWidth = 3; x.strokeRect(2, 2, 140, 92); x.fillStyle = '#efe3c6'; x.fillRect(10, 10, 80, 28); x.fillStyle = '#2a251d'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText('PLAN PREV.', 14, 30); x.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DEMO FICTIVE', 14, 84); return tex(c); }
function slipTexture() { const c = cv(176, 72), x = c.getContext('2d'); x.fillStyle = '#f6efdc'; x.fillRect(0, 0, 176, 72); x.fillStyle = '#c8372d'; x.fillRect(0, 0, 176, 14); x.fillStyle = '#2a251d'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText('RELANCE ECHEANCE', 8, 38); x.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DEMO FICTIVE', 8, 62); return tex(c); }

export function build() {
  const g = new THREE.Group(), M = industrial(workshopMats(makeMats()));
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [];

  /* ================= bâti ================= */
  Z('bati'); let S = stat('bati');
  S.box(-10, 8, 3, 390, 150, 6, 'enamel', 1.4);                                                  // table émaillée
  S.box(-10, 82.3, 3, 390, 1.4, 5, 'alu', .4); S.box(-10, -66.3, 3, 390, 1.4, 5, 'alu', .4);
  for (let i = 0; i < 9; i++) S.box(-170 + i * 36, 83.2, 3, 14, .5, 1.8, 'ink', .2);            // ouïes de ventilation en façade for (const [x, y] of [[-184, -58], [164, -58], [-184, 70], [164, 70]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);
  S.box(-10, 83.7, 3, 150, 1.2, 6, 'alu', .3);
  put(label('PLANS DE PREVENTION', -34, 84.4, 3, 100, 5, 'y', plateLabel)); put(label('DEMO FICTIVE', 50, 84.4, 3, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= tour d'horloge : socle à tambours du jour, fût à engrenages, tête à cadran ================= */
  Z('tour'); S = stat('tour');
  S.box(CX, -12, 8, 54, 36, 4, 'cast', 1); S.box(CX, -26, 40, 50, 2, 64, 'cast', 1); for (const x of [CX - 24, CX + 24]) S.box(x, -12, 40, 2, 32, 64, 'cast', .8); S.box(CX, -12, 72, 54, 34, 4, 'brass', .8);
  S.box(CX, 3.6, 12, 46, 1.2, 12, 'cast', .8); S.box(CX, 3.4, 22, 46, 1, 8, 'cast', .8); S.box(CX, 3.4, 65.5, 46, 1, 13, 'cast', .8); S.box(CX, 3.2, 40, 46, .5, 28, 'glass');          // façade du socle, fenêtre du jour
  S.box(CX, -26, 98, 44, 2, 52, 'cast', 1); for (const x of [CX - 20, CX + 20]) S.box(x, -12, 98, 2, 30, 52, 'cast', .8); S.box(CX, -12, 124, 44, 30, 3, 'brass', .8);
  S.box(CX, 3.2, 98, 40, .5, 46, 'glass'); S.box(CX, 3, 74, 44, 1.2, 3, 'steelDk', .4); S.box(CX, 3, 122, 44, 1.2, 3, 'steelDk', .4);
  S.box(CX, -12, 149, 52, 30, 46, 'cast', 1.6); S.cylY(-6, 4, CX, FZ, 24, 'brass', 48); S.cylY(3.4, 5, CX, FZ, 21.4, 'steelDk', 48);
  S.box(CX, -12, 175, 56, 38, 4, 'brass', .8); S.cylZ(CX, -12, 179, 3, 8, 'steel', 14); S.cylZ(CX, -12, 187, 1.5, 4, 'brass', 12);
  for (const x of [CX - 22, CX + 22]) S.bolts([[x, 4.2, 20], [x, 4.2, 64]], 'y', 1.1, 'brass');
  put(label('JOUR', CX - 26 + 4, 3.9, 18, 14, 3, 'y', plateLabel)); put(label('NOV', CX + 16, 3.9, 18, 14, 3, 'y', plateLabel));
  put(label('TEMOIN', CX - 12, 4.2, 66, 18, 3, 'y', plateLabel)); put(label('RELANCE', CX + 14, 4.2, 66, 20, 3, 'y', plateLabel));
  const lampW = lamp(CX - 12, 4.6, 62, 2, '#ffb347', 'y'), lampD = lamp(CX + 14, 4.6, 62, 2, '#e5584b', 'y'); put(lampW); put(lampD);
  const drumMat = new THREE.MeshStandardMaterial({ map: digitDrum(), roughness: .55 }), drums = [-8, 8].map((dx) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 13, 22).rotateZ(Math.PI / 2), drumMat); d.position.set(CX - 12 + dx + 4, 38, -6); d.castShadow = true; d.userData.noGlow = true; put(d); return d; });
  S.cylX(CX - 24, CX + 4, -6, 38, .9, 'steelDk', 10);
  /* train d'engrenages : quatre roues engrenées (rapports 16/14, 16/24, 14/10), came sur la roue 3 */
  const G = [[16, CX - 8, 110], [14, CX + 5.9, 110], [24, CX - 8, 91.4], [10, CX + 16, 102.5]];
  const gears = G.map(([teeth, x, z], i) => { const r = teeth * .5, m = mover('roue ' + (i + 1), [x, -6, z]); m.gearY(x, z, -8, -4, r, teeth, i % 2 ? 'steel' : 'brass', 1.6); m.cylY(-9, -2, x, z, 1.5, 'steelDk', 10); if (i === 2) { m.box(x + 8, -6, z + 2, 5, 3, 4, 'bronze', .4); } put(m.root); return m; });
  for (const [, x, z] of G) S.cylY(-26, -9, x, z, 1.2, 'steelDk', 8);
  /* cadran, couronne de dates, aiguilles, repère d'échéance */
  const face = new THREE.Mesh(new THREE.CircleGeometry(19.8, 48), new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: .55 })); face.position.set(CX, FZ, 5.1); face.userData.noGlow = true; put(face);
  const ring = new THREE.Mesh(new THREE.RingGeometry(21, 28, 62, 1), new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: .6 })); ring.position.set(CX, FZ, 4.1); ring.userData.noGlow = true; put(ring);
  S.cylY(3.6, 4.4, CX, FZ, 29.5, 'brass', 60);
  const hh = mover('aiguille des heures', [CX, 6, FZ]); hh.box(CX, 6.2, FZ + 5, 1.8, .6, 12, 'ink'); hh.cylY(5.6, 7.4, CX, FZ, 2, 'steel', 12); put(hh.root);
  const mh = mover('aiguille des minutes', [CX, 6.8, FZ]); mh.box(CX, 7, FZ + 8, 1.1, .6, 18, 'ink'); mh.cylY(6.4, 8.2, CX, FZ, 1.4, 'brass', 12); put(mh.root);
  const dateHand = mover('aiguille du calendrier', [CX, 5.4, FZ]); dateHand.box(CX, 5.6, FZ + 18, 1.4, .6, 18, 'amber', .3); dateHand.box(CX, 5.6, FZ + 28, 3.2, .8, 3, 'amber', .3); put(dateHand.root);
  const dueFlag = mover('repère d\'échéance', [CX, 5.2, FZ]); dueFlag.box(CX, 5.4, FZ + 30.4, 3, .8, 4.4, 'red', .3); put(dueFlag.root);

  /* ================= poste de classement : table, lecteur, armoire à tiroirs, archives ================= */
  Z('poste'); S = stat('poste');
  S.box(-30, 20, 29, 28, 28, 18, 'iron', 1); S.box(-15.7, 20, 30, .6, 22, 3, 'ink'); put(label('DEPOT', -30, 34.2, 32, 18, 3, 'y', plateLabel));
  S.box(3, 20, 26.2, 40, 28, 2, 'steelDk', .4); for (const y of [8, 32]) S.box(6, y, 36, 20, 2, 18, 'iron', .6);
  S.box(6, 20, 46, 22, 28, 6, 'alu', 1); S.cylY(10, 30, 6, 41, 2.8, 'glass', 18); S.box(6, 34.4, 44, 22, .8, 6, 'steelDk', .3);
  const lampsR = [-6, 0, 6].map((dx, i) => { const l = lamp(6 + dx, 35, 44, 1.6, ['#5fd39a', '#5aa0ff', '#ffb347'][i], 'y'); put(l); put(label(['TYPE', 'CAT.', 'ECH.'][i], 6 + dx, 34.7, 40.6, 7, 2.4, 'y', plateLabel)); return l; });
  const scanM = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: '#5aa0ff', emissiveIntensity: 0 }), scanBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, .5, 22), scanM); scanBar.userData.noGlow = true; put(scanBar);
  /* armoire : texture des façades, deux tiroirs actifs (un par scénario) */
  S.box(60, -14, 60, 84, 28, 104, 'iron', 1.4); S.box(60, -14, 113, 88, 32, 3, 'alu', .8); S.box(60, -14, 7, 88, 32, 2, 'steelDk', .6);
  const cabMat = new THREE.MeshStandardMaterial({ map: cabinetTexture(), roughness: .6, metalness: .1 }), cabF = new THREE.Mesh(new THREE.PlaneGeometry(80, 104), cabMat); cabF.position.set(60, 60, .05); cabF.userData.noGlow = true; put(cabF);
  put(label('ARMOIRE DE CLASSEMENT', 60, 1.2, 116.6, 70, 3.2, 'y', plateLabel));
  for (let i = 0; i < 8; i++) { const col = i % 2, row = Math.floor(i / 2); if ((col === 1 && row === 2) || (col === 0 && row === 1)) continue; S.cylY(.2, 1.6, 40 + col * 40, 21 + row * 26 - 7, 1.7, 'steel', 12); }
  const dwr = T.DRAW.map((d, i) => { const m = mover('tiroir ' + (i + 1), [d.x, 0, d.z]); m.box(d.x, .8, d.z, 37, 1.6, 23, 'steel', .5); m.cylY(1.6, 4, d.x, d.z - 7, 1.9, 'brass', 12); m.box(d.x, -14, d.z - 9.4, 36, 28, 1.2, 'steelDk', .4); for (const sx of [-1, 1]) m.box(d.x + sx * 17.6, -14, d.z - 4, 1.2, 28, 10, 'steelDk', .4); m.box(d.x, -27.4, d.z - 4, 36, 1.2, 10, 'steelDk', .4); put(m.root); return m; });
  /* archives */
  S.box(-131, 22, 8, 38, 30, 2, 'cast', .6); for (const sx of [-1, 1]) S.box(-131 + sx * 18.4, 22, 33, 1.2, 30, 50, 'iron', .6); S.box(-131, 36.4, 33, 38, 1.2, 50, 'iron', .6); S.box(-131, 7.6, 33, 38, 1.2, 50, 'iron', .6);
  S.box(-131, 22, 59.4, 38, 30, 1.2, 'cast', .6); S.box(-131, 37, 36, 34, .4, 6, 'ink'); put(label('ARCHIVES', -131, 37.4, 46, 32, 3.4, 'y', plateLabel));
  S.box(-131, 22, 60.2, 24, 16, .4, 'ink');

  /* ================= portique à pince : montants, rails, chariot, treuil, câble, mâchoires ================= */
  Z('portique'); S = stat('portique');
  for (const x of [-158, 142]) for (const y of [16, 32]) { S.box(x, y, 65, 5, 5, 118, 'cast', 1); S.bolts([[x, y, 124.4]], 'z', 1.1, 'steelDk'); }
  for (const y of [16, 32]) { S.cylX(-162, 146, y, 124, 2, 'steel', 12); S.box(-8, y, 121.4, 300, 3, 2.6, 'steelDk', .4); }
  S.box(-158, 24, 127, 5, 22, 3, 'steelDk', .5); S.box(142, 24, 127, 5, 22, 3, 'steelDk', .5);
  const car = new THREE.Group(); zoneGroup('portique').add(car); extra++;
  const cp = new Part('chariot', M); cp.zone = 'portique'; parts.push(cp);
  cp.box(0, 24, 127, 22, 26, 4, 'alu', 1); cp.cylX(-8, 8, 24, 133, 3.4, 'steel', 20); cp.cylX(-9, -7, 24, 133, 5, 'brass', 20); cp.box(0, 24, 131, 8, 8, 4, 'graphite', .6);
  for (const sx of [-1, 1]) for (const y of [16, 32]) cp.box(sx * 8, y, 123.4, 5, 5, 4, 'steelDk', .5);
  car.add(cp.done());
  const wheels = []; for (const sx of [-1, 1]) for (const y of [16, 32]) { const w = mover('galet', [sx * 8, y, 126]); w.cylY(y - 1.6, y + 1.6, sx * 8, 126, 2.6, 'steel', 18); car.add(w.done()); wheels.push(w); }
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1, 6), M.ink); cable.userData.noGlow = true; car.add(cable);
  const head = mover('pince', [0, 24, 100]); head.box(0, 24, 100, 7, 5, 4, 'steelDk', .5); head.cylZ(0, 24, 101.5, .9, 3, 'steel', 8); car.add(head.done());
  const jaws = [-1, 1].map((s) => { const j = mover('mâchoire', [s * 3, 24, 97.4]); j.box(s * 3, 24, 97.4, 1, 4, 3.6, 'alu', .3); car.add(j.done()); return j; });
  const fMats = [M.paperEdge, M.paperEdge, new THREE.MeshStandardMaterial({ map: folderTexture(), roughness: .85 }), M.paperEdge, M.paperEdge, M.paperEdge];
  const folder = new THREE.Mesh(new THREE.BoxGeometry(18, 1.6, 12), fMats); folder.castShadow = true; folder.userData.noGlow = true; put(folder, 'poste');

  /* ================= module de relance : cloche, marteau, languette ================= */
  Z('relance'); S = stat('relance');
  S.box(131, 10, 30, 38, 30, 44, 'iron', 1.4); S.box(131, 25.2, 30, 24, .6, 4, 'ink'); S.box(131, 10, 53, 40, 32, 2, 'alu', .6);
  S.cylZ(131, 8, 54, 1.4, 8, 'steelDk', 10); S.cylZ(131, 8, 62, 9, 12, 'brass', 30, 3.6); S.cylZ(131, 8, 74, 1.6, 2, 'steel', 10);
  const hammer = mover('marteau de cloche', [145, 8, 66]); hammer.box(140.5, 8, 66, 9, 1.4, 1.4, 'steel', .3); hammer.cylZ(136, 8, 64.4, 1.8, 3.2, 'brass', 12); hammer.cylY(7, 9, 145, 66, 1.4, 'steelDk', 10); put(hammer.root);
  put(label('RELANCE', 131, 25.4, 40, 30, 3.4, 'y', plateLabel));
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(22, 9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: slipTexture(), roughness: .9, side: THREE.DoubleSide })); tab.userData.noGlow = true; put(tab);

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [...gears, hh, mh, dateHand, dueFlag, ...dwr, hammer, ...[]].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + 40;
  meshes.push(folder, cabF, tab);

  const ZOFF = { bati: [0, 0, 0], tour: [-20, 0, 24], poste: [0, 36, 4], portique: [0, 0, 70], relance: [40, 0, 14] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), clock: new THREE.Object3D(), cabinet: new THREE.Object3D(), notif: new THREE.Object3D() };
  at(anchors.all, -10, 10, 80); at(anchors.clock, CX, 10, 150); at(anchors.cabinet, 60, 10, 65); at(anchors.notif, 131, 20, 40);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, lastK = 0, lastTime = 0;

  const curU = () => Math.max(0, lastTime - T.CUSTOM.base);
  function update(time) {
    lastTime = time;
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced); lastK = k;
    /* calendrier : toutes les roues suivent le jour simulé */
    const d = T.day(u, k), GK = TAU * 4 / T.MONTH, th = (d - 10) * GK, tT = [16, 14, 24, 10], dm = ((d - 1) % T.MONTH + T.MONTH) % T.MONTH + 1;   // 4 tours de roue par mois : le calendrier se referme exactement
    gears[0].root.rotation.z = th; gears[1].root.rotation.z = -th * tT[0] / tT[1]; gears[2].root.rotation.z = -th * tT[0] / tT[2]; gears[3].root.rotation.z = th * tT[0] / tT[3];
    drums[0].rotation.x = (9.5 - (Math.floor(dm / 10) + clamp((dm % 10) - 9, 0, 1))) / 10 * TAU; drums[1].rotation.x = (9.5 - (dm % 10)) / 10 * TAU;
    mh.root.rotation.z = -d * GK * 3; hh.root.rotation.z = -d * GK; dateHand.root.rotation.z = -(d / T.MONTH) * TAU;
    const ph = k === 2 ? T.phaseAt(u) : '', fol = T.FOLDERS[T.CUSTOM.folder], due = k === 2 ? (fol ? fol.due : sc.due) : sc.due;
    const filed = k === 2 ? (ph === 'stored' || (T.CUSTOM.phase === 'archive' && u - T.CUSTOM.t0 < 6)) : (k === 1 || u >= 19); dueFlag.root.visible = filed; dueFlag.root.rotation.z = -(due / T.MONTH) * TAU;
    const al = T.alerts(u, k); setLamp(lampW, al.warn); setLamp(lampD, al.due); hammer.root.rotation.z = al.bell * .5;
    tab.visible = al.tab > .01; at(tab, 131, 12 + 22 * al.tab, 30.6);
    /* pince, dossier, tiroirs */
    const mc = k === 2 ? T.mapC(u) : { k, u }, kk = mc.k, uu = mc.u;
    const gr = T.gripper(uu, kk); car.position.x = gr.x; wheels.forEach((w) => { w.root.rotation.z = -gr.x / 2.6; });
    head.root.position.y = gr.tip; jaws.forEach((j, i) => { j.root.position.set((i ? 1 : -1) * (3 - 1.4 * gr.jaw), gr.tip - 2.6, 24); });
    const cl = 133 - (gr.tip + 3.6); cable.scale.y = Math.max(.1, cl); cable.position.set(0, gr.tip + 3.6 + cl / 2, 24);
    dwr.forEach((m, i) => { m.root.position.z = 38 * gr.draw[i]; });
    const fo = T.folder(uu, kk, gr); folder.visible = !!fo.vis; if (fo.vis) at(folder, fo.x, fo.y, fo.z);
    /* lecteur */
    const rl = T.readLamps(uu, kk); lampsR.forEach((l, i) => setLamp(l, rl[i])); const sb = T.scanBar(uu, kk); scanBar.visible = sb.on; at(scanBar, 6 - 8 + 16 * sb.f, 20, 41);
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'L\'horloge', anchor: 'clock' }, { label: 'L\'armoire', anchor: 'cabinet' }, { label: 'La relance', anchor: 'notif' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short, edit: !!s.edit, editT: s.editT, hold: s.hold })), setScenario(i) { forced = i == null ? null : ((i % 3) + 3) % 3; if (forced === 2) T.startCustom(lastTime); }, get scenario() { return forced; },
      /* scénario C « Mon classement » : déposer un dossier, avancer la date, observer témoin et relance, archiver (dates et dossiers fictifs) */
      params: {
        visible: () => forced === 2,
        groups: [
          { name: 'Dossier', options: T.FOLDERS.map((f, i) => ({ label: f.name, run: () => { if (forced === 2) T.deposit(i, curU()); } })), get: () => (T.phaseAt(curU()) === 'idle' ? -1 : T.CUSTOM.folder) },
          { name: 'Calendrier', options: [{ label: '+1 jour', run: () => forced === 2 && T.addDays(1, curU()) }, { label: '+5 jours', run: () => forced === 2 && T.addDays(5, curU()) }, { label: 'Jusqu’au témoin', run: () => { const f = T.FOLDERS[T.CUSTOM.folder]; if (forced === 2 && f) T.addDays(Math.max(1, f.warn - Math.round(T.dayAt(curU()))), curU()); } }, { label: 'Jusqu’à l’échéance', run: () => { const f = T.FOLDERS[T.CUSTOM.folder]; if (forced === 2 && f) T.addDays(Math.max(1, f.due - Math.round(T.dayAt(curU()))), curU()); } }], get: () => -1 },
          { name: 'Classé', options: [{ label: 'Archiver', run: () => { if (forced === 2) T.archive(curU()); } }], get: () => -1 }
        ]
      },
      status() {
        if (forced !== 2) return ''; const u = curU(), ph = T.phaseAt(u), f = T.FOLDERS[T.CUSTOM.folder], al = T.alerts(u, 2), dd = T.shownDay(T.dayAt(u));
        const dossier = ph === 'idle' ? (T.CUSTOM.phase === 'archive' ? 'dossier archivé' : 'aucun dossier') : f.name + (ph === 'stored' ? ' classé (tiroir ' + (f.drawer + 1) + ')' : ph === 'deposit' ? ' en cours de classement' : ' en cours d’archivage') + ' · témoin au jour ' + f.warn + ', échéance au jour ' + f.due;
        return 'Jour ' + dd + ' · ' + dossier + (al.warn ? ' · témoin allumé' : '') + (al.due ? ' · relance envoyée' : '');
      },
      /* clic sur la boîte de dépôt : dossier suivant ; clic sur le cadran : +1 jour (actif seulement dans « Mon classement ») */
      drag: (() => {
        const inv = new THREE.Matrix4(), r = new THREE.Ray(), hit = new THREE.Vector3();
        const onPlane = (ray, axis, v) => { inv.copy(g.matrixWorld).invert(); r.copy(ray).applyMatrix4(inv); const d = axis === 'z' ? r.direction.z : r.direction.y; if (Math.abs(d) < 1e-6) return null; const t = (v - (axis === 'z' ? r.origin.z : r.origin.y)) / d; if (t < 0) return null; r.at(t, hit); return { x: hit.x, y: hit.y, z: hit.z }; };
        return {
          pick(ray) {
            if (forced !== 2 || inspect.v > .05) return null;
            const c = onPlane(ray, 'z', 5.1); if (c && Math.hypot(c.x - CX, c.y - FZ) < 22) { T.addDays(1, curU()); return { id: 'clock', name: 'jour' }; }
            const b = onPlane(ray, 'y', 38); if (b && Math.abs(b.x + 30) < 15 && Math.abs(b.z - 20) < 15 && T.phaseAt(curU()) === 'idle') { T.deposit((T.CUSTOM.folder + 1 + T.FOLDERS.length) % T.FOLDERS.length, curU()); return { id: 'depot', name: 'dossier' }; }
            return null;
          }, move() {}, end() {}
        };
      })()
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + T.STEPS[lastK][v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u, l.k) + 1; }, seek: (v) => T.STEP_T[lastK][v - 1] + .4 }
  };
}
