// Machine du projet « cerfa » : son du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('son', { label: "Fiches lues du lot", fmt: (v) => Math.round(3 * v) + ' fiches sur 300 lues', speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
