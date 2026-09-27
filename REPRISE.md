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
- Navigation : bouton «  Naviguer » (ou clic sur le bateau de pêche). ZQSD / flèches (touches physiques), Espace pour s’arrêter, Échap pour quitter ; croix directionnelle sur écran tactile. La caméra suit le bateau, qui s’échoue sur les hauts-fonds.
- Pêche : six bancs, un au large de chaque bâtiment. Près d’un banc, bulle « F · Pêcher » → lancer, touche, puis « Maintenir pour ramener » avec jauges Prise / Tension (la ligne casse à 100 %). Fiche de prise (rareté, espèce, taille) et carnet de bord (7 espèces, stocké dans le navigateur). La première prise est un 20e easter egg.

## Route & vigilance : graphismes et prévention (23 septembre 2026)

- Rendu : textures peintes (herbe, enrobé, gravier) calées sur la route, champs et haies au-delà du fossé, arbres feuillus / conifères ombrés, maisons à toit en pente, marquage français (ligne continue, T1, T2), balises, véhicules détaillés (vitrages, rétroviseurs, feux), piétons animés, feux tricolores avec orange, panneaux STOP / priorité à droite / passage piéton, barrière de chantier et cônes.
- Mode nuit (« Moment du trajet ») : phares, lampadaires aux carrefours, catadioptres, éblouissement des phares d’en face amplifié par l’alcool.
- Effets de l’alcool : flou, vision double, effet tunnel (vision périphérique floue et assombrie), paupières lourdes (somnolence) ; instruments (panneau de décision, carte d’alcoolémie) dessinés après, donc nets.
- Prévention : jauge 0,2 / 0,5 / 0,8 g/L avec sanctions, profil Widmark (r 0,68 / 0,55), temps de retour à 0 g/L, distance parcourue avant freinage, tableau à jeun / sous influence sur le même parcours, message de conduite alternative.
- `road-core.js` : décor dès le départ (générateur séparé, parcours inchangé), angles des carrefours dégagés.
- Conduite (suite) : pédales et direction quasi instantanées, 220 km/h (six rapports au son), marche arrière (frein maintenu à l’arrêt), caméra qui recule et suit la voiture hors de la route ; cyclistes (infraction si dépassés à moins de 1,5 m) ; on roule dans les champs au-delà du fossé (franchi vite = accident) ; les accidents ne coupent plus le trajet : choc, recul, dégâts cumulés, victimes comptées, épave à 100 % de dégâts.

## Deux nouveaux jeux et route prolongée (23 septembre 2026)

