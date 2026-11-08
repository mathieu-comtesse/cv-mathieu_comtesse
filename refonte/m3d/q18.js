// REPORTEUR Q18 : machine à écrire électromécanique à chariot de fiches.
// Idée : un rapport entre dans un lecteur, son numéro d'OT est lu puis composé sur un clavier à tambours ; le chariot de fiches (un registre) glisse
// sur sa crémaillère jusqu'à la fiche portant cet OT ; la tête de frappe monte et descend devant les champs à renseigner ; un poinçon distinct marque Q18
// quand le rapport en porte un ; un vérificateur contrôle la ligne ; une bande Power BI avance d'un cran. Démonstration fictive : aucune donnée réelle.
// Contrat : build() -> { group, update(time), controls, api } ; tout est une fonction pure du temps partagé (voir q18-timeline.js).
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import * as T from './q18-timeline.js';
import { industrial, studioEnv } from './pro-materials.js';

export const WIDTH = 470;
const TAU = Math.PI * 2, TILT = .3;                                     // pente du clavier (tan)
const A = Math.atan(TILT), deckZ = (y) => 34 - (y - 38) * TILT;
const CARD = { w: 21, h: 52, z0: 64, t: .9, y: -6 };

/* ---------------- textures (contenu fictif) ---------------- */
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, aniso = 4) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
const FIELD_Y = (z) => (CARD.z0 + CARD.h - z) / CARD.h * 320;           // hauteur de champ -> ordonnée du canevas
const MONO = '700 15px ui-monospace,Menlo,Consolas,monospace';
const INK = '#23201a', FAINT = '#a69d85';

function drawCard(ctx, card, st, fade) {
  ctx.fillStyle = '#f3ead2'; ctx.fillRect(0, 0, 128, 320);
  ctx.strokeStyle = '#7d745c'; ctx.lineWidth = 2; ctx.strokeRect(3, 3, 122, 314);
  ctx.fillStyle = '#7d745c'; ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const rows = [['OT', T.FIELD_Z.ot, card.ot, true], ['RAPPORT', T.FIELD_Z.rap, 'LIEN OK', st.rap], ['STATUT', T.FIELD_Z.stat, 'APPARIE', st.stat], ['DATE', T.FIELD_Z.date, '08/11', st.date], ['Q18', T.FIELD_Z.q18, '', false]];
  for (const [name, z, val, on] of rows) {
    const y = FIELD_Y(z);
    ctx.strokeStyle = '#c9bf9f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, y + 20); ctx.lineTo(120, y + 20); ctx.stroke();
    ctx.fillStyle = '#7d745c'; ctx.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; ctx.fillText(name, 10, y - 14);
    if (on && val) { ctx.globalAlpha = name === 'OT' ? 1 : fade; ctx.fillStyle = INK; ctx.font = name === 'OT' ? '700 26px ui-monospace,Menlo,Consolas,monospace' : MONO; ctx.fillText(val, 10, y + 5); ctx.globalAlpha = 1; }
  }
  const yq = FIELD_Y(T.FIELD_Z.q18);
  if (st.q18 && fade > 0) {                                              // marque Q18 poinçonnée : trou net et auréole rouge
    ctx.globalAlpha = fade; ctx.fillStyle = '#c8372d'; ctx.beginPath(); ctx.arc(64, yq + 4, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1a17'; ctx.beginPath(); ctx.arc(64, yq + 4, 7, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  } else { ctx.strokeStyle = FAINT; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(64, yq + 4, 12, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  if (st.ok && fade > 0) { ctx.globalAlpha = fade; ctx.strokeStyle = '#2d7a4f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(86, 300); ctx.lineTo(95, 309); ctx.lineTo(114, 288); ctx.stroke(); ctx.globalAlpha = 1; }
}
function pageTexture(sc) {
  const c = cv(180, 260), x = c.getContext('2d');
  x.fillStyle = '#f6efdc'; x.fillRect(0, 0, 180, 260); x.fillStyle = '#6a6252'; x.strokeStyle = '#6a6252';
  x.font = '700 15px ui-monospace,Menlo,Consolas,monospace'; x.fillText('RAPPORT', 14, 28); x.fillRect(14, 36, 90, 3);
  x.font = '700 30px ui-monospace,Menlo,Consolas,monospace'; x.fillText('OT ' + sc.ot, 14, 78);
  for (let i = 0; i < 11; i++) x.fillRect(14, 100 + i * 12, 60 + ((i * 37 + sc.ot.charCodeAt(1) * 5) % 90), 3);
  x.font = '700 12px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DEMO FICTIVE', 14, 246);
  return tex(c);
}
function keyAtlas() {
  const c = cv(256, 128), x = c.getContext('2d'), glyphs = '0123456789QWERTYUIOPASDFGHJKLMZX';
  x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#2a251d'; x.font = '700 22px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  [...glyphs].forEach((g, i) => x.fillText(g, (i % 8) * 32 + 16, Math.floor(i / 8) * 32 + 17));
  return tex(c);
}
function drumTexture() {
  // un chiffre par dixième de tour : sa hauteur suit la circonférence (comme une roue à chiffres), sa largeur suit l'axe du tambour
  const c = cv(640, 64), x = c.getContext('2d');
  x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 640, 64); x.fillStyle = '#1d1a14'; x.font = '700 50px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let d = 0; d < 10; d++) { x.save(); x.translate((9 - d) * 64 + 32, 33); x.rotate(Math.PI / 2); x.fillText(String(d), 0, 2); x.restore(); x.fillStyle = '#b9ae92'; x.fillRect((9 - d) * 64, 0, 1, 64); x.fillStyle = '#1d1a14'; }
  return tex(c, 8);
}
function tapeTexture() {
  const c = cv(64, 24), x = c.getContext('2d');
  x.fillStyle = '#e9e1c8'; x.fillRect(0, 0, 64, 24); x.fillStyle = '#2a251d'; x.fillRect(0, 0, 64, 1); x.fillRect(0, 23, 64, 1);
  x.fillRect(30, 4, 2, 16); x.fillStyle = '#1d1a14'; x.beginPath(); x.arc(16, 12, 2.4, 0, TAU); x.fill(); x.arc(48, 12, 2.4, 0, TAU); x.fill();
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(10, 1); return t;
}

