using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public static class WebBuildV10
{
    const string Root="E:/UNGA-BUNGA-45001/Revision10";
    public static void Build()
    {
        try
        {
            var target=NamedBuildTarget.WebGL;
            var pipeline=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/UngaBunga45001/Generated/WebV7/WebPipeline.asset");
            if(pipeline==null)throw new Exception("Missing native Web pipeline");
            GraphicsSettings.defaultRenderPipeline=pipeline;
            for(int i=0;i<QualitySettings.names.Length;i++){QualitySettings.SetQualityLevel(i,false);QualitySettings.renderPipeline=pipeline;}
            QualitySettings.SetQualityLevel(Math.Min(2,QualitySettings.names.Length-1),false);
            var graphics=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);
            var always=graphics.FindProperty("m_AlwaysIncludedShaders");
            foreach(string name in new[]{"Universal Render Pipeline/Unlit","UngaBunga/WebWorld","UngaBunga/WebWater","UngaBunga/PortraitComposite"}){var shader=Shader.Find(name);if(shader==null)throw new Exception("Missing shader "+name);bool found=false;for(int j=0;j<always.arraySize;j++)if(always.GetArrayElementAtIndex(j).objectReferenceValue==shader)found=true;if(!found){int index=always.arraySize;always.InsertArrayElementAtIndex(index);always.GetArrayElementAtIndex(index).objectReferenceValue=shader;}}
            graphics.ApplyModifiedPropertiesWithoutUndo();
            PlayerSettings.companyName="Talas";PlayerSettings.productName="UNGA BUNGA 45001 - Web";PlayerSettings.bundleVersion="0.11.0";
            PlayerSettings.SetIl2CppCodeGeneration(target,Il2CppCodeGeneration.OptimizeSize);
            PlayerSettings.SetManagedStrippingLevel(target,ManagedStrippingLevel.Medium);
            PlayerSettings.stripUnusedMeshComponents=true;
            PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;PlayerSettings.WebGL.decompressionFallback=true;
            PlayerSettings.WebGL.exceptionSupport=WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;PlayerSettings.WebGL.debugSymbolMode=WebGLDebugSymbolMode.Off;PlayerSettings.WebGL.wasm2023=false;
            PlayerSettings.WebGL.initialMemorySize=128;PlayerSettings.WebGL.maximumMemorySize=2048;
            PlayerSettings.WebGL.template="APPLICATION:Minimal";
            UnityEditor.WebGL.UserBuildSettings.codeOptimization=UnityEditor.WebGL.WasmCodeOptimization.DiskSize;
            PlayerSettings.runInBackground=false;PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL,false);PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL,new[]{GraphicsDeviceType.OpenGLES3});
            foreach(string guid in AssetDatabase.FindAssets("t:Texture2D",new[]{"Assets"}))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);if(path.Contains("TextMesh Pro")||path.Contains("/Resources/")||path.Contains("Portrait")||path.Contains("Map"))continue;
                var importer=AssetImporter.GetAtPath(path) as TextureImporter;if(importer==null||importer.textureType==TextureImporterType.Lightmap)continue;
                var settings=importer.GetPlatformTextureSettings("WebGL");if(settings.overridden&&settings.maxTextureSize<=1024)continue;settings.name="WebGL";settings.overridden=true;settings.maxTextureSize=1024;settings.format=TextureImporterFormat.DXT5;settings.textureCompression=TextureImporterCompression.Compressed;importer.SetPlatformTextureSettings(settings);importer.SaveAndReimport();
            }
            const string scene="Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity";
            EditorSceneManager.OpenScene(scene);EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(scene,true)};FireGroundingV9.Apply();SceneRenderRepairV10.Apply();SitePlacementV10.Inspect(true);HutAssemblerV10.Build();NativeMotionInstallV11.Apply();NavigationSafetyV11.Apply();
            // Native HDRP baked lightmaps use a different exposure convention. Rebuild lighting in URP.
            Lightmapping.Clear();
            foreach(var light in UnityEngine.Object.FindObjectsByType<Light>(FindObjectsInactive.Include,FindObjectsSortMode.None))light.lightmapBakeType=LightmapBakeType.Realtime;
            foreach(var terrain in Terrain.activeTerrains){terrain.basemapDistance=2000;terrain.terrainData.SetBaseMapDirty();}
            DynamicGI.UpdateEnvironment();EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
            AssetDatabase.SaveAssets();
            File.WriteAllText(Root+"/web-settings.txt",$"Pipeline={GraphicsSettings.defaultRenderPipeline.name}\nCompression={PlayerSettings.WebGL.compressionFormat}\nFallback={PlayerSettings.WebGL.decompressionFallback}\nStripping={PlayerSettings.GetManagedStrippingLevel(target)}\nInitialMemory={PlayerSettings.WebGL.initialMemorySize}\nMaximumMemory={PlayerSettings.WebGL.maximumMemorySize}\nCode={UnityEditor.WebGL.UserBuildSettings.codeOptimization}\n");
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{scene},locationPathName="E:/UNGA-BUNGA-45001/Builds/Web-V10",target=BuildTarget.WebGL,options=BuildOptions.None});
            File.WriteAllText(Root+"/web-build-result.txt",$"Result={report.summary.result}\nSize={report.summary.totalSize}\nSeconds={report.summary.totalTime.TotalSeconds}\nErrors={report.summary.totalErrors}\nWarnings={report.summary.totalWarnings}\n"+string.Join("\n",report.GetFiles().Select(f=>$"{f.size} {f.path}")));
            EditorApplication.Exit(report.summary.result==BuildResult.Succeeded?0:1);
        }
        catch(Exception e){File.WriteAllText(Root+"/web-build-error.txt",e.ToString());Debug.LogException(e);EditorApplication.Exit(2);}
    }
}
