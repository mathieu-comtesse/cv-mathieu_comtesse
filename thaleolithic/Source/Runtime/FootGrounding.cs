using UnityEngine;

namespace UngaBunga45001
{
    [RequireComponent(typeof(Animator))]
    public sealed class FootGrounding : MonoBehaviour
    {
        const float FootRayHeight = .45f, FootRayLength = 1;
        readonly RaycastHit[] hits = new RaycastHit[12];
        Animator animator;
        CharacterController controller;
        Transform actorRoot;

        void Awake()
        {
            animator = GetComponent<Animator>();
            controller = GetComponentInParent<CharacterController>();
            var agent = GetComponentInParent<UnityEngine.AI.NavMeshAgent>();
            actorRoot = controller != null ? controller.transform : agent != null ? agent.transform : transform;
        }

        void OnAnimatorIK(int layer)
        {
            if (!enabled || !animator.isHuman || (controller != null && controller.enabled && !controller.isGrounded)) return;
            var left = animator.GetIKPosition(AvatarIKGoal.LeftFoot);
            var right = animator.GetIKPosition(AvatarIKGoal.RightFoot);
            bool leftFound = FindGround(left, out var leftHit);
            bool rightFound = FindGround(right, out var rightHit);
            float leftSole = animator.leftFeetBottomHeight, rightSole = animator.rightFeetBottomHeight;
            float lift = Mathf.Max(leftFound ? leftHit.point.y + leftSole - left.y : 0,
                rightFound ? rightHit.point.y + rightSole - right.y : 0);
            if (lift > 0) animator.bodyPosition += Vector3.up * Mathf.Min(.32f, lift);
            Plant(AvatarIKGoal.LeftFoot, leftSole, leftFound, leftHit);
            Plant(AvatarIKGoal.RightFoot, rightSole, rightFound, rightHit);
        }

        bool FindGround(Vector3 position, out RaycastHit ground)
        {
            var origin = position + Vector3.up * FootRayHeight;
            int count = Physics.RaycastNonAlloc(origin, Vector3.down, hits, FootRayLength, ~0, QueryTriggerInteraction.Ignore);
            var results = count == hits.Length
                ? Physics.RaycastAll(origin, Vector3.down, FootRayLength, ~0, QueryTriggerInteraction.Ignore)
                : hits;
            if (results != hits) count = results.Length;

            float closest = float.PositiveInfinity;
            ground = default;
            for (int i = 0; i < count; i++)
            {
                var hit = results[i];
                if (hit.distance >= closest || hit.normal.y <= .55f || hit.transform.IsChildOf(actorRoot)) continue;
                ground = hit;
                closest = hit.distance;
            }
            return closest < float.PositiveInfinity;
        }

        void Plant(AvatarIKGoal goal, float sole, bool found, RaycastHit hit)
        {
            if (!found)
            {
                animator.SetIKPositionWeight(goal, 0);
                animator.SetIKRotationWeight(goal, 0);
                return;
            }
            var position = animator.GetIKPosition(goal);
            var rotation = animator.GetIKRotation(goal);
            float gap = position.y - sole - hit.point.y;
            float weight = 1 - Mathf.SmoothStep(.025f, .17f, Mathf.Max(0, gap));
            animator.SetIKPositionWeight(goal, weight);
            animator.SetIKRotationWeight(goal, weight * .75f);
            animator.SetIKPosition(goal, hit.point + Vector3.up * sole);
            animator.SetIKRotation(goal, Quaternion.FromToRotation(Vector3.up, hit.normal) * rotation);
        }
    }
}
