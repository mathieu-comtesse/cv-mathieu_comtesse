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
