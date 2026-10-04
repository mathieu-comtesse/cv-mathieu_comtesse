/* Refonte : portage en JS natif de six composants ObsidianUI (MIT, github.com/Atharvsinh-codez/ObsidianUI), sans GSAP, three ni motion. */
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const wrap=(min,max,v)=>{const r=max-min;return ((((v-min)%r)+r)%r)+min};
const clamp=(a,b,v)=>Math.min(b,Math.max(a,v));

/* ---- FlipText : une lettre = un cube qui bascule, départ décalé par sinus ---- */
$$('.rf-flip').forEach(el=>{const text=el.dataset.flip,duration=2.2,delay=0,total=text.length;el.setAttribute('aria-label',text);
 const w=document.createElement('span');w.className='word';w.setAttribute('aria-hidden','true');
 [...text].forEach((ch,i)=>{const s=document.createElement('span');s.className='flip-char';s.dataset.char=ch;s.textContent=ch;
  s.style.setProperty('--flip-duration',duration+'s');s.style.setProperty('--flip-delay',(Math.sin(i/total*Math.PI/2)*duration*.25+delay)+'s');w.append(s)});
 el.append(w);
 if(reduce)$$('.flip-char',el).forEach(c=>{c.style.animation='none';c.style.webkitTextFillColor='currentColor';c.style.setProperty('--x','1')})});
if(reduce){const st=document.createElement('style');st.textContent='.flip-char::before,.flip-char::after{display:none}';document.head.append(st)}

/* ---- TextStream : colonne en boucle, vitesse relevée par la molette / le scroll ---- */
const ts=$('.rf-stream');
if(ts){const items=ts.dataset.items.split('|');
 ts.innerHTML='<p class="pre"></p><div class="view"><div class="track"></div></div>';$('.pre',ts).textContent=ts.dataset.prefix;
 const view=$('.view',ts),track=$('.track',ts);
 const mk=(hidden)=>{const c=document.createElement('div');c.className='copy';if(hidden)c.setAttribute('aria-hidden','true');items.forEach(t=>{const d=document.createElement('div');d.textContent=t;c.append(d)});return c};
 const first=mk(false);track.append(first);
 if(!reduce){
  const base=.6,maxBoost=12;let y=0,dist=0,vel=base,target=base,lastDir=1,timer=0,lastScroll=scrollY,last=performance.now(),visible=true;
  const measure=()=>{dist=first.offsetHeight;if(!dist||!view.offsetHeight)return;const n=Math.max(2,Math.ceil(view.offsetHeight/dist)+2);while(track.children.length<n)track.append(mk(true));while(track.children.length>n)track.lastChild.remove();y=wrap(-dist,0,y)};
  const boost=d=>{if(!d)return;const dir=d>0?-1:1,b=Math.min(maxBoost,base+Math.pow(Math.abs(d),1.2)*.08);lastDir=dir;target=dir*b;clearTimeout(timer);timer=setTimeout(()=>{target=lastDir*base},120)};
  addEventListener('wheel',e=>boost(e.deltaY),{passive:true});
  addEventListener('scroll',()=>{boost(scrollY-lastScroll);lastScroll=scrollY},{passive:true});
  new ResizeObserver(measure).observe(view);document.fonts&&document.fonts.ready.then(measure);measure();
  new IntersectionObserver(([e])=>visible=e.isIntersecting).observe(ts);
  (function tick(t){requestAnimationFrame(tick);const dt=t-last;last=t;if(!visible||!dist)return;vel+=(target-vel)*.14;y=wrap(-dist,0,y+vel*dt/(1000/60));track.style.transform=`translate3d(0,${y}px,0)`})(last)}
 else{ts.querySelector('.view').style.cssText='height:auto;-webkit-mask-image:none;mask-image:none'}}

/* ---- SplitShowcase : la carte survolée glisse de 12px, passe devant, le séparateur s'efface ---- */
$$('[data-split]').forEach(sp=>{const cards=$$('.card',sp);let h=null,f=null;
 const set=()=>{const a=h??f;sp.classList.toggle('on',a!==null);cards.forEach((c,i)=>c.classList.toggle('active',a===i))};
 cards.forEach((c,i)=>{c.addEventListener('mouseenter',()=>{h=i;set()});c.addEventListener('mouseleave',()=>{h=null;set()});c.addEventListener('focus',()=>{f=i;set()});c.addEventListener('blur',()=>{f=null;set()})})});