/* ---------------- outils géométriques propres à la machine ---------------- */
const colored = (g, hex) => { const k = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([k.r, k.g, k.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
function mergeAttr(list) {
  const gs = list.map((g) => (g.index ? g.toNonIndexed() : g)), names = ['position', 'normal', 'uv', 'color'].filter((n) => gs.every((g) => g.attributes[n]));
  const out = new THREE.BufferGeometry();
  for (const n of names) { const sz = gs[0].attributes[n].itemSize, len = gs.reduce((a, g) => a + g.attributes[n].array.length, 0), arr = new Float32Array(len); let o = 0; for (const g of gs) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; } out.setAttribute(n, new THREE.BufferAttribute(arr, sz)); }
  return out;
}
function glyphQuad(n, w = 6.6) {
  const g = new THREE.PlaneGeometry(w, w), uv = g.attributes.uv, cx = n % 8, cy = Math.floor(n / 8);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / 8, 1 - (cy + 1 - uv.getY(i)) / 4);
  g.rotateX(-Math.PI / 2); return g;
}
/** une touche : coiffe ivoire, bague laiton, tige acier (une seule géométrie colorée) ; l'axe de la touche suit la pente du clavier */
function keyGeo() {
  const cap = colored(new THREE.CylinderGeometry(4.9, 4.3, 4, 22), '#efe6cf').translate(0, 2.4, 0);
  const ring = colored(new THREE.CylinderGeometry(5.6, 5.6, 1.1, 22), '#c79a42').translate(0, .3, 0);
  const stem = colored(new THREE.CylinderGeometry(1.2, 1.2, 6, 10), '#9aa0a9').translate(0, -3, 0);
  return mergeAttr([cap, ring, stem]).rotateX(A);
}
const tiltGlyph = (n) => glyphQuad(n).translate(0, 4.5, 0).rotateX(A);
const wedge = (poly, x0, x1) => { const s = new THREE.Shape(poly.map(([y, z]) => new THREE.Vector2(y, z))); const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(x0, 0, 0); return g; };

export function build() {
  const g = new THREE.Group(), M = makeMats();
  industrial(M); M.ink = new THREE.MeshStandardMaterial({ color: '#0f1013', roughness: .95, metalness: 0 });
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' };

  /* ================= bâti : plinthe, caisse en fonte, dosseret, rails, crémaillère, clavier ================= */
  Z('bati'); let S = stat('bati');
  /* soubassement noir en retrait (joint d'ombre), table émaillée, façade en aluminium brossé avec ouïes, pieds à patin */
  S.box(0, 0, 2.2, 476, 144, 4.4, 'castDk', 1);
  S.box(0, 0, 10, 500, 158, 11.2, 'enamel', 2.4);                                              // table : le plateau sur lequel tout est posé
  S.box(0, 77.4, 10, 500, 3.4, 9, 'alu', .9); S.box(0, -77.4, 10, 500, 3.4, 9, 'alu', .9);    // chants avant et arrière
  for (const x of [-250.8, 250.8]) S.box(x, 0, 10, 2.6, 158, 9, 'alu', .8);                   // flancs
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) S.box(sx * (100 + i * 20), 79.3, 10, 12, .8, 3.2, 'ink', .3);   // ouïes de ventilation en façade
  for (const x of [-236, 236]) { S.cylX(x - 7, x + 7, 79.6, 10, 1.1, 'steel', 12); S.box(x - 7, 78.4, 10, 2, 2.4, 5, 'steelDk', .4); S.box(x + 7, 78.4, 10, 2, 2.4, 5, 'steelDk', .4); }   // poignées de manutention
  for (const [x, y] of [[-224, -62], [224, -62], [-224, 62], [224, 62], [0, -62], [0, 62]]) { S.cylZ(x, y, -4.4, 7, 2.2, 'steelDk', 18); S.cylZ(x, y, -2.2, 6.2, 2.2, 'rubber', 18); S.cylZ(x, y, 0, 3, 3, 'steel', 14); }   // pieds : patin, tige, écrou de réglage
  S.box(0, -14, 24, 470, 90, 22, 'enamelDk', 2);                                              // caisse des rails
  S.box(0, -56, 41, 470, 6, 60, 'enamelDk', 1.4);                                             // dosseret
  for (const x of [-244, 244]) S.box(x, -10, 43, 8, 50, 70, 'enamelDk', 1.4);                  // montants d'extrémité
  for (const x of [-236, 236]) S.bolts([[x, -10, 78.4]], 'z', 1.6, 'steel');
  for (let i = 0; i < 10; i++) S.bolts([[-225 + i * 50, 76.4, 15.7]], 'y', .9, 'steel');       // vis de la façade
  for (const [x, y] of [[-160, 56], [160, 56], [-244, -30], [244, -30]]) S.bolts([[x, y, 15.8]], 'z', 1.5, 'steelDk');
  for (const x of [-120, 120]) { S.box(x, -60.2, 40, 84, 1.6, 26, 'enamel', .6); S.bolts([[x - 38, -61.2, 30], [x + 38, -61.2, 30], [x - 38, -61.2, 50], [x + 38, -61.2, 50]], 'y', 1, 'steel'); S.cylX(x - 10, x + 10, -62.6, 40, 1, 'steel', 12); S.box(x - 9, -61.6, 40, 1.6, 2, 2.4, 'steelDk', .3); S.box(x + 9, -61.6, 40, 1.6, 2, 2.4, 'steelDk', .3); }   // trappes d'accès arrière : tôle, vis, poignée
  for (const z of [26, 56]) S.box(0, -59.4, z, 440, 1.4, 2.4, 'enamel', .5);                    // plis de rigidité du dosseret
  S.box(0, -56, 71.4, 472, 7, 1.6, 'alu', .5);                                                  // liseré de tête du dosseret
  /* rails : deux barres d'acier portées par des chandelles, butées de fin de course en bronze */
  for (const y of [-10, 2]) { S.cylX(-240, 240, y, 40, 2.4, 'steel', 14); for (const x of [-200, -100, 0, 100, 200]) S.box(x, y, 36, 6, 6, 8, 'steelDk', .5); }
  for (const x of [-237, 237]) for (const y of [-10, 2]) S.box(x, y, 44, 4, 5, 8, 'bronze', .5);
  /* crémaillère : barre, dents (pas 4,08 comme le pignon) et vis de fixation */
  S.box(0, -24, 34, 484, 4, 4, 'steelDk', .4);
  for (let i = 0; i < 116; i++) S.box(-236 + i * 4.08, -24, 37, 2.1, 4, 2.6, 'steel');
  S.bolts([-220, -110, 0, 110, 220].map((x) => [x, -24, 32.2]), 'z', 1, 'steelDk');
  S.box(0, 79.7, 10, 150, 1.2, 7, 'alu', .3);                                                  // plaque constructeur
  put(label('REPORTEUR Q18', -18, 80.4, 10, 100, 5, 'y', plateLabel));
  put(label('DEMO FICTIVE', 60, 80.4, 10, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= clavier : touches ivoire (dix chiffres actionnés, vingt touches de lettres fixes), tambours de code ================= */
  Z('clavier'); S = stat('socle du clavier');                                                  // caisse inclinée et platine, solidaires des touches
  S.geo('cast', new THREE.BoxGeometry(206, 5, 64).rotateX(A), 0, 38, 34);
  { const sh = new THREE.Shape([new THREE.Vector2(6, 15.4), new THREE.Vector2(72, 15.4), new THREE.Vector2(72, deckZ(72) - 3.2), new THREE.Vector2(6, deckZ(6) - 3.2)]);
    const wg = new THREE.ExtrudeGeometry(sh, { depth: 200, bevelEnabled: false }); wg.rotateY(-Math.PI / 2).translate(100, 0, 0); S.geo('enamelDk', wg, 0, 0, 0); }   // console inclinée qui porte le clavier
  S.box(0, 72.6, 20, 204, 1.4, 4, 'alu', .4);                                                   // liseré de façade de la console
  S.box(-72, 21, 45.5, 64, 12, 7.5, 'castDk', .6);                                              // socle de la fenêtre des tambours
  S.geo('alu', new THREE.BoxGeometry(206, 1.2, 4).rotateX(A), 0, 69.4, 24.4);
  S.bolts([[-96, 14, deckZ(14) + 2.8], [96, 14, deckZ(14) + 2.8], [-96, 62, deckZ(62) + 2.8], [96, 62, deckZ(62) + 2.8]], 'z', 1.3, 'steelDk');
  const atlasMat = new THREE.MeshStandardMaterial({ map: keyAtlas(), roughness: .5 }), keyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .05 });
  const keyG = keyGeo(), digitKeys = [], KX = (c) => (c - 4.5) * 15.4, nrm = [Math.cos(A), Math.sin(A)], ROW = (r) => 36 + r * 12;
  const keyPos = (c, r) => [KX(c), deckZ(ROW(r)) + 2.5 * nrm[0], ROW(r) + 2.5 * nrm[1]];
  for (let c = 0; c < 10; c++) {
    const k = new THREE.Group(), gl = new THREE.Mesh(tiltGlyph(c), atlasMat), kb = new THREE.Mesh(keyG, keyMat);
    kb.castShadow = true; gl.userData.noGlow = kb.userData.noGlow = true; k.add(kb, gl);
    const b = keyPos(c, 0); k.position.set(...b); k.userData.base = b; put(k); digitKeys.push(k);
  }
  const decoKeys = [], decoGl = [];
  for (let r = 1; r <= 2; r++) for (let c = 0; c < 10; c++) { const [x, y, z] = keyPos(c, r), n = (10 + (r - 1) * 10 + c) % 32; decoKeys.push(keyG.clone().translate(x, y, z)); decoGl.push(tiltGlyph(n).translate(x, y, z)); }
  put(Object.assign(new THREE.Mesh(mergeAttr(decoKeys), keyMat), { castShadow: true }));
  put(new THREE.Mesh(mergeAttr(decoGl), atlasMat));
  /* tambours de code OT : quatre rouleaux à chiffres derrière une fenêtre vitrée, en avant du chariot */
  const DX = -72; S = stat('code'); const drumMat = new THREE.MeshStandardMaterial({ map: drumTexture(), roughness: .5 }), drums = [];
  S.box(DX, 21, 50.5, 70, 14, 3, 'cast', .6); S.box(DX, 21, 66.5, 70, 14, 3, 'cast', .6);
  for (const x of [-34, 34]) S.box(DX + x, 21, 58.5, 2, 14, 19, 'cast', .4);
  S.box(DX, 28.4, 58.5, 66, .8, 11, 'glass'); S.cylX(DX - 34, DX + 34, 21, 58.5, .9, 'steelDk', 10);
  for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 14, 32).rotateZ(Math.PI / 2), drumMat); d.position.set(DX - 24 + i * 16, 58.5, 21); d.castShadow = true; d.userData.noGlow = true; put(d); drums.push(d); }
  S.box(DX, 28.9, 66.6, 52, .8, 1.2, 'red');                                                    // repère de lecture
  S.bolts([[DX - 30, 28.4, 50.5], [DX + 30, 28.4, 50.5], [DX - 30, 28.4, 66.5], [DX + 30, 28.4, 66.5]], 'y', .8, 'brass');

  /* ================= lecteur : magasin de rapports, voûte de lecture, boîte de sortie ================= */
  Z('lecteur'); S = stat('lecteur');
  S.box(-212, 24, 24, 78, 40, 17.2, 'enamelDk', 1.4); S.box(-186, 64, 23.5, 46, 30, 16.4, 'enamelDk', 1.4);      // socles du magasin, de la voûte et de la boîte de sortie
  S.box(-232, 24, 38, 40, 34, 12, 'iron', 1); S.box(-232, 24, 45.5, 36, 30, 2, 'cast');        // magasin
  for (let i = 0; i < 4; i++) S.box(-232, 24, 46.8 + i * .4, 32, 24, .3, 'paperEdge');         // pile de rapports en attente
  for (const y of [6, 42]) S.box(-190, y, 46, 26, 3, 28, 'iron', .6);                           // montants de la voûte
  S.box(-190, 24, 64, 26, 44, 8, 'alu', .8); S.cylY(10, 38, -190, 56, 3, 'glass', 18);          // voûte et lentille
  S.box(-190, 24, 69, 12, 18, 3, 'brass', .5); S.bolts([[-198, 8, 68.3], [-182, 8, 68.3], [-198, 40, 68.3], [-182, 40, 68.3]], 'z', 1, 'steelDk');
  S.box(-186, 64, 41, 44, 28, 20, 'iron', 1); S.box(-186, 49.8, 41, 40, .6, 3, 'ink'); S.box(-186, 64, 52, 44, 28, 2, 'cast');   // boîte de sortie, fente noire
  S.box(-186, 24, 38.4, 52, 34, 1, 'steelDk', .3);                                              // table de lecture sous le papier
  S.cylY(8, 40, -186, 39.4, 1.8, 'rubber', 14); S.cylY(8, 40, -194, 39.4, 1.8, 'rubber', 14);  // rouleaux d'entraînement sous le papier
  S.cylY(8, 40, -186, 42.6, 1.8, 'rubber', 14); S.cylY(8, 40, -194, 42.6, 1.8, 'rubber', 14);  // et au-dessus
  S.bolts([[-248, 8, 44.2], [-216, 8, 44.2], [-248, 40, 44.2], [-216, 40, 44.2]], 'z', 1.1, 'steelDk');
  const pageTex = T.SCEN.map(pageTexture), pageMat = new THREE.MeshStandardMaterial({ map: pageTex[0], roughness: .92, side: THREE.DoubleSide }), pageMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 26).rotateX(-Math.PI / 2), pageMat);
  pageMesh.castShadow = true; pageMesh.userData.noGlow = true; put(pageMesh);
  const scanM = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: '#5aa0ff', emissiveIntensity: 0 }), scanBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, .5, 24), scanM); scanBar.userData.noGlow = true; put(scanBar);

  /* ================= bande Power BI : boîtier, roue à cliquet, cliquet, goulotte, bande perforée, bac ================= */
  Z('pbi'); S = stat('pbi');
  S.box(205, 50, 25.3, 76, 28, 19.4, 'enamelDk', 1.4);                                           // socle du boîtier et de la goulotte
  S.box(165, 50, 40, 34, 24, 16, 'iron', 1); S.box(165, 50, 48.5, 30, 20, 2, 'cast');
  S.cylY(61.8, 64.4, 163, 44, 1.8, 'steel', 14); S.gearY(163, 44, 62, 64, 6.5, 14, 'steelDk', 1.4); S.bolts([[149, 62.2, 34], [181, 62.2, 34], [149, 62.2, 46], [181, 62.2, 46]], 'y', .8, 'steelDk');
  const pawl = mover('cliquet', [170, 63.5, 44]); pawl.box(170, 63.5, 44, 7, 1.4, 1.6, 'brass', .3); pawl.cylY(62.5, 64.8, 172, 44, 1.1, 'steelDk', 10); pawl.root.rotation.z = .1; put(pawl.root);
  S.box(208, 52, 37.5, 52, 12, 1.4, 'steelDk', .3); S.box(208, 45.5, 39, 52, 1.2, 3, 'steel', .3); S.box(208, 58.5, 39, 52, 1.2, 3, 'steel', .3); S.box(238, 52, 38, 8, 14, 9, 'iron', .8);
  const tapeM = new THREE.MeshStandardMaterial({ map: tapeTexture(), roughness: .9 }), tape = new THREE.Mesh(new THREE.PlaneGeometry(52, 9).rotateX(-Math.PI / 2), tapeM); tape.position.set(210, 38.4, 52); tape.userData.noGlow = true; put(tape);
  put(label('POWER BI', 165, 62.2, 35.8, 22, 3.2, 'y', plateLabel));

  /* ================= chariot : plateau, auge à fiches, galets, motoréducteur et pignon, fiches ================= */
  Z('chariot'); const car = new THREE.Group(); zoneGroup('chariot').add(car); S = stat('chariot');
  S.box(0, -8, 52, 220, 27, 8, 'alu', 1); S.box(0, -30.5, 52, 220, 7, 8, 'alu', 1); S.box(0, -13, 60, 216, 12, 8, 'steel', .8);   // plateau (fenêtre ouverte au droit du pignon) et auge à fiches
  S.box(0, -19, 66, 216, 1.4, 12, 'steelDk', .4); S.box(0, -7, 62, 216, 1.4, 4, 'steelDk', .4);  // lèvres arrière et avant
  for (let i = 0; i <= 8; i++) S.box(-104 + i * 26, -6, 64.5, .8, 11, 1.6, 'steelDk', .2);        // cloisons de fiches
  for (const x of [-112, 112]) S.box(x, -15, 52, 3, 38, 8, 'bronze', .5);                         // flasques d'extrémité
  for (const y of [-27.5, -20.5]) S.box(0, y, 46, 16, 2, 18, 'steelDk', .5);                      // joues de palier du pignon
  S.box(0, -32.75, 44, 18, 8.5, 14, 'graphite', 1); S.cylY(-46, -37, 0, 44, 5.4, 'steel', 22); S.cylY(-47, -46, 0, 44, 2.4, 'steelDk', 12);
  S.bolts([[-8, -31, 56.4], [8, -31, 56.4], [-8, -14, 56.4], [8, -14, 56.4]], 'z', 1, 'steelDk');
  S.bolts([[-100, -2, 56.4], [100, -2, 56.4], [-100, -26, 56.4], [100, -26, 56.4]], 'z', 1.2, 'steelDk');
  car.add(S.done());
  const pinion = mover('pignon', [0, -24, 44]); pinion.gearY(0, 44, -26, -22, 7, 10, 'brass', 1.6); pinion.cylY(-29, -20, 0, 44, 1.6, 'steel', 12); car.add(pinion.done());
  const galets = [];
  for (const x of [-84, 84]) for (const y of [-10, 2]) { const w = mover('galet', [x, y, 45]); w.cylY(y - 2, y + 2, x, 45, 2.6, 'steel', 22); w.cylY(y - 3, y + 3, x, 45, 1.2, 'steelDk', 10); car.add(w.done()); galets.push(w); }
  const cardTex = [], cardCtx = [], cardKey = new Array(8).fill(''), cardMesh = [];
  for (let i = 0; i < 8; i++) {
    const c = cv(128, 320), ctx = c.getContext('2d'); drawCard(ctx, T.CARDS[i], {}, 1); const t = tex(c, 8);
    cardTex.push(t); cardCtx.push(ctx);
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: .88 }), mats = [M.paperEdge, M.paperEdge, M.paperEdge, M.paperEdge, face, M.paperEdge];
    const m = new THREE.Mesh(new THREE.BoxGeometry(CARD.w, CARD.h, CARD.t), mats); m.position.set(T.CARD_X(i), CARD.z0 + CARD.h / 2, CARD.y); m.castShadow = true; m.userData.noGlow = true; car.add(m); cardMesh.push(m);
  }

  /* ================= portique : tour, flèche, traverses, rouleaux de contre-frappe, vis de tête, postes ================= */
  Z('portique'); S = stat('portique');
  S.box(0, -52, 76, 60, 8, 140, 'enamelDk', 1.4); S.box(0, -13, 142, 14, 78, 10, 'enamelDk', 1);   // tour et flèche
  for (const x of [-22, 0, 22]) S.box(x, -56.6, 76, 4, 2, 128, 'enamel', .5);                    // nervures de la tour
  S.box(0, -56.8, 112, 40, 1, 18, 'alu', .3); put(label('PORTIQUE', 0, -57.4, 112, 34, 5, 'y', plateLabel));
  S.box(0, 22, 142, 96, 10, 10, 'alu', .8); S.box(0, -12, 142, 96, 10, 10, 'alu', .8);          // traverses haute avant et arrière
  S.box(0, 22, 61, 96, 10, 6, 'alu', .8); S.box(0, -12, 75, 96, 6, 4, 'steel', .6);             // traverses basses
  for (const x of [-47, 47]) S.box(x, -12, 109, 3, 3, 66, 'steelDk', .4);                       // montants du cadre arrière
  for (const x of [-30, 0, 30]) { S.cylZ(x, 22, 62, 3, 76, 'steelDk', 18); S.bolts([[x - 4, 18, 147.6], [x + 4, 18, 147.6], [x - 4, 26, 147.6], [x + 4, 26, 147.6]], 'z', .8, 'steelDk'); }
  S.cylZ(9, 22, 147, 5.5, 12, 'graphite', 22); S.cylZ(9, 22, 159, 2.6, 2, 'steelDk', 12); S.box(9, 22, 148.2, 14, 14, 2, 'steel', .4);   // moteur de la vis de tête
  const rollers = [];
  for (const x of [-30, 0, 30]) { const r = mover('rouleau', [x, -11.4, 98]); r.cylZ(x, -11.4, 78, 5, 40, 'rubber', 28); r.cylZ(x, -11.4, 75, 1.4, 63, 'steel', 12); r.cylZ(x, -11.4, 76, 3.2, 2, 'brass', 14); r.cylZ(x, -11.4, 118, 3.2, 2, 'steelDk', 14); put(r.root); rollers.push(r); }
  const screw = mover('vis-mère', [9, 22, 100]); screw.cylZ(9, 22, 64, 1.7, 84, 'steel', 12); for (let i = 0; i < 26; i++) screw.cylZ(9, 22, 66 + i * 3.1, 2.3, .8, 'steelDk', 12); screw.box(9, 22, 140, 5, 1.2, 1.2, 'brass'); screw.cylZ(9, 22, 61, 2.4, 3, 'bronze', 12); put(screw.root);
  /* tête de frappe : coulisseau, écrou, solénoïde, marteau à ressort, chasse-caractère, deux bobines et guides de ruban */
  const headG = new THREE.Group(); zoneGroup('portique').add(headG);
  const hs = new Part('tête', M); hs.zone = 'portique'; parts.push(hs);
  hs.cylZ(0, 22, -9, 4.6, 18, 'alu', 22); hs.cylZ(0, 22, -9, 5.3, 2, 'steel', 22); hs.cylZ(0, 22, 7, 5.3, 2, 'steel', 22);          // manchon coulissant sur la colonne
  hs.cylZ(9, 22, -4, 3.3, 8, 'brass', 16); hs.box(4.6, 22, 0, 10, 5, 5, 'brass', .6);                                                 // écrou de la vis-mère et son bras
  hs.box(0, 14, -3.5, 7, 16, 4, 'alu', .8); hs.cylY(8, 19, 0, 0, 4.6, 'graphite', 20); hs.cylY(7.4, 8.6, 0, 0, 5.4, 'steel', 20); hs.cylY(18.4, 19.6, 0, 0, 5.4, 'steel', 20);   // bras et solénoïde
  hs.box(0, 8, -3.5, 28, 3, 4, 'alu', .6); hs.bolts([[-11, 9.6, -3.5], [11, 9.6, -3.5]], 'y', .8, 'steelDk');                           // support des bobines
  for (const sx of [-1, 1]) { hs.box(sx * 5.8, 1.2, -4.5, 1.6, 10.6, 1.6, 'steelDk', .3); hs.cylZ(sx * 5.8, -4, -2.5, .8, 5, 'steel', 8); }   // guides de ruban
  for (const sx of [-1, 1]) { hs.cylY(6, 9.4, sx * 11, 3, 4.4, 'steel', 20); hs.cylY(5, 10.4, sx * 11, 3, 1.2, 'brass', 12); }
  hs.box(0, -4.9, 0, 12, .35, 5, 'ink');                                                         // brin avant du ruban, entre le chasse-caractère et la fiche
  for (const sx of [-1, 1]) { const dx = .8 * sx, dy = 10.4, len = Math.hypot(dx, dy); hs.geo('ink', new THREE.BoxGeometry(.3, 5, len).rotateY(Math.atan2(dx, dy)), sx * 6.2, 0.3, 0); }
  headG.add(hs.done());
  const bob = [0, 1].map((i) => { const b = mover('bobine', [i ? 11 : -11, 7.7, 3]); b.cylY(6.6, 8.8, i ? 11 : -11, 3, 5, 'ink', 20); headG.add(b.done()); return b; });
  const hammer = mover('marteau', [0, 12, 0]); hammer.cylY(4.4, 12, 0, 0, 1.3, 'steel', 12); hammer.cylY(4.2, 5.4, 0, 0, 2.6, 'steelDk', 14); hammer.cylY(1.6, 4.6, 0, 0, 2.7, 'brass', 20); hammer.springY(0, 0, 5.4, 10, 2.9, 5, .35, 'steelDk');
  hammer.box(0, 11.2, 0, 3, 2, 3, 'steelDk', .3); headG.add(hammer.done());
  /* poinçon Q18 : boîtier, ressort, poussoir à pointe émaillée rouge, bielle, disque d'excentrique sur arbre, manette en bakélite */
  const PZ = T.FIELD_Z.q18, PX = 30, CY = 34.5;
  S = stat('poinçon');
  S.box(PX, 14, PZ, 14, 16, 12, 'cast', .9); S.box(PX, 6.4, PZ, 10, 2, 8, 'steel', .4); S.box(PX, 29.5, PZ, 4, 13, 14, 'steelDk', .5);
  S.bolts([[PX - 5, 22.4, PZ + 3], [PX + 5, 22.4, PZ + 3], [PX - 5, 22.4, PZ - 3], [PX + 5, 22.4, PZ - 3]], 'y', .8, 'brass');
  S.cylX(PX - 7, PX + 8, CY, PZ, 1.4, 'steel', 12); put(S.done());
  const punch = mover('poussoir', [PX, 14, PZ]); punch.cylY(2.2, 25, PX, PZ, 1.6, 'steel', 14); punch.cylY(2, 4.4, PX, PZ, 2.1, 'red', 18); punch.cylY(23, 26, PX, PZ, 2.6, 'bronze', 14); punch.springY(PX, PZ, 8, 22, 2.8, 6, .35, 'steelDk'); put(punch.root);
  const link = mover('bielle', [PX + 2, 25, PZ]); link.box(PX + 2, 32, PZ, 1.6, 14, 2.4, 'steelDk', .4); link.cylX(PX + 1, PX + 5, 25, PZ, 1.1, 'steel', 8); put(link.root);
  const crank = mover('excentrique', [PX + 4, CY, PZ]); crank.cylX(PX + 3, PX + 5, CY, PZ, 5.5, 'brass', 26); crank.cylX(PX + 1, PX + 6, CY + 4.5, PZ, 1.1, 'steel', 8); put(crank.root);
  const lever = mover('manette', [PX - 4, CY, PZ]); lever.box(PX - 4, CY, PZ - 13, 3.4, 3, 26, 'bakelite', .8); lever.cylY(CY - 2, CY + 2, PX - 4, PZ - 27, 3.6, 'bakelite', 18); lever.cylX(PX - 6, PX - 2, CY, PZ, 2.4, 'steel', 14); put(lever.root);
  /* vérificateur : boîtier, ressort, palpeur à pointe de verre */
  const VX = -30, VZ = 86;
  S = stat('vérificateur');
  S.box(VX, 14, VZ, 14, 16, 14, 'iron', .9); S.box(VX, 6.4, VZ, 10, 2, 10, 'steel', .4); S.bolts([[VX - 5, 22.4, VZ + 4], [VX + 5, 22.4, VZ + 4], [VX - 5, 22.4, VZ - 4], [VX + 5, 22.4, VZ - 4]], 'y', .8, 'brass');
  S.box(VX, 14, VZ + 10, 12, 8, 6, 'steelDk', .5); put(S.done());
  const vf = mover('palpeur', [VX, 14, VZ]); vf.cylY(2.2, 24, VX, VZ, 1.5, 'steel', 14); vf.cylY(1.4, 4.6, VX, VZ, 2.4, 'glass', 18); vf.springY(VX, VZ, 8, 22, 2.8, 6, .35, 'steelDk'); put(vf.root);
  /* signalisation sur la traverse avant */
  const LAMPS = [['OT', '#5aa0ff'], ['LIGNE', '#ffb347'], ['OK', '#5fd39a'], ['NON', '#e5584b']];
  const lampM = LAMPS.map(([t, c], i) => { const l = lamp(-22.5 + i * 15, 27.5, 143.2, 2.2, c, 'y'); put(l); put(label(t, -22.5 + i * 15, 27.1, 139.2, 8, 2.4, 'y', plateLabel)); return l; });

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + cardMesh.length + 24;

  /* ---------------- inspection (éclaté) : les groupes glissent le long de leurs axes de démontage ---------------- */
  const ZOFF = { bati: [0, 0, 0], clavier: [0, 54, 8], chariot: [0, 0, 40], portique: [0, 0, 96], lecteur: [-60, 0, 6], pbi: [60, 0, 6] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), head: new THREE.Object3D(), punch: new THREE.Object3D(), register: new THREE.Object3D() };
  at(anchors.all, 0, 0, 60); at(anchors.head, 0, 20, 100); at(anchors.punch, 30, 12, 72); at(anchors.register, 0, -6, 90);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null;
  const refresh = (k, st) => {
    const i = T.SCEN[k].card; if (i < 0) return;
    const key = [st.rap, st.stat, st.date, st.q18, st.ok, Math.round(st.fade * 8)].join('|');
    if (cardKey[i] === key) return; cardKey[i] = key; drawCard(cardCtx[i], T.CARDS[i], st, st.fade); cardTex[i].needsUpdate = true;
  };
  const CRANK_R = 4.5, LINK_L = 14, TH_MAX = 2.4;

  function update(time) {
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced);
    /* chariot : fiches, galets sur les rails, pignon sur la crémaillère, rouleaux de contre-frappe entraînés par les fiches */
    const c = T.carriageX(u, sc); car.position.x = c;
    galets.forEach((w) => { w.root.rotation.z = -c / 2.6; }); pinion.root.rotation.z = -c / 6.5; rollers.forEach((r) => { r.root.rotation.y = -c / 5; });
    /* tête de frappe : la vis tourne avec la hauteur (pas de 8) */
    const h = T.head(u, sc); headG.position.y = h.z; screw.root.rotation.y = h.z / 8 * TAU;
    hammer.root.position.z = 12 - 6.8 * h.hit; const n = T.strikeCount(u, sc); bob.forEach((b, i) => { b.root.rotation.z = (i ? 1 : -1) * (n * .35 + h.hit * .2); });
    /* poinçon : manette et excentrique tournent de θ ; la bielle pousse le poussoir (bielle-manivelle exacte) */
    const th = TH_MAX * T.punchLever(u, sc), sn = Math.sin(th), pinY = CY + CRANK_R * Math.cos(th), rodY = pinY - Math.sqrt(LINK_L * LINK_L - (CRANK_R * sn) ** 2), d = 25 - rodY;
    crank.root.rotation.x = lever.root.rotation.x = -th; punch.root.position.z = 14 - d; link.root.position.z = 25 - d; link.root.rotation.x = -Math.asin(CRANK_R * sn / LINK_L);
    vf.root.position.z = 14 - 7.6 * T.verifPush(u, sc);
    /* lecteur : feuille et balayage */
    const pg = T.page(u); pageMesh.visible = pg.vis; at(pageMesh, pg.x, pg.y, pg.z); if (pageMat.map !== pageTex[k]) { pageMat.map = pageTex[k]; pageMat.needsUpdate = true; }
    const sb = T.scanBar(u); scanBar.visible = sb.on; at(scanBar, sb.x, pg.y, pg.z + 6); scanM.emissiveIntensity = sb.on ? 2.2 : 0;
    /* tambours de code et touches (la touche s'enfonce le long de son axe incliné) */
    const dr = T.drums(u, sc); drums.forEach((dm, i) => { dm.rotation.x = (9.5 - dr[i]) / 10 * TAU; });
    const kp = T.keyPress(u, sc); digitKeys.forEach((kk, i) => { const [bx, by, bz] = kk.userData.base, p = kp[i] * 2.2; kk.position.set(bx, by - p * nrm[0], bz - p * nrm[1]); });
    /* voyants */
    const L = T.lamps(u, sc); [L.read, L.search, L.verif, L.miss].forEach((v, i) => setLamp(lampM[i], v));
    /* bande Power BI : la bande avance d'un cran par rapport apparié, la roue à cliquet suit */
    const pn = T.pbiNotches(k, u); tapeM.map.offset.x = -pn * .1; pawl.root.rotation.z = .1 - .14 * Math.sin(Math.PI * (pn % 1));
    /* fiche ciblée */
    refresh(k, T.cardState(u, sc));
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes: [...cardMesh, ...digitKeys, ...drums, pageMesh] },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'La frappe', anchor: 'head' }, { label: 'Le poinçon', anchor: 'punch' }, { label: 'Le registre', anchor: 'register' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short })), setScenario(i) { forced = i == null ? null : ((i % 3) + 3) % 3; }, get scenario() { return forced; }
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + T.STEPS[v - 1], get: (t) => T.stepAt(T.locate(t, forced).u) + 1, seek: (v) => T.STEP_T[v - 1] + .4 }
  };
}
