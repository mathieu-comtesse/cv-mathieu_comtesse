import { createRoom } from './room.js?v=cv-scene-v22';
import { initUI } from './ui.js?v=cv-scene-v18';
import { initTheme } from './theme.js?v=bf01a16';
import { initHome } from './home.js?v=cv-scene-v22';
initUI();
initTheme();

const host = document.getElementById('room');
const bubble = document.getElementById('bubble');
let roomRef = null;
const muteButton=document.getElementById('scene-mute');
let sceneMuted=false;
try { sceneMuted=localStorage.getItem('scene-muted')==='1'; } catch {}
const refreshMute=()=>{muteButton.setAttribute('aria-pressed',String(sceneMuted));muteButton.setAttribute('aria-label',sceneMuted?'Activer les sons de la scène':'Couper les sons de la scène');muteButton.title=sceneMuted?'Sons de la scène coupés':'Sons de la scène actifs';muteButton.querySelector('.mute-slash').style.display=sceneMuted?'':'none';roomRef?.setSceneMuted(sceneMuted);};
muteButton.addEventListener('click',()=>{sceneMuted=!sceneMuted;try{localStorage.setItem('scene-muted',sceneMuted?'1':'0');}catch{}refreshMute();});
refreshMute();
document.addEventListener('project-workshop',event=>{if(event.detail.open)roomRef?.pauseAutonomy(3600000);else roomRef?.pauseAutonomy(18000);});
initHome();
createRoom(host, bubble).then((room) => { window.room = room; roomRef = room; refreshMute(); }).catch((e) => {
  console.error(e);
  host.insertAdjacentHTML('beforeend', '<p class="hint">La pièce 3D ne peut pas s’afficher sur cet appareil.</p>');
});
