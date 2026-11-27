"""Rétablit sous le hublot (Parcours) le bloc « Compétences » de main (7 rubriques, pastilles, légende « En cours d’acquisition »),
avec ses ids renommés (sk-…) pour ne pas doubler ceux des sections, et ajoute les notions automatisation et BI dans « Data & automatisation ».
Usage : python3 -I tools/competences-hublot.py index.html main-index.html"""
import re, sys
P, M = sys.argv[1], sys.argv[2]; s = open(P).read(); m = open(M).read()
TAG = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(/?)>', re.S)
VIDES = {'img', 'br', 'input', 'source', 'hr', 'wbr', 'meta', 'link'}
def fin(t, i):
    p = 0
    for x in TAG.finditer(t, i):
        if x.group(2).lower() in VIDES or x.group(3): continue
        p += -1 if x.group(1) else 1
        if p == 0: return x.end()
k = m.index('<div class="rf-sk">'); bloc = m[k:fin(m, k)]
bloc = re.sub(r'(<div class="rf-sk-grp" id=")([a-z]+)"', r'\1sk-\2"', bloc)
# nouvelles pastilles, au format exact d'une pastille du groupe (icône du groupe « Power BI »)
g = bloc.index('<h3>Data &amp; automatisation</h3>'); c0 = bloc.index('<div class="rf-sk-chips">', g); c1 = fin(bloc, c0)
zone = bloc
def puce(lib):   # pastille existante du bloc, reprise avec son icône
    x = re.search(r'<span class="rf-chipx">(?:(?!<span class="rf-chipx">).)*?<span>%s</span></span>' % re.escape(lib), zone, re.S); return x.group(0)
NEUVES = [('Automatisation des processus', 'Power Automate'), ('Business Intelligence', 'Power BI'), ('Modélisation DAX', 'Excel'),
          ('Tableaux de bord et indicateurs', 'Power BI'), ('Chaînes ETL', 'Power Automate'), ('SharePoint', 'Fiabilisation des données')]
ajout = ''.join(puce(m).replace('<span>%s</span>' % m, '<span>%s</span>' % n) for n, m in NEUVES)
bloc = bloc[:c1 - len('</div>')] + ajout + bloc[c1 - len('</div>'):]
i = s.index('<div class="rf-sk">'); s = s[:i] + bloc + s[fin(s, i):]
ids = re.findall(r'\sid="([^"]+)"', s); dup = sorted({x for x in ids if ids.count(x) > 1})
assert not dup, dup
open(P, 'w').write(s); print('rubriques', bloc.count('rf-sk-grp"'), '| pastilles', bloc.count('class="rf-chipx"'))
