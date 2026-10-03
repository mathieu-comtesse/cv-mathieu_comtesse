/* TALAS: a ludicrous executive office, built from shared low-poly geometry.
   All furniture stays behind the fighting lane. Static colored parts are batched. */
window.TalasBureauPDG=(()=>{
  function build({THREE,scene,lights=false}){
    const root=new THREE.Group();root.name='bureau_pdg_fastueux';scene.add(root);
    const materials=new Map(),parts=[];
    const material=(color)=>{if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color,flatShading:true,map:color===wood?walnut:null}));return materials.get(color)};
    function add(geometry,color,x,y,z,name){const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.name=name||'office_detail';m.receiveShadow=true;m.castShadow=false;root.add(m);parts.push(m);return m}
    const box=(w,h,d,c,x,y,z,n)=>add(new THREE.BoxGeometry(w,h,d),c,x,y,z,n);
    const cylinder=(rt,rb,h,c,x,y,z,n)=>add(new THREE.CylinderGeometry(rt,rb,h,10),c,x,y,z,n);
    const sphere=(r,c,x,y,z,n)=>add(new THREE.SphereGeometry(r,10,7),c,x,y,z,n);
    const ring=(r,t,c,x,y,z,n)=>add(new THREE.TorusGeometry(r,t,5,16),c,x,y,z,n);
    const gold='#d6a23b',darkGold='#79511e',wood='#49302b',ink='#21172c',velvet='#711e43',cream='#f7e8c7';
    function texture(w,h,draw){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const t=new THREE.CanvasTexture(canvas);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t}
    function panel(w,h,x,y,z,map,name){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);m.name=name;root.add(m);return m}
    function plaque(text,w,x,y,z){const t=texture(384,80,(g,W,H)=>{g.fillStyle='#efd590';g.fillRect(0,0,W,H);g.strokeStyle=darkGold;g.lineWidth=8;g.strokeRect(4,4,W-8,H-8);g.fillStyle=ink;g.font='900 48px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,H/2+1,W-30)});return panel(w,w*80/384,x,y,z,t,'plaque_'+text)}
    const walnut=texture(128,128,(g,w,h)=>{g.fillStyle='#684134';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=5){g.fillStyle=y%10?'#57352f':'#85533a';g.fillRect(0,y,w,1);g.fillRect((y*7)%w,y,30,1)}});
    // A wide, unobstructed lane, marble floor and a pompous crimson carpet.
    box(28,.16,20,'#343343',0,-.12,-2,'sol_marbre');
    const marble=texture(128,128,(g,w,h)=>{g.fillStyle='#484254';g.fillRect(0,0,w,h);g.strokeStyle='#675c71';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(i*17,0);g.lineTo(i*17+30,50);g.lineTo(i*17-12,90);g.lineTo(i*17+12,h);g.stroke()}});marble.wrapS=marble.wrapT=THREE.RepeatWrapping;marble.repeat.set(7,5);
    const floor=panel(28,20,0,-.031,-2,marble,'marbre_peint');floor.rotation.x=-Math.PI/2;
    box(11,.045,5,velvet,0,.015,.3,'tapis_de_combat');box(11.2,.03,5.2,gold,0,-.008,.3,'bordure_tapis');
    // Back wall, walnut panels, gilt pilasters and panoramic industrial windows.
    box(28,8,.3,wood,0,4,-7.4,'mur_fond');
    [-1,1].forEach(side=>box(.2,8,11,wood,side*14,4,-1.8,'mur_lateral'));
    for(let x=-12;x<=12;x+=3){box(.09,7.8,.18,gold,x,3.9,-7.18,'moulure_verticale');box(2.75,1.1,.16,'#5c3936',x,1,-7.17,'boiserie')}
    [1.7,6.6,7.6].forEach(y=>box(28,.11,.2,gold,0,y,-7.1,'corniche'));
    const skyline=texture(256,160,(g,w,h)=>{const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#262c68');grad.addColorStop(.65,'#877799');grad.addColorStop(1,'#baa179');g.fillStyle=grad;g.fillRect(0,0,w,h);for(let i=0;i<20;i++){const hh=25+(i*29)%55;g.fillStyle=i%2?'#333b63':'#414c73';g.fillRect(i*14,h-hh,12,hh);g.fillStyle='#edce84';for(let y=h-hh+5;y<h;y+=9)for(let x=i*14+3;x<i*14+11;x+=5)if((x+y+i)%3)g.fillRect(x,y,2,3)}});
    [-8,8].forEach(x=>{box(6.5,4.5,.12,gold,x,4.4,-7.02,'cadre_baie');panel(6.1,4.1,x,4.4,-6.93,skyline,'vue_sur_usine');box(.1,4.1,.08,ink,x,4.4,-6.86,'meneau');box(6.1,.1,.08,ink,x,4.4,-6.85);[-1,1].forEach(q=>{box(.9,5,.28,velvet,x+q*3.55,4.1,-6.7,'rideau_velours');box(1.0,.12,.33,gold,x+q*3.55,3.5,-6.5,'embrasse')})});
    // The CEO's oversized self portrait: crooked nose, raised eyebrow and cigar.
    box(4.4,4.4,.35,darkGold,0,4.8,-6.9,'cadre_autoportrait');box(4.15,4.15,.2,gold,0,4.8,-6.65,'dorure_autoportrait');
    const portrait=texture(192,192,(g,w,h)=>{g.fillStyle='#40274f';g.fillRect(0,0,w,h);g.fillStyle='#342965';g.beginPath();g.moveTo(22,h);g.lineTo(44,134);g.lineTo(143,134);g.lineTo(175,h);g.fill();g.fillStyle='#e6bd89';g.beginPath();g.ellipse(100,99,41,48,0,0,7);g.fill();g.fillStyle='#e6bd89';g.beginPath();g.moveTo(67,95);g.lineTo(36,117);g.lineTo(73,120);g.fill();g.fillStyle='#ddd9e6';g.beginPath();g.ellipse(110,59,48,17,-.1,0,7);g.fill();g.fillRect(139,70,14,44);g.strokeStyle=ink;g.lineWidth=5;g.beginPath();g.moveTo(62,82);g.lineTo(84,78);g.moveTo(105,80);g.lineTo(122,76);g.stroke();g.fillStyle=ink;g.fillRect(71,91,6,7);g.fillRect(109,90,6,7);g.fillStyle='#883b2d';g.fillRect(51,124,55,8);g.fillStyle='#ee7f3a';g.fillRect(44,124,8,8);g.fillStyle=cream;g.beginPath();g.moveTo(70,137);g.lineTo(94,170);g.lineTo(111,137);g.fill();g.fillStyle='#ad455b';g.fillRect(91,148,10,37)});
    const im=new Image();im.src='assets/talas/arcade-aurelien-estampe.webp?v=20261003-combat-2';const portraitMap=texture(384,384,(g)=>{g.drawImage(portrait.image,0,0,384,384)});const drawPortrait=()=>{const g=portraitMap.image.getContext('2d');g.fillStyle='#34244c';g.fillRect(0,0,384,384);g.drawImage(im,0,0,384,384);portraitMap.needsUpdate=true};if(im.complete&&im.naturalWidth)drawPortrait();else im.onload=drawPortrait;
    panel(3.72,3.72,0,4.8,-6.52,portraitMap,'autoportrait_du_pdg');plaque('MOI DU MOIS',3.6,0,2.65,-6.38);
    // The colossal desk and its throne sit beyond the combat area, z <= -3.6.
    box(8.8,.26,2.0,gold,0,1.48,-4.8,'plateau_dore');box(8.6,.18,1.95,wood,0,1.64,-4.8,'plateau_noyer');
    [-3.2,3.2].forEach(x=>box(1.7,1.4,1.7,wood,x,.7,-4.8,'caisson_bureau'));box(5.1,1.0,.12,'#61422c',0,.81,-3.87,'facade_bureau');plaque('PDG DE MOI',3.0,0,1.0,-3.59);
    box(2.2,2.4,.32,gold,0,2.1,-6.0,'trone_dore');box(1.85,2.0,.38,velvet,0,2.1,-5.8,'dossier_velours');sphere(.22,gold,-.95,3.5,-5.93);sphere(.22,gold,.95,3.5,-5.93);box(2.1,.3,1.0,velvet,0,1.0,-5.72,'assise');
    // Grotesque corporate trophies: a giant golden helmet, paperclip and bonus safe.
    [-6.1,6.1].forEach(x=>{cylinder(.66,.83,1.3,cream,x,.65,-4.9,'socle_trophee');cylinder(.83,.83,.12,gold,x,1.32,-4.9)});
    const helmet=sphere(.72,gold,-6.1,1.75,-4.9,'casque_or_geant');helmet.scale.set(1,.8,1);box(1.75,.11,1.7,gold,-6.1,1.54,-4.9,'visiere_casque');plaque('24 CARATS',2.1,-6.1,.76,-4.03);
    const clip=ring(.56,.09,gold,6.1,2.1,-4.9,'trombone_trophee');clip.scale.y=1.9;const inner=ring(.34,.06,gold,6.1,2.05,-4.88);inner.scale.y=1.9;plaque('RÉUNION',2.2,6.1,.76,-4.03);
    box(1.7,2,1.2,'#373a49',10.8,1,-5.7,'coffre_primes');box(1.5,1.8,.1,darkGold,12,1,-4.95,'porte_coffre').rotation.y=-.9;ring(.24,.055,gold,12,1,-4.81,'volant_coffre');
    for(let i=0;i<4;i++)box(.7,.12,.45,i%2?'#63846a':'#7c9a75',10.55+i*.05,2.08+i*.12,-5.4,'liasses_primes');
    cylinder(.3,.3,.65,gold,2.8,2,-4.7,'machine_expresso');box(.7,.8,.65,'#353140',2.8,2.05,-4.7,'expresso_comex');cylinder(.13,.15,.16,cream,2.8,1.82,-4.18,'tasse');
    for(let i=0;i<5;i++)box(.8,.11,.6,i%2?'#fff1c7':'#bbb2c7',-2.5+i*.06,1.79+i*.11,-4.6,'rapports_non_lus');
    // Gold chandelier, warm visible bulbs; no additional shadow maps or particles.
    const chandelier=ring(1.45,.12,gold,0,5.65,-2.8,'lustre');chandelier.rotation.x=Math.PI/2;cylinder(.06,.06,2.3,darkGold,0,6.85,-2.8);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*1.45,z=-2.8+Math.sin(a)*1.45;cylinder(.045,.045,.45,gold,x,5.85,z);sphere(.105,cream,x,6.13,z,'ampoule')}
    // Hand-drawn corporate excess: mouldings, tufted velvet, banker lamp and open bonus safe.
    for(let x=-12;x<=12;x+=3){box(2.6,.04,.06,darkGold,x,.52,-7.01);box(2.6,.04,.06,gold,x,1.46,-7.01);for(const q of [-1,1])box(.045,.94,.06,gold,x+q*1.3,.99,-7.01);}
    for(const wx of [-8,8])for(const side of [-1,1])for(let j=0;j<5;j++){const x=wx+side*3.55+(j-2)*.15;box(.075,4.7,.16,j%2?'#902448':velvet,x,4.08,-6.49,'pli_rideau');}
    // Carved desk panels and gilded scrolls around the self portrait.
    for(let x=-3.2;x<=3.2;x+=2.15){box(1.9,.85,.035,darkGold,x,.73,-3.78);box(1.74,.7,.045,wood,x,.73,-3.75);for(const y of [.36,1.1])box(1.9,.045,.055,gold,x,y,-3.72);for(const q of [-1,1])box(.045,.72,.055,gold,x+q*.93,.73,-3.72);sphere(.07,gold,x,.76,-3.67);}
    for(const q of [-1,1]){for(let i=0;i<5;i++){const rr=ring(.14+i*.05,.028,gold,q*(2.25+i*.12),4.8+Math.sin(i*1.1)*1.2,-6.42,'volute_or');rr.scale.y=.65;}sphere(.17,gold,q*2.15,7,-6.5);}
    for(let x=-.68;x<=.68;x+=.34)for(let y=1.45;y<=2.85;y+=.35){sphere(.035,gold,x,y,-5.58,'bouton_capitonne');const seam=box(.022,.39,.02,'#40172d',x,y,-5.55);seam.rotation.z=.62;}
    box(.9,.1,.6,darkGold,-.9,1.82,-4.9,'pied_lampe');cylinder(.04,.04,.65,gold,-.9,2.17,-4.9);const shade=cylinder(.35,.46,.26,'#2e785d',-.9,2.6,-4.9,'lampe_banquier');shade.scale.z=.58;
    box(.62,.14,.5,ink,1.1,1.89,-4.7,'telephone');box(.78,.11,.15,ink,1.1,2.04,-4.7,'combine');
    for(let i=0;i<6;i++){box(1.2,.06,.44,'#f5e7c6',10.7,1.58-i*.25,-5.03,'liasse_interieur');box(.14,.063,.46,'#679573',10.7,1.59-i*.25,-5.03,'ruban_liasse');}
    const carpet=texture(128,64,(g,w,h)=>{g.fillStyle='#782642';g.fillRect(0,0,w,h);g.fillStyle='#a84651';for(let x=0;x<w;x+=16)for(let y=0;y<h;y+=16){g.fillRect(x+6,y+4,3,8);g.fillRect(x+3,y+7,9,2)}g.strokeStyle='#dabd6c';g.lineWidth=2;g.strokeRect(3,3,w-6,h-6)});
    const rug=panel(11,5,0,.042,.3,carpet,'tapis_damasse');rug.rotation.x=-Math.PI/2;
    for(const m of parts)if(m.name==='trone_dore'||m.name==='dossier_velours'||m.name==='assise'||m.name==='bouton_capitonne'||(m.position.z===-5.55&&m.position.y>=1.4&&m.position.y<=2.9)||(m.position.y===3.5&&m.position.z===-5.93))m.position.x+=2.4;
    // Materials shared by every ornament: merge static pieces by material.
    root.updateMatrixWorld(true);const batches=new Map();
    for(const m of parts){const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geometry.applyMatrix4(m.matrixWorld);if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(geometry);root.remove(m);m.geometry.dispose()}
    for(const [mat,list] of batches){const merged=new THREE.BufferGeometry();for(const name of ['position','normal','uv']){const attributes=list.map(g=>g.getAttribute(name));if(attributes.some(a=>!a))continue;const arr=new Float32Array(attributes.reduce((n,a)=>n+a.array.length,0));let at=0;for(const a of attributes){arr.set(a.array,at);at+=a.array.length}merged.setAttribute(name,new THREE.BufferAttribute(arr,attributes[0].itemSize))}merged.computeBoundingSphere();const m=new THREE.Mesh(merged,mat);m.name='bureau_batch_'+mat.color.getHexString();m.receiveShadow=true;root.add(m);list.forEach(g=>g.dispose())}
    if(lights){root.add(new THREE.HemisphereLight(0xbcb4ed,0x403027,.85));const key=new THREE.DirectionalLight(0xffdba6,1.15);key.position.set(-4,8,5);root.add(key);const rim=new THREE.DirectionalLight(0x90aaff,.45);rim.position.set(4,5,-4);root.add(rim)}
    root.userData={staticParts:parts.length,materialBatches:batches.size,fightingLane:{x0:-5.5,x1:5.5,z0:-2.2,z1:2.8},mobileShadows:false};return root;
  }
  return {build};
})();