- Route : durée choisie avant le départ (3, 5, 10 minutes ou sans limite, 5 min par défaut) ; bouton « Nuit » et touche N pour basculer jour / nuit.
- Arène des arcanes (`arene.html`, `arene-scene.html`, `arene.js`) : combat en pixel art : simulation en 384 × 216, rendu sur une toile 256 × 144 (gros pixels, contour sombre, lueurs tramées Bayer) avec une interface dessinée au triple sur une seconde toile, d’après les vidéos du magicien au clair de lune et de la prêtresse en cathédrale. Six personnages (Orvyn archimage, Séraphine prêtresse, Bran chevalier, Morgane nécromancienne, Kaïto ninja : shurikens, pas de l’ombre, clones ; Ysolde mage de givre : pics, nova qui ralentit, blizzard), deux compétences + un ultime chacun, attaque en trois coups, garde, parade, mana, jauge d’ultime, manches au meilleur des trois, IA à trois niveaux ou deux joueurs (Q D Z S F G H R / flèches K L O P). Six arènes : rempart, cathédrale, forêt aux lucioles, forge volcanique, lac de minuit et ponton au couchant (ces deux lacs décalent la vue de 26 px et reflètent la scène dans l’eau). Mode entraînement contre un mannequin increvable (dégâts cumulés, DPS, meilleur combo, T pour remettre à zéro). M revient au menu à tout moment (touche aussi transmise par arene.html). Chiffres de dégâts en gros pixels empilés, bandeau doré au nom du sort, cercles magiques, portail de météores, ailes sacrées, entailles en X, brûlure, images rémanentes. `ArenaGame.advance(n)` fait avancer la simulation pour les tests, `ArenaGame.freeze=true` fige l’image pour les captures, `ArenaGame._dbg` expose le peintre de sprites.
- Abysses & babioles (`abysses.html`, `abysses-scene.html`, `abysses.js`) : plongée Three.js d’après la vidéo « Antikythera » (2 047 poissons, 25 000 brins d’herbier) ; scaphandrier en laiton, épave, coraux, caustiques, rayons, neige marine, air rechargé à la ligne de mouillage, sonar (R), pinceau (E maintenu), carnet (J), huit objets mi-historiques mi-absurdes. Scaphandrier et décors (rochers, falaises, gorgones, coraux, éponges) générés dans Blender : `tools/blender-diver.py` → `assets/diver.glb` (armature, actions idle/walk/bound/brush, points d’attache hose_anchor/valve/brush_tip), `tools/blender-reef.py` → `assets/reef.glb`, `tools/blender-boat.py` → `assets/boat.glb` (bateau et île, repères deck_spot/ladder_top/ladder_bottom/pump_out) ; séquences : titre au-dessus de l’eau, mise à l’eau par l’échelle (mode `enter`), remontée et retour à bord au coucher du soleil (mode `ending`) ; chargés avec `GLTFLoader.js` (copie locale r180). Déplacements : Z/S marcher, Q/D tourner, Maj presser le pas, Espace bondir. `AbyssGame.step(n)` et `AbyssGame.look(yaw,pitch,dist)` pour les tests. Rendu HDR hors écran puis passe finale maison (absorption, rayons volumétriques, halo, ACES), carte d’environnement PMREM. Qualité adaptative ; `?lite` force la version légère, `?shot=objet,trouvés,nage,sonar` met en scène une capture.

## Forge d’assets 3D pour le Village Talas (27 septembre 2026)

- `tools/forge/` : chaîne qui produit des accessoires au format du jeu à partir des modèles procéduraux de vibe3d (cloné à côté, `../vibe3d`) ou de modèles maison (`tools/forge/models/*.mts`). Étapes : export toon sans GPU (`toon-export.mts`), Blender en arrière-plan pour le budget de triangles et l’aperçu toon (`blender_stage.py`), validation par le `loadGLB` extrait de `village-talas-scene.html` (`validate.mjs`), dépôt dans `assets/talas/props/`.
- Contrat : mètres, base à y = 0, pièces animables nommées, maillages `piece__role`, couleur par rôle (`<id>.roles.json`), ombrage cuit dans `COLOR_0`, nœuds en TRS (le lecteur du jeu ignore `matrix`).
- 24 accessoires : bouteille de gaz, chariot élévateur (mât et fourche animables), transpalette, caisse et servante à outils (portes), établi (tiroir), armoire électrique (levier), coffret à fusibles, palan, crochet de grue (linguet), poste de soudure, robot, cône, barrière, extincteur, vestiaire, palette, fût chimique, rayonnage, chariot d’infirmerie, et quatre panneaux ISO 7010 procéduraux (danger général, électrique, casque obligatoire, sortie).
- `talas-props.js` : `TalasProps.preload(ids)` puis `TalasProps.make(id, palette, {gradientMap: grad, outline: 1.04})`, même logique que `toonFromGLB`. **Pas encore branché dans le jeu.**
- Régénérer : `node tools/forge/forge.mjs build` ; tester : `node tools/forge/test-props.mjs` ; voir : `tools/forge/galerie.html` ou `tools/forge/banc-essai.html` (servi en HTTP).

## Parcours : direction artistique « Panthère » (27 septembre 2026)

