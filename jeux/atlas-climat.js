/* Nacre · cycle solaire et météo, création propre à l’archipel.
 * Intégration : const C=creerClimat(M,R,J); après J.tick(dt,t), C.tick(dt,t),
 * puis R.rendre(...). Aucune équivalence avec la simulation de Sandcastle.
 */
import * as THREE from './three.module.js';
import { GLSL_BRUIT } from './atlas-ciel.js';

const TAU=Math.PI*2,clamp=THREE.MathUtils.clamp;
const smooth=(a,b,x)=>{const k=clamp((x-a)/(b-a),0,1);return k*k*(3-2*k);};
const wrap=h=>((h%24)+24)%24;
const METEOS={
 soleil:{label:'Beau temps',couverture:.1,pluie:0,brume:.0015,vent:.7},
 pluie:{label:'Pluie',couverture:.76,pluie:.72,brume:.007,vent:2.5},
 brume:{label:'Brume',couverture:.42,pluie:0,brume:.024,vent:.3},
 tempete:{label:'Tempête',couverture:1,pluie:1,brume:.0075,vent:6.2}
};
const ALIAS={beau:'soleil','beau temps':'soleil',clair:'soleil','beau-temps':'soleil',storm:'tempete','tempête':'tempete',rain:'pluie',fog:'brume'};
const color=h=>new THREE.Color(h);
const PAL={
 zenith:color('#8fbfd1'),milieu:color('#c3dce0'),horizon:color('#efe3c6'),
 nuitZ:color('#050c21'),nuitM:color('#152743'),nuitH:color('#34465c'),
 aubeZ:color('#7a7fa8'),aubeM:color('#d5a99e'),aubeH:color('#ffbd7c'),
 couvertZ:color('#536a7a'),couvertM:color('#899b9f'),couvertH:color('#b8c0b9'),
 jour:color('#fff0d2'),ambre:color('#ffb579'),lune:color('#a5c5ed'),
 ambJour:color('#d3e5eb'),ambNuit:color('#6e8aaf'),solJour:color('#d3bb90'),solNuit:color('#52647b'),
 pluie:color('#c4d8e1'),nuage:color('#f2eddf'),nuageGris:color('#6e7f8c'),eclair:color('#dceaff'),
 ocean:[color('#174e64'),color('#267e8d'),color('#75b7b5')],
 oceanNuit:[color('#071525'),color('#123044'),color('#35566c')]
};

