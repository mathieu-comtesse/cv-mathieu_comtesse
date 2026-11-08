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
| 01 Point financier | `finance` | `finance.js` (autoclave) | `finance-reservoir.js` + `finance-timeline.js` | livrée (cette branche) |
| 02 VRE, traitement par VM | `vm` | `vm.js` (+ figure du livre 69) | `vm-sorting.js` + `vm-timeline.js` | livrée (cette branche) |
| 03 Reporteur Q18 | `moteur` | `moteur.js` (livre « diffusion ») | `q18.js` + `q18-timeline.js` | livrée (cette branche) |
| 04 Power Automate PP | `pp` | `pp.js` (+ figure du livre 52) | `pp-clock.js` + `pp-timeline.js` | livrée (cette branche) |
| 05 CERFA v3 | `cerfa` | `cerfa.js` (banc acoustique) | `cerfa-sorter.js` + `cerfa-timeline.js` | livrée (cette branche) |
| 06 Extracteur VRE | `vre` | `vre-wattselse.js` | `vre-counter.js` + `vre-timeline.js` | livrée (cette branche) |
| 07 Nisaru | `vrestudio-musicbox` | `nisaru*.js` | mêmes fichiers, mécanisme et main inchangés ; modes de lecture ajoutés dans `nisaru.js` | livrée (cette branche) |
| 08 Power BI PP & MOSO | `powerbi` | `powerbi-wattselse.js` | `powerbi-paternoster.js` + `powerbi-timeline.js` | livrée (cette branche) |
| 09 Studio d'extracteurs PDF | `studio` | `studio-wattselse.js` | `studio-pdf.js` + `studio-timeline.js` + `machine-kit.js` | livrée (cette branche) |
| 10 Retrouver tout le suivi | `suivi` | `suivi.js` | `suivi-switchboard.js` + `suivi-timeline.js` | livrée (cette branche) |
| 11 Gares prioritaires | `gares` | `gares.js` (livre « échangeur ») | `gares-board.js` + `gares-timeline.js` | livrée (cette branche) |

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

## Machine 11 : Gares prioritaires

**Phrase de compréhension.** Huit tambours octogonaux (un par rang) portent chacun les huit gares ; quand on tourne la couronne de critère, un calculateur à cames détermine le nouvel ordre et chaque tambour avance du nombre de faces nécessaire, tandis que trois cadrans par rangée suivent les indicateurs de la gare affichée.

| Opération | Organe |
|---|---|
| Choix du critère (criticité, conformité, maintenance préventive) | couronne de réglage, trois voyants |
| Calcul du nouvel ordre | calculateur à tambour de cames derrière une fenêtre vitrée |
| Reclassement | huit tambours à huit faces, moteur pas à pas, roue entraînée à 18 dents, cadence décalée de 0,22 s par rangée |
| Arrêt exact sur une face | roue à étoile à huit dents, cliquet à ressort qui recule à chaque pas |
| Indicateurs | 24 cadrans (criticité, conformité, maintenance) dont les aiguilles suivent la gare affichée |
| Sélection d'une gare | cadre ambre sur deux chariots, vis-mère, couronne « LIGNE » liée à sa position |
| Fiche de suivi | tiroir qui sort du pupitre avec la fiche de la gare désignée (équipements, échéance, opérations) |

Deux scénarios de 60 s : « Trois critères » (le classement tourne trois fois puis revient) et « Ouvrir une fiche » (trois gares désignées, tiroir ouvert à chaque fois). Ce n'est pas un tableau d'horaires. Gares, noms et valeurs sont fictifs, la plaque porte « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 14 s identique après t = 5 s), 339 solides contrôlés tous les 2 s sur 120 s (restent des engagements voulus : cadre sur rails, écrou sur vis, boîtes englobantes des roues dentées en rotation), 170 appels de rendu, 50 000 triangles, captures dans `docs/machines/gares/`.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; les huit noms sont lisibles surtout de face (le texte est tourné de 90° sur la circonférence) ; pas de comparaison de deux situations côte à côte.

## Machine 05 : CERFA v3

**Phrase de compréhension.** Un lot de dix feuilles est séparé une à une, lu dans une chambre optique, contrôlé par un module F-Gas, puis rangé dans l'un des cinq bacs par le poussoir de ce bac, pendant qu'un registre affiche la table structurée qui se constitue.

