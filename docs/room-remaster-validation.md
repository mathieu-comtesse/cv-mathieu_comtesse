# Refonte 2 de Ma pièce

La base de comparaison est le commit `90f6b5d` de `main`. La refonte est servie par le point d’entrée de la pièce. Le paramètre `?room-legacy` sélectionne les modèles précédents dans le même checkout.

## Cadrages avant et après

Les colonnes utilisent la même caméra orthographique et la même résolution. Le jardin est ouvert dans les deux versions du dernier cadrage.

| Cadrage | Avant | Après |
| --- | --- | --- |
| Ensemble | [Avant](room-review-v2/avant-ensemble.webp) | [Après](room-review-v2/apres-ensemble.webp) |
| Bureau | [Avant](room-review-v2/avant-bureau.webp) | [Après](room-review-v2/apres-bureau.webp) |
| Salon | [Avant](room-review-v2/avant-salon.webp) | [Après](room-review-v2/apres-salon.webp) |
| Hi-fi | [Avant](room-review-v2/avant-audio.webp) | [Après](room-review-v2/apres-audio.webp) |
| Objets personnels | [Avant](room-review-v2/avant-personnels.webp) | [Après](room-review-v2/apres-personnels.webp) |
| Végétation | [Avant](room-review-v2/avant-vegetation.webp) | [Après](room-review-v2/apres-vegetation.webp) |
| Chashitsu | [Avant](room-review-v2/avant-chashitsu.webp) | [Après](room-review-v2/apres-chashitsu.webp) |
| Jardin ouvert | [Avant](room-review-v2/avant-jardin.webp) | [Après](room-review-v2/apres-jardin.webp) |

[Mathieu avant/après](room-review-v2/mathieu-comparatif.webp) · [Face](room-review-v2/mathieu-face-apres.webp) · [Profil](room-review-v2/mathieu-profil-apres.webp) · [Trois-quarts](room-review-v2/mathieu-trois-quarts-apres.webp) · [Dos](room-review-v2/mathieu-dos-apres.webp) · [Portrait](room-review-v2/mathieu-portrait-apres.webp)

La vidéo montre une rotation complète et les séquences jouées de marche, d’assise et d’arrosage. [Vidéo de revue](room-review-v2/scene-v2.mp4)

## Objets et ancrages

Les modèles correspondent à des maillages glTF. Les triangles proviennent des exports. La colonne des appels compte les primitives par assemblage, pour une occurrence et sans la passe d’ombres, les écrans d’origine et les pièces mécaniques conservées. Les pigments sont cuits dans les sommets des nouveaux modèles.

