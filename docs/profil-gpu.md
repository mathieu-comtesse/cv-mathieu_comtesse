# Profilage des freezes sur GPU réel

Objectif : mesurer sur ta machine Windows (accélération matérielle) ce que le bac à sable ne peut pas mesurer. Le bac à sable n'a que SwiftShader (GPU simulé par le CPU) : ses chiffres servent à comparer des variantes entre elles, jamais à conclure sur du 60 ou 30 FPS.

## Mode automatique (5 minutes)

1. Installe Node.js et Chrome (une seule fois).
2. Clone ou ouvre le dépôt, branche `claude/finition-magie`.
3. Double-clic sur `tools\profil-gpu.cmd` (ou `node tools/profil-gpu.mjs --gpu`).
4. L'outil ouvre Chrome, lit le moteur WebGL actif et **s'arrête si c'est SwiftShader / Basic Render Driver**. Corrige alors `chrome://gpu` (« Hardware accelerated » partout), puis relance.
5. Résultats dans `docs\profil\<date>-materiel\` : `resume.md` (médianes des répétitions), `resultats.json` (toutes les répétitions), `backend.json` (GPU, pilote), `traces\*.json`.

Options utiles :

| option | effet |
|---|---|
| `--slug q18` | autre fiche (par défaut `moteur44`) |
| `--reps 5` | nombre de répétitions (par défaut 3) |
| `--viewports desktop,mobile` | ajoute la vue mobile |
| `--variants base,machine:off,bg:static` | sous-ensemble des variantes |
| `--trace off` | pas de trace Chrome (plus léger) |

Scénarios mesurés à chaque passe : chargement (construction de la machine, premier rendu), repos 4 s, défilement 3 s, ouverture de « Voir la magie », 5 s de magie, transition magie vers machine, ouverture d'Explorer + changement de vue. Pour chacun : médiane, P95, P99 des intervalles d'images, nombre d'interruptions > 100 ms et > 200 ms, tâches longues, part du fil principal (JS, mise en page, styles), tas JS.

## Variantes d'isolement (paramètre `?diag=` dans l'URL, sans effet s'il est absent)

| clé | ce qu'on isole |
|---|---|
| `machine:off` | machine construite mais plus rendue : coût du rendu de la machine |
| `bg:static` | fond blueprint redessiné seulement si la caméra bouge (grain figé) |
| `bg:off` | fond jamais redessiné |
| `dpr:1` | densité de pixels à 1 sur tous les rendus WebGL (chemin léger) |
| `shadow:off` | plus de carte d'ombre 2048 |
| `aa:off` | pas d'antialiasing |
| `fx:off` | animations, transitions, filtres et flous CSS coupés |
| `copy:off` | accueil seulement : plus de copie WebGL vers Canvas2D (`drawImage`) |

Combinables : `?diag=bg:static,shadow:off`. Lecture : si une variante fait chuter la médiane ou le P99 d'un scénario, ce coût est confirmé sur ta machine.

## Mode manuel (DevTools), si l'automatique ne passe pas

1. Chrome, `chrome://gpu` : vérifie « WebGL : Hardware accelerated » et « Canvas : Hardware accelerated ». Note le GPU et le pilote.
2. Ouvre `projet-moteur44.html?uxtest&diag=base` (ou une variante).
3. DevTools, Performance, coche « Screenshots », laisse le CPU sans bridage. Active aussi le panneau Rendering, « Frame Rendering Stats » (courbe GPU en direct).
4. Enregistre chaque scénario séparément (3 fois chacun) : repos 5 s, défilement 5 s, clic sur « Voir la magie » puis 5 s, bouton « Explorer la machine » puis changement de vue.
5. Dans la trace, lis : barres rouges de la piste Frames (> 100 ms), Long tasks, piste GPU (durée des tâches), Main (Script, Layout, Recalculate Style), Timings (`rf:machine-start`, `rf:machine-built`, `rf:first-render`).
6. Enregistre en « Save profile » les 3 pires, joins-les au retour.

## Ce qui n'est pas vérifié tant que tu ne l'as pas testé

- WebKit (Safari) : jamais testé.
- Tactile réel (doigts) : jamais testé.
- WebGPU de l'accueil (modules CDN) : non chargeable dans le bac à sable.
- Perte de contexte WebGL : non provoquée.
- Cadences 60 / 30 FPS sur GPU : non mesurées.
- Scene smoke de la salle personnelle (lecteur de musique) : hors périmètre ; son échec connu reste visible dans la PR.
