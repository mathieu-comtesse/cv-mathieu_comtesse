using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class WorldContactV2
    {
        public static void Apply()
        {
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var log=new System.Collections.Generic.List<string>();
            var pipeline=(HDRenderPipelineAsset)GraphicsSettings.defaultRenderPipeline;var settings=new SerializedObject(pipeline);var interactionMode=settings.FindProperty("m_RenderPipelineSettings.waterScriptInteractionsMode");if(interactionMode!=null)interactionMode.enumValueIndex=(int)WaterScriptInteractionsMode.CPUSimulation;settings.ApplyModifiedPropertiesWithoutUndo();
            foreach(var renderer in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.name=="prologue-lake-waterplane"||r.name=="prologue-waterfall-waterplane"))
            {
                string name="HDRP water / "+renderer.name;var go=GameObject.Find(name)??new GameObject(name);go.transform.position=new Vector3(0,renderer.bounds.center.y,0);var surface=go.GetComponent<WaterSurface>()??go.AddComponent<WaterSurface>();surface.geometryType=WaterGeometryType.Custom;surface.surfaceType=WaterSurfaceType.River;surface.meshRenderers=new System.Collections.Generic.List<MeshRenderer>{renderer};surface.scriptInteractions=true;surface.timeMultiplier=.6f;
                log.Add(name+" original geometry bounds="+renderer.bounds+" source mesh="+AssetDatabase.GetAssetPath(renderer.GetComponent<MeshFilter>().sharedMesh));
                renderer.forceRenderingOff=true;
            }
            int surfaces=UnityEngine.Object.FindObjectsByType<NavMeshSurface>(FindObjectsSortMode.None).Length;int existingAgents=UnityEngine.Object.FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None).Length;log.Add("Preflight navigation: surfaces="+surfaces+" agents="+existingAgents);
            var navRoot=GameObject.Find("Navigation du village V2")??new GameObject("Navigation du village V2");navRoot.transform.position=new Vector3(350.92f,14,281.88f);var nav=navRoot.GetComponent<NavMeshSurface>()??navRoot.AddComponent<NavMeshSurface>();nav.collectObjects=CollectObjects.Volume;nav.center=Vector3.zero;nav.size=new Vector3(115,65,115);nav.useGeometry=NavMeshCollectGeometry.PhysicsColliders;nav.overrideVoxelSize=true;nav.voxelSize=.12f;nav.overrideTileSize=true;nav.tileSize=128;
            const string navPath="Assets/UngaBunga45001/Generated/NativeCastV2/VillageNavMesh.asset";
            if(nav.navMeshData==null){var stored=AssetDatabase.LoadAssetAtPath<NavMeshData>(navPath);if(stored!=null){nav.navMeshData=stored;nav.AddData();}else{nav.BuildNavMesh();if(nav.navMeshData==null)throw new InvalidOperationException("NavMesh bake produced no data");AssetDatabase.CreateAsset(nav.navMeshData,navPath);}}
            int located=0;
            foreach(var actor in campaign.bindings.characters.Where(c=>c.id!="dylan"))
            {
                var root=campaign.bindings.Find(actor.id);var agent=root.GetComponent<NavMeshAgent>();if(agent==null)agent=root.gameObject.AddComponent<NavMeshAgent>();agent.radius=.26f;agent.height=1.8f;agent.baseOffset=0;agent.speed=1.6f;agent.angularSpeed=180;agent.acceleration=5;agent.stoppingDistance=.24f;
                if(NavMesh.SamplePosition(root.position,out var hit,2,NavMesh.AllAreas)){agent.Warp(hit.position);located++;}
            }
            log.Add("Native geometry navigation baked; agents on mesh="+located+"/17");EditorUtility.SetDirty(nav);EditorUtility.SetDirty(pipeline);AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision2/world-contact-setup.txt",log);
        }
    }
}
