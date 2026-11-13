# THALÉOLITHIC V24.4

Le candidat réunit le ruban V24.2, le parcours SST V24.3 et le guidage transversal V24.4. Il part du commit V24.1 `3a7b370` de la branche `perf/thaleolithic-v24`. La durée cible de la campagne reste de 45 minutes.

## Résolution des étapes

Le [résolveur](../Runtime/QuestObjectiveResolver.cs) lit la frontière principale et les conditions de `CampaignRuntime`. Une activité en cours ou un guidage facultatif choisi explicitement peut prendre la priorité à l’écran. Le résolveur conserve le donneur, le référent pédagogique, l’objet d’interaction et le binding de destination dans des champs distincts. Son cache est invalidé par le changement de sauvegarde, la progression, les conditions de quête et les seuils qui changent l’accès à une action.

| Ambiguïté constatée | Correction |
| --- | --- |
| Le joueur pouvait voir un objectif et ouvrir une interaction voisine sans rapport. | Le HUD, la carte, le marqueur et le menu utilisent la même étape résolue. L’interaction privilégie son binding à portée. Les autres actions restent dans le menu du lieu. |
| Le rôle de référent pouvait être confondu avec une destination. | La fiche distingue le donneur, le référent et le lieu. Le SST se lance au Grand Menhir, l’aide de Mathieu reste facultative et la validation se fait auprès d’Aurélien. |
| Les activités montraient une question avant d’expliquer les commandes ou la réussite. | La première ouverture présente un guide court propre au mode. L’activité enregistre que le guide a été lu. Le SST conserve son introduction courte et sa consigne dans le mini-jeu. |
| Le passage d’une décision à sa réalisation, puis à son contrôle, pouvait passer inaperçu. | La consigne et le critère de réussite décrivent chaque transition. Le Carnet expose le niveau de preuve. La fiche de clause ISO affiche l’étape active lorsqu’elle porte sur la notion sélectionnée. |
| Un rechargement quittait l’activité et conservait seulement les réponses. | La reprise rouvre une activité encore valide avec les réponses acquises, même si le PNJ auprès duquel Dylan l’a commencée s’est déplacé. Pour une intervention sur un poste fixe hors de portée, le jeu indique où reprendre. La course d’urgence peut reprendre en cours de trajet. |

Le HUD de déplacement affiche le joystick ou les touches configurées. Le HUD tactile place le titre de quête, l’étape, le lieu et la commande sous les raccourcis du haut, hors de la zone des boutons d’action.

Les dix quêtes, les 24 activités, leurs données de réponse et les transactions de récompense restent pilotées par la campagne existante. Les cinématiques et les trois issues utilisent leurs conditions historiques.

## Ruban et sécurité du trajet

Le contrôleur sépare le trajet visible et le prochain trajet en préparation. Le [rendu](../Runtime/QuestRibbonRenderer.cs) réutilise un mesh dynamique, un filtre et un renderer. Le shader URP dessine un ruban doré de 28 cm, surélevé de 5 cm, avec des bords adoucis. L’extrémité s’atténue et la portion visible est limitée à 45 m. Les trois modes GPS et le contraste réutilisent les préférences existantes. Le matériau reste statique.

Le NavMesh fournit les coins et le relief praticable. Les hauteurs sont échantillonnées sur les surfaces physiques, près du niveau du NavMesh, afin de distinguer terrain et plateforme. Les raccords se resserrent si le bord du ruban sort du couloir praticable. Une fermeture explicite, un obstacle ou une zone dangereuse raccourcit la portion sûre. La carte lit le même trajet validé.

Le premier essai de deux minutes a produit zéro disparition mais 86 recalculs. L’instrumentation a montré que des reconstructions demandées pour les déplacements des PNJ incrémentaient la même révision que les changements de circulation. Le candidat final distingue ces révisions. Une reconstruction liée à un chantier ou à un portail peut toujours déclencher le recalcul.

L’audit Unity final conserve la même route de 24,85 m sur le sol et la carte pendant le recalcul. Le ruban se limite à 0,74 m devant la barrière d’essai, puis revient après son retrait. La reconstruction de maintenance laisse le trajet et son compteur de calculs intacts. Les trois modes, le guidage temporaire et le retour de pause passent les 14 contrôles de l’audit. [Mesures Unity](guidage-v244/gps-unity.json)

## Parcours SST

L’étape ISO 4.4 guide Dylan vers `grand_menhir`, le véritable déclencheur de `V17_SYSTEM`. La touche configurée ou le bouton tactile ouvre l’activité à portée. Le marqueur utilise une tablette pour distinguer l’objet des PNJ. Une courte séquence montre les tablettes, Mathieu et le cycle. Elle peut être passée et n’est plus imposée après la première lecture.

