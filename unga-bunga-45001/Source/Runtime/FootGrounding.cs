using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    [RequireComponent(typeof(Animator))]
    public sealed class FootGrounding:MonoBehaviour
    {
        private Animator animator;
        private CharacterController controller;
        private Transform actorRoot;
        private void Awake(){animator=GetComponent<Animator>();controller=GetComponentInParent<CharacterController>();var agent=GetComponentInParent<UnityEngine.AI.NavMeshAgent>();actorRoot=controller!=null?controller.transform:agent!=null?agent.transform:transform;}
        private void OnAnimatorIK(int layer)
        {
            if(!animator.isHuman||controller!=null&&controller.enabled&&!controller.isGrounded)return;
            float lift=Mathf.Max(NeededLift(AvatarIKGoal.LeftFoot,animator.leftFeetBottomHeight),NeededLift(AvatarIKGoal.RightFoot,animator.rightFeetBottomHeight));
            if(lift>0)animator.bodyPosition+=Vector3.up*Mathf.Clamp(lift,0,.32f);
            Plant(AvatarIKGoal.LeftFoot,HumanBodyBones.LeftFoot,animator.leftFeetBottomHeight);
            Plant(AvatarIKGoal.RightFoot,HumanBodyBones.RightFoot,animator.rightFeetBottomHeight);
        }
        private float NeededLift(AvatarIKGoal goal,float sole)
        {
            var position=animator.GetIKPosition(goal);
            var hit=Physics.RaycastAll(position+Vector3.up*.45f,Vector3.down,1,~0,QueryTriggerInteraction.Ignore).Where(h=>!h.transform.IsChildOf(actorRoot)&&h.normal.y>.55f).OrderBy(h=>h.distance).FirstOrDefault();
            return hit.collider==null?0:Mathf.Max(0,hit.point.y+sole-position.y);
        }
        private void Plant(AvatarIKGoal goal,HumanBodyBones bone,float sole)
        {
            var position=animator.GetIKPosition(goal);var rotation=animator.GetIKRotation(goal);
            var hit=Physics.RaycastAll(position+Vector3.up*.45f,Vector3.down,1,~0,QueryTriggerInteraction.Ignore).Where(h=>!h.transform.IsChildOf(actorRoot)&&h.normal.y>.55f).OrderBy(h=>h.distance).FirstOrDefault();
            if(hit.collider==null)return;
            float gap=position.y-sole-hit.point.y;float weight=1-Mathf.SmoothStep(.025f,.17f,Mathf.Max(0,gap));
            animator.SetIKPositionWeight(goal,weight);animator.SetIKRotationWeight(goal,weight*.75f);
            animator.SetIKPosition(goal,hit.point+Vector3.up*sole);animator.SetIKRotation(goal,Quaternion.FromToRotation(Vector3.up,hit.normal)*rotation);
        }
    }
}
