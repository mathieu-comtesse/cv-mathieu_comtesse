// Teardown premium — couche d'inspection non destructive des 11 machines existantes.
// Le mécanisme métier d'origine reste la source de vérité pour l'animation.
import * as THREE from 'three';

export const MACHINE_AREAS = {
  cerfa: {title:'Trieuse documentaire CERFA', areas:[['Chargeur PDF','Alimentation des fiches et attestations'],['Lecture','Acquisition et extraction des pages'],['Contrôles','Dates, champs requis et conformité'],['Tri','Séparation des cas à examiner'],['Sortie','Résultats et export structuré']]},
  vm: {title:'Centrale de traitement VM VRE', areas:[['File d’attente','Dépôts SharePoint et demandes en attente'],['VM principale','Lecture R004, OT et contrôle de l’écriture'],['VM de secours','Architecture de reprise envisagée, non activée'],['Historique','Écritures vérifiées et doublons écartés'],['Synthèse','Récapitulatif des nouvelles intégrations']]},
  vre: {title:'Tour de classification VRE', areas:[['Rapports','Alimentation des documents de vérification'],['Lecture','Reconnaissance des équipements et locaux'],['Contrôles','Association au bâtiment et aux familles'],['Séparation','BT31, BT33, BT21 et BT11'],['Comptages','Totaux exploitables pour le suivi']]},
  moteur: {title:'Fichier rotatif Reporteur Q18', areas:[['Rapport','Réception et identification de l’OT'],['Indexation','Recherche de la ligne correspondante'],['Correspondance','Contrôle des clés de rapprochement'],['Report Q18','Inscription des informations vérifiées'],['Restitution','Excel et visibilité Power BI']]},
  gares: {title:'Calculateur de criticité des gares', areas:[['Sources','GMAO, référentiels et SharePoint'],['Préparation','Nettoyage des indicateurs'],['Pondération','Équilibre conformité et maintenance'],['Classement','Calcul des rangs par score'],['Décision','Priorités à examiner en premier']]},
  finance: {title:'Centrale de contrôle financier', areas:[['Alimentation','Enveloppes et dépenses Excel'],['Périmètres','CS, Locatif, MEC, PPTM et global'],['Filtres','PRG, PSE et lignes exclues'],['Seuils','Vérification des valeurs paramétrées'],['Alertes','Signalements et anti-doublons']]},
  pp: {title:'Centre de suivi des PP', areas:[['Dépôt','Plans entrants SharePoint'],['Extraction','Informations et échéances'],['Contrôle','Validité et complétude'],['Classement','Listing, archivage et emplacement'],['Relances','Échéances et alertes']]},
  powerbi: {title:'Observatoire Power BI PP et MOSO', areas:[['Documents','Plans de prévention et marchés'],['Préparation','Structuration Power Query'],['Modèle','Relations et mesures DAX'],['Recherche','Navigation et accès aux fiches'],['Portail','Restitution HTML et CSS']]},
  suivi: {title:'Standard de recherche des OT', areas:[['Demande','OT, équipement ou bâtiment'],['Sources','Référentiels et systèmes internes'],['Raccordement','Correspondances documentaires'],['Recherche','Résolution des accès directs'],['Résultat','Lien et contexte consultables']]},
  studio: {title:'Fabrique d’extracteurs PDF', areas:[['Exemple','Document de référence'],['Traçage','Zones et champs à extraire'],['Génération','Construction des règles'],['Essais','Comparaison et corrections'],['Livraison','Extracteur prêt à être utilisé']]},
  'vrestudio-musicbox': {title:'Calculateur documentaire VRE', areas:[['Acquisition','Pages et positions du document'],['Sémantique','Classification et propositions du modèle'],['Règles métier','Rejet des valeurs incohérentes'],['Validation','Corrections humaines et corpus'],['Banc d’essai','Évaluation avant publication contrôlée']]}
};

const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const smooth = (a,b,t)=>a+(b-a)*(t*t*(3-2*t));

