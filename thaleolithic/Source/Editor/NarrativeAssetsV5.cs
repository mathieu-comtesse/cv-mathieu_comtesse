using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class NarrativeAssetsV5
    {
        const string Scene="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",Folder="Assets/UngaBunga45001/Generated/NarrativeV5";
        public static void Prepare()
        {
            if(!File.Exists("E:/UNGA-BUNGA-45001/Revision5/SceneBeforeNarrative.unity"))File.Copy(Scene,"E:/UNGA-BUNGA-45001/Revision5/SceneBeforeNarrative.unity");
            EditorSceneManager.OpenScene(Scene,OpenSceneMode.Single);Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
            var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var bindings=campaign.bindings;var life=campaign.GetComponent<VillageLife>();var notes=new List<string>();
            void NewActor(string id,string sourceId,Vector3 position,string pose)
            {
                if(bindings.characters.Any(c=>c.id==id))return;var source=bindings.characters.First(c=>c.id==sourceId);var sourceRoot=bindings.Find(sourceId);var go=UnityEngine.Object.Instantiate(sourceRoot.gameObject,sourceRoot.parent);go.name="ActorRoot_"+id;
                var agent=go.GetComponent<NavMeshAgent>();if(agent!=null)agent.enabled=false;position.y=VillageLife.Ground(position);
                if(NavMesh.SamplePosition(position,out var hit,6,VillageNavigation.Filter()))position=hit.position;
                go.transform.position=position;go.transform.rotation=Quaternion.identity;var active=go.GetComponentsInChildren<Transform>(true).First(t=>t.name==source.meshyActor.name).gameObject;active.name="NativeOriginal_"+id;var animator=active.GetComponentInChildren<Animator>(true);
                foreach(var tool in active.GetComponentsInChildren<HeldWorkTool>(true))UnityEngine.Object.DestroyImmediate(tool.gameObject);
                var clone=new CharacterBinding{id=id,meshyActor=active,animator=animator,useMeshy=true};bindings.characters=bindings.characters.Concat(new[]{clone}).ToArray();bindings.objects=bindings.objects.Concat(new[]{new ObjectBinding{id=id,target=go.transform}}).ToArray();
                go.GetComponent<NativeLocomotionAgent>().animator=animator;if(agent!=null)agent.enabled=true;
                life.routines=life.routines.Concat(new[]{new VillagerRoutine{id=id,pose=pose,workplace=position,rest=bindings.Find("repos").position+Vector3.right*3,workFocus=position+Vector3.forward}}).ToArray();notes.Add(id+" complete native model and original Avatar from "+sourceId+" @"+position);
            }
            var fires=UnityEngine.Object.FindObjectsByType<NativeFire>(FindObjectsSortMode.None);var fire=fires.OrderByDescending(f=>f.transform.position.x).First();
            NewActor("alban","aurelien",fire.transform.position+Vector3.back*3.5f,"Talk");
            Vector3 shore=bindings.player.position+Vector3.right*25;float best=float.MaxValue;
            foreach(var water in UnityEngine.Object.FindObjectsByType<WaterSurface>(FindObjectsSortMode.None))foreach(var renderer in water.meshRenderers??new List<MeshRenderer>())
            {
                var filter=renderer.GetComponent<MeshFilter>();if(filter?.sharedMesh==null)continue;foreach(var v in filter.sharedMesh.vertices)
                {var point=filter.transform.TransformPoint(v);float score=(point-bindings.player.position).sqrMagnitude;if(score>=best)continue;
                    if(NavMesh.SamplePosition(point,out var h,5,VillageNavigation.Filter())&&VillageNavigation.Clear(h.position,bindings.player)){shore=h.position;best=score;}}
            }
            if(!bindings.objects.Any(b=>b.id=="berge_observation")){var anchor=new GameObject("Observation des berges");anchor.transform.position=shore;anchor.transform.SetParent(campaign.transform,true);bindings.objects=bindings.objects.Concat(new[]{new ObjectBinding{id="berge_observation",target=anchor.transform}}).ToArray();}
            NewActor("milena","lorette",shore+Vector3.right*2,"Gather");notes.Add("Berge = actual native water mesh boundary near human navigation "+shore);
            var director=campaign.GetComponent<AccidentDirector>()??campaign.gameObject.AddComponent<AccidentDirector>();director.campaign=campaign;
            Material Lit(string name,Color color){string path=Folder+"/"+name+".mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);if(material==null){material=new Material(Shader.Find("HDRP/Lit"));AssetDatabase.CreateAsset(material,path);}material.SetColor("_BaseColor",color);material.SetFloat("_Metallic",0);material.SetFloat("_Smoothness",.08f);material.enableInstancing=true;EditorUtility.SetDirty(material);return material;}
            director.bloodMaterial=Lit("Sang-stylise",new Color(.37f,.012f,.018f));director.woodMaterial=Lit("Bois-prevention",new Color(.32f,.15f,.055f));director.stoneMaterial=Lit("Pierre-accidents",new Color(.33f,.3f,.27f));director.flameMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/UngaBunga45001/Generated/FiresV5/Flamme-ambre.mat");
            Mesh NativeMesh(string key)=>AssetDatabase.FindAssets(key+" t:Mesh",new[]{"Assets/Mesh"}).Select(AssetDatabase.GUIDToAssetPath).Select(p=>AssetDatabase.LoadAssetAtPath<Mesh>(p)).FirstOrDefault(m=>m!=null&&m.vertexCount>10);
            director.rockMesh=NativeMesh("rock");director.treeMesh=NativeMesh("log");director.impact=AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/AudioClip/sfx_rock_hit_wood_02.wav");director.crack=AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/AudioClip/sfx_rock_hit_wood_03.wav");
            foreach(var pair in new[]{("carriere","pierre_carriere"),("silex","atelier_silex"),("fumees","foyer"),("abattage","bois_construction"),("chasse","chasse_clairiere")})
            {
                string id="safety_"+pair.Item1;if(bindings.buildings.Any(b=>b.id==id))continue;var target=bindings.Find(pair.Item2);var container=new GameObject("Maîtrise physique · "+pair.Item1);container.transform.SetParent(campaign.transform,true);container.transform.position=target.position;var building=new BuildingBinding{id=id};
                for(int stage=0;stage<4;stage++)
                {var root=new GameObject("État "+stage);root.transform.SetParent(container.transform,false);building.stages[stage]=root;root.SetActive(stage==0);if(stage==0)continue;
                    for(int p=0;p<4;p++){var post=GameObject.CreatePrimitive(PrimitiveType.Cylinder);post.name="Piquet de séparation";post.transform.SetParent(root.transform,false);post.transform.localPosition=new Vector3((p-1.5f)*.75f,.48f,1.8f);post.transform.localScale=new Vector3(.13f,.48f,.13f);post.GetComponent<MeshRenderer>().sharedMaterial=director.woodMaterial;}
                    for(int rail=0;rail<stage;rail++){var beam=GameObject.CreatePrimitive(PrimitiveType.Cube);beam.name="Protection collective";beam.transform.SetParent(root.transform,false);beam.transform.localPosition=new Vector3(0,.35f+rail*.3f,1.8f);beam.transform.localScale=new Vector3(2.6f,.12f,.13f);beam.GetComponent<MeshRenderer>().sharedMaterial=director.woodMaterial;}}
                bindings.buildings=bindings.buildings.Concat(new[]{building}).ToArray();
            }
            EditorUtility.SetDirty(bindings);EditorUtility.SetDirty(life);EditorUtility.SetDirty(director);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision5/narrative-assets.txt",notes);
        }
        public static void Build(){RecoveredWindowsBuild.Build();}
    }
}
