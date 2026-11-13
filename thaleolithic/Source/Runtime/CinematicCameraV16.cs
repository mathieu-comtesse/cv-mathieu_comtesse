using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicCameraV16
 {
  static readonly HumanBodyBones[] TrackedBones={HumanBodyBones.Head,HumanBodyBones.Chest,HumanBodyBones.LeftHand,HumanBodyBones.RightHand};
  static readonly float[] Angles={0,-15,15,-30,30,-55,55,-80,80,-110,110};
  readonly RaycastHit[] hits=new RaycastHit[64];readonly Vector3[] points=new Vector3[11];readonly Transform[] owners=new Transform[11];readonly SkinnedMeshRenderer[] people=Object.FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None);float angle,next;int previous=-1;Vector3 smoothed;bool ready;
  public int Samples{get;private set;}public int BlockedSamples{get;private set;}
  int Targets(Vector3 target,Transform subject,Transform second)
  {
   int count=0;owners[count]=null;points[count++]=target;
   for(int slot=0;slot<2;slot++){var root=slot==0?subject:second;if(root!=null){var animator=root.GetComponentInChildren<Animator>();if(animator!=null&&animator.isHuman){foreach(var bone in TrackedBones){var t=animator.GetBoneTransform(bone);if(t!=null){owners[count]=root;points[count++]=t.position;}}}}}
   return count;
  }
  int Visible(Vector3 camera,int count,Transform subject,Transform second,HashSet<Collider> foliage)
  {
   int visible=0;
   for(int i=0;i<count;i++){var delta=points[i]-camera;float distance=delta.magnitude;bool blocked=false;int found=Physics.RaycastNonAlloc(camera,delta.normalized,hits,distance-.12f,~0,QueryTriggerInteraction.Ignore);for(int n=0;n<found;n++){var hit=hits[n];if(foliage.Contains(hit.collider)||subject!=null&&hit.transform.IsChildOf(subject)||second!=null&&hit.transform.IsChildOf(second))continue;if(hit.distance>.2f){blocked=true;break;}}if(!blocked){var ray=new Ray(camera,delta.normalized);foreach(var person in people){if(person==null||!person.enabled||owners[i]!=null&&person.transform.IsChildOf(owners[i]))continue;var bounds=person.bounds;bounds.Expand(-.12f);if(bounds.IntersectRay(ray,out float entry)&&entry>.15f&&entry<distance-.18f){blocked=true;break;}}}if(!blocked)visible++;}
   return visible;
  }
  int ForegroundPeople(Vector3 position,Vector3 target,Transform subject,Transform second)
  {
   int blocked=0;var direction=target-position;float distance=direction.magnitude;var ray=new Ray(position,direction.normalized);
   foreach(var person in people){if(person==null||!person.enabled||subject!=null&&person.transform.IsChildOf(subject)||second!=null&&person.transform.IsChildOf(second))continue;var bounds=person.bounds;bounds.Expand(-.12f);if(bounds.IntersectRay(ray,out float entry)&&entry>.15f&&entry<distance-.3f)blocked++;}return blocked;
  }
  public void Frame(Camera camera,Vector3 target,Vector3 desired,Transform subject,Transform second,HashSet<Collider> foliage,int shot,float time,float dt)
  {
   int count=Targets(target,subject,second);bool cut=shot!=previous;
   if(cut||time>=next){previous=shot;next=time+.2f;float best=float.NegativeInfinity;foreach(var candidateAngle in Angles){var offset=Quaternion.Euler(0,candidateAngle,0)*desired;var position=target+offset;position.y=Mathf.Max(position.y,HutCollapse.TerrainFloor(position)+.4f);int visible=Visible(position,count,subject,second,foliage);float front=subject==null?1:Vector3.Dot((position-subject.position).normalized,subject.forward);float score=visible*100+(Mathf.Approximately(candidateAngle,angle)?15:0)-ForegroundPeople(position,target,subject,second)*150-Mathf.Abs(candidateAngle)*.07f+(front>.1f?2:-12);if(score>best){best=score;angle=candidateAngle;}}}
   var destination=target+Quaternion.Euler(0,angle,0)*desired;destination.y=Mathf.Max(destination.y,HutCollapse.TerrainFloor(destination)+.4f);smoothed=cut||!ready?destination:Vector3.Lerp(smoothed,destination,1-Mathf.Exp(-dt*9));ready=true;camera.transform.position=smoothed;camera.transform.LookAt(target);Samples+=count;BlockedSamples+=count-Visible(camera.transform.position,count,subject,second,foliage);
  }
 }
}
