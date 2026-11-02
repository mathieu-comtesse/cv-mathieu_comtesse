/* Scroll cinematographique, interpolation temporelle en rAF.
   Equivalent local minimal au comportement Lenis, sans package ni dependance reseau.
   La camera Three.js utilise toujours scrollY et sa propre boucle de rendu. */
(() => {
  'use strict';
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(pointer:fine)');
  if(media.matches || !fine.matches)return;
  let position=scrollY,target=scrollY,last=performance.now(),running=false;
  let generated=-9999,lastWheel=0,raf=0,locked=false;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const max=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
  const forbidden=el=>el?.closest?.(
    '.pc-lift,.ex-drawer,.film-album,.pc-lift-sc,.pc-reader-bar,'+
    '[data-scroll-native],[data-scroll-lock],input,textarea,select,[contenteditable="true"]'
  );
  function allowed(e){
    return !media.matches && fine.matches && !locked && !e.ctrlKey && !e.metaKey &&
      !document.documentElement.classList.contains('ex-menu-open') &&
      !document.documentElement.classList.contains('pc-lifted') &&
      !forbidden(e.target) && Math.abs(e.deltaY)>Math.abs(e.deltaX);
  }
  function tick(now){
    raf=0;
    const dt=Math.min(.055,(now-last)/1000||.016);last=now;
    const amount=1-Math.exp(-dt*10.5);
    position+=(target-position)*amount;
    if(Math.abs(target-position)<.25)position=target;
    generated=position;
    window.scrollTo({top:position,left:0,behavior:'instant'});
    if(Math.abs(target-position)>.25)raf=requestAnimationFrame(tick);
    else {running=false;target=position=scrollY;}
  }
  function start(){
    if(running)return;
    running=true;last=performance.now();raf=requestAnimationFrame(tick);
  }
  function stop(){
    if(raf)cancelAnimationFrame(raf);
    running=false;raf=0;target=position=scrollY;
  }
  addEventListener('wheel',e=>{
    if(!allowed(e)){if(running&&forbidden(e.target))stop();return;}
    if(!e.cancelable)return;
    e.preventDefault();
    const factor=e.deltaMode===1?18:e.deltaMode===2?innerHeight:1;
    const delta=clamp(e.deltaY*factor,-360,360);
    if(!running){target=position=scrollY;}
    target=clamp(target+delta,0,max());
    lastWheel=performance.now();start();
  },{passive:false});
  addEventListener('scroll',()=>{
    if(!running){target=position=scrollY;return;}
    // Ne pas confondre les propres scrollTo rAF avec un saut exterieur
    if(Math.abs(scrollY-generated)>24 && performance.now()-lastWheel>180)stop();
  },{passive:true});
  addEventListener('keydown',e=>{
    if(['Home','End','PageDown','PageUp','ArrowUp','ArrowDown',' '].includes(e.key)&&running)stop();
  });
  addEventListener('touchstart',stop,{passive:true});
  addEventListener('resize',()=>{if(running)target=clamp(target,0,max());},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.__exSmoothScroll={
    stop,goTo(value){
      const y=clamp(Number(value)||0,0,max());target=y;
      if(media.matches){scrollTo({top:y,behavior:'instant'});return;}
      if(!running)position=scrollY;
      start();
    },
    get active(){return running;}
  };
})();
