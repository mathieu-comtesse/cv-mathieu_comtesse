#!/usr/bin/env python3
"""Génère refonte/index.html à partir du contenu réel des pages du site (aucun texte réécrit à la main).
   usage : python3 refonte/build.py      (puis servir le dépôt en HTTP : python3 -m http.server)"""
import re, html, json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def read(f): return open(os.path.join(ROOT, f), encoding='utf-8').read()
def txt(s): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
def esc(s): return html.escape(s, quote=False)
def L(page): return '../' + page   # lien vers le site existant (réécrit en URL absolue pour l'artifact)

# ---------- extraction ----------
comp = read('competences.html'); parc = read('parcours.html'); perso = read('projets-perso.html'); proj = read('projets.html'); auto = read('automatisations.html')
def between(s, a, b=None):
    i = s.index(a); j = s.index(b, i + len(a)) if b else len(s); return s[i:j]
sav = between(comp, 'language-list--savoirs', 'id="savoir-faire"')
SAVOIRS = [(txt(h), txt(p)) for h, p in re.findall(r'<details><summary><h4>(.*?)</h4>.*?</summary><p>(.*?)</p>', sav, re.S)]
def skills(seg):
    out = []
    for d in re.findall(r'<details class="skill fold">(.*?)</details>', seg, re.S):
        g = lambda pat: (re.search(pat, d, re.S) or [None, ''])[1]
        gain = re.search(r'<span class="fold-gain[^"]*"><b>(.*?)</b>(.*?)</span>', d, re.S)
        out.append(dict(kicker=txt(g(r'skill-kicker">(.*?)</span>')), title=txt(g(r'<h3>(.*?)</h3>')), glabel=txt(gain[1]) if gain else '', gain=txt(gain[2]) if gain else '',
                        level=txt(g(r'class="skill-level">(.*?)</p>')), desc=txt(g(r'<div class="fold-body">.*?</p>.*?<p>(.*?)</p>')), proof=txt(g(r'class="skill-proof">(.*?)</p>')), link=g(r'<a href="([^"]+)">')))
    return out
SF_MQSE = skills(between(comp, 'id="savoir-faire-mqse"', 'id="savoir-faire-numerique"'))
SF_NUM = skills(between(comp, 'id="savoir-faire-numerique"', 'id="langages"'))
lang = between(comp, 'id="langages"', 'id="savoir-etre"')
LANGAGES = [(txt(h), txt(p)) for h, p in re.findall(r'<h4>(.*?)</h4>\s*<p>(.*?)</p>', lang, re.S)]
se = between(comp, 'id="savoir-etre"')
SAVOIR_ETRE = [(txt(h), txt(p)) for h, p in re.findall(r'<details><summary><h4>(.*?)</h4>.*?</summary><p>(.*?)</p>', se, re.S)]
TIMELINE = [(txt(d), txt(h), txt(p)) for d, h, p in re.findall(r'<div class="timeline-item">\s*<span class="date">(.*?)</span>\s*<h4>(.*?)</h4>\s*<p>(.*?)</p>', parc, re.S)]
PERSO = [(h, txt(k), txt(t), txt(p)) for h, k, t, p in re.findall(r'<a class="theme-card" href="([^"]+)">\s*<span class="card-index">(.*?)</span>\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>', perso, re.S)]
PROJETS = [(h, txt(n), txt(g), txt(t), txt(p)) for h, n, g, t, p in re.findall(r'<a class="theme-card" href="([^"]+)">\s*<span class="card-index">([^<]*)</span><span class="card-gain">([^<]*)</span>\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>', proj, re.S) if h.startswith('projet-')]
SHORT = {'projet-studio.html': 'Studio d’extracteurs PDF', 'projet-charte.html': 'Interface commune', 'projet-1.html': 'CERFA v3', 'projet-vre.html': 'Extracteur VRE', 'projet-2.html': 'Retrouver tout le suivi', 'projet-3.html': 'PP & MOSO', 'projet-4.html': 'Portail Power BI', 'projet-5.html': 'Dialogue terrain', 'projet-gares.html': 'Gares prioritaires'}
IMG = {'projet-studio.html': 'p-studio', 'projet-charte.html': 'p-charte', 'projet-1.html': 'p-cerfa', 'projet-vre.html': 'p-vre', 'projet-2.html': 'p-suivi', 'projet-3.html': 'p-ppmoso', 'projet-4.html': 'p-powerbi', 'projet-5.html': 'p-dialogue', 'projet-gares.html': 'p-gares'}
ORDER = ['projet-gares.html', 'projet-4.html', 'projet-3.html', 'projet-vre.html', 'projet-1.html', 'projet-studio.html', 'projet-charte.html', 'projet-2.html', 'projet-5.html']
PROJETS.sort(key=lambda r: ORDER.index(r[0]))
def flux(id_):
    a = between(auto, f'<article id="{id_}"', '</article>')
    return dict(title=txt(re.search(r'<h3>(.*?)</h3>', a, re.S)[1]), text=txt(re.search(r'<h3>.*?</h3>\s*<p>(.*?)</p>', a, re.S)[1]), gain=txt(re.search(r'class="case-gain"><span>(.*?)</span>(.*?)</p>', a, re.S)[2]))
