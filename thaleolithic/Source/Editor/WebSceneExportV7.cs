using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using UnityEngine.Rendering.Universal;
namespace UngaBunga45001.Editor
{
    public static class WebSceneExportV7
    {
        const string Main="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",Web="Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity",Folder="Assets/UngaBunga45001/Generated/WebV7";
        static readonly Dictionary<Material,Material> materials=new Dictionary<Material,Material>();static readonly List<string> notes=new List<string>();
        public static void Export()
        {
            Directory.CreateDirectory(Folder+"/Materials");Directory.CreateDirectory(Folder+"/Details");AssetDatabase.Refresh();
            if(!AssetDatabase.CopyAsset(Main,Web))throw new InvalidOperationException("Web scene already exists or cannot be copied. Preserve it before rebuilding.");
            var scene=EditorSceneManager.OpenScene(Web,OpenSceneMode.Single);var all=scene.GetRootGameObjects().SelectMany(root=>root.GetComponentsInChildren<Transform>(true)).ToArray();
            foreach(var transform in all)if(transform!=null&&PrefabUtility.IsAnyPrefabInstanceRoot(transform.gameObject))PrefabUtility.UnpackPrefabInstance(transform.gameObject,PrefabUnpackMode.Completely,InteractionMode.AutomatedAction);
            var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();
            // Prune superseded actor versions only in the Web copy.
            foreach(var binding in campaign.bindings.characters)
            {
                if(binding.sourceActor!=null&&!binding.meshyActor.transform.IsChildOf(binding.sourceActor.transform))UnityEngine.Object.DestroyImmediate(binding.sourceActor);
                binding.sourceActor=null;binding.injuryPresentation=null;binding.attenuatedPresentation=null;var root=campaign.bindings.Find(binding.id);
                foreach(Transform child in root.Cast<Transform>().ToArray())if(child!=binding.meshyActor.transform&&!binding.meshyActor.transform.IsChildOf(child))UnityEngine.Object.DestroyImmediate(child.gameObject);
            }
            var planes=new List<EnvironmentInteraction.WaterPlane>();
            foreach(var water in UnityEngine.Object.FindObjectsByType<WaterSurface>(FindObjectsInactive.Include,FindObjectsSortMode.None))
            {
                if(water.geometryType!=WaterGeometryType.Custom)continue;
                foreach(var renderer in water.meshRenderers)
                {
                    var filter=renderer.GetComponent<MeshFilter>();if(filter?.sharedMesh==null)continue;var go=new GameObject("Eau native · rendu Web");go.transform.SetParent(renderer.transform.parent,false);go.transform.SetLocalPositionAndRotation(renderer.transform.localPosition,renderer.transform.localRotation);go.transform.localScale=renderer.transform.localScale;go.AddComponent<MeshFilter>().sharedMesh=filter.sharedMesh;var visible=go.AddComponent<MeshRenderer>();visible.sharedMaterial=WaterMaterial();visible.shadowCastingMode=ShadowCastingMode.Off;
                    planes.Add(new EnvironmentInteraction.WaterPlane{renderer=visible,height=renderer.bounds.center.y});renderer.enabled=false;
                }
            }
            campaign.GetComponent<EnvironmentInteraction>().webWaterPlanes=planes.ToArray();
            foreach(var behaviour in UnityEngine.Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include,FindObjectsSortMode.None))
            {
                if(behaviour==null)continue;string ns=behaviour.GetType().Namespace??"";
                bool keep=ns.StartsWith("UngaBunga45001")||ns.StartsWith("UnityEngine.UI")||ns.StartsWith("UnityEngine.EventSystems")||ns.StartsWith("TMPro")||ns.StartsWith("UnityEngine.InputSystem")||ns.StartsWith("Unity.AI.Navigation");
                if(!keep)UnityEngine.Object.DestroyImmediate(behaviour);
            }
            foreach(var volume in UnityEngine.Object.FindObjectsByType<Volume>(FindObjectsInactive.Include,FindObjectsSortMode.None))UnityEngine.Object.DestroyImmediate(volume);
            foreach(var probe in UnityEngine.Object.FindObjectsByType<ReflectionProbe>(FindObjectsInactive.Include,FindObjectsSortMode.None))UnityEngine.Object.DestroyImmediate(probe);
            all=scene.GetRootGameObjects().SelectMany(root=>root.GetComponentsInChildren<Transform>(true)).ToArray();foreach(var transform in all)GameObjectUtility.RemoveMonoBehavioursWithMissingScript(transform.gameObject);
            foreach(var renderer in UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsInactive.Include,FindObjectsSortMode.None))renderer.sharedMaterials=renderer.sharedMaterials.Select(Convert).ToArray();
            foreach(var terrain in UnityEngine.Object.FindObjectsByType<Terrain>(FindObjectsInactive.Include,FindObjectsSortMode.None))
            {
                var data=UnityEngine.Object.Instantiate(terrain.terrainData);AssetDatabase.CreateAsset(data,Folder+"/Terrain-"+terrain.GetInstanceID()+".asset");terrain.terrainData=data;var collider=terrain.GetComponent<TerrainCollider>();if(collider!=null)collider.terrainData=data;
                var prototypes=data.detailPrototypes;for(int i=0;i<prototypes.Length;i++)
                {
                    if(prototypes[i].prototype==null)continue;var copy=UnityEngine.Object.Instantiate(prototypes[i].prototype);foreach(var renderer in copy.GetComponentsInChildren<Renderer>(true))renderer.sharedMaterials=renderer.sharedMaterials.Select(Convert).ToArray();
                    foreach(var script in copy.GetComponentsInChildren<MonoBehaviour>(true))if(script!=null)UnityEngine.Object.DestroyImmediate(script);foreach(var transform in copy.GetComponentsInChildren<Transform>(true))GameObjectUtility.RemoveMonoBehavioursWithMissingScript(transform.gameObject);
                    prototypes[i].prototype=PrefabUtility.SaveAsPrefabAsset(copy,Folder+"/Details/Detail-"+terrain.GetInstanceID()+"-"+i+".prefab");prototypes[i].useInstancing=true;UnityEngine.Object.DestroyImmediate(copy);
                }
                data.detailPrototypes=prototypes;var terrainMaterial=new Material(Shader.Find("Universal Render Pipeline/Terrain/Lit"));AssetDatabase.CreateAsset(terrainMaterial,Folder+"/Terrain-material-"+terrain.GetInstanceID()+".mat");terrain.materialTemplate=terrainMaterial;terrain.detailObjectDistance=45;terrain.detailObjectDensity=.5f;
                EditorUtility.SetDirty(data);
            }
            // Serialized materials created at runtime are remapped too.
            foreach(var fire in UnityEngine.Object.FindObjectsByType<NativeFire>(FindObjectsInactive.Include,FindObjectsSortMode.None)){fire.outerMaterial=Convert(fire.outerMaterial);fire.innerMaterial=Convert(fire.innerMaterial);fire.coalMaterial=Convert(fire.coalMaterial);}
            var accidents=campaign.GetComponent<AccidentDirector>();accidents.bloodMaterial=Convert(accidents.bloodMaterial);accidents.woodMaterial=Convert(accidents.woodMaterial);accidents.stoneMaterial=Convert(accidents.stoneMaterial);accidents.flameMaterial=Convert(accidents.flameMaterial);
            campaign.GetComponent<EnvironmentInteraction>().rippleMaterial=Convert(campaign.GetComponent<EnvironmentInteraction>().rippleMaterial);campaign.GetComponent<QuestNavigationController>().markerMaterial=Convert(campaign.GetComponent<QuestNavigationController>().markerMaterial);
            var inventory=campaign.GetComponent<InventoryController>();inventory.axeMaterial=Convert(inventory.axeMaterial);var life=campaign.GetComponent<VillageLife>();life.carriedMaterial=Convert(life.carriedMaterial);
            foreach(var light in UnityEngine.Object.FindObjectsByType<Light>(FindObjectsInactive.Include,FindObjectsSortMode.None)){light.lightUnit=light.type==LightType.Directional?LightUnit.Lux:LightUnit.Candela;light.intensity=light.type==LightType.Directional?1.2f:2;light.shadowBias=.06f;}
            foreach(var camera in UnityEngine.Object.FindObjectsByType<Camera>(FindObjectsInactive.Include,FindObjectsSortMode.None)){camera.allowHDR=false;camera.allowMSAA=true;camera.clearFlags=CameraClearFlags.Skybox;camera.farClipPlane=160;}
            RenderSettings.ambientMode=AmbientMode.Trilight;RenderSettings.ambientSkyColor=new Color(.36f,.32f,.45f);RenderSettings.ambientEquatorColor=new Color(.29f,.24f,.3f);RenderSettings.ambientGroundColor=new Color(.14f,.115f,.16f);RenderSettings.fog=true;RenderSettings.fogColor=new Color(.47f,.45f,.53f);RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogStartDistance=90;RenderSettings.fogEndDistance=160;RenderSettings.customReflection=null;
            var sky=new Material(Shader.Find("Skybox/Procedural"));sky.SetColor("_SkyTint",new Color(.36f,.47f,.62f));sky.SetColor("_GroundColor",new Color(.35f,.25f,.18f));AssetDatabase.CreateAsset(sky,Folder+"/Ciel.mat");RenderSettings.skybox=sky;
            var rendererData=ScriptableObject.CreateInstance<UniversalRendererData>();rendererData.renderingMode=UnityEngine.Rendering.Universal.RenderingMode.Forward;AssetDatabase.CreateAsset(rendererData,Folder+"/WebRenderer.asset");var pipeline=UniversalRenderPipelineAsset.Create(rendererData);pipeline.name="UNGA Web · URP";pipeline.msaaSampleCount=2;pipeline.mainLightShadowmapResolution=1024;pipeline.shadowDistance=36;pipeline.shadowCascadeCount=2;pipeline.renderScale=1;var serializedPipeline=new SerializedObject(pipeline);serializedPipeline.FindProperty("m_MainLightShadowsSupported").boolValue=true;serializedPipeline.FindProperty("m_AdditionalLightsRenderingMode").intValue=(int)LightRenderingMode.PerPixel;serializedPipeline.ApplyModifiedPropertiesWithoutUndo();AssetDatabase.CreateAsset(pipeline,Folder+"/WebPipeline.asset");
            EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
            var files=AssetDatabase.GetDependencies(Web,true).Where(path=>path.StartsWith("Assets/")&&!path.Contains("/Editor/")).ToHashSet();
            foreach(string directory in new[]{"Assets/UngaBunga45001/Runtime","Assets/UngaBunga45001/Resources",Folder,"Assets/UngaBunga45001/Plugins/WebGL"})if(AssetDatabase.IsValidFolder(directory))foreach(var guid in AssetDatabase.FindAssets("",new[]{directory})){string path=AssetDatabase.GUIDToAssetPath(guid);if(!Directory.Exists(path))files.Add(path);}
            // No superseded HDRP shaders or original IL2CPP stub code are needed by the Web renderer.
            foreach(var file in files.ToArray())if(file.EndsWith(".shader")&&(file.Contains("NativeHideLitV3")||file.Contains("NativeFoliageWind")||file.Contains("NativeParticleV3")))files.Remove(file);
            string output="E:/UNGA-BUNGA-45001/Revision7/UngaBunga-Web-payload.unitypackage";AssetDatabase.ExportPackage(files.ToArray(),output,ExportPackageOptions.Default);
            notes.Add("Web scene "+Web+"; converted materials="+materials.Count+"; native water meshes="+planes.Count+"; package files="+files.Count);notes.Add("Source scene retained as HDRP. Export contains the same campaign runtime, native character Avatars and action data.");File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision7/web-export.txt",notes);File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision7/web-export-files.txt",files.OrderBy(path=>path));
            EditorSceneManager.OpenScene(Main,OpenSceneMode.Single);
        }
        static Material WaterMaterial(){string path=Folder+"/Water.mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);if(material==null){material=new Material(Shader.Find("UngaBunga/WebWater"));AssetDatabase.CreateAsset(material,path);}return material;}
        static Material Convert(Material source)
        {
            if(source==null)return null;if(materials.TryGetValue(source,out var cached))return cached;
            string shader=source.shader?.name??"";if(shader.StartsWith("TextMeshPro/")||shader.StartsWith("UI/")||shader.StartsWith("UngaBunga/Web")||shader=="UngaBunga/PortraitComposite")return source;
            bool unlit=shader.Contains("Unlit")||shader.Contains("Particle");var target=new Material(Shader.Find(unlit?"Universal Render Pipeline/Particles/Unlit":"UngaBunga/WebWorld"));target.name=source.name+" · Web";target.enableInstancing=true;
            var color=source.HasProperty("_BaseColor")?source.GetColor("_BaseColor"):source.HasProperty("_UnlitColor")?source.GetColor("_UnlitColor"):Color.white;
            string map=source.HasProperty("_BaseColorMap")?"_BaseColorMap":source.HasProperty("_UnlitColorMap")?"_UnlitColorMap":source.HasProperty("_MainTex")?"_MainTex":null;
            string destination=unlit?"_BaseMap":"_BaseColorMap";target.SetColor("_BaseColor",color);if(map!=null){target.SetTexture(destination,source.GetTexture(map));target.SetTextureScale(destination,source.GetTextureScale(map));target.SetTextureOffset(destination,source.GetTextureOffset(map));}
            if(!unlit){target.SetFloat("_AlphaCutoff",source.HasProperty("_AlphaCutoffEnable")&&source.GetFloat("_AlphaCutoffEnable")>.5f?source.GetFloat("_AlphaCutoff"):0);target.SetFloat("_WindStrength",shader.Contains("FoliageWind")?1:0);target.SetFloat("_WarmHide",shader.Contains("NativeHide")?1:0);target.SetFloat("_Cull",source.HasProperty("_CullMode")?source.GetFloat("_CullMode"):2);}
            else if(source.HasProperty("_SurfaceType")&&source.GetFloat("_SurfaceType")>.5f){target.SetFloat("_Surface",1);target.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);target.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);target.SetFloat("_ZWrite",0);target.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");target.renderQueue=3000;}
            string name=AssetDatabase.AssetPathToGUID(AssetDatabase.GetAssetPath(source));if(string.IsNullOrEmpty(name))name=Guid.NewGuid().ToString("N");AssetDatabase.CreateAsset(target,Folder+"/Materials/"+name+".mat");materials[source]=target;return target;
        }
    }
}
