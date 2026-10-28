// Petites fonctions partagées par les gabarits du skill diorama.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
// Hauteur du sol : la scène la remplace par setGround(fn) si elle a des marches.
let groundFn = () => 0;
export const setGround = (fn) => { groundFn = fn; };
export const groundY = (x, z) => groundFn(x, z);
