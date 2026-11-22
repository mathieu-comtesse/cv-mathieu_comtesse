// Vue de synthèse du tableau de bord. Le profil de 30 jours est illustratif,
// normalisé pour que la somme des jours corresponde au douzième du volume annuel.
const ns='http://www.w3.org/2000/svg';
const fmt=(n,d=0)=>n.toLocaleString('fr-FR',{maximumFractionDigits:d});
const text=(x,y,value,size=10,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${value}</text>`;
const box=(x,y,w,h,fill,rx=0,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width=".7"/>`;
const colors=['#68d0a6','#ec6869','#80cbe3','#a0a9a5','#89da54'];
const icon=(x,y,i)=>{
  const paths=['M2 7 7 2l5 5v6H8V9H6v4H2Z','M2 2h4v4H2zM9 2h4v4H9zM2 9h4v4H2zM9 9h4v4H9z','M2 6h11l-2-4H4ZM3 7v6h9V7','M2 3h7l4 4-6 6-5-5Z','M2 11h11M4 9V5m4 4V2m4 7V6'];
  return `<path d="${paths[i%paths.length]}" transform="translate(${x} ${y}) scale(.67)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`;
};
export function createGainsOverview({declared,projects,net,select,embedded}){
  const host=document.createElement('div');host.className='gains-overview';
  const annual=(declared.minHours+declared.maxHours)/2,money=(declared.minMoney+declared.maxMoney)/2;
  const rows=projects.slice(0,5).map((p,i)=>{
    const y=455+i*33,tag=p.estimated?'Estimation':'Volume fourni';
    return box(248,y-16,560,32,'#343f3b',0,'#53605a')+box(260,y-9,15,15,colors[i],3)+icon(263,y-6,i)+text(280,y+2,p.title,9)+text(432,y+2,fmt((p.minHours+p.maxHours)/2,1)+' h',9)+box(508,y-9,108,16,i===0?'#585f46':i===1?'#307894':'#46554e',8)+text(519,y+2,tag,9);
  }).join('');
  const nav=['Accueil','Projections','Contributions','Méthode'];
  const actions=['overview','year','projects','method'];
  const first='M278 153 C294 147 304 135 321 135 S342 141 360 134 S382 126 397 131 S429 144 447 149 S465 152 476 153';
  const curve=embedded?first+' S491 148 512 157 S528 174 548 174 S571 169 592 180 S615 189 628 194 S651 201 667 196 S689 196 701 199 S722 193 742 179':first;
  const travel=embedded?465:200;
  const seed=Array.from({length:60},(_,i)=>box((i*179+26)%742,(i*191+9)%639,i%6===0?3:1.6,i%6===0?3:1.6,'#a5aaa8'));
  host.innerHTML=`<svg class="gains-dashboard-art" viewBox="0 0 742 639" role="group" aria-label="Tableau de bord du temps libéré">
    <defs><linearGradient id="overview-area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#87d4e5" stop-opacity=".46"/><stop offset="1" stop-color="#87d4e5" stop-opacity="0"/></linearGradient>
    <clipPath id="overview-sweep"><rect class="overview-sweep" x="278" y="115" width="${travel}" height="190"/></clipPath></defs>
    ${embedded?'':box(0,0,742,639,'#4b4b4b')+seed.join('')}
    ${box(81,14,850,603,'#232a25',18)}${box(92,25,146,579,'#343f3b',9,'#5e6a66')}
    ${text(105,50,'MC',14,'fill="#77f5c2" font-weight="700"')}${text(130,50,'/ gains',11,'fill="#77f5c2" font-family="monospace"')}
    ${box(100,73,130,25,'#44504c',4)}${box(100,81,2,9,'#96eed8')}
    ${nav.map((v,i)=>`<a href="#gains-chart-title" data-go="${actions[i]}" aria-label="${v}">${box(100,72+i*29,130,26,'transparent',4)}${icon(109,80+i*29,i)}${text(127,88+i*29,v,10)}</a>`).join('')}
    ${text(107,560,'Mathieu Comtesse',10)}${box(105,577,15,15,'#c894d7',4)}${text(127,588,'Portfolio',10)}
    ${text(249,51,'Une année de temps libéré',14,'font-weight="700"')}
    ${box(248,63,610,334,'#343f3b',8,'#5e6a66')}
    ${text(260,85,'Projection mensuelle',10)}${text(260,114,fmt(annual/12,1)+' h',22,'font-weight="700"')}
    ${text(352,113,'≈ '+fmt(money/12)+' €',9,'fill="#7aebc4"')}${box(629,81,84,15,'#343f3b',6,'#738078')}${text(638,92,'30 jours illustrés',9)}
    ${[139,187,235,283].map(y=>box(278,y,513,.7,'#59645e')).join('')}
    ${text(256,142,'10 h',9)}${text(256,190,'8 h',9)}
    <g clip-path="url(#overview-sweep)"><path d="${curve} V305 H278 Z" fill="url(#overview-area)"/><path class="overview-line" d="${curve}" fill="none" stroke="#baf4ff" stroke-width="1.75"/></g>
    <circle class="overview-point" cx="${embedded?742:476}" cy="${embedded?179:153}" r="4.3" fill="#e1fcff" stroke="#9befff"/>
    <path class="overview-hit" d="${curve}" fill="none" stroke="transparent" stroke-width="30" pointer-events="stroke" tabindex="0" role="slider" aria-label="Jour du scénario mensuel" aria-valuemin="1" aria-valuemax="30" aria-valuenow="30"/>
    ${box(249,336,570,1,'#59645e')}${box(521,336,1,61,'#59645e')}${text(533,356,'Projets chiffrés',10)}${text(533,381,String(projects.length),14)}
    ${box(248,405,670,201,'#343f3b',7,'#5e6a66')}${rows}
    <g class="overview-float">${box(50,215,313,214,'#333f3b',13,'#6b7771')}
    ${text(67,248,'€',16,'fill="#72f5c3"')}${text(85,248,'Temps valorisé',13,'font-weight="700"')}${box(322,230,25,25,'#333f3b',7,'#687670')}${text(331,247,'↗',12)}
    ${text(65,286,'Valeur annuelle',13)}${text(348,287,fmt(money)+' €',21,'text-anchor="end"')}
    ${text(65,314,'Temps libéré',12)}${text(348,314,fmt(annual)+' h',13,'text-anchor="end"')}${box(65,331,283,.7,'#6c7772')}
    ${text(65,357,'Base horaire',12)}${text(348,357,'104,74 €',12,'text-anchor="end"')}
    ${text(65,383,'Net en année 1',12)}${text(348,383,fmt((net.minHours+net.maxHours)/2)+' h',12,'text-anchor="end"')}
    ${text(65,409,'Profil illustratif',12,'class="overview-detail-name"')}${text(348,409,'30 jours',12,'text-anchor="end" class="overview-detail"')}</g>
  </svg>`;
  const svg=host.firstElementChild,hit=svg.querySelector('.overview-hit'),line=svg.querySelector('.overview-line'),point=svg.querySelector('.overview-point'),len=line.getTotalLength();
  svg.querySelectorAll('[data-go]').forEach(a=>a.addEventListener('click',ev=>{
    ev.preventDefault();const destination=a.dataset.go;select(destination==='method'?'year':destination);
    if(destination==='method')host.closest('.gains-chart').querySelector('[data-working-days]').focus();
    else if(destination!=='overview')host.closest('.gains-chart').querySelector('.gains-switch [aria-pressed="true"]').focus();
  }));
  const dayPoints=Array.from({length:30},(_,i)=>line.getPointAtLength(i*len/29));
  const weights=dayPoints.map(p=>10-(p.y-139)/24),sum=weights.reduce((a,b)=>a+b,0);
  let day=29;
  function show(i){
    day=Math.max(0,Math.min(29,i));
    const p=dayPoints[day],hours=annual/12*weights[day]/sum;
    point.setAttribute('cx',p.x);point.setAttribute('cy',p.y);
    svg.querySelector('.overview-detail-name').textContent='Jour '+(day+1)+' · projection';
    svg.querySelector('.overview-detail').textContent=fmt(hours,1)+' h';
    hit.setAttribute('aria-valuenow',day+1);hit.setAttribute('aria-valuetext','Jour '+(day+1)+', '+fmt(hours,1)+' heures projetées');
    host.dataset.explore='';
  }
  hit.addEventListener('pointermove',ev=>{
    const p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(svg.getScreenCTM().inverse());
    show(dayPoints.reduce((best,q,i)=>Math.abs(q.x-p.x)<Math.abs(dayPoints[best].x-p.x)?i:best,0));
  });
  hit.addEventListener('focus',()=>show(day));hit.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
    show(e.key==='Home'?0:e.key==='End'?29:day+(e.key==='ArrowRight'?1:-1));
  });
  // La pointe accompagne le tracé à son entrée dans le cadre.
  const observer=new IntersectionObserver(([entry])=>{
    if(!entry.isIntersecting)return;
    observer.disconnect();host.dataset.revealed='';
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const start=performance.now(),clip=svg.querySelector('.overview-sweep');
    function tick(now){
      const k=Math.min(1,(now-start)/1450),p=line.getPointAtLength(len*(1-(1-k)**2));
      if(host.hasAttribute('data-explore')){clip.setAttribute('width',travel);return;}
      clip.setAttribute('width',Math.max(1,p.x-277));point.setAttribute('cx',p.x);point.setAttribute('cy',p.y);
      if(k<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  },{threshold:.12});observer.observe(host);
  return host;
}
