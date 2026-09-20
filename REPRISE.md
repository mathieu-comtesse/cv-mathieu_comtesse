# Reprise du 20 septembre 2026

Base : mathieu-comtesse/cv-mathieu_comtesse, commit a96560d.
Branche locale : correction-jeux-contact.

Corrections réalisées :
- Route : ZQSD/flèches, Maj gauche pour accélérer et Ctrl gauche pour freiner ; trafic opposé à 50–76 km/h ; croisements avec feux, stops, priorité à droite, trafic transversal et comptage des infractions. Les obstacles restent pseudo-aléatoires et reproductibles pour comparer les conditions.
- Sandboard : dessin au clic maintenu, arrêt au relâchement/perte de focus, gain sonore augmenté.
- Armada : sprites tirés directement de la planche PNG fournie (bateaux, nuages, île, phare, kraken et tonneaux).
- Contact : image panoramique fournie, sans bande d’eau étirée ni masque de raccord.
- Firewood : palette adoucie, tête de hache profilée et trajectoire en coordonnées de scène terminant sur le dessus du morceau ciblé.

Vérification : syntaxe des quatre scripts ; test Node des commandes routières, freinage, pause/reprise et bilan ; inspection dans le navigateur intégré de Firewood (coupe 0 → 1), Sandboard (glisser → tracé), Armada (partie lancée) et Contact. Contact inspecté à 390 et 1440 px ; Route sans débordement horizontal à 390 px. Aucune erreur dans le journal navigateur consulté. Le lancement de Chrome automatisé externe a échoué, donc le script Playwright initial n’a pas été exécuté avec succès.

À valider : écoute humaine du son, parties prolongées et équilibre des intersections, comparaison à la vidéo originale d’Armada (non fournie sur ce Mac). Les images fournies sont intégrées ; l’identité exacte avec la vidéo n’est pas garantie.

Publication bloquée : Git local sans authentification GitHub ; connecteur GitHub refusant l’écriture (403 Resource not accessible by integration). Aucun changement envoyé à main et aucune publication du site réalisée.

Tester : `node tests/road-controls.cjs`.
Aperçu : lancer `python3 -m http.server 8765` dans ce dossier puis ouvrir http://localhost:8765/projets-perso.html.
Après rétablissement de l’accès GitHub : pousser la branche correction-jeux-contact et créer une pull request vers main.
