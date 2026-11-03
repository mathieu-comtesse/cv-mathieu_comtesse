// Machine du projet « cerfa » : son du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('son', { label: 'Distance à la source', fmt: (v) => v + ' % de la course', speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
