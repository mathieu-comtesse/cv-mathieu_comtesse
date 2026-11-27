/* Graphe des chapitres (mode à plat, grand écran) : après l'accueil, le même graphe reste en fond, fixe, et une caméra se cale sur l'étoile
   du chapitre en cours. Lois du passage d'une section à l'autre de la référence (modules journey, heroMediaFlight, build-section-frame) :
   - cadrage : étoile du chapitre au milieu de l'écran (50 % de la largeur, 50 % de la hauteur, relevé en WebGPU sur la référence : 454 px sur 900), plus long rayon à environ 420 px (44 % de la hauteur, 30 % de la largeur au plus) ;
   - trajet entre deux chapitres : de (bas du chapitre quitté − 0,55 hauteur d'écran) à (haut du suivant − 0,4 hauteur d'écran) ;
     repli des rayons du chapitre quitté sur les 30 premiers %, glissement de caméra en courbe cubique, dépli des rayons du suivant
     sur la seconde moitié, les autres étoiles remontent de 0,12 à 1 au milieu du trajet (contexte) puis s'effacent ;
   - hors trajet : seule l'étoile du chapitre est pleine, les autres à 0,12.
   Un chapitre = une section de la page = une étoile du graphe (11). Code propre, moteur commun avec l'accueil (moteur.js). */
import { Ciel } from './moteur-plat.js?v=6';   // moteur à plat d'origine, séparé du moteur Expo de main

const borne = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), plage = (x, a, b) => borne((x - a) / (b - a));
const lisse = (x) => x * x * (3 - 2 * x), cubique = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2), mel = (a, b, k) => a + (b - a) * k;
const FOND = 0.12;

/* échantillon de trajet de la référence : n défilement, t bas du chapitre quitté, c haut du suivant, s hauteur d'écran */
export function trajet(n, t, c, s) {
  const debut = t - s * 0.55, fin = Math.max(debut + 1, c - s * 0.4), a = plage(n, debut, fin), unfold = plage(a, 0, 0.3), reveal = lisse(plage(a, 0.02, 0.08)), isolate = lisse(plage(a, 0.5, 1));
  return { debut, fin, progres: a, actif: n >= debut && n < fin, unfold, reveal, pan: cubique(a), isolate, context: reveal * (1 - isolate), colour: lisse(plage(a, 0.11, 0.63)) };
}

