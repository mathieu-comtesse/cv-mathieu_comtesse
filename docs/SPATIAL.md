# Vue spatiale de comtesse.me (version de test)

Branche : `claude/refonte-spatiale-test`. Page : `spatial.html` (noindex, hors sitemap). Le site actuel (`index.html` et pages existantes) n'est pas modifié par cette branche, sauf l'export de `drawMat` dans `refonte/blueprint-hero.js`.

Ouvrir : `spatial.html`, avec les options `?vue=liste` (vue sans 3D), `?debug` (mesures réelles), `?reset` (ignore la position mémorisée). Liens profonds : `#/vre`, `#/vre/fiche`, `#/parcours`.

## Ce qui est réalisé

- Un seul plan blueprint continu (mêmes couleurs, grille et tracés de la table à dessin que le plan d'origine), un couloir bordé d'un liseré, des structures filaires latérales, des axes, des repères de profondeur, des arcs de construction, des liaisons animées entre projets liés.
- Les 11 machines d'origine (`refonte/m3d/*`) posées dans l'espace avec position, orientation, échelle et cadrage propres. Aucune n'est remplacée. THALEOLITHIC et les 12 projets personnels sont des plaques (captures existantes), la stèle (`assets/stele-bordeaux.glb`) est à l'accueil.
- Navigation : molette (unités normalisées, suivi amorti indépendant de la fréquence d'images, inertie bornée), glissement tactile, clavier, menu, rail de position, liens profonds avec historique.
- Trajectoire : deux courbes de Catmull-Rom centripètes (position et regard) qui passent exactement par chaque cadrage. Déterministe et réversible.
- Inspection : les deux règles d'origine (Tourner, Incliner) orientent le modèle sélectionné. Le réglage propre de chaque machine (glisser sur la machine, flèches) est conservé. Surbrillance des pièces mobiles mesurée dans le repère de la machine, donc indépendante de la rotation.
- Informations à trois niveaux : annotations flottantes (dispositions A, B, C), carte d'inspection, panneau de lecture alimenté par les pages d'étude existantes et par `js/indicators.js`.
- Accessibilité : index complet en DOM, vue liste, `prefers-reduced-motion` (cadrage direct), focus géré, Échap, règles au clavier, zones de 44 px sur mobile.
- HTML-in-Canvas : détection par fonctionnalités, une seule surface (légende au sol du projet actif), garde d'exécution avec repli sur les légendes DOM.

## Composants (dossier `spatial/`)

| Fichier | Rôle |
|---|---|
| `registry.js` | ProjectRegistry : positions, cadrages, domaines, liens, données des cartes |
| `camera-path.js` | CameraPathController |
| `scroll.js` | SpatialScrollController |
| `state.js` | InteractionStateManager (exploration, inspection, lecture, navigation, transition) |
| `world.js` | SceneManager : rendu, plan, lumières, objets, chargement à l'approche, niveaux d'activité |
| `machine.js`, `glow-local.js` | MachineController : rotation globale, animations internes, lueur locale |
| `rulers.js` | RotationRulerController |
| `annotations.js` | FloatingAnnotationManager : placement sans chevauchement, lignes de rappel |
| `panel.js` | ProjectDetailPanel |
| `html-canvas.js` | HTMLCanvasAdapter |
| `perf.js` | PerformanceManager : profil selon le matériel, ajusté par mesures |
| `main.js` | assemblage, routage, repli liste |

Ajouter un projet : une entrée dans `STOPS` de `registry.js` (position, cadrage) puis `node tools/test-spatial-path.mjs`, qui vérifie le dégagement de la caméra et l'absence de chevauchement.

## Tests exécutés

- `node tools/test-spatial-path.mjs` : cadrages atteints, déterminisme, dégagement caméra (minimum 7,9 unités), absence de chevauchement, composition non alignée. Réussi.
- `node tools/test-spatial-browser.mjs` (Chromium, rendu logiciel) : arrivée, molette, inertie, réversibilité, inspection avec les deux règles, lecture et molette contenue, Échap et focus, lien profond et rechargement, navigation directe, mobile tactile, vue liste, mouvement réduit. Réussi, avec et sans l'indicateur `CanvasDrawElement`.

## Mesures (laboratoire, sans GPU)

Chromium 153 avec rendu logiciel SwiftShader, serveur local, cache vide. Ces valeurs ne représentent pas un appareil réel.

| Mesure | Valeur |
|---|---|
| LCP, FCP de la page (bureau et mobile) | 156 à 168 ms (le contenu texte est immédiat, la 3D arrive après) |
| Transfert initial | 2,4 Mo, 40 requêtes (contre 38,5 Mo et 246 requêtes pour l'accueil actuel, qui précharge toute la pièce) |
| Initialisation WebGL | 45 à 55 ms |
| Construction du premier modèle (VRE) | environ 2 s en rendu logiciel |
| Cadence | 2,3 images par seconde mesurées en rendu logiciel. Les cibles de 30 et 60 images par seconde ne sont pas vérifiées : aucun GPU n'était disponible. |
| Draw calls à l'accueil | 569 pour deux machines visibles. C'est le principal risque sur matériel modeste : les modèles d'origine comptent des centaines de maillages avec leurs arêtes. Fusion de maillages non faite. |

## Limites et éléments non validés

1. **HTML-in-Canvas.** Avec l'indicateur `CanvasDrawElement`, Chromium 153 expose `texElementImage2D` mais refuse l'appel émis par `THREE.HTMLTexture` de Three.js r184 (signature différente : « The provided value is not of type Element or ElementImage »). La garde d'exécution détecte l'erreur, désactive la surface et conserve les légendes DOM. Le chemin natif n'est donc pas validé de bout en bout. Firefox, Safari et les navigateurs mobiles n'ont pas été testés (seul Chromium est installé ici).
2. **Performance réelle** non mesurée (pas de GPU, pas de mobile physique, pas de lecteur d'écran). LCP, INP et CLS sur appareils réels restent à mesurer.
3. **La pièce 3D de l'accueil** (personnage, appartement) reste sur `index.html` : la vue spatiale y renvoie par la marque. La stèle est intégrée, pas le personnage animé.
4. **Études de cas** : les panneaux affichent les pages d'étude existantes. Les rubriques Diagnostic, Contribution personnelle, Limites et Amélioration continue n'existent pas encore dans ces pages : elles ne sont pas inventées ici.
5. **Rendu comparatif avant et après** : captures de la vue spatiale produites, pas de comparaison pixel à pixel avec les pages d'origine.
6. **Redirections et SEO** : la vue spatiale est volontairement `noindex`. Les URLs existantes des projets restent inchangées.
7. Pas de son de cliquet sur les règles (présent sur le site actuel), pas de flou de profondeur (non ajouté, la lisibilité prime).
