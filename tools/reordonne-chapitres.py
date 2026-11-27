"""Réorganisation des 11 chapitres : projets en tête, séparés par type ; compétences regroupées.
Chaque position garde son identifiant de section (agentic ... developer), sa couleur et sa ligne de temps : seul le contenu change de place."""
import re, json, html, sys
P = sys.argv[1]
s = open(P).read()
IDS = ['agentic', 'sidekick', 'online', 'merchandising', 'retail', 'payments', 'operations', 'shop', 'marketing', 'fulfillment', 'developer']
VIDES = {'img', 'br', 'input', 'source', 'hr', 'wbr', 'meta', 'link', 'col', 'area', 'embed', 'param', 'track'}
TAG = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(/?)>', re.S)

def fin_element(t, i):
    """indice de fin de l'élément qui commence en t[i] (balises équilibrées)"""
    prof = 0
    for m in TAG.finditer(t, i):
        ferme, nom, auto = m.group(1), m.group(2).lower(), m.group(3)
        if nom in VIDES or auto:
            if prof == 0: return m.end()
            continue
        if nom in ('script', 'style') and not ferme:
            j = t.index('</' + nom, m.end()); continue
        prof += -1 if ferme else 1
        if prof == 0: return m.end()
    raise ValueError('non équilibré')

def enfants(t):
    out, i = [], 0
    while True:
        m = re.compile(r'<[a-zA-Z]').search(t, i)
        if not m: break
        e = fin_element(t, m.start()); out.append(t[m.start():e]); i = e
    return out

# blocs de section consécutifs
pos = [s.index('<section id="%s"' % k) for k in IDS]
fin_der = fin_element(s, pos[-1])
blocs = [s[pos[k]:(pos[k + 1] if k < 10 else fin_der)] for k in range(11)]
for k, b in enumerate(blocs): assert fin_element(b, 0) == len(b), IDS[k]
avant, apres = s[:pos[0]], s[fin_der:]

def isolate(b):
    i = b.index('<div class="isolate col-span-full grid grid-cols-subgrid')
    j = fin_element(b, i); k = b.index('>', i) + 1
    return i, k, j - 6, j   # début ouvrante, début contenu, fin contenu, fin

def cartes(b):
    i, k, f, j = isolate(b); return enfants(b[k:f])

def avec_cartes(b, liste):
    i, k, f, j = isolate(b); return b[:k] + ''.join(liste) + b[f:]

def titre(b, texte):
    t = html.escape(texte, quote=False)
    b = re.sub(r'(<h2 [^>]*id="[a-z]+-title"[^>]*>)[^<]*', lambda m: m.group(1) + t, b, count=1)
    return re.sub(r'data-title-signal-fill="[^"]*"', 'data-title-signal-fill="%s"' % html.escape(texte), b, count=1)

C = {k: cartes(blocs[n]) for n, k in enumerate(IDS)}
ident = lambda c: (re.match(r'<[a-z]+ [^>]*?id="([^"]*)"', c) or [None, None])[1]
total_avant = sum(len([c for c in v if c.startswith('<article')]) for v in C.values())

# chapitre Projets : introduction par type, projets par type, tirelire
shop = C['shop']
proc = next(c for c in shop if ident(c) == 'cv-processus')
legacy = re.search(r'<div class="cv-legacy">(.*)</div></div></article>$', proc, re.S).group(1)
types = re.findall(r'(<h2 class="pc-h" id="(s-p\d)">([^<]*)</h2>(<div class="pc-notes">.*?</div>))', legacy, re.S)
assert len(types) == 4, len(types)
def intro(n):
    bloc, sid, long, notes = types[n]
    c = proc.replace('id="cv-processus"', 'id="cv-processus%s"' % ('' if n == 0 else '-%d' % n), 1)
    c = c.replace('data-product-handle="cv-processus"', 'data-product-handle="cv-processus%s"' % ('' if n == 0 else '-%d' % n))
    c = c.replace('data-component-extra-product-handle="cv-processus"', 'data-component-extra-product-handle="cv-processus%s"' % ('' if n == 0 else '-%d' % n))
    c = re.sub(r'(<h3 [^>]*>)[^<]*(</h3>)', lambda m: m.group(1) + long + m.group(2), c, count=1)
    return c.replace(legacy, bloc)
