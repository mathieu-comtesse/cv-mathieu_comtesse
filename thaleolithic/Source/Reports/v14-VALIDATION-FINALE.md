# THALEOLITHIC 0.14.0 — validation du 26 octobre 2026

Les neuf personnages utilisent leurs têtes et portraits natifs. L'incorporation de visages personnalisés a été abandonnée. Les essais sont archivés hors des projets actifs et ne sont pas inclus dans cette publication.

## Comportement livré

- Accueil : la mention sous le titre est exactement « ISO 45001 ».
- Détection des Radeon intégrées 610M/620M et machines avec 8 Go de RAM : profil économe automatique, objectif de 30 images/s. Le navigateur limite le framebuffer à 1280 × 720 en paysage dans ce profil et en mode automatique.
- Distance d'affichage, terrain, végétation, ombres et aperçus 3D allégés. Résolution adaptative en mode automatique, avec temporisation et exclusion des longues images d'onglet en arrière-plan.
- Recherches d'objets et de structures mises en cache ; déformation de la végétation limitée aux acteurs proches. Protection du calcul de carte avant la première mise en page.
- Windows utilise la même scène URP que la version Web. Le projet HDRP source reste conservé séparément.

## Contrôles

- 37 contrôles de régression de campagne, films et sauvegardes : réussis.
- 13 contrôles de qualité, RenderTextures et projection de carte : réussis.
- 18 contrôles Node du budget de pixels et du texte d'accueil : réussis, ajoutés à GitHub Actions.
- Windows réel : 122 contrôles réussis (15, 47, 60), en sauvegarde isolée. Les déplacements, sauts, accroupissements, huttes, évitement du feu, quêtes et duel sont exercés.
- Navigateur Chromium avec accélération AMD réelle : introduction complète, déplacement clavier de 7.23 m, inventaire, sauvegarde/reprise et écran tactile émulé 844 × 390. Aucune erreur JavaScript/console pendant ce parcours. L'émulation ne certifie pas un téléphone physique.
- Builds Web et Windows : réussis, zéro erreur de compilation ; respectivement 27 et 26 avertissements conservés dans les journaux. Les ressources extraites comportent encore des avertissements de démarrage ; zéro erreur dans les suites de jeu ne signifie pas zéro avertissement au lancement.
- Paquets Web : signatures WebAssembly, décompression Gzip, hachages de cache, JavaScript, illustration et redirections historiques vérifiés.

## Mesures

Machine mesurée : AMD Ryzen 9 7900X 12-Core Processor, AMD Radeon RX 9070 XT, Unity Editor à 1280 × 720. Limite d'images/s désactivée uniquement pour les mesures.

Comparaison du village V13 profil élevé et V14 profil économe, avec les têtes natives dans les deux cas : 635,285 triangles moyens contre 2,222,429 (71.4 % en moins), 679 appels de dessin contre 1645 (58.7 % en moins). Il s'agit d'une comparaison entre profils visuels différents, pas d'un gain à qualité identique.

Marche continue rendue : 300.05 secondes, 527.88 m, p95 de durée d'image 15.82 ms, 0 image au-delà de 100 ms. Cette session de cinq minutes n'est pas un parcours complet des 45 minutes de campagne.

Cible : Ryzen 3 7320U / Radeon 610M / 8 Go. Aucun appareil de cette configuration n'a été testé physiquement ; les mesures sur RX 9070 XT ne certifient pas 30 images/s sur une 610M.

## Captures locales

`Revision14/Videos/C01-THALEOLITHIC-v14.mp4` : introduction enregistrée dans le jeu (36 s).
`Revision14/Videos/Gameplay-THALEOLITHIC-v14.mp4` : déplacement, accroupissement, saut et inventaire (11 s).

Les sauvegardes de production et les identifiants historiques restent compatibles. Les sources Meshy, photos et sorties de l'essai abandonné ne sont pas publiées.
