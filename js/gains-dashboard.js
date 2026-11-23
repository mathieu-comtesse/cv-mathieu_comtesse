import { initPiggyBank } from './piggy-bank.js?v=cv-scene-v69';
import { initGainsConsole } from './gains-console.js?v=4';
import { createGainsOverview } from './gains-overview.js?v=4';
import { ANNUAL_GAINS, ANNUAL_DECLARED, ANNUAL_TOTAL, ANNUAL_NET, ANNUAL_COST, HOURS_PER_FTE, euroCoinRhythm } from './annual-gains.js?v=cv-scene-v61';

const f = (n, digits = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits });
const mean = (t, unit = 'Money') => (t['min' + unit] + t['max' + unit]) / 2;
const projected = (item, fraction, unit = 'Money') => item.id === 'net'
  ? mean(ANNUAL_DECLARED, unit) * fraction - (mean(ANNUAL_DECLARED, unit) - mean(item.total, unit))
  : mean(item.total, unit) * fraction;
const range = (t, unit, digits = 2) => f(t['min' + unit], digits) + (t['min' + unit] === t['max' + unit] ? '' : ' à ' + f(t['max' + unit], digits));
const NS = 'http://www.w3.org/2000/svg';
const svgNode = (tag, attrs, text) => {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (text) el.textContent = text;
  return el;
};
const notes = {
  finance: 'Une seule amélioration du Point financier, deux mois après sa mise en service.',
  vmvre: 'VM : 30 min, Q18 : 15 min, extraction : 25 min, sur les mêmes 4 000 à 5 000 rapports. Total : 70 min libérées par rapport ; l’extraction reste une capacité théorique.',
  moteur44: 'VM, Q18 et extraction portent sur les mêmes rapports et sur trois tâches distinctes : 70 min libérées par rapport au total.',
  vre: 'Capacité théorique de l’extracteur ; cette estimation n’entre pas dans le total en tête de page.',
  powerbi: 'PP & MOSO est compté une seule fois : la carte « Chaîne des PP » n’est pas ajoutée séparément. Un outil est amélioré chaque mois pendant une demi-journée.',
  'pp-consultation': '40 consultations par jour supposées : une estimation, distincte du traitement des plans.',
  gares: '20 à 30 consultations par jour supposées, de 10 à 15 min chacune : une estimation.'
};
const costNote = '7 outils construits en 25,5 jours de 7 h (178,5 h), essais auprès des équipes compris. Améliorations : 42 h/an pour un outil (une demi-journée par mois), plus 3,5 h pour l’unique amélioration du Point financier, deux mois après sa mise en service. Total : 45,5 h. VM, Q18, Extracteur VRE, Gares prioritaires et chaîne des PP : autonomes, sans maintenance.';
const excludedNote = 'CERFA : pénalités applicables, non-conformités remontées et audit national sur les fluides frigorigènes sont des résultats sans montant annuel. CERFA, Studio et Retrouver tout le suivi n’ajoutent aucun montant faute de base annuelle confirmée ; ils sont aussi exclus du coût retenu ici.';

