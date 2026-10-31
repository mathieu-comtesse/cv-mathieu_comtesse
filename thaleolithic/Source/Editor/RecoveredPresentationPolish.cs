using System;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class RecoveredPresentationPolish
    {
        public static void Apply()
        {
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var profile=AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.VolumeProfile>("Assets/UngaBunga45001/Generated/Rendering/ReconstructedDayExposure.asset");
            profile.TryGet<VisualEnvironment>(out var environment);environment.skyAmbientMode.Override(SkyAmbientMode.Dynamic);
            profile.TryGet<GradientSky>(out var sky);sky.skyIntensityMode.Override(SkyIntensityMode.Lux);sky.desiredLuxValue.Override(20000);
            var hud=UnityEngine.Object.FindFirstObjectByType<CampaignHud>();hud.statusBackground=hud.panelBackground;
            var font=hud.font;font.atlasPopulationMode=AtlasPopulationMode.Dynamic;
            string content=File.ReadAllText("Assets/UngaBunga45001/Resources/UngaBungaCampaign.json")+new string(Enumerable.Range(32,95).Select(i=>(char)i).ToArray())+"éèêëàâçùûüôöîïœÉÈÀǅ–—";
            font.TryAddCharacters(new string(content.Where(c=>!char.IsControl(c)&&!char.IsSurrogate(c)).Distinct().ToArray()),out string missing);
            foreach(var atlas in font.atlasTextures){atlas.Apply(false,false);EditorUtility.SetDirty(atlas);}
            font.atlasPopulationMode=AtlasPopulationMode.Static;font.ReadFontAssetDefinition();EditorUtility.SetDirty(font);EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-presentation-polish.txt","Source Inter glyphs="+font.characterTable.Count+"; ASCII slash="+font.HasCharacter('/')+"; dynamic sky illuminance=20000 lux; source UI panel sprite used for status; missing="+missing);
        }
    }
}