| Opération | Organe |
|---|---|
| Dépôt du lot | trémie à plateau élévateur, guides réglables, rouleau de prise ; clavier de lot et sélecteur de catégorie |
| Séparation | feuille prise en tête de pile, séparateur, bande à rouleaux pinceurs (la rotation suit la distance parcourue) |
| Lecture | chambre à capot vitré, barre lumineuse qui balaie, trois champs reconnus qui s'éclairent, voyant de famille |
| Contrôle F-Gas | caisson vitré : voyants fluide, attestation, échéance ; drapeau rouge si écart (pour examen humain, pas une décision réglementaire) |
| Aiguillage | la feuille s'arrête devant son bac, un poussoir à vérin la rentre ; elle tombe sur la pile visible à travers la vitre |
| Répartition | cinq bacs (exploitable, incomplet, doublon, anomalie, non reconnu), un compteur à tambour par bac |
| Table de données | écran du registre et ruban d'export qui avance à chaque feuille |

Deux scénarios de 64 s : « Lot courant » et « Contrôle F-Gas » (attestations à échéance dépassée, trois anomalies). Les compteurs, piles et registre se vident en fin de lot, la trémie se recharge. Documents et valeurs fictifs, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 30 s identique après t = 5 s), 259 solides contrôlés tous les 2 s sur 128 s (restent des boîtes englobantes de rouleaux en rotation et le drapeau dans son caisson), 206 appels de rendu, 18 000 triangles, captures dans `docs/machines/cerfa/`. Un vrai défaut corrigé : la poulie d'entrée heurtait la base de la trémie.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; une seule texture de feuille (la famille documentaire n'est pas lisible sur la feuille elle-même) ; pas de reclassement manuel d'une feuille ; 206 appels de rendu à réduire par fusion.

## Machine 01 : Point financier

**Phrase de compréhension.** Le niveau d'un réservoir représente la consommation rapportée aux fonds disponibles ; un flotteur le lit, une aiguille l'affiche, et deux déclencheurs (seuil préventif réglable, dépassement à 100 %) font sonner une cloche, sortir un courrier et tomber un loquet qui mémorise l'alerte pour ne pas la répéter. Le réservoir est une métaphore de surveillance : aucune dépense n'est bloquée.

| Opération | Organe |
|---|---|
| Flux de données par périmètre (CS, Locatif, MEC, PPTM) | quatre conduites à bague colorée, vannes à volant, perles de fluide coloré |
| Sélection PRG, PSE ou GLOBAL | bouton à trois positions ; les volants ferment ou ouvrent les lignes concernées (PRG : CS et MEC) |
| Écart des lignes KO | chambre de filtrage à crépines : une perle sur quatre tombe dans le bac d'égouttage |
| Niveau | cuve émaillée, jauge de verre graduée de 0 à 120 %, flotteur, repère rouge à 100 % |
| Lecture du niveau | câble du flotteur, poulie, levier, aiguille du cadran |
| Seuil préventif | curseur sur règle graduée (50 à 100 %), repère ambre sur le cadran |
| Alertes | cloche et marteau, courrier imprimé qui sort de sa fente, loquet de mémoire, ligne du registre des alertes émises, voyants |

