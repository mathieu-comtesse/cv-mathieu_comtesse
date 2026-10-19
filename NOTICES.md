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

## Police du jeu Talas

`jeux/assets/fonts/jersey-15.woff2` : Jersey 15 (Sarah Cadigan-Fried), licence SIL Open Font License 1.1, <https://fonts.google.com/specimen/Jersey+15>. Sous-ensemble latin distribué par Fontsource.
