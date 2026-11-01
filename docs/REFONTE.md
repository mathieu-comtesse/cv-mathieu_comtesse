# Refonte et audit de comtesse.me : rapport

Branche de travail : `claude/optimistic-bohr-mnktpp`. État initial sauvegardé par le tag `baseline-avant-refonte-20261101`. Rien n'est déployé en production.

## 1. Ce qui a été modifié

| Domaine | Modification | Fichiers |
|---|---|---|
| Accueil | Présentation professionnelle (poste, domaines, phrase de valeur) et quatre accès directs (réalisations, CV, parcours, contact) posés sur la scène, sans carte. Le texte « JavaScript requis » devient une navigation de secours. | `index.html`, `refonte/rf.css` |
| Pied de page | Version, navigateur, heure et dimensions déplacés dans un panneau « Informations techniques » fermé par défaut, sur 38 pages. | pages `*.html`, `refonte/rf.css` |
| SEO | Canonique, Open Graph, Twitter, JSON-LD (ProfilePage et Person sur l'accueil, CreativeWork et BreadcrumbList sur projets et études), `sitemap.xml`, `robots.txt`, `404.html`. Le tout est généré par `tools/seo-build.mjs`. | `tools/seo-build.mjs`, `sitemap.xml`, `robots.txt`, `404.html`, pages |
| Titres et descriptions | 24 descriptions génériques (« étude détaillée d'un projet de Mathieu Comtesse ») remplacées par la problématique réelle de chaque fiche. Les 10 études ne partagent plus titre et description avec la fiche projet. | pages `projet-*.html`, `article-*.html` |
| Aperçus de partage | 11 images 1200 x 630 (JPEG) composées avec les figures existantes sur le fond de l'image d'accueil. | `assets/og/` |
| Indicateurs | Référentiel `js/indicators.js` : 14 indicateurs avec identifiant, projet, unité, valeur, nature, source, méthode, hypothèses, période, date de vérification, périmètre, niveau de validation. Il dérive de `js/annual-gains.js`, qui reste la seule source des calculs. | `js/indicators.js` |
| Page Gains | Tableau HTML accessible des mêmes données que le graphique et panneau « Méthodologie du calcul ». | `js/gains-table.js`, `refonte/gains.js`, `refonte/gains.css` |
| CV | PDF régénéré depuis une source versionnée, dans l'ordre demandé, noir et blanc, texte dans l'ordre de lecture, liens cliquables, PDF balisé. | `cv/cv.html`, `tools/build-cv.mjs`, `assets/cv-ats-mathieu-comtesse.pdf` |
| Polices | Instrument Serif hébergée localement (licence OFL) : plus de requête vers Google Fonts sur l'accueil. | `refonte/fonts/`, `refonte/rf.css`, `index.html` |
| Cohérence | « Jeu ISO 45001 · Jeu ISO 45001 » corrigé, tirets cadratins retirés des titres et descriptions, titre de la démonstration de contrôle de ligne distingué de la fiche projet. | `projet-talas.html`, `thaleolithic/index.html`, `js/pages.js`, `ligne-controle.html` |
| Tests | Deux tests existants périmés mis à jour, trois nouveaux contrôles, un workflow CI dédié. | `tools/`, `.github/workflows/site-integrity.yml` |

## 2. Constats de l'audit

1. **THALEOLITHIC et UNGA BUNGA 45001** désignent le même projet. `unga-bunga-45001/` est l'ancienne adresse (historique git : « Publie UNGA BUNGA 45001 V8 à la place de Talas »). Elle redirige vers `/thaleolithic/`. Il reste l'identifiant technique `UNGA_WEB_BRIDGE` dans le pont Unity et un fichier `UngaBungaCampaign.json` : à ne pas renommer sans reconstruire le build Unity. Un test interdit désormais l'ancien nom dans les pages publiques.
2. **Deux tests existants échouaient avant toute modification.** `test-annual-gains` attendait 25 jours de construction et 210 h de maintenance, le code et la note affichée sur la page Gains disent 25,5 jours et 45,5 h (cohérents entre eux). `test-project-metadata` attendait des tirets demi-cadratins alors que le site écrit « à ». Les tests étaient périmés, pas le code.
3. **Ordre de lecture du CV PDF d'origine.** Dans le flux du PDF, le titre « Ingénieur Maintenance et Qualité (alternance) », la première phrase du profil et l'intitulé du poste actuel venaient après la section Langues (retouches ajoutées après coup). Un ATS pouvait donc lire un CV sans titre ni début de profil. Aucun lien cliquable non plus (0 annotation URI).
4. **SEO** : aucun `robots.txt`, `sitemap.xml` ni `404.html`, aucune URL canonique, Open Graph seulement sur l'accueil, aucun JSON-LD, 10 paires fiche et étude avec titre et description identiques.
5. **Numérotation** : les fiches projet comptent « n / 11 » (avec Lecteur VRE) et les études « n / 10 » (Lecteur VRE n'a pas d'étude). C'est cohérent en interne, vérifié par test, mais deux totaux voisins peuvent surprendre.
6. **Gains** : les totaux du CV (3 200 à 4 000 h, 2 à 2,5 postes, 335 000 à 420 000 euros) correspondent au calcul « volumes fournis » du code (3 193,75 à 4 010,42 h, 334 513 à 420 051 euros). Les estimations (consultations supposées, capacité théorique de l'extracteur) sont déjà totalisées à part. Les trois outils VRE (30 + 15 + 25 min) portent sur les mêmes rapports, ce qui est documenté mais **non chronométré** : c'est le principal point à confirmer.
7. **Taux horaire de 104,74 €** : aucune composition documentée dans le dépôt. Il est affiché « à documenter » dans la méthodologie.
8. **Économies budgétaires réelles** : aucune n'est renseignée dans les données. La page Gains le dit explicitement, les euros restent du temps valorisé.
9. **Chargement** : l'accueil précharge environ 38 Mo de modèles et d'images (mesure ci-dessous). L'écran d'ouverture attend la pièce 3D complète, avec une ouverture forcée à 15 s.

## 3. Mesures (laboratoire)

Conditions : Chromium headless avec rendu logiciel (SwiftShader) dans un conteneur, serveur local, cache vide, sans limitation réseau. Ces valeurs servent à comparer avant et après, pas à prédire l'expérience réelle (pas de GPU, pas de réseau mobile). Aucune donnée d'utilisateurs réels n'a été consultée.

| Accueil | LCP | CLS | Poids transféré | Requêtes | Mémoire JS |
|---|---|---|---|---|---|
| Avant, bureau 1440 x 900 | 4,5 s | 0,0001 | 38,5 Mo | 246 | 188 Mo |
| Avant, mobile 390 x 844 | 5,3 s | 0 | 38,6 Mo | 259 | 177 Mo |

Les objectifs (LCP 2,5 s, INP 200 ms, CLS 0,1) ne sont **pas démontrés atteints** : le LCP de laboratoire dépasse 2,5 s. INP n'a pas été mesuré.

## 4. Non résolu, avec les raisons

- **Poids des modèles 3D** (38 Mo) : compression des maillages et textures (Draco, KTX2) non faite. Elle exige une comparaison visuelle avant et après modèle par modèle, que je n'ai pas pu faire de façon fiable sans GPU.
- **Double parcours professionnel et exploratoire** : les deux existent de fait (accès directs, page Expériences, études) mais il n'y a pas de bascule explicite. Le chantier demande des décisions de contenu.
- **Filtres combinables, recherche et classification en huit catégories** de la galerie : non réalisés. La galerie est une mosaïque éditoriale, sa refonte est un chantier à part.
- **Sections d'études de cas** (diagnostic, contribution personnelle, limites, méthode PDCA ou DMAIC) : non rédigées. Elles demandent des informations que seul Mathieu possède, et je n'invente ni audit ni résultat.
- **Blog** : le système de publication par catégories n'est pas construit. Les articles actuels sont les études de projet. Aucun nouvel article n'a été écrit.
- **Accessibilité** : pas d'audit complet WCAG 2.2, pas de test lecteur d'écran. Ajoutés : cibles tactiles de 44 px et focus visible sur les nouveaux contrôles, respect de `prefers-reduced-motion`, tableau alternatif aux graphiques.
- **Sécurité** : pas de formulaire de contact (adresse copiable et liens). Aucun secret trouvé par recherche de motifs dans le code livré. À décider : le « mot magique » de la section Contact décrit publiquement un filtre antispam, l'adresse est en clair dans la page, et le numéro de téléphone figure dans le CV. Pas de CSP : l'hébergement statique n'autorise pas d'en-têtes, et une balise meta casserait les scripts inline et l'importmap.
- **Aperçus de partage** : les images sont des JPEG composés sans texte. Les fiches de jeux personnels utilisent encore l'image d'accueil.

## 5. À faire par Mathieu

1. Relire le nouveau CV (contenu repris du PDF d'origine, restructuré, deux pages). Retirés par simplification : mémoire Obsidian, orchestration multi-modèles, compétences Markdown, Office Scripts conservé. Confirmer le niveau réel sur ISO 14001, 27001 et 19443 (affichés « étudiés ou pratiqués »).
2. Chronométrer un échantillon de rapports pour confirmer que VM, Q18 et extracteur VRE ne se chevauchent pas.
3. Documenter la composition du taux de 104,74 €/h.
4. Indiquer si une date de vérification et un relecteur peuvent être renseignés dans `js/indicators.js`.
5. Décider du sort du « mot magique » et de l'affichage du numéro de téléphone.

## 6. Maintenance

- Ajouter une page : créer le HTML avec `<title>`, `<meta name="description">` et un `<h1>`, puis lancer `node tools/seo-build.mjs`. Le bloc SEO, le sitemap et la canonique se mettent à jour.
- Ajouter un indicateur : ajouter la ligne dans `js/annual-gains.js` et ses compléments dans `META` de `js/indicators.js`. `tools/test-indicators.mjs` vérifie les champs requis et la cohérence.
- Régénérer le CV : modifier `cv/cv.html` puis `node tools/build-cv.mjs` (nécessite Playwright).
- Contrôles : `node tools/seo-build.mjs --check`, `node tools/test-site-consistency.mjs`, `node tools/test-indicators.mjs`.
