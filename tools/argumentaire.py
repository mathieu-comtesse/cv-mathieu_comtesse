"""Argumentaire « De l'innovation dans les bureaux », placé dans le chapitre Gains, après le tableau des gains.
Texte suivi à la manière de Tocqueville (longues périodes, observations générales), en français courant.
Chiffres repris du site : 3 200 à 4 000 h par an, 104,74 € de l'heure.
Usage : python3 -I tools/argumentaire.py index.html"""
import sys, json, html
P = sys.argv[1]; s = open(P).read()
assert 'cv-argumentaire' not in s, 'déjà appliqué'
TITRE = 'De l’innovation dans les bureaux'
CHAPO = 'Quelques remarques sur la manière dont une organisation accueille les outils qui lui rendent du temps.'
PARAS = [
 'Il règne dans la plupart des organisations une idée assez commune, selon laquelle l’innovation véritable doit laisser une trace dans la matière : une machine, un procédé, un objet que l’on puisse montrer. Ce qui se passe sur un écran semble, par comparaison, relever de l’arrangement plutôt que de l’invention, et l’on accorde volontiers à l’outil numérique le mérite de la commodité en lui refusant celui de la nouveauté. Je doute que cette distinction résiste longtemps à l’examen, mais je comprends qu’elle se maintienne, car elle dispense ceux qui la font de mesurer ce que l’outil a réellement changé.',
 'Cette mesure est pourtant ce qui manque le plus. Dans le secteur tertiaire, le travail s’accomplit pour une large part au moyen de documents, rapports, plans de prévention, comptes rendus, relevés, qui circulent, se recopient, se vérifient et s’archivent. Leur présence est si constante qu’elle cesse d’être remarquée, et le temps qu’ils absorbent, partagé entre un grand nombre de personnes et dispersé en une multitude de petites tâches, ne se rassemble jamais sous les yeux de quiconque. Une charge que personne ne voit tout entière ne trouve guère de défenseur ni d’adversaire ; elle demeure, parce que rien ne la signale. Lorsqu’on prend la peine d’en faire le compte, les outils présentés ici en rendent entre 3 200 et 4 000 heures par an, à 104,74 € l’heure.',
 'On s’interroge alors sur leur durée, et la question est légitime. J’observe seulement qu’on la pose de préférence à ce qui est nouveau. Les usages anciens, même devenus obscurs ou incommodes, jouissent d’une présomption de solidité que leur ancienneté suffit à leur conférer, tandis que l’outil récent doit établir d’avance qu’il survivra à celui qui l’a conçu. Il est juste qu’il l’établisse, et c’est pourquoi ceux-ci reposent sur des logiciels courants, Excel, SharePoint, Power Automate, Power BI, que d’autres sauront reprendre après moi.',
 'Il resterait à parler de la résistance au changement, qu’on aurait tort de confondre avec l’hostilité. Elle procède plutôt de ce goût de la tranquillité qui porte chacun à préférer une méthode connue, fût-elle pénible, à une méthode meilleure qu’il faudrait apprendre ; elle s’exprime rarement par un refus, et bien plus souvent par des délais, des précautions et des réunions qui en appellent d’autres. La démonstration n’y peut presque rien, car on se rend moins aux raisons qu’aux habitudes. On y parvient mieux en concevant des outils qui s’insèrent dans le travail tel qu’il se fait déjà, de sorte que leur adoption ressemble moins à une conversion qu’à un soulagement, et que ce qu’on hésitait d’abord à nommer innovation finisse par n’avoir plus besoin de nom, parce qu’on ne saurait plus s’en passer.',
]
e = lambda t: html.escape(t, quote=False)
corps = ''.join('<p>%s</p>' % e(p) for p in PARAS)
art = ('<article id="cv-argumentaire" data-product-handle="cv-argumentaire" data-component-extra-product-handle="cv-argumentaire" class="relative product-card group/cv col-span-12 min-w-0 scroll-mt-header-height focus:outline-none " tabindex="-1">'
       '<span aria-hidden="true" data-card-marker="" class="absolute left-10 top-28 hidden size-4 border border-current global-lg:block"></span>'
       '<div data-card-copy="" class="cv-card-content space-y-16" style="--html-in-canvas-rise:.45"><h3 class="trim-cap font-sans font-medium global-lg:text-body-lg">%s</h3></div>'
       '<div class="cv-card-body"><div class="cv-legacy cv-essai"><p class="cv-essai-chapo">%s</p>%s</div></div></article>') % (e(TITRE), e(CHAPO), corps)
a = s.index('<article id="cv-gains"'); j = s.index('</article>', a)
# l'article des gains contient d'autres balises article ? on prend la fin de l'élément équilibré
import re
TAG = re.compile(r'<(/?)(article)\b[^>]*>'); p = 0
for m in TAG.finditer(s, a):
    p += -1 if m.group(1) else 1
    if p == 0: j = m.end(); break
s = s[:j] + art + s[j:]
i = s.index('const cvChapterRecords=') + len('const cvChapterRecords='); k = s.index('];', i) + 1
recs = json.loads(s[i:k]); r = next(x for x in recs if x['id'] == 'retail')
r['cards'].append({'title': TITRE, 'handle': 'cv-argumentaire', 'image': None})
s = s[:i] + json.dumps(recs, ensure_ascii=False, separators=(',', ':')) + s[k:]
css = '''<style id="cv-argumentaire-css">
/* argumentaire : texte suivi, colonne de lecture, intertitres en gras dans le paragraphe */
.cv-essai{max-width:68ch}
.cv-essai p{margin:0 0 1.1em}
.cv-essai .cv-essai-chapo{opacity:.75}
</style>'''
s = s.replace('</head>', css + '</head>', 1)
open(P, 'w').write(s); print('argumentaire ajouté |', len(r['cards']), 'cartes dans Gains')
