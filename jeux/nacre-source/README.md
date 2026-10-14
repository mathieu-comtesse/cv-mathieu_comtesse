# Nacre : état de la refonte

Version locale vérifiée le 14 octobre 2026. Ce dossier contient un instantané des scripts et shaders du module Unity compilé, pas un projet Unity autonome.

## Ressources et mécanique retrouvées

- Géométrie, couleurs de sommets, textures et sprites décodés depuis l’installation Sandcastle Demo fournie. Les empreintes de fichiers sont dans ../assets/atlas/sandcastle/provenance.json.
- Les empreintes des outils sont des textures RGBAFloat : R encode la hauteur signée, A la découpe. Les courbes d’animation proviennent des clips sérialisés.
- Pelle : une pression prélève une charge, déplacement, relâchement pour déposer. Capacités 5/30/100 litres ; délai 0,3 seconde. Le volume est normalisé sur la grille du navigateur.
- Tour : cinq empreintes natives, tirage aléatoire, déclenchement au relâchement après 0,25 seconde. Les empreintes sont utilisées ; la chaîne complète de placement native reste partielle.
- Le volume de caustiques R8 256×256×64 est conservé dans un atlas bordé. La lecture conserve les texels ; son raccord à l’éclairage reste une adaptation.

## Différences restantes

Le solveur actuellement joué reste une adaptation CPU. Deux noyaux d’eau ont été traduits et comparés au bytecode original sur quatre scénarios isolés avec résultats identiques ; ils ne pilotent pas encore la simulation publique complète.

Le râteau utilise le masque original et suit le déplacement, mais le transport natif du sable n’est pas entièrement porté. Le mur conserve une construction simplifiée. Le vent, les déplacements des poissons, la profondeur des imposteurs végétaux et l’éclairage ne sont pas strictement identiques au moteur d’origine.

## Vérification

Ordinateur et mobile simulé : quatre bâtiments méditerranéens et quatre bâtiments préservés, accès aux huit étapes, appuis des ponts, sortie des trois bateaux, quatre outils, annulation, nuit, retour et restauration de la création. Une charge de pelle de 30 litres est conservée après transport ; le maintien ne répète pas le prélèvement. Ces contrôles ne constituent pas une preuve d’identité complète avec Sandcastle.
