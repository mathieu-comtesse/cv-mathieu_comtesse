// The supplied recording contains several real pump strokes. Reuse two clean
// segments on the same 1.05 s clock as the piston, without playing its long gaps.
export function createPumpSound(url){
 let context=null,buffer=null,loading=null,muted=false,lastKey='',wanted=false;
 const voices=new Set(),state={ready:false,unlocked:false,playing:0,events:0,muted:false};
 function stop(){for(const voice of voices){try{voice.stop();}catch{}}voices.clear();state.playing=0;}
 async function unlock(){
  context ||= new AudioContext();await context.resume();state.unlocked=context.state==='running';
  loading ||= fetch(url).then(r=>{if(!r.ok)throw Error('Pump audio missing');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(b=>{buffer=b;state.ready=true;}).catch(e=>console.warn('[Pump sound]',e));
  await loading;
 }
 const wake=()=>{unlock().catch(e=>console.warn('[Pump sound]',e));};
 // Any gesture on the page may unlock scene effects, including the music button.
 document.addEventListener('pointerdown',wake,{capture:true});document.addEventListener('keydown',wake,{capture:true});
 function frame(active,time,cycling,visible=true){
  wanted=active&&cycling&&visible&&!muted;
  if(!wanted){lastKey='';stop();return;}
  const stage=time<5.8?time:Math.max(0,time-7.2),stroke=Math.floor(stage/1.05),phase=(stage%1.05)/1.05;
  const half=phase>=.66?1:phase>=.13?0:-1,key=(time<5.8?'front:':'rear:')+stroke+':'+half;
  if(half<0||key===lastKey)return;lastKey=key;
  if(!buffer||context?.state!=='running')return;
  const voice=context.createBufferSource(),gain=context.createGain();voice.buffer=buffer;gain.gain.value=.45;voice.connect(gain);gain.connect(context.destination);voices.add(voice);state.playing=voices.size;state.events++;
  voice.onended=()=>{voices.delete(voice);state.playing=voices.size;voice.disconnect();gain.disconnect();};
  voice.start(0,half===0?.15:.70,half===0?.34:.27);
 }
 return{frame,stop,unlock,state,setMuted(on){muted=!!on;state.muted=muted;if(muted)stop();}};
}
