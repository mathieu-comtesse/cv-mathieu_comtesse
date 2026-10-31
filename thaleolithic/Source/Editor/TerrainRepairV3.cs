using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEditor.Rendering.HighDefinition;
using UnityEditor.SceneManagement;
namespace UngaBunga45001.Editor
{
    public static class TerrainRepairV3
    {
        const string Folder="Assets/UngaBunga45001/Generated/TerrainRepairV3";
        static readonly Dictionary<GameObject,GameObject> prefabs=new Dictionary<GameObject,GameObject>();
        static readonly List<string> notes=new List<string>();
        public static void Apply()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
            foreach(var terrain in UnityEngine.Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None))
            {
                var data=terrain.terrainData;notes.Add("Terrain "+terrain.name+" "+AssetDatabase.GetAssetPath(data)+" trees="+data.treeInstanceCount+" treeTypes="+data.treePrototypes.Length+" detailTypes="+data.detailPrototypes.Length);
                var trees=data.treePrototypes;for(int i=0;i<trees.Length;i++)if(trees[i].prefab!=null)trees[i].prefab=Repair(trees[i].prefab);
                data.treePrototypes=trees;
                var details=data.detailPrototypes;
                for(int i=0;i<details.Length;i++)
                {
                    var d=details[i];notes.Add("Detail "+i+" mesh="+d.prototype?.name+" texture="+AssetDatabase.GetAssetPath(d.prototypeTexture)+" healthy="+d.healthyColor+" dry="+d.dryColor+" mode="+d.renderMode+" instancing="+d.useInstancing);
                    if(d.prototype!=null){d.prototype=Repair(d.prototype);d.renderMode=DetailRenderMode.VertexLit;d.useInstancing=true;}
                }
                data.detailPrototypes=details;EditorUtility.SetDirty(data);terrain.Flush();
            }
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/terrain-material-repair.txt",notes);
        }
        static GameObject Repair(GameObject source)
        {
            if(prefabs.TryGetValue(source,out var result))return result;
            var go=UnityEngine.Object.Instantiate(source);go.name=source.name;
            foreach(var tr in go.GetComponentsInChildren<Transform>(true))GameObjectUtility.RemoveMonoBehavioursWithMissingScript(tr.gameObject);
            foreach(var r in go.GetComponentsInChildren<Renderer>(true))
            {
                var materials=r.sharedMaterials;
                for(int i=0;i<materials.Length;i++)
                {
                    var old=materials[i];if(old==null)continue;notes.Add("Prototype "+source.name+" renderer="+r.name+" material="+old.name+" shader="+old.shader?.name);
                    string path=Folder+"/"+old.name.Replace('/','-')+".mat";var mat=AssetDatabase.LoadAssetAtPath<Material>(path);
                    if(mat==null)mat=new Material(Shader.Find("HDRP/Lit"));
                    {
                        var original=AssetDatabase.LoadAssetAtPath<Material>("Assets/Material/"+old.name+".mat");if(original!=null)old=original;
                        mat.shader=Shader.Find("HDRP/Lit");mat.SetTexture("_BaseColorMap",null);var color=old.HasProperty("_Color")?old.GetColor("_Color"):Color.white;color.a=1;mat.SetColor("_BaseColor",color);mat.SetFloat("_Metallic",0);mat.SetFloat("_Smoothness",.08f);mat.SetFloat("_DoubleSidedEnable",1);mat.enableInstancing=true;
                        var so=new SerializedObject(old);var tex=so.FindProperty("m_SavedProperties.m_TexEnvs");var slots=new Dictionary<string,Texture>();
                        for(int n=0;n<tex.arraySize;n++){var p=tex.GetArrayElementAtIndex(n);var t=p.FindPropertyRelative("second.m_Texture").objectReferenceValue as Texture;if(t is Texture2D)slots[p.FindPropertyRelative("first").stringValue]=t;}
                        Texture albedo=null;foreach(string key in new[]{"_MainTexture","_Albedo","_AlbedoTexture","_MainTex","_BaseColorMap","_Texture"})if(slots.TryGetValue(key,out var t)){albedo=t;break;}
                        if(albedo==null)albedo=slots.Values.FirstOrDefault(t=>!System.Text.RegularExpressions.Regex.IsMatch(t.name,"mask|normal|noise|nrm|spec|dissolve|emission",System.Text.RegularExpressions.RegexOptions.IgnoreCase));
                        if(albedo!=null){mat.SetTexture("_BaseColorMap",albedo);mat.SetFloat("_AlphaCutoffEnable",1);mat.SetFloat("_AlphaCutoff",.4f);}
                        HDShaderUtils.ResetMaterialKeywords(mat);if(!AssetDatabase.Contains(mat))AssetDatabase.CreateAsset(mat,path);EditorUtility.SetDirty(mat);notes.Add("Material repaired "+path+" albedo="+albedo?.name);
                    }
                    materials[i]=mat;
                }
                r.sharedMaterials=materials;
            }
            result=PrefabUtility.SaveAsPrefabAsset(go,Folder+"/"+source.name.Replace('/','-')+".prefab");UnityEngine.Object.DestroyImmediate(go);prefabs[source]=result;return result;
        }
    }
}
