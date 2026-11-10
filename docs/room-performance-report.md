# Mesures de Ma pièce

Chromium (Chrome Windows), ANGLE Direct3D 11, AMD Radeon RX 9070 XT. Comparaison entre `90f6b5d` et la branche à partir du même checkout et des mêmes binaires d’origine. La scène complète a été servie par interception locale de Playwright. Chaque navigateur a utilisé un contexte neuf. Scène au repos, météo claire, caméra stabilisée, adaptation de résolution suspendue pendant le relevé. Le profil mobile est une émulation tactile à 390 × 844 sur ce même GPU.

| Mesure | Desktop avant | Desktop après | Mobile émulé avant | Mobile émulé après |
| --- | ---: | ---: | ---: | ---: |
| Médiane du temps d’image | 12,6 ms | 13,8 ms | 12,4 ms | 14,8 ms |
| P95 du temps d’image | 16,7 ms | 18,9 ms | 17,2 ms | 18,7 ms |
| Médiane CPU de `renderer.render` | 9,9 ms | 11,0 ms | 9,8 ms | 11,9 ms |
| Première scène jouable | 12,49 s | 16,19 s | 2,69 s | 2,82 s |
| Appels de rendu au dernier relevé | 978 | 986 | 956 | 959 |
| Triangles au dernier relevé | 462 383 | 439 749 | 447 439 | 425 639 |
| Textures dans `renderer.info` | 139 | 138 | 136 | 135 |
| Poids des ressources locales observées | 19 162 068 o | 19 152 734 o | 19 162 068 o | 19 152 734 o |

Les temps d’image portent sur 3,5 s, avec 240 échantillons desktop et 230 en mobile pour la branche. Aucune tâche longue n’a été observée sur ces intervalles. Le décompte des appels et des triangles dépend de la phase de rafraîchissement des ombres.

Le budget en triangles baisse d’environ 5 %. Les temps d’image et le démarrage à froid desktop régressent dans cette mesure. Les seuils de 60 FPS desktop en régime stable et 30 FPS sur mobile physique restent à confirmer sur les configurations cibles. Cette mesure ne sépare pas le temps de traitement GPU, l’utilisation VRAM, ni le coût des rotations, du jardin en activité ou de la veille prolongée.
