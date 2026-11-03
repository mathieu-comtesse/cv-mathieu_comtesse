// Machine du projet « finance » : vanne_pid du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('vanne_pid', { label: 'Ouverture de la vanne', fmt: (v) => v + ' % d\'ouverture', recolor: false });
export const WIDTH = B.width;
export const build = B.build;
