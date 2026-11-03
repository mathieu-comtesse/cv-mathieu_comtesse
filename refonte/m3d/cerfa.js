// Machine du projet « cerfa » : pot_boue du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('pot_boue', { label: 'Extraction des boues', fmt: (v) => v + ' % de purge', recolor: false });
export const WIDTH = B.width;
export const build = B.build;
