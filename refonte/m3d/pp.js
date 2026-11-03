// Machine du projet « pp » : air du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('air', { label: 'Débit de renouvellement', fmt: (v) => v + ' % du débit nominal', speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
