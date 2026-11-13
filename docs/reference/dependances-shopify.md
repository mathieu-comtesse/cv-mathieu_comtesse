# Dépendances à Shopify encore exécutées (branche `claude/integration-fall26`)

Relevé par `node tools/test-no-shopify.mjs` (toutes les requêtes vers `shopify.com` et `shopifycdn.com` bloquées) et par lecture de `refonte/boot-native.js`, `refonte/boot-graph.js` et `index.html`. Complète [CDN-SHOPIFY.md](../CDN-SHOPIFY.md).

## Requêtes tentées au chargement de l'accueil : 11

| Type | Nombre | Détail | Équivalent local | État |
|---|---|---|---|---|
| Feuille de style | 1 | `tailwind-*.css` (174 Ko) | `refonte/site.css`, chargée en secours | fonctionne sans Shopify ; parité visuelle non mesurée |
| Polices | 4 | deux polices commerciales préchargées, Inter, JetBrains Mono | Inter local présent ; JetBrains Mono (OFL) à héberger ; les deux commerciales à remplacer | à faire |
| Scripts | 6 | `entry.browser`, `mesh.wgsl`, `build-section-frame`, `shader`, `surface`, `HtmlInCanvasEntry` | aucun | **critique** : sans eux le moteur du chemin ne démarre pas |

## Code tiers embarqué dans le dépôt

| Fichier | Contenu | Taille |
|---|---|---|
| `refonte/boot-native.js` | 3 modules : `htmlInCanvasWebGpu.client` (338,6 Ko), `ExponentialGraph` (27,7 Ko), `heroTap` (1,2 Ko) | 376 Ko |
| `refonte/boot-graph.js` | données et références de 43 modules | 85 Ko |

## Fonctions du moteur consommées par `index.html` (objet `N`)

| Responsabilité | Symboles | Équivalent original | Test de parité |
|---|---|---|---|
| Projection du chemin, caméra | `N.p` (20 usages), `N.cvView`, `N.cvUnproject`, `N.L` | aucun | `tools/topo-home.mjs` (mesure les cadres) |
| Cadres inclinés | `N.cvSlab`, `N.cvRaise` | aucun | `tools/topo-home.mjs` |
| Titres en volume | `N.cvTextLayout`, `N.cvTextExtrude` | aucun | `tools/v9-titres.mjs` |
| Graphe de l'accueil | `N.cvHeroGraph`, `N.cvDrawHeroGraph`, `N.cvDrawLabels` | aucun | aucun |
| Grappes des chapitres (mode expo) | `N.cvChapterClusters`, `N.cvDrawChapterClusters` | en mode à plat seulement : `refonte/theme-stars.js` | aucun |
| Grille, règles, annotations, contours, ancres | `N.cvGrid`, `N.cvPageRulers`, `N.cvAnnotations`, `N.cvOutlines`, `N.cvOverlay`, `N.cvAnchor`, `N.cvCubeMotion` | `refonte/mesh-gpu.js` pour le rendu des maillages | aucun |

## Résultat du test sans Shopify (état actuel)

Fonctionnent : sections, feuille de secours, titres, étoiles, carte du décor, machines 3D, navigation, absence d'erreur. **Échouent : le démarrage du moteur du chemin (cadres, graphe) et le passage en mode expo.**

## Ordre de remplacement proposé

1. Polices : Inter et JetBrains Mono en local, deux polices libres à la place des commerciales (retire 4 requêtes).
2. Feuille de style : `refonte/site.css` en feuille principale après comparaison de captures (retire 1 requête).
3. Graphe de l'accueil et grappes : moteur original à partir de `refonte/theme-stars.js` (même structure foyer, branches, vignettes).
4. Projection, cadres, titres en volume : moteur original du chemin (le plus gros chantier).
5. Retrait de `boot-native.js` et `boot-graph.js`, puis `node tools/test-no-shopify.mjs --strict` dans la CI.

Aucune de ces cinq étapes n'est faite sur cette branche.
