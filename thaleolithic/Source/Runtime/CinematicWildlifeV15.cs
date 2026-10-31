using System;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 [Serializable]public sealed class CinematicAnimalV15{public string id;public Vector3 position;public Quaternion rotation=Quaternion.identity;}
 public sealed class CinematicWildlifeV15:MonoBehaviour
 {
  sealed class Animal{public Transform root;public Animator animator;public Vector3 home;public Quaternion orientation;public float speed;}
  readonly List<Animal> herd=new List<Animal>();readonly RaycastHit[] hits=new RaycastHit[24];CampaignRuntime c;CampaignSave observed;float alert;bool taking;
  public IReadOnlyList<Transform> Roots{get{var result=new List<Transform>();foreach(var a in herd)result.Add(a.root);return result;}}
  public int AppendGrassActors(Vector4[] positions,int count){foreach(var a in herd){if(count>=positions.Length)break;var p=a.root.position;positions[count++]=new Vector4(p.x,p.y,p.z,2.1f);}return count;}
  public void Ensure(CampaignRuntime campaign,Transform original)
  {
   c=campaign;if(original==null)return;
   if(herd.Count==0)
   {
    for(int i=0;i<3;i++)
    {
     var root=i==0?original:Instantiate(original.gameObject,original.position+new Vector3(i==1?-4:4,0,i==1?-2:2),original.rotation).transform;
     if(i>0){root.name="Mammouth du troupeau "+i;foreach(var behaviour in root.GetComponentsInChildren<MonoBehaviour>(true))if(behaviour!=null&&!(behaviour is NativeAnimationAudio))Destroy(behaviour);foreach(var collider in root.GetComponentsInChildren<Collider>())collider.enabled=false;var capsule=root.gameObject.AddComponent<CapsuleCollider>();capsule.radius=1.05f;capsule.height=3.5f;capsule.center=Vector3.up*1.6f;}
     var animator=root.GetComponentInChildren<Animator>();if(animator==null)continue;animator.cullingMode=AnimatorCullingMode.CullUpdateTransforms;
     var audio=animator.GetComponent<NativeAnimationAudio>()??animator.gameObject.AddComponent<NativeAnimationAudio>();if(audio.step==null)audio.step=c.bindings.AnimatorFor("dylan")?.GetComponent<NativeAnimationAudio>()?.step;var source=animator.GetComponent<AudioSource>();source.pitch=.65f;source.volume=.32f;source.maxDistance=35;
     herd.Add(new Animal{root=root,animator=animator,home=root.position,orientation=root.rotation});
    }
   }
   if(observed==c.State)return;observed=c.State;var saved=c.State.cinematicAnimalsV15??=new List<CinematicAnimalV15>();
   for(int i=0;i<herd.Count;i++){var record=saved.Find(a=>a.id=="mammoth-"+i);var animal=herd[i];animal.root.SetPositionAndRotation(record==null?animal.home:record.position,record==null?animal.orientation:record.rotation);}
  }
  public void BeginTake(){taking=true;alert=0;}
  public void Alert(){alert=1;}
  public void Tick(float time,float dt)
  {
   if(!taking||dt<=0)return;
   for(int i=0;i<herd.Count;i++)
   {
    var a=herd[i];float desired=Mathf.SmoothStep(0,alert>0?1.4f:.55f,Mathf.Clamp01((time-i*.4f)/2.5f));a.speed=Mathf.MoveTowards(a.speed,desired,dt*.4f);var direction=a.orientation*Vector3.forward;var delta=direction*a.speed*dt;bool clear=true;
    int count=Physics.CapsuleCastNonAlloc(a.root.position+Vector3.up*1.1f,a.root.position+Vector3.up*2.5f,1.02f,direction,hits,delta.magnitude+.06f,~0,QueryTriggerInteraction.Ignore);
    for(int h=0;h<count;h++)if(!(hits[h].collider is TerrainCollider)&&!hits[h].transform.IsChildOf(a.root)){clear=false;break;}
    if(clear){var p=a.root.position+delta;p.y=HutCollapse.TerrainFloor(p);a.root.position=p;VillageLife.Play(a.animator,"Walk");a.animator.speed=a.speed/.8f;}else{a.speed=0;VillageLife.Play(a.animator,"Idle");a.animator.speed=1;}
   }
  }
  public void EndTake(){taking=false;foreach(var a in herd){a.speed=0;VillageLife.Play(a.animator,"Idle");a.animator.speed=1;}Capture();}
  public void Capture()
  {
   if(c?.State==null||herd.Count==0)return;var saved=c.State.cinematicAnimalsV15??=new List<CinematicAnimalV15>();
   for(int i=0;i<herd.Count;i++){string id="mammoth-"+i;var record=saved.Find(a=>a.id==id);if(record==null){record=new CinematicAnimalV15{id=id};saved.Add(record);}record.position=herd[i].root.position;record.rotation=herd[i].root.rotation;}
  }
 }
}
