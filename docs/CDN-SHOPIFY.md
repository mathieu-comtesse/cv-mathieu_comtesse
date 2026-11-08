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
2. `refonte/base-fallback.css` (supprimée) : première feuille de secours, insuffisante, remplacée par `refonte/site.css` (voir plus bas).

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

## Feuille de style originale (`refonte/site.css`, 29 Ko)

Chaîne : `node tools/css/build.mjs` génère `refonte/site.css` avec Tailwind CSS v4 (licence MIT, utilitaires et base) à partir du balisage réel et de `tools/css/classes.txt` (478 classes relevées dans le DOM après exécution), plus `refonte/css/components.css` (jetons et composants écrits à la main). Les jetons sont des valeurs mesurées sur la page de référence (échelle d'espacement 1 px, point de rupture 58,75 rem, couleurs de section, tailles `clamp`, colonnes du héros déduites par calcul), pas du CSS recopié.

Utilisation :
- **Secours automatique** : si la feuille Shopify ne charge pas (`onerror`), `site.css` est chargée. Test CDN coupé : l'accueil affiche menu, cartes et graphe au lieu d'une page sans mise en page.
- **Comparaison** : `?css=local` remplace la feuille Shopify par `site.css`.
- Production inchangée : la feuille Shopify reste la feuille par défaut.

Mesure (`node tools/css/diff.cjs 1440 900`, 3 212 éléments, 50 propriétés calculées chacun) :

| État | Éléments différents | Propriétés différentes | Pixels différents (capture) |
|---|---|---|---|
| Tailwind seul | 94,7 % | 10 966 | non mesuré |
| + jetons et premiers composants | 16,9 % | 1 183 (0,74 %) | 92 % |
| + colonnes du héros | 27,1 % (structure alignée) | 1 569 | 33 % |

Sur 1 569 écarts, 869 sont la police (Inter à la place de PP Neue Montreal, choix à confirmer). Les trois résolutions (1440, 1920, 390) donnent des taux voisins : 0,7 à 1,7 % des propriétés.

Après écriture du système d'animations du héros (variables `--hero-expand-x/y` pilotées par le défilement, découpes, glissement des colonnes) et du fond de page par section (propriétés `@property`, couleurs de section, chronologies de vue) :

| Largeur, défilement | Pixels différents (capture, seuil 24/255) |
|---|---|
| 1440, 0 / 300 / 700 / 1500 / 4000 | 3,7 % / 5,4 % / 1,5 % / 0,2 % / 5,4 % (avant : 92 % / 77 % / 93 % / 94 % / n. m.) |
| 1920, 0 / 1500 | 3,0 % / 0,0 % |
| 390, 0 / 1500 | 9,3 % / 1,0 % |

Propriétés calculées différentes : 1 480 sur 160 600 (0,9 %), dont 869 pour la police (Inter à la place de PP Neue Montreal).

**Reste à écrire** : la liste de navigation latérale du bureau (`desktop-navigation`, absente de la capture locale à 4000), les infobulles (`shared-tooltip__bubble`), l'en-tête mobile, les états de survol hors héros, `checkpoint-stage__*` complet. Le défaut visible le plus net est le haut de page à 390 de large (9,3 %). Production inchangée : la feuille Shopify reste la feuille par défaut tant que ces points ne sont pas traités et que la police n'est pas validée.

### Mise à jour : infobulles, mobile, priorités

Ajouts : infobulles (`shared-tooltip*`), `trim-cap`, jetons de lettrage des tailles mono, taille du grand titre desktop, règles de page placées hors couches (elles l'emportent sur les utilitaires). Pixels différents (capture, seuil 24/255) : 1440 de large 3,7 % (0) / 4,8 % (300) / 0,0 % (700) / 0,2 % (4000) ; 1920 : 3,0 % (0) / 0,9 % (4000) ; 390 : 9,3 % (0) / 0,0 % (1500). Propriétés calculées différentes à 1440 : 1 070 dont 869 de police (Inter). Reste : haut de page mobile, liste de navigation latérale, position du texte vertical `hero-tagline`. La feuille Shopify reste la feuille par défaut ; `?css=local` et le secours automatique utilisent `site.css`.
