/* Exploration autonome : quand personne ne joue, Mathieu fait seul le tour de l'archipel (pièce, jardin, pont, belvédère, atelier, ascenseur, platine).
 * Il suit une liste de points de passage, saute quand le sol manque ou que le point est plus haut, attend l'ascenseur, et pense à ce qu'il va faire. */
import { dedans } from './monde.js';

export function creerAuto(monde, heros, pensee) {
  const ECH = 1.35, piece = (x, z, plus = {}) => ({ x: x * ECH + 0.47, y: 0, z: z * ECH - 0.34, ...plus });
  const ile = (o, x, z, plus = {}) => ({ x: o[0] + x, y: o[1], z: o[2] + z, ...plus });
  const JARDIN = [-40, 3.5, -24], BELV = [0, 13, -76], ATELIER = [42, 7, -50], PLATINE = [44, 2.5, 0];
  const g = monde.gues, asc = monde.ascenseur;
  const R = [
    piece(-1.6, 0.45, { pense: ['desk', 'Travailler au bureau'], attente: 2.5 }),
    piece(-0.8, -1.7, { pense: ['usm', 'Écouter un vinyle'], attente: 2.5 }),
    piece(1.3, -2.25, { pense: ['bike', 'Regonfler les pneus du vélo'], attente: 2 }),
    piece(2.35, -1.75, { pense: ['dracaena', 'Arroser le dragonnier'], attente: 2 }),
    piece(1.25, -0.6, { pense: ['ekstrem', 'Lire dans le fauteuil'], attente: 2 }),
    piece(1.35, 2.2, { pense: ['tv', 'Jouer à la console'], attente: 2.5 }),
    piece(1.85, 3.85, { pense: ['bonsai', 'Arroser le bonsaï'], attente: 2 }),
    piece(-2.5, 2.5, { pense: ['alocasia', 'Arroser l’alocasia'], attente: 2 }),
    piece(-2.9, 4.2, { pense: ['buddha', 'Respirer un instant'], attente: 2.5 }),
    { x: -8.6, y: 0, z: 2.2 }, { x: -11.2, y: 0, z: -6.6 },
    ...g.jardin,
    ile(JARDIN, 10.5, 6.2), ile(JARDIN, 3.6, 6.4, { pense: ['bonsai', 'Flâner au jardin'], attente: 2.5 }), ile(JARDIN, -1.5, -1.5), ile(JARDIN, 1.6, -6.6),
    { x: monde.pPlaque.x, y: monde.pPlaque.y + 0.14, z: monde.pPlaque.z, attente: 3.2, r: 0.5 },
    ...g.pont,
    ile(BELV, -6.2, 8.2), ile(BELV, 0, 2.4, { y: 13.4, pense: ['cristal', 'Prendre de la hauteur'], attente: 3.5 }), ile(BELV, 8.2, 5.2),
    ...[...g.feuilles].reverse(),
    ile(ATELIER, -9.6, -5.6), ile(ATELIER, -7.6, 8.8), ile(ATELIER, -0.8, 9.2), ile(ATELIER, 5.2, -2.4, { pense: ['desk', 'Suivre les indicateurs'], attente: 3 }),
    ile(ATELIER, 0.5, 11.4, { attends: () => asc.top > 6.985 }),
    { x: 42.5, y: 7, z: -35.4, sur: asc, attends: () => asc.top < 2.52 },
    ile(PLATINE, 0.4, -12.6), ile(PLATINE, 2.6, -9), ile(PLATINE, 2.6, -4.3, { y: 3.5 }),
    { x: monde.plateau.x + 1.6, y: monde.plateau.top, z: monde.plateau.z, sur: monde.plateau, pense: ['usm', 'Écouter un vinyle'], attente: 5 },
    ile(PLATINE, 0, 4.6, { y: 3.5 }), ile(PLATINE, -1.5, 8), ile(PLATINE, -12.2, 0.4),
    ...[...g.platine].reverse(),
    { x: 13.2, y: 0, z: 0 }, { x: 8.5, y: 0, z: 3.6 },
  ];
  let actif = false, i = 0, tAttente = 0, tBloque = 0, nBloque = 0, repere = { x: 0, z: 0 }, double = false;
  const annonce = () => { for (let k = 0; k < 4; k++) { const w = R[(i + k) % R.length]; if (w.pense) { pensee.montre(w.pense[0], w.pense[1], 9); return; } if (w.sur || w.attends) return; } };
  const solA = (x, z, y) => { for (const c of monde.cols) if (c.actif && c.top <= y + 0.5 && c.top >= y - 0.7 && dedans(c, x, z)) return true; return false; };
  const e = {
    get actif() { return actif; },
    demarre() {
      if (actif) return; actif = true; tAttente = 0; tBloque = 0; nBloque = 0;
      let best = 1e9; R.forEach((w, k) => { const d = Math.hypot(w.x - heros.pos.x, w.z - heros.pos.z) + Math.abs(w.y - heros.pos.y) * 3; if (d < best) { best = d; i = k; } });
      annonce();
    },
    arrete() { if (actif) { actif = false; pensee.cache(); } },
    maj(dt, entree, capCam) {
      const p = heros.pos, w = R[i], dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
      entree.x = 0; entree.y = 0; entree.saut = false; entree.sautPresse = false; entree.sprint = false;
      const arrive = w.sur ? heros.sol === w.sur : (heros.auSol && d < (w.r || 0.6) && Math.abs(p.y - w.y) < 0.9);
      if (arrive) {
        tAttente += dt; tBloque = 0; nBloque = 0;
        if (tAttente >= (w.attente || 0) && (!w.attends || w.attends())) { i = (i + 1) % R.length; tAttente = 0; if (w.pense) pensee.cache(); annonce(); }
        return;
      }
      if (w.attends && !w.sur) { /* on avance vers le point d'attente normalement */ }
      const ux = dx / (d || 1), uz = dz / (d || 1), fx = -Math.sin(capCam), fz = -Math.cos(capCam), m = heros.auSol ? (d < 1.1 ? 0.55 : 1) : (d < 0.35 ? 0 : 1);
      entree.y = (ux * fx + uz * fz) * m; entree.x = (ux * -fz + uz * fx) * m;
      if (heros.auSol) {
        double = false;
        const vide = d > 0.9 && !solA(p.x + ux * 0.95, p.z + uz * 0.95, p.y);
        if ((w.y - p.y > 0.42 && d < 3.3) || vide || nBloque === 3) { entree.sautPresse = true; entree.saut = true; if (nBloque === 3) nBloque++; }
      } else {
        entree.saut = true;
        if (!double && heros.vit.y < -1 && d > 1.1 && p.y < w.y + 0.5) { entree.sautPresse = true; double = true; }
      }
      /* blocage : un saut au bout de 3 s, puis on se replace sur le point au bout de 7 s */
      tBloque += dt;
      if (tBloque > 1) { if (Math.hypot(p.x - repere.x, p.z - repere.z) < 0.35) nBloque++; else nBloque = 0; repere = { x: p.x, z: p.z }; tBloque = 0; }
      if (nBloque >= 7) { heros.replace({ x: w.x, y: w.y + 0.4, z: w.z }); nBloque = 0; }
    },
  };
  return e;
}
