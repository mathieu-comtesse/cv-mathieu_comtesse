(function(){
  const factories = new Map(), modules = new Map(), exportsFor = new Map();
  const store = (entry) => {
    if (!Array.isArray(entry)) return;
    for (let i=1; i<entry.length;i++) {
      if (typeof entry[i]==='function' && typeof entry[i-1]==='number') factories.set(entry[i-1],entry[i]);
    }
  };
  const queue=[];
  globalThis.TURBOPACK={push:store};
  function namespace(id){if(!exportsFor.has(id))exportsFor.set(id,{});return exportsFor.get(id);}
  function instantiate(id){
    if(modules.has(id))return modules.get(id);
    const f=factories.get(id);
    if(!f) {if(exportsFor.has(id)) return exportsFor.get(id);throw new Error('Missing public module '+id+'; registered '+[...factories.keys()].join(','));}
    const exports=namespace(id);
    modules.set(id,exports);
    const context={
      i: instantiate,
      s(spec,targetId){
        const dst=namespace(targetId===undefined?id:targetId);
        for(let p=0;p<spec.length;){
          const key=spec[p++], value=spec[p++];
          if (typeof value==='number' && value===0) {
            Object.defineProperty(dst,key,{value:spec[p++],configurable:true,enumerable:true});
          }else{
            Object.defineProperty(dst,key,{get:typeof value==='function'?value:()=>value,configurable:true,enumerable:true});
          }
        }
      },
      v(value,targetId){Object.assign(namespace(targetId===undefined?id:targetId),value)},
      n(value,targetId){Object.assign(namespace(targetId===undefined?id:targetId),value)},
      j(value,targetId){Object.assign(namespace(targetId===undefined?id:targetId),value)},
      c:{},
    };
    try{f(context)}catch(e){modules.delete(id);throw e;}
    return exports;
  }
  globalThis.__publicTreeModules={factories,instantiate,namespace,get ids(){return Array.from(factories.keys())}};
})();