/* ---- DraggableMarquee : boucle continue, saisie, lancer avec friction, flèches ---- */
const mq=$('#rf-marquee');
if(mq&&!reduce){const track=$('.rf-mtrack',mq),orig=[...track.children],REPEAT=3;
 for(let r=1;r<REPEAT;r++)orig.forEach(n=>{const c=n.cloneNode(true);c.setAttribute('aria-hidden','true');c.tabIndex=-1;c.dataset.copy='1';track.append(c)});
 let period=0,x=0,throwV=0,drag=false,lastX=0,lastT=0,startX=0,moved=0,hover=false,last=performance.now();
 const SPEED=1,THROW=2.8,FRICTION=.975,MAXV=60;
 const measure=()=>{const gap=parseFloat(getComputedStyle(track).columnGap)||0;period=orig.reduce((s,n)=>s+n.getBoundingClientRect().width,0)+gap*orig.length};
 const imgs=$$('img',track);imgs.forEach(i=>i.complete||i.addEventListener('load',measure));new ResizeObserver(measure).observe(track);measure();
 track.style.paddingLeft='0';
 mq.addEventListener('pointerdown',e=>{if(e.button)return;drag=true;throwV=0;lastX=startX=e.clientX;lastT=performance.now();moved=0;mq.classList.add('drag');mq.setPointerCapture(e.pointerId)});
 mq.addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now(),dx=e.clientX-lastX,dt=now-lastT;x=wrap(-period,0,x+dx);moved=Math.max(moved,Math.abs(e.clientX-startX));
  if(dt>0)throwV=clamp(-MAXV,MAXV,dx/dt*36.67*THROW);lastX=e.clientX;lastT=now});
 const up=e=>{if(!drag)return;drag=false;mq.classList.remove('drag');try{mq.releasePointerCapture(e.pointerId)}catch(_){}};
 mq.addEventListener('pointerup',up);mq.addEventListener('pointercancel',up);
 mq.addEventListener('click',e=>{if(moved>6){e.preventDefault();e.stopPropagation()}},true);
 mq.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();x=wrap(-period,0,x+(e.key==='ArrowLeft'?1:-1)*mq.clientWidth*.35);throwV=0});
 mq.addEventListener('mouseenter',()=>hover=true);mq.addEventListener('mouseleave',()=>hover=false);
 let visible=true;new IntersectionObserver(([e])=>visible=e.isIntersecting).observe(mq);
 (function tick(t){requestAnimationFrame(tick);const f=(t-last)/(1000/60);last=t;if(!visible||!period)return;
  if(!drag){if(!hover)x-=SPEED*f;x+=throwV*f;throwV*=Math.pow(FRICTION,f);if(Math.abs(throwV)<.01)throwV=0}
  x=wrap(-period,0,x);track.style.transform=`translate3d(${x}px,0,0)`})(last)}

/* ---- HoverImg : l'aperçu suit le curseur, la bande d'images coulisse selon la ligne survolée ---- */
const hv=$('#rf-hover');
if(hv&&matchMedia('(hover:hover) and (min-width:769px)').matches){const box=$('.rf-thumbs',hv),rows=$$('.rf-project',hv),strip=$$('.rf-thumbs>div',hv);
 let tx=0,ty=0,px=0,py=0,sc=0,tsc=0,idx=0,sy=0,tsy=0,seen=false;
 box.style.transition='none';
 const h=box.offsetHeight||222;
 rows.forEach((r,i)=>{const go=()=>{idx=i;tsy=-i*100;tsc=1;if(!seen){px=tx;py=ty;sy=tsy;seen=true}};r.addEventListener('mouseenter',go);r.addEventListener('focus',()=>{go();const b=r.getBoundingClientRect();tx=b.right-260;ty=b.top+b.height/2});r.addEventListener('blur',()=>tsc=0)});
 $('.rf-projects',hv).addEventListener('mouseleave',()=>{tsc=0;seen=false});
 $('.rf-projects',hv).addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY},{passive:true});
 (function tick(){requestAnimationFrame(tick);px+=(tx-px)*.16;py+=(ty-py)*.16;sc+=(tsc-sc)*.16;sy+=(tsy-sy)*.2;
  box.style.transform=`translate(${px}px,${py}px) translate(-50%,-50%) scale(${sc.toFixed(3)})`;
  strip.forEach(s=>s.style.transform=`translateY(${sy}%)`)})()}

