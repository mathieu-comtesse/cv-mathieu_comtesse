using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEditor.Rendering.HighDefinition;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class RecoveredRenderingRepair
    {
        [Serializable] private class Receipt {public int disabledUnrecoveredCustomPasses,meshDetailPrototypes,validatedMaterials,removedOrphanFontTextures;public float authoredExposureEV=15;public bool originalShaderParity=false;public string[] notes;}
        public static void Repair()
        {
            const string generated="Assets/UngaBunga45001/Generated/Rendering";
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);var receipt=new Receipt();
            foreach(var root in scene.GetRootGameObjects())foreach(var pass in root.GetComponentsInChildren<CustomPassVolume>(true))if(pass.enabled){pass.enabled=false;receipt.disabledUnrecoveredCustomPasses++;}
            string profilePath=generated+"/ReconstructedDayExposure.asset";
            var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>(profilePath);
            if(profile==null){profile=ScriptableObject.CreateInstance<VolumeProfile>();AssetDatabase.CreateAsset(profile,profilePath);}
            if(!profile.TryGet<Exposure>(out var exposure)){exposure=profile.Add<Exposure>(true);AssetDatabase.AddObjectToAsset(exposure,profile);}
            exposure.mode.Override(ExposureMode.Fixed);exposure.fixedExposure.Override(15);
            if(!profile.TryGet<Tonemapping>(out var tonemap)){tonemap=profile.Add<Tonemapping>(true);AssetDatabase.AddObjectToAsset(tonemap,profile);}tonemap.mode.Override(TonemappingMode.ACES);
            var overrideVolume=new GameObject("Reconstructed exposure / source daylight lights retained").AddComponent<Volume>();overrideVolume.isGlobal=true;overrideVolume.priority=10000;overrideVolume.sharedProfile=profile;
            var lit=AssetDatabase.LoadAssetAtPath<Shader>("Packages/com.unity.render-pipelines.high-definition/Runtime/Material/Lit/Lit.shader");
            Directory.CreateDirectory(generated+"/Details");AssetDatabase.Refresh();
            var mesh=AssetDatabase.LoadAssetAtPath<Mesh>(generated+"/Details/SourceBillboardMesh.asset");
            bool createMesh=mesh==null;if(createMesh)mesh=new Mesh{name="Source detail billboard representation / crossed quads"};
            mesh.vertices=new[]{new Vector3(-.5f,0,0),new Vector3(.5f,0,0),new Vector3(.5f,1,0),new Vector3(-.5f,1,0),new Vector3(0,0,-.5f),new Vector3(0,0,.5f),new Vector3(0,1,.5f),new Vector3(0,1,-.5f)};
            mesh.uv=new[]{Vector2.zero,Vector2.right,Vector2.one,Vector2.up,Vector2.zero,Vector2.right,Vector2.one,Vector2.up};mesh.triangles=new[]{0,2,1,0,3,2,4,6,5,4,7,6};mesh.RecalculateNormals();mesh.RecalculateBounds();
            if(createMesh)AssetDatabase.CreateAsset(mesh,generated+"/Details/SourceBillboardMesh.asset");
            foreach(var terrain in UnityEngine.Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None))
            {
                var source=terrain.terrainData;var data=AssetDatabase.LoadAssetAtPath<TerrainData>(generated+"/Details/SourceTerrain.asset");
                if(data==null){data=UnityEngine.Object.Instantiate(source);data.name=source.name+" HDRP detail reconstruction";AssetDatabase.CreateAsset(data,generated+"/Details/SourceTerrain.asset");}
                var prototypes=data.detailPrototypes;
                for(int i=0;i<prototypes.Length;i++)
                {
                    var prototype=prototypes[i];if(prototype.prototypeTexture==null)continue;
                    string basePath=generated+"/Details/Detail-"+i;
                    var material=AssetDatabase.LoadAssetAtPath<Material>(basePath+".mat");bool createMaterial=material==null;
                    if(createMaterial)material=new Material(lit){name="Original detail "+prototype.prototypeTexture.name,enableInstancing=true};
                    material.SetTexture("_BaseColorMap",prototype.prototypeTexture);material.SetColor("_BaseColor",prototype.healthyColor);material.SetFloat("_DoubleSidedEnable",1);material.SetFloat("_AlphaCutoffEnable",1);material.SetFloat("_AlphaCutoff",.35f);material.SetFloat("_Smoothness",.08f);HDShaderUtils.ResetMaterialKeywords(material);
                    if(createMaterial)AssetDatabase.CreateAsset(material,basePath+".mat");else EditorUtility.SetDirty(material);
                    var instance=new GameObject("Original terrain detail "+i);instance.AddComponent<MeshFilter>().sharedMesh=mesh;instance.AddComponent<MeshRenderer>().sharedMaterial=material;
                    var prefab=PrefabUtility.SaveAsPrefabAsset(instance,basePath+".prefab");UnityEngine.Object.DestroyImmediate(instance);
                    prototype.prototype=prefab;prototype.prototypeTexture=null;prototype.usePrototypeMesh=true;prototype.useInstancing=true;prototype.renderMode=DetailRenderMode.VertexLit;prototypes[i]=prototype;receipt.meshDetailPrototypes++;
                }
                data.detailPrototypes=prototypes;data.RefreshPrototypes();terrain.terrainData=data;
                var collider=terrain.GetComponent<TerrainCollider>();if(collider!=null)collider.terrainData=data;
            }
            foreach(string guid in AssetDatabase.FindAssets("t:Material",new[]{"Assets"}))
            {
                var material=AssetDatabase.LoadAssetAtPath<Material>(AssetDatabase.GUIDToAssetPath(guid));if(material==null||material.shader==null)continue;
                if(new[]{"HDRP/Lit","HDRP/TerrainLit","HDRP/Unlit","HDRP/LayeredLit"}.Contains(material.shader.name)){HDShaderUtils.ResetMaterialKeywords(material);EditorUtility.SetDirty(material);receipt.validatedMaterials++;}
            }
            foreach(string guid in AssetDatabase.FindAssets("t:TMP_FontAsset",new[]{"Assets/Resources"}))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);var font=AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(path);if(font==null)continue;
                var current=font.atlasTextures.Where(t=>t!=null).ToArray();
                foreach(var texture in current)if(texture.isReadable){texture.Apply(false,false);EditorUtility.SetDirty(texture);}
                foreach(var orphan in AssetDatabase.LoadAllAssetsAtPath(path).OfType<Texture2D>().Where(t=>!current.Contains(t)).ToArray())
                {AssetDatabase.RemoveObjectFromAsset(orphan);UnityEngine.Object.DestroyImmediate(orphan,true);receipt.removedOrphanFontTextures++;}
            }
            receipt.notes=new[]{"Only the adapted scene changed; source extraction preserved.","Source light transforms/intensities and original sky/fog volumes retained at this step. Exposure 15 EV and ACES are authored reconstruction choices; later visual setup may replace source volumes.","Unrecovered custom passes disabled; original shader payloads preserved separately.","Original terrain height/alpha/tree/detail density data cloned; converted texture billboard prototypes: "+receipt.meshDetailPrototypes+". Visible vegetation may instead use native scene meshes. Original wind shader not restored."};
            EditorUtility.SetDirty(profile);AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-rendering-repair.json",JsonUtility.ToJson(receipt,true));
        }
    }
}
