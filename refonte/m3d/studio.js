// Machine du projet « studio » : tube du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('tube', { label: 'Vitesse de l\'air', fmt: (v) => v + ' % de la vitesse maximale', speed: 0.7 });
export const WIDTH = B.width;
export const build = B.build;
