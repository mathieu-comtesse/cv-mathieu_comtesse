using System;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 public enum InstallationPhaseV18 { Existing,Planned,Building,AwaitingControl,Verified }
 [Serializable] public sealed class InstallationStateV18
 {
  public string id,site,type,owner,builder="georges";public int tier,pendingTier;public InstallationPhaseV18 phase;
  public float workSeconds;public int filmTier;public bool usable=true,positionSaved,gateClosed;public Vector3 position;public List<string> controls=new List<string>();
 }
 [Serializable] public sealed class VillageSaveV18
 {
  public List<InstallationStateV18> installations=new List<InstallationStateV18>();
  public List<int> chapters=new List<int>();public List<string> presentationReceipts=new List<string>();
 }
 public sealed class VillageUpgradeV18:MonoBehaviour
 {
  public CampaignRuntime Campaign{get;private set;}public bool Presenting=>presenting;
  public bool PendingPresentation=>presenting||queue.Count>0;
  public int DecorationCount{get;private set;}public int DecorationDrawCalls{get;private set;}
  public string PresentationTitle{get;private set;}="";public float PresentationTime{get;private set;}
  public readonly Dictionary<string,GameObject> Instances=new Dictionary<string,GameObject>();
  public Transform Totem{get;private set;}public int TotemSegments=>segments.Count;
  readonly List<GameObject> segments=new List<GameObject>();readonly Queue<int> queue=new Queue<int>();
  readonly Dictionary<string,GameObject> templates=new Dictionary<string,GameObject>();
  readonly List<Mesh> combined=new List<Mesh>();CampaignSave observed;float check;bool presenting,replaying;int chapter;
  Vector3 cameraPosition;Quaternion cameraRotation;bool cameraWasEnabled;Behaviour follow;Transform orbit;
  readonly Dictionary<string,Vector3> workPoints=new Dictionary<string,Vector3>();
  readonly Dictionary<string,float> workRetry=new Dictionary<string,float>();
  public static readonly string[] Symbols={"context","leadership","risks","support","operations","audit","cycle"};
  static readonly string[] Titles={"CONTEXTE ET PÉRIMÈTRE","LEADERSHIP ET PARTICIPATION","DANGERS ET OBJECTIFS","COMPÉTENCES ET MOYENS","ACTIVITÉS ET URGENCES","MESURE ET AUDIT","AMÉLIORATION CONTINUE"};
  public static VillageUpgradeV18 For(CampaignRuntime c){var v=c.GetComponent<VillageUpgradeV18>()??c.gameObject.AddComponent<VillageUpgradeV18>();v.Campaign=c;return v;}
  public void EnsureState()
  {
   var save=Campaign.State.villageV18??=new VillageSaveV18();save.installations??=new List<InstallationStateV18>();save.chapters??=new List<int>();save.presentationReceipts??=new List<string>();
   void Add(string id,string site,string type,string owner){if(!save.installations.Exists(s=>s.id==id))save.installations.Add(new InstallationStateV18{id=id,site=site,type=type,owner=owner,builder=owner=="tarek"?"tarek":"georges"});}
   Add("hut_mathilde","repos","habitation","mathilde");Add("hut_milena","berge_observation","habitation","milena");Add("stone_georges","atelier_silex","workstation","georges");Add("reserve_neila","stockage","storage","neila");Add("circle_alban","alban","meeting","alban");Add("wood_tarek","bois_construction","workstation","tarek");if(Campaign.GetComponent<TemperateVillageV19>()!=null)Add("menhir_aurelien","grand_menhir","monument","aurelien");
  }
  GameObject Template(string id)
  {if(!templates.TryGetValue(id,out var t)){t=Resources.Load<GameObject>((id.StartsWith("TH19_")?"NativeArchitectureV19":"VillageV18")+"/Prefabs/"+id);templates[id]=t;}return t;}
  GameObject Spawn(string id,Transform parent,Vector3 local,Quaternion rotation,bool collide=false)
  {
   var t=Template(id);if(t==null){Debug.LogError("Missing V18 original prefab: "+id);return null;}
   var go=Instantiate(t,parent);go.name=id;go.transform.localPosition=local;go.transform.localRotation=rotation;
   if(collide)foreach(var f in go.GetComponentsInChildren<MeshFilter>())if(f.sharedMesh!=null)f.gameObject.AddComponent<MeshCollider>().sharedMesh=f.sharedMesh;
   return go;
  }
  public InstallationStateV18 StateFor(string id){EnsureState();return Campaign.State.villageV18.installations.Find(s=>s.id==id);}
  public string BlockReason(string id)
  {
   var s=StateFor(id);if(s==null)return "Installation inconnue.";if(s.tier>=3)return "Dernier niveau atteint.";
   if(s.phase==InstallationPhaseV18.Building||s.phase==InstallationPhaseV18.AwaitingControl)return "Termine les travaux et leurs contrôles.";
   if(Campaign.State.villageV18.installations.Exists(x=>x.id!=s.id&&x.builder==s.builder&&x.phase==InstallationPhaseV18.Building))return "Ce bâtisseur termine déjà un autre chantier.";
   if(!Campaign.Near("v18:"+s.id))return "Rejoins cette installation.";
   if(s.type=="habitation"&&GetComponent<TemperateVillageV19>()!=null&&Instances.TryGetValue(s.id,out var home)){foreach(var actor in Campaign.bindings.characters){var person=Campaign.bindings.Find(actor.id);if(person==null)continue;var local=home.transform.InverseTransformPoint(person.position);if(Mathf.Abs(local.x)<1.5f&&Mathf.Abs(local.z)<1.5f)return "Libère l’intérieur avant de fermer le chantier.";}var p=home.transform.InverseTransformPoint(Campaign.bindings.player.position);if(Mathf.Abs(p.x)<1.5f&&Mathf.Abs(p.z)<1.5f)return "Sors de l’habitation avant les travaux.";}
   if(Campaign.IsBusy||Campaign.IncidentModal||Campaign.MenhirActive||Campaign.cinematicDirector.IsPlaying||(Campaign.GetComponent<CampaignActivitiesV17>()?.Active??false))return "Termine l’interaction en cours.";
   if(s.tier>=1&&!Campaign.State.villageV18.chapters.Contains(7))return "Les moyens et compétences du chapitre 7 restent à valider.";
   if(s.tier>=2&&!Campaign.State.villageV18.chapters.Contains(8))return "Les contrôles opérationnels et les urgences restent à valider.";
   if(Campaign.State.characters.Find(c=>c.id==s.builder) is not CharacterState worker||!worker.alive||!worker.available||worker.competence<50)return "Un bâtisseur disponible et compétent est nécessaire.";
   int wood=4+2*s.tier,fiber=2+s.tier,stone=1+s.tier;
   if(GetComponent<TemperateVillageV19>()!=null&&s.type=="habitation"&&s.tier>=1&&(Campaign.Value("resource","clay")<2+2*s.tier||Campaign.Value("resource","straw")<2+2*s.tier))return $"Prépare l’argile et la paille : {2+2*s.tier} de chaque.";
   if(Campaign.Value("resource","wood")<wood||Campaign.Value("resource","fiber")<fiber||Campaign.Value("resource","stone")<stone)return $"Nécessaire : bois {wood}, fibres {fiber}, pierre {stone}.";
   return "";
  }
  public bool BeginUpgrade(string id)
  {
   string reason=BlockReason(id);if(reason!=""){Campaign.Inform(reason);return false;}var s=StateFor(id);
   Campaign.Apply(new EffectDefinition{kind="resource",target="wood",operation="add",value=-(4+2*s.tier)});
   Campaign.Apply(new EffectDefinition{kind="resource",target="fiber",operation="add",value=-(2+s.tier)});
   Campaign.Apply(new EffectDefinition{kind="resource",target="stone",operation="add",value=-(1+s.tier)});
   if(GetComponent<TemperateVillageV19>()!=null&&s.type=="habitation"&&s.tier>=1){Campaign.Apply(new EffectDefinition{kind="resource",target="clay",operation="add",value=-(2+2*s.tier)});Campaign.Apply(new EffectDefinition{kind="resource",target="straw",operation="add",value=-(2+2*s.tier)});}
   s.pendingTier=s.tier+1;s.phase=InstallationPhaseV18.Building;s.workSeconds=0;s.usable=false;s.controls.Clear();Campaign.Save();Rebuild(s);return true;
  }
  public bool WorkDestination(string actor,out Vector3 point)
  {
   point=Vector3.zero;if(Campaign?.State?.villageV18==null)return false;
   var s=Campaign.State.villageV18.installations.Find(x=>x.phase==InstallationPhaseV18.Building&&x.builder==actor);if(s==null)return false;
   if(!workPoints.TryGetValue(s.id,out point))
   {
    if(GetComponent<WorkNavigationV18>()!=null)return false;
    if(workRetry.TryGetValue(s.id,out float retry)&&Time.unscaledTime<retry)return false;workRetry[s.id]=Time.unscaledTime+2;
    if(!Instances.TryGetValue(s.id,out var instance)||instance==null)return false;var worker=Campaign.bindings.Find(actor);if(worker==null)return false;
    float radius=s.type=="habitation"?3.4f:2.35f;
    for(int i=0;i<16;i++)
    {var p=instance.transform.position+Quaternion.Euler(0,i*22.5f,0)*Vector3.left*radius;p.y=VillageLife.Ground(p);
     if(VillageNavigation.Plan(worker.position,p,worker,out var path,.65f,startSearch:2.5f)){point=path.corners[path.corners.Length-1];workPoints[s.id]=point;return true;}}
    return false;
   }return true;
  }
  public void AssignPhysicalWorkPoint(string id,Vector3 point){workPoints[id]=point;}
  public bool WorkerOnSite(InstallationStateV18 s)
  {var mover=GetComponent<WorkNavigationV18>();if(mover!=null&&mover.Controls(s.builder))return mover.AtSite(s.builder);return WorkDestination(s.builder,out var point)&&Campaign.bindings.Find(s.builder)!=null&&Vector3.Distance(Campaign.bindings.Find(s.builder).position,point)<1.05f;}
  public bool Control(string id,string criterion)
  {
   var s=StateFor(id);if(s==null||s.phase!=InstallationPhaseV18.AwaitingControl||!Campaign.Near("v18:"+s.id)||Campaign.IsBusy||Campaign.IncidentModal||Campaign.cinematicDirector.IsPlaying)return false;
   if(Array.IndexOf(new[]{"stability","access","use"},criterion)<0||s.controls.Contains(criterion))return false;
   s.controls.Add(criterion);if(s.controls.Count==3){s.tier=s.pendingTier;s.phase=InstallationPhaseV18.Verified;s.usable=true;Rebuild(s);Campaign.GetComponent<VillageNavigation>()?.RequestRebuild();}
   Campaign.Save();Campaign.Inform(s.usable?"Installation contrôlée : fonctions disponibles.":"Contrôle conservé. Vérifie aussi les autres critères.");return true;
  }
  void Rebuild(InstallationStateV18 s)
  {
   if(Instances.TryGetValue(s.id,out var prior)&&prior!=null)Destroy(prior);
   var site=Campaign.bindings.Find(s.site);if(site==null)return;
   // Added structures occupy a side of the work area; existing paths and native huts stay intact.
   var p=s.type=="monument"?site.position:s.positionSaved?s.position:FindClearAnchor(site.position,s.type=="habitation"?2.25f:1.15f);if(float.IsInfinity(p.y))return;s.position=p;s.positionSaved=true;
   var root=new GameObject("V18 · "+s.id+" · "+s.phase);root.transform.SetParent(transform,true);root.transform.position=p;Instances[s.id]=root;
   var nav=root.AddComponent<UnityEngine.AI.NavMeshObstacle>();nav.shape=UnityEngine.AI.NavMeshObstacleShape.Box;nav.center=Vector3.up;nav.size=new Vector3(s.type=="habitation"?4.5f:1.8f,2,s.type=="habitation"?4.5f:.95f);nav.carving=true;nav.carveOnlyStationary=true;nav.carvingTimeToStationary=.1f;
   string key="v18:"+s.id;var binding=Array.Find(Campaign.bindings.objects,x=>x.id==key);if(binding!=null)binding.target=root.transform;else{var bindings=new List<ObjectBinding>(Campaign.bindings.objects);bindings.Add(new ObjectBinding{id=key,target=root.transform});Campaign.bindings.objects=bindings.ToArray();}Campaign.bindings.InvalidateLookups();
   int tier=s.phase==InstallationPhaseV18.Building?s.tier:s.phase==InstallationPhaseV18.AwaitingControl?s.pendingTier:s.tier;
   if(s.type=="habitation")
   {
    if(tier>=2)
    {
     Spawn("TH19_Wall_Opening_Tier"+tier,root.transform,new Vector3(0,0,-1.5f),Quaternion.identity,true);
     Spawn("TH19_Wall_Panel_Tier"+tier,root.transform,new Vector3(-1.5f,0,0),Quaternion.Euler(0,90,0),true);
     Spawn("TH19_Wall_Window_Tier"+tier,root.transform,new Vector3(1.5f,0,0),Quaternion.Euler(0,90,0),true);
     Spawn("TH19_Wall_Panel_Tier"+tier,root.transform,new Vector3(0,0,1.5f),Quaternion.identity,true);
     var nativeRoof=Spawn("TH19_Roof_Tier"+tier,root.transform,Vector3.zero,Quaternion.identity,true);if(nativeRoof!=null){var modifier=nativeRoof.AddComponent<Unity.AI.Navigation.NavMeshModifier>();modifier.overrideArea=true;modifier.area=1;}
    }
    else
    {
    Spawn("TH18_Wall_Tier"+tier,root.transform,new Vector3(0,0,-1.5f),Quaternion.identity,true);
    Spawn("TH18_Wall_Tier"+tier,root.transform,new Vector3(-1.5f,0,0),Quaternion.Euler(0,90,0),true);
    Spawn("TH18_Wall_Tier"+tier,root.transform,new Vector3(1.5f,0,0),Quaternion.Euler(0,90,0),true);
    Spawn("TH18_Wall_Tier"+tier,root.transform,new Vector3(0,0,1.5f),Quaternion.identity,true);
    {var roof=Spawn("TH18_Roof_Tier"+tier,root.transform,Vector3.zero,Quaternion.identity,true);if(roof!=null){var modifier=roof.AddComponent<Unity.AI.Navigation.NavMeshModifier>();modifier.overrideArea=true;modifier.area=1;}}
    }
   }
   else if(s.type=="monument")GetComponent<TemperateVillageV19>().BuildMonument(root.transform,tier);
   else Spawn(s.type=="storage"?"TH18_Rack_Tier"+tier:s.type=="meeting"?"TH18_Seat_Tier"+tier:"TH18_Workbench_Tier"+tier,root.transform,Vector3.zero,Quaternion.identity,true);
   if(s.phase==InstallationPhaseV18.Building||s.phase==InstallationPhaseV18.AwaitingControl)
   {
    Spawn("TH18_Fence_Tier0",root.transform,new Vector3(0,0,-2.1f),Quaternion.identity,true);
    Spawn("TH18_Trestle",root.transform,new Vector3(-2.3f,0,0),Quaternion.Euler(0,90,0));
    var closure=root.AddComponent<BoxCollider>();closure.center=Vector3.up;closure.size=new Vector3(s.type=="habitation"?3.2f:1.9f,2,s.type=="habitation"?3.2f:1.2f);
   }
   GetComponent<TemperateVillageV19>()?.Decorate(s,root.transform,tier);
   GetComponent<MapWorldGeometry>()?.Register(root.transform);GetComponent<VillageNavigation>()?.RequestRebuild();GetComponent<ActivityWorldV17>()?.InvalidatePainting();
  }
  Vector3 FindClearAnchor(Vector3 center,float radius)
  {
   int rejectedFire=0,rejectedActor=0,rejectedCollider=0,rejectedSlope=0,rejectedRoad=0;float bestSlope=999;string lastCollider="";
   // One-time placement search; persisted afterwards. Keep the native buildings and roads intact.
   for(float ring=3;ring<=24.5f;ring+=1.5f)for(int angle=0;angle<20;angle++)
   {
    var p=center+Quaternion.Euler(0,angle*18,0)*Vector3.forward*ring;p.y=VillageLife.Ground(p);if(!VillageNavigation.HearthSafe(p,radius)){rejectedFire++;continue;}
    bool occupied=false;foreach(var actor in Campaign.bindings.characters){var t=Campaign.bindings.Find(actor.id);if(t==null)continue;var d=t.position-p;d.y=0;if(Mathf.Abs(d.x)<radius+.8f&&Mathf.Abs(d.z)<radius+.8f){occupied=true;break;}}
    var life=Campaign.GetComponent<VillageLife>();if(!occupied&&life!=null)foreach(var routine in life.routines){var d=routine.workplace-p;d.y=0;if(Mathf.Abs(d.x)<radius+.8f&&Mathf.Abs(d.z)<radius+.8f){occupied=true;break;}}
    if(occupied){rejectedActor++;continue;}
    bool blocked=false;foreach(var collider in Physics.OverlapBox(p+Vector3.up*1.4f,new Vector3(radius,1.35f,radius),Quaternion.identity,~0,QueryTriggerInteraction.Ignore))
    {if(collider is TerrainCollider||collider is CharacterController||collider.GetComponentInParent<UnityEngine.AI.NavMeshAgent>()!=null)continue;if(collider.bounds.max.y>p.y+.25f){lastCollider=collider.name;blocked=true;break;}}
    if(blocked){rejectedCollider++;continue;}float range=0;
    float floor=Mathf.Min(radius,1.5f); // Check the occupied floor, not the roof eaves.
    foreach(var corner in new[]{new Vector3(-floor,0,-floor),new Vector3(floor,0,-floor),new Vector3(-floor,0,floor),new Vector3(floor,0,floor)})range=Mathf.Max(range,Mathf.Abs(VillageLife.Ground(p+corner)-p.y));
    bestSlope=Mathf.Min(bestSlope,range);if(range>.28f){rejectedSlope++;continue;}
    // Leave the Road area clear; access paths remain available on the adjacent meadow.
    // A rebuild may temporarily leave no baked polygon here. Physical footprint/ground tests
    // above remain authoritative; only an existing Road polygon explicitly excludes placement.
    var road=VillageNavigation.Filter();road.areaMask=1<<VillageNavigation.Road;
    if(UnityEngine.AI.NavMesh.SamplePosition(p,out var roadHit,.6f,road)&&Mathf.Abs(roadHit.position.y-p.y)<.4f){rejectedRoad++;continue;}
    return p;
   }
   // No invisible fallback inside an occupied building: report the unresolved siting problem.
   Debug.LogError($"V18: no clear installation footprint near {center}; fire={rejectedFire}, actor={rejectedActor}, collider={rejectedCollider} ({lastCollider}), slope={rejectedSlope} (best {bestSlope}), road={rejectedRoad}");return Vector3.positiveInfinity;
  }
  void BuildTotem()
  {
   if(Totem!=null)Destroy(Totem.gameObject);segments.Clear();var site=Campaign.bindings.Find("grand_menhir");if(site==null)return;
   Totem=new GameObject("Totem des chapitres ISO · V18").transform;Totem.SetParent(transform);Totem.position=site.position+new Vector3(-3,0,2);var p=Totem.position;p.y=VillageLife.Ground(p);Totem.position=p;
   Spawn("TH18_Totem_Base",Totem,Vector3.zero,Quaternion.identity,true);
   foreach(int c in Campaign.State.villageV18.chapters.Ordered())AddSegment(c,false);
  }
  void AddSegment(int c,bool animated)
  {
   if(c<4||c>10||segments.Exists(g=>g.name=="Chapter"+c))return;
   var g=Spawn("TH18_Totem_"+Symbols[c-4],Totem,new Vector3(0,.35f+segments.Count*.6f+(animated?1.8f:0),0),Quaternion.identity);if(g!=null){g.name="Chapter"+c;segments.Add(g);}
  }
  public bool TryCompleteChapter(int c)
  {
   EnsureState();if(c<4||c>10||Campaign.State.villageV18.chapters.Contains(c))return false;
   var qs=Array.FindAll(Campaign.Data.quests,q=>q.required&&Array.Exists(q.iso,i=>i==c.ToString()||i.StartsWith(c+".")));
   if(qs.Length==0||Array.Exists(qs,q=>Campaign.QuestState(q.id)?.claimed!=true||Campaign.QuestValidationIssues(q).Length>0))return false;
   Campaign.State.villageV18.chapters.Add(c);queue.Enqueue(c);Campaign.Save();return true;
  }
  void StartPresentation(int c)
  {
   chapter=c;PresentationTime=0;PresentationTitle=$"CHAPITRE {c} TERMINÉ\n{Titles[c-4]}\nTOTEM AMÉLIORÉ";presenting=true;AddSegment(c,true);
   var cam=Campaign.bindings.gameplayCamera;cameraPosition=cam.transform.position;cameraRotation=cam.transform.rotation;
   follow=Array.Find(Campaign.bindings.gameplayControls,b=>b!=null&&b.gameObject==cam.gameObject);cameraWasEnabled=follow!=null&&follow.enabled;if(follow!=null)follow.enabled=false;
   orbit=new GameObject("Impulsion polygonale du totem").transform;orbit.SetParent(Totem,false);
   for(int i=0;i<12;i++){var g=Spawn("TH18_Totem_"+Symbols[(c-4+i)%7],orbit,Vector3.zero,Quaternion.identity);if(g!=null){g.transform.localScale=Vector3.one*.10f;float a=i*Mathf.PI/6;g.transform.localPosition=new Vector3(Mathf.Cos(a)*1.1f,.7f+i*.12f,Mathf.Sin(a)*1.1f);}}
  }
  public void SkipPresentation(){if(presenting)EndPresentation();}
  public bool ReplayPresentation(int c)
  {if(PendingPresentation||Campaign.IsModal||Campaign.IsBusy||!Campaign.State.villageV18.chapters.Contains(c))return false;replaying=true;StartPresentation(c);return true;}
  public void RefreshInstallation(string id){var s=StateFor(id);if(s!=null)Rebuild(s);}
  void EndPresentation()
  {
   if(!presenting)return;presenting=false;var g=segments.Find(x=>x.name=="Chapter"+chapter);if(g!=null){int i=segments.IndexOf(g);g.transform.localPosition=Vector3.up*(.35f+i*.6f);g.transform.localRotation=Quaternion.identity;}
   if(orbit!=null)Destroy(orbit.gameObject);var cam=Campaign.bindings.gameplayCamera;cam.transform.SetPositionAndRotation(cameraPosition,cameraRotation);if(follow!=null)follow.enabled=cameraWasEnabled;
   if(observed==Campaign.State){var receipts=Campaign.State.villageV18.presentationReceipts;if(!receipts.Contains("chapter:"+chapter))receipts.Add("chapter:"+chapter);Campaign.Save();if(!replaying&&Campaign.IsActComplete&&!Campaign.IsModal&&!Campaign.IsBusy)Campaign.AdvanceAct();}replaying=false;
  }
  void Update()
  {
   if(Campaign?.State==null)return;
   if(observed!=Campaign.State&&Campaign.cinematicDirector.IsPlaying){if(DecorationCount==0)BuildDecoration();return;}
   if(observed!=Campaign.State){EndPresentation();observed=Campaign.State;workPoints.Clear();foreach(var prior in Instances.Values)if(prior!=null){prior.SetActive(false);Destroy(prior);}Instances.Clear();EnsureState();foreach(var s in observed.villageV18.installations)Rebuild(s);BuildTotem();if(DecorationCount==0)BuildDecoration();queue.Clear();}
   if(presenting)
   {
    if(Campaign.UserPaused)return;PresentationTime+=Time.deltaTime;float t=PresentationTime;var g=segments.Find(x=>x.name=="Chapter"+chapter);
    if(g!=null){float k=Mathf.SmoothStep(0,1,Mathf.Clamp01((t-1.1f)/2));g.transform.localPosition=Vector3.up*(.35f+segments.IndexOf(g)*.6f+(1-k)*1.8f);g.transform.localRotation=Quaternion.Euler(0,(1-k)*100,0);}
    if(orbit!=null){orbit.localRotation=Quaternion.Euler(0,t*75,0);orbit.localScale=Vector3.one*(.8f+.2f*Mathf.Sin(t*3));}
    var cam=Campaign.bindings.gameplayCamera;var at=Totem.position+Vector3.up*(1+segments.Count*.25f);cam.transform.position=Vector3.Lerp(cameraPosition,at+new Vector3(3,1.8f,-5),Mathf.SmoothStep(0,1,Mathf.Clamp01(t/.6f)));cam.transform.LookAt(at);
    if(t>=6)EndPresentation();return;
   }
   if(Time.unscaledTime<check)return;check=Time.unscaledTime+.25f;
   if(!Campaign.IsModal&&!Campaign.IsBusy&&queue.Count>0){StartPresentation(queue.Dequeue());return;}
   foreach(var s in observed.villageV18.installations)if(s.phase==InstallationPhaseV18.Building&&!Campaign.UserPaused&&!Campaign.cinematicDirector.IsPlaying&&WorkerOnSite(s)&&!(GetComponent<ConstructionFilmV19>()?.HoldsWork(s.id)??false))
   {s.workSeconds+=.25f;if(s.workSeconds>=12){s.phase=InstallationPhaseV18.AwaitingControl;Rebuild(s);Campaign.Save();}}
  }
  void BuildDecoration()
  {
   // Static decorative meshes are combined per material. No decorative rigidbodies/colliders.
   var root=new GameObject("Village habité · accessoires originaux V18").transform;root.SetParent(transform,false);
   root.gameObject.AddComponent<Unity.AI.Navigation.NavMeshModifier>().ignoreFromBuild=true;
   var pending=new Dictionary<Material,List<CombineInstance>>();var random=new System.Random(1801);
   foreach(string id in new[]{"atelier_silex","stockage","repos","bois_construction","foyer","alban","berge_observation","chasse_clairiere"})
   {
    var site=Campaign.bindings.Find(id);if(site==null)continue;
    for(int i=0;i<56;i++)
    {
     float a=(float)random.NextDouble()*6.283f,r=1.8f+(float)random.NextDouble()*2.2f;var p=site.position+new Vector3(Mathf.Cos(a)*r,0,Mathf.Sin(a)*r);p.y=VillageLife.Ground(p);
     // Keep a broad cross-shaped circulation corridor at every station.
     if(Mathf.Abs(p.x-site.position.x)<.85f||Mathf.Abs(p.z-site.position.z)<.85f||!VillageNavigation.HearthSafe(p,.2f))continue;
     string model=i%7==0?"TH18_Crate":id=="alban"&&i%5==0?"TH18_Seat_Tier0":"TH18_Pottery_0"+(i%8);float scale=.72f+(float)random.NextDouble()*.35f;float tilt=0;
     if(id=="bois_construction"&&i%3!=0){model="TH18_Fence_Tier0";scale*=.3f;tilt=90;}
     if(id=="atelier_silex"&&i%3==0){model=i%2==0?"TH18_Workbench_Tier0":"TH18_Bowl_Pigments";scale*=.45f;}
     if(id=="chasse_clairiere"&&i%4==0){model="TH18_Fence_Tier0";scale*=.24f;tilt=90;}
     var asset=Template(model);if(asset==null)continue;var matrix=Matrix4x4.TRS(p,Quaternion.Euler(tilt,(float)random.NextDouble()*360,0),Vector3.one*scale);
     foreach(var f in asset.GetComponentsInChildren<MeshFilter>())
     {
      var materials=f.GetComponent<MeshRenderer>().sharedMaterials;
      for(int sub=0;sub<f.sharedMesh.subMeshCount;sub++){var material=materials[Mathf.Min(sub,materials.Length-1)];if(!pending.TryGetValue(material,out var list))pending[material]=list=new List<CombineInstance>();list.Add(new CombineInstance{mesh=f.sharedMesh,subMeshIndex=sub,transform=root.worldToLocalMatrix*matrix*f.transform.localToWorldMatrix});}
     }DecorationCount++;
    }
   }
   foreach(var pair in pending){var mesh=new Mesh{name="TH18 static batch "+pair.Key.name,indexFormat=UnityEngine.Rendering.IndexFormat.UInt32};mesh.CombineMeshes(pair.Value.ToArray());combined.Add(mesh);var go=new GameObject(mesh.name);go.transform.SetParent(root,false);go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=pair.Key;DecorationDrawCalls++;}
  }
  void OnDisable(){EndPresentation();}
  void OnDestroy(){foreach(var mesh in combined)if(mesh!=null)Destroy(mesh);}
 }
 static class VillageChapterOrderingV18 {public static int[] Ordered(this List<int> source){var a=source.ToArray();Array.Sort(a);return a;}}
}