Deux scénarios de 64 s : « Seuil puis dépassement » (80 % puis 100 %, périmètre GLOBAL) et « Seuil abaissé » (périmètre PRG, le curseur passe de 80 à 60 % et l'alerte préventive part plus tôt). Valeurs fictives, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 40 s identique après t = 5 s), 244 solides contrôlés tous les 2 s sur 128 s (seul le loquet qui rentre dans son boîtier ressort), 150 appels de rendu, 31 000 triangles, captures dans `docs/machines/finance/`.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; le curseur de seuil et la consommation ne sont pas manipulables à la souris (scénarios seulement) ; le lien flotteur, poulie, levier est cinématique (pas de déclenchement mécanique réel du marteau) ; le texte central du cadran est chevauché par l'aiguille.

## Machine 02 : VRE, traitement par VM

**Phrase de compréhension.** Un rapport PDF (une enveloppe) entre sur un convoyeur, une demande est imprimée dans une file physique, la relève de la VM la libère, le lecteur vérifie le code R004 et l'OT, puis une pince range le lien dans le bon casier Excel, ou la voie des doublons ou le rejet l'écarte ; à 17 h le distributeur imprime un récapitulatif.

| Opération | Organe |
|---|---|
| Dépôt du PDF | trémie, convoyeur à bande et rails |
| Création de la demande, file | imprimante de cartes, râtelier à trois emplacements, la carte rejoint l'enveloppe à la relève |
| Relève toutes les 2 minutes | horloge à aiguilles (temps accéléré, voyant à chaque échéance, voyant 17 h) |
| Lecture | cabine VM 1 : lentille, barre de balayage, voyants R004 / OT / déjà intégré / écart |
| Rangement | portique (chariot sur galets, bras en y, tige télescopique en z, mâchoires), 24 casiers numérotés, tiroir cible, tampon, voyant vert, journal imprimé |
| Doublons, rejet | poussoirs à vérin et deux bacs à fenêtre vitrée : aucune seconde insertion |
| Récapitulatif de 17 h | distributeur avec bordereau (scénario réussi seulement) |
| Architecture cible | seconde cabine VM en volume translucide, verrou mécanique partagé, plaques « ARCHITECTURE CIBLE » et « NON ACTIVE » : aucune seconde VM n'est présentée comme opérationnelle |

Trois scénarios de 48 s : traitement réussi, déjà intégré, non apparié. Rapports, OT, casier L14 et heures sont fictifs, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 30 s identique après t = 5 s), 182 solides contrôlés tous les 2 s sur 144 s (restent l'engagement du bras dans son coulisseau et de la tige dans son manchon), 156 appels de rendu, 13 000 triangles, captures dans `docs/machines/vm/`. Deux vrais défauts corrigés : la tige télescopique traversait le chariot, le plateau du poussoir traversait la bande.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; la bande ne tourne pas visuellement (rouleaux symétriques) ; l'interruption suivie d'une reprise n'est pas représentée ; l'horloge revient en arrière en fin de cycle pour reboucler ; la figure du livre « 69 » n'est plus affichée sur la page (`?machines=old` la rend).

## Machine 04 : Power Automate, chaîne des plans de prévention

**Phrase de compréhension.** Un plan arrive, ses informations sont lues, une pince le range dans le tiroir de sa catégorie ; le calendrier d'une grande horloge avance, un témoin s'allume à l'approche de l'échéance puis une cloche sonne et une languette de relance sort ; un dossier échu est ensuite sorti de son tiroir et déposé aux archives.

| Opération | Organe |
|---|---|
| Dépôt, lecture | boîtier d'entrée, table, voûte à lentille et barre de balayage, voyants TYPE / CAT. / ECH. |
| Classement | portique à treuil et pince, armoire de huit tiroirs à façade étiquetée, tiroir qui s'ouvre sous la pince |
| Calendrier | cadran, couronne de 31 dates, aiguille du calendrier, repère d'échéance, tambours du jour, train de quatre roues engrenées (16/14, 16/24, 14/10) qui tournent proportionnellement au jour simulé |
| Approche d'échéance | témoin ambre (trois jours avant), voyant de relance (à l'échéance) |
| Relance | cloche et marteau, languette de relance qui sort du module |
| Archivage | la pince sort le dossier échu de son tiroir et le dépose dans le compartiment d'archives (fente) |

Deux scénarios de 60 s : « Dépôt et classement » (échéance au 25) et « Échéance et archivage » (dossier déjà classé, échéance au 20). Dossiers et dates sont fictifs, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 40 s identique après t = 5 s), 133 solides contrôlés tous les 2 s sur 120 s (restent les roues dentées engrenées et la came, boîtes englobantes en rotation), 150 appels de rendu, 13 000 triangles, captures dans `docs/machines/pp/`. Défauts corrigés : une roue traversait la plaque du socle, le portique heurtait les aiguilles du cadran (rails reculés de 8 unités).

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; l'échappement n'est pas représenté (les roues sont entraînées par la date simulée, pas par un balancier) ; la came est solidaire d'une roue mais le témoin est piloté par la date, pas par la came ; la date revient en arrière en fin de cycle pour reboucler ; le calendrier ne gère pas de dates réelles ; la figure du livre « 52 » n'est plus affichée sur la page (`?machines=old` la rend).

## Machine 08 : Power BI, plans de prévention et MOSO

**Phrase de compréhension.** Deux chaînes en boucle portent huit casiers qui restent horizontaux ; la boucle amène le casier demandé devant la fenêtre latérale, un bras à ventouse sort le dossier sur le comptoir, et le lecteur de référence allume le portail de visualisation, qui est un moteur distinct du moteur d'archivage.

| Opération | Organe |
|---|---|
| Entrée documentaire (VM, rangement SharePoint, archivage) | module « ENTREE DOCUMENTAIRE » à fente de dépôt et trois voyants : moteur d'archivage |
| Stockage compact | armoire vitrée, deux chaînes à 64 maillons, deux paires de roues de chaîne à 22 dents, huit casiers suspendus par leurs axes (horizontaux sur tout le parcours, y compris aux arcs) |
| Recherche du casier | rotation de la boucle jusqu'au casier cible, départ doux, arrivée très lente, verrou qui s'engage ; la boucle revient ensuite à sa disposition d'origine par un tour complet |
| Consultation | fenêtre latérale à volet vitré, bras extracteur à ventouse le long de x, dossier sorti sur le comptoir puis remis |
| Lecture et visualisation | lecteur de référence au-dessus du comptoir, liaison par câble, portail « POWER BI » à écran, voyants PP / MOSO et trois cadrans : moteur de visualisation, séparé |

