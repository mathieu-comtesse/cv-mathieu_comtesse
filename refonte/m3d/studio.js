// Fig 10 · Studio d'extracteurs PDF : une machine à reproduire les clés, en 3D.
// Portage de figures/build-studio.mjs : mêmes cotes, même contour de clé (modèle « PSX Tower Key », ZwiebelGames, CC BY 4.0, via
// figures/key-outline.mjs), mêmes quatre familles (CERFA, VRE, PP, FACTURES) et mêmes temps : le pont glisse (palpeur sur le modèle,
// fraise sur l'ébauche), la clé taillée vole jusqu'à la serrure de sa famille, entre, fait un quart de tour et la porte s'ouvre.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease } from './core.js';
import { FIXED, HOLE, BITTING, THICKNESS } from '../../figures/key-outline.mjs';

export const WIDTH = 268;
const PLATE = { x: -128, y: -78, w: 268, d: 134, r: 8 };
const BASE = { x: -110, y: -62, w: 156, d: 104 }, BASE_H = 14;
const SCALE = 24, KT = THICKNESS * SCALE * 1.07, s = SCALE / 20;
const KEY = { x0: -38, z: BASE_H + 4, tip: 1.784 * SCALE, top: BITTING.top * SCALE, back: BITTING.back * SCALE };
KEY.vc = (KEY.top + KEY.back) / 2;
const LANES = { master: -24, blank: 18 }, BRIDGE_Z = 48;
const LOCKER = { x: 52, y: -66, w: 78, d: 36 }, LOCKER_H = 82, FACE = LOCKER.y + LOCKER.d;
const DOOR = { w: 36, h: 37, th: 1.6, ka: 27, kz: 18 };
const DOORS = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([c, r]) => ({ x: LOCKER.x + 2 + c * (DOOR.w + 2), z: 3 + (1 - r) * (DOOR.h + 2) }));
const CUT = { from: 3.4 * s, to: 31 * s }, U_IN = .205 * SCALE;
const FAMILIES = [['CERFA', 7], ['VRE', 5], ['PP', 6], ['FACTURES', 4]];
const T = { trace: 9, fly: 1.7, insert: .8, turn: .9, open: 1.3, hold: 2.2, close: .8 };
const AT = { fly: T.trace, insert: T.trace + T.fly, turn: T.trace + T.fly + T.insert, open: T.trace + T.fly + T.insert + T.turn };
AT.hold = AT.open + T.open; AT.close = AT.hold + T.hold; AT.end = AT.close + T.close;
const hash = (i) => { let h = Math.imul(i + 17, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const notches = (f) => { const n = FAMILIES[f][1]; return Array.from({ length: n }, (_, i) => ({ u: CUT.from + 1.6 * s + (i + .5) * (CUT.to - CUT.from - 3.2 * s) / n, d: (1 + hash(f * 31 + i) * 2.1) * s })); };
const depthAt = (list, u) => list.reduce((m, n) => Math.max(m, Math.min(n.d, Math.max(0, n.d - Math.max(0, Math.abs(u - n.u) - .8 * s)))), 0);
const local = ([x, z]) => [z * SCALE, x * SCALE];
const area = (r) => r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const HOLE_L = (() => { const r = HOLE.map(local); return area(r) > 0 ? r.reverse() : r; })();
function outline(profile) {
  const from = local(BITTING.from), teeth = [from, [CUT.from - .2 * s, KEY.top]];
  for (let u = CUT.from; u <= CUT.to; u += .4) teeth.push([u, KEY.top - profile(u)]);
  teeth.push([CUT.to + .4 * s, KEY.top]);
  const ring = [...teeth, ...FIXED.map(local)];
  return area(ring) < 0 ? ring.reverse() : ring;
}
function clipU(ring, umax) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], ina = a[0] <= umax, inb = b[0] <= umax;
    if (ina) out.push(a);
    if (ina !== inb) { const k = (umax - a[0]) / (b[0] - a[0]); out.push([umax, a[1] + (b[1] - a[1]) * k]); }
  }
  return out;
}
/* Clé : plaque extrudée dont le contour est celui du modèle ; u le long de la lame, v en travers (centré sur l'axe de la lame). */
function keyGeometry(profile, umax = Infinity) {
  const ring = clipU(outline(profile), umax); if (ring.length < 3) return new THREE.BufferGeometry();
  const shape = new THREE.Shape(ring.map(([u, v]) => new THREE.Vector2(u, v - KEY.vc)));
  if (HOLE_L.every((p) => p[0] <= umax)) shape.holes.push(new THREE.Path(HOLE_L.map(([u, v]) => new THREE.Vector2(u, v - KEY.vc)).reverse()));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: KT, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(Math.PI / 2); geo.translate(0, KT / 2, 0);
  return geo;
}
const lineMat = new THREE.LineBasicMaterial({ color: 0x1d2230, transparent: true, opacity: .5 });
function keyMesh(color) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat(color)); m.castShadow = true;
  const edges = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat); m.add(edges);
  m.userData.set = (geo) => { m.geometry.dispose(); m.geometry = geo; edges.geometry.dispose(); edges.geometry = new THREE.EdgesGeometry(geo, 35); };
  return m;
}

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 12, w: 140, d: 7 }, label: { x: 60, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  g.add(slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, BASE_H, COL.mid, 4));
  // lits des clés
  for (const y of [LANES.master, LANES.blank]) g.add(slab(KEY.x0 - 14, y - 9, 80, 18, BASE_H, 3, COL.lo, 1.2), slab(KEY.x0 - 14, y - 9, 6, 18, BASE_H + 3, 8, COL.mid, 1));
  // rails et pont (palpeur au-dessus du modèle, fraise au-dessus de l'ébauche)
  for (const y of [-54, 38]) g.add(box(KEY.x0 + 20, y, 22, 110, 3, 3, COL.lo));
  const bridge = new THREE.Group();
  bridge.add(box(0, -8, BRIDGE_Z, 10, 100, 6, COL.mid), box(0, -54, 34, 10, 6, 28, COL.mid), box(0, 38, 34, 10, 6, 28, COL.mid));
  const stylus = cyl(0, 0, 1.2, 0, BRIDGE_Z - KEY.z + .5, COL.hi, 14), cutter = new THREE.Group();
  const cutTool = cyl(0, 0, 5.4, 0, 2, COL.mid, 32), cutShaft = cyl(0, 0, 1.4, 2, BRIDGE_Z - KEY.z - 2, COL.mid, 14), cutHead = cyl(0, 0, 4.6, BRIDGE_Z - KEY.z + 5, 9, COL.mid, 28);
  cutter.add(cutTool, cutShaft, cutHead);
  g.add(bridge, stylus, cutter);
  // clés posées dans leurs étaux
  const master = keyMesh(COL.hi), blank = keyMesh(COL.accent), flyer = keyMesh('#ffd9a8');
  master.position.set(KEY.x0, KEY.z + KT / 2, LANES.master + KEY.vc); blank.position.set(KEY.x0, KEY.z + KT / 2, LANES.blank + KEY.vc);
  g.add(master, blank, flyer);
  // casier : quatre portes à serrure
  g.add(slab(LOCKER.x, LOCKER.y, LOCKER.w, LOCKER.d, 0, LOCKER_H, COL.mid, 2));
  const slots = [];
  const hinges = DOORS.map((d) => {
    const hinge = new THREE.Group(); hinge.position.set(d.x, d.z, FACE);
    const door = box(DOOR.w / 2, 0, DOOR.h / 2, DOOR.w, DOOR.th, DOOR.h, COL.hi); door.position.set(DOOR.w / 2, DOOR.h / 2, DOOR.th / 2);
    const ring = cyl(0, 0, 4.6, 0, .3, COL.lo, 28); ring.rotation.x = Math.PI / 2; ring.position.set(DOOR.ka, DOOR.kz, DOOR.th + .15);
    const sl = box(0, 0, 0, 4.4, 1, .4, COL.dark, 0); sl.position.set(DOOR.ka, DOOR.kz, DOOR.th + .5); slots.push(sl);
    for (let i = 0; i < 3; i++) hinge.add(box(11, 0, 0, 12, 1, .2, COL.dark, 0).translateY(DOOR.h - 6 - i * 2.6).translateZ(DOOR.th + .1));
    hinge.add(door, ring, sl); g.add(hinge); return hinge;
  });
  const lockKey = new THREE.Group(), lockRoll = new THREE.Group(), lockMesh = keyMesh('#ffd9a8'); lockRoll.add(lockMesh); lockKey.add(lockRoll); lockKey.rotation.y = Math.PI / 2; lockKey.visible = false;
  const fam = display(40, 6); fam.mesh.position.set(BASE.x + BASE.w - 30, 7, BASE.y + BASE.d + .05); g.add(fam.mesh);
  const sel = box(0, 0, 0, 4.2, .6, .6, COL.ink, 0); sel.position.set(BASE.x + BASE.w - 16 + 2, BASE_H + 5, BASE.y + BASE.d - 12); g.add(sel);
  g.add(cyl(BASE.x + BASE.w - 16, BASE.y + BASE.d - 12, 4.4, BASE_H, 5, COL.mid, 28));

  let lastFam = -1, lastSig = '';
  function update(time) {
    const cyc = Math.floor(time / AT.end), f = cyc % FAMILIES.length, t = time - cyc * AT.end;
    const list = notches(f), name = FAMILIES[f][0], profile = (u) => depthAt(list, u);
    const u = CUT.from - 2 + (CUT.to - CUT.from + 4) * ease(Math.min(1, t / T.trace)), x = KEY.x0 + u, d = profile(u), spin = t * 18;
    const flying = t >= AT.fly;
    if (f !== lastFam) { master.userData.set(keyGeometry(profile)); lastFam = f; lastSig = ''; }
    const sig = f + '|' + (flying ? 'f' : Math.round(u * 5));
    if (sig !== lastSig) { blank.userData.set(keyGeometry((uu) => (uu <= u ? profile(uu) : 0))); lastSig = sig; }
    blank.visible = !flying;
    bridge.position.x = x;
    stylus.position.set(x, KEY.z - .5 + (BRIDGE_Z - KEY.z + .5) / 2, LANES.master + KEY.top - d + 1.2);
    cutter.position.set(x, KEY.z, LANES.blank + KEY.top - d + 5.4); cutHead.rotation.y = spin; cutTool.rotation.y = spin;
    // vol, insertion, quart de tour, ouverture
    const door = DOORS[f], K = [door.x + DOOR.ka, FACE + DOOR.th, door.z + DOOR.kz];
    const open = ease((t - AT.open) / T.open) * (1 - ease((t - AT.close) / T.close)), th = open * 1.85;
    hinges.forEach((h, i) => { h.rotation.y = i === f ? -th : 0; });
    slots.forEach((sl, i) => { sl.rotation.z = i === f && flying && t >= AT.turn ? -Math.PI / 2 * ease((t - AT.turn) / T.turn) : 0; });
    flyer.visible = false; lockKey.visible = false;
    if (flying) {
      const v = ease((t - AT.fly) / T.fly), start = [KEY.x0 + KEY.tip, LANES.blank + KEY.vc, KEY.z + KT / 2], end = [K[0], K[1] + 6, K[2]];
      if (t < AT.insert) {
        const A = start.map((a, i) => a + (end[i] - a) * v); A[2] += 30 * Math.sin(Math.PI * v);
        const psi = -Math.PI / 2 * v; if (flyer.userData.sig !== sig) { flyer.userData.set(keyGeometry(profile)); flyer.userData.sig = sig; }
        flyer.visible = true; flyer.rotation.set(0, -psi, 0);
        flyer.position.set(A[0] - Math.cos(psi) * KEY.tip, A[2], A[1] - Math.sin(psi) * KEY.tip);
      } else {
        const ua = KEY.tip + 6 - (KEY.tip + 6 - U_IN) * ease((t - AT.insert) / T.insert), rho = -Math.PI / 2 * ease((t - AT.turn) / T.turn);
        const fade = 1 - ease((t - AT.close) / T.close);
        lockMesh.userData.set(keyGeometry(profile, ua)); lockMesh.material.transparent = fade < 1; lockMesh.material.opacity = fade;
        lockRoll.rotation.x = rho; lockKey.visible = fade > .02;
        // la clé est rattachée à la porte active : même charnière, même ouverture
        hinges[f].add(lockKey); lockKey.position.set(DOOR.ka, DOOR.kz, DOOR.th + ua);
      }
    }
    fam.set(name);
    const a = -Math.PI * .5 + f * Math.PI / 3; sel.position.set(BASE.x + BASE.w - 16 + Math.cos(a) * 2.1, BASE_H + 5, BASE.y + BASE.d - 12 + Math.sin(a) * 2.1); sel.rotation.y = -a;
  }
  update(0);
  return { group: g, update, controls: { label: 'Famille', min: 1, max: FAMILIES.length, step: 1, fmt: (v) => FAMILIES[v - 1][0], get: (t) => Math.floor(t / AT.end) % FAMILIES.length + 1, seek: (v) => (v - 1) * AT.end } };
}
