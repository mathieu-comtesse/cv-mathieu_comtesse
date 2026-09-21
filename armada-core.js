(function(root){
const ships={
 brig:{name:'Brigantin',tons:180,cannons:4,hp:3,speed:25,width:98,height:99,sprite:'brig'},
 frigate:{name:'Frégate',tons:650,cannons:6,hp:5,speed:18,width:127,height:130,sprite:'red'},
 galleon:{name:'Galion',tons:1400,cannons:10,hp:9,speed:11,width:175,height:155,sprite:'galleon'},
 dutch:{name:'Hollandais volant',tons:2200,cannons:12,hp:16,speed:14,width:192,height:175,sprite:'dutch'}
};
function enemy(type,x){return{...ships[type],type,x,maxHp:ships[type].hp,fire:2.5,flash:0};}
const api={ships,enemy};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArmadaModel=api;
})(typeof window!=='undefined'?window:globalThis);
