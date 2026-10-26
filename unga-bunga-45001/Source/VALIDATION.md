UNGA BUNGA 45001 — version 0.11.0

Les sources de cette révision sont fournies pour examiner les changements. Les projets Unity complets et les assets d’origine restent dans le projet local ; ce dossier ne constitue pas un export Unity autonome.

1. Les PNJ utilisent des capsules physiques, des itinéraires contrôlés et une exclusion autour des feux allumés. Le dialogue affiche l’activité interrompue. Les huttes gardent leurs entrées et leurs meubles solides.
2. Dylan utilise sept clips humains récupérés pour les postures basses et le saut. Le clip animal nommé `kick` est exclu. Le coup de pied du duel est une animation humaine dérivée, contrôlée sur le squelette natif. La hauteur et la gravité du saut sont celles du prototype, pas des constantes présentées comme extraites du jeu commercial.
3. Les huttes possèdent onze assemblages, quatre maillages sources et 201 pièces générées. La génération exclut ses propres sous-pièces et réutilise les obstacles existants. La racine reste fixe ; les débris physiques et leurs conséquences sont sauvegardés.
4. Le duel contient cinq décisions, des réponses partielles distinctes, trois phases, des commandes clavier et tactiles, une reprise par épreuve et une récompense canonique unique. Les coups manuels ne valident aucune question. Comprendre ce duel ne valide pas automatiquement tout le chapitre 5.
5. Rapports joints : 121 contrôles dans l’éditeur et 122 dans l’exécutable Windows, tous réussis. Les scénarios tardifs utilisent des fixtures explicites ; aucune partie complète de 45 minutes ni les trois fins ne sont déclarées testées. Le navigateur est vérifié séparément au clavier et avec un viewport tactile réel de 844 × 390 ; aucun appareil iPhone ou Android physique n’est déclaré testé.

Le test général `tools/test-project-metadata.mjs` présente un échec préexistant sur le libellé financier du projet Moteur44 (`à` au lieu du tiret attendu). Les données et ce test n’ont pas été modifiés par cette révision. Le test ciblé `tools/test-unga-publication.mjs` contrôle le WebAssembly, les charges Gzip, les empreintes de cache et la redirection historique.
