# Dépendances à cdn.shopify.com : inventaire et plan

Mesuré avec `node tools/perf/hosts.cjs / 3000 9000 20000` (requêtes sortantes de l'accueil, défilement jusqu'au bas).

## Ce que la page charge réellement depuis Shopify

| Type | Fichiers | Rôle constaté |
|---|---|---|
| Feuille de style | `tailwind-*.css` (174 Ko, Tailwind v4 compilé, 331 variables, 36 animations, 98 requêtes média, thème « f26 ») | Mise en page de toute la page d'accueil |
| Script de démarrage | `entry.browser-*.js` | Point d'entrée de l'application externe |
| Modules | 22 fichiers (`frameLoop`, `smoothScroll`, `residentSections`, `rootMirror`, `build-section-frame`, `htmlInCanvasTilt`, `mesh.wgsl`, `pack`, `shader`, `surface`, etc.) importés par le client HTML-in-canvas (345 Ko en ligne dans `refonte/boot-native.js`) | Rendu et interactions du chemin 3D et des cartes |
| Polices | PP Neue Montreal, Söhne Mono, Shopify Inter (précharges) ; Inter et JetBrains Mono (fichiers Shopify) | Typographie |
| Visuels | SVG et PNG de l'éditorial Shopify référencés dans `refonte/boot-graph.js` | Données de graphe |

## Constat

Avec `cdn.shopify.com` injoignable, **l'accueil s'affiche sans mise en page ni 3D** (capture : `/tmp` locale, reproductible avec le script ci-dessus). Le site dépend donc d'un hôte tiers pour son premier affichage.

Points à décider par le propriétaire du site :
1. **Licences** : PP Neue Montreal et Söhne Mono sont des polices commerciales hébergées par Shopify ; la feuille, les modules JS et ces polices sont du code et des ressources tiers exécutés en production. Leur remplacement par des modules originaux est une réécriture, pas un déplacement de fichiers.
2. **Vérification impossible ici** : le rendu partagé `mesh.wgsl` est un moteur WebGPU. Le conteneur de test n'a pas de WebGPU : son rendu ne peut pas être observé ni comparé pixel à pixel avec un module original.

## Corrigé dans cette branche

1. `cvRegisterGeometry` ne fait plus échouer les machines et la tirelire si `mesh.wgsl` est injoignable : repli sur le rendu Three.js local (`publish()` renvoie `false`). L'avertissement « La tirelire 3D ne peut pas être affichée » a disparu dans le test CDN coupé.
2. `refonte/base-fallback.css` : feuille de secours originale chargée si la feuille externe échoue. **Insuffisante** : le texte devient lisible mais la page reste largement cassée, car le balisage dépend de la feuille externe.

## Reste à faire (non commencé)

1. Feuille de style originale : générer les utilitaires avec Tailwind (MIT) à partir du balisage local, écrire à la main les composants « f26 » restants, valider par différence de captures contre la page de référence.
2. Remplacer, module par module, le client HTML-in-canvas : boucle d'images (déjà couverte par `frame-bus.js`), défilement fluide, sections résidentes, miroir racine, rendu de maillages (WebGL2 original).
3. Polices : Inter et JetBrains Mono (licence OFL) auto-hébergées ; PP Neue Montreal et Söhne Mono à remplacer par des polices libres, ce qui change l'identité typographique et demande ton accord.
4. Retirer les précharges et les images Shopify, puis imposer par test automatique l'absence de requête sortante.

## Rendu de maillages original (`refonte/mesh-gpu.js`), écrit avec le skill WebGPU/TSL

Le skill `webgpu-claude-skill` (Three.js `WebGPURenderer` + TSL, gestion de la perte de périphérique) a servi de guide. Le module remplace le registre et le shader de `mesh.wgsl` pour les canvas 2D des machines :

- Contrat identique (`register(canvas, {frame, clear, redraw})` renvoie `publish/drop/unregister`) ; `cvRegisterGeometry` fournit en plus `view`, `projection` et l'opacité de chaque pièce.
- Un seul `WebGPURenderer` partagé (WebGPU si disponible, WebGL2 sinon, automatiquement), un seul matériau opaque et un seul matériau translucide pour toutes les machines (couleur et facteurs portés par des attributs de sommet : 2 pipelines GPU au lieu d'un par couleur).
- Perte de périphérique : repli immédiat sur le rendu Three.js local (`source.redraw()`), reconstruction en WebGL2, abandon après 3 échecs.
- `?mesh=shopify` rétablit l'ancien module externe pour comparer.
- Builds `three.webgpu.js` et `three.tsl.js` (r187, MIT) ajoutés à `vendor/three-r187/`, minifiés (459 Ko + 315 Ko, 217 Ko en gzip), chargés seulement quand une machine devient visible.

Vérifié (`node tools/perf/mesh-check.cjs <machine> sortie.png webgl`) : 11 machines publiées (`taken: true`), silhouette identique au rendu historique (écart de pixels opaques inférieur à 0,4 % sauf matériaux translucides), luminosité moyenne à moins de 6 % ; translucidité conservée (ampoule de Finance, vitres de Nisaru). Les textures de la machine Suivi restent approchées par palette, comme dans les données de trame d'origine.

**Non vérifié** : le chemin WebGPU natif. Dans ce conteneur, un périphérique WebGPU est détruit dès la première image, même avec du WebGPU brut (test `gpu3`), donc seul le backend WebGL2 a été exécuté. Sur un GPU réel, le module utilisera WebGPU ; son rendu n'a pas été observé.

**Reste dépendant de Shopify** : `mesh.wgsl` est encore importé par le client HTML-in-canvas (345 Ko) lui-même chargé depuis le CDN ; la feuille Tailwind, les 22 autres modules et les polices sont inchangés. Le module original ne dessine que les canvas 2D des machines ; le canvas de la tirelire (contexte WebGL propre) garde son rendu.
