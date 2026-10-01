/* Mobile-only controller profiles. Pointer owners keep movement and actions independent. */
window.TalasMobileControls=(()=>{
  const icons={
    jump:'<path d="M4 27c0-7 3-13 8-17" stroke-dasharray="2 3"/><circle cx="20" cy="6" r="2.3" fill="currentColor" stroke="none"/><path d="m18 11-5 5 6 3 2 7m-3-15 4 4 5-5m-8 9-7 5-5-2"/>',
    slide:'<circle cx="24" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="m21 16-7 5-7-4m7 4 9 6h6m-15-6-6 6H3M3 11h7M2 14h5M2 30h28"/>',
    tornado:'<path d="M5 7c-5-5 27-6 24 0-2 5-24 5-23 0 1-2 14-3 18-1M6 14c4 4 19 4 22-1M9 19c3 3 14 3 17-1M12 24c3 2 9 2 11-1M16 27c6 5 7-1 5-1"/>',
    dive:'<circle cx="16" cy="23" r="2.3" fill="currentColor" stroke="none"/><path d="m16 19-5-6 3-8m-3 8-6-3m11 9 5-6 5-4M14 5l4-3M4 29l5-2m14 0 5 2M16 28v3"/>',
    guide:'<circle cx="11" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="23" cy="12" r="2" fill="currentColor" stroke="none"/><path d="m10 12-2 8 4 8m-4-8-5 8m7-16 7 4 5-7m1 8-3 5 4 7m-4-7-4 6m3-5-5-4"/>',
    stamp:'<path d="M6 23h20v6H6zM9 20h14l-4-6V7a3 3 0 0 0-6 0v7zM5 31h22"/>',
    slap:'<path d="M10 26 5 19c-1-3 1-4 3-2l3 3V7c0-3 4-3 4 0v9-10c0-3 4-3 4 0v10-8c0-3 4-3 4 0v9-6c0-3 4-3 4 0v11c0 5-4 8-8 8h-3zM3 10l3 2M5 4l2 3M28 3l-2 3"/>',
    enter:'<path d="M16 4h11v25H16M3 16h17m-5-5 5 5-5 5"/>',
    interact:'<path d="M8 26 3 20c-2-3 1-5 3-2l3 2V6c0-3 4-3 4 0v11l3-2c2-2 4-1 4 1l3-1c3 0 4 2 4 4v4c0 5-4 8-8 8h-4zM17 6h4m-2-2v4"/>',
    rotate:'<path d="M8 29V16c0-4 3-7 7-7h11v7H15v13zM4 10a13 13 0 0 1 15-7m0 0-2-3m2 3-4 2"/>',
    invest:'<circle cx="22" cy="9" r="6"/><path d="M22 6v6m-2-4h4M3 23l7-6h7c4 0 4 5 0 5h-5m5 0 8-4c4-2 5 2 2 5l-8 6H9l-6 2"/>',
    buzz:'<path d="M6 24c0-10 20-10 20 0M3 24h26v5H3zM10 6l2 4m10-4-2 4M16 3v5"/>',
    mic:'<rect x="12" y="3" width="8" height="15" rx="4"/><path d="M8 12v3a8 8 0 0 0 16 0v-3M16 23v6m-5 0h10M15 7h2m-2 4h2"/>',
    micLeft:'<rect x="13" y="5" width="7" height="14" rx="3.5"/><path d="M9 14v2a7.5 7.5 0 0 0 15 0v-2M16.5 24v5m-5 0h10M3 5v7m3-7v7"/>',
    micRight:'<rect x="11" y="5" width="7" height="14" rx="3.5"/><path d="M7 14v2a7.5 7.5 0 0 0 15 0v-2M14.5 24v5m-5 0h10M26 5v7m3-7v7"/>',
    document:'<path d="M7 3h13l6 6v21H7zM20 3v7h6M11 15h10m-10 5h10m-10 5h7"/>',
    send:'<path d="M3 5h13v22H3zM7 11h5m-5 5h5m9 4h10m-4-4 4 4-4 4"/>',
    view:'<path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16z"/><circle cx="16" cy="16" r="4"/>',
    pinch:'<path d="m8 3 6 17-6 9m16-26-6 17 6 9M14 20h4M8 29l3-1m13 1-3-1"/><circle cx="16" cy="27" r="2"/>',
    release:'<path d="m7 3 4 17-7 9m21-26-4 17 7 9M16 17v12m-4-4 4 4 4-4"/>',
    confirm:'<path d="m7 16 6 6 13-15"/><circle cx="16" cy="16" r="13"/>',
    continue:'<path d="M7 4v24l21-12z"/>',
    fist:'<path d="M6 16V9c0-3 4-3 4 0V7c0-3 4-3 4 0V6c0-3 4-3 4 0v1c0-3 4-3 4 0v7l3-2c3-1 5 2 3 4l-5 7v7H10v-7l-4-7zM10 9v6m4-8v8m4-8v8m4-1v4"/>',
    net:'<path d="M4 22 16 10m-2-2c3-5 12-7 15-4s1 12-4 15c-4 2-12-7-11-11zM18 7l9 7m-12-3 8 7m-3-13-4 11m8-12-5 14"/>',
    reset:'<path d="M7 8a12 12 0 1 1-3 11M7 2v7H1"/>',
    camera:'<path d="M5 9h5l2-4h8l2 4h5v20H5z"/><circle cx="16" cy="19" r="6"/>'
  };
  const svg=icon=>`<svg class="action-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${icons[icon]||icons.confirm}</svg>`;
  const action=(label,icon,key,extra={})=>({label,icon,key,...extra});
  const profiles={
    dialogue:{mode:'choices',actions:[action('SUITE','continue',null,{enabled:false})]},
    quai:{mode:'move',actions:[action('AGIR','interact','S')]},
    village:{mode:'cursor',actions:[action('ENTRER','enter',null,{cursor:'click'})]},
    parcours:{mode:'move',actions:[action('TORNADE','tornado','S'),action('PLONGEON','dive','D'),action('SAUT','jump','J')]},
    fuite:{mode:'move',axis:'horizontal',actions:[action('GUIDER','guide','S'),action('GLISSADE','slide','D'),action('SAUT','jump','J')]},
    attrape:{mode:'move',axis:'horizontal',actions:[action('ATTRAPER','net',null,{enabled:false})]},
    festin:{mode:'move',axis:'horizontal',actions:[action('TAPER','slap','D'),action('TAMPON','stamp','J')]},
    jetski:{mode:'move',axis:'horizontal',actions:[action('PLONGER','dive','D')]},
    tuyaux:{mode:'cursor',actions:[action('TOURNER','rotate',null,{cursor:'click'})]},
    poly:{mode:'cursor',actions:[action('ÉCART','stamp',null,{cursor:'click'})]},
    budget:{mode:'cursor',actions:[action('MESURE','invest',null,{cursor:'click'}),action('TRIMESTRE','continue',null,{panel:true})]},
    revue:{mode:'cursor',actions:[action('BUZZER','buzz',null)]},
    karaoke:{mode:'select',actions:[action('GAUCHE','micLeft',null),action('DROITE','micRight',null),action('CHANTER','mic',null)]},
    doc:{mode:'choices',actions:[action('FICHE','document',null),action('VUE','view',null),action('ENVOYER','send',null)]},
    combat:{mode:'choices',actions:[action('SUITE','continue',null,{enabled:false})]},
    operation:{mode:'cursor',speed:100,actions:[action('POSER','release',null,{cursor:'release'}),action('PINCER','pinch',null,{cursor:'hold'})]}
  };
  function create({pad,keys,pressed,mobile=false,getWorld=()=>null,sceneTarget=()=>document.querySelector('#cv')}){
    const joystick=pad.querySelector('#joystick'),stick=joystick.querySelector('.stick'),stem=joystick.querySelector('.shaft');
    const buttons=[...pad.querySelectorAll('.acts button')],frame=pad.parentElement;
    const aim=document.createElement('div');aim.id='mobile-aim';aim.hidden=true;aim.setAttribute('aria-hidden','true');
    aim.innerHTML='<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="9"/><path d="M16 1v8m0 14v8M1 16h8m14 0h8"/></svg>';frame.append(aim);
    const owners=new Map(),captures=new Map(),holds=new Map();
    const vector={x:0,y:0,magnitude:0,active:false},point={x:.5,y:.45};
    let joystickId=null,base='dialogue',options={},current=null,signature='',routing='',selection=0,choiceElements=[],direction='',repeat=0,virtualDown=false,lastTarget=null;
    function own(id,next){
      const before=new Set([...owners.values()].flat());
      if(next.length)owners.set(id,next);else owners.delete(id);
      const after=new Set([...owners.values()].flat());
      for(const k of new Set([...before,...after])){if(after.has(k)&&!before.has(k))pressed[k]=1;keys[k]=after.has(k)?1:0}
    }
    function clearVector(){vector.x=vector.y=vector.magnitude=0;vector.active=false;direction='';repeat=0;stick.style.transform='';if(stem)stem.style.transform=''}
    function target(){return options.target?.()||sceneTarget()}
    function eventAt(type){
      const t=lastTarget||target();if(!t?.isConnected)return;
      const r=t.getBoundingClientRect();t.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:10000,pointerType:'touch',isPrimary:true,clientX:r.left+point.x*r.width,clientY:r.top+point.y*r.height,button:0,buttons:type==='pointerup'?0:1}));
    }
    function releaseCursor(){if(virtualDown){eventAt('pointerup');virtualDown=false;lastTarget=null}}
    function cursor(kind){
      if(kind==='release'){releaseCursor();return}
      if(kind==='click'&&virtualDown)return;
      lastTarget=target();if(!lastTarget?.isConnected)return;
      virtualDown=true;eventAt('pointerdown');if(kind==='click')releaseCursor();
    }
    function reset(){
      releaseCursor();for(const h of holds.values())h.up?.();holds.clear();
      for(const id of [...owners.keys()])own(id,[]);joystickId=null;clearVector();
      for(const e of pad.querySelectorAll('.is-down'))e.classList.remove('is-down');
      for(const [id,e] of captures)if(e.hasPointerCapture(id))e.releasePointerCapture(id);captures.clear();
      for(const k of Object.keys(pressed))pressed[k]=0;
    }
    function use(name,opts={}){
      if(!mobile)return;reset();base=profiles[name]?name:'dialogue';options=opts;current=null;signature='';selection=0;choiceElements=[];point.x=.5;point.y=.45;sync();
    }
    const visible=e=>e?.isConnected&&!e.disabled&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    function choiceModel(root,name,els,go){
      const list=[...els].filter(visible);
      return {name,mode:'choices',root,choices:list,actions:[action(list.length>1?'VALIDER':'SUITE',name==='combat'&&list.length>1?'fist':list.length>1?'confirm':'continue',null,{enabled:()=>list.length>0||!!go,down:()=>{const e=choiceElements[selection];if(visible(e))e.click();else go?.()}})]};
    }
    function model(){
      const modal=document.querySelector('#modal');
      if(modal&&!modal.hidden)return choiceModel(modal,'menu',modal.querySelectorAll('button,input[type=submit]'));
      const card=document.querySelector('.tcard');
      if(card)return choiceModel(card,'menu',card.querySelectorAll('button'));
      const arena=document.querySelector('.arui .ap.bot');
      if(arena){const els=arena.querySelectorAll('button');return choiceModel(arena,'combat',els.length?els:[arena])}
      const panel=document.querySelector('#panel'),answers=panel?.querySelectorAll('#pact button');
      if(panel&&!panel.hidden&&answers.length&&!options.panelPassthrough?.())return choiceModel(panel,'dialogue',answers);
      const p=profiles[base],a=options.actions||p.actions;
      return {...p,...options,name:base,choices:options.choices?.(),actions:a};
    }
    function select(delta){
      if(current?.navigationAllowed?.()===false)return;
      if(current?.mode==='choices'&&choiceElements.length){selection=(selection+delta+choiceElements.length)%choiceElements.length;highlight()}
      else current?.onDirection?.(delta<0?'previous':'next');
    }
    function highlight(){
      choiceElements.forEach((e,i)=>e.classList.toggle('mobile-selected',i===selection));
      const e=choiceElements[selection];if(!visible(e))return;
      const scroller=e.closest('.pin,.ap,.mbody')||current?.root;
      if(scroller&&e!==scroller){const r=e.getBoundingClientRect(),s=scroller.getBoundingClientRect();if(r.bottom>s.bottom||r.top<s.top)e.scrollIntoView({block:'nearest',inline:'nearest'})}
    }
    function sync(){
      if(!mobile){pad.hidden=true;return}pad.hidden=false;
      const m=model(),els=[...(m.choices||[])].filter(visible);
      const sig=JSON.stringify([m.name,m.mode,m.actions.map(a=>[a.label,a.icon,a.key,a.cursor]),els.length]);
      const route=JSON.stringify([m.name,m.mode,m.axis,m.actions.map(a=>[a.key,a.cursor])]);
      if(signature!==sig||current?.root!==m.root){
        if(m.mode==='cursor'&&current?.name==='dialogue')document.querySelector('#panel .pin')?.scrollTo(0,0);
        choiceElements.forEach(e=>e.classList.remove('mobile-selected'));if(routing!==route||current?.root!==m.root)reset();routing=route;signature=sig;current=m;selection=0;choiceElements=els;
        pad.dataset.profile=m.name;pad.dataset.actions=m.actions.length;pad.dataset.axis=m.axis||'all';
        pad.setAttribute('aria-label','Commandes mobiles : '+m.name);
        buttons.forEach((b,i)=>{
          const a=m.actions[i];b.hidden=!a;b.classList.toggle('primary',!!a&&i===m.actions.length-1);if(!a)return;
          b.innerHTML=svg(a.icon)+`<span class="action-label">${a.label}</span>`;b.setAttribute('aria-label',a.label);
          b.classList.toggle('primary',i===m.actions.length-1);b.classList.toggle('cool',a.icon==='slide'||a.icon==='dive');
        });
      }else{
        current=m;
        if(els.some((e,i)=>e!==choiceElements[i])){choiceElements.forEach(e=>e.classList.remove('mobile-selected'));choiceElements=els;selection=Math.min(selection,Math.max(0,els.length-1))}
      }
      buttons.forEach((b,i)=>{const a=m.actions[i];if(!a)return;b.disabled=a.enabled===false||(typeof a.enabled==='function'&&!a.enabled())||(a.panel&&!visible(document.querySelector('#panel:not([hidden]) #pact button')))||(m.mode==='choices'&&!els.length&&!a.down)});
      highlight();aim.hidden=m.mode!=='cursor';
    }
    function move(e){
      const r=joystick.getBoundingClientRect(),radius=r.width*.24;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
      if(current?.axis==='horizontal')y=0;
      const length=Math.hypot(x,y);if(length>radius){x*=radius/length;y*=radius/length}
      stick.style.transform=`translate(calc(-50% + ${x/r.width*100/.44}%),calc(-50% + ${y/r.height*100/.44}%))`;
      if(stem)stem.style.transform=`translate(calc(-50% + ${x/r.width*100/.46*.32}%),calc(-50% + ${y/r.height*100/.46*.32}%))`;
      const distance=Math.hypot(x,y),magnitude=Math.min(1,Math.max(0,(distance/radius-.12)/.88));
      vector.x=distance?x/distance*magnitude:0;vector.y=distance?y/distance*magnitude:0;vector.magnitude=magnitude;vector.active=true;
      const next=[];
      if(current?.mode==='move'&&magnitude>.25){if(Math.abs(vector.x)>.3)next.push(x<0?'L':'R');if(Math.abs(vector.y)>.3)next.push(y<0?'U':'D')}
      own(e.pointerId,next);
    }
    function stopJoystick(e){
      if(e.pointerId!==joystickId)return;e.stopPropagation();own(e.pointerId,[]);captures.delete(e.pointerId);joystickId=null;clearVector();joystick.classList.remove('is-down');
    }
    joystick.addEventListener('pointerdown',e=>{
      if(!mobile||joystickId!==null)return;e.preventDefault();e.stopPropagation();sync();
      joystickId=e.pointerId;joystick.setPointerCapture(e.pointerId);captures.set(e.pointerId,joystick);joystick.classList.add('is-down');move(e);
    });
    joystick.addEventListener('pointermove',e=>{if(e.pointerId===joystickId){e.preventDefault();e.stopPropagation();move(e)}});
    for(const t of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(t,stopJoystick);
    function pressAction(i,id){
      const a=current?.actions[i];if(!a||buttons[i].disabled)return;
      const already=[...holds.values()].some(h=>h.action===a);holds.set(id,{action:a,up:a.up});
      if(a.key)own(id,[a.key]);
      if(already)return;
      if(a.cursor)cursor(a.cursor);
      else if(a.panel)document.querySelector('#panel:not([hidden]) #pact button')?.click();
      else a.down?.();
    }
    function liftAction(i,e){
      const h=holds.get(e.pointerId);if(!h)return;e.stopPropagation();holds.delete(e.pointerId);own(e.pointerId,[]);captures.delete(e.pointerId);
      const others=[...holds.values()].some(v=>v.action===h.action);if(!others){h.up?.();if(h.action.cursor==='hold')releaseCursor();buttons[i].classList.remove('is-down')}
    }
    buttons.forEach((b,i)=>{
      b.addEventListener('pointerdown',e=>{if(!mobile)return;e.preventDefault();e.stopPropagation();sync();if(b.disabled)return;b.setPointerCapture(e.pointerId);captures.set(e.pointerId,b);b.classList.add('is-down');pressAction(i,e.pointerId)});
      for(const t of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(t,e=>liftAction(i,e));
      b.addEventListener('click',e=>{if(e.detail===0&&mobile){sync();const id='keyboard-'+i;pressAction(i,id);liftAction(i,{pointerId:id,stopPropagation(){}})}});
    });
    function step(dt){
      if(!mobile)return;sync();current.onMove?.(vector,dt);
      if(current.mode==='cursor'){
        const t=target(),r=t?.getBoundingClientRect();
        if(r?.width&&r.height){const speed=current.speed||220;point.x=Math.max(.02,Math.min(.98,point.x+vector.x*speed*dt/r.width));point.y=Math.max(.02,Math.min(.98,point.y+vector.y*speed*dt/r.height));
          const f=frame.getBoundingClientRect();aim.style.left=(r.left-f.left+point.x*r.width)/f.width*100+'%';aim.style.top=(r.top-f.top+point.y*r.height)/f.height*100+'%';if(virtualDown)eventAt('pointermove')}
      }
      if(current.mode==='choices'||current.mode==='select'){
        const d=vector.magnitude>.45?(Math.abs(vector.y)>Math.abs(vector.x)?Math.sign(vector.y):Math.sign(vector.x)):0;
        repeat-=dt;if(d&&(direction!==d||repeat<=0)){select(d);repeat=direction===d ? .28 : .42}direction=d;
      }
    }
    function setAction(mode){
      if(!mobile||base!=='quai')return;
      const enter=mode==='enter';options.actions=[action(enter?'ENTRER':'AGIR',enter?'enter':'interact','S')];
    }
    new MutationObserver(()=>{if(mobile&&pad.hidden)pad.hidden=false}).observe(pad,{attributes:true,attributeFilter:['hidden']});
    addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});pad.addEventListener('contextmenu',e=>e.preventDefault());
    sync();return {reset,vector,use,step,setAction,svg,get profile(){return base},get selection(){return selection}};
  }
  return {create,icons,svg,profiles};
})();
