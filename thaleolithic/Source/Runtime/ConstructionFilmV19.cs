using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.Timeline;
namespace UngaBunga45001
{
 [DefaultExecutionOrder(170)]public sealed class ConstructionFilmV19:MonoBehaviour
 {
  sealed class Crew{public string id;public Transform root;public Animator animator;public VillagerBrain brain;public NavMeshAgent agent;public CharacterController body;public VillagerCollisionMotor collision;public bool brainWas,agentWas,collisionWas,carryingWas;public CarriedLoad load;public CinematicActorV15 pose;public Vector3 start;}
  [Serializable]class LiftKey{public float time,height;}
  [Serializable]class LiftData{public LiftKey[] keys;}
  public bool Playing{get;private set;}public string WorkingId{get;private set;}="";public string Stage{get;private set;}="";public float Clock{get;private set;}public int CompletedFilms{get;private set;}public int ShotCount=>shots.Count;public float DeliveryTravel{get;private set;}public float WorstHandGap{get;private set;}
  public bool Owns(string id)=>Playing&&(crew.Any(p=>p.id==id)||id=="dylan");
  readonly ConstructionCameraV19 cine=new ConstructionCameraV19();public bool CinemachineActive=>cine.Active;
  public float BeamHeight=>beam!=null?beam.position.y-staging.position.y:0;
  CampaignRuntime c;VillageUpgradeV18 village;ChapterMotionV241 motion;Coroutine job;CampaignSave state;readonly List<Crew> crew=new List<Crew>();readonly HashSet<int> shots=new HashSet<int>();CinematicTimelineV16 timeline;Transform staging,beam,crate,incoming;Transform[] handGoals;Renderer[] oldRenderers;bool[] oldHidden;Renderer[] walls;Transform newRoof;Crew main,assistant,delivery,player;Camera camera;Vector3 oldCamera;Quaternion oldRotation;CinematicCameraV16 rig;readonly HashSet<Collider> foliage=new HashSet<Collider>();AnimationCurve lift;bool skipped,furnished;UnityEngine.UI.Button skip;
  void Start(){c=GetComponent<CampaignRuntime>();village=GetComponent<VillageUpgradeV18>();motion=GetComponent<ChapterMotionV241>();}
  public bool HoldsWork(string id){var s=village.StateFor(id);return s!=null&&s.phase==InstallationPhaseV18.Building&&s.filmTier<s.pendingTier&&Resources.Load<TimelineAsset>("TemperateV19/Timeline/Construction")!=null;}
  Crew Take(string id,bool control)
  {
   var root=c.bindings.Find(id);var p=new Crew{id=id,root=root,animator=c.bindings.AnimatorFor(id),brain=root.GetComponent<VillagerBrain>(),agent=root.GetComponent<NavMeshAgent>(),body=root.GetComponent<CharacterController>(),collision=root.GetComponent<VillagerCollisionMotor>(),start=root.position};p.brainWas=p.brain!=null&&p.brain.enabled;p.agentWas=p.agent!=null&&p.agent.enabled;p.collisionWas=p.collision!=null&&p.collision.enabled;p.load=p.animator.GetComponent<CarriedLoad>();p.carryingWas=p.load!=null&&p.load.carrying;
   if(control){if(p.brain!=null)p.brain.enabled=false;if(p.agent!=null)p.agent.enabled=false;if(p.collision!=null)p.collision.enabled=false;p.body.enabled=true;}crew.Add(p);return p;
  }
  void Release(Crew p)
  {
   if(p.pose!=null)p.pose.Release();if(p.load!=null)p.load.carrying=p.carryingWas;if(p.brain!=null)p.brain.enabled=p.brainWas;if(p.collision!=null)p.collision.enabled=p.collisionWas;
   if(p.agent!=null&&p.agentWas&&NavMesh.SamplePosition(p.root.position,out var hit,.7f,VillageNavigation.Filter(p.agent.agentTypeID))&&VillageNavigation.SegmentClear(p.root.position,hit.position,p.root)){p.agent.enabled=true;p.agent.Warp(hit.position+Vector3.up*.035f);}VillageLife.Play(p.animator,"Listen");
  }
  bool Valid(InstallationStateV18 s)=>c.State==state&&s.phase==InstallationPhaseV18.Building;
  IEnumerator Travel(Crew p,Vector3 desired,InstallationStateV18 s)
  {
   float retry=0,until=Time.time+90;Vector3[] waypoints=null;int corner=1;float blocked=0;
   while(Valid(s)&&Time.time<until)
   {
    if(c.UserPaused||c.cinematicDirector.IsPlaying||c.ConversationActorId==p.id){yield return null;continue;}
    if(waypoints==null&&Time.time>=retry){if(VillageNavigation.Plan(p.root.position,desired,p.root,out var path,1.6f))waypoints=path.corners;else yield return PhysicalRouteV19.Plan(p.root.position,desired,p.root,result=>waypoints=result,()=>Valid(s));if(waypoints==null){retry=Time.time+2;yield return null;continue;}corner=1;}
    if(waypoints==null){yield return null;continue;}while(corner<waypoints.Length&&Flat(p.root.position,waypoints[corner])<.2f)corner++;if(corner>=waypoints.Length)yield break;
    var d=waypoints[corner]-p.root.position;d.y=0;var prior=p.root.position;p.body.enabled=true;p.body.Move((d.normalized*1.5f+Vector3.down*2)*Time.deltaTime);p.root.rotation=Quaternion.RotateTowards(p.root.rotation,Quaternion.LookRotation(d),180*Time.deltaTime);VillageLife.Play(p.animator,"Locomotion");p.animator.SetFloat("Speed",.5f);
    blocked=Flat(prior,p.root.position)<.02f*Time.deltaTime?blocked+Time.deltaTime:0;if(blocked>1.4f){blocked=0;waypoints=null;retry=Time.time+.5f;}yield return null;
   }
  }
  static float Flat(Vector3 a,Vector3 b){a.y=b.y=0;return Vector3.Distance(a,b);}
  void Update()
  {
   if(c?.State==null||job!=null||c.IsModal||c.IsBusy)return;var next=c.State.villageV18.installations.FirstOrDefault(s=>HoldsWork(s.id)&&village.WorkerOnSite(s));if(next!=null&&motion.Prepare("07")&&motion.Prepare("08")){state=c.State;WorkingId=next.id;job=StartCoroutine(Produce(next));}
  }
  GameObject Spawn(string id,Transform parent,Vector3 local)
  {var source=Resources.Load<GameObject>((id.StartsWith("TH19_")?"NativeArchitectureV19":id.StartsWith("TH18_")?"VillageV18":"TemperateV19")+"/Prefabs/"+id);if(source==null)throw new InvalidOperationException("Construction prefab missing: "+id);var go=Instantiate(source,parent);go.transform.localPosition=local;go.transform.localRotation=Quaternion.identity;return go;}
  void Preview(InstallationStateV18 s,Transform house)
  {
   incoming=new GameObject("Éléments neufs · pose réelle V19").transform;incoming.SetParent(house,false);var built=new List<Renderer>();int tier=s.pendingTier;
   if(s.type=="habitation")
   {
    var front=Spawn(tier>=2?"TH19_Wall_Opening_Tier"+tier:"TH18_Wall_Tier"+tier,incoming,new Vector3(0,0,-1.5f));built.AddRange(front.GetComponentsInChildren<Renderer>());
    foreach(var p in new[]{new Vector3(-1.5f,0,0),new Vector3(1.5f,0,0),new Vector3(0,0,1.5f)})
    {
     string wall=tier<2?"TH18_Wall_Tier"+tier:(p.x>0?"TH19_Wall_Window_Tier":"TH19_Wall_Panel_Tier")+tier;
     var go=Spawn(wall,incoming,p);if(p.z==0)go.transform.localRotation=Quaternion.Euler(0,90,0);
     built.AddRange(go.GetComponentsInChildren<Renderer>());
    }
    newRoof=Spawn(tier>=2?"TH19_Roof_Tier"+tier:"TH18_Roof_Tier"+tier,incoming,Vector3.up*3).transform;
   }
   else if(s.type=="monument"){c.GetComponent<TemperateVillageV19>().BuildMonument(incoming,tier);built.AddRange(incoming.GetComponentsInChildren<Renderer>());}
   else built.AddRange(Spawn(s.type=="storage"?"TH18_Rack_Tier"+tier:s.type=="meeting"?"TH18_Seat_Tier"+tier:"TH18_Workbench_Tier"+tier,incoming,Vector3.zero).GetComponentsInChildren<Renderer>());
   walls=built.ToArray();foreach(var r in walls)r.enabled=false;if(newRoof!=null)newRoof.gameObject.SetActive(false);
  }
  Transform Goal(string name,Transform parent,Vector3 local){var go=new GameObject(name).transform;go.SetParent(parent,false);go.localPosition=local;return go;}
  void Acquire(Crew p){p.pose=p.animator.GetComponent<CinematicActorV15>()??p.animator.gameObject.AddComponent<CinematicActorV15>();p.pose.Acquire(p.animator);}
  IEnumerator Produce(InstallationStateV18 s)
  {
   bool finished=false;var stopped=new List<(NavMeshAgent agent,bool stopped)>();
   try
   {
    Stage="Acheminement des matériaux";shots.Clear();WorstHandGap=0;var house=village.Instances[s.id].transform;main=Take(s.builder,false);string preferred=s.builder=="tarek"?"georges":"tarek";string helper=c.State.characters.Where(p=>p.id!="dylan"&&p.id!="neila"&&p.id!=s.builder&&p.alive&&p.available&&p.competence>=50&&!c.State.villageV18.installations.Any(b=>b.phase==InstallationPhaseV18.Building&&b.builder==p.id)).OrderBy(p=>p.id==preferred?0:1).Select(p=>p.id).FirstOrDefault();if(helper==null){Stage="Un second bâtisseur est nécessaire";yield break;}assistant=Take(helper,true);delivery=Take("neila",true);if(delivery.load!=null)delivery.load.carrying=true;
    var toward=house.position-main.root.position;toward.y=0;toward=toward.sqrMagnitude>.01f?toward.normalized:Vector3.forward;var right=Vector3.Cross(Vector3.up,toward);Vector3 helperGoal=main.root.position+right*2.6f,deliveryGoal=main.root.position+right*1.3f-toward*1.5f;helperGoal.y=VillageLife.Ground(helperGoal);deliveryGoal.y=VillageLife.Ground(deliveryGoal);
    var travelA=StartCoroutine(Travel(assistant,helperGoal,s));var travelN=StartCoroutine(Travel(delivery,deliveryGoal,s));yield return travelA;yield return travelN;if(!Valid(s))yield break;
    if(Flat(assistant.root.position,helperGoal)>2||Flat(delivery.root.position,deliveryGoal)>2){Stage="Trajet du chantier bloqué · nouvel essai";yield break;}
    DeliveryTravel=Vector3.Distance(delivery.start,delivery.root.position);Stage="Rejoins le chantier pour l’inspection";while(Valid(s)&&(!c.Near("v18:"+s.id)||c.IsModal||c.IsBusy))yield return null;if(!Valid(s))yield break;
    c.GetComponent<ActivityActingV18>().ReleaseForFilm();Playing=true;Stage="Film des travaux";camera=c.bindings.gameplayCamera;oldCamera=camera.transform.position;oldRotation=camera.transform.rotation;rig=new CinematicCameraV16();cine.Begin(camera);
    foreach(var b in c.bindings.characters){var a=c.bindings.Find(b.id).GetComponent<NavMeshAgent>();if(a!=null&&a.enabled&&a.isOnNavMesh){stopped.Add((a,a.isStopped));a.isStopped=true;}}
    var span=assistant.root.position-main.root.position;span.y=0;right=span.normalized;toward=Vector3.Cross(right,Vector3.up);furnished=false;
    oldRenderers=house.GetComponentsInChildren<Renderer>();oldHidden=oldRenderers.Select(r=>r.forceRenderingOff).ToArray();Preview(s,house);staging=new GameObject("Chantier · traverse et livraison V19").transform;staging.SetParent(transform,true);staging.position=(main.root.position+assistant.root.position)*.5f+toward*.42f;staging.position=new Vector3(staging.position.x,VillageLife.Ground(staging.position),staging.position.z);staging.rotation=Quaternion.LookRotation(toward);beam=Spawn("TH19E_Beam",staging,Vector3.zero).transform;beam.localScale=new Vector3(Mathf.Max(.5f,span.magnitude/2.6f),1,1);crate=Spawn("TH18_Crate",staging,Vector3.zero).transform;crate.localScale=Vector3.one*.6f;var trestle=Spawn("TH18_Trestle",staging,Vector3.zero).transform;var tp=delivery.root.position+delivery.root.forward*.7f;tp.y=VillageLife.Ground(tp);trestle.position=tp;trestle.rotation=delivery.root.rotation;
    handGoals=new[]{Goal("Prise gauche bâtisseur",beam,new Vector3(-1.28f,0,-.025f)),Goal("Prise droite bâtisseur",beam,new Vector3(-1.02f,0,-.025f)),Goal("Prise gauche assistant",beam,new Vector3(1.02f,0,-.025f)),Goal("Prise droite assistant",beam,new Vector3(1.28f,0,-.025f)),Goal("Livraison gauche",crate,new Vector3(-.3f,.4f,-.15f)),Goal("Livraison droite",crate,new Vector3(.3f,.4f,-.15f))};
    Acquire(main);Acquire(assistant);Acquire(delivery);player=Take("dylan",false);if(!c.bindings.player.GetComponent<ThirdPersonMotor>().Crouching)Acquire(player);
    var data=JsonUtility.FromJson<LiftData>(Resources.Load<TextAsset>("TemperateV19/Timeline/BuildLift").text);lift=new AnimationCurve(data.keys.Select(k=>new Keyframe(k.time,k.height)).ToArray());for(int i=0;i<lift.length;i++)lift.SmoothTangents(i,0);timeline=gameObject.AddComponent<CinematicTimelineV16>();var asset=Resources.Load<TimelineAsset>("TemperateV19/Timeline/Construction");timeline.BeginAsset(asset);Clock=0;skipped=false;
    var hud=c.GetComponent<CampaignHud>();var rect=AdventureUI.Rect(hud.Canvas.transform,"Passer les travaux V19",Vector2.right,Vector2.right,new Vector2(-165,45),new Vector2(280,44));skip=TribalStyle.Button(rect,hud.font,"PASSER LES TRAVAUX",Skip);
    while(Valid(s)&&Clock<(float)asset.duration&&!skipped){if(!c.UserPaused)Clock+=Time.deltaTime;timeline.Evaluate(Clock);shots.Add(timeline.ShotIndex);Present(s,house,toward,right);s.workSeconds=Mathf.Min(11.99f,Clock);yield return null;}
    if(Valid(s)){s.filmTier=s.pendingTier;s.workSeconds=11.99f;finished=true;CompletedFilms++;c.Save();}
   }
   finally
   {
    cine.End();if(skip!=null)Destroy(skip.gameObject);if(timeline!=null){timeline.End();Destroy(timeline);}if(oldRenderers!=null)for(int i=0;i<oldRenderers.Length;i++)if(oldRenderers[i]!=null)oldRenderers[i].forceRenderingOff=oldHidden[i];if(incoming!=null)Destroy(incoming.gameObject);if(staging!=null)Destroy(staging.gameObject);if(Playing&&camera!=null)camera.transform.SetPositionAndRotation(oldCamera,oldRotation);foreach(var p in crew)Release(p);crew.Clear();foreach(var entry in stopped)if(entry.agent!=null&&entry.agent.enabled&&entry.agent.isOnNavMesh)entry.agent.isStopped=entry.stopped;Playing=false;job=null;WorkingId="";if(finished)Stage="Travaux terminés · trois contrôles requis";c.Subtitle="";main=assistant=delivery=player=null;
   }
  }
  void Pose(Crew person,string clip,float t,Vector3 look)
  {if(person.pose==null)return;var animation=motion.Clip(clip);if(animation==null)return;person.pose.Sample(animation,Mathf.Repeat(t,animation.length),1);person.pose.Look(look,.75f);}
  void Present(InstallationStateV18 s,Transform house,Vector3 toward,Vector3 right)
  {
   int shot=Mathf.Clamp(timeline.ShotIndex,0,8);float t=Clock;beam.localPosition=Vector3.up*lift.Evaluate(Mathf.Clamp(t-4.5f,0,3.8f));var face=staging.position;
   foreach(var p in new[]{main,assistant}){var d=face-p.root.position;d.y=0;p.root.rotation=Quaternion.LookRotation(d);Pose(p,p==main?"V18_Georges_PoseTorchis":"V18_Tarek_Palissade",t,face+Vector3.up);}
   float contact=shot==4?Mathf.SmoothStep(0,1,Mathf.Clamp01((t-4.5f)/.3f)):0;main.pose.ReachBodyForContact=true;assistant.pose.ReachBodyForContact=true;main.pose.Contact(handGoals[0],handGoals[1],contact);assistant.pose.Contact(handGoals[2],handGoals[3],contact);
   crate.position=delivery.root.position+delivery.root.forward*.42f+Vector3.up*Mathf.Lerp(.91f,.79f,Mathf.SmoothStep(0,1,Mathf.Clamp01((t-2.2f)/1.2f)));Pose(delivery,"V18_Neila_ManipulationPoterie",t,crate.position);delivery.pose.Contact(handGoals[4],handGoals[5],shot==2?1:0);if(player.pose!=null)Pose(player,"V18_Dylan_PointSecurite",t,house.position+Vector3.up*1.1f);
   if(t>2.2f)for(int i=0;i<oldRenderers.Length;i++)if(oldRenderers[i]!=null)oldRenderers[i].forceRenderingOff=true;
   foreach(var wall in walls)wall.enabled=t>7;incoming.localPosition=Vector3.up*Mathf.Lerp(.7f,0,Mathf.SmoothStep(0,1,Mathf.Clamp01((t-7)/1.3f)));
   if(newRoof!=null){newRoof.gameObject.SetActive(t>8.3f);newRoof.localPosition=Vector3.up*Mathf.Lerp(2.7f,0,Mathf.SmoothStep(0,1,Mathf.Clamp01((t-8.3f)/1.3f)));}
   if(t>10&&!furnished){furnished=true;c.GetComponent<TemperateVillageV19>().Decorate(s,incoming,s.pendingTier);}
   Vector3 at=shot==0||shot==8?house.position+Vector3.up*1.15f:shot==2?delivery.root.position+Vector3.up*.95f:shot==7?player.root.position+Vector3.up*1.25f:shot>=5?house.position+Vector3.up*1.45f:staging.position+Vector3.up*1.0f;
   var desired=shot==0||shot==8?house.position+new Vector3(5.3f,3.3f,-6.7f):shot==2?at+toward*2.7f+right*1.8f+Vector3.up*.7f:shot==4?staging.position-toward*3.8f+right*.3f+Vector3.up*2.2f:shot>=5&&shot<=6?house.position+new Vector3(4.5f,3.5f,-5.3f):at-toward*3.2f+right*1.4f+Vector3.up*.9f;
   if(shot==0||shot==8){camera.transform.position=desired;camera.transform.LookAt(at);}else rig.Frame(camera,at,desired-at,shot==7?player.root:main.root,assistant.root,foliage,shot,t,Time.deltaTime);cine.Apply(camera);c.Subtitle=new[]{"Avant les travaux","Préparer les assemblages","Neila apporte les matériaux","Inspecter les supports","Lever la traverse à deux","Assembler les parois","Poser la couverture","Dylan inspecte les travaux","Nouvelle installation · contrôles requis"}[shot];
  }
  void LateUpdate(){if(Playing&&main?.pose!=null&&assistant?.pose!=null&&Clock>4.9f)WorstHandGap=Mathf.Max(WorstHandGap,Mathf.Max(main.pose.ContactGap,assistant.pose.ContactGap));}
  public void Skip(){skipped=true;}
  public void Cancel(){StopAllCoroutines();job=null;}
  void OnDisable()=>Cancel();
 }
}
