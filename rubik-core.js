// Sticker coordinates define legal face permutations. No hand-written color swaps.
export const FACE_COLORS=['#cf422e','#ed9331','#f5c74d','#faf8ee','#246d52','#255891'];
export const FACES=['R','L','U','D','F','B'];
export const SLOTS=[];
for(let f=0;f<6;f++){const axis=Math.floor(f/2),sign=f%2?-1:1;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const p=[0,0,0],n=[0,0,0];p[axis]=sign;n[axis]=sign;p[(axis+1)%3]=a;p[(axis+2)%3]=b;SLOTS.push({p,n,face:f});}}
const key=(p,n)=>p.join(',')+'|'+n.join(',');
const lookup=new Map(SLOTS.map((s,i)=>[key(s.p,s.n),i]));
export const MOVES=FACES.flatMap(f=>[f,f+"'"]);
export const SOLVED=SLOTS.map(s=>s.face).join('');
export const inverse=m=>m.endsWith("'")?m[0]:m+"'";
export function moveInfo(m){const f=FACES.indexOf(m[0]),axis=Math.floor(f/2),sign=f%2?-1:1;return{axis,sign,quarter:-sign*(m.endsWith("'")?-1:1)};}
function rotate(v,axis,q){const a=(axis+1)%3,b=(axis+2)%3,r=[...v];r[a]=-q*v[b];r[b]=q*v[a];return r;}
export const PERMS=Object.fromEntries(MOVES.map(m=>{const {axis,sign,quarter}=moveInfo(m);return[m,SLOTS.map(s=>s.p[axis]===sign?lookup.get(key(rotate(s.p,axis,quarter),rotate(s.n,axis,quarter))):lookup.get(key(s.p,s.n)))];}));
export function applyMove(state,move){const out=Array(54);PERMS[move].forEach((dest,src)=>out[dest]=state[src]);return out.join('');}
export function applyMoves(state,moves){return moves.reduce(applyMove,state);}
export function reduceHistory(moves){const out=[];for(const m of moves){if(out.at(-1)===inverse(m))out.pop();else out.push(m);}return out;}
// Exact shortest path in the quarter-turn graph, with at most 3 layers per side.
export function shortestPath(state,maxDepth=6){if(state===SOLVED)return{moves:[],visited:1};let fronts=[[state],[SOLVED]],maps=[new Map([[state,[]]]),new Map([[SOLVED,[]]])],visited=2;
 for(let layer=0;layer<maxDepth;layer++){const side=layer%2,other=1-side,next=[];for(const s of fronts[side]){const path=maps[side].get(s);for(const move of MOVES){if(path.length&&move===inverse(path.at(-1)))continue;const target=applyMove(s,move);if(maps[side].has(target))continue;const p=[...path,move];maps[side].set(target,p);visited++;const opposite=maps[other].get(target);if(opposite){const start=side===0?p:opposite,end=side===0?opposite:p;return{moves:[...start,...end.slice().reverse().map(inverse)],visited};}next.push(target);}}fronts[side]=next;}
 return{moves:null,visited};
}
