import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CatmullRomCurve3, Vector3 } from '../../vendor/three.module.min.js';
import { Facets, meshFrom, newGLB, writeGLB, octagon } from './geometry.mjs';

const root=new URL('../../assets/room-remaster/',import.meta.url);
const steel='#929ba0', graphite='#36434a', ink='#253139';
const endgrain='#5e473e', rust='#b36d4d', fern='#567b62', jade='#34654f';
const ivory=['#e4d8c3','#ded2be','#c8bfae','#c4baaa'];
const green=['#64865c','#78966b','#567851','#4c6d4b'];
const wood=['#a37c62','#a88468','#80624f','#745b4b'];
const metal=[steel,'#b1b9b5','#7b888b','#697579'];
const data={};

function rod(g,a,b,r,color,end=r) {
  const axis=new Vector3(...b).sub(new Vector3(...a)).toArray();
  g.loft([octagon(a,r,r,axis),octagon(b,end,end,axis)],color);
}
function tube(g,points,r,color,steps=14) {
  const curve=new CatmullRomCurve3(points.map(a=>new Vector3(...a)));
  const rings=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    rings.push(octagon(curve.getPointAt(t).toArray(),r,r,curve.getTangentAt(t).toArray()));
  }
  g.loft(rings,color);
}
function ring(g,center,r,wire,color,axis='x',n=32){
  const points=[];
  const [x,y,z]=center;
  for(let i=0;i<=n;i++){
    const a=i/n*Math.PI*2;
    points.push(axis==='x'?[x,y+r*Math.cos(a),z+r*Math.sin(a)]:axis==='z'?[x+r*Math.cos(a),y+r*Math.sin(a),z]:[x+r*Math.cos(a),y,z+r*Math.sin(a)]);
  }
  for(let i=0;i<n;i++)rod(g,points[i],points[i+1],wire,color);
}
function slab(g, x, y, z, w, h, d, color){
  g.box([x,y,z],[w/2,h/2,d/2],color);
}
function squaredSlab(g,x,y,z,w,h,d,color){
  const a=w*.5,b=d*.5,e=Math.min(.014,w*.2,d*.2);
  const ring = Y => [[-a+e,b],[a-e,b],[a,b-e],[a,-b+e],[a-e,-b],[-a+e,-b],[-a,-b+e],[-a,b-e]]
    .map(([u,v]) => [x+u,Y,z+v]);
  g.loft([ring(y-h*.5),ring(y+h*.5)],color);
}
function bulb(g,center,r,color){
  const [x,y,z]=center;
  g.loft([octagon([x,y-r,z],r*.35,r*.35),octagon(center,r,r),octagon([x,y+r,z],r*.35,r*.35)],color);
}
function caseFraming(g,z,w,h,y,color){
  slab(g,0,y+h*.48,z,w,h*.09,.052,color);
  slab(g,0,y-h*.49,z,w,h*.19,.065,color);
  for(const x of [-w*.47,w*.47]) slab(g,x,y,z,w*.12,h,.054,color);
}

