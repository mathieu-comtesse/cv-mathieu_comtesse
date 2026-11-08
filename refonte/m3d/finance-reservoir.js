// POINT FINANCIER : réservoir à seuils et trop-plein.
// Quatre conduites (CS, Locatif, MEC, PPTM) traversent une chambre de filtrage qui écarte les lignes KO, puis alimentent un réservoir émaillé dont le niveau est la consommation
// rapportée aux fonds disponibles. Un flotteur dans la jauge de verre entraîne, par câble, une poulie, une aiguille de cadran et un levier ; deux déclencheurs (seuil préventif réglable, dépassement
// des fonds) font sonner une cloche, sortir un courrier et tomber un loquet de mémoire pour que l'alerte ne soit pas répétée. Métaphore de surveillance : aucune dépense n'est bloquée.
// Contrat : build() -> { group, update(time), controls, api } ; tout est fonction pure du temps partagé. Valeurs fictives.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, springGeoZ, TAU } from './machine-kit.js';
import * as T from './finance-timeline.js';
import { industrial } from './pro-materials.js';

export const WIDTH = 400;
const R = 30, PIPE_Y = [-21, -7, 7, 21], PZ = 24, GY = 33.5, G0 = 38, GH = 90, GMAX = 1.2;
const PCOL = ['#c8372d', '#2f6fb3', '#2d7a4f', '#d79a2b'], plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' };
const levelZ = (r) => G0 + GH * clamp(r, 0, GMAX) / GMAX;

function dialTexture() {
  const c = cv(256, 256), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.beginPath(); x.arc(128, 128, 124, 0, TAU); x.fill();
  const ang = (v) => Math.PI * .75 + (v / 1.2) * Math.PI * 1.5;
  x.strokeStyle = '#2a251d'; for (let v = 0; v <= 120; v += 5) { const a = ang(v / 100), r0 = v % 20 ? 104 : 94; x.lineWidth = v % 20 ? 2 : 4; x.beginPath(); x.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); x.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); x.stroke(); }
  x.fillStyle = '#2a251d'; x.font = '700 18px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const v of [0, 20, 40, 60, 80, 100, 120]) { const a = ang(v / 100); x.fillText(String(v), 128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76); }
  x.strokeStyle = '#c8372d'; x.lineWidth = 8; x.beginPath(); x.arc(128, 128, 120, ang(1), ang(1.2)); x.stroke();
  x.fillStyle = '#6a6252'; x.font = '700 13px ui-monospace,Menlo,Consolas,monospace'; x.fillText('CONSOMMATION %', 128, 204); x.fillText('DEMO FICTIVE', 128, 222); return tex(c, 8);   // sous l'arc : l'aiguille ne passe jamais par le bas
}
function slipTexture(txt, col) { const c = cv(176, 80), x = c.getContext('2d'); x.fillStyle = '#f6efdc'; x.fillRect(0, 0, 176, 80); x.fillStyle = col; x.fillRect(0, 0, 176, 14); x.fillStyle = '#2a251d'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText(txt, 8, 38); x.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; x.fillText('ALERTE EMISE  DEMO FICTIVE', 8, 62); return tex(c); }
function ledgerTexture(ctx, a1, a2) { ctx.fillStyle = '#f2ead3'; ctx.fillRect(0, 0, 160, 96); ctx.strokeStyle = '#8a8272'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 156, 92); ctx.fillStyle = '#6a6252'; ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; ctx.fillText('ALERTES EMISES', 10, 18); ctx.fillRect(10, 24, 140, 1);
  [['PREVENTIF', a1, '#d79a2b'], ['DEPASSEMENT', a2, '#c8372d']].forEach(([t, a, c], i) => { const y = 46 + i * 28; ctx.globalAlpha = 1; ctx.fillStyle = '#6a6252'; ctx.fillText(t, 10, y); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(100, y - 10, 46, 12); ctx.fillStyle = '#fff'; ctx.fillText('EMIS', 108, y); ctx.globalAlpha = 1; }); }

