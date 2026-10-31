using System.IO;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class ContactAndFilmBuildV2
    {
        public static void Run()
        {
            FixValidationV2.Apply();
            var font=Object.FindFirstObjectByType<CampaignHud>().font;font.atlasPopulationMode=AtlasPopulationMode.Dynamic;
            font.TryAddCharacters("ÂÎÔÛÊËÏÜÀǌœ·",out string missing);
            foreach(var atlas in font.atlasTextures){atlas.Apply(false,false);EditorUtility.SetDirty(atlas);}
            font.atlasPopulationMode=AtlasPopulationMode.Static;font.ReadFontAssetDefinition();EditorUtility.SetDirty(font);
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
            File.WriteAllText("E:/UNGA-BUNGA-45001/Revision2/map-font.txt","Missing map glyphs: "+missing);
            RecoveredWindowsBuild.Build();
        }
    }
}
