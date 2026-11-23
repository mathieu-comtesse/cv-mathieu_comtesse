import { ANNUAL_GAINS, ANNUAL_DECLARED, ANNUAL_TOTAL, ANNUAL_NET, ANNUAL_COST, ANNUAL_RATE, euroCoinRhythm } from './annual-gains.js?v=cv-scene-v61';

const format = (value, digits = 0) => value.toLocaleString('fr-FR', {maximumFractionDigits: digits});
const mean = (row, unit = 'Hours') => (row['min'+unit] + row['max'+unit])/2;
const totals = {declared: ANNUAL_DECLARED, total: ANNUAL_TOTAL, net: ANNUAL_NET};
const units = [['Hours', 'Heures'], ['Money', 'Euros']];
const unitOptions = units.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
const icons = {
  projection: 'M2 10V3m0 7h9M3.7 8l2.2-2.3 1.8 1.2L11 3.5',
  contribution: 'M2 11h10M3 9V6h1v3m2 0V3h1v6m2 0V5h1v4',
  method: 'M2.5 3v4l4.3 4.2 4.4-4.4L7 2.5H2.5zm2 1.5h.1',
  finance: 'M2 10V4l4-2 4 2v6H8V7H5v3z',
  vmvre: 'M2 2h4v4H2zm6 0h4v4H8zM2 8h4v4H2zm6 0h4v4H8z',
  moteur44: 'M2 5h10l-1-2H3zm1 2h8v5H3zm2 2h4',
  vre: 'M2 3h6l4 4-5 5-5-5zm2 2h.1',
  powerbi: 'M2 11h10M4 9V6m3 3V3m3 6V5',
  'pp-consultation': 'M6 2a4 4 0 100 8 4 4 0 000-8zm3 7 3 3',
  gares: 'M2 11h10V6L7 2 2 6zm3 0V7h4v4'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name]}"/></svg>`;
const construction = ANNUAL_COST.build + ANNUAL_COST.upkeep;

