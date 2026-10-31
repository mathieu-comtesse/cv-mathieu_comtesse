using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;

namespace UngaBunga45001.Editor
{
    public static class RecoveredFontRepair
    {
        [Serializable] private class Item { public string asset, sourceFont; public int characters, atlases; public uint[] missing; }
        [Serializable] private class Receipt { public string status, missingFrench; public Item[] repaired; public string[] skipped; public bool frenchGlyphsValidated; }
        public static void Repair()
        {
            const string root="E:/UNGA-BUNGA-45001";
            string campaign=File.ReadAllText("Assets/UngaBunga45001/Resources/UngaBungaCampaign.json");
            var content=campaign.Where(c=>!char.IsControl(c)&&!char.IsSurrogate(c)).Select(c=>(uint)c).Distinct().ToArray();
            var fonts=AssetDatabase.FindAssets("t:Font",new[]{"Assets/Font"}).Select(g=>AssetDatabase.LoadAssetAtPath<Font>(AssetDatabase.GUIDToAssetPath(g))).Where(f=>f!=null).ToArray();
            var repaired=new List<Item>();var skipped=new List<string>();
            var genuineShader=AssetDatabase.LoadAssetAtPath<Shader>("Assets/TextMesh Pro/Shaders/TMP_SDF-Mobile.shader");
            if(genuineShader==null)throw new InvalidOperationException("Complete the official TMP Essential Resources import first");
            foreach(string guid in AssetDatabase.FindAssets("t:TMP_FontAsset",new[]{"Assets"}))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);
                if(path.StartsWith("Assets/TextMesh Pro/",StringComparison.Ordinal))continue;
                var font=AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(path);if(font==null)continue;
                if(font.material!=null && AssetDatabase.GetAssetPath(font.material.shader).StartsWith("Assets/Shader/",StringComparison.Ordinal))
                { font.material.shader=genuineShader;EditorUtility.SetDirty(font.material); }
                bool broken=font.atlasTextures==null||font.atlasTextures.Length==0||font.atlasTextures.Any(t=>t==null||t.width<16);
                if(path=="Assets/Resources/fonts & materials/Inter-Regular SDF.asset")broken=true;
                if(!broken){skipped.Add(path+": atlas already readable");continue;}
                Font source=font.sourceFontFile;
                if(path=="Assets/Resources/fonts & materials/Inter-Regular SDF.asset")source=AssetDatabase.LoadAssetAtPath<Font>("Assets/Font/Inter-Regular.ttf");
                if(source==null)
                {
                    string stem=font.name.Split(new[]{" SDF"},StringSplitOptions.None)[0];
                    source=fonts.FirstOrDefault(f=>f.name==stem);
                }
                if(source==null){skipped.Add(path+": source TTF not resolved, no substitute used");continue;}
                string backup=root+"/Analysis/FontBackups/"+path;
                if(!File.Exists(backup)){Directory.CreateDirectory(Path.GetDirectoryName(backup));File.Copy(path,backup);}
                string name=font.name;var previousMaterial=font.material;
                uint[] characters=font.characterTable.Select(c=>c.unicode).Concat(content).Distinct().ToArray();
                var generated=TMP_FontAsset.CreateFontAsset(source,90,9,GlyphRenderMode.SDFAA,2048,2048,AtlasPopulationMode.Dynamic,true);
                if(generated==null)throw new InvalidOperationException("FontEngine failed: "+path);
                generated.material.shader=genuineShader;
                generated.name=name;generated.TryAddCharacters(characters,out uint[] missing);
                var atlas=generated.atlasTextures;
                for(int i=0;i<atlas.Length;i++){atlas[i].name=name+" Rebuilt Atlas "+i;atlas[i].hideFlags=HideFlags.None;AssetDatabase.AddObjectToAsset(atlas[i],path);}
                if(previousMaterial!=null)
                {
                    previousMaterial.shader=generated.material.shader;
                    previousMaterial.SetTexture("_MainTex",atlas[0]);
                    foreach(string property in new[]{"_TextureWidth","_TextureHeight","_GradientScale"})previousMaterial.SetFloat(property,generated.material.GetFloat(property));
                    generated.material=previousMaterial;EditorUtility.SetDirty(previousMaterial);
                }
                else { generated.material.name=name+" Rebuilt Material";AssetDatabase.AddObjectToAsset(generated.material,path); }
                EditorUtility.CopySerialized(generated,font);font.name=name;EditorUtility.SetDirty(font);
                repaired.Add(new Item{asset=path,sourceFont=AssetDatabase.GetAssetPath(source),characters=font.characterTable.Count,atlases=font.atlasTextures.Length,missing=missing});
            }
            AssetDatabase.SaveAssets();
            var inter=AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/Resources/fonts & materials/Inter-Regular SDF.asset");
            string missingFrench="";
            bool french=inter!=null&&inter.atlasTextures.Length>0&&inter.atlasTextures[0]!=null&&inter.TryAddCharacters("éèêëàâçùûüôöîïœÉÈÀÇ",out missingFrench);
            EditorUtility.SetDirty(inter);AssetDatabase.SaveAssets();
            File.WriteAllText(root+"/Analysis/unity-font-repair.json",JsonUtility.ToJson(new Receipt{status=french?"source-ttf-atlases-rebuilt":"french-validation-failed",repaired=repaired.ToArray(),skipped=skipped.ToArray(),frenchGlyphsValidated=french,missingFrench=missingFrench},true));
            if(!french)throw new InvalidOperationException("Inter SDF French glyph validation failed: "+missingFrench);
        }
    }
}
