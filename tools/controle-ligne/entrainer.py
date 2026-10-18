#!/usr/bin/env python3
"""Entraîne le détecteur sur des images de votre ligne (pièces conformes et défauts), puis l'exporte pour le navigateur.

Arborescence attendue (voir donnees-exemple.yaml) :
  donnees/images/{train,val}/*.jpg   et   donnees/labels/{train,val}/*.txt   (une ligne par pièce : classe x y largeur hauteur, relatifs)
"""
import argparse

from ultralytics import YOLO


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--donnees', default='donnees-exemple.yaml', help='fichier de description du jeu d\'images')
    a.add_argument('--base', default='detecteur.pt', help='détecteur de départ')
    a.add_argument('--epoques', type=int, default=80)
    a.add_argument('--taille', type=int, default=640, help='côté des images d\'entraînement')
    a.add_argument('--lot', type=int, default=16)
    a.add_argument('--appareil', default=None, help='0 pour une carte graphique, cpu sinon (défaut : automatique)')
    arg = a.parse_args()

    modele = YOLO(arg.base)
    modele.train(data=arg.donnees, epochs=arg.epoques, imgsz=arg.taille, batch=arg.lot, device=arg.appareil, project='entrainement', name='ligne')
    print('Qualité sur les images de validation :', modele.val(data=arg.donnees).results_dict)
    chemin = modele.export(format='onnx', imgsz=arg.taille, simplify=True, end2end=True)
    print('Export pour le navigateur :', chemin)


if __name__ == '__main__':
    main()
