// Machine du projet « finance » : autoclave du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('autoclave', { label: "Dépenses engagées du périmètre", fmt: (v) => v + ' % du budget · ' + (v >= 80 ? 'seuil dépassé, alerte envoyée' : 'sous le seuil'), speed: 0.4 });
export const WIDTH = B.width;
export const build = B.build;
