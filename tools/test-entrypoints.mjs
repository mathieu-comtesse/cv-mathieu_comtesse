// Points d'entrée réels du site (aucun navigateur) : chaque page charge sa chaîne de scripts, et tout ce qu'elle importe existe.
//  - l'ancien décor (accueil.html, refonte/main.js) n'existe plus ; le décor de l'accueil est monde3d/ ;
//  - index.html (accueil Fall 26, graphe et chemin 3D) : ses scripts locaux, et les modules du moteur (moteur.js, hero-graph.js, defilement.js) ;
//  - l'étiquette de version de moteur.js est la même partout (un décalage donnerait deux copies du moteur en cache).
// Remplace le contrôle « grep js/room.js?v= index.html », devenu faux depuis que index.html ne charge plus la pièce (consolidation PR 209).
// Usage : node tools/test-entrypoints.mjs
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
const racine = path.resolve(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname), '..', '..');
const lire = (f) => fs.readFileSync(path.join(racine, f), 'utf8'), existe = (f) => fs.existsSync(path.join(racine, f)) && fs.statSync(path.join(racine, f)).isFile();
const echecs = [], verifie = (ok, t) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + t); if (!ok) echecs.push(t); };
const propre = (s) => s.replace(/[?#].*$/, '');
const importsLocaux = (f) => { const dir = path.posix.dirname(f), src = lire(f), liste = [];
  for (const m of src.matchAll(/(?:import\s+(?:[^'"()]*?\sfrom\s+)?|export\s+[^'"()]*?\sfrom\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) liste.push(path.posix.normalize(path.posix.join(dir, propre(m[1]))));
  return liste; };
const scriptsLocaux = (f) => [...lire(f).matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map((m) => m[1]).filter((s) => !/^(https?:)?\/\//.test(s)).map((s) => propre(s.replace(/^\//, '')));

// ancien décor « Ma pièce » : retiré (accueil.html et refonte/main.js supprimés). js/room.js reste comme source de tools/build-monde3d.mjs.
verifie(!existe('accueil.html') && !existe('refonte/main.js'), 'ancien décor retiré : ni accueil.html ni refonte/main.js');
verifie(!/accueil\.html|refonte\/main\.js|js\/room\.js/.test(lire('index.html')), 'index.html ne charge pas l\'ancienne pièce');
verifie(/monde3d\/index\.html/.test(lire('index.html')) && existe('monde3d/index.html') && existe('monde3d/jeu/scene.js'), 'le décor de l\'accueil est le monde de style Moebius (monde3d/)');
verifie(existe('js/main.js') ? /room\.js\?v=/.test(lire('js/main.js')) : true, 'js/main.js (entrée autonome de la pièce), si présent, importe room.js avec une version');

// index.html : accueil Fall 26
const idx = scriptsLocaux('index.html');
verifie(idx.length > 0 && idx.every(existe), `index.html : ${idx.length} scripts locaux, tous présents (${idx.map((x) => path.posix.basename(x)).join(', ')})`);
const chaine = new Set(); const parcours = (f) => { if (chaine.has(f) || !existe(f)) return; chaine.add(f); if (/\.m?js$/.test(f)) importsLocaux(f).forEach(parcours); };
idx.filter((f) => /\.m?js$/.test(f)).forEach(parcours);
const absents = [...chaine].flatMap((f) => importsLocaux(f).filter((x) => !existe(x)).map((x) => `${f} -> ${x}`));
verifie(absents.length === 0, `chaîne d'imports de index.html : ${chaine.size} modules, aucun import manquant${absents.length ? ' (' + absents.join(' ; ') + ')' : ''}`);
const html = lire('index.html');
verifie(/refonte\/hero-graph\.js\?v=/.test(html) || chaine.has('refonte/hero-graph.js') || /hero-graph\.js/.test(html), 'le graphe de l\'accueil (hero-graph.js) est chargé par index.html');
verifie(existe('refonte/defilement.js') ? /refonte\/defilement\.js/.test(html) : true, 'le défilement lissé, s\'il existe, est chargé par index.html');

// étiquette de version du moteur : identique partout
const versions = new Map();
for (const f of ['index.html', 'refonte/hero-graph.js', 'tools/test-modes.mjs']) if (existe(f)) for (const m of lire(f).matchAll(/moteur\.js\?v=([a-z0-9-]+)/g)) { (versions.get(m[1]) || versions.set(m[1], []).get(m[1])).push(f); }
verifie(versions.size === 1, `étiquette de version de moteur.js unique : ${[...versions.keys()].join(', ') || 'aucune'} (${[...versions.values()].flat().length} références)`);
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : points d\'entrée résolus (index.html : accueil Fall 26 et décor Moebius ; ancien décor absent)'); process.exit(echecs.length ? 1 : 0);
