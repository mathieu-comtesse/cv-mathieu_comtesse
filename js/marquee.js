
/* Desktop keeps its continuous rail. Mobile uses the browser's native touch scroll. */
export function createMarquee(root,{repeat=3,friction=.975,maxThrow=60}={}){
 const track=root.querySelector('.mq-track'),originals=[...track.children],mobile=matchMedia('(max-width:809px)');
 const viewport=document.createElement('div');viewport.className='mq-scroll';track.before(viewport);viewport.append(track);
 for(let r=1;r<repeat;r++)for(const n of originals){const c=n.cloneNode(true);c.setAttribute('aria-hidden','true');c.tabIndex=-1;c.querySelectorAll('a,button,[tabindex]').forEach(o=>o.tabIndex=-1);track.append(c);}
 let x=0,width=0,velocity=0,raf=0,lastFrame=0,gesture=null,visible=true,suppressUntil=0;
 const wrap=v=>width?((v%width)+width)%width-width:0;
 const set=()=>{if(mobile.matches){x=-viewport.scrollLeft;track.style.transform='';}else track.style.transform=`translate3d(${x}px,0,0)`;root.dataset.scrollMode=mobile.matches?'native':'drag';root.dispatchEvent(new CustomEvent('marquee-move',{detail:{x,width,native:mobile.matches}}));};
 const stop=()=>{cancelAnimationFrame(raf);raf=0;lastFrame=0;};
 const measure=()=>{const phase=width?x/width:-1,gap=parseFloat(getComputedStyle(track).columnGap)||0;width=originals.reduce((s,o)=>s+o.getBoundingClientRect().width,0)+gap*originals.length;x=mobile.matches?-viewport.scrollLeft:wrap(phase*width);root.dataset.marqueePeriod=String(width);set();};
 const tick=now=>{raf=0;if(gesture||!visible||document.hidden||mobile.matches)return;const dt=lastFrame?Math.min(50,now-lastFrame):16.67;lastFrame=now;x=wrap(x+velocity*dt);velocity*=Math.pow(friction,dt/16.67);set();if(Math.abs(velocity)>.002)raf=requestAnimationFrame(tick);else{velocity=0;lastFrame=0;}};
 const kick=()=>{if(!raf&&visible&&!document.hidden&&!mobile.matches&&Math.abs(velocity)>.002)raf=requestAnimationFrame(tick);};
 viewport.addEventListener('scroll',()=>{if(!mobile.matches)return;if(gesture&&Math.abs(viewport.scrollLeft-gesture.scroll)>7)suppressUntil=performance.now()+180;set();},{passive:true});
 root.addEventListener('dragstart',e=>e.preventDefault());
 root.addEventListener('pointerdown',e=>{if(e.button!==0)return;stop();velocity=0;suppressUntil=0;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:x,last:e.clientX,time:performance.now(),scroll:viewport.scrollLeft,dragging:false};});
 root.addEventListener('pointermove',e=>{const g=gesture;if(mobile.matches||!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(!g.dragging){if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}g.dragging=true;root.setPointerCapture(e.pointerId);root.classList.add('is-drag');}
  const now=performance.now(),dt=Math.max(1,now-g.time);velocity=.6*velocity+.4*Math.max(-maxThrow/16.67,Math.min(maxThrow/16.67,(e.clientX-g.last)/dt));x=wrap(g.start+dx);set();g.last=e.clientX;g.time=now;
 });
 const end=(e,cancel=false)=>{const g=gesture;if(!g||g.id!==e.pointerId)return;gesture=null;root.classList.remove('is-drag');if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);if(g.dragging)suppressUntil=performance.now()+400;if(cancel||performance.now()-g.time>90)velocity=0;kick();};
 root.addEventListener('pointerup',e=>end(e));root.addEventListener('pointercancel',e=>end(e,true));root.addEventListener('lostpointercapture',e=>end(e,true));
 root.addEventListener('click',e=>{if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
 root.addEventListener('wheel',e=>{if(mobile.matches)return;if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();stop();velocity=0;x=wrap(x-e.deltaX*(e.deltaMode===1?16:1));set();}},{passive:false});
 root.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();stop();velocity=0;const dx=(e.key==='ArrowLeft'?1:-1)*root.clientWidth*.35;if(mobile.matches)viewport.scrollBy({left:-dx,behavior:'smooth'});else{x=wrap(x+dx);set();}});
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;visible?kick():stop();}).observe(root);
 document.addEventListener('visibilitychange',()=>document.hidden?stop():kick());
 mobile.addEventListener('change',()=>{stop();gesture=null;velocity=0;measure();});
 new ResizeObserver(measure).observe(track);addEventListener('resize',measure);root.querySelectorAll('img').forEach(i=>{i.draggable=false;if(!i.complete)i.addEventListener('load',measure);});measure();
}
