# Ateliers Blender v25
Depuis la racine du dépôt : lancer Blender en arrière-plan avec --python tools/blender/build-project-ateliers-v25.py. Blender 5.2, moteur Cycles, 24 échantillons et débruitage. Les 11 GLB et PNG sont écrits dans assets/dioramas ; les scènes éditables sont enregistrées dans outputs. Créer outputs avant de lancer. Les trois vidéos fournies servent de référence visuelle : entrepôt, machines et port. Géométries originales, aucun personnage dans les ateliers. Les pièces animées gardent leurs noms ; le décor statique est regroupé par matériau.

La simplification du mobilier produit des fichiers -v25.glb et conserve les fichiers source. Le reçu assets/room-optimization-v25.json contient les comptages, écarts de dimensions et empreintes SHA-256.

# Ateliers v3
Depuis la racine du dépôt : `blender -b --python tools/blender/build-dioramas-v3.py` (Blender 5.2). Le script repart des modèles v2 du commit indiqué par SOURCE_REV, reconstruit la vanne à vis du Point financier (vis filetée réelle, opercule porté par l'écrou, conduite depuis le réservoir, mails d'alerte, repère de seuil), ajoute la soupape et les évents de la chaîne des PP avec une abscisse curviligne en U sur les conduites, puis biseaute les arêtes de toutes les pièces avant d'écrire assets/dioramas-v2/<id>.glb.gz. Un identifiant en argument limite la reconstruction à ce décor.
