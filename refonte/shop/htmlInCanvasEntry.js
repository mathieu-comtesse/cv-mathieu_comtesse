/* Aides de textes du jeu et du titre : formatage des libellés, nombres et chronomètre, et union de rectangles englobants.
   (Le composant « New Dimension » du module d'origine n'est utilisé par aucune page du site : il n'est pas repris.) */
export const EXPO_MODE = 'expo-mode';
const DEFAULT_COPY = {
  active: 'New Dimension on', failed: 'New Dimension unavailable', ready: 'New Dimension off', cornerLabel: 'New Dimension', cornerBack: 'Back',
  start: 'start', closeGame: 'Close the game', muteGame: 'Mute the game', finished: 'Finished', fell: 'Fell in a hole', again: 'again', close: 'close',
  gradeLabel: 'grade', finish: 'finish', distance: 'distance', size: 'size', points: 'points', pixels: 'px',
  sum: '{nodes} nodes + {words} words', sumJumps: '{nodes} nodes + {words} words + {jumps} for jumps', breakdown: 'breakdown', clock: '{minutes}:{seconds}',
  steerKeys: '← →   A D', steer: 'steer', fasterKeys: '↑   W   scroll up', faster: 'faster', brakeKeys: '↓   S   scroll down', brake: 'brake',
  minSpeed: 'v ≥ {speed} px/s', hopKey: 'space', hop: 'hop', toFinish: '↑ {distance} px to the finish', toFinishShort: '↑ {distance} px', toFinishLabel: 'to the finish', speedLabel: 'speed',
  pageWidth: 'page   W = {width} px', hole: 'hole   r = {radius} px', holeBox: 'hole   {width} × {depth} px', gameOver: 'fall in: game over',
  boost: 'boost   jump', boostLine: 'v → {speed} px/s   z ↑ {height} px', finale: 'finale   jump', finaleLine: 'z ↑ {height} px', push: 'push   {dir}', pushLine: 'a = {accel} px/s²'
};
/** Remplace {nom} par la valeur correspondante ; laisse le texte tel quel si la valeur manque. */
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (whole, key) => (Object.hasOwn(values, key) ? String(values[key]) : whole));
/** Fabrique de libellés : copy (textes), number (entier groupé), format (gabarit), clock (minutes:secondes.dixièmes). */
export function createCopy(options) {
  const copy = { ...DEFAULT_COPY, ...options?.strings }, locale = options?.locale ?? 'en';
  const grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const plain = new Intl.NumberFormat(locale, { useGrouping: false });
  const seconds = new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: 2, minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return {
    copy,
    number: (value) => grouped.format(Math.round(value)),
    format: (key, values) => fill(copy[key], values),
    clock: (value) => { const tenths = Math.round(value * 10); return fill(copy.clock, { minutes: plain.format(Math.floor(tenths / 600)), seconds: seconds.format((tenths % 600) / 10) }); }
  };
}
/** Rectangle englobant de plusieurs rectangles ({minX, minY, maxX, maxY}) ; rectangle nul si la liste est vide. */
export function unionBounds(boxes) {
  if (!boxes.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return boxes.reduce((acc, b) => ({ minX: Math.min(acc.minX, b.minX), minY: Math.min(acc.minY, b.minY), maxX: Math.max(acc.maxX, b.maxX), maxY: Math.max(acc.maxY, b.maxY) }), { ...boxes[0] });
}
export { EXPO_MODE as E, createCopy as g, unionBounds as u };
