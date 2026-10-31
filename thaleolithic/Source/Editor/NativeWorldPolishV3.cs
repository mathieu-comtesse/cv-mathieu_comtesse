using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using UnityEditor;
using UnityEditor.SceneManagement;
namespace UngaBunga45001.Editor
{
    public static class NativeWorldPolishV3
    {
        public static void TerrainAndWorld(){TerrainRepairV3.Apply();Apply();}
        public static void Apply()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>("Assets/UngaBunga45001/Generated/Rendering/ReconstructedDayExposure.asset");
            if(!profile.TryGet<GradientSky>(out var sky))throw new InvalidOperationException("Sky profile missing");
            sky.skyIntensityMode.Override(SkyIntensityMode.Lux);sky.desiredLuxValue.Override(18000);sky.updateMode.Override(EnvironmentUpdateMode.OnChanged);
            sky.top.Override(new Color(.36f,.33f,.59f));sky.middle.Override(new Color(.75f,.58f,.48f));sky.bottom.Override(new Color(.33f,.23f,.45f));
            foreach(var light in UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Where(l=>l.type==LightType.Directional&&l.enabled))
            {light.color=new Color(1,.83f,.64f);light.transform.rotation=Quaternion.Euler(38,145,0);light.intensity=85000;light.GetComponent<HDAdditionalLightData>()?.SetDirectionalShadowTint(new Color(.18f,.09f,.26f));}
            var notes=new System.Collections.Generic.List<string>();
            foreach(var r in UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None))
            {
                string hierarchy=NativeRepairV3.Hierarchy(r.transform);
                if(hierarchy.StartsWith("Bounds/")||hierarchy.Contains("/MapRevealer")||hierarchy.Contains("/PlayerIcon")||hierarchy.Contains("/IconPoint/")||hierarchy.Contains("/QuestSequenceGiver/"))
                {r.enabled=false;notes.Add("Hidden original helper: "+hierarchy+" bounds="+r.bounds);}
            }
            var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();
            var hides=new System.Collections.Generic.Dictionary<Material,Material>();
            foreach(var r in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
                if(System.Text.RegularExpressions.Regex.IsMatch(r.name,"hut-mammoth|tent-.*roof|leather-cover",System.Text.RegularExpressions.RegexOptions.IgnoreCase))
                {
                    var mats=r.sharedMaterials;for(int i=0;i<mats.Length;i++)
                    {
                        var source=mats[i];if(source==null||source.shader.name=="UngaBunga/NativeHideLitV3")continue;
                        if(!hides.TryGetValue(source,out var hide)){string path="Assets/UngaBunga45001/Generated/NativeRepairV3/Hide-"+source.name+".mat";hide=AssetDatabase.LoadAssetAtPath<Material>(path);if(hide==null){hide=new Material(source);AssetDatabase.CreateAsset(hide,path);}hide.shader=Shader.Find("UngaBunga/NativeHideLitV3");hides[source]=hide;EditorUtility.SetDirty(hide);}mats[i]=hide;
                    }
                    r.sharedMaterials=mats;
                }
            // Clear a view of the animal from the safe observation area, retaining the native cliff.
            var stage=campaign.GetComponent<CinematicStage>();var center=campaign.bindings.Find("chasse_clairiere").position;
            Vector3? clearing=null;
            for(float radius=0;radius<=35&&!clearing.HasValue;radius+=1.5f)for(int a=0;a<24&&!clearing.HasValue;a++)
            {
                var p=center+Quaternion.Euler(0,a*15,0)*Vector3.forward*radius;p.y=VillageLife.Ground(p);
                bool blocked=Physics.OverlapBox(p+Vector3.up*2.5f,new Vector3(3.2f,2.1f,5.2f),Quaternion.Euler(0,225,0),~0,QueryTriggerInteraction.Ignore).Any(c=>!(c is TerrainCollider)&&!c.transform.IsChildOf(stage.mammoth));
                if(blocked)continue;
                if(new[]{Vector3.right*4,Vector3.left*4,Vector3.forward*6,Vector3.back*6}.Any(d=>Mathf.Abs(VillageLife.Ground(p+d)-p.y)>.75f))continue;
                if(!UnityEngine.AI.NavMesh.SamplePosition(p,out var hit,.6f,UnityEngine.AI.NavMesh.AllAreas))continue;
                clearing=hit.position;
            }
            if(!clearing.HasValue)throw new InvalidOperationException("No clear mammoth footprint found");
            campaign.bindings.Find("chasse_clairiere").position=clearing.Value;stage.mammoth.position=clearing.Value;stage.mammoth.rotation=Quaternion.Euler(0,225,0);
            notes.Add("Mammoth footprint clear="+clearing.Value);
            foreach(var actor in campaign.bindings.characters)
            {
                var body=actor.meshyActor.GetComponentsInChildren<Renderer>().FirstOrDefault(r=>r.name.StartsWith("PrehistoricBody"));
                if(body==null)throw new InvalidOperationException("Complete body missing "+actor.id);
                notes.Add(actor.id+" nativeMesh="+(body as SkinnedMeshRenderer)?.sharedMesh.name+" shader="+body.sharedMaterial.shader.name);
            }
            var audit=new System.Collections.Generic.List<string>();
            foreach(var r in UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None))
            {
                if(r.sharedMaterials.Length==0||r.sharedMaterials.Any(m=>m==null))
                {
                    audit.Add("MISSING "+NativeRepairV3.Hierarchy(r.transform));
                    if(r is MeshRenderer){var mats=r.sharedMaterials;if(mats.Length==0)mats=new Material[1];for(int i=0;i<mats.Length;i++)if(mats[i]==null)mats[i]=AssetDatabase.LoadAssetAtPath<Material>("Assets/UngaBunga45001/Generated/NativeRepairV3/polylithic-atlas-solid.mat");r.sharedMaterials=mats;}
                }
            }
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/missing-materials.txt",audit);
            EditorUtility.SetDirty(profile);AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/world-polish.txt",notes);
        }
    }
}
