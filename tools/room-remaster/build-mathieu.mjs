import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Vector3 } from '../../vendor/three.module.min.js';
import { Facets, meshFrom, newGLB, rigFrom, writeGLB, octagon, mix, offset } from './geometry.mjs';

const folder = new URL('../../assets/room-remaster/character/',import.meta.url);
const anchors = JSON.parse(await readFile(new URL('rig-anchors.json',folder),'utf8'));
const names = Object.keys(anchors);
const morphs=['blink','smile','open','round'];
const body=new Facets(names,morphs), shoes=new Facets(names), socks=new Facets(names);
const pigments = {
  jacket:['#286162','#326d6d','#214e55','#1e464c','#23454a','#254b50','#245359','#2c6264'],
  denim:['#435779','#384d71','#334769','#344465','#354568','#394c71','#3c5278','#485d81'],
  skin:['#d79e7a','#c58c69','#c18465','#b77357','#ae6d55','#b97c60','#cc8b6b','#d19671'],
  ink:['#313b43','#333c44','#2e353e','#28333d'],
  hair:['#654639','#6e4c3b','#49352d','#3e2d29','#513830','#553a32','#4e3930','#634339'],
};
const bind = n=>[n,1];
const point = n=>anchors[n].p;
const dir = (a,b)=>new Vector3(...b).sub(new Vector3(...a)).normalize().toArray();
const polarLoft=(target,shape,colors,axis=[0,1,0])=>target.loft(
  shape.map(([p,w,d])=>octagon(p,w,d,axis)),colors,shape.map(row=>row[3]),
);
const torso = [
  [[-.009,.697,-.023],.177,.104,bind('pelvis')],
  [[-.008,.752,-.020],.198,.116,[['pelvis',.58],['spine_01',.42]]],
  [[-.005,.922,-.016],.219,.123,bind('spine_02')],
  [[-.004,1.037,-.025],.227,.112,bind('spine_03')],
  [[-.003,1.102,-.013],.126,.085,[['spine_03',.72],['neck_01',.28]]],
];
polarLoft(body,torso,pigments.jacket);
polarLoft(body,[
  [[.004,1.088,.016],.070,.066,bind('neck_01')],
  [[.016,1.213,.078],.082,.069,bind('Head')],
],pigments.skin,dir([0,1.08,0],[.01,1.22,.075]));

// Cut edges and pockets are authored as reliefs on the open overshirt.
const lapel=(sign)=>{
  const a=[sign*.126,1.095,.073], b=[sign*.187,1.04,.090];
  const c=[sign*.077,.946,.113], d=[sign*.05,1.055,.101];
  body.tri(a,b,c,'#3c7774',[bind('neck_01'),bind('spine_03'),bind('spine_02')]);
  body.tri(a,c,d,'#518583',[bind('neck_01'),bind('spine_02'),bind('spine_03')]);
  body.box([sign*.147,.884,.112],[.047,.048,.014],sign>0?'#367573':'#2e6567','spine_02');
  body.box([sign*.147,.929,.121],[.045,.008,.010],'#8eab9b','spine_02');
};
lapel(1);lapel(-1);
const shirt=[[.008,1.058,.130],[-.064,1.079,.112],[-.087,.748,.116],[.087,.748,.116],[.064,1.079,.112]];
body.tri(shirt[0],shirt[1],shirt[2],'#efe3cd',[bind('spine_03'),bind('spine_03'),bind('spine_01')]);
body.tri(shirt[0],shirt[2],shirt[3],'#ded1b8',[bind('spine_03'),bind('spine_01'),bind('spine_01')]);
body.tri(shirt[0],shirt[3],shirt[4],'#e8dcc4',[bind('spine_03'),bind('spine_01'),bind('spine_03')]);
body.box([-.103,.727,.118],[.020,.034,.014],'#c47e50','pelvis');

