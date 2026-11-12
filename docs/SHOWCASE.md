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

## Statuts des visuels (V8)
| statut | sens | étiquette | exemples |
|---|---|---|---|
| `authentic` | capture de l'interface d'un fichier HTML local fourni, ouvert hors connexion aux systèmes métier. **Ne prouve pas un traitement.** | Interface locale | Nisaru R27, Metadata Studio V11 |
| `demo` | capture ou animation de démonstration : données fictives ou interface reconstituée | Démo · données fictives | animations finance, pages de démonstration du dépôt (Gares, Studio, PP + MOSO, VRE, Suivi) |
| `mockup` | maquette ou référence graphique | Maquette | (aucune publiée) |
| `missing` | aucun visuel : emplacement documenté (`need`, `anonymize`), aucune image simulée | Capture à fournir | SharePoint, Excel, rapports, exports |

## Revue des captures du dossier `DOSSIER_COMTESSE_PROJETS_2026-11-10` (une par une)
Le dossier est resté **hors du dépôt** (`/tmp`), `06_SOURCES_PRIVEES_A_NE_PAS_PUBLIER` n'a pas été ouvert ni copié.

| capture | verdict | raison |
|---|---|---|
| `nisaru-r27`, `nisaru-rapports`, `nisaru-assistant`, `nisaru-apprentissage`, `nisaru-memoire` | publiées (`assets/showcase/lecteur-vre/`) | interface locale, états vides (N/D), aucune donnée personnelle ni identifiant |
| `nisaru-exports` | **écartée** | cite « DEKRA », nom absent de toutes les pages publiques, et ne montre pas d'export (assistant ouvert sur la synthèse) |
| `metadata-import`, `metadata-v11`, `metadata-cerfa-fluides`, `metadata-controle-qualite`, `metadata-livrables` | publiées (`assets/showcase/cerfa/`) | interface locale V11, états vides, références réglementaires publiques ; « ABE SUD » déjà public dans les fiches |
| `metadata-laboratoire-ia` | **écartée** | chemin de dossier local visible (`C:\LayoutLMv3-base`) |
| `epm-controles`, `epm-documents`, `epm-eptx`, `epm-operations`, `epm-sources` | **écartées** | données internes : identifiants d'opérations, noms de sites et de secteurs, projets, comptages, liens SharePoint, équipes. À anonymiser avant tout usage ; emplacement « Suivi EPM / EPTx » documenté |
| `suivi-emt` | **écartée** | écran de connexion protégé, aucune illustration de résultat |
| `01` à `03_Classeur / Flux / Mail` (vidéos Power Automate finance) | trois images fixes publiées (`assets/showcase/finance/`) | **animations pédagogiques** (« données financières fictives ; interface reconstituée ») : statut `demo`, jamais « capture réelle » |
| captures historiques VRE Studio, flux Power Automate anciens, maquettes Figma, vidéos VRE/Nisaru | non utilisées | version et provenance non établies pour les outils actuels ; maquettes sans valeur de preuve |

## Médias du dépôt réutilisés (page de démonstration publiée, données fictives, statut `demo`)
Gares prioritaires (`demo-gares-poster`), Studio (`studio-poster`, `projets/studio`), PP + MOSO (`demo-powerbi-poster`, `projets/pp`), Extracteur VRE (`demo-vre-poster`), Retrouver tout le suivi (`projets/suivi`). **`projets/pp.jpg` est le rapport PP + MOSO (Power BI), pas la chaîne Power Automate des PP** : la chaîne des PP n'a donc aucune capture associée.

## Mapping final des onze vitrines
| projet | machine conservée | fenêtres | statuts |
|---|---|---|---|
| Point financier | réservoir | classeur Excel, flux Power Automate, courriel préventif | 3 démo |
| VRE par VM | tri postal | SharePoint, rapport, suivi Excel + console pédagogique | 3 manquantes |
| Reporteur Q18 | machine à écrire | SharePoint, rapport PDF, Excel + console pédagogique | 3 manquantes |
| Chaîne des PP | horloge-calendrier | SharePoint, flux, relance + console pédagogique | 3 manquantes |
| CERFA | trieuse | Metadata Studio V11 : import, vue d'ensemble, fluides, contrôle qualité, livrables | 5 locales |
| Extracteur VRE | boulier | dépôt et vérification, export | 1 démo, 1 manquante |
| Nisaru | ascenseur, main humaine | import, analyse, assistant, contrôle humain, mémoire, export | 5 locales, 1 manquante |
| Power BI PP / MOSO | paternoster | pilotage, plans valides, suivi EPM / EPTx (autre outil) | 2 démo, 1 manquante |
| Studio PDF | atelier | gabarit, cadres | 2 démo |
| Retrouver tout le suivi | standard téléphonique | recherche, résultat | 1 démo, 1 manquante |
| Gares prioritaires | tambours | classement, fiche | 1 démo, 1 manquante |

Éléments encore manquants : captures SharePoint, Excel, rapports PDF (Q18, VRE par VM, chaîne des PP), export Nisaru, flux et relance de la chaîne des PP, fiche de gare, suivi fonctionnel, résultat du Studio, EPM / EPTx anonymisées.

## Interactions et ordonnancement (V8)
- Agrandissement : clic souris réel (vérifié sur les cadres Nisaru, finance, CERFA et PP + MOSO dans le parcours 3D), Entrée ou Espace au clavier, Échap pour fermer ; image haute définition (1440 px) ; légende avec statut et provenance.
- Mobile : les fenêtres sont petites dans la perspective du parcours ; l'agrandissement au toucher est le moyen de lire un écran.
- Boucle : plus de `requestAnimationFrame` permanent. Défilement, redimensionnement, geste ou clic réveillent une boucle unique, éteinte 1,4 s après le dernier mouvement ; images chargées une par une (160 ms), aussi en mouvements réduits.

## Visuels à fournir pour Q18 (emplacements déjà configurés)
1. **SharePoint** : bibliothèque des rapports, vue liste, 1440 px de large minimum. Masquer : noms de clients, références de rapports, identifiants, noms de personnes.
2. **Rapport PDF** : première page d'un rapport de vérification réel. Masquer : client, site, numéro d'OT, signatures.
3. **Excel de suivi** : ligne retrouvée et cellule renseignée. Masquer : références d'équipement, noms de sites, données personnelles.
Déposer les fichiers dans `assets/showcase/q18/`, puis dans `refonte/showcase/config.mjs` passer chaque fenêtre à `status: 'authentic'` avec `src`, `alt` et `caption`, et relancer la génération. **Anonymiser avant tout commit** : les captures sont publiées telles quelles.

## État
Cadre de référence : Reporteur Q18 (3 emplacements). Cadre qui prouve le chemin « captures réelles » : CERFA (2 captures réelles). Les neuf autres projets ne sont pas encore activés ; leur généralisation attend la validation du cadre de référence. Captures de validation : `docs/showcase/`.
