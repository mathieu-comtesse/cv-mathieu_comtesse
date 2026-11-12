# Profilage moteur44 (LOGICIEL)

- Date : 2026-11-09T19:31:51.412Z
- Moteur WebGL : ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (Google Inc. (Google))
- Navigateur : 153.0.8010.12
- Répétitions : 3 par variante (valeur affichée = médiane des répétitions)
- RENDU LOGICIEL : ces intervalles mesurent le CPU qui simule le GPU. Ne pas en déduire de cadence 60/30 FPS ni de gain GPU.

## desktop

| variante | scénario | médiane ms | P95 ms | P99 ms | >100 ms | >200 ms | tâches longues | CPU principal % | JS % |
|---|---|---|---|---|---|---|---|---|---|
| base | repos | 550.1 | 616.6 | 616.6 | 8 | 8 | 8 | 100 | 1 |
| base | defilement | 533.3 | 616.6 | 633.3 | 26 | 26 | 26 | 100 | 1 |
| base | magie | 783.3 | 866.7 | 866.7 | 7 | 7 | 6 | 97 | 1 |
| base | explorer | 700 | 799.9 | 799.9 | 8 | 8 | 8 | 99 | 1 |
| float:off | repos | 466.6 | 500 | 500 | 9 | 9 | 10 | 100 | 1 |
| float:off | defilement | 466.6 | 516.7 | 600 | 26 | 26 | 27 | 100 | 1 |
| float:off | magie | 766.7 | 916.6 | 916.6 | 7 | 7 | 6 | 98 | 1 |
| float:off | explorer | 633.3 | 783.3 | 783.3 | 8 | 8 | 7 | 100 | 1 |
| trans:off | repos | 533.3 | 616.7 | 616.7 | 8 | 8 | 9 | 100 | 1 |
| trans:off | defilement | 533.3 | 600 | 616.6 | 26 | 26 | 26 | 100 | 1 |
| trans:off | magie | 766.6 | 850 | 850 | 7 | 7 | 6 | 98 | 1 |
| trans:off | explorer | 683.3 | 800 | 800 | 8 | 8 | 7 | 100 | 1 |

| variante | chargement ms | construction machine ms | 1er rendu ms | ouverture magie ms | magie vers machine ms |
|---|---|---|---|---|---|
| base | 12909 | 574 | 612 | 4053 | 2716 |
| float:off | 11147 | 475 | 484 | 4034 | 2380 |
| trans:off | 12451 | 487 | 577 | 3708 | 2946 |

