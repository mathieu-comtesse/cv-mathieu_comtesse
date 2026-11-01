// CameraTimeline : caméra de film pilotée par le défilement. La position, le point de regard, le champ de vision et le roulis sont des
// fonctions de la distance de défilement `u` (en pixels de molette). Interpolation de Hermite à tangentes de Catmull-Rom non uniformes :
// position, orientation et vitesse sont continues. L'écart entre deux clés (en pixels) fixe la vitesse : un grand espace parcouru en peu de
// défilement donne un survol rapide, un petit espace sur une longue course donne une approche lente.
import * as THREE from 'three';

const DEG = Math.PI / 180;

export class CameraTimeline {
  /** keys : { u, pos:[x,y,z], look:[x,y,z], fov, roll, tag? } triées par u croissant. */
  constructor(keys) {
    this.keys = keys; this.n = keys.length;
    for (let i = 1; i < this.n; i++) if (!(keys[i].u > keys[i - 1].u)) throw new Error('clés non croissantes : ' + keys[i].tag);
    this.length = keys[this.n - 1].u;
    this.tags = Object.fromEntries(keys.filter((k) => k.tag).map((k) => [k.tag, k.u]));
    // tangentes : différences finies sur grille non uniforme (extrémités : différence à sens unique)
    const tan = (get) => keys.map((_, i) => { const a = Math.max(0, i - 1), b = Math.min(this.n - 1, i + 1); return get(b) .map((v, c) => (v - get(a)[c]) / (keys[b].u - keys[a].u)); });
    this.P = keys.map((k) => k.pos); this.L = keys.map((k) => k.look); this.S = keys.map((k) => [k.fov, k.roll || 0]);
    this.mP = tan((i) => this.P[i]); this.mL = tan((i) => this.L[i]); this.mS = tan((i) => this.S[i]);
    this._i = 0; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
  }
  _seg(u) {
    let i = this._i; u = Math.min(this.length, Math.max(0, u));
    if (u < this.keys[i].u || u >= this.keys[Math.min(i + 1, this.n - 1)].u) { i = 0; while (i < this.n - 2 && u >= this.keys[i + 1].u) i++; this._i = i; }
    return i;
  }
  _h(v, m, i, t, out) {
    const d = this.keys[i + 1].u - this.keys[i].u, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    for (let c = 0; c < out.length; c++) out[c] = h00 * v[i][c] + h10 * d * m[i][c] + h01 * v[i + 1][c] + h11 * d * m[i + 1][c];
    return out;
  }
  /** Pose de la caméra à la distance de défilement u. */
  at(u, out = {}) {
    u = Math.min(this.length, Math.max(0, u));
    const i = this._seg(u), t = (u - this.keys[i].u) / (this.keys[i + 1].u - this.keys[i].u);
    const p = this._h(this.P, this.mP, i, t, [0, 0, 0]), l = this._h(this.L, this.mL, i, t, [0, 0, 0]), s = this._h(this.S, this.mS, i, t, [0, 0]);
    out.pos = (out.pos || this.pos).set(p[0], p[1], p[2]); out.look = (out.look || this.look).set(l[0], l[1], l[2]);
    out.fov = Math.min(70, Math.max(6, s[0]));                 // la pièce d'accueil a un champ étroit (environ 12 degrés) : pas de plancher de 24 out.roll = s[1] * DEG;
    return out;
  }
  /** Met à jour une clé en direct (la clé 0 suit la caméra réelle de la pièce) et recalcule les tangentes voisines. */
  updateKey(i, pos, look, fov) {
    const k = this.keys[i]; k.pos = pos; k.look = look; k.fov = fov; this.P[i] = pos; this.L[i] = look; this.S[i] = [fov, k.roll || 0];
    for (let j = Math.max(0, i - 1); j <= Math.min(this.n - 1, i + 1); j++) {
      const a = Math.max(0, j - 1), b = Math.min(this.n - 1, j + 1), d = this.keys[b].u - this.keys[a].u;
      this.mP[j] = this.P[b].map((v, c) => (v - this.P[a][c]) / d); this.mL[j] = this.L[b].map((v, c) => (v - this.L[a][c]) / d); this.mS[j] = this.S[b].map((v, c) => (v - this.S[a][c]) / d);
    }
  }
  uOf(tag) { if (!(tag in this.tags)) throw new Error('étiquette inconnue : ' + tag); return this.tags[tag]; }
  /** Vitesse apparente (unités du monde par pixel de défilement), estimée par différence finie. */
  speed(u) { const a = this.at(u - 2, {}).pos.clone(), b = this.at(u + 2, {}).pos; return a.distanceTo(b) / 4; }
  /** Étiquette de projet la plus proche d'une position de défilement. */
  nearestTag(u, tags) { let best = null, bd = Infinity; for (const t of tags) { const d = Math.abs(this.tags[t] - u); if (d < bd) { bd = d; best = t; } } return { tag: best, delta: bd }; }
}

/** Pose d'inspection d'un projet : cadrage resserré autour de l'objet, décalé pour libérer la place des textes. */
export function inspectPose(stop, out = {}) {
  const c = stop.cam, az = c.az * DEG, [x, y, z] = stop.pos, dist = c.dist * (.9 + .2 * (stop.scale || 1)) * .72;
  const pos = new THREE.Vector3(x + Math.sin(az) * dist, y + c.h, z + Math.cos(az) * dist);
  const look = new THREE.Vector3(x, y + 3.2 * (stop.scale || 1), z), right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
  look.addScaledVector(right, c.shift || 0);
  out.pos = pos; out.look = look; out.fov = 34; out.roll = 0; return out;
}