FLUX = [flux(i) for i in ('flux-alertes', 'flux-mails', 'flux-relances', 'flux-vigilance')]
assert len(SAVOIRS) == 8 and len(SF_MQSE) + len(SF_NUM) >= 10 and len(SAVOIR_ETRE) == 12 and len(TIMELINE) == 5 and len(PERSO) >= 10 and len(PROJETS) == 9 and len(LANGAGES) == 4, (len(SAVOIRS), len(SF_MQSE), len(SF_NUM), len(SAVOIR_ETRE), len(TIMELINE), len(PERSO), len(PROJETS), len(LANGAGES))

# ---------- rendu ----------
def a(href, inner, cls='', extra=''): return f'<a{" class=%s" % chr(34)+cls+chr(34) if cls else ""} href="{href}"{extra}>{inner}</a>'
def section_label(left, right): return f'<div class="section-label"><span>{esc(left)}</span><span>{esc(right)}</span></div>'

NAV = [('profil', 'Profil'), ('competences', 'Compétences'), ('projets', 'Projets'), ('automatisations', 'Power Automate'), ('methode', 'Lean & Six Sigma'), ('parcours', 'Parcours'), ('perso', 'Projets perso'), ('universitaires', 'Universitaires'), ('contact', 'Contact')]
nav = ''.join(f'<a href="#{i}">{esc(n)}</a>' for i, n in NAV)

def skill_tile(s):
    proof = f'<p class="proof">{esc(s["proof"])}</p>' if s['proof'] else ''
    link = f'<a class="more" href="{L(s["link"])}">Voir le détail ↗</a>' if s['link'] else ''
    return (f'<details class="tile"><summary><span class="kick">{esc(s["kicker"])}</span><h4>{esc(s["title"])}</h4>'
            f'<span class="gain"><b>{esc(s["glabel"])}</b>{esc(s["gain"])}</span></summary>'
            f'<div class="body"><p class="lvl">{esc(s["level"])}</p><p>{esc(s["desc"])}</p>{proof}{link}</div></details>')
def plain_tile(h, p): return f'<div class="tile tile--plain"><h4>{esc(h)}</h4><p>{esc(p)}</p></div>'

HEAD_NUMS = [('≈ 50 000 €', 'de pénalités de retard chiffrées sur le parc (CERFA v3)'), ('≈ 15 700 € / an', 'de contrôles quotidiens rendus par Power Automate'), ('3–5 min → 10 s', 'pour retrouver un plan, son PDF et son échéance'), ('16', 'arbitrages obtenus en réunion d’agence')]

parts = []
parts.append(f'''<header class="rf-bar"><a class="site-name" href="#top">Mathieu Comtesse</a><nav aria-label="Navigation principale" id="rf-nav">{nav}</nav><span class="rf-tag">Proposition · non publiée</span></header>''')
parts.append('<main id="contenu"><span id="top"></span>')

