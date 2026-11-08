// GARES PRIORITAIRES : tableau mécanique à tambours de palettes.
// Huit rangées (une par rang de priorité) : chacune est un tambour octogonal dont les huit faces portent les huit gares ; un moteur pas à pas le fait avancer
// de n faces, un cliquet à ressort s'arrête sur une roue à étoile (une impulsion à chaque pas). Trois cadrans par rangée suivent les indicateurs de la gare affichée.
// La couronne de critère entraîne un calculateur à cames ; un cadre sélecteur monté sur vis-mère désigne une rangée et fait sortir le tiroir de fiche.
// Ce n'est pas un tableau d'horaires. Gares et valeurs fictives. Contrat : build() -> { group, update(time), controls, api } ; tout est fonction pure du temps partagé.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, springGeoZ, gearXGeo, TAU } from './machine-kit.js';
import * as T from './gares-timeline.js';

export const WIDTH = 410;
const R = 6.8, DX0 = -126, DX1 = -28, DLEN = DX1 - DX0, DCX = (DX0 + DX1) / 2, GX = -20;     // tambour : rayon, étendue, centre ; roue entraînée
const DIAL_X = [20, 46, 72], plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' };

/* ---------------- textures ---------------- */
function drumTexture() {
  // huit cellules sur la circonférence (u) ; le nom se lit le long de l'axe (v) : le haut du caractère suit la circonférence
  const cw = 96, W = cw * 8, H = 560, c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = '#efe6cf'; x.fillRect(0, 0, W, H); x.textAlign = 'center'; x.textBaseline = 'middle';
  T.STATIONS.forEach((s, i) => {
    x.save(); x.translate(i * cw + cw / 2, H / 2); x.rotate(Math.PI / 2);
    x.fillStyle = '#17150f'; x.font = '700 46px ui-monospace,Menlo,Consolas,monospace'; x.fillText('GARE ' + s.name, 0, 4); x.restore();
    x.fillStyle = '#b7ab8c'; x.fillRect(i * cw, 0, 2, H);
  });
  return tex(c, 8);
}
function dialTexture() {
  const c = cv(128, 128), x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
  for (let i = 0; i <= 10; i++) { const a = Math.PI * .75 + (i / 10) * Math.PI * 1.5, r0 = i % 5 ? 48 : 40; x.strokeStyle = '#2a251d'; x.lineWidth = i % 5 ? 3 : 5; x.beginPath(); x.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); x.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); x.stroke(); }
  x.fillStyle = '#c8372d'; x.beginPath(); x.arc(64 + Math.cos(Math.PI * 2.1) * 52, 64 + Math.sin(Math.PI * 2.1) * 52, 5, 0, TAU); x.fill();
  return tex(c);
}
function ficheTexture(ctx, rank, crit, st) {
  ctx.fillStyle = '#f6efdc'; ctx.fillRect(0, 0, 336, 200); ctx.strokeStyle = '#8a8272'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, 328, 192);
  ctx.fillStyle = '#2a251d'; ctx.font = '700 22px ui-monospace,Menlo,Consolas,monospace'; ctx.fillText('GARE ' + st.name, 16, 36);
  ctx.font = '700 13px ui-monospace,Menlo,Consolas,monospace'; ctx.fillStyle = '#6a6252'; ctx.fillText('FICHE DE SUIVI · DEMO FICTIVE', 16, 56);
  ctx.fillStyle = '#2a251d'; ctx.font = '700 15px ui-monospace,Menlo,Consolas,monospace';
  [`Rang ${rank} selon : ${crit}`, `Equipements suivis : ${st.equip}`, `Prochaine echeance : ${st.ech}`, `Operations preventives : ${st.ops}`].forEach((t, i) => ctx.fillText(t, 16, 86 + i * 24));
  [['CRIT.', st.crit], ['CONF.', st.conf], ['MAINT.', st.maint]].forEach(([n, v], i) => { ctx.fillStyle = '#6a6252'; ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; ctx.fillText(n, 16 + i * 104, 184); ctx.fillStyle = '#d7d0bb'; ctx.fillRect(58 + i * 104, 174, 40, 8); ctx.fillStyle = '#2f6fb3'; ctx.fillRect(58 + i * 104, 174, 40 * v, 8); });
}

