import { createRoom } from './room.js?v=motion-arrival-v12';
import { initUI } from './ui.js?v=bf01a16';
import { initTheme } from './theme.js?v=bf01a16';
import { initHome } from './home.js?v=bf01a16';
initUI();
initTheme();

const host = document.getElementById('room');
const bubble = document.getElementById('bubble');
let roomRef = null;
initHome();
createRoom(host, bubble).then((room) => { window.room = room; roomRef = room; }).catch((e) => {
  console.error(e);
  host.insertAdjacentHTML('beforeend', '<p class="hint">La pièce 3D ne peut pas s’afficher sur cet appareil.</p>');
});
