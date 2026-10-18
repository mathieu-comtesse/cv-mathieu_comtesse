# Contrôle de ligne par vision

Compter les pièces d'une ligne de production et juger chacune conforme ou non conforme, en temps réel, à partir d'une caméra.

## Principe

À chaque image de la caméra :

1. **Repérer** : un détecteur d'objets entoure chaque pièce visible.
2. **Suivre** : chaque pièce garde un numéro d'une image à l'autre, même si elle disparaît un instant.
3. **Compter** : une pièce est comptée une seule fois, quand son centre franchit une ligne virtuelle dans le bon sens.
4. **Juger** : la pièce reçoit un verdict, écrit dans un journal CSV avec l'instant, le motif et ses mesures.

Le verdict peut venir de deux sources :

- **des règles de forme** (pièce debout, hauteur proche de la référence calibrée sur les trois premières pièces), réglables sans entraînement ;
- **d'un détecteur entraîné sur vos défauts** (niveau de remplissage, bouchon manquant, étiquette décalée) : la classe détectée donne directement le verdict.

La page `ligne-controle.html` du site montre la même chaîne dans le navigateur, sans rien envoyer.

## Utilisation

```bash
pip install -r requirements.txt

# caméra USB, règles de forme
python compter.py --source 0 --poids detecteur.pt

# caméra réseau, ligne à 40 % de la largeur, pièces qui passent vers la gauche
python compter.py --source rtsp://adresse/flux --ligne 0.4 --sens gauche

# détecteur entraîné sur des défauts : les classes citées sont jugées non conformes
python compter.py --source 0 --poids entrainement/ligne/weights/best.pt --non-conformes non_conforme
```

Options utiles : `--conf` (seuil de confiance), `--ratio-min`, `--tolerance`, `--journal`, `--video-sortie`, `--sans-fenetre`.

## Entraîner sur vos défauts

1. Filmer la ligne avec la caméra et l'éclairage définitifs, extraire quelques centaines d'images par type de défaut.
2. Annoter les pièces (une boîte par pièce, une classe par type de défaut) dans l'outil d'annotation de votre choix, export au format texte à une ligne par boîte.
3. Ranger les images et les étiquettes comme dans `donnees-exemple.yaml`, puis lancer `python entrainer.py`.
4. Reprendre le fichier produit avec `compter.py --poids …`, ou avec l'export pour le navigateur.

## Bonnes pratiques de mise en place

- Caméra fixe, perpendiculaire au flux, image nette (vitesse d'obturation courte) et éclairage constant.
- Ligne de comptage au milieu de l'image, là où les pièces sont de taille constante.
- Valider le comptage sur une vidéo comptée à la main avant toute décision qualité.

Composants tiers et licences : voir `NOTICES.md` à la racine du dépôt.
