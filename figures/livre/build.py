"""Construit figures-livre/NN.html : les 8 figures d'origine (archive WattsElse) habillées avec la DA, sans toucher à leur SVG ni à leurs animations.
Usage : python3 figures/livre/build.py <dossier des figures extraites de l'archive>"""
import re,sys,os
SRC=sys.argv[1]; HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'..','..','figures-livre')
css=open(os.path.join(HERE,'da-livre.css'),encoding='utf8').read()
sys.path.insert(0,HERE)
from allegories import CONFIG
lib=open(os.path.join(HERE,'allegory-lib.js'),encoding='utf8').read()
RESIZE="""<script>(function(){var send=function(){try{parent.postMessage({livreHeight:Math.ceil(document.documentElement.scrollHeight),src:location.pathname.split('/').pop()},'*')}catch(e){}};addEventListener('load',send);addEventListener('resize',send);if(window.ResizeObserver)new ResizeObserver(send).observe(document.body);setTimeout(send,400);setTimeout(send,1500)})()</script>"""
for f in sorted(os.listdir(SRC)):
    m=re.match(r'(\d+)_figure_animee\.html',f)
    if not m: continue
    s=open(os.path.join(SRC,f),encoding='utf8').read()
    s=s.replace('<body class="iso" data-theme="dark">','<body class="iso" data-theme="light">',1)
    cfg='<script>'+lib+'\n(function(){const A=window.ALLEGORY;'+CONFIG[m.group(1)]+'})()</script>'
    s=s.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="color-scheme" content="light only">',1)
    s=s.replace('</head>','<style id="da-livre">'+css+'</style></head>',1)
    i=s.rfind('</body>'); s=s[:i]+cfg+RESIZE+s[i:]
    open(os.path.join(OUT,m.group(1)+'.html'),'w',encoding='utf8').write(s)
    print(m.group(1),len(s))
