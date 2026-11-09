# THALÉOLITHIC V23.1

Base de travail et site contrôlé le 9 novembre 2026. La branche V22.1 est à `f460deb3959fb7fb383448e3d5257ee88d9ce025`. Le `main` vérifié avant modification est à `90f6b5d5655ce46eb563e90f466f04bcebdb1765`. Le site sert V22.1 et ses quatre empreintes correspondent à `game-config.json`. Le code source GitHub était en retard sur le binaire. Cette branche resynchronise les scripts et données de la campagne qui servent au build Unity 6000.2.12f1.

| Anomalie | Cause ou constat | Correction et vérification |
| --- | --- | --- |
| Démarrage | L’accueil se fermait dès l’envoi de `BeginGame`. La cause du plantage sur téléphone physique reste inconnue. | `browser-bridge.js` attend un accusé corrélé de `MobileBrowserBridge.cs`. Test Chromium simulé avec erreur et réessai sur une instance. Vrai WebAssembly lancé sous Windows avec clavier et tactile émulé. |
| Réglages et commandes | Les menus, la visibilité et l’orientation utilisaient le même état de pause. Les films pouvaient réactiver les commandes directement. | `CampaignRuntime.cs` réconcilie les verrous indépendants. Test navigateur et Unity de 20 cycles. Une fermeture pendant la perte de focus conserve le verrou approprié. |
| Caméra | Le moteur cherchait jusqu’à six angles alternatifs en présence d’un obstacle. | `ThirdPersonMotor.cs` garde l’axe et rapproche la caméra, puis l’éloigne progressivement. Unity a mesuré 1 288° continus et testé un mur de référence. |
| Tactile | Les états portrait et arrière-plan capturaient une valeur de pause qui pouvait devenir périmée. | `MobileControls.cs` utilise des verrous dédiés. Chromium a exécuté deux contacts simultanés et une rotation portrait → paysage. |
| Assemblage SST | Au premier glisser-déposer, Unity a levé une `MissingComponentException` sur le `CanvasGroup` de la tablette. La dernière réponse terminait aussi l’exercice avant le bouton de validation. | `ActivityViewV17.cs` déclare le composant requis. `CampaignActivitiesV17.cs` valide explicitement les pièces, conserve les pièces sauvegardées et restaure le GPS. Dépôt faux, dépôt correct, sortie, réouverture, rechargement et validation unique testés dans Unity. |

La validation locale comprend la compilation WebGL, le contrat des cinq messages, les 18 vérifications de budget graphique et les tests de publication des empreintes et du WebAssembly. L’environnement Unity requiert le projet local `Unity-Web` et ses assets natifs. Le site conserve le build précédent à côté du nouveau pour faciliter le retour arrière.

## Rejouer la validation

1. Exécute `node tools/test-unga-publication.mjs`, `node tools/test-thaleolithic-render-budget.cjs` et `node tools/test-thaleolithic-bridge.mjs`.
2. Exécute `node tools/test-thaleolithic-browser.cjs`, puis ajoute `--real` pour le vrai WebAssembly ou `--real --touch` pour le tactile émulé.
3. Dans l’éditeur Unity, lance `-executeMethod UngaBunga45001.Editor.StabilityRegressionV23.RunAudit -stabilityReport <chemin-JSON>` sur `Unity-Web`. Le test isole sa sauvegarde.
4. Sur iPhone, Android et Mac, vérifie le lancement, la première interaction avec Mathieu, l’orbite, les réglages, le retour après interruption et la sortie/reprise du SST. En cas d’échec, exporte le diagnostic intégré.
5. Après autorisation de publication, contrôle sur le site que `game-config.json` affiche V23.1 et que ses quatre fichiers répondent avec les empreintes attendues, puis lance une partie et recharge sa sauvegarde.

Les tests physiques iPhone, Android et Mac ainsi que les trois fins de la campagne entière restent à exécuter sur cette version. Aucun déploiement de V23.1 n’a été effectué.
