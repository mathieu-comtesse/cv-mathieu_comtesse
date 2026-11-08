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
