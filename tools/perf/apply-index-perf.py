# Applique les optimisations de performance à index.html (idempotent : sans effet si déjà appliquées).
import re
p='/home/user/cv-mathieu_comtesse/index.html'; s=open(p).read()
def rep(a,b):
    global s
    if b in s: return
    assert a in s, a[:70]
    s=s.replace(a,b,1)
rep('<head>','<head><script src="refonte/frame-bus.js"></script>')
# 1. réécriture assets/ : seulement hors production
a=s.index("const cvNativeFetch=globalThis.fetch.bind(globalThis);")
b=s.index("const errors=[];\nconst state=window.__cvTransfer")
if "if(location.origin!==base.slice(0,-1)){" not in s:
    s=s[:a]+"/* Réécriture des chemins assets/ : utile seulement hors de https://comtesse.me (file:, aperçu, autre hôte) ; en production elle ne change rien et coûtait un détour par fetch et par chaque affectation de src. */\nif(location.origin!==base.slice(0,-1)){\n"+s[a:b]+"}\n"+s[b:]
# 2. frise
if "const wake=()=>" not in s:
    i=s.index("if(timeline&&rail){let value=0,last=performance.now();const animate=now=>{")
    j=s.index("requestAnimationFrame(animate);}\n",i)+len("requestAnimationFrame(animate);}\n")
    s=s[:i]+"""if(timeline&&rail){let value=0,last=performance.now(),height=timeline.offsetHeight,seen=false,running=false;
  /* la frise ne s'anime que lorsqu'elle est proche de l'écran ; sa hauteur est mise en cache (plus de mise en page forcée à chaque image) */
  const animate=now=>{if(!seen||document.hidden){running=false;return;}requestAnimationFrame(animate);const top=(window.__cvLayoutTop?window.__cvLayoutTop(timeline):timeline.getBoundingClientRect().top+scrollY)-scrollY,target=Math.max(0,Math.min(1,(innerHeight*.6-top)/Math.max(1,height))),dt=Math.min(.1,(now-last)/1000);last=now;value+=(target-value)*(1-Math.exp(-8*dt));if(line)line.style.transform='scaleY('+value+')';if(dot){dot.style.top=(value*100)+'%';dot.style.transform='none';}};
  const wake=()=>{if(seen&&!running&&!document.hidden){running=true;last=performance.now();requestAnimationFrame(animate);}};
  if('ResizeObserver'in window)new ResizeObserver(()=>{height=timeline.offsetHeight;}).observe(timeline);
  if('IntersectionObserver'in window)new IntersectionObserver(e=>{seen=e[e.length-1].isIntersecting;wake();},{rootMargin:'300px 0px'}).observe(timeline);else{seen=true;}
  document.addEventListener('visibilitychange',wake);wake();}
"""+s[j:]
# 3. renderer des machines
rep("new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);","new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);   /* pas de preserveDrawingBuffer : la copie vers le canvas 2D suit le rendu dans la même tâche */\n  ")
rep("function frame(time){requestAnimationFrame(frame);if(document.hidden)return;last=time;for(const item of active){","let skip=0;function frame(time){requestAnimationFrame(frame);if(document.hidden)return;const Q=window.__cvBus?window.__cvBus.quality:1;if(Q<=.5&&(skip^=1))return;last=time;for(const item of active){")
rep("const w=Math.min(cvLowEnd?560:900,Math.max(320,Math.round(item.host.clientWidth)))","const w=Math.min(Math.round((cvLowEnd?560:900)*Q),Math.max(Math.round(320*Q),Math.round(item.host.clientWidth)))")
# 4. extraction des deux grands scripts vers des fichiers (même ordre, même exécution synchrone)
rx=re.compile(r'<script>(const cvNativeImports=\{\};.*?|const cvGraphModule=URL\.createObjectURL.*?)</script>',re.S)
for name,start in (('boot-native','const cvNativeImports={};'),('boot-graph','const cvGraphModule=URL.createObjectURL')):
    if f'refonte/{name}.js' in s: continue
    i=s.index('<script>'+start); m=re.compile(r'<script>(.*?)</script>',re.S).match(s,i)
    open(f'/home/user/cv-mathieu_comtesse/refonte/{name}.js','w').write(m.group(1))
    s=s[:m.start()]+f'<script src="refonte/{name}.js?v=perf1"></script>'+s[m.end():]
open(p,'w').write(s); print(len(s))