const families={
  desk: {
    BureauUSM(g) {
      slab(g,0,.734,0,1.43,.055,.71,ivory);
      slab(g,0,.694,0,1.41,.025,.65,'#84908e');
      for(const x of [-.665,.665])for(const z of [-.297,.297]){
        rod(g,[x,.032,z],[x,.702,z],.017,metal);
        bulb(g,[x,.701,z],.029,metal);
        rod(g,[x,.007,z],[x,.046,z],.022,graphite);
      }
      for(const z of [-.297,.297]) rod(g,[-.665,.663,z],[.665,.663,z],.017,metal);
      for(const x of [-.665,.665]) rod(g,[x,.663,-.297],[x,.663,.297],.018,metal);
    },
    CaissonUSM(g){
      slab(g,0,.347,0,.405,.595,.48,ivory);
      for(const x of [-.21,.21])for(const z of [-.23,.23]){
        rod(g,[x,.054,z],[x,.638,z],.014,metal);
        bulb(g,[x,.64,z],.020,steel);
        rod(g,[x,.005,z],[x,.064,z],.032,graphite);
      }
      for(const y of [.17,.345,.52]){
        slab(g,0,y,.251,.38,.163,.04,'#b8c3bd');
        slab(g,0,y+.033,.276,.085,.018,.018,graphite);
      }
    },
    SetuAssise(g){
      slab(g,0,.06,.055,.48,.105,.48,['#6a8a84','#789791','#627c7b','#607675']);
      for(const x of [-.247,.247]){
        tube(g,[[x,.02,.270],[x,.012,.05],[x,.040,-.148],[x,.196,-.228],[x,.433,-.294]],.022,metal,8);
      }
      g.loft([octagon([0,.10,-.148],.236,.038),octagon([0,.26,-.226],.253,.040),octagon([0,.47,-.275],.222,.032)],
        ['#78918d','#8da5a0','#75908b','#627e79']);
      for(const y of [.182,.245,.315,.39]) slab(g,0,y,-.126-y*.29,.393,.006,.009,'#a4aba1');
      rod(g,[-.23,.458,-.269],[.23,.458,-.269],.018,metal);
    },
    Moonlander(g) {
      for(const s of [-1,1]){
        g.loft([octagon([s*.100,.004,0],.090,.106),octagon([s*.103,.022,-.004],.094,.106),octagon([s*.098,.029,-.012],.084,.092)],
          ['#3a4a55','#455964','#283a44']);
        for(let ix=0;ix<5;ix++)for(let iz=0;iz<5;iz++){
          const x=s*(.041+ix*.027), z=-.076+iz*.032;
          slab(g,x,.033+iz*.0008,z,.021,.012,.022,ix%2===0?'#5d706f':'#455a61');
        }
        for(const k of [0,1,2]) slab(g,s*(.032+k*.023),.028,.096+k*.008,.019,.013,.029,k===0?'#bd7450':'#8f9c93');
      }
    },
    MXMaster(g) {
      g.loft([octagon([0,.005,0],.041,.067),octagon([-.006,.025,-.008],.048,.072),octagon([-.005,.050,-.015],.041,.050),octagon([-.008,.063,-.026],.025,.026)],
        ['#43545b','#56666b','#324851','#253640','#3e5055']);
      slab(g,0,.041,.033,.018,.023,.024,steel);
      slab(g,-.044,.017,.011,.037,.020,.065,'#56646a');
      slab(g,.003,.031,.062,.003,.011,.029,'#82908c');
    },
  },
  furniture:{
    DS450(g){
      for(const s of [-1,1]){
        const x=s*.51;
        g.loft([octagon([x,.236,.07],.485,.323),octagon([x,.301,.10],.52,.351),octagon([x,.391,.12],.495,.326)],
          ['#45525e','#515c66','#394654','#323d4a','#47535d']);
        g.loft([octagon([x,.365,-.227],.500,.108),octagon([x,.535,-.313],.487,.104),octagon([x,.707,-.391],.461,.066)],
          ['#505b67','#606b72','#444f5c','#3d4a54','#4e5861']);
        for(const z of [-.235,.29]) rod(g,[x+s*.38,.012,z],[x+s*.39,.267,z],.022,graphite);
        rod(g,[x-s*.385,.25,.29],[x+s*.42,.25,.29],.016,ink);
      }
      for(const x of [-1.01,1.01]){
        tube(g,[[x,.299,-.340],[x,.485,-.215],[x,.448,.09],[x,.398,.335]],.079,['#495863','#596774','#3d4b55'],8);
      }
    },
    Ekstrem(g){
      for(const s of [-1,1]){
        tube(g,[[s*.25,.025,.280],[s*.37,.295,.32],[s*.35,.47,.29],[s*.18,.552,.08],[s*.31,.765,-.225],[s*.24,.92,-.239],[s*.06,.69,-.204]],
          .078,['#53625f','#65746e','#45564e','#394842'],22);
        tube(g,[[s*.315,.022,-.28],[s*.306,.28,-.244],[s*.260,.420,-.102],[s*.062,.405,.276],[0,.405,.282]],
          .076,['#586960','#6a7b6c','#48594e','#415148'],14);
      }
      tube(g,[[-.26,.425,.21],[0,.393,.168],[.26,.425,.21]],.080,['#536458','#5e6d5f','#425246'],10);
    },
    Tabouret(g){
      rod(g,[0,.275,0],[0,.348,0],.201,wood,.189);
      for(let i=0;i<3;i++){
        const a=i*2.094;
        rod(g,[Math.sin(a)*.19,.012,Math.cos(a)*.19],[Math.sin(a)*.117,.294,Math.cos(a)*.117],.024,wood,.036);
      }
      rod(g,[0,.346,0],[0,.353,0],.166,['#bd9676','#a68061'],.16);
    },

    Tapis(g) {
      squaredSlab(g,0,.012,0,3.04,.019,4.24,['#803f39','#723d3d','#6f3a3d']);
      const pigment=['#a65d4f','#e1ac75','#765451','#e5c598'];
      const strip=(x,z,w,d,c)=>squaredSlab(g,x,.023,z,w,.002,d,c);
      for(const s of [-1,1]){
        strip(s*1.446,0,.094,4.16,'#493d49');
        strip(s*1.369,0,.032,4.00,pigment[1]);
        strip(0,s*2.049,2.88,.110,'#493d49');
        strip(0,s*1.958,2.78,.037,pigment[1]);
        for(let i=0;i<32;i++) strip(-1.47+i*.095,s*2.13,.020,.110+(i%3)*.012,'#d2b493');
      }
      const diamond=(x,z,w,d,y,c)=>g.face([[x-w,y,z],[x,y,z+d],[x+w,y,z],[x,y,z-d]],c);
      for(const z of [-1.17,0,1.17]){
        for(const [n,color] of ['#4c4655','#d1946e','#a65a48','#d9a978','#525161'].entries()){
          diamond(0,z,.94-n*.13,.54-n*.072,.0235+n*.0008,color);
        }
        for(const x of [-1.05,1.05])for(let i=0;i<3;i++)
          diamond(x,z+(i-1)*.24,.15,.091,.026,pigment[(i+2)%pigment.length]);
      }
      for(const z of [-1.65,1.65])for(let i=0;i<11;i++){
        const x=(i-5)*.211;
        diamond(x,z,.094,.119,.026,pigment[(i+2)%pigment.length]);
      }
    },

    PiedEtCadre(g){
      for(const x of [-.27,.27]) slab(g,x,0,0,.022,.642,.034,wood);
      for(const y of [-.310,.310]) slab(g,0,y,0,.56,.022,.034,wood);
      for(const x of [-.255,.255]) slab(g,x,0,.009,.011,.61,.024,'#b79b7f');
      for(const y of [-.295,.295]) slab(g,0,y,.009,.53,.010,.024,'#b79b7f');
    },
    GestoTerra(g){
      squaredSlab(g,.06,.0275,0,.34,.055,.40,['#394346','#31393c','#495153']);
      slab(g,.229,.030,.119,.006,.018,.092,'#23292b');
      for(const z of [-.045,.045]) {
        tube(g,[[-.045,.049,z],[-.015,.101,z],[0,.20,z],[0,1.30,z],[.033,1.75,z],[.22,2.03,z],[.55,2.17,z],[.85,2.205,z],[1.13,2.196,z]],.010,metal,22);
      }
      slab(g,0,1.4,0,.023,.039,.116,metal);
      squaredSlab(g,1.28,2.198,0,.36,.034,.115,['#364147','#262f35','#29343b']);
      slab(g,1.457,2.204,0,.008,.010,.066,'#1b252c');
    },
  },
  audio:{
    BuffetUSM(g){
      const Y=[.058,.391,.731], X=[-.738,0,.738], Z=[-.25,.25];
      for(const x of X)for(const z of Z){
        rod(g,[x,.025,z],[x,.734,z],.017,metal);
        for(const y of Y) bulb(g,[x,y,z],.025,metal);
      }
      for(const y of Y)for(const z of Z) rod(g,[-.738,y,z],[.738,y,z],.018,metal);
      for(const y of Y)for(const x of X) rod(g,[x,y,-.25],[x,y,.25],.017,metal);
      slab(g,0,.714,0,1.45,.021,.475,green);
      slab(g,0,.069,0,1.45,.022,.46,green);
      slab(g,0,.382,0,1.44,.019,.44,green);
      for(const x of [-.724,.724,0])slab(g,x,.393,0,.027,.620,.46,green);
      slab(g,0,.394,-.227,1.43,.62,.024,green);
      for(const [x,y] of [[-.369,.223],[.369,.223],[.369,.556]]){
        slab(g,x,y,.239,.693,.296,.026,green);
        rod(g,[x,y+.065,.252],[x,y+.065,.271],.019,metal);
      }
    },
    TiroirUSM(g){
      slab(g,0,0,0,.71,.314,.036,green);
      slab(g,0,.139,.018,.69,.016,.007,'#8ca883');
      rod(g,[0,.055,.021],[0,.055,.042],.020,metal);
    },
    JBL(g){
      slab(g,0,.48,0,.47,.96,.39,wood);
      slab(g,0,.50,.204,.403,.845,.036,['#496e76','#58818a','#4c7480']);
      for(let ix=0;ix<7;ix++)for(let iy=0;iy<12;iy++){
        const x=(ix-3)*.054,y=.145+iy*.063;
        slab(g,x,y,.224,.038,.043,.012,(ix+iy)%3===0?'#648990':'#517983');
      }
      slab(g,.124,.117,.232,.092,.025,.014,rust);
      for(const x of [-.175,.175])slab(g,x,.018,-.01,.067,.043,.33,graphite);
    },
    Amplificateur(g){
      slab(g,0,.042,0,.437,.074,.297,['#4c5963','#5c6973','#394853']);
      slab(g,0,.043,.153,.433,.066,.019,ivory);
      slab(g,-.077,.051,.165,.186,.031,.006,ink);
      for(const x of [-.113,-.040,.017]) slab(g,x,.051,.169,.037,.014,.004,'#8c936d');
      rod(g,[.146,.044,.164],[.146,.044,.183],.031,metal);
      for(const x of [-.175,.068]) rod(g,[x,.040,.162],[x,.040,.176],.012,graphite);
      for(const z of [-.100,-.083,-.066,-.049,-.032,-.015]) slab(g,.023,.079,z,.28,.007,.008,graphite);
    },
    YamahaChassis(g){
      slab(g,0,.030,0,.44,.052,.33,['#48545d','#59656e','#3b4a53']);
      slab(g,0,.058,0,.415,.021,.302,'#708087');
      slab(g,-.12,.043,.169,.13,.024,.011,ivory);
      for(const x of [-.17,-.13,.144]) rod(g,[x,.058,.112],[x,.072,.112],.011,metal);
    },
  },
  electronics:{
    MagnavoxCoque(g){
      slab(g,0,.265,-.122,.620,.49,.32,wood);
      for(const x of [-.298,.298])slab(g,x,.263,.076,.061,.46,.39,wood);
      slab(g,0,.512,.057,.627,.067,.414,wood);
      slab(g,0,.038,.057,.628,.075,.414,wood);
      caseFraming(g,.269,.625,.495,.270,graphite);
      for(let k=0;k<9;k++)slab(g,.185+k*.010,.068,.299,.006,.028,.009,ink);
      slab(g,-.20,.068,.303,.050,.016,.009,rust);
    },
    PlayStation(g){
      slab(g,0,.029,0,.322,.053,.227,ivory);
      slab(g,0,.052,0,.308,.016,.214,['#b2bbb6','#a8b3b0','#99a7a6']);
      rod(g,[-.011,.059,-.011],[-.011,.074,-.011],.088,metal);
      rod(g,[-.011,.073,-.011],[-.011,.077,-.011],.077,'#c5c7b9');
      slab(g,-.011,.079,-.006,.021,.006,.024,rust);
      for(const x of [-.125,.124])rod(g,[x,.056,.064],[x,.074,.064],.021,x<0?'#768b82':'#93a09c');
      for(const x of [-.090,-.033]) slab(g,x,.022,.116,.043,.028,.014,graphite);
      for(const x of [.037,.093]) slab(g,x,.024,.114,.041,.019,.012,'#9aa6a2');
    },
    Manette(g){
      slab(g,0,.015,-.006,.16,.028,.071,ivory);
      for(const x of [-.069,.069])rod(g,[x,.015,.017],[x*1.28,.011,.064],.023,ivory,.018);
      for(const [x,z,w,d] of [[-.049,.000,.038,.012],[-.049,0,.012,.038]])slab(g,x,.033,z,w,.012,d,graphite);
      for(const [x,z,c] of [[.04,-.014,fern],[.056,0,rust],[.041,.017,'#7389a5'],[.024,0,'#8b6879']])rod(g,[x,.028,z],[x,.038,z],.007,c);
      for(const x of [-.008,.009])slab(g,x,.032,.014,.010,.009,.021,steel);
    },
  },
  personal:{
    Mamiya645(g){
      slab(g,0,.108,0,.213,.207,.18,graphite);
      slab(g,0,.215,-.028,.147,.052,.106,ink);
      slab(g,-.084,.132,.085,.046,.160,.046,'#465756');
      rod(g,[0,.124,.071],[0,.124,.173],.080,metal);
      rod(g,[0,.124,.151],[0,.124,.238],.078,graphite,.068);
      rod(g,[0,.124,.217],[0,.124,.245],.063,'#658483');
      rod(g,[0,.124,.240],[0,.124,.249],.048,'#333e50');
      rod(g,[.066,.202,.041],[.066,.220,.041],.030,metal);
      for(let i=0;i<11;i++){const a=i/11*Math.PI*2;slab(g,.072*Math.cos(a),.124+.072*Math.sin(a),.165,.008,.010,.018,'#879998');}
    },
    Olivetti280(g){
      g.loft([octagon([0,.006,0],.25,.225),octagon([0,.055,-.009],.265,.228),octagon([0,.097,-.053],.245,.163),octagon([0,.152,-.12],.233,.101)],
        ['#9d967c','#a8a78b','#7d8a79','#697b70','#a19781']);
      slab(g,0,.121,.056,.416,.022,.24,graphite);
      for(let i=0;i<12;i++)for(let row=0;row<4;row++)slab(g,(i-5.5)*.033,.145+row*.006,.132-row*.053,.026,.012,.030,(i+row)%4===0?ivory:'#879592');
      slab(g,0,.149,.177,.164,.010,.026,ivory);
      rod(g,[-.265,.163,-.122],[.264,.163,-.122],.020,graphite);
      slab(g,0,.227,-.161,.365,.122,.005,ivory);
    },
    SacRando(g){
      g.loft([octagon([0,.012,-.032],.159,.127),octagon([0,.09,-.012],.187,.147),octagon([0,.300,0],.196,.162),octagon([0,.515,-.045],.160,.135),octagon([0,.582,-.057],.116,.100)],
        ['#4d7392','#6083a0','#456785','#344f67','#405f77']);
      slab(g,0,.420,.133,.279,.202,.094,['#537c98','#678ca2','#3b6683']);
      slab(g,0,.189,.155,.274,.140,.111,'#426b89');
      for(const x of [-.114,.114]){
        tube(g,[[x,.527,.120],[x,.435,.184],[x,.243,.190],[x,.111,.169]],.016,'#293d4a',7);
        slab(g,x,.258,.201,.048,.035,.012,rust);
      }
      tube(g,[[-.066,.540,-.046],[-.058,.627,-.060],[.058,.627,-.060],[.066,.541,-.046]],.013,graphite,8);
    },
    Trek(g){
      const rear=[0,.319,-.62],front=[0,.319,.62],crank=[0,.30,-.13],seat=[0,.760,-.262],head=[0,.659,.40];
      for(const point of [rear,front]){
        ring(g,point,.313,.025,graphite);
        ring(g,point,.275,.008,'#788386');
        for(let i=0;i<10;i++){const a=i*Math.PI/5;rod(g,point,[0,point[1]+.267*Math.cos(a),point[2]+.267*Math.sin(a)],.004,steel);}
        rod(g,[.026,point[1],point[2]],[-.029,point[1],point[2]],.034,steel);
      }
      for(const [a,b,r] of [[rear,seat,.014],[rear,crank,.021],[seat,head,.029],[head,crank,.037],[crank,seat,.029]])rod(g,a,b,r,['#b7463b','#ca594b','#a93436']);
      for(const x of [-.044,.044])rod(g,[x,.660,.399],[x,.325,.620],.018,'#bd483f');
      rod(g,seat,[0,.835,-.292],.014,graphite);
      slab(g,0,.847,-.309,.096,.029,.181,ink);
      rod(g,head,[0,.774,.429],.018,steel);
      for(const x of [-1,1])tube(g,[[0,.774,.435],[x*.185,.776,.444],[x*.221,.744,.511],[x*.194,.663,.533]],.014,graphite,7);
      rod(g,[-.050,.304,-.124],[.070,.304,-.124],.072,metal);
      for(const x of [-.09,.09]){rod(g,[x,.304,-.126],[x,.209,-.084],.015,metal);slab(g,x,.207,-.084,.085,.017,.067,graphite);}
      slab(g,.018,.515,.125,.012,.045,.189,ivory);
    },
    Stèle(g){
      g.loft([octagon([0,0,0],.22,.072),octagon([0,.05,0],.239,.081),octagon([.01,.522,-.010],.209,.069),octagon([.047,.650,-.01],.155,.059)],
        ['#8d8c80','#a19c8a','#797a73','#77766c']);
      for(let row=0;row<4;row++)for(let i=0;i<5-row%2;i++){
        const x=(i-2)*.064+.015, y=.464-row*.068;
        slab(g,x,y,.064,.043,.008,.007,'#676b63');
        if((i+row)%2===0) slab(g,x+.016,y-.012,.064,.007,.027,.007,'#777a70');
      }
    },
    Bouddha(g){
      const limestone=['#a59881','#b8aa91','#918674','#8a7e6c'];
      rod(g,[0,.014,0],[0,.043,0],.171,limestone);
      for(const s of [-1,1]) slab(g,s*.079,.078,.031,.187,.072,.143,limestone);
      g.loft([octagon([0,.092,0],.134,.114),octagon([0,.159,0],.113,.086),octagon([0,.239,-.007],.078,.071)],limestone);
      bulb(g,[0,.285,0],.073,limestone);
      bulb(g,[0,.353,-.005],.042,'#9c8e78');
      for(const [x,z] of [[0,.058],[.062,0],[-.062,0],[0,-.058]])bulb(g,[x,.290,z],.039,limestone);
    },
    Suiseki(g) {
      g.loft([octagon([0,.028,0],.17,.115),octagon([.017,.087,-.015],.185,.132),octagon([-.026,.183,-.03],.111,.094),octagon([.022,.210,-.04],.061,.048)],['#7c8077','#8d9585','#696f68','#6e6d62']);
      slab(g,0,.019,0,.382,.038,.272,wood);
    },
  },
  foliage:{
    Alocasia(g){
      g.loft([octagon([0,0,0],.227,.227),octagon([0,.071,0],.260,.260),octagon([0,.303,0],.343,.343),octagon([0,.377,0],.331,.331)],['#ad6954','#c17e63','#a96652','#925849']);
      rod(g,[0,.370,0],[0,.381,0],.31,'#5f5246');
      for(let i=0;i<8;i++){
        const a=i*2.399,r=.39+(i%4)*.112,y=.86+(i%5)*.198;
        const x=Math.cos(a)*r,z=Math.sin(a)*r;
        tube(g,[[0,.36,0],[x*.33,y*.64,z*.33],[x*.67,y*.94,z*.67],[x,y,z]],.018,['#72865c','#8e9d6e','#637b53'],8);
        blade(g,[x,y,z],a,.66+(i%3)*.104,.218+(i%2)*.060,.23,i);
      }
    },
    Dracaena(g){
      g.loft([octagon([0,0,0],.29,.29),octagon([0,.083,0],.425,.425),octagon([0,.155,0],.412,.412)],
        ['#a8a18e','#beb4a0','#929789','#817d6e']);
      rod(g,[0,.148,0],[0,.158,0],.386,'#c5baa2');
      for(let i=0;i<6;i++){
        const a=i*2.399,x=Math.cos(a)*(.15+i*.037),z=Math.sin(a)*(.15+i*.037),y=.90+i*.175;
        tube(g,[[0,.151,0],[x*.47,y*.42,z*.45],[x*.8,y*.76,z*.73],[x,y,z]],.022,['#9b8364','#ac9472','#846d58'],9);
        for(let j=0;j<8;j++)blade(g,[x,y,z],j*.785+i,.256+(j%3)*.048,.038+(j%2)*.013,.082,j);
      }
    },
    Bonsai(g){
      g.loft([octagon([0,0,0],.14,.115),octagon([0,.036,0],.183,.139),octagon([0,.072,0],.178,.132)],['#495a5c','#5d7070','#374e51']);
      rod(g,[0,.069,0],[0,.082,0],.149,'#655947');
      tube(g,[[0,.070,0],[.032,.137,.012],[-.006,.231,.015],[.026,.343,-.006],[.061,.435,-.012]],.023,wood,11);
      for(const [i,x,y,z] of [[0,-.115,.264,.034],[1,.143,.316,.033],[2,-.076,.377,-.044],[3,.054,.448,-.015]]){
        tube(g,[[.003,y-.092,0],[x*.46,y-.054,z*.57],[x,y,z]],.012,wood,6);
        for(let n=0;n<4;n++){
          const a=n*1.58;
          bulb(g,[x+Math.cos(a)*.056,y+(n%3)*.017,z+Math.sin(a)*.046],.058,n%2?[fern,jade,'#739478']:[jade,'#669070','#4c775f']);
        }
      }
    },
  },
  chashitsu:{
    Chawan(g){
      const rings=[[.001,.021],[.008,.030],[.019,.049],[.046,.062],[.074,.063],[.074,.056],[.045,.052],[.019,.036],[.019,.002]];
      g.loft(rings.map(([y,r])=>octagon([0,y,0],r,r)),['#48372d','#604237','#a08b73','#86715d','#573e33','#b39b80','#634a3d','#735849']);
    },
    Zabuton(g){
      g.loft([[.004,.191],[.018,.226],[.052,.222],[.068,.188]].map(([y,r])=>octagon([0,y,0],r,r)),
        ['#435572','#384965','#526381','#475979']);
      rod(g,[0,.061,0],[0,.073,0],.023,'#34435e');
      for(const x of [-.205,.205])for(const z of [-.205,.205]){
        rod(g,[x*.93,.036,z*.93],[x*1.09,.031,z*1.09],.009,'#c9b99d',.005);
      }
    },
    Tatami(g){
      squaredSlab(g,0,.021,0,2.70,.106,3.60,wood);
      const dark='#6b654c';
      for(let ix=0;ix<3;ix++)for(let iz=0;iz<2;iz++){
        const x=(ix-1)*.90,z=(iz-.5)*1.8;
        squaredSlab(g,x,.075,z,.891,.083,1.792,iz%2===0?['#a8a683','#b6b18a','#979979']:['#aeb18c','#b9b793','#979a77']);
        for(const dx of [-.436,.436])slab(g,x+dx,.115,z,.022,.006,1.774,dark);
        for(let i=0;i<10;i++){
          const zi=z-.783+i*.175;
          slab(g,x,.117,zi,.806,.002,.005,i%2===0?'#b7b394':'#a3a080');
        }
      }
    },
    ShojiBois(g){
      slab(g,0,.965,0,.826,1.489,.011,['#e9dcc0','#e5d7bb','#d8caae']);
      slab(g,0,.096,0,.828,.185,.051,'#665043');
      for(const x of [-.423,.423])slab(g,x,.876,0,.056,1.752,.075,wood);
      for(const y of [.031,.153,1.724])slab(g,0,y,0,.877,.053,.075,wood);
      for(const x of [-.276,-.138,0,.138,.276])slab(g,x,.944,.013,.019,1.556,.035,wood);
      for(const y of [.442,.710,.979,1.247,1.520])slab(g,0,y,.014,.832,.016,.034,wood);
    },
  },
};