| Objet | Source | Modèle v2 | Construction et surfaces | Repères et fonctions | Triangles v2 | Appels v2 | Vérification |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| Mathieu | reference-character.glb | MathieuMesh-v2 | Crâne, visage, cheveux, membres et vêtements sculptés. Quatre morph targets | Clips, IK, contacts, expressions | 1 857 | 1 | [Vues](room-review-v2/mathieu-comparatif.webp) |
| Chaussures | nb992-fitted-v27.glb | MathieuSneakers-v2 / MathieuSocks-v2 | Semelles étagées, empeigne et chaussettes en volume | Repères des pieds et retrait des baskets | 360 / 120 | 2 | [Vues](room-review-v2/mathieu-comparatif.webp) |
| Bureau USM | usm-table-user-v43.glb | BureauUSM | Plateau à chant, tubes et boules | Enveloppe du bureau et pose assise | 632 | 1 | [Vue](room-review-v2/apres-bureau.webp) |
| Caisson | usm-mobile-user-v43.glb | CaissonUSM | Faces, poignées et roulettes en relief | Placement sous le bureau | 820 | 1 | [Vue](room-review-v2/apres-bureau.webp) |
| Setu | setu-v25.glb | SetuAssise | Assise et dossier sur un cadre anguleux | Pivot et assise | 652 | 1 | [Vue](room-review-v2/apres-bureau.webp) |
| Tour | dream-pc-user-v43.glb | Tour | Châssis ouvert, carte, ventilateurs et rails | Prises, lumière et alimentation | 2 452 | 1 | [Vue](room-review-v2/apres-bureau.webp) |
| Écrans et supports | gaming-desk-user-v42.glb | EcranLarge / EcranPortrait / SupportEcrans | Coques et bras redessinés, écrans actifs conservés | Images, positions et alimentation | 780 / 360 / 576 | 3 | [Vue](room-review-v2/apres-bureau.webp) |
| Barrette | screenbar-v43.glb | BarreEcran | Corps et fixation modélisés, diffuseur conservé | Éclairage et interrupteur | 116 | 1 | [Vue](room-review-v2/apres-bureau.webp) |
| Clavier et souris | furniture.js / mx-master-user-v43.glb | Moonlander / MXMaster | Touches étagées et coque asymétrique | Repères des câbles | 3 448 / 240 | 2 | [Vue](room-review-v2/apres-bureau.webp) |
| Tasse | pont Native / géométrie de repli | Tasse | Paroi creuse et anse polygonale | Prise et animation Native | 264 | 1 | [Vue](room-review-v2/apres-bureau.webp) |
| Canapé | ds450-v25.glb | DS450 | Dossiers, coussins, accoudoirs et pieds redessinés | Assise et console | 624 | 1 | [Vue](room-review-v2/apres-salon.webp) |
| Ekstrem | ekstrem-v25.glb | Ekstrem | Tubulures anguleuses et assise ouverte | Lecture et appuis | 1 372 | 1 | [Vue](room-review-v2/apres-salon.webp) |
| Tapis | tapis.webp et plan texturé | Tapis | Médaillons et franges construits en géométrie | Emprise au sol | 2 154 | 1 | [Vue](room-review-v2/apres-salon.webp) |
| Tableau | furniture.js / tableau.jpg | PiedEtCadre | Cadre profilé autour de l’image conservée | Image d’origine | 480 | 1 | [Vue](room-review-v2/apres-audio.webp) |
| Étagère et tabouret | furniture.js | CadreOmni / Tabouret | Chants d’étagère et pieds évasés | Livres, objets et bonsaï | 1 200 / 140 | 2 | [Vue](room-review-v2/apres-personnels.webp) |
| Falkland | falkland.glb | Falkland | Plis et anneaux modélisés | Commande lumineuse | 3 340 | 1 | [Vue](room-review-v2/apres-vegetation.webp) |
| Lampadaire Gesto Terra | furniture.js | GestoTerra | Socle minéral, deux arcs facettés et tête profilée | Commande et diffuseur | 964 | 1 | [Vue](room-review-v2/apres-audio.webp) |
| Buffet et tiroir | usm-haller-green-v31.glb | BuffetUSM / TiroirUSM | Structure tubulaire et panneaux redessinés | Coulissement et sélection de vinyles | 2 064 / 148 | 2 | [Vue](room-review-v2/apres-audio.webp) |
| JBL | jbl.glb | JBL | Caisse et grille en relief | Prises et pulsation audio | 5 340 | 1 | [Vue](room-review-v2/apres-audio.webp) |
| Yamaha et amplificateur | yamaha-user-v49.glb / furniture.js | YamahaChassis / Amplificateur | Châssis aminci, aérations et molettes | Plateau, bras, capot et connexions | 264 / 804 | 2 | [Vue](room-review-v2/apres-audio.webp) |
| Télévision | magnavox-tv-user-v43.glb | MagnavoxCoque | Bois facetté et cadre épais, verre actif conservé | Affichage console et films | 1 140 | 1 | [Vue](room-review-v2/apres-salon.webp) |
| PlayStation et manette | ps1-console-user-v41.glb / ps1-controller-user-v41.glb | PlayStation / Manette | Trappe, boutons, ports et poignées redessinés | Alimentation, manette en main et câbles | 532 / 468 | 2 | [Vue](room-review-v2/apres-salon.webp) |
| Mamiya et Olivetti | mamiya-user-v41.glb / olivetti-user-v41.glb | Mamiya645 / Olivetti280 | Optique, boîtier, touches et rouleau modélisés | Album et placement sur l’étagère | 980 / 3 148 | 2 | [Vue](room-review-v2/apres-personnels.webp) |
| Trek et pompe | road-bike-clean-v44.glb / bicycle-pump-v31.glb | Trek / PompeCorps | Cadre, rayons, transmission et cylindre émaillé | Valves, piston et manomètre | 5 024 / 172 | 2 | [Vue](room-review-v2/apres-audio.webp) |
| Sac et bâtons | backpack-user-v51.glb / hiking-poles-recreation-v51.glb | SacRando / Batons | Poches, sangles, tubes et dragonnes | Vidéo et placement au sol | 704 / 592 | 2 | [Vue](room-review-v2/apres-bureau.webp) |
| Stèle, Bouddha, suiseki | stele-bordeaux.glb / buddha-user-v52.glb / suiseki-recreation-v51.glb | Stèle / Bouddha / Suiseki | Volumes en pierre et gravure géométrique | Fiches des objets | 1 740 / 456 / 120 | 3 | [Vue](room-review-v2/apres-personnels.webp) |
| Plantes | furniture.js / bonsai-tree.glb | Alocasia / Dracaena / Bonsai | Limbes pliés, tiges, cimes et pots sculptés | Vent, arrosage et taille | 1 368 / 1 968 / 1 396 | 3 | [Vue](room-review-v2/apres-vegetation.webp) |
| Jardin | tree-native.js | PinJardin / CerisierJardin / ErableJardin / GinkgoJardin | Couronnes, étages de branches et pigments propres à l’essence | Vent et feuilles tombantes | 380 / 820 / 820 / 820 | 4 | [Vue](room-review-v2/apres-jardin.webp) |
| Chashitsu | chashitsu.js | Tatami / ShojiBois / Kawara | Dalles textiles, papier encadré et tuiles géométriques | Trois shoji, fondu du toit et cérémonie | 4 516 / 1 020 / 9 020 | 3 | [Vue](room-review-v2/apres-chashitsu.webp) |
| Bol et coussins | tea.js | Chawan / Zabuton | Paroi de céramique émaillée et coussins à coutures d’angle | Bol manipulé, matcha, vapeur et assise | 140 / 200 | 2 | [Vue](room-review-v2/apres-chashitsu.webp) |
| Geta | geta-user-v52.glb | Geta | Semelles à deux traverses et brides en volume | Zone de retrait des chaussures | 704 | 1 | [Vue](room-review-v2/apres-chashitsu.webp) |

