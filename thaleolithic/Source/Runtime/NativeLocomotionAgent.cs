using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
    [DefaultExecutionOrder(-100)]
    public sealed class NativeLocomotionAgent:MonoBehaviour
    {
        public Animator animator;private NavMeshAgent agent;private CampaignRuntime campaign;
        private void Awake(){agent=GetComponent<NavMeshAgent>();campaign=FindFirstObjectByType<CampaignRuntime>();agent.updateRotation=false;}
        private void Update()
        {
            if(!agent.enabled||!agent.isOnNavMesh||campaign.cinematicDirector.IsPlaying)return;
            var motor=GetComponent<VillagerCollisionMotor>();var velocity=motor!=null?motor.Velocity:agent.velocity;velocity.y=0;float speed=velocity.magnitude;
            if(speed>.08f)transform.rotation=Quaternion.RotateTowards(transform.rotation,Quaternion.LookRotation(velocity),180*Time.deltaTime);
            var state=animator.IsInTransition(0)?animator.GetNextAnimatorStateInfo(0):animator.GetCurrentAnimatorStateInfo(0);
            if(state.IsName("Locomotion")){animator.SetFloat("Speed",speed>.08f?.5f:0);animator.speed=speed>.08f?Mathf.Clamp(speed/1.8f,.35f,1.3f):1;}else animator.speed=1;
        }
    }
}
