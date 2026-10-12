// Ambiance entièrement procédurale (Web Audio) : pluie, vent, mer, nappe, cloches, pas, tonnerre. Aucun fichier à charger.
export class Audio{
  constructor(){this.ctx=null;this.vol=.7;this.muted=false;this.layers={};this.region=null}
  start(){
    if(this.ctx)return;
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const ctx=this.ctx=new C();
    this.master=ctx.createGain();this.master.gain.value=this.vol;this.master.connect(ctx.destination);
    const ir=ctx.createBuffer(2,ctx.sampleRate*3,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.6)}
    this.rev=ctx.createConvolver();this.rev.buffer=ir;this.revGain=ctx.createGain();this.revGain.gain.value=.5;this.rev.connect(this.revGain);this.revGain.connect(this.master);
    const nb=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),nd=nb.getChannelData(0);let b0=0,b1=0,b2=0;
    for(let i=0;i<nd.length;i++){const w=Math.random()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.05;nd[i]=(b0+b1+b2+w*.18)*.2}
    this.noise=nb;
    const loop=(type,f,q)=>{const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||.7;const g=ctx.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(this.master);s.start();return {g,fl,s}};
    this.layers.rain=loop('highpass',1400);const rl=ctx.createBiquadFilter();rl.type='lowpass';rl.frequency.value=8000;
    this.layers.wind=loop('bandpass',420,.9);this.layers.sea=loop('lowpass',650);
    // nappe : trois triangles désaccordés
    const pad=ctx.createGain();pad.gain.value=0;const pf=ctx.createBiquadFilter();pf.type='lowpass';pf.frequency.value=700;pf.connect(pad);pad.connect(this.master);pad.connect(this.rev);
    this.pad={g:pad,oscs:[0,1,2].map(i=>{const o=ctx.createOscillator();o.type='triangle';o.frequency.value=110;o.detune.value=(i-1)*7;const og=ctx.createGain();og.gain.value=.3;o.connect(og);og.connect(pf);o.start();return o})};
    this.lfo=ctx.createOscillator();this.lfo.frequency.value=.12;const lg=ctx.createGain();lg.gain.value=.25;this.lfo.connect(lg);this.lfoG=lg;this.lfo.start();
    lg.connect(this.layers.sea.g.gain);
    this.nextBell=ctx.currentTime+4;
    this.setRegion(this.region||'forest');
  }
  setVolume(v){this.vol=v;if(this.master)this.master.gain.value=this.muted?0:v}
  mute(m){this.muted=m;if(this.master)this.master.gain.value=m?0:this.vol}
  ramp(p,v,t=2){if(!this.ctx)return;p.cancelScheduledValues(this.ctx.currentTime);p.setTargetAtTime(v,this.ctx.currentTime,t/3)}
  setRegion(id){
    this.region=id;if(!this.ctx)return;
    const base={forest:{wind:.12,sea:0,pad:.05,root:98,scale:[0,3,5,7,10]},crystal:{wind:.22,sea:0,pad:.07,root:110,scale:[0,2,4,7,9]},shore:{wind:.14,sea:.5,pad:.05,root:123.5,scale:[0,2,5,7,9]}}[id];
    this.cfg=base;this.ramp(this.layers.wind.g.gain,base.wind);this.ramp(this.layers.sea.g.gain,base.sea>0?.25:0);this.seaBase=base.sea;this.ramp(this.pad.g.gain,base.pad,3);
    this.pad.oscs.forEach((o,i)=>o.frequency.setTargetAtTime(base.root*[1,1.5,2][i],this.ctx.currentTime,.5));
    this.ramp(this.lfoG.gain,base.sea>0?.2:0);
  }
  setRain(i){if(!this.ctx)return;this.ramp(this.layers.rain.g.gain,.22*i,1.2);this.layers.rain.fl.frequency.value=1000+600*i}
  tick(dt,{tide=0,wading=0}={}){if(!this.ctx)return;
    if(this.ctx.currentTime>this.nextBell&&this.cfg){const n=this.cfg.scale[Math.floor(Math.random()*5)]+(Math.random()<.4?12:0);this.bell(this.cfg.root*2*Math.pow(2,n/12),.05);this.nextBell=this.ctx.currentTime+6+Math.random()*10}
    if(this.cfg?.sea)this.ramp(this.layers.sea.fl.frequency,450+380*tide,1)}
  tone(f,t0,dur,vol,type='sine',rv=.6){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g);g.connect(this.master);const r=c.createGain();r.gain.value=rv;g.connect(r);r.connect(this.rev);o.start(t0);o.stop(t0+dur+.1)}
  bell(f,v=.06){if(!this.ctx)return;const t=this.ctx.currentTime;this.tone(f,t,3.2,v,'sine',1);this.tone(f*2.76,t,1.4,v*.3,'sine',1)}
  burst(f,dur,vol,type='bandpass',q=1.2){if(!this.ctx)return;const c=this.ctx,s=c.createBufferSource();s.buffer=this.noise;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();const t=c.currentTime;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(this.master);s.start(t,Math.random()*2);s.stop(t+dur+.05)}
  step(surface='soil'){this.burst(surface==='water'?900:surface==='sand'?700:300+Math.random()*120,.09,surface==='water'?.12:.07,surface==='water'?'highpass':'lowpass',.8)}
  chime(kind){if(!this.ctx)return;const t=this.ctx.currentTime,r=this.cfg?.root||110;
    const seq={light:[0,7,12,16,19],relic:[12,16,19,24],foyer:[0,7,12],gate:[0,5,7,12,17,24],mirror:[12],fail:[0,-3,-8],solve:[0,4,7,12,16]}[kind]||[0];
    seq.forEach((n,i)=>this.tone(r*2*Math.pow(2,n/12),t+i*(kind==='mirror'?0:.12),kind==='fail'?1.6:2.4,.07,kind==='fail'?'triangle':'sine',.9))}
  thunder(){if(!this.ctx)return;setTimeout(()=>{this.burst(90,2.6,.55,'lowpass',.7);this.burst(180,1.4,.3,'lowpass',.7)},400+Math.random()*1200)}
  ending(){if(!this.ctx)return;[0,4,7,12,16,19,24].forEach((n,i)=>this.tone(110*Math.pow(2,n/12),this.ctx.currentTime+i*.5,6,.06,'sine',1))}
}
