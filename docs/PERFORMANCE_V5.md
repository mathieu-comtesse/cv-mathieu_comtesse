# Performance V5 : état des mesures et des corrections

Périmètre de cette itération : fiches projet (`projet-*.html`, moteur `refonte/post.js` + `refonte/m3d/`) et surcouche magie. L'accueil (chemin WebGL vers Canvas2D de `index.html`, `mesh-gpu.js`) est instrumenté (`?diag=copy:off`) mais **pas encore mesuré ni modifié**.

## Ce qui est mesuré, et ce qui ne l'est pas

| | état |
|---|---|
| Mesures SwiftShader (rendu logiciel, CPU) | faites : 3 répétitions, desktop, `docs/profil/` |
| Mesures sur GPU matériel | **non faites** : aucun GPU dans l'environnement. Outil prêt : `tools\profil-gpu.cmd`, procédure `docs/profil-gpu.md` |
| FPS 60 / 30 | **aucune conclusion** : les intervalles SwiftShader mesurent le CPU qui simule le GPU |
| WebGPU de l'accueil, WebKit, tactile réel, perte de contexte WebGL | non vérifiés |
| Mémoire après 30 cycles, réponse à la molette, chargement progressif, bus à priorités, gouverneur adaptatif | non traités dans cette itération |
| Scene smoke (lecteur de musique de la pièce personnelle) | hors périmètre, échec connu conservé tel quel dans la PR |

## Hiérarchie des coûts observée (SwiftShader uniquement, médianes de 3 passes)

Le JavaScript reste à 1 % du temps du fil principal. Le reste est de la rastérisation logicielle.

| isolation | repos | magie | lecture |
|---|---|---|---|
| machine non rendue | 617 vers 150 ms | 833 vers 233 ms | le rendu de la machine domine (en logiciel) |
| fond statique (`bg:static`) | 617 vers 417 | 833 vers 567 | le fond blueprint redessiné à chaque image coûte |
| sans ombre (`shadow:off`) | 617 vers 517 | 833 vers 650 | la passe d'ombre pèse |
| animations CSS coupées (`fx:anim`) | 600 vers 450 | 800 vers 533 | une animation CSS permanente coûte |
| filtres CSS coupés (`fx:filter`) | 600 vers 600 | 800 vers 617 | un filtre agit surtout pendant la magie |
| flous d'arrière-plan (`fx:blur`) | aucun | aucun | écarté |
| grain CSS (`grain:off`) | aucun | aucun | hypothèse réfutée |
| `dpr:1` | aucun | aucun | sans effet (le navigateur de test est déjà à 1) |
| flottement des CTA (`float:off`) | 550 vers 467 | pas de gain | confirmé au repos |

Ces hiérarchies ne sont pas transposables telles quelles au GPU : en matériel, le remplissage de pixels coûte beaucoup moins, les passes plein écran et les draw calls comptent autrement. **Si la mesure GPU ne reproduit pas cet ordre, les priorités sont à revoir.**

## Corrections livrées (chacune liée à un coût mesuré ci-dessus)

1. **Fond blueprint** (`refonte/blueprint-hero.js`) : il n'est plus redessiné à chaque image. Il l'est si la caméra ou l'assombrissement changent, sinon à 12 Hz (le grain de film du shader). Visuel : le grain change 12 fois par seconde au lieu de 60.
2. **Assombrissement du fond en magie / explorer** : le filtre CSS `brightness` appliqué à un canvas WebGL redessiné (passe plein écran supplémentaire) est remplacé par un uniform de shader `uDim`, mêmes valeurs (0,8 en magie, 0,88 en explorer et démo), transition adoucie sur environ 0,5 s. La saturation 1,05 est abandonnée (imperceptible).
3. **Carte d'ombre de la machine** (`refonte/m3d/index.js`) : recalculée une image sur deux (toujours recalculée pendant la magie). L'ombre suit avec 16 ms de retard.
4. **Flottement des CTA** (`refonte/ui-premium.css`) : 3 cycles puis immobile, au lieu d'une animation infinie.