Trois scénarios de 60 s, chacun avec deux consultations : plans de prévention, marchés MOSO, comparaison de deux états du même plan (barres T1 en gris et T2 en couleur). Dossiers, marchés et valeurs sont fictifs, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 20 s identique après t = 5 s), 116 solides contrôlés tous les 3 s sur 180 s (restent des boîtes englobantes de roues et de verrou), 265 appels de rendu, 16 000 triangles, captures dans `docs/machines/powerbi/`. Défaut corrigé : le bras traversait la chaîne avant, la fenêtre est donc passée de la face avant au flanc droit.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; les casiers de l'audit ne sont pas inclus (modèle cloné) ; 265 appels de rendu à réduire ; la comparaison de deux états est schématique (six barres fictives) ; le « comparer deux états de suivi » ne lit pas de vraies données ; la sélection d'un plan, d'un marché ou d'un secteur se fait par scénario et non par saisie.

## Machine 06 : Extracteur VRE

**Phrase de compréhension.** Une feuille de rapport est lue ligne à ligne ; chaque équipement reconnu fait pivoter un aiguillage vers sa famille, le tambour libère une bille qui roule dans la gouttière puis tombe dans la colonne de cette famille, et le compteur mécanique avance d'une unité.

| Opération | Organe |
|---|---|
| Alimentation et lecture | plateau et pile de feuilles, rouleaux pinceurs, voûte à lentille, tête de lecture qui descend d'une ligne par équipement, voyants des quatre familles |
| Famille reconnue | BT31 disjoncteurs, BT33 fusibles, BT21 blocs autonomes d'éclairage de sécurité, BT11 candélabres, chacune avec son collier coloré |
| Distribution | tambour à dix alvéoles (un pas par bille), entonnoir, chenal pivotant (aiguillage), quatre gouttières inclinées |
| Trajectoire de la bille | chute dans l'entonnoir, glissement dans le chenal, roulement à accélération constante selon la pente (plus lent vers les colonnes lointaines), chute libre, empilement : aucune téléportation |
| Comptage | colonnes transparentes de 82 unités, compteur à tambour à chiffres sous chaque colonne |
| Contrôle des totaux | écran qui compare attendu et obtenu, voyants conforme / écart ; scénario C : un volet latéral éjecte la bille mal classée dans le bac de rebut |
| Remise à zéro, export | trappes des colonnes, billes recyclées vers le tambour, bordereau d'export vers le suivi |
| Bâtiment, local | deux sélecteurs et un afficheur à trois tambours |

Trois scénarios de 64 s : bâtiment 1 local 2, bâtiment 3 local 7, erreur de classement. Valeurs et comptages fictifs, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 30 s identique après t = 5 s), 171 solides contrôlés tous les 3 s sur 192 s (restent le tambour devant sa plaque, le chenal sur son appui, boîtes englobantes en rotation), 158 appels de rendu, 24 000 triangles, captures dans `docs/machines/vre/`. Défaut corrigé : l'entonnoir pénétrait dans le tambour.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; les billes ne se heurtent pas entre elles (empilement calculé) ; le recyclage des billes vers le tambour n'a pas d'élévateur visible (elles réapparaissent dans les alvéoles) ; le rapport est une feuille générique (les lignes ne portent pas de texte d'équipement lisible) ; le contrôle d'erreur ne corrige pas le total (il signale et écarte) ; les images de la fiche « Lecteur VRE » (Nisaru) sont inchangées.

## Machine 10 : Retrouver tout le suivi

**Phrase de compréhension.** On choisit une demande (OT, équipement ou bâtiment) au clavier et au cadran, des relais identifient les systèmes concernés, puis deux fiches à cordon sont branchées l'une dans la prise de la demande, l'autre dans la prise du système ; un écran central affiche les accès retrouvés.