Le nouveau corps est lié aux articulations réelles de Mathieu. Le banc contrôle les morph targets, le changement de chaussures et le contact du bassin. Les 44 identifiants, les stations et l’interface de navigation sont comparés à main.

Chromium a exécuté la marche, l’assise au bureau, l’arrosage, le thé, le tiroir USM, la mise sous tension du bureau et de la console, la rotation clavier, le zoom tactile émulé et la restauration WebGL. Le téléphone physique, le glisser-déposer et la lecture multimédia intégrale restent à vérifier.

Depuis l’accueil, les trois shoji et le lampadaire répondent individuellement. Mathieu prend et repose la tasse reconstruite. La sélection d’un disque déclenche le chargement du lecteur et le Mamiya ouvre l’album 3D. Le pont d’animation reste actif dans le moteur de l’accueil.

Les câbles, les pochettes de disques, la JVC et une partie des ustensiles de thé utilisent encore leur géométrie précédente.

## Performances

Chromium Windows sur Radeon RX 9070 XT, ANGLE Direct3D 11. Même caméra, état clair et résolution interne de 979 × 612 sur desktop et 181 × 391 dans le profil tactile émulé. Mesure au repos sur 3,5 secondes par profil.

| Indicateur | Desktop main | Desktop v2 | Mobile émulé main | Mobile émulé v2 |
| --- | ---: | ---: | ---: | ---: |
| Médiane par image | 14,6 ms | 10,9 ms | 13,7 ms | 8,5 ms |
| P95 par image | 19,6 ms | 14,8 ms | 17,4 ms | 11,2 ms |
| CPU médian de rendu | 11,4 ms | 6,6 ms | 10,8 ms | 5,4 ms |
| Première scène jouable | 12,68 s | 6,38 s | 2,76 s | 2,36 s |
| Appels de rendu | 979 | 444 | 956 | 432 |
| Triangles | 462 385 | 251 827 | 447 439 | 241 707 |
| Textures | 139 | 33 | 136 | 32 |
| Octets locaux observés | 19 162 068 | 21 960 547 | 19 162 068 | 21 960 547 |

Les surfaces remplacées sortent du rendu et de la sélection. Les GLB sont regroupés par objet et compressés avec Meshopt. Les lots de chargement partent en parallèle. Le relevé local couvre le rendu et l’initialisation. Les octets observés incluent les sources historiques encore utilisées pour certains repères, les mécanismes et le repli.

## Sources et reproduction

Les modèles sont éditables depuis les scripts de construction et les données de palette. Installer glTF Transform Core et Extensions 4.5.1, Meshoptimizer 1.3.0 et Playwright 1.61.0. Exécuter les scripts ci-dessous à la racine du dépôt.

    node tools/room-remaster/build-mathieu.mjs
    node tools/room-remaster/build-objects.mjs
    node tools/room-remaster/review-mathieu.mjs test-results/mathieu --remaster
    node tools/test-room-art.mjs test-results/room-art

Pour comparer avec main, définir ROOM_ART_SOURCE vers un checkout de 90f6b5d puis exécuter le banc. Retirer cette variable et passer le chemin du fichier room-scene.json produit en deuxième argument. [Données](room-review-v2/mesures.json)
