using System;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 [Serializable]public sealed class HutFailureRecord
 {public string id,site,decision;public bool settled,repaired,rebuilt;public float occurredAt;public Vector3[] positions=Array.Empty<Vector3>();public Quaternion[] rotations=Array.Empty<Quaternion>();}
 [Serializable]public sealed class StructuralPiece
 {public Transform root;public Vector3 restPosition;public Quaternion restRotation=Quaternion.identity;public float releaseAt,mass;public int kind;}
 public sealed class HutCollapse:MonoBehaviour
 {
  public string assemblyId,site="habitations";public MeshRenderer intactRenderer;public StructuralPiece[] pieces=Array.Empty<StructuralPiece>();public Collider[] intactColliders=Array.Empty<Collider>();public Material dustMaterial;
  public bool Running{get;private set;}public bool Broken{get;private set;}public int ImpactCount{get;private set;}public int ReleasedCount=>pieces.Count(p=>p.root.gameObject.activeSelf&&p.root.GetComponent<Rigidbody>() is Rigidbody rb&&!rb.isKinematic);
  CampaignRuntime campaign;CampaignSave observed;float age;HutFailureRecord record;NavMeshObstacle obstacle;AudioSource sound;Vector3 fixedPosition;Quaternion fixedRotation;bool recorded,cracked;int dustCount;
  void Start(){campaign=FindFirstObjectByType<CampaignRuntime>();fixedPosition=transform.position;fixedRotation=transform.rotation;}
  void Update()
  {
   if(campaign==null||campaign.State==null)return;
   campaign.State.hutFailures??=new List<HutFailureRecord>();
   if(observed!=campaign.State){observed=campaign.State;foreach(Transform child in transform)if(child.name.StartsWith("Renfort posé"))Destroy(child.gameObject);var saved=observed.hutFailures.FirstOrDefault(r=>r.id==assemblyId);ResetIntact();if(saved!=null&&!saved.repaired){record=saved;if(saved.rebuilt){Reinforce();SetAccess(false);}else RestoreDebris();}else if(site=="habitations"&&observed.completedActions.Contains("WORK_M_V_ABRI"))Reinforce();}
   if(!Running||campaign.UserPaused)return;age+=Time.deltaTime;
   // The assembly root is fixed. Every moving part owns its own rigidbody.
   transform.SetPositionAndRotation(fixedPosition,fixedRotation);
   if(!cracked&&age>=1){cracked=true;Play(campaign.GetComponent<AccidentDirector>().crack,.65f);}
   foreach(var p in pieces)
   {
    var rb=p.root.GetComponent<Rigidbody>();if(!rb.isKinematic)continue;
    if(age>=p.releaseAt){rb.position=p.root.position;rb.rotation=p.root.rotation;rb.interpolation=RigidbodyInterpolation.Interpolate;rb.isKinematic=false;rb.useGravity=true;rb.angularVelocity=new Vector3(.04f*(p.kind+1),0,p.restPosition.x>0?-.12f:.08f);continue;}
    float sag=p.kind==1?Mathf.SmoothStep(0,.16f,Mathf.InverseLerp(1.4f,3.2f,age)):0;
    p.root.localPosition=p.restPosition-Vector3.up*sag;p.root.localRotation=p.restRotation*Quaternion.Euler(0,0,Mathf.Sin(age*14+p.restPosition.x)*.35f+Mathf.InverseLerp(1,3,age)*(p.restPosition.x>0?-2:1));
   }
   if(age>=8.2f)Settle();
  }
  public bool BeginFailure(string decision,bool persist=true)
  {
   if(Running||Broken||pieces.Length==0)return false;if(campaign==null)campaign=FindFirstObjectByType<CampaignRuntime>();
   observed=campaign.State;fixedPosition=transform.position;fixedRotation=transform.rotation;age=0;Running=true;Broken=true;recorded=persist;cracked=false;dustCount=ImpactCount=0;
   record=new HutFailureRecord{id=assemblyId,site=site,decision=decision,occurredAt=campaign.State.elapsedSeconds};campaign.State.hutFailures??=new List<HutFailureRecord>();
   if(persist){campaign.State.hutFailures.RemoveAll(r=>r.id==assemblyId&&r.repaired);if(!campaign.State.hutFailures.Any(r=>r.id==assemblyId))campaign.State.hutFailures.Add(record);else record=campaign.State.hutFailures.First(r=>r.id==assemblyId);}
   ShowPieces();SetAccess(false);if(persist){campaign.Apply(new EffectDefinition{kind="flag",target="hut:unusable:"+assemblyId,value=1});if(site=="habitations")campaign.Apply(new EffectDefinition{kind="flag",target="incident:structure",value=1});campaign.Save();}
   foreach(var adjacent in FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).Where(h=>h!=this&&h.site==site&&!h.Broken&&Vector3.Distance(h.transform.position,transform.position)<.5f))adjacent.BeginFailure(decision,persist);
   return true;
  }
  void ShowPieces()
  {
   intactRenderer.enabled=false;foreach(var collider in intactColliders)if(collider!=null)collider.enabled=false;
   for(int i=0;i<pieces.Length;i++){var p=pieces[i];p.root.gameObject.SetActive(true);var rb=p.root.GetComponent<Rigidbody>();rb.isKinematic=true;rb.interpolation=RigidbodyInterpolation.None;rb.useGravity=false;p.root.SetLocalPositionAndRotation(p.restPosition,p.restRotation);rb.position=p.root.position;rb.rotation=p.root.rotation;var col=p.root.GetComponent<Collider>();col.enabled=true;var impact=p.root.GetComponent<HutImpact>();if(impact==null)impact=p.root.gameObject.AddComponent<HutImpact>();impact.owner=this;impact.played=false;}
   // Native links touch adjacent hulls. Ignore only initial overlaps, avoiding depenetration explosions.
   for(int i=0;i<pieces.Length;i++)for(int j=i+1;j<pieces.Length;j++){var a=pieces[i].root.GetComponent<Collider>();var b=pieces[j].root.GetComponent<Collider>();if(a.bounds.Intersects(b.bounds))Physics.IgnoreCollision(a,b,true);}
  }
  public void Settle()
  {
   if(!Broken)return;foreach(var p in pieces)
   {
    var rb=p.root.GetComponent<Rigidbody>();if(!rb.isKinematic){rb.linearVelocity=Vector3.zero;rb.angularVelocity=Vector3.zero;rb.isKinematic=true;}
    rb.interpolation=RigidbodyInterpolation.None;var bounds=p.root.GetComponent<Renderer>().bounds;float floor=TerrainFloor(bounds.center);if(bounds.min.y<floor+.006f)p.root.position+=Vector3.up*(floor+.006f-bounds.min.y);rb.position=p.root.position;rb.rotation=p.root.rotation;
   }
   Running=false;record.settled=true;record.positions=pieces.Select(p=>p.root.localPosition).ToArray();record.rotations=pieces.Select(p=>p.root.localRotation).ToArray();
   campaign.GetComponent<VillageNavigation>()?.RequestRebuild();campaign.GetComponent<QuestNavigationController>()?.ForceRefresh();if(recorded){campaign.Save();campaign.NotifyTribalChange();}
  }
  public void CompleteSkipped(){if(!Broken)BeginFailure("Effondrement observé au réveil du village.");RestoreDebris();Settle();}
  void RestoreDebris()
  {
   Broken=true;Running=false;ShowPieces();SetAccess(false);
   for(int i=0;i<pieces.Length;i++){var p=pieces[i];if(record.positions.Length==pieces.Length){p.root.SetLocalPositionAndRotation(record.positions[i],record.rotations[i]);}else{var point=transform.TransformPoint(p.restPosition);p.root.rotation=transform.rotation*Quaternion.Euler(78+(i%4)*3,(i%5)*17,0);var bounds=p.root.GetComponent<Renderer>().bounds;point.y=TerrainFloor(point)+bounds.extents.y+.008f;p.root.position=point;}var rb=p.root.GetComponent<Rigidbody>();rb.interpolation=RigidbodyInterpolation.None;rb.position=p.root.position;rb.rotation=p.root.rotation;}
  }
  public void ResetIntact()
  {
   if(obstacle==null)obstacle=GetComponent<NavMeshObstacle>();Running=Broken=false;foreach(var p in pieces){var rb=p.root.GetComponent<Rigidbody>();rb.isKinematic=true;rb.useGravity=false;p.root.SetLocalPositionAndRotation(p.restPosition,p.restRotation);p.root.gameObject.SetActive(false);}if(intactRenderer!=null)intactRenderer.enabled=true;foreach(var col in intactColliders)if(col!=null)col.enabled=true;if(obstacle!=null)obstacle.enabled=false;
  }
  public void Repair()
  {
   if(campaign==null)campaign=FindFirstObjectByType<CampaignRuntime>();var saved=campaign.State.hutFailures?.FirstOrDefault(r=>r.id==assemblyId);if(saved!=null)saved.repaired=true;campaign.Apply(new EffectDefinition{kind="flag",target="hut:unusable:"+assemblyId,value=0});ResetIntact();SetAccess(true);
  }
  public void Reinforce()
  {
   if(campaign==null)campaign=FindFirstObjectByType<CampaignRuntime>();if(Broken){var saved=campaign.State.hutFailures?.FirstOrDefault(r=>r.id==assemblyId);if(saved!=null)saved.rebuilt=true;ResetIntact();SetAccess(false);}
   if(transform.Find("Renfort posé 0")!=null)return;var beam=pieces.FirstOrDefault(p=>p.kind==2&&p.root.GetComponent<MeshFilter>().sharedMesh.bounds.size.magnitude>1);if(beam==null)return;var mesh=beam.root.GetComponent<MeshFilter>().sharedMesh;var size=mesh.bounds.size;int axis=size.x>size.z?0:2;Vector3 sourceAxis=axis==0?Vector3.right:Vector3.forward;
   for(int i=0;i<2;i++){var go=new GameObject("Renfort posé "+i);go.transform.SetParent(transform,false);Vector3 a=new Vector3(i==0?-1.7f:1.7f,-.15f,-1.4f),b=new Vector3(i==0?-.8f:.8f,1.8f,-1.4f),delta=b-a;go.transform.localPosition=(a+b)*.5f;go.transform.localRotation=Quaternion.FromToRotation(sourceAxis,delta.normalized);go.transform.localScale=new Vector3(axis==0?delta.magnitude/size.x:1,1,axis==2?delta.magnitude/size.z:1);go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterials=beam.root.GetComponent<MeshRenderer>().sharedMaterials;}
  }
  void SetAccess(bool usable)
  {
   if(obstacle==null){obstacle=GetComponent<NavMeshObstacle>();if(obstacle==null)obstacle=gameObject.AddComponent<NavMeshObstacle>();obstacle.shape=NavMeshObstacleShape.Box;obstacle.size=new Vector3(4.8f,2,4.8f);obstacle.center=new Vector3(0,.6f,0);obstacle.carving=true;obstacle.carveOnlyStationary=false;}obstacle.enabled=!usable;
   campaign.GetComponent<VillageNavigation>()?.RequestRebuild();campaign.GetComponent<QuestNavigationController>()?.ForceRefresh();
  }
  public static float TerrainFloor(Vector3 p){foreach(var t in Terrain.activeTerrains){var d=p-t.transform.position;var size=t.terrainData.size;if(d.x>=0&&d.z>=0&&d.x<=size.x&&d.z<=size.z)return t.SampleHeight(p)+t.transform.position.y;}return p.y;}
  public Vector3 OverviewOffset()
  {
   var target=transform.position+Vector3.up;Vector3 best=new Vector3(-6,4.6f,-7);float bestScore=-1;var occluders=FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.enabled&&r.bounds.size.y>1.4f&&!r.transform.IsChildOf(transform)).ToArray();
   for(int angle=0;angle<16;angle++){var offset=Quaternion.Euler(0,angle*22.5f,0)*new Vector3(0,4.6f,-8.4f);float score=offset.magnitude;var ray=new Ray(target,offset.normalized);foreach(var r in occluders)if(!r.bounds.Contains(target)&&r.bounds.IntersectRay(ray,out float entry)&&entry>.5f)score=Mathf.Min(score,entry);foreach(var hit in Physics.SphereCastAll(target,.18f,offset.normalized,offset.magnitude,~0,QueryTriggerInteraction.Ignore))if(hit.distance>.5f&&!hit.transform.IsChildOf(transform)&&!intactColliders.Contains(hit.collider))score=Mathf.Min(score,hit.distance);if(score>bestScore){bestScore=score;best=offset;}}
   return best;
  }
  void Play(AudioClip clip,float volume){if(clip==null)return;if(sound==null){sound=gameObject.AddComponent<AudioSource>();sound.spatialBlend=1;sound.maxDistance=24;sound.minDistance=2;}sound.PlayOneShot(clip,volume);}
  public void Impact(Vector3 point)
  {
   ImpactCount++;if(dustCount>=8)return;dustCount++;Play(campaign.GetComponent<AccidentDirector>().impact,.22f);
   if(dustMaterial==null)return;var go=new GameObject("Poussière au contact du sol");go.transform.position=point+Vector3.up*.04f;var particles=go.AddComponent<ParticleSystem>();particles.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);var main=particles.main;main.duration=1.3f;main.loop=false;main.startLifetime=new ParticleSystem.MinMaxCurve(.65f,1.2f);main.startSpeed=new ParticleSystem.MinMaxCurve(.15f,.4f);main.startSize=new ParticleSystem.MinMaxCurve(.06f,.18f);main.startColor=new Color(.45f,.31f,.18f,.22f);main.maxParticles=12;main.simulationSpace=ParticleSystemSimulationSpace.World;main.stopAction=ParticleSystemStopAction.Destroy;var emission=particles.emission;emission.rateOverTime=0;emission.SetBursts(new[]{new ParticleSystem.Burst(0,10)});var shape=particles.shape;shape.shapeType=ParticleSystemShapeType.Cone;shape.angle=55;shape.radius=.12f;var color=particles.colorOverLifetime;color.enabled=true;var gradient=new Gradient();gradient.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},new[]{new GradientAlphaKey(.8f,0),new GradientAlphaKey(0,1)});color.color=gradient;var renderer=particles.GetComponent<ParticleSystemRenderer>();renderer.sharedMaterial=dustMaterial;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;particles.Play();
  }
 }
 public sealed class HutImpact:MonoBehaviour
 {
  public HutCollapse owner;public bool played;
  void OnCollisionEnter(Collision hit){if(played||hit.relativeVelocity.magnitude<.65f||!(hit.collider is TerrainCollider))return;played=true;owner.Impact(hit.GetContact(0).point);}
 }
}
