using System.Collections.Generic;
using System.IO;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class WaterPassageRepair
    {
        public static void Apply()
        {
            const string scene="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity";
            const string backup="E:/UNGA-BUNGA-45001/Revision3/SceneBeforeWaterPassage.unity";if(!File.Exists(backup))File.Copy(scene,backup);
            EditorSceneManager.OpenScene(scene,OpenSceneMode.Single);var campaign=Object.FindFirstObjectByType<CampaignRuntime>();
            var previous=GameObject.Find("Zones d'eau exclues des trajets PNJ");if(previous!=null)Object.DestroyImmediate(previous);
            var root=new GameObject("Zones d'eau exclues des trajets PNJ");int disabled=0,cells=0;var notes=new List<string>();
            foreach(var water in Object.FindObjectsByType<WaterSurface>(FindObjectsSortMode.None))
            {
                if(water.geometryType!=WaterGeometryType.Custom)continue;
                foreach(var renderer in water.meshRenderers)
                {
                    // Rendering water is not a solid floor. The original terrain still carries the player.
                    foreach(var collider in renderer.GetComponents<Collider>())if(collider.enabled){collider.enabled=false;disabled++;notes.Add("Disabled solid water surface: "+collider.name);}
                    var mesh=renderer.GetComponent<MeshFilter>().sharedMesh;var vertices=mesh.vertices;var triangles=mesh.triangles;for(int i=0;i<vertices.Length;i++)vertices[i]=renderer.transform.TransformPoint(vertices[i]);var bounds=renderer.bounds;
                    bool Inside(Vector3 p)
                    {
                        for(int i=0;i<triangles.Length;i+=3)
                        {
                            var a=vertices[triangles[i]];var b=vertices[triangles[i+1]];var c=vertices[triangles[i+2]];
                            float ab=(p.x-b.x)*(a.z-b.z)-(a.x-b.x)*(p.z-b.z),bc=(p.x-c.x)*(b.z-c.z)-(b.x-c.x)*(p.z-c.z),ca=(p.x-a.x)*(c.z-a.z)-(c.x-a.x)*(p.z-a.z);
                            if(!((ab<0||bc<0||ca<0)&&(ab>0||bc>0||ca>0)))return true;
                        }
                        return false;
                    }
                    for(float x=bounds.min.x+1;x<bounds.max.x;x+=2)for(float z=bounds.min.z+1;z<bounds.max.z;z+=2)
                    {
                        var p=new Vector3(x,bounds.center.y-1,z);if(!Inside(p))continue;
                        var go=new GameObject("Eau - navigation interdite");go.transform.SetParent(root.transform,false);go.transform.position=p;
                        var volume=go.AddComponent<NavMeshModifierVolume>();volume.area=3;volume.size=new Vector3(2,4,2);cells++;
                    }
                }
            }
            Physics.SyncTransforms();var surface=campaign.GetComponent<VillageNavigation>().surface;surface.BuildNavMesh();
            const string nav="Assets/UngaBunga45001/Generated/Navigation/WaterPassageNavMesh.asset";Directory.CreateDirectory(Path.GetDirectoryName(nav));
            var existing=AssetDatabase.LoadAssetAtPath<UnityEngine.AI.NavMeshData>(nav);if(existing!=null)throw new IOException("Water navigation asset already exists; inspect before replacing");AssetDatabase.CreateAsset(surface.navMeshData,nav);
            EditorUtility.SetDirty(surface);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
            notes.Add("solidWaterCollidersDisabled="+disabled+" waterNavCells="+cells+" original terrain colliders retained");File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/water-passage-repair.txt",notes);
            RecoveredWindowsBuild.Build();
        }
    }
}
