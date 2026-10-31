using System;
using System.IO;
using UnityEditor;
using UnityEditor.Rendering;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;

namespace UngaBunga45001.Editor
{
    public static class RecoveredRenderSetup
    {
        [Serializable] private class Receipt { public string status, pipeline, globals, editor; public bool originalShaderParity; }
        public static void Configure()
        {
            const string destination="Assets/UngaBunga45001/Generated/Rendering";
            Directory.CreateDirectory(destination);AssetDatabase.Refresh();
            foreach(string file in new[]{"GraphicsSettings.asset","QualitySettings.asset","ProjectSettings.asset"})
            {
                string backup="E:/UNGA-BUNGA-45001/Analysis/RenderSettingsBackups/"+file;
                if(!File.Exists(backup)){Directory.CreateDirectory(Path.GetDirectoryName(backup));File.Copy("ProjectSettings/"+file,backup);}
            }
            string globalPath=destination+"/GenuineHDRPGlobalSettings.asset";
            var global=AssetDatabase.LoadAssetAtPath<RenderPipelineGlobalSettings>(globalPath);
            if(global==null)
            {
                Type type=typeof(HDRenderPipelineAsset).Assembly.GetType("UnityEngine.Rendering.HighDefinition.HDRenderPipelineGlobalSettings",true);
                global=RenderPipelineGlobalSettingsUtils.Create(type,globalPath);
            }
            if(global==null)throw new InvalidOperationException("Genuine HDRP global settings creation failed");
            EditorGraphicsSettings.SetRenderPipelineGlobalSettingsAsset<HDRenderPipeline>(global);
            string pipelinePath=destination+"/GenuineHDRP.asset";
            var pipeline=AssetDatabase.LoadAssetAtPath<HDRenderPipelineAsset>(pipelinePath);
            if(pipeline==null){pipeline=ScriptableObject.CreateInstance<HDRenderPipelineAsset>();AssetDatabase.CreateAsset(pipeline,pipelinePath);}
            GraphicsSettings.defaultRenderPipeline=pipeline;
            var quality=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/QualitySettings.asset")[0]);
            var settings=quality.FindProperty("m_QualitySettings");
            for(int i=0;i<settings.arraySize;i++){var property=settings.GetArrayElementAtIndex(i).FindPropertyRelative("customRenderPipeline");if(property!=null)property.objectReferenceValue=pipeline;}
            quality.ApplyModifiedPropertiesWithoutUndo();
            PlayerSettings.colorSpace=ColorSpace.Linear;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64,false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64,new[]{GraphicsDeviceType.Direct3D11});
            string terrainPath=destination+"/TerrainLayers-HDRP.mat";
            if(AssetDatabase.LoadAssetAtPath<Material>(terrainPath)==null)
            {
                var terrainShader=AssetDatabase.LoadAssetAtPath<Shader>("Packages/com.unity.render-pipelines.high-definition/Runtime/Material/TerrainLit/TerrainLit.shader");
                if(terrainShader==null)throw new InvalidOperationException("Genuine HDRP TerrainLit shader missing");
                AssetDatabase.CreateAsset(new Material(terrainShader),terrainPath);
            }
            AssetDatabase.SaveAssets();
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-render-setup.json",JsonUtility.ToJson(new Receipt{status="genuine-hdrp-configured-awaiting-render",pipeline=pipelinePath,globals=globalPath,editor=Application.unityVersion,originalShaderParity=false},true));
        }
    }
}
