// Machine du projet « studio » : tube du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('tube', { label: "Documents passés dans l\\'essai", fmt: (v) => Math.round(v / 10) + ' PDF exemples essayés', speed: 0.7 });
export const WIDTH = B.width;
export const build = B.build;