export function build() {
  const g = new THREE.Group(), M = industrial(workshopMats(makeMats()));
  M.green = new THREE.MeshStandardMaterial({ color: '#2d7a4f', roughness: .45, metalness: .1 }); M.liquid = new THREE.MeshStandardMaterial({ color: '#3f8fd9', roughness: .15, metalness: 0, transparent: true, opacity: .85 });
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [];

  /* ================= bâti : plinthe, disque de fonte, trois pieds boulonnés ================= */
  Z('bati'); let S = stat('bati');
  S.box(0, 10, 3, 380, 180, 6, 'enamel', 1.4);                                                  // table émaillée
  S.box(0, 99.3, 3, 380, 1.4, 5, 'alu', .4); S.box(0, -79.3, 3, 380, 1.4, 5, 'alu', .4);
  for (let i = 0; i < 10; i++) S.box(-150 + i * 33, 100.2, 3, 14, .5, 1.8, 'ink', .2);          // ouïes de ventilation en façade
  PIPE_Y.forEach((y) => { for (const x of [-160, -70, -50]) S.box(x, y, 10, 2.4, 2.4, 8, 'steelDk', .3); });   // pieds des colliers de conduite
  for (const x of [-136, -112]) for (const y of [-26, 26]) S.box(x, y, 8, 3, 3, 4, 'steelDk', .3);              // pieds de la chambre de filtrage
  for (const [x, y] of [[-176, -70], [176, -70], [-176, 90], [176, 90]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);
  S.cylZ(0, 0, 6, 44, 4, 'cast', 40); S.cylZ(0, 0, 10, 40, 2, 'steelDk', 40);
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + Math.PI / 2, x = Math.cos(a) * 28, y = Math.sin(a) * 28; S.cylZ(x, y, 12, 6.5, 12, 'cast', 20); S.cylZ(x, y, 24, 7.6, 2, 'steelDk', 20); }
  S.box(0, 92.6, 3, 150, 1.2, 6, 'alu', .3);
  put(label('POINT FINANCIER', -30, 93.3, 3, 90, 5, 'y', plateLabel)); put(label('DEMO FICTIVE', 62, 93.3, 3, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= réservoir : cuve émaillée, fond bombé, bride, regard, jauge de verre ================= */
  Z('reservoir'); S = stat('réservoir');
  S.cylZ(0, 0, 24, R + 2, 6, 'cast', 40); S.cylZ(0, 0, 30, R, 100, 'enamel', 48); S.cylZ(0, 0, 130, R, 8, 'enamel', 48, R * .8); S.cylZ(0, 0, 138, R * .8, 3, 'enamel', 40, R * .55);
  S.cylZ(0, 0, 128, R + 2.2, 3, 'brass', 48); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; S.bolts([[Math.cos(a) * (R + 1), Math.sin(a) * (R + 1), 131.8]], 'z', 1.1, 'steelDk'); }
  S.cylZ(0, -6, 141, 7, 3, 'brass', 24); S.cylZ(0, -6, 144, 4, 2, 'steelDk', 18);             // bouchon de visite
  S.cylZ(0, 0, 70, R + 1.2, 1.6, 'brass', 48); S.cylZ(0, 0, 100, R + 1.2, 1.6, 'brass', 48);   // frettes
  S.cylZ(0, GY, G0 - 2, 5.2, 2, 'brass', 20); S.cylZ(0, GY, G0 + GH + 2, 5.2, 2, 'brass', 20); S.cylZ(0, GY, G0, 3.8, GH, 'glass', 22);
  S.cylY(R - 1, GY, 0, G0 + 3, 1.6, 'brass', 12); S.cylY(R - 1, GY, 0, G0 + GH - 3, 1.6, 'brass', 12);
  for (let v = 0; v <= 120; v += 10) { S.box(7.4, GY, levelZ(v / 100), v % 20 ? 3 : 5, .8, .7, 'ink'); }
  for (const v of [0, 50, 100]) put(label(String(v), 13.4, GY + .1, levelZ(v / 100), 5, 3, 'y', plateLabel));
  S.box(0, GY, levelZ(1), 12, 1.1, .6, 'red');                                                  // repère des fonds disponibles (100 %)
  const liqMat = M.liquid, liquid = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 1, 20), liqMat); liquid.userData.noGlow = true; put(liquid);
  const floatM = new THREE.Mesh(new THREE.SphereGeometry(2.7, 18, 12), M.ivory); floatM.userData.noGlow = true; floatM.castShadow = true; put(floatM);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1, 6), M.ink); cord.userData.noGlow = true; put(cord);
  /* poulie du flotteur et levier (même angle) */
  const pul = mover('poulie', [0, GY, 138]); pul.cylY(GY - 2.2, GY + 2.2, 0, 138, 5.4, 'brass', 28); pul.cylY(GY - 3, GY + 3, 0, 138, 1.3, 'steel', 12); pul.box(1, GY, 141, .9, .9, 3, 'red'); put(pul.root);
  S.box(0, GY - 4, 135, 3, 2, 6, 'steelDk', .4); S.box(0, GY + 4, 135, 3, 2, 6, 'steelDk', .4);
  const lever = mover('levier', [0, GY, 138]); lever.box(24, GY, 138, 50, 2.4, 3, 'steel', .6); lever.cylY(GY - 2, GY + 2, 50, 138, 1.8, 'bronze', 12); put(lever.root);
  S.geo('steelDk', springGeoZ(52, GY, 120, 134, 2.2, 6, .3), 0, 0, 0);

  /* ================= conduites : quatre lignes, colliers, vannes, chambre de filtrage et bac des lignes KO ================= */
  Z('conduites'); S = stat('conduites');
  PIPE_Y.forEach((y, k) => {
    const xe = -Math.sqrt(R * R - y * y);
    S.cylX(-172, xe, y, PZ, 2.4, 'steel', 18); S.cylX(xe - 3, xe, y, PZ, 4.4, 'brass', 18); S.cylX(-172, -168, y, PZ, 3.4, k % 2 ? 'steelDk' : 'brass', 16);
    for (const x of [-160, -70, -50]) { S.box(x, y, PZ - 3.6, 4, 5, 3, 'steelDk', .4); S.box(x, y, PZ - 7, 2, 2, 6, 'steelDk', .3); }
    S.box(-96, y, PZ, 12, 7, 9, 'bronze', 1); S.cylZ(-96, y, PZ + 4.5, 3, 5, 'bronze', 14); S.cylZ(-96, y, PZ + 9.5, .8, 5, 'steel', 8);
    put(label(T.PERIM[k], -165, y - 3.6, PZ + 4, 12, 3, 'y', { ...plateLabel, bg: PCOL[k], fg: '#fff' }));
  });
  /* chambre de filtrage : cadre, vitre, crépines de chaque ligne, bac d'égouttage */
  S.box(-124, -33, 30, 34, 2, 28, 'cast', .8); S.box(-124, 0, 44.8, 34, 66, 1.6, 'cast', .8); S.box(-124, 0, 14.4, 34, 66, 1.6, 'cast', .8); for (const x of [-140, -108]) S.box(x, 0, 30, 2, 66, 28, 'cast', .6);
  S.box(-124, 33.4, 30, 32, .5, 26, 'glass');
  PIPE_Y.forEach((y) => { S.box(-124, y, PZ, 1.2, 9, 12, 'steelDk', .3); for (let i = 0; i < 4; i++) S.box(-124.1, y, PZ - 4 + i * 2.6, .5, 8, .5, 'steel'); });
  S.box(-124, 0, 11, 28, 56, 2, 'steel', .5); S.box(-124, -29, 14, 28, 2, 6, 'steel', .4); S.box(-124, 29, 14, 28, 2, 6, 'steel', .4);
  put(label('FILTRE', -124, 33.8, 40, 20, 3, 'y', plateLabel));
  /* vannes : volant sur tige, tourne selon le sélecteur de périmètre */
  const wheels = PIPE_Y.map((y, k) => { const w = mover('volant ' + T.PERIM[k], [-96, y, PZ + 14]); w.cylZ(-96, y, PZ + 13, 5.2, 1.4, k < 2 ? 'steel' : 'steel', 22); w.cylZ(-96, y, PZ + 13.4, 4.4, .6, 'bakelite', 22); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; w.box(-96 + Math.cos(a) * 3, y + Math.sin(a) * 3, PZ + 14.2, 6, .8, .5, 'bakelite'); } w.cylZ(-96, y, PZ + 14.3, 1.5, 1.6, 'brass', 12); put(w.root); return w; });

  /* ================= sélecteur de périmètre : pupitre, bouton PRG / PSE / GLOBAL ================= */
  Z('pupitre'); S = stat('pupitre');
  S.box(-100, 66, 12, 70, 36, 12, 'cast', 1.4); S.box(-100, 66, 18.4, 66, 32, 1.2, 'alu', .5);
  S.cylZ(-100, 66, 19, 9, 1.4, 'steelDk', 28); for (let i = 0; i < 3; i++) { const a = (i - 1) * .9; S.box(-100 + Math.sin(a) * 12.5, 66 + Math.cos(a) * 12.5, 20, .8, 1.6, .6, 'steel'); }
  const knob = mover('sélecteur', [-100, 66, 21]); knob.cylZ(-100, 66, 20.4, 6.4, 4, 'bakelite', 28); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; knob.box(-100 + Math.cos(a) * 6.5, 66 + Math.sin(a) * 6.5, 22.4, 1, 1, 3.2, 'steelDk'); } knob.box(-100, 66 + 3, 24.6, 1.2, 4, .6, 'red'); put(knob.root);
  [['PRG', -.9], ['PSE', 0], ['GLOBAL', .9]].forEach(([t, a]) => put(label(t, -100 + Math.sin(a) * 17, 66 + Math.cos(a) * 17, 19.8, 11, 2.8, 'z', plateLabel)));
  put(label('PERIMETRE', -100, 82.4, 15, 26, 3, 'y', plateLabel));

  /* ================= cadran, déclencheurs, cloches, courriers, registre ================= */
  Z('alertes'); S = stat('alertes');
  S.box(116, 10, 26, 110, 60, 40, 'cast', 1.6); S.box(116, 40.4, 26, 108, .8, 38, 'steelDk', .4); S.box(116, -10, 78, 110, 6, 64, 'cast', 1.2);
  S.cylY(-6, 11, 116, 92, 26, 'cast', 48); S.cylY(10, 12, 116, 92, 24.4, 'brass', 48);
  const dialMesh = new THREE.Mesh(new THREE.CircleGeometry(21.6, 48), new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: .55 })); dialMesh.position.set(116, 92, 12.1); dialMesh.userData.noGlow = true; put(dialMesh);
  const needle = mover('aiguille', [116, 13, 92]); needle.box(116, 13.2, 99, 1.2, .6, 17, 'red'); needle.cylY(12.5, 14.8, 116, 92, 2.4, 'steel', 14); needle.box(116, 13.2, 86, 1.6, .6, 6, 'red'); put(needle.root);
  const marker = mover('repère du seuil', [116, 12.6, 92]); marker.box(116, 12.8, 112.6, 3.4, .8, 4, 'amber', .3); put(marker.root);
  S.box(116, 40.2, 20.2, 82, .8, 6, 'steel', .4); S.cylY(40, 40.8, 80, 20.2, 1.2, 'brass', 8); S.cylY(40, 40.8, 152, 20.2, 1.2, 'brass', 8);
  for (let v = 50; v <= 100; v += 10) S.box(80 + (v - 50) / 50 * 72, 40.7, 22.7, .6, .5, v % 20 ? 1.6 : 2.6, 'ink');
  const slider = mover('curseur de seuil', [116, 41, 20.2]); slider.box(116, 41.4, 20.2, 7, 1.6, 6, 'amber', .5); slider.box(116, 42.4, 20.2, 2, 1, 8.6, 'brass', .3); put(slider.root);
  put(label('SEUIL PREVENTIF %', 116, 40.8, 14.2, 40, 3, 'y', plateLabel)); [50, 75, 100].forEach((v) => put(label(String(v), 80 + (v - 50) / 50 * 72, 40.9, 27.2, 8, 2.6, 'y', plateLabel)));
  /* déclencheurs : cloche, marteau, loquet de mémoire, fente de courrier */
  const bells = [92, 140].map((x, i) => {
    S.cylZ(x, 24, 46, 1.4, 12, 'steelDk', 10); S.cylZ(x, 24, 56, 9, 12, 'brass', 30, 3.6); S.cylZ(x, 24, 68, 1.6, 2, 'steel', 10);
    const h = mover('marteau ' + (i + 1), [x + 14, 24, 60]); h.box(x + 10.5, 24, 60, 8, 1.4, 1.4, 'steel', .3); h.cylZ(x + 7, 24, 58.4, 1.8, 3.2, 'brass', 12); h.cylY(23, 25, x + 14, 60, 1.4, 'steelDk', 10); put(h.root);
    S.box(x, 24, 49, 18, 12, 2, 'steelDk', .5);
    S.box(x, 40.8, 33, 26, .4, 5, 'ink'); put(label(i ? 'DEPASSEMENT' : 'PREVENTIF', x, 40.9, 38.2, 24, 3, 'y', plateLabel));
    S.box(x + 17, 36, 46, 4, 6, 12, 'steelDk', .4); const l = mover('loquet ' + (i + 1), [x + 17, 36, 50]); l.cylZ(x + 17, 36, 49, 1.4, 6, 'bronze', 10); l.box(x + 17, 36, 56, 5, 3, 1.4, i ? 'red' : 'amber', .3); put(l.root);
    const slip = new THREE.Mesh(new THREE.PlaneGeometry(22, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: slipTexture(i ? 'DEPASSEMENT FONDS' : 'SEUIL PREVENTIF', i ? '#c8372d' : '#d79a2b'), roughness: .9, side: THREE.DoubleSide })); slip.userData.noGlow = true; put(slip);
    return { h, l, slip };
  });
  S.box(116, 24, 47.4, 36, 24, 1.6, 'cast', .8);
  const lc = cv(160, 96), lctx = lc.getContext('2d'), lTex = tex(lc, 8); ledgerTexture(lctx, 0, 0);
  const ledger = new THREE.Mesh(new THREE.PlaneGeometry(36, 21.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: lTex, roughness: .88 })); ledger.position.set(116, 48.4, 24); ledger.userData.noGlow = true; put(ledger); let lKey = '';
  const LAMPS = [['#ffb347', 'PREV.'], ['#e5584b', 'DEP.']].map(([c, t], i) => { const l = lamp(104 + i * 24, 40.8, 8, 2.1, c, 'y'); put(l); return l; });

  /* ================= perles de flux (fluide coloré) ================= */
  const NB = 14, beadG = new THREE.SphereGeometry(1.5, 10, 8), beads = new THREE.InstancedMesh(beadG, new THREE.MeshStandardMaterial({ roughness: .2, metalness: .1 }), 4 * NB); beads.userData.noGlow = true;
  for (let p = 0; p < 4; p++) for (let j = 0; j < NB; j++) beads.setColorAt(p * NB + j, new THREE.Color(PCOL[p])); put(beads, 'conduites');

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [pul, lever, ...wheels, knob, needle, marker, slider].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + 56;
  meshes.push(liquid, floatM, ...bells.map((b) => b.slip), ledger, dialMesh);

  const ZOFF = { bati: [0, 0, 0], reservoir: [0, 0, 60], conduites: [-60, 0, 8], pupitre: [0, 50, 4], alertes: [60, 0, 20] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), tank: new THREE.Object3D(), dial: new THREE.Object3D(), pipes: new THREE.Object3D() };
  at(anchors.all, 0, 0, 70); at(anchors.tank, 0, 20, 80); at(anchors.dial, 116, 20, 90); at(anchors.pipes, -110, 10, 30);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, lastK = 0, lastTime = 0;
  const zero = new THREE.Vector3(.001, .001, .001), m4 = new THREE.Matrix4(), unit = new THREE.Vector3(1, 1, 1), qI = new THREE.Quaternion();
  const ANG = (v) => 2.356 - 4.712 * clamp(v / 1.2, 0, 1);       // 0 % en bas à gauche, 120 % en bas à droite

  const curU = () => Math.max(0, lastTime - T.CUSTOM.base), toLevel = (v) => { if (forced === 2) T.setCons(v / Math.max(.05, 1 - T.share(T.CUSTOM.now.sel, T.CUSTOM.now.excl)), curU()); };
  function update(time) {
    lastTime = time; if (forced === 2 && !T.CUSTOM.started) T.startCustom(time);
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u } = T.locate(time, forced); lastK = k;
    const r = T.ratio(u, k), th = T.thr(u, k), vz = T.valves(u, k, forced), zl = levelZ(r), h = Math.max(.1, zl - G0);
    /* niveau, flotteur, câble, poulie, aiguille, levier */
    liquid.scale.y = h; at(liquid, 0, GY, G0 + h / 2); at(floatM, 0, GY, zl + 1.2);
    const ch = 138 - (zl + 3.9); cord.scale.y = Math.max(.1, ch); at(cord, 0, GY, zl + 3.9 + ch / 2);
    pul.root.rotation.z = -r * 3; lever.root.rotation.z = r / 1.2 * .45;
    needle.root.rotation.z = ANG(r) * 1; marker.root.rotation.z = ANG(th) * 1;
    slider.root.position.x = 116 + (80 + (th * 100 - 50) / 50 * 72 - 116);
    /* lignes : volants, perles */
    wheels.forEach((w, i) => { w.root.rotation.y = vz.open[i] * 2.6; }); knob.root.rotation.y = vz.angle;
    const fl = T.inflow(u, k);
    for (let p = 0; p < 4; p++) for (let j = 0; j < NB; j++) {
      const ph = (u / 4 + j / NB + p * .11) % 1, xe = -Math.sqrt(R * R - PIPE_Y[p] ** 2) - 2, x = -168 + ph * (xe + 168), ko = j % 4 === 0;
      let z = PZ, vis = vz.open[p] * (fl > .05 ? 1 : 0) > .3;
      if (ko && x > -124) { const d = clamp((x + 124) / 6, 0, 1); z = PZ - 13 * d * d; if (z < 13) vis = false; }
      m4.compose(new THREE.Vector3(x, z, PIPE_Y[p]), qI, vis ? unit : zero); beads.setMatrixAt(p * NB + j, m4);
    }
    beads.instanceMatrix.needsUpdate = true;
    /* alertes */
    const al = [T.alert(0, u, k), T.alert(1, u, k)];
    bells.forEach((b, i) => { b.h.root.rotation.z = al[i].bell * .45; b.l.root.position.y = 50 - 3.6 * al[i].latch; b.slip.visible = al[i].slip > .01; at(b.slip, [92, 140][i], 36 + 16 * al[i].slip, 33.2); setLamp(LAMPS[i], al[i].fired ? 1 : 0); });
    const key = Math.round(al[0].ledger * 4) + '|' + Math.round(al[1].ledger * 4); if (key !== lKey) { lKey = key; ledgerTexture(lctx, al[0].ledger, al[1].ledger); lTex.needsUpdate = true; }
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'La cuve', anchor: 'tank' }, { label: 'Le cadran', anchor: 'dial' }, { label: 'Les lignes', anchor: 'pipes' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short, edit: !!s.edit, editT: s.editT, hold: s.hold })), setScenario(i) { forced = i == null ? null : ((i % 3) + 3) % 3; if (forced === 2) T.startCustom(lastTime); }, get scenario() { return forced; },
      /* scénario C « Mon réservoir » : périmètre, consommation, seuil, lignes KO, réarmement. Métaphore de surveillance : aucune dépense n'est bloquée. */
      params: {
        visible: () => forced === 2,
        groups: [
          { name: 'Périmètre', options: T.SEL.map((s, i) => ({ label: s.id, run: () => { if (forced === 2) T.setScope(i, T.CUSTOM.now.excl, curU()); } })), get: () => T.CUSTOM.now.sel },
          { name: 'Consommation', options: [{ label: '−10 pts', run: () => { if (forced === 2) T.setCons(T.CUSTOM.now.cons - .1, curU()); } }, { label: '+10 pts', run: () => { if (forced === 2) T.setCons(T.CUSTOM.now.cons + .1, curU()); } }, { label: 'Vers 70 %', run: () => toLevel(.7) }, { label: 'Vers 110 %', run: () => toLevel(1.1) }], get: () => -1 },
          { name: 'Seuil préventif', options: [{ label: '−5 pts', run: () => { if (forced === 2) T.setThr(T.CUSTOM.now.thr - .05, curU()); } }, { label: '+5 pts', run: () => { if (forced === 2) T.setThr(T.CUSTOM.now.thr + .05, curU()); } }], get: () => -1 },
          { name: 'Lignes KO', options: [{ label: 'Exclues', run: () => { if (forced === 2) T.setScope(T.CUSTOM.now.sel, true, curU()); } }, { label: 'Incluses', run: () => { if (forced === 2) T.setScope(T.CUSTOM.now.sel, false, curU()); } }], get: () => (T.CUSTOM.now.excl ? 0 : 1) },
          { name: 'Alertes', options: [{ label: 'Réarmer', run: () => { if (forced === 2) T.rearm(curU()); } }], get: () => -1 }
        ]
      },
      status() {
        if (forced !== 2) return ''; const u = curU(), S = T.simulate(u), n = T.CUSTOM.now, pct = (v) => Math.round(v * 100) + ' %';
        const hist = S.hist.slice(-4).map((h) => Math.round(h.t) + ' s ' + (h.kind ? 'dépassement des fonds' : 'seuil préventif') + ' à ' + pct(h.level)).join(' ; ');
        return 'Niveau ' + pct(T.levelAt(u)) + ' · seuil ' + pct(n.thr) + ' · ' + T.SEL[n.sel].id + ' · lignes KO ' + (n.excl ? 'exclues (' + Math.round(T.share(n.sel, true) * 100) + ' pts en moins)' : 'incluses') + (hist ? ' · alertes : ' + hist : ' · aucune alerte') + ' · aucune dépense n’est bloquée';
      },
      /* clic sur le cadran : seuil +5 pts (retour à 50 % après 95 %) ; clic sur la cuve : consommation +10 pts (retour à 20 % après 130 %) */
      drag: (() => {
        const inv = new THREE.Matrix4(), r = new THREE.Ray(), hit = new THREE.Vector3();
        const onPlane = (ray, zs) => { inv.copy(g.matrixWorld).invert(); r.copy(ray).applyMatrix4(inv); if (Math.abs(r.direction.z) < 1e-6) return null; const t = (zs - r.origin.z) / r.direction.z; if (t < 0) return null; r.at(t, hit); return { x: hit.x, z: hit.y }; };
        return {
          pick(ray) {
            if (forced !== 2 || inspect.v > .05) return null;
            const d = onPlane(ray, 12.1); if (d && Math.hypot(d.x - 116, d.z - 92) < 22) { T.setThr(T.CUSTOM.now.thr >= .95 ? .5 : T.CUSTOM.now.thr + .05, curU()); return { id: 'dial', name: 'seuil' }; }
            const k = onPlane(ray, R); if (k && Math.abs(k.x) < R && k.z > 30 && k.z < 130) { T.setCons(T.CUSTOM.now.cons >= 1.3 ? .2 : T.CUSTOM.now.cons + .1, curU()); return { id: 'tank', name: 'consommation' }; }
            return null;
          }, move() {}, end() {}
        };
      })()
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + [T.STEPS_A, T.STEPS_B, T.STEPS_C][lastK][v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u, l.k) + 1; }, seek: (v) => T.STEP_T[lastK][v - 1] + .4 }
  };
}
