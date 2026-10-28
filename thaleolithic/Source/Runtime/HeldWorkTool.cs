using UnityEngine;
namespace UngaBunga45001
{
    public sealed class HeldWorkTool:MonoBehaviour
    {
        public Animator animator;public Renderer target;
        private void LateUpdate(){var state=animator.IsInTransition(0)?animator.GetNextAnimatorStateInfo(0):animator.GetCurrentAnimatorStateInfo(0);target.enabled=state.IsName("Mine")||state.IsName("Work")||state.IsName("Craft");}
    }
}
