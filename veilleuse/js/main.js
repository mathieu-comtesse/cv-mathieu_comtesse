import {Game} from './game.js';
// Grain tramé Bayer 8x8 réutilisé par les fonds de menu.
try{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d'),d=x.createImageData(8,8);
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){const a=i,b=j^i,v=((b&1)<<5)|((a&1)<<4)|((b&2)<<2)|((a&2)<<1)|((b&4)>>1)|((a&4)>>2),o=(j*8+i)*4;d.data[o]=d.data[o+1]=d.data[o+2]=255;d.data[o+3]=v*4}
  x.putImageData(d,0,0);document.documentElement.style.setProperty('--bayer',`url(${c.toDataURL()})`)}catch(e){}
const g=new Game();window.veil=g;
g.init().catch(e=>{console.error(e);document.getElementById('loading').innerHTML='<span style="color:#e88">Erreur WebGL : '+(e.message||e)+'</span>'});