polarLoft(body,[
  [[-.01,.605,-.022],.163,.092,bind('pelvis')],
  [[-.01,.676,-.018],.183,.114,bind('pelvis')],
  [[-.01,.740,-.020],.175,.106,bind('pelvis')],
],pigments.denim);
body.box([-.008,.711,.091],[.15,.014,.014],'#31434d','pelvis');
body.box([.019,.708,.110],[.022,.016,.010],'#bb8b5c','pelvis');
for(const [side,sign] of [['l',1],['r',-1]]){
  const upper='upperarm_'+side, lower='lowerarm_'+side, hand='hand_'+side;
  const thigh='thigh_'+side, calf='calf_'+side, foot='foot_'+side;
  const shoulder=point(upper), elbow=point(lower), wrist=point(hand);
  const sleeveStart=mix(shoulder,elbow,-.13), sleeveEnd=mix(shoulder,elbow,.95);
  polarLoft(body,[
    [sleeveStart,.102,.088,bind(upper)],
    [mix(shoulder,elbow,.42),.105,.095,bind(upper)],
    [sleeveEnd,.081,.075,[[upper,.7],[lower,.3]]],
  ],pigments.jacket,dir(shoulder,elbow));
  polarLoft(body,[
    [mix(shoulder,elbow,.84),.071,.065,[[upper,.42],[lower,.58]]],
    [mix(elbow,wrist,.27),.069,.066,bind(lower)],
    [mix(elbow,wrist,.86),.049,.049,[[lower,.7],[hand,.3]]],
    [wrist,.045,.046,bind(hand)],
  ],side==='r'?pigments.ink:pigments.skin,dir(elbow,wrist));
  const thumb=offset(mix(elbow,wrist,1.20),-sign*.038,.013,.048);
  const tip=mix(elbow,wrist,1.47);
  polarLoft(body,[
    [wrist,.047,.039,bind(hand)],
    [mix(wrist,tip,.49),.059,.050,bind(hand)],
    [tip,.040,.035,bind(hand)],
  ],side==='r'?pigments.ink:pigments.skin,dir(wrist,tip));
  polarLoft(body,[
    [mix(wrist,tip,.23),.039,.033,bind(hand)],
    [thumb,.022,.023,bind(hand)],
  ],side==='r'?'#3c4850':'#d29a76',dir(wrist,thumb));

  const hip=point(thigh), knee=point(calf), ankle=point(foot);
  const legAxis=dir(ankle,hip);
  polarLoft(body,[
    [mix(knee,ankle,.84),.109,.091,[[calf,.8],[foot,.2]]],
    [mix(knee,ankle,.41),.115,.099,bind(calf)],
    [knee,.101,.092,[[thigh,.44],[calf,.56]]],
    [mix(knee,hip,.54),.119,.108,bind(thigh)],
    [offset(hip,sign*.024,.047,-.005),.110,.106,[[thigh,.7],['pelvis',.3]]],
  ],pigments.denim,legAxis);
  body.box(offset(mix(hip,knee,.47),sign*.105,.028,.034),[.034,.060,.060],side==='r'?'#405674':'#4c6583',thigh);
  const front=point('ball_'+side);
  const fwd=new Vector3(front[0]-ankle[0],0,front[2]-ankle[2]).normalize();
  const across=new Vector3(0,1,0).cross(fwd);
  const footRing=(y,w,back,toe)=>[
    [-w,back+.05],[-w*.75,back], [w*.64,back], [w,back+.055],
    [w*.94,toe-.047], [w*.68,toe], [-w*.66,toe],[-w*.96,toe-.05],
  ].reverse().map(([x,z])=>new Vector3(ankle[0],y,ankle[2]).addScaledVector(fwd,z).addScaledVector(across,x).toArray());
  const boot=(target,rows,colors)=>target.loft(rows.map(row=>footRing(...row)),colors,rows.map(()=>bind(foot)));
  boot(shoes,[[-.030,.095,-.087,.265],[-.005,.111,-.100,.285],[.027,.113,-.097,.279]],
    ['#303942','#3b4853','#3f4d58','#47545b','#525a60']);
  boot(shoes,[[.016,.111,-.094,.279],[.054,.118,-.093,.280],[.102,.106,-.089,.258],[.137,.080,-.068,.190],[.189,.067,-.058,.092]],
    ['#b3afa5','#ded8c3','#bdc4c6','#d4cfc0','#aab3b8','#a0abb5','#cec8bb','#b8bfba']);
  const mark=new Vector3(ankle[0],.099,ankle[2]).addScaledVector(fwd,.123).addScaledVector(across,sign*.096);
  shoes.box(mark.toArray(),[.015,.025,.051],'#7c8891',foot);
  boot(socks,[[-.021,.081,-.071,.233],[.050,.089,-.081,.239],[.102,.082,-.075,.175],[.182,.061,-.048,.069]],
    ['#c9c4b7','#e3d8c4','#bdc0bb']);
}

