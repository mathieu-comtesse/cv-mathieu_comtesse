using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Playables;
namespace UngaBunga45001.Editor
{
    public static class RecoveredSceneCleanup
    {
        [Serializable] private class Receipt {public int removedMissingScripts,removedGraphMachines,disabledSourceInputs,disabledSourceTimelines;public string scene;}
        public static void Clean()
        {
            const string path="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity";
            var scene=EditorSceneManager.OpenScene(path,OpenSceneMode.Single);var receipt=new Receipt{scene=path};
            foreach(var root in scene.GetRootGameObjects())foreach(var component in root.GetComponentsInChildren<MonoBehaviour>(true))
            {
                if(component==null)continue;
                string ns=component.GetType().Namespace??"";
                if(ns.StartsWith("Unity.VisualScripting",StringComparison.Ordinal)){UnityEngine.Object.DestroyImmediate(component);receipt.removedGraphMachines++;}
                else if(ns.StartsWith("UnityEngine.InputSystem",StringComparison.Ordinal) && !(component is UnityEngine.InputSystem.UI.InputSystemUIInputModule)){component.enabled=false;receipt.disabledSourceInputs++;}
            }
            foreach(var root in scene.GetRootGameObjects())
            {
                foreach(var go in root.GetComponentsInChildren<Transform>(true))receipt.removedMissingScripts+=GameObjectUtility.RemoveMonoBehavioursWithMissingScript(go.gameObject);
                foreach(var director in root.GetComponentsInChildren<PlayableDirector>(true)){director.playOnAwake=false;director.enabled=false;receipt.disabledSourceTimelines++;}
            }
            EditorSceneManager.SaveScene(scene);
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-adapted-scene-cleanup.json",JsonUtility.ToJson(receipt,true));
        }
    }
}
