# Expo et mini-jeu : ce qui est validé sans carte graphique, et ce qui exige un GPU réel

État au 20 novembre 2026, branche de la PR 224. Banc de test : Chromium sans tête, rendu logiciel (SwiftShader), sans WebGPU, sans l'API expérimentale « HTML dans le canevas » de la référence. Le moteur de ce dépôt ne dépend pas de cette API : le mode Expo et le mini-jeu s'exécutent sur ce banc, mais leur **aspect et leur fluidité réels** n'y sont pas jugeables.

## Validé sur le banc logiciel (fonctionnel, indépendant du matériel)

| Domaine | Vérification | Outil |
|---|---|---|
| Bascule à plat vers Expo | états intermédiaires (6 relevés), caméra de 89,8° à 30,2°, réversibilité en cours de route, retour exact à la position de lecture, clavier, mouvement réduit, mobile | `tools/test-modes.mjs` |
| Caméra Expo | à la progression 0 la projection coïncide avec la page à 0,01 px ; arrivée à 30,2° ; 55° pour les cadres relevés | `tools/test-modes.mjs`, `tools/test-no-shopify.mjs` |
| Positions des blocs 3D à l'entrée en Expo | indépendantes du défilement d'entrée (défaut de `scrollY` plafonné corrigé) | `tools/test-chapitres.mjs` partie expo |
| Chapitres en Expo | chapitre actif, liste marquée, étoile de chaque chapitre, navigation en défilement doux, 11 sur 11 | `tools/test-chapitres.mjs` |
| Graphe en Expo | 295 nœuds, branches 3D déterministes, courbes et raccords, survol de trajectoire | `tools/test-branches.mjs` |
| Mini-jeu : physique | sauts, tremplins, trous, obstacles, trous noirs, collectes, croissance, chute, relance, arrivée, déterminisme (empreintes), partie complète pilotée | `tools/test-jeu-coeur.mjs` (Node, sans navigateur) |
| Mini-jeu : intégration | entrée progressive, commandes clavier, molette, tactile, saut, chute et relance, partie complète au clavier sans téléportation, résultats, sortie | `tools/test-jeu.mjs` |
| Requêtes externes | 0 requête vers Shopify | `tools/test-no-shopify.mjs --strict` |

## À vérifier sur un navigateur compatible avec un GPU réel

Navigateur de référence : Chrome récent (157 relevé sur la référence) sur une machine à carte graphique matérielle, WebGL2 actif, écran 60 Hz ou plus. L'API « HTML dans le canevas » n'est utile que pour **comparer avec la référence**, pas pour faire tourner ce dépôt.

### Fluidité (mesures chiffrées, à reporter dans `docs/perf/`)

1. Expo, régime établi à 2 498 × 1 319 : temps d'image médian, p95 et p99 (`tools/mesure-fluidite-gpu.mjs`). Valeurs de la PR 210 pour comparaison : environ 6,2 à 7,4 ms de tâche par image.
2. Bascule à plat vers Expo et retour : aucune image de plus de 25 ms pendant les 0,9 s (`tools/profil-gpu.mjs`).
3. **Mini-jeu**, partie complète au rythme réel : temps d'image médian, p95, p99 et nombre d'images perdues, avec la scène chargée au maximum (trou noir et attraction d'objets simultanés). Seuil à viser : p95 sous 16,7 ms. Le rendu du jeu est du canevas 2D par-dessus la scène : environ 400 particules au plus, 8 anneaux et 5 spirales par trou noir.
4. Mémoire : tas JavaScript avant, pendant et après trois parties (aucune fuite attendue ; les particules sont plafonnées à 400).

### Aspect (comparaison visuelle, captures côte à côte à même fenêtre et même résolution)

5. **Verre** : reflet des cadres relevés au survol en Expo. Le reflet de ce dépôt est un dégradé simulé ; sur la référence l'effet est rendu par la carte graphique. Vérifier : présence d'un reflet qui se déplace avec le pointeur, absence de scintillement, coût sous 1 ms par image.
6. **Caméra** : courbe d'accélération de la bascule. Durée fixée à 800 ms d'après la configuration de la référence, courbe de lissage de cinquième ordre déduite et non lue. Mesurer sur la référence, image par image à 60 Hz, la position de la caméra pendant la bascule, et reporter l'écart maximal.
7. **Hauteurs des blocs** : montée à partir de 35 % de la progression (`riseAt`, lu dans la configuration) ; forme de la courbe à mesurer de la même façon.
8. **Mini-jeu, rendu** : lisibilité de la sphère et des mots à 1 440 × 900, 1 920 × 1 080 et 2 498 × 1 319 (les tailles sont celles de la projection de l'Expo : la sphère mesure environ 11 px de rayon au départ sur 1 440 × 900) ; profondeur du trou noir (8 anneaux sous le sol, spirales) ; traînée, étirement au saut, lignes de vitesse. Vérifier l'absence de scintillement des anneaux et de ligne brisée quand un point passe derrière la caméra.
9. **Mini-jeu, entrée et sortie** : continuité visuelle de la caméra entre la position de lecture et le départ (1,8 s), puis du départ à la position de lecture (0,9 s) ; absence de saut au moment où le compte à rebours se termine.
10. **Mini-jeu, ressenti** : à 60 Hz réels, une partie complète doit durer de 1 à 3 minutes (le pilote automatique la termine en 94 s de jeu à accélérateur 0,45) ; vérifier que la vitesse de 420 à 1 500 px/s reste lisible en perspective et que les tremplins et trous sont franchissables à vitesse moyenne sans pilote.
11. **Son** : le son est synthétisé par Web Audio et démarre sur un geste ; vérifier sur casque et haut-parleurs le niveau relatif (collectes, chocs, trou noir, vent), l'absence de clics et le comportement d'iOS Safari (démarrage du contexte audio).

### Tactile

12. Sur téléphone réel : zone de glisser (240 × 68 px au plus) et boutons de 64 px ; latence perçue, absence de défilement ou de zoom parasite de la page pendant le jeu, comportement avec la barre d'adresse mobile.

## Ce qui n'est pas observable même avec un GPU

La référence ne publie que les événements de son interface de jeu (touches `a`, `d`, `z`, `q`, `e`, commande à saisir et glisser, bouton de départ ; session de 36 s dont 25 s de touches ; aucune molette). Ses règles, sa durée de partie et son rendu ne figurent ni dans le journal brut ni dans les captures. Les règles de ce dépôt sont originales.
