using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

/// <summary>Etape 2 : l'ambiance des captures de référence : nuit bleue lunaire, points chauds, brume dense, bloom, vignette, étalonnage froid.</summary>
public static class TalasPaintedLook
{
 const string ProfilePath=TalasPaintedImport.Root+"/TalasPaintedLook.asset";

 [MenuItem("Talas/Peint/2 Appliquer l'ambiance")]
 public static void Apply()
 {
  RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Trilight;
  RenderSettings.ambientSkyColor=new Color(.20f,.31f,.48f);RenderSettings.ambientEquatorColor=new Color(.13f,.21f,.33f);RenderSettings.ambientGroundColor=new Color(.06f,.10f,.14f);
  RenderSettings.fog=true;RenderSettings.fogMode=FogMode.ExponentialSquared;RenderSettings.fogDensity=.011f;RenderSettings.fogColor=new Color(.05f,.10f,.17f);
  foreach(var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None))if(l.type==LightType.Directional){l.color=new Color(.55f,.74f,1f);l.intensity=1.15f;l.shadows=LightShadows.Soft;l.shadowStrength=.85f;}
  var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>(ProfilePath);if(profile==null){profile=ScriptableObject.CreateInstance<VolumeProfile>();AssetDatabase.CreateAsset(profile,ProfilePath);}
  var bloom=Get<Bloom>(profile);bloom.threshold.Override(.85f);bloom.intensity.Override(1.5f);bloom.scatter.Override(.72f);bloom.tint.Override(new Color(1f,.82f,.65f));
  var vig=Get<Vignette>(profile);vig.intensity.Override(.3f);vig.smoothness.Override(.7f);
  var grade=Get<ColorAdjustments>(profile);grade.postExposure.Override(-.15f);grade.contrast.Override(16f);grade.saturation.Override(14f);grade.colorFilter.Override(new Color(.92f,.97f,1.05f));
  var tone=Get<Tonemapping>(profile);tone.mode.Override(TonemappingMode.ACES);
  EditorUtility.SetDirty(profile);
  var go=GameObject.Find("Volume peint");if(go==null)go=new GameObject("Volume peint");var v=go.GetComponent<Volume>();if(v==null)v=go.AddComponent<Volume>();v.isGlobal=true;v.priority=10;v.sharedProfile=profile;
  foreach(var cam in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)){var d=cam.GetUniversalAdditionalCameraData();d.renderPostProcessing=true;cam.allowHDR=true;}
  AssetDatabase.SaveAssets();Debug.Log("Talas peint : ambiance appliquée");
 }

 static T Get<T>(VolumeProfile p) where T:VolumeComponent
 {
  if(p.TryGet(out T c))return c;c=p.Add<T>(true);AssetDatabase.AddObjectToAsset(c,p);return c;
 }
}
