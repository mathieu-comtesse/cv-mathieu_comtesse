/* Navigation spatiale originale pour parcours.html. Aucun asset Shopify réutilisé.
   Le moteur Three.js appelle frame() et pose() depuis sa boucle de rendu. */
(() => {
  'use strict';
  if (window.__editionsExperience) return;
  const page = document.getElementById('page');
  if (!page) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (x,a=0,b=1) => Math.min(b,Math.max(a,x));
  const slug = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const pad = i => String(i+1).padStart(2,'0');
  const positionOf = el => el.getBoundingClientRect().top-page.getBoundingClientRect().top;
  const sections = [...page.querySelectorAll(':scope > section[data-section]')].map((el,i)=>({
    el,i,name:el.dataset.section,title:el.querySelector('h2')?.textContent.trim()||el.dataset.section,
    id:'chapitre-'+slug(el.dataset.section),color:el.dataset.color||'#9eadd8',y:positionOf(el)
  }));
  const projects = [...page.querySelectorAll('.pc-proj')].map((el,i)=>{
    const card=el.querySelector('.pc-pcard')||el.querySelector('.pc-card');
    const a=card?.querySelector('.pc-more[href]')||card?.querySelector('a[href]');
    return {el,i,name:card?.querySelector('h3')?.textContent.trim()||'Projet '+pad(i),
      title:card?.querySelector('.pc-sub')?.textContent.trim()||card?.dataset.calloutSub||'',
      href:a?.getAttribute('href')||card?.dataset.href||'',y:positionOf(el),
      color:el.closest('[data-section]')?.dataset.color||'#8caaff'};
  });
  if (!sections.length) return;
  document.documentElement.classList.add('ex-enhanced');
  const shell = document.createElement('div');
  shell.id='ex-shell';
  shell.innerHTML=[
    '<div class="ex-atmosphere" aria-hidden="true"><i class="ex-halo ex-halo-a"></i><i class="ex-halo ex-halo-b"></i><i class="ex-scan"></i></div>',
    '<header class="ex-topbar">',
      '<a class="ex-brand" href="index.html" aria-label="Retour à l’accueil">',
        '<span class="ex-monogram">MC</span><span class="ex-brand-text">MATHIEU COMTESSE <em>PARCOURS</em></span></a>',
      '<div class="ex-top-actions">',
        '<button class="ex-explore" type="button" data-ex-open="projects">Machines <span class="ex-count">'+String(projects.length).padStart(2,'0')+'</span></button>',
        '<button class="ex-menu-button" type="button" data-ex-open="chapters" aria-expanded="false" aria-controls="ex-drawer">',
          '<i class="ex-icon-menu" aria-hidden="true"><b></b><b></b><b></b><b></b></i> Sommaire</button>',
      '</div>',
      '<div class="ex-now" aria-live="off"><b id="ex-number">01</b><i>/</i><span>'+String(sections.length).padStart(2,'0')+'</span><small id="ex-active-name"></small></div>',
    '</header>',
    '<div class="ex-progress" role="progressbar" aria-label="Progression du parcours" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>',
    '<nav class="ex-waypoints" aria-label="Navigation par chapitres"><ol id="ex-waypoints"></ol></nav>',
    '<div class="ex-ghost" aria-hidden="true"><span id="ex-ghost-number">01</span><span id="ex-ghost-name"></span></div>',
    '<section class="ex-drawer" id="ex-drawer" role="dialog" aria-modal="true" aria-labelledby="ex-panel-title" aria-hidden="true" hidden>',
      '<div class="ex-drawer-head"><span class="ex-eyebrow">INDEX / EXPLORATION</span><button class="ex-close" type="button">Fermer <span aria-hidden="true">×</span></button></div>',
      '<div class="ex-drawer-grid"><div class="ex-drawer-main">',
        '<p class="ex-eyebrow">PARCOURS INTERACTIF</p><h2 id="ex-panel-title">Explorer le parcours<span>.</span></h2>',
        '<label class="ex-search-label" for="ex-search">Rechercher un chapitre ou une machine</label>',
        '<div class="ex-search-box"><span aria-hidden="true">⌕</span><input type="search" id="ex-search" placeholder="Rechercher un outil, un projet…" autocomplete="off"><kbd>/</kbd></div>',
        '<div class="ex-tabs" role="tablist" aria-label="Type de contenu">',
          '<button type="button" role="tab" data-ex-tab="chapters" aria-selected="true">Chapitres</button>',
          '<button type="button" role="tab" data-ex-tab="projects" aria-selected="false">Machines &amp; projets</button>',
        '</div><div id="ex-results" class="ex-results" role="tabpanel" tabindex="0"></div>',
      '</div><div class="ex-drawer-aside">',
        '<div class="ex-orbits" aria-hidden="true"><i></i><i></i><i></i><b>MC</b></div>',
        '<span class="ex-eyebrow">DÉCOUVRIR PAR L’OBJET</span>',
        '<p>Des machines à manipuler. Des processus à comprendre. Un parcours dans la matière.</p>',
        '<small>Défilez pour traverser les chapitres. Utilisez les commandes pour changer de profondeur.</small>',
      '</div></div>',
      '<div class="ex-drawer-foot"><span>COMTESSE.ME / 2026</span><span>ÉCHAP POUR FERMER</span></div>',
    '</section>',
    '<nav class="ex-mobile-nav" aria-label="Navigation mobile">',
      '<button type="button" data-ex-step="-1" aria-label="Chapitre précédent">←</button>',
      '<button type="button" data-ex-open="chapters" class="ex-mobile-title"><span id="ex-mobile-name">Accueil</span><small id="ex-mobile-number">01 / 11</small></button>',
      '<button type="button" data-ex-step="1" aria-label="Chapitre suivant">→</button>',
    '</nav>'
  ].join('');
  document.body.append(shell);
  const $ = s => shell.querySelector(s);
  const drawer=$('#ex-drawer'),search=$('#ex-search'),results=$('#ex-results');
  const waypointList=$('#ex-waypoints'),progress=$('.ex-progress');
  let active=-1,tab='chapters',opened=false,query='',lastFocus=null,lastProgress=-1,frames=0;
  const offsetFor = sec => window.__expo?.sections?.[sec.i]?.r?.y ?? sec.y;
  function setOpen(next,preferred){
    if(next===opened&&!preferred)return;
    if(next){
      lastFocus=document.activeElement;
      drawer.hidden=false;opened=true;
      document.documentElement.classList.add('ex-menu-open');
      drawer.setAttribute('aria-hidden','false');
      $('.ex-menu-button').setAttribute('aria-expanded','true');
      if(preferred)setTab(preferred);else paintResults();
      requestAnimationFrame(()=>search.focus());
    }else{
      opened=false;document.documentElement.classList.remove('ex-menu-open');
      drawer.hidden=true;drawer.setAttribute('aria-hidden','true');
      $('.ex-menu-button').setAttribute('aria-expanded','false');
      if(lastFocus?.focus)lastFocus.focus({preventScroll:true});
    }
  }
  function goTo(y,hash){
    setOpen(false);
    scrollTo({top:Math.max(0,y+260-innerHeight/2),behavior:reduce.matches?'instant':'smooth'});
    if(hash)history.replaceState(null,'','#'+hash);
  }
  function goToChapter(i){
    const sec=sections[clamp(i|0,0,sections.length-1)];
    if(sec)goTo(offsetFor(sec),sec.id);
  }
  function goToProject(i){
    const p=projects[clamp(i|0,0,projects.length-1)];
    if(p)goTo(p.y,'projet-'+slug(p.name));
  }
  for(const sec of sections){
    const li=document.createElement('li'),b=document.createElement('button');
    b.type='button';b.dataset.index=String(sec.i);b.setAttribute('aria-label',pad(sec.i)+' '+sec.name);
    const num=document.createElement('span');num.className='ex-wp-n';num.textContent=pad(sec.i);
    const line=document.createElement('span');line.className='ex-wp-line';
    const name=document.createElement('span');name.className='ex-wp-name';name.textContent=sec.name;
    b.append(num,line,name);b.addEventListener('click',()=>goToChapter(sec.i));
    li.append(b);waypointList.append(li);
  }
  function setTab(next){
    tab=next;
    shell.querySelectorAll('[data-ex-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.exTab===next)));
    paintResults();
  }
  function paintResults(){
    results.replaceChildren();
    const normalized=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const items=(tab==='chapters'?sections:projects).filter(item=>(item.name+' '+item.title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(normalized));
    if(!items.length){const e=document.createElement('p');e.className='ex-empty';e.textContent='Aucun résultat. Essayez un autre mot-clé.';results.append(e);return;}
    for(const item of items){
      const b=document.createElement('button');b.type='button';b.className='ex-result';
      b.dataset.index=String(item.i);b.style.setProperty('--item-color',item.color);
      if(tab==='chapters'&&active===item.i)b.classList.add('is-current');
      const n=document.createElement('span');n.className='ex-result-num';n.textContent=pad(item.i);
      const body=document.createElement('span');body.className='ex-result-body';
      const strong=document.createElement('strong');strong.textContent=item.name;
      const small=document.createElement('small');small.textContent=item.title;body.append(strong,small);
      const arrow=document.createElement('span');arrow.className='ex-result-arrow';arrow.textContent='↗';
      b.append(n,body,arrow);b.addEventListener('click',()=>tab==='chapters'?goToChapter(item.i):goToProject(item.i));
      results.append(b);
    }
  }
  function setActive(idx){
    idx=clamp(idx|0,0,sections.length-1);
    if(idx===active)return;
    active=idx;const sec=sections[idx];
    $('#ex-number').textContent=pad(idx);$('#ex-active-name').textContent=sec.name;
    $('#ex-ghost-number').textContent=pad(idx);$('#ex-ghost-name').textContent=sec.name.toUpperCase();
    $('#ex-mobile-name').textContent=sec.name;
    $('#ex-mobile-number').textContent=pad(idx)+' / '+String(sections.length).padStart(2,'0');
    shell.style.setProperty('--ex-color',sec.color);
    shell.querySelectorAll('.ex-waypoints button').forEach((b,i)=>{b.classList.toggle('is-active',i===idx);b.setAttribute('aria-current',i===idx?'step':'false');});
    shell.classList.remove('ex-changed');void $('#ex-ghost-number').offsetWidth;shell.classList.add('ex-changed');
    if(opened&&tab==='chapters')paintResults();
  }
  function update(scroll,immersive=0){
    let idx=0;for(const sec of sections)if(offsetFor(sec)<=scroll+innerHeight*.5)idx=sec.i;
    setActive(idx);
    const maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight,page.offsetHeight-innerHeight);
    const p=clamp(scroll/maxScroll);
    if(Math.abs(p-lastProgress)>.00025){
      lastProgress=p;progress.style.setProperty('--ex-progress',p.toFixed(5));
      progress.setAttribute('aria-valuenow',String(Math.round(p*100)));
      shell.style.setProperty('--ex-scroll',p.toFixed(5));
    }
    shell.style.setProperty('--ex-depth',clamp(immersive).toFixed(3));
    shell.classList.toggle('ex-immersive',immersive>.32);
  }
  shell.querySelectorAll('[data-ex-open]').forEach(b=>b.addEventListener('click',()=>setOpen(!opened,b.dataset.exOpen)));
  $('.ex-close').addEventListener('click',()=>setOpen(false));
  shell.querySelectorAll('[data-ex-step]').forEach(b=>b.addEventListener('click',()=>goToChapter(active+Number(b.dataset.exStep))));
  $('.ex-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-ex-tab]');if(b)setTab(b.dataset.exTab);});
  search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();paintResults();});
  document.addEventListener('keydown',e=>{
    const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
    if(opened&&e.key==='Escape'){e.preventDefault();setOpen(false);return;}
    if(!opened&&!typing&&(e.key==='/'||(e.key.toLowerCase()==='k'&&(e.ctrlKey||e.metaKey)))){
      e.preventDefault();setOpen(true,'projects');
    }
    if(opened&&e.key==='Tab'){
      const all=[...drawer.querySelectorAll('button,input,a[href]')].filter(el=>el.getClientRects().length);
      const first=all[0],last=all[all.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  addEventListener('scroll',()=>{if(!window.__expo)update(scrollY,0);},{passive:true});
  addEventListener('resize',()=>update(scrollY,0),{passive:true});
  window.__editionsExperience={
    sections,projects,goToChapter,goToProject,
    frame({scroll,immersive}){if(++frames%2===0)update(scroll,immersive);},
    pose({focusZ,immersive,now,width}){
      if(width<760||reduce.matches||immersive<.3||opened)return null;
      const amp=clamp((immersive-.3)/.7),u=focusZ*.082;
      const drift=(Math.sin(u*.73)*.46+Math.sin(u*.37+.6)*.28)*amp;
      return {cameraX:drift,lookX:drift*.21,cameraY:Math.sin(u*.8)*.12*amp,
        roll:clamp((Math.cos(u*.53+now*.00008)*.013+Math.sin(u*.19)*.008)*amp,-.026,.026)};
    }
  };
  paintResults();update(scrollY,0);
  if(location.hash.startsWith('#chapitre-')||location.hash.startsWith('#projet-')){
    const value=location.hash.slice(1);
    const i=sections.findIndex(s=>s.id===value),j=projects.findIndex(p=>'projet-'+slug(p.name)===value);
    if(i>=0||j>=0)addEventListener('load',()=>setTimeout(()=>i>=0?goToChapter(i):goToProject(j),200),{once:true});
  }
})();