export function creerClimat(M,R,J){
 const U=M.ciel.uniformes,host=J.hote,reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let heure=J.estNuit?.()?22:10.5,meteo='soleil',avance=true,minutesJour=12;
 try{const saved=JSON.parse(localStorage.getItem('nacre-climat-v1')||'null');if(saved){if(Number.isFinite(saved.heure))heure=wrap(saved.heure);if(METEOS[saved.meteo])meteo=saved.meteo;if(typeof saved.avance==='boolean')avance=saved.avance;if([3,6,12,24].includes(saved.minutesJour))minutesJour=saved.minutesJour;}}catch{}
 let dernierNuit=J.estNuit?.()??false,dernierEnv=-1000,derniereSauve=0,dernierUI=-1;
 let pluie=METEOS[meteo].pluie,couverture=METEOS[meteo].couverture,vent=METEOS[meteo].vent,densite=METEOS[meteo].brume;
 let ecoule=0,flashRestant=0,prochainEclair=2.5,eclairs=0,flash=0;
 let meteoVivante=true,prochaineMeteo=130,etapeMeteo=0;
 try{const saved=JSON.parse(localStorage.getItem('nacre-climat-v1')||'null');if(typeof saved?.meteoVivante==='boolean')meteoVivante=saved.meteoVivante;}catch{}
 const succession=['soleil','brume','soleil','pluie','tempete','pluie','soleil'];
 // The legacy night controller also requests PMREM updates. Keep these requests
 // cheap: only regenerate after this module has imposed the complete sky state.
 const refaireEnv=M.ciel.rafraichirEnv?.bind(M.ciel);let autoriserEnv=false,refletsActualises=0;
 if(refaireEnv)M.ciel.rafraichirEnv=()=>{if(autoriserEnv){refaireEnv();refletsActualises++;}};
 const groupe=new THREE.Group();groupe.name='Climat : pluie, nuages et éclairs';M.scene.add(groupe);
 const hemi=M.hemi??M.scene.children.find(o=>o.isHemisphereLight);
 const fog=new THREE.FogExp2('#b6c5c7',densite);M.scene.fog=fog;
 const fogU={climatFogColor:{value:fog.color},climatFogDensity:{value:densite}};
 // Water uses a custom shader rather than Three's standard fog chunks.
 // Apply the same exponential depth extinction, without a screen-wide veil.
 const eau=M.dio?.surface?.material;
 if(eau?.isShaderMaterial&&!eau.userData.climatBrume){
   const avant=eau.onBeforeCompile,key=eau.customProgramCacheKey();
   eau.onBeforeCompile=function(sh,renderer){
     avant?.call(this,sh,renderer);Object.assign(sh.uniforms,fogU);
     sh.vertexShader='varying float vClimatDepth;\n'+sh.vertexShader.replace(/\}\s*$/,'vClimatDepth=max(0.,-(modelViewMatrix*vec4(position,1.)).z);\n}');
     const extinction='uniform vec3 climatFogColor;uniform float climatFogDensity;varying float vClimatDepth;\n';
     // Cover every output, including the native-water branch's early return.
     // Keep the native discard in its own expression. Nesting it in a fog
     // function triggers ANGLE/D3D11's unbound-variable compiler failure.
     sh.fragmentShader=extinction+sh.fragmentShader.replace(/gl_FragColor\s*=\s*([^;]+);/g,'gl_FragColor=$1;gl_FragColor.rgb=mix(gl_FragColor.rgb,climatFogColor,1.-exp(-climatFogDensity*climatFogDensity*vClimatDepth*vClimatDepth));');
   };
   eau.customProgramCacheKey=()=>key+'-climat-profondeur-1';eau.userData.climatBrume=true;eau.needsUpdate=true;
 }
 const rand=(()=>{let n=71432;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};})();
 const mobile=matchMedia('(pointer: coarse)').matches||innerWidth<600,N=mobile?850:1700;
 const positions=new Float32Array(N*6),gouttes=Array.from({length:N},()=>({x:(rand()-.5)*116,z:(rand()-.5)*94,y:rand()*26,v:.8+rand()*.4,l:.45+rand()*.55}));
 const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 const rainMat=new THREE.LineBasicMaterial({color:PAL.pluie,transparent:true,opacity:0,depthWrite:false,fog:true,toneMapped:false});
 const rain=new THREE.LineSegments(rainGeo,rainMat);rain.name='Pluie en mouvement';rain.frustumCulled=false;rain.renderOrder=20;groupe.add(rain);
 // Thin procedural cloud banks move above the archipelago and vary in coverage.
 const cloudU={uTemps:{value:0},uCouverture:{value:couverture},uTeinte:{value:PAL.nuage.clone()},uVent:{value:vent}};
 const cloudMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:cloudU,
   vertexShader:'varying vec3 vClimatCloud;void main(){vec4 p=modelMatrix*vec4(position,1.);vClimatCloud=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
   fragmentShader:`${GLSL_BRUIT}
     uniform float uTemps,uCouverture,uVent;uniform vec3 uTeinte;varying vec3 vClimatCloud;
     void main(){vec2 p=vClimatCloud.xz*.052+vec2(uTemps*.0017*uVent,uTemps*.0009*uVent);
       float n=fbm2(p)*.77+fbm2(p*2.13+4.)*.23;
       float threshold=mix(.76,.43,uCouverture),bank=smoothstep(threshold,threshold+.22,n);
       float border=1.-smoothstep(.68,1.,length(vClimatCloud.xz/vec2(82.,67.)));
       float a=bank*border*mix(.18,.36,uCouverture);if(a<.004)discard;
       gl_FragColor=vec4(uTeinte*(.84+.22*n),a);
     }`
 });
 const clouds=new THREE.Mesh(new THREE.PlaneGeometry(164,134).rotateX(-Math.PI/2),cloudMat);
 clouds.name='Bancs nuageux du climat';clouds.position.y=14;clouds.renderOrder=16;groupe.add(clouds);
 const foudre=new THREE.PointLight('#dceaff',0,180,1.2);foudre.position.set(-8,21,-7);groupe.add(foudre);
 const boltGeo=new THREE.BufferGeometry(),boltP=[];
 const zig=[[-8,20,-7],[-8.7,17.2,-6.7],[-7.8,15.2,-7.1],[-9,11.5,-6.8],[-8.5,10.4,-7],[-10,6,-7]];
 for(let i=1;i<zig.length;i++)boltP.push(...zig[i-1],...zig[i]);boltGeo.setAttribute('position',new THREE.Float32BufferAttribute(boltP,3));
 const boltMat=new THREE.LineBasicMaterial({color:'#f2f6ff',transparent:true,opacity:0,depthWrite:false,toneMapped:false});
 const bolt=new THREE.LineSegments(boltGeo,boltMat);bolt.name='Éclair';bolt.visible=false;bolt.renderOrder=25;groupe.add(bolt);

 const style=document.createElement('style');style.textContent=`
 [data-climat]{position:absolute;z-index:45;right:26px;top:82px;width:232px;color:#244b50;font:13px/1.4 system-ui,sans-serif;pointer-events:auto}
 [data-climat] summary{list-style:none;min-height:44px;box-sizing:border-box;padding:11px 13px;border:1px solid #46696b45;border-radius:13px;background:#faf6e7ed;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:var(--cv-action);box-shadow:0 3px 12px #153e4410}
 [data-climat] summary::-webkit-details-marker{display:none}[data-climat] summary:after{content:'+';font-size:18px}[data-climat][open] summary:after{content:'−'}
 [data-climat] time{font-variant-numeric:tabular-nums;font-size:14px;font-weight:650}[data-climat] .climat-choix{padding:12px;background:#faf6e7f5;border:1px solid #46696b35;border-top:0;border-radius:0 0 13px 13px;display:grid;gap:9px;box-shadow:0 8px 22px #153e4420}
 [data-climat][open] summary{border-radius:13px 13px 0 0}[data-climat] label{display:grid;gap:5px}[data-climat] input[type=range]{width:100%;height:30px;accent-color:#28666b;box-sizing:border-box;margin:0}
 [data-climat] select{width:100%;min-height:39px;color:#244b50;background:#fffdf3;border:1px solid #46696b55;border-radius:7px;font:inherit;padding:6px}
 [data-climat] .climat-avance{display:flex;gap:9px;align-items:center;min-height:35px}[data-climat] input[type=checkbox]{width:18px;height:18px;accent-color:#28666b}
 [data-climat] .climat-instants{display:flex;gap:7px}[data-climat] .climat-instants button{min-height:40px;flex:1;font:inherit;color:#493c2c;border:1px solid #bc9d70;border-radius:8px;background:#ead7b2;cursor:var(--cv-action);padding:7px}
 [data-climat] :focus-visible{outline:2px solid #28666b;outline-offset:3px}
 @media(max-width:600px){[data-climat]{right:12px;top:79px;width:210px;font-size:12px}[data-climat] summary{min-height:44px}[data-climat] .climat-choix{max-height:calc(100dvh - 235px);overflow-y:auto}[data-climat] select{min-height:44px}}
 `;host.appendChild(style);
 const panel=document.createElement('details');panel.dataset.climat='';panel.className='climat-controls';panel.innerHTML=`
   <summary aria-label="Régler l’heure et la météo"><time data-climat-horloge></time><span data-climat-etat></span></summary>
   <div class="climat-choix">
     <label>Heure <input data-climat-heure aria-label="Heure sur l’île" type="range" min="0" max="23.99" step="0.05"></label>
     <div class="climat-instants"><button type="button" data-climat-instant="6.4">Lever</button><button type="button" data-climat-instant="17.6">Coucher</button></div>
     <label>Météo <select data-climat-meteo aria-label="Météo sur l’île">${Object.entries(METEOS).map(([key,v])=>`<option value="${key}">${v.label}</option>`).join('')}</select></label>
     <label class="climat-avance"><input data-climat-avance type="checkbox">Faire avancer le temps</label>
     <label class="climat-avance"><input data-climat-vivant type="checkbox" checked>Météo changeante</label>
     <label>Durée d’une journée <select data-climat-vitesse aria-label="Durée d’une journée">${[3,6,12,24].map(n=>`<option value="${n}">${n} minutes</option>`).join('')}</select></label>
   </div>`;
 host.appendChild(panel);
 for(const event of ['pointerdown','pointermove','pointerup','touchstart','touchmove','wheel'])panel.addEventListener(event,e=>e.stopPropagation(),{passive:true});
 const slider=panel.querySelector('[data-climat-heure]'),weather=panel.querySelector('[data-climat-meteo]'),clock=panel.querySelector('time'),label=panel.querySelector('[data-climat-etat]'),running=panel.querySelector('[data-climat-avance]'),speed=panel.querySelector('[data-climat-vitesse]'),vivant=panel.querySelector('[data-climat-vivant]');
 function ui(){
   const total=Math.round(heure*60)%1440,h=Math.floor(total/60),m=total%60,txt=String(h).padStart(2,'0')+' h '+String(m).padStart(2,'0');
   clock.textContent=txt;clock.dateTime=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');label.textContent=METEOS[meteo].label;
   if(document.activeElement!==slider)slider.value=String(heure);slider.setAttribute('aria-valuetext',txt);
   weather.value=meteo;running.checked=avance;speed.value=String(minutesJour);vivant.checked=meteoVivante;
 }
 function sauvegarder(){try{localStorage.setItem('nacre-climat-v1',JSON.stringify({heure,meteo,avance,minutesJour,meteoVivante}));}catch{}}
 function reglerHeure(h){h=Number(h);if(!Number.isFinite(h))return false;heure=wrap(h);ui();sauvegarder();return true;}
 function reglerMeteo(nom){nom=String(nom).toLowerCase().trim();nom=ALIAS[nom]??nom;if(!METEOS[nom])return false;if(meteo!==nom&&nom==='tempete')prochainEclair=ecoule+2.5;meteo=nom;prochaineMeteo=ecoule+110+Math.random()*70;M.eauNative?.reglerHoule(nom==='tempete'?2:nom==='brume'?1:0);ui();sauvegarder();return true;}
 slider.addEventListener('input',()=>reglerHeure(slider.value));weather.addEventListener('change',()=>reglerMeteo(weather.value));
 panel.querySelectorAll('[data-climat-instant]').forEach(button=>button.addEventListener('click',()=>reglerHeure(button.dataset.climatInstant)));
 running.addEventListener('change',()=>{avance=running.checked;sauvegarder();});speed.addEventListener('change',()=>{minutesJour=Number(speed.value);sauvegarder();});
 vivant.addEventListener('change',()=>{meteoVivante=vivant.checked;prochaineMeteo=ecoule+120;sauvegarder();});
 ui();
 const sunDirection=new THREE.Vector3(),lightDirection=new THREE.Vector3(),fogColor=new THREE.Color(),sunColor=new THREE.Color();
 let jour=1,nuit=0,altitude=1,aurore=0;
 function tick(dt,t){
   dt=clamp(Number(dt)||0,0,.25);ecoule+=dt;
   const legacyNuit=J.estNuit?.();
   if(typeof legacyNuit==='boolean'&&legacyNuit!==dernierNuit){heure=legacyNuit?22:10.5;dernierNuit=legacyNuit;}
   if(avance)heure=wrap(heure+dt*24/(minutesJour*60));
   if(meteoVivante&&ecoule>prochaineMeteo)reglerMeteo(succession[++etapeMeteo%succession.length]);
   const w=METEOS[meteo],blend=1-Math.exp(-dt*.75);
   pluie+=(w.pluie-pluie)*blend;couverture+=(w.couverture-couverture)*blend;vent+=(w.vent-vent)*blend;densite+=(w.brume-densite)*blend;
   const sable=M.terres?.mesh.material.userData.sableUniformes;if(sable){sable.uTemps.value=t;sable.uSandRain.value=pluie;}
   const a=(heure-6)/24*TAU;altitude=Math.sin(a)*.86;
   jour=smooth(-.12,.13,altitude);nuit=1-jour;aurore=(1-smooth(.04,.5,Math.max(0,altitude)))*jour;
   sunDirection.set(-Math.cos(a),Math.abs(altitude)<.003?(altitude<0?-.003:.003):altitude,Math.sin(a)*.35).normalize();
   U.uSunDir.value.copy(sunDirection);M.ciel.soleil.copy(sunDirection);U.uNuit.value=nuit;
   const obscur=couverture*.70;
   U.uZenith.value.copy(PAL.zenith).lerp(PAL.nuitZ,nuit).lerp(PAL.aubeZ,aurore*.75).lerp(PAL.couvertZ,obscur*jour);
   U.uMilieu.value.copy(PAL.milieu).lerp(PAL.nuitM,nuit).lerp(PAL.aubeM,aurore*.82).lerp(PAL.couvertM,obscur*jour);
   U.uHorizon.value.copy(PAL.horizon).lerp(PAL.nuitH,nuit).lerp(PAL.aubeH,aurore*.9).lerp(PAL.couvertH,obscur*jour);
   sunColor.copy(PAL.jour).lerp(PAL.ambre,aurore).lerp(PAL.lune,nuit);
   U.uSunCol.value.copy(sunColor).multiplyScalar((.34+.66*jour)*(1-couverture*.68));
   for(const [i,key] of ['uOcDeep','uOcMid','uOcLight'].entries())U[key]?.value.copy(PAL.ocean[i]).lerp(PAL.oceanNuit[i],nuit).lerp(PAL.couvertZ,couverture*.2);
   if(meteo==='tempete'&&ecoule>=prochainEclair){if(!reduceMotion){flashRestant=.18;eclairs++;}prochainEclair=ecoule+6+rand()*8;}
   flashRestant=Math.max(0,flashRestant-dt);flash=flashRestant>.12?1:flashRestant>.07?.1:flashRestant>0?.65:0;
   foudre.intensity=flash*75;bolt.visible=flash>.2;boltMat.opacity=flash;
   if(flash){U.uHorizon.value.lerp(PAL.eclair,flash*.45);U.uMilieu.value.lerp(PAL.eclair,flash*.3);}
   lightDirection.copy(sunDirection);if(altitude<0)lightDirection.negate();
   M.soleil.position.copy(lightDirection).multiplyScalar(70);M.soleil.target?.position.set(0,-1,0);M.soleil.target?.updateMatrixWorld();
   M.soleil.color.copy(sunColor);M.soleil.intensity=(.24*nuit+jour*(.7+1.7*Math.sqrt(Math.max(0,altitude))))*(1-couverture*.78)+flash*.8;
   if(hemi){hemi.color.copy(PAL.ambJour).lerp(PAL.ambNuit,nuit);hemi.groundColor.copy(PAL.solJour).lerp(PAL.solNuit,nuit);hemi.intensity=(.3*nuit+.88*jour)*(1-couverture*.45)+flash*.65;}
   M.scene.environmentIntensity=(.17*nuit+.53*jour)*(1-couverture*.55);
   fogColor.copy(U.uHorizon.value).lerp(PAL.couvertM,couverture*.4);fog.color.copy(fogColor);fog.density=densite;fogU.climatFogDensity.value=densite;
   cloudU.uTemps.value=t;cloudU.uCouverture.value=couverture;cloudU.uVent.value=vent;
   cloudU.uTeinte.value.copy(PAL.nuage).lerp(PAL.nuageGris,couverture).multiplyScalar(.25+.75*jour).lerp(PAL.ambre,aurore*.13);
   clouds.visible=couverture>.02;
   // Rain geometry is updated in world space: segments fall and drift with wind.
   rain.visible=pluie>.015;rainMat.opacity=pluie*(.36+.25*jour);rainGeo.setDrawRange(0,Math.floor(N*pluie)*2);
   if(rain.visible){for(let i=0;i<N;i++){
     const d=gouttes[i],x=((d.x+t*vent*.8+58)%116+116)%116-58,z=((d.z+t*vent*.32+47)%94+94)%94-47,y=((d.y-t*(15+vent)*d.v)%26+26)%26-.2,k=i*6;
     positions[k]=x;positions[k+1]=y;positions[k+2]=z;positions[k+3]=x-vent*.055*d.l;positions[k+4]=y+d.l;positions[k+5]=z-vent*.025*d.l;
   }rainGeo.attributes.position.needsUpdate=true;}
   // The volumetric banks are rendered separately; impose their effective light
   // after the world's update, just like the direct and ambient scene lights.
   M.nuages?.groupe.traverse(o=>{const u=o.material?.uniforms;if(!u)return;if(u.uAlpha){o.userData.alphaClimat??=u.uAlpha.value;u.uAlpha.value=o.userData.alphaClimat*(.5+couverture*.8);}u.uSunCol?.value.copy(U.uSunCol.value);u.uAmbTop?.value.copy(U.uMilieu.value);u.uAmbBot?.value.copy(U.uHorizon.value).multiplyScalar(.65);});
   if(R.reglages){R.reglages.nuit=nuit;R.reglages.exposition=.98+nuit*.25;R.reglages.eclat=.16+nuit*.06+flash*.07;}
   const estNuit=nuit>.6;if(estNuit!==dernierNuit){J.reglerNuit?.(estNuit);dernierNuit=estNuit;}
   document.body.classList.toggle('is-night',estNuit);
   // Regenerate reflections sparsely. J.tick's old day/night transition may
   // otherwise overwrite the environment before this module sets solar colours.
   if(t-dernierEnv>24||Math.abs(heure-(M.ciel._heureClimat??heure))>1.5){autoriserEnv=true;M.ciel.rafraichirEnv?.();autoriserEnv=false;dernierEnv=t;M.ciel._heureClimat=heure;}
   if(ecoule-dernierUI>.3){ui();dernierUI=ecoule;}
   if(ecoule-derniereSauve>8){sauvegarder();derniereSauve=ecoule;}
 }
 const diagnostic=()=>({heure,heureTexte:clock.textContent,meteo,meteoVivante,prochainChangement:Math.max(0,prochaineMeteo-ecoule),tempsAvance:avance,minutesParJour:minutesJour,nuit,altitudeSolaire:altitude,aurore,pluie,segmentsPluie:rain.visible?rainGeo.drawRange.count/2:0,densiteBrume:densite,couvertureNuages:couverture,vent,eclairs,eclair:flash,soleilIntensite:M.soleil.intensity,hemisphereDisponible:!!hemi,brumeEau:!!eau?.userData.climatBrume,refletsActualises,creationNacre:true});
 tick(0,0);
 M.eauNative?.reglerHoule(meteo==='tempete'?2:meteo==='brume'?1:0);
 return {tick,reglerHeure,reglerMeteo,diagnostic,groupe,panneau:panel,get vent(){return vent;}};
}
