/* Constellations interchapitres. Geometrie originale, palette reconstruite a partir
   des couleurs et du comportement visibles dans Shopify Editions Fall 2026.
   Aucun code du site tiers importe. Une passe sur la boucle Three.js existante. */
export function createConstellationPass(THREE,{scene,page,PXM,PAGE_W,rectOf,reduce=false}){
  const corridors=[...page.querySelectorAll('.pc-transit')];
  const projects=[...page.querySelectorAll('.pc-proj')].map((el,i)=>{
    const card=el.querySelector('.pc-pcard')||el.querySelector('.pc-card');
    const link=card?.querySelector('.pc-more[href]');
    return {i,title:card?.querySelector('h3')?.textContent.trim()||'Projet',
      subtitle:card?.querySelector('.pc-sub')?.textContent.trim()||'',
      src:el.dataset.fig?'assets/figures/'+el.dataset.fig+'-light.webp':null,
      href:link?.getAttribute('href')||card?.dataset.href||'',
    };
  });
  const hex=['#345cff','#1969ff','#1cbcf5','#00dfbd','#26ed83','#92a8ff','#ffffff'];
  const palette=hex.map(c=>new THREE.Color(c));
  let seed=29411;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const space=document.createElement('div');space.className='ex-cosmos';space.id='ex-cosmos';
  document.body.append(space);
  const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=64;
  const ct=texCanvas.getContext('2d');
  const grad=ct.createRadialGradient(32,32,0,32,32,31);
  grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.18,'rgba(255,255,255,.9)');
  grad.addColorStop(.46,'rgba(255,255,255,.42)');grad.addColorStop(1,'rgba(255,255,255,0)');
  ct.fillStyle=grad;ct.fillRect(0,0,64,64);
  const flare=new THREE.CanvasTexture(texCanvas);
  const worlds=[];
  const makeNode=(x,y,z)=>new THREE.Vector3(x,y,z);
  for(const [i,el] of corridors.entries()){
    const r=rectOf(el);
    const z0=(r.y+r.h/2)/PXM,zSize=r.h/PXM;
    const group=new THREE.Group();scene.add(group);
    const hubs=[],spokes=[],lines=[],colors=[],nodes=[],nodeColors=[];
    const xs=[-.72,.68,-.24,.88,.19,-.87],zs=[-.36,-.29,.23,.39,.1,.63];
    for(let j=0;j<6;j++){
      const x=xs[j]*PAGE_W/PXM*.41+(rand()-.5)*.24;
      const z=z0+zs[j]*zSize*.68+(rand()-.5)*.17;
      const y=.18+rand()*.35;
      const hub=makeNode(x,y,z),hue=palette[(j+i)%6];
      hubs.push({hub,color:hue,j});
      nodes.push(hub.x,hub.y,hub.z);nodeColors.push(hue.r,hue.g,hue.b);
      const n=19+Math.round(rand()*14);
      for(let k=0;k<n;k++){
        const angle=(k/n)*Math.PI*2+(rand()-.5)*.25;
        const radius=(.45+rand()*1.45)*(PAGE_W/PXM/10);
        const dest=makeNode(clamp(x+Math.cos(angle)*radius,-PAGE_W/PXM*.48,PAGE_W/PXM*.48),
          .08+rand()*.34,clamp(z+Math.sin(angle)*radius*.9,z0-zSize*.51,z0+zSize*.51));
        const c=k%9===0?palette[6]:hue;
        lines.push(hub.x,hub.y,hub.z,dest.x,dest.y,dest.z);
        // Color gradient: primary ultra blue / cyan / mint centers, dark tips.
        colors.push(c.r*.93,c.g*.96,c.b,
          c.r*(k%4===0?.84:.30),c.g*(k%4===0?.88:.37),c.b*(k%4===0?.96:.62));
        spokes.push({from:hub,to:dest,phase:rand(),speed:.15+rand()*.25,color:c});
        if(k%4===0){nodes.push(dest.x,dest.y,dest.z);nodeColors.push(c.r*.7,c.g*.75,c.b);}
      }
    }
    // Long fine white cross-links, similarly to the hero constellation.
    for(let j=0;j<hubs.length;j++){
      const a=hubs[j].hub,b=hubs[(j+1)%hubs.length].hub;
      lines.push(a.x,a.y,a.z,b.x,b.y,b.z);
      colors.push(.9,.94,1,.54,.66,1);
    }
    const edgeGeometry=new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
    edgeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const edgeMaterial=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.91,
      blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false});
    const edges=new THREE.LineSegments(edgeGeometry,edgeMaterial);
    edges.frustumCulled=false;edges.renderOrder=3;group.add(edges);
    // Stars flicker as groups rather than one mesh per star.
    const starsGeometry=new THREE.BufferGeometry();
    starsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(nodes,3));
    starsGeometry.setAttribute('color',new THREE.Float32BufferAttribute(nodeColors,3));
    const starsMaterial=new THREE.PointsMaterial({size:.16,map:flare,vertexColors:true,transparent:true,
      opacity:.94,depthWrite:false,blending:THREE.AdditiveBlending,alphaTest:.01,sizeAttenuation:true});
    const stars=new THREE.Points(starsGeometry,starsMaterial);stars.frustumCulled=false;
    stars.renderOrder=5;group.add(stars);
    const tracerCount=spokes.length;
    const tracerPositions=new Float32Array(tracerCount*3),tracerColors=new Float32Array(tracerCount*3);
    for(let p=0;p<tracerCount;p++){const c=spokes[p].color;
      tracerColors.set([c.r,c.g,c.b],p*3);}
    const tracerGeometry=new THREE.BufferGeometry();
    tracerGeometry.setAttribute('position',new THREE.BufferAttribute(tracerPositions,3).setUsage(THREE.DynamicDrawUsage));
    tracerGeometry.setAttribute('color',new THREE.BufferAttribute(tracerColors,3));
    const tracerMaterial=new THREE.PointsMaterial({size:.12,map:flare,vertexColors:true,transparent:true,
      opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending});
    const tracers=new THREE.Points(tracerGeometry,tracerMaterial);
    tracers.frustumCulled=false;tracers.renderOrder=6;group.add(tracers);
    // Field of fine deep blue noise independent of connected stars.
    const fine=[],fineColor=[];
    for(let q=0;q<105;q++){
      fine.push((rand()-.5)*PAGE_W/PXM*1.1,.03+rand()*.4,z0+(rand()-.5)*zSize);
      const c=palette[rand()>.76?6:rand()>.46?1:0];fineColor.push(c.r,c.g,c.b);
    }
    const dustGeometry=new THREE.BufferGeometry();
    dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fine,3));
    dustGeometry.setAttribute('color',new THREE.Float32BufferAttribute(fineColor,3));
    const dustMaterial=new THREE.PointsMaterial({size:.055,vertexColors:true,transparent:true,opacity:.58,
      depthWrite:false,blending:THREE.AdditiveBlending});
    const dust=new THREE.Points(dustGeometry,dustMaterial);group.add(dust);
    // Project thumbnail cards: original site images, live anchors, accessible native HTML.
    const cards=[];
    for(let c=0;c<3;c++){
      const item=projects[(i+c*3)%Math.max(1,projects.length)];
      if(!item)continue;
      const link=document.createElement(item.href?'a':'div');
      link.className='ex-cosmos-card';if(item.href)link.href=item.href;
      const mini=document.createElement('span');mini.className='ex-cosmos-img';
      if(item.src){const img=document.createElement('img');img.src=item.src;img.alt='';img.loading='lazy';img.decoding='async';mini.append(img);}
      const caption=document.createElement('span');caption.className='ex-cosmos-caption';
      const title=document.createElement('strong');title.textContent=item.title;
      const subt=document.createElement('small');subt.textContent=item.subtitle||'Projet professionnel';
      caption.append(title,subt);link.append(mini,caption);space.append(link);
      const pick=hubs[(c*2+i)%hubs.length].hub.clone();
      pick.x+=c===1?-.55:.32;pick.y+=.18;
      cards.push({el:link,position:pick,c,visible:false});
    }
    worlds.push({i,z:z0,zSize,group,spokes,tracerPositions,tracerGeometry,edges,edgeMaterial,
      starsMaterial,tracerMaterial,dustMaterial,cards,last:0});
  }
  let oldTime=0;
  function frame(now,focusZ){
    if(!worlds.length)return;
    const time=now*.001;
    for(const w of worlds){
      const distance=Math.abs(focusZ-w.z);
      const close=distance < Math.max(16,w.zSize*2.1);
      w.group.visible=close;
      if(!close)continue;
      const amp=Math.max(.15,1-distance/Math.max(16,w.zSize*2));
      w.edgeMaterial.opacity=.90*amp;
      w.starsMaterial.opacity=(.71+.23*Math.sin(time*1.4+w.i)) * amp;
      w.tracerMaterial.opacity=.9*amp;
      w.dustMaterial.opacity=.49*amp;
      if(reduce)continue;
      if(now-w.last<28)continue;
      w.last=now;
      for(let p=0;p<w.spokes.length;p++){
        const e=w.spokes[p],t=(e.phase+time*e.speed)%1,index=p*3;
        const pulse=Math.pow(t,.82);
        w.tracerPositions[index]=e.from.x+(e.to.x-e.from.x)*pulse;
        w.tracerPositions[index+1]=e.from.y+(e.to.y-e.from.y)*pulse+.025*Math.sin(time*3+p);
        w.tracerPositions[index+2]=e.from.z+(e.to.z-e.from.z)*pulse;
      }
      w.tracerGeometry.attributes.position.needsUpdate=true;
    }
    oldTime=time;
  }
  function project(toScreen,focusZ){
    const width=innerWidth,height=innerHeight;
    const hidden= document.documentElement.classList.contains('pc-lifted')||
      document.documentElement.classList.contains('ex-menu-open');
    for(const w of worlds){
      const close=Math.abs(w.z-focusZ)<Math.max(12,w.zSize*1.8) && !hidden;
      for(const card of w.cards){
        let show=close;
        if(show){
          const [x,y,pz]=toScreen(card.position);
          show=Number.isFinite(x)&&Number.isFinite(y)&&pz<1&&y>80&&y<height-70&&x>85&&x<width-70;
          if(show){
            const sc=clamp(.88+Math.min(.18,1-Math.abs(w.z-focusZ)/18),.78,1);
            card.el.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate(-50%,-50%) scale('+sc.toFixed(3)+')';
            card.el.style.opacity=String(Math.min(1,(1-Math.abs(w.z-focusZ)/Math.max(18,w.zSize*3))*2));
          }
        }
        if(card.visible!==show){card.el.hidden=!show;card.visible=show;}
      }
    }
  }
  function dispose(){
    for(const w of worlds){
      w.group.removeFromParent();
      for(const item of w.group.children){item.geometry?.dispose();item.material?.dispose();}
      for(const card of w.cards)card.el.remove();
    }
    flare.dispose();space.remove();
  }
  return {frame,project,dispose,worlds};
}
