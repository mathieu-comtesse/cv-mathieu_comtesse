# Profilage moteur44 (LOGICIEL)

- Date : 2026-11-09T21:21:07.792Z
- Moteur WebGL : ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (Google Inc. (Google))
- Navigateur : 153.0.8010.12
- Répétitions : 3 par variante (valeur affichée = médiane des répétitions)
- RENDU LOGICIEL : ces intervalles mesurent le CPU qui simule le GPU. Ne pas en déduire de cadence 60/30 FPS ni de gain GPU.

## desktop

| variante | scénario | images | médiane ms | P95 ms | P99 ms | >100 ms | >200 ms | tâches longues | CPU principal % | JS % |
|---|---|---|---|---|---|---|---|---|---|---|
| base | repos | 7 (P99 non représentatif) | 633.3 | 683.4 | 683.4 | 7 | 7 | 7 | 100 | 0 |
| base | defilement | 25 (P99 non représentatif) | 550.1 | 650 | 650.1 | 25 | 25 | 26 | 100 | 1 |
| base | magie | 8 (P99 non représentatif) | 683.3 | 733.3 | 733.3 | 8 | 8 | 8 | 99 | 1 |
| base | explorer | 8 (P99 non représentatif) | 633.3 | 683.3 | 683.3 | 8 | 8 | 7 | 99 | 1 |
| machine:off | repos | 26 (P99 non représentatif) | 166.6 | 200 | 200.1 | 26 | 1 | 25 | 99 | 1 |
| machine:off | defilement | 27 (P99 non représentatif) | 166.7 | 200 | 216.7 | 27 | 1 | 28 | 95 | 0 |
| machine:off | magie | 27 (P99 non représentatif) | 183.3 | 233.3 | 233.4 | 27 | 5 | 27 | 93 | 0 |
| machine:off | explorer | 27 (P99 non représentatif) | 183.3 | 233.4 | 250 | 27 | 7 | 26 | 98 | 0 |

| variante | chargement ms | construction machine ms | 1er rendu ms | ouverture magie ms | magie vers machine ms |
|---|---|---|---|---|---|
| base | 13220 | 494 | 694 | 4409 | 2661 |
| machine:off | 4469 | 626 | - | 1236 | 1338 |

