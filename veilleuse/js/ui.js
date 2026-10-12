import {PALETTES} from './palettes.js';
const $=id=>document.getElementById(id);
const toCss=c=>'#'+c.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');

export class UI{
  constructor(){
    this.el={hud:$('hud'),flame:$('flame'),fill:$('flame-fill'),goals:$('goals'),tide:$('tide'),tideFill:$('tide-fill'),tideLabel:$('tide-label'),prompt:$('prompt'),arrow:$('arrow'),toast:$('toast'),speech:$('speech'),title:$('titlecard'),fade:$('fade'),menu:$('menu'),pause:$('pause'),settings:$('settings'),map:$('map'),journal:$('journal'),ending:$('ending'),loading:$('loading'),coords:$('coords')};
    this.queue=[];this.speaking=false;this.toastT=0;this.typeT=0;
  }
  theme(id){const r=PALETTES[id].ramps[0],root=document.documentElement.style;r.forEach((c,i)=>root.setProperty('--c'+i,toCss(c)));root.setProperty('--warm',toCss(PALETTES[id].ramps[1][4]))}
  hudShow(on){this.el.hud.hidden=!on}
  setFlame(v){this.el.fill.style.width=Math.max(0,Math.min(100,v))+'%';this.el.flame.classList.toggle('low',v<25)}
  setGoals(lines){const h=lines.map(l=>`<div class="${l.done?'done':''}">${l.html}</div>`).join('');if(h!==this._g){this._g=h;this.el.goals.innerHTML=h}}
  setPrompt(t){if(t===this._p)return;this._p=t;this.el.prompt.hidden=!t;if(t)this.el.prompt.innerHTML=t}
  setTide(frac,label,on){this.el.tide.hidden=!on;if(on){this.el.tideFill.style.transform=`scaleY(${frac.toFixed(3)})`;this.el.tideLabel.textContent=label}}
  toast(t,ms=4200){const e=this.el.toast;e.textContent=t;e.classList.add('on');clearTimeout(this.toastT);this.toastT=setTimeout(()=>e.classList.remove('on'),ms)}
  arrow(on,angle,label,dist){const a=this.el.arrow;a.hidden=!on;if(!on)return;const r=Math.min(innerHeight,innerWidth)*.2;a.style.transform=`translate(${Math.sin(angle)*r}px,${-Math.cos(angle)*r}px)`;a.querySelector('svg').style.transform=`rotate(${angle}rad)`;a.querySelector('span').textContent=`${label} ${Math.round(dist)} m`}
  // Texte machine à écrire. File d'attente : plusieurs messages s'enchaînent sans se piétiner.
  speak(who,text,hold=5200){this.queue.push({who,text,hold});if(!this.speaking)this.nextSpeech()}
  nextSpeech(){
    const s=this.queue.shift();const sp=this.el.speech;
    if(!s){this.speaking=false;sp.hidden=true;return}
    this.speaking=true;sp.hidden=false;sp.querySelector('.who').textContent=s.who||'';
    const t=sp.querySelector('.txt');t.textContent='';let i=0;const ms=Math.max(18,Math.min(34,2200/s.text.length));
    clearInterval(this.typeT);this.typeT=setInterval(()=>{t.textContent=s.text.slice(0,++i);if(i>=s.text.length){clearInterval(this.typeT);this.hideT=setTimeout(()=>this.nextSpeech(),s.hold+s.text.length*18)}},ms);
  }
  skipSpeech(){clearInterval(this.typeT);clearTimeout(this.hideT);this.nextSpeech()}
  clearSpeech(){this.queue.length=0;clearInterval(this.typeT);clearTimeout(this.hideT);this.speaking=false;this.el.speech.hidden=true}
  titleCard(h,p,ms=4200){const e=this.el.title;e.querySelector('h1').textContent=h;e.querySelector('p').textContent=p;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),ms)}
  fade(on,ms=900){this.el.fade.style.transitionDuration=ms+'ms';this.el.fade.classList.toggle('on',on);return new Promise(r=>setTimeout(r,ms))}
  show(id,on=true){this.el[id].hidden=!on}
  loaded(){this.el.loading.classList.add('off')}
}
