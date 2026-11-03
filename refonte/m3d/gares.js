// Machine du projet « gares » : echangeur du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('echangeur', { label: "Pondération conformité / maintenance", fmt: (v) => v + ' % conformité · ' + (100 - v) + ' % maintenance', speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
