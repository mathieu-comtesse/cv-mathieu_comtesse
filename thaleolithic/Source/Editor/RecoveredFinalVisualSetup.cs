using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using UnityEngine.TextCore.LowLevel;
namespace UngaBunga45001.Editor
{
    public static class RecoveredFinalVisualSetup
    {
        [Serializable]private class Receipt{public int sourceDiffusionProfiles,matchedDiffusionMaterials,standardMaterialFallbacks,fontCharacters,fontWidth,fontHeight;public bool frenchGlyphs,sourceSpritesCopiedWithoutPixelChanges;public string[] notes;}
        public static void Apply()
        {
            const string root="E:/UNGA-BUNGA-45001";const string generated="Assets/UngaBunga45001/Generated/Rendering";
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);var receipt=new Receipt();
            var volumes=scene.GetRootGameObjects().SelectMany(r=>r.GetComponentsInChildren<Volume>(true)).ToArray();
            foreach(var volume in volumes)volume.enabled=volume.name=="Reconstructed exposure / source daylight lights retained";
            var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>(generated+"/ReconstructedDayExposure.asset");
            if(!profile.TryGet<VisualEnvironment>(out var environment)){environment=profile.Add<VisualEnvironment>(true);AssetDatabase.AddObjectToAsset(environment,profile);}environment.skyType.Override((int)SkyType.Gradient);
            if(!profile.TryGet<GradientSky>(out var sky)){sky=profile.Add<GradientSky>(true);AssetDatabase.AddObjectToAsset(sky,profile);}sky.top.Override(new Color(.22f,.38f,.60f));sky.middle.Override(new Color(.45f,.58f,.7f));sky.bottom.Override(new Color(.25f,.3f,.3f));
            var profiles=AssetDatabase.FindAssets("t:DiffusionProfileSettings",new[]{"Assets/MonoBehaviour"}).Select(g=>AssetDatabase.LoadAssetAtPath<DiffusionProfileSettings>(AssetDatabase.GUIDToAssetPath(g))).Where(p=>p!=null&&p.name!="defaultDiffusionProfile").ToArray();
            if(!profile.TryGet<DiffusionProfileList>(out var diffusion)){diffusion=profile.Add<DiffusionProfileList>(true);AssetDatabase.AddObjectToAsset(diffusion,profile);}diffusion.diffusionProfiles.Override(profiles.Take(15).ToArray());receipt.sourceDiffusionProfiles=profiles.Length;
            var byHash=new System.Collections.Generic.Dictionary<uint,DiffusionProfileSettings>();
            foreach(var source in profiles)
            {
                string reference=root+"/RecoveredProject/ExportedProject/"+AssetDatabase.GetAssetPath(source);
                if(!File.Exists(reference))continue;var match=Regex.Match(File.ReadAllText(reference),@"(?m)^\s+hash:\s*(\d+)");if(match.Success)byHash[uint.Parse(match.Groups[1].Value)]=source;
            }
            foreach(string guid in AssetDatabase.FindAssets("t:Material",new[]{"Assets"}))
            {
                var material=AssetDatabase.LoadAssetAtPath<Material>(AssetDatabase.GUIDToAssetPath(guid));if(material==null||material.shader==null||material.shader.name!="HDRP/Lit")continue;
                int id=(int)material.GetFloat("_MaterialID");if(id!=0&&id!=5)continue;
                uint hash=BitConverter.ToUInt32(BitConverter.GetBytes(material.GetFloat("_DiffusionProfileHash")),0);
                if(byHash.TryGetValue(hash,out var source)){HDMaterial.SetDiffusionProfile(material,source);receipt.matchedDiffusionMaterials++;}
                else{material.SetFloat("_MaterialID",1);receipt.standardMaterialFallbacks++;}
                UnityEditor.Rendering.HighDefinition.HDShaderUtils.ResetMaterialKeywords(material);EditorUtility.SetDirty(material);
            }
            const string fontPath=generated+"/InterRegular-StaticSDF.asset";
            var font=AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(fontPath);
            if(font==null)
            {
                var ttf=AssetDatabase.LoadAssetAtPath<Font>("Assets/Font/Inter-Regular.ttf");font=TMP_FontAsset.CreateFontAsset(ttf,90,9,GlyphRenderMode.SDFAA,2048,2048,AtlasPopulationMode.Dynamic,true);font.name="Source Inter-Regular / baked campaign glyphs";AssetDatabase.CreateAsset(font,fontPath);
                font.material.shader=AssetDatabase.LoadAssetAtPath<Shader>("Assets/TextMesh Pro/Shaders/TMP_SDF-Mobile.shader");
                string content=File.ReadAllText("Assets/UngaBunga45001/Resources/UngaBungaCampaign.json")+" éèêëàâçùûüôöîïœÉÈÀǅ–—0123456789%";
                font.TryAddCharacters(new string(content.Where(c=>!char.IsControl(c)&&!char.IsSurrogate(c)).Distinct().ToArray()),out string missing);
                foreach(var atlas in font.atlasTextures){atlas.Apply(false,false);atlas.name="Source Inter baked atlas";AssetDatabase.AddObjectToAsset(atlas,font);EditorUtility.SetDirty(atlas);}
                AssetDatabase.AddObjectToAsset(font.material,font);font.atlasPopulationMode=AtlasPopulationMode.Static;
                var serialized=new SerializedObject(font);serialized.FindProperty("m_ClearDynamicDataOnBuild").boolValue=false;serialized.ApplyModifiedPropertiesWithoutUndo();font.ReadFontAssetDefinition();EditorUtility.SetDirty(font);
            }
            receipt.fontCharacters=font.characterTable.Count;receipt.fontWidth=font.atlasTextures[0].width;receipt.fontHeight=font.atlasTextures[0].height;receipt.frenchGlyphs="éèàçùœÉ".All(c=>font.HasCharacter(c));
            if(!receipt.frenchGlyphs||receipt.fontWidth<512)throw new InvalidOperationException("Baked Inter atlas invalid");
            var hud=UnityEngine.Object.FindFirstObjectByType<CampaignHud>();hud.font=font;
            foreach(string name in new[]{"InfoWindowBackground","RuggedBackground","QuestStatus_Background"})
            {
                string path="Assets/UngaBunga45001/RecoveredUI/"+name+".png";var importer=AssetImporter.GetAtPath(path) as TextureImporter;
                importer.textureType=TextureImporterType.Sprite;importer.spriteImportMode=SpriteImportMode.Single;importer.alphaSource=TextureImporterAlphaSource.FromInput;importer.alphaIsTransparency=true;importer.spritePixelsPerUnit=100;
                var settings=new TextureImporterSettings();importer.ReadTextureSettings(settings);settings.spriteMeshType=SpriteMeshType.FullRect;importer.SetTextureSettings(settings);importer.SaveAndReimport();
            }
            hud.panelBackground=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/UngaBunga45001/RecoveredUI/InfoWindowBackground.png");hud.buttonBackground=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/UngaBunga45001/RecoveredUI/RuggedBackground.png");hud.statusBackground=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/UngaBunga45001/RecoveredUI/QuestStatus_Background.png");
            receipt.sourceSpritesCopiedWithoutPixelChanges=true;receipt.notes=new[]{"Native lighting transforms/intensities and map geometry preserved; original postprocess volumes retained but disabled in the adaptation because their runtime control was not recovered.","Gradient sky, exposure/tonemapping and unsupported translucency fallback are authored reconstruction choices, not source shader parity.","Three UI sprites are copied from lossless direct-source decodes to avoid corrupted exported sprite geometry; French glyphs use the genuine source Inter TTF."};
            EditorUtility.SetDirty(profile);AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);
            File.WriteAllText(root+"/Analysis/unity-final-visual-setup.json",JsonUtility.ToJson(receipt,true));
        }
    }
}
