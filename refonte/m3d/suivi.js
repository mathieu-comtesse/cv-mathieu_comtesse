// Machine du projet « suivi » : rayonnement du livre de génie climatique (voir book.js).
import { makeBook } from './book.js';
const B = await makeBook('rayonnement', { label: "Rapprochement de la source", fmt: (v) => v + ' % : ' + (v < 40 ? 'recherche outil par outil' : v < 80 ? 'lien en cours' : 'accès direct à la bonne page'), speed: 1 });
export const WIDTH = B.width;
export const build = B.build;
