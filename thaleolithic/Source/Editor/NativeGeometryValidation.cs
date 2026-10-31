using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class NativeGeometryValidation
    {
        public static void Prepare()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var campaign=Object.FindFirstObjectByType<CampaignRuntime>();
            var meshes=campaign.bindings.characters.SelectMany(a=>a.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>()).Select(r=>r.sharedMesh).Distinct().ToArray();
            foreach(var mesh in meshes)
            {
                var serialized=new SerializedObject(mesh);var readable=serialized.FindProperty("m_IsReadable");
                if(readable==null)throw new System.InvalidOperationException("Mesh readability field missing: "+mesh.name);
                readable.boolValue=true;serialized.ApplyModifiedPropertiesWithoutUndo();EditorUtility.SetDirty(mesh);
            }
            AssetDatabase.SaveAssets();
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/native-readable-meshes.txt",meshes.Select(m=>m.name+" readable="+m.isReadable+" vertices="+m.vertexCount+" path="+AssetDatabase.GetAssetPath(m)));
            RecoveredWindowsBuild.Build();
        }
    }
}
