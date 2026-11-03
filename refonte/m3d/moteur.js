// Machine du projet « moteur » : diffusion du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('diffusion', { label: "Avancement du rapport", fmt: (v) => v + ' % · ' + (v < 25 ? 'pris dans SharePoint' : v < 55 ? 'traverse le classeur' : v < 80 ? 'posé sur la bonne ligne' : 'visible dans Power BI'), speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
