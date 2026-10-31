using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Rendering.HighDefinition;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class RenderRevisionV2
    {
        public static void Apply()
        {
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var pipeline=(HDRenderPipelineAsset)GraphicsSettings.defaultRenderPipeline;var settings=new SerializedObject(pipeline);
            foreach(string property in new[]{"supportSSAO","supportWater","supportWaterCPU"}){var field=settings.FindProperty("m_RenderPipelineSettings."+property);if(field!=null)field.boolValue=true;}settings.ApplyModifiedPropertiesWithoutUndo();
            foreach(var camera in UnityEngine.Object.FindObjectsByType<HDAdditionalCameraData>(FindObjectsSortMode.None))
            {
                camera.customRenderingSettings=true;
                foreach(var field in new[]{FrameSettingsField.ShadowMaps,FrameSettingsField.ContactShadows,FrameSettingsField.SSAO,FrameSettingsField.Water})
                {camera.renderingPathCustomFrameSettings.SetEnabled(field,true);camera.renderingPathCustomFrameSettingsOverrideMask.mask[(uint)field]=true;}
            }
            int shadowLights=0;
            foreach(var light in UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None))
            {
                var hd=light.GetComponent<HDAdditionalLightData>();if(hd==null||light.type!=LightType.Directional)continue;
                light.shadows=LightShadows.Soft;hd.EnableShadows(true);hd.SetShadowDimmer(.92f);hd.SetShadowResolution(4096);hd.angularDiameter=1.2f;hd.useContactShadow.useOverride=true;hd.useContactShadow.@override=true;shadowLights++;
            }
            var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>("Assets/UngaBunga45001/Generated/Rendering/ReconstructedDayExposure.asset");
            if(!profile.TryGet<ContactShadows>(out var contacts)){contacts=profile.Add<ContactShadows>(true);AssetDatabase.AddObjectToAsset(contacts,profile);}contacts.enable.Override(true);contacts.length.Override(.22f);contacts.opacity.Override(.75f);contacts.maxDistance.Override(65);
            if(!profile.TryGet<ScreenSpaceAmbientOcclusion>(out var ao)){ao=profile.Add<ScreenSpaceAmbientOcclusion>(true);AssetDatabase.AddObjectToAsset(ao,profile);}ao.intensity.Override(.65f);ao.radius.Override(.5f);
            if(profile.TryGet<ColorAdjustments>(out var colors)){colors.saturation.Override(4);colors.contrast.Override(8);}else{colors=profile.Add<ColorAdjustments>(true);AssetDatabase.AddObjectToAsset(colors,profile);colors.saturation.Override(4);colors.contrast.Override(8);}
            int foliage=0;var wind=AssetDatabase.LoadAssetAtPath<Shader>("Assets/UngaBunga45001/Shaders/NativeFoliageWind.shader");
            var adapted=new System.Collections.Generic.Dictionary<Material,Material>();string folder="Assets/UngaBunga45001/Generated/FoliageV2";Directory.CreateDirectory(folder);AssetDatabase.Refresh();
            foreach(var renderer in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
            {
                if(!System.Text.RegularExpressions.Regex.IsMatch(renderer.name,"grass|fern",System.Text.RegularExpressions.RegexOptions.IgnoreCase))continue;
                var mats=renderer.sharedMaterials;
                for(int i=0;i<mats.Length;i++)
                {
                    var source=mats[i];if(source==null||source.shader==null||source.shader.name!="HDRP/Lit")continue;
                    if(!adapted.TryGetValue(source,out var material)){string path=folder+"/"+source.name.Replace('/','-')+".mat";material=AssetDatabase.LoadAssetAtPath<Material>(path);if(material==null){material=new Material(source){shader=wind,name=source.name+" wind and contact"};AssetDatabase.CreateAsset(material,path);}adapted[source]=material;}
                    mats[i]=material;
                }
                renderer.sharedMaterials=mats;renderer.receiveShadows=true;renderer.shadowCastingMode=ShadowCastingMode.On;foliage++;
            }
            foreach(var renderer in UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None))
                if(renderer.sharedMaterials.Any(m=>m!=null&&System.Text.RegularExpressions.Regex.IsMatch(m.name,"Ghost|Preview|Blueprint|Outline",System.Text.RegularExpressions.RegexOptions.IgnoreCase)))renderer.enabled=false;
            var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var contact=campaign.GetComponent<EnvironmentInteraction>()??campaign.gameObject.AddComponent<EnvironmentInteraction>();contact.bindings=campaign.bindings;
            var waters=UnityEngine.Object.FindObjectsByType<WaterSurface>(FindObjectsSortMode.None);var rows=waters.Select(w=>w.name+" "+w.surfaceType+" "+w.geometryType+" "+w.transform.position).ToArray();
            foreach(var water in waters){var waterData=new SerializedObject(water);var field=waterData.FindProperty("scriptInteractions");if(field!=null)field.boolValue=true;waterData.ApplyModifiedPropertiesWithoutUndo();}
            EditorUtility.SetDirty(pipeline);EditorUtility.SetDirty(profile);AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);
            File.WriteAllText("E:/UNGA-BUNGA-45001/Revision2/render-revision.txt","Shadow lights="+shadowLights+"; HDRP shadow/contact/SSAO frames enabled; foliage renderers="+foliage+"; wind shader preserves HDRP depth/shadow passes. Source HLSL not recovered: authored reconstruction. Water surfaces:\n"+string.Join("\n",rows));
        }
    }
}
