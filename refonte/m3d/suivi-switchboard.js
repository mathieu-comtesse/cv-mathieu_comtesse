// RETROUVER TOUT LE SUIVI : standard téléphonique électromécanique.
// Une demande (OT, équipement, bâtiment) est choisie au clavier et au cadran ; les relais identifient les systèmes concernés ; l'opératrice (le mécanisme) branche deux fiches à cordon textile :
// l'une dans la prise de la demande, l'autre dans la prise du système, puis une seconde liaison ; le pupitre central affiche les accès retrouvés. Le scénario C simule une source indisponible,
// avec débranchement. L'outil retrouve des accès dans les applications existantes : il ne centralise pas les bases et ne garantit aucun accès (permissions applicatives).
// Contrat : build() -> { group, update(time), controls, api } ; tout est fonction pure du temps partagé. Valeurs fictives.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, TAU } from './machine-kit.js';
import * as T from './suivi-timeline.js';

export const WIDTH = 380;
const plateLabel = { fg: '#e8d9a8', bg: '#2a1f18', font: '700 28px ui-monospace,Menlo,Consolas,monospace' }, wide = { ...plateLabel, w: 512, h: 64 };
const CORDC = ['#c8372d', '#c8372d', '#2f6fb3', '#2f6fb3'];

function screenDraw(x, sc, d, st) {
  x.fillStyle = '#10161f'; x.fillRect(0, 0, 320, 160); x.fillStyle = '#8fb3d9'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText('ACCES RETROUVES  ' + sc.req, 10, 20); x.fillRect(10, 26, 300, 1);
  if (d.l1) { x.globalAlpha = d.fade; x.fillStyle = '#5fd39a'; x.fillText('> ' + T.SYS[sc.sys[0]] + ' : LIEN DISPONIBLE', 10, 52); x.globalAlpha = 1; }
  if (d.l2) { x.globalAlpha = d.fade; if (sc.down != null) { x.fillStyle = '#e5584b'; x.fillText('> ' + T.SYS[sc.sys[1]] + ' : SOURCE INDISPONIBLE', 10, 78); } else { x.fillStyle = '#5fd39a'; x.fillText('> ' + T.SYS[sc.sys[1]] + ' : LIEN DISPONIBLE', 10, 78); } x.globalAlpha = 1; }
  x.fillStyle = '#6b7b92'; x.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; x.fillText('ACCES SELON VOS PERMISSIONS APPLICATIVES', 10, 140); x.fillText('DEMO FICTIVE', 10, 152);
}

