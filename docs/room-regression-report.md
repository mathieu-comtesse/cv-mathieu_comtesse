# Contrôles de Ma pièce

Base `90f6b5d5655ce46eb563e90f466f04bcebdb1765`, branche `codex/room-art-remaster`. Les captures ont été prises dans Chromium dans la scène complète. Le test charge également l’`index.html` du dépôt pour vérifier le point d’entrée utilisé par l’accueil.

| Contrôle | Résultat |
| --- | --- |
| Conservation Three.js | Les 2 810 nœuds initiaux sont retrouvés sur desktop et mobile émulé. 44 identifiants interactifs et leurs stations sont conservés. La branche contient 2 820 nœuds |
| Source des modèles | Blender 5.2 charge les six fichiers comparés. Mêmes noms et mêmes bornes mesurées pour le Mamiya, l’Olivetti et le Trek |
| Bureau, hi-fi et télévision | Le pont Native atteint `ready`. Électricité du bureau, ouverture du tiroir, activation de la console, lampe et météo validées sur les deux profils Chromium |
| Chashitsu | Les trois shoji de la scène complète sont disponibles sur l’accueil de la branche. Le test vérifie une bascule de panneau |
| Cycle de rendu | Suspension et reprise lors d’un événement de fenêtre sur desktop et mobile. Restauration après perte WebGL contrôlée sur Chromium desktop |
| Navigation et géométries | `test-navigation.mjs` valide 102 routes et le blocage en coin. `test-native-geometry.mjs` valide les attributs GLTF et l’isolation des sources |
| Intégrité statique | `test-site-consistency.mjs` valide 39 pages. `seo-build.mjs --check` signale 41 fichiers à régénérer, hors des corrections de la pièce |
| Firefox et WebKit | Le moteur de la scène complète, le pont Native et les commandes de base ont répondu en profil desktop. L’ouverture via l’accueil doit être qualifiée séparément |

Les six tests historiques demandés (`test-scene-runtime`, `test-scene-lifecycle`, `test-custom-scene`, `test-user-room-props`, `test-v47-touch-album`, `test-v50-room-props`) expirent déjà sur le commit de référence en attendant l’ancienne intégration `#room` ou `window.room` sur la route racine. L’accueil actuel expose `[data-cv-room3d]` et `window.__cvRoom3d`. Le nouveau test contrôle cette entrée sans adapter les anciens scripts.

La couverture automatisée reste partielle pour le glisser-déposer du personnage, le son d’un vinyle, la lecture intégrale des films et l’usage sur téléphone physique. Les [mesures](room-performance-report.md) et [captures comparatives](room-art-direction.md#cadrages) sont séparées des résultats fonctionnels.

## Reproduire

Avec Node.js et Chromium installés, exécuter depuis la branche.

```sh
npm install --no-save playwright@1.61.0
npx playwright install chromium
node tools/test-room-art.mjs test-results/room-art
```

Pour comparer avec une base, exécuter d’abord le script avec `ROOM_ART_SOURCE` pointant vers un checkout de référence, puis fournir en deuxième argument le fichier `room-scene.json` produit. La référence peut aussi être un overlay extrait du commit de base si seuls les fichiers modifiés y sont présents. Pour ouvrir le site local dans un navigateur, lancer `npx serve --listen tcp://127.0.0.1:8753` depuis la racine du dépôt et naviguer vers cette adresse.
