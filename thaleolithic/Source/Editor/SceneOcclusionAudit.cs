using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class SceneOcclusionAudit
    {
        public static void Run()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity");var center=new Vector3(350.92f,14,281.88f);var region=new Bounds(center,new Vector3(95,40,95));
            var rows=Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.enabled&&r.bounds.size.y>2&&r.bounds.Intersects(region)).OrderByDescending(r=>r.bounds.size.magnitude).Take(160).Select(r=>r.name+" | "+r.GetComponent<MeshFilter>()?.sharedMesh?.name+" | center="+r.bounds.center+" size="+r.bounds.size+" | scale="+r.transform.lossyScale+" | parent="+r.transform.parent?.name+" | prefab="+PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(r.gameObject));
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision2/scene-occluders.txt",rows);
        }
    }
}
