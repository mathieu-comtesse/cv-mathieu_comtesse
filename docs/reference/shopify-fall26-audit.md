# Audit de la référence Shopify Editions Fall ’26 (branche `claude/integration-fall26`)

Ce document complète le relevé de la PR #208 ([FALL26-AUDIT.md](../FALL26-AUDIT.md), fait sur Chrome avec une carte graphique réelle). Il ne contient que ce qui a été observé pendant cette session ; tout le reste est marqué « non mesuré ».

## Conditions

- Navigateur : Chromium piloté par Playwright, **rendu logiciel** (SwiftShader), sans WebGPU. Les durées et la fluidité observées ici ne valent pas pour une carte graphique réelle.
- Fenêtre : 1 440 × 900. Les résolutions 1 920 × 1 080, 2 560 × 1 440 et 390 × 844 n'ont **pas** été capturées sur la référence pendant cette session.
- États capturés sur la référence : arrivée (défilement 0) et défilement à 340 px. Les états suivants n'ont pas été capturés (le script s'est arrêté après le deuxième état).
- Les captures de la référence servent de preuve de mesure et ne sont pas versées au dépôt (visuels de tiers).

## Arrivée, 1 440 × 900 : mesures sur capture

| Élément | Référence | comtesse.me (cette branche) | Écart |
|---|---|---|---|
| Bandeau | hauteur 50 px | 50 px | 0 |
| Colonne du titre vertical | x de 0 à 172 px environ | identique | non mesurable au pixel (lettres différentes) |
| Colonne des cartes | x = 183 px, largeur 245 px environ | x = 183, largeur 245 | 0 (lecture DOM côté comtesse, lecture sur capture côté référence) |
| Liste des chapitres | 11 lignes, numéros 01 à 11 décalés en escalier | 11 lignes, même escalier | 0 |
| Carte 1 | y = 243, hauteur 209 environ | y = 243, hauteur 209 | 0 |
| Carte 2 (statistique « 400M+ », scène isométrique animée) | y = 462, légende sur 2 lignes puis scène pleine largeur | y = 462, légende sur 2 lignes puis le décor de Mathieu en vue de trois quarts | géométrie égale ; teinte de la scène différente (bleu chez la référence, papier ici) |
| Carte 3 | y = 681 | y = 681 | 0 |
| Panneau du graphe | x de 437 à 1 415 environ, fond bleu nuit | x de 437 à 1 430 | 15 px sur le bord droit (estimation : largeur de barre de défilement, non vérifié) |
| Graphe | 11 foyers étiquetés avec leur effectif, plusieurs centaines de feuilles, vignettes blanches | 11 foyers étiquetés avec leur effectif, quelques dizaines de feuilles, vignettes des machines | **densité nettement plus faible** côté comtesse (liée au nombre réel de contenus) |

## Défilement à 340 px : observation

- Référence : le panneau du graphe s'étend sur toute la page, fond bleu vif, les cartes de gauche glissent hors champ (bord droit visible à x = 30 px), les lignes s'éclaircissent, les vignettes proches du centre deviennent opaques.
- comtesse.me : même comportement (cartes au même x, fond bleu, graphe étendu). Écart observé : le grand titre de chapitre en contour apparaît déjà en bas d'écran à cet état, ce qui n'est pas le cas sur la référence au même défilement ; la densité de lignes reste plus faible.

## Inclinaison des cadres

Le moteur embarqué définit `tilt:{angle:55}` ; `index.html` forçait `N.L.tilt.angle = 90`. La valeur d'origine (55°) est rétablie par la constante `EXPO_CARD_TILT_DEG`. L'angle apparent à l'écran sur la référence n'a pas été mesuré pendant cette session.

## Non mesuré pendant cette session

Tailles apparentes des titres de chapitre, trajectoires et durées des animations, états de survol, curseur, matériaux vitrés, constellations des chapitres, mode expo de la référence, comportements à 1 920, 2 560 et 390 px. Pour ces points, les seules mesures disponibles sont celles de la PR #208 (bandeau, commandes, liens, cartes planes) et de la PR #203 (titres : 120 px de référence contre 15 à 22 px visibles, docs/v9/).
