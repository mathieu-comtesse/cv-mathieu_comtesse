# Reprise du 21 septembre 2026

Base : mathieu-comtesse/cv-mathieu_comtesse, main (dc75913).
Branche : jeux-immersion-labyrinthe.

Réalisé :
- Timber ! (ex-Firewood) : hache modélisée dans Blender (`tools/blender-axe.py` → `timber-axe.json`, manche galbé, tête de cognée biseautée, coin), poses en repère caméra (repos, armé, impact), tranchant vers le bas et fente alignée sur la lame (le long du regard), impact garanti même si des images sont sautées.
- Route : modèle `road-core.js` (10 px/m), berlines/utilitaires/camions/citadines étiquetés avec leur vitesse, panneaux de limitation (30/50/70/90) avec infraction d’excès de vitesse, conteneurs et barrières, piétons avec priorité, panneau de décision (Maintenir / Freiner / Changer de voie / Arrêt d’urgence) inspiré de la vidéo fournie, rayons capteurs vers les objets suivis, décor aléatoire dense, accident définitif avec tête-à-queue, fumée, débris et vignette rouge, clignotement rouge à chaque infraction, recul de caméra et défilement des bordures proportionnels à la vitesse, moteur sonore (bouton Son).
- Armada : supprimé (fichiers, carte, CSS).
- Labyrinthe : `labyrinthe.html`, `maze-core.js`, `labyrinthe.js` — carte révélée progressivement (hachures = inconnu), vue subjective tramée, quatre lignes de visée « telles qu’envoyées » avec codes, menu d’options avec barres de confiance (heuristique locale), bandeau de statistiques et frise des décisions, comme dans la vidéo.
- Textes des jeux à l’infinitif ou au vouvoiement.

Tester : `node tests/road-controls.cjs`.
Aperçu : lancer `python3 -m http.server 8765` dans ce dossier puis ouvrir http://localhost:8765/projets-perso.html.

Regénérer la hache : `/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender-axe.py -- timber-axe.json`.
