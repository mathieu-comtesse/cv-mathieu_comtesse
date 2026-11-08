/* Fonctions de courbe (entrées bornées à 0..1 quand c'est utile). */
import { clamp } from './clamp.js';
export const lerp = (from, to, t) => from + (to - from) * t;
export const progress = (value, start, end) => clamp((value - start) / (end - start), 0, 1);
export const smoothstep = (t) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
export const easeOutCubic = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3;
export const easeInOutCubic = (t) => { const u = clamp(t, 0, 1); return u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2; };
export { easeOutCubic as a, easeInOutCubic as c, lerp as l, progress as r, smoothstep as s };
