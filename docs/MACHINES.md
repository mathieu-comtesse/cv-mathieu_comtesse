# Refonte des onze machines 3D : suivi

Branche de travail : `claude/machines-refonte`. Les anciens modèles restent en place ; `?machines=old` (accueil, fiches projet) rend l'ancien modèle pour comparaison.

## Socle commun (réutilisé de Nisaru)
- `refonte/m3d/nisaru-geometry.js` : `Part` (boîte chanfreinée, cylindres, engrenage, ressort, courroie, vis), fusion par matériau, mobiles sur pivot. Chaque pièce enregistre sa boîte englobante (`Part.solids`) pour l'audit d'interférence.
- Contrat d'une machine : `build() -> { group, update(time), controls, api, count, audit }`. Tout est une fonction pure du temps partagé : même instant, même image (vérifié).
- `api.views` (vues rapprochées), `api.scenarios` / `setScenario` (cas de démonstration) et `api.setInspect` (vue éclatée) sont lus par la barre d'outils de `refonte/post.js`.
- Aucun `requestAnimationFrame` propre : le temps vient du moteur de la page.

## Table de correspondance
| Machine | Id technique | Ancien module | Nouveau module | État |
|---|---|---|---|---|
| 01 Point financier | `finance` | `finance.js` | à faire | vague 2 |
| 02 VRE, traitement par VM | `vm` | `vm.js` | à faire | vague 2 |
| 03 Reporteur Q18 | `moteur` | `moteur.js` (livre « diffusion ») | `q18.js` + `q18-timeline.js` | livrée (cette branche) |
| 04 Power Automate PP | `pp` | `pp.js` | à faire | vague 2 |
| 05 CERFA v3 | `cerfa` | `cerfa.js` | à faire | vague 1 |
| 06 Extracteur VRE | `vre` | `vre-wattselse.js` | à faire | vague 3 |
| 07 Nisaru | `vrestudio-musicbox` | `nisaru*.js` | inchangé (main conservée) | vague 3 |
| 08 Power BI PP & MOSO | `powerbi` | `powerbi-wattselse.js` | à faire | vague 2 |
| 09 Studio d'extracteurs PDF | `studio` | `studio-wattselse.js` | `studio-pdf.js` + `studio-timeline.js` + `machine-kit.js` | livrée (cette branche) |
| 10 Retrouver tout le suivi | `suivi` | `suivi.js` | à faire | vague 3 |
| 11 Gares prioritaires | `gares` | `gares.js` | à faire | vague 1 |

## Machine 03 : Reporteur Q18

**Phrase de compréhension.** Un rapport est lu, son OT est composé sur le clavier, le chariot de fiches glisse jusqu'à la fiche de cet OT, la tête frappe les champs, un poinçon distinct marque Q18 si le rapport en porte un, puis un palpeur vérifie la ligne.

**Correspondance métier.**
| Opération | Organe |
|---|---|
| Identification du rapport | magasin, voûte de lecture à lentille et barre de balayage, boîte de sortie |
| Lecture de l'OT | quatre tambours à chiffres commandés par les touches du clavier |
| Recherche de la ligne | chariot de huit fiches sur deux rails, pignon et crémaillère (pas 4,08), galets ; ralentit à l'approche |
| Écriture des informations | tête de frappe montée sur vis-mère, marteau à ressort, ruban à deux bobines |
| Mise en visibilité Q18 | poinçon (bielle-manivelle exacte, manette en bakélite), marque rouge sur la fiche |
| Vérification | palpeur à pointe de verre, voyant vert, coche sur la fiche |
| Disponibilité Power BI | bande perforée qui avance d'un cran par rapport apparié (roue à cliquet) |

Le Q18 n'est pas inventé par la machine : il vient du rapport (scénario « Avec Q18 » seulement). Trois scénarios de 36 s : avec Q18, sans Q18, non apparié (balayage complet, aucune écriture, voyant rouge). Toutes les valeurs (OT, dates, statuts) sont fictives et la plaque porte « DEMO FICTIVE ».

