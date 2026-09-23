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

- Sandboard : relief de sable cuit dans Blender (`tools/blender-sand.py` → `sand-height.png` + `sand-normal.png`, rides de vent, dunes, grains), sillons profonds teintés à la gouache, grains colorés qui retombent et se déposent sur la surface ; DA peinte conservée.
- Route : panneau de réglages compacté et hauteur calée sur l’écran (mode écran court sous 720 px) ; labyrinthe : clavier AZERTY absolu (ZQSD/flèches, A/E pour tourner).
- Pages projet (route, labyrinthe, Timber !, Rubik, Sandboard) : même gabarit que Fond d’écran Gouache — bandeau, titre, cadre avec légende, trois cartes d’explication, compétences, fil de navigation ; la scène jouable vit dans `*-scene.html` chargé en iframe (`.scene-embed`).
- Atlas du parcours (`atlas.html`, `atlas.js`, modèles origami `tools/blender-atlas.py` → `atlas-models.json`) : île Three.js du parcours façon acrokat.me — un bâtiment par étape (Sorbonne Paris Nord, SNCF Gares & Connexions, studio PDF, portail Power BI, dojo Lean, arcade), fiche au clic, rotation/pause/recentrage, photo, jour/nuit, 18 easter eggs (cloche, chat, PDF, ampoule, ceinture, billot, Rubik, sable, haie, phare, train, voiture, voilier, canard, oiseaux, poissons, bateau de pêche, photo), zoom molette, et feu d’artifice. Les étapes sont dans le tableau `steps` en tête de `monde.js`.
- Pixels (`pixels.html`, `pixels-scene.html`, `pixels.js`) : grille de chaleur sous le curseur façon shreygups.com/projects, trois palettes.

Regénérer le sable : `Blender --background --python tools/blender-sand.py -- sand-height.png sand-normal.png`.
Regénérer la hache : `/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender-axe.py -- timber-axe.json`.

## Lagon et pêche (23 septembre 2026)

Atlas du parcours retravaillé d’après la vidéo de référence « island v2 », en gardant le papier plié :
- Île (`tools/blender-atlas.py`) : plage de sable plus large qui descend en pente douce sous l’eau ; nouveau modèle `palm` (palmiers de plage penchés vers la mer).
- Fond marin plié (sable, herbiers, roches) sous un lagon : les hauteurs de l’île, de l’îlot, du quai et du fond sont « cuites » une fois vues du dessus ; le shader de l’eau s’en sert pour la couleur (turquoise sur le haut-fond, bleu profond après le tombant), la transparence, les caustiques animées et l’écume qui lèche chaque rivage. Les facettes de la mer bougent toujours comme une feuille pliée.
- Récif : coraux, éponges, gorgones et herbes ondulantes en papier sur le haut-fond ; bancs de petits poissons qui s’écartent au passage d’une coque ; sillages en confettis derrière les bateaux ; ombres de nuages qui glissent sur l’île et l’eau ; brume d’horizon, tone mapping et ombres adoucies.
- Navigation : bouton « ⛵ Naviguer » (ou clic sur le bateau de pêche). ZQSD / flèches (touches physiques), Espace pour s’arrêter, Échap pour quitter ; croix directionnelle sur écran tactile. La caméra suit le bateau, qui s’échoue sur les hauts-fonds.
- Pêche : six bancs, un au large de chaque bâtiment. Près d’un banc, bulle « F · Pêcher » → lancer, touche, puis « Maintenir pour ramener » avec jauges Prise / Tension (la ligne casse à 100 %). Fiche de prise (rareté, espèce, taille) et carnet de bord (7 espèces, stocké dans le navigateur). La première prise est un 20e easter egg.
