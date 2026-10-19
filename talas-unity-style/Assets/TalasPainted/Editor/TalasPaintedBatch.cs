using UnityEditor;
using UnityEditor.SceneManagement;

/// <summary>Les trois étapes d'un coup, pour `Unity.exe -batchmode -executeMethod TalasPaintedBatch.Run` (voir Brancher-Unity.cmd). Le détail reste dans le journal Unity.</summary>
public static class TalasPaintedBatch
{
 const string Scene="Assets/TalasScenes/Talas-Campagne.unity";

 public static void Run()
 {
  TalasPaintedImport.Run();
  var scene=EditorSceneManager.OpenScene(Scene);
  TalasPaintedLook.Apply();
  TalasPaintedDress.Run();
  EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
  UnityEngine.Debug.Log("Talas peint : étapes 1, 2 et 3 terminées sur "+Scene);
 }
}
