# Consolidation des travaux (branche `claude/integration-fall26`)

Base : tête de la PR #208 (`3d9476a`). Aucune fusion vers `main`.

| Source | État constaté | Ce qui est repris | Conflits et décisions |
|---|---|---|---|
| PR #208 | ouverte, base `main`, contient la #207 | tout (base de la branche) | sans objet |
| PR #207 | ouverte, ancêtre de la #208 | déjà dans la base, rien réintroduit | sans objet |
| PR #203 | ouverte, base `main`, 96 commits | tout : titres, cadres, vitrines, bancs de mesure, tests | `index.html` fusionné à grain fin, 2 conflits réels dans l'en-tête : une seule feuille `ui-premium` (celle de la 208), `magic.css` de la 203 conservée, `premium-cta.js` non réintroduit (supprimé par la 208) ; `ui-premium.css` : capsules de la 208 ; `tools/test-ux.mjs` : contrat de la 203 |
| PR #206 | ouverte, base `main`, 4 commits | tout : pièce et Mathieu refaits en low poly | chaînes de version de `js/room.js` et `js/native-geometry.js` (celles de la 208) ; `room-dialogs.css` en local |
| `claude/busy-bell-mv2o8j` | poussée | scène de décor originale (`monde3d/jeu/`), outil d'export du décor, rendu encre et hachures | le mini-jeu, son interface, la page `expo.html` et la carte cliquable ne sont **pas** repris |

## Doublons vérifiés

- Un seul chargement de `boot-graph.js` (la fusion en avait créé deux : corrigé).
- Une seule feuille `ui-premium.css`, aucun `premium-cta.js`.
- Un seul curseur : celui de la #208 (formes natives) ; aucun curseur ajouté.

## Reste ouvert

- `js/ui.js` (pièce de `accueil.html`) ouvre encore `monde3d/index.html` depuis l'ordinateur du bureau : cette page n'est plus un jeu mais le décor seul. À retirer ou à remplacer.
- Le moteur du chemin 3D reste celui embarqué dans `refonte/boot-native.js` (voir [CDN-SHOPIFY.md](../CDN-SHOPIFY.md)) : il n'a pas été réécrit.
