# Refonte de l’île du Village Talas

Module `talas-ile.js`, branché sur `buildHub()` par trois crochets gardés (préchargement, `decorate()` en fin de
construction, `update()` dans la boucle). `?ile=classique` rend l’île d’origine. Rien n’est retiré du jeu : les clics,
les ateliers, la tour, l’avion et la cinématique de fin fonctionnent comme avant.

![Accessoires de la forge](planche.png)

## Principes

- **Posé sur le vrai relief.** Chaque objet est placé par lancer de rayon sur `sol.glb` et `falaise.glb`, jamais à une hauteur devinée.
- **Même rendu que le village.** Dégradé toon à 4 paliers et contour encre du jeu. Les accessoires viennent de la forge (`assets/talas/props`).
- **Matière peinte en shader.** `paintify()` ajoute en espace monde un bruit de pinceau, des traînées verticales et une crasse au pied
  des murs. Sur les rochers s’ajoutent strates et plaques de mousse. Aucune UV ni texture n’est nécessaire, donc c’est applicable aux GLB existants.
- **Vent unique.** `windify()` décale les sommets des feuillages selon leur hauteur (palmes, touffes, fougères, feuillages
  procéduraux) ou selon l’attribut `aSway` des lianes (0 en haut, 1 en bas). Un seul uniforme de temps pour toute l’île.
- **Coût maîtrisé.** Les lianes et leurs feuilles sont fusionnées par rocher (3 appels de dessin), les fleurs des buissons passent en instances.

## Ce qui change

| Sujet | Avant | Après |
|---|---|---|
| Avion | fuselage lisse sans détail (volets en barres qui dépassaient : corrigé en bande affleurante) | A320 Talas (forge `avion-a320`) : livrée blanche, ventre et dérive bleus, liseré jaune, logo « T », hublots, pare‑brise, portes, sharklets, réacteurs avec soufflantes qui tournent, feux de navigation et anticollision, train qui **rentre au décollage** de la fin |
| Ateliers | murs unis, entrée nue | matière peinte, socle en pierre, marches, auvent rayé à la couleur de l’atelier, jardinières de fougères, appliques allumées, extincteur et panneau ISO 7010 à chaque porte |
| Place | fontaine sans eau | quatre jets en arc, bancs adossés aux jardinières (assise vers l’anneau et les ateliers), lampadaires sur l’anneau, trois ouvriers qui en font le tour |
| Végétation | figée | vent dans toutes les palmes, touffes et fougères ; fleurs dans les buissons |
| Rochers en mer | piles lisses, couronne de pointes vertes rigides (`mousse*__moss` de `pilier.glb`) | pointes masquées ; jupe de mousse à coulures irrégulières, coussin bosselé, couronne de fougères (texture `fougere.png`) qui s’arquent et retombent au vent, petit palmier, lianes feuillues et fleuries, strates et mousse peintes, écume au pied, goélands |
| Mer et ciel | calmes | deux voiliers en ronde avec sillage, poissons qui sautent avec ronds dans l’eau, avion de ligne et sa traînée, ombres de nuages |
| Piste et tour | statiques | balisage en chenillard, manche à air au vent, radar tournant et feu à éclats, coin logistique (chariot, palettes, fûts, bouteilles, cônes) |
| Plage | vide | parasols qui oscillent au vent, transats, serviettes |

## Ouverture

Le logo du studio Casque à l’Envers reste affiché 5,6 s au lieu de 1,7 s. Le survol et le titre sont décalés d’autant, sans changer
leur durée. La signature apparaît après le balayage du nom. Correction au passage : le bloc du logo, placé à `left:50%`, n’avait que la moitié
de l’écran, si bien que le nom passait sur deux lignes et la signature sur trois. Il tient désormais sur une ligne (retour à la ligne permis sur téléphone).

## Comptes rendus visuels (sans serveur local)

```bash
node tools/forge/preview/record.mjs                                   # 5 vidéos MP4 : intro, île avant/après, parcours avant/après
node tools/forge/preview/record.mjs --photos tools/forge/preview/photos-apres.json   # photos PNG à des points de vue nommés
node tools/forge/preview/build.mjs                                    # préversion publiable (artifact claude.ai)
```

`record.mjs` lance Chrome sans interface (profil temporaire, statistiques coupées) et le pilote par tube, sans port réseau.
La page tourne sur une **horloge virtuelle** (`talas-capture.js`) : minuteries, `requestAnimationFrame`, `performance.now` et animations CSS
n’avancent que de 1/30 s par image capturée. Les vidéos sont donc parfaitement régulières quelle que soit la vitesse du rendu logiciel.
Les séquences île et parcours suivent **le même trajet de caméra avant et après**, ce qui permet de les monter côte à côte.
