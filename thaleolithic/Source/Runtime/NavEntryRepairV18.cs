using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 public sealed class NavEntryRepairV18:MonoBehaviour
 {
  CampaignRuntime c;float next;public int Recoveries{get;private set;}
  void Start(){c=GetComponent<CampaignRuntime>();}
  void Update()
  {
   if(c?.State==null||c.cinematicDirector.IsPlaying||Time.unscaledTime<next)return;next=Time.unscaledTime+.75f;
   foreach(var b in c.bindings.characters)
   {
    if(b.id==c.Data.playerCharacterId||c.State.characters.Find(s=>s.id==b.id)?.alive!=true)continue;var root=c.bindings.Find(b.id);if(root==null)continue;var agent=root.GetComponent<NavMeshAgent>();
    if(agent==null||!agent.enabled||agent.isOnNavMesh||(b.animator.GetComponent<CinematicActorV15>()?.Owned??false))continue;
    if(!NavMesh.SamplePosition(root.position,out var hit,.9f,VillageNavigation.Filter(agent.agentTypeID))||Mathf.Abs(hit.position.y-VillageLife.Ground(hit.position))>.3f||!VillageNavigation.Clear(hit.position,root)||!VillageNavigation.SegmentClear(root.position,hit.position,root))continue;
    // Only a sub-metre, physically clear correction at a changed NavMesh boundary.
    var body=root.GetComponent<CharacterController>();bool enabled=body!=null&&body.enabled;if(body!=null)body.enabled=false;bool recovered=agent.Warp(hit.position+Vector3.up*.04f);if(recovered&&agent.isOnNavMesh)agent.nextPosition=root.position;if(body!=null)body.enabled=enabled;if(recovered){root.GetComponent<VillagerBrain>()?.ResumeAfterCinematic();Recoveries++;}
   }
  }
 }
}
