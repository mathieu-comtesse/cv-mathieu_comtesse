# Talas — Les sept ateliers

## Jouer

Double-clique sur `Jouer-Windows.cmd` pour ouvrir la version Windows. `Jouer-Navigateur.cmd` démarre le serveur local et ouvre le jeu dans ton navigateur. Les versions jouables et le projet Unity sont sur E :

- Projet : `E:\02 - Games\Talas\Talas-Quai-des-Brumes`
- Windows : `E:\02 - Games\Talas\Versions-jouables\Windows\Talas.exe`
- Navigateur : `E:\02 - Games\Talas\Versions-jouables\Navigateur`

Commandes : Q/D ou flèches pour marcher, Maj pour courir, E pour ouvrir l’atelier, M pour le carnet. Clique sur le texte, la flèche ou Continuer pour lire les pages d’un dialogue. Chaque activité présente ses commandes avant de commencer.

## Interface issue des fichiers Silver Pines

La police Noticia Text a été reconstruite depuis les 237 glyphes, leurs métriques et leur atlas embarqués. Les cadres irréguliers, le masque de portrait et la flèche proviennent des ressources du jeu fourni. Le dialogue reprend les coordonnées, dimensions, interlignes et couleurs du panneau original, avec une mise à l’échelle pour 1280 × 720.

Les portraits, les textes ISO, les choix et les personnages restent ceux de Talas. Les réponses pédagogiques demandent une disposition spécifique ; l’ensemble des menus n’est donc pas une reproduction identique de Silver Pines. L’ombre et la lueur du portrait original restent à reproduire. Les textes longs sont paginés, sans suppression de mots ni chevauchement du nom du locuteur.

Le relevé détaillé et les empreintes des ressources sont conservés dans `Controles/Lecture-dialogue.md` et `Controles/manifest-consolidated.json`. Les fichiers source de Silver Pines sont conservés.

## Campagne et personnages

Sept chapitres ISO, douze sessions obligatoires et trois activités supplémentaires : attrape, combat, fuite, budget, festin, karaoké (deux sessions), documentation, parcours, revue, opération, jetski, avions, pétanque et lanternes.

Le contrôle de campagne a joué les quinze activités, franchi les treize décisions, validé les douze sessions, le verrouillage des chapitres et la sauvegarde/relecture. Le chrono de 45 minutes continue pendant les activités. Les questions et décisions originales sont conservées ; certaines mécaniques sont adaptées et simplifiées dans cette version Unity.

Six personnages Talas utilisent chacun un squelette de 23 os, avec 31 animations disponibles. La marche, le combat et la pose d’échec sont animés. Les fichiers Silver Pines consultés contiennent des animations de sprites pour le personnage principal, et aucun squelette 3D exploitable : les personnages 3D Talas utilisent donc leurs propres rigs.

## Rendu et limites actuelles

Le quai associe les ateliers peints, des éléments retravaillés depuis Silver Pines, seize accessoires Talas, un éclairage froid avec des lampes chaudes, de l’eau animée et une brume volumétrique. Le budget géométrique autorisé est d’un million de triangles et d’un million de sommets par vue Windows.

La version navigateur utilise un shader Talas compatible WebGL pour les personnages et accessoires, avec des couleurs, une lumière principale et des ombres. Son éclairage est simplifié par rapport à Windows. Les ressources téléchargées sont versionnées par leur empreinte pour éviter de rejouer une ancienne compilation depuis le cache.

L’audit de la scène compte 267 050 triangles et 233 433 sommets actifs. La borne géométrique de la vue contrôlée est de 155 761 triangles et 124 829 sommets. Ces nombres excluent les passes d’ombres, particules et appels procéduraux ; ils ne constituent pas une mesure de performances GPU.

Cette version est jouable et ses mécaniques ont des contrôles automatisés. La finesse des décors, des personnages et des animations reste en dessous de Silver Pines. Les captures du dossier `Apercus` montrent le rendu réellement obtenu.

Les preuves de contrôle sont dans `Controles` : campagne, pagination, import de l’interface, géométrie, vérification Windows et compilations.
