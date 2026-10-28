import * as THREE from 'three';
import { chamferBoxGeometry } from './geometry.js';
import { buildPerson, setPose } from './peopleModel-street.js';
import { contactShadow, softDiscTexture } from './detail.js';
import { clamp, lerp, smooth } from './config.js';
import { STAND, walkPose, mixPose } from './poses.js';

/** Boîtes chanfreinées, cylindres et sphères : aucune primitive nue à l'échelle d'un héros. */
export function B(parent, w, h, d, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(chamferBoxGeometry(w, h, d, { top: o.ch ?? Math.min(w, h, d) * 0.12, bottom: o.chb ?? Math.min(w, h, d) * 0.06 }), mat);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(...o.rot);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function C(parent, rt, rb, h, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 14, 1, !!o.open), mat);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(...o.rot);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function S(parent, r, mat, x, y, z, sc = [1, 1, 1], o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg ?? 14, 10), mat);
  m.position.set(x, y, z); m.scale.set(...sc);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function T(parent, r, tube, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, o.seg ?? 18, o.arc ?? Math.PI * 2), mat);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(...o.rot);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m); return m;
}
/** Barre entre deux points. */
export function bar(parent, a, b, r, mat, o = {}) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), dir = Bv.clone().sub(A), len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, o.r1 ?? r, len, o.seg ?? 6), mat);
  m.position.copy(A).add(Bv).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function G(parent, x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
export const shadow = (parent, x, z, size, op = 0.55, y = 0) => contactShadow(parent, x, y, z, size, op);

/** Tache de lumière douce posée au sol (fenêtre, bougie, braise). */
export function pool(parent, rgb, w, d, x, y, z, op = 0.3) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: softDiscTexture(rgb), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.02, z); m.renderOrder = 2; parent.add(m); return m;
}
/** Flamme de bougie : noyau, corps et halo ; flicker(t) l'anime. */
export function flame(parent, M, x, y, z, s = 1) {
  const g = G(parent, x, y, z);
  const body = S(g, 0.035 * s, M.flame, 0, 0.045 * s, 0, [1, 1.9, 1], { cast: false });
  const core = S(g, 0.018 * s, M.flameCore, 0, 0.035 * s, 0, [1, 1.6, 1], { cast: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.42 * s, 0.42 * s), new THREE.MeshBasicMaterial({ map: softDiscTexture('255,196,110'), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = 0.05 * s; halo.renderOrder = 4; g.add(halo);
  return { g, flicker(t, k = 0) { const f = 1 + 0.12 * Math.sin(t * 19 + k * 3.1) + 0.07 * Math.sin(t * 31 + k); body.scale.set(1, 1.9 * f, 1); core.scale.set(1, 1.6 * f, 1); halo.material.opacity = 0.4 * f; halo.lookAt(halo.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(1, 0.65, 1))); } };
}
/** Bougie complète : bougeoir, cire coulée, mèche, flamme. */
export function candle(parent, M, x, y, z, h = 0.22) {
  C(parent, 0.07, 0.085, 0.025, M.brass, x, y + 0.012, z, { seg: 12 });
  C(parent, 0.02, 0.02, 0.06, M.brass, x, y + 0.055, z, { seg: 8 });
  C(parent, 0.04, 0.04, 0.025, M.brass, x, y + 0.09, z, { seg: 10 });
  C(parent, 0.028, 0.03, h, M.wax, x, y + 0.1 + h / 2, z, { seg: 10 });
  S(parent, 0.012, M.wax, x + 0.024, y + 0.1 + h * 0.7, z, [1, 2.4, 1]);
  return flame(parent, M, x, y + 0.1 + h + 0.005, z);
}
/** Livre : plats, tranche de papier, nerfs, fermoir. Origine au centre du dos posé à plat. */
export function book(parent, M, cover, w = 0.34, d = 0.26, h = 0.07) {
  const g = new THREE.Group(); parent.add(g);
  B(g, w, 0.012, d, cover, 0, 0.006, 0, { ch: 0.004 });
  B(g, w - 0.02, h - 0.024, d - 0.025, M.page, 0.008, h / 2, 0, { ch: 0.003 });
  B(g, w, 0.012, d, cover, 0, h - 0.006, 0, { ch: 0.004 });
  B(g, 0.03, h, d, cover, -w / 2 + 0.012, h / 2, 0, { ch: 0.006 });
  for (const k of [-0.3, 0, 0.3]) B(g, 0.034, 0.012, 0.014, M.brass, -w / 2 + 0.012, h * 0.5, k * d, { cast: false });
  B(g, 0.05, 0.02, 0.05, M.brass, w / 2 - 0.01, h * 0.55, 0, { cast: false });
  return g;
}
/** Livre ouvert sur un pupitre : deux pages, cadres dessinés dessus (frames) apparaissant à la demande. */
export function openBook(parent, M, cover, frameMat) {
  const g = new THREE.Group(); parent.add(g);
  for (const s of [-1, 1]) {
    B(g, 0.27, 0.014, 0.36, cover, s * 0.14, 0, 0, { ch: 0.004 });
    const pg = B(g, 0.25, 0.03, 0.33, M.page, s * 0.135, 0.02, 0, { ch: 0.006 });
    pg.rotation.z = -s * 0.05;
    for (let i = 0; i < 5; i++) B(g, 0.16 - (i % 2) * 0.04, 0.004, 0.012, M.inkLine, s * 0.135, 0.037, -0.12 + i * 0.055, { cast: false, ch: 0.001 });
  }
  const frames = [];
  const fr = [[-0.14, -0.1, 0.18, 0.07], [0.12, -0.08, 0.14, 0.09], [-0.12, 0.08, 0.16, 0.06], [0.14, 0.1, 0.17, 0.07]];
  for (const [x, z, w, d] of fr) {
    const f = new THREE.Group(); g.add(f); f.position.set(x, 0.041, z);
    for (const [ax, az, ww, dd] of [[0, -d / 2, w, 0.012], [0, d / 2, w, 0.012], [-w / 2, 0, 0.012, d], [w / 2, 0, 0.012, d]]) B(f, ww, 0.005, dd, frameMat, ax, 0, az, { cast: false, ch: 0.001 });
    f.visible = false; frames.push(f);
  }
  return { g, frames };
}

/** Personnage en habit : le squelette du skill, une robe en cloche sur le bassin, une cordelière, un capuchon. */
export function monk(scene, mats, M, o) {
  const p = buildPerson(mats, { skin: o.skin, hair: o.hairMat, top: o.robe, bottom: o.robe, shoe: M.leather, sleeve: 'long', hairStyle: o.hairStyle ?? 'buzz', hoodDown: o.hood !== false, hoodMat: o.robe, topStyle: o.topStyle, hatType: o.hat, hatMat: o.hatMat, backpack: o.pack, glasses: o.glasses });
  scene.add(p.group);
  const robe = new THREE.Mesh(new THREE.LatheGeometry([[0.17, 0.08], [0.19, -0.05], [0.24, -0.35], [0.28, -0.62], [0.30, -0.78], [0.0, -0.78]].map(([r, h]) => new THREE.Vector2(r, h)), 20), o.robe);
  robe.scale.z = 0.86; robe.castShadow = true; robe.receiveShadow = true; p.joints.pelvis.add(robe);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.016, 5, 22), o.trim ?? o.robe); hem.rotation.x = Math.PI / 2; hem.scale.y = 0.86; hem.position.y = -0.76; p.joints.pelvis.add(hem);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.182, 0.014, 5, 18), o.cord ?? M.rope); cord.rotation.x = Math.PI / 2; cord.scale.y = 0.88; cord.position.y = 0.05; p.joints.pelvis.add(cord);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), o.cord ?? M.rope); tail.position.set(0.12, -0.16, 0.13); p.joints.pelvis.add(tail);
  const lap = new THREE.Group(); p.joints.pelvis.add(lap);
  B(lap, 0.44, 0.1, 0.52, o.robe, 0, -0.02, 0.2, { ch: 0.04 }); B(lap, 0.42, 0.44, 0.1, o.robe, 0, -0.26, 0.46, { ch: 0.04 });
  lap.visible = false;
  p.shadow = shadow(scene, 0, 0, 0.95, 0.5);
  p.robe = robe; p.hem = hem; p.lap = lap; p.tail = tail;
  p.setPose = (pose) => setPose(p, pose);
  return p;
}

