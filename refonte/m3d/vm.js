// Machine du projet « vm » : banc de réception de la maison du livre de génie climatique (Fig 69.1, voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('reception', { label: 'Avancement du traitement', fmt: (v) => v + ' % · ' + (v < 25 ? 'demande relevée' : v < 50 ? 'code R004 et OT contrôlés' : v < 75 ? 'lien inscrit dans le classeur' : 'enregistrement vérifié'), speed: 1, lift: 0.28 });
export const WIDTH = B.width;
export const build = B.build;
