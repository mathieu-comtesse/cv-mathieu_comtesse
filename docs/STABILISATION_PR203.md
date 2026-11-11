# Stabilisation de la PR #203 : job `runtime`

État au commit `955e143d` (tests corrigés) ; mesures CI faites sur `c49121af` (PR) et sur deux branches de diagnostic temporaires issues de `main` (`diag/main-runtime-full`, `diag/main-app-pr-tests`), mêmes versions (Node 24, Playwright 1.62.1, Chromium) et mêmes ressources (runner `ubuntu-latest`). Rendu logiciel : aucune conclusion de performance GPU.

## Méthode
1. `main` brut + workflow de la PR (`if: !cancelled()` sur chaque test) : run 42885551771.
2. Application de `main` + tests et workflow de la PR : run 42890111800.
3. PR `c49121af` : run 42861… (avant) et 42885557543 (même moment que 1 et 2).
Les tests chargent `accueil.html` (route `/` du banc) : ni `accueil.html`, ni `js/`, ni `style.css`, ni `info.html` ne sont modifiés par la PR. Le seul fichier partagé modifié est `refonte/rf.css` (retrait du CSS de la magie, restylage des boutons de fermeture).

## Résultats des 14 tests (échec = F)
| # | test | main brut | main + tests PR | PR (run 1 / run 2) |
|---|---|---|---|---|
| 1 | test-v52 | F (attente `ROOM_READY`) | F | F / F |
| 2 | test-v49-mobile-book | F (attente) | F | F / F |
| 3 | test-v49-seat-book | F (attente) | F | F / F |
| 4 | test-v49-features | F (attente) | F | F / F |
| 5 | test-v51-interactions | F (attente) | F | F / F |
| 6 | test-film-book-v50 | OK | OK | OK / F (capture 30 s) |
| 7 | test-ps1-v50 | F (attente) | F | F / F |
| 8 | test-scene-runtime | F (attente) | OK | OK / OK |
| 9 | test-user-room-props | F (attente) | F | F / F |
| 10 | test-scene-lifecycle | F (attente) | F | F / F |
| 11 | test-project-scroll | F (`.process-gallery`) | F | F / F |
| 12 | test-annual-gains-browser | F (`footer .credits`) | F | F / F |
| 13 | test-motion-fit | F (attente) | OK | OK / OK |
| 14 | test-custom-scene | F (attente) | OK | OK / OK |

Constats : (a) `main` brut échoue sur 13 tests sur 14, la plupart par un délai d'attente de la pièce : le sélecteur `iframe` de `tools/scene-test-profile.mjs` visait la première iframe (sans `src`) au lieu de celle de shupi ; la correction de la PR (sélecteur `iframe[src*="shupi"]`) répare les tests 8, 13, 14 et fait avancer les autres (**anomalie B de `main`, corrigée par la PR**). (b) Application de `main` + tests de la PR : les mêmes 10 tests échouent avec les mêmes messages que la PR : **aucun de ces échecs n'est une régression de l'application introduite par la PR** (catégorie A non établie). (c) Test 6 intermittent (échec une fois sur la PR, réussite sur les autres runs).

## Classification des 10 échecs (preuves)
| test | cause racine démontrée | classe | état |
|---|---|---|---|
| v52 (titre PS1) | `Atlas du parcours` n'est pas une entrée de `js/data.js` (2e = `Contrôle de ligne`) | C | corrigé : titres lus depuis `js/data.js` |
| v52 (objet immobile) | variation d'échelle 0,008 à 0,023 sur une fenêtre de 720 ms, intermittente (réussite 5 fois sur 6 en local, échec en CI sur `main` + tests PR aussi) | B (intermittent) | cause non établie ; message détaillé ajouté |
| mobile-book (sélecteur) | 3 canvas dans la boîte (six boîtes partagent `film-album`) | C | corrigé |
| mobile-book (pincement) | le pincement passe en mode `free` et agrandit le canvas (181 vers 520 px) mais `view.tZoom` revient à 1 | à établir | ouvert |
| seat-book | même sélecteur ; suite bloquée ensuite par `.process-gallery` absent de `accueil.html` | C puis voir project-scroll | sélecteur corrigé |
| v49-features | les feuilles tombantes ne s'animent que si `vista.visible` ; la vue du jardin ne s'ouvre qu'avec le rituel du thé, désactivé sur l'accueil (`createRoom(..., {noTea:true})`) | C probable (à prouver avec le test de remplacement) | ouvert |
| v51 | `info.html` est une redirection (267 octets) vers `experiences.html` : plus de portrait 3D ; six boîtes `film-album` ; bulle intermittente (écart 127 px vs 34 px, 2 échecs sur 4 exécutions locales, aucun sur `main`) | C pour la page et le sélecteur ; B intermittent pour la bulle | test réécrit, passe localement ; état journalisé |
| ps1-v50 | `createRetroSet` exige `powerModel` (`createPowerParts`) depuis la v61 ; le banc ne le fournit pas | C (API) | corrigé : le banc charge `assets/power-plugs.glb`, le test passe |
| user-room-props | `installation.bar && GPU.replacement==='RTX2080ti'` faux | à établir | ouvert |
| lifecycle | pastille musique masquée hors lecture (`.mpill:not(.on){display:none}`) ; puis « No seeded landing clouds » : la poussière n'est visible qu'en marche / course (`native-room.js:282`) | C pour la pastille ; à établir pour la poussière | ouverture du tiroir corrigée, suite ouverte |
| project-scroll | `.process-gallery` absent de `accueil.html` (créé par `js/project-dioramas.js`, non chargé) | à établir (test de remplacement requis) | ouvert |
| annual-gains-browser | `.annual-gains` et `footer .credits` absents de `accueil.html` ; `.annual-gains` existe dans `index.html` | à établir (test de remplacement requis) | ouvert |

