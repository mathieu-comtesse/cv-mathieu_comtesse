export function initPersonalPreviews(root, projects) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),videos=new Map();
  let modal=false;const update=()=>{
    const bounds=root.getBoundingClientRect();const visible=!document.hidden&&!modal&&bounds.bottom>0&&bounds.top<innerHeight&&!reduced.matches;
    let count=0;
    for(const card of root.querySelectorAll('.pc')){
      const image=card.querySelector('.pc-img'),r=image.getBoundingClientRect(),on=visible&&r.right>bounds.left&&r.left<bounds.right&&r.bottom>0&&r.top<innerHeight&&count<3;
      let video=videos.get(card);
      if(on){count++;if(!video){video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-hidden','true');video.poster=projects[+card.dataset.i].img;video.src='assets/previews/'+projects[+card.dataset.i].id+'.webm?v=cv-scene-v24';image.append(video);videos.set(card,video);}if(video.paused)video.play().catch(()=>{});}
      else if(video&&!video.paused)video.pause();
    }
    root.dataset.previewActive=String(count);
  };
  new IntersectionObserver(update).observe(root);new ResizeObserver(update).observe(root);
  document.addEventListener('visibilitychange',update);document.addEventListener('project-workshop',e=>{modal=e.detail.open;update();});reduced.addEventListener('change',update);
  setInterval(update,150);update();
}