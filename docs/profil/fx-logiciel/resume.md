# Profilage moteur44 (LOGICIEL)

- Date : 2026-11-09T19:11:40.458Z
- Moteur WebGL : ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (Google Inc. (Google))
- Navigateur : 153.0.8010.12
- Répétitions : 3 par variante (valeur affichée = médiane des répétitions)
- RENDU LOGICIEL : ces intervalles mesurent le CPU qui simule le GPU. Ne pas en déduire de cadence 60/30 FPS ni de gain GPU.

## desktop

| variante | scénario | médiane ms | P95 ms | P99 ms | >100 ms | >200 ms | tâches longues | CPU principal % | JS % |
|---|---|---|---|---|---|---|---|---|---|
| base | repos | 600 | 633.2 | 633.2 | 7 | 7 | 7 | 100 | 1 |
| base | defilement | 566.7 | 666.7 | 700 | 26 | 26 | 26 | 100 | 1 |
| base | magie | 800 | 833.3 | 833.3 | 7 | 7 | 6 | 98 | 1 |
| base | explorer | 749.9 | 850 | 850 | 8 | 8 | 7 | 100 | 1 |
| fx:blur | repos | 599.9 | 633.3 | 633.3 | 8 | 8 | 8 | 100 | 1 |
| fx:blur | defilement | 550 | 600.1 | 616.7 | 27 | 27 | 26 | 100 | 1 |
| fx:blur | magie | 766.7 | 900 | 900 | 7 | 7 | 7 | 99 | 1 |
| fx:blur | explorer | 733.3 | 833.3 | 833.3 | 8 | 8 | 7 | 99 | 1 |
| fx:filter | repos | 600 | 633.4 | 633.4 | 7 | 7 | 7 | 100 | 1 |
| fx:filter | defilement | 566.7 | 666.7 | 666.7 | 26 | 26 | 25 | 100 | 1 |
| fx:filter | magie | 616.6 | 716.7 | 716.7 | 8 | 8 | 7 | 99 | 1 |
| fx:filter | explorer | 666.6 | 766.6 | 766.6 | 8 | 8 | 8 | 100 | 1 |
| fx:anim | repos | 450 | 483.4 | 483.4 | 10 | 10 | 10 | 100 | 1 |
| fx:anim | defilement | 450 | 516.7 | 533.3 | 26 | 26 | 26 | 100 | 1 |
| fx:anim | magie | 533.3 | 550 | 550 | 10 | 10 | 10 | 100 | 1 |
| fx:anim | explorer | 833.3 | 1000 | 1000 | 10 | 10 | 9 | 100 | 0 |

| variante | chargement ms | construction machine ms | 1er rendu ms | ouverture magie ms | magie vers machine ms |
|---|---|---|---|---|---|
| base | 13933 | 585 | 615 | 2526 | 2987 |
| fx:blur | 12788 | 425 | 534 | 5654 | 3940 |
| fx:filter | 12175 | 552 | 551 | 4387 | 2735 |
| fx:anim | 11869 | 520 | 505 | 5350 | 5415 |