function blade(g,origin,angle,len,width,droop,i){
  const f=new Vector3(Math.cos(angle),0,Math.sin(angle));
  const side=new Vector3(-f.z,0,f.x);
  const p=(s,w,y)=>new Vector3(...origin).addScaledVector(f,s*len).addScaledVector(side,w*width).add(new Vector3(0,y,0)).toArray();
  const start=p(0,0,0), ridge1=p(.27,0,.071), ridge2=p(.62,0,.026), end=p(1,0,-droop);
  for(const s of [-1,1]){
    const outer1=p(.20,s*.77,-.026),outer2=p(.47,s,-.032),outer3=p(.75,s*.58,-droop*.42);
    const faces=[[start,outer1,ridge1],[ridge1,outer1,outer2],[ridge1,outer2,ridge2],[ridge2,outer2,outer3],[ridge2,outer3,end]];
    for(const [j,points] of faces.entries()){
      const c=(i+j)%3===0?'#679373':s>0?'#4b835f':'#346853';
      const a=s>0?points:[...points].reverse();
      g.face(a,c);
      g.face([...a].reverse(),'#729377');
    }
  }
}


const extraModels = {
  desk: {
    Tour(g) {
      slab(g,0,.015,0,.243,.035,.405,graphite);
      slab(g,0,.452,0,.244,.036,.405,ivory);
      slab(g,.100,.231,0,.043,.413,.378,ivory);
      slab(g,0,.229,-.186,.222,.407,.036,graphite);
      for(const x of [-.106,.104])for(const z of [-.185,.178])
        rod(g,[x,.024,z],[x,.454,z],.012,metal);
      slab(g,.061,.241,.004,.023,.289,.299,'#486154');
      for(const y of [.211,.258,.305]) slab(g,.040,y,.009,.015,.020,.246,'#405554');
      slab(g,-.006,.169,.025,.146,.037,.235,'#5a646a');
      for(const z of [-.036,.035,.103]) rod(g,[-.083,.149,z],[-.085,.160,z],.034,graphite);
      for(const y of [.100,.224,.345]){
        ring(g,[0,y,.183],.047,.008,'#7a9291','z',14);
        for(let i=0;i<5;i++){
          const a=i*Math.PI*.4;
          rod(g,[0,y,.184],[Math.sin(a)*.036,y+Math.cos(a)*.036,.184],.005,'#40515c');
        }
      }
      for(const x of [-.085,.086]) slab(g,x,.006,0,.052,.018,.313,ink);
    },
    SupportEcrans(g) {
      slab(g,0,.018,0,.165,.036,.159,graphite);
      rod(g,[0,.027,0],[0,.410,0],.027,metal);
      for(const s of [-1,1]){
        tube(g,[[0,.285,0],[s*.120,.283,-.033],[s*.254,.323,-.042],[s*.365,.340,.035]],.019,metal,8);
        bulb(g,[s*.241,.322,-.041],.032,graphite);
        slab(g,s*.364,.340,.057,.091,.099,.033,graphite);
      }
    },
    EcranLarge(g){
      caseFraming(g,.039,.84,.34,.174,graphite);
      const W=.395;
      for(let i=0;i<8;i++){
        const x=(i/7*2-1)*W,z=-.041+Math.abs(x/W)**2*.031;
        slab(g,x,.171,z,.103,.316,.023,['#47575d','#516065','#414f56']);
      }
      slab(g,0,.037,.057,.033,.012,.007,'#a4b5a8');
    },
    EcranPortrait(g) {
      caseFraming(g,.030,.292,.521,.262,graphite);
      slab(g,0,.262,-.031,.287,.520,.038,['#485a60','#526169','#3f4e53']);
      slab(g,.094,.038,.052,.026,.009,.008,'#b68d6e');
    },
    BarreEcran(g) {
      rod(g,[-.231,0,0],[.231,0,0],.014,['#526367','#667679','#394b54']);
      rod(g,[-.209,-.006,.007],[.209,-.006,.007],.006,ivory);
      slab(g,0,.002,-.026,.077,.029,.066,graphite);
    },
    Tasse(g) {
      const rows=[[.004,.037],[.012,.045],[.065,.048],[.100,.050],[.104,.045],[.095,.042],[.016,.039]];
      g.loft(rows.map(([y,r])=>octagon([0,y,0],r,r)),['#3e7288','#53879a','#416d86','#375b72']);
      tube(g,[[.047,.080,0],[.075,.083,0],[.088,.060,0],[.076,.032,0],[.046,.028,0]],.009,['#56879b','#417589','#3b6579'],9);
    },
  },
  furniture: {
    CadreOmni(g) {
      for(const x of [-.81,0,.81]){
        slab(g,x,.75,0,.038,1.50,.36,ivory);
        slab(g,x,.747,.182,.042,1.48,.012,'#c3bcaa');
      }
      for(const [x,heights] of [[-.405,[1.285,1.05,.817,.257]],[.405,[1.285,1.07,.55]]])
        for(const y of heights){slab(g,x,y,0,.773,.036,.353,ivory);slab(g,x,y,.177,.763,.024,.012,'#aaa998');}
    },
    Falkland(g) {
      const rings=[];
      for(let i=0;i<7;i++){
        const y=i*.173;
        rings.push(octagon([0,y,0],.18+(i%2)*.041,.18+(i%2)*.041));
        if(i<6)rings.push(octagon([0,y+.078,0],.111,.111));
      }
      g.loft(rings,['#e1d8be','#d3ccb9','#d9cdb1','#c3c0ac']);
      for(let i=0;i<7;i++){
        const r=.18+(i%2)*.041;
        ring(g,[0,i*.173,0],r*.972,.006,'#a99e82','y',16);
      }
    },
  },
  personal: {
    Batons(g) {
      for(const [x,d] of [[-.042,0],[.042,.019]]){
        rod(g,[x,.014,d],[x,.785,d],.008,graphite,.011);
        rod(g,[x,.793,d],[x,1.028,d],.013,steel);
        rod(g,[x,1.010,d],[x,1.165,d],.022,ink,.025);
        slab(g,x,.810,d+.012,.029,.046,.019,rust);
        tube(g,[[x,1.153,d],[x+.051,1.081,d],[x+.054,1.015,d],[x+.013,1.008,d]],.006,graphite,7);
        rod(g,[x,.048,d],[x,.055,d],.027,graphite);
      }
    },
    PompeCorps(g){
      rod(g,[0,.012,0],[0,.027,0],.031,ink);
      rod(g,[0,.027,0],[0,.523,0],.021,['#486b70','#578286','#3c5c64']);
      for(const y of [.041,.506])rod(g,[0,y-.011,0],[0,y+.011,0],.025,metal);
      slab(g,0,.305,.019,.017,.154,.008,'#b87c55');
    },
    Geta(g) {
      for(const x of [-.089,.089]){
        slab(g,x,.029,0,.142,.040,.302,wood);
        for(const z of [-.078,.081]) slab(g,x,.006,z,.119,.025,.043,endgrain);
        tube(g,[[x-.066,.051,-.069],[x-.04,.091,-.007],[x,.088,.100],[x+.037,.090,.004],[x+.066,.051,-.069]],.013,['#695b62','#766371','#514853'],10);
      }
    },
  },
  foliage: {
    PinJardin(g){ tree(g,'pine'); },
    CerisierJardin(g){ tree(g,'cherry'); },
    ErableJardin(g){ tree(g,'maple'); },
    GinkgoJardin(g){ tree(g,'ginkgo'); },
  },
  chashitsu: {
    Kawara(g) {
      slab(g,0,0,0,1,.033,1,['#46555e','#53616a','#384a53']);
      for(let ix=0;ix<20;ix++){
        const x=(ix-9.5)*.050;
        rod(g,[x,.029,-.494],[x,.029,.494],.017,ix%3===0?'#69777b':'#56676f');
        for(let iz=0;iz<7;iz++)slab(g,x,.037,-.425+iz*.145,.044,.009,.010,'#425761');
      }
    },
  },
};
for(const [family, entries] of Object.entries(extraModels)) Object.assign(families[family], entries);

