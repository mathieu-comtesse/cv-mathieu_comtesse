# Reprise du 21 septembre 2026

Base : mathieu-comtesse/cv-mathieu_comtesse, main (dc75913).
Branche : jeux-immersion-labyrinthe.

Réalisé :
- Timber ! (ex-Firewood) : poses de la hache calculées en repère caméra (repos, armé, impact), tranchant vers le bas et fente alignée sur la lame (le long du regard), impact garanti même si des images sont sautées, bûches plus basses, caméra rapprochée.
- Route : modèle `road-core.js` (10 px/m), berlines/utilitaires/camions/citadines étiquetés avec leur vitesse, panneaux de limitation (30/50/70/90) avec infraction d’excès de vitesse, conteneurs et barrières, piétons avec priorité, panneau de décision (Maintenir / Freiner / Changer de voie / Arrêt d’urgence) inspiré de la vidéo fournie, rayons capteurs vers les objets suivis, décor aléatoire dense, accident définitif, clignotement rouge à chaque infraction.
- Armada : brigantins, frégates, galions et Hollandais volant (tonnage et canons), requins, dauphins, pieuvre géante, serpent de mer, ouragan ; planche `armada-expedition.png`.
- Labyrinthe : `labyrinthe.html`, `maze-core.js`, `labyrinthe.js` — carte révélée progressivement, vue subjective tramée, quatre lignes de visibilité, exploration manuelle ou automatique, style tableau de bord de la vidéo.
- Textes des jeux à l’infinitif ou au vouvoiement.

Tester : `node tests/road-controls.cjs`.
Aperçu : lancer `python3 -m http.server 8765` dans ce dossier puis ouvrir http://localhost:8765/projets-perso.html.