**Interactions.** Glisser pour changer l'étape (6 étapes), clic pour avancer, boutons : Ensemble, Inspecter (vue éclatée par axes de démontage : clavier vers l'avant, chariot et portique vers le haut le long de leurs colonnes, lecteur et bande Power BI en translation latérale), vues La frappe / Le poinçon / Le registre, cas Auto / Avec Q18 / Sans Q18 / Non apparié.

**Nomenclature** (449 composants dont 375 solides fusionnés) : bâti 152 (plinthe, caisse en fonte, dosseret, deux rails, 5 chandelles, 4 butées, crémaillère de 116 dents, vis), clavier 17 + 30 touches, lecteur 27, bande Power BI 14, chariot 39 + 8 fiches, portique et postes 126 (tour, flèche, traverses, 3 colonnes, 3 rouleaux de contre-frappe, vis-mère à 26 filets, tête, marteau, poinçon et sa bielle, palpeur, 4 voyants).

**Vérifications effectuées** (banc `WebGL logiciel`, sans GPU) :
- Déterminisme : le rendu à t = 30 s est identique avant et après un passage par t = 5 s.
- Interférences : 398 solides échantillonnés tous les 1,5 s sur la boucle de 108 s, comparés à la pose de repos. Restent seulement des engagements voulus (écrou sur vis-mère, palpeur dans son boîtier, bobine sur son moyeu, dents du pignon sur la crémaillère, par inflation des boîtes englobantes en rotation). Deux vraies interférences ont été corrigées (pignon dans le plateau, galets dans le plateau).
- Complexité : 341 appels de rendu, 45 000 triangles, 21 textures (passe d'ombre comprise).
- Captures : `docs/machines/q18/general.png`, `eclate.png`, `cycle.png` (six instants).

**Limites.** Pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; les 341 appels de rendu peuvent être réduits par fusion des pièces statiques ; le fond d'écran est celui du plan blueprint (pas d'éclairage de studio dédié) ; l'audit Anatomy natif (SVG) n'est pas applicable aux solides Three.js.

## Machine 09 : Studio d'extracteurs PDF

**Phrase de compréhension.** Un exemple de PDF est posé sur une table lumineuse, un portique y place trois cadres de détection, une tête de découpe taille un gabarit à la même position, une presse à levier forme une cartouche de configuration, et un lecteur la reçoit puis compare un nouveau document aux valeurs attendues.

| Opération | Organe |
|---|---|
| Exemple PDF | pile d'exemples, feuille glissée sur une dalle dépolie qui s'allume |
| Cadres de détection | portique à poutre mobile (x), tête sur vis-mère (y), pince (z), molette ; trois cadres anodisés (rouge, bleu, ambre) pris sur l'étagère |
| Association aux champs | étiquette de champ (OT, DATE, MONTANT) portée par chaque cadre |
| Gabarit | carton taillé par la fraise de la tête aux mêmes positions (fenêtres éclairées par la table) |
| Presse | manette en bakélite, pignon de 16 dents, crémaillère du coulisseau, ressort de rappel qui se comprime |
| Cartouche de configuration | sort du lit de la presse, poussée par un vérin sur la rampe, glisse jusqu'au berceau du lecteur |
| Essai | document lu sous la voûte, cadrans ATTENDU et OBTENU, voyants vert, ambre, rouge |
| Livraison ou rebut | cartouche vers le rack de livraison (essai réussi) ou vers la goulotte de rebut (écart) |

Deux scénarios de 66 s : essai réussi (bordereau d'export), essai en écart (voyant rouge, cartouche rejetée, cadre DATE corrigé à la molette). La cartouche matérialise la configuration d'un extracteur : elle n'est jamais présentée comme des poids d'IA. Valeurs fictives, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 30 s identique après t = 5 s), 218 solides contrôlés tous les 2 s sur 132 s (seuls restent des engagements voulus : dents du pignon sur la crémaillère, cartouche qui entre dans le rack ou la goulotte), 130 appels de rendu, 18 000 triangles, captures dans `docs/machines/studio/`.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce par pièce ; le lecteur et ses caissons sont encore sobres (peu de détails fins) ; le bac de feuilles et le gabarit sont retirés par fondu en fin de scénario.
