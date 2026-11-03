// Machine du projet « pp » : halle de piscine en coupe du livre de génie climatique (Fig 52.1, voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('piscine', { label: 'Plans de prévention à surveiller', fmt: (v) => Math.round(4.5 * v) + ' plans · marge avant échéance ' + Math.max(1, Math.round(60 - 0.5 * v)) + ' jours', speed: 0.8 });
export const WIDTH = B.width;
export const build = B.build;