export function demarre(chapitres) {
  const grand = matchMedia('(min-width: 940px)'), reduit = matchMedia('(prefers-reduced-motion: reduce)');
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.className = 'cv-graphe-chapitres'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:1;pointer-events:none;opacity:0;filter:saturate(0) brightness(1.9)';   /* traits et points blancs, comme sur la référence (rayons à 0,2 environ, extrémités en cercles creux : mode discret du moteur) */
  document.body.append(cv);
  const ciel = new Ciel(); ciel.sansNoms = true;
  ciel.definit('accueil', { groupe: 'accueil', label: 'Mathieu Comtesse', racine: true });
  chapitres.forEach((r, i) => ciel.definit('accueil:' + r.id, { groupe: 'accueil', parent: 'accueil', num: String(i + 1).padStart(2, '0'), label: r.name, chapitre: r.id, editoriaux: r.cards, sol: true, deco: 13 }));   /* relevé WebGPU de la référence : 16 rayons pour 3 contenus (13 cercles creux), longs de 208 à 421 px */
  let W = 0, H = 0, dpr = 1, dernier = 0, etat = null;
  const taille = () => { W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
  addEventListener('resize', taille); taille();
  const sections = () => chapitres.map((r) => { const el = document.getElementById(r.id); if (!el) return null; const q = el.getBoundingClientRect(); /* fin du flux : bas du dernier groupe de cartes (hors colonne de texte), comme la référence */
    const g = [...el.querySelectorAll('[data-card-group]')].filter((x) => x.dataset.cardGroup !== 'text').pop(), f = g ? g.getBoundingClientRect().bottom : q.bottom - 87;
    return { id: 'accueil:' + r.id, top: q.top + scrollY, bas: q.bottom + scrollY, flux: f + scrollY }; }).filter(Boolean);
  /* cadrage d'une étoile : agrandissement qui tient ses rayons dans le cadre */
  const cadre = (e) => { const ax = W * 0.5, ay = H * 0.5, R = Math.max(1, e.rayon), Rv = R * 0.78;
    return Math.min(420, H * 0.44, W * 0.3) / R; };   /* relevé WebGPU : le plus long rayon fait environ 420 px à 900 px de haut ; les rayons peuvent sortir du cadre */
  function image(t) {
    requestAnimationFrame(image);
    if (document.hidden || t - dernier < 30) return; const dt = Math.min(0.1, (t - dernier) / 1000); dernier = t;
    const S = sections(), expo = document.documentElement.classList.contains('cv-parity-active');
    if (!grand.matches || expo || !S.length) { cv.style.opacity = '0'; etat = null; return; }
    /* disposition du monde : celle de l'accueil, dans un cadre de la taille de l'écran */
    const R0 = Math.min(W * 0.41, H * 0.5);
    ciel.place('accueil', [W / 2, H * 0.5, 0], R0);
    for (const s of S) { const e = ciel.etoiles.get(s.id); e.rayon = R0 * 0.52; e.centre[2] = 0; }
    /* entrée : l'accueil s'efface (même courbe que son canevas), le graphe des chapitres le remplace et la caméra vient sur la première étoile */
    const premier = S[0], finAccueil = Math.min(premier.top - H * 0.8, H * 0.55), sA = borne(scrollY / Math.max(200, finAccueil)), entree = plage(sA, 0.25, 0.75);
    let de = premier, vers = null, k = { pan: 0, unfold: 0, isolate: 0, context: 0, progres: 0 }, deploieDe = entree;
    for (let i = 1; i < S.length; i++) { const j = trajet(scrollY, S[i - 1].flux, S[i].top, H); /* départ relevé en WebGPU : fin du flux de la section quittée − 0,55 hauteur d'écran */ if (j.actif) { de = S[i - 1]; vers = S[i]; k = j; break; } }
    if (!vers) { de = S[0]; for (const s of S) if (s.top - scrollY < H * 0.5) de = s; deploieDe = de === premier ? entree : 1; }
    else deploieDe = 1 - lisse(plage(k.progres, 0.45, 0.55));   /* relevé fin (tous les 50 px) : la référence garde une étoile déployée à chaque instant ; relais à mi-trajet */
    const eDe = ciel.etoiles.get(de.id), eVers = vers && ciel.etoiles.get(vers.id);
    const cDe = eDe.centre, sDe = cadre(eDe), cV = eVers ? eVers.centre : cDe, sV = eVers ? cadre(eVers) : sDe;
    const hx = mel(cDe[0], cV[0], k.pan), hy = mel(cDe[1], cV[1], k.pan), sc0 = mel(sDe, sV, k.pan);
    /* à l'entrée, la caméra part de la vue d'ensemble (centre de l'écran, échelle 1) */
    const ax = W * 0.5, ay = H * 0.5, sc = mel(1, sc0, vers ? 1 : (de === premier ? cubique(entree) : 1));
    const cx = mel(W / 2, hx, vers ? 1 : (de === premier ? cubique(entree) : 1)), cy = mel(H / 2, hy, vers ? 1 : (de === premier ? cubique(entree) : 1));
    /* entrée et sortie de l'étoile (relevé WebGPU de la référence, pas de 100 px) : l'étoile se comporte comme un élément épinglé.
       Avant le trajet vers le chapitre suivant, elle monte du bas avec la page ; pendant le trajet elle reste au centre ;
       après la fin du trajet (haut du chapitre − 0,4 hauteur d'écran), elle remonte avec la page et sort par le haut.
       Décalage = u − 100 (1 − e^(−u/100)), u = distance de défilement hors du trajet : lent au début, puis à la vitesse de la page. */
    const glisse = (u) => (u <= 0 ? 0 : Math.min(H * 2, u - 100 * (1 - Math.exp(-u / 100))));
    let decale = 0;
    if (!vers) { const i = S.indexOf(de), suiv = S[i + 1];
      const monte = glisse(scrollY - (de.top - H * 0.4)), arrive = suiv ? glisse(trajet(0, de.flux, suiv.top, H).debut - scrollY) : Infinity;
      decale = monte <= arrive ? monte : -arrive; }   /* la plus proche des deux : sortie par le haut ou entrée par le bas */
    const proj = (c, r, h) => ({ x: ax + (c - cx) * sc, y: ay + (r - cy) * sc - h * 0.62 * sc - decale, z: 2000 - h });
    const poids = new Map(), deploie = new Map();
    for (const s of S) poids.set(s.id, FOND);   /* relevé : pendant un passage la référence ne montre que l'étoile du chapitre (pas de remontée des autres) */
    poids.set('accueil', FOND);
    poids.set(de.id, 1); deploie.set(de.id, borne(deploieDe));
    if (vers) { const r = lisse(plage(k.progres, 0.45, 0.55)); poids.set(de.id, Math.max(FOND, 1 - r)); poids.set(vers.id, Math.max(FOND, r)); deploie.set(vers.id, r); }
    const alpha = de === premier && !vers ? entree : 1;
    cv.style.opacity = alpha.toFixed(3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (alpha > 0.002) ciel.dessine(ctx, proj, reduit.matches ? null : t / 1000, { W, H, dt, plat: true, poids, deploie, alpha, discret: true });
    etat = { de: de.id, vers: vers && vers.id, pan: +k.pan.toFixed(3), isolate: +k.isolate.toFixed(3), unfold: +k.unfold.toFixed(3), context: +k.context.toFixed(3), echelle: +sc.toFixed(3), decale: Math.round(decale), alpha: +alpha.toFixed(3),
      foyer: eDe.ecran && [Math.round(eDe.ecran.x), Math.round(eDe.ecran.y)], foyerVers: eVers?.ecran && [Math.round(eVers.ecran.x), Math.round(eVers.ecran.y)], deploieDe: +borne(deploieDe).toFixed(3) };
  }
  requestAnimationFrame(image);
  window.__cvGrapheChapitres = { etat: () => etat, ciel, trajet };
}
