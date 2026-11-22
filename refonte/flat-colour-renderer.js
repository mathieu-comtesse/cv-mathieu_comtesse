export function initFlatColourRenderer() {
  const canvas=document.createElement('canvas');
  canvas.className='cv-colour-shader';
  canvas.setAttribute('aria-hidden','true');
  canvas.hidden=true;
  document.body.prepend(canvas);
  let render=null;
  const invalidate=()=>{render=null;canvas.hidden=true;};
  async function initialize(){
    if(!navigator.gpu)return;
    const adapter=await navigator.gpu.requestAdapter();
    if(!adapter)return;
    const device=await adapter.requestDevice();
    device.lost.then(invalidate);
    const context=canvas.getContext('webgpu');
    if(!context)return;
    const response=await fetch(new URL('./fall26-graph/page-colour-1CLgp2P5.wgsl',import.meta.url));
    if(!response.ok)return;
    const shader=device.createShaderModule({label:'Fall 26 page colour',code:await response.text()});
    const format=navigator.gpu.getPreferredCanvasFormat();
    const pipeline=await device.createRenderPipelineAsync({
      layout:'auto',vertex:{module:shader,entryPoint:'vertexMain'},
      fragment:{module:shader,entryPoint:'fragmentMain',targets:[{format}]},primitive:{topology:'triangle-list'}
    });
    const viewport=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const params=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:viewport}},{binding:1,resource:{buffer:params}}
    ]});
    context.configure({device,format,colorSpace:'display-p3',alphaMode:'opaque'});
    let key='';
    render=({from,to,amount},wave,width,height,ratio)=>{
      const w=Math.floor(width*ratio),h=Math.floor(height*ratio);
      const nextKey=[...from,...to,amount,wave.x,wave.y,w,h].join(',');
      if(key===nextKey)return;
      key=nextKey;
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      device.queue.writeBuffer(viewport,0,new Float32Array([width,height,w/width,h/height]));
      device.queue.writeBuffer(params,0,new Float32Array([...from,1,...to,1,wave.x,wave.y,amount,1,1,2,4,.1]));
      const encoder=device.createCommandEncoder();
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
      device.queue.submit([encoder.finish()]);
    };
  }
  return {
    prepare(){initialize().catch(invalidate);},
    draw(etat,wave,W,H,ratio){
      if(!render||!etat.next||!etat.from||!etat.to){canvas.hidden=true;return false;}
      canvas.hidden=false;
      try {render(etat,wave,W,H,ratio);return true;} catch {invalidate();return false;}
    }
  };
}