| Opération | Organe |
|---|---|
| Choix de la demande | trois touches, cadran à dix repères, neuf demandes en trois lignes (OT, équipement, bâtiment), voyant ambre de la demande |
| Identification des systèmes | banc de six relais à armature mobile qui claquent, voyants verts des systèmes concernés |
| Liaison | quatre fiches à cordon textile (rouge et bleu) : elles se soulèvent de leur alvéole, glissent devant la face, se couchent dans la prise ; chaque cordon repart vers l'alvéole de sa fiche |
| Systèmes | cinq prises : GMAO, SHAREPOINT, EXCEL SUIVI, POWER BI, PORTAIL |
| Accès retrouvés | écran du pupitre central, mention « ACCES SELON VOS PERMISSIONS APPLICATIVES » |
| Source indisponible | scénario C : voyant rouge sur le portail, la fiche est retirée ; |
| Débranchement | toutes les fiches reviennent à leur alvéole, les voyants s'éteignent |

Trois scénarios de 56 s : retrouver un OT (GMAO, SharePoint), un équipement (Excel de suivi, Power BI), un bâtiment avec source indisponible (portail). L'outil retrouve des accès dans les applications existantes : il ne centralise pas les bases et ne garantit aucun accès. Valeurs fictives, plaque « DEMO FICTIVE ».

**Vérifications** : déterminisme (t = 30 s identique après t = 5 s), 160 solides contrôlés tous les 3 s sur 168 s (seule la touche enfoncée entre dans la tablette), 116 appels de rendu, 22 000 triangles, captures dans `docs/machines/suivi/`.

**Limites** : pas de mesure GPU ni mobile réel ; la vue éclatée n'est pas auditée pièce à pièce ; les cordons sont une courbe qui épouse la trajectoire, sans physique de corde (ils peuvent traverser l'écran) ; les contrepoids sous la tablette ne sont pas représentés ; pas de saisie réelle d'un OT : la demande suit le scénario ; l'écran n'affiche pas de liens cliquables ; « Afficher les liens et leurs destinations » est un écran schématique.

## Machine 07 : Nisaru, perfectionnement

La Manufacture et la main de La Création ne sont pas modifiées : la géométrie, les matériaux, la chronologie de 130 s, la main (`nisaru-hand.js`, `assets/figures/main-agent.webp`), la validation, la correction et le rejet sont identiques. Seul le temps lu par la chronologie peut maintenant être remappé.

