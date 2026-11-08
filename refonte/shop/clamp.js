/* Borne une valeur entre un minimum et un maximum. */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export { clamp as c };
