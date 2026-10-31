using System.Collections;
using System.Collections.Generic;
using System;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 public static class CinematicNavigationV15
 {
  // Some source workshop colliders extend beyond the baked visual mesh.
  // Carve their actual occupied volume, rather than walking through them or disabling collision.
  public static IEnumerator Prepare(CampaignRuntime c,FilmV15 film,Func<bool> cancelled=null)
  {
   if(film==null)yield break;var navigation=c.GetComponent<VillageNavigation>();if(navigation==null)yield break;
   var hits=new RaycastHit[64];var filter=VillageNavigation.Filter();
   for(int pass=0;pass<3;pass++)
   {
    if(cancelled!=null&&cancelled())yield break;
    var blocking=new HashSet<Collider>();
    foreach(var block in film.blocking)
    {
     var actor=c.bindings.Find(block.actor);var site=c.bindings.Find(block.site);if(actor==null||site==null)continue;
     if(VillageNavigation.Plan(actor.position,site.position+block.offset,actor,out var safe,12,0,4))continue;
     if(!NavMesh.SamplePosition(actor.position,out var from,4,filter)||!NavMesh.SamplePosition(site.position+block.offset,out var end,6,filter))continue;
     var path=new NavMeshPath();if(!NavMesh.CalculatePath(from.position,end.position,filter,path))continue;
     for(int i=1;i<path.corners.Length;i++)
     {
      var delta=path.corners[i]-path.corners[i-1];int count=Physics.CapsuleCastNonAlloc(path.corners[i-1]+Vector3.up*.36f,path.corners[i-1]+Vector3.up*1.4f,.3f,delta.normalized,hits,delta.magnitude,~0,QueryTriggerInteraction.Ignore);
      for(int h=0;h<count;h++){var col=hits[h].collider;if(hits[h].distance>.06f&&!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&!col.transform.IsChildOf(actor)&&col.transform.Find("Volume occupé V15")==null)blocking.Add(col);}
     }
    }
    if(blocking.Count==0)yield break;
    foreach(var collider in blocking)
    {
     var box=collider.bounds;if(box.size.y<.12f||box.size.x>30||box.size.z>30)continue;
     var go=new GameObject("Volume occupé V15");go.transform.position=box.center;go.transform.SetParent(collider.transform,true);go.transform.rotation=Quaternion.identity;
     var obstacle=go.AddComponent<NavMeshObstacle>();obstacle.shape=NavMeshObstacleShape.Box;obstacle.size=box.size+new Vector3(.12f,.1f,.12f);obstacle.carving=true;obstacle.carveOnlyStationary=false;
    }
    navigation.RequestRebuild();float deadline=Time.realtimeSinceStartup+6;while(navigation.Pending&&Time.realtimeSinceStartup<deadline&&!(cancelled?.Invoke()??false))yield return null;yield return null;
   }
  }
 }
}
