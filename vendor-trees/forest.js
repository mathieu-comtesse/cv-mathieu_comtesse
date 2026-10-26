/* Native tree forest: one generator context, many genuine procedural 3D tree objects.
 * Source geometry & shaders come from a third-party public browser bundle.
 * Publication requires rights to redistribute or embed that third-party bundle.
 */
(function(global){
  'use strict';
  const SPECIES=new Set(['cherry','maple','pine','weeping','ginkgo']);
  const SEASONS=new Set(['spring','summer','autumn','winter']);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
  const getColor=(hex)=>{const s=String(hex||'#ffffff').replace('#','');if(!/^[a-f0-9]{6}$/i.test(s))throw new Error('Couleur hexadécimale #RRGGBB attendue');return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255);};
  const getUniform=(obj,name)=>obj.material?.uniforms?.[name]?.value;
  const getVectors=(v)=>Array.isArray(v)?v.slice(0,3):(v&&typeof v.x==='number'?[v.x,v.y,v.z]:null);

  class TreeForest{
    constructor(options){
      if(!options?.scene?.isScene || !options?.renderer?.isWebGLRenderer)throw new Error('La vraie THREE.Scene et son WebGLRenderer sont nécessaires.');
      this.scene=options.scene;
      this.renderer=options.renderer;
      this.sunlight=options.sunlight||null;
      this.defaultTint=options.tint||'#ffffff';
      this.trees=[];this.time=0;this.disposed=false;
      const registry=global.__publicTreeModules;
      if(!registry)throw new Error('Bundles publics non chargés.');
      this._host=document.createElement('div');
      this._host.style.cssText='position:fixed;left:-99999px;top:-99999px;width:4px;height:4px;pointer-events:none';
      document.body.appendChild(this._host);
      this._engine=registry.instantiate(362503).createTree(this._host,{
        species:'ginkgo',season:'summer',seed:7,wind:.5,
        garden:false,moss:0,rocks:0,fall:0,fireflies:0,controls:false,drag:false,wheel:false,
        appearance:'light',growTime:.01,autoTurn:0
      },{nativeScene:true,maxDpr:1});
      if(!this._engine?.native?.snapshot){this._host.remove();throw new Error('La fabrique 3D originale n’a pas pu démarrer. Vérifie WebGL2.');}
    }
    _create(config){
      const {species='ginkgo',season='summer',seed=7}=config;
      if(!SPECIES.has(species) || !SEASONS.has(season))throw new TypeError('Espèce ou saison non reconnue.');
      const snap=this._engine.native.snapshot(species,season,seed);
      snap.group.name=`living-tree-${species}-${season}`;
      snap.group.position.set(config.x??0,config.y??0,config.z??0);
      snap.group.scale.setScalar(config.scale??1);
      snap.group.rotation.y=config.rotationY??0;
      snap.branches.castShadow=!!config.castShadows;
      snap.leaves.castShadow=false;
      snap.leaves.frustumCulled=false;
      snap.branches.frustumCulled=false;
      snap.branches.receiveShadow=false;
      snap.leaves.receiveShadow=false;
      snap.group.updateMatrixWorld(true);
      const tint=Array.isArray(config.tint)?config.tint.slice(0,3):getColor(config.tint||this.defaultTint);
      const mats=[snap.branches.material,snap.leaves.material];
      const bases=new Map();
      for(const mat of mats){
        const entries={};
        for(const k of ['uPal0','uPal1','uPal2','uPal3','uBark','uBarkShade']){
          if(mat.uniforms?.[k]?.value?.clone)entries[k]=mat.uniforms[k].value.clone();
        }
        bases.set(mat,entries);
      }
      this.scene.add(snap.group);
      return { ...config, ...snap, mats, bases, tint, wind:clamp(config.wind??.55,0,2),windSpeed:clamp(config.windSpeed??1,.01,4),age:0,disposed:false };
    }
    addTree(config={}){
      if(this.disposed)throw new Error('La forêt a été détruite.');
      let data=this._create(config);
      const tree={
        get object3D(){return data.group},
        get stats(){return data.stats},
        get species(){return data.species},
        get season(){return data.season},
        setSpecies:(species)=>{this._replace(data,{species});return tree},
        setSeason:(season)=>{this._replace(data,{season});return tree},
        setWind:(value)=>{data.wind=clamp(value,0,2);return tree},
        setTint:(color)=>{data.tint=getColor(color);return tree},
        setPosition:(x,y,z)=>{data.group.position.set(x,y,z);return tree},
        setScale:(value)=>{data.group.scale.setScalar(clamp(value,.02,50));return tree},
        dispose:()=>{this._remove(data)}
      };
      this.trees.push(data);
      return tree;
    }
    _replace(data,options){
      const pose={x:data.group.position.x,y:data.group.position.y,z:data.group.position.z,
        rotationY:data.group.rotation.y,scale:data.group.scale.x};
      const next=this._create({...data,...pose,...options});
      this._destroyGeometry(data);
      const idx=this.trees.indexOf(data);
      if(idx>=0)this.trees[idx]=next;
      // Keep the public object methods referring to the new instance by reusing the object.
      for(const key of ['group','branches','leaves','species','season','seed','stats','mats','bases','tint','wind','windSpeed','age'])data[key]=next[key];
      if(idx>=0)this.trees[idx]=data;
    }
    _destroyGeometry(data){
      data.group.removeFromParent();
      for(const m of [data.branches,data.leaves]){
        m?.geometry?.dispose();
        m?.material?.dispose();
      }
    }
    _remove(data){if(data.disposed)return;data.disposed=true;this._destroyGeometry(data);const idx=this.trees.indexOf(data);if(idx>=0)this.trees.splice(idx,1);}
    update(dt){
      if(this.disposed)return;
      dt=clamp(dt,0,.05);this.time+=dt;
      const sunDir=getVectors(this.sunlight?.position)||[.7,.85,.4];
      const sunCol=this.sunlight?.color;
      const sun=[sunCol?.r??1,sunCol?.g??1,sunCol?.b??1];
      const len=Math.hypot(...sunDir)||1;
      for(const data of this.trees){
        data.age+=dt;
        for(const mat of data.mats){
          const u=mat.uniforms;
          if(!u)continue;
          if(u.uTime)u.uTime.value=this.time;
          if(u.uWind)u.uWind.value=data.wind;
          if(u.uWindSpeed)u.uWindSpeed.value=data.windSpeed;
          if(u.uGrow)u.uGrow.value=1;
          if(u.uNativeMode)u.uNativeMode.value=1;
          if(u.uSunDir)u.uSunDir.value.set(sunDir[0]/len,sunDir[1]/len,sunDir[2]/len);
          if(u.uSun)u.uSun.value.set(...sun);
          for(const [key,base] of Object.entries(data.bases.get(mat)||{})){
            const v=u[key]?.value;
            if(v)v.set(base.x*data.tint[0],base.y*data.tint[1],base.z*data.tint[2]);
          }
        }
      }
    }
    dispose(){if(this.disposed)return;for(const t of [...this.trees])this._remove(t);this._engine.dispose();this._host.remove();this.disposed=true;}
  }
  global.NativeTreeForest={create:(opts)=>new TreeForest(opts),species:[...SPECIES],seasons:[...SEASONS]};
})(window);
