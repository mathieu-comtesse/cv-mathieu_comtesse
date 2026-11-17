import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';

// Usage: node tools/extract-fall26-topology.mjs /path/to/reference-files > refonte/fall26-reference-topology.js
// The directory contains the original HTML, graph-data JSON and CDN modules
// named below. The output contains only local indices and measured positions.
const directory = process.argv[2];
if (!directory) throw new Error('Supply the directory with the Shopify reference files.');
const read = name => fs.readFileSync(path.join(directory,name),'utf8');
const clean = text => text.trim().replace(/import[^;]+;/g,'').replace(/export\{[^}]+\};?$/,'');
const evaluate = (source, environment, keys) =>
  vm.runInNewContext(source+'\n;({'+keys+'})',environment);
const easing = evaluate(clean(read('easing-BhDfN7yX.js')),{
  t:(value,from,to)=>Math.max(from,Math.min(value,to)),
},'Q:u,x:i,ii:r,ti:a');
const pack = evaluate(clean(read('pack-C0ImK1he.js')),{},'oi:O,c:k,g:D,ri:v,hi:A,ai:T,li:y,fi:I');
const renderer = clean(read('renderer-ObA0-sKL.js'));
const {Simulation} = evaluate(renderer.slice(renderer.indexOf('const I=4'),renderer.indexOf('class vt')), {
  ...easing,...pack,performance,
},'Simulation:bt');
const graph=JSON.parse(read('graph-data.json'));
const html=read('shopify.html');
const thumbnails=JSON.parse(html.match(/"endpoint":"\/editions\/fall2026\/graph-data","thumbnails":(\{[^}]+\})/)[1]);
const parents=new Map(graph.edges.filter(edge=>edge.type==='contains').map(({source,target})=>[target,source]));
const nodes=graph.nodes.filter(node=>['section','update'].includes(node.type)).map(node=>({
  id:node.id,handle:node.handle,role:node.type,weight:node.weight,prominence:'normal',
  shape:node.type==='section'?'square':thumbnails[node.ref]?'image':'circle',
  primarySectionId:parents.get(node.id),
}));
nodes.push({id:'merch',role:'update',shape:'image',prominence:'normal'});
const byId=new Map(nodes.map((node,index)=>[node.id,index]));
const viewport={width:1037,height:732};
const sim=new Simulation({nodes,hubIds:['merch']},viewport);
sim.warm(Infinity);
sim.spreadHome(viewport);

const leaves = {};
const raw = node => [sim.positions[byId.get(node.id)*3],sim.positions[byId.get(node.id)*3+1]];
for (const section of nodes.filter(node=>node.role==='section')){
  const [x,y]=raw(section);
  leaves[section.handle]=nodes.filter(node=>node.primarySectionId===section.id).map(node=>{
    const [u,v]=raw(node);
    return [+(u-x).toFixed(2),+(v-y).toFixed(2),+(node.shape==='image')];
  });
  console.error(section.handle, leaves[section.handle].length, [x,y].map(v=>+v.toFixed(1)), Math.max(...leaves[section.handle].map(([x,y])=>Math.hypot(x,y))).toFixed(1), leaves[section.handle].filter(x=>x[2]).length);
}
assert.equal(Object.values(leaves).flat(1).length,222);
const {buildGraphIndex} = evaluate(clean(read('buildGraphIndex-C3BQu6G8.js')),{},'buildGraphIndex:h');
const {matchArea} = evaluate(clean(read('getProductAreaMatches-BMTzck5J.js')),{},'matchArea:g');
const {payload} = evaluate(clean(read('getExponentialGraphPayload-SVHUn78w.js')),{
  g:buildGraphIndex,b:matchArea,I:url=>url,y:weight=>weight??1,
},'payload:O');
const indices=new Map();
for(const section of nodes.filter(node=>node.role==='section')){
  const children=nodes.filter(node=>node.primarySectionId===section.id);
  children.forEach((node,index)=>indices.set(node.id,[section.handle,index]));
}
const pairs=payload(graph,thumbnails).edges.filter(edge=>edge.type==='related_to').map(({source,target})=>[indices.get(source),indices.get(target)]);
const nodesByType=Object.groupBy(graph.nodes,(node)=>node.type);
const orderedNodes=['section','update','product','theme','outcome','persona'].flatMap(type=>nodesByType[type]??[]);
assert.equal(orderedNodes.length,353);
const indexOf=new Map(orderedNodes.map((node,i)=>[node.id,i]));
const associated=graph.edges.filter(edge=>edge.type==='assigned_to').reduce((groups,{source,target})=>{
  const updateIndex=indexOf.get(source)-11;
  groups[updateIndex].push(indexOf.get(target));
  return groups;
},Array.from({length:222},()=>[]));
const slotByUpdate=orderedNodes.filter(node=>node.type==='update').map(node=>indices.get(node.id));
const sourceText=`// Numerical model derived from the Fall ’26 public graph and its force layout.
 // Viewport 1037 × 732, build 5090151, neutral pointer, warmed to rest.
 // Rows are [dx, dy, thumbnail] relative to the original section centre.
 // No source editorial labels, identifiers, images or modules are loaded at runtime.
export const REFERENCE_BRANCHES = Object.freeze({
${Object.entries(leaves).map(([key,rows])=>'  '+key+': '+JSON.stringify(rows)).join(',\n')}
});
export const REFERENCE_PAIRS = Object.freeze(${JSON.stringify(pairs)});
export const REFERENCE_GRAPH_TOPOLOGY = Object.freeze({
  conceptsByType: ${JSON.stringify(Object.fromEntries(['product','theme','outcome','persona'].map(type=>[type,nodesByType[type].length])))},
  // Local numeric concept IDs (233 and above), indexed by update order.
  associations: Object.freeze([
    ${associated.map(values=>JSON.stringify(values)).join(',\n    ')}
  ]),
  // Each update belongs to one section and names the index of its branch.
  updateSlots: Object.freeze(${JSON.stringify(slotByUpdate)})
});
`.replaceAll('\n //','\n//');
process.stdout.write(sourceText);
console.error({pairs:pairs.length,thumbnails:Object.values(leaves).flat(1).filter(x=>x[2]).length,conceptsByType:Object.fromEntries(Object.entries(nodesByType).map(([type,list])=>[type,list.length])),links:associated.flat().length+222});