export function initGainsConsole(head) {
  head.innerHTML = `<section class="gains-chart" data-view="overview" aria-labelledby="gains-chart-title">
    <div class="gains-side"><div class="gains-chart-head"><h2 id="gains-chart-title">Une année de temps libéré</h2>
      <button type="button" class="gains-details-link">Voir les chiffres</button></div>
      <p class="gains-hint">Explore les heures libérées par mes outils de maintenance et de qualité, et leur valorisation à ${format(ANNUAL_RATE,2)} € par heure.</p></div>
    <div class="gains-overview"><div class="gains-console">
      <nav aria-label="Tableau de bord des gains"><strong>MC / gains</strong>
        <button type="button" data-pane="projection" aria-pressed="true">${icon('projection')}Projections</button>
        <button type="button" data-pane="contribution" aria-pressed="false">${icon('contribution')}Contributions</button>
        <button type="button" data-pane="method" aria-pressed="false">${icon('method')}Méthode</button><small>Mathieu Comtesse</small></nav>
      <div class="gains-console-body">
        <section data-panel="projection" aria-label="Projections">
          <div class="gains-console-top"><h3>Une année de temps libéré</h3><div class="gains-console-fields">
            <label>Périmètre<select data-scope><option value="declared">Volumes fournis</option><option value="total">Avec estimations</option><option value="net">Net · année 1</option></select></label>
            <label>Unité<select data-unit>${unitOptions}</select></label>
            <label>Courbe<select data-model><option value="linear">Cumul à rythme constant</option><option value="exp">Scénario exponentiel</option></select></label>
          </div>
          </div><div class="gains-console-chart">
          <span class="gains-console-chart-label">Projection annuelle</span>
          <header class="gains-console-total"><strong data-total></strong><span data-other></span></header>
          <div class="gains-console-probe">
          <svg class="gains-console-graph" viewBox="0 0 500 185" aria-hidden="true"></svg>
          <label class="gains-console-period">Mois <input data-month type="range" min="0" max="12" value="12" step="1"><output data-month-value></output></label>
          <aside class="gains-console-tip" aria-label="Détail de la projection" hidden>
            <strong><span aria-hidden="true">€</span> Temps valorisé</strong>
            <dl>
              <div><dt>Valeur annuelle</dt><dd data-tip-money></dd></div>
              <div><dt>Temps libéré</dt><dd data-tip-hours></dd></div>
              <div><dt>Base horaire</dt><dd>${format(ANNUAL_RATE,2)} €</dd></div>
              <div data-net-row><dt>Net en année 1</dt><dd data-tip-net></dd></div>
              <div><dt data-tip-month></dt><dd data-tip-gain></dd></div>
            </dl>
          </aside>
          </div>
          <p class="gains-console-status" data-amount role="status"></p>
          <p class="gains-console-note" data-projection-note></p>
          </div><div class="gains-console-projects" role="group" aria-label="Courbe par projet">
            <button type="button" data-project="" aria-pressed="true"><span>Tous les projets</span><strong data-project-total></strong></button>
            ${ANNUAL_GAINS.map(p=>`<button type="button" data-project="${p.id}" aria-pressed="false"><span class="gains-project-name"><i data-icon="${p.id}">${icon(p.id)}</i><span>${p.title}</span></span><strong>${format(mean(p),1)} h</strong><small data-estimated="${p.estimated}">${p.estimated?'Estimation':'Volume fourni'}</small></button>`).join('')}
          </div>
        </section>
        <section data-panel="contribution" aria-label="Contributions" hidden>
          <div class="gains-console-section-head"><h3>La part de chaque outil</h3>
            <label>Unité <select data-bars-unit>${unitOptions}</select></label></div>
          <div class="gains-console-rows">
            ${ANNUAL_GAINS.map(p=>`<details data-bar="${p.id}"><summary>
              <span class="gains-project-name"><i data-icon="${p.id}">${icon(p.id)}</i><span>${p.title}</span></span><strong data-bar-value></strong>
              <span class="gains-bar-track" aria-hidden="true"><i data-estimated="${p.estimated}"></i></span>
            </summary><p>${p.basis}. Fourchette : <span data-bar-range></span>.</p></details>`).join('')}
          </div><p class="gains-bar-legend"><span>Volumes fournis</span><span>Estimations</span></p>
        </section>
        <section data-panel="method" aria-label="Méthode" hidden>
          <h3>Méthode de calcul</h3>
          <ul>
            <li><strong>Valorisation.</strong> ${format(ANNUAL_RATE,2)} € par heure libérée.</li>
            <li><strong>Net année 1.</strong> Retire dès le départ ${format(ANNUAL_COST.build,1)} h de construction et ${format(ANNUAL_COST.upkeep,1)} h d’améliorations.</li>
            <li><strong>Projection.</strong> Le scénario exponentiel simule la montée en charge et garde le même total à douze mois.</li>
            <li><strong>Périmètre.</strong> Les trois estimations s’ajoutent aux volumes fournis. La chaîne des PP et le traitement PP &amp; MOSO comptent ensemble.</li>
            <li><strong>Hors total.</strong> CERFA, Studio d’extracteurs et Retrouver tout le suivi, faute de base annuelle confirmée.</li>
          </ul>
          <div class="gains-console-fields">
            <label>Jours travaillés/an<input type="number" min="1" max="366" step="1" value="225" data-days></label>
            <label>Heures/jour<input type="number" min="1" max="24" step=".5" value="7" data-hours></label>
          </div><p data-rhythm role="status"></p>
        </section>
      </div>
    </div></div>
  </section>`;
  const q = selector => head.querySelector(selector);
  const buttons = [...head.querySelectorAll('[data-pane]')], panels = [...head.querySelectorAll('[data-panel]')];
  const scope = q('[data-scope]'), unit = q('[data-unit]'), model = q('[data-model]'), month = q('[data-month]'), graph = q('.gains-console-graph');
  const projectButtons = [...head.querySelectorAll('[data-project]')], bars = [...head.querySelectorAll('[data-bar]')];
  const barsUnit = q('[data-bars-unit]'), probe = q('.gains-console-probe'), tip = q('.gains-console-tip');
  const tipMoney = q('[data-tip-money]'), tipHours = q('[data-tip-hours]'), tipNet = q('[data-tip-net]');
  const tipMonth = q('[data-tip-month]'), tipGain = q('[data-tip-gain]'), netRow = q('[data-net-row]');
  let project, pinned = false;
  const note = q('[data-projection-note]'), amount = q('[data-amount]');
  function show(view, focus = false) {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pane === view)));
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
    pinned = false;
    tip.hidden = true;
    if (focus) (project ? unit : scope).focus({preventScroll:true});
  }
  q('.gains-details-link').addEventListener('click', () => show('projection',true));
  buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.pane)));
  const width=430, x=step=>56+step*width/12, base=150;
  function refresh() {
    const key=project?'project':scope.value, selection=project||totals[key], currency=unit.value==='Money', exponential=model.value==='exp';
    const symbol=currency?'€':'h', digits=currency?0:1, end=mean(selection,unit.value);
    const formatValue=value=>format(value,digits)+' '+symbol;
    const start=key==='net'?-construction*(currency?ANNUAL_RATE:1):0;
    const gain=step=>start+(end-start)*(exponential?Math.expm1(2.4*step/12)/Math.expm1(2.4):step/12);
    const bound=Math.ceil(end/(currency?100000:1000))*(currency?100000:1000);
    const floor=start<0?-bound/4:0;
    const y=value=>base-(value-floor)/(bound-floor)*126;
    const d=Array.from({length:49},(_,i)=>(i?'L':'M')+x(i/4)+' '+y(gain(i/4))).join(' ');
    const selected=Number(month.value);
    graph.innerHTML=`<defs><linearGradient id="gains-console-gradient" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#7fd9de" stop-opacity=".5"/><stop offset="1" stop-color="#7fd9de" stop-opacity=".03"/></linearGradient></defs>
      ${Array.from({length:5},(_,i)=>{const v=bound*i/4;return `<path class="gains-console-grid" d="M56 ${y(v)} H486"/><text x="50" y="${y(v)+4}" text-anchor="end">${currency&&v?format(v/1000)+' k€':format(v)+' '+symbol}</text>`;}).join('')}
      <path d="${d} L486 ${y(floor)} H56 Z" fill="url(#gains-console-gradient)"/>
      <path class="gains-console-line" d="${d}"/>
      <path class="gains-console-guide" d="M${x(selected)} 16 V${base}"/>
      <circle cx="${x(selected)}" cy="${y(gain(selected))}" r="4.4" fill="#d6fcff"/>
      ${[0,3,6,9,12].map(i=>`<text x="${x(i)}" y="172" text-anchor="middle">${i===0?'Départ':i+' m.'}</text>`).join('')}`;
    q('[data-total]').textContent=formatValue(end)+' / an';
    q('[data-other]').textContent=format(mean(selection,currency?'Hours':'Money'),currency?1:0)+(currency?' h':' €');
    tipMoney.textContent=format(mean(selection,'Money'))+' €';
    tipHours.textContent=format(mean(selection),1)+' h';
    netRow.hidden=Boolean(project);
    tipNet.textContent=format(mean(ANNUAL_NET),1)+' h';
    tipMonth.textContent='Mois '+selected+' · cumul';
    tipGain.textContent=formatValue(gain(selected));
    q('[data-project-total]').textContent=format(mean(totals[scope.value]),1)+' h';
    q('[data-month-value]').textContent=selected+' / 12';
    month.setAttribute('aria-valuetext','Mois '+selected+' sur 12, '+formatValue(gain(selected)));
    amount.textContent='Mois '+selected+' · '+formatValue(gain(selected))+' cumulés';
    note.textContent=(exponential?'Simulation de montée en charge. Le total à 12 mois reste le même.':'Projection à rythme constant. Mois moyen : '+formatValue(end/12)+'.')+(key==='net'?' Le point de départ intègre les coûts.':'');
  }
  for (const button of projectButtons) button.addEventListener('click', () => {
    const selected=ANNUAL_GAINS.find(row => row.id===button.dataset.project);
    project=project===selected?undefined:selected;
    scope.disabled=Boolean(project);
    projectButtons.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.project===(project?.id||''))));
    refresh();
  });
  function drawBars() {
    const unit=barsUnit.value, digits=unit==='Money'?0:1, symbol=unit==='Money'?' €':' h';
    const max=Math.max(...ANNUAL_GAINS.map(row=>row['max'+unit]));
    bars.forEach((bar,index) => {
      const row=ANNUAL_GAINS[index];
      bar.querySelector('i').style.setProperty('--bar-length',(mean(row,unit)/max*100)+'%');
      bar.querySelector('[data-bar-value]').textContent=format(mean(row,unit),digits)+symbol;
      const min=row['min'+unit], high=row['max'+unit];
      bar.querySelector('[data-bar-range]').textContent=format(min,digits)+(min===high?'':' à '+format(high,digits))+symbol;
    });
  }
  barsUnit.addEventListener('input',drawBars);
  for (const control of [scope,unit,model,month]) control.addEventListener('input',refresh);
  function chooseMonth(event) {
    const matrix=graph.getScreenCTM();
    if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    if(point.x<46||point.x>495)return;
    const value=Math.min(12,Math.max(0,Math.round((point.x-56)/width*12)));
    if(Number(month.value)!==value){month.value=value;refresh();}
  }
  graph.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse')return;
    chooseMonth(event);
    tip.hidden=false;
  });
  graph.addEventListener('click',event=>{
    chooseMonth(event);
    pinned=!pinned;
    tip.hidden=!pinned;
  });
  month.addEventListener('focus',()=>{tip.hidden=false;});
  probe.addEventListener('pointerleave',()=>{if(!pinned&&document.activeElement!==month)tip.hidden=true;});
  month.addEventListener('blur',()=>{if(!pinned)tip.hidden=true;});
  probe.addEventListener('keydown',event=>{
    if(event.key==='Escape'){pinned=false;tip.hidden=true;}
  });
  const days=q('[data-days]'),hours=q('[data-hours]');
  function rhythm() {
    if(!days.value||!hours.value||!days.checkValidity()||!hours.checkValidity())return;
    q('[data-rhythm]').textContent='Rythme des pièces sur les volumes fournis · 1 € toutes les '+format(euroCoinRhythm(ANNUAL_DECLARED,+days.value,+hours.value).secondsPerEuro,2)+' s travaillées.';
  }
  days.addEventListener('input',rhythm);hours.addEventListener('input',rhythm);
  refresh();drawBars();rhythm();
}