# HERO
parts.append('''<header class="rf-hero wrap">
 <p class="rf-intro"><span>M2 MQSE · Sorbonne Paris Nord</span><span class="dots" aria-hidden="true"></span><span>Alternance · SNCF Gares &amp; Connexions</span></p>
 <div class="rf-hero-grid"><div>
   <h1 class="rf-h1">Prévenir, vérifier, maintenir. Du terrain à la <span class="rf-flip" data-flip="conformité."></span></h1>
   <div class="hero-links"><a href="#projets">Voir les projets</a><a href="#contact">Me contacter</a></div>
   <p class="hero-meta">Yellow Belt Lean Six Sigma · ISO 9001 / 45001 / 14001 / 27001 · Power BI · Power Automate · Extraction PDF</p></div>
  <div class="rf-stream" data-prefix="Mon métier" data-items="Prévenir|Vérifier|Maintenir|Automatiser|Tracer|Décider" role="img" aria-label="Prévenir, vérifier, maintenir, automatiser, tracer, décider"></div></div>
</header>''')

# PROFIL
parts.append(f'''<section class="band band--white" id="profil"><div class="wrap">
 {section_label('01 / Profil', 'Le terrain comme point de départ')}
 <div class="rf-two"><div><h2 class="rf-h2">De l’exigence métier à l’outil qui perdure.</h2>
  <p class="lead">Mon profil associe la Maintenance, la Qualité, la Sécurité et l’Environnement (MQSE) au développement d’outils numériques. En M2 MQSE et en alternance chez SNCF Gares &amp; Connexions, je relie les exigences de prévention aux usages concrets des équipes.</p>
  <p>Cette double compétence me permet de comprendre un problème métier, de le traduire en règles et en données, puis de construire l’outil qui aide à le résoudre : extracteur PDF, automatisation ou tableau de bord.</p></div>
  <dl class="rf-facts"><div><dt>Formation</dt><dd>M2 MQSE · Yellow Belt Lean Six Sigma Sorbonne Paris Nord · certification validée</dd></div><div><dt>Entreprise</dt><dd>SNCF Gares &amp; Connexions ABE SUD Île-de-France</dd></div><div><dt>Référentiels</dt><dd>ISO 9001 / 45001 / 14001 / 27001, qualité, sécurité, environnement &amp; sécurité de l’information</dd></div><div><dt>Pratique</dt><dd>Data &amp; extraction PDF · applications web &amp; automatisation</dd></div></dl></div>
 <div class="rf-split" data-split>
  <a class="card" href="#competences" data-tab="mqse"><span class="icon" aria-hidden="true">01</span><h3>Prévention &amp; MQSE</h3><p>Co-activité, plans de prévention, audit, habilitations, ISO 45001.</p><span class="tag">Qualité · Sécurité</span></a>
  <a class="card" href="#competences" data-tab="num"><span class="icon" aria-hidden="true">02</span><h3>Numérique &amp; data</h3><p>Extraction PDF, Power Automate, Power BI, interfaces HTML.</p><span class="tag">Outils métier</span></a>
 </div>
 <div class="rf-benefits"><div><h4>Du temps libéré</h4><p>Moins de lecture répétitive, de ressaisie et de manipulations entre outils.</p></div><div><h4>Une visibilité accrue</h4><p>Des données réunies, des anomalies révélées et des priorités plus lisibles.</p></div><div><h4>Des équipes plus efficaces</h4><p>Davantage de temps pour vérifier les points sensibles, décider et agir sur le terrain.</p></div></div>
</div></section>''')

