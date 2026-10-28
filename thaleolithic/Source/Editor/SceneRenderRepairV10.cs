using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
public static class SceneRenderRepairV10
{
 public static void Apply()
 {
  const string folder="Assets/UngaBunga45001/Generated/RenderV10";Directory.CreateDirectory(folder);AssetDatabase.Refresh();
  foreach(var terrain in Terrain.activeTerrains)
  {
   // Keep the source layers and terrain topology intact; only the authored scene uses these copies.
   var layers=terrain.terrainData.terrainLayers;for(int i=0;i<layers.Length;i++)
   {
    var source=layers[i];string path=folder+"/"+source.name.Replace(" · V10","")+".terrainlayer";var copy=AssetDatabase.LoadAssetAtPath<TerrainLayer>(path);
    if(copy==null){copy=Object.Instantiate(source);copy.name=source.name+" · V10";AssetDatabase.CreateAsset(copy,path);}
    copy.normalScale=source.name.Contains("Sand")?.18f:.28f;copy.smoothness=source.name.Contains("Wet")?.08f:0;copy.metallic=0;copy.specular=Color.black;
    // Alpha in the recovered albedo is not a polished surface or terrain transparency mask.
    var serialized=new SerializedObject(copy);var smooth=serialized.FindProperty("m_SmoothnessSource");if(smooth!=null)smooth.intValue=0;serialized.ApplyModifiedPropertiesWithoutUndo();EditorUtility.SetDirty(copy);layers[i]=copy;
   }
   terrain.terrainData.terrainLayers=layers;EditorUtility.SetDirty(terrain.terrainData);
  }
  foreach(var light in Object.FindObjectsByType<Light>(FindObjectsInactive.Include,FindObjectsSortMode.None))if(light.type==LightType.Directional&&light.shadows!=LightShadows.None)
  {light.shadows=LightShadows.Soft;light.shadowBias=.035f;light.shadowNormalBias=.12f;light.shadowStrength=.84f;EditorUtility.SetDirty(light);}
  #if UNGA_WEB_RENDERER
  var pipeline=UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline as UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset;
  if(pipeline!=null){pipeline.mainLightShadowmapResolution=2048;pipeline.shadowCascadeCount=2;pipeline.shadowDistance=40;var serialized=new SerializedObject(pipeline);var soft=serialized.FindProperty("m_SoftShadowsSupported");if(soft!=null)soft.boolValue=true;serialized.ApplyModifiedPropertiesWithoutUndo();EditorUtility.SetDirty(pipeline);}
  #endif
  EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());EditorSceneManager.SaveOpenScenes();AssetDatabase.SaveAssets();
 }
}
