// Bruit déterministe : mêmes graines, même monde, côté navigateur comme côté Node.
export function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function h2(ix,iz,seed){let h=(Math.imul(ix,374761393)+Math.imul(iz,668265263)+Math.imul(seed,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
const fade=t=>t*t*t*(t*(t*6-15)+10);
export function vnoise(x,z,seed=1){const ix=Math.floor(x),iz=Math.floor(z),fx=fade(x-ix),fz=fade(z-iz);
  const a=h2(ix,iz,seed),b=h2(ix+1,iz,seed),c=h2(ix,iz+1,seed),d=h2(ix+1,iz+1,seed);
  return (a+(b-a)*fx)+((c+(d-c)*fx)-(a+(b-a)*fx))*fz}
// fbm centré sur 0, amplitude ~[-1,1]
export function fbm(x,z,seed=1,oct=4){let s=0,amp=1,f=1,n=0;for(let i=0;i<oct;i++){s+=(vnoise(x*f,z*f,seed+i*31)*2-1)*amp;n+=amp;amp*=.5;f*=2}return s/n}
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
export const dist=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
