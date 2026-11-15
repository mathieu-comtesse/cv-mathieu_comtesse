# Profilage moteur44 (LOGICIEL)

- Date : 2026-11-09T18:53:26.481Z
- Moteur WebGL : ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (Google Inc. (Google))
- Navigateur : 153.0.8010.12
- Répétitions : 3 par variante (valeur affichée = médiane des répétitions)
- RENDU LOGICIEL : ces intervalles mesurent le CPU qui simule le GPU. Ne pas en déduire de cadence 60/30 FPS ni de gain GPU.

## desktop

| variante | scénario | médiane ms | P95 ms | P99 ms | >100 ms | >200 ms | tâches longues | CPU principal % | JS % |
|---|---|---|---|---|---|---|---|---|---|
| base | repos | 616.7 | 683.4 | 683.4 | 7 | 7 | 6 | 100 | 1 |
| base | defilement | 566.7 | 666.6 | 683.4 | 27 | 27 | 27 | 100 | 1 |
| base | magie | 833.3 | 850 | 850 | 7 | 7 | 6 | 98 | 1 |
| base | explorer | 683.3 | 816.6 | 816.6 | 7 | 7 | 7 | 99 | 1 |
| machine:off | repos | 150 | 166.8 | 199.9 | 26 | 0 | 25 | 98 | 0 |
| machine:off | defilement | 166.6 | 183.4 | 216.6 | 27 | 1 | 27 | 95 | 0 |
| machine:off | magie | 233.3 | 266.6 | 266.6 | 22 | 18 | 21 | 92 | 0 |
| machine:off | explorer | 200 | 266.7 | 283.3 | 25 | 8 | 25 | 98 | 0 |
| bg:static | repos | 416.7 | 500 | 500 | 10 | 10 | 10 | 100 | 1 |
| bg:static | defilement | 416.7 | 466.7 | 483.3 | 26 | 26 | 26 | 100 | 1 |
| bg:static | magie | 566.7 | 683.2 | 683.2 | 9 | 9 | 8 | 96 | 1 |
| bg:static | explorer | 666.6 | 866.6 | 866.6 | 8 | 8 | 7 | 99 | 1 |
| bg:off | repos | 450.1 | 483.4 | 483.4 | 9 | 9 | 9 | 100 | 1 |
| bg:off | defilement | 433.3 | 516.6 | 533.3 | 26 | 26 | 26 | 99 | 1 |
| bg:off | magie | 600 | 683.3 | 683.3 | 9 | 9 | 8 | 96 | 1 |
| bg:off | explorer | 600.1 | 749.9 | 749.9 | 9 | 9 | 9 | 98 | 1 |
| dpr:1 | repos | 583.3 | 616.6 | 616.6 | 8 | 8 | 8 | 100 | 1 |
| dpr:1 | defilement | 600 | 650 | 683.3 | 26 | 26 | 26 | 100 | 1 |
| dpr:1 | magie | 816.6 | 883.3 | 883.3 | 7 | 7 | 6 | 98 | 1 |
| dpr:1 | explorer | 749.9 | 866.6 | 866.6 | 8 | 8 | 8 | 100 | 1 |
| shadow:off | repos | 516.7 | 566.6 | 566.6 | 8 | 8 | 9 | 100 | 1 |
| shadow:off | defilement | 483.4 | 533.3 | 599.9 | 26 | 26 | 26 | 100 | 1 |
| shadow:off | magie | 649.9 | 716.6 | 716.6 | 8 | 8 | 7 | 97 | 1 |
| shadow:off | explorer | 633.3 | 750 | 750 | 9 | 9 | 8 | 99 | 1 |
| fx:off | repos | 500 | 550 | 550 | 9 | 9 | 10 | 100 | 1 |
| fx:off | defilement | 533.3 | 566.7 | 583.3 | 26 | 26 | 26 | 100 | 1 |
| fx:off | magie | 516.6 | 550 | 550 | 10 | 10 | 10 | 100 | 1 |
| fx:off | explorer | 833.3 | 999.9 | 999.9 | 9 | 9 | 8 | 100 | 0 |

| variante | chargement ms | construction machine ms | 1er rendu ms | ouverture magie ms | magie vers machine ms |
|---|---|---|---|---|---|
| base | 13864 | 645 | 634 | 2875 | 2975 |
| machine:off | 3816 | 534 | - | 1221 | 1163 |
| bg:static | 9709 | 136 | 641 | 3605 | 1695 |
| bg:off | 10587 | 134 | 593 | 3371 | 3180 |
| dpr:1 | 13397 | 480 | 614 | 4373 | 2458 |
| shadow:off | 12767 | 620 | 558 | 3936 | 2086 |
| fx:off | 12165 | 535 | 529 | 5885 | 7139 |

