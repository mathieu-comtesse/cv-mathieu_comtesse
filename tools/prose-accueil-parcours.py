"""Prose de l'accueil (légendes des cadres), de la présentation du Parcours et de la carte Gains, au ton des Éditions Shopify Automne 2026 :
phrases courtes et affirmatives, chiffre en tête dans les légendes (« Plus de 12 000 … chaque minute »). Mêmes faits, aucun ajout.
Usage : python3 -I tools/prose-accueil-parcours.py index.html"""
import sys
P = sys.argv[1]; s = open(P).read()
R = [
 ('11 machines 3D pour voir mes outils tourner', '11 outils de terrain à explorer, chacun en machine 3D'),
 ('Mathieu dans son décor, d’une activité à l’autre', 'Un atelier en 3D pour suivre Mathieu d’une activité à l’autre'),
 ('3 200 à 4 000 h libérées chaque année pour les équipes', 'Plus de 3 200 heures libérées chaque année pour les équipes'),
 ('Salut ! Je suis Mathieu, ingénieur maintenance et qualité en alternance chez SNCF Gares &amp; Connexions. Bienvenue dans mon coin d’Internet : mon travail, mes projets inachevés ou imparfaits, et tout ce que j’explore.',
  'Ingénieur maintenance et qualité en alternance chez SNCF Gares &amp; Connexions. Ici : mon travail, mes projets, y compris inachevés ou imparfaits, et tout ce que j’explore.'),
 ('Depuis mes premières missions, je collabore avec des équipes de terrain et de maintenance pour rendre leurs processus plus fiables, plus rapides et plus lisibles. J’ai affûté mon regard d’auditeur au contact de celles et ceux qui font réellement le travail, tout en poursuivant mon M2 MQSE à Sorbonne Paris Nord, et en me formant sans relâche aux outils (Power Automate, Power BI, scripts Excel, machines virtuelles).',
  'Avec les équipes de terrain et de maintenance, je rends les processus plus fiables, plus rapides et plus lisibles. Un regard d’auditeur forgé au contact de celles et ceux qui font le travail, un M2 MQSE à Sorbonne Paris Nord, et des outils appris en continu : Power Automate, Power BI, scripts Excel, machines virtuelles.'),
 ('Mon appétit d’apprendre m’a mené vers l’avenir de mon métier : l’IA appliquée, les agents LLM et l’OCR.',
  'Prochaine étape du métier : l’IA appliquée, les agents LLM et l’OCR.'),
 ('Quand je ne construis pas d’outils, je partage mes découvertes sur mon blog : machines manipulables, jeux et mondes en 3D. Le reste du temps, vous me trouverez entre un vinyle, un bonsaï ou sur un cycle.',
  'Hors des outils, le blog : machines manipulables, jeux et mondes en 3D. Le reste du temps, un vinyle, un bonsaï ou un cycle.'),
 ('Le temps libéré par les outils, valorisé au taux horaire de 104,74 €.', 'Chaque heure rendue aux équipes par les outils, valorisée à 104,74 €.'),
]
for a, b in R:
    n = s.count(a); assert n >= 1, a[:50]
    s = s.replace(a, b)
open(P, 'w').write(s); print('remplacements', len(R))
