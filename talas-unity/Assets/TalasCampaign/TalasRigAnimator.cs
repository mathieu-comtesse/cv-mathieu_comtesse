using UnityEngine;
public class TalasRigAnimator:MonoBehaviour
{
 public Animation animationPlayer;
 public string CurrentClip { get;private set; }
 float actionUntil;
 void Awake(){if(animationPlayer!=null){animationPlayer.cullingType=AnimationCullingType.AlwaysAnimate;foreach(AnimationState s in animationPlayer)s.wrapMode=s.name.EndsWith("_Loop")?WrapMode.Loop:WrapMode.Once;}}
 void Start(){TalasWebRendering.Adapt(gameObject);if(string.IsNullOrEmpty(CurrentClip))Play("Idle_Loop");}
 void Update(){if(CurrentClip=="Death01")return;if(animationPlayer!=null&&Time.time>=actionUntil&&!animationPlayer.isPlaying)Play("Idle_Loop");}
 public void Locomotion(float speed)
 {
  if(Time.time<actionUntil||CurrentClip=="Death01")return;
  Play(Mathf.Abs(speed)<.1f?"Idle_Loop":Mathf.Abs(speed)>3.1f?"Jog_Fwd_Loop":"Walk_Loop");
 }
 public bool Play(string name,bool once=false)
 {
  if(animationPlayer==null||animationPlayer[name]==null)return false;
  animationPlayer[name].wrapMode=name=="Death01"?WrapMode.ClampForever:name.EndsWith("_Loop")?WrapMode.Loop:WrapMode.Once;
  if(CurrentClip!=name||!animationPlayer.IsPlaying(name)){animationPlayer.CrossFade(name,.18f);CurrentClip=name;}
  if(once)actionUntil=Time.time+animationPlayer[name].length;
  return true;
 }
}
