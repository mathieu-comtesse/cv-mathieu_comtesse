# THALEOLITHIC — Revue locale V15

Personnages natifs conservés. Dylan reste le joueur et Mathieu son mentor. Les têtes photographiques et Meshy abandonnées restent hors de cette version.

## Vérifications

- 39 contrôles cinématiques : trajets, prises d’objets, pause, passage du film, caméras, contrôleurs et récompenses.
- 15 contrôles de déplacement : clavier, marche accroupie, saut/réception, entrée de hutte, activité du PNJ, évitement du feu et des obstacles pendant 60 secondes.
- 47 contrôles du duel : cinq critères, erreurs/corrections, commandes tactiles, reprise et récompense unique.
- 8 accidents réels et 11 contrôles de conséquences/scénario ; reprise du film à 9 secondes avec 20 positions restituées sans décalage mesuré.
- Exécutable Windows 0.15.0 : ouverture complète, 20 avatars valides, sauvegarde, retour des commandes et captures réellement rendues. La fenêtre du test est masquée : ses temps de boucle ne constituent pas une mesure de FPS de jeu visible.

## Cinématiques et prises

Le catalogue contient 51 séquences/bibliothèques, dont 38 variantes lançables séparément, huit familles d’accidents et cinq familles d’épreuves du duel. Les 225 clips incluent les adaptations aux différents acteurs ; ils ne correspondent pas à 225 gestes distincts.

Les corps, matériaux, textures, squelettes et proportions natifs sont conservés. Les contrôleurs ordinaires sont suspendus pendant les films puis restaurés. Les trajectoires sont contrôlées contre le sol, les foyers et les colliders. Les prises utilisent des cibles de mains ; les pieds utilisent les cibles IK natives plutôt que les rotations d’os.

La mesure sur le maillage rendu à la pose témoin place la semelle de Dylan à −0,2 mm du terrain et celle du chef à environ 11 mm. Ces valeurs décrivent cette pose, pas toutes les images de toutes les scènes.

La reconstruction conserve la vérification finale comme action du joueur. Un film n’accorde pas sa récompense. L’exposition à la berge et son accident utilisent le site d’observation près de l’eau.

## Voir et jouer

- Galerie : Galerie locale de travail, disponible dans le projet de développement.
- Films : `Videos/C01-THALEOLITHIC-v15.mp4` (42 s), `Videos/C08-THALEOLITHIC-v15.mp4` (28 s), `Videos/Gameplay-THALEOLITHIC-v15.mp4` (12 s).
- Windows : `<project>/Builds/Windows-V15/THALEOLITHIC.exe`.
- Storyboards : `STORYBOARDS.md`. Rapports détaillés : `validation-local-v15.json` et les chemins qu’il référence.

## Limites de cette validation

Les têtes natives ne possèdent pas de mâchoire, d’yeux articulés ou de blendshapes. Cette version anime les corps, la tête et les regards ; elle ne fournit pas une synchronisation labiale ni des voix françaises enregistrées. La musique procédurale et les bruitages du moteur sont présents dans les captures.

Le chantier utilise un montage par phases et une poutre manipulée par deux bâtisseurs. La validation artistique complète reste ouverte.

La machine vérifiée utilise AMD Ryzen 9 7900X 12-Core Processor et AMD Radeon RX 9070 XT. La cible Ryzen 3 7320U / Radeon 610M / 8 Go et les appareils mobiles physiques restent à vérifier. Le build WebAssembly est exécuté dans Chromium à 1280 × 720 et en émulation tactile paysage à 852 × 393 ; le portrait est vérifié à 393 × 852. Le test local transmet les fichiers du build au navigateur par fragments, car les connexions HTTP en boucle locale ne répondent pas dans cette session. La validation publique utilise ensuite le véritable transport HTTPS.
