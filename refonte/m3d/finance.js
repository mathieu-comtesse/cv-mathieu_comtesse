// Machine du projet « finance » : chaudière à vapeur et machine à piston, ébullition et panache de vapeur (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('chaudiere_vapeur', { label: 'Pression de la chaudière', fmt: (v) => v + ' % du seuil de sécurité', speed: 0.6 });
export const WIDTH = B.width;
export const build = B.build;
