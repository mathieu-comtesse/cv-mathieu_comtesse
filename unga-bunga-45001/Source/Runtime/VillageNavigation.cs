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
            return !Physics.OverlapCapsule(position+Vector3.up*(radius+.08f),position+Vector3.up*(height-radius),radius,~0,QueryTriggerInteraction.Ignore).Any(c=>!(c is TerrainCollider)&&(actor==null||!c.transform.IsChildOf(actor)));
        }
        public static bool HearthSafe(Vector3 position,float radius=.3f)
        {foreach(var fire in NativeFire.ActiveFires)if(fire!=null&&fire.lit){var d=position-fire.transform.position;d.y=0;if(d.sqrMagnitude<Mathf.Pow(fire.radius+.5f+radius,2))return false;}return true;}
        static bool PathClear(NavMeshPath path,Transform actor)
        {
            for(int i=1;i<path.corners.Length;i++)
            {
                var from=path.corners[i-1];var delta=path.corners[i]-from;float length=delta.magnitude;
                for(float p=0;p<=length;p+=.3f)if(!HearthSafe(from+delta.normalized*p))return false;
                foreach(var hit in Physics.CapsuleCastAll(from+Vector3.up*.36f,from+Vector3.up*1.4f,.28f,delta.normalized,length,~0,QueryTriggerInteraction.Ignore))
                    if(!(hit.collider is TerrainCollider)&&!(hit.collider is CharacterController)&&hit.collider.GetComponentInParent<NavMeshAgent>()==null&&(actor==null||!hit.transform.IsChildOf(actor))&&hit.distance>.06f)return false;
            }return true;
        }
        public static bool Plan(Vector3 start,Vector3 desired,Transform actor,out NavMeshPath path,float search=3,int agentType=0)
        {
            path=new NavMeshPath();var filter=Filter(agentType);
            if(!NavMesh.SamplePosition(start,out var from,1,filter))return false;
            for(float radius=0;radius<=search;radius+=.55f)
                for(int angle=0;angle<(radius==0?1:12);angle++)
                {
                    var p=desired+Quaternion.Euler(0,angle*30,0)*Vector3.forward*radius;float ground=VillageLife.Ground(p);p.y=ground;
                    if(!NavMesh.SamplePosition(p,out var end,.6f,filter)||Mathf.Abs(end.position.y-ground)>.5f||!Clear(end.position,actor))continue;
                    if(NavMesh.CalculatePath(from.position,end.position,filter,path)&&path.status==NavMeshPathStatus.PathComplete&&PathClear(path,actor))return true;
                }
            return false;
        }
        public void RequestRebuild(){requested=true;refreshAt=Time.time+.25f;}
        void Update(){if(requested&&!Rebuilding&&Time.time>=refreshAt&&surface!=null)StartCoroutine(Rebuild());}
        IEnumerator Rebuild()
        {
            requested=false;Rebuilding=true;Physics.SyncTransforms();
            var work=surface.UpdateNavMesh(surface.navMeshData);yield return work;
            Revision++;Rebuilding=false;Changed?.Invoke();
            foreach(var agent in FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None))if(agent.enabled&&agent.isOnNavMesh&&agent.hasPath)agent.SetDestination(agent.destination);
        }
    }
}
