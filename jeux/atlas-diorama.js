/* ATLAS · MER CÔTIÈRE. Fond réel réfracté, absorption selon la profondeur,
 * onde de hauteur/vitesse propagée sur le relief et écume issue du déferlement.
 * La géométrie opaque du terrain masque la mer ; la carte de hauteurs et la
 * distance côtière règlent la vitesse de l'onde et la transition turquoise.
 *
 *   const d = creerDiorama(ciel, carte)   ->  d.groupe (à ajouter à la scène), d.niveau, d.tick(t)                                                           */
import * as THREE from './three.module.js';
import { GLSL_BRUIT, GLSL_CIEL, GLSL_OMBRES } from './atlas-ciel.js?v=20261014-mediterranee';
import { GLSL_HOULE, GLSL_CAUSTIQUES } from './atlas-eau-matiere.js?v=20261014-mediterranee';
import { GLSL_FOND_MARIN } from './atlas-fond-marin.js?v=20261014-mediterranee';
import { GLSL_EAU_SOURCE } from './atlas-eau-rendu-source.js?v=20261019-nacre-tranche-2';

export const DIO = { demiX: 64, demiZ: 50, cx: 0, cz: 0.6, niveau: 0, epaisseur: 2.6, ilot: { x: -21.5, z: 9, r: 3.0 } };

/* distance (en mètres) à la terre émergée, par transformée en distances en deux passes (chanfrein 3-4) */
function champDistance(carte, fonds = []) {
  const pas = 0.4, W = Math.round(2 * DIO.demiX / pas), H = Math.round(2 * DIO.demiZ / pas), x0 = DIO.cx - DIO.demiX, z0 = DIO.cz - DIO.demiZ;
  const d = new Float32Array(W * H), INF = 1e6;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + (i + 0.5) * pas, z = z0 + (j + 0.5) * pas, h = Math.max(carte.hauteur(x, z), ...fonds.map(f => f(x, z)));
    const sur = Math.hypot(x - DIO.ilot.x, z - DIO.ilot.z) < DIO.ilot.r * 0.74;                 // l'îlot du phare compte comme de la terre
    d[j * W + i] = (h > DIO.niveau + 0.03 || sur) ? 0 : INF;
  }
  const A = 1, B = 1.4142;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let v = d[j * W + i]; if (v === 0) continue;
    if (i > 0) v = Math.min(v, d[j * W + i - 1] + A); if (j > 0) { v = Math.min(v, d[(j - 1) * W + i] + A); if (i > 0) v = Math.min(v, d[(j - 1) * W + i - 1] + B); if (i < W - 1) v = Math.min(v, d[(j - 1) * W + i + 1] + B); } d[j * W + i] = v; }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { let v = d[j * W + i]; if (v === 0) continue;
    if (i < W - 1) v = Math.min(v, d[j * W + i + 1] + A); if (j < H - 1) { v = Math.min(v, d[(j + 1) * W + i] + A); if (i < W - 1) v = Math.min(v, d[(j + 1) * W + i + 1] + B); if (i > 0) v = Math.min(v, d[(j + 1) * W + i - 1] + B); } d[j * W + i] = v; }
  const demi = new Uint16Array(W * H); for (let k = 0; k < demi.length; k++) demi[k] = THREE.DataUtils.toHalfFloat(Math.min(60, d[k] * pas));
  const tex = new THREE.DataTexture(demi, W, H, THREE.RedFormat, THREE.HalfFloatType); tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  return { tex, zone: new THREE.Vector4(x0, z0, 2 * DIO.demiX, 2 * DIO.demiZ) };
}

/* Onde côtière : hauteur + vitesse intégrées à pas fixe. La profondeur règle
 * la vitesse de propagation, les cellules émergées réfléchissent l'onde et
 * les très faibles profondeurs dissipent son énergie. La normale et l'écume
 * lisent ce même champ ; il ne s'agit pas d'un bruit ajouté à la couleur. */
