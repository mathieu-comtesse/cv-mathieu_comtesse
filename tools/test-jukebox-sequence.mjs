import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=await readFile(process.env.JUKEBOX_SOURCE||root+'js/jukebox.js','utf8');
const tracks=[{id:'A'},{id:'B'},{id:'C'}];
function fixture(){
 let time=0,taskId=0;const tasks=new Map(),listeners={},played=[],loads=[],states=[],calls=[];
 const elem=()=>({dataset:{},style:{},setAttribute(){},append(){},querySelector(){return null;}});
 const document={hidden:false,body:elem(),createElement:elem};
 const timer=(fn,delay,repeat=0)=>{const id=++taskId;tasks.set(id,{fn,at:time+delay,repeat});return id;};
 const controller={addListener:(n,f)=>listeners[n]=f,loadUri:u=>loads.push(u),play:()=>calls.push('play'),pause:()=>calls.push('pause'),togglePlay:()=>calls.push('toggle')};
 const sandbox={TRACKS:tracks,document,window:{},performance:{now:()=>time},MutationObserver:class{observe(){}},setTimeout:(f,d)=>timer(f,d),setInterval:(f,d)=>timer(f,d,d),clearTimeout:i=>tasks.delete(i),Math};
 vm.createContext(sandbox);
 vm.runInContext(source.replace(/^import .*;\s*/,'').replace('export function createJukebox','function createJukebox')+'\nthis.createJukebox=createJukebox;',sandbox);
 const api=sandbox.createJukebox({onTrack:i=>played.push(i),onState:s=>states.push(s)});
 const tick=ms=>{const target=time+ms;while(true){let first=null;for(const [id,t]of tasks)if(t.at<=target&&(!first||t.at<first[1].at))first=[id,t];if(!first)break;time=first[1].at;tasks.delete(first[0]);if(first[1].repeat)tasks.set(first[0],{...first[1],at:time+first[1].repeat});first[1].fn();}time=target;};
 const event=(data,track=api.playing)=>listeners.playback_update({data:{playingURI:'spotify:track:'+tracks[track].id,duration:180000,isPaused:false,isBuffering:false,...data}});
 api.play(0);sandbox.window.onSpotifyIframeApiReady({createController:(s,o,done)=>done(controller)});listeners.ready();
 return {api,event,tick,played,loads,states,calls,listeners,document};
}
const results=[];
{
 const f=fixture();f.api.next();const count=f.loads.length;f.listeners.ready();f.tick(500);assert.equal(f.loads.length,count);assert.equal(f.calls.at(-1),'play');
 results.push('Signal prêt du deuxième titre sans rechargement en boucle');
}
{
 const f=fixture();f.event({position:26000,duration:29713});f.tick(3000);f.event({position:29713,duration:29713});assert.equal(f.played.length,2);
 results.push('Position finale atteinte avec isPaused encore faux');
}
{
 const f=fixture();f.event({position:12500});f.tick(3000);f.event({position:12500,isPaused:true});f.tick(2000);
 assert.equal(f.played.length,2,'Une fin d’extrait à une position non standard doit enchaîner');
 results.push('Fin d’extrait sans durée cohérente');
}
{
 const f=fixture();f.event({position:29900,duration:30000});for(let i=0;i<12;i++){f.tick(1000);f.event({position:29900,duration:30000},0);}
 assert.equal(f.played.length,2);results.push('Dernière position répétée sans événement de pause');
}
{
 const f=fixture();f.event({position:170000});f.tick(3000);f.event({position:180000,isPaused:true});
 assert.equal(f.played.length,2);const next=f.api.playing;
 f.event({position:180000,isPaused:true},0);f.event({position:0,isPaused:true},0);f.tick(500);assert.equal(f.api.playing,next);
 results.push('Fin de titre complet et événements tardifs');
}
{
 const f=fixture();f.event({position:29000});f.api.toggle();f.event({position:29500});f.tick(1000);f.event({position:30000,isPaused:true});f.tick(60000);
 assert.equal(f.played.length,1);assert.equal(f.states.at(-1).paused,true);
 f.api.toggle();assert.equal(f.calls.at(-1),'play');f.event({position:30000,isPaused:true,duration:30000});f.tick(1500);assert.equal(f.played.length,2);
 results.push('Pause volontaire préservée et reprise');
}
{
 const f=fixture();f.event({position:8000});f.tick(3000);f.event({position:8000,isPaused:true,isBuffering:true});f.tick(25000);
 assert.equal(f.played.length,1);f.event({position:8500});f.tick(3000);assert.equal(f.played.length,1);
 results.push('Chargement temporaire sans saut de morceau');
}
{
 const f=fixture();f.tick(19000);assert.equal(f.played.length,2);assert.ok(f.calls.filter(c=>c==='play').length>=4);
 results.push('Relances et passage après un titre qui ne démarre pas');
}
{
 const f=fixture();f.api.next();f.api.toggle();const count=f.calls.length;f.tick(1000);assert.equal(f.calls.length,count);assert.equal(f.states.at(-1).paused,true);
 f.api.stop();f.tick(60000);assert.equal(f.played.length,2);
 results.push('Annulation des relances après pause ou arrêt');
}
{
 const f=fixture();for(let n=0;n<8;n++){const old=f.api.playing;f.event({position:29500,duration:30000});f.tick(3000);f.event({position:30000,duration:30000,isPaused:true});assert.notEqual(f.api.playing,old);}
 assert.equal(f.played.length,9);results.push('Huit enchaînements successifs sans répétition immédiate');
}
await mkdir(root+'../../outputs/v48-local',{recursive:true});await writeFile(root+'../../outputs/v48-local/music-behavior.json',JSON.stringify(results,null,2));
console.log('MUSIC_SEQUENCE_OK',JSON.stringify(results));
