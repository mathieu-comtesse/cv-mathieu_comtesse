// Panneau Teardown. Toutes les commandes sont utilisables au clavier et au pointeur.
const MODES = [
  ['assembled','Assemblé'],['exploded','Éclaté'],['section','Coupe'],
  ['xray','Rayons X'],['isolate','Isoler']
];
const esc = (s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountTeardownUI(machine,{onSeekTime=()=>{},onPause=()=>{}}={}) {
  const td=machine.teardown;
  if(!td)return {update(){},visibility(){},dispose(){}};
  const shell=document.createElement('aside');
  shell.className='rf-td';
  shell.setAttribute('aria-label','Inspection du mécanisme en trois dimensions');
  const scenarioButtons=td.snapshot(0).scenarios;
  shell.innerHTML=[
    '<div class="rf-td-top"><span class="rf-td-eyebrow">ENGINEERING / TEARDOWN</span><button type="button" data-td="collapse" aria-expanded="true" aria-label="Replier le panneau">−</button></div>',
    '<h2 class="rf-td-title">',esc(td.spec.title),'</h2>',
    '<div class="rf-td-inner">',
    '<p class="rf-td-intro">Explorez le mécanisme, ses sous-systèmes et ses situations de fonctionnement. Démonstration avec données fictives.</p>',
    '<div class="rf-td-label">VUE MÉCANIQUE</div>',
    '<div class="rf-td-modes" role="group" aria-label="Vue mécanique">',
    ...MODES.map(([k,v])=>'<button type="button" data-mode="'+k+'" aria-pressed="'+String(k==='assembled')+'">'+v+'</button>'),
    '</div><div class="rf-td-label">SOUS-SYSTÈMES</div>',
    '<div class="rf-td-areas" role="group" aria-label="Sous-système à inspecter">',
    ...td.spec.areas.map(([name],i)=>'<button type="button" data-area="'+i+'" aria-pressed="'+String(i===1)+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+esc(name)+'</button>'),
    '</div><div class="rf-td-detail" role="status" aria-live="polite"><strong></strong><p></p></div>',
    ...(scenarioButtons.length?[
      '<div class="rf-td-label">SIMULATION VM VRE</div>',
      '<div class="rf-td-scenarios" role="group" aria-label="Scénarios de traitement">',
      ...scenarioButtons.map(s=>'<button type="button" data-scenario="'+s.id+'" aria-pressed="'+String(s.id==='normal')+'">'+esc(s.label)+'</button>'),
      '</div><p class="rf-td-note" data-note></p>',
      '<div class="rf-td-readout" aria-live="off"><span data-reading></span></div>'
    ]:[]),
    '<div class="rf-td-bottom"><button type="button" data-td="tour" aria-pressed="false">Visite automatique</button><button type="button" data-td="pause" aria-pressed="false">Pause</button><button type="button" data-td="reset">Réinitialiser</button></div>',
    '<p class="rf-td-disclaimer">La visualisation décrit le fonctionnement du projet. Elle n’exécute pas les traitements métier ni les connexions SharePoint.</p>',
    '</div>'
  ].join('');
  document.body.append(shell);
  const $=s=>shell.querySelector(s);
  let paused=false,collapsed=false,lastKey='';
  const cancelTour=()=>{td.state.tour=false;$('[data-td="tour"]').setAttribute('aria-pressed','false');};
  shell.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.mode){cancelTour();td.setMode(b.dataset.mode);}
    if(b.dataset.area!=null){cancelTour();td.select(Number(b.dataset.area));td.setMode('isolate');}
    if(b.dataset.scenario){cancelTour();const seek=td.scenario(b.dataset.scenario);if(seek!=null)onSeekTime(seek);}
    if(b.dataset.td==='tour'){td.state.tour=!td.state.tour;b.setAttribute('aria-pressed',String(td.state.tour));}
    if(b.dataset.td==='pause'){paused=!paused;onPause(paused);b.textContent=paused?'Reprendre':'Pause';b.setAttribute('aria-pressed',String(paused));}
    if(b.dataset.td==='reset'){
      cancelTour();td.setMode('assembled');td.select(1);
      if(scenarioButtons.length){td.scenario('normal');onSeekTime(0);}
      if(paused){paused=false;onPause(false);$('[data-td="pause"]').textContent='Pause';}
    }
    if(b.dataset.td==='collapse'){
      collapsed=!collapsed;shell.classList.toggle('rf-td--collapsed',collapsed);
      b.textContent=collapsed?'+':'−';b.setAttribute('aria-expanded',String(!collapsed));
    }
    update(0);
  });
  const onKey=e=>{
    if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey||/input|textarea|select/i.test(e.target?.tagName||''))return;
    const mode=({e:'exploded',c:'section',x:'xray',i:'isolate'})[e.key.toLowerCase()];
    if(mode){cancelTour();td.setMode(mode);update(0);}
  };
  document.addEventListener('keydown',onKey);
  function update(time){
    const s=td.snapshot(time),key=s.mode+'|'+s.selected+'|'+s.scenario+'|'+s.tour;
    if(key!==lastKey){
      lastKey=key;
      shell.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===s.mode)));
      shell.querySelectorAll('[data-area]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.area)===s.selected)));
      shell.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===s.scenario)));
      $('[data-td="tour"]').setAttribute('aria-pressed',String(s.tour));
      $('.rf-td-detail strong').textContent=s.area[0];
      $('.rf-td-detail p').textContent=s.area[1];
      const scenario=s.scenarios.find(v=>v.id===s.scenario);
      if(scenario&&$('[data-note]'))$('[data-note]').textContent=scenario.note;
    }
    if(s.reading&&$('[data-reading]'))$('[data-reading]').textContent=s.reading;
  }
  function visibility(v){
    const n=Math.max(0,Math.min(1,v));
    shell.style.opacity=String(n);
    shell.style.pointerEvents=n<.16?'none':'auto';
    shell.setAttribute('aria-hidden',String(n<.16));
  }
  update(0);
  return {update,visibility,dispose(){document.removeEventListener('keydown',onKey);shell.remove();}};
}