export function initGainsDashboard() {
  const head = document.querySelector('#work > .strip-head');
  if (!head) return;
  head.classList.add('gains-heading');
  const embedded=head.closest('[data-no-piggy]')!==null;
  if (embedded) { initGainsConsole(head); return; }
  head.innerHTML = `<div class="annual-gains"><div class="annual-pig-wrap"></div>
    <div class="gains-intro"><span class="gains-eyebrow">Du temps rendu aux équipes</span><h1>Les gains, en clair.</h1>
    <p>Du temps libéré, valorisé à 104,74 €/h.</p></div>
    <div class="gains-stats"><div><strong>${f(mean(ANNUAL_DECLARED))} €</strong><span>par an · volumes fournis</span></div>
    <div><strong>${f(mean(ANNUAL_DECLARED, 'Hours'))} h</strong><span>${f(mean(ANNUAL_DECLARED, 'Hours') / HOURS_PER_FTE, 1)} postes équivalents</span></div>
    <div><strong data-rhythm-short>15,03 s</strong><span>par pièce de 1 €</span></div></div>
    <section class="gains-chart" aria-labelledby="gains-chart-title"><div class="gains-side"><div class="gains-chart-head"><h2 id="gains-chart-title">Une année de temps libéré</h2>
    ${embedded ? '<button type="button" class="gains-details-link">Voir les chiffres</button>' : ''}<div class="gains-switch" role="group" aria-label="Vue du graphique"><button type="button" data-view="overview" aria-pressed="true">Vue d’ensemble</button><button type="button" data-view="year" aria-pressed="false">Projections</button><button type="button" data-view="projects" aria-pressed="false">Contributions</button><button type="button" data-view="method" aria-pressed="false">Méthode</button></div></div>
    <p class="gains-hint">Survole une courbe · touche-la · ou explore avec Tab et les flèches.</p>
    <div class="gains-metric"><span>Volumes fournis</span><strong>${f(mean(ANNUAL_DECLARED, 'Hours'))} h</strong><small>${f(mean(ANNUAL_DECLARED))} € valorisés par an</small></div>
    <div class="gains-legend" aria-label="Légende"></div></div>
    <div class="gains-plot"><svg class="gains-svg" viewBox="0 0 800 370" aria-label="Gains annuels, courbes linéaires de projection"></svg>
    <div class="gains-tip" id="gains-tip" role="status" aria-live="polite" hidden></div></div>

    <div class="gains-method"><p class="gains-method-explanation">La projection annuelle répartit le temps libéré de façon linéaire. Le mois moyen correspond à un douzième du total annuel. Le net en première année déduit les heures de conception et d’amélioration.</p><label>Jours/an <input data-working-days type="number" min="1" max="366" step="1" value="225"></label><label>Heures/jour <input data-working-hours type="number" min="1" max="24" step="0.5" value="7"></label><span data-coin-rate></span></div>
    </section></div>`;
  const box = head.querySelector('.annual-gains'), svg = box.querySelector('svg'), tip = box.querySelector('.gains-tip');
  const legend = box.querySelector('.gains-legend');
  const chart=box.querySelector('.gains-chart');
  const reveal=new IntersectionObserver(([entry])=>{
    if(entry.isIntersecting){chart.dataset.visible='';reveal.disconnect();}
  },{threshold:.18});
  reveal.observe(chart);
  let config = { days: 225, hours: 7 };
  try { const s = JSON.parse(localStorage.getItem('cv-piggy-work-basis-v1')); if (s&&Number.isInteger(s.days)&&Number.isInteger(s.hours*2)&&s.days >= 1 && s.days <= 366 && s.hours >= 1 && s.hours <= 24) config = s; } catch {}
  /* en chemin 3D (accueil) le bloc est réparti en cadres : repli sur la page, hors copies inertes */
  const cherche = sel => box.querySelector(sel) || [...document.querySelectorAll(sel)].find(el => !el.closest('[inert]'));
  const days = box.querySelector('[data-working-days]'), hours = box.querySelector('[data-working-hours]');
  days.value = config.days; hours.value = config.hours;
  function rhythm() {
    if (!days.checkValidity() || !hours.checkValidity() || +days.value < 1 || +hours.value < 1) return;
    config = { days: +days.value, hours: +hours.value };
    const r = euroCoinRhythm(ANNUAL_DECLARED, config.days, config.hours);
    cherche('[data-rhythm-short]').textContent = f(r.secondsPerEuro, 2) + ' s';
    cherche('[data-coin-rate]').textContent = 'Rythme des pièces · 1 € / ' + f(r.secondsPerEuro, 2) + ' s';
    try { localStorage.setItem('cv-piggy-work-basis-v1', JSON.stringify(config)); } catch {}
  }
  for(const event of ['input','change']){days.addEventListener(event,rhythm);hours.addEventListener(event,rhythm);} rhythm();
  initPiggyBank(box.querySelector('.annual-pig-wrap'));
  const subjectObserver=new IntersectionObserver(([entry])=>document.body.classList.toggle('gains-subject-visible',entry.isIntersecting));
  subjectObserver.observe(box.querySelector('.annual-pig-wrap'));
  addEventListener('pagehide',()=>subjectObserver.disconnect(),{once:true});
  const series = [
    { id: 'declared', title: 'Volumes fournis', total: ANNUAL_DECLARED, color: '#b8f5ff', note: 'Le total en tête de page compte uniquement les volumes fournis. Heures cumulées entre tâches et équipes, et non temps de travail d’une seule personne. Un poste = 225 jours de 7 h. Les gains quotidiens reposent sur 225 jours/an. Les montants valorisent du temps libéré, sans encaissement. L’effet cascade réduit aussi l’attente, les recherches et les ressaisies entre équipes ; aucun multiplicateur n’est appliqué.' },
    { id: 'total', title: 'Avec estimations', total: ANNUAL_TOTAL, color: '#ad9ce8', dashed: true, note: 'Ajoute la capacité théorique de l’extracteur VRE et les consultations supposées de PP & MOSO et Gares prioritaires. Ces estimations restent séparées des volumes fournis.' },
    { id: 'net', title: 'Net · année 1', total: ANNUAL_NET, color: '#83d8c3', note: costNote }
  ];
  let view = 'overview', pinned = false;
  const hide = () => { if (!pinned) { tip.hidden = true; svg.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active')); } };
  function show(item, fraction, index, el) {
    const t = item.total, annual = view === 'year';
    svg.querySelectorAll('.is-active').forEach(n => n.classList.remove('is-active')); el.classList.add('is-active');
    const r = euroCoinRhythm(ANNUAL_DECLARED, config.days, config.hours);
    const detail = item.id === 'declared' ? item.note + ' Rythme de 1 € : ' + f(r.meanMoney) + ' € ÷ ' + f(r.workingSeconds) + ' secondes travaillées/an. Les réglages changent le rythme des pièces uniquement.' : item.note;
    tip.innerHTML = `<span class="gains-tip-kicker">${item.title}${annual ? ' · mois ' + f(fraction * 12, 1) + ' / 12' : item.estimated ? ' · estimé' : ' · volumes fournis'}</span><strong>${f(projected(item, fraction))} € <small>· ${f(projected(item, fraction, 'Hours'), 1)} h</small></strong><p>${annual ? 'Projection linéaire · moyenne de la fourchette annuelle.' : item.basis}</p><p>Fourchette annuelle : ${range(t, 'Hours')} h · ${range(t, 'Money')} €.</p><p>${detail}</p>${item.id === 'net' ? '<p>Le net retire ' + f(ANNUAL_COST.build + ANNUAL_COST.upkeep) + ' h aux volumes fournis dès le départ dans cette projection ; ce tracé ne décrit pas le calendrier réel des dépenses.</p>' : ''}${item.id === 'total' || item.id === 'gares' ? '<p>' + excludedNote + '</p>' : ''}`;
    const close=document.createElement('button');close.type='button';close.className='gains-tip-close';close.setAttribute('aria-label','Fermer le détail');close.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';close.addEventListener('click',()=>{pinned=false;hide();});tip.prepend(close);
    tip.hidden = false;
    const dot=svg.querySelector('.gains-probe');
    if(dot){
      const p=el.getPointAtLength(el.getTotalLength()*fraction);
      dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);
      dot.setAttribute('fill',item.color);
    }
  }
  function interactive(path, item, index) {
    let fraction = 1;
    path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button'); path.setAttribute('aria-describedby', 'gains-tip');
    path.setAttribute('aria-label', item.title + ' : ' + range(item.total, 'Money') + ' euros par an. Flèches pour explorer, Échap pour fermer.');
    path.dataset.series = item.id;
    path.addEventListener('pointerenter', () => { pinned = false; show(item, fraction, index, path); });
    path.addEventListener('pointermove', e => { if (view === 'year') { fraction = projectionPoint(e).fraction; } show(item, fraction, index, path); });
    path.addEventListener('click', () => { pinned = true; show(item, fraction, index, path); });
    path.addEventListener('focus', () => show(item, fraction, index, path));
    path.addEventListener('blur', hide);
    path.addEventListener('keydown', e => {
      if (e.key === 'Escape') { pinned = false; hide(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = true; show(item, fraction, index, path); }
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); fraction = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : Math.max(0, Math.min(1, fraction + (e.key === 'ArrowLeft' ? -1 : 1) / 12)); show(item, fraction, index, path); }
    });
    svg.append(path);
  }
  function render() {
    pinned = false; tip.hidden = true; svg.replaceChildren(); legend.replaceChildren();
    chart.dataset.view=view;
    if(view==='method'){
      chart.querySelector('h2').textContent='Méthode de calcul';
      chart.querySelector('.gains-hint').textContent='Valorisation du temps libéré à 104,74 € par heure.';
      return;
    }
    if(view==='overview'){
      chart.querySelector('h2').textContent='Une année de temps libéré';
      chart.querySelector('.gains-hint').textContent='Explore les heures libérées par mes outils de maintenance et de qualité, et leur valorisation à 104,74 € par heure.';
      return;
    }
    chart.querySelector('.gains-hint').textContent='Survole une courbe ou explore les valeurs avec les flèches.';
    const mobile=box.clientWidth<600, width=mobile?360:800, start=mobile?44:66, end=mobile?344:766;
    svg.setAttribute('viewBox',`0 0 ${width} ${view==='projects'&&mobile?530:370}`);
    const items = view === 'year' ? series : ANNUAL_GAINS.map(r => ({ ...r, total: r, color: r.estimated ? '#12834c' : '#00869a', dashed: r.estimated, note: notes[r.id] }));
    chart.dataset.view=view;
    const legends = view === 'year' ? series : [{ title: 'Volumes fournis', color: '#00869a' }, { title: 'Estimations', color: '#12834c' }];
    legends.forEach(s => { const span = document.createElement('span'); span.innerHTML = `<i style="--line:${s.color};border-top-style:${s.dashed ? 'dashed' : 'solid'}"></i>${s.title}`; legend.append(span); });
    chart.querySelector('h2').textContent = view === 'year' ? 'Une année de temps libéré' : 'La part de chaque action';
    if (view === 'year') {
      const max = 1000000, y = v => 322 - v / max * 282;
      [0, 250000, 500000, 750000, 1000000].forEach(v => { svg.append(svgNode('line', { x1: start, x2: end, y1: y(v), y2: y(v), class: 'gains-grid' })); svg.append(svgNode('text', { x: start-12, y: y(v) + 4, 'text-anchor': 'end' }, v === 1000000 ? '1 M€' : f(v / 1000) + ' k€')); });
      ['Jan.', 'Avr.', 'Juil.', 'Oct.', '31 déc.'].forEach((m, i) => svg.append(svgNode('text', { x: start + i * (end-start)/4, y: 356, 'text-anchor': 'middle' }, m)));
      const defs=svgNode('defs',{}), gradient=svgNode('linearGradient',{id:'gains-area',x1:0,y1:0,x2:0,y2:1});
      gradient.append(svgNode('stop',{offset:0,'stop-color':'#8ee8fb','stop-opacity':.36}),svgNode('stop',{offset:1,'stop-color':'#8ee8fb','stop-opacity':0}));
      defs.append(gradient);
      svg.append(defs);
      const traces=svgNode('g',{class:'gains-reveal'});
      svg.append(traces);
      items.forEach((s, i) => {
        const end = projected(s, 1);
        const d = `M${start} ${y(projected(s, 0))} L${mobile?344:766} ${y(end)}`;
        if(i===0)traces.append(svgNode('path',{d:`${d} L${mobile?344:766} 322 H${start} Z`,fill:'url(#gains-area)'}));
        traces.append(svgNode('path', { d, stroke: s.color, class: 'gains-line', 'stroke-dasharray': s.dashed ? '5 4' : '' }));
        interactive(svgNode('path', { d, class: 'gains-hit', stroke: s.color }), s, i);
        traces.append(svgNode('circle', { cx: mobile?344:766, cy: y(end), r: i===0?5:3, fill: s.color, stroke:'#264140', 'stroke-width':1 }));
      });
      svg.append(svgNode('circle',{class:'gains-probe',r:6,stroke:'#fff','stroke-width':2,'pointer-events':'none'}));
    } else {
      const max = 275000, baseline=mobile?440:318, plotHeight=mobile?367:255;
      const y=value=>baseline-value/max*plotHeight;
      const bars=svgNode('g',{class:'gains-columns'});
      for(const value of [0,100000,200000]){
        svg.append(svgNode('line',{x1:start,x2:end,y1:y(value),y2:y(value),class:'gains-grid'}));
        svg.append(svgNode('text',{x:start-8,y:y(value)+4,'text-anchor':'end'},f(value/1000)+' k€'));
      }
      svg.append(bars);
      const step=(end-start)/items.length, barWidth=Math.min(32,step*.38);
      items.forEach((s,i)=>{
        const x=start+(i+.5)*step, mid=y(mean(s.total));
        bars.append(svgNode('rect',{x:x-barWidth/2,y:mid,width:barWidth,height:baseline-mid,rx:3,fill:s.color}));
        bars.append(svgNode('line',{x1:x,x2:x,y1:y(s.minMoney),y2:y(s.maxMoney),stroke:s.estimated?'#7bd59e':'#7ae3e9','stroke-width':3}));
        bars.append(svgNode('circle',{cx:x,cy:mid,r:3,fill:'#fff'}));
        svg.append(svgNode('text',{x,y:baseline+24,'text-anchor':'middle'},String(i+1).padStart(2,'0')));
        interactive(svgNode('path',{d:'M'+x+' '+Math.min(y(s.maxMoney),baseline-16)+' V'+baseline,class:'gains-hit',stroke:s.color}),s,i);
      });
    }
  }
  const switches=[...chart.querySelectorAll('.gains-switch button')];
  const details=chart.querySelector('.gains-details-link');
  const overview=createGainsOverview({declared:ANNUAL_DECLARED,projects:ANNUAL_GAINS,net:ANNUAL_NET,select:id=>navigate(id),embedded});
  chart.append(overview);
  function selectView(id){
    view=id;
    switches.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));
    render();
  }
  function navigate(id){
    if(id===view)return;
    selectView(id);
    if(id==='overview'&&embedded)overview.querySelector('[data-go="overview"]').focus({preventScroll:true});
    else switches.find(button=>button.dataset.view===id)?.focus({preventScroll:true});
  }
  details?.addEventListener('click',()=>navigate('year'));
  switches.forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
  box.querySelector('.gains-plot').addEventListener('pointerleave', hide);
  // Choisir la courbe la plus proche, même lorsque les zones de survol du brut et du net se chevauchent.
  function projectionPoint(event){
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const mobile=svg.viewBox.baseVal.width===360,start=mobile?44:66,span=mobile?300:700;
    return {point,span,fraction:Math.max(0,Math.min(1,(point.x-start)/span))};
  }
  function nearestCurve(event,pin=false){
    if(view!=='year')return;
    const {point,span,fraction}=projectionPoint(event);
    const choices=series.map((item,index)=>{
      const total=projected(item,1)-projected(item,0),y=322-projected(item,fraction)/1000000*282;
      return {item,index,distance:Math.abs(point.y-y)/Math.hypot(1,total/1000000*282/span)};
    }).sort((a,b)=>a.distance-b.distance);
    if(choices[0].distance>20)return;
    const {item,index}=choices[0];pinned=pin;show(item,fraction,index,svg.querySelector('[data-series="'+item.id+'"]'));
  }
  svg.addEventListener('pointermove',event=>nearestCurve(event));
  svg.addEventListener('click',event=>nearestCurve(event,true));
  tip.addEventListener('pointerenter', () => { pinned = true; });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.gains-plot')) { pinned = false; hide(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { pinned = false; hide(); } });
  render();
  let previousMobile=box.clientWidth<600;
  new ResizeObserver(()=>{const mobile=box.clientWidth<600;if(mobile!==previousMobile){previousMobile=mobile;render();}}).observe(box);
}