export function build() {
  const g = new THREE.Group(), M = workshopMats(makeMats());
  M.wood = new THREE.MeshStandardMaterial({ color: '#4a2f1c', roughness: .55, metalness: .02 }); M.bake = new THREE.MeshStandardMaterial({ color: '#1b1613', roughness: .35, metalness: .05 });
  M.lampBase = new THREE.MeshStandardMaterial({ color: '#8a5a1c', roughness: .4, metalness: .2 });
  const parts = [], zones = {}; let cz = 'bati', extra = 0;
  const zoneGroup = (n) => zones[n] || (zones[n] = Object.assign(new THREE.Group(), { name: 'zone:' + n }));
  const Z = (n) => { cz = n; };
  const stat = (name) => { const p = new Part(name, M); p.zone = cz; parts.push(p); return p; };
  const mover = (name, o) => { const p = new Part(name, M, o); p.zone = cz; parts.push(p); return p; };
  const put = (obj, zone = cz) => { zoneGroup(zone).add(obj); extra++; return obj; };
  const meshes = [];

  /* ================= bâti : caisse en bois, façade en bakélite, tablette ================= */
  Z('bati'); let S = stat('bati');
  S.box(0, 12, 3, 250, 120, 6, 'cast', 1.4); for (const [x, y] of [[-116, -40], [116, -40], [-116, 62], [116, 62]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);
  S.box(0, 8, 30, 230, 46, 48, 'wood', 1.4); S.box(0, 28, 52, 230, 48, 3, 'wood', 1.2);                                        // caisse et tablette (z 50 à 54)
  S.box(0, 0, 120, 230, 6, 134, 'bake', 1.2); for (const x of [-117, 117]) S.box(x, -3, 120, 6, 10, 138, 'wood', 1);
  S.box(0, -3, 190, 240, 12, 8, 'wood', 1.2); S.box(0, 3.4, 55, 230, 2, 3, 'brass', .4);
  S.box(0, 3.6, 188, 100, .6, 5, 'brass', .3); put(label('RETROUVER TOUT LE SUIVI', 0, 4.4, 188, 96, 4, 'y', wide)); put(label('DEMO FICTIVE', 90, 4.2, 188, 34, 3, 'y', { ...plateLabel, fg: '#ff8c7a', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));
  /* prises : paires par demande (trois lignes, trois colonnes), une par système */
  Z('face'); S = stat('prises');
  const jack = (x, z) => { S.cylY(3, 4.4, x, z, 3.2, 'brass', 20); S.cylY(3, 4.8, x, z, 2.1, 'ink', 16); S.cylY(3, 3.6, x, z, 4, 'steelDk', 20); };
  [0, 1, 2].forEach((row) => [0, 1, 2].forEach((col) => { for (const s of [0, 1]) { const [x, z] = T.reqJack(row, col, s); jack(x, z); } }));
  T.SYS.forEach((_, s) => { const [x, z] = T.sysJack(s); jack(x, z); });
  [['OT', 0], ['EQUIPEMENT', 1], ['BATIMENT', 2]].forEach(([n, r]) => { put(label(n, -100, 3.8, T.REQ_Z[r] + 8, 30, 3, 'y', wide)); });
  [['4417', 0], ['0205', 1], ['B12', 2]].forEach(([n, c]) => put(label(n, T.REQ_X[c], 3.8, T.REQ_Z[0] + 8, 18, 3, 'y', plateLabel)));
  T.SYS.forEach((n, s) => put(label(n, T.SYS_X[s], 3.8, T.SYS_Z - 9, 20, 3, 'y', plateLabel)));
  put(label('DEMANDES', -58, 3.8, 175, 40, 3.4, 'y', wide)); put(label('SYSTEMES', 64, 3.8, 175, 40, 3.4, 'y', wide));
  /* voyants : demandes (9), systèmes (5, vert) et source indisponible (rouge) */
  const lampsReq = []; [0, 1, 2].forEach((row) => [0, 1, 2].forEach((col) => { const l = lamp(T.REQ_X[col], 3.6, T.REQ_Z[row] + 4.5, 1.6, '#ffb347', 'y'); put(l); lampsReq.push(l); }));
  const lampsSys = T.SYS.map((_, s) => { const l = lamp(T.SYS_X[s] - 4.5, 3.6, T.SYS_Z + 7, 1.6, '#5fd39a', 'y'), r = lamp(T.SYS_X[s] + 4.5, 3.6, T.SYS_Z + 7, 1.6, '#e5584b', 'y'); put(l); put(r); return [l, r]; });
  for (let i = 0; i < 20; i++) S.cylY(3, 3.8, -100 + (i % 10) * 22, 98 + Math.floor(i / 10) * 12, 1.8, 'steelDk', 12);
  /* pupitre central : écran des accès */
  S.box(40, 3, 92, 80, 2, 44, 'steelDk', .6); const sc0 = cv(320, 160), sctx = sc0.getContext('2d'), sTex = tex(sc0, 8); screenDraw(sctx, T.SCEN[0], { l1: false, l2: false, fade: 1 }, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(76, 38), new THREE.MeshStandardMaterial({ map: sTex, roughness: .4, emissive: '#2a3a52', emissiveMap: sTex, emissiveIntensity: .5 })); screen.position.set(40, 92, 4.2); screen.userData.noGlow = true; put(screen);
  /* banc de relais : bobine et armature mobile */
  Z('relais'); S = stat('relais'); S.box(-62, 2, 92, 78, 3, 40, 'iron', .8);
  const relays = [0, 1, 2, 3, 4, 5].map((i) => { const x = -90 + i * 11; S.cylY(2, 9, x, 98, 3.6, 'bronze', 18); S.box(x, 6, 82, 7, 8, 3, 'steelDk', .4); const a = mover('armature ' + (i + 1), [x, 8, 90]); a.box(x, 8, 94, 5, 1.4, 10, 'steel', .4); a.cylY(7, 9, x, 90, 1, 'brass', 8); put(a.root); return a; });
  put(label('RELAIS', -62, 4, 112, 20, 3, 'y', plateLabel));

  /* ================= tablette : touches, cadran de sélection, alvéoles des fiches ================= */
  Z('tablette'); S = stat('tablette');
  for (const [x, y] of T.REST) { S.cylZ(x, y, 52.4, 5, 1.6, 'brass', 20); S.cylZ(x, y, 52.4, 3.4, 1.8, 'ink', 16); }
  const keys = [['OT', -64], ['EQUIP.', -48], ['BAT.', -32]].map(([n, x], i) => { S.box(x, 14, 53.4, 12, 12, 2, 'brass', .6); const k = mover('touche ' + n, [x, 14, 56]); k.cylZ(x, 14, 54, 4.4, 3.2, 'bakelite', 20); k.cylZ(x, 14, 57, 3.4, 1, 'ivory', 18); put(k.root); put(label(n, x, 24.6, 54.6, 12, 3, 'z', plateLabel)); return k; });
  S.cylZ(-84, 14, 53, 8, 1.4, 'steelDk', 28); for (let i = 0; i < 11; i++) { const a = Math.PI * .75 + i / 10 * Math.PI * 1.5; S.box(-84 + Math.cos(a) * 10.6, 14 + Math.sin(a) * 10.6, 54, .8, 1.6, .6, 'steel'); }
  const dial = mover('cadran', [-84, 14, 55]); dial.cylZ(-84, 14, 54, 6, 3.4, 'bakelite', 28); dial.box(-84, 14 + 3.4, 57.4, 1.2, 4, .6, 'ivory'); put(dial.root);
  put(label('NUMERO', -84, 26.6, 54.6, 16, 3, 'z', plateLabel));

  /* ================= fiches à cordon (4) et cordons (instances) ================= */
  const plugs = [0, 1, 2, 3].map((p) => { const m = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 9, 14), M.brass), tip = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 4, 12), M.steel), grip = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 6, 16), M.bake); body.position.y = 1; tip.position.y = 7.5; grip.position.y = -5; for (const o of [body, tip, grip]) { o.castShadow = true; o.userData.noGlow = true; m.add(o); } put(m, 'tablette'); extra += 2; return m; });
  const NS = 22, cordM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.6, .6, 1, 6), new THREE.MeshStandardMaterial({ roughness: .9 }), NS * 4); cordM.userData.noGlow = true; put(cordM, 'tablette');
  for (let p = 0; p < 4; p++) for (let s = 0; s < NS; s++) cordM.setColorAt(p * NS + s, new THREE.Color(s % 3 === 0 ? '#e8d9a8' : CORDC[p]));

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [...relays, ...keys, dial].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + NS * 4 + 30;
  meshes.push(screen);
  const ZOFF = { bati: [0, 0, 0], face: [0, 36, 10], relais: [0, 60, 10], tablette: [0, 40, 18] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), jacks: new THREE.Object3D(), desk: new THREE.Object3D(), screen: new THREE.Object3D() };
  at(anchors.all, 0, 20, 110); at(anchors.jacks, 0, 10, 150); at(anchors.desk, -40, 20, 60); at(anchors.screen, 40, 10, 92);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, skey = '';
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), vv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), C = new THREE.Vector3(), Hh = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), dir = new THREE.Vector3();

  function update(time) {
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced);
    /* touches, cadran, relais */
    keys.forEach((kk, i) => { kk.root.position.y = 56 - 2.2 * (i === sc.row ? T.key(u) : 0); }); dial.root.rotation.z = -T.dialAt(u, k, forced);
    const rl = T.relays(u); relays.forEach((a, i) => { a.root.rotation.z = -.22 * Math.min(1, rl[i]); });
    /* voyants */
    const lp = T.lamps(u, sc); lampsReq.forEach((l, i) => { const row = Math.floor(i / 3), col = i % 3; setLamp(l, lp.req && row === sc.row && col === sc.col ? 1 : 0); });
    lampsSys.forEach(([gl, rl2], s) => { setLamp(gl, lp.sys[s].g); setLamp(rl2, lp.sys[s].r); });
    /* fiches et cordons : la fiche suit sa trajectoire, le cordon part de sa queue vers son alvéole */
    for (let p = 0; p < 4; p++) {
      const s = T.plug(p, u, sc), th = -Math.PI / 2 * s.tilt; qq.setFromAxisAngle(new THREE.Vector3(1, 0, 0), th); plugs[p].quaternion.copy(qq); plugs[p].position.set(s.x, s.z, s.y);
      const tail = new THREE.Vector3(s.x, s.z - 8 * Math.cos(th), s.y - 8 * Math.sin(th)), hole = new THREE.Vector3(T.REST[p][0], T.SHELF_Z + 1, T.REST[p][1]);
      A.copy(tail); B.copy(hole); C.set((A.x + B.x) / 2, Math.min(A.y, B.y) + 10 - Math.abs(A.y - B.y) * .3, Math.max(A.z, B.z) + 8);
      let prev = A.clone();
      for (let i = 0; i < NS; i++) { const t = (i + 1) / NS, a = 1 - t; P.set(a * a * A.x + 2 * a * t * C.x + t * t * B.x, a * a * A.y + 2 * a * t * C.y + t * t * B.y, a * a * A.z + 2 * a * t * C.z + t * t * B.z); dir.subVectors(P, prev); const len = dir.length() + .01; dir.normalize(); qq.setFromUnitVectors(up, dir); vv.set(1, len, 1); m4.compose(vv.set(0, 0, 0).addScaledVector(prev, .5).addScaledVector(P, .5), qq, new THREE.Vector3(1, len, 1)); cordM.setMatrixAt(p * NS + i, m4); prev.copy(P); }
    }
    cordM.instanceMatrix.needsUpdate = true;
    /* écran des accès */
    const d = T.display(u, sc), key2 = [k, d.l1 ? 1 : 0, d.l2 ? 1 : 0, Math.round(d.fade * 6)].join('|'); if (key2 !== skey) { skey = key2; screenDraw(sctx, sc, d.show ? d : { l1: false, l2: false, fade: 1 }, 0); sTex.needsUpdate = true; }
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'Les prises', anchor: 'jacks' }, { label: 'La tablette', anchor: 'desk' }, { label: 'L\'écran', anchor: 'screen' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short })), setScenario(i) { forced = i == null ? null : ((i % 3) + 3) % 3; }, get scenario() { return forced; }
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + T.STEPS[v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u) + 1; }, seek: (v) => T.STEP_T[v - 1] + .4 }
  };
}
