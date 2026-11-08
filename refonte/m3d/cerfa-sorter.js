// CERFA V3 : trieuse optique de documents réglementaires.
// Un lot de dix feuilles est placé dans la trémie ; un séparateur les prend une à une ; la bande les conduit dans la chambre de lecture (ligne lumineuse, champs reconnus) ;
// un module F-Gas contrôle les mentions de fluide, d'attestation et d'échéance (drapeau rouge si écart) ; la feuille s'arrête devant le bac choisi et son poussoir la rentre.
// Cinq bacs : exploitable, incomplet, doublon, anomalie, non reconnu ; un compteur mécanique par bac ; un registre affiche la table structurée qui se constitue.
// Ce n'est pas une vérification réglementaire : l'anomalie est signalée pour examen humain. Documents et valeurs fictifs. Contrat : build() -> { group, update(time), controls, api }.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, TAU } from './machine-kit.js';
import * as T from './cerfa-timeline.js';
import { industrial } from './pro-materials.js';

export const WIDTH = 440;
const SW = 24, SD = 30, BZ = T.BELT.z, plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' };
const DCOL = ['#2d7a4f', '#d79a2b', '#2f6fb3', '#c8372d', '#6b6b73'];

/* ---------------- textures ---------------- */
const MONO = '700 11px ui-monospace,Menlo,Consolas,monospace';
/** une feuille par type de document (fictif) : attestation, fiche d'intervention, facture, courrier manuscrit ; les champs lus sont imprimés, un champ manquant reste vide */
function docTexture(doc, fixed) {
  const c = cv(192, 240), x = c.getContext('2d'), kind = doc.kind, fields = doc.fields.map((f, j) => (fixed && doc.fix && doc.fix.field === j ? { ...f, ok: 1, v: doc.fix.v } : f));
  const paper = { att: '#f4efe0', fiche: '#eef3ea', fact: '#f6efe2', lettre: '#f7f3e6' }[kind]; x.fillStyle = paper; x.fillRect(0, 0, 192, 240);
  x.strokeStyle = '#6a6252'; x.lineWidth = 2; x.strokeRect(4, 4, 184, 232); x.textBaseline = 'alphabetic';
  if (kind === 'lettre') {                                                                  // courrier manuscrit : lignes et écriture libre, aucun gabarit imprimé
    x.strokeStyle = '#b9c4d6'; x.lineWidth = 1; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(10, 34 + i * 17); x.lineTo(182, 34 + i * 17); x.stroke(); }
    x.strokeStyle = '#27344f'; x.lineWidth = 1.6; for (let i = 0; i < 9; i++) { x.beginPath(); let px = 16, py = 30 + i * 17; x.moveTo(px, py); for (let k = 0; k < 14; k++) { px += 6 + ((i * 7 + k * 5) % 5); py = 30 + i * 17 + Math.sin(k * 1.7 + i) * 3.2; x.lineTo(px, py); if (px > 170) break; } x.stroke(); }
    if (fixed) { x.fillStyle = '#2f6fb3'; x.fillRect(120, 214, 52, 14); x.fillStyle = '#fff'; x.font = MONO; x.fillText('FICHE', 128, 225); }
    return tex(c, 8);
  }
  const head = { att: '#2f6fb3', fiche: '#2d7a4f', fact: '#c77d1f' }[kind]; x.fillStyle = head; x.fillRect(4, 4, 184, 30); x.fillStyle = '#fff'; x.font = '700 12px ui-monospace,Menlo,Consolas,monospace'; x.fillText(doc.title, 12, 24);
  x.fillStyle = '#2a251d'; x.font = '700 9px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DEMO FICTIVE', 12, 46);
  fields.forEach((f, j) => {
    const y = 56 + j * 34; x.strokeStyle = '#8a8272'; x.lineWidth = 1.5; x.strokeRect(12, y, 168, 26); x.fillStyle = '#6a6252'; x.font = '700 8px ui-monospace,Menlo,Consolas,monospace'; x.fillText(f.n, 16, y + 9);
    if (f.v) { x.fillStyle = fixed && doc.fix && doc.fix.field === j ? '#2f6fb3' : '#1d1a14'; x.font = '700 13px ui-monospace,Menlo,Consolas,monospace'; x.fillText(f.v, 18, y + 21); }
  });
  if (kind === 'fact') { x.strokeStyle = '#c9c0a4'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(12, 170 + i * 11); x.lineTo(180, 170 + i * 11); x.stroke(); } x.fillStyle = '#c77d1f'; x.fillRect(112, 214, 68, 14); }
  else if (kind === 'fiche') { for (let i = 0; i < 4; i++) { x.strokeStyle = '#2d7a4f'; x.strokeRect(14, 166 + i * 14, 8, 8); x.fillStyle = '#2d7a4f'; if (i < 3) { x.beginPath(); x.moveTo(15, 170 + i * 14); x.lineTo(18, 174 + i * 14); x.lineTo(22, 165 + i * 14); x.stroke(); } x.fillRect(30, 168 + i * 14, 60 + i * 12, 3); } }
  else { x.strokeStyle = '#2f6fb3'; x.strokeRect(12, 170, 168, 36); x.fillStyle = '#6a6252'; x.font = '700 8px ui-monospace,Menlo,Consolas,monospace'; x.fillText('SIGNATURE', 16, 180); if (fields[2] && fields[2].n === 'SIGNATURE' ? fields[2].ok : 1) { x.strokeStyle = '#27344f'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(30, 198); x.bezierCurveTo(50, 176, 60, 210, 80, 190); x.bezierCurveTo(95, 178, 110, 206, 150, 188); x.stroke(); } x.fillStyle = '#2f6fb3'; x.beginPath(); x.arc(160, 222, 8, 0, TAU); x.fill(); }
  if (doc.fgas) { x.strokeStyle = '#c8372d'; x.lineWidth = 1.5; x.strokeRect(120, 8, 60, 20); }
  return tex(c, 8);
}
function digitDrum() {
  const c = cv(640, 64), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 640, 64); x.fillStyle = '#1d1a14'; x.font = '700 50px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let d = 0; d < 10; d++) { x.save(); x.translate((9 - d) * 64 + 32, 33); x.rotate(Math.PI / 2); x.fillText(String(d), 0, 2); x.restore(); x.fillStyle = '#b9ae92'; x.fillRect((9 - d) * 64, 0, 1, 64); x.fillStyle = '#1d1a14'; }
  return tex(c, 8);
}
function beltTexture() {
  const c = cv(64, 64), x = c.getContext('2d'); x.fillStyle = '#1e1f24'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2d2f36'; for (let i = 0; i < 4; i++) x.fillRect(i * 16 + 2, 0, 5, 64); x.fillStyle = '#3a3d46'; x.fillRect(0, 0, 64, 2);
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(T.BELT.x1 / 6.2832 - T.BELT.x0 / 6.2832, 1); return t;
}
function detailTexture(ctx, d, fields, dest, reason, note) {
  ctx.fillStyle = '#10161f'; ctx.fillRect(0, 0, 192, 256); ctx.fillStyle = '#8fb3d9'; ctx.font = '700 12px ui-monospace,Menlo,Consolas,monospace'; ctx.fillText('FEUILLE LUE', 10, 18); ctx.fillRect(10, 24, 172, 1);
  ctx.fillStyle = '#d8e4f2'; ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; ctx.fillText(d.title.slice(0, 22), 10, 42);
  fields.forEach((f, j) => { const y = 64 + j * 22; if (!f.n) return; ctx.fillStyle = f.ok ? '#5fd39a' : '#e5584b'; ctx.fillRect(10, y - 10, 8, 12); ctx.fillStyle = '#d8e4f2'; ctx.fillText(f.n + ' ' + (f.v || 'MANQUANT'), 24, y); });
  ctx.fillStyle = DCOL[dest]; ctx.fillRect(10, 134, 172, 18); ctx.fillStyle = '#fff'; ctx.fillText('BAC ' + T.DESTS[dest], 14, 147);
  ctx.fillStyle = '#8fb3d9'; ctx.font = '700 9px ui-monospace,Menlo,Consolas,monospace'; wrap(ctx, 'MOTIF : ' + reason, 10, 168, 172, 12);
  if (d.fgas) { ctx.fillStyle = '#ffb347'; wrap(ctx, 'SIGNALEMENT POUR EXAMEN HUMAIN. PAS UNE DECISION REGLEMENTAIRE.', 10, 214, 172, 12); }
  if (note) { ctx.fillStyle = '#5fd39a'; wrap(ctx, note, 10, 214, 172, 12); }
}
function wrap(ctx, text, x, y, w, lh) { let line = ''; for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > w && line) { ctx.fillText(line, x, y); y += lh; line = word; } else line = t; } ctx.fillText(line, x, y); }
function registerTexture(ctx, rows, fade) {
  ctx.fillStyle = '#10161f'; ctx.fillRect(0, 0, 192, 256); ctx.fillStyle = '#8fb3d9'; ctx.font = '700 12px ui-monospace,Menlo,Consolas,monospace'; ctx.fillText('TABLE STRUCTUREE', 10, 18); ctx.fillRect(10, 24, 172, 1);
  ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace';
  rows.forEach((r, n) => { const y = 42 + n * 20; ctx.globalAlpha = fade; ctx.fillStyle = DCOL[r.d]; ctx.fillRect(10, y - 10, 8, 12); ctx.fillStyle = '#d8e4f2'; ctx.fillText(String(r.i + 1).padStart(2, '0') + ' ' + T.DESTS[r.d], 24, y); ctx.globalAlpha = 1; });
}