function creerHouleCotiere(carte, distance, zone) {
  const W = 161, H = 127, dx = zone.z / (W - 1), dz = zone.w / (H - 1), count = W * H;
  const eta = new Float32Array(count), vitesse = new Float32Array(count), profondeur = new Float32Array(count), fond = new Float32Array(count), ecume = new Float32Array(count);
  const pixels = new Uint16Array(count * 4), bedPixels = new Uint16Array(count), fonds = [];
  const tex = new THREE.DataTexture(pixels, W, H, THREE.RGBAFormat, THREE.HalfFloatType), texFond = new THREE.DataTexture(bedPixels, W, H, THREE.RedFormat, THREE.HalfFloatType);
  for (const t of [tex, texFond]) { t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; }
  let temps = 0, retard = 0, steps = 0;
  const incoming = (x,z,t) => .055 * Math.sin((x * .72 - z * .69) * .32 - t * 1.42);
  function rebuild() {
    const image = distance.image;
    for (let j=0;j<H;j++) for(let i=0;i<W;i++) {
      const k=j*W+i, x=zone.x+i*dx,z=zone.y+j*dz, base=carte.hauteur(x,z);
      const qx=Math.min(image.width-1,Math.round(i/(W-1)*(image.width-1))),qz=Math.min(image.height-1,Math.round(j/(H-1)*(image.height-1)));
      const d=THREE.DataUtils.fromHalfFloat(image.data[qz*image.width+qx]);
      const extra=Math.max(-50,...fonds.map(f=>f(x,z)));
      fond[k]=Math.max(base>-20?base:-.35-d*.28,extra);
      profondeur[k]=Math.max(0,Math.min(2.4,DIO.niveau-fond[k]));
      bedPixels[k]=THREE.DataUtils.toHalfFloat(extra);
      if(profondeur[k]<=.015){eta[k]=vitesse[k]=ecume[k]=0;}
    }
    texFond.needsUpdate=true;
  }
  rebuild();
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=j*W+i;eta[k]=profondeur[k]>.015?incoming(zone.x+i*dx,zone.y+j*dz,0):0;}
  function advance(dt) {
    temps+=dt;
    for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){
      const k=j*W+i,h=profondeur[k]; if(h<=.015)continue;
      const a=k-1,b=k+1,c=k-W,d=k+W;
      const fa=profondeur[a]>.015?Math.min(h,profondeur[a])*(eta[a]-eta[k]):0,fb=profondeur[b]>.015?Math.min(h,profondeur[b])*(eta[b]-eta[k]):0;
      const fc=profondeur[c]>.015?Math.min(h,profondeur[c])*(eta[c]-eta[k]):0,fd=profondeur[d]>.015?Math.min(h,profondeur[d])*(eta[d]-eta[k]):0;
      const lap=(fa+fb)/(dx*dx)+(fc+fd)/(dz*dz);
      const loss=.15+.9*(1-Math.min(1,h/.35));
      vitesse[k]=(vitesse[k]+9.81*lap*dt)*Math.exp(-loss*dt);
      vitesse[k]=THREE.MathUtils.clamp(vitesse[k],-.35,.35);
    }
    for(let j=0;j<H;j++)for(let i=0;i<W;i++){
      const k=j*W+i,h=profondeur[k];if(h<=.015)continue;
      const edge=Math.min(i,W-1-i,j,H-1-j), relaxation=Math.max(edge<8?(8-edge)/8:0,h>1.8?.055:0);
      eta[k]+=vitesse[k]*dt;
      if(relaxation>0)eta[k]+=(incoming(zone.x+i*dx,zone.y+j*dz,temps)-eta[k])*relaxation*.24;
      eta[k]=THREE.MathUtils.clamp(eta[k],-.12,.12);
      const breaking=h<.42?Math.max(0,eta[k]-.018)*Math.abs(vitesse[k])*90:0;
      ecume[k]=Math.min(.65,ecume[k]*Math.exp(-1.8*dt)+breaking*dt);
    }
    steps++;
  }
  function upload() {
    for(let j=0;j<H;j++)for(let i=0;i<W;i++){
      const k=j*W+i,o=k*4;
      const sx=(eta[j*W+Math.min(W-1,i+1)]-eta[j*W+Math.max(0,i-1)])/(2*dx);
      const sz=(eta[Math.min(H-1,j+1)*W+i]-eta[Math.max(0,j-1)*W+i])/(2*dz);
      pixels[o]=THREE.DataUtils.toHalfFloat(eta[k]);pixels[o+1]=THREE.DataUtils.toHalfFloat(sx);pixels[o+2]=THREE.DataUtils.toHalfFloat(sz);pixels[o+3]=THREE.DataUtils.toHalfFloat(ecume[k]);
    }
    tex.needsUpdate=true;
  }
  upload();
  function sample(x,z) {const i=THREE.MathUtils.clamp(Math.round((x-zone.x)/dx),0,W-1),j=THREE.MathUtils.clamp(Math.round((z-zone.y)/dz),0,H-1);return j*W+i;}
  return {tex,texFond, ajouterFond(f){fonds.push(f);rebuild();upload();}, actualiserFond(next){if(next)distance=next;rebuild();},
    hauteur(x,z){return DIO.niveau+eta[sample(x,z)];}, vitesse(x,z){return vitesse[sample(x,z)];},
    impulsion(x,z,force=.08,rayon=1.6){
      if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(force))return;
      rayon=THREE.MathUtils.clamp(rayon,.8,4);force=THREE.MathUtils.clamp(force,-.2,.2);
      const ci=Math.round((x-zone.x)/dx),cj=Math.round((z-zone.y)/dz),ni=Math.ceil(rayon*2/dx),nj=Math.ceil(rayon*2/dz);
      for(let j=Math.max(0,cj-nj);j<=Math.min(H-1,cj+nj);j++)for(let i=Math.max(0,ci-ni);i<=Math.min(W-1,ci+ni);i++){
        const k=j*W+i;if(profondeur[k]<=.015)continue;
        const r2=((zone.x+i*dx-x)**2+(zone.y+j*dz-z)**2)/(rayon*rayon);
        vitesse[k]=THREE.MathUtils.clamp(vitesse[k]+force*Math.exp(-r2*2),-.35,.35);
      }
    },
    diagnostic(){let max=0,speed=0,finite=true,energy=0;for(let k=0;k<count;k++){max=Math.max(max,Math.abs(eta[k]));speed=Math.max(speed,Math.abs(vitesse[k]));finite=finite&&Number.isFinite(eta[k])&&Number.isFinite(vitesse[k]);energy+=eta[k]*eta[k];}return {steps,cellules:count,maxHauteur:max,maxVitesse:speed,energy,finite};},
    tick(dt){retard+=Math.min(Math.max(dt,0),.1);let n=0;while(retard>=1/30&&n<3){advance(1/30);retard-=1/30;n++;}if(n)upload();}};
}

