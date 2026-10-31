using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 public static class CinematicSpawnSafetyV15
 {
  // Repair legacy spawn pockets during load, before any camera sequence starts.
  // A physically valid route is always preferred to relocation.
  public static void Repair(CampaignRuntime c)
  {
   if(c.State==null||c.State.cinematicTimeV15>0)return;var filter=VillageNavigation.Filter();var hub=c.bindings.Find("rassemblement");if(hub==null||!NavMesh.SamplePosition(hub.position,out var center,8,filter))return;
   foreach(var actor in c.bindings.characters)
   {
    if(actor.id=="dylan")continue;var state=c.State.characters.Find(s=>s.id==actor.id);if(state==null||!state.alive)continue;var root=c.bindings.Find(actor.id);if(root==null)continue;var wanted=state.positionSaved?state.position:root.position;
    if(VillageNavigation.Plan(wanted,center.position,root,out var existing,3.5f))continue;
    if(CinematicPhysicalRouteV15.Try(wanted,center.position,root,out var physical,false))continue;
    if(!NavMesh.SamplePosition(wanted,out var nearby,8,filter))continue;
    bool repaired=false;
    for(float radius=1;radius<=9&&!repaired;radius+=.6f)for(int angle=0;angle<16;angle++)
    {
     var p=wanted+Quaternion.Euler(0,angle*22.5f,0)*Vector3.forward*radius;p.y=HutCollapse.TerrainFloor(p);if(!NavMesh.SamplePosition(p,out var safe,.6f,filter)||Mathf.Abs(safe.position.y-p.y)>.5f||!VillageNavigation.Clear(safe.position,root))continue;
     var path=new NavMeshPath();if(!NavMesh.CalculatePath(safe.position,center.position,filter,path)||path.status!=NavMeshPathStatus.PathComplete)continue;
     if(!CinematicPhysicalRouteV15.Try(safe.position,center.position,root,out var connection,false))continue;
     var point=safe.position+Vector3.up*.04f;var agent=root.GetComponent<NavMeshAgent>();if(agent!=null&&agent.enabled&&agent.isOnNavMesh)agent.Warp(point);else root.position=point;state.position=point;state.positionSaved=true;state.destination=point;state.taskPhase=0;state.taskTimer=0;
     var life=c.GetComponent<VillageLife>();if(life!=null)foreach(var routine in life.routines)if(routine.id==actor.id){if(Vector3.Distance(routine.workplace,wanted)<2)routine.workplace=point;if(Vector3.Distance(routine.rest,wanted)<2)routine.rest=point;}
     string receipt="migration:walkable-spawn-v15:"+actor.id;if(!c.State.flags.Contains(receipt))c.State.flags.Add(receipt);repaired=true;break;
    }
   }
  }
 }
}
