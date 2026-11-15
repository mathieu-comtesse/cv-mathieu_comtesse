# Profilage moteur44 (LOGICIEL)

- Date : 2026-11-09T19:23:28.436Z
- Moteur WebGL : ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (Google Inc. (Google))
- Navigateur : 153.0.8010.12
- Répétitions : 3 par variante (valeur affichée = médiane des répétitions)
- RENDU LOGICIEL : ces intervalles mesurent le CPU qui simule le GPU. Ne pas en déduire de cadence 60/30 FPS ni de gain GPU.

## desktop

| variante | scénario | médiane ms | P95 ms | P99 ms | >100 ms | >200 ms | tâches longues | CPU principal % | JS % |
|---|---|---|---|---|---|---|---|---|---|
| base | repos | 550.1 | 600 | 600 | 8 | 8 | 8 | 100 | 1 |
| base | defilement | 533.3 | 616.6 | 633.2 | 26 | 26 | 25 | 100 | 1 |
| base | magie | 733.4 | 833.3 | 833.3 | 7 | 7 | 6 | 99 | 1 |
| base | explorer | 650.1 | 849.9 | 849.9 | 8 | 8 | 8 | 99 | 1 |
| grain:off | repos | 516.6 | 566.7 | 566.7 | 9 | 9 | 9 | 100 | 1 |
| grain:off | defilement | 500 | 599.9 | 633.4 | 26 | 26 | 26 | 100 | 1 |
| grain:off | magie | 883.2 | 1000 | 1000 | 6 | 6 | 5 | 100 | 1 |
| grain:off | explorer | 683.3 | 916.6 | 916.6 | 8 | 8 | 7 | 100 | 1 |
| grain:static | repos | 550 | 616.7 | 616.7 | 8 | 8 | 8 | 100 | 1 |
| grain:static | defilement | 549.9 | 616.7 | 666.7 | 26 | 26 | 26 | 100 | 1 |
| grain:static | magie | 750 | 816.6 | 816.6 | 7 | 7 | 6 | 99 | 1 |
| grain:static | explorer | 716.6 | 833.2 | 833.2 | 8 | 8 | 7 | 99 | 1 |

| variante | chargement ms | construction machine ms | 1er rendu ms | ouverture magie ms | magie vers machine ms |
|---|---|---|---|---|---|
| base | 12750 | 609 | 578 | 4067 | 2842 |
| grain:off | 11805 | 513 | 500 | 4313 | 3943 |
| grain:static | 13324 | 611 | 619 | 3970 | 3063 |

