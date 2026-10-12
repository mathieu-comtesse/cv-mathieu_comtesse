# LIMEN

Jeu WebGL (Three.js) en tramage de pixels : une braise à porter à travers trois zones, d'environ une heure à une heure et demie.

Ouvrir `veilleuse/index.html` depuis le site, sans installation (serveur statique suffisant).

## Zones
- **Averse** : la pluie use la flamme, les grands arbres et les arches la protègent, un marais sous l'orage ferme la zone.
- **Prisme** : plateau en terrasses, la flamme ne s'éteint plus, cinq puzzles de faisceaux et de miroirs.
- **Étale** : estran à marées, les îlots ne sont reliés qu'à marée basse, l'eau profonde éteint la flamme.

Chaque zone : 5 stèles, 6 souvenirs dont 5 requis, une porte vers la suite. 15 stèles, 18 souvenirs au total.

## Commandes
ZQSD / WASD / flèches : marcher. Maj : courir. C : s'accroupir pour protéger la flamme. E ou Espace : agir. H : direction du prochain objectif. M : carte. J : carnet. R : pivoter la caméra. Souris : caméra, molette : zoom. Échap : pause.

## Rendu
Scène 3D rendue en basse résolution, puis un unique passage plein écran : quantification de la luminance sur une rampe de 6 teintes par zone, tramage Bayer 8x8, quatre rampes choisies d'après la teinte du matériau (neutre, chaud, accent, vert), pluie tracée en espace écran, rotation de palette (color cycling) pour l'eau, transparence par tramage plutôt que par alpha. Les modèles sont construits en code (faces plates, équivalent d'un export Blender low poly). Le son est entièrement procédural.

## Structure
- `js/terrain.js` : monde pur (hauteurs, implantation, puzzles, marées), testable sous Node
- `js/render.js` : rendu basse résolution, palette, tramage, pluie
- `js/world.js`, `js/models.js` : construction des zones et des modèles
- `js/game.js` : boucle, mécaniques, sauvegarde (localStorage), carte, carnet
- `js/story.js`, `js/audio.js`, `js/ui.js`, `js/player.js`, `js/camera.js`

## Durée
Visée : 60 à 90 minutes en première partie. Estimation faite d'après les distances et les temps imposés (marées, orage, puzzles), pas d'après une session jouée par un humain.
