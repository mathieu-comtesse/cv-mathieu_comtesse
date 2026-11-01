# Teardown premium des projets professionnels — V1

## Périmètre intégré
La couche d'inspection est branchée sur les 11 machines Three.js de refonte/m3d :
cerfa, vm, vre, moteur, gares, finance, pp, powerbi, suivi, studio et vrestudio-musicbox.

Elle conserve les machines existantes, leur caméra, leur décor blueprint,
leurs commandes métiers et leurs animations. Aucun processus réel n'est lancé.

## Fonctions disponibles
- Assemblé : visualisation originale et affichage de la valeur pilotée par la machine.
- Éclaté : répartition des sous-ensembles en cinq zones, sans modifier définitivement les poses.
- Coupe : plan de coupe global, permettant de voir les surfaces intérieures existantes.
- Rayons X : composants non sélectionnés semi-transparents.
- Isoler : composants hors de la zone choisie atténués.
- Cliquer sur une pièce : sélectionner la zone approximative et l'isoler.
- Visite automatique : parcourir alternativement les zones et les modes.
- Pause / reprise : contrôler l'horloge de la scène.
- Raccourcis clavier : E (éclaté), C (coupe), X (rayons X), I (isoler).
- Mode mouvement réduit : vue statique, commandes manuelles conservées.

## VM VRE : premières situations métier
- Cycle normal sur 20 dépôts fictifs, avec suivi de la quantité de dossiers intégrés.
- Doublon : repositionnement de l'animation autour du document répété.
- Incident : arrêt de la machine principale dans le scénario, sans bascule de la VM secondaire.
- Le panneau distingue explicitement la reprise cible de la fonction déjà opérationnelle.

## Limites explicites de cette première itération
- Les cinq zones sont issues de la répartition spatiale des meshes actuels. Ce ne sont
  pas encore des assemblages cinématiques conçus pièce par pièce. La vue éclatée
  est une première étude interactive de composition, pas un démontage industriel exact.
- Les modes coupe et rayons X montrent la géométrie existante, sans générer de
  nouvelles pièces internes ni de surfaces de coupe bouchées.
- Les scénarios métier détaillés, en dehors de la VM VRE, restent à construire.
- Les chiffres sur le panneau proviennent des commandes internes des démonstrations,
  et non de SharePoint, Excel, Power Automate ou d'un système en production.
- Les vues et les scénarios doivent encore être validés visuellement dans le navigateur,
  notamment sur mobile et GPU intégré, avant fusion sur main.

## Pour la version de production
1. Définir des groupes mécaniques réels pour chaque machine, avec axes de dépose.
2. Reconstituer les mécanismes documentaires de bout en bout, cas nominaux et exceptions.
3. Modéliser d'abord la centrale VM VRE, le lecteur VRE et la centrale financière.
4. Évaluer le rendu avec captures de chaque phase et contrôles de performance.
5. Relier ensuite les machines dans une carte Process Nexus sans prétendre que tous
   les processus sont connectés au sein d'un même système de production.

## Fichiers
- refonte/m3d/teardown.js : moteur d'inspection et description des zones
- refonte/teardown-ui.js : interface utilisateur accessible
- refonte/teardown.css : mise en forme et adaptation mobile
- refonte/m3d/index.js : raccordement au moteur Three.js
- refonte/m3d/vm.js : scénarios VM VRE
- refonte/post.js : interactions et chargement de l'interface

Cette branche est destinée à une revue avant fusion. Elle ne modifie pas la version
actuellement publiée sur comtesse.me.
