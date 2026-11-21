# Titres, courbe et cadres de l’accueil en mode Expo

Les paramètres proviennent de `htmlInCanvasWebGpu.client-Q-9vA8ER.js`, `tailwind-yGPyQBNf.css` et `source-original.html`, dans l’archive `SHOPIFY_FALL2026_EXTRACTION_COMPLETE.zip`.

- **Titres.** Le nom Mathieu Comtesse et les titres de chapitre sont extrudés en PP Neue Montreal. Le nom suit le tracé vertical de l’accueil sur bureau et horizontal sur mobile. La profondeur vaut 34 px à une taille de référence de 120 px. Les titres de chapitre utilisent 70 % de cette profondeur. Les titres éditoriaux se redressent à 90°.
- **Courbe.** Le tracé principal échantillonne `eˣ` avec `2ˣ` et `3ˣ`, dans le repère du sol, sur l’intervalle de 0 à 5. Les 11 repères ouvrent les chapitres du CV. La formule amortie et son tracé sont visibles à gauche sur écran large.
- **Cadres.** Les trois hauteurs sont calculées avec les coefficients 1,05, 0,70 et 0,35. La liste des chapitres suit un arc de 85° calculé sur ses dimensions et son relief propres. Le décor animé est rendu sur fond transparent dans sa vignette.

La mise en page conserve les textes et visuels du CV. Leur composition et leur éclairage restent à comparer avec la référence dans des captures au même cadrage.

## Relevé typographique

Chrome a comparé les styles calculés de Shopify et du CV à 1 440 × 900 et 390 × 844. Les mesures ci-dessous sont prises dans le plan avant projection. La perspective change la taille apparente à l’écran.

| Rôle | Bureau | Mobile | Police |
| --- | ---: | ---: | --- |
| Titre de chapitre | 120 px / 120 px | 48,72 px / 48,72 px | PP Neue Montreal 500 |
| Intertitre de groupe | 32 px / 40 px | 24 px / 30 px | PP Neue Montreal 500 |
| Titre de carte et texte courant | 18 px / 22 px | 14 px / 18 px | PP Neue Montreal 500 |
| Légende d’accueil | 12 px / 16 px | 12 px / 16 px | Söhne Mono 300 |
| Cadre des chapitres | 11 px / 15 px | Masqué par la mise en page compacte | Söhne Mono 300 |

En Expo, le cadre projette les libellés et numéros aux positions mesurées dans son HTML. Le tracé entre les numéros suit le chemin SVG d’origine et épouse la même courbure que le texte. Les familles, tailles et interlignes ont été contrôlés au niveau du DOM après la bascule en Expo. Le navigateur automatisé ne dispose pas de l’API Canvas nécessaire pour capturer directement la scène Expo de Shopify.

## Superposition du cadre des chapitres

La capture Expo archivée de Shopify correspond à un écran de 2 498 × 1 319. La capture locale a été produite aux mêmes dimensions et au début de l’accueil. Les deux ont été comparées sur la grille réduite de l’archive, à 1 512 × 798.

| Bord horizontal du cadre | Archive Shopify | Avant | Après |
| --- | ---: | ---: | ---: |
| Sommet du panneau | ≈ 236 px | 246 px | 236 px |
| Jonction du panneau et de sa face avant | ≈ 285 px | 298 px | 286 px |

Le panneau utilisait auparavant la hauteur et la rangée de la première vignette. Le panneau possède son propre volume et la bande bleue reste visible derrière lui en Expo. Les zones cliquables suivent les rangées projetées à l’écran. Chrome a vérifié les 11 liens présents, le survol, l’ouverture de Projets professionnels à la souris et le lien Prévention au clavier. Les coordonnées de l’archive sont lues sur une image réduite et donnent une précision d’environ 1 px.

## Position et hauteur du titre « Projets professionnels »

Le moteur extrait part du rectangle des caractères visibles et de la première ligne de base. Il calcule la charnière sous le point le plus bas du texte, en tenant compte des lignes suivantes et des descendantes. La projection du CV utilisait le rectangle du bloc et la dernière ligne de base. La correction lit les deux lignes affichées dans Chrome et leur encrage, puis les extrude autour de l’appui issu de ces mesures.

| Écran | Haut avant | Haut corrigé | Haut calculé d’après l’extraction | Hauteur corrigée |
| --- | ---: | ---: | ---: | ---: |
| 1 440 × 900 | 306,35 px | 339,52 px | 339,55 px | 148,18 px |
| 390 × 844 | 335,95 px | 349,13 px | 348,97 px | 54,68 px |

Les coordonnées sont mesurées au même point de lecture, sur la géométrie rendue par Chrome. Le calcul de référence applique les paramètres extraits au texte et au cadrage de comtesse.me. La comparaison valide les bornes projetées, avec des écarts inférieurs à 0,2 px sur les bords mesurés. L’ombre et le traitement des surfaces restent à comparer visuellement.

## Face des cadres de l’accueil et des projets

Les trois cadres d’accueil portent le contenu sur la face au contact du parcours. Le texte, l’illustration et le point d’appui du modèle partagent le repère de cette face. La face extérieure est dessinée en filaire. La vignette du décor ouvre la page plein écran.

Dans les onze projets, la machine et sa fiche partagent un cadre, avec le texte aligné en haut. Les démonstrations, les résultats et les autres panneaux disposent de cadres construits sur le même principe. Chrome a vérifié les onze projets à 1 440 × 900 et 390 × 844, ainsi que le changement d’étape de la simulation financière et du terminal VRE sur bureau.

Les fenêtres utilisent les captures déjà intégrées. Quatorze emplacements attendent des captures réelles. Le projet Traitement VRE par VM attend le dossier SharePoint, le rapport VRE et le suivi Excel.
