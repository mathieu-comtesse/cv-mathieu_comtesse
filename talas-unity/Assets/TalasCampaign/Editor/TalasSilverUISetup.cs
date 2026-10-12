using System;
using System.Collections.Generic;
using System.IO;
using TMPro;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
public static class TalasSilverUISetup
{
 const string Root="Assets/TalasCampaign/Resources/SilverUI/";
 public static void Install()
 {
  if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play first");
  foreach(string file in Directory.GetFiles(Root,"*.png"))
  {
   var imp=(TextureImporter)AssetImporter.GetAtPath(file);imp.mipmapEnabled=false;imp.textureCompression=TextureImporterCompression.Uncompressed;imp.filterMode=FilterMode.Bilinear;imp.maxTextureSize=2048;
   if(file.Contains("NoticiaAtlas")){imp.textureType=TextureImporterType.Default;imp.sRGBTexture=false;imp.alphaSource=TextureImporterAlphaSource.FromInput;}
   else {imp.textureType=TextureImporterType.Sprite;imp.spriteImportMode=SpriteImportMode.Single;imp.alphaIsTransparency=true;var settings=new TextureImporterSettings();imp.ReadTextureSettings(settings);settings.spriteMeshType=SpriteMeshType.FullRect;imp.SetTextureSettings(settings);imp.spritePixelsPerUnit=file.Contains("GrittyPanelDoubleSided")?240:100;imp.spriteBorder=file.Contains("GrittyPanelDoubleSided")?new Vector4(170.5f,170.5f,170.5f,170.5f):file.Contains("Grittypanel")?new Vector4(12,12,12,12):Vector4.zero;}
   imp.SaveAndReimport();
  }
  var font=AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(Root+"Noticia.asset");if(font==null){font=ScriptableObject.CreateInstance<TMP_FontAsset>();AssetDatabase.CreateAsset(font,Root+"Noticia.asset");}
  JsonUtility.FromJsonOverwrite(File.ReadAllText(Root+"NoticiaPayload.json"),font);font.name="NoticiaText-Regular SDF MASTERFONT";font.atlasPopulationMode=AtlasPopulationMode.Static;
  var atlas=AssetDatabase.LoadAssetAtPath<Texture2D>(Root+"NoticiaAtlas.png");font.atlasTextures=new[]{atlas};
  var material=AssetDatabase.LoadAssetAtPath<Material>(Root+"Noticia.mat");if(material==null){material=new Material(Shader.Find("TextMeshPro/Distance Field"));AssetDatabase.CreateAsset(material,Root+"Noticia.mat");}
  material.SetTexture("_MainTex",atlas);material.SetFloat("_TextureWidth",1024);material.SetFloat("_TextureHeight",1024);material.SetFloat("_GradientScale",10);material.SetFloat("_WeightNormal",-.5f);material.SetFloat("_WeightBold",.75f);material.SetFloat("_ScaleRatioA",.9f);material.SetFloat("_ScaleRatioB",.73125f);material.SetFloat("_ScaleRatioC",.27730376f);material.SetFloat("_PerspectiveFilter",.875f);material.SetFloat("_CullMode",0);material.shaderKeywords=Array.Empty<string>();font.material=material;font.ReadFontAssetDefinition();EditorUtility.SetDirty(font);EditorUtility.SetDirty(material);
  var campaign=UnityEngine.Object.FindFirstObjectByType<TalasCampaign>();if(campaign==null)throw new InvalidOperationException("Campaign scene required");campaign.font=font;EditorUtility.SetDirty(campaign);
  var fallback=AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(Root+"Accents.asset");if(fallback==null){fallback=TMP_FontAsset.CreateFontAsset(AssetDatabase.LoadAssetAtPath<Font>(Root+"LiberationSans.ttf"),90,9,UnityEngine.TextCore.LowLevel.GlyphRenderMode.SDF16,512,512,AtlasPopulationMode.Dynamic,false);fallback.name="Accents français complémentaires";fallback.TryAddCharacters("ŒŸ");fallback.atlasPopulationMode=AtlasPopulationMode.Static;AssetDatabase.CreateAsset(fallback,Root+"Accents.asset");AssetDatabase.AddObjectToAsset(fallback.material,fallback);foreach(var t in fallback.atlasTextures)AssetDatabase.AddObjectToAsset(t,fallback);}
  font.fallbackFontAssetTable=new List<TMP_FontAsset>{fallback,AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset")};var chars="ÀÉÈÊÇÙŒœàéèêçù§0123456789";var missing=new List<string>();foreach(char c in chars)if(!font.HasCharacter(c,true))missing.Add(c.ToString());if(missing.Count>0)throw new InvalidOperationException("Missing chars: "+string.Join("",missing));
  EditorSceneManager.MarkSceneDirty(campaign.gameObject.scene);EditorSceneManager.SaveScene(campaign.gameObject.scene);AssetDatabase.SaveAssets();Directory.CreateDirectory("Reports");File.WriteAllText("Reports/SilverUIInstall.json",JsonUtility.ToJson(new Receipt{font=font.name,glyphs=font.glyphTable.Count,characters=font.characterTable.Count,atlasWidth=atlas.width,atlasHeight=atlas.height,sourceCanvas="CanvasGameUI 1920x1080, match height 1",scaleToTalas=2f/3f,background="GrittyPanelDoubleSided",missingFrenchCharacters=missing.Count},true));
 }
 [Serializable] class Receipt {public string font,sourceCanvas,background;public int glyphs,characters,atlasWidth,atlasHeight,missingFrenchCharacters;public float scaleToTalas;}
}

