# Profilage moteur44 (LOGICIEL)

- Date : 2026-11-09T19:39:51.331Z
- Moteur WebGL : ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (Google Inc. (Google))
- Navigateur : 153.0.8010.12
- Répétitions : 3 par variante (valeur affichée = médiane des répétitions)
- RENDU LOGICIEL : ces intervalles mesurent le CPU qui simule le GPU. Ne pas en déduire de cadence 60/30 FPS ni de gain GPU.

## desktop

| variante | scénario | médiane ms | P95 ms | P99 ms | >100 ms | >200 ms | tâches longues | CPU principal % | JS % |
|---|---|---|---|---|---|---|---|---|---|
| base | repos | 550 | 616.6 | 616.6 | 8 | 8 | 8 | 100 | 1 |
| base | defilement | 516.7 | 583.3 | 600 | 26 | 26 | 26 | 100 | 1 |
| base | magie | 583.3 | 650 | 650 | 9 | 9 | 8 | 99 | 1 |
| base | explorer | 616.6 | 683.3 | 683.3 | 9 | 9 | 9 | 100 | 1 |
| machine:off | repos | 150 | 166.7 | 183.3 | 27 | 0 | 28 | 99 | 0 |
| machine:off | defilement | 150 | 183.4 | 200 | 26 | 0 | 25 | 96 | 0 |
| machine:off | magie | 166.6 | 200 | 216.7 | 31 | 1 | 30 | 94 | 0 |
| machine:off | explorer | 166.7 | 200.1 | 250 | 30 | 3 | 29 | 97 | 0 |

| variante | chargement ms | construction machine ms | 1er rendu ms | ouverture magie ms | magie vers machine ms |
|---|---|---|---|---|---|
| base | 13003 | 533 | 663 | 3631 | 1709 |
| machine:off | 3842 | 590 | - | 1037 | 921 |

