using UnityEngine;
public class TalasIdleActor:MonoBehaviour
{
 TalasRigAnimator rig;void Start(){rig=GetComponent<TalasRigAnimator>();if(rig!=null)rig.Play("Idle_Talking_Loop");}
}