export function build() {
  const g = new THREE.Group(), M = workshopMats(makeMats());
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [];

  /* ================= bâti : plinthe, pupitre à couronnes, tiroir ================= */
  Z('bati'); let S = stat('bati');
  S.box(0, 15, 3, 340, 180, 6, 'cast', 1.4);
  for (const [x, y] of [[-158, -66], [158, -66], [-158, 94], [158, 94]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);
  S.box(-18, 25, 20, 284, 90, 28, 'cast', 2);                                                    // pupitre (z 6 à 34), sous le tableau
  S.box(-18, 70.3, 20, 284, .8, 28, 'steelDk', .3);                                              // façade
  S.bolts([[-150, 71, 12], [114, 71, 12], [-150, 71, 28], [114, 71, 28]], 'y', 1.3, 'brass');
  S.box(-18, 70.4, 38, 284, 2, 4, 'alu', .6);                                                    // bandeau
  put(label('GARES PRIORITAIRES', -60, 71.6, 38, 110, 3.4, 'y', { ...plateLabel, w: 512, h: 64 })); put(label('DEMO FICTIVE', 60, 71.6, 38, 40, 3.2, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= cadre du tableau : montants, traverses, fond, rails du sélecteur ================= */
  Z('tableau'); S = stat('cadre');
  for (const x of [-152, 116]) { S.box(x, -10, 98, 8, 32, 128, 'cast', 1.2); S.bolts([[x, 6.4, 40], [x, 6.4, 156]], 'y', 1.2, 'steelDk'); }
  S.box(-18, -8, 162, 284, 20, 8, 'cast', 1.2); S.box(-18, -25, 98, 268, 2, 128, 'iron', .5);   // traverse haute et fond
  S.box(-18, -8, 36, 268, 20, 4, 'cast', 1);                                                     // traverse basse
  for (const x of [-142, 104]) S.cylZ(x, 8, 34, 1.5, 124, 'steel', 12);                           // rails du sélecteur
  const labels = [['STATION', DCX, 14], ['CRITICITE', DIAL_X[0], 8], ['CONFORMITE', DIAL_X[1], 8], ['MAINTENANCE', DIAL_X[2], 8]];
  labels.forEach(([t, x, w]) => put(label(t, x, 2.2, 160, t === 'STATION' ? 40 : 24, 3.6, 'y', plateLabel)));
  /* un tableau de huit rangées : axe, roue à étoile et cliquet à ressort (à gauche), roue entraînée et moteur pas à pas (à droite), trois cadrans */
  const drumMat = new THREE.MeshStandardMaterial({ map: drumTexture(), roughness: .62, metalness: .05 });
  const rowsP = [], drums = [], pawls = [], pinions = [];
  S = stat('rangées');
  for (let k = 0; k < T.ROWS; k++) {
    const zk = T.ROW_Z(k);
    S.box(-148, 0, zk, 2, 8, 9, 'steelDk', .4); S.box(-23.2, -12, zk, 1.4, 24, 5, 'steelDk', .4);                      // paliers (montant gauche, bras arrière)
    S.cylX(-18, -4, -10, zk, 3.4, 'graphite', 18); S.cylX(-4, 0, -10, zk, 3.7, 'steelDk', 18); S.cylX(-22, -18, -10, zk, .9, 'steel', 10);   // moteur pas à pas et son arbre
    S.box(-12, -10, zk - 3.8, 12, 8, 2, 'steel', .4);
    S.box(-132, -18.5, zk, 6, 3, 6, 'steelDk', .4); S.box(90, 1.5, zk, 7, 3, 6, 'enamel', .4);                                // appui du ressort de cliquet, plaquette de rang
    S.springY(-132, zk, -17, -11, 1.8, 5, .3, 'steelDk');
    DIAL_X.forEach((dx) => S.cylY(0, 3.2, dx, zk, 5.9, 'brass', 24));                                                   // boîtiers de cadran
    const r = mover('rangée ' + (k + 1), [DCX, 0, zk]);
    r.geo('steel', gearXGeo(7.6, 8, 3, 1.4), -132, 0, zk); r.geo('brass', gearXGeo(7.2, 18, 3, 1.4), GX, 0, zk); r.cylX(DX0 - 2, DX0, 0, zk, 2.4, 'steelDk', 14); r.cylX(DX1, DX1 + 3, 0, zk, 2.4, 'steelDk', 14); r.cylX(-148, -22, 0, zk, 1.1, 'steel', 10);
    const dr = new THREE.Mesh(new THREE.CylinderGeometry(R, R, DLEN, 8, 1, false).rotateZ(Math.PI / 2), drumMat); dr.castShadow = true; dr.userData.noGlow = true; r.root.add(dr);
    rowsP.push(r); drums.push(dr);
  }
  /* pignons des moteurs et cliquets (instanciés) */
  const pinGeo = gearXGeo(3.7, 9, 3, .8), pinMesh = new THREE.InstancedMesh(pinGeo, M.steel, T.ROWS); pinMesh.userData.noGlow = true; put(pinMesh, 'tableau');
  const pawlMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 3, 4), M.brass, T.ROWS); pawlMesh.userData.noGlow = true; put(pawlMesh, 'tableau');
  /* cadrans : face, aiguille (instanciées) */
  const dialMat = new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: .6 }), N = T.ROWS * 3;
  const faces = new THREE.InstancedMesh(new THREE.CircleGeometry(5.3, 28), dialMat, N), needles = new THREE.InstancedMesh(new THREE.BoxGeometry(.7, 4.4, .4).translate(0, 2.2, 0), M.red, N); faces.userData.noGlow = needles.userData.noGlow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc1 = new THREE.Vector3(1, 1, 1), ax = new THREE.Vector3(0, 0, 1);
  for (let k = 0; k < T.ROWS; k++) DIAL_X.forEach((dx, j) => { m4.compose(new THREE.Vector3(dx, T.ROW_Z(k), 3.25), new THREE.Quaternion(), sc1); faces.setMatrixAt(k * 3 + j, m4); });
  faces.instanceMatrix.needsUpdate = true; put(faces, 'tableau'); put(needles, 'tableau');
  /* plaquettes de rang (1 à 8) */
  for (let k = 0; k < T.ROWS; k++) put(label(String(k + 1), 90, 3.1, T.ROW_Z(k), 5, 4.6, 'y', { ...plateLabel, w: 64, h: 64, font: '700 44px ui-monospace,Menlo,Consolas,monospace' }), 'tableau');

  /* ================= sélecteur : cadre ambre sur deux chariots, vis-mère et moteur ================= */
  Z('selecteur'); const selG = new THREE.Group(); zoneGroup('selecteur').add(selG); extra++;
  { const shape = new THREE.Shape(); const w = 240, h = 15.4; shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(-w / 2 + 1.4, -h / 2 + 1.4); hole.lineTo(-w / 2 + 1.4, h / 2 - 1.4); hole.lineTo(w / 2 - 1.4, h / 2 - 1.4); hole.lineTo(w / 2 - 1.4, -h / 2 + 1.4); hole.closePath(); shape.holes.push(hole);
    const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#d79a2b', roughness: .35, metalness: .4 })); fr.position.set(-19, 0, 8.6); fr.castShadow = true; fr.userData.noGlow = true; selG.add(fr); meshes.push(fr); }
  const sp = new Part('chariots', M); sp.zone = 'selecteur'; parts.push(sp);
  for (const x of [-142, 104]) { sp.box(x, 8, 0, 8, 6, 12, 'alu', .8); sp.bolts([[x, 11.2, 0]], 'y', 1, 'steelDk'); }
  sp.box(109, 8, 0, 4, 4, 8, 'brass', .5); sp.box(-19 - 118, 9.2, 0, 4, 2, 6, 'steelDk', .4); sp.box(-19 + 118, 9.2, 0, 4, 2, 6, 'steelDk', .4);
  selG.add(sp.done());
  S = stat('vis-mère'); S.cylZ(109, 8, 34, .8, 124, 'steelDk', 10); S.cylZ(109, 8, 158, 4, 6, 'graphite', 18);
  const screw = mover('vis du sélecteur', [109, 8, 96]); for (let i = 0; i < 38; i++) screw.cylZ(109, 8, 36 + i * 3.2, 1.7, .8, 'steel', 10); screw.box(109, 8, 160, 3, 1, 1, 'brass'); put(screw.root, 'selecteur');

  /* ================= pupitre : couronnes de réglage, calculateur à cames, voyants, tiroir de fiche ================= */
  Z('pupitre'); S = stat('pupitre');
  const crowns = [['CRITERE', -112], ['LIGNE', -82], ['SEUIL', -52]].map(([name, x]) => {
    S.cylY(70.8, 72, x, 25, 7.2, 'steelDk', 28); S.cylY(70.8, 71.2, x, 25, 8.2, 'brass', 28);
    for (let i = 0; i < 11; i++) { const a = Math.PI * .75 + i / 10 * Math.PI * 1.5; S.box(x + Math.cos(a) * 9.6, 71, 25 + Math.sin(a) * 9.6, .8, .6, 1.6, 'steel'); }   // repères
    const c = mover('couronne ' + name, [x, 73, 25]); c.cylY(72, 76, x, 25, 5.6, 'bakelite', 30); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; c.box(x + Math.cos(a) * 5.8, 74, 25 + Math.sin(a) * 5.8, 1, 4, 1, 'steelDk'); } c.box(x, 76.4, 25 + 2.8, 1.2, .6, 3.4, 'red');
    put(c.root); put(label(name, x, 71.4, 14.6, 16, 2.8, 'y', plateLabel)); return c;
  });
  /* calculateur à cames : caisson à façade vitrée en saillie, tambour à trois cames */
  S.box(-5, 76.4, 33.4, 46, 11.4, 1.6, 'steel', .5); S.box(-5, 76.4, 14.6, 46, 11.4, 1.6, 'steel', .5); S.box(-27.2, 76.4, 24, 1.6, 11.4, 18.4, 'steel', .5); S.box(17.2, 76.4, 24, 1.6, 11.4, 18.4, 'steel', .5);
  S.box(-5, 82.4, 24, 44, .6, 16.8, 'glass'); S.box(-5, 70.9, 24, 44, .4, 16.8, 'ink');
  const calc = mover('calculateur', [-5, 76, 24]); calc.cylX(-25, 15, 76, 24, 1.3, 'steel', 10); for (let i = 0; i < 3; i++) { calc.cylX(-19 + i * 14, -13 + i * 14, 76, 24, 5.2 - i * .5, 'brass', 28); calc.box(-16 + i * 14, 76, 24 + 5.8 - i * .4, 3, 3, 2.4, 'bronze', .3); } put(calc.root);
  put(label('CALCULATEUR', -5, 71.5, 14.6, 30, 2.8, 'y', plateLabel));
  const LAMPS = ['#e5584b', '#ffb347', '#5aa0ff'].map((c, i) => { const l = lamp(46 + i * 16, 71.8, 27, 2.3, c, 'y'); put(l); return l; });
  ['CRIT.', 'CONF.', 'MAINT.'].forEach((t, i) => put(label(t, 46 + i * 16, 71.4, 21, 12, 2.8, 'y', plateLabel)));
  /* tiroir : coque, poignée, fiche (texture mise à jour) */
  Z('tiroir'); const dwG = new THREE.Group(); zoneGroup('tiroir').add(dwG); extra++;
  const dp = new Part('tiroir', M); dp.zone = 'tiroir'; parts.push(dp);
  dp.box(60, 48, 7.8, 90, 44, 1.4, 'steel', .5); dp.box(16, 48, 10.6, 1.6, 44, 5, 'steel', .4); dp.box(104, 48, 10.6, 1.6, 44, 5, 'steel', .4); dp.box(60, 26.8, 10.6, 90, 1.6, 5, 'steel', .4);   // coque du tiroir
  dp.box(60, 70.6, 11, 100, 3, 9.6, 'alu', .8); dp.cylX(42, 78, 73.6, 11, 1.3, 'steel', 12); dp.bolts([[14, 72.3, 11], [106, 72.3, 11]], 'y', 1, 'steelDk');
  for (const x of [10, 110]) dp.box(x, 48, 9.4, 1.4, 44, 2.4, 'steelDk', .3);                       // glissières
  dwG.add(dp.done()); dwG.position.x = -78;
  const fc = cv(336, 200), fctx = fc.getContext('2d'), fcTex = tex(fc, 8); ficheTexture(fctx, 1, 'Criticité', T.STATIONS[0]);
  const fiche = new THREE.Mesh(new THREE.PlaneGeometry(62, 37).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: fcTex, roughness: .88 })); fiche.position.set(60, 8.7, 48); fiche.castShadow = true; fiche.userData.noGlow = true; dwG.add(fiche); meshes.push(fiche);
  let ficheKey = '';

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [...rowsP, screw, calc, ...crowns].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + 3 * T.ROWS * 3 + 24;
  meshes.push(...drums);

  const ZOFF = { bati: [0, 0, 0], pupitre: [0, 40, 6], tiroir: [0, 40, 6], tableau: [0, 0, 70], selecteur: [0, 30, 70] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), board: new THREE.Object3D(), desk: new THREE.Object3D(), dials: new THREE.Object3D() };
  at(anchors.all, -18, 0, 90); at(anchors.board, -77, 0, 100); at(anchors.desk, -60, 55, 25); at(anchors.dials, 46, 0, 100);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, lastK = 0;
  const unit = new THREE.Vector3(1, 1, 1), pivot = new THREE.Vector3();

  function update(time) {
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced); lastK = k;
    /* rangées : tambour, cliquet, pignon du moteur, cadrans */
    for (let i = 0; i < T.ROWS; i++) {
      const rw = T.row(i, u, sc), zk = T.ROW_Z(i), a = (rw.face + .5) / 8 * TAU;
      rowsP[i].root.rotation.x = a;
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -a * (7.2 / 3.7)); m4.compose(new THREE.Vector3(GX, zk, -10), q, unit); pinMesh.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(-132, zk, -9.6 - 1.4 * rw.pulse), new THREE.Quaternion(), unit); pawlMesh.setMatrixAt(i, m4);
      rw.vals.forEach((v, j) => { q.setFromAxisAngle(ax, 2.356 - 4.712 * v); m4.compose(new THREE.Vector3(DIAL_X[j], zk, 3.55), q, unit); needles.setMatrixAt(i * 3 + j, m4); });
    }
    pinMesh.instanceMatrix.needsUpdate = pawlMesh.instanceMatrix.needsUpdate = needles.instanceMatrix.needsUpdate = true;
    /* calculateur, couronnes, voyants */
    const ca = T.calc(u, sc); calc.root.rotation.x = ca.spin; crowns[0].root.rotation.z = -ca.crown;
    const se = T.selector(u, sc); crowns[1].root.rotation.z = -(se.z - T.SEL_PARK) / 120 * 4; crowns[2].root.rotation.z = -.8;
    LAMPS.forEach((l, i) => setLamp(l, ca.crit === i ? 1 : 0));
    /* sélecteur, vis-mère, tiroir et fiche */
    selG.position.y = se.z; screw.root.rotation.y = se.z / 3.2 * TAU * .5; dwG.position.z = 30 * se.drawer;
    if (se.row >= 0) {
      const st = T.STATIONS[T.ORDER[T.criterion(u, sc).cur][se.row]], key = se.row + '|' + st.name;
      if (key !== ficheKey) { ficheKey = key; ficheTexture(fctx, se.row + 1, T.CRITERIA[T.criterion(u, sc).cur].label, st); fcTex.needsUpdate = true; }
    }
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'Le tableau', anchor: 'board' }, { label: 'Le pupitre', anchor: 'desk' }, { label: 'Les cadrans', anchor: 'dials' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short })), setScenario(i) { forced = i == null ? null : ((i % 2) + 2) % 2; }, get scenario() { return forced; }
    },
    controls: { label: 'Séquence', min: 1, max: 4, step: 1, fmt: (v) => v + ' : ' + (lastK ? T.STEPS_B : T.STEPS_A)[v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u, l.k) + 1; }, seek: (v) => T.STEP_T[lastK][v - 1] + .4 }
  };
}
