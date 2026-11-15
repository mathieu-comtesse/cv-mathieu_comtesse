using UnityEngine;
using UnityEngine.AI;

namespace UngaBunga45001
{
    internal sealed class QuestRouteSurface
    {
        readonly RaycastHit[] hits = new RaycastHit[24];
        readonly NavMeshQueryFilter filter;
        readonly Transform player;

        public QuestRouteSurface(Transform player)
        {
            this.player = player;
            filter = VillageNavigation.Filter();
            filter.areaMask &= ~(1 << VillageNavigation.Danger);
        }

        public NavMeshQueryFilter Filter => filter;

        public bool Project(Vector3 sample, out Vector3 surface, out Vector3 navPoint)
        {
            surface = navPoint = sample;
            if (!NavMesh.SamplePosition(sample, out var nav, 1.6f, filter)) return false;
            var horizontal = nav.position - sample;
            horizontal.y = 0;
            if (horizontal.sqrMagnitude > .3f * .3f) return false;
            navPoint = nav.position;
            return Ground(navPoint, navPoint.y, out surface);
        }

        public Vector3 Edge(Vector3 center, Vector3 navCenter, Vector3 offset)
        {
            for (int i = 0; i < 3; i++)
            {
                Vector3 point = navCenter + offset;
                if (!NavMesh.Raycast(navCenter, point, out _, filter) && Ground(point, center.y, out var ground))
                    return ground;
                offset *= .5f;
            }
            return center;
        }

        bool Ground(Vector3 point, float referenceHeight, out Vector3 ground)
        {
            Vector3 origin = new Vector3(point.x, referenceHeight + .9f, point.z);
            int count = Physics.RaycastNonAlloc(origin, Vector3.down, hits, 2.1f, ~0, QueryTriggerInteraction.Ignore);
            var values = count == hits.Length ? Physics.RaycastAll(origin, Vector3.down, 2.1f, ~0, QueryTriggerInteraction.Ignore) : hits;
            if (values != hits) count = values.Length;
            ground = point;
            float best = float.PositiveInfinity;
            for (int i = 0; i < count; i++)
            {
                var hit = values[i];
                if (hit.normal.y < .54f || Dynamic(hit.collider)) continue;
                float gap = Mathf.Abs(hit.point.y - referenceHeight);
                if (gap >= best) continue;
                best = gap;
                ground = hit.point;
            }
            return best <= 1.05f;
        }

        public bool Open(Vector3 from, Vector3 to, bool checkNavMesh)
        {
            if (!VillageNavigation.HearthSafe(from, .14f) || !VillageNavigation.HearthSafe(to, .14f) ||
                !VillageNavigation.HearthSafe((from + to) * .5f, .14f)) return false;
            var delta = to - from;
            float distance = delta.magnitude;
            if (distance < .015f) return true;
            if (checkNavMesh && NavMesh.Raycast(from, to, out var boundary, filter) &&
                (boundary.position - to).sqrMagnitude > .11f * .11f)
            {
                // Projected physical heights and exact corner points can touch polygon seams.
                // Confirm a real gap in the walkable surface before shortening a valid strip.
                if (!OnWalkable(to) || !OnWalkable((from + to) * .5f)) return false;
            }
            var origin = from + Vector3.up * .32f;
            var direction = delta / distance;
            int count = Physics.SphereCastNonAlloc(origin, .13f, direction, hits, distance, ~0, QueryTriggerInteraction.Ignore);
            var values = count == hits.Length
                ? Physics.SphereCastAll(origin, .13f, direction, distance, ~0, QueryTriggerInteraction.Ignore)
                : hits;
            if (values != hits) count = values.Length;
            for (int i = 0; i < count; i++)
            {
                var hit = values[i];
                if (hit.normal.y < .54f && !(hit.collider is TerrainCollider) && !Dynamic(hit.collider)) return false;
            }
            return true;
        }

        bool Dynamic(Collider collider) => collider == null || collider is CharacterController ||
            collider.transform.IsChildOf(player) || collider.GetComponentInParent<NavMeshAgent>() != null ||
            (collider.attachedRigidbody != null && !collider.attachedRigidbody.isKinematic);

        bool OnWalkable(Vector3 point)
        {
            if (!NavMesh.SamplePosition(point, out var nearest, .52f, filter)) return false;
            var delta = nearest.position - point;
            return delta.x * delta.x + delta.z * delta.z <= .13f * .13f;
        }

        public static bool Intersects(NavMeshObstacle obstacle, Vector3 from, Vector3 to)
        {
            if (obstacle == null || !obstacle.isActiveAndEnabled) return false;
            from = obstacle.transform.InverseTransformPoint(from + Vector3.up * .20f);
            to = obstacle.transform.InverseTransformPoint(to + Vector3.up * .20f);
            var bounds = new Bounds(obstacle.center, obstacle.size + new Vector3(.30f, 0, .30f));
            if (bounds.Contains(from) || bounds.Contains(to)) return true;
            Vector3 delta = to - from;
            return bounds.IntersectRay(new Ray(from, delta.normalized), out var entry) && entry <= delta.magnitude;
        }
    }
}
