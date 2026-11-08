// POWER BI, PLANS DE PRÉVENTION ET MOSO : paternoster d'archives automatisé.
// Deux chaînes à maillons portent huit casiers qui restent horizontaux ; la boucle tourne jusqu'à amener le casier demandé devant la fenêtre (verrou, ralentissement à l'arrivée) ;
// un bras à ventouse sort le dossier sur le comptoir ; le lecteur de référence allume le portail de visualisation. Deux modules distincts : le MOTEUR D'ARCHIVAGE (entrée documentaire, paternoster)
// et le PORTAIL DE VISUALISATION (Power BI) : ils ne sont pas confondus. Valeurs fictives. Contrat : build() -> { group, update(time), controls, api } ; tout est fonction pure du temps partagé.
import * as THREE from 'three';
import { Part, makeMats, label, lamp, setLamp, clamp, seg, ease, at } from './nisaru-geometry.js';
import { cv, tex, workshopMats, gearXGeo, TAU } from './machine-kit.js';
import * as T from './powerbi-timeline.js';
import { industrial } from './pro-materials.js';

export const WIDTH = 330;
const plateLabel = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace' }, wide = { fg: '#1f1b14', bg: '#c9ced6', font: '700 28px ui-monospace,Menlo,Consolas,monospace', w: 512, h: 64 }, CY = 20, STX = T.RAD;

