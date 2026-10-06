import * as THREE from './three.module.js';
import {SLOTS,FACES,FACE_COLORS,MOVES,PERMS,SOLVED,applyMove,applyMoves,inverse,moveInfo,reduceHistory} from './rubik-core.js';
const $=id=>document.getElementById(id),canvas=$('cube-canvas'),host=$('cube-view');
let state=SOLVED,history=[],busy=false,searching=false,selected='U',solution=[],searchId=0;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0xfaf8f1,1);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(5.8,4.8,6.5);camera.lookAt(0,0,0);scene.add(new THREE.HemisphereLight(0xffffff,0xb3a383,3));const lamp=new THREE.DirectionalLight(0xffffff,2);lamp.position.set(5,8,6);scene.add(lamp);
const cube=new THREE.Group(),pivot=new THREE.Group();scene.add(cube);cube.add(pivot);const parts=[],stickers=[];
for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const box=new THREE.Mesh(new THREE.BoxGeometry(.985,.985,.985),new THREE.MeshStandardMaterial({color:0xe4e0d4,roughness:.85}));box.position.set(x,y,z);box.userData.slot=[x,y,z];cube.add(box);parts.push(box);}
const plane=new THREE.PlaneGeometry(.89,.89),normal=new THREE.Vector3(0,0,1);
SLOTS.forEach((s,i)=>{const tile=new THREE.Mesh(plane,new THREE.MeshStandardMaterial({color:FACE_COLORS[s.face],roughness:.8}));tile.position.fromArray(s.p).addScaledVector(new THREE.Vector3(...s.n),.502);tile.quaternion.setFromUnitVectors(normal,new THREE.Vector3(...s.n));tile.userData.slot=s.p;tile.userData.origin=tile.position.clone();tile.userData.quat=tile.quaternion.clone();cube.add(tile);parts.push(tile);stickers.push(tile);});
for(const part of parts){part.userData.origin??=part.position.clone();part.userData.quat??=part.quaternion.clone();}
const resize=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,rx:cube.rotation.x,ry:cube.rotation.y};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag||busy)return;cube.rotation.y=drag.ry+(e.clientX-drag.x)*.008;cube.rotation.x=Math.max(-.8,Math.min(.8,drag.rx+(e.clientY-drag.y)*.005));});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
const svg=$('cube-graph'),ns='http://www.w3.org/2000/svg';const el=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
const defs=el('defs',{}),marker=el('marker',{id:'arrow',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:4,markerHeight:4,orient:'auto-start-reverse'});marker.append(el('path',{d:'M0 0L10 5L0 10Z',fill:'#38362e'}));defs.append(marker);svg.append(defs);
const edgeGroup=el('g',{}),dotGroup=el('g',{});svg.append(edgeGroup,dotGroup);
// 54 intersections of three families of concentric circles.
// Traced from the reference drawing: three families of four concentric rings, centred on the corners of an equilateral
// triangle. Each pair of families crosses twice, giving six 3×3 rhombi: the near crossings (rings 1-3) hold yellow,
// green and orange, the far ones (rings 2-4) red, blue and white. Every dot therefore sits on two drawn rings.
const O={x:250,y:196},spread=46,rings=[60,82,104,126,148];
const fam=[-90,30,150].map(deg=>{const a=deg*Math.PI/180;return{x:O.x+spread*Math.cos(a),y:O.y+spread*Math.sin(a)};});
const loops=el('g',{'aria-hidden':'true'});svg.insertBefore(loops,edgeGroup);
for(const c of fam)for(const r of rings)loops.append(el('circle',{cx:c.x,cy:c.y,r,fill:'none',stroke:'#9c968a','stroke-width':2}));
// The two crossings of ring ra (family p) and ring rb (family q): keep the one on the near or far side of the centre.
const lattice=(i,j,near)=>{const p=fam[i],q=fam[j],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
 const mid={x:(p.x+q.x)/2,y:(p.y+q.y)/2},ux=(mid.x-O.x)/Math.hypot(mid.x-O.x,mid.y-O.y),uy=(mid.y-O.y)/Math.hypot(mid.x-O.x,mid.y-O.y);
 const set=near?rings.slice(1,4):rings.slice(2),pts=[];
 for(const ra of set)for(const rb of set){const along=(ra*ra-rb*rb+d*d)/(2*d),h=Math.sqrt(Math.max(0,ra*ra-along*along)),mx=p.x+along*dx/d,my=p.y+along*dy/d;
  const cands=[{x:mx+h*dy/d,y:my-h*dx/d},{x:mx-h*dy/d,y:my+h*dx/d}];
  pts.push(cands.sort((u,v)=>((u.x-O.x)*ux+(u.y-O.y)*uy)-((v.x-O.x)*ux+(v.y-O.y)*uy))[near?0:1]);}
 return pts;};
