/* Commandes tactiles partagées des jeux : des boutons qui envoient au jeu les mêmes événements clavier que les touches
   physiques (code + key), maintenus tant que le doigt reste appuyé. Affichées seulement sur écran tactile.
   <script src="touchpad.js" data-target="#canvas" data-left='[["◀","KeyA","q","Tourner"],…]' data-right='[…]'></script>
   Chaque bouton : [libellé, code, key, nom accessible]. data-target : élément qui reçoit les événements (body par défaut). */
(()=>{const me=document.currentScript,read=k=>{try{return JSON.parse(me.dataset[k]||'[]');}catch(_){return[];}};
  const css=`.tpad{position:fixed;left:0;right:0;bottom:0;z-index:40;display:none;justify-content:space-between;align-items:flex-end;gap:12px;padding:10px max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));pointer-events:none}
  .tpad-group{display:grid;grid-auto-flow:column;gap:8px;pointer-events:auto}
  .tpad-group.is-cross{grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,52px);grid-auto-flow:row}
  .tpad button{min-width:52px;min-height:52px;padding:0 10px;font:600 15px/1 "JetBrains Mono",monospace;border:1.5px solid #1e1e1e;background:rgba(254,254,254,.9);color:#1e1e1e;box-shadow:2px 2px 0 #1e1e1e;border-radius:0;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
  .tpad button.is-down{background:#1e1e1e;color:#fefefe;transform:translate(2px,2px);box-shadow:none}
  @media (hover:none),(pointer:coarse){.tpad{display:flex}}`;
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
  const pad=document.createElement('div');pad.className='tpad';pad.setAttribute('aria-label','Commandes tactiles');
  const target=()=>document.querySelector(me.dataset.target||'body')||document.body;
  const send=(type,code,key)=>target().dispatchEvent(new KeyboardEvent(type,{code,key,bubbles:true,cancelable:true}));
  const group=(items,cross)=>{const g=document.createElement('div');g.className='tpad-group'+(cross?' is-cross':'');
    items.forEach(it=>{if(!it){g.append(document.createElement('span'));return;}const [label,code,key,name]=it,b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',name||label);
      let held=false;const down=e=>{e.preventDefault();if(held)return;held=true;b.classList.add('is-down');try{b.setPointerCapture(e.pointerId);}catch(_){}send('keydown',code,key);};
      const up=()=>{if(!held)return;held=false;b.classList.remove('is-down');send('keyup',code,key);};
      b.addEventListener('pointerdown',down);['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,up));b.addEventListener('contextmenu',e=>e.preventDefault());g.append(b);});return g;};
  const add=()=>{pad.append(group(read('left'),me.dataset.cross==='left'),group(read('right'),me.dataset.cross==='right'));document.body.append(pad);};
  document.body?add():addEventListener('DOMContentLoaded',add);
})();
