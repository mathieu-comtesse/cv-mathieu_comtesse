using System;
using System.Collections;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;
namespace UngaBunga45001
{
    public sealed class VillageNavigation:MonoBehaviour
    {
        public const int Road=4,Meadow=0,TallGrass=5,Rough=6,Crowded=7,Danger=8;
        public NavMeshSurface surface;
        public bool Rebuilding{get;private set;}
        public int Revision{get;private set;}
        public event Action Changed;
        bool requested;float refreshAt;
        static readonly Collider[] overlapHits = new Collider[24];
        static readonly RaycastHit[] segmentHits = new RaycastHit[32];
        public float LastRebuildMs { get; private set; }
        public bool Pending=>requested||Rebuilding;
        public static NavMeshQueryFilter Filter(int agentType=0)
        {
            var f=new NavMeshQueryFilter{agentTypeID=agentType,areaMask=NavMesh.AllAreas&~(1<<1)&~(1<<3)};
            f.SetAreaCost(Road,1);f.SetAreaCost(Meadow,1.2f);f.SetAreaCost(TallGrass,1.5f);f.SetAreaCost(Rough,1.8f);f.SetAreaCost(Crowded,2.5f);f.SetAreaCost(Danger,8);return f;
        }
        public static void Configure(NavMeshAgent agent)
        {
            agent.areaMask=NavMesh.AllAreas&~(1<<1)&~(1<<3);agent.SetAreaCost(Road,1);agent.SetAreaCost(Meadow,1.2f);agent.SetAreaCost(TallGrass,1.5f);agent.SetAreaCost(Rough,1.8f);agent.SetAreaCost(Crowded,2.5f);agent.SetAreaCost(Danger,8);agent.autoRepath=true;agent.updateRotation=false;agent.obstacleAvoidanceType=ObstacleAvoidanceType.HighQualityObstacleAvoidance;
        }
        public static bool Clear(Vector3 position,Transform actor=null,float radius=.3f,float height=1.8f)
        {
            if(!HearthSafe(position,radius))return false;
            var bottom = position + Vector3.up * (radius + .08f);
            var top = position + Vector3.up * (height - radius);
            int count = Physics.OverlapCapsuleNonAlloc(bottom, top, radius, overlapHits, ~0, QueryTriggerInteraction.Ignore);
            var hits = count == overlapHits.Length
                ? Physics.OverlapCapsule(bottom, top, radius, ~0, QueryTriggerInteraction.Ignore)
                : overlapHits;
            if (hits != overlapHits) count = hits.Length;
            for (int i = 0; i < count; i++)
                if (!(hits[i] is TerrainCollider) && (actor == null || !hits[i].transform.IsChildOf(actor))) return false;
            return true;
        }
        public static bool HearthSafe(Vector3 position,float radius=.3f)
        {foreach(var fire in NativeFire.ActiveFires)if(fire!=null&&fire.lit){var d=position-fire.transform.position;d.y=0;if(d.sqrMagnitude<Mathf.Pow(fire.radius+.5f+radius,2))return false;}return true;}
        static bool PathClear(NavMeshPath path,Transform actor)
        {
            var corners=path.corners;
            for(int i=1;i<corners.Length;i++)
            {
                if(!SegmentClear(corners[i-1],corners[i],actor))return false;
            }return true;
        }
        public static bool SegmentClear(Vector3 from,Vector3 to,Transform actor)
        {
            var delta=to-from;float length=delta.magnitude;if(length<.02f)return true;
            var direction = delta / length;
            float prior=GroundAt(from);for(float p=0;p<=length;p+=.3f){var point=from+direction*p;float ground=GroundAt(point);if(!HearthSafe(point)||Mathf.Abs(ground-prior)>.45f)return false;prior=ground;}
            var bottom = from + Vector3.up * .38f;
            var top = from + Vector3.up * 1.5f;
            int count = Physics.CapsuleCastNonAlloc(bottom, top, .3f, direction, segmentHits, length, ~0, QueryTriggerInteraction.Ignore);
            var hits = count == segmentHits.Length
                ? Physics.CapsuleCastAll(bottom, top, .3f, direction, length, ~0, QueryTriggerInteraction.Ignore)
                : segmentHits;
            if (hits != segmentHits) count = hits.Length;
            for (int i = 0; i < count; i++)
            {
                var hit = hits[i];
                if (hit.distance > .06f && !(hit.collider is TerrainCollider) && !(hit.collider is CharacterController) &&
                    hit.collider.GetComponentInParent<NavMeshAgent>() == null && (actor == null || !hit.transform.IsChildOf(actor))) return false;
            }
            return true;
        }
        static float GroundAt(Vector3 p)=>VillageLife.Ground(p);
        public static bool Plan(Vector3 start,Vector3 desired,Transform actor,out NavMeshPath path,float search=3,int agentType=0,float startSearch=1)
        {
            path=new NavMeshPath();var filter=Filter(agentType);
            var departures=new System.Collections.Generic.List<Vector3>();
            if(NavMesh.SamplePosition(start,out var from,startSearch,filter)&&SegmentClear(start,from.position,actor))departures.Add(from.position);
            if(startSearch>1)for(float radius=1;radius<=startSearch;radius+=1)for(int angle=0;angle<12;angle++)
            {var point=start+Quaternion.Euler(0,angle*30,0)*Vector3.forward*radius;point.y=GroundAt(point);if(NavMesh.SamplePosition(point,out var entry,.65f,filter)&&Mathf.Abs(entry.position.y-point.y)<.5f&&SegmentClear(start,entry.position,actor)&&!departures.Any(p=>(p-entry.position).sqrMagnitude<.25f))departures.Add(entry.position);}
            if(departures.Count==0)return false;
            for(float radius=0;radius<=search;radius+=.55f)
                for(int angle=0;angle<(radius==0?1:12);angle++)
                {
                    var p=desired+Quaternion.Euler(0,angle*30,0)*Vector3.forward*radius;float ground=VillageLife.Ground(p);p.y=ground;
                    if(!NavMesh.SamplePosition(p,out var end,.6f,filter)||Mathf.Abs(end.position.y-ground)>.5f||!Clear(end.position,actor))continue;
                    foreach(var departure in departures)if(NavMesh.CalculatePath(departure,end.position,filter,path)&&path.status==NavMeshPathStatus.PathComplete&&PathClear(path,actor))return true;
                }
            return false;
        }
        public void RequestRebuild(){requested=true;refreshAt=Time.time+.25f;}
        void Update(){if(requested&&!Rebuilding&&Time.time>=refreshAt&&surface!=null)StartCoroutine(Rebuild());}
        IEnumerator Rebuild()
        {
            requested=false;Rebuilding=true;
            double startedAt=Time.realtimeSinceStartupAsDouble;
            Physics.SyncTransforms();
            var work=surface.UpdateNavMesh(surface.navMeshData);yield return work;
            LastRebuildMs=(float)((Time.realtimeSinceStartupAsDouble-startedAt)*1000);
            Revision++;Rebuilding=false;Changed?.Invoke();
            foreach(var agent in FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None))if(agent.enabled&&agent.isOnNavMesh&&agent.hasPath)agent.SetDestination(agent.destination);
        }
    }
}
