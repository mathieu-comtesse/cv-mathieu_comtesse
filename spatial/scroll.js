// SpatialScrollController V2 : la progression est une distance de défilement `u` en pixels (la caméra est une fonction de u, voir camera-path.js).
// Réactivité immédiate : la cible suit chaque impulsion et la position la rejoint par un amortissement exponentiel rapide, indépendant de la
// fréquence d'images. Inertie naturelle (la fin de course s'adoucit), vitesse bornée (aucune téléportation), retour arrière exact.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Delta de molette en pixels, quelle que soit l'unité (pixels, lignes, pages). */
export function normalizeWheel(e) {
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
  return e.deltaY * unit;
}

export class SpatialScrollController {
  constructor({ length, onChange = () => {}, reduced = false, rate = 11, maxSpeed = 5200 }) {
    this.length = length; this.onChange = onChange; this.reduced = reduced; this.rate = rate; this.maxSpeed = maxSpeed;
    this.target = 0; this.current = 0; this.tween = null; this.locked = false; this.speed = 0;
  }
  /** Progression normalisée [0, 1]. */
  get norm() { return this.current / this.length; }
  /** Ajoute un déplacement en pixels (molette ou glissement). Borné par événement pour les pavés tactiles à forte inertie. */
  addPixels(px) {
    if (this.locked) return;
    this.tween = null;
    this.target = clamp(this.target + clamp(px, -320, 320), 0, this.length);
  }
  /** Rejoint la position u par un vol continu (instantané si les animations sont réduites). La durée croît avec la distance. */
  goTo(u, ms) {
    u = clamp(u, 0, this.length);
    const dist = Math.abs(u - this.current);
    if (this.reduced || ms === 0 || dist < 1) { this.target = this.current = u; this.tween = null; this.onChange(u); return; }
    this.tween = { from: this.current, to: u, t0: performance.now(), ms: ms ?? clamp(700 + dist * .2, 900, 3800) };
    this.target = u;
  }
  hold() { this.tween = null; this.target = this.current; }
  setLocked(v) { this.locked = v; if (v) this.hold(); }
  update(dt, now = performance.now()) {
    const before = this.current;
    if (this.tween) {
      const t = clamp((now - this.tween.t0) / this.tween.ms, 0, 1);
      this.current = this.tween.from + (this.tween.to - this.tween.from) * smoother(t);
      if (t >= 1) { this.current = this.tween.to; this.tween = null; }
    } else {
      const want = (this.target - this.current) * (1 - Math.exp(-this.rate * dt)), cap = this.maxSpeed * dt;
      this.current += clamp(want, -cap, cap);
      if (Math.abs(this.target - this.current) < .05) this.current = this.target;
    }
    this.speed = dt > 0 ? (this.current - before) / dt : 0;
    if (this.current !== before) this.onChange(this.current);
    return this.current;
  }
  get moving() { return !!this.tween || Math.abs(this.target - this.current) > .05; }
}
