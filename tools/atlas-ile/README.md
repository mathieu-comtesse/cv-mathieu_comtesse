# Atlas du parcours : fabrication de l'île flottante

Voir la section « Atlas du parcours : île flottante » de `REPRISE.md` pour le détail. Commandes :

    python tools/atlas-ile/ile_build.py [--res 0.1] [--tri 330000]     # île + carte -> assets/atlas/ile.bin, ile-carte.bin/json
    python tools/atlas-ile/ile_petits.py                               # rochers et fragments -> assets/atlas/rochers.bin
    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python tools/atlas-ile/blender_build.py -- assets/atlas/batiments.glb
    node tools/atlas-ile/capture.mjs atlas.html sortie.png --w 1500 --h 900 --attente 8000

Fichiers : `ile_carte.py` (carte, implantation), `ile_champ.py` (SDF, bruit spectral, surface nets, facettes), `ile.py` (géologie), `ile_couleurs.py`, `ile_export.py`
(format binaire « MAILLE1 »), `blender_kit.py` + `batiments_def*.py` + `props_def.py` (modélisation), `monde.html` / `batiment.html` (bancs de rendu).
