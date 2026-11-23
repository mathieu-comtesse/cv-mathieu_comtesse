import { ANNUAL_GAINS, ANNUAL_DECLARED, ANNUAL_TOTAL, ANNUAL_NET, ANNUAL_COST, ANNUAL_RATE, euroCoinRhythm } from './annual-gains.js?v=cv-scene-v61';

const format = (value, digits = 0) => value.toLocaleString('fr-FR', {maximumFractionDigits: digits});
const mean = (row, unit = 'Hours') => (row['min'+unit] + row['max'+unit])/2;
const totals = {declared: ANNUAL_DECLARED, total: ANNUAL_TOTAL, net: ANNUAL_NET};
const construction = ANNUAL_COST.build + ANNUAL_COST.upkeep;

export function initGainsConsole(head) {
  head.innerHTML = `<section class="gains-chart" data-view="overview" aria-labelledby="gains-chart-title">
    <div class="gains-side"><div class="gains-chart-head"><h2 id="gains-chart-title">Une année de temps libéré</h2>
      <button type="button" class="gains-details-link">Voir les chiffres</button></div>
      <p class="gains-hint">Explore les heures libérées par mes outils de maintenance et de qualité, et leur valorisation à ${format(ANNUAL_RATE,2)} € par heure.</p></div>
    <div class="gains-overview"><div class="gains-console">
      <nav aria-label="Tableau de bord des gains"><strong>MC / gains</strong>
        <button type="button" data-pane="projection" aria-pressed="true">Projections</button>
        <button type="button" data-pane="contribution" aria-pressed="false">Contributions</button>
        <button type="button" data-pane="method" aria-pressed="false">Méthode</button></nav>
      <div class="gains-console-body">
        <section data-panel="projection" aria-label="Projections">
          <div class="gains-console-fields">
            <label>Périmètre<select data-scope><option value="declared">Volumes fournis</option><option value="total">Avec estimations</option><option value="net">Net · année 1</option></select></label>
            <label>Unité<select data-unit><option value="Hours">Heures</option><option value="Money">Euros</option></select></label>
            <label>Courbe<select data-model><option value="linear">Cumul à rythme constant</option><option value="exp">Scénario exponentiel</option></select></label>
          </div>
          <header class="gains-console-total"><strong data-total></strong><span data-other></span></header>
          <svg class="gains-console-graph" viewBox="0 0 500 185" aria-hidden="true"></svg>
          <label class="gains-console-period">Mois <input data-month type="range" min="0" max="12" value="12" step="1"><output data-month-value></output></label>
          <p class="gains-console-status" data-amount role="status"></p>
          <p class="gains-console-note" data-projection-note></p>
        </section>
        <section data-panel="contribution" aria-label="Contributions" hidden>
          <h3>La part de chaque outil</h3><div class="gains-console-rows">
          ${ANNUAL_GAINS.map(p=>`<details><summary><span>${p.title}</span><strong>${format(mean(p),1)} h</strong><small>${p.estimated?'Estimation':'Volume fourni'}</small></summary>
          <p>${p.basis}. Fourchette annuelle de ${format(p.minHours,1)} à ${format(p.maxHours,1)} h, soit ${format(p.minMoney)} à ${format(p.maxMoney)} €.</p></details>`).join('')}
          </div>
        </section>
        <section data-panel="method" aria-label="Méthode" hidden>
          <h3>Méthode de calcul</h3>
          <p>Valorisation du temps libéré à ${format(ANNUAL_RATE,2)} €/h. Le montant traduit des heures de travail rendues aux équipes.</p>
          <p>Le net en première année déduit ${format(ANNUAL_COST.build,1)} h de construction et ${format(ANNUAL_COST.upkeep,1)} h d’améliorations. La projection déduit ces heures dès le départ.</p>
          <p>Le scénario exponentiel illustre une montée en charge avec le même total au mois 12. Les estimations de l’extracteur VRE, de la consultation PP &amp; MOSO et des gares sont regroupées dans « Avec estimations ».</p>
          <p>CERFA, Studio d’extracteurs et Retrouver tout le suivi sont hors total annuel faute de base chiffrée confirmée. La chaîne des PP et le traitement PP &amp; MOSO sont comptés ensemble.</p>
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
  const scope = q('[data-scope]'), unit = q('[data-unit]'), model = q('[data-model]'), month = q('[data-month]'), graph = q('svg');
  const note = q('[data-projection-note]'), amount = q('[data-amount]');
  function show(view, focus = false) {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pane === view)));
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
    if (focus) scope.focus({preventScroll:true});
  }
  q('.gains-details-link').addEventListener('click', () => show('projection',true));
  buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.pane)));
  const width=430, x=step=>56+step*width/12, base=150;
  function refresh() {
    const key=scope.value, selection=totals[key], currency=unit.value==='Money', exponential=model.value==='exp';
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
    q('[data-month-value]').textContent=selected+' / 12';
    month.setAttribute('aria-valuetext','Mois '+selected+' sur 12, '+formatValue(gain(selected)));
    amount.textContent='Mois '+selected+' · '+formatValue(gain(selected))+' cumulés';
    note.textContent=(exponential?'Simulation de montée en charge. Le total à 12 mois reste le même.':'Projection à rythme constant. Mois moyen : '+formatValue(end/12)+'.')+(key==='net'?' Le point de départ intègre les coûts.':'');
  }
  for (const control of [scope,unit,model,month]) control.addEventListener('input',refresh);
  function chooseMonth(event) {
    const matrix=graph.getScreenCTM();
    if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    if(point.x<46||point.x>495)return;
    const value=Math.min(12,Math.max(0,Math.round((point.x-56)/width*12)));
    if(Number(month.value)!==value){month.value=value;refresh();}
  }
  graph.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')chooseMonth(event);});
  graph.addEventListener('click',chooseMonth);
  const days=q('[data-days]'),hours=q('[data-hours]');
  function rhythm() {
    if(!days.value||!hours.value||!days.checkValidity()||!hours.checkValidity())return;
    q('[data-rhythm]').textContent='Rythme des pièces sur les volumes fournis · 1 € toutes les '+format(euroCoinRhythm(ANNUAL_DECLARED,+days.value,+hours.value).secondsPerEuro,2)+' s travaillées.';
  }
  days.addEventListener('input',rhythm);hours.addEventListener('input',rhythm);
  refresh();rhythm();
}
