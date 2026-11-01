// PerformanceManager : profils de rendu selon le matériel, ajustés par des mesures réelles de durée d'image.
// Aucune valeur n'est inventée : les statistiques exposées sont celles mesurées dans la session.
const PROFILES = [
  { name: 'élevé', pixelRatio: 2, shadows: 2048, nearMachines: 5, farRate: 10 },
  { name: 'moyen', pixelRatio: 1.5, shadows: 1024, nearMachines: 4, farRate: 8 },
  { name: 'léger', pixelRatio: 1, shadows: 512, nearMachines: 3, farRate: 6 },
  { name: 'minimal', pixelRatio: .7, shadows: 0, nearMachines: 2, farRate: 4 }
];

export function detectGpu(gl) {
  try { const x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; } catch { return ''; }
}

export class PerformanceManager {
  constructor({ gpu = '', onProfile = () => {} } = {}) {
    const small = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;
    const software = /swiftshader|llvmpipe|software/i.test(gpu);
    const weak = (navigator.hardwareConcurrency || 4) <= 4;
    this.level = software ? 3 : small ? 1 : weak ? 1 : 0;
    this.floor = software ? 3 : 0;
    this.onProfile = onProfile; this.ema = 16.7; this.slowFor = 0; this.fastFor = 0; this.frames = 0; this.t0 = performance.now();
    this.worst = 0; this.gpu = gpu; this.dprCap = devicePixelRatio || 1;
  }
  get profile() { return PROFILES[this.level]; }
  get pixelRatio() { return Math.min(this.dprCap, this.profile.pixelRatio); }
  /** À appeler à chaque image rendue, avec la durée de l'image en millisecondes. */
  frame(dt) {
    if (dt > 250) return;                                   // onglet resté en arrière-plan : mesure ignorée
    this.frames++; this.ema += (dt - this.ema) * .08; this.worst = Math.max(this.worst, dt);
    if (this.ema > 38) { this.slowFor += dt; this.fastFor = 0; } else if (this.ema < 19) { this.fastFor += dt; this.slowFor = 0; } else { this.slowFor = this.fastFor = 0; }
    if (this.slowFor > 1500 && this.level < PROFILES.length - 1) this._set(this.level + 1);
    else if (this.fastFor > 8000 && this.level > this.floor) this._set(this.level - 1);
  }
  _set(l) { this.level = l; this.slowFor = this.fastFor = 0; this.onProfile(this.profile, l); }
  get stats() { const s = (performance.now() - this.t0) / 1000; return { fps: this.ema ? Math.round(1000 / this.ema) : 0, frameMs: +this.ema.toFixed(1), worstMs: Math.round(this.worst), profile: this.profile.name, gpu: this.gpu, seconds: Math.round(s) }; }
}
