# Indépendance vis-à-vis de Shopify (branche `claude/integration-fall26`)

État vérifié par `node tools/test-no-shopify.mjs --strict` (tous les domaines `shopify.com` et `shopifycdn.com` bloqués) : **0 requête tentée, 18 contrôles verts.**

## Ce qui a été retiré

| Élément | Avant | Maintenant |
|---|---|---|
| Runtime Shopify (`entry.browser` et 140 modules chargés depuis `cdn.shopify.com`) | 142 requêtes quand le CDN répondait, 11 tentées quand il était bloqué | retiré |
| `refonte/boot-native.js` (376 Ko, trois modules tiers embarqués) | moteur du chemin, graphe, grappes | supprimé, remplacé par `refonte/moteur.js` |
| `refonte/boot-graph.js` (85 Ko), `refonte/boot-shop.js`, `refonte/shop/` | données et redirections de modules tiers | supprimés |
| Feuille `tailwind-*.css` du CDN | feuille principale | `refonte/site.css` (locale) |
| Polices du CDN (2 commerciales préchargées, Inter, JetBrains Mono, 9 `@font-face`) | chargées à distance | Inter local, JetBrains Mono local (OFL), aucune police commerciale |
| Mini-jeu final (`index-DoKsIXi0.js`, chargé depuis le CDN) | jeu d'origine | **retiré sans remplacement** (voir Limites) |
| Image sociale `og:image` | hébergée sur le CDN | `assets/og-home-blueprint.png` |

## Ce qui les remplace (code original)

| Fichier | Rôle | Interface |
|---|---|---|
| `refonte/moteur.js` | projection du chemin et caméra, cadres articulés, relevé animé, titres en volume, constellations, arêtes et règles | `cvAnchor`, `cvView`, `p`, `cvUnproject`, `cvSlab`, `cvRaise`, `cvFont`, `cvTextLayout`, `cvTextExtrude`, `Ciel`, `dessineContours`, `dessineRegles` |
| `refonte/hero-graph.js` | graphe de l'accueil en mode à plat (même classe `Ciel`, projection oblique) | `demarre(chapitres)` |
| `refonte/theme-stars.js` | étoiles des titres en mode à plat, scène plein écran des chapitres, liste fixe des chapitres | `window.__cvThemeStars`, `window.__cvStarScene` |

Calibrage : les constantes de caméra et le profil du sol ont été relevés sur l'ancien moteur aux quatre résolutions (T = 5 H, 64 pas, caméra à 1,015 H de haut, visée à 30,2°, champ 45°, redressement exponentiel du sol au loin). Les lettres en volume ne lisent plus aucune police : le texte est tracé dans un canevas avec la police de la page, son contour est relevé puis extrudé.

Les modules du site qui étaient remplacés au vol par des copies embarquées (`js/piggy-bank.js`, `js/gains-dashboard.js`, `refonte/infinity.js`) portent maintenant eux-mêmes le pont vers le chemin 3D.

## Limites constatées

- **Mini-jeu final** : il venait entièrement du CDN Shopify. Il n'existe plus ; aucun jeu original ne le remplace encore.
- **Quadrillage** : le quadrillage WebGPU tiers est remplacé par le quadrillage 2D projeté (déjà présent comme repli).
- **Glisser un nœud du graphe** : non repris (les nœuds réagissent au pointeur, mais ne se déplacent pas à la main).
- **Fidélité** : le moteur est calé sur des relevés, pas comparé image par image à la référence dans tous les états.
- Mesures faites sous SwiftShader ; aucune mesure sur carte graphique matérielle.