- D’après *Pink Panther: Pinkadelic Pursuit* (PS1), niveau « The Construction Site » (vidéo fournie, non versionnée). Analyse et palette : `tools/forge/DA-panthere.md`.
- `talas-panthere.js` repeint sur canvas les textures du parcours sous les mêmes clés `PTD` : fond ciel cyan et ligne d’horizon bleue de l’île (hangars, tour de contrôle, grues, palmiers), sol bleu brossé avec allée piétonne jaune conservée, plateformes en planches à nœuds, palissade pour les cloisons de zone, brique à coulures de mortier, plâtre moucheté, poutrelles bleu-violet, caisses peintes. Level design, collisions et messages ISO inchangés.
- `village-talas-scene.html` : 6 crochets gardés (`<script>`, `TALAS_DA.patch`, brume et lumières, photo du hangar et rayons de verrière omis, palissade dans `zone()`). `?da=classique` rend l’ancienne direction.
- Forge : `node tools/forge/forge.mjs build --da panthere` (palette `tools/forge/palettes/panthere.json`, sans contour, fond cyan) ; `TalasProps.themePalette(id, pal)` en jeu ; panneaux ISO 7010 jamais recolorés (`"theme": false`).

## Île refaite, ouverture, comptes rendus vidéo (27 septembre 2026)

- Ouverture : logo du studio Casque à l’Envers affiché 5,6 s (au lieu de 1,7 s), signature en fondu après le balayage, nom sur une seule ligne (le bloc à `left:50%` n’avait que la moitié de la largeur).
- `talas-ile.js` (3 crochets gardés dans `buildHub`/`start`, `?ile=classique` pour l’ancienne) : A320 aux couleurs de Talas (forge `avion-a320`, soufflantes, feux, train qui rentre au décollage de la fin), ateliers en matière peinte avec socle, marches, auvent, jardinières et appliques, vent dans toute la végétation, fleurs des buissons, lianes fleuries et écume sur les rochers en mer, voiliers, poissons, avion de ligne, ombres de nuages, fontaine, ouvriers, bancs adossés aux jardinières, lampadaires, parasols, balisage de piste, manche à air, radar. Détails : `tools/forge/ILE-refonte.md`.
- Forge : `avion-a320`, `voilier-*`, `lampadaire`, `banc`, `parasol-*` (modèles procéduraux `tools/forge/models/`).
- Comptes rendus sans serveur local : `node tools/forge/preview/record.mjs` (Chrome sans interface par tube, horloge virtuelle, 30 i/s) -> `tools/forge/out/videos/*.mp4` ; `--photos <json>` pour des vues fixes. Préversion jouable : `node tools/forge/preview/build.mjs` puis publication en artifact.

## Nouveaux mini-jeux §6 et §9 (27 septembre 2026)

- `talas-jeux.js` : deux mini-jeux qui remplacent les tuyaux et le polygraphe (les anciennes fonctions `pipe3D` et `poly3D` restent dans le fichier, non appelées).
- §6 « Le budget de l’atelier » (`budget3D`) : défense d’atelier. Cinq postes (solvants, chute, bruit, chariot, charges) envoient des dangers vers l’équipe (20 PV) ; quatre trimestres ; budget 8 + 5 par trimestre ; élimination 5 pts (le poste ne produit plus), substitution 4 (danger rare), protection collective 3 (barrière, 85 %), organisation 2 (ralentit, 50 %), EPI 1 (n’arrête rien, évite la blessure une fois sur deux). Objectif §6.2 : santé ≥ 50 %. Le festin des mesures et la question d’objectif suivent comme avant.
- §9 « Revue de direction, le jeu télé » (`revue3D`) : plateau télé, Aurelien candidat, buzzer. Manche 1 buzzer des entrées obligatoires (§9.3), manche 2 vrai ou faux de l’audit (§9.2 ; constats dépendant de `S.flags` conservés), manche 3 la grande question (sorties de la revue). La question « revue de direction » de fin de chapitre, devenue doublon, est retirée.
- Statistiques (`village-talas-stats.html`) : `mesures`, `parades`, `buzz`, `ecarts` remplacent `tiles` et `lies`.
- Test automatique : `node tools/forge/preview/record.mjs budget revue` joue les deux ateliers (pilote automatique) et enregistre les vidéos.
