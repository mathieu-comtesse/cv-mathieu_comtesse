// Preserve old shared section links on the home page.
(()=>{const owners={"accueil":"index","contact":"contact","profil":"profil","competences":"competences","projets":"projets","projet-studio":"projet-studio","projet-charte":"projet-charte","projet-1":"projet-1","projet-vre":"projet-vre","projet-2":"projet-2","projet-3":"projet-3","projet-4":"projet-4","projet-5":"projet-5","automatisations":"automatisations","methode":"methode","parcours":"parcours","sandboard":"sandboard"};const redirect=()=>{const id=decodeURIComponent(location.hash.slice(1));if(document.body.dataset.page==='index'&&owners[id]&&owners[id]!=='index')location.replace(owners[id]+'.html#'+encodeURIComponent(id));};redirect();window.addEventListener('hashchange',redirect);const header=document.querySelector('.site-header');const size=()=>document.documentElement.style.setProperty('--nav-height',header.offsetHeight+'px');new ResizeObserver(size).observe(header);size();

  // Une nuance choisie devient la source unique de la couleur d'accent.
  const shades=[...document.querySelectorAll('.shade[data-hex]')];
  const applyShade=hex=>{const color='#'+hex.toUpperCase();document.documentElement.style.setProperty('--pink',color);shades.forEach(shade=>{const selected=shade.dataset.hex.toUpperCase()===hex.toUpperCase();shade.classList.toggle('is-current',selected);shade.setAttribute('aria-pressed',String(selected));});try{localStorage.setItem('cv-accent',hex.toUpperCase());}catch(_){}};
  if(shades.length){let saved='';try{saved=localStorage.getItem('cv-accent')||'';}catch(_){};const initial=shades.some(shade=>shade.dataset.hex.toUpperCase()===saved.toUpperCase())?saved:(document.querySelector('.shade.is-current')||shades[0]).dataset.hex;applyShade(initial);shades.forEach(shade=>shade.addEventListener('click',()=>applyShade(shade.dataset.hex)));}
})();

// Sandboard personnel : un canvas tactile inspiré des aplats peints de la vidéo.
(()=>{
  const canvas=document.getElementById('sandboard-canvas');
  const stage=document.getElementById('sandboard-stage');
  const reset=document.getElementById('sandboard-reset');
  if(!canvas||!stage||!reset||document.body.dataset.sandEngine==='three')return;
  const ctx=canvas.getContext('2d');let drawing=false,last=null;
  const colors={sand:'#ffa62f',coral:'#ef4b2f',red:'#c8102e',green:'#07583d',ink:'#071b16',blue:'#9db4bd'};
  const seed=(x,y)=>Math.abs(Math.sin(x*12.9898+y*78.233)*43758.5453)%1;
  const paintSurface=()=>{
    const rect=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle=colors.sand;ctx.fillRect(0,0,rect.width,rect.height);
    ctx.lineCap='round';ctx.globalAlpha=.72;
    [[colors.coral,.08,.28],[colors.green,.42,.5],[colors.red,.7,.2]].forEach(([color,y,w],i)=>{ctx.strokeStyle=color;ctx.lineWidth=32+i*9;ctx.beginPath();ctx.moveTo(-30,rect.height*y);ctx.bezierCurveTo(rect.width*.22,rect.height*(y-.16),rect.width*.62,rect.height*(y+.18),rect.width*(w+1),rect.height*(y-.04));ctx.stroke();});
    ctx.globalAlpha=.16;ctx.fillStyle='#fff3df';for(let y=4;y<rect.height;y+=9)for(let x=4;x<rect.width;x+=9)if(seed(x,y)>.43)ctx.fillRect(x+seed(y,x)*4,y+seed(x+2,y)*4,1.4,1.4);ctx.globalAlpha=1;
  };
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top,t:performance.now()}};
  const stroke=(a,b)=>{const dt=Math.max(8,b.t-a.t),dist=Math.hypot(b.x-a.x,b.y-a.y),speed=dist/dt;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=colors.green;ctx.lineWidth=Math.max(12,28-speed*11);ctx.globalAlpha=.92;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle=colors.ink;ctx.lineWidth=Math.max(2,6-speed*2);ctx.globalAlpha=.36;ctx.stroke();const grains=Math.min(26,Math.floor(4+speed*28));for(let i=0;i<grains;i++){const spread=10+speed*38,ang=seed(i+b.x,b.y)*Math.PI*2,rad=seed(i+b.y,b.x)*spread;ctx.fillStyle=i%3===0?colors.red:colors.coral;ctx.globalAlpha=.45+seed(i,a.x)*.45;ctx.beginPath();ctx.ellipse(b.x+Math.cos(ang)*rad,b.y+Math.sin(ang)*rad,1+seed(i,b.y)*4,.8+seed(b.x,i)*2,ang,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;};
  canvas.addEventListener('pointerdown',e=>{drawing=true;last=point(e);canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;const next=point(e);stroke(last,next);last=next});
  const stop=()=>{drawing=false;last=null};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  reset.addEventListener('click',paintSurface);new ResizeObserver(paintSurface).observe(stage);paintSurface();
})();

// Menus déroulants de la barre du haut : un seul ouvert à la fois, fermés par Échap ou un clic ailleurs.
(()=>{const menus=[...document.querySelectorAll('.nav-menu')];if(!menus.length)return;
  menus.forEach(m=>m.addEventListener('toggle',()=>{if(m.open)menus.forEach(o=>{if(o!==m)o.open=false;});}));
  document.addEventListener('click',e=>{menus.forEach(m=>{if(m.open&&(!m.contains(e.target)||e.target.closest('.nav-panel a')))m.open=false;});});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;menus.forEach(m=>{if(m.open){m.open=false;m.querySelector('summary').focus();}});});
})();
