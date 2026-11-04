// Machine du projet « moteur » : volume 3D reconstruit depuis la figure animée du livre (voir livre3d.js).
import { makeLivre } from './livre3d.js';
const B = await makeLivre('16');
export const WIDTH = B.width;
export const build = B.build;