- **Cycle complet (130 s)** : mode par défaut (bouton « Auto »), la version détaillée.
- **Séquence courte (environ 50 s)** : boutons « Court : validation », « Court : correction », « Court : rejet ». La même chronologie est lue en avance rapide (×2,6 à ×5) entre les temps forts et au rythme normal sur le cycle humain choisi (la main, son approche, le contact, l'impulsion). Les deux autres cycles humains passent en avance rapide. Aucun état n'est recalculé.
- **Vue « Le registre »** ajoutée aux vues rapprochées (La main, La forge, Le registre) ; la barre d'étapes (9 étapes) suit le mode actif.

Vérification : chargement de `projet-lecteur-vre.html` en mode court sans erreur, animation qui avance ; le mode par défaut lit `wrap(time)` comme avant.

**Limites** : la séquence courte est un remappage du temps, pas une nouvelle mise en scène (les états transitoires se voient à vitesse élevée) ; l'inspection d'une zone reconnue, le suivi d'un document, la comparaison candidat contre modèle actif et l'exploration des versions ne sont pas des commandes séparées (elles restent portées par la barre d'étapes et les vues) ; pas de nouvel audit de géométrie pour Nisaru dans cette passe.

## Registre unique et commandes communes (correctif de la refonte)

- `refonte/m3d/registry.js` : seule table identifiant -> module. `loadMachine(name)` est utilisé par l'accueil, les tuiles (`tile.js`), les fiches (`index.js`) et le parcours (`parcours.js`). `?machines=old` reste un diagnostic explicite.
- `refonte/m3d/control-bar.js` : barre de commandes unique (lecture/pause, rejouer, vitesse, étape via `controls.seek`, scénarios via `api.scenarios/setScenario`, vues via `api.views` + ancres, inspection via `api.setInspect`).
- `tools/test-machines.mjs` + `tools/machines-harness.html` : test navigateur des onze machines (module chargé, construction, temps, `seek`, scénarios, vues, inspection, valeurs finies) et contrôle statique des références à d'anciens modules. Workflow `.github/workflows/machines.yml`.
- Non traité à ce stade : reprise visuelle (matériaux, réalisme, vues éclatées), commandes directes sur la machine, contrôleur de caméra complet (orbite/zoom), mesures de performance, captures comparatives, workflows `Site integrity` (SEO de `machines.html`, `parcours.html`, `accueil.html` en échec avant ce chantier) et `Scene smoke check` (journaux non consultables depuis cet environnement).

## Q18, passe « objet industriel »

- `refonte/m3d/pro-materials.js` : bibliothèque commune de matériaux (acier brossé, acier phosphaté, aluminium anodisé, laiton satiné, fonte grenée, émail peau d'orange, caoutchouc, bakélite, ivoire, verre). Grain calculé dans le shader (pas d'UV nécessaires sur les pièces fusionnées), estompé quand il devient plus fin qu'un pixel ; environnement de studio procédural pour les reflets métalliques.
- Q18 : le grand plateau noir est remplacé par une table émaillée sur patins réglables, chants et façade en aluminium brossé avec ouïes, poignées de manutention, trappes d'accès arrière, plis de rigidité ; le clavier repose sur une console inclinée, le lecteur et la bande Power BI sur des socles (ils flottaient auparavant) ; tour et flèche émaillées avec nervures.
- Captures : `docs/machines/q18-pro-avant.png`, `q18-pro-apres.png`, `q18-pro-arriere.png`, `q18-pro-detail.png` (harnais isolé, SwiftShader).
- Non fait sur Q18 : sélection libre d'un OT (les trois scénarios fixent chacun leur OT), commandes directes sur la machine (manette, touches), mesure de performance sur GPU réel, captures sur le site intégré aux trois résolutions.

## Studio PDF, passe « objet industriel »

- Même socle que Q18 : table émaillée sur patins réglables, chants et façade en aluminium brossé avec ouïes, poignées de manutention ; établi et caisse du lecteur en émail sombre ; matériaux de `pro-materials.js`.
- Captures : `docs/machines/studio-pro-avant.png`, `studio-pro-apres.png`, `studio-pro-detail.png`.
- Fait ensuite (scénario C « Mon cadrage ») : voir ci-dessous.
- Non fait : presse avec crémaillère et paliers supplémentaires, table lumineuse plus présente, feuilles déplacées physiquement au lieu d'un fondu. Ces points demandent un travail sur la chronologie (`studio-timeline.js`) et restent à faire.

### Studio PDF, scénario C « Mon cadrage » (cadres déplaçables)

- `studio-timeline.js` : les cadres du visiteur (`LIVE`) sont distincts des champs du PDF (`BASE`). `coverage()` donne la part de chaque champ couverte ; la cartouche est livrée si chacun couvre au moins 80 %, rejetée sinon (`SCEN[2].ok` est calculé). Le portique, la découpe du gabarit (fenêtres aux positions du visiteur) et les cadrans suivent le cadrage. A et B sont inchangés.
- `studio-pdf.js` : `api.frames` (noms, déplacer, pousser, remettre, couverture), `api.status()`, `api.drag` (saisie d'un cadre par un rayon monde, actif seulement dans « Mon cadrage »).
- Hôtes : vue agrandie de l'accueil (glisser sur la machine + groupe « Cadres » de la barre commune) et fiche (`post.js` : glisser sur la machine, flèches, « Remettre », « Lancer l'essai »). Choisir « Mon cadrage » place la machine à l'instant où les trois cadres sont posés et la met en attente.
- Test : `tools/machines-harness.html` vérifie couverture, conformité, valeurs finies et saisie/déplacement par rayon.
- Captures : `docs/machines/studio-cadres-zoom.png`, `studio-cadres-fiche.png`.
- Limites : la fiche et la vue agrandie ont été exercées au clavier et par boutons ; le glisser à la souris est validé par test de rayon mais pas par un geste réel sur GPU. Les trois champs et leur seuil de 80 % sont des valeurs de démonstration.

## Gares prioritaires : palettes et scénario « Mon choix »

- Les tambours octogonaux (noms illisibles, plusieurs gares superposées sur un cylindre) sont remplacés par un vrai afficheur à palettes : huit rangées de huit palettes articulées à mi-hauteur. La face avant porte la moitié haute du nom, le dos la moitié basse du nom suivant ; la palette qui tombe découvre la gare suivante et pose la moitié basse sous elle. Caractères blancs sur fond noir, hauteur d'environ 6 unités par demi-palette (lisibles à l'échelle normale). Les pignons, cliquets, moteurs, cadrans, sélecteur et tiroir sont conservés et pilotés par la même chronologie.
- Scénario C « Mon choix » : le visiteur choisit le critère (Criticité, Conformité, Maintenance préventive) : le classement tourne rang par rang ; il choisit la gare d'un rang : le sélecteur ambre descend, la fiche sort du tiroir. Aussi par clic direct sur une rangée ou sur la couronne de critère (`api.drag`). Les événements sont espacés pour que chaque mécanisme termine avant le suivant.
- Contrat générique ajouté : `api.params` (groupes de choix + visibilité) rendu par la barre commune et par `post.js` ; `scenario.hold === false` : le scénario n'est pas mis en pause.
- Captures : `docs/machines/gares-pro-avant.png`, `gares-pro-palettes.png`, `gares-mon-choix.png`.
- Limites : valeurs fictives ; rendu logiciel seulement (pas de mesure sur GPU) ; 64 palettes = 64 maillages de plus, non mesurés ; table et pupitre n'ont pas reçu la passe « table émaillée » des machines précédentes ; la fiche (texture) garde son format d'origine.

## CERFA v3 : documents distincts et scénario « Ma feuille »

- Catalogue de neuf documents fictifs de quatre types visuellement différents (attestation, fiche d'intervention, facture, courrier manuscrit sans gabarit), chacun avec ses champs lus, son bac et le motif de son classement. Les lots A et B n'utilisent plus une texture unique : chaque feuille prend un document correspondant à son bac.
- Scénario C « Ma feuille » : le visiteur choisit un document ; il est traité seul de la trémie à son bac ; la chambre allume les champs lus (vert) ou manquants (rouge) ; l'écran du registre affiche la feuille lue, le bac et le motif. Correction supervisée pour les feuilles incomplètes (champ renseigné par l'opérateur) et le courrier manuscrit (famille désignée) : la feuille est reclassée. Une anomalie F-Gas n'est pas corrigeable et reste « signalement pour examen humain, pas une décision réglementaire ». Un clic sur le lot dans la trémie passe au document suivant.
- Base : table émaillée mince (hauteur conservée pour les bacs), chants en aluminium brossé, ouïes, trappes d'inspection arrière, matériaux de `pro-materials.js`.
- Le test des onze machines a révélé un NaN (aiguille du sélecteur de catégorie pour k = 2) : corrigé.
- Captures : `docs/machines/cerfa-pro-avant.png`, `cerfa-pro-lecture.png`, `cerfa-ma-feuille.png`.
- Limites : valeurs et seuils fictifs ; pas de capots vitrés supplémentaires ni de courroies de transmission visibles ajoutés ; rendu logiciel, pas de mesure sur GPU ; mutualisation des géométries non traitée.

## Point financier : scénario « Mon réservoir »

- Scénario C : le visiteur règle le périmètre (PRG, PSE, GLOBAL : les vannes tournent), la consommation (±10 pts, vers 70 %, vers 110 % : le niveau, le flotteur, la poulie, l'aiguille et le levier suivent), le seuil préventif (±5 pts : le curseur et le repère du cadran suivent), les lignes KO (exclues ou incluses : la part exclue baisse le niveau, valeurs fictives) et peut réarmer les alertes. Les alertes (seuil préventif, dépassement des fonds à 100 %) sont déduites en rejouant la piste de réglages : cloche, loquet de mémoire, courrier sorti, ligne du registre ; elles ne se répètent pas avant réarmement ; l'historique des notifications reste affiché dans l'état. Clic direct sur le cadran (seuil +5 pts) ou sur la cuve (consommation +10 pts).
- Le texte du cadran n'est plus croisé par l'aiguille (légende déplacée sous l'arc, hors de sa course).
- Base : table émaillée, chants aluminium, ouïes, pieds sous les conduites et la chambre de filtrage (ils flottaient au-dessus de la table).
- Le message d'état rappelle que la machine ne bloque aucune dépense (métaphore de surveillance).
- Captures : `docs/machines/finance-pro-avant.png`, `finance-pro-cadran.png`, `finance-mon-reservoir.png`.
- Limites : poids des lignes et part KO fictifs ; les alertes sont validées par le test (jamais vues se déclencher en navigateur à cause de la lenteur du rendu logiciel) ; rendu logiciel seulement.

## VRE par VM : interruption, reprise, horloge continue, bande entraînée

- Scénarios D « Interruption » (la VM s'arrête pendant la lecture : voyant d'écart rouge, l'enveloppe reste sous la cabine, la demande retourne en file) et E « Reprise » (la demande conservée attend dans la file, la relève la reprend, le traitement se termine par le rangement au casier). Ils s'ajoutent à A (apparié), B (doublon), C (non apparié) : cinq scénarios, boucle de 240 s. La seconde cabine VM reste affichée comme architecture cible non active.
- Horloge : plus de retour en arrière brutal en fin de scénario. L'horloge avance de douze heures en accéléré et retrouve exactement sa position de départ (aiguille des minutes et des heures continues).
- Bande et rouleaux : la bande défile et les douze rouleaux tournent avec l'enveloppe qu'ils portent (déplacement perceptible).
- Base : table émaillée, chants aluminium, ouïes, mur du fond avec plis de rigidité.
- Captures : `docs/machines/vm-pro-apres.png`, `vm-interruption.png`.
- Limites : pas de scénario libre ni de commande directe sur cette machine ; pinces, vérins et guidages non détaillés davantage ; rendu logiciel seulement.

## Power Automate, chaîne des PP : scénario « Mon classement », calendrier continu

- Scénario C : le visiteur choisit un dossier (Plan secteur A, Plan secteur B, Entreprise X, Mode opératoire) : lecture, pince, tiroir (séquence de A) ; avance la date (+1 jour, +5 jours, jusqu'au témoin, jusqu'à l'échéance) : toutes les roues du calendrier, les tambours du jour et les aiguilles suivent ; le témoin s'allume à la date de pré-alerte du dossier, la cloche sonne et la languette de relance sort à l'échéance ; « Archiver » sort le dossier du tiroir et le dépose aux archives (séquence de B), ce qui remet les alertes à zéro. Un seul dossier est classé à la fois. Clic direct sur le cadran (+1 jour) ou sur la boîte de dépôt (dossier suivant).
- Calendrier : plus de retour en arrière en fin de scénario. Le mois affiché fait 31 jours, les roues font quatre tours par mois ; le calendrier continue d'avancer jusqu'au même jour du mois suivant et se referme exactement (les rapports d'engrenages 16/14/24/10 sont des multiples entiers).
- Base : table émaillée, chants aluminium, ouïes ; laiton satiné et acier brossé de la bibliothèque commune.
- Captures : `docs/machines/pp-pro-avant.png`, `pp-pro-horloge.png`, `pp-mon-classement.png`.
- Limites : seulement deux tiroirs actifs sur huit ; dates, dossiers et seuils fictifs ; pas de vrai cadran de quantième ni de cames supplémentaires ; rendu logiciel seulement.

## Power BI, PP et MOSO : scénario « Ma consultation »

- Scénario D : catalogue fictif de huit casiers (quatre plans de prévention, quatre marchés, avec secteur). Le visiteur choisit un document : le paternoster tourne (casiers toujours horizontaux) jusqu'à amener le casier à la fenêtre, le verrou se pose, le volet s'ouvre, le bras sort le dossier sur le comptoir, le lecteur de référence allume le portail (PP ou MOSO) et les indicateurs fictifs apparaissent sur l'écran et les trois aiguilles. Les demandes se mettent en file : une consultation commence quand la précédente est terminée, et la boucle part de la disposition où elle se trouve. « Deux états du dernier plan » compare deux états simulés (T1 en gris, T2 en couleur) ; l'écran porte en permanence « DONNEES FICTIVES » et, en comparaison, « ETATS SIMULES, PAS DES DONNEES REELLES ». Clic direct sur l'entrée documentaire : document suivant.
- Base : table émaillée, chants aluminium, ouïes, matériaux de la bibliothèque commune.
- Captures : `docs/machines/powerbi-pro-avant.png`, `powerbi-pro-detail.png`, `powerbi-ma-consultation.png`.
- Limites : les huit casiers et leurs indicateurs sont fictifs ; pas de comptoir de consultation enrichi (le dossier n'est pas ouvert) ; chaînes, roues et paliers non redessinés ; rendu logiciel seulement.

## Extracteur VRE : recyclage visible et scénario « Mon rapport »

- Fin de cycle sans téléportation : la trappe de chaque colonne s'ouvre, les billes tombent, roulent derrière les colonnes jusqu'au bac de récupération, remontent dans un tube de retour fermé jusqu'à la trémie de recharge au-dessus du tambour, puis sortent de la trémie une à une et tombent dans leur alvéole (le tambour retrouve exactement sa position de départ). Une bille éjectée par le volet de rejet est remplacée par la recharge.
- Scénario D « Mon rapport » : bâtiment (1 à 4) et local (1 à 8) déterminent, de façon reproductible, la séquence fictive des dix équipements ; équipement suivi (la bille correspondante devient dorée, son état est annoncé) ; erreur injectée sur l'équipement 4 ou 9 (la bille est mal classée, détectée au contrôle des totaux, puis éjectée par le volet et remplacée) ; « Vérifier maintenant » avance au contrôle. L'état affiche colonnes comptées / attendues (BT31, BT33, BT21, BT11).
- Base : table émaillée, chants aluminium, ouïes ; billes d'acier avec reflets de l'environnement de studio.
- Captures : `docs/machines/vre-pro-avant.png`, `vre-recyclage.png`, `vre-recharge.png`.
- Limites : le transit dans le tube de retour n'est pas montré (le tube est opaque) ; colonnes et lecteur non agrandis ; séquences fictives ; rendu logiciel seulement.
