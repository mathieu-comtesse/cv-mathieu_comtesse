export function createPS1Sound(){
 let context,loading,muted=false,visible=true,ticket=0,menuWanted=false,menuSource,menuGain,actionVoice;
 const buffers={},levels={},voices=new Set();
 const state={ready:false,unlocked:false,muted:false,startupEvents:0,actionEvents:0,browserEvents:0,exitEvents:0,menu:false,levels};
 const files={startup:'ps1-boot-v50.mp3',action:'ps1-action-v50.mp3',browser:'ps1-browser-v50.mp3',exit:'ps1-exit-v50.mp3'};
 const menu=new Audio(new URL('../assets/ps1-menu-v50.mp3',import.meta.url));menu.loop=true;menu.preload='none';
 function gainFor(buffer){
  let sum=0,peak=0,count=0;
  for(let c=0;c<buffer.numberOfChannels;c++){const a=buffer.getChannelData(c);for(const v of a){sum+=v*v;peak=Math.max(peak,Math.abs(v));}count+=a.length;}
  const rms=Math.sqrt(sum/count)||1;
  // Consistent audible effects, bounded peaks; source recordings remain untouched.
  return Math.min(Math.pow(10,-27/20)/rms,Math.pow(10,-13/20)/(peak||1));
 }
 async function unlock(){
  context ||= new AudioContext();await context.resume();state.unlocked=context.state==='running';
  if(!menuSource){menuSource=context.createMediaElementSource(menu);menuGain=context.createGain();menuGain.gain.value=.75;menuSource.connect(menuGain);menuGain.connect(context.destination);}
  loading ||= Promise.all(Object.entries(files).map(async([key,file])=>{
   const r=await fetch(new URL('../assets/'+file,import.meta.url));if(!r.ok)throw Error('PS1 sound missing: '+key);
   buffers[key]=await context.decodeAudioData(await r.arrayBuffer());levels[key]=gainFor(buffers[key]);
  })).then(()=>{state.ready=true;});
  await loading;
 }
 const wake=()=>unlock().then(()=>{if(menuWanted&&!muted&&visible)startMenu();}).catch(e=>console.warn('[PS1 audio]',e.message));
 document.addEventListener('pointerdown',wake,{capture:true});document.addEventListener('keydown',wake,{capture:true});
 function play(key){
  if(muted||!visible||!buffers[key]||context?.state!=='running')return;
  if(key==='action'&&actionVoice){try{actionVoice.stop();}catch{}actionVoice=null;}
  const voice=context.createBufferSource(),gain=context.createGain();voice.buffer=buffers[key];gain.gain.value=levels[key];voice.connect(gain);gain.connect(context.destination);voices.add(voice);if(key==='action')actionVoice=voice;
  voice.onended=()=>{if(actionVoice===voice)actionVoice=null;voices.delete(voice);voice.disconnect();gain.disconnect();};voice.start();return voice;
 }
 function clearVoices(){for(const v of voices){try{v.stop();}catch{}}voices.clear();}
 function stopMenu(){menu.pause();state.menu=false;}
 function startMenu(){if(!menuWanted||muted||!visible)return;menu.play().then(()=>{state.menu=menuWanted&&!muted&&visible&&!menu.paused;if(!state.menu)menu.pause();}).catch(()=>{state.menu=false;});}
 function stop(){ticket++;menuWanted=false;stopMenu();clearVoices();}
 async function effect(key){const own=ticket;try{await unlock();if(own!==ticket)return;const voice=play(key);if(voice)state[key==='action'?'actionEvents':key==='browser'?'browserEvents':'exitEvents']++;}catch{}}
 return{state,unlock,stop,
  async powerOn(){
   const own=++ticket;menuWanted=false;stopMenu();clearVoices();
   try{await unlock();if(own!==ticket)return null;const v=play('startup');if(v)state.startupEvents++;return{duration:buffers.startup.duration,startedAt:performance.now()};}catch{return{duration:14.916,startedAt:performance.now()};}
  },
  powerOff(){stop();},
  openMenu(){menuWanted=false;stopMenu();effect('browser');},
  menu(on){menuWanted=!!on;if(!on)stopMenu();else wake();},
  action(){effect('action');},
  exit(){stop();effect('exit');},
  frame(active,isVisible=true){visible=isVisible;if(!visible){stopMenu();clearVoices();}else if(menuWanted&&!muted&&menu.paused)startMenu();},
  setMuted(on){muted=!!on;state.muted=muted;if(muted){clearVoices();stopMenu();}else if(menuWanted)wake();}
 };
}
