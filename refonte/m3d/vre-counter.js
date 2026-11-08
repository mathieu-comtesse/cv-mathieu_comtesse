// EXTRACTEUR VRE : boulier mécanique de comptage des équipements.
// Une feuille de rapport de vérification électrique est lue ligne à ligne ; chaque équipement reconnu fait pivoter un aiguillage vers sa famille (BT31 disjoncteurs, BT33 fusibles, BT21 blocs de
// sécurité, BT11 candélabres) ; le tambour libère une bille qui roule dans la gouttière puis tombe dans la colonne transparente, et le compteur mécanique avance d'une unité.
// Un contrôle compare les totaux (un volet éjecte une bille mal classée dans le scénario C), puis le bordereau d'export sort et les colonnes se vident. Valeurs fictives.
// Contrat : build() -> { group, update(time), controls, api } ; tout est fonction pure du temps partagé.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, TAU } from './machine-kit.js';
import * as T from './vre-timeline.js';
const MAG = T.MAG;

export const WIDTH = 430;
const plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' }, wide = { ...plateLabel, w: 512, h: 64 };

function sheetTexture() { const c = cv(168, 216), x = c.getContext('2d'); x.fillStyle = '#f4efe0'; x.fillRect(0, 0, 168, 216); x.strokeStyle = '#6a6252'; x.lineWidth = 3; x.strokeRect(3, 3, 162, 210); x.fillStyle = '#2a251d'; x.font = '700 12px ui-monospace,Menlo,Consolas,monospace'; x.fillText('RAPPORT DE VERIFICATION', 10, 22); x.font = '700 9px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DEMO FICTIVE', 10, 34); x.fillStyle = '#c9c0a4'; x.fillRect(10, 40, 148, 2); for (let i = 0; i < 10; i++) { const y = 56 + i * 15.5; x.fillStyle = '#d9d1b8'; x.fillRect(10, y, 148, 11); x.fillStyle = '#2a251d'; x.fillRect(14, y + 4, 40 + (i * 23) % 70, 3); } return tex(c, 8); }
function digitDrum() { const c = cv(640, 64), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 640, 64); x.fillStyle = '#1d1a14'; x.font = '700 50px ui-monospace,Menlo,Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let d = 0; d < 10; d++) { x.save(); x.translate((9 - d) * 64 + 32, 33); x.rotate(Math.PI / 2); x.fillText(String(d), 0, 2); x.restore(); x.fillStyle = '#b9ae92'; x.fillRect((9 - d) * 64, 0, 1, 64); x.fillStyle = '#1d1a14'; } return tex(c, 8); }
function ctrlDraw(x, sc, v) {
  x.fillStyle = '#0f1722'; x.fillRect(0, 0, 192, 256); x.fillStyle = '#8fb3d9'; x.font = '700 12px ui-monospace,Menlo,Consolas,monospace'; x.fillText('CONTROLE DES TOTAUX', 10, 18); x.fillRect(10, 24, 172, 1);
  const exp = T.expected(sc), got = T.FAM.map((_, c) => sc.seq.filter((_, i) => T.actual(i, sc) === c).length - (sc.wrong != null && v.ko > .5 && c === sc.wrongTo ? 0 : 0));
  T.FAM.forEach((f, c) => { const y = 42 + c * 44, a = v.rows[c]; x.globalAlpha = Math.max(.15, a); x.fillStyle = f.col; x.fillRect(10, y - 10, 8, 14); x.fillStyle = '#d8e4f2'; x.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; x.fillText(f.id + ' ATTENDU ' + exp[c], 24, y); x.fillText('      OBTENU  ' + (a > .5 ? got[c] : '-'), 24, y + 14); x.globalAlpha = 1; });
  if (v.ok > .5) { x.fillStyle = '#5fd39a'; x.font = '700 16px ui-monospace,Menlo,Consolas,monospace'; x.fillText('TOTAUX CONFORMES', 10, 232); } if (v.ko > .5) { x.fillStyle = '#e5584b'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText('ECART : BILLE ECARTEE', 10, 232); }
}
function slipTexture() { const c = cv(176, 96), x = c.getContext('2d'); x.fillStyle = '#f6efdc'; x.fillRect(0, 0, 176, 96); x.fillStyle = '#2a251d'; x.font = '700 13px ui-monospace,Menlo,Consolas,monospace'; x.fillText('EXPORT VERS LE SUIVI', 8, 22); x.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; ['BT31  BT33  BT21  BT11', 'TOTAUX PAR FAMILLE', 'DEMO FICTIVE'].forEach((t, i) => x.fillText(t, 8, 46 + i * 16)); return tex(c); }

