# Vitrines « outil réel » dans les cadres du parcours

Chaque carte du parcours 3D (`index.html`) réunit le résumé, la machine et une vitrine du déroulé. La vitrine, le texte et le modèle suivent la même face supérieure quand la carte se redresse. Les commandes « Voir la magie » et « Explorer la machine » restent accessibles sous le modèle.

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
| `01` à `03_Classeur / Flux / Mail` (vidéos Power Automate finance) | écartées de la carte Point financier | animations pédagogiques avec données fictives et interface reconstituée |
| Exécution du flux de démonstration Point financier | conservée hors de la carte | capture du vrai Power Automate avec quatre cas fictifs, issue d’un flux distinct du CS V8 |
| Captures des plans de prévention du 27 octobre 2026 | deux captures animées dans des fenêtres navigateur | configuration Power Automate du traitement Excel et des notifications. Le mouvement parcourt les images source |
| captures historiques VRE Studio, flux Power Automate anciens, maquettes Figma, vidéos VRE/Nisaru | non utilisées | version et provenance non établies pour les outils actuels ; maquettes sans valeur de preuve |

## Médias du dépôt réutilisés (page de démonstration publiée, données fictives, statut `demo`)
Gares prioritaires (`demo-gares-poster`), Studio (`studio-poster`, `projets/studio`), PP + MOSO (`demo-powerbi-poster`, `projets/pp`), Extracteur VRE (`demo-vre-poster`), Retrouver tout le suivi (`projets/suivi`). Le rapport Power BI PP + MOSO utilise `projets/pp.jpg`. La chaîne des PP utilise les captures du concepteur Power Automate du 27 octobre.

## Mapping final des onze vitrines
| projet | machine conservée | fenêtres | statuts |
|---|---|---|---|
| Point financier | réservoir | vidéo de l’historique d’une exécution Power Automate dans Sorbonne, référence unique 02.01 CS V8 | copie de test avec 76 actions, 11 groupes dépliés et 12 appels externes remplacés |
| VRE par VM | tri postal | lien vers le portail Power Automate | captures du récapitulatif, du dépôt SharePoint et du suivi Excel à fournir |
| Reporteur Q18 | machine à écrire | SharePoint, rapport PDF, Excel + console pédagogique | 3 manquantes |
| Chaîne des PP | horloge-calendrier | SharePoint, traitement Excel et notifications dans Power Automate, courriel Outlook | 2 captures du concepteur, 2 manquantes |
| CERFA | trieuse | Metadata Studio V11 : import, vue d'ensemble, fluides, contrôle qualité, livrables | 5 locales |
| Extracteur VRE | boulier | dépôt et vérification, export | 1 démo, 1 manquante |
| Nisaru | ascenseur, main humaine | import, analyse, assistant, contrôle humain, mémoire, export | 5 locales, 1 manquante |
| Power BI PP / MOSO | paternoster | pilotage, plans valides, suivi EPM / EPTx (autre outil) | 2 démo, 1 manquante |
| Studio PDF | atelier | gabarit, cadres | 2 démo |
| Retrouver tout le suivi | standard téléphonique | recherche, résultat | 1 démo, 1 manquante |
| Gares prioritaires | tambours | classement, fiche | 1 démo, 1 manquante |

Éléments encore manquants : captures SharePoint, Excel et rapports PDF pour VRE par VM et Q18, récapitulatif VRE dans Power Automate, dépôt SharePoint et notification Outlook de la chaîne des PP, export Nisaru, fiche de gare, suivi fonctionnel, résultat du Studio et EPM / EPTx anonymisées.

## Interactions et ordonnancement (V8)
- Agrandissement : clic souris réel (vérifié sur les cadres Nisaru, finance, CERFA et PP + MOSO dans le parcours 3D), Entrée ou Espace au clavier, Échap pour fermer ; image haute définition (1440 px) ; légende avec statut et provenance.
- Mobile : les fenêtres sont petites dans la perspective du parcours ; l'agrandissement au toucher est le moyen de lire un écran.
- Boucle : plus de `requestAnimationFrame` permanent. Défilement, redimensionnement, geste ou clic réveillent une boucle unique, éteinte 1,4 s après le dernier mouvement ; images chargées une par une (160 ms), aussi en mouvements réduits.

## Visuels à fournir pour Q18 (emplacements déjà configurés)
1. **SharePoint** : bibliothèque des rapports, vue liste, 1440 px de large minimum. Masquer : noms de clients, références de rapports, identifiants, noms de personnes.
2. **Rapport PDF** : première page d'un rapport de vérification réel. Masquer : client, site, numéro d'OT, signatures.
3. **Excel de suivi** : ligne retrouvée et cellule renseignée. Masquer : références d'équipement, noms de sites, données personnelles.
Déposer les fichiers dans `assets/showcase/q18/`, puis dans `refonte/showcase/config.mjs` passer chaque fenêtre à `status: 'authentic'` avec `src`, `alt` et `caption`, et relancer la génération. **Anonymiser avant tout commit** : les captures sont publiées telles quelles.

## Captures métier à fournir

Les onze cartes sont actives dans le parcours. L’inventaire ci-dessous indique les visuels métier à remplacer ou à compléter. Pour chaque capture, conserver le nom du projet et l’étape qu’elle illustre. Fournir des PNG lisibles ou un enregistrement court de l’écran si la transition fait partie du déroulé.

| Carte | Écrans attendus |
|---|---|
| Point financier 02.01 CS V8 | Seuil dans le classeur Excel, vue du flux Power Automate et détail d’une exécution, notification Outlook déclenchée. |
| Chaîne des plans de prévention | Bibliothèque SharePoint à l’arrivée et après classement, flux Power Automate avec son contrôle d’échéance, relance Outlook. |
| VRE par VM et Reporteur Q18 | Pour chaque outil, bibliothèque SharePoint, première page du rapport traité et ligne modifiée dans Excel. Ajouter la console réelle si elle est visible pendant le traitement. |
| CERFA, Extracteur VRE, Nisaru et Studio PDF | Écran d’import, traitement ou contrôle, puis livrable ou export de l’outil décrit dans la fiche. Le Metadata Studio V11 est un outil distinct de CERFA v3. |
| Power BI PP et MOSO, Suivi, Gares prioritaires | Rapport PP et MOSO avec filtrage et suivi, écrans EPM/EPTx, recherche et résultat d’un suivi, classement et fiche de gare. |

Les fichiers diffusables doivent être anonymisés dès la capture. Masquer les noms, adresses, sites, identifiants, chemins et liens internes. Les captures locales de Nisaru et Metadata Studio montrent leurs interfaces ouvertes sans données.
