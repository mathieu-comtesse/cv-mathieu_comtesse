import * as THREE from './three.module.js';

const stage=document.getElementById('sandboard-stage');
const canvas=document.getElementById('sandboard-canvas');
const reset=document.getElementById('sandboard-reset');
const fallback=document.getElementById('sandboard-fallback');

if(stage&&canvas&&reset){
  try{
    const palette={sand:new THREE.Color('#ffa62f'),coral:new THREE.Color('#ef4b2f'),red:new THREE.Color('#c8102e'),green:new THREE.Color('#07583d'),ink:new THREE.Color('#071b16'),blue:new THREE.Color('#9db4bd')};
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene();scene.background=palette.coral;
    const camera=new THREE.PerspectiveCamera(38,1,.1,40);camera.position.set(0,-4.2,10.8);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight(0xffe0a0,0x063628,2.25));
    const sun=new THREE.DirectionalLight(0xfff1c8,3.4);sun.position.set(-5,-4,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

    const sx=190,sy=135,geometry=new THREE.PlaneGeometry(34,24,sx,sy),position=geometry.attributes.position;
    const base=new Float32Array(position.count),colors=new Float32Array(position.count*3),tempColor=new THREE.Color();
    const grain=(x,y)=>Math.sin(x*2.1+y*.7)*.035+Math.sin(y*4.3-x*.8)*.018+Math.sin((x+y)*8.2)*.008;
    const recolor=()=>{for(let i=0;i<position.count;i++){const z=position.getZ(i),x=position.getX(i),y=position.getY(i);tempColor.set('#ffffff');if(z<base[i]-.045)tempColor.lerp(palette.green,.34);tempColor.offsetHSL(0,0,(Math.sin(i*12.33)*.5+.5)*.055-.025);colors[i*3]=tempColor.r;colors[i*3+1]=tempColor.g;colors[i*3+2]=tempColor.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.attributes.color.needsUpdate=true;};
    for(let i=0;i<position.count;i++){base[i]=grain(position.getX(i),position.getY(i));position.setZ(i,base[i]);}
    recolor();geometry.computeVertexNormals();
    // Coarse, broken brush marks: gusts paint new strokes instead of a repeating wave.
    const paintCanvas=document.createElement('canvas');paintCanvas.width=1536;paintCanvas.height=1024;
    const paint=paintCanvas.getContext('2d');paint.fillStyle='#ee4b2d';paint.fillRect(0,0,1536,1024);
    function brush(x,y,length,width,angle,color,alpha=1){paint.save();paint.translate(x,y);paint.rotate(angle);paint.strokeStyle=color;paint.globalAlpha=alpha;paint.lineCap='butt';
      for(let b=0;b<36;b++){const oy=(Math.random()-.5)*width,start=Math.random()*length*.18,end=length*(.65+Math.random()*.35);paint.lineWidth=.5+Math.random()*width/14;paint.beginPath();paint.moveTo(start,oy);paint.lineTo(end,oy+(Math.random()-.5)*width*.2);paint.stroke();}paint.restore();}
    for(let n=0;n<200;n++)brush(Math.random()*1536,Math.random()*1024,50+Math.random()*250,8+Math.random()*42,-.5+Math.random()*.5,n%7===0?'#ce3426':n%3===0?'#f99728':'#ffb23b',.25+Math.random()*.6);
    const paintTexture=new THREE.CanvasTexture(paintCanvas);paintTexture.colorSpace=THREE.SRGBColorSpace;paintTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    let gusts=[],nextGust=0,lastPaint=0;const windPaint=t=>{if(t<lastPaint+.085)return;lastPaint=t;
      if(t>nextGust){nextGust=t+.6+Math.random()*2.7;gusts.push({x:-300+Math.random()*1536,y:Math.random()*1024,angle:-.7+Math.random()*1.2,speed:16+Math.random()*32,life:12+Math.random()*22,width:12+Math.random()*45,color:Math.random()>.25?'#ffaf36':'#ef622b'});}
      if(!gusts.length)return;paint.fillStyle='rgba(236,72,40,0.013)';paint.fillRect(0,0,1536,1024);
      gusts=gusts.filter(g=>g.life-->0);for(const g of gusts){g.x+=Math.cos(g.angle)*g.speed;g.y+=Math.sin(g.angle)*g.speed;brush(g.x,g.y,90+Math.random()*130,g.width,g.angle+(Math.random()-.5)*.09,g.color,.24);}paintTexture.needsUpdate=true;};
    const material=new THREE.MeshStandardMaterial({map:paintTexture,vertexColors:true,roughness:.98,metalness:0,flatShading:false});
    const sand=new THREE.Mesh(geometry,material);sand.receiveShadow=true;scene.add(sand);

    const tool=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.26,.045,10,32),new THREE.MeshStandardMaterial({color:palette.red,roughness:.45}));ring.castShadow=true;tool.add(ring);
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,.55,12),new THREE.MeshStandardMaterial({color:palette.blue,roughness:.5}));handle.rotation.x=Math.PI/2;handle.position.set(.14,.2,.28);handle.castShadow=true;tool.add(handle);tool.visible=false;scene.add(tool);

    const palmCanvas=document.createElement('canvas');palmCanvas.width=palmCanvas.height=512;const pc=palmCanvas.getContext('2d');pc.fillStyle='#071b16';pc.globalAlpha=.72;pc.lineCap='round';pc.strokeStyle='#071b16';pc.lineWidth=34;pc.beginPath();pc.moveTo(420,560);pc.bezierCurveTo(390,360,350,230,276,92);pc.stroke();pc.translate(278,105);for(let i=0;i<10;i++){pc.save();pc.rotate((i/10)*Math.PI*2);pc.lineWidth=5;pc.beginPath();pc.moveTo(0,0);pc.quadraticCurveTo(96,-38,214,15);pc.stroke();for(let j=12;j<195;j+=9){const curve=-28*Math.sin(j/214*Math.PI);pc.lineWidth=4;pc.beginPath();pc.moveTo(j,curve);pc.quadraticCurveTo(j+13,curve-14,j+22,curve-36*(1-j/250));pc.moveTo(j,curve);pc.quadraticCurveTo(j+13,curve+14,j+27,curve+40*(1-j/250));pc.stroke();}pc.restore();}pc.globalCompositeOperation='source-atop';for(let n=0;n<2400;n++){pc.globalAlpha=.12+Math.random()*.3;pc.fillStyle=n%3?'#0e573a':'#d18528';pc.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*8,1+Math.random()*3);}pc.globalCompositeOperation='source-over';const palmTexture=new THREE.CanvasTexture(palmCanvas);palmTexture.colorSpace=THREE.SRGBColorSpace;
    const palm=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({map:palmTexture,transparent:true,opacity:.48,depthWrite:false,color:palette.green}));palm.position.set(2.8,2,.19);palm.rotation.z=-.26;scene.add(palm);

    const particleCount=2400,particleGeo=new THREE.BufferGeometry(),particlePos=new Float32Array(particleCount*3),particleVel=new Float32Array(particleCount*3);for(let i=0;i<particleCount;i++)particlePos[i*3+2]=-20;particleGeo.setAttribute('position',new THREE.BufferAttribute(particlePos,3));const particles=new THREE.Points(particleGeo,new THREE.PointsMaterial({color:palette.sand,size:.072,transparent:true,opacity:.88,sizeAttenuation:true}));scene.add(particles);let particleCursor=0;
    const burst=(p,speed)=>{const amount=Math.min(60,14+Math.floor(speed*3));for(let j=0;j<amount;j++){const i=particleCursor++%particleCount,a=Math.random()*Math.PI*2,r=Math.random()*.22;particlePos[i*3]=p.x+Math.cos(a)*r;particlePos[i*3+1]=p.y+Math.sin(a)*r;particlePos[i*3+2]=p.z+.08;particleVel[i*3]=(Math.random()-.5)*(.06+speed*.055);particleVel[i*3+1]=(Math.random()-.5)*(.06+speed*.055);particleVel[i*3+2]=.045+Math.random()*(.05+speed*.016);}};

    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let drawing=false,lastPoint=null,lastTime=0,audio=null;
    const initAudio=()=>{if(audio)return;const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;const context=new Ctx(),buffer=context.createBuffer(1,context.sampleRate,context.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.08)/1.04;data[i]=brown*.9;}const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;source.loop=true;filter.type='bandpass';filter.frequency.value=720;filter.Q.value=.7;gain.gain.value=.0001;source.connect(filter).connect(gain).connect(context.destination);source.start();audio={context,filter,gain};};
    let muted=false;document.getElementById('sandboard-sound')?.addEventListener('click',e=>{muted=!muted;e.currentTarget.textContent=muted?'Son : non':'Son : oui';e.currentTarget.setAttribute('aria-pressed',String(!muted));if(audio)audio.gain.gain.setTargetAtTime(.0001,audio.context.currentTime,.02);});
    const sound=(active,speed=0)=>{if(!audio)return;const t=audio.context.currentTime;audio.filter.frequency.setTargetAtTime(500+Math.min(speed,18)*62,t,.035);audio.gain.gain.setTargetAtTime(active&&!muted?.035+Math.min(speed,18)*.002:.0001,t,.045);};
    const hit=e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));raycaster.setFromCamera(pointer,camera);return raycaster.intersectObject(sand,false)[0]?.point||null;};
    let dirty=false;const sculpt=(p,speed)=>{canvas.dataset.drawn='true';const radius=.32+Math.min(speed,15)*.012,r2=radius*radius;const minC=Math.max(0,Math.floor((p.x-radius*1.5+17)/34*sx)),maxC=Math.min(sx,Math.ceil((p.x+radius*1.5+17)/34*sx)),minR=Math.max(0,Math.floor((12-p.y-radius*1.5)/24*sy)),maxR=Math.min(sy,Math.ceil((12-p.y+radius*1.5)/24*sy));for(let row=minR;row<=maxR;row++)for(let col=minC;col<=maxC;col++){const i=row*(sx+1)+col;const dx=position.getX(i)-p.x,dy=position.getY(i)-p.y,d=dx*dx+dy*dy;if(d<r2){const f=1-Math.sqrt(d)/radius;const current=position.getZ(i);position.setZ(i,Math.max(base[i]-.34,current-.055*f));}else if(d<r2*2.25){const f=1-Math.abs(Math.sqrt(d)-radius)/(radius*.5);if(f>0)position.setZ(i,Math.min(base[i]+.13,position.getZ(i)+.012*f));}}dirty=true;burst(p,speed);};
    canvas.addEventListener('pointermove',e=>{const p=hit(e);if(!p)return;tool.visible=true;tool.position.set(p.x,p.y,p.z+.16);const now=performance.now(),speed=lastPoint?Math.min(20,p.distanceTo(lastPoint)/Math.max(8,now-lastTime)*160):0;if(drawing){const steps=lastPoint?Math.min(24,Math.max(1,Math.ceil(p.distanceTo(lastPoint)/.10))):1;for(let j=1;j<=steps;j++)sculpt(lastPoint?lastPoint.clone().lerp(p,j/steps):p,speed);sound(true,speed);}lastPoint=p.clone();lastTime=now;});
    canvas.addEventListener('pointerenter',()=>tool.visible=true);canvas.addEventListener('pointerleave',()=>{tool.visible=false;drawing=false;sound(false)});
    canvas.addEventListener('pointerdown',e=>{initAudio();audio?.context.resume();drawing=true;canvas.setPointerCapture(e.pointerId);const p=hit(e);if(p){sculpt(p,1);lastPoint=p.clone();lastTime=performance.now();}sound(true,1)});
    const stop=()=>{drawing=false;sound(false)};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
    reset.addEventListener('click',()=>{canvas.dataset.drawn='false';for(let i=0;i<position.count;i++)position.setZ(i,base[i]);position.needsUpdate=true;geometry.computeVertexNormals();recolor();for(let i=0;i<particleCount;i++)particlePos[i*3+2]=-20;particleGeo.attributes.position.needsUpdate=true;});
    const resize=()=>{const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(stage);resize();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=new THREE.Clock();
    const render=()=>{const t=clock.getElapsedTime();if(dirty){position.needsUpdate=true;geometry.computeVertexNormals();recolor();dirty=false;}if(!reduced){windPaint(t);palm.rotation.z=-.26+Math.sin(t*.55)*.045;palm.scale.x=1+Math.sin(t*.7)*.035;tool.rotation.z=Math.sin(t*2)*.08;}for(let i=0;i<particleCount;i++){if(particlePos[i*3+2]<-5)continue;particlePos[i*3]+=particleVel[i*3];particlePos[i*3+1]+=particleVel[i*3+1];particlePos[i*3+2]+=particleVel[i*3+2];particleVel[i*3+2]-=.0022;if(particlePos[i*3+2]<-.12)particlePos[i*3+2]=-20;}particleGeo.attributes.position.needsUpdate=true;renderer.render(scene,camera);requestAnimationFrame(render);};canvas.dataset.ready='true';render();
  }catch(error){console.error(error);fallback.hidden=false;canvas.style.cursor='crosshair';}
}
