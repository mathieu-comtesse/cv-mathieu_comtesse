// Machine du projet « suivi » : echangeur du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('echangeur', { label: 'Charge thermique', fmt: (v) => v + ' % de la puissance échangée', recolor: true });
export const WIDTH = B.width;
export const build = B.build;
