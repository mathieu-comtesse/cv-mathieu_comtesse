// Machine du projet « moteur » : cta du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('cta', { label: 'Débit d\'air', fmt: (v) => v + ' % du débit nominal', recolor: true });
export const WIDTH = B.width;
export const build = B.build;
