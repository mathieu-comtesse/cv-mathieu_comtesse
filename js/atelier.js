/* L'atelier des processus de Mathieu Comtesse — expérience 3D procédurale, sans dépendance externe. */
(() => {
  'use strict';
  const canvas = document.getElementById('world');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  const statusText = document.getElementById('statusText');
  if (!gl) { statusText.textContent = 'WEBGL INDISPONIBLE'; return; }

  const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aColor;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    uniform vec3 uCamera;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vWorld;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vWorld = world.xyz;
      vNormal = normalize(mat3(uModel) * aNormal);
      vColor = aColor;
      gl_Position = uMVP * vec4(aPosition, 1.0);
    }`;
  const fragmentShaderSource = `
    precision mediump float;
    uniform vec3 uCamera;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vWorld;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 light = normalize(vec3(-0.42, 0.84, 0.34));
      float diffuse = max(dot(n, light), 0.0);
      float rim = pow(1.0 - max(dot(n, normalize(uCamera - vWorld)), 0.0), 2.2);
      vec3 color = vColor * (0.47 + diffuse * 0.65) + vColor * rim * 0.12;
      float distanceToCamera = length(uCamera - vWorld);
      float fog = smoothstep(22.0, 48.0, distanceToCamera);
      vec3 fogColor = vec3(0.035, 0.065, 0.13);
      color = mix(color, fogColor, fog * 0.72);
      gl_FragColor = vec4(color, 1.0);
    }`;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const loc = {
    position: gl.getAttribLocation(program, 'aPosition'), normal: gl.getAttribLocation(program, 'aNormal'), color: gl.getAttribLocation(program, 'aColor'),
    mvp: gl.getUniformLocation(program, 'uMVP'), model: gl.getUniformLocation(program, 'uModel'), camera: gl.getUniformLocation(program, 'uCamera')
  };
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
  const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const C = (hex) => { const n = parseInt(hex.replace('#',''),16); return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]; };

  class Builder {
    constructor() { this.p=[]; this.n=[]; this.c=[]; }
    tri(a,b,c,color,hint=null) {
      let normal = norm(cross(sub(b,a), sub(c,a)));
      if (hint && dot(normal,hint)<0) { const t=b; b=c; c=t; normal=normal.map(v=>-v); }
      for (const point of [a,b,c]) { this.p.push(point[0],point[1],point[2]); this.n.push(normal[0],normal[1],normal[2]); this.c.push(color[0],color[1],color[2]); }
    }
    quad(a,b,c,d,color,hint=null) { this.tri(a,b,c,color,hint); this.tri(a,c,d,color,hint); }
    build() {
      const mesh={count:this.p.length/3};
      for (const [key,data] of [['p',this.p],['n',this.n],['c',this.c]]) { mesh[key]=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,mesh[key]); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW); }
      return mesh;
    }
  }
  function makeBox(color) {
    const b=new Builder(), c=C(color), v=(x,y,z)=>[x,y,z];
    b.quad(v(-.5,-.5,.5),v(.5,-.5,.5),v(.5,.5,.5),v(-.5,.5,.5),c,[0,0,1]);
    b.quad(v(.5,-.5,-.5),v(-.5,-.5,-.5),v(-.5,.5,-.5),v(.5,.5,-.5),c,[0,0,-1]);
    b.quad(v(.5,-.5,.5),v(.5,-.5,-.5),v(.5,.5,-.5),v(.5,.5,.5),c,[1,0,0]);
    b.quad(v(-.5,-.5,-.5),v(-.5,-.5,.5),v(-.5,.5,.5),v(-.5,.5,-.5),c,[-1,0,0]);
    b.quad(v(-.5,.5,.5),v(.5,.5,.5),v(.5,.5,-.5),v(-.5,.5,-.5),c,[0,1,0]);
    b.quad(v(-.5,-.5,-.5),v(.5,-.5,-.5),v(.5,-.5,.5),v(-.5,-.5,.5),c,[0,-1,0]);
    return b.build();
  }
  function makeSphere(color, rows=12, cols=18) {
    const b=new Builder(), col=C(color);
    const p=(t,f)=>[Math.sin(t)*Math.cos(f),Math.cos(t),Math.sin(t)*Math.sin(f)];
    for(let i=0;i<rows;i++) for(let j=0;j<cols;j++) {
      const t0=Math.PI*i/rows,t1=Math.PI*(i+1)/rows,f0=2*Math.PI*j/cols,f1=2*Math.PI*(j+1)/cols;
      const a=p(t0,f0),bb=p(t1,f0),cc=p(t1,f1),d=p(t0,f1);
      b.tri(a,bb,cc,col,norm([a[0]+bb[0]+cc[0],a[1]+bb[1]+cc[1],a[2]+bb[2]+cc[2]]));
      b.tri(a,cc,d,col,norm([a[0]+cc[0]+d[0],a[1]+cc[1]+d[1],a[2]+cc[2]+d[2]]));
    }
    return b.build();
  }
  function makeCylinder(color, bottom=0.5, top=0.5, segments=12) {
    const b=new Builder(), col=C(color);
    for(let i=0;i<segments;i++) {
      const a=i*2*Math.PI/segments,d=(i+1)*2*Math.PI/segments;
      const p0=[bottom*Math.cos(a),0,bottom*Math.sin(a)],p1=[bottom*Math.cos(d),0,bottom*Math.sin(d)];
      const p2=[top*Math.cos(d),1,top*Math.sin(d)],p3=[top*Math.cos(a),1,top*Math.sin(a)];
      const hint=norm([Math.cos((a+d)/2),.15,Math.sin((a+d)/2)]);
      b.quad(p0,p1,p2,p3,col,hint);
      b.tri([0,0,0],p1,p0,col,[0,-1,0]);
      b.tri([0,1,0],p3,p2,col,[0,1,0]);
    }
    return b.build();
  }
  function makeDisk(color, segments=48, jitter=0.03) {
    const b=new Builder(), base=C(color), rings=[];
    let seed=73421; const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,r=1+(rand()-.5)*jitter;rings.push([Math.cos(a)*r,0,Math.sin(a)*r]);}
    for(let i=0;i<segments;i++) {
      const a=rings[i],d=rings[(i+1)%segments],shade=.88+rand()*.18,col=base.map(v=>Math.min(1,v*shade));
      b.tri([0,0,0],d,a,col,[0,1,0]);
    }
    return b.build();
  }
  function makeIslandSide() {
    const b=new Builder(), rings=[]; let seed=9281; const rand=()=>{seed=(seed*1103515245+12345)>>>0;return (seed>>>8)/16777216;};
    const specs=[[1,0],[.91,-.28],[.76,-.72],[.55,-1.12],[.31,-1.48],[.08,-1.75]];
    for(let r=0;r<specs.length;r++){const ring=[];for(let i=0;i<48;i++){const a=i*2*Math.PI/48,rad=specs[r][0]*(.94+rand()*.12);ring.push([Math.cos(a)*rad,specs[r][1]+(r>0?(rand()-.5)*.12:0),Math.sin(a)*rad]);}rings.push(ring);}
    const palettes=['#344f67','#273d55','#20344d','#172b43','#101d33'];
    for(let r=0;r<rings.length-1;r++) for(let i=0;i<48;i++){
      const a=rings[r][i],bb=rings[r][(i+1)%48],cc=rings[r+1][(i+1)%48],d=rings[r+1][i],color=C(palettes[Math.min(r,palettes.length-1)]);
      const variation=.85+rand()*.25,co=color.map(v=>Math.min(1,v*variation)),hint=norm([((a[0]+bb[0]+cc[0]+d[0])/4),.55,((a[2]+bb[2]+cc[2]+d[2])/4)]);
      b.quad(a,bb,cc,d,co,hint);
    }
    for(let i=0;i<48;i++){const a=rings[rings.length-1][i],bb=rings[rings.length-1][(i+1)%48],tip=[0,-1.95,0];b.tri(a,bb,tip,C('#14243b'),norm([a[0]+bb[0],-.4,a[2]+bb[2]]));}
    return b.build();
  }
  function makeArch(color, radius=1, tube=.105, segments=36, tubeSegments=8) {
    const b=new Builder(), col=C(color);
    const point=(theta,phi)=>[(radius+tube*Math.cos(phi))*Math.cos(theta),(radius+tube*Math.cos(phi))*Math.sin(theta),tube*Math.sin(phi)];
    for(let i=0;i<segments;i++)for(let j=0;j<tubeSegments;j++){
      const t0=Math.PI*i/segments,t1=Math.PI*(i+1)/segments,f0=2*Math.PI*j/tubeSegments,f1=2*Math.PI*(j+1)/tubeSegments;
      const a=point(t0,f0),bb=point(t1,f0),cc=point(t1,f1),d=point(t0,f1);
      const hint=(t,f)=>[Math.cos(t)*Math.cos(f),Math.sin(t)*Math.cos(f),Math.sin(f)];
      b.quad(a,bb,cc,d,col,hint((t0+t1)/2,(f0+f1)/2));
    }
    return b.build();
  }
  function makeStars(count=260) {
    const b=new Builder();let seed=151;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const colors=['#9ccbf4','#d5e8ff','#6f9ed8','#b2a7fa'];
    for(let i=0;i<count;i++){
      const x=(rand()-.5)*64,y=5+rand()*25,z=(rand()-.5)*64,r=.018+rand()*.035,c=C(colors[Math.floor(rand()*colors.length)]);
      const p=[x,y,z],a=[x+r,y,z],bb=[x,y+r*1.8,z],cc=[x-r,y,z],d=[x,y-r*1.8,z];
      b.tri(p,a,bb,c,[0,0,1]);b.tri(p,bb,cc,c,[0,0,1]);b.tri(p,cc,d,c,[0,0,1]);b.tri(p,d,a,c,[0,0,1]);
    }
    return b.build();
  }

  const meshes={
    grass:makeDisk('#3e8a77',56,.07), side:makeIslandSide(), sphere:makeSphere('#ffffff'),
    stone:makeSphere('#52657b',8,10), box:makeBox('#ffffff'), trunk:makeCylinder('#735344',.11,.07,9),
    cone:makeCylinder('#ffffff',.5,0,10), cylinder:makeCylinder('#ffffff',.16,.12,10),
    archCyan:makeArch('#7ce9f3'),archGold:makeArch('#f0ce89'),archViolet:makeArch('#c0a0ff'),
    stars:makeStars()
  };
  const makeMesh=(color,rows=10,cols=14)=>makeSphere(color,rows,cols);
  meshes.grassTuft=makeMesh('#7eb58a',5,7); meshes.leaf=makeMesh('#397f73',8,10);
  meshes.cloak=makeCylinder('#245e72',.37,.08,9); meshes.tunic=makeCylinder('#4e9ca6',.22,.12,10);
  meshes.skin=makeSphere('#d8b18b',10,14); meshes.hood=makeCylinder('#18344e',.28,0,9);
  meshes.gold=makeSphere('#e7c77e',8,12); meshes.dark=makeSphere('#122239',8,12);
  meshes.orbCyan=makeSphere('#67e8f7',10,14); meshes.orbGold=makeSphere('#f6d78e',10,14); meshes.orbViolet=makeSphere('#c5a0ff',10,14);
  meshes.apertureCyan=makeSphere('#1b7c9c',12,16); meshes.apertureGold=makeSphere('#8e6a3e',12,16); meshes.apertureViolet=makeSphere('#634b99',12,16);
  meshes.flower=makeSphere('#e9dca9',6,8); meshes.path=makeBox('#8b9aa4');

  function matIdentity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  function matMul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
  function translate(x,y,z){const m=matIdentity();m[12]=x;m[13]=y;m[14]=z;return m;}
  function scale(x,y,z){const m=matIdentity();m[0]=x;m[5]=y;m[10]=z;return m;}
  function rotateY(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
  function rotateX(a){const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];}
  function rotateZ(a){const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
  function compose(x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0){return matMul(translate(x,y,z),matMul(rotateY(ry),matMul(rotateX(rx),matMul(rotateZ(rz),scale(sx,sy,sz)))));}
  function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
  function lookAt(eye,center,up){const z=norm(sub(eye,center)),x=norm(cross(up,z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
  function draw(mesh,model,vp,camera){
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.p);gl.enableVertexAttribArray(loc.position);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);gl.enableVertexAttribArray(loc.normal);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.c);gl.enableVertexAttribArray(loc.color);gl.vertexAttribPointer(loc.color,3,gl.FLOAT,false,0,0);
    gl.uniformMatrix4fv(loc.model,false,new Float32Array(model));gl.uniformMatrix4fv(loc.mvp,false,new Float32Array(matMul(vp,model)));gl.uniform3fv(loc.camera,new Float32Array(camera));gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }

  const portals=[
    {name:"Projets",subtitle:"Dix outils manipulables",x:0,z:-4.8,yaw:0,color:'cyan',arch:meshes.archCyan,orb:meshes.orbCyan,aperture:meshes.apertureCyan,symbol:'◈',url:"./#projets",cta:"Ouvrir les projets",description:"Dix projets professionnels, chacun posé sur un plan blueprint : on attrape la machine et on la fait tourner."},
    {name:"Blog",subtitle:"Études et code",x:3.5,z:-3.4,yaw:-0.7853981633974483,color:'gold',arch:meshes.archGold,orb:meshes.orbGold,aperture:meshes.apertureGold,symbol:'◇',url:"blog",cta:"Ouvrir le blog",description:"Des études sur la qualité et le numérique, avec leur code et leurs repères Lean Six Sigma."},
    {name:"Expériences",subtitle:"Le parcours",x:4.55,z:0.15,yaw:-1.5707963267948966,color:'violet',arch:meshes.archViolet,orb:meshes.orbViolet,aperture:meshes.apertureViolet,symbol:'✧',url:"experiences",cta:"Ouvrir les expériences",description:"Le parcours de Mathieu, de la circulation ferroviaire à la qualité, avec ses formations."},
    {name:"Gains",subtitle:"Le temps libéré",x:-3.5,z:-3.4,yaw:0.7853981633974483,color:'cyan',arch:meshes.archCyan,orb:meshes.orbCyan,aperture:meshes.apertureCyan,symbol:'◈',url:"gains",cta:"Ouvrir les gains",description:"Du temps libéré, valorisé au taux horaire de 104,74 €, avec la tirelire et ses courbes."},
    {name:"Contact",subtitle:"Écrire à Mathieu",x:-4.55,z:0.15,yaw:1.5707963267948966,color:'gold',arch:meshes.archGold,orb:meshes.orbGold,aperture:meshes.apertureGold,symbol:'◇',url:"./#contact",cta:"Me contacter",description:"Un message, un appel ou un échange sur LinkedIn."}
  ];
  const discovered=new Set();
  const player={x:0,z:2.5,yaw:Math.PI,step:0};
  let cameraYaw=0, lastTime=0, frame=0, activePortal=-1, dragging=false, dragX=0, dragPointer=-1, toastTimeout=0;
  const keys=Object.create(null), touch=Object.create(null);
  const $=id=>document.getElementById(id);
  const panel=$('portalPanel'), prompt=$('interactionPrompt'), toast=$('toast');

  function addPart(parent,mesh,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){draw(mesh,matMul(parent,compose(x,y,z,sx,sy,sz,ry,rx,rz)),currentVP,currentCamera);}
  let currentVP=matIdentity(),currentCamera=[0,7,12];
  function drawTree(x,z,size=1){
    const base=compose(x,0,z,size,size,size);
    addPart(base,meshes.trunk,0,0,.0,.22,1.05,.22);
    addPart(base,meshes.leaf,0,1.05,0,.72,.78,.72);
    addPart(base,meshes.leaf,0,1.48,0,.55,.62,.55);
    addPart(base,meshes.leaf,0,1.82,0,.35,.43,.35);
  }
  function drawGrass(x,z,size,phase){
    const base=compose(x,0,z,size,size,size);
    for(let i=0;i<3;i++) addPart(base,meshes.grassTuft,Math.sin(phase+i*2.1)*.07,.12,Math.cos(phase+i*2.1)*.07,.11,.32,.1,i*.9,0,(i-1)*.22);
  }
  function drawWorld(t){
    draw(meshes.stars,matIdentity(),currentVP,currentCamera);
    draw(meshes.side,compose(0,-.12,0,7.55,2.22,7.55),currentVP,currentCamera);
    draw(meshes.grass,compose(0,.015,0,7.35,1,7.35),currentVP,currentCamera);
    // Petites terrasses et rochers sculptés de manière procédurale.
    const rocks=[[-6.5,.4,.65],[-5.7,-3.1,.55],[5.9,-3.5,.6],[6.5,2.4,.55],[-6.3,3.3,.48],[2.6,-6.2,.42],[-2.8,-6.15,.5],[5.5,4.3,.42],[-4.9,4.5,.4]];
    rocks.forEach((r,i)=>draw(meshes.stone,compose(r[0],.03,r[1],r[2]*1.4,r[2]*.6,r[2],i*.6,0,i*.3),currentVP,currentCamera));
    // Chemins en dalles vers chaque porte.
    for(let i=0;i<6;i++){
      const z=1.0-i*.82;draw(meshes.path,compose(0,.055,z,.55,.07,.36,Math.sin(i)*.12),currentVP,currentCamera);
    }
    for(let i=0;i<4;i++){
      const d=1.2+i*.76;draw(meshes.path,compose(d,.05,-.05,.48,.06,.34,.12),currentVP,currentCamera);draw(meshes.path,compose(-d,.05,-.05,.48,.06,.34,-.12),currentVP,currentCamera);
    }
    // Végétation, arbustes et fleurs, avec positions fixes.
    [[-3.5,-2.5,.8],[-4.1,1.7,.72],[3.4,-2.4,.82],[3.8,2.6,.7],[-2.8,4.5,.6],[2.7,4.7,.55]].forEach(p=>drawTree(p[0],p[1],p[2]));
    for(let i=0;i<26;i++){
      const a=i*2.39996,r=2.4+(i%7)*.52,x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(Math.abs(x)<1.1&&z>0)continue;
      drawGrass(x,z,.65+(i%3)*.13,i*.8);
      if(i%3===0)draw(meshes.flower,compose(x+.13,.23,z+.07,.07,.07,.07,0),currentVP,currentCamera);
    }
    // Sanctuaires et leurs anneaux animés.
    portals.forEach((p,i)=>{
      const root=compose(p.x,.06,p.z,1,1,1,p.yaw);
      addPart(root,p.aperture,0,.95,-.075,.78,1.03,.12);
      addPart(root,p.arch,0,0,0,1.12,1.35,1);
      addPart(root,meshes.gold,1.02,.1,0,.12,.18,.12,0,0,.2);
      addPart(root,meshes.gold,-1.02,.1,0,.12,.18,.12,0,0,-.2);
      const bob=Math.sin(t*1.4+i*2.2)*.08;
      addPart(root,p.orb,0,2.95+bob,0,.16,.16,.16);
      // Fins éclats suspendus autour de l'arche.
      for(let k=0;k<5;k++){
        const a=t*.42+k*2*Math.PI/5+i*.7,rr=1.43;
        addPart(root,p.orb,Math.cos(a)*rr,1.1+Math.sin(a)*.85,Math.sin(a)*.08,.035,.035,.035);
      }
      // Socle du portail.
      addPart(root,meshes.path,0,.06,.04,1.45,.12,.7,0);
    });
    // Pierres flottantes autour de l'île.
    for(let i=0;i<9;i++){
      const a=t*.04+i*2.4,r=9+(i%3)*.8,y=-1.1+(i%4)*.55;
      draw(meshes.stone,compose(Math.cos(a)*r,y,Math.sin(a)*r,.15+(i%3)*.06,.18+(i%2)*.08,.15, a, a*.2,a*.4),currentVP,currentCamera);
    }
    drawPlayer(t);
  }
  function drawPlayer(t){
    const moving=Object.values(keys).some(Boolean)||Object.values(touch).some(Boolean);
    const stride=moving?Math.sin(t*10)*.48:Math.sin(t*2.1)*.04;
    const bob=moving?Math.abs(Math.sin(t*10))*.055:Math.sin(t*2.1)*.025;
    const root=compose(player.x,bob,player.z,1,1,1,player.yaw);
    // Cape, tunique, tête et capuche : personnage low-poly entièrement procédural.
    addPart(root,meshes.cloak,0,.35,.04,.72,.95,.64,0,0,.02);
    addPart(root,meshes.tunic,0,.48,0,.82,.8,.72);
    addPart(root,meshes.skin,0,1.18,0,.25,.28,.25);
    addPart(root,meshes.hood,0,1.32,-.01,.38,.42,.38);
    addPart(root,meshes.dark,0,1.18,.225,.18,.055,.035);
    addPart(root,meshes.gold,0,1.55,.02,.25,.075,.24,0,0,.02);
    addPart(root,meshes.cylinder,-.22,.35,0,.13,.53,.13,0,0,-.08+stride*.18);
    addPart(root,meshes.cylinder,.22,.35,0,.13,.53,.13,0,0,.08-stride*.18);
    addPart(root,meshes.cylinder,-.13,.04,0,.15,.38,.16,0,stride*.25);
    addPart(root,meshes.cylinder,.13,.04,0,.15,.38,.16,0,-stride*.25);
    addPart(root,meshes.gold,-.3,.7,.015,.09,.09,.09,0,0,stride*.5);
    addPart(root,meshes.gold,.3,.7,.015,.09,.09,.09,0,0,-stride*.5);
  }

  function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.8),w=Math.floor(canvas.clientWidth*dpr),h=Math.floor(canvas.clientHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,canvas.width,canvas.height);}
  function nearestPortal(){let best=-1,dist=Infinity;portals.forEach((p,i)=>{const d=Math.hypot(player.x-p.x,player.z-p.z);if(d<dist){dist=d;best=i;}});return {index:best,distance:dist};}
  function updateUI(){
    const nearest=nearestPortal();activePortal=nearest.distance<2.25?nearest.index:-1;
    if(activePortal>=0&&!panel.hidden){prompt.hidden=true;}else if(activePortal>=0){prompt.hidden=false;$('promptText').textContent='Entrer · '+portals[activePortal].name;}else{prompt.hidden=true;}
    document.querySelectorAll('.legend-card').forEach((card,i)=>{card.classList.toggle('active',i===activePortal);card.style.opacity=discovered.has(i)?'1':'.82';});
    $('progressFill').style.width=(discovered.size/portals.length*100)+'%';$('progressLabel').textContent=discovered.size+' / '+portals.length+' pages découvertes';
    if(discovered.size===portals.length){$('missionTitle').textContent='Toutes les portes sont ouvertes';$('missionText').textContent='Vous avez vu chaque page du site. Entrez dans celle qui vous intéresse.';}
    $('coordinateText').textContent='ATELIER — '+player.x.toFixed(2)+' / '+player.z.toFixed(2);
  }
  function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove('show'),2300);}
  function interact(){if(!panel.hidden)return;const near=nearestPortal();if(near.distance>2.25){showToast('Approchez-vous d’un portail pour interagir.');return;}const p=portals[near.index];discovered.add(near.index);$('panelSymbol').textContent=p.symbol;$('panelTitle').textContent=p.name;$('panelDescription').textContent=p.description;$('panelGo').href=p.url;$('panelGo').firstChild.textContent=p.cta.toUpperCase()+' ';panel.style.setProperty('--portal-accent',p.color==='gold'?'#f3d08a':p.color==='violet'?'#c3a0ff':'#76e5f4');$('panelSymbol').style.color=panel.style.getPropertyValue('--portal-accent');$('panelSymbol').style.borderColor=panel.style.getPropertyValue('--portal-accent');panel.hidden=false;prompt.hidden=true;updateUI();}
  function closePanel(){panel.hidden=true;updateUI();}
  const closeIt=()=>{if(window.parent!==window)window.parent.postMessage({type:'monde-close'},'*');else location.href='./';};
  $('closeBtn').addEventListener('click',e=>{if(window.parent!==window){e.preventDefault();closeIt();}});
  $('panelGo').addEventListener('click',e=>{if(window.top&&window.top!==window){e.preventDefault();try{window.top.location.href=$('panelGo').getAttribute('href');}catch{location.href=$('panelGo').getAttribute('href');}}});
  $('panelClose').addEventListener('click',closePanel);$('panelContinue').addEventListener('click',closePanel);
  document.querySelectorAll('.legend-card').forEach((card,i)=>card.addEventListener('click',()=>{const p=portals[i];player.x=clamp(p.x*.66,-6.2,6.2);player.z=clamp(p.z*.66+.15,-6.2,6.2);player.yaw=p.yaw+Math.PI;cameraYaw=0;showToast('Point de repère : '+p.name);updateUI();}));
  window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(key==='e'||key==='enter'){interact();return;}if(key==='escape'){if(!panel.hidden)closePanel();else closeIt();return;}keys[key]=true;});
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  canvas.addEventListener('pointerdown',e=>{dragging=true;dragX=e.clientX;dragPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragPointer)return;const dx=e.clientX-dragX;dragX=e.clientX;cameraYaw+=dx*.006;});
  function endDrag(e){if(e.pointerId===dragPointer){dragging=false;dragPointer=-1;}}
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
  document.querySelectorAll('[data-move]').forEach(button=>{
    const direction=button.dataset.move;const keyMap={forward:'w',back:'s',left:'a',right:'d'};
    button.addEventListener('pointerdown',e=>{e.preventDefault();touch[direction]=true;button.setPointerCapture(e.pointerId);});
    const release=()=>{touch[direction]=false;};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    button.dataset.key=keyMap[direction];
  });
  $('touchInteract').addEventListener('click',interact);

  function update(dt,t){
    if(!panel.hidden)return;
    let dx=0,dz=0;
    if(keys.w||keys.z||keys.arrowup||touch.forward)dz-=1;
    if(keys.s||keys.arrowdown||touch.back)dz+=1;
    if(keys.a||keys.q||keys.arrowleft||touch.left)dx-=1;
    if(keys.d||keys.arrowright||touch.right)dx+=1;
    if(dx||dz){const len=Math.hypot(dx,dz);dx/=len;dz/=len;const speed=3.1*dt;player.x+=dx*speed;player.z+=dz*speed;player.x=clamp(player.x,-6.55,6.55);player.z=clamp(player.z,-6.55,6.55);player.yaw=Math.atan2(dx,dz);player.step+=dt;}
    updateUI();
  }
  function render(now){resize();const t=now*.001,dt=Math.min(.04,lastTime?((now-lastTime)*.001):.016);lastTime=now;update(dt,t);
    const target=[player.x,.7,player.z],distance=10.6,cameraHeight=6.5;
    currentCamera=[player.x+Math.sin(cameraYaw)*distance,cameraHeight,player.z+Math.cos(cameraYaw)*distance];
    const view=lookAt(currentCamera,target,[0,1,0]),projection=perspective(Math.PI/3.2,canvas.width/canvas.height,.1,100);
    currentVP=matMul(projection,view);gl.clearColor(.035,.065,.13,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);drawWorld(t);frame++;requestAnimationFrame(render);
  }
  window.addEventListener('resize',resize);resize();updateUI();requestAnimationFrame(render);
  statusText.textContent='EXPLORATION ACTIVE';
})();