const clusters={2:lattice(1,2,true),3:lattice(1,2,false),1:lattice(0,2,true),0:lattice(0,2,false),4:lattice(0,1,true),5:lattice(0,1,false)};
const graphPoints=new Array(SLOTS.length),perFace={};SLOTS.forEach((slot,i)=>{(perFace[slot.face]??=[]).push(i);});
for(const face in clusters)perFace[face].forEach((i,k)=>{graphPoints[i]=clusters[face][k];});
const dots=graphPoints.map((p,i)=>{const node=el('circle',{cx:p.x,cy:p.y,r:8.6,fill:FACE_COLORS[state[i]],stroke:'#25251f','stroke-width':2.4,class:'graph-dot'});const title=el('title',{});title.textContent=`Facette ${i+1} · ${FACES[SLOTS[i].face]}`;node.append(title);dotGroup.append(node);return node;});
function drawGraph(move=selected){selected=move;$('graph-move').textContent=move.replace("'",'′');edgeGroup.replaceChildren();dots.forEach((n,i)=>{n.setAttribute('fill',FACE_COLORS[state[i]]);n.setAttribute('opacity',1);});}
function refresh(){stickers.forEach((s,i)=>s.material.color.set(FACE_COLORS[state[i]]));$('cube-state').textContent=state===SOLVED?'Résolu':`${history.length} mouvements`;$('cube-state').dataset.solved=String(state===SOLVED);canvas.dataset.state=state;drawGraph();document.querySelectorAll('.face-controls button,.game-actions button,.game-actions select').forEach(b=>b.disabled=busy||searching);}
let turning=null;function playMove(move,record=true,duration=270){return new Promise(resolve=>{busy=true;const info=moveInfo(move);const moving=parts.filter(p=>p.userData.slot[info.axis]===info.sign);for(const part of moving)pivot.attach(part);turning={move,record,resolve,moving,axis:['x','y','z'][info.axis],angle:info.quarter*Math.PI/2,start:performance.now(),duration};drawGraph(move);refresh();});}
function frame(t){if(turning){const a=turning,f=Math.min(1,(t-a.start)/a.duration),ease=f*f*(3-2*f);pivot.rotation[a.axis]=a.angle*ease;if(f===1){for(const p of a.moving){cube.attach(p);p.position.copy(p.userData.origin);p.quaternion.copy(p.userData.quat);}pivot.rotation.set(0,0,0);state=applyMove(state,a.move);if(a.record)history=reduceHistory([...history,a.move]);busy=false;turning=null;refresh();a.resolve();}}renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
for(const move of MOVES){const b=document.createElement('button');b.textContent={R:'D',L:'Q',U:'Z',D:'S',F:'W',B:'X'}[move[0]]+(move.length>1?'′':'');b.type='button';b.setAttribute('aria-label',`Tourner ${b.textContent}`);b.addEventListener('mouseenter',()=>{if(!busy)drawGraph(move)});b.onclick=async()=>{solution=[];$('solution-path').replaceChildren();await playMove(move);$('solver-status').textContent=state===SOLVED?'Les six faces sont réunies. Bravo !':'Explore le graphe, ou demande un indice.';};document.querySelector('.face-controls').append(b);}
function reset(){state=SOLVED;history=[];solution=[];$('solution-path').replaceChildren();$('solver-status').textContent='Mélanger le cube pour commencer.';$('search-count').textContent='';refresh();}
$('cube-reset').onclick=reset;
$('cube-scramble').onclick=async()=>{reset();const n=Number($('scramble-depth').value);let last='';for(let i=0;i<n;i++){let m;do{m=MOVES[Math.floor(Math.random()*MOVES.length)]}while(m[0]===last);last=m[0];await playMove(m,true,100);}$('solver-status').textContent=`Mélange de ${n} mouvements. Retrouver les six faces.`;};
const worker=new Worker(new URL('./rubik-worker.js',import.meta.url),{type:'module'});let pending=null;
worker.onmessage=({data})=>{if(!pending||data.id!==pending.id)return;pending.resolve(data);pending=null;};worker.onerror=()=>{if(pending){pending.resolve({error:'Recherche indisponible',moves:null,visited:0});pending=null;}};
function requestSearch(){return new Promise(resolve=>{const id=++searchId;pending={id,resolve};worker.postMessage({id,state});});}
function showPath(moves,done=0){$('solution-path').replaceChildren(...moves.map((m,i)=>{const e=document.createElement('span');e.textContent=m.replace("'",'′');if(i<done)e.className='done';return e;}));}
async function solve(hint){if(state===SOLVED){$('solver-status').textContent='Le cube est déjà résolu.';return;}searching=true;refresh();$('solver-status').textContent='Exploration du graphe depuis les deux extrémités…';const result=await requestSearch();searching=false;solution=result.moves??history.slice().reverse().map(inverse);if(applyMoves(state,solution)!==SOLVED){$('solver-status').textContent='Aucun chemin validé. Recommence un mélange.';refresh();return;}$('search-count').textContent=`${(result.visited||0).toLocaleString('fr-FR')} états explorés`;
 const explanation=result.moves?`Plus court chemin : ${solution.length} quarts de tour.`:`Chemin inverse garanti : ${solution.length} quarts de tour. La recherche exacte est limitée à 6.`;
 $('solver-status').textContent=hint?`${explanation} Prochain mouvement : ${solution[0].replace("'",'′')}.`:explanation;showPath(solution);refresh();if(hint){drawGraph(solution[0]);return;}const path=[...solution];for(let i=0;i<path.length;i++){await playMove(path[i],true,330);showPath(path,i+1);}$('solver-status').textContent=`Cube résolu. ${explanation}`;}
$('cube-hint').onclick=()=>solve(true);$('cube-solve').onclick=()=>solve(false);
document.addEventListener('keydown',e=>{if(busy||searching||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.altKey||e.metaKey)return;const f={D:'R',Q:'L',Z:'U',S:'D',W:'F',X:'B'}[e.key.toUpperCase()];if(f){e.preventDefault();playMove(f+(e.shiftKey?"'":''));}});
refresh();canvas.dataset.ready='true';