# COMPETENCES
nums = ''.join(f'<div class="stat"><b>{esc(n)}</b><span>{esc(t)}</span></div>' for n, t in HEAD_NUMS)
parts.append(f'''<section class="band band--ink" id="competences"><div class="wrap">
 {section_label('02 / Compétences', 'Du besoin métier à l’outil')}
 <h2 class="rf-h2">Comprendre les exigences. <em>Construire les solutions.</em></h2>
 <p class="lead">Savoirs, savoir-faire et savoir-être, illustrés par des réalisations et des gains mesurés. Cliquer sur une compétence pour le détail.</p>
 <div class="rf-stats">{nums}</div>
 <div class="rf-tabs" role="tablist" aria-label="Familles de compétences"><button role="tab" id="t-sav" aria-selected="true" aria-controls="c-sav">Savoirs</button><button role="tab" id="t-mqse" aria-selected="false" aria-controls="c-mqse">Savoir-faire MQSE</button><button role="tab" id="t-num" aria-selected="false" aria-controls="c-num">Savoir-faire numérique</button><button role="tab" id="t-lang" aria-selected="false" aria-controls="c-lang">Langages</button><button role="tab" id="t-etre" aria-selected="false" aria-controls="c-etre">Savoir-être</button></div>
 <div class="rf-panel" id="c-sav" role="tabpanel" aria-labelledby="t-sav"><div class="tiles">{''.join(plain_tile(h, p) for h, p in SAVOIRS)}</div></div>
 <div class="rf-panel" id="c-mqse" role="tabpanel" aria-labelledby="t-mqse" hidden><div class="tiles">{''.join(skill_tile(s) for s in SF_MQSE)}</div></div>
 <div class="rf-panel" id="c-num" role="tabpanel" aria-labelledby="t-num" hidden><div class="tiles">{''.join(skill_tile(s) for s in SF_NUM)}</div></div>
 <div class="rf-panel" id="c-lang" role="tabpanel" aria-labelledby="t-lang" hidden><div class="tiles tiles--lang">{''.join(plain_tile(h, p) for h, p in LANGAGES)}</div></div>
 <div class="rf-panel" id="c-etre" role="tabpanel" aria-labelledby="t-etre" hidden><div class="tiles">{''.join(plain_tile(h, p) for h, p in SAVOIR_ETRE)}</div></div>
 <p class="rf-more">{a(L('acces-habilitations.html'), 'Compétence dédiée : suivi des accès et habilitations ↗')}</p>
</div></section>''')

# PROJETS : marquee + hover
def pshort(h): return SHORT[h]
marq = ''.join(f'<a class="m-item" href="{L(h)}"><img src="img/{IMG[h]}.jpg" alt="" width="640" height="400" loading="lazy" draggable="false"><span><b>{n}</b> {esc(pshort(h).replace("&amp;","&"))}</span></a>' for h, n, g, t, p in PROJETS)
rows = ''.join(f'<a class="rf-project" href="{L(h)}"><span class="n">{n}</span><h3>{esc(pshort(h))}</h3><p>{esc(g)}</p></a>' for h, n, g, t, p in PROJETS)
thumbs = ''.join(f'<div><img src="img/{IMG[h]}.jpg" alt="" width="640" height="400"></div>' for h, n, g, t, p in PROJETS)
parts.append(f'''<section class="band band--white" id="projets"><div class="wrap">
 {section_label('03 / Projets', 'Applications métier et démonstrations')}
 <h2 class="rf-h2">Neuf outils, des gains mesurés.</h2>
</div>
 <div class="rf-marquee" id="rf-marquee" tabindex="0" role="region" aria-label="Aperçus des projets. Glisser ou utiliser les flèches gauche et droite."><div class="rf-mtrack">{marq}</div></div>
 <div class="wrap"><div class="rf-hover" id="rf-hover"><div class="rf-projects">{rows}</div><div class="rf-thumbs" aria-hidden="true">{thumbs}</div></div>
 <p class="rf-more">{a(L('projets.html#gains'), 'Tous les gains, projet par projet ↗')}</p></div>
</section>''')

