using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class RecoveredPlaybackRepair
    {
        public static void Fix()
        {
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var bindings=UnityEngine.Object.FindFirstObjectByType<SceneBindings>();
            var camera=bindings.gameplayCamera;
            var listener=camera.GetComponent<AudioListener>();
            if(listener==null)listener=camera.gameObject.AddComponent<AudioListener>();
            listener.enabled=true;
            bindings.player.GetComponent<CharacterController>().minMoveDistance=0;
            EditorSceneManager.SaveScene(scene);
        }
    }
}
