using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 public sealed class CinematicProductionV15:MonoBehaviour
 {
  sealed class Actor
  {
   public CharacterBinding binding;public Transform root;public Vector3 position;public Quaternion rotation,visual;
   public NavMeshAgent agent;public bool agentEnabled,stopped,controllerEnabled,animatorEnabled;public CharacterController controller;
   public CinematicActorV15 player;public AnimationClip walk,run,motion,rest,currentClip;public FilmCueV15[] cues;public float speed,distance,local,fade,movement,motionTime;public Vector3 lastPosition;
   public readonly Dictionary<Behaviour,bool> behaviours=new Dictionary<Behaviour,bool>();
  }
  sealed class Route{public FilmBlockingV15 spec;public Vector3[] corners;public float length;}
  sealed class Prop{public FilmPropV15 spec;public Transform root,left,right,assistantLeft,assistantRight;public Vector3 start,end;public Quaternion rotation;public bool contact,released;public Rigidbody dropped;}
  readonly Dictionary<string,Actor> actors=new Dictionary<string,Actor>();readonly Dictionary<string,Route[]> routes=new Dictionary<string,Route[]>();readonly Dictionary<string,Prop> props=new Dictionary<string,Prop>();
  readonly Dictionary<string,string> roles=new Dictionary<string,string>();readonly HashSet<int> events=new HashSet<int>();readonly List<GameObject> temporary=new List<GameObject>();
  readonly Dictionary<FilmContactV15,Transform> bodyContacts=new Dictionary<FilmContactV15,Transform>();
  readonly RaycastHit[] cameraHits=new RaycastHit[32];Renderer[] occluders=Array.Empty<Renderer>();
  CampaignRuntime campaign;CinematicStage stage;FilmV15 film;int cameraShot=-1;float cameraAngle,previousTime,fadeAt;Quaternion shotSpace;AudioSource sound;Vector3 originalAnimal;Quaternion originalAnimalRotation;bool owned,finishing;CinematicConstructionV15 construction;
  readonly List<Renderer> faded=new List<Renderer>();readonly HashSet<Renderer> foliage=new HashSet<Renderer>();readonly HashSet<Collider> foliageColliders=new HashSet<Collider>();Light fill;CinematicWildlifeV15 wildlife;CinematicWeatherV15 weather;bool movingHerd;Transform incidentSite;
  public int PathFailures{get;private set;}public int ContactFrames{get;private set;}public float MaxHandGap{get;private set;}public float MaxHandGapAt{get;private set;}public string MaxHandGapProp{get;private set;}public string FilmId=>film?.id??"";
  public IReadOnlyDictionary<string,string> CurrentClips=>actors.Where(a=>a.Value.player!=null).ToDictionary(a=>a.Key,a=>a.Value.player.ClipId);
  string Role(string id)=>id!=null&&roles.TryGetValue(id,out var value)?value:id;
  Transform World(string id)
  {
   if(string.IsNullOrEmpty(id))return null;if(id[0]=='@')return props.TryGetValue(id.Substring(1),out var prop)?prop.root:null;
   if(id=="charpente"&&incidentSite!=null)return incidentSite;
   id=Role(id);if(id=="mammoth")return stage.mammoth;return campaign.bindings.Find(id);
  }
  Vector3 Point(string id)=>World(id)?.position??campaign.bindings.Find(film.site)?.position??campaign.bindings.player.position;
  bool Alive(string id)=>campaign.State.characters.FirstOrDefault(c=>c.id==id)?.alive??true;
  public string Speaker(string speaker){var character=campaign.Data.characters.FirstOrDefault(c=>c.name==speaker);return character==null?speaker:campaign.CharacterName(Role(character.id));}
  public string Subtitle(string text)=>film.id=="F15_C08"&&!campaign.HasFlag("verified:M_V_ABRI")&&text.Contains("structure est vérifiée")?"Les travaux sont posés. Termine le contrôle avant de rouvrir les habitations.":text;
  public void Begin(string id,CinematicStage source)
  {
   if(owned)End(false);stage=source;campaign=source.campaign;film=CinematicCatalogueV15.Find(CinematicCatalogueV15.Resolve(id,campaign));if(film==null)throw new InvalidOperationException("No authored film: "+id);
   campaign.GetComponent<CinematicPerformanceV15>()?.StopAll();
   owned=true;finishing=false;PathFailures=ContactFrames=0;MaxHandGap=MaxHandGapAt=0;MaxHandGapProp="";cameraShot=-1;previousTime=0;events.Clear();roles.Clear();actors.Clear();routes.Clear();props.Clear();temporary.Clear();
   incidentSite=null;var blocks=new List<FilmBlockingV15>(film.blocking);
   if(film.id=="F15_C12"&&campaign.State.accidents.Count>0)
   {
    var incident=campaign.State.accidents.LastOrDefault(a=>!a.playerAttempt)??campaign.State.accidents.Last();var marker=new GameObject("Lieu réel de l’enquête");marker.transform.position=incident.position;incidentSite=marker.transform;temporary.Add(marker);
    string[] ids={"mathilde","georges","lorette","dylan","mathieu"};Vector3[] offsets={new Vector3(-.8f,0,-1),new Vector3(1.3f,0,-2),new Vector3(-2,0,-2),new Vector3(-1.6f,0,-2.4f),new Vector3(-2.4f,0,-2.4f)};for(int i=0;i<ids.Length;i++)blocks.Add(new FilmBlockingV15{actor=ids[i],site="charpente",offset=offsets[i],start=0,end=2+i*1.5f});
   }
   var required=new HashSet<string>(film.cues.Select(c=>c.actor).Concat(film.blocking.Select(b=>b.actor)));
   foreach(var requested in required)if(!Alive(requested)){string substitute=new[]{"tarek","uma","lorette","neila","mathilde","kora","varg"}.FirstOrDefault(a=>Alive(a)&&!required.Contains(a)&&!roles.ContainsValue(a));if(substitute!=null)roles[requested]=substitute;}
   foreach(var binding in campaign.bindings.characters)
   {
    var root=campaign.bindings.Find(binding.id);if(root==null||binding.animator==null||binding.meshyActor==null||!Alive(binding.id)||!binding.meshyActor.activeInHierarchy)continue;
    if(campaign.State.cinematicTimeV15>0){var saved=campaign.State.cinematicActorsV15?.Find(s=>s.id==binding.id);if(saved!=null)root.SetPositionAndRotation(saved.position,saved.rotation);}
    var a=new Actor{binding=binding,root=root,position=root.position,rotation=root.rotation,visual=binding.meshyActor.transform.localRotation,agent=root.GetComponent<NavMeshAgent>(),controller=root.GetComponent<CharacterController>(),speed=binding.animator.speed,lastPosition=root.position,animatorEnabled=binding.animator.enabled};actors[binding.id]=a;
    if(a.agent!=null){a.agentEnabled=a.agent.enabled;a.stopped=a.agent.enabled&&a.agent.isOnNavMesh&&a.agent.isStopped;if(a.agent.enabled&&a.agent.isOnNavMesh)a.agent.isStopped=true;a.agent.enabled=false;}
    if(a.controller!=null){a.controllerEnabled=a.controller.enabled;a.controller.enabled=false;}
    foreach(var component in root.GetComponents<Behaviour>())if(component is VillagerBrain||component is VillagerCollisionMotor||component is ThirdPersonMotor){a.behaviours[component]=component.enabled;component.enabled=false;}
    a.cues=film.cues.Where(c=>Role(c.actor)==binding.id).OrderBy(c=>c.start).ToArray();
    if(a.cues.Length>0||blocks.Any(b=>Role(b.actor)==binding.id))
    {
     binding.meshyActor.transform.localRotation=Quaternion.identity;
     var clips=binding.animator.runtimeAnimatorController.animationClips;a.walk=clips.FirstOrDefault(c=>c.name=="Basic_Walk")??clips.FirstOrDefault(c=>c.name.ToLowerInvariant().Contains("walk"));a.run=clips.FirstOrDefault(c=>c.name=="Movement_Run")??a.walk;a.rest=clips.FirstOrDefault(c=>c.name.Contains("Stand_Listen"))??clips[0];
     a.player=binding.animator.GetComponent<CinematicActorV15>()??binding.animator.gameObject.AddComponent<CinematicActorV15>();a.player.Acquire(binding.animator);
     foreach(var cue in a.cues)if(CinematicCatalogueV15.Clip(cue.clip)==null)throw new InvalidOperationException("Missing scene clip: "+cue.clip);
    }
    else{binding.animator.speed=0;binding.animator.enabled=false;}
   }
   if(film.id=="F15_C08"){construction=new CinematicConstructionV15();construction.Begin(campaign);}else construction=null;
   Physics.SyncTransforms();
   foreach(var group in blocks.GroupBy(b=>Role(b.actor)))
   {
    if(!actors.TryGetValue(group.Key,out var actor))continue;var list=new List<Route>();Vector3 from=actor.position;
    foreach(var block in group.OrderBy(b=>b.start))
    {
     if(block.end<=campaign.State.cinematicTimeV15)continue;
     var timing=new FilmBlockingV15{actor=block.actor,site=block.site,offset=block.offset,start=Mathf.Max(block.start,campaign.State.cinematicTimeV15),end=block.end};
     var target=Point(block.site)+block.offset;target.y=HutCollapse.TerrainFloor(target)+.04f;
    if(VillageNavigation.Plan(from,target,actor.root,out var path,12,0,6))
     {var corners=new[]{from}.Concat(path.corners).ToArray();float length=0;for(int i=1;i<corners.Length;i++)length+=Vector3.Distance(corners[i-1],corners[i]);list.Add(new Route{spec=timing,corners=corners,length=length});from=corners[corners.Length-1];}
     else if(CinematicPhysicalRouteV15.Try(from,target,actor.root,out var physical)){list.Add(new Route{spec=timing,corners=physical,length=Length(physical)});from=physical[physical.Length-1];}
     else{PathFailures++;Debug.LogWarning("Film "+film.id+": safe route unavailable for "+block.actor+" from "+from+" to "+block.site+" at "+target);}
    }
    routes[group.Key]=list.ToArray();
   }
   foreach(var spec in film.props)CreateProp(spec);
   bodyContacts.Clear();foreach(var contact in film.contacts??Array.Empty<FilmContactV15>())if(actors.TryGetValue(Role(contact.target),out var subject)&&Enum.TryParse<HumanBodyBones>(contact.bone,out var bone))
   {var anchor=new GameObject("Contact de jeu · "+contact.actor+" → "+contact.target).transform;anchor.SetParent(subject.binding.animator.GetBoneTransform(bone),false);anchor.localPosition=contact.offset;bodyContacts[contact]=anchor;temporary.Add(anchor.gameObject);}
   var scenery=FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.enabled).ToArray();occluders=scenery.Where(r=>r.bounds.size.y>2.2f).Cast<Renderer>().ToArray();
   foliage.Clear();foliageColliders.Clear();foreach(var renderer in scenery)if(renderer.bounds.size.y>.35f)
   {
    bool plant=renderer.name.StartsWith("tree-palm",StringComparison.OrdinalIgnoreCase)||renderer.bounds.size.y<3.5f&&renderer.name.StartsWith("tree-",StringComparison.OrdinalIgnoreCase);foreach(var material in renderer.sharedMaterials)plant|=material!=null&&material.HasProperty("_WindStrength")&&material.GetFloat("_WindStrength")>.01f;if(!plant)continue;
    foliage.Add(renderer);var collider=renderer.GetComponentInParent<Collider>();if(collider!=null&&!(collider is TerrainCollider)&&collider.bounds.size.magnitude<renderer.bounds.size.magnitude*2)foliageColliders.Add(collider);
   }
   wildlife=GetComponent<CinematicWildlifeV15>()??gameObject.AddComponent<CinematicWildlifeV15>();wildlife.Ensure(campaign,stage.mammoth);movingHerd=false;
   weather=GetComponent<CinematicWeatherV15>()??gameObject.AddComponent<CinematicWeatherV15>();weather.Begin(campaign);
   if(sound==null){var emitter=new GameObject("Foley des scènes V15");emitter.transform.SetParent(transform,false);sound=emitter.AddComponent<AudioSource>();sound.playOnAwake=false;}sound.spatialBlend=1;sound.minDistance=2;sound.maxDistance=35;
   if(fill==null){var go=new GameObject("Lumière douce de réalisation");go.transform.SetParent(campaign.cinematicDirector.cinematicCamera.transform,false);go.transform.localPosition=new Vector3(-.65f,.75f,0);fill=go.AddComponent<Light>();fill.type=LightType.Spot;fill.range=15;fill.spotAngle=85;fill.shadows=LightShadows.None;RenderBackend.PortraitLight(fill);fill.intensity*=1.8f;fill.cullingMask=campaign.cinematicDirector.cinematicCamera.cullingMask;}
   fill.color=film.mood=="accident"||film.mood=="tension"?new Color(.8f,.87f,1):new Color(1,.92f,.82f);fill.enabled=true;
  }
  public IEnumerator PrepareEntry(Camera camera,Func<bool> skip)
  {
   if(campaign.State.cinematicTimeV15>0)yield break;
   var staged=new List<(Actor actor,Route route,float moved,float needed)>();
   foreach(var pair in routes)
   {
    if(pair.Value.Length==0)continue;var route=pair.Value[0];if(route.spec.start>.01f)continue;
    float needed=Mathf.Max(0,route.length-(route.spec.end-route.spec.start)*2.8f);
    if(needed>.05f)staged.Add((actors[pair.Key],route,0,needed));
   }
   while(staged.Count>0&&!skip())
   {
    if(campaign.UserPaused){yield return null;continue;}
    for(int i=staged.Count-1;i>=0;i--)
    {
     var entry=staged[i];entry.moved=Mathf.Min(entry.needed,entry.moved+Time.deltaTime*3.2f);var p=Along(entry.route,entry.moved/Mathf.Max(.01f,entry.route.length),out var tangent);p.y=HutCollapse.TerrainFloor(p)+.04f;entry.actor.root.position=p;tangent.y=0;
     if(tangent.sqrMagnitude>.001f)entry.actor.root.rotation=Quaternion.Slerp(entry.actor.root.rotation,Quaternion.LookRotation(tangent),1-Mathf.Exp(-Time.deltaTime*7));
     entry.actor.player.Look(p+tangent*3+Vector3.up*1.5f,.35f);entry.actor.player.Sample(entry.actor.rest,.3f,1,entry.actor.run,entry.moved/4.3f,1);
     if(entry.moved>=entry.needed)
     {
      var remainder=new List<Vector3>{p};float consumed=entry.moved;for(int n=1;n<entry.route.corners.Length;n++){float length=Vector3.Distance(entry.route.corners[n-1],entry.route.corners[n]);if(consumed<length){for(int k=n;k<entry.route.corners.Length;k++)remainder.Add(entry.route.corners[k]);break;}consumed-=length;}entry.route.corners=remainder.ToArray();entry.route.length=Length(entry.route.corners);entry.actor.lastPosition=p;entry.actor.distance=entry.moved;staged.RemoveAt(i);
     }
     else staged[i]=entry;
    }
    FrameCamera(0,camera);yield return null;
   }
  }
  static float Length(Vector3[] points){float result=0;for(int i=1;i<points.Length;i++)result+=Vector3.Distance(points[i-1],points[i]);return result;}
  public void CaptureActors()
  {
   if(!owned)return;var saved=campaign.State.cinematicActorsV15??=new List<FilmActorStateV15>();saved.Clear();foreach(var a in actors.Values)saved.Add(new FilmActorStateV15{id=a.binding.id,position=a.root.position,rotation=a.root.rotation});
  }
  void CreateProp(FilmPropV15 spec)
  {
   if(!actors.ContainsKey(Role(spec.actor)))return;
   var accident=campaign.GetComponent<AccidentDirector>();Mesh mesh=null;Material material=accident.woodMaterial;
   if(spec.id=="shared-beam"&&construction?.Beam!=null)mesh=construction.Beam.root.GetComponent<MeshFilter>().sharedMesh;
   else if(spec.kind=="beam"||spec.kind=="staff")mesh=stage.fallingFrame?.GetComponentInChildren<HutCollapse>()?.pieces.FirstOrDefault(p=>p.kind==2)?.root.GetComponent<MeshFilter>()?.sharedMesh;
   var go=new GameObject(film.id+" · "+spec.id);GameObject visual;if(mesh==null){visual=GameObject.CreatePrimitive(PrimitiveType.Cube);Destroy(visual.GetComponent<Collider>());}else{visual=new GameObject("Géométrie source");visual.AddComponent<MeshFilter>().sharedMesh=mesh;visual.AddComponent<MeshRenderer>();}
   visual.transform.SetParent(go.transform,false);visual.GetComponent<MeshRenderer>().sharedMaterial=material;
   CinematicPropShapeV15.Fit(visual.transform,mesh,spec.id=="shared-beam"&&construction?.Beam!=null?Vector3.Scale(mesh.bounds.size,construction.Beam.root.lossyScale):spec.size);
   Vector3 p=Point(spec.site)+spec.offset;go.transform.position=p;var end=Point(spec.destination)+spec.finalOffset;
   var prop=new Prop{spec=spec,root=go.transform,start=p,end=end,rotation=go.transform.rotation};
   var l=new GameObject("Prise main gauche").transform;l.SetParent(go.transform,false);var r=new GameObject("Prise main droite").transform;r.SetParent(go.transform,false);
   // Grip spacing stays in world units, independently of the recovered mesh's source scale.
   bool shared=!string.IsNullOrEmpty(spec.assistant);l.position=p+Vector3.right*(shared?spec.size.x*.34f:-Mathf.Min(.27f,spec.size.x*.32f));r.position=p+Vector3.right*(shared?spec.size.x*.46f:Mathf.Min(.27f,spec.size.x*.32f));prop.left=l;prop.right=r;
   if(shared){var al=new GameObject("Prise second bâtisseur gauche").transform;al.SetParent(go.transform,false);al.position=p-Vector3.right*spec.size.x*.46f;var ar=new GameObject("Prise second bâtisseur droite").transform;ar.SetParent(go.transform,false);ar.position=p-Vector3.right*spec.size.x*.34f;prop.assistantLeft=al;prop.assistantRight=ar;}
   props[spec.id]=prop;temporary.Add(go);
  }
  public void Evaluate(float time,Camera camera)
  {
   if(!owned)return;float dt=Mathf.Max(0,time-previousTime);previousTime=time;construction?.Evaluate(time);
   foreach(var actor in actors.Values)
   {
    if(actor.player==null)continue;float movement=0;
    if(routes.TryGetValue(actor.binding.id,out var list))foreach(var route in list)
    {
     if(time<route.spec.start)break;float u=Mathf.Clamp01((time-route.spec.start)/Mathf.Max(.01f,route.spec.end-route.spec.start));float smooth=u*u*(3-2*u);var position=Along(route,smooth,out var tangent);position.y=HutCollapse.TerrainFloor(position)+.04f;actor.root.position=position;
     if(u>0&&u<1){tangent.y=0;if(tangent.sqrMagnitude>.001f)actor.root.rotation=Quaternion.Slerp(actor.root.rotation,Quaternion.LookRotation(tangent),1-Mathf.Exp(-dt*7));movement=Mathf.Clamp01(Mathf.Min(u,1-u)*9);}else movement=0;
    }
    float moved=Vector3.Distance(actor.lastPosition,actor.root.position);actor.distance+=moved;actor.lastPosition=actor.root.position;actor.motion=dt>.0001f&&moved/dt>2.8f?actor.run:actor.walk;float stride=actor.motion==null?1:actor.motion.averageSpeed.magnitude;if(stride<.3f)stride=actor.motion==actor.run?4.3f:1.8f;actor.motionTime=actor.distance/stride;
    FilmCueV15 cue=null;foreach(var candidate in actor.cues){if(time<candidate.start)break;cue=candidate;}
    var clip=cue==null?actor.rest:CinematicCatalogueV15.Clip(cue.clip);float local=cue==null?Mathf.Min(.35f,clip.length):Mathf.Clamp(time-cue.start,0,cue.duration-.001f);float fade=cue==null?1:Mathf.SmoothStep(0,1,(time-cue.start)/.22f);
    string looking=cue?.lookAt??film.site;var target=Point(looking);if(actors.ContainsKey(Role(looking)))target+=Vector3.up*1.55f;else if(!looking.StartsWith("@"))target+=Vector3.up*.8f;
    if(movement<.1f){var facing=(string.IsNullOrEmpty(cue?.faceTo)?target:Point(cue.faceTo))-actor.root.position;facing.y=0;if(facing.sqrMagnitude>.1f)actor.root.rotation=Quaternion.Slerp(actor.root.rotation,Quaternion.LookRotation(facing),1-Mathf.Exp(-dt*2.6f));}
    actor.player.Look(target,Mathf.Min(.78f,fade));actor.player.Contact(null,null,0);
    actor.currentClip=clip;actor.local=local;actor.fade=fade;actor.movement=movement;actor.player.Sample(clip,local,fade,actor.motion,actor.motionTime,movement);
   }
   foreach(var prop in props.Values)UpdateProp(prop,time);
   foreach(var pair in bodyContacts)
   {
    var cue=pair.Key;if(time<cue.start||time>cue.end||!actors.TryGetValue(Role(cue.actor),out var actor))continue;float weight=Mathf.SmoothStep(0,1,(time-cue.start)/.4f)*(1-Mathf.SmoothStep(0,1,(time-cue.end+.4f)/.4f));actor.player.Contact(cue.hand=="Left"?pair.Value:null,cue.hand=="Right"?pair.Value:null,weight);
   }
   // Contact constraints are evaluated after both the carrier and the object have advanced.
   foreach(var actor in actors.Values)if(actor.player!=null&&actor.player.HandWeight>.001f)actor.player.Sample(actor.currentClip,actor.local,actor.fade,actor.motion,actor.motionTime,actor.movement);
   foreach(var prop in props.Values)if(prop.contact&&actors.TryGetValue(Role(prop.spec.actor),out var carrier)){bool book=prop.spec.kind=="notebook"||prop.spec.kind=="map"||prop.spec.kind=="tablet";var a=carrier.binding.animator;float gap=Vector3.Distance(a.GetBoneTransform(book?HumanBodyBones.LeftHand:HumanBodyBones.RightHand).position,book?prop.left.position:prop.right.position);if(gap>MaxHandGap){MaxHandGap=gap;MaxHandGapAt=time;MaxHandGapProp=prop.spec.id;}}
   for(int i=0;i<film.events.Length;i++)if(!events.Contains(i)&&film.events[i].at<=time){events.Add(i);ApplyEvent(film.events[i],finishing);}
   if(movingHerd)wildlife.Tick(time,dt);FrameCamera(time,camera);
  }
  static Vector3 Along(Route route,float u,out Vector3 tangent)
  {
   float at=route.length*u;tangent=Vector3.forward;for(int i=1;i<route.corners.Length;i++){var d=route.corners[i]-route.corners[i-1];float length=d.magnitude;if(length<.001f)continue;tangent=d/length;if(at<=length)return route.corners[i-1]+tangent*at;at-=length;}return route.corners[route.corners.Length-1];
  }
  void UpdateProp(Prop p,float time)
  {
   var spec=p.spec;var carrier=actors[Role(spec.actor)];bool held=time>=spec.pickup&&time<spec.release;float grip=Mathf.SmoothStep(0,1,(time-spec.pickup)/(string.IsNullOrEmpty(spec.assistant)?.75f:1.5f))*(1-Mathf.SmoothStep(0,1,(time-spec.release+.65f)/.65f));
   bool personal=spec.destination==spec.actor&&(spec.kind=="notebook"||spec.kind=="map"||spec.kind=="tablet"||spec.kind=="staff"||spec.kind=="tool");bool drop=spec.kind=="beam"&&spec.finalOffset.y<.4f;
   if(!p.released&&time>=spec.release){p.released=true;p.end=personal?carrier.root.TransformPoint(spec.offset):spec.id=="shared-beam"&&construction?.Beam!=null?construction.BeamPosition:Point(spec.destination)+spec.finalOffset;if(drop){if(spec.destination==spec.actor)p.end+=carrier.root.forward*.6f;if(finishing)p.root.position=p.end;var collider=p.root.gameObject.AddComponent<BoxCollider>();collider.size=spec.size;p.dropped=p.root.gameObject.AddComponent<Rigidbody>();p.dropped.mass=4;var impact=p.root.gameObject.AddComponent<CinematicImpactV15>();impact.clip=campaign.GetComponent<AccidentDirector>().impact;}}
   else if(!p.released)p.end=personal?carrier.root.TransformPoint(spec.offset):spec.id=="shared-beam"&&construction?.Beam!=null?construction.BeamPosition:Point(spec.destination)+spec.finalOffset;
   if(time<spec.pickup){if(spec.site==spec.actor){p.start=carrier.root.TransformPoint(spec.offset);p.rotation=carrier.root.rotation;}p.root.position=p.start;p.root.rotation=p.rotation;}
   else if(held)
   {
    if(personal){p.start=carrier.root.TransformPoint(spec.offset);p.rotation=carrier.root.rotation;}
    var animator=carrier.binding.animator;var leftHand=animator.GetBoneTransform(HumanBodyBones.LeftHand);var rightHand=animator.GetBoneTransform(HumanBodyBones.RightHand);bool book=spec.kind=="notebook"||spec.kind=="map"||spec.kind=="tablet";bool single=spec.kind=="tool"||spec.kind=="staff";
    // A stable actor-space target avoids feeding the last IK result back into its own constraint.
    var chest=animator.GetBoneTransform(HumanBodyBones.Chest).position;Vector3 hold=chest+Vector3.down*.18f+carrier.root.forward*(book?.36f:.4f)+(single?carrier.root.right*.25f:Vector3.zero);
    Quaternion orientation=carrier.root.rotation;
    if(!string.IsNullOrEmpty(spec.assistant)&&actors.TryGetValue(Role(spec.assistant),out var assistant)){hold=(carrier.root.position+assistant.root.position)*.5f+(carrier.root.forward+assistant.root.forward)*.175f;hold.y=(chest.y+assistant.binding.animator.GetBoneTransform(HumanBodyBones.Chest).position.y)*.5f-.18f;var axis=carrier.root.position-assistant.root.position;axis.y=0;if(axis.sqrMagnitude>.01f)orientation=Quaternion.FromToRotation(Vector3.right,axis.normalized);assistant.player?.Contact(p.assistantLeft,p.assistantRight,grip);}
    float lift=Mathf.SmoothStep(0,1,(time-spec.pickup)/(string.IsNullOrEmpty(spec.assistant)?.8f:1.8f));Vector3 destination=p.end;float lower=drop?0:Mathf.SmoothStep(0,1,(time-spec.release+.65f)/.65f);
    p.root.position=Vector3.Lerp(Vector3.Lerp(p.start,hold,lift),destination,lower);p.root.rotation=Quaternion.Slerp(p.rotation,orientation,Mathf.Min(lift,.8f));
   }
   else if(p.dropped==null)p.root.position=p.end;
   bool oneHand=spec.kind=="tool"||spec.kind=="staff";bool leftOnly=spec.kind=="notebook"||spec.kind=="map"||spec.kind=="tablet";
   if(oneHand)p.right.position=p.root.position;
   carrier.player?.Contact(oneHand?null:p.left,leftOnly?null:p.right,grip);
   p.contact=held&&grip>.9f;if(held)ContactFrames++;
  }
  void ApplyEvent(FilmEventV15 cue,bool skipping)
  {
   var receipts=campaign.State.cinematicCueReceiptsV15??=new List<string>();string receipt=campaign.State.activeCinematicId+":"+film.id+":"+cue.kind+":"+cue.at.ToString("R",System.Globalization.CultureInfo.InvariantCulture);bool repeated=receipts.Contains(receipt);if(!repeated)receipts.Add(receipt);skipping|=repeated;
   var structure=stage.fallingFrame?.GetComponentInChildren<HutCollapse>();var accident=campaign.GetComponent<AccidentDirector>();
   switch(cue.kind)
   {
    case "collapse":if(structure!=null&&!structure.Broken)structure.BeginFailure("Rupture d’un assemblage non vérifié.");if(skipping)structure?.CompleteSkipped();break;
    case "approvedHousing":if(campaign.State.completedActions.Contains("WORK_M_V_ABRI"))foreach(var hut in FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).Where(h=>h.site=="habitations")){hut.Reinforce();if(campaign.HasFlag("verified:M_V_ABRI")&&campaign.Value("risk","abri")==0)hut.Repair();}break;
    case "uncontrolledIncident":if(campaign.State.risks.Any(r=>r.value>=2))Fragment(Point(cue.target)+Vector3.up*1.8f,true);break;
    case "chip":case "bankFragment":case "flint":if(!skipping)Fragment(Point(cue.target)+Vector3.up*(cue.kind=="bankFragment"?.3f:1.6f),cue.kind!="flint");break;
    case "herd":movingHerd=true;wildlife.BeginTake();break;
    case "herdAlert":movingHerd=true;wildlife.BeginTake();wildlife.Alert();break;
    case "wind":if(!skipping)weather.Wind();break;
    case "rain":if(!skipping)weather.Rain(Point(film.site));break;
    case "ember":case "emberSafe":if(!skipping)weather.Ember(Point(cue.target),cue.kind=="emberSafe");break;
    case "navigation":campaign.GetComponent<QuestNavigationController>()?.ForceRefresh();break;
   }
   if(skipping)return;
   var clip=cue.sound=="crack"?accident.crack:cue.sound=="tool"?campaign.bindings.AnimatorFor("brok")?.GetComponent<NativeAnimationAudio>()?.tool:cue.sound=="water"?campaign.bindings.AnimatorFor("dylan")?.GetComponent<NativeAnimationAudio>()?.waterStep:null;
   if(clip!=null){sound.transform.position=Point(cue.target);sound.PlayOneShot(clip,.5f);}
  }
  void Fragment(Vector3 position,bool stone)
  {
   var accident=campaign.GetComponent<AccidentDirector>();var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name="Fragment au contact physique · "+film.id;go.transform.position=position;go.transform.localScale=stone?new Vector3(.12f,.08f,.1f):new Vector3(.09f,.03f,.06f);go.GetComponent<Renderer>().sharedMaterial=stone?accident.stoneMaterial:accident.woodMaterial;var rb=go.AddComponent<Rigidbody>();rb.mass=.18f;rb.linearVelocity=stone?new Vector3(.15f,0,.1f):new Vector3(2,.8f,1);var impact=go.AddComponent<CinematicImpactV15>();impact.clip=accident.impact;temporary.Add(go);
  }
  void FrameCamera(float t,Camera camera)
  {
   int index=0;while(index+1<film.shots.Length&&t>=film.shots[index].end)index++;var shot=film.shots[index];float u=Mathf.SmoothStep(0,1,Mathf.InverseLerp(shot.start,shot.end,t));var target=Point(shot.focus)+Vector3.up*shot.height+shot.lookOffset;
   if(shot.focus.StartsWith("@"))target=Point(shot.focus)+shot.lookOffset;
   if(!string.IsNullOrEmpty(shot.second)&&Vector3.Distance(Point(shot.second),Point(shot.focus))<5)target=Vector3.Lerp(target,Point(shot.second)+Vector3.up*shot.height,.35f);
   var offset=Vector3.Lerp(shot.from,shot.to,u);
   if(cameraShot!=index)
   {
    foreach(var renderer in faded)if(renderer!=null)renderer.forceRenderingOff=false;faded.Clear();fadeAt=0;
    cameraShot=index;cameraAngle=0;float best=-1;shotSpace=Quaternion.identity;
    if(actors.TryGetValue(Role(shot.focus),out var portrait))
    {
     var performance=portrait.cues.LastOrDefault(c=>c.start<=Mathf.Lerp(shot.start,shot.end,.5f))??portrait.cues.FirstOrDefault();string facing=!string.IsNullOrEmpty(performance?.faceTo)?performance.faceTo:!string.IsNullOrEmpty(performance?.lookAt)?performance.lookAt:film.site;
     if(facing.StartsWith("@"))facing=film.site;var direction=Point(facing)-portrait.root.position;direction.y=0;shotSpace=direction.sqrMagnitude>.1f?Quaternion.LookRotation(direction):portrait.root.rotation;
    }
    var searchOffset=actors.ContainsKey(Role(shot.focus))?shotSpace*new Vector3(offset.x,offset.y,Mathf.Abs(offset.z)):offset;
    foreach(float angle in new[]{0f,-20,20,-40,40,-65,65})
    {
     var candidate=Quaternion.Euler(0,angle,0)*searchOffset;float score=candidate.magnitude;var ray=new Ray(target,candidate.normalized);
     if(shot.focus.StartsWith("@")&&Mathf.Abs(angle)>35)continue;
     if(actors.ContainsKey(Role(shot.focus))&&Vector3.Dot(candidate.normalized,shotSpace*Vector3.forward)<.25f)continue;
     foreach(var renderer in occluders)if(renderer!=null&&!renderer.bounds.Contains(target)&&renderer.bounds.IntersectRay(ray,out float entry)&&entry>.45f&&entry<candidate.magnitude)score=Mathf.Min(score,entry);
     foreach(var extra in actors.Values)if(extra.binding.id!=Role(shot.focus)&&extra.binding.id!=Role(shot.second)){var bounds=new Bounds(extra.root.position+Vector3.up*.9f,new Vector3(.85f,1.8f,.85f));if(bounds.IntersectRay(ray,out float actorEntry)&&actorEntry>.25f&&actorEntry<candidate.magnitude)score=Mathf.Min(score,actorEntry);}
     score-=Mathf.Abs(angle)*.005f;if(score>best){best=score;cameraAngle=angle;}
    }
   }
   if(actors.ContainsKey(Role(shot.focus)))offset=shotSpace*new Vector3(offset.x,offset.y,Mathf.Abs(offset.z));
   offset=Quaternion.Euler(0,cameraAngle,0)*offset;float distance=offset.magnitude;int count=Physics.SphereCastNonAlloc(target,.18f,offset.normalized,cameraHits,distance,~0,QueryTriggerInteraction.Ignore);
   var focus=World(shot.focus);var second=World(shot.second);
   for(int i=0;i<count;i++){var hit=cameraHits[i];if(!foliageColliders.Contains(hit.collider)&&hit.distance>.8f&&(focus==null||!hit.transform.IsChildOf(focus))&&(second==null||!hit.transform.IsChildOf(second)))distance=Mathf.Min(distance,Mathf.Max(.55f,hit.distance-.2f));}
   Vector3 p=target+offset.normalized*distance;p.y=Mathf.Max(p.y,HutCollapse.TerrainFloor(p)+.35f);camera.transform.position=p;camera.transform.LookAt(target);camera.fieldOfView=shot.fov;
   if(t>=fadeAt){fadeAt=t+.2f;var ray=new Ray(p,(target-p).normalized);float range=Vector3.Distance(p,target);foreach(var renderer in foliage)if(renderer!=null&&!renderer.forceRenderingOff&&renderer.bounds.IntersectRay(ray,out float entry)&&entry<range-.2f){renderer.forceRenderingOff=true;faded.Add(renderer);}}
  }
  public void End(bool commit=true)
  {
   if(!owned)return;
   foreach(var renderer in faded)if(renderer!=null)renderer.forceRenderingOff=false;faded.Clear();
   if(commit){finishing=true;Evaluate(film.duration,campaign.cinematicDirector.cinematicCamera);}
   if(commit)for(int i=0;i<film.events.Length;i++)if(!events.Contains(i)){events.Add(i);ApplyEvent(film.events[i],true);}
   foreach(var actor in actors.Values)
   {
    actor.player?.Release();actor.binding.meshyActor.transform.localRotation=actor.visual;actor.binding.animator.speed=actor.speed;actor.binding.animator.enabled=actor.animatorEnabled;
    var carried=actor.binding.animator.GetComponent<CarriedLoad>();if(commit&&carried!=null&&props.Values.Any(p=>Role(p.spec.actor)==actor.binding.id&&p.dropped!=null)){carried.carrying=false;carried.ShowPresentation(false);}
    if(!commit)actor.root.SetPositionAndRotation(actor.position,actor.rotation);
    if(actor.controller!=null)actor.controller.enabled=actor.controllerEnabled;
    foreach(var pair in actor.behaviours)if(pair.Key!=null){pair.Key.enabled=pair.Value;if(pair.Key is CarriedLoad load){if(commit&&props.Values.Any(p=>Role(p.spec.actor)==actor.binding.id&&p.dropped!=null))load.carrying=false;load.ShowPresentation(true);}if(pair.Key is VillagerBrain brain)brain.ResumeAfterCinematic();}
    if(actor.agent!=null){actor.agent.enabled=actor.agentEnabled;if(actor.agent.enabled&&actor.agent.isOnNavMesh){actor.agent.Warp(actor.root.position);actor.agent.isStopped=actor.stopped;}}
   }
   if(commit&&film.events.Any(e=>e.kind=="collapse"))stage.fallingFrame?.GetComponentInChildren<HutCollapse>()?.CompleteSkipped();
   wildlife?.EndTake();weather?.End();construction?.End();construction=null;
   if(commit)foreach(var p in props.Values)if(p.dropped!=null||p.spec.persistent){if(p.dropped!=null){var box=p.root.GetComponent<BoxCollider>().bounds;float floor=HutCollapse.TerrainFloor(box.center);p.root.position+=Vector3.up*(floor+.01f-box.min.y);}CinematicWorldPropsV15.For(campaign).Store(film.id+":"+p.spec.id,p.spec.kind,p.spec.size,p.root.gameObject);temporary.Remove(p.root.gameObject);}
   if(fill!=null)fill.enabled=false;foreach(var renderer in faded)if(renderer!=null)renderer.forceRenderingOff=false;faded.Clear();foreach(var go in temporary)if(go!=null)Destroy(go);temporary.Clear();props.Clear();owned=false;campaign.GetComponent<VillageNavigation>()?.RequestRebuild();campaign.GetComponent<QuestNavigationController>()?.ForceRefresh();
  }
  void OnDisable()=>End(false);
 }
 public sealed class CinematicImpactV15:MonoBehaviour
 {
  public AudioClip clip;bool played;void OnCollisionEnter(Collision hit){if(played||hit.relativeVelocity.magnitude<.25f)return;played=true;if(clip!=null)AudioSource.PlayClipAtPoint(clip,hit.GetContact(0).point,.2f);}
 }
}
