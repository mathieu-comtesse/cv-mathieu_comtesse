/* Projets perso : galerie plein écran. Chaque case est un projet cliquable ; au survol, aperçu qui suit le curseur. */
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const main=document.getElementById('contenu');
const cards=[...document.querySelectorAll('.personal-intro .theme-card')];
if(!main||!cards.length)return;
const items=cards.map(a=>{
  const href=a.getAttribute('href'),slug=href.replace(/\.html.*$/,'');
  const full=a.querySelector('h3').textContent.trim();
  const kick=a.querySelector('.card-index').textContent.split('/').pop().trim();
  return {href,img:'assets/nav/'+slug+'.jpg',title:full.split(' · ')[0].split(' : ')[0],full,kick,text:a.querySelector('p').textContent.trim()};
});
const N=items.length;

/* ---- WebGL : même grille et même distorsion que le composant d'origine ---- */
const VS='attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const FS=`precision highp float;uniform vec2 uOffset;uniform vec2 uResolution;uniform vec4 uBorderColor;uniform float uZoom;uniform float uCellSize;uniform float uTextureCount;uniform sampler2D uImageAtlas;uniform sampler2D uTextAtlas;varying vec2 vUv;
void main(){vec2 screenUV=(vUv-.5)*2.;float radius=length(screenUV);float distortion=1.-.08*radius*radius;vec2 aspect=vec2(uResolution.x/uResolution.y,1.);vec2 worldCoord=screenUV*distortion*aspect;worldCoord*=uZoom;worldCoord+=uOffset;
vec2 cellPos=worldCoord/uCellSize;vec2 cellId=floor(cellPos);vec2 cellUV=fract(cellPos);
float lw=.005;float gx=smoothstep(0.,lw,cellUV.x)*smoothstep(0.,lw,1.-cellUV.x);float gy=smoothstep(0.,lw,cellUV.y)*smoothstep(0.,lw,1.-cellUV.y);float gridMask=gx*gy;
float imageSize=.62;float ib=(1.-imageSize)*.5;vec2 imageUV=(cellUV-ib)/imageSize;float es=.01;vec2 im=smoothstep(-es,es,imageUV)*smoothstep(-es,es,1.-imageUV);float imageAlpha=im.x*im.y;
bool inImage=imageUV.x>=0.&&imageUV.x<=1.&&imageUV.y>=0.&&imageUV.y<=1.;float th=.08;float ty=.88;bool inText=cellUV.x>=.05&&cellUV.x<=.95&&cellUV.y>=ty&&cellUV.y<=(ty+th);
float texIndex=mod(cellId.x+cellId.y*3.,uTextureCount);texIndex=mod(texIndex+uTextureCount,uTextureCount);vec3 color=vec3(0.);float A=ceil(sqrt(uTextureCount));vec2 ap=vec2(mod(texIndex,A),floor(texIndex/A));
if(inImage&&imageAlpha>0.){vec2 a=(ap+imageUV)/A;a.y=1.-a.y;color=mix(color,texture2D(uImageAtlas,a).rgb,imageAlpha);}
if(inText){vec2 tc=vec2((cellUV.x-.05)/.9,(cellUV.y-ty)/th);tc.y=1.-tc.y;vec4 t=texture2D(uTextAtlas,(ap+tc)/A);color=mix(color,t.rgb,t.a);}
color=mix(color,uBorderColor.rgb,(1.-gridMask)*uBorderColor.a);float fade=1.-smoothstep(1.3,1.9,radius);gl_FragColor=vec4(color*fade,1.);}`;
const CELL=.75,ZOOM=1.25,LERP=reduce?1:.075;

let gl=null;
try{gl=document.createElement('canvas').getContext('webgl',{antialias:true,alpha:false})}catch(_){}
if(!gl)return;   /* sans WebGL, la liste de cartes d'origine reste la page */

const stage=document.createElement('section');stage.className='pg-stage';stage.setAttribute('role','group');
stage.setAttribute('aria-label','Galerie des projets personnels : glisser pour explorer, cliquer sur une case pour ouvrir le projet. La liste complète se trouve plus bas.');
stage.innerHTML='<div class="pg-title"><b>Projets perso</b><span>Dessiner, explorer et jouer</span></div><div class="pg-hint" aria-hidden="true">glisser pour explorer · cliquer pour ouvrir</div>';
const cv=gl.canvas;stage.prepend(cv);
const more=document.createElement('a');more.className='pg-more';more.href='#liste-projets-perso';more.textContent='Voir la liste des projets ↓';
main.prepend(more);main.prepend(stage);
const band=main.querySelector('.personal-intro');if(band)band.id='liste-projets-perso';
document.body.classList.add('pg-has-gl');

const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pg);gl.useProgram(pg);
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const loc=gl.getAttribLocation(pg,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
const U=n=>gl.getUniformLocation(pg,n);
const tex=(unit,canvas)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)};
const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});

const st={w:1,h:1,off:[0,0],toff:[0,0],zoom:1,tz:1,down:null,drag:false,over:-1,run:false};

/* La case sous le curseur : même calcul que le shader (barillet, zoom, décalage). */
function pick(cx,cy){
  const r=stage.getBoundingClientRect(),sx=((cx-r.left)/st.w)*2-1,sy=-(((cy-r.top)/st.h)*2-1);
  const rad=Math.hypot(sx,sy),d=1-.08*rad*rad,asp=st.w/st.h;
  const wx=sx*d*asp*st.zoom+st.off[0],wy=sy*d*st.zoom+st.off[1];
  const ix=Math.floor(wx/CELL),iy=Math.floor(wy/CELL);
  return (((ix+iy*3)%N)+N)%N;
}

/* ---- aperçu au survol ---- */
const peek=document.createElement('div');peek.className='pg-peek';peek.setAttribute('aria-hidden','true');
peek.innerHTML='<div class="win"><div class="strip"></div></div><div class="cap"><b></b><span></span></div>';
const strip=peek.querySelector('.strip'),capB=peek.querySelector('b'),capS=peek.querySelector('span');
items.forEach(it=>{const d=document.createElement('div'),i=new Image();i.alt='';i.decoding='async';i.src=it.img;d.append(i);strip.append(d)});
document.body.append(peek);
const PH=212,PW=340,pk={x:0,y:0,tx:0,ty:0,sc:0,tsc:0,sy:0,tsy:0,raf:0,shown:false};
function pframe(){
  const k=reduce?1:.18;pk.x+=(pk.tx-pk.x)*k;pk.y+=(pk.ty-pk.y)*k;pk.sc+=(pk.tsc-pk.sc)*(reduce?1:.2);pk.sy+=(pk.tsy-pk.sy)*(reduce?1:.22);
  peek.style.transform=`translate(${pk.x.toFixed(1)}px,${pk.y.toFixed(1)}px) scale(${pk.sc.toFixed(3)})`;strip.style.transform=`translateY(${pk.sy.toFixed(1)}px)`;
  const mv=Math.abs(pk.tx-pk.x)>.4||Math.abs(pk.ty-pk.y)>.4||Math.abs(pk.tsc-pk.sc)>.004||Math.abs(pk.tsy-pk.sy)>.4;
  pk.raf=mv?requestAnimationFrame(pframe):0;if(!mv&&pk.tsc===0)peek.style.transform='translate(-999px,-999px) scale(0)';
}
const prun=()=>{if(!pk.raf)pk.raf=requestAnimationFrame(pframe)};
function aim(cx,cy){const H=PH+60;let x=cx+28;if(x+PW>innerWidth-8)x=cx-PW-28;pk.tx=Math.max(8,x);pk.ty=Math.min(innerHeight-H-8,Math.max(8,cy-H/2))}
function showPeek(i,cx,cy){
  if(i===st.over&&pk.shown){aim(cx,cy);prun();return}
  st.over=i;capB.textContent=items[i].full;capS.textContent=items[i].text.length>110?items[i].text.slice(0,107)+'…':items[i].text;
  pk.tsy=-i*PH;if(!pk.shown){pk.shown=true;aim(cx,cy);pk.x=pk.tx;pk.y=pk.ty;pk.sy=pk.tsy}
  aim(cx,cy);pk.tsc=1;prun();stage.classList.add('is-over');
}
function hidePeek(){st.over=-1;pk.shown=false;pk.tsc=0;prun();stage.classList.remove('is-over')}

/* ---- pointeur : glisser = déplacer, clic bref sans déplacement = ouvrir ---- */
stage.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  st.down={x:e.clientX,y:e.clientY,t:performance.now(),moved:0,id:e.pointerId,touch:e.pointerType!=='mouse'};
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(st.down&&e.pointerId===st.down.id){
    const dx=e.clientX-st.down.x,dy=e.clientY-st.down.y;st.down.moved=Math.max(st.down.moved,Math.hypot(dx,dy));
    if(st.down.moved>6&&!st.drag){st.drag=true;stage.classList.add('is-drag');hidePeek();st.tz=reduce?1:ZOOM}
    if(st.drag){const mx=e.movementX??0,my=e.movementY??0;st.toff[0]-=mx*.003;st.toff[1]+=my*.003}
    return;
  }
  if(e.pointerType==='mouse')showPeek(pick(e.clientX,e.clientY),e.clientX,e.clientY);
});
const end=e=>{
  const d=st.down;if(!d||e.pointerId!==d.id)return;
  try{stage.releasePointerCapture(e.pointerId)}catch(_){}
  const wasDrag=st.drag;st.down=null;st.drag=false;st.tz=1;stage.classList.remove('is-drag');
  if(e.type==='pointerup'&&!wasDrag&&d.moved<=6&&performance.now()-d.t<600){location.href=items[pick(e.clientX,e.clientY)].href}
  else if(e.pointerType==='mouse'&&e.type==='pointerup')showPeek(pick(e.clientX,e.clientY),e.clientX,e.clientY);
};
stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
stage.addEventListener('pointerleave',e=>{if(!st.drag)hidePeek()});
stage.addEventListener('lostpointercapture',()=>{if(st.drag){st.drag=false;st.down=null;st.tz=1;stage.classList.remove('is-drag')}});
addEventListener('blur',hidePeek);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hidePeek()});
const hint=stage.querySelector('.pg-hint');stage.addEventListener('pointerdown',()=>{hint.style.opacity=0},{once:true});

/* ---- rendu ---- */
const size=()=>{const w=stage.clientWidth,h=stage.clientHeight,d=Math.min(devicePixelRatio||1,2);st.w=w;st.h=h;cv.width=Math.round(w*d);cv.height=Math.round(h*d);gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(u.res,w,h)};
let u={};
function draw(){
  if(!st.run)return;requestAnimationFrame(draw);
  st.off[0]+=(st.toff[0]-st.off[0])*LERP;st.off[1]+=(st.toff[1]-st.off[1])*LERP;st.zoom+=(st.tz-st.zoom)*LERP;
  gl.uniform2f(u.off,st.off[0],st.off[1]);gl.uniform1f(u.zoom,st.zoom);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
const SZ=512,A=Math.ceil(Math.sqrt(N));
Promise.all(items.map(it=>load(it.img))).then(imgs=>{
  const ia=document.createElement('canvas');ia.width=ia.height=A*SZ;const ic=ia.getContext('2d');ic.fillStyle='#111';ic.fillRect(0,0,ia.width,ia.height);
  const ta=document.createElement('canvas');ta.width=ta.height=A*SZ;const tc=ta.getContext('2d');
  items.forEach((it,i)=>{
    const x=(i%A)*SZ,y=Math.floor(i/A)*SZ,im=imgs[i];
    if(im){const yi=(A-1-Math.floor(i/A))*SZ,s=Math.max(SZ/im.width,SZ/im.height),w=im.width*s,h=im.height*s;ic.save();ic.beginPath();ic.rect(x,yi,SZ,SZ);ic.clip();ic.drawImage(im,x+(SZ-w)/2,yi,w,h);ic.restore()}   /* image calée en haut de la case */
    const t=document.createElement('canvas');t.width=2048;t.height=256;const c=t.getContext('2d');c.font='84px monospace';c.fillStyle='rgba(235,235,235,1)';c.textBaseline='middle';
    c.textAlign='left';c.fillText(it.title.toUpperCase(),30,128);c.textAlign='right';c.fillText(it.kick.toUpperCase(),2048-30,128);tc.drawImage(t,x,y,SZ,SZ);
  });
  try{tex(0,ia);tex(1,ta)}catch(e){stage.remove();more.remove();document.body.classList.remove('pg-has-gl');return}
  u={off:U('uOffset'),res:U('uResolution'),zoom:U('uZoom')};
  gl.uniform1i(U('uImageAtlas'),0);gl.uniform1i(U('uTextAtlas'),1);gl.uniform1f(U('uCellSize'),CELL);gl.uniform1f(U('uTextureCount'),N);gl.uniform4f(U('uBorderColor'),1,1,1,.16);
  size();new ResizeObserver(size).observe(stage);
  new IntersectionObserver(([e])=>{const on=e.isIntersecting&&!document.hidden;if(on&&!st.run){st.run=true;draw()}else if(!on)st.run=false}).observe(stage);
});
})();
