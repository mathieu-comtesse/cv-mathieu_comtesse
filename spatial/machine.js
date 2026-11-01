// MachineController : une machine d'origine (refonte/m3d/*) posée dans le monde. Quatre transformations restent séparées :
//   1. le déplacement de la caméra (hors de ce fichier),
//   2. la rotation globale de la machine (règles « Tourner » et « Incliner »), portée par les groupes `frame`, `tilt`, `spin`,
//   3. les animations internes (m.update, qui ne voient jamais la rotation globale),
//   4. les effets visuels (lueur locale, apparition).
import * as THREE from 'three';
import { ACCENT } from '../refonte/m3d/glow.js';
import { trackGlowLocal } from './glow-local.js';

const DEG = Math.PI / 180;
export const ROT = { LIM: 250, YAW_PER_PX: .36, TILT_UP: 45, TILT_DOWN: 25 };   // mêmes limites que les règles d'origine (±250 graduations)
const MODULES = {
  moteur: () => import('../refonte/m3d/moteur.js'), cerfa: () => import('../refonte/m3d/cerfa.js'), vm: () => import('../refonte/m3d/vm.js'),
  vre: () => import('../refonte/m3d/vre.js'), gares: () => import('../refonte/m3d/gares.js'), finance: () => import('../refonte/m3d/finance.js'),
  pp: () => import('../refonte/m3d/pp.js'), powerbi: () => import('../refonte/m3d/powerbi.js'), suivi: () => import('../refonte/m3d/suivi.js'),
  studio: () => import('../refonte/m3d/studio.js'), 'vrestudio-musicbox': () => import('../refonte/m3d/vrestudio.js')
};

export class MachineController {
  constructor(entry) {
    this.entry = entry; this.id = entry.id;
    this.ready = false; this.loading = null;
    this.rot = 0; this.tilt = 0;            // positions des règles, en graduations
    this.root = new THREE.Group();          // position dans le monde
    this.frame = new THREE.Group();         // repère de la caméra du cadrage (axe de l'inclinaison = droite de l'écran)
    this.tiltG = new THREE.Group();
    this.spin = new THREE.Group();
    this.root.add(this.frame); this.frame.add(this.tiltG); this.tiltG.add(this.spin);
    this.frame.rotation.y = (entry.cam?.az || 0) * DEG;
    this.root.position.set(...entry.pos);
    this.root.visible = false;
    this.clock = 0; this.shift = 0; this.lastUpdate = 0; this.appear = 0; this.glowStep = null;
    this.box = new THREE.Box3(); this.center = new THREE.Vector3(); this.size = new THREE.Vector3();
    this.controls = null;
  }
  /** Charge le module et construit le modèle (une seule fois). */
  load() {
    if (this.loading) return this.loading;
    this.loading = MODULES[this.entry.machine]().then(({ build, WIDTH = 236 }) => {
      const m = build();
      this.model = m; this.controls = m.controls || null;
      const g = new THREE.Group(); g.add(m.group); g.scale.setScalar(12.6 / WIDTH * (this.entry.scale || 1));
      const holder = new THREE.Group(); holder.add(g); this.spin.add(holder);
      g.updateMatrixWorld(true);
      this.box.setFromObject(g); this.box.getCenter(this.center); this.box.getSize(this.size);
      g.position.set(-this.center.x, -this.center.y, -this.center.z);       // pivot au centre du volume : la machine s'incline sur elle-même
      this.body = g; this.ready = true;
      this.glowStep = trackGlowLocal(g, ACCENT[this.entry.machine]);
      this.applyOrientation();
      return this;
    });
    return this.loading;
  }
  /** Rayon englobant en unités du monde (sert aux niveaux de détail et à la sélection). */
  get radius() { return this.ready ? this.size.length() / 2 : 8 * (this.entry.scale || 1); }
  /** Orientation : rotation initiale propre au cadrage, plus les règles de l'utilisateur. Le socle reste au-dessus du plan. */
  setRulers(rot, tilt) { this.rot = rot; this.tilt = tilt; this.applyOrientation(); }
  applyOrientation() {
    if (!this.ready) return;
    const az = (this.entry.cam?.az || 0) * DEG;
    const tiltDeg = this.tilt >= 0 ? this.tilt / ROT.LIM * ROT.TILT_UP : this.tilt / ROT.LIM * ROT.TILT_DOWN;
    this.tiltG.rotation.x = tiltDeg * DEG;                                 // règle verticale : le dessus de la machine se penche vers l'observateur
    this.spin.rotation.y = -az + ((this.entry.yaw || 0) - this.rot * ROT.YAW_PER_PX) * DEG;
    // levée : le point le plus bas du volume tourné reste à la hauteur d'origine du socle
    this.root.updateMatrixWorld(true);
    const hx = this.size.x / 2, hy = this.size.y / 2, hz = this.size.z / 2, v = new THREE.Vector3(), q2 = new THREE.Quaternion();
    this.spin.getWorldQuaternion(q2);                                    // orientation totale : cadrage, inclinaison et rotation
    let minY = Infinity;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { v.set(sx * hx, sy * hy, sz * hz).applyQuaternion(q2); minY = Math.min(minY, v.y); }
    this.lift = -minY;
    this.frame.position.y = this.lift;                                     // le socle reste au niveau d'origine, la machine pivote sur elle-même
  }
  /** Position du centre de la machine dans le monde. */
  worldCenter(out = new THREE.Vector3()) { return out.set(this.entry.pos[0], this.entry.pos[1] + (this.size.y || 6) / 2, this.entry.pos[2]); }
  /** Anime le mécanisme. `time` en secondes (horloge propre de la machine, décalée par son réglage). */
  update(time) { if (this.ready) this.model.update(this.clockOf(time)); }
  clockOf(t) { return t + this.shift; }
  /** Réglage propre de la machine (seuil, lot, jour…) : mêmes principes que refonte/post.js. */
  setControl(v, nowSeconds) {
    const ctl = this.controls; if (!ctl) return;
    v = Math.min(ctl.max, Math.max(ctl.min, Math.round(v / ctl.step) * ctl.step));
    const r = ctl.set ? ctl.set(v) : undefined;
    const to = ctl.seek ? ctl.seek(v) : (typeof r === 'number' ? r : null);
    if (to !== null && to !== undefined) this.shift += to - this.clockOf(nowSeconds);
  }
  controlValue(nowSeconds) { return this.controls ? this.controls.get(this.clockOf(nowSeconds)) : 0; }
  /** Sélection : retourne le premier objet touché par le rayon, ou null. */
  pick(ray) {
    if (!this.ready || !this.root.visible) return false;
    const hit = (o) => { if (!o.visible || o.userData.glowShell) return false; if (o.isMesh && ray.intersectObject(o, false).length) return true; return o.children.some(hit); };
    return hit(this.body);
  }
  dispose() { this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
}
