using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class TemperateWeatherV19:MonoBehaviour
 {
  CampaignRuntime c;Light sun;float next;Material sky,original;
  public float Hour{get;private set;}=9;
  void Start(){c=GetComponent<CampaignRuntime>();sun=FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l=>l.type==LightType.Directional&&l.enabled);if(sun!=null)RenderSettings.sun=sun;original=RenderSettings.skybox;if(original!=null){sky=new Material(original);RenderSettings.skybox=sky;}}
  void Update()
  {
   if(c?.State==null||sun==null||Time.unscaledTime<next||c.cinematicDirector.IsPlaying||(c.GetComponent<ConstructionFilmV19>()?.Playing??false))return;next=Time.unscaledTime+1;float day=Mathf.Clamp01(c.State.elapsedSeconds/Mathf.Max(1,c.Data.durationSeconds));Hour=9+day*9;float dusk=Mathf.SmoothStep(0,1,Mathf.Clamp01((day-.65f)/.35f));sun.transform.rotation=Quaternion.Euler(Mathf.Lerp(49,13,day),Mathf.Lerp(-32,62,day),0);sun.color=Color.Lerp(new Color(1,.98f,.93f),new Color(1,.84f,.66f),dusk);sun.intensity=Mathf.Lerp(1.05f,.68f,dusk);RenderSettings.fogColor=Color.Lerp(new Color(.61f,.73f,.77f),new Color(.51f,.61f,.68f),dusk);RenderSettings.fogDensity=.0028f+dusk*.001f;RenderSettings.fog=true;RenderSettings.fogMode=FogMode.Linear;float far=c.bindings.gameplayCamera.farClipPlane;RenderSettings.fogStartDistance=far*.35f;RenderSettings.fogEndDistance=far*.82f;if(sky!=null)sky.SetColor("_GroundColor",RenderSettings.fogColor);if(sky!=null)sky.SetFloat("_Exposure",Mathf.Lerp(.9f,.70f,dusk));
  }
  void LateUpdate(){if(c==null)return;float far=c.bindings.gameplayCamera.farClipPlane;RenderSettings.fog=true;RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogStartDistance=far*.35f;RenderSettings.fogEndDistance=far*.82f;if(sky!=null)sky.SetColor("_GroundColor",RenderSettings.fogColor);}
  void OnDestroy(){if(sky!=null){if(RenderSettings.skybox==sky)RenderSettings.skybox=original;Destroy(sky);}}
 }
}
