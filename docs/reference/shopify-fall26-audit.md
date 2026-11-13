# Audit de la référence Shopify Editions Fall ’26 (branche `claude/integration-fall26`)

Ce document complète le relevé de la PR #208 ([FALL26-AUDIT.md](../FALL26-AUDIT.md), fait sur Chrome avec une carte graphique réelle). Il ne contient que ce qui a été observé pendant cette session ; tout le reste est marqué « non mesuré ».

## Conditions

- Navigateur : Chromium piloté par Playwright, **rendu logiciel** (SwiftShader), sans WebGPU. Les durées et la fluidité observées ici ne valent pas pour une carte graphique réelle.
- Fenêtres : 1 440 × 900, 1 920 × 1 080, 2 560 × 1 440 et 390 × 844 (relevés DOM et captures aux quatre ; analyse visuelle détaillée à 1 440 × 900 seulement).
- États : arrivée, 340 px, 815 px, puis autour du premier chapitre (−40 px, +0,5 écran, +1,5 écran).
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

## Mesures aux quatre résolutions (relevé DOM, script `ref2`, mêmes états sur les deux sites)

| Mesure | 1 440 × 900 | 1 920 × 1 080 | 2 560 × 1 440 | 390 × 844 |
|---|---|---|---|---|
| Haut du premier chapitre, référence | 1 454 px | 1 767 px | 2 394 px | 844 px |
| Haut du premier chapitre, comtesse.me avant correction | 900 px | 1 080 px | 1 440 px | 844 px |
| Haut du premier chapitre, comtesse.me après correction | 1 454 px | 1 767 px | 2 394 px | 844 px |
| Titre de chapitre, référence | 120 px / 120 px, graisse 500, contour 1 px sans remplissage | idem | idem | 48,72 px, blanc plein |
| Titre de chapitre, comtesse.me (mode à plat) | 120 px / 120 px, graisse 500, contour 1 px | idem | idem | 48,72 px, blanc plein |
| Position du titre, référence | x = 192, 208 px sous le haut du chapitre | x = 337 | x = 657 | x = 16 |
| Position du titre, comtesse.me | x = 226, 128 px sous le haut du chapitre (titre sur deux lignes) | non relevé | non relevé | x = 36 |

**Délai du premier chapitre.** Sur la référence, le premier chapitre porte une marge haute `--f26-first-delay`, fixée par le script du site. Elle ne dépend que de la hauteur de fenêtre : 368 px à 700, 554 à 900, 687 à 1 080, 954 à 1 440 ; aucune sur mobile. comtesse.me ne la définissait pas : le grand titre arrivait donc 554 px trop tôt (visible dès 340 px de défilement). Correction : loi ajustée sur ces quatre mesures (`0,74 × hauteur − 112 px` à partir de 900 px ; `554 px − 0,93 × (900 px − hauteur)` en dessous), en CSS dans `index.html`. La loi entre 700 et 900 px ne repose que sur deux points.

**Couleurs de fond par chapitre** (attribut `data-html-in-canvas-colour` et pixel relevé à l'écran, identiques) : bleu `#051DAA`, violet `#7000A9`, rose `#B2005B`, orange `#B03400`, bleu, vert `#00632E`, rose, violet, orange, vert, ardoise `#0F0F0F`. comtesse.me suivait les rangs 8, 9, 10, 11 (violet, orange, vert, ardoise). Correction : les chapitres suivent maintenant l'ordre de la référence depuis le début : Projets professionnels en bleu, Parcours et compétences en violet, Mondes et jeux en rose, Blog et contact en ardoise.

**Étoile du titre en mode à plat** (capture de la référence à 1 440 × 900, défilement au haut du chapitre + 450 px, et capture fournie par Mathieu) : grand titre plein blanc, foyer carré blanc à droite du titre, une quinzaine de branches fines partant surtout vers la droite et le haut, vignettes blanches cadrées au bout de certaines branches, deux branches plus claires. Reconstruit dans `refonte/theme-stars.js` (chapitres et thèmes). Les longueurs, l'épaisseur exacte et les durées d'animation des branches de la référence n'ont pas été mesurées : valeurs estimées sur capture.

## Comparaisons produites

Captures côte à côte référence / comtesse.me à 1 440 × 900 pour les états : arrivée, 340 px, 815 px, haut du premier chapitre − 40 px, + 450 px, + 1 350 px. Elles restent hors dépôt (visuels de tiers) ; le script de relevé est reproductible.

## Non mesuré pendant cette session

Trajectoires et durées des animations, états de survol, curseur, matériaux vitrés, densité exacte du graphe, mode expo de la référence, angle apparent des cadres. Pour ces points, les seules mesures disponibles sont celles de la PR #208 (bandeau, commandes, liens, cartes planes) et de la PR #203 (titres : 120 px de référence contre 15 à 22 px visibles, docs/v9/).