function folderTexture(i) { const c = cv(128, 96), x = c.getContext('2d'); const col = ['#d8bb7c', '#b9d0e6', '#e2c3b5', '#c9deb8'][i % 4]; x.fillStyle = col; x.fillRect(0, 0, 128, 96); x.strokeStyle = '#6a6252'; x.lineWidth = 3; x.strokeRect(2, 2, 124, 92); x.fillStyle = '#f4efe0'; x.fillRect(8, 8, 70, 22); x.fillStyle = '#2a251d'; x.font = '700 13px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DOSSIER ' + (i + 1), 12, 24); x.font = '700 9px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DEMO FICTIVE', 10, 86); return tex(c); }
const barVals = (name) => { let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997; return [0, 1, 2, 3, 4, 5].map((i) => .25 + .7 * (((h * (i + 3) * 13) % 97) / 97)); };
function screenDraw(x, sc, v, ind, ghostName) {
  x.fillStyle = '#0f1722'; x.fillRect(0, 0, 352, 240); x.fillStyle = '#8fb3d9'; x.font = '700 14px ui-monospace,Menlo,Consolas,monospace'; x.fillText('PORTAIL ' + sc.kind + '  ' + (v >= 0 ? sc.docs[v] : 'EN ATTENTE'), 12, 24); x.fillRect(12, 32, 328, 1);
  for (let i = 0; i < 4; i++) { x.fillStyle = '#243247'; x.fillRect(12, 60 + i * 44, 328, 1); }
  if (v >= 0 && ind > .02) {
    const cur = barVals(sc.docs[v]), old = ghostName ? barVals(ghostName) : null;
    cur.forEach((b, i) => { const bx = 24 + i * 52, h = 150 * b * ind; if (old) { x.fillStyle = '#6b7b92'; x.fillRect(bx, 214 - 150 * old[i], 16, 150 * old[i]); } x.fillStyle = sc.kind === 'PP' ? '#d79a2b' : '#5aa0ff'; x.fillRect(bx + (old ? 18 : 6), 214 - h, old ? 16 : 28, h); });
    if (old) { x.fillStyle = '#6b7b92'; x.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; x.fillText('T1', 252, 52); x.fillStyle = '#d79a2b'; x.fillText('T2', 290, 52); }
  }
  x.fillStyle = '#c8372d'; x.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; x.fillText('DONNEES FICTIVES' + (ghostName ? ' : ETATS SIMULES, PAS DES DONNEES REELLES' : ''), 12, 234);
}

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
  S.box(0, 20, 3, 400, 170, 6, 'enamel', 1.4);                                                   // table émaillée
  S.box(0, 104.3, 3, 400, 1.4, 5, 'alu', .4); S.box(0, -64.3, 3, 400, 1.4, 5, 'alu', .4);
  for (let i = 0; i < 10; i++) S.box(-170 + i * 36, 105.2, 3, 14, .5, 1.8, 'ink', .2);          // ouïes de ventilation en façade for (const [x, y] of [[-186, -56], [186, -56], [-186, 94], [186, 94]]) S.cylZ(x, y, -4, 5, 4.2, 'graphite', 16);
  S.box(-10, 103.7, 3, 150, 1.2, 6, 'alu', .3);
  put(label('ARCHIVES  PP ET MOSO', -40, 104.4, 3, 110, 5, 'y', wide)); put(label('DEMO FICTIVE', 56, 104.4, 3, 40, 3.4, 'y', { ...plateLabel, fg: '#7a2b24', font: '700 24px ui-monospace,Menlo,Consolas,monospace' }));

  /* ================= paternoster : colonnes, chaînes, pignons, verrou, vitrage, fenêtre ================= */
  Z('paternoster'); S = stat('armoire');
  S.box(0, 0, 14, 90, 60, 16, 'cast', 1.6);
  for (const x of [-38, 38]) for (const y of [-26, 26]) { S.box(x, y, 98, 6, 6, 180, 'cast', 1); S.bolts([[x, y, 188.4]], 'z', 1.2, 'steelDk'); }
  S.box(0, 0, 188, 90, 60, 4, 'cast', 1.4); S.box(0, -28, 98, 84, 2, 176, 'iron', .6);
  S.box(-41, 0, 98, .5, 52, 176, 'glass'); S.box(41, 0, 36, .5, 52, 56, 'glass'); S.box(41, 0, 138, .5, 52, 100, 'glass'); S.box(41.2, -27, 76, 1.2, 2, 24, 'alu', .3); S.box(41.2, 27, 76, 1.2, 2, 24, 'alu', .3);
  S.box(0, 28.6, 98, 82, .5, 176, 'glass');                                                        // vitrage avant ; fenêtre de consultation sur le flanc droit entre z 64 et 88
  const zB = T.Z_TOP - T.H;
  for (const y of [-CY, CY]) { for (const z of [T.Z_TOP, zB]) { S.cylY(y < 0 ? -26 : 20, y < 0 ? -20 : 26, 0, z, 2.2, 'steelDk', 14); } S.box(0, y, T.Z_TOP, 3, 2, 10, 'steelDk', .4); }
  S.box(-CY - 4, -CY, 98, 1, 4, 100, 'steelDk', .3); S.box(CY + 4, -CY, 98, 1, 4, 100, 'steelDk', .3);
  put(label('MOTEUR D\'ARCHIVAGE', 0, 29.2, 176, 70, 3.6, 'y', wide));
  const sprocs = [];
  for (const z of [T.Z_TOP, zB]) for (const y of [-CY, CY]) { const m = mover('roue de chaîne', [0, y, z]); m.gearY(0, z, y - 1.2, y + 1.2, 18.6, 22, 'steel', 2.4); put(m.root); sprocs.push(m); }
  const lock = mover('verrou', [STX + 14, 0, 63]); lock.box(STX + 14, -22, 63, 6, 2, 3, 'bronze', .4); lock.box(STX + 14, 22, 63, 6, 2, 3, 'bronze', .4); lock.cylY(-22, 22, STX + 14, 63, .9, 'steel', 8); put(lock.root);
  S.box(STX + 14, -24, 66, 8, 4, 10, 'steelDk', .5); S.box(STX + 14, 24, 66, 8, 4, 10, 'steelDk', .5);
  /* chaînes : maillons instanciés */
  const NL = 64, linkM = new THREE.InstancedMesh(new THREE.BoxGeometry(4.2, 1.8, 2.2), M.steelDk, NL * 2); linkM.userData.noGlow = true; put(linkM);
  /* casiers : un modèle fusionné cloné huit fois */
  const cp = new Part('casier', M);
  for (const y of [-19.5, 19.5]) { cp.box(0, y, -3.5, 2.4, 2.4, 7, 'steel', .4); cp.cylY(y - 1.4, y + 1.4, 0, 0, 1.3, 'brass', 10); }
  cp.box(0, 0, -17, 22, 36, 1.2, 'steel', .6); cp.box(-10.8, 0, -12.4, 1.2, 36, 10.4, 'steelDk', .4);
  cp.box(0, -17.4, -12.4, 22, 1.2, 10.4, 'steelDk', .4); cp.box(0, 17.4, -13.4, 22, 1.2, 8.4, 'steelDk', .4);
  cp.box(0, 0, -7, 22, 36, .8, 'steelDk', .3).box(-2, -11, -15.2, 14, 11, 1.6, 'paper', .2);
  const car = cp.done(), carriers = [];
  for (let i = 0; i < T.N; i++) { const c = car.clone(true); c.add(label('P' + (i + 1), 0, 18.2, -13, 9, 3, 'y', plateLabel).translateX(0)); zoneGroup('paternoster').add(c); carriers.push(c); extra += 2; }
  const folderM = []; for (let i = 0; i < T.N; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 12), [M.paperEdge, M.paperEdge, new THREE.MeshStandardMaterial({ map: folderTexture(i), roughness: .85 }), M.paperEdge, M.paperEdge, M.paperEdge]); f.castShadow = true; f.userData.noGlow = true; zoneGroup('paternoster').add(f); folderM.push(f); }
  /* ================= comptoir : fenêtre latérale à volet, bras à ventouse le long de x, lecteur de référence ================= */
  Z('comptoir'); S = stat('comptoir');
  S.box(63, 0, 27, 44, 44, 40, 'cast', 1.4); S.box(63, 0, 45.6, 46, 46, 3.2, 'alu', .8); S.box(41, 0, 46, .8, 46, 2.4, 'steelDk', .3);
  S.box(77, 0, 51.5, 10, 12, 4, 'steelDk', .5); S.box(77, -4, 48.5, 10, 2, 4, 'steelDk', .4); S.box(77, 4, 48.5, 10, 2, 4, 'steelDk', .4);
  for (const y of [-16, 16]) S.box(63, y, 56, 3, 2.4, 18, 'iron', .5); S.box(63, 0, 66, 6, 38, 3, 'alu', .6); S.cylZ(63, 0, 62, 2.4, 4, 'glass', 14); put(label('LECTEUR DE REFERENCE', 63, 19, 68, 48, 2.8, 'z', wide).rotateZ(0));
  const lampScan = lamp(63, 0, 69, 1.6, '#5aa0ff', 'z'); put(lampScan);
  const shutter = mover('volet de fenêtre', [41, 0, 77]); shutter.box(41.6, 0, 77, 1.2, 46, 22, 'glass'); shutter.box(41.8, 0, 66.4, 1.4, 46, 1.4, 'steel', .3); shutter.box(41.8, 0, 87.6, 1.4, 46, 1.4, 'steel', .3); shutter.box(41.8, -22.5, 77, 1.4, 1.4, 22, 'steel', .3); shutter.box(41.8, 22.5, 77, 1.4, 1.4, 22, 'steel', .3); put(shutter.root);
  const arm = mover('bras extracteur', [60, 0, 52.5]); arm.box(85, 0, 52.5, 50, 3, 3, 'alu', .6); arm.box(60.8, 0, 52.5, 3, 6, 5, 'steelDk', .5); arm.cylZ(60, 0, 48.6, 2.6, 4, 'rubber', 16); arm.cylZ(60, 0, 52.6, .8, 3, 'steel', 8); put(arm.root);
  /* ================= entrée documentaire (moteur d'archivage) et portail de visualisation ================= */
  Z('entree'); S = stat('entrée');
  S.box(150, 0, 40, 50, 40, 68, 'iron', 1.4); S.box(150, 20.3, 52, 36, .6, 4, 'ink'); S.box(150, 20.3, 30, 36, .6, 10, 'ink'); S.bolts([[128, 20.4, 66], [172, 20.4, 66], [128, 20.4, 12], [172, 20.4, 12]], 'y', 1.1, 'brass');
  put(label('ENTREE DOCUMENTAIRE', 150, 20.6, 64, 44, 3.2, 'y', wide)); put(label('VM  SHAREPOINT  ARCHIVAGE', 150, 20.6, 58, 44, 2.8, 'y', wide)); put(label('FENTE DE DEPOT', 150, 20.6, 52, 30, 2.8, 'y', wide));
  const lampsE = [0, 1, 2].map((i) => { const l = lamp(140 + i * 10, 20.8, 40, 1.7, ['#5fd39a', '#ffb347', '#5aa0ff'][i], 'y'); put(l); return l; });
  put(label('VM', 140, 20.5, 34, 7, 2.6, 'y', plateLabel)); put(label('RANGE', 150, 20.5, 34, 8, 2.6, 'y', plateLabel)); put(label('ARCHIVE', 160, 20.5, 34, 10, 2.6, 'y', plateLabel));
  Z('portail'); S = stat('portail');
  S.box(-102, 0, 56, 62, 40, 100, 'cast', 1.6); S.box(-102, 0, 110, 66, 44, 4, 'alu', .8); S.box(-102, 20.6, 100, 52, .8, 40, 'ink'); S.bolts([[-130, 20.6, 14], [-74, 20.6, 14], [-130, 20.6, 100], [-74, 20.6, 100]], 'y', 1.1, 'brass');
  put(label('PORTAIL DE VISUALISATION', -102, 20.9, 106.5, 56, 3.2, 'y', wide)); put(label('POWER BI', -102, 20.9, 12, 24, 3, 'y', plateLabel));
  const sc = cv(352, 240), sctx = sc.getContext('2d'), scTex = tex(sc, 8); screenDraw(sctx, T.SCEN[0], -1, 0, null);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(50, 34), new THREE.MeshStandardMaterial({ map: scTex, roughness: .35, emissive: '#2a3a52', emissiveMap: scTex, emissiveIntensity: .55 })); screen.position.set(-102, 90, 21.1); screen.userData.noGlow = true; put(screen);
  const lampPP = lamp(-118, 21, 68, 2, '#d79a2b', 'y'), lampMO = lamp(-86, 21, 68, 2, '#5aa0ff', 'y'); put(lampPP); put(lampMO); put(label('PP', -118, 21, 62, 9, 2.8, 'y', plateLabel)); put(label('MOSO', -86, 21, 62, 12, 2.8, 'y', plateLabel));
  const dials = [-112, -102, -92].map((x) => { S.cylY(20.4, 21.4, x, 44, 5.2, 'brass', 24); const n = mover('aiguille', [x, 21.6, 44]); n.box(x, 21.8, 47.4, .7, .4, 6, 'red'); n.cylY(21.4, 22.6, x, 44, 1.1, 'steel', 10); put(n.root); return n; });
  /* câble de liaison lecteur - portail */
  for (let i = 0; i < 22; i++) S.box(-72 + i * 6.2, -38, 14, 6.4, 1.6, 1.6, 'ink', .3); S.box(63, -38, 30, 1.6, 1.6, 34, 'ink', .3); S.box(63, -19, 56, 1.6, 38, 1.6, 'ink', .3); S.box(-102, -38, 20, 1.6, 1.6, 12, 'ink', .3);

  /* ================= finalisation ================= */
  for (const p of parts) { p.done(); if (!p.root.parent) zoneGroup(p.zone).add(p.root); }
  [shutter, arm, lock, ...dials].forEach((m) => { if (!m.root.parent) zoneGroup(m.zone).add(m.root); });
  for (const z of Object.values(zones)) g.add(z);
  const count = parts.reduce((a, p) => a + p.count, 0) + extra + T.N * 14 + NL * 2;
  meshes.push(screen, ...folderM);

  const ZOFF = { bati: [0, 0, 0], paternoster: [0, 0, 26], comptoir: [0, 36, 8], entree: [50, 0, 10], portail: [-50, 0, 10] };
  const inspect = { to: 0, v: 0, t: 0 };
  const anchors = { all: new THREE.Object3D(), loop: new THREE.Object3D(), counter: new THREE.Object3D(), portal: new THREE.Object3D() };
  at(anchors.all, -10, 10, 90); at(anchors.loop, 0, 20, 100); at(anchors.counter, 18, 40, 55); at(anchors.portal, -102, 20, 80);
  for (const o of Object.values(anchors)) g.add(o);
  let forced = null, lastK = 0, scKey = '', lastTime = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ax = new THREE.Vector3(0, 0, 1), one = new THREE.Vector3(1, 1, 1);

  const curU = () => Math.max(0, lastTime - T.CUSTOM.base);
  function update(time) {
    lastTime = time;
    const now = performance.now(), dt = inspect.t ? Math.min(.1, (now - inspect.t) / 1000) : 0; inspect.t = now;
    inspect.v += (inspect.to - inspect.v) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(inspect.to - inspect.v) < .002) inspect.v = inspect.to;
    for (const [n, z] of Object.entries(zones)) { const o = ZOFF[n] || [0, 0, 0]; at(z, o[0] * inspect.v, o[1] * inspect.v, o[2] * inspect.v); }
    const { k, u, sc } = T.locate(time, forced); lastK = k;
    const d = T.drive(u, k), st = T.state(u, k);
    /* chaînes, pignons, casiers (toujours horizontaux), dossiers */
    for (let c = 0; c < NL; c++) { const p = T.path(c * T.L / NL + d); for (let j = 0; j < 2; j++) { q.setFromAxisAngle(ax, p.a + Math.PI / 2); m4.compose(new THREE.Vector3(p.x, p.z, j ? CY : -CY), q, one); linkM.setMatrixAt(j * NL + c, m4); } }
    linkM.instanceMatrix.needsUpdate = true;
    sprocs.forEach((m, i) => { m.root.rotation.z = -d / 18; });
    for (let i = 0; i < T.N; i++) { const p = T.path(i * T.SP + d); carriers[i].position.set(p.x, p.z, 0); }
    shutter.root.position.y = 77 + 22 * st.door;
    lock.root.position.x = STX + 14 - 8 * st.lock;
    arm.root.position.x = 60 + (st.tip + 8 - 60);
    setLamp(lampScan, st.scan);
    /* dossiers : dans leur casier, ou suivent la ventouse de la fenêtre au comptoir */
    const tgt = st.on ? sc.c[st.i] : -1;
    for (let i = 0; i < T.N; i++) { const p = T.path(i * T.SP + d), f = folderM[i]; if (i === tgt && st.out) at(f, st.tip + 8, 0, p.z - 15.6); else at(f, p.x, 0, p.z - 15.6); }
    /* portail de visualisation */
    const gh = st.on && sc.ghost ? sc.ghost(st.i) : null, key = [k, st.i, Math.round(st.ind * 12), gh || '', st.on ? sc.docs[st.i] : ''].join('|');
    if (key !== scKey) { scKey = key; screenDraw(sctx, sc, st.on && st.ind > .01 ? st.i : -1, st.ind, gh); scTex.needsUpdate = true; }
    setLamp(lampPP, sc.kind === 'PP' && st.ind > .02 ? 1 : 0); setLamp(lampMO, sc.kind === 'MOSO' && st.ind > .02 ? 1 : 0);
    const dv = st.on ? barVals(sc.docs[st.i]) : [0, 0, 0];   // aiguilles : trois premiers indicateurs fictifs dials.forEach((n, i) => { n.root.rotation.z = 2.356 - 4.712 * dv[i] * st.ind; });
    lampsE.forEach((l, i) => setLamp(l, st.on && st.tv < 8 && i === Math.floor(u * 1.5) % 3 ? 1 : 0));
  }
  update(0);
  return {
    group: g, update, count, audit: { parts, meshes },
    api: {
      anchors, setInspect(v) { inspect.to = v ? 1 : 0; }, get inspecting() { return inspect.to > 0; },
      views: [{ label: 'La boucle', anchor: 'loop' }, { label: 'Le comptoir', anchor: 'counter' }, { label: 'Le portail', anchor: 'portal' }],
      scenarios: T.SCEN.map((s) => ({ id: s.id, label: s.label, short: s.short, edit: !!s.edit, editT: s.editT, hold: s.hold })), setScenario(i) { forced = i == null ? null : ((i % 4) + 4) % 4; if (forced === 3) T.startCustom(lastTime); }, get scenario() { return forced; },
      /* scénario D « Ma consultation » : choisir un document (plan de prévention ou marché), voir le casier venir à la fenêtre, consulter, comparer deux états simulés */
      params: {
        visible: () => forced === 3,
        groups: [
          { name: 'Document', options: T.CAT.map((e, i) => ({ label: e.label, run: () => { if (forced === 3) T.consult(i, curU()); } })), get: () => T.CUSTOM.last },
          { name: 'Comparer', options: [{ label: 'Deux états du dernier plan', run: () => { if (forced === 3) T.compareLast(curU()); } }], get: () => -1 }
        ]
      },
      status() {
        if (forced !== 3) return ''; const u = curU(), st = T.state(u, 3), ev = T.CUSTOM.ev, n = ev.length, e = ev[st.on ? st.i : n - 1];
        if (!e) return 'Aucune demande : choisissez un document.'; const queued = ev.filter((x) => x.t0 > u).length;
        return (st.on ? 'En cours : ' : 'Dernière consultation : ') + e.doc + ' (casier P' + (e.c + 1) + ', portail ' + e.kind + ')' + (e.compare ? ' · comparaison de deux états simulés, pas des données réelles' : ' · indicateurs fictifs') + (queued ? ' · ' + queued + ' demande(s) en attente' : '');
      },
      /* un clic sur l'entrée documentaire passe au document suivant (actif seulement dans « Ma consultation ») */
      drag: (() => {
        const inv = new THREE.Matrix4(), r = new THREE.Ray(), hit = new THREE.Vector3();
        return {
          pick(ray) {
            if (forced !== 3 || inspect.v > .05) return null; inv.copy(g.matrixWorld).invert(); r.copy(ray).applyMatrix4(inv); if (Math.abs(r.direction.z) < 1e-6) return null;
            const t = (20.3 - r.origin.z) / r.direction.z; if (t < 0) return null; r.at(t, hit);
            if (Math.abs(hit.x - 150) < 25 && hit.y > 6 && hit.y < 74) { T.consult((T.CUSTOM.last + 1 + T.CAT.length) % T.CAT.length, curU()); return { id: 'entree', name: 'document suivant' }; } return null;
          }, move() {}, end() {}
        };
      })()
    },
    controls: { label: 'Étape', min: 1, max: 6, step: 1, fmt: (v) => v + ' : ' + T.STEPS[v - 1], get: (t) => { const l = T.locate(t, forced); return T.stepAt(l.u, l.k) + 1; }, seek: (v) => T.seekT(v) + .4 }
  };
}
