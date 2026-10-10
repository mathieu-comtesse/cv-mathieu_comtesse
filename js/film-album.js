const frames=[1514,1510,1500,1513,1507,1506,1495,1505,1493,1504,1494,1489,1512,1511,1509,1508,1503,1496,1498,1499];

export function createFilmAlbum(onChange=()=>{}){
 const album=document.createElement('dialog');album.className='film-album';album.setAttribute('aria-labelledby','film-title');
 album.innerHTML=`<header><div><span class="film-kicker">Mamiya · carnet argentique</span><h2 id="film-title">Fragments de montagne</h2></div><button class="film-close" type="button" aria-label="Fermer les photos">×</button></header><figure class="film-print"><img class="film-photo" alt="" decoding="async"><figcaption><span>Clichés argentiques de Mathieu</span><output aria-live="polite"></output></figcaption></figure><div class="film-navigation"><button class="film-prev" type="button" aria-label="Photo précédente">←</button><span>Un tirage à la fois</span><button class="film-next" type="button" aria-label="Photo suivante">→</button></div><div class="film-contact-sheet" role="group" aria-label="Choisir un tirage">${frames.map((n,i)=>`<button type="button" data-frame="${i}" aria-label="Voir la photo ${i+1}" aria-pressed="false"><img src="assets/film/${n}-thumb.webp" alt="" loading="lazy" width="90" height="64"></button>`).join('')}</div>`;
 document.body.append(album);
 let index=0,returnFocus=null,touch=null,loadId=0;
 const photo=album.querySelector('.film-photo'),count=album.querySelector('output'),strip=album.querySelector('.film-contact-sheet');
 function show(next){
  index=(next+frames.length)%frames.length;const token=++loadId;
  photo.alt=`Cliché argentique ${index+1} : paysage de montagne en noir et blanc`;
  photo.src=`assets/film/${frames[index]}.webp`;count.textContent=`${String(index+1).padStart(2,'0')} / ${frames.length}`;
  album.dataset.frame=String(index);photo.classList.remove('film-reveal');
  photo.decode().then(()=>{if(token===loadId){void photo.offsetWidth;photo.classList.add('film-reveal');}}).catch(()=>{});
  strip.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.frame)===index)));
  const b=strip.querySelector(`[data-frame="${index}"]`);if(b)strip.scrollTo({left:b.offsetLeft-strip.offsetLeft-strip.clientWidth/2+b.clientWidth/2,behavior:'smooth'});
  // Only the neighbours are preloaded; the page never downloads all full-size scans at startup.
  for(const offset of [-1,1]){const im=new Image();im.src=`assets/film/${frames[(index+offset+frames.length)%frames.length]}.webp`;}
 }
 const close=()=>{if(album.open)album.close();};
 album.querySelector('.film-close').onclick=close;
 album.querySelector('.film-prev').onclick=()=>show(index-1);album.querySelector('.film-next').onclick=()=>show(index+1);
 strip.onclick=e=>{const b=e.target.closest('button[data-frame]');if(b)show(Number(b.dataset.frame));};
 album.addEventListener('click',e=>{if(e.target!==album)return;const r=album.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 album.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));}});
 photo.addEventListener('touchstart',e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 photo.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)show(index+(dx<0?1:-1));},{passive:true});
 photo.addEventListener('touchcancel',()=>touch=null,{passive:true});
 album.addEventListener('close',()=>{onChange(false);returnFocus?.focus({preventScroll:true});});
 return{open(){if(album.open)return;returnFocus=document.activeElement;show(index);album.showModal();onChange(true);album.querySelector('.film-close').focus({preventScroll:true});},close};
}
