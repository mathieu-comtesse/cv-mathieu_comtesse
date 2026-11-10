# V9.1 : correspondance typographique Shopify Editions Fall 2026 / comtesse.me

Sources : `tools/v9-typo-audit.mjs` (relevés : `docs/v9/typo/`, état initial conservé dans `docs/v9/typo-reference-initiale/`), `tools/v9-hero-cards.mjs` (`docs/v9/cadres/`). Rendu logiciel (SwiftShader), polices attendues et stabilisation des positions avant chaque relevé. La « taille visible » est la taille CSS multipliée par l'échelle locale de l'homographie du conteneur incliné.

## Constats mesurés (1440 x 900)
| rôle | Shopify | comtesse.me, CSS | comtesse.me, visible |
|---|---|---|---|
| grand titre | 120 px | 128,2 px | 128,2 px |
| titre de cadre | 14 px | 20 px (jusqu'à 28,8) | 11,6 px |
| description | 18 px | 15 px (jusqu'à 28) | 7,8 px |
| légende | 12 px | 12 px (jusqu'à 16 avant correction) | 7,7 px |

Grand titre à 768 / 390 px : Shopify 64 / 48,7 px, comtesse.me 64,1 / 64,1 px (**mobile : 31 % trop grand, non corrigé à ce jour**).

## Ce qui est établi
- Au chargement, les deux pages ont la même pile typographique (Söhne Mono 12 / 11 / 10 px, Inter 14 / 18 px).
- Les textes des chapitres ne sont pas « trop grands » à l'écran : leur taille visible (7 à 12 px) est inférieure à celle de Shopify. Une réduction uniforme les rendrait illisibles. Les blocs sont trop grands **en CSS** parce que les cartes sont larges avant projection.
- Défaut corrigé : `.cv-parity-widget figcaption{font-size:18px!important}` imposait 18 px aux légendes des trois cadres (référence : 12 px). Légendes à 4 lignes avant, 3 lignes après, aucun recouvrement texte / carte mesuré à 1440 et 1920 px.

## Restant (non corrigé)
1. Grand titre mobile (64 px contre 48,7 px) et desktop (128,2 contre 120 px).
2. `h2.pc-h` : la famille mesurée est Arial (repli de police), à comprendre.
3. Les trois cadres : la liste de navigation de gauche (`cv-parity-nav`) et les lettres 3D du titre passent sur les cartes ; le bord de la carte 1 touche la première ligne du texte de la carte 2.
4. Aucun relevé « titre de chapitre » côté Shopify (le titre de section de Shopify est classé en grand titre) ; mode à plat non mesuré.
5. Sur 768 et 390 px, les trois cartes n'existent pas (constaté, ni mesuré ni validé).