## Règles tenues
Aucun test supprimé, aucune assertion affaiblie ; les attentes de temps remplacées par des attentes d'état ; chaque changement de contrat est documenté dans le test (ancien contrat, contrat actuel).

## Mise à jour (commits suivants)
Tests passés au vert en local après réécriture documentée (ancien contrat, contrat actuel, justification dans le fichier de test) :
| test | contrat remplacé | preuve |
|---|---|---|
| test-annual-gains-browser | tirelire de `gains.html` (la route « / » servait `accueil.html`) ; bilan calendaire et reprise annuelle retirés (`js/home.js` plus chargé) ; rotation par les règles (`rf-tabview`) ; attribution CC BY 4.0 de la tirelire remise dans le pied de page de `gains.html` | `PIG_CALENDAR_RESPONSIVE_OK` |
| test-project-scroll | la galerie `.process-gallery` n'existe plus (`initProjectDioramas` n'est appelée par aucune page) ; remplacé par : images des vitrines des cadres chargées et restant dans leur cadre pendant le défilement (18 images observées) | `PROJECT_IMAGES_ATTACHED_OK 18` |
| test-v49-seat-book | galerie retirée ; album photo ciblé parmi six boîtes `film-album` | `SEAT_BOOK_OK` |
| test-v49-mobile-book | pincement : l'accueil remet le zoom à 1, 700 ms après le relâchement (`lockView`, `refonte/main.js`) : zoom contrôlé doigts posés puis retour à 1 ; bord gauche = règle « Incliner » ; page Expériences ; galerie retirée | `V49_OK` (2 exécutions) |
| test-user-room-props | extras glTF non embarqués depuis la compression des modèles (3-4 novembre) : remplacement `RTX2080ti` lu dans la provenance versionnée | `SUPPLIED_ROOM_PROPS_OK` |
| test-v49-features | pièce sans thé (jardin masqué, 0 arbre, feuilles non animées hors vue) ; dialogue des projets, courriels de la finance et cartes Power BI retirés (code non servi) | `FEATURES_OK` |
| test-v52, test-v51-interactions, test-ps1-v50 | voir plus haut | CI `7984b66e` : réussis |

Restant : `test-scene-lifecycle` (nuages d'atterrissage : cause non établie ; la règle de `js/native-room.js` n'affiche la poussière qu'en marche ou en course, le test lit les enfants du groupe) ; intermittents non expliqués : objet « immobile » de `test-v52`, bulle de pensée de `test-v51`, capture de `test-film-book-v50`.

**Défaut réel trouvé** : plus aucune attribution des modèles tiers sous licence CC BY sur le site depuis la refonte du 20 octobre (prises BlackCube, clé ZwiebelGames, manette Sony, PS1 Lars Maes ; texte d'origine : `git show cb94f8bd^:index.html`). Seule la tirelire est restaurée (gains.html). Emplacement des autres à décider.

## Résultat CI final (run 43077777019, commit `b26e9823`, durée 43 minutes, limite du job relevée de 45 à 80 minutes)
Le run précédent (`b6ad62d8`) avait été annulé à 45 minutes pile : la suite complète, avec les 14 tests exécutés à la suite, dépasse l'ancienne limite.

| # | test | CI `b26e9823` |
|---|---|---|
| 1 | test-v52 | réussi |
| 2 | test-v49-mobile-book | réussi |
| 3 | test-v49-seat-book | réussi |
| 4 | test-v49-features | réussi |
| 5 | test-v51-interactions | réussi |
| 6 | test-film-book-v50 | réussi (captures à 120 s) |
| 7 | test-ps1-v50 | réussi |
| 8 | test-scene-runtime | réussi (attente de l'état réel des images) |
| 9 | test-user-room-props | réussi |
| 10 | test-scene-lifecycle | **échec** : `evidence.soundPaused.every(w=>w.scale[1]===1)` : la pulsation des caisses JBL n'était pas retombée 250 ms après la pause (attente fixe) ; corrigé par une attente de l'état réel (échelle 1), réussi en local |
| 11 | test-project-scroll | réussi |
| 12 | test-annual-gains-browser | réussi |
| 13 | test-motion-fit | réussi |
| 14 | test-custom-scene | réussi |
Jobs `syntax` : réussi.

Les attentes fixes remplacées par des attentes d'état réel pendant cette stabilisation : images rendues (`scene-runtime`), retombée de la pulsation JBL (`lifecycle`), capture à 120 s (`film-book-v50`). Les intermittences de `test-v52` (objet « immobile », mesure d'échelle sur une fenêtre de 720 ms) et de la bulle de pensée de `test-v51` sont du même type (mesure sur fenêtre fixe, cadence variable) : non reproduites sur les 3 derniers runs CI, cause non établie.
