using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UngaBunga45001;
public static class RestoreNativeHeadsV14
{
 [Serializable]class List{public Actor[] actors;}
 [Serializable]class Actor{public string id;public Skin[] skins;}
 [Serializable]class Skin{public string asset;}
 public static void Run()
 {
  bool web=Application.dataPath.Contains("Unity-Web");EditorSceneManager.OpenScene(web?"Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity":"Assets/UngaBunga45001/Scenes/UngaBunga45001.unity");
  var bindings=UnityEngine.Object.FindFirstObjectByType<SceneBindings>();var originals=JsonUtility.FromJson<List>(File.ReadAllText("E:/UNGA-BUNGA-45001/Revision14/native-heads-before.json"));int count=0;
  foreach(var source in originals.actors)
  {
   var actor=bindings.characters.First(c=>c.id==source.id);var skin=actor.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>(true).First(s=>s.bones.Length>20);var original=AssetDatabase.LoadAssetAtPath<Mesh>(source.skins[0].asset);if(original==null)throw new Exception("Original native mesh missing: "+source.id);skin.sharedMesh=original;
   foreach(var component in actor.meshyActor.GetComponentsInChildren<MonoBehaviour>(true).Where(c=>c!=null&&c.GetType().Name=="HeadExpressionV14").ToArray())UnityEngine.Object.DestroyImmediate(component);
   if(skin.sharedMesh!=original||skin.sharedMesh.blendShapeCount!=original.blendShapeCount)throw new Exception("Native restoration failed");EditorUtility.SetDirty(skin);count++;
  }
  EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());EditorSceneManager.SaveOpenScenes();AssetDatabase.SaveAssets();
  File.WriteAllText("E:/UNGA-BUNGA-45001/Revision14/native-heads-restored-"+(web?"web":"windows")+".json","{\"status\":\"passed\",\"nativeActorsRestored\":"+count+"}");
  Debug.Log("NATIVE_HEADS_RESTORED_V14 "+count);EditorApplication.Exit(count==9?0:1);
 }
}