# POWER AUTOMATE
fx_cards = ''.join(f'<article class="fx"><span class="n">0{i + 2}</span><h3>{esc(f["title"])}</h3><p>{esc(f["text"])}</p><p class="g"><b>Gain</b>{esc(f["gain"])}</p></article>' for i, f in enumerate(FLUX))
parts.append(f'''<section class="band band--sage" id="automatisations"><div class="wrap">
 {section_label('04 / Power Automate', 'Des flux au service des équipes')}
 <h2 class="rf-h2">Automatiser le suivi. <em>Libérer du temps pour agir.</em></h2>
 <p class="lead">Classements, mises à jour, confirmations et relances : moins de manipulations, un suivi plus visible.</p>
 <article class="fx fx--hero"><figure><img src="img/p-ppchain.jpg" alt="Journal de la machine virtuelle et flux Power Automate, données fictives" width="640" height="400" loading="lazy"><figcaption>Chaîne PP · données fictives</figcaption></figure>
  <div><span class="n">01</span><h3>PP : une machine virtuelle reliée au cloud</h3><p>Une machine virtuelle surveille le dépôt des plans de prévention, lit les PDF et transmet les résultats aux flux Power Automate. La chaîne est auto-apprenante : quand une personne corrige un classement dans le suivi Excel, la correction devient une règle appliquée aux plans suivants.</p><p class="g"><b>Gain</b>Environ 10 minutes par plan de prévention rendues à l’équipe, sur plusieurs centaines de plans par an.</p></div></article>
 <div class="fx-grid">{fx_cards}</div>
 <p class="rf-more">{a(L('automatisations.html'), 'Voir les cinq flux en détail ↗')}</p>
</div></section>''')

# LEAN & SIX SIGMA
parts.append(f'''<section class="band band--white" id="methode"><div class="wrap">
 {section_label('05 / Lean & Six Sigma', 'Comprendre les écarts, améliorer les pratiques')}
 <h2 class="rf-h2">La qualité comme méthode. <em>Le terrain comme repère.</em></h2>
 <p class="lead">Yellow Belt Lean Six Sigma validé. Deux approches complémentaires que je pratique séparément : le Lean pour fluidifier le travail, le Six Sigma pour le fiabiliser. Prochaine étape visée : Green Belt.</p>
 <div class="rf-split rf-split--tall" data-split>
  <a class="card" href="{L('methode.html#lean')}"><span class="icon" aria-hidden="true">Lean · le flux</span><h3>Où le temps et l’effort se perdent-ils ?</h3>
   <dl><dt>Cible</dt><dd>Les gaspillages : gestes inutiles, ressaisies, recherches, attentes, dossiers dispersés.</dd><dt>Démarche</dt><dd>Aller voir sur place (gemba), cartographier le flux (VSM), supprimer, puis standardiser (5S, rapport A3, PDCA).</dd><dt>Mesure</dt><dd>Temps de traitement, délai, nombre de gestes et d’outils.</dd></dl><span class="tag">Gemba walk · VSM · 5S · A3 · PDCA</span></a>
  <a class="card" href="{L('methode.html#six-sigma')}"><span class="icon" aria-hidden="true">Six Sigma · la fiabilité</span><h3>Où le résultat varie-t-il, ou se trompe-t-il ?</h3>
   <dl><dt>Cible</dt><dd>Les défauts et la variabilité : erreurs, oublis, écarts non vus, délais très différents d’un cas à l’autre.</dd><dt>Démarche</dt><dd>DMAIC : définir le besoin, mesurer l’état initial, analyser les causes (Pareto, Ishikawa), améliorer, puis maîtriser dans la durée.</dd><dt>Mesure</dt><dd>Écarts et non-conformités détectés, oublis, délai avant qu’un écart soit vu.</dd></dl><span class="tag">DMAIC · SIPOC · QQOQCP · Ishikawa · Pareto · KPI</span></a>
 </div>
 <p class="rf-more">{a(L('methode.html'), 'Les projets Lean et Six Sigma, un par un ↗')}</p>
</div></section>''')

# PARCOURS
tl = ''.join(f'<li><span class="date">{esc(d)}</span><h4>{esc(h)}</h4><p>{esc(p)}</p></li>' for d, h, p in TIMELINE)
parts.append(f'''<section class="band band--white" id="parcours"><div class="wrap">
 {section_label('06 / Parcours', 'Apprendre en construisant')}
 <h2 class="rf-h2">De la donnée à l’usage <em>terrain.</em></h2>
 <ol class="rf-timeline">{tl}</ol>
 <p class="rf-more">{a(L('atlas.html'), 'Ouvrir l’Atlas du parcours : l’île en origami ↗')}</p>
</div></section>''')

