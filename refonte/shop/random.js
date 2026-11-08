/* Générateur pseudo-aléatoire déterministe (Mulberry32) : même graine, même suite, de 0 inclus à 1 exclu. */
export function seededRandom(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 1831565813) | 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export { seededRandom as s };
