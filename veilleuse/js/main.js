import {Game} from './game.js';
const g=new Game();window.veil=g;
g.init().catch(e=>{console.error(e);document.getElementById('loading').innerHTML='<span style="color:#e88">Erreur WebGL : '+(e.message||e)+'</span>'});
