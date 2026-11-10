using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 [DefaultExecutionOrder(140)]public sealed class ActivityActingV18:MonoBehaviour
 {
  sealed class Owned {public CinematicActorV15 actor;public Animator animator;public AnimationClip clip;public Transform handGoal;public GameObject prop;}
  readonly Dictionary<string,Owned> owned=new Dictionary<string,Owned>();readonly HashSet<string> wanted=new HashSet<string>();
  readonly List<string> released=new List<string>();
  CampaignRuntime c;CampaignActivitiesV17 activity;ChapterMotionV241 motion;VillageUpgradeV18 village;ConstructionFilmV19 construction;CinematicFireV18 fire;float began;string old="";Vector3 briefingOrigin;readonly List<Transform> fruits=new List<Transform>();Mesh fruitMesh;Material fruitMaterial;float nextThrow;int serial;
  public int FruitHits{get;private set;}
  void Start(){c=GetComponent<CampaignRuntime>();activity=GetComponent<CampaignActivitiesV17>();motion=GetComponent<ChapterMotionV241>();}
  Owned Take(string id,string clip)
  {
   var animation=motion.Clip(clip);if(animation==null)return null;
   if(!owned.TryGetValue(id,out var o))
   {
    var animator=c.bindings.AnimatorFor(id);if(animator==null)return null;var performer=animator.GetComponent<CinematicActorV15>()??animator.gameObject.AddComponent<CinematicActorV15>();if(performer.Owned)return null;
    o=new Owned{actor=performer,animator=animator,clip=animation};performer.Acquire(animator);owned[id]=o;
   }
   o.clip=animation;wanted.Add(id);return o;
  }
  void Pose(string id,string clip,float t,Vector3 look)
  {var o=Take(id,clip);if(o==null)return;o.actor.Sample(o.clip,t,Mathf.Clamp01((Time.time-began)*4));o.actor.Look(look,.8f);}
  void Release(string id)
  {if(!owned.TryGetValue(id,out var o))return;if(o.actor!=null)o.actor.Release();if(o.handGoal!=null)Destroy(o.handGoal.gameObject);if(o.prop!=null)Destroy(o.prop);owned.Remove(id);}
  void LateUpdate()
  {
   if(c?.State==null)return;if(c.UserPaused){began+=Time.deltaTime;nextThrow+=Time.deltaTime;return;}wanted.Clear();string now=activity.Current?.id??"";if(now!=old){old=now;began=Time.time;if(activity.Current?.mode=="briefing"){briefingOrigin=c.bindings.player.position;nextThrow=Time.time+2;}}
   if(!c.cinematicDirector.IsPlaying)
   {
    var a=activity.Current;float elapsed=Time.time-began;
    if(a?.mode=="briefing")
    {
     Pose("dylan","V18_Dylan_PointSecurite",Mathf.Repeat(elapsed,7),c.bindings.Find("lorette").position+Vector3.up*1.4f);
     var delta=c.bindings.gameplayCamera.transform.right*(activity.CurrentProgress.lane-1)*.8f+briefingOrigin-c.bindings.player.position;delta.y=0;
     var body=c.bindings.player.GetComponent<CharacterController>();if(body.enabled&&VillageNavigation.HearthSafe(c.bindings.player.position+delta,.3f))body.Move(Vector3.ClampMagnitude(delta,2*Time.deltaTime));
     Projectiles(elapsed);
    }
    if(a?.mode=="differences")Pose("nork","V18_Ouways_Peinture",Mathf.Repeat(elapsed,8),c.bindings.player.position+Vector3.up*1.2f);
    if(village==null)village=GetComponent<VillageUpgradeV18>();
    if(construction==null)construction=GetComponent<ConstructionFilmV19>();
    if(village!=null)foreach(var s in c.State.villageV18.installations)
    {
     if(s.phase!=InstallationPhaseV18.Building||!village.WorkerOnSite(s)||(construction?.Owns(s.builder)??false))continue;
     string clip=s.builder=="tarek"?"V18_Tarek_Palissade":"V18_Georges_PoseTorchis";var o=Take(s.builder,clip);if(o==null)continue;
     var root=c.bindings.Find(s.builder);var point=village.Instances[s.id].transform.position+Vector3.up*1.15f;var forward=point-root.position;forward.y=0;if(forward.sqrMagnitude>.01f)root.rotation=Quaternion.LookRotation(forward);
     if(o.handGoal==null)
     {
      o.prop=new GameObject("Préparation réelle du panneau sur chevalet");o.prop.transform.SetParent(transform,true);o.prop.transform.SetPositionAndRotation(root.position,root.rotation);
      var rack=Instantiate(Resources.Load<GameObject>("VillageV18/Prefabs/TH18_Trestle"),o.prop.transform);rack.transform.localPosition=Vector3.forward*1.1f;
      var panel=Instantiate(Resources.Load<GameObject>("NativeArchitectureV19/Prefabs/TH19_Wall_Panel_Tier2"),o.prop.transform);panel.transform.localPosition=new Vector3(-.4f,.8f,.3f);panel.transform.localRotation=Quaternion.Euler(90,0,0);
      o.handGoal=new GameObject("V18 · contact sur le panneau préparé").transform;o.handGoal.SetParent(o.prop.transform,true);float best=float.PositiveInfinity;var desired=root.position+root.forward*.55f+Vector3.up*.82f;
      foreach(var f in panel.GetComponentsInChildren<MeshFilter>()){var contact=CinematicContactGeometryV16.Nearest(f.sharedMesh,f.transform,desired);float d=Vector3.Distance(contact.point,desired);if(d<best){best=d;o.handGoal.position=contact.point;}}
     }
     o.actor.Sample(o.clip,Mathf.Repeat(s.workSeconds,8),1);o.actor.Contact(null,o.handGoal,Mathf.Clamp01(s.workSeconds*2));o.actor.Look(point,.7f);
    }
    if(fire==null)fire=GetComponent<CinematicFireV18>();
    if(fire!=null&&fire.Playing)
    {
     var at=NativeFire.ActiveFires.OrderBy(f=>Vector3.Distance(f.transform.position,c.bindings.Find("foyer").position)).FirstOrDefault();
     var witness=at==null?null:c.bindings.characters.Where(b=>b.id!="dylan"&&c.bindings.Find(b.id)!=null&&Vector3.Distance(c.bindings.Find(b.id).position,at.transform.position)<5).OrderBy(b=>Vector3.Distance(c.bindings.Find(b.id).position,at.transform.position)).FirstOrDefault();
     if(witness!=null)Pose(witness.id,"V18_Ouways_Embrasement",fire.Elapsed,at.transform.position+Vector3.up*fire.Height*.55f);
    }
   }
   released.Clear();
   foreach(var id in owned.Keys)if(!wanted.Contains(id))released.Add(id);
   foreach(var id in released)Release(id);
   if(activity.Current?.mode!="briefing")foreach(var fruit in fruits)if(fruit!=null)fruit.gameObject.SetActive(false);
  }
  void Projectiles(float elapsed)
  {
   if(fruitMesh==null)
   {
    fruitMesh=new Mesh();fruitMesh.vertices=new[]{Vector3.up,Vector3.down,Vector3.left,Vector3.right,Vector3.forward,Vector3.back};fruitMesh.triangles=new[]{0,4,3,0,2,4,0,5,2,0,3,5,1,3,4,1,4,2,1,2,5,1,5,3};fruitMesh.RecalculateNormals();fruitMaterial=new Material(Shader.Find("Universal Render Pipeline/Lit"));fruitMaterial.color=new Color(.75f,.26f,.08f);
    for(int i=0;i<6;i++){var g=new GameObject("Fruit cartoon · point sécurité");g.transform.SetParent(transform,true);g.AddComponent<MeshFilter>().sharedMesh=fruitMesh;g.AddComponent<MeshRenderer>().sharedMaterial=fruitMaterial;g.transform.localScale=Vector3.one*.11f;g.SetActive(false);fruits.Add(g.transform);}
   }
   if(Time.time>=nextThrow){nextThrow=Time.time+2.8f;var f=fruits[serial%fruits.Count];float lane=(serial++%3-1)*.8f;f.position=briefingOrigin+c.bindings.gameplayCamera.transform.right*lane+Vector3.up*1.15f+c.bindings.gameplayCamera.transform.forward*5;f.gameObject.SetActive(true);}
   foreach(var f in fruits)if(f.gameObject.activeSelf)
   {
    f.position-=c.bindings.gameplayCamera.transform.forward*3.4f*Time.deltaTime;f.Rotate(110*Time.deltaTime,60*Time.deltaTime,0);
    if(Vector3.Distance(f.position,c.bindings.player.position+Vector3.up*1.15f)<.38f){FruitHits++;activity.ProjectileHit();f.gameObject.SetActive(false);}
    else if(Vector3.Dot(f.position-briefingOrigin,c.bindings.gameplayCamera.transform.forward)<-2)f.gameObject.SetActive(false);
   }
  }
  void OnDisable(){foreach(var id in owned.Keys.ToArray())Release(id);}
  public void ReleaseForFilm(){foreach(var id in owned.Keys.ToArray())Release(id);}
  void OnDestroy(){OnDisable();foreach(var f in fruits)if(f!=null)Destroy(f.gameObject);if(fruitMesh!=null)Destroy(fruitMesh);if(fruitMaterial!=null)Destroy(fruitMaterial);}
 }
}
