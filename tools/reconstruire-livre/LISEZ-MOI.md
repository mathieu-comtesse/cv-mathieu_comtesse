# Volumes 3D des figures du livre

Reconstruit en 3D les figures animées 16.1, 52.1 et 69.1 du livre (archive WattsElse, `figures-livre/NN.html`).
Les figures sont des dessins isométriques faits de solides extrudés ; leur scène 3D d'origine n'est pas conservée.

1. `node extract.js NN sNN.json` : anneau du dessus, silhouette et couleurs de chaque solide (serveur local à la racine du dépôt).
2. `python3 infer.py NN ...` : azimut et élévation retrouvés d'après les arêtes (la figure 52 donne sa base, la 69 sa projection).
3. `python3 recon.py sNN.json rNN.json '{"o":..,"x":..,"y":..,"z":..}'` : plan et hauteur de chaque solide, profondeur choisie par contact.
4. `python3 tubes.py tNN.json rNN.json '<projection>' tubNN.json` (figure 69 seulement) : tuyaux recalés sur les solides qu'ils joignent.
5. Les résultats sont figés dans `assets/machines/livre-NN.json` et construits par `refonte/m3d/livre3d.js`.

Contenus et animations d'origine attribués à WattsElse : la réutilisation est soumise à leurs droits et autorisations.
