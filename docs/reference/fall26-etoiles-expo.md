# Branches et étoiles en mode Expo

Le moteur extrait distingue le graphe de l’accueil des groupes de contenus rencontrés dans le parcours. Les segments relient les nœuds en volume et projettent leur ombre au sol. Les groupes de parcours disposent les vignettes sur une sphère. Ils relient chaque vignette au foyer et aux deux vignettes les plus proches. Les impulsions lumineuses suivent le segment avec deux phases reproductibles et une traînée de 1 s. Les anneaux de l’accueil sont dessinés au sol en 64 segments.

Les fichiers de référence sont `htmlInCanvasWebGpu.client-Q-9vA8ER.js`, `pack-D8z7b37W.js` et `graph-data.json`, dans `SHOPIFY_FALL2026_EXTRACTION_COMPLETE.zip`. Le rendu de comtesse.me utilise les 11 effectifs de mises à jour relevés dans le graphe de Shopify comme densité minimale de chaque groupe d’accueil. Les vignettes et leurs liens proviennent du CV. Les autres points sont décoratifs.

Le mode Expo utilise ces réglages dans `refonte/ciel-expo.js`. Les positions des foyers de l’accueil et la répartition des relations entre chapitres restent propres à comtesse.me. La comparaison porte sur la forme des liens, leur comportement et les règles d’affichage. L’identité visuelle pixel par pixel reste à vérifier, en particulier sur les positions des nœuds et la composition du graphe principal.

Les branches rejoignent les modèles dans la scène 3D du parcours. Le foyer central est relevé de 16 % de la hauteur de la fenêtre. Les 11 foyers de chapitre en reprennent 57 %. Les points se répartissent au-dessus et au-dessous de cette hauteur sur la surface d’une sphère. Les ombres suivent la courbure du parcours avec la direction de lumière relevée dans l’extraction.

Chrome à 1 440 × 900 a affiché 11 foyers de chapitre, 83 vignettes et 234 segments 3D sur l’accueil Expo. Le test a saisi une vignette, l’a relâchée, puis a ouvert son contenu d’un clic après le retour en place. Le retour à plat a aussi été vérifié. Aucune erreur JavaScript n’a été relevée.
