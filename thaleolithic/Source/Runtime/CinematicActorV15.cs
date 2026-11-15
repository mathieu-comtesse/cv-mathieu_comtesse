using System;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;
namespace UngaBunga45001
{
 // A scene owns the playable graph; gameplay controllers are restored on release.
 public sealed class CinematicActorV15:MonoBehaviour
 {
  [NonSerialized]public bool FootContacts=true,HandContacts=true,ReachBodyForContact;
  public const string PoseRevision="v16-native-root-pose-surface-contacts-20261031";
  Animator animator;PlayableGraph graph;AnimationMixerPlayable mixer;AnimationLayerMixerPlayable layers;
  AnimationClipPlayable action,previous,locomotion;AnimationClip active,walk;AvatarMask upper,full;bool legMask;
  RuntimeAnimatorController controller;AnimatorCullingMode culling;float speed;bool rootMotion,animatorEnabled;
  int state;float stateTime;Vector3 gaze;float gazeWeight;Transform left,right;float hands;bool gazeReady,nativePlanted;
  FootGrounding grounding;bool groundedBefore;readonly RaycastHit[] groundHits=new RaycastHit[16];Transform actorRoot;
  CarriedLoad nativeLoad;bool loadEnabled;HeldWorkTool nativeTool;bool toolEnabled,toolVisible;
  public string ClipId=>active==null?"":active.name;public bool Owned=>graph.IsValid();public float HandWeight=>hands;public int IKCallbacks{get;private set;}
  public float ContactGap{get{if(!Owned||hands<.995f)return 0;float gap=0;if(left!=null)gap=Vector3.Distance(animator.GetBoneTransform(HumanBodyBones.LeftHand).position,left.position);if(right!=null)gap=Mathf.Max(gap,Vector3.Distance(animator.GetBoneTransform(HumanBodyBones.RightHand).position,right.position));return gap;}}
  public void Acquire(Animator target)
  {
   if(Owned)return;animator=target;controller=target.runtimeAnimatorController;speed=target.speed;rootMotion=target.applyRootMotion;culling=target.cullingMode;animatorEnabled=target.enabled;target.enabled=true;
   var old=target.GetCurrentAnimatorStateInfo(0);state=old.fullPathHash;stateTime=old.normalizedTime;
   grounding=target.GetComponent<FootGrounding>();if(grounding!=null){groundedBefore=grounding.enabled;grounding.enabled=false;}var cc=target.GetComponentInParent<CharacterController>();var agent=target.GetComponentInParent<UnityEngine.AI.NavMeshAgent>();actorRoot=cc!=null?cc.transform:agent!=null?agent.transform:target.transform;
   nativeLoad=target.GetComponent<CarriedLoad>();if(nativeLoad!=null){loadEnabled=nativeLoad.enabled;nativeLoad.enabled=false;nativeLoad.ShowPresentation(false);}nativeTool=target.GetComponent<HeldWorkTool>();if(nativeTool!=null){toolEnabled=nativeTool.enabled;toolVisible=nativeTool.target!=null&&nativeTool.target.enabled;nativeTool.enabled=false;if(nativeTool.target!=null)nativeTool.target.enabled=false;}
   target.runtimeAnimatorController=null;target.applyRootMotion=false;target.speed=1;target.cullingMode=AnimatorCullingMode.AlwaysAnimate;
   gazeReady=false;legMask=false;graph=PlayableGraph.Create("Scene-owned native actor: "+target.name);graph.SetTimeUpdateMode(DirectorUpdateMode.Manual);
   layers=AnimationLayerMixerPlayable.Create(graph,2);mixer=AnimationMixerPlayable.Create(graph,2);graph.Connect(mixer,0,layers,1);layers.SetInputWeight(1,1);
   var output=AnimationPlayableOutput.Create(graph,"Cinematic pose",target);output.SetSourcePlayable(layers);
   upper=new AvatarMask();full=new AvatarMask();foreach(AvatarMaskBodyPart part in Enum.GetValues(typeof(AvatarMaskBodyPart)))if(part!=AvatarMaskBodyPart.LastBodyPart){full.SetHumanoidBodyPartActive(part,true);upper.SetHumanoidBodyPartActive(part,part!=AvatarMaskBodyPart.Root&&part!=AvatarMaskBodyPart.LeftLeg&&part!=AvatarMaskBodyPart.RightLeg);}
   layers.SetLayerMaskFromAvatarMask(1,full);
   graph.Play();
  }
  public void Sample(AnimationClip clip,float time,float fade,AnimationClip movement=null,float movementTime=0,float movementWeight=0)
  {
   if(!Owned||clip==null)return;
   if(active!=clip)
   {
    if(previous.IsValid()){graph.Disconnect(mixer,0);graph.DestroyPlayable(previous);}
    previous=action;if(previous.IsValid()){graph.Disconnect(mixer,1);graph.Connect(previous,0,mixer,0);}
    action=AnimationClipPlayable.Create(graph,clip);action.SetApplyFootIK(false);action.SetApplyPlayableIK(true);action.SetSpeed(0);graph.Connect(action,0,mixer,1);active=clip;
   }
   action.SetTime(Mathf.Clamp(time,0,Mathf.Max(0,clip.length-.001f)));mixer.SetInputWeight(0,previous.IsValid()?1-fade:0);mixer.SetInputWeight(1,previous.IsValid()?fade:1);
   bool moving=movement!=null&&movementWeight>.001f;nativePlanted=!moving&&(clip.name.StartsWith("C01_")||clip.name.StartsWith("C08_")||clip.name.StartsWith("V18_"));
   if(moving&&walk!=movement){if(locomotion.IsValid()){graph.Disconnect(layers,0);graph.DestroyPlayable(locomotion);}locomotion=AnimationClipPlayable.Create(graph,movement);locomotion.SetApplyFootIK(true);locomotion.SetSpeed(0);graph.Connect(locomotion,0,layers,0);walk=movement;}
   if(legMask!=moving){legMask=moving;layers.SetLayerMaskFromAvatarMask(1,moving?upper:full);}
   if(moving){locomotion.SetTime(movementTime);layers.SetInputWeight(0,movementWeight);}else layers.SetInputWeight(0,0);
   graph.Evaluate(0);
  }
  public void Look(Vector3 target,float weight){gaze=gazeReady?Vector3.Lerp(gaze,target,1-Mathf.Exp(-Time.deltaTime*9)):target;gazeReady=true;gazeWeight=weight;}
  public void Contact(Transform leftHand,Transform rightHand,float weight){left=leftHand;right=rightHand;hands=weight;}
  void LateUpdate(){if(Owned)graph.Evaluate(0);}
  void OnAnimatorIK(int layer)
  {
   if(!Owned||!animator.isHuman)return;IKCallbacks++;if(ReachBodyForContact&&hands>.001f){float lower=Mathf.Min(ReachOffset(HumanBodyBones.LeftUpperArm,HumanBodyBones.LeftLowerArm,HumanBodyBones.LeftHand,left),ReachOffset(HumanBodyBones.RightUpperArm,HumanBodyBones.RightLowerArm,HumanBodyBones.RightHand,right));animator.bodyPosition+=Vector3.up*Mathf.Clamp(lower,-.6f,0)*hands;}if(FootContacts){if(nativePlanted&&!(ReachBodyForContact&&hands>.001f)){animator.bodyPosition-=Vector3.up*.01f;animator.SetIKPositionWeight(AvatarIKGoal.LeftFoot,0);animator.SetIKPositionWeight(AvatarIKGoal.RightFoot,0);animator.SetIKRotationWeight(AvatarIKGoal.LeftFoot,0);animator.SetIKRotationWeight(AvatarIKGoal.RightFoot,0);}else{animator.bodyPosition-=Vector3.up*.025f;Plant(AvatarIKGoal.LeftFoot,HumanBodyBones.LeftFoot,animator.leftFeetBottomHeight);Plant(AvatarIKGoal.RightFoot,HumanBodyBones.RightFoot,animator.rightFeetBottomHeight);}}animator.SetLookAtWeight(gazeWeight,.1f,.65f,.4f,.5f);animator.SetLookAtPosition(gaze);
   Hand(AvatarIKGoal.LeftHand,left);Hand(AvatarIKGoal.RightHand,right);
  }
  float ReachOffset(HumanBodyBones shoulderBone,HumanBodyBones elbowBone,HumanBodyBones handBone,Transform goal)
  {
   if(goal==null)return 0;var shoulder=animator.GetBoneTransform(shoulderBone).position;var elbow=animator.GetBoneTransform(elbowBone).position;var hand=animator.GetBoneTransform(handBone).position;float length=(Vector3.Distance(shoulder,elbow)+Vector3.Distance(elbow,hand))*.96f;var d=goal.position-shoulder;float horizontal=d.x*d.x+d.z*d.z;return d.y<0?d.y+Mathf.Sqrt(Mathf.Max(0,length*length-horizontal)):0;
  }
  void Hand(AvatarIKGoal goal,Transform target){animator.SetIKRotationWeight(goal,0);if(target==null||!HandContacts){animator.SetIKPositionWeight(goal,0);return;}animator.SetIKPositionWeight(goal,hands);animator.SetIKPosition(goal,target.position);}
  void Plant(AvatarIKGoal goal,HumanBodyBones bone,float sole)
  {
   var p=animator.GetIKPosition(goal);var rotation=animator.GetIKRotation(goal);int count=Physics.RaycastNonAlloc(p+Vector3.up*.5f,Vector3.down,groundHits,1.2f,~0,QueryTriggerInteraction.Ignore);float nearest=float.PositiveInfinity;RaycastHit hit=default;
   for(int i=0;i<count;i++)if(!groundHits[i].transform.IsChildOf(actorRoot)&&groundHits[i].normal.y>.55f&&groundHits[i].distance<nearest){hit=groundHits[i];nearest=hit.distance;}
   if(float.IsPositiveInfinity(nearest))return;float gap=p.y-sole-hit.point.y;float weight=1-Mathf.SmoothStep(.04f,.22f,Mathf.Max(0,gap));animator.SetIKPositionWeight(goal,weight);animator.SetIKRotationWeight(goal,weight*.7f);animator.SetIKPosition(goal,hit.point+Vector3.up*sole);animator.SetIKRotation(goal,Quaternion.FromToRotation(Vector3.up,hit.normal)*rotation);
  }
  public void Release()
  {
   if(!Owned)return;graph.Destroy();if(upper!=null){if(Application.isPlaying)Destroy(upper);else DestroyImmediate(upper);}if(full!=null){if(Application.isPlaying)Destroy(full);else DestroyImmediate(full);}
   if(animator!=null){animator.runtimeAnimatorController=controller;animator.applyRootMotion=rootMotion;animator.cullingMode=culling;animator.speed=speed;if(state!=0)animator.Play(state,0,stateTime);animator.enabled=animatorEnabled;}
   if(grounding!=null)grounding.enabled=groundedBefore;
   if(nativeLoad!=null){nativeLoad.enabled=loadEnabled;nativeLoad.ShowPresentation(true);}if(nativeTool!=null){nativeTool.enabled=toolEnabled;if(nativeTool.target!=null)nativeTool.target.enabled=toolVisible;}
   active=walk=null;gazeWeight=hands=0;ReachBodyForContact=false;
  }
  void OnDisable()=>Release();void OnDestroy()=>Release();
 }
}
