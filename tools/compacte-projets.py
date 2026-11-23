"""Fiches de projets compactes, comme les cadres de la référence : en-tête (rubrique, titre, sous-titre, l'idée), chiffres clés,
image de la machine et ses boutons restent visibles ; « L'objet en action » et tout le corps passent dans un bloc « Voir le détail » (details natif).
Usage : python3 -I tools/compacte-projets.py index.html  (refuse de repasser sur une page déjà compactée)."""
import re, sys
P = sys.argv[1]; s = open(P).read()
assert 'cv-pf-detail' not in s, 'déjà compacté'
TAG = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(/?)>', re.S); VIDES = {'img', 'br', 'input', 'source', 'hr', 'wbr', 'meta', 'link'}
def fin(t, i):
    p = 0
    for m in TAG.finditer(t, i):
        if m.group(2).lower() in VIDES or m.group(3): continue
        p += -1 if m.group(1) else 1
        if p == 0: return m.end()
n = 0
for h in re.findall(r'<article id="(cv-7-\d+-[a-z0-9-]+)"', s):
    i = s.index('<article id="%s"' % h); j = fin(s, i); a = s[i:j]
    # 1. « L'objet en action » sort de l'en-tête
    t0 = a.index('<div class="cv-pframe cv-pf-text"'); t1 = fin(a, t0); txt = a[t0:t1]
    k = txt.find('<h4>L’objet en action</h4>')
    objet = txt[k:-len('</div>')] if k >= 0 else ''
    if k >= 0: txt = txt[:k] + '</div>'
    # 2. chiffres clés tirés de « Ce que ça change »
    g = re.search(r'<dl class="cv-pf-gains">(.*?)</dl>', a, re.S)
    cles = ''
    if g:
        paires = re.findall(r'<dt>(.*?)</dt><dd>(.*?)</dd>', g.group(1), re.S)
        cles = '<dl class="cv-pf-cles">' + ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % p for p in paires[:2]) + '</dl>'
    txt = txt[:-len('</div>')] + cles + '</div>'
    a = a[:t0] + txt + a[t1:]
    # 3. corps replié
    b0 = a.index('<div class="cv-card-body">'); b1 = fin(a, b0); corps = a[b0 + len('<div class="cv-card-body">'):b1 - len('</div>')]
    bloc = ('<div class="cv-card-body"><details class="cv-pf-detail"><summary>Voir le détail</summary>'
            + ('<section class="cv-pframe cv-pf-objet">' + objet + '</section>' if objet else '') + corps + '</details></div>')
    a = a[:b0] + bloc + a[b1:]
    s = s[:i] + a + s[j:]; n += 1
assert n == 11, n
css = """<style id="cv-projets-compacts">
/* fiches de projets compactes (cadres de la référence : texte court, média, bouton) ; le détail se déplie */
.cv-pf-cles{display:flex;flex-wrap:wrap;gap:8px 32px;margin:16px 0 0}
.cv-pf-cles dt{font:300 12px/1.4 "JetBrains Mono",ui-monospace,monospace;opacity:.7}
.cv-pf-cles dd{margin:2px 0 0;font-size:24px;font-weight:500;line-height:1.15}
.cv-pf-detail>summary{display:inline-flex;align-items:center;gap:8px;list-style:none;cursor:pointer;margin:16px 0 0;padding:4px 12px;border-radius:999px;background:rgb(0 0 0/.35);font:300 12px/1.5 "JetBrains Mono",ui-monospace,monospace;color:#fff}
.cv-pf-detail>summary::-webkit-details-marker{display:none}
.cv-pf-detail>summary::after{content:"+";opacity:.8}
.cv-pf-detail[open]>summary::after{content:"−"}
.cv-pf-detail>summary:focus-visible{outline:2px solid currentColor;outline-offset:4px}
.cv-pf-detail[open]>summary{margin-bottom:24px}
</style>"""
s = s.replace('</head>', css + '</head>', 1)
js = '<script>(function(){function o(){var h=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));var d=h&&h.closest&&h.closest("details.cv-pf-detail");if(d&&!d.open){d.open=true;h.scrollIntoView();}}addEventListener("hashchange",o);if(document.readyState!=="loading")o();else addEventListener("DOMContentLoaded",o);})();</script>'
s = s.replace('</body>', js + '</body>', 1)
open(P, 'w').write(s); print('fiches compactées :', n)
