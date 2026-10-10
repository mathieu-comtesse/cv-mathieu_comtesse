export function createPS1Sound(){
 let context,loading,muted=false,visible=true,held=false,bootTicket=0,loopVoice;
 const buffers={},voices=new Set(),state={ready:false,unlocked:false,muted:false,joystick:false,buttonEvents:0,startupEvents:0};
 const files={joystick:'ps1-joystick-v49.mp3',button:'ps1-button-v49.mp3',startup:'ps1-startup-v49.mp3'};
 async function unlock(){
  context ||= new AudioContext();await context.resume();state.unlocked=context.state==='running';
  loading ||= Promise.all(Object.entries(files).map(async([key,file])=>{const r=await fetch(new URL('../assets/'+file,import.meta.url));if(!r.ok)throw Error('PS1 sound missing');buffers[key]=await context.decodeAudioData(await r.arrayBuffer());})).then(()=>{state.ready=true;});
  await loading;
 }
 const wake=()=>unlock().catch(e=>console.warn('[PS1 audio]',e.message));
 document.addEventListener('pointerdown',wake,{capture:true});document.addEventListener('keydown',wake,{capture:true});
 function play(key,volume,delay=0,loop=false){
  if(muted||!visible||!buffers[key]||context?.state!=='running')return;
  const voice=context.createBufferSource(),gain=context.createGain();voice.buffer=buffers[key];voice.loop=loop;gain.gain.value=volume;voice.connect(gain);gain.connect(context.destination);voices.add(voice);
  voice.onended=()=>{voices.delete(voice);voice.disconnect();gain.disconnect();};voice.start(context.currentTime+delay);return voice;
 }
 const stopLoop=()=>{if(loopVoice){try{loopVoice.stop();}catch{}loopVoice=null;}state.joystick=false;};
 function stop(){bootTicket++;stopLoop();for(const voice of voices){try{voice.stop();}catch{}}voices.clear();}
 return {state,unlock,stop,
  async powerOn(){const ticket=++bootTicket;if(muted||!visible)return;try{await unlock();if(ticket!==bootTicket||muted||!visible)return;stopLoop();if(play('button',.07))state.buttonEvents++;if(play('startup',.045,.18))state.startupEvents++;}catch{}},
  powerOff(){stop();},
  frame(active,isVisible=true,music=false){visible=isVisible;held=active;if(!visible){stop();return;}if(muted||!held){stopLoop();return;}if(!loopVoice){loopVoice=play('joystick',music?.015:.025,0,true);state.joystick=!!loopVoice;}},
  setMuted(on){muted=!!on;state.muted=muted;if(muted)stop();}
 };
}