## Avant / après (SwiftShader, desktop, 3 répétitions, médianes)

Tableau complet : `docs/profil/comparaison-logiciel.md`. Extraits :

| scénario | mesure | avant | après |
|---|---|---|---|
| repos | médiane | 616,7 ms | 550 ms |
| défilement | médiane | 566,7 ms | 516,7 ms |
| magie | médiane | 833,3 ms | 583,3 ms |
| magie | P95 | 850 ms | 650 ms |
| explorer | médiane | 683,3 ms | 616,6 ms |
| explorer | P95 | 816,6 ms | 683,3 ms |
| magie vers machine | durée | 2975 ms | 1709 ms |
| construction machine | durée | 645 ms | 533 ms |

À lire avec prudence :
- Le nombre d'intervalles supérieurs à 100 ms n'est pas comparable : en logiciel toutes les images dépassent 100 ms, et le nombre d'images par fenêtre de 4 à 6 s varie avec leur durée.
- « Ouverture de la magie » passe de 2875 à 3631 ms : mesure unique par passe, bruit probable, non conclu.
- Un gain en logiciel n'est pas un gain GPU.

## Rapport de rendu par machine (compteurs, `tools/audit-draw-calls.mjs`)

`docs/profil/draw-calls.json`. Appels de dessin par image (ombre incluse) / meshes / géométries uniques / matériaux uniques :

| machine | appels | meshes | géom. | matériaux | triangles |
|---|---|---|---|---|---|
| gares | 482 | 161 | 98 | 41 | 28 530 |
| vrestudio-musicbox | 233 | 244 | 209 | 57 | 27 532 |
| moteur | 194 | 154 | 145 | 36 | 25 818 |
| powerbi | 149 | 108 | 80 | 43 | 9 324 |
| cerfa | 121 | 140 | 140 | 51 | 10 252 |
| vm | 122 | 126 | 126 | 54 | 8 162 |
| vre | 106 | 107 | 107 | 62 | 13 440 |
| suivi | 101 | 100 | 100 | 60 | 18 606 |
| finance | 92 | 93 | 93 | 42 | 20 404 |
| pp | 85 | 88 | 88 | 38 | 6 702 |
| studio | 85 | 88 | 87 | 41 | 11 292 |