export function build() {
  const g = new THREE.Group(), M = industrial(workshopMats(makeMats()));
  M.glass2 = new THREE.MeshStandardMaterial({ color: '#a9cfe3', roughness: .08, metalness: .05, transparent: true, opacity: .2, depthWrite: false });
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [];

  /* ================= bâti : plinthe, châssis, pieds, plaque ================= */
  Z('bati'); let S = stat('bati');
  S.box(0, 12, 3, 420, 150, 6, 'enamel', 1.4);                                                    // table émaillée
  S.box(0, 86.3, 3, 420, 1.4, 5, 'alu', .4); S.box(0, -61.3, 3, 420, 1.4, 5, 'alu', .4);        // chants en aluminium brossé
  for (let i = 0; i < 12; i++) S.box(-176 + i * 32, 87.2, 3, 14, .5, 1.8, 'ink', .2);           // ouïes de ventilation en façade
  for (const [x, y] of [[-196, -56], [196, -56], [-196, 76], [196, 76]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);
  S.box(0, -12, 18, 380, 36, 24, 'enamelDk', 2);                                                     // châssis (z 6 à 30), y -30 à 6
  S.box(0, 6.2, 18, 380, 1, 24, 'steelDk', .3);
  for (const x of [-180, -90, 0, 90, 180]) S.bolts([[x, 6.8, 12], [x, 6.8, 26]], 'y', 1.2, 'brass');
  for (const x of [-100, 100]) { S.box(x, -30.2, 18, 72, 1.4, 16, 'enamel', .6); S.bolts([[x - 32, -31.2, 12], [x + 32, -31.2, 12], [x - 32, -31.2, 24], [x + 32, -31.2, 24]], 'y', .9, 'steel'); S.cylX(x - 8, x + 8, -32.4, 18, 1, 'steel', 12); }   // trappes d'inspection arrière
  S.box(0, 86.7, 3, 150, 1.2, 6, 'alu', .3);
  put(label('CERFA V3  TRIEUSE', -20, 87.4, 3, 100, 5, 'y', plateLabel)); put(label('DEMO FICTIVE', 62, 87.4, 3, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= transport : bande, rouleaux d'entraînement, poulies, moteur ================= */
  Z('transport'); S = stat('transport');
  const bx0 = T.BELT.x0, bx1 = T.BELT.x1, bl = bx1 - bx0, bcx = (bx0 + bx1) / 2;
  for (const y of [-15.5, 15.5]) S.box(bcx, y, 37.6, bl + 8, 2, 8.4, 'steel', .5);                 // rails latéraux
  for (const x of [-110, -60, 0, 60, 120, 150]) { S.box(x, -15.5, 33, 6, 6, 6, 'steelDk', .4); S.box(x, 15.5, 33, 6, 6, 6, 'steelDk', .4); S.box(x, 0, 30.7, 8, 36, 1.4, 'steelDk', .4); }   // consoles
  const beltMat = new THREE.MeshStandardMaterial({ map: beltTexture(), roughness: .85 }), beltMesh = new THREE.Mesh(new THREE.BoxGeometry(bl, 1.2, 28), beltMat); beltMesh.position.set(bcx, BZ - .6, 0); beltMesh.receiveShadow = true; beltMesh.userData.noGlow = true; put(beltMesh);
  const pulleys = [bx0 - 1.5, bx1 + 1].map((x) => { const p = mover('poulie', [x, 0, BZ - 4.2]); p.cylY(-14.5, 14.5, x, BZ - 4.2, T.ROLL_R + .2, 'steel', 28); p.cylY(-17, 17, x, BZ - 4.2, 1.2, 'steelDk', 12); put(p.root); return p; });
  const lower = [], upper = [];
  for (const x of [-98, -78, -58, 6]) {
    const lo = mover('rouleau bas', [x, 0, BZ - T.ROLL_R]); lo.cylY(-13, 13, x, BZ - T.ROLL_R - .4, T.ROLL_R - .4, 'steel', 24); lo.cylY(-16, 16, x, BZ - T.ROLL_R - .4, 1, 'steelDk', 10); put(lo.root); lower.push(lo);
    const up = mover('rouleau haut', [x, 0, BZ + T.ROLL_R + .3]); up.cylY(-13, 13, x, BZ + T.ROLL_R + .3, T.ROLL_R, 'rubber', 28); up.cylY(-17, 17, x, BZ + T.ROLL_R + .3, 1, 'steelDk', 10); put(up.root); upper.push(up);
    S.box(x, -17.5, BZ + 4.3, 4, 3, 14, 'steelDk', .4); S.box(x, 17.5, BZ + 4.3, 4, 3, 14, 'steelDk', .4);                                        // chapes
  }
  S.box(166, -22, 36, 22, 18, 12, 'graphite', 1); S.cylY(-31, -22, 166, 36, 4.4, 'steel', 20); S.bolts([[160, -22, 42.2], [172, -22, 42.2]], 'z', 1, 'steelDk');     // motoréducteur (extrémité)

  /* ================= trémie : plateau élévateur, pile de feuilles, guides réglables, rouleau de prise et séparateur ================= */
  Z('tremie'); S = stat('trémie');
  S.box(-146, 0, 38.5, 40, 36, 3, 'steel', .6); S.box(-146, 0, 33.5, 38, 40, 7, 'cast', .8);
  for (const y of [-18.5, 18.5]) S.box(-146, y, 47, 38, 1.8, 16, 'alu', .5);                    // guides latéraux
  S.box(-165, 0, 47, 2, 38, 20, 'alu', .5);                                                       // butée arrière
  S.cylY(-24, 24, -146, 60, 1.1, 'steel', 10); S.cylX(-146, -146, 0, 0, 1, 'steel', 6);
  S.box(-146, -24, 56, 6, 4, 8, 'steelDk', .5); S.box(-146, 24, 56, 6, 4, 8, 'steelDk', .5);   // vis de réglage des guides
  S.box(-146, 28, 60, 8, 4, 8, 'brass', .6);
  const feed = mover('rouleau de prise', [-146, 0, 53]); feed.cylY(-10, 10, -146, 53, 4.6, 'rubber', 26); feed.cylY(-14, 14, -146, 53, 1, 'steelDk', 10); put(feed.root);
  S.box(-146, 0, 62, 14, 36, 4, 'cast', .8); S.bolts([[-150, 16, 64.2], [-142, 16, 64.2], [-150, -16, 64.2], [-142, -16, 64.2]], 'z', .9, 'steelDk');
  const stackMat = new THREE.MeshStandardMaterial({ color: '#f1ead7', roughness: .9 });
  const hop = new THREE.Mesh(new THREE.BoxGeometry(SW, 1, SD), stackMat); hop.castShadow = true; hop.userData.noGlow = true; put(hop);
  put(label('LOT', -146, 31.6, 34, 14, 3, 'y', plateLabel));

  /* ================= chambre optique : capot vitré, tête de balayage, voyants des champs ================= */
  Z('optique'); S = stat('optique');
  S.box(-25, -19, 58, 46, 2, 28, 'cast', 1); S.box(-25, 0, 73, 46, 40, 2, 'cast', 1); for (const x of [-48, -2]) S.box(x, 0, 58, 2, 40, 28, 'cast', .8);
  S.box(-25, 19.4, 44, 46, 1.2, 2.4, 'alu', .4); S.box(-25, 19.4, 72, 46, 1.2, 2.4, 'alu', .4);
  S.box(-25, 19.8, 58, 44, .5, 26, 'glass2');
  S.box(-25, -6, 64, 18, 10, 6, 'graphite', .8); S.cylZ(-25, -6, 56, 3.6, 8, 'steel', 20); S.cylZ(-25, -6, 52, 2.2, 4, 'glass', 18);   // objectif
  S.cylX(-46, -4, -14, 50, .8, 'steelDk', 8); S.cylX(-46, -4, 14, 50, .8, 'steelDk', 8);          // rails de la barre lumineuse
  const scanM = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: '#5aa0ff', emissiveIntensity: 0 }), scanBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, .6, 28), scanM); scanBar.userData.noGlow = true; put(scanBar);
  const fieldMs = [0, 1, 2].map((j) => { const m = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: '#5fd39a', emissiveIntensity: 0, transparent: true, opacity: .75 }); const f = new THREE.Mesh(new THREE.BoxGeometry(14, .3, 4), m); f.userData.noGlow = true; put(f); return [f, m]; });
  const famLamp = lamp(-8, 19.9, 66, 1.8, '#5aa0ff', 'y'); put(famLamp); put(label('FAMILLE', -8, 19.6, 62, 10, 2.6, 'y', plateLabel));
  /* module F-Gas : caisson vitré, trois voyants (fluide, attestation, échéance) et drapeau d'anomalie */
  S.box(-25, -19, 86, 46, 2, 24, 'iron', 1); S.box(-25, 0, 98.8, 46, 40, 1.6, 'iron', 1); for (const x of [-48, -2]) S.box(x, 0, 86, 2, 40, 24, 'iron', .8); S.box(-25, 20.2, 86, 44, .5, 22, 'glass2');
  S.box(-25, 18.6, 80, 40, 1.2, 8, 'ink'); S.bolts([[-46, 20.6, 76], [-4, 20.6, 76], [-46, 20.6, 96], [-4, 20.6, 96]], 'y', .9, 'brass');
  const fgL = [-37, -25, -13].map((x, i) => { const l = lamp(x, 18.8, 80, 2.1, '#5fd39a', 'y'); put(l); put(label(['FLUIDE', 'ATTEST.', 'ECHEANCE'][i], x, 19, 75, 11, 2.6, 'y', plateLabel)); return l; });
  const flag = mover('drapeau F-Gas', [-8, 12, 92]); flag.cylX(-10, -6, 12, 92, 1.3, 'steel', 10); flag.box(-8, 12, 85.5, 1.4, 1.2, 13, 'steelDk', .3); flag.box(-3.5, 12, 80.5, 9, 1.4, 6, 'red', .4); put(flag.root);
  put(label('F-GAS', -25, 20.6, 100, 18, 3.4, 'y', plateLabel));

  /* ================= bacs : cinq poches à poussoir, fenêtre vitrée sur la pile, compteur à tambour ================= */
  Z('bacs'); S = stat('bacs');
  const drumMat = new THREE.MeshStandardMaterial({ map: digitDrum(), roughness: .55 }), drums = [], pushers = [], stacks = [], binLamps = [];
  T.BIN_X.forEach((x, k) => {
    S.box(x, 37, 6.8, 26, 38, 1.6, 'steel', .5);
    S.box(x - 12.4, 37, 28, 1.2, 38, 42, 'alu', .5); S.box(x + 12.4, 37, 28, 1.2, 38, 42, 'alu', .5); S.box(x, 55.4, 53, 26, 1.2, 6, 'alu', .5); S.box(x, 18.6, 18, 26, 1.2, 24, 'cast', .8); S.box(x, 18.6, 52, 26, 1.2, 8, 'cast', .8);
    S.box(x, 37, 56.4, 26, 38, 1.2, 'cast', .8);                                                                  // dessus
    S.box(x, 18.3, 42, 22, .5, 3, 'ink');                                                                          // fente d'entrée
    S.box(x, 55.8, 30, 24, .5, 36, 'glass2');
    S.box(x, 55.4, 8.4, 26, 1.2, 4, 'steelDk', .4);
    const dr = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 12, 20).rotateZ(Math.PI / 2), drumMat); dr.position.set(x, 53, 54); dr.castShadow = true; dr.userData.noGlow = true; put(dr); drums.push(dr);
    S.box(x, 56, 53.2, 18, .6, 6.6, 'ink'); put(label(T.DESTS[k], x, 55.9, 46.4, 24, 3, 'y', plateLabel));
    const st = new THREE.Mesh(new THREE.BoxGeometry(SW - 2, 1, SD - 2), stackMat); st.position.set(x, 8, 36); st.userData.noGlow = true; put(st); stacks.push(st);
    const bl = lamp(x, 37, 57.4, 2.2, ['#5fd39a', '#ffb347', '#5aa0ff', '#e5584b', '#a9a9b5'][k], 'z'); put(bl); binLamps.push(bl);
    /* poussoir : vérin fixe derrière la bande, tige et plateau */
    S.box(x, -23, 44, 14, 10, 12, 'graphite', .8); S.cylY(-27, -22, x, 44, 3.4, 'steelDk', 18);
    const p = mover('poussoir ' + (k + 1), [x, -16, 44.4]); p.cylY(-22, -17.6, x, 44.4, 1.3, 'steel', 10); p.box(x, -16.5, 44.4, 16, 1.6, 4, 'steelDk', .5); p.box(x, -16.4, 44.4, 12, .6, 2, 'alu', .3); put(p.root); pushers.push(p);
  });
  /* ================= registre structuré : écran, plateau d'export et ruban ================= */
  Z('registre'); S = stat('registre');
  S.box(183, 8, 44, 34, 18, 76, 'cast', 1.4); S.box(183, -4, 20, 34, 18, 28, 'cast', 1); S.box(183, 17.6, 66, 28, .6, 40, 'ink'); S.bolts([[168, 17.4, 36], [198, 17.4, 36], [168, 17.4, 90], [198, 17.4, 90]], 'y', 1.1, 'brass');
  const rc = cv(192, 256), rctx = rc.getContext('2d'), rTex = tex(rc, 8); registerTexture(rctx, [], 1);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(26, 34.6), new THREE.MeshStandardMaterial({ map: rTex, roughness: .4, emissive: '#2a3a52', emissiveMap: rTex, emissiveIntensity: .5 })); screen.position.set(183, 66, 18); screen.userData.noGlow = true; put(screen);
  S.box(183, 23, 24, 30, 12, 3, 'steel', .6);
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(14, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f1ead7', roughness: .9, side: THREE.DoubleSide })); tape.userData.noGlow = true; put(tape);
  put(label('EXPORT', 183, 17.7, 28, 22, 3, 'y', plateLabel)); let regKey = '';

  /* ================= pupitre de réglage : clavier numérique, sélecteur de catégorie ================= */
  Z('pupitre'); S = stat('pupitre');
  S.box(-120, 52, 14, 90, 46, 16, 'cast', 1.6); S.box(-120, 52, 22.4, 86, 42, 1.2, 'alu', .5);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { S.cylZ(-146 + c * 9, 40 + r * 9, 23, 3.4, 2.2, 'ivory', 18); S.cylZ(-146 + c * 9, 40 + r * 9, 22.8, 3.8, .8, 'brass', 18); }
  S.box(-110, 44, 23, 30, 12, 1.2, 'ink'); S.box(-110, 44, 23.8, 28, 10, .3, 'glass'); put(label('LOT 10', -110, 44, 24.2, 20, 6, 'z', { ...plateLabel, w: 256, h: 64 }));
  S.cylZ(-92, 64, 22.4, 7.4, 1.2, 'steelDk', 26); for (let i = 0; i < 11; i++) { const a = Math.PI * .75 + i / 10 * Math.PI * 1.5; S.box(-92 + Math.cos(a) * 9, 64 + Math.sin(a) * 9, 23, .8, 1.6, .6, 'steel'); }
  const dial = mover('sélecteur de catégorie', [-92, 64, 24]); dial.cylZ(-92, 64, 23.6, 5.6, 3.6, 'bakelite', 28); dial.box(-92, 64 + 2.8, 27.4, 1.2, 3.6, .6, 'red'); put(dial.root);
  put(label('CATEGORIE', -92, 76.2, 22.8, 20, 2.8, 'y', plateLabel).translateZ(0));

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [...pulleys, ...lower, ...upper, feed, flag, dial].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  const docMat = {}, getDocMat = (id, fixed) => { const key = id + (fixed && T.DOCS[id].fix ? 'f' : ''); return docMat[key] || (docMat[key] = new THREE.MeshStandardMaterial({ map: docTexture(T.DOCS[id], key.endsWith('f')), roughness: .9 })); };
  const sheetMeshes = [];
  for (let i = 0; i < T.N; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD).rotateX(-Math.PI / 2), getDocMat(0, false)); m.castShadow = true; m.userData.noGlow = true; put(m, 'transport'); sheetMeshes.push(m); }
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + 30;
  meshes.push(beltMesh, ...sheetMeshes, screen, ...drums);

  const ZOFF = { bati: [0, 0, 0], transport: [0, 0, 20], tremie: [-50, 0, 20], optique: [0, 0, 70], bacs: [0, 50, 8], registre: [50, 20, 10], pupitre: [0, 50, 4] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), reader: new THREE.Object3D(), bins: new THREE.Object3D(), hopper: new THREE.Object3D() };
  at(anchors.all, 20, 20, 40); at(anchors.reader, -25, 15, 70); at(anchors.bins, 78, 40, 40); at(anchors.hopper, -146, 10, 50);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, lastTime = 0;

  function update(time) {
    lastTime = time;
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced);
    /* bande et rouleaux : même parcours, rotation = distance / rayon */
    const d = T.belt(u, sc); beltMat.map.offset.x = -d / 6.2832; pulleys.forEach((p) => { p.root.rotation.z = -d / T.ROLL_R; }); lower.forEach((r) => { r.root.rotation.z = -d / (T.ROLL_R - .4); }); upper.forEach((r) => { r.root.rotation.z = d / T.ROLL_R; });
    feed.root.rotation.z = -d / 4.6 * .8;
    /* trémie */
    const hp = T.hopper(u, sc), hn = Math.max(.01, hp * T.N); hop.visible = hp > .02; hop.scale.y = hn * .4; at(hop, T.HOP_X, 0, 40 + hn * .2);
    /* feuilles */
    for (let i = 0; i < T.N; i++) { if (i >= T.nOf(sc)) { sheetMeshes[i].visible = false; continue; } const s = T.sheet(i, u, sc), m = sheetMeshes[i]; m.visible = s.vis; if (s.vis) { at(m, s.x, s.y, s.z); const dm = getDocMat(sc.docs[i], sc.custom && T.CUSTOM.fixed); if (m.material !== dm) m.material = dm; } }
    /* chambre de lecture, F-Gas */
    const rd = T.reading(u, sc); scanBar.visible = rd.scanning; at(scanBar, T.CH_X - 10 + 20 * rd.bar, 0, 50); scanM.emissiveIntensity = rd.scanning ? 2.4 : 0;
    fieldMs.forEach(([f, m], j) => { f.visible = rd.on && rd.fields[j] > .02; at(f, T.CH_X - 4 + (j - 1) * 0, -9 + j * 9, BZ + .75); m.emissiveIntensity = 2.2 * rd.fields[j]; m.emissive.set(rd.okf && rd.okf[j] === 0 ? '#e5584b' : '#5fd39a'); });
    setLamp(famLamp, rd.family && rd.on ? 1 : 0);
    fgL.forEach((l, j) => { l.userData.lamp = rd.flag > .3 && j === 1 ? '#e5584b' : '#5fd39a'; setLamp(l, rd.fgLamps[j]); }); flag.root.rotation.x = rd.flag * 2.3;
    /* poussoirs, bacs, compteurs */
    const bn = T.bins(u, sc);
    pushers.forEach((p, j) => { p.root.position.z = -16 + 36 * T.pusher(j, u, sc); });
    stacks.forEach((s, j) => { const h = Math.max(.02, bn[j].stack * 9 * .9); s.visible = bn[j].stack > .02; s.scale.y = h; at(s, T.BIN_X[j], 36, 7.6 + h / 2); setLamp(binLamps[j], bn[j].lit); });
    drums.forEach((dm, j) => { dm.rotation.x = (9.5 - bn[j].count) / 10 * TAU; });
    /* registre */
    const rg = T.register(u, sc), detail = sc.custom && u >= T.times(0, sc).scan[1] && rg.fade > .5, fx = sc.custom && T.CUSTOM.fixed && T.DOCS[sc.docs[0]].fix;
    const key = detail ? 'c|' + sc.docs[0] + '|' + !!fx : rg.rows.map((r) => r.d).join('') + '|' + Math.round(rg.fade * 8);
    if (key !== regKey) { regKey = key; if (detail) { const d = T.DOCS[sc.docs[0]]; detailTexture(rctx, d, T.docFields(sc, 0), sc.dests[0], fx ? 'Feuille corrigée sous supervision.' : d.reason, fx ? d.fix.note : ''); } else registerTexture(rctx, rg.rows, rg.fade); rTex.needsUpdate = true; }
    const lastRows = rg.rows.length; tape.visible = lastRows > 0 && rg.fade > .02; at(tape, 183, 19 + 9 * (lastRows / T.N), 25.8);
    /* sélecteur de catégorie */
    dial.root.rotation.z = -T.dialAngle(u, k, forced);
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'La lecture', anchor: 'reader' }, { label: 'Les bacs', anchor: 'bins' }, { label: 'La trémie', anchor: 'hopper' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short, edit: !!s.edit, editT: s.editT, hold: s.hold })), setScenario(i) { forced = i == null ? null : ((i % 3) + 3) % 3; if (forced === 2) T.startCustom(T.CUSTOM.doc, false, lastTime); }, get scenario() { return forced; },
      /* scénario C « Ma feuille » : choisir un document, lire ses champs, voir la raison du bac, corriger sous supervision (jamais une décision réglementaire) */
      params: {
        visible: () => forced === 2,
        groups: [
          { name: 'Feuille', options: T.DOCS.map((d) => ({ label: d.short, run: () => { if (forced === 2) T.startCustom(d.id, false, lastTime); } })), get: () => T.CUSTOM.doc },
          { name: 'Correction', options: [{ label: 'Corriger (opérateur)', run: () => { const d = T.DOCS[T.CUSTOM.doc]; if (forced === 2 && d.fix) T.startCustom(d.id, true, lastTime); } }, { label: 'Annuler la correction', run: () => { if (forced === 2) T.startCustom(T.CUSTOM.doc, false, lastTime); } }], get: () => (T.CUSTOM.fixed && T.DOCS[T.CUSTOM.doc].fix ? 0 : 1) }
        ]
      },
      status() {
        if (forced !== 2) return ''; const sc = T.SCEN[2], d = T.DOCS[T.CUSTOM.doc], fx = T.CUSTOM.fixed && d.fix, f = T.docFields(sc, 0);
        return d.short + ' · lu : ' + f.map((x) => (x.n ? x.n + ' ' + (x.v || 'manquant') : '')).filter(Boolean).join(', ') + ' · bac : ' + T.DESTS[sc.dests[0]] + ' · ' + (fx ? d.fix.note : d.reason) + (d.fgas ? ' (signalement pour examen humain, pas une décision réglementaire)' : '') + (!d.fix ? '' : fx ? '' : ' · correction possible');
      },
      /* un clic sur le lot dans la trémie passe au document suivant (actif seulement dans « Ma feuille ») */
      drag: (() => {
        const inv = new THREE.Matrix4(), r = new THREE.Ray(), hit = new THREE.Vector3();
        return {
          pick(ray) {
            if (forced !== 2 || inspect.v > .05) return null; inv.copy(g.matrixWorld).invert(); r.copy(ray).applyMatrix4(inv); if (Math.abs(r.direction.y) < 1e-6) return null;
            const t = (44 - r.origin.y) / r.direction.y; if (t < 0) return null; r.at(t, hit);
            if (hit.x > -164 && hit.x < -128 && Math.abs(hit.z) < 22) { T.startCustom((T.CUSTOM.doc + 1) % T.DOCS.length, false, lastTime); return { id: 'lot', name: 'document suivant' }; } return null;
          }, move() {}, end() {}
        };
      })()
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + T.STEPS[v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u) + 1; }, seek: (v) => T.STEP_T[v - 1] + .4 }
  };
}