Les quatre questions et leurs bonnes réponses sont inchangées. Les tablettes reliées restent visibles et sont sauvegardées au fur et à mesure. Un clic, un toucher ou un dépôt peut répondre. Après la quatrième réponse, **Valider l’assemblage** termine l’activité. Le GPS pointe alors vers Aurélien pour la vérification de la mission.

## Build WebGL

Unity 6000.2.12f1 termine en 3 min 31 s avec 0 erreur et 25 avertissements dans le rapport de compilation. L’éditeur journalise une exception dans `BuildReportRestService.OnDisable` après compilation et quitte avec le code 0. Les quatre fichiers initiaux pèsent 68 481 538 octets, soit 65,31 Mio et 0,04 % de plus que V24.1. Les deux lots ISO 7 et 8 ont gardé leurs empreintes. Le contrôle WebAssembly/Gzip, les 18 contrôles de rendu et le contrat du pont navigateur–Unity passent. [Résultat Unity](guidage-v244/build-unity.txt)

## Validation de campagne

Le second parcours Unity repart d’une sauvegarde neuve et atteint `FIN_3` en 13 min 35 s. Le pilote utilise les routes du `CharacterController`, ouvre les menus d’action et choisit les réponses connues. Il parcourt 551 m, franchit sept chapitres ISO et valide les dix quêtes et les 24 activités, avec zéro erreur de jeu. Les dix secondes tentatives de réclamer une récompense sont refusées et chaque reçu est unique. Ce parcours teste la progression de la V24.4 avant le dernier ajustement de l’affichage du HUD. [Parcours Unity](guidage-v244/parcours-unity.json)

L’audit contrôle pour chaque activité le chapitre ISO, la quête parente, le donneur, le référent, le lieu, le binding de scène, la consigne, les commandes, le critère de réussite, la récompense et l’étape suivante. Les 24 bindings et leurs références ont été retrouvés dans la scène native. [Audit des 24 activités](guidage-v244/audit-activites.json)

Les 27 contrôles Unity de stabilité couvrent les menus, les verrous de commandes, l’orbite, la collision de caméra, la sortie et la réouverture automatique du SST. Deux états isolés vérifient le choix de `FIN_1` et de `FIN_2` avec leurs cinématiques. Les parcours complets de ces deux fins restent à vérifier. [Stabilité Unity](guidage-v244/stabilite-unity.json)

## Vérification dans Chromium

Sur PC, le SST passe par la touche d’interaction au Grand Menhir, l’introduction, une erreur récupérable, deux réponses enregistrées, le rechargement, un glisser-déposer, la validation et le retour réel vers Aurélien. En tactile émulé, le joueur lance et termine l’activité en touchant les boutons. Le jeu reprend directement à la troisième tablette sans rejouer l’introduction. [Test PC](guidage-v244/sst-bureau.json), [test tactile](guidage-v244/sst-tactile.json), [capture de reprise](guidage-v244/sst-reprise-tactile.png)

Le HUD tactile reste séparé des raccourcis, de l’inventaire et des boutons de déplacement dans les deux fenêtres paysage contrôlées. Les contrôles utilisent les dimensions CSS mesurées par Chromium. [667 × 375](guidage-v244/hud-667.png), [852 × 393](guidage-v244/hud-852.png)

Le tutoriel du périmètre SST s’affiche à la première ouverture. Le test enregistre la première réponse et retrouve la seconde question directement après rechargement. Sur un objectif immobile, le compteur de résolutions reste à 2 pendant les trois secondes contrôlées. [Tutoriel et reprise](guidage-v244/tutoriel-reprise.json), [capture du tutoriel](guidage-v244/tutoriel-premiere-consigne.png)

La marche instrumentée du candidat couvre 25,3 m en 2 min. Le ruban et la carte restent visibles sur les 214 relevés, avec zéro masquage, un calcul initial et 83 révisions du NavMesh pendant la marche. Le calcul initial cumule 26 ms réparties entre plusieurs images. La mise à jour du mesh atteint 1 ms sur les relevés Web, selon la résolution du chronomètre. Le test tactile utilise deux contacts pour déplacer Dylan et tourner la caméra avec le ruban visible. Ces contrôles précèdent l’ajustement final de la largeur du HUD en écran étroit. [GPS bureau](guidage-v244/gps-bureau.json), [GPS tactile](guidage-v244/gps-tactile.json)

Les captures et la vidéo comparent le trajet vers les réserves depuis la même sauvegarde et le même angle de caméra. La vidéo place V24.1 à gauche et V24.4 à droite. [Avant](guidage-v244/avant-trajet.png), [après](guidage-v244/apres-trajet.png), [vidéo](guidage-v244/avant-apres.webm)

