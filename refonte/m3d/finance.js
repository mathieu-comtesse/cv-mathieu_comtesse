// Machine du projet « finance » : autoclave de laboratoire du livre de génie climatique (Fig 4.1, vapeur d'eau et changements d'état).
// Réglage : température de consigne ; la pression lue est la pression de saturation (formule d'Antoine simplifiée).
import { makeBook } from './book.js';
const B = await makeBook('autoclave', { label: 'Température de consigne', fmt: (v) => { const T = 100 + 0.34 * v; return Math.round(T) + ' °C · ' + Math.exp(13.7 - 5120 / (T + 273.15)).toFixed(2).replace('.', ',') + ' bar'; }, speed: 0.4 });
export const WIDTH = B.width;
export const build = B.build;