THEMES = ['Faire fonctionner', 'Fichiers retrouvés', 'Construire une fois', 'Savoir où regarder']
par_type = {t: [c for c in shop if c.startswith('<article') and 'data-cv-theme="%s"' % t in c[:600]] for t in THEMES}
assert [len(par_type[t]) for t in THEMES] == [2, 5, 2, 2], [len(par_type[t]) for t in THEMES]
gains = [c for c in shop if ident(c) == 'cv-gains']; assert len(gains) == 1
reste = [c for c in shop if c.startswith('<article') and c not in gains and c != proc and not any(c in v for v in par_type.values())]
assert not reste, [ident(c) for c in reste]
arts = lambda k: [c for c in C[k] if c.startswith('<article')]

PLAN = [  # (titre de section, libellé court, cartes)
    ('Faire fonctionner', 'Faire fonctionner', [intro(0)] + par_type['Faire fonctionner']),
    ('Fichiers retrouvés', 'Fichiers retrouvés', [intro(1)] + par_type['Fichiers retrouvés']),
    ('Construire une fois', 'Construire une fois', [intro(2)] + par_type['Construire une fois']),
    ('Savoir où regarder', 'Savoir où regarder', [intro(3)] + par_type['Savoir où regarder']),
    ('Gains', 'Gains', gains),
    ('Maintenance & prévention', 'Maintenance', arts('sidekick') + arts('agentic')),
    ('Data & IA', 'Data & IA', arts('online') + arts('merchandising')),
    ('Référentiels & méthodes', 'Référentiels', arts('retail') + arts('payments')),
    ('Parcours', 'Parcours', C['marketing'] + arts('operations')),
    (None, None, None), (None, None, None)]
nouveaux = []
for k, (t, court, liste) in enumerate(PLAN):
    b = blocs[k]
    if t is None: nouveaux.append(b); continue
    nouveaux.append(titre(avec_cartes(b, liste), t))
s2 = avant + ''.join(nouveaux) + apres
total_apres = sum(len([c for c in cartes(b) if c.startswith('<article')]) for b in nouveaux)
assert total_apres == total_avant + 3, (total_avant, total_apres)   # +3 : introduction de chaque type de projet

# menus : libellés courts par position
COURTS = [p[1] for p in PLAN[:9]]
for k, lib in enumerate(COURTS):
    s2, n = re.subn(r'(href="#%s"[^>]*>\s*<span[^>]*>)[^<]*(</span>)' % IDS[k], lambda m: m.group(1) + html.escape(lib, quote=False) + m.group(2), s2)
    assert n >= 2, (IDS[k], n)

# lien des familles de compétences, dans Parcours
s2, n = re.subn(r'<p class="rf-sk-liens">.*?</p>', '<p class="rf-sk-liens">Les compétences sont regroupées en trois chapitres : <a href="#payments">Maintenance &amp; prévention</a>, <a href="#operations">Data &amp; IA</a> et <a href="#shop">Référentiels &amp; méthodes</a> ; le savoir-être est présenté ici.</p>', s2, count=1, flags=re.S)
assert n == 1

# enregistrements des chapitres (graphe, menus)
i = s2.index('const cvChapterRecords=') + len('const cvChapterRecords=')
j = s2.index('];', i) + 1
anciens = json.loads(s2[i:j]); fiche = {c['handle']: c for r in anciens for c in r['cards']}
recs = []
for k in range(11):
    if PLAN[k][0] is None: recs.append(anciens[k]); continue
    b = nouveaux[k]; t = PLAN[k][0]
    hs = [ident(c) for c in cartes(b) if c.startswith('<article')]
    cards = [fiche[h] for h in hs if h in fiche]
    if k < 9 and not cards: cards = [{'title': re.sub('<[^>]+>', '', re.search(r'<h3[^>]*>(.*?)</h3>', c, re.S).group(1)), 'handle': ident(c), 'image': None} for c in cartes(b) if c.startswith('<article')]
    recs.append({**anciens[k], 'name': t, 'cards': cards})
s2 = s2[:i] + json.dumps(recs, ensure_ascii=False, separators=(',', ':')) + s2[j:]
open(P, 'w').write(s2)
print('ok', total_avant, '->', total_apres, [(r['name'], len(r['cards'])) for r in recs])