/** Personnage civil ou garde : le squelette du skill, habillé par options (casque, tablier, sac). */
export function person(scene, mats, o) {
  const p = buildPerson(mats, { skin: o.skin, hair: o.hairMat, top: o.top, bottom: o.bottom, shoe: o.shoe, sleeve: o.sleeve ?? 'long', hairStyle: o.hairStyle ?? 'short', topStyle: o.topStyle, hatType: o.hat, hatMat: o.hatMat, apron: o.apron, backpack: o.pack, glasses: o.glasses, scarf: o.scarf, glove: o.glove });
  scene.add(p.group);
  p.shadow = shadow(scene, 0, 0, 0.9, 0.5);
  p.setPose = (pose) => setPose(p, pose);
  return p;
}

/** Place un acteur ; seated bascule la robe en drapé de genoux. */
export function put(a, x, y, z, yaw, pose, o = {}) {
  a.group.visible = o.visible !== false;
  a.group.position.set(x, y, z); a.group.rotation.set(0, yaw, 0);
  a.setPose(pose);
  const seated = !!o.seated;
  if (a.robe) { a.robe.visible = !seated; a.hem.visible = !seated; a.lap.visible = seated; a.tail.visible = !seated; }
  if (a.shadow) { a.shadow.visible = a.group.visible; a.shadow.position.set(x, (o.ground ?? 0) + 0.02, z); }
}

/** Trajet à vitesse de marche : la phase du pas suit la distance parcourue, les pieds ne glissent pas. */
export function walkAlong(pts, u) {
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let d = clamp(u, 0, 1) * L, i = 0;
  while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
  const a = pts[i], b = pts[i + 1], k = seg[i] ? d / seg[i] : 0;
  return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), dist: clamp(u, 0, 1) * L, L };
}
export const seg01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export { STAND, walkPose, mixPose, smooth, clamp, lerp };
