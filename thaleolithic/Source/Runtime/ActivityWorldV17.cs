using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class ActivityWorldV17:MonoBehaviour
 {
  CampaignRuntime c;CampaignActivitiesV17 activity;CampaignSave observed;readonly Dictionary<string,GameObject> measures=new Dictionary<string,GameObject>();
  public RenderTexture Before{get;private set;}public RenderTexture Now{get;private set;}
  Camera painting;float refresh;bool paintingDirty=true;Vector3 initialAssembly;public int PaintingRenders{get;private set;}readonly Dictionary<string,Vector3> assembly=new Dictionary<string,Vector3>();
  readonly List<CharacterController> assemblyBodies=new List<CharacterController>();
  readonly HashSet<(CharacterController,CharacterController)> assemblyPairs=new HashSet<(CharacterController,CharacterController)>();
  readonly List<(CharacterController,CharacterController)> expiredAssemblyPairs=new List<(CharacterController,CharacterController)>();
  CharacterController playerBody;
  float nextAssemblyContacts;
  public string[] ExpectedResidentIds=>c.State.campaignV17.emergencyRosterPrepared?c.State.campaignV17.emergencyExpected.Where(id=>c.State.characters.Find(x=>x.id==id)?.alive==true).ToArray():c.State.characters.Where(x=>x.alive&&x.id!=c.Data.playerCharacterId).Select(x=>x.id).ToArray();
  public int ExpectedCount=>ExpectedResidentIds.Length+1;
  public int PresentCount=>ExpectedResidentIds.Count(AtAssembly)+(c.Near("rassemblement")?1:0);
  public string[] MissingResidentIds=>ExpectedResidentIds.Where(id=>!AtAssembly(id)).ToArray();
  public bool PreparingAssembly{get;private set;}
  void Start(){c=GetComponent<CampaignRuntime>();activity=GetComponent<CampaignActivitiesV17>();playerBody=c.bindings.player.GetComponent<CharacterController>();initialAssembly=c.bindings.Find("rassemblement").position;}
  void EnsurePainting()
  {
   if(painting!=null)return;var go=new GameObject("V17 · vues correspondantes du village réel");go.transform.SetParent(transform);painting=go.AddComponent<Camera>();painting.CopyFrom(c.bindings.gameplayCamera);painting.enabled=false;painting.orthographic=true;painting.orthographicSize=30;painting.aspect=1;painting.transform.position=c.bindings.Find("grand_menhir").position+new Vector3(0,45,-18);painting.transform.LookAt(c.bindings.Find("grand_menhir").position+Vector3.back*5);
   var data=go.AddComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>();data.renderShadows=false;
   Before=new RenderTexture(512,512,24);Now=new RenderTexture(512,512,24);
   if(!string.IsNullOrEmpty(c.State.campaignV17.beforePainting)){var saved=new Texture2D(2,2);saved.LoadImage(System.Convert.FromBase64String(c.State.campaignV17.beforePainting));var previous=RenderTexture.active;try{Graphics.Blit(saved,Before);}finally{RenderTexture.active=previous;Destroy(saved);}}
   else{RenderPainting(Before);var old=RenderTexture.active;RenderTexture.active=Before;var image=new Texture2D(512,512,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,512,512),0,0);image.Apply();c.State.campaignV17.beforePainting=System.Convert.ToBase64String(image.EncodeToPNG());Destroy(image);RenderTexture.active=old;}
   RenderPainting(Now);paintingDirty=false;
  }
  void RenderPainting(RenderTexture target){var previous=RenderTexture.active;try{UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(painting,new UnityEngine.Rendering.RenderPipeline.StandardRequest{destination=target});PaintingRenders++;}finally{RenderTexture.active=previous;}}
  public void InvalidatePainting(){paintingDirty=true;}
  public void RefreshPainting(){EnsurePainting();if(paintingDirty){RenderPainting(Now);paintingDirty=false;}}
  public Vector2 PaintingUv(string site){EnsurePainting();var target=c.bindings.Find(site);if(target==null)return Vector2.one*.5f;var p=painting.WorldToViewportPoint(target.position);return new Vector2(p.x,p.y);}
  public void ApplyMeasure(ActivityDefinitionV17 definition)
  {
   if(measures.ContainsKey(definition.id))return;var site=c.bindings.Find(definition.site);if(site==null)return;
   var root=new GameObject("Mesure réalisée · "+definition.id);root.transform.SetParent(transform);var p=site.position+new Vector3(2.3f,0,1.7f);p.y=VillageLife.Ground(p);root.transform.position=p;measures[definition.id]=root;
   string id=definition.risk=="stockage"?"TH18_Rack_Tier1":definition.risk=="chasse"?"TH18_Workbench_Tier1":"TH18_Fence_Tier1";
   var prefab=Resources.Load<GameObject>("VillageV18/Prefabs/"+id);if(prefab==null){Debug.LogError("Missing measure mesh "+id);return;}
   var go=Instantiate(prefab,root.transform);foreach(var f in go.GetComponentsInChildren<MeshFilter>())f.gameObject.AddComponent<MeshCollider>().sharedMesh=f.sharedMesh;
   c.GetComponent<MapWorldGeometry>()?.Register(root.transform);c.GetComponent<VillageNavigation>()?.RequestRebuild();
   paintingDirty=true;
  }
  public bool EvacuationDestination(string id,out Vector3 point)
  {
   point=Vector3.zero;if(!c.HasFlag("v17:alarm")&&(activity?.Current?.mode!="runner"||activity.CurrentProgress.card==0))return false;
   if(!assembly.TryGetValue(id,out point))
   {
    if(!ExpectedResidentIds.Contains(id)||PreparingAssembly)return false;
    var slots=AssemblySlots(c.bindings.Find("rassemblement").position);var people=ExpectedResidentIds.OrderBy(x=>x).ToArray();int index=System.Array.IndexOf(people,id);if(index<0||index>=slots.Count)return false;point=slots[index];assembly[id]=point;
   }return true;
  }
  public void PrepareEmergencyRoster()
  {
   ObserveState();var save=c.State.campaignV17;if(save.emergencyRosterPrepared){if(!save.emergencyAssemblySaved&&!PreparingAssembly)StartCoroutine(FindAssembly(c.State));return;}save.emergencyRosterPrepared=true;save.emergencyExpected.Clear();save.emergencyOutside.Clear();var center=c.bindings.Find("grand_menhir").position;
   foreach(var person in c.State.characters.Where(x=>x.alive&&x.id!=c.Data.playerCharacterId))
   {var actor=c.bindings.Find(person.id);if(actor==null)continue;var d=actor.position-center;d.y=0;(d.sqrMagnitude<=40*40?save.emergencyExpected:save.emergencyOutside).Add(person.id);}
   StartCoroutine(FindAssembly(c.State));
  }
  List<Vector3> AssemblySlots(Vector3 center)
  {
   var points=new List<Vector3>();var buffer=new Collider[32];
   for(float radius=1.1f;radius<=4.5f;radius+=1.1f)for(int i=0;i<28;i++)
   {
    var p=center+Quaternion.Euler(0,i*(360f/28),0)*Vector3.forward*radius;p.y=VillageLife.Ground(p);
    if(!VillageNavigation.HearthSafe(p,.4f)||points.Any(x=>(x-p).sqrMagnitude<.9f*.9f))continue;
    int count=Physics.OverlapCapsuleNonAlloc(p+Vector3.up*.38f,p+Vector3.up*1.5f,.34f,buffer,~0,QueryTriggerInteraction.Ignore);bool clear=count<buffer.Length;
    for(int hit=0;hit<count&&clear;hit++){var col=buffer[hit];if(!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<UnityEngine.AI.NavMeshAgent>()==null&&col.bounds.max.y>p.y+.2f)clear=false;}
    if(clear&&VillageNavigation.SegmentClear(center,p,c.bindings.player))points.Add(p);
   }return points;
  }
  System.Collections.IEnumerator FindAssembly(CampaignSave save)
  {
   PreparingAssembly=true;var marker=c.bindings.Find("rassemblement");var original=marker.position;Vector3 best=original;int found=0;var slots=new List<Vector3>();
   for(float radius=0;radius<=12&&c.State==save&&found<save.campaignV17.emergencyExpected.Count+2;radius+=3)for(int i=0;i<(radius==0?1:12);i++)
   {
    var center=original+Quaternion.Euler(0,i*30,0)*Vector3.forward*radius;center.y=VillageLife.Ground(center);var sample=AssemblySlots(center);
    if(sample.Count>found){found=sample.Count;best=center;slots=sample;}if(found>=save.campaignV17.emergencyExpected.Count+2)break;yield return null;
   }
   if(c.State!=save){PreparingAssembly=false;yield break;}marker.position=best;save.campaignV17.emergencyAssemblyPoint=best;save.campaignV17.emergencyAssemblySaved=true;assembly.Clear();var ids=ExpectedResidentIds.OrderBy(x=>x).ToArray();for(int i=0;i<Mathf.Min(ids.Length,slots.Count);i++)assembly[ids[i]]=slots[i];PreparingAssembly=false;c.GetComponent<QuestNavigationController>()?.ForceRefresh();c.Save();
  }
  public bool AtAssembly(string id)
  {var actor=c.bindings.Find(id);var center=c.bindings.Find("rassemblement");return actor!=null&&center!=null&&Vector3.Distance(actor.position,center.position)<5.7f;}
  public bool AllAtAssembly(string[] expected)=>expected.All(AtAssembly);
  void ObserveState()
  {
   if(observed==c.State)return;
   StopAllCoroutines();PreparingAssembly=false;observed=c.State;assembly.Clear();c.bindings.Find("rassemblement").position=c.State.campaignV17.emergencyAssemblySaved?c.State.campaignV17.emergencyAssemblyPoint:initialAssembly;foreach(var go in measures.Values)if(go!=null)Destroy(go);measures.Clear();
   if(painting!=null){Destroy(painting.gameObject);painting=null;}if(Before!=null){Before.Release();Destroy(Before);}if(Now!=null){Now.Release();Destroy(Now);}Before=Now=null;
   foreach(var a in c.ActivitiesV17.activities.Where(a=>a.mode=="risk"&&activity.Progress(a.id)?.worked==true))ApplyMeasure(a);
  }
  void RefreshAssemblyContacts()
  {
   if(Time.unscaledTime<nextAssemblyContacts)return;
   nextAssemblyContacts=Time.unscaledTime+.2f;
   var state=c.State.campaignV17;
   bool alarm=c.HasFlag("v17:alarm");
   var marker=c.bindings.Find("rassemblement");
   bool playerInCrowd=playerBody!=null&&state.emergencyRosterPrepared&&marker!=null&&
    (alarm||c.State.completedActions.Contains("V17_EVACUATION"))&&
    (playerBody.transform.position-marker.position).sqrMagnitude<=8f*8f;
   if(!alarm&&!playerInCrowd&&assemblyPairs.Count==0)return;

   assemblyBodies.Clear();
   if(alarm||playerInCrowd)
    foreach(string id in state.emergencyExpected)
    {
     var body=c.bindings.Find(id)?.GetComponent<CharacterController>();
     if(body!=null&&body.enabled&&body.gameObject.activeInHierarchy)assemblyBodies.Add(body);
    }

   expiredAssemblyPairs.Clear();
   foreach(var pair in assemblyPairs)
   {
    var (first,second)=pair;
    bool keep=assemblyBodies.Contains(second)&&(first==playerBody?playerInCrowd:alarm&&assemblyBodies.Contains(first));
    if(!keep)
    {
     RestoreAssemblyContact(first,second);
     expiredAssemblyPairs.Add(pair);
    }
   }
   foreach(var pair in expiredAssemblyPairs)assemblyPairs.Remove(pair);

   for(int i=0;i<assemblyBodies.Count;i++)
   {
    if(playerInCrowd&&playerBody.enabled)RelaxAssemblyContact(playerBody,assemblyBodies[i]);
    // Evacuation slots already separate residents. Capsule contacts can lock
    // the queue before anyone reaches those slots.
    if(alarm)for(int j=i+1;j<assemblyBodies.Count;j++)RelaxAssemblyContact(assemblyBodies[i],assemblyBodies[j]);
   }
  }
  void RelaxAssemblyContact(CharacterController first,CharacterController second)
  {
   if(Physics.GetIgnoreCollision(first,second))return;
   Physics.IgnoreCollision(first,second,true);
   assemblyPairs.Add((first,second));
  }
  static void RestoreAssemblyContact(CharacterController first,CharacterController second)
  {
   if(first!=null&&second!=null&&Physics.GetIgnoreCollision(first,second))Physics.IgnoreCollision(first,second,false);
  }
  void Update()
  {
   if(c?.State==null)return;ObserveState();RefreshAssemblyContacts();
   if(Time.unscaledTime<refresh||c.cinematicDirector.IsPlaying)return;refresh=Time.unscaledTime+1;
   // The runner can open before the next update or be restored from a save.
   // Its residents need an active alarm even if the visual effect is unavailable.
   if(!c.HasFlag("v17:alarm")&&(!activity.Active||activity.Current.mode=="runner")&&
    c.State.completedActions.Contains("V17_PREPARE_FIRE")&&!c.State.completedActions.Contains("V17_DEBRIEF_FIRE"))
   {
    PrepareEmergencyRoster();
    if(!PreparingAssembly&&c.State.campaignV17.emergencyAssemblySaved)
    {
     c.Apply(new EffectDefinition{kind="flag",target="v17:alarm",value=1});
     var fire=NativeFire.ActiveFires.OrderBy(f=>Vector3.Distance(f.transform.position,c.bindings.Find("foyer").position)).FirstOrDefault();
     if(!c.HasFlag("v18:fire-showed")&&GetComponent<CinematicFireV18>().Play(fire))
      c.Apply(new EffectDefinition{kind="flag",target="v18:fire-showed",value=1});
     c.Save();
    }
   }
   if(Before==null)EnsurePainting();
  }
  void OnDisable(){foreach(var pair in assemblyPairs)RestoreAssemblyContact(pair.Item1,pair.Item2);assemblyPairs.Clear();}
  void OnDestroy(){if(Before!=null){Before.Release();Destroy(Before);}if(Now!=null){Now.Release();Destroy(Now);}if(painting!=null)Destroy(painting.gameObject);}
 }
}
