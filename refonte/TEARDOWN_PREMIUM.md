# Reconstruction intégrale des machines professionnelles · Teardown Premium V3

## Principe
Cette version remplace intégralement le rendu des onze anciennes machines. Les anciennes
constructions restent dans le dépôt comme historique et comme référence, mais ne sont
plus importées par \`refonte/m3d/index.js\`. Le nouveau rendu utilise exclusivement
\`premium-core.js\` et les trois familles de machines \`premium-*-machines.js\`.

Chaque scène comprend 5 sous-assemblages dédiés, avec positions, axes de dépose
et contenus mécaniques propres. Les modes Éclaté, Coupe, Rayons X et Isoler
agissent sur ces vrais groupes, pas sur des morceaux triés selon leur abscisse.

## Onze machines créées
| Projet | Nouveau dispositif et mécanismes principaux |
|---|---|
| CERFA | Chargeur, double scanner OCR, contrôles, quatre aiguillages, bacs |
| VM VRE | FIFO, cabinet principal et secours conceptuel, verrou exclusif à deux engrenages, registre rotatif, écriture Excel et imprimante |
| Extraction VRE | Ascenseur PDF, couronnes de scan, bâtiment/local 3D, quatre compteurs BT et pupitre PAM |
| Reporteur Q18 | Chargeur OT, barillet de 18 fiches, mors de comparaison, tampon Q18, console Excel/BI |
| Gares | Dix-neuf cartouches de sources, filtres, différentiel pondéré, tableau de rangs, extracteur de priorités |
| Finances | Coffre, quatre réservoirs, collecteur et vannes, cinq relais à contact, ratchet d’alertes |
| Plans de prévention | Dépôt, scanner, roue à douze échéances, tiroirs d’archives, relances |
| Power BI | Deux magasins PP/MOSO, nettoyage, réseau relationnel, moteur DAX, portail |
| Suivi | Clavier de recherche, sélecteur OT/équipement/bâtiment, vingt prises, patchs, restitution |
| Studio d’extracteurs | PDF de référence, traceur XY, fraiseuse, banc de recette, bibliothèque des extracteurs |
| Lecteur VRE | Scanner spatial, 48 neurones et synapses courbes, fusion, validation humaine, modèles candidats et mémoire |

## Commandes
- Menu latéral pour changer de machine
- Glisser pour tourner, molette pour zoomer
- Clic sur une pièce ou sélection d'un sous-système pour l'isoler
- Assemblé, Éclaté, Coupe, Rayons X, Isoler
- Visite automatique, pause, reprise, paramètre métier propre à la machine
- Raccourcis E, C, X et I
- Scénarios normaux, doublons et arrêt VM pour la centrale VRE
- Parcours conceptuel Lecteur VRE → Extracteur → VM → Q18 → Power BI

## Réalisme et limites
Les modèles 3D représentent des projets informatiques par analogies mécaniques
**nouvelles**. Les scénarios sont déterministes et utilisent des données fictives.
Ils n'exécutent pas les véritables flux Power Automate, Excel, SharePoint, modèles
d'inférence ou processus d'entraînement. Les tableaux et compteurs ne sont pas
des mesures de production. La bascule VM secondaire est une cible, pas une
fonction attestée opérationnelle. Les états validés dans le modèle documentaire
illustrent une intervention humaine et non une publication automatique réelle.

Les pièces et les axes de démontage ont été définis pour chaque concept fictif.
Ils ne correspondent pas à la mécanique d’une machine industrielle préexistante.
Une vraie validation visuelle WebGL sur ordinateur et téléphone reste nécessaire.

## Architecture
- \`refonte/m3d/premium-core.js\` : primitives, engrenages extrudés, transmissions, libellés, courbes, cartons et plateformes
- \`refonte/m3d/premium-doc-machines.js\` : CERFA, VM, VRE, Q18
- \`refonte/m3d/premium-pilot-machines.js\` : gares, finances, PP, Power BI
- \`refonte/m3d/premium-intelligence-machines.js\` : suivi, Studio, Lecteur VRE
- \`refonte/m3d/index.js\` : branchement exclusif des 11 nouveaux constructeurs
- \`refonte/m3d/teardown.js\` : démontage par assemblages explicitement construits
- \`refonte/teardown-ui.js\`, \`refonte/teardown.css\` : interface
- \`teardown-lab.html\` : test comparatif, navigation et commandes
- \`projet-*.html\` : notices adaptées à la nouvelle machine

## Vérifications
Tests de construction avec un environnement Three.js simulé pour les 11 nouvelles
machines, avec états d'animation et contrôles. Vérifications de syntaxe des
modules. Les tests sur rendu WebGL réel et matériel mobile doivent suivre.

Cette branche est distincte de la production de comtesse.me.