function tree(g,kind){
  const pine=kind==='pine';
  const colors={
    pine:['#4c7561','#5c866f','#385f51','#3a6e58'],
    maple:['#a96e59','#c9876a','#946451','#a66b58'],
    cherry:['#c19192','#d2a3a0','#af7c84','#b5888c'],
    ginkgo:['#8f935c','#a6a16c','#788954','#81915e'],
  }[kind];
  tube(g,[[0,0,0],[-.045,.30,.012],[.018,.62,.017],[.039,.87,-.033]],.036,wood,12);
  if(pine){
    for(let i=0;i<4;i++){
      const y=.34+i*.145,r=.295-i*.050;
      g.loft([octagon([0,y,0],r*.72,r*.72),octagon([.016,y+.045,0],r,r),octagon([.031,y+.274,0],r*.15,r*.15)],colors);
    }
    return;
  }
  for(let i=0;i<7;i++){
    const a=i*2.399;
    const x=Math.cos(a)*(.16+(i%3)*.042), z=Math.sin(a)*(.16+(i%3)*.042), y=.57+(i%4)*.076;
    rod(g,[.002,y-.27,0],[x,y,z],.017,wood,.008);
    const r=.135+(i%3)*.017;
    g.loft([octagon([x,y-.060,z],r*.63,r*.66),octagon([x,y+.024,z],r,r*.85),octagon([x+.021,y+.128,z-.012],r*.66,r*.61),octagon([x,y+.173,z],r*.28,r*.24)],colors);
  }
}

const surfaceProfiles = JSON.parse(await readFile(new URL('materials/surface-profiles.json',root),'utf8'));
for(const [family, recipes] of Object.entries(families)){
  const directory=new URL(family+'/',root);
  await mkdir(directory,{recursive:true});
  const state=newGLB(family);
  data[family]={};
  const matte = state.material;
  const materials = new Map();
  for(const [name,build] of Object.entries(recipes)){
    const model=new Facets();build(model);
    const profile=surfaceProfiles[name];
    if(profile && !materials.has(profile[0])) {
      materials.set(profile[0],state.doc.createMaterial(profile[0]).setRoughnessFactor(profile[1]).setMetallicFactor(profile[2]));
    }
    state.material=profile ? materials.get(profile[0]) : matte;
    const node=state.doc.createNode(name).setMesh(meshFrom(model,state,name));
    state.scene.addChild(node);
    data[family][name]={triangles:model.positions.length/9};
  }
  await writeGLB(state,fileURLToPath(new URL(family+'-v2.glb',directory)));
}
await writeFile(new URL('geometry.json',root),JSON.stringify(data,null,2)+'\n');
