using UnityEngine;
namespace UngaBunga45001
{
 public static class CinematicLightRigV15
 {
  public static Light Set(Camera camera,string mood,bool enabled)
  {
   var child=camera.transform.Find("Lumière douce de réalisation");Light light=child==null?null:child.GetComponent<Light>();
   if(light==null){var go=new GameObject("Lumière douce de réalisation");go.transform.SetParent(camera.transform,false);go.transform.localPosition=new Vector3(-.65f,.75f,0);light=go.AddComponent<Light>();light.type=LightType.Spot;light.range=15;light.spotAngle=85;light.shadows=LightShadows.None;RenderBackend.PortraitLight(light);light.intensity*=1.8f;light.cullingMask=camera.cullingMask;}
   light.color=mood=="accident"||mood=="tension"?new Color(.8f,.87f,1):new Color(1,.92f,.82f);light.enabled=enabled;return light;
  }
 }
}
