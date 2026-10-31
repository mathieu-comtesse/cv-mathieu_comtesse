using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001.Editor
{
    public static class RecoveredVisualAudit
    {
        [Serializable]private class Item{public string name,path,shader,shaderPath;public int rendererUses;public string[] textureProperties,colorProperties;}
        [Serializable]private class Report{public Item[] materials;public string[] volumes,layers,fontTextures;}
        public static void Inspect()
        {
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var renderers=scene.GetRootGameObjects().SelectMany(r=>r.GetComponentsInChildren<Renderer>(true)).ToArray();
            var materials=renderers.SelectMany(r=>r.sharedMaterials).Where(m=>m!=null).Distinct().Select(material=>
            {
                var so=new SerializedObject(material);var saved=so.FindProperty("m_SavedProperties");var tex=saved.FindPropertyRelative("m_TexEnvs");var colors=saved.FindPropertyRelative("m_Colors");
                return new Item{name=material.name,path=AssetDatabase.GetAssetPath(material),shader=material.shader==null?"missing":material.shader.name,shaderPath=material.shader==null?"":AssetDatabase.GetAssetPath(material.shader),rendererUses=renderers.Count(r=>r.sharedMaterials.Contains(material)),
                    textureProperties=Enumerable.Range(0,tex.arraySize).Select(i=>{var p=tex.GetArrayElementAtIndex(i);return p.FindPropertyRelative("first").stringValue+"="+AssetDatabase.GetAssetPath(p.FindPropertyRelative("second").FindPropertyRelative("m_Texture").objectReferenceValue);}).ToArray(),
                    colorProperties=Enumerable.Range(0,colors.arraySize).Select(i=>{var p=colors.GetArrayElementAtIndex(i);return p.FindPropertyRelative("first").stringValue+"="+p.FindPropertyRelative("second").colorValue;}).ToArray()};
            }).OrderByDescending(m=>m.rendererUses).ToArray();
            var report=new Report{materials=materials,
                volumes=scene.GetRootGameObjects().SelectMany(r=>r.GetComponentsInChildren<Volume>(true)).Select(v=>v.name+" enabled="+v.enabled+" active="+v.gameObject.activeInHierarchy+" global="+v.isGlobal+" weight="+v.weight+" priority="+v.priority+" profile="+AssetDatabase.GetAssetPath(v.sharedProfile)).ToArray(),
                layers=scene.GetRootGameObjects().SelectMany(r=>r.GetComponentsInChildren<Terrain>(true)).SelectMany(t=>t.terrainData.terrainLayers.Select(l=>l.name+" diffuse="+AssetDatabase.GetAssetPath(l.diffuseTexture)+" normal="+AssetDatabase.GetAssetPath(l.normalMapTexture))).ToArray(),
                fontTextures=AssetDatabase.LoadAllAssetsAtPath("Assets/Resources/fonts & materials/Inter-Regular SDF.asset").OfType<Texture2D>().Select(t=>t.name+" "+t.width+"x"+t.height+" readable="+t.isReadable+" bytes="+(t.isReadable?t.GetRawTextureData().Length:-1)).ToArray()};
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-visual-audit.json",JsonUtility.ToJson(report,true));
        }
    }
}
