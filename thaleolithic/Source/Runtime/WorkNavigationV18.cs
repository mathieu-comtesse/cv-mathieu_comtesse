using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 // Construction access uses the same real body tests as cinematic routes. Grid work yields each frame.
 [DefaultExecutionOrder(90)]public sealed class WorkNavigationV18:MonoBehaviour
 {
  sealed class Job
  {
   public string id,actor;public InstallationStateV18 state;public Vector3 destination;public bool evacuation;public Transform root;public CharacterController body;public NavMeshAgent agent;public Animator animator;public bool agentEnabled,arrived,planning;public float animatorSpeed,vertical=-2,blocked,retry;public Vector3[] route;public int index;public Vector3 velocity;
  }
  sealed class Heap
  {
   readonly List<(int node,float cost)> values=new List<(int,float)>();public int Count=>values.Count;
   public void Push(int node,float cost){values.Add((node,cost));int i=values.Count-1;while(i>0){int p=(i-1)/2;if(values[p].cost<=cost)break;values[i]=values[p];i=p;}values[i]=(node,cost);}
   public int Pop(){int answer=values[0].node;var last=values[values.Count-1];values.RemoveAt(values.Count-1);if(values.Count==0)return answer;int i=0;while(i*2+1<values.Count){int child=i*2+1;if(child+1<values.Count&&values[child+1].cost<values[child].cost)child++;if(values[child].cost>=last.cost)break;values[i]=values[child];i=child;}values[i]=last;return answer;}
  }
  readonly Dictionary<string,Job> jobs=new Dictionary<string,Job>();CampaignRuntime c;VillageUpgradeV18 village;CampaignSave observed;int budgetFrame=-1,nodesThisFrame;
  public int NodesExpanded{get;private set;}public int RoutesFound{get;private set;}public string LastFailure{get;private set;}="";
  public string DescribeJob(string actor){if(!jobs.TryGetValue(actor,out var j))return "No job";string blocks=string.Join("|",Physics.OverlapSphere(j.root.position+Vector3.up*.8f,j.body.radius+.25f,~0,QueryTriggerInteraction.Ignore).Where(x=>!(x is TerrainCollider)&&!x.transform.IsChildOf(j.root)).Select(x=>x.name));return $"radius={j.body.radius}; planning={j.planning}; arrived={j.arrived}; index={j.index}/{j.route?.Length}; next={(j.route!=null&&j.index<j.route.Length?j.route[j.index]:j.destination)}; overlapping={blocks}";}
  public bool Controls(string actor)=>jobs.ContainsKey(actor)&&!c.cinematicDirector.IsPlaying;
  bool Talking(string actor)=>c.ConversationActorId==actor&&(c.Dialogue!=null||c.QuestOverlay);
  public bool AtSite(string actor)=>jobs.TryGetValue(actor,out var job)&&!job.evacuation&&job.arrived&&!Talking(actor);
  public bool Evacuating(string actor)=>jobs.TryGetValue(actor,out var job)&&job.evacuation;
  public Vector3 Velocity(string actor)=>jobs.TryGetValue(actor,out var job)?job.velocity:Vector3.zero;
  void Start(){c=GetComponent<CampaignRuntime>();village=GetComponent<VillageUpgradeV18>();}
  bool Alarm=>c.HasFlag("v17:alarm");
  bool Valid(Job j)=>c.State==observed&&jobs.TryGetValue(j.actor,out var active)&&active==j&&(j.evacuation?Alarm:!Alarm&&j.state.phase==InstallationPhaseV18.Building)&&c.State.characters.Find(x=>x.id==j.actor)?.alive==true;
  void Release(Job j)
  {
   if(j.animator!=null)j.animator.speed=j.animatorSpeed;
   if(j.agent!=null){j.agent.enabled=j.agentEnabled;if(j.agent.enabled&&NavMesh.SamplePosition(j.root.position,out var hit,1,VillageNavigation.Filter(j.agent.agentTypeID))&&VillageNavigation.Clear(hit.position,j.root)&&VillageNavigation.SegmentClear(j.root.position,hit.position,j.root))j.agent.Warp(hit.position+Vector3.up*.04f);}
   if(j.body!=null)j.body.enabled=true;
  }
  void Update()
  {
   if(c?.State==null)return;if(observed!=c.State){StopAllCoroutines();foreach(var j in jobs.Values)Release(j);jobs.Clear();observed=c.State;}
   if(c.cinematicDirector.IsPlaying||c.IncidentModal||c.MenhirActive||c.UserPaused)return;
   foreach(var key in jobs.Keys.ToArray())if(!Valid(jobs[key])){Release(jobs[key]);jobs.Remove(key);}
   if(Alarm)
   {
    var world=c.GetComponent<ActivityWorldV17>();
    foreach(var actor in world.ExpectedResidentIds)if(!jobs.ContainsKey(actor)&&world.EvacuationDestination(actor,out var destination))Create(actor,null,destination);
    foreach (var job in jobs.Values)
    {
     if (!job.evacuation || !job.arrived || world.AtAssembly(job.actor)) continue;
     job.arrived = false;
     job.route = null;
     job.retry = Time.unscaledTime;
    }
   }
   else foreach(var state in c.State.villageV18.installations)
   {
    if(state.phase!=InstallationPhaseV18.Building||jobs.ContainsKey(state.builder)||!village.Instances.ContainsKey(state.id))continue;var root=c.bindings.Find(state.builder);if(root==null)continue;
    Create(state.builder,state,Vector3.zero);
   }
   foreach(var job in jobs.Values)if(!job.arrived&&!job.planning&&job.route==null&&Time.unscaledTime>=job.retry)StartCoroutine(Plan(job));
  }
  void Create(string actor,InstallationStateV18 state,Vector3 destination)
  {
   var root=c.bindings.Find(actor);if(root==null)return;var agent=root.GetComponent<NavMeshAgent>();var body=root.GetComponent<CharacterController>();var animator=c.bindings.AnimatorFor(actor);if(agent==null||body==null||animator==null)return;
   var job=new Job{id=state?.id??("evac:"+actor),actor=actor,state=state,evacuation=state==null,destination=destination,root=root,body=body,agent=agent,animator=animator,agentEnabled=agent.enabled,animatorSpeed=animator.speed};agent.enabled=false;body.enabled=true;jobs.Add(actor,job);StartCoroutine(Plan(job));
  }
  IEnumerator Plan(Job j)
  {
   j.planning=true;j.route=null;j.index=0;LastFailure="";const float cell=.65f,pad=11;float clearance=j.body.radius+j.body.skinWidth+.035f;float lower=clearance+.03f,upper=Mathf.Max(lower,j.body.height-clearance+.03f);var colliders=new Collider[32];var hits=new RaycastHit[32];var environment=FindFirstObjectByType<EnvironmentInteraction>();
   var center=j.evacuation?j.destination:village.Instances[j.id].transform.position;var start=j.root.position;var peers=j.evacuation?Array.Empty<Vector3>():c.bindings.characters.Where(b=>b.id!=j.actor&&c.bindings.Find(b.id)!=null).Select(b=>c.bindings.Find(b.id).position).ToArray();var terrains=Terrain.activeTerrains;
   float Ground(Vector3 p){foreach(var terrain in terrains){var delta=p-terrain.transform.position;var dimensions=terrain.terrainData.size;if(delta.x>=0&&delta.z>=0&&delta.x<=dimensions.x&&delta.z<=dimensions.z)return terrain.SampleHeight(p)+terrain.transform.position.y;}return p.y;}
   bool Clear(Vector3 p)
   {
    if(!VillageNavigation.HearthSafe(p,.34f)||environment!=null&&environment.SampleDepth(p,out var depth)&&depth>.4f)return false;
    foreach(var peer in peers){var d=peer-p;if(Mathf.Abs(d.y)<1.6f&&d.x*d.x+d.z*d.z<.45f*.45f)return false;}
    int count=Physics.OverlapCapsuleNonAlloc(p+Vector3.up*lower,p+Vector3.up*upper,clearance,colliders,~0,QueryTriggerInteraction.Ignore);if(count>=colliders.Length)return false;
    for(int i=0;i<count;i++){var col=colliders[i];if(col is TerrainCollider||col is CharacterController||col.GetComponentInParent<NavMeshAgent>()!=null||col.transform.IsChildOf(j.root)||col.bounds.max.y<Ground(p)+.2f)continue;return false;}return true;
   }
   bool Connect(Vector3 a,Vector3 b)
   {
    if(Mathf.Abs(a.y-b.y)>.4f)return false;var d=b-a;for(float along=0;along<=d.magnitude;along+=.12f)if(!VillageNavigation.HearthSafe(a+d.normalized*along,Mathf.Max(clearance,.34f)))return false;int count=Physics.CapsuleCastNonAlloc(a+Vector3.up*lower,a+Vector3.up*upper,clearance,d.normalized,hits,d.magnitude,~0,QueryTriggerInteraction.Ignore);if(count>=hits.Length)return false;
    for(int i=0;i<count;i++){var hit=hits[i];if(hit.collider is TerrainCollider||hit.collider is CharacterController||hit.collider.GetComponentInParent<NavMeshAgent>()!=null||hit.transform.IsChildOf(j.root)||hit.collider.bounds.max.y<Ground(hit.point)+.2f)continue;if(hit.distance>.025f)return false;}return true;
   }
   var origin=new Vector3(Mathf.Min(start.x,center.x)-pad,0,Mathf.Min(start.z,center.z)-pad);int width=Mathf.CeilToInt((Mathf.Abs(start.x-center.x)+pad*2)/cell)+1,height=Mathf.CeilToInt((Mathf.Abs(start.z-center.z)+pad*2)/cell)+1;
   if(width>175||height>175){LastFailure="Construction route outside bounded grid";j.planning=false;j.retry=Time.unscaledTime+5;yield break;}
   int size=width*height;var positions=new Vector3[size];var free=new byte[size];var closed=new bool[size];var costs=new float[size];var parents=new int[size];for(int i=0;i<size;i++){costs[i]=float.PositiveInfinity;parents[i]=-1;}
   int Index(Vector3 p)=>Mathf.Clamp(Mathf.RoundToInt((p.z-origin.z)/cell),0,height-1)*width+Mathf.Clamp(Mathf.RoundToInt((p.x-origin.x)/cell),0,width-1);
   int first=Index(start);var goals=new HashSet<int>();float radius=j.evacuation?0:j.state.type=="habitation"?3.4f:2.35f;
   for(int i=0;i<(j.evacuation?1:24);i++){var p=center+Quaternion.Euler(0,i*15,0)*Vector3.forward*radius;p.y=Ground(p);if(!Clear(p))continue;int index=Index(p);positions[index]=p;free[index]=1;goals.Add(index);}
   // A character may be supported by a rock or a low floor above the terrain.
   // Sampling the terrain here would put the starting capsule inside that support.
   start.y = Mathf.Max(start.y, Ground(start));
   // During evacuation, the first edge can lead out of a tight starting position.
   // The remaining nodes and every edge still pass the collision and fire checks.
   positions[first]=start;free[first]=(byte)(j.evacuation||Clear(start)?1:2);
   if(free[first]!=1||goals.Count==0){LastFailure=free[first]!=1?"Construction start occupied":"No physically clear work point";j.planning=false;j.retry=Time.unscaledTime+5;yield break;}
   Vector3 Position(int n){if(free[n]==0){var p=origin+new Vector3(n%width*cell,0,n/width*cell);p.y=Ground(p);positions[n]=p;free[n]=(byte)(Clear(p)?1:2);}return positions[n];}
   var heap=new Heap();costs[first]=0;heap.Push(first,Mathf.Max(0,Vector3.Distance(start,center)-radius));int expanded=0,batch=0;
   while(heap.Count>0&&expanded<6500&&Valid(j))
   {
    if(c.cinematicDirector.IsPlaying||c.IncidentModal||c.MenhirActive||c.UserPaused){yield return null;continue;}
    if(budgetFrame!=Time.frameCount){budgetFrame=Time.frameCount;nodesThisFrame=0;}if(nodesThisFrame>=32){yield return null;continue;}nodesThisFrame++;
    int current=heap.Pop();if(closed[current])continue;expanded++;NodesExpanded++;
    if(goals.Contains(current))
    {
     if ((j.root.position - start).sqrMagnitude > .75f * .75f)
     {
      // Loading a save can restore the body while the search is yielding.
      j.planning = false;
      j.retry = Time.unscaledTime + .2f;
      yield break;
     }
     var reverse=new List<Vector3>();for(int n=current;n>=0;n=parents[n])reverse.Add(positions[n]);reverse.Reverse();j.route=reverse.ToArray();j.index=1;j.planning=false;if(!j.evacuation)village.AssignPhysicalWorkPoint(j.id,j.route[j.route.Length-1]);RoutesFound++;yield break;
    }
    closed[current]=true;int x=current%width,z=current/width;var from=Position(current);
    for(int dz=-1;dz<=1;dz++)for(int dx=-1;dx<=1;dx++)
    {
     if(dx==0&&dz==0||x+dx<0||x+dx>=width||z+dz<0||z+dz>=height)continue;int n=(z+dz)*width+x+dx;if(closed[n])continue;var to=Position(n);if(free[n]!=1||!Connect(from,to))continue;float cost=costs[current]+Vector3.Distance(from,to);if(cost>=costs[n])continue;costs[n]=cost;parents[n]=current;heap.Push(n,cost+Mathf.Max(0,Vector3.Distance(to,center)-radius));
    }
    if(++batch>=8){batch=0;yield return null;}
   }
   LastFailure="No connected physical construction route; nodes="+expanded;j.planning=false;j.retry=Time.unscaledTime+5;
  }
  void LateUpdate()
  {
   if(c==null||c.cinematicDirector.IsPlaying||c.IncidentModal||c.MenhirActive||c.UserPaused)return;
   foreach(var j in jobs.Values)
   {
    if(!Valid(j)||j.animator.GetComponent<CinematicActorV15>()?.Owned==true)continue;if(!j.body.enabled)j.body.enabled=true;var before=j.root.position;Vector3 direction=Vector3.zero;
    if(j.route!=null&&!j.arrived&&!Talking(j.actor))
    {
     while(j.index<j.route.Length){var d=j.route[j.index]-j.root.position;d.y=0;if(d.magnitude>.12f){direction=d.normalized;break;}j.index++;}
     if(j.index>=j.route.Length)j.arrived=true;
    }
    if(!VillageNavigation.HearthSafe(j.root.position+direction*.2f,j.body.radius)){direction=Vector3.zero;j.route=null;j.retry=Time.unscaledTime+.5f;}
    j.vertical=j.body.isGrounded?-2:Mathf.Max(-18,j.vertical-22*Time.deltaTime);j.body.Move((direction*(j.evacuation?1.65f:1.3f)+Vector3.up*j.vertical)*Time.deltaTime);j.velocity=(j.root.position-before)/Mathf.Max(.001f,Time.deltaTime);
    var horizontal=j.velocity;horizontal.y=0;
    if(direction.sqrMagnitude>.1f)
    {
     j.root.rotation=Quaternion.RotateTowards(j.root.rotation,Quaternion.LookRotation(direction),160*Time.deltaTime);VillageLife.Play(j.animator,"Locomotion");j.animator.SetFloat("Speed",horizontal.magnitude>.05f?.5f:0);j.animator.speed=Mathf.Clamp(horizontal.magnitude/1.8f,.35f,1.2f);
     j.blocked=horizontal.magnitude<.08f?j.blocked+Time.deltaTime:0;if(j.blocked>1.5f){j.blocked=0;j.route=null;j.retry=Time.unscaledTime+1;}
    }
    else if(!(j.animator.GetComponent<CinematicActorV15>()?.Owned??false)){if(!Talking(j.actor))VillageLife.Play(j.animator,"Listen");j.animator.SetFloat("Speed",0);j.animator.speed=1;}
   }
  }
  void OnDisable(){StopAllCoroutines();foreach(var j in jobs.Values)Release(j);jobs.Clear();}
  public void PrepareForFilm(){StopAllCoroutines();foreach(var j in jobs.Values)Release(j);jobs.Clear();}
 }
}