Les essais locaux exécutent le vrai WebAssembly. Playwright intercepte les requêtes vers les fichiers du build. Le joystick, les deux contacts et la rotation portrait/paysage sont émulés. La validation sur téléphone physique, les essais avec des joueurs novices, le guidage de nuit et la mesure isolée du GPU restent ouverts. Les relevés de temps d’image incluent le rendu de toute la scène.

## Mesures comparées

Un lancement neuf par version, dans Chromium Windows sur la même Radeon RX 9070 XT. Les essais sont séquentiels. Le P95 du village porte sur 12 secondes après la cinématique d’ouverture. [Relevé V24.1](guidage-v244/bench-bureau-v241.json), [relevé V24.4](guidage-v244/bench-bureau-v244.json)

| Mesure | V24.1 | V24.4 |
| --- | ---: | ---: |
| Accueil prêt | 10,19 s | 9,44 s |
| P95 d’image au village | 11,4 ms | 11,2 ms |
| Pic Wasm au démarrage | 382,4 Mio | 382,4 Mio |
| Quatre fichiers initiaux | 65,28 Mio | 65,31 Mio |

## Fichiers

- [Progression et consignes](../Runtime/QuestObjectiveResolver.cs), [règles des activités](../Runtime/ActivityGuideV244.cs), [données SST](../Resources/CampaignV17.json)
- [Contrôleur GPS](../Runtime/QuestNavigationController.cs), [mesh du ruban](../Runtime/QuestRibbonRenderer.cs), [ancrage au sol](../Runtime/QuestRouteSurface.cs), [shader URP](../Resources/QuestRibbon.shader)
- [Affichage tactile](../Runtime/MobileControls.cs), [journal de quête](../Runtime/TribalQuestView.cs), [introduction SST](../Runtime/QuestSstIntroV243.cs), [vue des activités](../Runtime/ActivityViewV17.cs)
- [Liste complète des changements de la PR #205](https://github.com/mathieu-comtesse/cv-mathieu_comtesse/pull/205/files)

## Reproduction

1. Compile le projet `Unity-Web` avec Unity 6000.2.12f1 et la méthode `CinematicTemperateBuildV19.WebV244`. Copie le candidat via `node tools/stage-thaleolithic-build.mjs <build> <site> V24.4`. Pour l’ouvrir depuis ce dépôt, lance `node tools/serve-thaleolithic-qa.cjs` et ouvre l’adresse locale imprimée.
2. Lance `node tools/test-unga-publication.mjs`, `node tools/test-thaleolithic-render-budget.cjs` et `node tools/test-thaleolithic-bridge.mjs`.
3. Lance `node tools/test-thaleolithic-browser.cjs --real` avec `THALEOLITHIC_SST_SAVE` pointant vers la sauvegarde avant `V17_SYSTEM`. Ajoute `--touch` pour l’émulation tactile. Le script reprend dans IndexedDB et utilise les commandes du jeu. Pour vérifier la reprise d’un tutoriel générique, utilise la sauvegarde avant `V17_SCOPE` avec `THALEOLITHIC_SCOPE_GUIDE=1`.
4. Pour suivre le ruban, utilise la même sauvegarde avec `THALEOLITHIC_GPS_TRAVEL=stockage` et `THALEOLITHIC_GPS_WALK_SECONDS=120`. Le diagnostic expose le trajet, le temps de calcul, le coût du mesh, les révisions et les masquages.
5. Pour le parcours Unity complet et l’audit des bindings, lance `-executeMethod UngaBunga45001.TemperateJourneyV19.RunV24Audit -thaleolithicJourneyV244` dans le projet natif. Le contrôle du ruban utilise `-executeMethod UngaBunga45001.QuestGpsAuditV243.RunAudit -thaleolithicGpsAuditV243 -gpsReport <chemin-JSON>`.

## Corrections des interactions du 13 novembre

- **Charpente tombée**. La portée suit les débris et l’inspection active se lance avec E ou « Examiner ». La preuve est enregistrée dans la sauvegarde.
- **Passages**. Les contrôleurs des PNJ laissent passer Dylan. L’audit Unity teste la traversée d’un PNJ, puis l’arrêt devant un obstacle du décor.
- **Questionnaires**. Les quatre catégories du transat sont définies à côté des réponses. La surbrillance jaune-orange suit le choix. Les flèches déplacent la sélection et Entrée la valide. Lorette reste face à Dylan pendant les questions.
- **Grand Menhir**. Le lancement ferme le panneau. Le chantier avance sur place, puis les trois contrôles font passer l’installation au niveau 1. Un chantier déjà lancé reprend depuis son état sauvegardé.
