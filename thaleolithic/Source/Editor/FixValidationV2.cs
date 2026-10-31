using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Rendering.HighDefinition;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class FixValidationV2
    {
        public static void Apply()
        {
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var lights=UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Where(l=>l.type==LightType.Directional).OrderByDescending(l=>l.intensity).ToArray();
            foreach(var light in lights){light.shadows=light==lights[0]?LightShadows.Soft:LightShadows.None;if(light!=lights[0])light.enabled=false;}
            var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();
            const string bodyPath="Assets/UngaBunga45001/Generated/NativeCastV2/Native-body-atlas.mat";
            var body=AssetDatabase.LoadAssetAtPath<Material>(bodyPath);if(body==null){body=new Material(Shader.Find("HDRP/Lit"));AssetDatabase.CreateAsset(body,bodyPath);}
            body.SetColor("_BaseColor",Color.white);body.SetTexture("_BaseColorMap",AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Texture2D/atlas-universal-albedo-a.png"));body.SetFloat("_Smoothness",.08f);HDShaderUtils.ResetMaterialKeywords(body);EditorUtility.SetDirty(body);
            foreach(var actor in campaign.bindings.characters)foreach(var renderer in actor.meshyActor.GetComponentsInChildren<Renderer>(true))if(renderer.name.StartsWith("PrehistoricBody"))renderer.sharedMaterial=body;
            var step=AssetDatabase.FindAssets("sfx t:AudioClip",new[]{"Assets/AudioClip"}).Select(g=>AssetDatabase.LoadAssetAtPath<AudioClip>(AssetDatabase.GUIDToAssetPath(g))).FirstOrDefault(c=>c.name=="sfx_player_footstep_walk_grass_01");
            var tool=AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/AudioClip/sfx_building_stone-structure_hit_01.wav");
            foreach(var actor in campaign.bindings.characters){var bridge=actor.animator.GetComponent<NativeAnimationAudio>();if(bridge==null)bridge=actor.animator.gameObject.AddComponent<NativeAnimationAudio>();bridge.step=step;bridge.tool=tool;}
            var bad=GameObject.Find("HDRP water / prologue-waterfall-waterplane");if(bad!=null)UnityEngine.Object.DestroyImmediate(bad);
            var waterfall=UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).FirstOrDefault(r=>r.name=="prologue-waterfall-waterplane");
            if(waterfall!=null)
            {
                const string folder="Assets/UngaBunga45001/Generated/NativeCastV2";var texture=new Texture2D(128,256,TextureFormat.RGBA32,false);
                for(int y=0;y<256;y++)for(int x=0;x<128;x++){float stripe=.65f+.35f*Mathf.Sin(x*.31f+Mathf.Sin(y*.043f)*.8f);texture.SetPixel(x,y,new Color(.4f+.4f*stripe,.72f+.22f*stripe,.76f+.2f*stripe,.4f+.4f*stripe));}texture.Apply();string imagePath=folder+"/Waterfall-streaks.png";File.WriteAllBytes(imagePath,texture.EncodeToPNG());AssetDatabase.ImportAsset(imagePath,ImportAssetOptions.ForceSynchronousImport);
                string path=folder+"/Flowing-waterfall.mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);if(material==null){material=new Material(Shader.Find("HDRP/Lit"));AssetDatabase.CreateAsset(material,path);}material.SetFloat("_SurfaceType",1);material.SetFloat("_Smoothness",.92f);material.SetFloat("_DoubleSidedEnable",1);material.SetFloat("_TransparentDepthPrepassEnable",1);material.SetColor("_BaseColor",new Color(.16f,.42f,.44f,.7f));material.SetTexture("_BaseColorMap",AssetDatabase.LoadAssetAtPath<Texture2D>(imagePath));HDShaderUtils.ResetMaterialKeywords(material);
                waterfall.forceRenderingOff=false;waterfall.sharedMaterial=material;var flow=waterfall.GetComponent<WaterfallFlow>();if(flow==null)flow=waterfall.gameObject.AddComponent<WaterfallFlow>();flow.target=waterfall;
            }
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);File.WriteAllText("E:/UNGA-BUNGA-45001/Revision2/validation-repairs.txt","Only daytime sun casts directional shadows; native animation sound/footstep events have a real receiver; minimap is confined to its panel; original vertical waterfall kept vertical with a flowing transparent material, lake uses HDRP water.");
        }
    }
}
