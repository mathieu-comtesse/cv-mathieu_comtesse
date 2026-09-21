(function(root){
'use strict';
const directions=[[0,-1],[1,0],[0,1],[-1,0]];
class Maze{
 constructor(size=41,seed=Date.now()){this.size=size|1;this.seed=seed>>>0;this.grid=Array.from({length:this.size},()=>Array(this.size).fill(1));this.seen=Array.from({length:this.size},()=>Array(this.size).fill(false));this.visits=new Map();this.x=1;this.y=1;this.facing=1;this.steps=0;this.backtracks=0;this.trail=[[1,1]];this.won=false;this.generate();this.shortest=this.shortestPath();this.reveal();this.visits.set('1,1',1);}
 random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 generate(){const stack=[[1,1]];this.grid[1][1]=0;while(stack.length){const [x,y]=stack[stack.length-1],next=directions.map(([dx,dy])=>[x+dx*2,y+dy*2,dx,dy]).filter(([nx,ny])=>nx>0&&ny>0&&nx<this.size-1&&ny<this.size-1&&this.grid[ny][nx]);if(!next.length){stack.pop();continue;}const [nx,ny,dx,dy]=next[Math.floor(this.random()*next.length)];this.grid[y+dy][x+dx]=this.grid[ny][nx]=0;stack.push([nx,ny]);}}
 open(x,y){return y>=0&&x>=0&&y<this.size&&x<this.size&&this.grid[y][x]===0;}
 reveal(){for(const [dx,dy] of directions){for(let n=0;n<this.size;n++){const x=this.x+dx*n,y=this.y+dy*n;if(x<0||y<0||x>=this.size||y>=this.size)break;this.seen[y][x]=true;for(const [ax,ay] of directions){if(this.grid[y+ay]?.[x+ax]===1)this.seen[y+ay][x+ax]=true;}if(this.grid[y][x])break;}}}
 sight(dir){const [dx,dy]=directions[dir];let n=0;while(this.open(this.x+dx*(n+1),this.y+dy*(n+1)))n++;return n;}
 move(dir){if(this.won)return false;this.facing=(dir+4)%4;const [dx,dy]=directions[this.facing],nx=this.x+dx,ny=this.y+dy;if(!this.open(nx,ny))return false;this.x=nx;this.y=ny;this.steps++;const key=nx+','+ny;if(this.visits.has(key))this.backtracks++;this.visits.set(key,(this.visits.get(key)||0)+1);this.trail.push([nx,ny]);this.reveal();this.won=nx===this.size-2&&ny===this.size-2;return true;}
 autoStep(){if(this.won)return;let choices=directions.map((_,i)=>i).filter(i=>this.sight(i)>0);choices.sort((a,b)=>{const [ax,ay]=directions[a],[bx,by]=directions[b];return(this.visits.get((this.x+ax)+','+(this.y+ay))||0)-(this.visits.get((this.x+bx)+','+(this.y+by))||0);});this.move(choices[0]);}
 shortestPath(){const q=[[1,1,0]],seen=new Set(['1,1']);for(let i=0;i<q.length;i++){const [x,y,n]=q[i];if(x===this.size-2&&y===this.size-2)return n;for(const [dx,dy]of directions){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(this.open(nx,ny)&&!seen.has(key)){seen.add(key);q.push([nx,ny,n+1]);}}}return -1;}
}
const api={Maze,directions};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MazeModel=api;
})(typeof window!=='undefined'?window:globalThis);
