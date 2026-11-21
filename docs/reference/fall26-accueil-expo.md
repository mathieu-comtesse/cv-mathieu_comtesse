# Titres, courbe et cadres de l’accueil en mode Expo

Les paramètres proviennent de `htmlInCanvasWebGpu.client-Q-9vA8ER.js`, `tailwind-yGPyQBNf.css` et `source-original.html`, dans l’archive `SHOPIFY_FALL2026_EXTRACTION_COMPLETE.zip`.

- **Titres.** Le nom Mathieu Comtesse et les titres de chapitre sont extrudés en PP Neue Montreal. Le nom suit le tracé vertical de l’accueil sur bureau et horizontal sur mobile. La profondeur vaut 34 px à une taille de référence de 120 px. Les titres de chapitre utilisent 70 % de cette profondeur. Les titres éditoriaux se redressent à 90°.
- **Courbe.** Le tracé principal échantillonne `eˣ` avec `2ˣ` et `3ˣ`, dans le repère du sol, sur l’intervalle de 0 à 5. Les 11 repères ouvrent les chapitres du CV. La formule amortie et son tracé sont visibles à gauche sur écran large.
- **Cadres.** Les trois hauteurs sont calculées avec les coefficients 1,05, 0,70 et 0,35. Les faces avant rejoignent le cadre suivant. La liste des chapitres suit un arc de 85° tangent au premier cadre. Le décor animé est rendu sur fond transparent dans sa vignette.

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
