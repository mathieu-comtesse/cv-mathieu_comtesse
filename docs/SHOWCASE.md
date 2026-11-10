# Vitrines « outil réel » dans les cadres du parcours

Chaque cadre projet du parcours 3D (`index.html`) peut recevoir, **dans la même carte**, une vitrine qui montre l'outil réel : fenêtres de type macOS, console du traitement, résultat. La machine 3D, « Voir la magie » et « Explorer la machine » ne changent pas. Aucune seconde scène 3D : la vitrine est un `.cv-pframe` de plus dans `.cv-card-body`, donc elle suit exactement la position, la perspective, la trajectoire et la sélection des autres cadres (HTML-in-Canvas ou repli DOM).

## Fichiers
| fichier | rôle |
|---|---|
| `refonte/showcase/config.mjs` | configuration par fiche : fenêtres, étapes, statut de chaque visuel |
| `refonte/showcase/build.mjs` | génère le HTML (lisible sans JavaScript) |
| `tools/build-parcours-projets.mjs` | insère la vitrine dans chaque carte, ajoute CSS et JS une seule fois ; **une régénération conserve les vitrines** |
| `refonte/showcase.css`, `refonte/showcase.js` | rendu 2D et animation : une seule boucle partagée, active seulement près de l'écran |
| `tools/test-showcase.mjs` | contenance des fenêtres, états par étape, chargement différé, agrandissement, honnêteté des emplacements |

Ordre de régénération : `node tools/build-parcours-projets.mjs` puis `node tools/seo-build.mjs`.

## Règles de contenu
- La console reprend **uniquement** les titres des étapes de « Comment ça marche » de la fiche ; le résultat reprend `data-result` : aucune sortie, aucun chiffre inventés.
- Une fenêtre est `authentic` (capture réelle de l'application, fichier présent) ou `missing` (emplacement). Une simulation n'est jamais déclarée `authentic`. Un emplacement affiche « Capture à fournir » et la description du visuel attendu.
- Les captures ne se chargent qu'à l'approche du cadre (`IntersectionObserver`, 700 px). Pas de vidéo dans le cadre (HTML-in-Canvas) : les vidéos de démonstration restent des médias à part.

## Interactions
Seuls les clics sur une capture réelle (agrandissement dans un `<dialog>` natif : Échap, retour du focus, lien vers la fiche) et sur les onglets d'étape agissent. Aucune écoute de pointeur sur la scène : les gestes de navigation 3D passent. Choix manuel d'une étape : la progression au défilement reprend après 7 s. Mouvements réduits : état final, sans animation.

## Inventaire des médias du dépôt
| projet | capture authentique de l'outil | autres médias | manquant |
|---|---|---|---|
| CERFA | `assets/media/demo-cerfa-poster.jpg` (dépôt), `assets/projets/cerfa.jpg` (parc extrait), `assets/media/demo-cerfa.mp4` | `assets/dioramas*/cerfa.*` (diorama 3D, simulation) | document source, fenêtre de classement détaillée |
| Studio d'extracteurs PDF | `assets/media/studio-poster.jpg`, `assets/projets/studio.jpg`, `assets/media/studio-demo.mp4` | `assets/dioramas*/studio.*` | PDF avec cadres, export |
| Power BI / MOSO | `assets/media/demo-powerbi-poster.jpg`, `assets/projets/powerbi.jpg`, `assets/media/demo-powerbi.mp4` | `assets/dioramas*/powerbi.*` | sources documentaires, rapprochement |
| Gares prioritaires | `assets/media/demo-gares-poster.jpg`, `assets/projets/gares.jpg`, `assets/media/demo-gares.mp4` | `assets/dioramas*/gares.*` | |
| Extracteur VRE | `assets/media/demo-vre-poster.jpg`, `assets/projets/vre.jpg`, `assets/media/demo-vre.mp4` | `assets/dioramas*/vre.*` | |
| Suivi | `assets/projets/suivi.jpg` | | |
| Power Automate PP | `assets/projets/pp.jpg` | | |
| **Reporteur Q18** | **aucune** | `assets/figures/moteur-light.webp` (dessin de la machine), `assets/dioramas*/moteur44.*` (simulation 3D) | **SharePoint, rapport PDF, classeur Excel (3 emplacements en place)** |
| **Nisaru** | **aucune** | `assets/figures/vrestudio-*.webp` (dessins) | import PDF, champs reconnus, assistant, validation humaine, export |
| Finance, VRE par VM | à vérifier | `assets/figures/*-light.webp` (dessins), dioramas | à confirmer |

`assets/figures/*`, `assets/dioramas*/*` et `assets/og/*` sont des dessins, des simulations 3D ou des visuels de partage : jamais présentés comme des captures réelles.

## Visuels à fournir pour Q18 (emplacements déjà configurés)
1. **SharePoint** : bibliothèque des rapports, vue liste, 1440 px de large minimum. Masquer : noms de clients, références de rapports, identifiants, noms de personnes.
2. **Rapport PDF** : première page d'un rapport de vérification réel. Masquer : client, site, numéro d'OT, signatures.
3. **Excel de suivi** : ligne retrouvée et cellule renseignée. Masquer : références d'équipement, noms de sites, données personnelles.
Déposer les fichiers dans `assets/showcase/q18/`, puis dans `refonte/showcase/config.mjs` passer chaque fenêtre à `status: 'authentic'` avec `src`, `alt` et `caption`, et relancer la génération. **Anonymiser avant tout commit** : les captures sont publiées telles quelles.

## État
Cadre de référence : Reporteur Q18 (3 emplacements). Cadre qui prouve le chemin « captures réelles » : CERFA (2 captures réelles). Les neuf autres projets ne sont pas encore activés ; leur généralisation attend la validation du cadre de référence. Captures de validation : `docs/showcase/`.
