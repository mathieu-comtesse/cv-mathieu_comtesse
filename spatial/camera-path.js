// CameraPathController : trajectoire de caméra déterministe. À une progression p ∈ [0, 1] correspond une position et un point de regard connus.
// Deux courbes de Catmull-Rom centripètes (position et regard) passent exactement par les cadrages de chaque point d'intérêt.
import * as THREE from 'three';

const DEG = Math.PI / 180;

/** Cadrage d'un point d'intérêt : position de la caméra et point regardé, calculés à partir de l'objet et du cadrage `cam`. */
export function frameOf(stop) {
  const c = stop.cam;
  if (c.pos) return { pos: new THREE.Vector3(...c.pos), look: new THREE.Vector3(...c.look) };
  const [x, y, z] = stop.pos, az = c.az * DEG;
  const dist = c.dist * (.9 + .2 * (stop.scale || 1)) * 1.12;           // l'objet occupe environ la moitié de la largeur, quelle que soit son échelle
  const pos = new THREE.Vector3(x + Math.sin(az) * dist, y + c.h * 1.1, z + Math.cos(az) * dist);
  const look = new THREE.Vector3(x, y + 3.2, z);
  const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));       // vers la droite de l'écran
  look.addScaledVector(right, c.shift || 0);                               // regard décalé : l'objet sort du centre
  return { pos, look };
}

export class CameraPathController {
  constructor(stops) {
    this.stops = stops;
    const frames = stops.map(frameOf);
    this.posCurve = new THREE.CatmullRomCurve3(frames.map((f) => f.pos), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(frames.map((f) => f.look), false, 'centripetal');
    // paramètre de la courbe (longueur d'arc approchée) de chaque point d'intérêt : p = i / (n - 1) correspond au i-ème cadrage
    this.n = stops.length;
    this._p = new THREE.Vector3(); this._l = new THREE.Vector3();
  }
  /** t de la courbe pour une progression p : interpolation par point d'intérêt, donc les cadrages sont atteints exactement. */
  _t(p) { return Math.min(1, Math.max(0, p)); }
  at(p, outPos = this._p, outLook = this._l) {
    const t = this._t(p);
    this.posCurve.getPoint(t, outPos); this.lookCurve.getPoint(t, outLook);
    return { pos: outPos, look: outLook };
  }
  /** Progression du point d'intérêt i : la courbe de Catmull-Rom est paramétrée par point de contrôle (getPoint uniforme en index). */
  progressOf(i) { return i / (this.n - 1); }
  /** Index du point d'intérêt le plus proche d'une progression et distance (en progression) à celui-ci. */
  nearest(p) { const f = p * (this.n - 1), i = Math.round(f); return { index: Math.min(this.n - 1, Math.max(0, i)), delta: f - i }; }
}
