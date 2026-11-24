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
 'Ces outils ne sont pas nés d’un dessein conçu loin du travail. Ils répondent à la demande de ceux qui les emploient, qui en ont exprimé le besoin et en demeurent le véritable moteur. Ce qu’ils y trouvent dépasse le temps rendu : une productivité et des performances accrues, des conditions de travail allégées, et un confort qui s’étend au-delà des heures de bureau. Surtout, ces outils leur ouvrent un champ de possibles qu’ils s’interdisaient eux-mêmes, non faute d’idées, mais parce que les compétences techniques, les moyens et le temps leur manquaient pour les mettre en œuvre. Ces obstacles levés, ce qui passait pour irréalisable devient une simple affaire d’usage.',
 'On s’interroge alors sur leur durée, et la question est légitime. J’observe seulement qu’on la pose de préférence à ce qui est nouveau. Les usages anciens, même devenus obscurs ou incommodes, jouissent d’une présomption de solidité que leur ancienneté suffit à leur conférer, tandis que l’outil récent doit établir d’avance qu’il survivra à celui qui l’a conçu. Il est juste qu’il l’établisse, et c’est pourquoi ceux-ci reposent sur des logiciels courants, Excel, SharePoint, Power Automate, Power BI, que d’autres sauront reprendre après moi.',
 'La résistance que rencontrent ces outils ne vient donc pas de ceux qui s’en servent ; elle se situe plutôt au niveau où l’on décide, et où la conviction tarde davantage à se former. Il serait injuste d’y voir de la défiance. Ceux qui dirigent ne vivent pas chaque jour la masse documentaire qu’ils administrent, et ils jugent un outil selon des critères légitimes, mais plus éloignés du travail ordinaire. Il en résulte un écart que l’on retrouve dans bien des organisations : le besoin s’exprime d’un côté, la décision se prend de l’autre, et l’un et l’autre ne parlent pas tout à fait la même langue.',
 'Aussi la démonstration la plus utile n’est-elle pas d’ordre technique. La direction raisonne en indicateurs, et l’on aurait tort de le lui reprocher : c’est par eux qu’elle voit ce qu’elle ne peut observer elle-même. Ce que les équipes constatent dans leur travail doit donc lui parvenir sous cette forme, en indicateurs de performance définis avec elle, suivis dans la durée et assez simples pour se lire sans commentaire : heures rendues, délais tenus, documents traités, écarts relevés. Les tableaux de bord que produisent ces mêmes outils s’y prêtent naturellement. Lorsque le besoin exprimé d’un côté et la mesure attendue de l’autre se rencontrent enfin dans les mêmes chiffres, ce qu’on hésitait à nommer innovation n’a plus besoin de nom, parce que personne, à aucun niveau, ne saurait plus s’en passer.',
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