# PROJETS PERSO : galerie WebGL
GAL = [('Atlas', 'g-atlas'), ('Labyrinthe', 'g-labyrinthe'), ('Route & vigilance', 'g-route'), ('Arène', 'g-arene'), ('Abysses', 'g-abysses'), ('Timber', 'g-timber'), ('Rubik', 'g-rubik'), ('Sandboard', 'g-sandboard'), ('Gouache', 'g-gouache'), ('Talas', 'g-talas')]
gal_json = json.dumps([[n, f'img/{f}.jpg', 2026] for n, f in GAL], ensure_ascii=False)
plinks = ''.join(f'<li><a href="{L(h)}"><b>{esc(t.split(" · ")[0].split(" : ")[0])}</b><span>{esc(k.split("/")[-1].strip())}</span></a></li>' for h, k, t, p in PERSO)
parts.append(f'''<section class="band band--ink" id="perso"><div class="wrap">
 {section_label('Projets perso', 'Expériences interactives')}
 <h2 class="rf-h2">Dessiner, explorer et <em>jouer.</em></h2>
 <div class="rf-gallery" id="rf-gallery" data-items='{html.escape(gal_json, quote=True)}' aria-label="Galerie des projets personnels, grille à explorer à la souris ou au doigt"><span class="rf-hint" aria-hidden="true">glisser pour explorer</span></div>
 <ul class="rf-plinks">{plinks}</ul>
</div></section>''')

# UNIVERSITAIRES
u = [h for h in re.findall(r'<a class="theme-card" href="([^"]+)">', read('projets-universitaires.html'))][0]
ut = txt(re.search(r'<h3>(.*?)</h3>\s*<p>(.*?)</p>', read('projets-universitaires.html'), re.S)[1]); up = txt(re.search(r'<h3>(.*?)</h3>\s*<p>(.*?)</p>', read('projets-universitaires.html'), re.S)[2])
parts.append(f'''<section class="band band--white" id="universitaires"><div class="wrap">
 {section_label('Formation', 'Réalisés dans le cadre de ma formation')}
 <h2 class="rf-h2">Projets <em>universitaires.</em></h2>
 <a class="rf-uni" href="{L(u)}"><img src="img/g-talas.jpg" alt="" width="640" height="400" loading="lazy"><div><span class="kick">01 / Jeu sérieux</span><h3>{esc(ut)}</h3><p>{esc(up)}</p><span class="more">Jouer ↗</span></div></a>
</div></section>''')

# CONTACT
parts.append('''<section class="band band--pink" id="contact"><div class="wrap">
 <div class="section-label"><span>07 / Contact</span><span>Un recrutement, un besoin, un projet</span></div>
 <h2 class="rf-h2 rf-big">Et si l’on faisait un bout de chemin ?</h2>
 <p class="lead">Un recrutement, un besoin d’automatisation ou un projet à clarifier : discutons-en.</p>
 <p class="rf-mail"><a href="mailto:mathieu@comtesse.me">mathieu@comtesse.me</a></p>
</div></section>''')
parts.append('</main>')
parts.append('<footer class="site-footer"><span>© 2026 Mathieu Comtesse · Qualité · Sécurité · Numérique</span><a href="#top">Retour en haut ↑</a></footer>')

page = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Refonte · proposition · Mathieu Comtesse</title>
<meta name="robots" content="noindex">
<script>(()=>{{const r=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');let s='auto';try{{const v=localStorage.getItem('cv-theme');if(['auto','light','dark'].includes(v))s=v}}catch(_){{}}r.dataset.theme=s==='auto'?(m.matches?'dark':'light'):s}})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400;500&family=JetBrains+Mono:wght@300;400;700&family=VT323&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="refonte.css">
</head><body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
{chr(10).join(parts)}
<script src="refonte.js"></script>
</body></html>
'''
open(os.path.join(ROOT, 'refonte', 'index.html'), 'w', encoding='utf-8').write(page)
print('ok', len(page), 'octets;', len(SF_MQSE), '+', len(SF_NUM), 'savoir-faire;', len(PERSO), 'projets perso')
