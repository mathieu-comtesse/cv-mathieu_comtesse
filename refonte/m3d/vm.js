// Machine du projet « vm » : circulateur du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('circulateur', { label: 'Pression du circuit', fmt: (v) => v + ' % de la pression de service', recolor: false });
export const WIDTH = B.width;
export const build = B.build;
