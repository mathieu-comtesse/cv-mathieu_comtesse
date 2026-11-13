using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 [DefaultExecutionOrder(240)]public sealed class TemperateVillageV19:MonoBehaviour
 {
  public const int CurrentEnvironmentSchema=20;
  public sealed class Furniture
  {public string id,installation,kind;public Transform item,approach;public string pose;}
  public readonly Dictionary<string,Furniture> Points=new Dictionary<string,Furniture>();
  public readonly Dictionary<string,Transform> Interiors=new Dictionary<string,Transform>();
  public string InsideId{get;private set;}="";public int CompletedVisits{get;private set;}public int FurnitureUses{get;private set;}public bool ActionSucceeded{get;private set;}
  public bool SuspendAutomatic;public bool Visiting=>visitor!=null;public string VisitStage{get;private set;}="";string visitorActor="";bool visitorPhysical;public bool ControlsBody(string actor)=>visitorPhysical&&visitorActor==actor;CampaignRuntime c;CampaignSave observed;float check,nextVisit=24;string activeInterior="";Vector3 cameraVelocity;readonly Dictionary<Renderer,bool> hidden=new Dictionary<Renderer,bool>();Coroutine visitor;readonly List<Mesh> lodMeshes=new List<Mesh>();
  public void PrepareData(CampaignRuntime campaign)
  {
   c=campaign;var values=c.Data.resources.ToList();foreach(var id in new[]{"clay","straw"})if(!values.Any(v=>v.id==id))values.Add(new ValueDefinition{id=id,value=id=="clay"?12:16,max=100});c.Data.resources=values.ToArray();
  }
  void Start(){c=GetComponent<CampaignRuntime>();}
  static readonly HashSet<string> cleared=new HashSet<string>();
  public static void ClearPatch(Terrain terrain,Vector3 center,Vector2 size)
  {
   var data=terrain.terrainData;string key=data.GetInstanceID()+":"+center.x.ToString("F2")+":"+center.z.ToString("F2");if(!cleared.Add(key))return;var origin=terrain.transform.position;var dimensions=data.size;int d=data.detailResolution;
   int x=Mathf.Clamp(Mathf.FloorToInt((center.x-origin.x-size.x*.5f)/dimensions.x*d),0,d-1),z=Mathf.Clamp(Mathf.FloorToInt((center.z-origin.z-size.y*.5f)/dimensions.z*d),0,d-1),w=Mathf.Min(d-x,Mathf.CeilToInt(size.x/dimensions.x*d)+2),h=Mathf.Min(d-z,Mathf.CeilToInt(size.y/dimensions.z*d)+2);
   for(int layer=0;layer<data.detailPrototypes.Length;layer++)data.SetDetailLayer(x,z,layer,new int[h,w]);
   if(data.terrainLayers.Length==6){int a=data.alphamapResolution;int ax=Mathf.Clamp(Mathf.FloorToInt((center.x-origin.x-size.x*.5f)/dimensions.x*a),0,a-1),az=Mathf.Clamp(Mathf.FloorToInt((center.z-origin.z-size.y*.5f)/dimensions.z*a),0,a-1),aw=Mathf.Min(a-ax,Mathf.CeilToInt(size.x/dimensions.x*a)+1),ah=Mathf.Min(a-az,Mathf.CeilToInt(size.y/dimensions.z*a)+1);var map=data.GetAlphamaps(ax,az,aw,ah);for(int zz=0;zz<ah;zz++)for(int xx=0;xx<aw;xx++){for(int layer=0;layer<6;layer++)map[zz,xx,layer]=0;map[zz,xx,2]=1;}data.SetAlphamaps(ax,az,map);}
  }
  public static void Migrate(CampaignSave state)
  {
   if(state.environmentSchema>=CurrentEnvironmentSchema)return;
   if(state.playerPositionSaved){var p=state.playerPosition;p.y=VillageLife.Ground(p)+.035f;state.playerPosition=p;}
   foreach(var actor in state.characters)if(actor.positionSaved){var p=actor.position;p.y=VillageLife.Ground(p)+.04f;actor.position=p;}
   if(state.villageV18?.installations!=null)foreach(var s in state.villageV18.installations)if(s.positionSaved){var p=s.position;p.y=VillageLife.Ground(p);float variation=0;foreach(var d in new[]{Vector3.left,Vector3.right,Vector3.forward,Vector3.back})variation=Mathf.Max(variation,Mathf.Abs(VillageLife.Ground(p+d*1.5f)-p.y));s.position=p;if(variation>.28f)s.positionSaved=false;}
   state.environmentSchema=CurrentEnvironmentSchema;
  }
  GameObject Model(string id)=>Resources.Load<GameObject>("TemperateV19/Prefabs/TH19E_"+id);
  GameObject Place(string id,Transform parent,Vector3 local,float yaw=0,float scale=1,bool collision=false)
  {
   var source=id.StartsWith("TH18_")?Resources.Load<GameObject>("VillageV18/Prefabs/"+id):Model(id);if(source==null)return null;var go=Instantiate(source,parent);go.name=id;go.transform.localPosition=local;go.transform.localRotation=Quaternion.Euler(0,yaw,0);go.transform.localScale*=scale;
   var p=go.transform.position;p.y=VillageLife.Ground(p)+local.y;go.transform.position=p;
   if(collision){bool first=true;var bounds=new Bounds();foreach(var f in go.GetComponentsInChildren<MeshFilter>()){var b=f.sharedMesh.bounds;for(int i=0;i<8;i++){var corner=b.center+Vector3.Scale(b.extents,new Vector3((i&1)==0?-1:1,(i&2)==0?-1:1,(i&4)==0?-1:1));var q=go.transform.InverseTransformPoint(f.transform.TransformPoint(corner));if(first){bounds=new Bounds(q,Vector3.zero);first=false;}else bounds.Encapsulate(q);}}var box=go.AddComponent<BoxCollider>();box.center=bounds.center;box.size=bounds.size;}
   return go;
  }
  void Register(string installation,string kind,Transform item,Vector3 approach,string pose)
  {
   string id="env19:"+installation+":"+kind;var marker=new GameObject(id).transform;marker.SetParent(item.parent,false);marker.localPosition=approach;var p=marker.position;p.y=VillageLife.Ground(p)+.025f;marker.position=p;
   Points[id]=new Furniture{id=id,installation=installation,kind=kind,item=item,approach=marker,pose=pose};
   var b=Array.Find(c.bindings.objects,x=>x.id==id);if(b!=null)b.target=marker;else c.bindings.objects=c.bindings.objects.Concat(new[]{new ObjectBinding{id=id,target=marker}}).ToArray();c.bindings.InvalidateLookups();
   if(!c.Data.actions.Any(a=>a.id==id))c.Data.actions=c.Data.actions.Concat(new[]{new ActionDefinition{id=id,targetBindingId=id,title=kind=="gate"?"Ouvrir ou fermer la barrière":kind=="bench"?"S’asseoir et se reposer":kind=="bed"?"Se reposer sur la litière":kind=="shelf"?"Examiner les réserves":kind=="clay"?"Prélever de l’argile":kind=="straw"?"Préparer la paille":"Examiner le poste",actId="*",repeatable=true,durationSeconds=kind=="bench"||kind=="bed"?5:3,interactionType="FurnitureV19",effects=kind=="clay"||kind=="straw"?new[]{new EffectDefinition{kind="resource",target=kind,operation="add",value=4}}:kind=="bench"||kind=="bed"?new[]{new EffectDefinition{kind="stat",target="energy",operation="add",value=4},new EffectDefinition{kind="stat",target="fatigue",operation="add",value=-4}}:Array.Empty<EffectDefinition>()}}).ToArray();
  }
  public void BuildMonument(Transform root,int tier)
  {
   // Native menhir remains at its existing binding; additions stay outside the central duel arena.
   if(tier==0)return;
   for(int i=0;i<4+tier*2;i++){float angle=i*Mathf.PI*2/(4+tier*2);Place("TH18_Totem_Base",root,new Vector3(Mathf.Cos(angle)*1.35f,0,Mathf.Sin(angle)*1.35f),i*37,.38f);}
   Place("MapStand",root,new Vector3(2.4f,0,.2f),90,.65f);
   if(tier>=2){Place("MapStand",root,new Vector3(2.4f,0,1.8f),90,.65f);Place("TH18_Seat_Tier2",root,new Vector3(-2.6f,0,0),90,.8f);}
   if(tier>=3){Place("MapStand",root,new Vector3(2.4f,0,-1.5f),90,.65f);Place("TH18_Seat_Tier3",root,new Vector3(0,0,-2.7f),0,.8f);}
  }
  public void Decorate(InstallationStateV18 s,Transform root,int tier)
  {
   if(c?.Data==null||Model("Bed")==null)return;
   foreach(var terrain in Terrain.activeTerrains)if(root.position.x>=terrain.transform.position.x&&root.position.z>=terrain.transform.position.z&&root.position.x<terrain.transform.position.x+terrain.terrainData.size.x&&root.position.z<terrain.transform.position.z+terrain.terrainData.size.z)ClearPatch(terrain,root.position,s.type=="habitation"?new Vector2(4,4):new Vector2(3,3));
   foreach(var key in Points.Where(p=>p.Value.installation==s.id).Select(p=>p.Key).ToArray())Points.Remove(key);
   var inside=new GameObject("Intérieur V19 · "+s.id).transform;inside.SetParent(root,false);Interiors[s.id]=inside;
   if(s.type=="habitation")
   {
    if (tier >= 2) Place("TimberFrame", inside, Vector3.zero, 90f);
    var bed=Place("Bed",inside,new Vector3(.92f,0,-.05f),0,tier==0?.7f:.85f,true);Register(s.id,"bed",bed.transform,new Vector3(.42f,0,-.2f),"Sit");
    var bench=Place("TH18_Seat_Tier"+Mathf.Min(tier,2),inside,new Vector3(-.15f,0,1.02f),0,.8f,true);Register(s.id,"bench",bench.transform,new Vector3(-.15f,0,.43f),"Sit");
    if(tier>=1){var shelf=Place("Shelf",inside,new Vector3(-1.18f,0,.3f),90,.72f,true);Register(s.id,"shelf",shelf.transform,new Vector3(-.55f,0,.1f),"Gather");}
    for(int i=0;i<1+tier;i++)Place("TH18_Pottery_0"+(i%6),inside,new Vector3(-1.05f,0,-.5f+i*.26f),i*31,.5f);
    if(tier>=2){Place("MapStand",inside,new Vector3(-.68f,0,.98f),180,.45f);Place("DryingRack",root,new Vector3(-2.1f,0,.6f),90,.7f);}
    // Separate, small stone pads leave the central walking surface continuous with terrain.
    if(tier>=3)for(int i=0;i<3;i++)Place("TH18_Workbench_Tier0",root,new Vector3(-1.45f+i*1.45f,0,1.5f),0,.24f);
   }
   else if(s.type=="monument"){if(tier>=1){var board=Place("MapStand",inside,new Vector3(-2.6f,0,1.8f),270,.6f);Register(s.id,"policy",board.transform,new Vector3(-2,0,1.8f),"Gather");}}
   else
   {
    Place("Shelf",inside,new Vector3(-1.45f,0,.8f),0,.7f,true);var seat=Place("TH18_Seat_Tier"+Mathf.Min(tier,2),inside,new Vector3(1.4f,0,.85f),90,.75f,true);Register(s.id,"bench",seat.transform,new Vector3(.85f,0,.85f),"Sit");
    if(tier>=1)Place(s.type=="meeting"?"MapStand":"DryingRack",inside,new Vector3(-1.45f,0,-.85f),90,.65f);
    if(tier>=2)for(int i=0;i<tier;i++)Place("TH18_Pottery_0"+(i+2),inside,new Vector3(1.3f,0,-.6f+i*.3f),0,.65f);
    if(s.type=="storage"&&tier>=2)BuildGate(s,root,inside);
   }
  }
  void BuildGate(InstallationStateV18 state,Transform root,Transform parent)
  {
   for(int attempt=0;attempt<24;attempt++){
    float ring=3.4f+(attempt/8)*.7f;var direction=Quaternion.Euler(0,(attempt%8)*45,0)*Vector3.back;var center=root.position+direction*ring;center.y=VillageLife.Ground(center);var rotation=Quaternion.LookRotation(-direction);bool free=VillageNavigation.HearthSafe(center,1.2f);
    foreach(var col in Physics.OverlapBox(center+Vector3.up*.65f,new Vector3(2.4f,.6f,.28f),rotation,~0,QueryTriggerInteraction.Ignore))if(!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&!col.transform.IsChildOf(root))free=false;
    var roads=VillageNavigation.Filter();roads.areaMask=1<<VillageNavigation.Road;if(NavMesh.SamplePosition(center,out _,.7f,roads))free=false;if(!free)continue;
    var rig=new GameObject("Barrière articulée de la réserve").transform;rig.SetParent(parent,true);rig.position=center;rig.rotation=rotation;var hinge=new GameObject("Axe du battant").transform;hinge.SetParent(rig,false);hinge.localPosition=Vector3.left*.7f;var leaf=Place("GateLeaf",rig,Vector3.zero,0,1,true);leaf.transform.SetParent(hinge,true);var gate=leaf.AddComponent<WoodGateV19>();gate.hinge=hinge;gate.leaf=leaf.transform;gate.panel=leaf.GetComponent<BoxCollider>();gate.Initialize(c,state);Place("FenceStone",rig,Vector3.left*1.82f,0,1,true);Place("FenceStone",rig,Vector3.right*1.82f,0,1,true);Register(state.id,"gate",leaf.transform,hinge.InverseTransformPoint(center+rotation*Vector3.back*.95f),"Gather");Points["env19:"+state.id+":gate"].approach.SetParent(rig,true);foreach(var terrain in Terrain.activeTerrains)if(center.z>=terrain.transform.position.z&&center.z<terrain.transform.position.z+terrain.terrainData.size.z)ClearPatch(terrain,center,new Vector2(4.8f,1.2f));return;
   }
  }
  public bool CanUse(string id,out string reason)
  {
   reason="";if(!Points.TryGetValue(id,out var point)||point.item==null){reason="Cet équipement n’est pas installé.";return false;}
   var s=c.GetComponent<VillageUpgradeV18>().StateFor(point.installation);
   if(s!=null&&!s.usable){reason="Termine les contrôles avant d’utiliser l’installation.";return false;}
   if(s?.type=="habitation"&&point.kind!="gate")
   {var root=c.GetComponent<VillageUpgradeV18>().Instances[s.id].transform;var p=root.InverseTransformPoint(c.bindings.player.position);if(Mathf.Abs(p.x)>1.42f||Mathf.Abs(p.z)>1.42f){reason="Entre dans l’habitation pour utiliser ce meuble.";return false;}}
   return true;
  }
  public IEnumerator Use(ActionDefinition action)
  {
   ActionSucceeded=false;if(!CanUse(action.id,out var reason)){c.Inform(reason);yield break;}var point=Points[action.id];var player=c.bindings.player;var body=player.GetComponent<CharacterController>();var animator=c.bindings.AnimatorFor("dylan");float deadline=Time.time+6;
   while(Vector3.Distance(new Vector3(player.position.x,point.approach.position.y,player.position.z),point.approach.position)>.18f&&Time.time<deadline)
   {var d=point.approach.position-player.position;d.y=0;if(c.UserPaused){yield return null;continue;}body.Move((d.normalized*.8f+Vector3.down*2)*Time.deltaTime);player.GetComponent<ThirdPersonMotor>().visual.rotation=Quaternion.LookRotation(d);VillageLife.Play(animator,"Locomotion");animator.SetFloat("Speed",.35f);yield return null;}
   if(DistanceXZ(player.position,point.approach.position)>.35f){c.Inform("Le meuble est obstrué. Libère le passage.");yield break;}
   if(point.kind=="gate"){VillageLife.Play(animator,"Gather");var gate=point.item.GetComponent<WoodGateV19>();yield return gate.Toggle();ActionSucceeded=gate.Succeeded;if(ActionSucceeded)FurnitureUses++;VillageLife.Play(animator,"Listen");yield break;}
   var look=point.item.position-player.position;look.y=0;if(look.sqrMagnitude>.01f)player.GetComponent<ThirdPersonMotor>().visual.rotation=Quaternion.LookRotation(look);animator.SetFloat("Speed",0);VillageLife.Play(animator,point.pose);
   float elapsed=0;while(elapsed<action.durationSeconds){if(!c.UserPaused)elapsed+=Time.deltaTime;yield return null;}
   VillageLife.Play(animator,"Listen");ActionSucceeded=true;FurnitureUses++;
  }
  static float DistanceXZ(Vector3 a,Vector3 b){a.y=b.y=0;return Vector3.Distance(a,b);}
  void Update()
  {
   if(c?.State==null)return;
   if(observed!=c.State)
   {
    if(visitor!=null){StopCoroutine(visitor);visitor=null;}observed=c.State;Migrate(observed);foreach(string id in new[]{"clay","straw"}){if(!c.State.resources.Any(x=>x.id==id))c.State.resources.Add(new NamedValue(id,0));var item=GameObject.Find("env19:resource:"+id);if(item!=null&&!Points.ContainsKey("env19:resource:"+id))Register("resource",id,item.transform,item.transform.localPosition,"Gather");}nextVisit=Time.time+24;
   }
   if(Time.time<check)return;check=Time.time+.5f;
   foreach(var pair in Interiors)if(pair.Value!=null){bool near=DistanceXZ(c.bindings.player.position,pair.Value.position)<22||c.bindings.characters.Any(a=>DistanceXZ(c.bindings.Find(a.id).position,pair.Value.position)<4);if(pair.Value.gameObject.activeSelf!=near)pair.Value.gameObject.SetActive(near);}
   if(!SuspendAutomatic&&!Visiting&&!c.IsModal&&!c.IsBusy&&Time.time>nextVisit)
   {
    var village=c.GetComponent<VillageUpgradeV18>();var s=c.State.villageV18.installations.FirstOrDefault(x=>x.type=="habitation"&&x.tier>=2&&x.usable&&village.Instances.ContainsKey(x.id));nextVisit=Time.time+36;if(s!=null)visitor=StartCoroutine(Visit(s));
   }
  }
  public void VisitNow(string installation){if(visitor==null){var s=c.GetComponent<VillageUpgradeV18>().StateFor(installation);if(s!=null&&s.usable)visitor=StartCoroutine(Visit(s));}}
  IEnumerator Visit(InstallationStateV18 s)
  {
   VisitStage="approach";visitorActor=s.owner;
   var root=c.GetComponent<VillageUpgradeV18>().Instances[s.id].transform;var person=c.bindings.Find(s.owner);var brain=person.GetComponent<VillagerBrain>();var agent=person.GetComponent<NavMeshAgent>();var body=person.GetComponent<CharacterController>();var animator=c.bindings.AnimatorFor(s.owner);bool brainWas=brain.enabled,agentWas=agent.enabled;float height=body.height;var center=body.center;
   try
   {
    var local=root.InverseTransformPoint(person.position);bool inside=Mathf.Abs(local.x)<1.45f&&Mathf.Abs(local.z)<1.45f;NavMeshPath path=null;Vector3[] waypoints=null;
    if(!inside){if(VillageNavigation.Plan(person.position,root.position+Vector3.back*2.9f,person,out path,.7f,agent.agentTypeID,startSearch:2.5f))waypoints=path.corners;else{VisitStage="physical route planning";yield return PhysicalRouteV19.Plan(person.position,root.position+Vector3.back*2.9f,person,p=>waypoints=p);}if(waypoints==null){VisitStage="no connected physical approach route";yield break;}}
    brain.enabled=false;agent.enabled=false;visitorPhysical=true;body.enabled=true;float deadline=Time.time+45;int corner=1;
    while(!inside&&corner<waypoints.Length&&Time.time<deadline)
    {if(c.cinematicDirector.IsPlaying||c.MenhirActive||c.IncidentModal||c.UserPaused||c.ConversationActorId==s.owner){yield return null;continue;}var d=waypoints[corner]-person.position;d.y=0;if(d.magnitude<.18f){corner++;continue;}body.Move((d.normalized*1.2f+Vector3.down*2)*Time.deltaTime);person.rotation=Quaternion.RotateTowards(person.rotation,Quaternion.LookRotation(d),180*Time.deltaTime);VillageLife.Play(animator,"Locomotion");animator.SetFloat("Speed",.4f);yield return null;}
    if(!inside&&DistanceXZ(person.position,root.position+Vector3.back*2.9f)>.85f){VisitStage="approach blocked";yield break;}body.height=1.3f;body.center=new Vector3(center.x,.65f,center.z);VisitStage="entering";
    var seat=Points["env19:"+s.id+":bench"].approach.position;
    foreach(var target in new[]{seat,root.position+Vector3.back*2.9f})
    {
     float until=Time.time+9;while(DistanceXZ(person.position,target)>.18f&&Time.time<until)
     {if(c.cinematicDirector.IsPlaying||c.MenhirActive||c.IncidentModal||c.UserPaused||c.ConversationActorId==s.owner){yield return null;continue;}var d=target-person.position;d.y=0;body.Move((d.normalized*.8f+Vector3.down*2)*Time.deltaTime);person.rotation=Quaternion.LookRotation(d);VillageLife.Play(animator,"CrouchLocomotion");animator.SetFloat("Speed",.35f);yield return null;}
     if(DistanceXZ(person.position,target)>.4f){VisitStage="door traversal blocked";yield break;}
     if(target==seat){VisitStage="seated";body.height=height;body.center=center;person.rotation=Quaternion.LookRotation(root.forward);VillageLife.Play(animator,"Sit");animator.SetFloat("Speed",0);yield return new WaitForSeconds(3);body.height=1.3f;body.center=new Vector3(center.x,.65f,center.z);VisitStage="exiting";}
    }
    CompletedVisits++;VisitStage="completed";
   }
   finally{visitorPhysical=false;visitorActor="";body.height=height;body.center=center;brain.enabled=brainWas;if((agentWas||brainWas)&&NavMesh.SamplePosition(person.position,out var hit,.85f,VillageNavigation.Filter(agent.agentTypeID))&&VillageNavigation.SegmentClear(person.position,hit.position,person)){agent.enabled=true;agent.Warp(hit.position+Vector3.up*.035f);}VillageLife.Play(animator,"Listen");visitor=null;}
  }
  void RestoreCutaway(){foreach(var p in hidden)if(p.Key!=null)p.Key.forceRenderingOff=p.Value;hidden.Clear();activeInterior="";}
  void LateUpdate()
  {
   if(c?.State==null)return;if(c.cinematicDirector.IsPlaying||c.MenhirActive||(c.GetComponent<ConstructionFilmV19>()?.Playing??false)){RestoreCutaway();InsideId="";return;}var village=c.GetComponent<VillageUpgradeV18>();string selected="";
   foreach(var s in c.State.villageV18.installations)if(s.type=="habitation"&&s.usable&&village.Instances.TryGetValue(s.id,out var root)){var p=root.transform.InverseTransformPoint(c.bindings.player.position);if(Mathf.Abs(p.x)<1.45f&&Mathf.Abs(p.z)<1.47f){selected=s.id;break;}}
   InsideId=selected;if(selected!=activeInterior){RestoreCutaway();activeInterior=selected;if(selected!=""){var root=village.Instances[selected].transform;foreach(var r in root.GetComponentsInChildren<Renderer>(true)){string path="";for(var p=r.transform;p!=root&&p!=null;p=p.parent)path+=p.name+"/";if(path.Contains("Roof")||path.Contains("Wall_Opening")){hidden[r]=r.forceRenderingOff;r.forceRenderingOff=true;}}}}
   if(selected!="")
   {
    var cam=c.bindings.gameplayCamera;var root=village.Instances[selected].transform;var target=c.bindings.player.position+Vector3.up*.9f;var desired=root.position+new Vector3(1.8f,3.9f,-4.4f);var ray=desired-target;float distance=ray.magnitude;
    foreach(var hit in Physics.SphereCastAll(target,.16f,ray.normalized,distance,~0,QueryTriggerInteraction.Ignore))if(!hit.transform.IsChildOf(root)&&!hit.transform.IsChildOf(c.bindings.player)&&!(hit.collider is TerrainCollider))distance=Mathf.Min(distance,Mathf.Max(.7f,hit.distance-.15f));desired=target+ray.normalized*distance;desired.y=Mathf.Max(desired.y,VillageLife.Ground(desired)+.3f);cam.transform.position=Vector3.SmoothDamp(cam.transform.position,desired,ref cameraVelocity,.16f);cam.transform.LookAt(target);
   }
  }
  void OnDisable(){if(visitor!=null)StopCoroutine(visitor);visitor=null;RestoreCutaway();}
 }
}
