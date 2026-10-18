#!/usr/bin/env python3
"""Compte les pièces d'une ligne et juge chacune conforme ou non conforme, en temps réel.

Source : caméra USB (0, 1…), fichier vidéo ou adresse réseau (rtsp://, http://).
Chaque pièce est repérée, suivie, comptée quand son centre franchit la ligne virtuelle,
puis jugée : soit par des règles de forme, soit par la classe d'un détecteur entraîné sur des défauts.
Le journal des pièces est écrit en CSV.
"""
import argparse
import csv
import statistics
import time
from pathlib import Path

import cv2
from ultralytics import YOLO

CONTENANTS = [39, 40, 41, 75]          # familles de contenants du détecteur généraliste (bouteille, verre, tasse, vase)


def lire_arguments():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--source', default='0', help='indice de caméra, fichier vidéo ou adresse réseau (défaut : 0)')
    a.add_argument('--poids', default='detecteur.pt', help='fichier du détecteur (généraliste ou entraîné sur vos défauts)')
    a.add_argument('--conf', type=float, default=0.25, help='seuil de confiance (défaut : 0.25)')
    a.add_argument('--ligne', type=float, default=0.5, help='position de la ligne, de 0 (gauche) à 1 (droite)')
    a.add_argument('--sens', choices=['droite', 'gauche', 'les-deux'], default='droite', help='sens de passage compté')
    a.add_argument('--ratio-min', type=float, default=2.2, help='rapport hauteur/largeur minimal d\'une pièce debout')
    a.add_argument('--tolerance', type=float, default=0.3, help='écart de hauteur toléré par rapport à la référence (0.3 = 30 %%)')
    a.add_argument('--classes', default=None, help='classes à suivre, séparées par des virgules (défaut : contenants du détecteur généraliste)')
    a.add_argument('--non-conformes', default='', help='noms de classes jugées non conformes (détecteur entraîné sur des défauts)')
    a.add_argument('--journal', default='journal.csv', help='fichier CSV du journal')
    a.add_argument('--video-sortie', default=None, help='enregistre la vidéo annotée')
    a.add_argument('--sans-fenetre', action='store_true', help='pas d\'affichage (serveur sans écran)')
    return a.parse_args()


def main():
    arg = lire_arguments()
    modele = YOLO(arg.poids)
    source = int(arg.source) if arg.source.isdigit() else arg.source
    noms_nok = {n.strip() for n in arg.non_conformes.split(',') if n.strip()}
    classes = CONTENANTS if arg.classes is None else [int(c) if c.isdigit() else next(k for k, v in modele.names.items() if v == c) for c in arg.classes.split(',')]
    if noms_nok:
        classes = None                                   # un détecteur entraîné sur des défauts voit toutes ses classes

    compte = {'total': 0, 'ok': 0, 'nok': 0}
    pistes = {}                                          # id -> {cote, compte, hauteurs}
    references = []
    sortie = None
    t0 = time.time()

    with open(arg.journal, 'w', newline='', encoding='utf-8-sig') as f:
        journal = csv.writer(f, delimiter=';')
        journal.writerow(['n', 'temps_s', 'verdict', 'ratio_h_sur_l', 'hauteur_px', 'motif'])
        for r in modele.track(source=source, stream=True, persist=True, tracker=str(Path(__file__).with_name('suivi.yaml')), conf=arg.conf, classes=classes, verbose=False):
            image = r.orig_img.copy()
            h_img, w_img = image.shape[:2]
            lx = int(arg.ligne * w_img)
            cv2.line(image, (lx, 0), (lx, h_img), (255, 224, 143), 2)
            if r.boxes.id is not None:
                for (x1, y1, x2, y2), ident, cls in zip(r.boxes.xyxy.tolist(), r.boxes.id.int().tolist(), r.boxes.cls.int().tolist()):
                    cx, larg, haut = (x1 + x2) / 2, x2 - x1, y2 - y1
                    p = pistes.setdefault(ident, {'cote': 0, 'compte': None, 'hauteurs': [], 'largeurs': []})
                    p['hauteurs'] = (p['hauteurs'] + [haut])[-8:]
                    p['largeurs'] = (p['largeurs'] + [larg])[-8:]
                    cote = 1 if cx > lx else -1
                    if p['cote'] and cote != p['cote'] and p['compte'] is None and (arg.sens == 'les-deux' or (arg.sens == 'droite') == (cote > 0)):
                        h, l = statistics.median(p['hauteurs']), statistics.median(p['largeurs'])
                        ratio, motifs = h / max(l, 1), []
                        if modele.names[cls] in noms_nok:
                            motifs.append(f'classe {modele.names[cls]}')
                        else:
                            if ratio < arg.ratio_min:
                                motifs.append('renversée ou inclinée')
                            if len(references) >= 3 and abs(h - statistics.median(references)) / statistics.median(references) > arg.tolerance:
                                motifs.append('trop petite' if h < statistics.median(references) else 'trop grande')
                        if len(references) < 3:
                            references.append(h)
                        ok = not motifs
                        p['compte'] = 'ok' if ok else 'nok'
                        compte['total'] += 1
                        compte['ok' if ok else 'nok'] += 1
                        journal.writerow([compte['total'], f'{time.time() - t0:.2f}', 'conforme' if ok else 'non conforme', f'{ratio:.2f}', round(h), ' + '.join(motifs) or 'dans la tolérance'])
                        f.flush()
                    p['cote'] = cote
                    couleur = (140, 245, 191) if p['compte'] == 'ok' else (154, 154, 255) if p['compte'] == 'nok' else (255, 247, 242)
                    cv2.rectangle(image, (int(x1), int(y1)), (int(x2), int(y2)), couleur, 2)
                    cv2.putText(image, f'#{ident}', (int(x1), max(12, int(y1) - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, couleur, 1, cv2.LINE_AA)
            texte = f"comptees {compte['total']}  conformes {compte['ok']}  non conformes {compte['nok']}"
            cv2.putText(image, texte, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
            if arg.video_sortie:
                if sortie is None:
                    sortie = cv2.VideoWriter(arg.video_sortie, cv2.VideoWriter_fourcc(*'mp4v'), 25, (w_img, h_img))
                sortie.write(image)
            if not arg.sans_fenetre:
                cv2.imshow('Controle de ligne', image)
                if cv2.waitKey(1) & 0xFF in (27, ord('q')):
                    break
    if sortie:
        sortie.release()
    cv2.destroyAllWindows()
    print(f"Terminé : {compte['total']} pièces comptées, {compte['ok']} conformes, {compte['nok']} non conformes. Journal : {arg.journal}")


if __name__ == '__main__':
    main()