/* ---- ArtGallery : grille infinie, distorsion en barillet, zoom au glisser (shader repris tel quel, en WebGL direct) ---- */
const gal=$('#rf-gallery');
if(gal){
 let ITEMS=[];try{ITEMS=JSON.parse(gal.dataset.items||'[]')}catch(_){}
 const CELL=.75,ZOOM=1.25,LERP=reduce?1:.075,BG=[0,0,0],BORDER=[1,1,1,.15];
 const VS='attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
 const FS=`precision highp float;uniform vec2 uOffset;uniform vec2 uResolution;uniform vec4 uBorderColor;uniform vec3 uBg;uniform vec2 uMousePos;uniform float uZoom;uniform float uCellSize;uniform float uTextureCount;uniform sampler2D uImageAtlas;uniform sampler2D uTextAtlas;varying vec2 vUv;
 void main(){vec2 screenUV=(vUv-.5)*2.;float radius=length(screenUV);float distortion=1.-.08*radius*radius;vec2 distortedUV=screenUV*distortion;vec2 aspect=vec2(uResolution.x/uResolution.y,1.);vec2 worldCoord=distortedUV*aspect;worldCoord*=uZoom;worldCoord+=uOffset;
 vec2 cellPos=worldCoord/uCellSize;vec2 cellId=floor(cellPos);vec2 cellUV=fract(cellPos);
 float lineWidth=.005;float gx=smoothstep(0.,lineWidth,cellUV.x)*smoothstep(0.,lineWidth,1.-cellUV.x);float gy=smoothstep(0.,lineWidth,cellUV.y)*smoothstep(0.,lineWidth,1.-cellUV.y);float gridMask=gx*gy;
 float imageSize=.6;float imageBorder=(1.-imageSize)*.5;vec2 imageUV=(cellUV-imageBorder)/imageSize;float es=.01;vec2 im=smoothstep(-es,es,imageUV)*smoothstep(-es,es,1.-imageUV);float imageAlpha=im.x*im.y;
 bool inImage=imageUV.x>=0.&&imageUV.x<=1.&&imageUV.y>=0.&&imageUV.y<=1.;float textHeight=.08;float textY=.88;bool inText=cellUV.x>=.05&&cellUV.x<=.95&&cellUV.y>=textY&&cellUV.y<=(textY+textHeight);
 float texIndex=mod(cellId.x+cellId.y*3.,uTextureCount);vec3 color=uBg;float atlasSize=ceil(sqrt(uTextureCount));vec2 atlasPos=vec2(mod(texIndex,atlasSize),floor(texIndex/atlasSize));
 if(inImage&&imageAlpha>0.){vec2 a=(atlasPos+imageUV)/atlasSize;a.y=1.-a.y;color=mix(color,texture2D(uImageAtlas,a).rgb,imageAlpha);}
 if(inText){vec2 tc=vec2((cellUV.x-.05)/.9,(cellUV.y-textY)/textHeight);tc.y=1.-tc.y;vec4 t=texture2D(uTextAtlas,(atlasPos+tc)/atlasSize);color=mix(uBg,t.rgb,t.a);}
 color=mix(color,uBorderColor.rgb,(1.-gridMask)*uBorderColor.a);float fade=1.-smoothstep(1.2,1.8,radius);gl_FragColor=vec4(color*fade,1.);}`;
 const gl=(()=>{const c=document.createElement('canvas');try{return c.getContext('webgl',{antialias:true,alpha:false})}catch(_){return null}})();
 if(gl){
  const cv=gl.canvas;gal.prepend(cv);
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pg);gl.useProgram(pg);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pg,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const U=n=>gl.getUniformLocation(pg,n);const u={off:U('uOffset'),res:U('uResolution'),bor:U('uBorderColor'),bg:U('uBg'),mouse:U('uMousePos'),zoom:U('uZoom'),cell:U('uCellSize'),cnt:U('uTextureCount')};
  const tex=(unit,canvas)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)};
  const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
  const SZ=512,N=ITEMS.length,A=Math.ceil(Math.sqrt(N));
  Promise.all(ITEMS.map(it=>load(it[1]))).then(imgs=>{
   const ia=document.createElement('canvas');ia.width=ia.height=A*SZ;const ic=ia.getContext('2d');ic.fillStyle='#000';ic.fillRect(0,0,ia.width,ia.height);
   const ta=document.createElement('canvas');ta.width=ta.height=A*SZ;const tc=ta.getContext('2d');
   ITEMS.forEach((it,i)=>{const x=(i%A)*SZ,y=Math.floor(i/A)*SZ,im=imgs[i];
    if(im){const yi=(A-1-Math.floor(i/A))*SZ,s=Math.max(SZ/im.width,SZ/im.height),w=im.width*s,h=im.height*s;ic.save();ic.beginPath();ic.rect(x,yi,SZ,SZ);ic.clip();ic.drawImage(im,x+(SZ-w)/2,yi+(SZ-h)/2,w,h);ic.restore()}
    const t=document.createElement('canvas');t.width=2048;t.height=256;const c=t.getContext('2d');c.font='80px monospace';c.fillStyle='rgba(160,160,160,1)';c.textBaseline='middle';c.textAlign='left';c.fillText(it[0].toUpperCase(),30,128);c.textAlign='right';c.fillText(String(it[2]),2048-30,128);tc.drawImage(t,x,y,SZ,SZ)});
   try{tex(0,ia);tex(1,ta)}catch(e){gal.removeChild(cv);return}
   gl.uniform1i(U('uImageAtlas'),0);gl.uniform1i(U('uTextAtlas'),1);gl.uniform1f(u.cell,CELL);gl.uniform1f(u.cnt,N);gl.uniform4f(u.bor,...BORDER);gl.uniform3f(u.bg,...BG);
   const st={drag:false,px:0,py:0,off:[0,0],toff:[0,0],zoom:1,tz:1};let visible=true;
   const size=()=>{const w=gal.clientWidth,h=gal.clientHeight,d=Math.min(devicePixelRatio||1,2);cv.width=w*d;cv.height=h*d;gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(u.res,w,h)};
   size();new ResizeObserver(size).observe(gal);
   gl.uniform2f(u.mouse,-1,-1);
   gal.addEventListener('pointerdown',e=>{e.preventDefault();gal.setPointerCapture(e.pointerId);st.drag=true;st.px=e.clientX;st.py=e.clientY});
   gal.addEventListener('pointermove',e=>{if(!st.drag)return;const dx=e.clientX-st.px,dy=e.clientY-st.py;if((Math.abs(dx)>2||Math.abs(dy)>2)&&st.tz===1)st.tz=reduce?1:ZOOM;st.toff[0]-=dx*.003;st.toff[1]+=dy*.003;st.px=e.clientX;st.py=e.clientY});
   const end=e=>{st.drag=false;st.tz=1;try{gal.releasePointerCapture(e.pointerId)}catch(_){}};gal.addEventListener('pointerup',end);gal.addEventListener('pointercancel',end);
   new IntersectionObserver(([e])=>visible=e.isIntersecting).observe(gal);
   const hint=$('.rf-hint',gal);
   (function tick(){requestAnimationFrame(tick);if(!visible)return;st.off[0]+=(st.toff[0]-st.off[0])*LERP;st.off[1]+=(st.toff[1]-st.off[1])*LERP;st.zoom+=(st.tz-st.zoom)*LERP;
    gl.uniform2f(u.off,st.off[0],st.off[1]);gl.uniform1f(u.zoom,st.zoom);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)})();
   gal.addEventListener('pointerdown',()=>hint&&(hint.style.opacity=0),{once:true})})
 }}

/* ---- onglets des compétences ---- */
const tabs=$$('.rf-tabs [role=tab]');
const showTab=id=>{tabs.forEach(t=>{const on=t.id===id;t.setAttribute('aria-selected',on);const p=document.getElementById(t.getAttribute('aria-controls'));if(p)p.hidden=!on})};
tabs.forEach(t=>t.addEventListener('click',()=>showTab(t.id)));
$$('[data-tab]').forEach(a=>a.addEventListener('click',()=>showTab('t-'+a.dataset.tab)));
/* ---- section courante dans la barre ---- */
const links=$$('#rf-nav a'),secs=links.map(l=>document.querySelector(l.getAttribute('href'))).filter(Boolean);
if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});secs.forEach(s=>io.observe(s))}
})();
