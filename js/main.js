import { createRoom } from './room.js?v=3cff226';
import { initUI } from './ui.js?v=3cff226';
import { initTheme } from './theme.js?v=3cff226';
import { initHome } from './home.js?v=3cff226';
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
