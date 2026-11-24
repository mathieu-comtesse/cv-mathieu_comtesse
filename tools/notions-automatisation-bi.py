"""Automatisation des processus et Business Intelligence dans le profil et les projets, à la manière des Éditions Shopify Automne 2026.
- fiches projets : une rangée de pastilles (police mono 12 px, comme les boutons de la référence) sous la phrase d'accroche ;
- chapitre « Data & IA » : cinq entrées de compétences (même format que les autres : 3 colonnes, 14 px) ;
- présentation (Parcours) : une phrase de positionnement.
Chaque notion découle d'un fait déjà présent dans la fiche du projet (outil, chaîne de traitement, mesures DAX). Passage unique.
Usage : python3 -I tools/notions-automatisation-bi.py index.html"""
import re, sys, json, html
P = sys.argv[1]; s = open(P).read()
assert 'cv-notions' not in s, 'déjà appliqué'
e = lambda t: html.escape(t, quote=False)

NOTIONS = {
 'cv-7-0-point-financier-power-automate': ['Automatisation des processus', 'Power Automate', 'Power BI', 'Alertes de seuil'],
 'cv-7-1-vre-traitement-par-vm': ['Automatisation des processus', 'Machine virtuelle', 'SharePoint', 'Contrôle des doublons'],
 'cv-7-2-reporteur-q18': ['Automatisation des processus', 'Chaîne ETL', 'SharePoint → Excel → Power BI', 'Business Intelligence'],
 'cv-7-3-power-automate-chaine-des-pp': ['Automatisation des processus', 'Extraction de données', 'SharePoint', 'Archivage automatique'],
 'cv-7-4-cerfa-v3': ['Extraction de données', 'Traitement par lot', 'Contrôle qualité des données', 'Chaîne ETL'],
 'cv-7-5-extracteur-vre': ['Extraction de données', 'Comptage automatisé', 'Plan annuel de maintenance'],
 'cv-7-6-lecteur-vre-modele-multimodal': ['Intelligence documentaire', 'Apprentissage supervisé', 'Extraction structurée'],
 'cv-7-7-power-bi-pp-moso': ['Business Intelligence', 'Power BI', 'Modélisation DAX', 'Interface HTML/CSS'],
 'cv-7-8-studio-d-extracteurs-pdf': ['Automatisation des processus', 'Extraction sans code', 'Application locale'],
 'cv-7-9-retrouver-tout-le-suivi': ['Centralisation de l’information', 'Accès direct aux outils'],
 'cv-7-10-gares-prioritaires': ['Business Intelligence', 'Power BI', 'DAX : 19 tables, 159 mesures', 'Indicateurs de criticité'],
}
n = 0
for aid, notions in NOTIONS.items():
    i = s.index('<article id="%s"' % aid); t0 = s.index('<div class="cv-pf-text">', i); t1 = s.index('</div>', t0)
    rang = '<ul class="cv-notions" aria-label="Notions">' + ''.join('<li>%s</li>' % e(x) for x in notions) + '</ul>'
    s = s[:t1] + rang + s[t1:]; n += 1
assert n == 11

COMPETENCES = [  # (id, titre, icône) ; toutes étayées par les projets ci-dessus
 ('cv-2-7-automatisation-des-processus', 'Automatisation des processus', '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"></path><path d="M18 3v4h-4M6 21v-4h4"></path>'),
 ('cv-2-8-business-intelligence', 'Business Intelligence', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>'),
 ('cv-2-9-modelisation-dax', 'Modélisation DAX', '<rect x="3" y="4" width="7" height="6" rx="1"></rect><rect x="14" y="14" width="7" height="6" rx="1"></rect><path d="M10 7h4v10"></path>'),
 ('cv-2-10-tableaux-de-bord-et-indicateurs', 'Tableaux de bord et indicateurs', '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 15l3-4 3 2 4-6"></path>'),
 ('cv-2-11-chaines-etl', 'Chaînes ETL', '<path d="M3 6h6v4H3zM15 14h6v4h-6zM9 8h3v8h3"></path>'),
]
k = s.index('<article id="cv-2-6-json"'); fin = s.index('</article>', k) + len('</article>'); modele = s[k:fin]
neuf = ''
for aid, titre, ico in COMPETENCES:
    a = modele.replace('cv-2-6-json', aid)
    a = re.sub(r'(<h3[^>]*>)[^<]*(</h3>)', lambda m: m.group(1) + e(titre) + m.group(2), a, count=1)
    a = re.sub(r'(<svg class="rf-exp-ico "[^>]*>).*?(</svg>)', lambda m: m.group(1) + ico + m.group(2), a, count=1, flags=re.S)
    neuf += a
s = s[:fin] + neuf + s[fin:]

# enregistrements du chapitre « Data & IA » (graphe, recherche, mini-jeu)
i = s.index('const cvChapterRecords=') + len('const cvChapterRecords='); j = s.index('];', i) + 1
recs = json.loads(s[i:j]); r = next(x for x in recs if x['id'] == 'operations')
pos = next(k for k, c in enumerate(r['cards']) if c['handle'] == 'cv-2-6-json') + 1
r['cards'][pos:pos] = [{'title': t, 'handle': h, 'image': None} for h, t, _ in COMPETENCES]
s = s[:i] + json.dumps(recs, ensure_ascii=False, separators=(',', ':')) + s[j:]

# présentation : positionnement, au ton de la référence (phrases courtes, faits)
a = 'Avec les équipes de terrain et de maintenance, je rends les processus plus fiables, plus rapides et plus lisibles.'
assert s.count(a) == 1
s = s.replace(a, a + ' Deux leviers : l’automatisation des processus (Power Automate, machines virtuelles, SharePoint) et la Business Intelligence (Power BI, modèles DAX, tableaux de bord et indicateurs).')

css = '''<style id="cv-notions-css">
/* notions d'un projet : pastilles en police mono 12 px, comme les boutons des cadres de la référence */
.cv-notions{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 0;padding:0;list-style:none}
.cv-notions li{font:300 12px/1.5 "Sohne Mono","JetBrains Mono",ui-monospace,monospace;padding:3px 10px;border-radius:999px;background:rgb(0 0 0/.3);color:#fff;white-space:nowrap}
</style>'''
s = s.replace('</head>', css + '</head>', 1)
open(P, 'w').write(s); print('fiches', n, '| compétences', len(COMPETENCES), '| cartes Data & IA', len(r['cards']))
