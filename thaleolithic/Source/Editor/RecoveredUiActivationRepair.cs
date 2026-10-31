using System;
using System.IO;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class RecoveredUiActivationRepair
    {
        [Serializable]private class Receipt{public int nativeCanvasRootsDeactivated,tmpSettingsUpdated;public bool staticAtlasReadable;}
        public static void Apply()
        {
            const string root="E:/UNGA-BUNGA-45001";
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);var receipt=new Receipt();
            foreach(var parent in scene.GetRootGameObjects())foreach(var canvas in parent.GetComponentsInChildren<Canvas>(true))
                if(canvas.GetComponentInParent<CampaignHud>()==null&&canvas.gameObject.activeSelf){canvas.gameObject.SetActive(false);receipt.nativeCanvasRootsDeactivated++;}
            var font=AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/UngaBunga45001/Generated/Rendering/InterRegular-StaticSDF.asset");
            receipt.staticAtlasReadable=font!=null&&font.atlasTextures[0]!=null&&font.atlasTextures[0].width==2048;
            if(!receipt.staticAtlasReadable)throw new InvalidOperationException("Persistent static font atlas failed reload validation");
            foreach(string guid in AssetDatabase.FindAssets("t:TMP_Settings",new[]{"Assets"}))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);var asset=AssetDatabase.LoadAssetAtPath<TMP_Settings>(path);var settings=new SerializedObject(asset);
                string backup=root+"/Analysis/TmpSettingsBackups/"+path;if(!File.Exists(backup)){Directory.CreateDirectory(Path.GetDirectoryName(backup));File.Copy(path,backup);}
                var field=settings.FindProperty("m_defaultFontAsset");if(field!=null){field.objectReferenceValue=font;settings.ApplyModifiedPropertiesWithoutUndo();EditorUtility.SetDirty(asset);receipt.tmpSettingsUpdated++;}
            }
            EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();File.WriteAllText(root+"/Analysis/unity-ui-activation-repair.json",JsonUtility.ToJson(receipt,true));
        }
    }
}
