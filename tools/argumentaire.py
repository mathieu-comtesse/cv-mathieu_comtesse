"""Argumentaire « De l'innovation dans les bureaux », placé dans le chapitre Gains, après le tableau des gains.
Ton : professionnel et ironique, à la manière d'un moraliste politique (maximes, antithèses), en français courant.
Chiffres repris du site : 3 200 à 4 000 h par an, 104,74 € de l'heure.
Usage : python3 -I tools/argumentaire.py index.html"""
import sys, json, html
P = sys.argv[1]; s = open(P).read()
assert 'cv-argumentaire' not in s, 'déjà appliqué'
TITRE = 'De l’innovation dans les bureaux'
CHAPO = 'Quelques remarques sur la manière dont une organisation accueille les outils qui lui rendent du temps.'
PARAS = [
 ('On dit que ce n’est pas de l’innovation.',
  'J’ai souvent entendu que ces outils ne relèvent pas de l’innovation, puisqu’ils sont numériques. L’argument est singulier. Il suppose qu’une chose n’est nouvelle que si elle se touche, et qu’une heure gagnée devant un écran vaut moins qu’une heure gagnée dans un atelier. Une organisation qui raisonne ainsi ne refuse pas l’innovation : elle refuse seulement de la reconnaître quand elle ne fait pas de bruit.'),
 ('On demande s’ils dureront.',
  'On s’inquiète ensuite de leur pérennité, et l’inquiétude est légitime. Je remarque seulement qu’on la réserve aux outils nouveaux. Le tableur que plus personne ne comprend, la procédure que chacun contourne, le dossier partagé où l’on ne retrouve rien durent depuis des années sans que nul ne s’en alarme. La durée n’est donc pas ce qu’on exige d’un outil ; c’est ce qu’on accorde volontiers à l’habitude. C’est pourquoi ces outils reposent sur des logiciels courants, Excel, SharePoint, Power Automate, que d’autres sauront reprendre.'),
 ('On ne voit pas la masse documentaire.',
  'Dans le secteur tertiaire, le document est partout, et c’est précisément pour cela qu’on ne le voit plus. Rapports, plans de prévention, comptes rendus, relevés : chacun en traite un peu, personne n’en mesure le total. Le temps qu’ils consomment se disperse en mille petites tâches, si bien qu’il n’apparaît jamais nulle part en entier. On ne combat pas un mal qu’on ne voit pas ; on commence par le compter. Ici, le compte donne de 3 200 à 4 000 heures par an.'),
 ('On résiste au changement.',
  'La résistance au changement n’est presque jamais une opposition déclarée. Elle prend la forme plus douce de la prudence, du calendrier, de la réunion suivante. Chacun tient moins à sa méthode qu’à la tranquillité qu’elle lui procure, et l’on préfère souvent une peine connue à un soulagement qu’il faudrait apprendre. Je n’en fais reproche à personne : c’est la pente naturelle de toute organisation. Mais un outil qui ne demande aucun effort à ceux qu’il soulage a plus de chances de durer qu’un outil qui a simplement raison.'),
 ('Le mot importe peu.',
  'On peut discuter longtemps du nom qu’il convient de donner à ces outils. Les heures qu’ils rendent ne se discutent pas : elles se comptent, et chacune vaut 104,74 €.'),
]
e = lambda t: html.escape(t, quote=False)
corps = ''.join('<p><strong>%s</strong> %s</p>' % (e(a), e(b)) for a, b in PARAS)
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
.cv-essai p strong{display:block;margin:0 0 .35em;font-weight:500}
.cv-essai .cv-essai-chapo{opacity:.75}
</style>'''
s = s.replace('</head>', css + '</head>', 1)
open(P, 'w').write(s); print('argumentaire ajouté |', len(r['cards']), 'cartes dans Gains')
