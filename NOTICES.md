# Composants tiers

La démonstration de contrôle de ligne (`ligne-controle.html`, `js/ligne-controle.js`, `tools/controle-ligne/`) s'appuie sur les composants suivants, redistribués avec leurs licences.

| Composant | Rôle | Licence |
|---|---|---|
| Ultralytics YOLO26 (poids et bibliothèque) | détecteur d'objets, entraînement, suivi | AGPL-3.0, <https://github.com/ultralytics/ultralytics> |
| ONNX Runtime Web (`vendor/vision/moteur*`) | exécution du détecteur dans le navigateur | MIT, <https://github.com/microsoft/onnxruntime> |
| hls.js (`vendor/vision/flux-direct.js`) | lecture des flux HLS | Apache-2.0, <https://github.com/video-dev/hls.js> |

Les poids du détecteur (`assets/vision/*.bin`) sont ceux publiés par Ultralytics, exportés au format ONNX. Le code source de ce dépôt est public, conformément à la licence AGPL-3.0.

## Vidéo de démonstration

« Chaîne d'embouteillage de vin effervescent » (2019), Olivier Lemoine, CC BY-SA 4.0, <https://commons.wikimedia.org/wiki/File:Cha%C3%AEne_embouteillage_effervescent.ogv>. La vidéo est lue depuis Wikimedia Commons et n'est pas copiée dans ce dépôt.

## Lettres machines

Les lettres de `jeux/lettres-machines-scene.html` (`jeux/lettres-machines.js`) sont dessinées par le code de ce dépôt, sans composant tiers. Le style (trait d'encre, hachures, lavis, alphabet fait de mécanismes) s'inspire des illustrations de David Macaulay dans « The Way Things Work » ; aucune image de l'ouvrage n'est reproduite.

## La pièce flottante (monde 3D)

Le monde de `monde3d/` (code dans `monde3d/jeu/`) est écrit pour ce dépôt. Son décor vient de la pièce de l'accueil, exporté et allégé par `tools/build-monde3d.mjs` vers `monde3d/assets/piece.bin`. Le principe (un personnage qui court et saute d'île flottante en île flottante) s'inspire du portfolio 3D de Mike Fernandez ; aucun fichier, modèle, texture ni son de ce site n'est repris. Le rendu (aplats, trait d'encre, hachures, lettrage à la main) s'inspire du dessin de Mœbius ; aucune image de l'auteur n'est reproduite.

| Composant | Rôle | Licence |
|---|---|---|
| Patrick Hand SC (`monde3d/police/`) | lettrage de l'interface | SIL Open Font License 1.1, texte dans `monde3d/police/OFL.txt` |
| meshoptimizer (outil de construction uniquement) | allègement des modèles | MIT, <https://github.com/zeux/meshoptimizer> |

## L'exposition (`expo.html`)

Page écrite pour ce dépôt (`expo/expo.js`, `expo/donnees.js`), sans aucun module, feuille de style, police ni image de tiers en dehors de Three.js (MIT) et de Patrick Hand SC (OFL). Elle réutilise le rendu encre et hachures de `monde3d/jeu/rendu.js`. La forme générale (un parcours par chapitres, des cadres inclinés, un mode à plat, des branches qui relient les chapitres) s'inspire de pages éditoriales en 3D telles que Shopify Editions ; aucun fichier de ces pages n'est repris.
