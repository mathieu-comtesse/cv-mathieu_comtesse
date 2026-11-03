// Machine du projet « moteur » : diffusion du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('diffusion', { label: 'Humidité intérieure', fmt: (v) => v + ' % d\'humidité relative', speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