const GLSL_CHAMP = `uniform sampler2D uHoule,uFondAjoute; uniform vec4 uSDFZone,uHouleZone;
vec4 ondeCotiere(vec2 p){return texture2D(uHoule,(p-uHouleZone.xy)/uHouleZone.zw);}`;

export function creerDiorama(ciel, carte) {
  const groupe = new THREE.Group(), niv = DIO.niveau, { tex, zone } = champDistance(carte), U = ciel.uniformes;
  let houle = creerHouleCotiere(carte, tex, zone);
  const uni = {
    uOriginalCaustics:{value:carte.sandcastle.textures.CausticsAtlas},
    uOriginalNormal:{value:carte.sandcastle.textures.WaterNormal2D},
    uHoule:{value:houle.tex},uFondAjoute:{value:houle.texFond},
    uNativeWater:{value:0},uNativeTime:{value:0},uNativeRefraction:{value:.01209999993443489},
    uNativeFlow:{value:houle.tex},uNativeColor:{value:new THREE.Color()},uNativeScattering:{value:new THREE.Color()},uInvVP:{value:new THREE.Matrix4()},
    uScene:{value:null},uDepth:{value:null},uResolution:{value:new THREE.Vector2(1,1)},uNear:{value:.3},uFar:{value:2000},
    uTemps: { value: 0 }, uSea: { value: niv }, uSDF: { value: tex }, uSDFZone: { value: zone }, uHouleZone: {value:zone.clone()},
    uHTex: { value: carte.texH }, uEauTex: { value: carte.texEau }, uZone: { value: carte.zone },
    uZenith: U.uZenith, uMilieu: U.uMilieu, uHorizon: U.uHorizon, uSunDir: U.uSunDir, uSunCol: U.uSunCol, uNuit: U.uNuit, uCam: U.uCam, uNu: U.uNu,
    uShallow: { value: new THREE.Color('#b0dfc9') }, uMid: { value: new THREE.Color('#55c2b5') }, uDeep: { value: new THREE.Color('#237f9c') }, uAbyss: { value: new THREE.Color('#145971') }, uSable: { value: new THREE.Color('#e6d5a3') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `uniform float uTemps,uNativeWater; uniform sampler2D uSDF; ${GLSL_CHAMP}
      varying vec3 vW; ${GLSL_HOULE}
      void main(){ vec4 w = modelMatrix * vec4(position, 1.);
        float d = texture2D(uSDF, (w.xz - uSDFZone.xy) / uSDFZone.zw).r;
        w.y += ondeCotiere(w.xz).r + (1.-uNativeWater)*houleAtlas(w.xz, uTemps).x * .22 * smoothstep(.8, 5., d);
        vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${GLSL_BRUIT}${GLSL_CIEL}${GLSL_OMBRES}${GLSL_HOULE}${GLSL_CAUSTIQUES}${GLSL_FOND_MARIN}${GLSL_CHAMP}
      uniform sampler2D uScene,uDepth,uOriginalNormal; uniform vec2 uResolution; uniform float uNear,uFar;
      float linearDepth(float d){return uNear*uFar/(uFar-(uFar-uNear)*d);}
      uniform float uTemps, uSea; uniform vec3 uCam, uShallow, uMid, uDeep, uAbyss, uSable; uniform vec4 uZone; uniform sampler2D uSDF, uHTex, uEauTex;
      varying vec3 vW;
      vec2 uvIle(vec2 p){ return vec2((p.y - uZone.y) / uZone.w, (p.x - uZone.x) / uZone.z); }
      float haut(vec2 p){ vec2 u = uvIle(p);float ajoute=texture2D(uFondAjoute,(p-uSDFZone.xy)/uSDFZone.zw).r;
        if (u.x < 0. || u.y < 0. || u.x > 1. || u.y > 1.) return ajoute;
        return max(texture2D(uHTex, u).r,ajoute); }
      ${GLSL_EAU_SOURCE}
      void main(){
        if(uNativeWater>.5){gl_FragColor=couleurEauSource(vW,ondeCotiere(vW.xz));return;}
        vec2 p = vW.xz; vec2 u = uvIle(p);
        float hauteurSol=haut(p);
        // Le terrain opaque masque la mer par sa profondeur réelle. Découper
        // avec la carte de hauteurs grossière créait un liseré bleu dentelé.
        float distanceRive = texture2D(uSDF, (p - uSDFZone.xy) / uSDFZone.zw).r;
        float hFond=hauteurSol;
        // Le bord de la carte et son ancienne jupe verticale ne constituent
        // pas une fosse. Le fond marin continu borne la profondeur optique ;
        // la capture opaque fournit ensuite les vrais objets immergés.
        float profondeurFond=.35+distanceRive*.28;
        float profondeur=hFond>-20.?min(clamp(vW.y-hFond,0.,8.),profondeurFond):profondeurFond;
        float d = distanceRive;
        float n1 = fbm2(p * .45 + 3.), n2v = fbm2(p * 1.6 - 7.);
        d += (n1 - .5) * .20;
        /* jusant et flux : la ligne d'eau avance et recule sur la plage */
        float swash = .5 + .5 * sin(uTemps * .85 + n1 * 6.);
        float ds = min(d,profondeur*2.) - (swash * .25 - .06);
        /* houle clapotante : deux trains d'ondes dirigés plus un clapot fin ; plus l'eau est profonde, plus elle est agitée */
        float agit = .55 + .45 * smoothstep(1., 10., d);
        vec2 g = (vec2(n2(p * 2.3 + vec2(uTemps * .12, 0.)), n2(p * 2.3 + 9. - vec2(0., uTemps * .14))) - .5) * .12;
        vec3 houle = houleAtlas(p, uTemps);
        vec4 onde=ondeCotiere(p);
        vec3 N = normalize(vec3(-onde.g-houle.y*.22+g.x*.12, 1., -onde.b-houle.z*.22+g.y*.12)), V = normalize(uCam - vW);
        vec2 sourceN=texture2D(uOriginalNormal,vW.xz*.12+vec2(uTemps*.005,0.)).rg*2.-1.;
        N=normalize(N+vec3(sourceN.x,0.,sourceN.y)*.08);
        float fres = .02 + .98 * pow(1. - max(dot(N, V), 0.), 4.);
        vec3 R = reflect(-V, N);
        /* profondeur apparente : turquoise vert près de la plage, bleu-vert, puis violet au large */
        vec3 col = mix(uShallow, uMid, smoothstep(.12, .7, profondeur));
        col = mix(col, uDeep, smoothstep(.65, 2.4, profondeur));
        col = mix(col, uAbyss, smoothstep(2.2, 7., profondeur));
        /* sable visible sous l'eau claire, rides comprises */
        float fond = 1. - smoothstep(.2, 2.2, profondeur);
        // Réfraction du fond procédural : approximation, sans capture de scène.
        p += N.xz * (.08 + .24 * smoothstep(.3, 4., d));
        n1 = fbm2(p * .45 + 3.);
        float rides = .5 + .5 * sin(dot(p, vec2(.8, .6)) * 10. + n1 * 8.);
        vec3 sable = uSable * (.82 + .18 * rides);
        col = mix(col, mix(sable, col, .5), fond * .40);
        /* Fond virtuel extérieur : profondeur visuelle issue de la distance à la rive. */
        col = mix(col,fondMarinAtlas(col, p, profondeur, uTemps),.10);
        // Capture de la scène opaque : le vrai terrain, les galets et la végétation sous l'eau restent visibles.
        vec2 screenUV=gl_FragCoord.xy/uResolution;
        vec2 refrUV=clamp(screenUV+N.xz*min(profondeur,2.)*.007,vec2(.001),vec2(.999));
        float surfaceDepth=linearDepth(gl_FragCoord.z);
        if(linearDepth(texture2D(uDepth,refrUV).r)<surfaceDepth)refrUV=screenUV;
        float epaisseur=clamp(linearDepth(texture2D(uDepth,refrUV).r)-surfaceDepth,0.,min(8.,profondeur*1.6+.1));
        vec3 transmission=exp(-vec3(.42,.13,.075)*epaisseur);
        vec3 vraiFond=texture2D(uScene,refrUV).rgb*transmission+col*(1.-transmission);
        col=mix(col,vraiFond,.90*(1.-smoothstep(3.,7.,profondeur)));
        /* caustiques */
        float ca = caustiqueAtlas(p, uTemps) * (1. - smoothstep(.8, 3., profondeur)) * (1. - uNuit * .9);
        col += vec3(.72, .95, .84) * ca * .018;
        /* ombre portée de l'île : on remonte le rayon du soleil dans la carte de hauteurs */
        vec3 L = normalize(uSunDir); float om = 0.;
        for (int i = 1; i <= 20; i++){ vec3 s = vec3(p.x, uSea, p.y) + L * float(i) * .85; float hh = haut(s.xz); om = max(om, step(s.y, hh - .05) * step(-20., hh)); }
        col *= 1. - om * .22;
        float ombre = ombreNuages(vW);
        col *= 1. - ombre * .16;
        /* reflets du ciel prune (forts à grand angle) et éclats du soleil : mille petits points scintillants */
        vec3 ciel = couleurCiel(vec3(R.x, abs(R.y), R.z));
        col = mix(col, ciel * vec3(.95, .85, .95), fres * (.42 + .22 * smoothstep(4., 16., d)));
        float spec = pow(max(dot(R, uSunDir), 0.), 110.);
        col += uSunCol * spec * 1.35 * (1. - om);
        col += uSunCol * pow(max(dot(R, uSunDir), 0.), 16.) * .08;
        float scint = step(.965, n2(p * 11. + uTemps * 1.6)) * step(.55, n2(p * 1.2 + uTemps * .3)) * (1. - om) * (.4 + .6 * smoothstep(1., 8., d));
        col += vec3(1., .95, .85) * scint * .025;
        /* écume : bulles blanches dans la zone de balayage, vaguelettes qui avancent vers la rive, sillage autour du ponton */
        float bande = 1. - smoothstep(.008, .095, profondeur);
        float bulle = smoothstep(.43, .65, n2(p * 9.-vec2(uTemps*.08,uTemps*.04)));
        float rive=bande*(.18+.42*bulle);
        float train=onde.a*(.30+.70*bulle)*(1.-smoothstep(.18,.55,profondeur));
        col=mix(col,vec3(.95,.985,.94),clamp(max(rive,train),0.,.68));
        col *= mix(1., .3, uNuit);
        /* voile prune sur les bords de la dalle : la mer se perd dans la brume */
        float bord = max(abs(p.x - ${DIO.cx.toFixed(1)}) / ${DIO.demiX.toFixed(1)}, abs(p.y - ${DIO.cz.toFixed(1)}) / ${DIO.demiZ.toFixed(1)});
        col = mix(col, ciel * .75, smoothstep(.86, 1.02, bord) * .22);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(2 * DIO.demiX, 2 * DIO.demiZ, 180, 140).rotateX(-Math.PI / 2), mat);
  surface.position.set(DIO.cx, niv, DIO.cz); surface.frustumCulled = false; surface.renderOrder = -4; groupe.add(surface);
  // Continue the ocean outside the simulation rectangle without coarsening
  // its coastal grid or exposing the rectangular edge in the overview.
  const horizonPos=[],horizonIx=[],ax=DIO.demiX,az=DIO.demiZ,b=260;
  const strip=(x0,z0,x1,z1,ox,oz,n)=>{for(let i=0;i<n;i++){
    const t=i/n,u=(i+1)/n,k=horizonPos.length/3;
    const a=[x0+(x1-x0)*t,z0+(z1-z0)*t],c=[x0+(x1-x0)*u,z0+(z1-z0)*u];
    horizonPos.push(a[0],0,a[1],c[0],0,c[1],a[0]+ox,0,a[1]+oz,c[0]+ox,0,c[1]+oz);horizonIx.push(k,k+1,k+2,k+1,k+3,k+2);
  }};
  strip(-ax,-az,ax,-az,0,-b,180);strip(ax,az,-ax,az,0,b,180);strip(-ax,az,-ax,-az,-b,0,140);strip(ax,-az,ax,az,b,0,140);
  for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const k=horizonPos.length/3;horizonPos.push(x*ax,0,z*az,x*(ax+b),0,z*az,x*ax,0,z*(az+b),x*(ax+b),0,z*(az+b));if(x*z>0)horizonIx.push(k,k+2,k+1,k+1,k+2,k+3);else horizonIx.push(k,k+1,k+2,k+1,k+3,k+2);}
  const horizonGeo=new THREE.BufferGeometry();horizonGeo.setAttribute('position',new THREE.Float32BufferAttribute(horizonPos,3));horizonGeo.setIndex(horizonIx);horizonGeo.computeVertexNormals();
  const horizon=new THREE.Mesh(horizonGeo,mat);horizon.position.copy(surface.position);horizon.frustumCulled=false;horizon.renderOrder=-4;groupe.add(horizon);


  let dernierTemps=null,zoneNative=zone;const fondsAjoutes=[];
  return { groupe, niveau: niv, surface, horizon, ilotX:DIO.ilot.x, ilotZ:DIO.ilot.z,
    decouper(b){
      surface.geometry.dispose();surface.geometry=new THREE.PlaneGeometry(b.x1-b.x0,b.z1-b.z0,240,240).rotateX(-Math.PI/2);
      surface.position.set((b.x0+b.x1)/2,niv,(b.z0+b.z1)/2);horizon.visible=false;
      zoneNative=new THREE.Vector4(b.x0,b.z0,b.x1-b.x0,b.z1-b.z0);
    },
    hauteurEau:(x,z)=>houle.hauteur(x,z),vitesseEau:(x,z)=>houle.vitesse(x,z),impulsionEau:(...args)=>houle.impulsion(...args),diagnosticHoule:()=>houle.diagnostic(),
    async activerEauNative(renderer,qualite,relief=carte){
      const {creerEauNative}=await import('./atlas-eau-native.js?v=20261019-nacre-tranche-2');houle=await creerEauNative(renderer,relief,houle,zoneNative,qualite);uni.uHoule.value=houle.tex;uni.uHouleZone.value.copy(zoneNative);
      uni.uNativeWater.value=1;uni.uNativeFlow.value=houle.texFlux;
      const source=houle.parameters.waters.find(p=>p.type===houle.waterType).defaultParameters;
      for(const [target,color] of [[uni.uNativeColor,source.color],[uni.uNativeScattering,source.scatteringColor]])target.value.setRGB(color.r,color.g,color.b,THREE.SRGBColorSpace);
      uni.uNativeRefraction.value=houle.parameters.material.floats.find(([key])=>key==='refractionFactor')[1];
      return houle;
    },
    ajouterFond(f){fondsAjoutes.push(f);houle.ajouterFond(f);const next=champDistance(carte,fondsAjoutes);uni.uSDF.value.dispose();uni.uSDF.value=next.tex;houle.actualiserFond(next.tex);},
    actualiserFond(bounds){houle.actualiserFond(uni.uNativeWater.value?bounds:undefined);},
    tick(t) { uni.uTemps.value = t;houle.tick(dernierTemps===null?1/30:t-dernierTemps);uni.uNativeTime.value=houle.temps||0;dernierTemps=t; } };
}

/* L'îlot du phare : un monticule de sable qui sort de la mer, quelques rochers et des touffes, assez large pour porter la tour. */
export function creerIlot() {
  const { x, z, r } = DIO.ilot, groupe = new THREE.Group(), sommet = 0.62;
  const prof = [[1.12, -1.4], [1.0, -0.5], [0.8, -0.1], [0.62, 0.2], [0.42, 0.45], [0.2, 0.58], [0.0, sommet]].map(([k, y]) => new THREE.Vector2(r * k, y));
  const geo = new THREE.LatheGeometry(prof, 28), pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), claire = new THREE.Color('#f1bd88'), humide = new THREE.Color('#c99568');
  for (let i = 0; i < pos.count; i++) { const k = THREE.MathUtils.clamp((pos.getY(i) + 0.3) / 0.9, 0, 1), c = humide.clone().lerp(claire, k), j = 0.95 + Math.random() * 0.08; pos.setX(i, pos.getX(i) * (0.94 + Math.random() * 0.1)); cols.set([c.r * j, c.g * j, c.b * j], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const mont = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); mont.castShadow = mont.receiveShadow = true; groupe.add(mont);
  const rocGeo = new THREE.IcosahedronGeometry(1, 1), mR = new THREE.MeshStandardMaterial({ color: '#8c7a76', roughness: 1, flatShading: true });
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + Math.random() * 0.6, rr = r * (0.58 + Math.random() * 0.2), s = 0.16 + Math.random() * 0.22, m = new THREE.Mesh(rocGeo, mR); m.scale.set(s * 1.3, s * 0.7, s); m.position.set(Math.cos(a) * rr, 0.0 + s * 0.15, Math.sin(a) * rr); m.rotation.y = Math.random() * 6; m.castShadow = true; groupe.add(m); }
  const verts = ['#5f8f45', '#7aa655', '#46773c'].map((h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.9, flatShading: true }));
  for (let i = 0; i < 3; i++) { const a = 1.4 + i * 2.1, m = new THREE.Mesh(rocGeo, verts[i % 3]); m.scale.set(0.34, 0.2, 0.3); m.position.set(Math.cos(a) * r * 0.36, sommet - 0.18, Math.sin(a) * r * 0.36); m.castShadow = true; groupe.add(m); }
  groupe.position.set(x, 0, z);
  return { groupe, sommet, x, z, r };
}
