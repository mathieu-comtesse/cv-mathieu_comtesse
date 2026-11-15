# Fall 26 : relevé des transitions et étalonnage vidéo

Source : `Video Project 5.mp4`, fourni pour la refonte comtesse.me.
Vidéo 1 920 × 1 080 à 30 i/s, avec un enregistrement portrait de la page occupant environ les colonnes 654 à 1265, soit un recadrage utile de 612 × 1 080.
Les positions ci-dessous sont normalisées sur ce recadrage, non sur les bandes noires.
Ces valeurs sont des lectures approximatives de captures vidéo compressées, et non des valeurs extraites du moteur Shopify.

## Foyers entre chapitres

| Image | Foyer entrant | Foyer sortant | Observation |
|---|---|---|---|
| 4,5 s | ≈ (0,48 W, 0,49 H) | — | Première constellation déployée au-dessus du titre |
| 5,0 s | ≈ (0,49 W, 0,50 H) | — | Libellé Agentic vers 0,14 W / 0,79 H |
| 12,0–12,5 s | ≈ (0,54 W, 0,42 H) | ≈ (0,49 W, 0,72 H) | Deux foyers distincts dans le même écran |

La version précédente de comtesse.me plaçait deux constellations au même foyer pendant le fondu, doublant visuellement la densité du graphe. La nouvelle fonction `chapterStarAnchor` sépare les centres et les ramène aux positions naturelles aux bornes de la transition.

## Couleur de passage bleu → violet

Mesures d'une ligne de pixels dégagée près de la droite de la capture utile (`Video Project 5.mp4`). Couleurs sujettes à compression et exposition de l'enregistrement.

| Image | Haut (y ≈ 50) | Centre (y ≈ 500) | Bas (y ≈ 950) |
|---|---|---|---|
| 11,5 s | #031DA8 | #031DA8 | #031DA8 |
| 12,0 s | #261AAA | #5211A9 | #181BAA |
| 13,0 s | #6503A8 | #6D00A9 | #6405A7 |
| 14,0 s | ≈ #6F00A5 | ≈ #6F00A5 | ≈ #6F00A5 |

À mi-transition, une bande centrale violette est davantage avancée que les bords supérieur et inférieur. Un simple `background-color` interpolé uniformément est donc insuffisant. `chapterColourWave` calcule trois arrêts chromatiques pilotés par la même horloge de défilement que les étoiles. Les couleurs terminales restent exactes.

## Vue Expo

La vidéo `ssstwitter.com_1793548155425.mp4`, 3 024 × 1 898, ≈ 15,5 s, montre des surfaces et un quadrillage majoritairement très sombres, avec des cadres fins, des encarts en perspective et des couleurs ponctuelles de chapitre (dont du vert vers 13–15 s).
Cette séquence ne suffit pas, à elle seule, pour établir un nuancier permanent propre à chacun des onze chapitres. Il faut comparer les mêmes instants et sections, en tenant compte de la perspective, avant de changer globalement le nuancier du moteur.

## Recette ouverte

1. Capturer la refonte aux positions de fondu 25 %, 50 % et 75 % à 1 440 × 900, en modes à plat et Expo.
2. Vérifier deux foyers distincts à 50 % et le remplissage des titres.
3. Comparer la bande de couleur à des pixels de la vidéo, sur des scènes réellement correspondantes.
4. Mesurer les dimensions projetées des trois cadres Expo, la profondeur, l'opacité et les mouvements du curseur.
5. Ne déclarer aucun rendu pixel-perfect sans tests visuels sur les deux sources et sur GPU matériel.

Aucune ressource, script, maillage ou police de Shopify n'est réutilisé dans cette reconstruction originale.
