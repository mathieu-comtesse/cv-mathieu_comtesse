import { createRoom } from './room.js?v=c08daaf';
import { initUI } from './ui.js?v=c08daaf';
import { initTheme } from './theme.js?v=c08daaf';
import { initHome } from './home.js?v=c08daaf';
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
