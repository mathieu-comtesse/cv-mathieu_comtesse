# Nacre : état de la refonte

Version du 19 octobre 2026. La construction se fait maintenant dans la scène Atlas : aucun chargement du précédent atelier Unity. Les scripts Unity conservés ici sont l'instantané historique de cet atelier.

## Ressources et mécanique retrouvées

- Géométrie, couleurs de sommets, textures et sprites décodés depuis l’installation Sandcastle Demo fournie. Les empreintes de fichiers sont dans ../assets/atlas/sandcastle/provenance.json.
- Les empreintes des outils sont des textures RGBAFloat : R encode la hauteur signée, A la découpe. Les courbes d’animation proviennent des clips sérialisés.
- Pelle : une pression prélève une charge, déplacement, relâchement pour déposer. Capacités 5/30/100 litres ; délai 0,3 seconde. Le volume est normalisé sur la grille du navigateur.
- Tour : cinq empreintes natives, tirage aléatoire, déclenchement au relâchement après 0,25 seconde. Les empreintes sont utilisées ; la chaîne complète de placement native reste partielle.
- Le volume de caustiques R8 256×256×64 est conservé dans un atlas bordé. La lecture conserve les texels ; son raccord à l’éclairage reste une adaptation.

## Différences restantes

La coupe de terrain utilise la texture originale Strata, Texture2D #212, et les couleurs des matériaux BordersGroundFront #7 et BordersWaterFront #8. Le plateau mesure 60 × 60 mètres. La surface et les côtés de l'eau lisent le même champ de hauteurs GPU. Les références et empreintes sont dans ../assets/atlas/sandcastle/cutaway-parameters.json.

Les onze noyaux du solveur d'eau Sandcastle sont traduits de son bytecode DXBC vers WebGL2 et pilotent le bassin. Les 22 comparaisons isolées (11 noyaux, deux états de grille 32 × 32) donnent les mêmes mots binaires que l'exécution D3D11 sur le GPU testé : water-kernels-check.json. Cela ne valide pas l'identité de la simulation complète : le raccord au terrain Atlas, la résolution, l'initialisation à l'équilibre et les passes en double tampon diffèrent du jeu natif.

La texture WaterNormal2D #307, les phases d'advection des normales, les paramètres Refs d'eau et de houle, l'absorption, Fresnel et l'exposant spéculaire proviennent des ressources et shaders d'origine. La chaîne complète des particules d'écume native n'est pas portée. L'éclairage, le ciel, les ombres et le post-traitement restent ceux d'Atlas.

Le râteau utilise le masque original, conserve le volume et suit le déplacement, mais le transport natif du sable n’est pas entièrement porté. Le mur utilise l'empreinte ConnectingWall et des poses successives. Le vent, les déplacements des poissons et la profondeur des imposteurs végétaux ne sont pas strictement identiques au moteur d’origine. Les ressources d'origine ne suffisent donc pas à établir une parité graphique ou mécanique complète.

## Vérification

Ordinateur et mobile simulé : quatre bâtiments méditerranéens et quatre bâtiments préservés, accès aux huit étapes, appuis des ponts, sortie des trois bateaux, quatre outils, annulation, nuit, retour et restauration de la création. Une charge de pelle de 30 litres est conservée après transport ; le maintien ne répète pas le prélèvement. Ces contrôles ne constituent pas une preuve d’identité complète avec Sandcastle.
