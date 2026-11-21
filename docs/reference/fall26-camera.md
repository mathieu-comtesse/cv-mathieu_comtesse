# Trajectoire de la caméra du chemin 3D

L’archive `SHOPIFY_FALL2026_EXTRACTION_COMPLETE.zip` contient `htmlInCanvasWebGpu.client-Q-9vA8ER.js` et `easing-BhDfN7yX.js`. Le premier définit une horloge linéaire de 800 ms et inverse son sens lors d’une seconde commande. Il applique une courbe cubique d’entrée et de sortie à la visée, au champ de vision et au pli du sol. La montée des cadres suit une courbe cubique de sortie après 35 % du temps (280 ms).

| Temps | Visée sous l’horizontale | Champ de vision vertical | Hauteur relative des cadres |
|---:|---:|---:|---:|
| 0 ms | 90,0° | 50,0° | 0 % |
| 200 ms | 86,3° | 49,7° | 0 % |
| 400 ms | 60,1° | 47,5° | 54,5 % |
| 600 ms | 33,9° | 45,3° | 94,3 % |
| 800 ms | 30,2° | 45,0° | 100 % |

Le comparatif exécute la projection de l’archive et celle de comtesse.me à 49 instants, à 1 440 × 900 et 390 × 844. À chaque instant, 15 points au sol et 15 points à une hauteur de 8 % de l’écran sont projetés. L’écart maximal est passé de 38,20 px à moins de 0,01 px sur ces points. Cette mesure porte sur la géométrie calculée aux mêmes instants. Les matériaux, textes et autres objets de la scène ont leurs propres critères de rendu.

Dans Chrome, l’inversion de la bascule, la conservation de la position de lecture et le mouvement réduit ont été vérifiés sur les deux tailles. Le dernier état a été échantillonné après 978 ms sur bureau et 868 ms sur mobile émulé, avec des images sautées dans cet environnement. La durée programmée reste 800 ms. La fluidité sur appareil réel reste à mesurer.
