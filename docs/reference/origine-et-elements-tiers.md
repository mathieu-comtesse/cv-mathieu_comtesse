# Origine du balisage `f26-*` et éléments issus de la référence

Audit réalisé le 20 novembre 2026 sur la branche de la PR 224. Il répond à la demande de documenter l'origine des classes `f26-*` et des variables `--f26-*` et de vérifier qu'aucun élément propriétaire non autorisé n'est livré. **Conclusion de l'audit : 53 % de `refonte/site.css` est identique à la feuille de la référence.** L'auteur du dépôt a déclaré le 20 novembre 2026 disposer d'une autorisation pour la conserver (voir « Autorisation déclarée »). L'auteur a précisé que cette autorisation couvre aussi les captures et relevés de la référence listés plus bas, qui sont conservés.

## Ce qui est vérifié

| Contrôle | Résultat |
|---|---|
| Requêtes vers `shopify.com` ou `shopifycdn.com` au chargement | 0 (`tools/test-no-shopify.mjs --strict`, `tools/test-chapitres.mjs`) |
| Adresses `shopify.com` dans les attributs `src` et `href` de `index.html` | 0 |
| Scripts de la référence chargés | aucun ; le moteur du graphe et du chemin (`refonte/moteur.js`, `refonte/hero-graph.js`, `refonte/theme-stars.js`) est du code écrit pour ce dépôt |
| Polices commerciales de la référence embarquées | aucune ; polices locales sous licence ouverte (Inter, JetBrains Mono, Instrument Serif) ; le nom `Shopify Inter` n'apparaît que comme nom de famille dans le CSS (10 occurrences dans `index.html`) |
| Médias de la référence (images, vidéos, modèles 3D) | aucun dans `index.html` ni `refonte/` ; les visuels sont ceux de `comtesse.me` |
| Métadonnées | **corrigé dans cette PR** : `twitter:site` valait `@Shopify` et `twitter:account_id` portait le compte de Shopify ; les deux balises sont retirées, un contrôle les surveille |

## Origine des classes `f26-*` et des variables `--f26-*`

- Les noms `f26-*`, `--f26-*`, les marqueurs `rmx` et les identifiants de section (`agentic`, `sidekick`… `developer`) viennent du DOM de la page de référence. Ils sont présents depuis `e4193d9` (10 novembre 2026, « V9.1 : relevés typographiques intermédiaires »), donc avant la PR 224.
- Ils sont fonctionnels : la chaîne de couleurs de fond (11 arrêts), les 11 chronologies `--f26-page-0` à `--f26-page-10` et l'avance d'entrée de 247,5 px sont pilotées par eux. Conformément à la demande, ils ne sont pas refondus.
- La PR 224 y ajoute 7 sections de chapitre qui réutilisent ces mécanismes sans en changer un paramètre, et déplace l'ancre `#perso` à l'intérieur de sa section.

## Résultat de la comparaison de `refonte/site.css` avec la feuille de la référence

Comparaison faite sur la feuille compilée publique de la référence (`tailwind-*.css`, 172 335 caractères sans espaces), non copiée dans le dépôt : 511 des 973 segments consécutifs de 60 caractères de `refonte/site.css` (**53 %**) s'y retrouvent à l'identique. Les règles utilitaires générées par Tailwind (licence MIT) expliquent une partie de cette part. En revanche la logique propre à la référence s'y retrouve aussi telle quelle : `--f26-page-fill`, `--f26-entry-lead`, `--f26-crossfade-line`, `view-timeline-name`. La dépendance `docs/reference/dependances-shopify.md` note déjà que la feuille de la référence a été remplacée par `refonte/site.css` ; elle ne précise pas que ce fichier en reprend une partie littéralement.

## Captures de la référence présentes dans le dépôt (antérieures à la PR 224)

- `docs/cadres-3d/topo-home/reference-origine.json`
- `docs/fall26-evidence/contact-reference.png`
- `docs/fall26-evidence/expo-animations-reference-contre-comtesse.png`
- `docs/fall26-evidence/expo-graphe-reference-contre-comtesse.png`
- `docs/fall26-evidence/expo-objet-formule-reference-contre-comtesse.png`
- `docs/fall26-evidence/expo-panneau-courbe-reference-contre-comtesse.png`
- `docs/fall26-evidence/expo-presentoirs-reference-contre-comtesse.png`
- `docs/fall26-evidence/expo-ref-chrome157-2498x1319-reduit-1512.jpg`
- `docs/fall26-evidence/expo-ref-chrome157-a-plat.jpg`
- `docs/fall26-evidence/expo-ref-chrome157-expo-instant.jpg`
- `docs/fall26-evidence/expo-ref-chrome157-expo-stabilise.jpg`
- `docs/fall26-evidence/expo-reference-contre-comtesse-cote-a-cote.png`
- `docs/fall26-evidence/expo-titre-dessus-reference-contre-comtesse.png`
- `docs/v9/typo-reference-initiale/shopify-1440-0.jpg`
- `docs/v9/typo-reference-initiale/shopify-1440-405.jpg`
- `docs/v9/typo-reference-initiale/shopify-1440-990.jpg`
- `docs/v9/typo-reference-initiale/shopify-1440.json`
- `docs/v9/typo-reference-initiale/shopify-1920-0.jpg`
- `docs/v9/typo-reference-initiale/shopify-1920-1188.jpg`
- `docs/v9/typo-reference-initiale/shopify-1920-486.jpg`
- `docs/v9/typo-reference-initiale/shopify-1920.json`
- `docs/v9/typo-reference-initiale/shopify-390-0.jpg`
- `docs/v9/typo-reference-initiale/shopify-390-380.jpg`
- `docs/v9/typo-reference-initiale/shopify-390-928.jpg`
- `docs/v9/typo-reference-initiale/shopify-390.json`
- `docs/v9/typo-reference-initiale/shopify-768-0.jpg`
- `docs/v9/typo-reference-initiale/shopify-768-1126.jpg`
- `docs/v9/typo-reference-initiale/shopify-768-461.jpg`
- `docs/v9/typo-reference-initiale/shopify-768.json`

La PR 224 ne verse aucune capture de la référence : les planches ajoutées (`docs/fall26-evidence/accueil-*`, `chapitres-*`) ne montrent que le site. Une formulation antérieure de la description de la PR disait « les captures de la référence ne sont pas versées dans le dépôt » : elle ne valait que pour cette PR et ne tenait pas compte des fichiers ci-dessus.

## Autorisation déclarée

Le 20 novembre 2026, en réponse à la question « autorisation écrite pour garder `refonte/site.css`, ou réécriture ? », l'auteur du dépôt a répondu : « J'ai une autorisation ». Le même jour, à la question de savoir si elle couvrait aussi les captures et relevés de la référence, il a répondu : « Oui l'autorisation couvre tout ». Ces déclarations sont enregistrées ici telles quelles : la pièce n'est pas versée au dépôt, son émetteur et sa date ne sont pas précisés, et je n'ai pas pu les vérifier. Le périmètre déclaré est : feuille de style, captures et relevés de la référence. Il est recommandé de conserver la pièce hors du dépôt et d'en indiquer ici l'émetteur et la date.

## Ce qui reste à décider

1. **`refonte/site.css`** : conservé, sur autorisation déclarée (ci-dessus). La PR ne doit toutefois pas être décrite comme une « reconstruction indépendante » : le balisage et la feuille de style reprennent la structure de la référence, seuls le moteur du graphe et du chemin sont originaux.
2. **Captures de la référence ci-dessus** : conservées, l'autorisation déclarée les couvrant (« couvre tout »).
