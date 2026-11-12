import { Color, Matrix4, Vector3 } from '../../vendor/three.module.min.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder } from 'meshoptimizer';

const V = a => new Vector3(...a);
export const mix = (a, b, f) => V(a).lerp(V(b), f).toArray();
export const offset = (a, x, y, z) => [a[0]+x, a[1]+y, a[2]+z];
const ringUV = [[-.67,1],[.67,1],[1,.66],[1,-.66],[.67,-1],[-.67,-1],[-1,-.66],[-1,.66]];
const palette = new Map();

function linear(hex) {
  if (!palette.has(hex)) palette.set(hex,new Color(hex).toArray());
  return palette.get(hex);
}

export function octagon(center, w, d, axis = [0,1,0]) {
  const y=V(axis).normalize();
  const z0=Math.abs(y.z)>.96 ? new Vector3(1,0,0) : new Vector3(0,0,1);
  const x=new Vector3().crossVectors(y,z0).normalize();
  const z=new Vector3().crossVectors(x,y);
  return ringUV.map(([u,v])=>V(center).addScaledVector(x,u*w).addScaledVector(z,v*d).toArray());
}

export class Facets {
  positions = [];
  normals = [];
  colors = [];
  joints = [];
  weights = [];
  morphs = {};

  constructor(jointNames = [], morphNames = []) {
    this.jointNames = jointNames;
    for(const name of morphNames) this.morphs[name]=[];
  }

  tri(a,b,c,hex,bind = [], edit) {
    const n=new Vector3().subVectors(V(b),V(a)).cross(new Vector3().subVectors(V(c),V(a))).normalize().toArray();
    for(const [i,p] of [a,b,c].entries()) {
      this.positions.push(...p);
      this.normals.push(...n);
      this.colors.push(...linear(hex));
      if(this.jointNames.length){
        const entry=typeof bind[0]==='string'?bind:bind[i];
        const values=typeof entry?.[0]==='string'?[entry]:entry;
        for(let k=0;k<4;k++){
          const [name,w]=values?.[k]??[this.jointNames[0],0];
          const index=this.jointNames.indexOf(name);
          if(index<0) throw new Error('Joint unknown: '+name);
          this.joints.push(index);
          this.weights.push(w);
        }
      }
      for(const [name, data] of Object.entries(this.morphs)) {
        const q=edit?.(name,p)??p;
        data.push(q[0]-p[0],q[1]-p[1],q[2]-p[2]);
      }
    }
  }

  face(points, color, binding, edit) {
    for(let i=1;i<points.length-1;i++) this.tri(points[0],points[i],points[i+1],color,binding,edit);
  }

  loft(rings, colors, bind = []) {
    for(let y=0;y<rings.length-1;y++){
      const a=rings[y],b=rings[y+1];
      for(let i=0;i<a.length;i++){
        const j=(i+1)%a.length;
        const color=Array.isArray(colors)?colors[i%colors.length]:colors;
        const w=bind[y],v=bind[y+1];
        this.tri(a[i],a[j],b[j],color, w ? [w,w,v] : []);
        this.tri(a[i],b[j],b[i],color, w ? [w,v,v] : []);
      }
    }
    const col=Array.isArray(colors)?colors[0]:colors;
    this.face([...rings[0]].reverse(),col,bind[0]);
    this.face(rings.at(-1),col,bind.at(-1));
  }

  box(center, half, color, bone) {
    const [x,y,z]=center;
    const [w,h,d]=half;
    const inset=Math.min(w,h,d)*.34;
    this.loft([
      octagon([x,y-h,z],w-inset,d-inset),
      octagon([x,y-h+inset,z],w,d),
      octagon([x,y+h-inset,z],w,d),
      octagon([x,y+h,z],w-inset,d-inset),
    ],color,bone?Array.from({length:4},()=>[bone,1]):[]);
  }
}

export const newGLB = name => {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(name);
  return {doc,buffer,scene,material:doc.createMaterial('Émail mat et pigments').setMetallicFactor(0).setRoughnessFactor(.85)};
};

export function meshFrom(b, state, name) {
  const { doc, buffer, material }=state;
  const accessor=(label,type,data,Type=Float32Array)=>doc.createAccessor(label,buffer).setType(type).setArray(new Type(data));
  const p=doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION',accessor(name+' position','VEC3',b.positions))
    .setAttribute('NORMAL',accessor(name+' normal','VEC3',b.normals))
    .setAttribute('COLOR_0',accessor(name+' pigments','VEC3',b.colors));
  if(b.jointNames.length) p
    .setAttribute('JOINTS_0',accessor(name+' joints','VEC4',b.joints,Uint16Array))
    .setAttribute('WEIGHTS_0',accessor(name+' weights','VEC4',b.weights));
  for(const [m,data] of Object.entries(b.morphs)){
    p.addTarget(doc.createPrimitiveTarget(m).setAttribute('POSITION',accessor(m,'VEC3',data)));
  }
  const mesh=doc.createMesh(name).addPrimitive(p);
  if(Object.keys(b.morphs).length){
    mesh.setExtras({targetNames:Object.keys(b.morphs)});
    mesh.setWeights(Object.keys(b.morphs).map(()=>0));
  }
  return mesh;
}

export function rigFrom(state, anchors) {
  const {doc,scene,buffer}=state;
  const skin=doc.createSkin('Repères d’animation Mathieu');
  const inverse=[];
  const root=doc.createNode('Repères Mathieu');
  scene.addChild(root);
  skin.setSkeleton(root);
  for(const [name,value] of Object.entries(anchors)){
    const joint=doc.createNode(name).setMatrix(value.m);
    root.addChild(joint);skin.addJoint(joint);
    inverse.push(...new Matrix4().fromArray(value.m).invert().toArray());
  }
  skin.setInverseBindMatrices(doc.createAccessor('Pose debout inverse',buffer).setType('MAT4').setArray(new Float32Array(inverse)));
  return skin;
}

export async function writeGLB(state,path) {
  await MeshoptEncoder.ready;
  state.doc.createExtension(EXTMeshoptCompression).setRequired(true);
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  return io.write(path,state.doc);
}
