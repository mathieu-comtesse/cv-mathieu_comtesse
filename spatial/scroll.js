// SpatialScrollController : transforme molette, glissement tactile et clavier en une cible de progression, puis suit cette cible par
// un amortissement exponentiel indépendant de la fréquence d'images. L'inertie est bornée : une impulsion ne peut pas faire dépasser
// plusieurs projets d'un coup.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Delta de molette en pixels, quelle que soit l'unité (pixels, lignes, pages). */
export function normalizeWheel(e) {
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
  return e.deltaY * unit;
}

export class SpatialScrollController {
  /** gaps : nombre d'intervalles entre points d'intérêt. pxPerGap : pixels de molette pour passer d'un point au suivant. */
  constructor({ gaps, pxPerGap = 900, onChange = () => {}, reduced = false }) {
    this.gaps = gaps; this.pxPerGap = pxPerGap; this.onChange = onChange; this.reduced = reduced;
    this.target = 0; this.current = 0; this.tween = null; this.locked = false;
    this.maxSpeed = 1 / gaps / .42;          // au plus un point d'intérêt toutes les 0,42 s
    this.rate = 7;                            // raideur du suivi (1/s)
  }
  /** Ajoute un déplacement en pixels (molette ou glissement). Limité par événement pour borner l'inertie des pavés tactiles. */
  addPixels(px) {
    if (this.locked) return;
    this.tween = null;
    const step = clamp(px, -160, 160) / (this.pxPerGap * this.gaps);
    this.target = clamp(this.target + step, 0, 1);
  }
  /** Rejoint la progression p : transition courte et maîtrisée (instantanée si les animations sont réduites). */
  goTo(p, ms = 900) {
    p = clamp(p, 0, 1);
    if (this.reduced || ms <= 0) { this.target = this.current = p; this.tween = null; this.onChange(p); return; }
    this.tween = { from: this.current, to: p, t0: performance.now(), ms: Math.max(300, Math.min(1400, ms * (.5 + Math.abs(p - this.current) * this.gaps / 4))) };
    this.target = p;
  }
  /** Fige la cible à la position actuelle (ouverture d'un panneau). */
  hold() { this.tween = null; this.target = this.current; }
  setLocked(v) { this.locked = v; if (v) this.hold(); }
  update(dt, now = performance.now()) {
    const before = this.current;
    if (this.tween) {
      const u = clamp((now - this.tween.t0) / this.tween.ms, 0, 1), e = u * u * (3 - 2 * u);
      this.current = this.tween.from + (this.tween.to - this.tween.from) * e;
      if (u >= 1) { this.current = this.tween.to; this.tween = null; }
    } else {
      const k = 1 - Math.exp(-this.rate * dt), want = (this.target - this.current) * k, cap = this.maxSpeed * dt;
      this.current += clamp(want, -cap, cap);
      if (Math.abs(this.target - this.current) < 1e-5) this.current = this.target;
    }
    if (this.current !== before) this.onChange(this.current);
    return this.current;
  }
  get moving() { return !!this.tween || Math.abs(this.target - this.current) > 1e-5; }
}
