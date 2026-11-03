// Machine du projet « suivi » : rayonnement du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('rayonnement', { label: 'Distance plaque-récepteur', fmt: (v) => v + ' % de la course', speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