export function build() {
  const g = new THREE.Group(), M = workshopMats(makeMats());
  M.green = new THREE.MeshStandardMaterial({ color: '#2d7a4f', roughness: .45, metalness: .1 }); M.ball = new THREE.MeshStandardMaterial({ color: '#d4d8de', roughness: .18, metalness: .85 });
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [], COLM = ['red', 'amber', 'green', 'blue'];

  /* ================= bâti ================= */
  Z('bati'); let S = stat('bati');
  S.box(0, 8, 3, 440, 160, 6, 'cast', 1.4); for (const [x, y] of [[-206, -64], [206, -64], [-206, 76], [206, 76]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);
  S.box(0, 88.7, 3, 150, 1.2, 6, 'alu', .3);
  put(label('EXTRACTEUR VRE  BOULIER', -30, 89.4, 3, 110, 5, 'y', wide)); put(label('DEMO FICTIVE', 62, 89.4, 3, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= alimentation et lecteur : plateau, rouleaux, voûte, tête de lecture, voyants de famille ================= */
  Z('lecteur'); S = stat('lecteur');
  S.box(-130, 0, 18, 170, 52, 24, 'cast', 2); S.box(-130, 0, 30.4, 172, 54, .8, 'steelDk', .3);
  S.box(-175, 0, 33.6, 40, 38, 2.6, 'steel', .5); for (let i = 0; i < 3; i++) S.box(-175, 0, 35.2 + i * .35, 28, 36, .3, 'paperEdge'); for (const y of [-19.5, 19.5]) S.box(-175, y, 37, 40, 1.4, 6, 'steelDk', .4);
  for (const x of [-148, -122, -108]) { S.cylY(-14, 14, x, 33, 2.4, 'rubber', 18); S.cylY(-14, 14, x, 41, 2.4, 'rubber', 18); for (const y of [-17, 17]) S.box(x, y, 37, 3, 2.4, 12, 'steelDk', .3); }
  for (const y of [-21, 21]) S.box(-85, y, 44, 34, 2, 28, 'iron', .6); S.box(-85, 0, 60, 34, 44, 8, 'alu', 1); S.box(-85, 0, 66, 18, 24, 3, 'brass', .5); S.cylZ(-85, 0, 55, 3.4, 5, 'glass', 18);
  S.box(-85, 22.6, 56, 34, .8, 8, 'steelDk', .3); S.box(-55, 0, 36, 18, 34, 14, 'iron', 1); S.box(-45.8, 0, 36, .6, 28, 3, 'ink');            // fente de sortie
  put(label('LECTURE OPTIQUE', -85, 23.2, 62, 34, 3, 'y', wide));
  const fam = T.FAM.map((f, i) => { const l = lamp(-97 + i * 8, 23.2, 56, 1.7, f.col, 'y'); put(l); put(label(f.id, -97 + i * 8, 23.1, 51.6, 8, 2.4, 'y', plateLabel)); return l; });
  const sheetMesh = new THREE.Mesh(new THREE.PlaneGeometry(28, 36).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: sheetTexture(), roughness: .9 })); sheetMesh.castShadow = true; sheetMesh.userData.noGlow = true; put(sheetMesh);
  const hd = mover('tête de lecture', [-85, 0, 47]); hd.box(-85, 0, 47, 8, 4, 4, 'graphite', .6); hd.cylZ(-85, 0, 43.6, 1.6, 3.4, 'steel', 10); hd.box(-85, 0, 51, 3, 30, 2, 'steelDk', .4); put(hd.root);
  const recM = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: '#5aa0ff', emissiveIntensity: 0 }), rec = new THREE.Mesh(new THREE.BoxGeometry(16, .4, .8), recM); rec.userData.noGlow = true; put(rec);

  /* ================= distribution : tambour à alvéoles, entonnoir, aiguillage, gouttières ================= */
  Z('distribution'); S = stat('distribution');
  S.box(MAG.x, -14, 78, 14, 8, 154, 'cast', 1.2); S.box(MAG.x, -9, MAG.z, 40, 4, 40, 'cast', 1.2); S.box(MAG.x, 7.4, MAG.z, 38, .5, 38, 'glass');
  S.cylZ(MAG.x, 0, 114, 3, 10, 'steel', 24, 8); S.cylZ(MAG.x, 0, 110.6, 3.4, 3.4, 'brass', 20, 3); S.box(-28, 0, 111, 12, 14, 2, 'steelDk', .4);
  const drum = mover('tambour', [MAG.x, 0, MAG.z]); drum.cylY(-3, 3, MAG.x, MAG.z, 18, 'brass', 40); for (let j = 0; j < T.N; j++) { const a = -Math.PI / 2 + j * Math.PI / 5; drum.cylY(-3.4, .2, MAG.x + MAG.r * Math.cos(a), MAG.z + MAG.r * Math.sin(a), 4.6, 'steelDk', 18); } drum.cylY(-4, 4, MAG.x, MAG.z, 2.4, 'steel', 14); put(drum.root);
  const sw = mover('aiguillage', [-28, 0, 112]); sw.box(-18, 0, 110.6, 20, 7, .8, 'steel', .3); for (const y of [-3.4, 3.4]) sw.box(-18, y, 112, 20, .8, 2.2, 'steel', .3); sw.cylZ(-28, 0, 110, 2.2, 3, 'brass', 14); put(sw.root);
  for (let c = 0; c < 4; c++) {
    const xa = T.G0.x, za = T.G0.z, xb = T.COLX[c], zb = T.COL_TOP, ang = Math.atan2(zb - za, xb - xa), Ln = Math.hypot(xb - xa, zb - za), y = T.GY[c], mx = (xa + xb) / 2, mz = (za + zb) / 2 - 1;
    S.geo('steel', new THREE.BoxGeometry(Ln, .8, 6.4).rotateZ(ang), mx, y, mz);
    for (const sy of [-3.2, 3.2]) S.geo('steelDk', new THREE.BoxGeometry(Ln, 2.4, .8).rotateZ(ang), mx, y + sy, mz + 1.4 * Math.cos(ang));
    for (const f of [.3, .75]) { const px = xa + (xb - xa) * f, pz = za + (zb - za) * f; S.box(px, y, (pz - 2) / 2 + 6, 1.4, 1.4, pz - 2 - 6, 'steelDk', .3); }
  }
  /* ================= colonnes : tube transparent, collier coloré, trappe de vidange, compteur à tambour ================= */
  Z('colonnes'); S = stat('colonnes');
  S.box(92, 0, 8, 130, 30, 4, 'cast', 1);
  const cDrum = new THREE.MeshStandardMaterial({ map: digitDrum(), roughness: .55 }), drums = [], traps = [];
  T.COLX.forEach((x, c) => {
    const y = T.GY[c];
    for (const [dx, dy] of [[-7.6, 0], [7.6, 0], [0, -7.6], [0, 7.6]]) S.box(x + dx, y + dy, 9.4, dx ? 2 : 17, dx ? 17 : 2, 6.8, 'cast', .4);
    S.cylZ(x, y, 14, 4.9, 82, 'glass', 24); S.cylZ(x, y, 95, 5.8, 3, 'steel', 24); S.cylZ(x, y, 14, 5.8, 2, 'steel', 24); S.cylZ(x, y, 92, 6, 2.4, COLM[c], 24);
    for (const a of [0, 2.1, 4.2]) S.box(x + Math.cos(a) * 5.2, y + Math.sin(a) * 5.2, 56, .8, .8, 82, 'steelDk', .2);
    const tp = mover('trappe ' + T.FAM[c].id, [x, y, 13.4]); tp.box(x, y, 13.4, 17, 17, 1.2, 'steel', .4); tp.box(x + 8.6, y, 13.4, 2, 6, 2.4, 'brass', .4); put(tp.root); traps.push(tp);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 16, 26).rotateZ(Math.PI / 2), cDrum); d.position.set(x, 24, 40); d.castShadow = true; d.userData.noGlow = true; put(d); drums.push(d);
    S.box(x, 33, 24, 24, 8, 36, 'cast', 1); S.box(x, 36.8, 31.4, 20, .6, 12, 'ink'); S.box(x, 37.4, 31.4, 20, .4, 12, 'glass'); put(label(T.FAM[c].id, x, 37.6, 18.4, 20, 3, 'y', wide)); put(label(T.FAM[c].name, x, 37.6, 12.6, 22, 2.6, 'y', wide));
    put(label(T.FAM[c].id, x, y - 6.4, 100, 14, 3, 'y', plateLabel)); put(label(T.FAM[c].name, x, y - 6.4, 104, 26, 2.6, 'y', wide));
  });
  /* volet de rejet (colonne BT33) et bac de rebut */
  S.box(75, -26, 24, 28, 22, 14, 'iron', 1); S.box(75, -26, 31.6, 24, 18, .6, 'ink'); put(label('REBUT', 75, -14.6, 22, 18, 3, 'y', plateLabel).rotateY(0));
  const door = mover('volet de rejet', [75, T.GY[1] - 5.2, T.WRONG_Z]); door.box(75, T.GY[1] - 5.8, T.WRONG_Z, 9, 1.4, 8, 'bronze', .4); put(door.root);
  S.box(75, T.GY[1] - 5.2, T.WRONG_Z - 5, 9, 12, .8, 'steelDk', .3);

  /* ================= contrôle des totaux et export ================= */
  Z('controle'); S = stat('contrôle');
  S.box(190, 8, 42, 34, 36, 72, 'cast', 1.6); S.box(190, 26.4, 44, 28, .6, 42, 'ink'); S.bolts([[176, 26.6, 10], [204, 26.6, 10], [176, 26.6, 76], [204, 26.6, 76]], 'y', 1.1, 'brass');
  const cc = cv(192, 256), cctx = cc.getContext('2d'), ccTex = tex(cc, 8); ctrlDraw(cctx, T.SCEN[0], { rows: [0, 0, 0, 0], ok: 0, ko: 0 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(27, 36), new THREE.MeshStandardMaterial({ map: ccTex, roughness: .4, emissive: '#2a3a52', emissiveMap: ccTex, emissiveIntensity: .5 })); screen.position.set(190, 44, 26.8); screen.userData.noGlow = true; put(screen);
  const lampOK = lamp(182, 26.8, 20, 2.1, '#5fd39a', 'y'), lampKO = lamp(198, 26.8, 20, 2.1, '#e5584b', 'y'); put(lampOK); put(lampKO); put(label('OK', 182, 26.7, 14.6, 8, 2.6, 'y', plateLabel)); put(label('ECART', 198, 26.7, 14.6, 12, 2.6, 'y', plateLabel));
  S.box(190, 26.4, 8, 24, .6, 4, 'ink'); put(label('EXPORT', 190, 26.8, 3.2, 20, 2.6, 'y', plateLabel));
  const slip = new THREE.Mesh(new THREE.PlaneGeometry(20, 11).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: slipTexture(), roughness: .9, side: THREE.DoubleSide })); slip.userData.noGlow = true; put(slip);
  /* sélecteurs de bâtiment et de local */
  Z('pupitre'); S = stat('pupitre');
  S.box(-120, 56, 12, 80, 30, 12, 'cast', 1.4); S.box(-120, 56, 18.4, 76, 26, 1.2, 'alu', .5);
  const sd = [-142, -122].map((x, i) => { S.cylZ(x, 56, 19, 6.6, 1.2, 'steelDk', 26); const d = mover('sélecteur ' + (i ? 'local' : 'bâtiment'), [x, 56, 20.4]); d.cylZ(x, 56, 20, 4.8, 3.6, 'bakelite', 26); d.box(x, 56 + 2.4, 23.6, 1, 3.4, .6, 'red'); put(d.root); put(label(i ? 'LOCAL' : 'BATIMENT', x, 70.8, 15, 18, 3, 'y', plateLabel)); return d; });
  const nDrum = [0, 1, 2].map((i) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 8, 20).rotateZ(Math.PI / 2), cDrum); d.position.set(-104 + i * 9, 25, 62); d.userData.noGlow = true; put(d); return d; });
  S.box(-95, 62, 25, 34, 8, 8, 'cast', .6); S.box(-95, 66.2, 25, 28, .5, 6, 'glass');

  /* ================= balles et finalisation ================= */
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(T.BR, 18, 14), M.ball, T.N); balls.castShadow = true; balls.userData.noGlow = true; put(balls, 'colonnes');
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [drum, sw, hd, door, ...sd].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + 20;
  meshes.push(sheetMesh, screen, ...drums);
  const ZOFF = { bati: [0, 0, 0], lecteur: [-30, 0, 10], distribution: [0, 0, 36], colonnes: [0, 0, 14], controle: [36, 20, 8], pupitre: [0, 36, 4] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), reader: new THREE.Object3D(), drum: new THREE.Object3D(), cols: new THREE.Object3D() };
  at(anchors.all, 10, 0, 70); at(anchors.reader, -85, 15, 50); at(anchors.drum, MAG.x, 10, 130); at(anchors.cols, 92, 20, 60);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, ckey = '';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), vS = new THREE.Vector3();

  function update(time) {
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced);
    /* feuille et tête de lecture */
    const sh = T.sheet(u); sheetMesh.visible = sh.vis; at(sheetMesh, sh.x, 0, 37); const hdd = T.head(u, sc); hd.root.position.z = hdd.y; rec.visible = hdd.rec > 0 && hdd.line >= 0; at(rec, -85, hdd.y, 41.8); recM.emissiveIntensity = hdd.rec * 2.4;
    fam.forEach((l, i) => setLamp(l, hdd.fam === i ? 1 : 0));
    /* tambour, aiguillage, billes */
    const mg = T.magazine(u, sc); drum.root.rotation.z = -mg.k * Math.PI / 5; sw.root.rotation.y = -T.switchAngle(u, sc);
    for (let i = 0; i < T.N; i++) { const b = T.ball(i, u, sc), vis = b.vis && !(b.z < 13.4); q.identity(); vS.setScalar(vis ? (b.s ?? 1) : .001); m4.compose(new THREE.Vector3(b.x ?? 0, b.z ?? 0, b.y ?? 0), q, vS); balls.setMatrixAt(i, m4); }
    balls.instanceMatrix.needsUpdate = true;
    /* compteurs, trappes, volet */
    const cs = T.counters(u, sc); drums.forEach((d, c) => { d.rotation.x = (9.5 - cs[c]) / 10 * TAU; });
    const vf = T.verify(u, sc); traps.forEach((tp, c) => { tp.root.position.x = T.COLX[c] + 18 * vf.trap; }); door.root.position.z = T.GY[1] - 5.2 + 0; door.root.position.y = T.WRONG_Z + 9 * vf.door * (sc.wrong != null ? 1 : 0);
    /* contrôle */
    const key = [k, Math.round(vf.rows.reduce((a, b) => a + b, 0) * 8), Math.round(vf.ok), Math.round(vf.ko)].join('|'); if (key !== ckey) { ckey = key; ctrlDraw(cctx, sc, vf); ccTex.needsUpdate = true; }
    setLamp(lampOK, vf.ok); setLamp(lampKO, vf.ko); slip.visible = vf.slip > .01; at(slip, 190, 12 + 18 * vf.slip, 8.4);
    /* sélecteurs bâtiment / local */
    const da = T.dialAngle(u, k, forced); sd.forEach((d, i) => { d.root.rotation.y = -(i ? da * 1.4 : da); });
    const f = sm2(u), prev = T.SCEN[forced == null ? (k + 2) % 3 : k], vals = (s) => [s.bat + 1, Math.floor((s.loc + 1) / 10), (s.loc + 1) % 10];
    vals(sc).forEach((v, i) => { const pv = vals(prev)[i]; nDrum[i].rotation.x = (9.5 - (pv + (v - pv) * f)) / 10 * TAU; });
  }
  const sm2 = (u) => ease(clamp(u / 2));
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'Le lecteur', anchor: 'reader' }, { label: 'Le tambour', anchor: 'drum' }, { label: 'Les colonnes', anchor: 'cols' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short })), setScenario(i) { forced = i == null ? null : ((i % 3) + 3) % 3; }, get scenario() { return forced; }
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + T.STEPS[v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u) + 1; }, seek: (v) => T.STEP_T[v - 1] + .4 }
  };
}
