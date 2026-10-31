using UnityEngine;
namespace UngaBunga45001
{
 public static class CinematicRiverBankV15
 {
  public static bool Find(CampaignRuntime c,Transform actor,out Vector3 edge,out Vector3 flow,out Vector3[] route)
  {
   edge=actor.position;flow=Vector3.forward;route=System.Array.Empty<Vector3>();var site=c.bindings.Find("berge_observation");var water=Object.FindFirstObjectByType<EnvironmentInteraction>();if(site==null||water==null)return false;
   // Choose the closest actual water footprint, then stand on its dry side.
   for(float radius=1;radius<=18;radius+=1)for(int angle=0;angle<24;angle++)
   {
    var direction=Quaternion.Euler(0,angle*15,0)*Vector3.forward;var wet=site.position+direction*radius;wet.y=HutCollapse.TerrainFloor(wet);if(!water.SampleDepth(wet,out float depth)||depth<.12f)continue;
    for(float back=1;back<=3;back+=.5f)
    {
     var dry=wet-direction*back;dry.y=HutCollapse.TerrainFloor(dry)+.04f;water.SampleDepth(dry,out float dryDepth);if(dryDepth>.03f||!VillageNavigation.Clear(dry,actor))continue;
     if(!CinematicPhysicalRouteV15.Try(actor.position,dry,actor,out route,false))continue;edge=dry;flow=direction;return true;
    }
   }
   return false;
  }
 }
}