// Skull rings change width and depth at the jaw, cheek, temple, and crown.
polarLoft(body,[
  [[.018,1.174,.104],.073,.083,bind('Head')],
  [[.020,1.212,.112],.137,.127,bind('Head')],
  [[.022,1.300,.105],.169,.148,bind('Head')],
  [[.022,1.407,.085],.171,.158,bind('Head')],
  [[.018,1.511,.070],.157,.150,bind('Head')],
  [[.008,1.600,.045],.096,.102,bind('Head')],
],pigments.skin);
for(const s of [-1,1]) {
  body.box([.020+s*.171,1.326,.090],[.029,.052,.034],s===1?'#c58867':'#c48866','Head');
  body.box([.020+s*.183,1.330,.119],[.014,.027,.015],'#a96652','Head');
}
const nose=[[.007,1.370,.245],[.045,1.370,.245],[.069,1.282,.265],[-.015,1.282,.267],[.024,1.291,.311]];
body.face([nose[0],nose[3],nose[4]],'#e5aa81',bind('Head'));
body.face([nose[0],nose[4],nose[1]],'#eab188',bind('Head'));
body.face([nose[1],nose[4],nose[2]],'#c88d6c',bind('Head'));
body.face([nose[3],nose[2],nose[4]],'#b7765c',bind('Head'));
polarLoft(body,[
  [[.005,1.478,.051],.158,.167,bind('Head')],
  [[-.010,1.554,.048],.180,.181,bind('Head')],
  [[-.023,1.630,.053],.162,.156,bind('Head')],
  [[-.054,1.701,.050],.092,.114,bind('Head')],
  [[-.089,1.733,.048],.033,.054,bind('Head')],
],pigments.hair);
const fringe = [
  [[-.192,1.544,.120],[-.105,1.622,.217],[-.122,1.480,.246],[-.167,1.455,.193],'#624335'],
  [[-.109,1.626,.219],[.021,1.644,.228],[.047,1.521,.274],[-.060,1.491,.267],'#79513b'],
  [[.013,1.648,.220],[.153,1.604,.175],[.175,1.496,.183],[.076,1.489,.251],'#654536'],
  [[.114,1.605,.144],[.167,1.565,.102],[.189,1.405,.094],[.145,1.444,.177],'#4d372d'],
];
for(const [a,b,c,d,color] of fringe){
  const ridge=mix(mix(a,c,.48),mix(b,d,.48),.53); ridge[2]+=.026;
  body.tri(a,d,ridge,color,bind('Head'));
  body.tri(d,c,ridge,color,bind('Head'));
  body.tri(c,b,ridge,'#6d4837',bind('Head'));
  body.tri(b,a,ridge,'#825941',bind('Head'));
}

function plate(cx,cy,z,w,h,bevel) {
  return [[-w+bevel,-h],[w-bevel,-h],[w,-h+bevel],[w,h-bevel],[w-bevel,h],[-w+bevel,h],[-w,h-bevel],[-w,-h+bevel]]
    .map(([x,y])=>[cx+x,cy+y,z]);
}
const faceBone=bind('Head');
const eyeLevel=1.387;
for(const sign of [-1,1]){
  const cx=.022+sign*.090;
  const z=.273;
  const eye=(name,p)=>name==='blink'?[p[0],eyeLevel+(p[1]-eyeLevel)*.13,p[2]]:p;
  body.face(plate(cx,eyeLevel,z-.008,.050,.030,.013),'#d8b7a1',faceBone,eye);
  body.face(plate(cx+sign*.004,eyeLevel-.001,z-.005,.019,.026,.009),'#58747a',faceBone,eye);
  body.face(plate(cx+sign*.004,eyeLevel+.001,z-.003,.009,.016,.006),'#223039',faceBone,eye);
  body.face(plate(cx-.004,eyeLevel+.012,z-.002,.0045,.006,.002),'#f5e5cc',faceBone,eye);
  const outer=plate(cx,eyeLevel,z,.069,.046,.015);
  const inner=plate(cx,eyeLevel,z+.004,.059,.036,.011);
  for(let i=0;i<8;i++){const j=(i+1)%8;body.face([outer[i],outer[j],inner[j],inner[i]],i<3?'#242e36':'#3a4850',faceBone);}
  body.box([cx+sign*.068,1.397,.206],[.010,.011,.068],'#303940','Head');
  body.face(plate(cx,1.446,.247,.047,.012,.007),'#4b342c',faceBone);
}
body.face(plate(.022,1.401,.278,.032,.012,.005),'#303940',faceBone);
const mouthY=1.236;
const expression=(name,p)=>{
  const y=p[1]-mouthY,x=p[0]-.024;
  if(name==='smile')return [p[0],p[1]+Math.abs(x)*.32,p[2]];
  if(name==='open')return [p[0],mouthY+y*2.4,p[2]];
  if(name==='round')return [.024+x*.52,mouthY+y*2.1,p[2]];
  return p;
};
body.face(plate(.024,mouthY,.244,.038,.009,.007),'#58382e',faceBone,expression);
body.face(plate(.024,mouthY-.010,.244,.025,.004,.002),'#b7735b',faceBone,expression);

const state=newGLB('Mathieu, atelier des objets');
const skin=rigFrom(state,anchors);
const assets=[['MathieuMesh-v2',body],['MathieuSneakers-v2',shoes],['MathieuSocks-v2',socks]];
for(const [name,mesh] of assets) state.scene.addChild(state.doc.createNode(name).setMesh(meshFrom(mesh,state,name)).setSkin(skin));
await writeGLB(state,fileURLToPath(new URL('mathieu-v2.glb',folder)));
await writeFile(new URL('geometry.json',folder),JSON.stringify({
  name:'mathieu-v2',
  authoring:'tools/room-remaster/build-mathieu.mjs',
  rig:'rig-anchors.json',
  originalRig:'assets/reference-character.glb',
  meshes:Object.fromEntries(assets.map(([name,g])=>[name,{triangles:g.positions.length/9}])),
  expressions:morphs,
},null,2)+'\n');
