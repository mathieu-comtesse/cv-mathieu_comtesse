// La main de La Création d'Adam, extraite à l'identique de l'ancienne machine (vrestudio.js / musicbox-model.js) :
// même détourage (assets/figures/main-agent.webp), même plan à plat recto verso, même base (ex, ey, ez), même index tendu dont le bout est
// l'origine, même étincelle. Seule la trajectoire change : approche lente, ralentissement avant le contact, contact au point exact, retrait.
// La main est le centre narratif : trois issues (validation, correction, rejet) se distinguent par le geste, pas par un autre outil.
import * as THREE from 'three';
import { clamp, seg, ease, easeOut } from './nisaru-geometry.js';

export const AGENT = { w: 360, h: 192, tip: [0, 91], k: 0.17, tilt: 0.44 };      // valeurs de l'original

/** construit la main et son étincelle ; renvoie { group, spark, setTip(x, y, z), flash(press, kind) } en repère de figure */
export function makeHand(src = 'assets/figures/main-agent.webp') {
  const group = new THREE.Group();
  const tex = new THREE.TextureLoader().load(src); tex.colorSpace = THREE.SRGBColorSpace;
  const { w, h: hh, tip, k } = AGENT, g = new THREE.PlaneGeometry(w * k, hh * k);
  g.translate((w / 2 - tip[0]) * k, (tip[1] - hh / 2) * k, 0);
  const ex = new THREE.Vector3(.7, .7, .15).normalize(), ez = new THREE.Vector3(.45, .5, .7), ey = new THREE.Vector3();
  ez.sub(ex.clone().multiplyScalar(ez.dot(ex))).normalize(); ey.crossVectors(ez, ex);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .4, side: THREE.DoubleSide }));
  m.matrixAutoUpdate = false; m.matrix.makeBasis(ex, ey, ez); m.userData.noGlow = true; m.userData.hand = true; group.add(m);
  const sparkM = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true }), spark = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), sparkM);
  spark.userData.noGlow = true; spark.visible = false;
  return {
    group, spark,
    setAlpha(a) { m.material.opacity = a; },
    setTip(x, y, z) { group.position.set(x, z, y); spark.position.set(x, z, y); },
    flash(press, kind) {
      spark.visible = press > .35;
      if (!spark.visible) return;
      spark.scale.setScalar(.8 + 2 * press);
      sparkM.color.set(kind === 'valid' ? '#c9f5d6' : kind === 'reject' ? '#ffc7bd' : '#ffe2a6'); sparkM.opacity = .5 + .5 * press;
    }
  };
}

/** Trajectoire de la main pour un contact à l'instant tc. Le geste dépend de l'issue :
 *  valid : un appui franc et net, tenu ; fix : appui, glissement latéral sur la zone d'annotation, second appui ; reject : appui lourd puis poussée vers l'avant.
 *  Renvoie null hors de la fenêtre ; sinon { tip: [x, y, z], press, kind }. */
const AWAY = [34, 18, 36];                                   // décalage de repos (identique à l'original)
export function handPose(s, tc, kind, c) {
  const a = tc - 6.4, b = tc + 3.4;
  if (s < a || s > b) return null;
  const hold = kind === 'valid' ? 1.1 : kind === 'fix' ? 3.0 : 1.5;
  const rise = seg(s, a, tc - .05), fall = seg(s, tc + hold + .2, b);
  // approche : décélérée (cubique), presque à l'arrêt sur la dernière seconde ; retrait doux après le geste
  const off = rise >= 1 ? ease(fall) : (1 - rise) ** 3;
  // contact : enfoncement de l'index sur la page (press 0 à 1), tenu pendant le geste
  const dp = s - tc;
  let press = 0;
  if (dp > -.5 && dp < hold + .5) press = ease(seg(dp, -.5, 0)) * (1 - ease(seg(dp, hold, hold + .5)));
  let dx = 0, dy = 0;
  if (kind === 'fix') {
    // glissement : l'index suit la zone d'annotation de gauche à droite pendant que la tête de correction balaie
    dx = (ease(seg(dp, .9, 2.0)) - .0) * 7 * (1 - ease(seg(dp, 2.2, 2.9)));
    press = Math.max(press * (1 - .55 * seg(dp, .55, .9) * (1 - seg(dp, 2.0, 2.3))), 0);
  }
  if (kind === 'reject') dy = ease(seg(dp, .55, 1.4)) * 7 * (1 - ease(seg(dp, 1.5, 2.2)));
  const [px, py, pz] = [c[0] + 1.5 + .6 * Math.sin(s * 2.3) * (1 - press) * (rise < 1 ? 1 : 0) + dx, c[1] + 1 + dy, c[2] + .35 + 7 * (1 - press)];
  const alpha = ease(seg(s, a, a + 1.1)) * (1 - ease(seg(s, b - 1.1, b)));
  return { tip: [px + AWAY[0] * off, py + AWAY[1] * off, pz + AWAY[2] * off], press, kind, alpha };
}
