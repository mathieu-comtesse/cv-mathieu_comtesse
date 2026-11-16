/**
 * Régression : l'opacité des foyers, points et légendes des titres Expo
 * doit suivre l'avancement de la bascule, sans affecter le graphe d'accueil.
 * Ne requiert ni DOM, ni navigateur, ni GPU.
 */
import assert from 'node:assert/strict';
import {Ciel} from '../refonte/moteur.js';
const project=(x,y,z=0)=>({x,y:y-z*.18,z});
function alphaOf(groupe,titres,alpha=1,{x=320,referenceFlat=false}={}){
  const labels=[],squares=[];
  const gradient=()=>({addColorStop(){}});
  const ctx=new Proxy({
    globalAlpha:1,
    createLinearGradient:gradient,
    createRadialGradient:gradient,
    measureText(text){return {width:text.length*6}},
    fillText(text,x){labels.push({text,x,align:this.textAlign,alpha:this.globalAlpha})},
    fillRect(){squares.push(this.globalAlpha)},
  },{get(target,key,proxy){
    return key in target ? Reflect.get(target,key,proxy) : ()=>{};
  }});
  const sky=new Ciel();
  sky.definit('single',{groupe,label:'Projets professionnels',petit:true,editoriaux:[],referenceFlat});
  sky.place('single',[x,310,35],100);
  sky.dessine(ctx,project,null,{W:1440,H:900,alpha,titres});
  return {labels,squares,visible:sky.etat(groupe)[0].visible};
}
const hidden=alphaOf('titre',0);
assert.equal(hidden.visible,false,'Invisible en vue à plat');
assert.equal(hidden.labels.length,0);
for(const value of [0.04,.25,.5,.8,1]){
  const result=alphaOf('titre',value);
  assert.equal(result.labels.length,1,'Libellé dessiné dans le mode Expo');
  assert.ok(Math.abs(result.labels[0].alpha-value)<.001,
    'Opacité du libellé : '+result.labels[0].alpha+' attendue : '+value);
  assert.ok(result.squares.some(a=>Math.abs(a-value)<.001),
    'Opacité du foyer cohérente avec le libellé : '+value);
}
const combined=alphaOf('titre',.4,.5);
assert.ok(Math.abs(combined.labels[0].alpha-.2)<.001,'Combinaison opacité globale × titre');
const welcome=alphaOf('accueil',0);
assert.ok(Math.abs(welcome.labels[0].alpha-1)<.001,'Accueil indépendant de la transition des titres');
console.log('PASS Fall26 Expo title star opacity: 0, .04, .25, .5, .8, 1, combined and hero');
const border=alphaOf('accueil',0,1,{x:1390,referenceFlat:true}).labels[0];
assert.equal(border.align,'right','Le libellé proche du bord droit se place à gauche du foyer');
assert.ok(border.x<1390 && border.x-border.text.length*6>0);
const inner=alphaOf('accueil',0,1,{referenceFlat:true}).labels[0];
assert.equal(inner.align,'left','Le libellé intérieur reste à droite du foyer');
assert.ok(inner.x>320);