export function createTeardown(name, machine, holder, camera) {
  const spec = MACHINE_AREAS[name] || MACHINE_AREAS.vre;
  const root = machine.group;
  const extent = new THREE.Box3().setFromObject(root);
  const meshes = [];
  const parts = new WeakMap();
  const offsets = new Map();
  const originals = new Map();
  const variants = new WeakMap();
  const center = extent.getCenter(new THREE.Vector3());
  const size = extent.getSize(new THREE.Vector3());
  root.traverse((mesh)=>{
    if (!mesh.isMesh || mesh.userData.glowShell) return;
    const wp = mesh.getWorldPosition(new THREE.Vector3());
    const zone = clamp(Math.floor((wp.x - extent.min.x) / Math.max(size.x,1) * 5),0,4);
    meshes.push(mesh);
    parts.set(mesh,zone);
  });
  const state = {mode:'assembled', selected:1, tour:false, scenario:'normal', progress:0};
  let amount = 0, lastTime = null, disposed = false;
  const cachedClipping = new THREE.Plane(new THREE.Vector3(1,0,0),-extent.getCenter(new THREE.Vector3()).x);
  const modes = new Set(['assembled','exploded','section','xray','isolate']);
  const scenarios = name === 'vm' ? [
    {id:'normal',label:'Cycle normal',note:'20 dépôts fictifs, dont un doublon, sur une journée simulée.'},
    {id:'duplicate',label:'Doublon',note:'Le même OT est soumis deux fois. Le second passage est rejeté par l’historique.'},
    {id:'incident',label:'Panne VM',note:'La VM principale s’arrête. La bascule automatique reste une architecture cible, non validée.'}
  ] : [];
  function materialVariant(original,variant) {
    if (Array.isArray(original)) return original.map(m=>materialVariant(m,variant));
    if (!original?.isMaterial) return original;
    let cache=variants.get(original);
    if(!cache){ cache=new Map(); variants.set(original,cache); }
    if(cache.has(variant)) return cache.get(variant);
    const mat=original.clone();
    if(variant==='section') {
      mat.clippingPlanes=[cachedClipping];
      mat.clipShadows=true;
      mat.side=THREE.DoubleSide;
    } else if(variant==='ghost' || variant==='xray') {
      mat.transparent=true;
      mat.opacity=variant==='ghost' ? .095 : .24;
      mat.depthWrite=false;
      mat.side=THREE.DoubleSide;
      mat.emissiveIntensity=0;
    }
    cache.set(variant,mat);
    return mat;
  }
  function restore() {
    for(const mesh of meshes) {
      const off=offsets.get(mesh);
      if(off){mesh.position.sub(off);offsets.delete(mesh);}
      const original=originals.get(mesh);
      if(original!==undefined){mesh.material=original; originals.delete(mesh);}
    }
  }
  function setMode(mode){
    if(!modes.has(mode))return;
    state.mode=mode;
    if(mode==='isolate' && state.selected===null) state.selected=1;
  }
  function select(i){state.selected=clamp(Math.trunc(i),0,4);state.tour=false;}
  function scenario(id){
    if(!scenarios.some(s=>s.id===id)) return null;
    state.scenario=id; state.tour=false;
    machine.setScenario?.(id);
    return machine.scenarioStart?.(id) ?? null;
  }
  function beforeFrame(){if(!disposed)restore();}
  function afterFrame(t){
    if(disposed)return;
    if(state.tour){
      const beat=Math.floor(t/8);
      state.selected=beat%5;
      state.mode=['assembled','section','exploded','xray','isolate'][beat%5];
    }
    const target=state.mode==='exploded'?1:0;
    const dt=lastTime === null ? 0.016 : clamp(Math.abs(t-lastTime),0,.055);
    lastTime=t;
    amount=smooth(amount,target,clamp(dt*4.8,0,1));
    if(Math.abs(amount-target)<.003)amount=target;
    // Le déplacement est appliqué après la cinématique d'origine, puis retiré
    // avant l'image suivante. Aucune position du modèle source n'est altérée.
    for(const mesh of meshes) {
      const zone=parts.get(mesh)??2;
      if(amount>0.002){
        const lateral=(zone-2)*Math.max(size.x / Math.max(holder.scale.x,0.001),1)*.075*amount;
        const vertical=(zone%2?.032:.014)*Math.max(size.x / Math.max(holder.scale.x,0.001),1)*amount;
        const depth=(zone%2?1:-1)*Math.max(size.z / Math.max(holder.scale.z,0.001),1)*.11*amount;
        const off=new THREE.Vector3(lateral,vertical,depth);
        mesh.position.add(off); offsets.set(mesh,off);
      }
      const ghost=state.mode==='isolate'&&zone!==state.selected;
      const xray=state.mode==='xray'&&zone!==state.selected;
      const section=state.mode==='section';
      if(ghost||xray||section){
        originals.set(mesh,mesh.material);
        mesh.material=materialVariant(mesh.material,section?'section':ghost?'ghost':'xray');
        if(section && !mesh.material.clippingPlanes){
          // Matériaux partagés remplacés dynamiquement par certaines machines.
          mesh.material=materialVariant(originals.get(mesh),'section');
        }
      }
    }
    state.progress=(t%40)/40;
  }
  function inspect(x,y){
    const pointer=new THREE.Vector2(x/window.innerWidth*2-1,-(y/window.innerHeight)*2+1);
    const ray=new THREE.Raycaster(); ray.setFromCamera(pointer,camera);
    const hits=ray.intersectObject(holder,true).filter(h=>h.object.isMesh&&!h.object.userData.glowShell);
    if(!hits.length)return null;
    const zone=parts.get(hits[0].object);
    if(zone===undefined)return null;
    select(zone);
    return {index:zone,label:spec.areas[zone][0],description:spec.areas[zone][1]};
  }
  function snapshot(time){
    const i=clamp(state.selected??0,0,4);
    const ctl=machine.controls;
    const reading=machine.readout?.(time) ?? (ctl?.get && ctl?.fmt ? ctl.label+' : '+ctl.fmt(ctl.get(time)) : null);
    return {...state,title:spec.title,area:spec.areas[i],scenarios,reading};
  }
  function dispose(){
    if(disposed)return;
    restore(); disposed=true;
    for(const mesh of meshes) {
      const map=variants.get(mesh.material);
      if(map)for(const v of map.values())v.dispose?.();
    }
  }
  return {name,spec,state,setMode,select,scenario,beforeFrame,afterFrame,inspect,snapshot,dispose};
}