Constats : presque tous les meshes ont une géométrie propre (peu de répétition exploitable par instanciation), 50 à 190 meshes projettent une ombre (la passe d'ombre double donc une grande part des appels, ce qui justifie la correction 3). **Gares est atypique** : 482 appels pour 161 meshes, soit environ 3 appels par mesh, hypothèse non vérifiée : pièces transparentes double face (deux passes) ou doubles rendus ; à examiner en premier avec les traces GPU.

## Non-régression (cette itération)

- `tools/test-machines.mjs` : les onze machines se construisent et leurs commandes sont valides.
- `tools/test-ux.mjs` : voir la PR.
- Workflows GitHub : voir la PR ; l'échec connu de Scene smoke (lecteur de musique) reste visible.

## Prochaines étapes, dans l'ordre

1. Lancer `tools\profil-gpu.cmd` sur le PC Windows, joindre `docs\profil\<date>-materiel\` : confirme ou renverse la hiérarchie.
2. Mesurer le chemin WebGL vers Canvas2D de l'accueil (`copy:off`).
3. Gares : comprendre les 482 appels.
4. Chargement progressif de la machine, priorités du bus d'images, mémoire sur 30 cycles : à concevoir une fois les coûts GPU connus.


---

# V6 et V7 : ce qui est mesuré, implémenté, retiré, restant

## Comparatif à environnement identique (SwiftShader, desktop, `moteur44`, 3 répétitions, médianes, intervalle entre images en ms)

| scénario | V3 (avant tout) | V5 | V6 (tête de branche) | lecture |
|---|---|---|---|---|
| repos | 616,7 | 550,0 | 633,3 | V5 à V6 : +15 %, dans la dérive observée entre sessions pour un même code (550 à 633) : **aucun gain V6 démontré** |
| défilement | 566,7 | 516,7 | 550,1 | idem |
| magie | 833,3 | 583,3 | 683,3 | gain V3 vers V6 de 18 %, mais V6 moins bon que V5 sur cette mesure |
| explorer | 683,3 | 616,6 | 633,3 | stable |
| construction machine | 645 | 533 | 494 | stable |
| magie vers machine | 2975 | 1709 | 2661 | non conclu (mesure unique par passe, forte variance) |

Sources : `docs/profil/avant-logiciel`, `apres-logiciel`, `v6-logiciel`, `comparaison-v5-v6-logiciel.md`. **Il n'existe pas de colonne V7 de performance** : V7 n'a, à ce stade, apporté que des correctifs de tests et de CI, pas de changement de rendu. Tout le tableau est en rendu logiciel : aucune cadence GPU n'en est déduite.

## Mesuré
- Hiérarchie des coûts en logiciel (voir plus haut) ; le grain CSS et les flous d'arrière-plan sont écartés.
- Gares : 482 appels de dessin dus à 64 palettes à matériaux multiples (6 groupes chacune). Après correction : 290 appels, 28 530 triangles identiques, rendu comparé visuellement (`docs/profil/gares-avant-apres.png`, écart moyen d'image 2,5 sur 255, dû à l'animation).
- Bus d'images : banc `tools/test-frame-bus.mjs` (8 vérifications : 60 / 130 / 260 / 540 ms injectées comptées, reprise d'onglet non comptée, baisse de qualité sous charge, remontée lente sans oscillation, 4 s minimum entre changements, tâches différées).

## Implémenté
- Bus : plus aucun intervalle écarté ; P95 / P99 sur 240 images ; gouverneur à hystérésis ; `defer()`.
- Palettes de Gares à 3 groupes.
- Chemin WebGL vers Canvas2D de l'accueil : temps CPU de préparation, de `renderer.render()` et de `drawImage()` accumulés dans `window.__cvGpu` (ne sont pas des durées GPU) ; clé de matériau numérique (plus de chaîne par pièce et par image). **Aucune mesure sur l'accueil à ce jour** (les modules CDN sont bloqués ici).
- Outil de profilage à trois états (matériel / logiciel / inconnu), variantes alternées, 5 répétitions par défaut en GPU, menu du lanceur.

## Retiré
- Ombre « à la demande » par signature des matrices (V6) : aucun gain mesuré, fragile (instances, géométries dynamiques, visibilité). Retour à une mise à jour déterministe une image sur deux.

## Tests (état)
- `test-custom-scene` (job `runtime`) : échec CI dû à un défaut du **test** (la première iframe de la page est devenue celle du lecteur de fiche, pas celle de shupi). Sélecteur corrigé, test réussi en local (exit 0). Verdict CI à lire.
- `test-ux cerfa` : réussi en local (4 sur 4). L'échec CI de `cerfa mobile` (glissement du tiroir) n'a pas de cause de site identifiée : geste du test rendu plus proche d'un doigt (appui, 10 étapes, relâchement). **Pas de preuve que c'était une intermittence** ; verdict CI à lire.
- `test-machines` : 11 machines OK. `test-frame-bus` : 8 sur 8.

## Validations restantes
GPU matériel (toutes mesures), accueil (copie Canvas2D, `copy:off`), WebKit, tactile réel, perte de contexte WebGL, mémoire sur 20 à 30 cycles, réactivité de la molette, préparation progressive des machines.

## Prochaine passe
1. Mesurer l'accueil en isolation (`?diag=copy:off`, `window.__cvGpu`) avant toute modification structurelle, dans le même environnement.
2. Rendus redondants et ressources GPU conservées (cycle de vie des renderers à la fermeture des machines).
