using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
namespace UngaBunga45001.Editor
{
    public static class SimulationV3Install
    {
        public static void Apply()
        {
            const string scenePath="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity";const string root="E:/UNGA-BUNGA-45001/Revision3";
            if(!File.Exists(root+"/SceneBeforeSimulation.unity"))File.Copy(scenePath,root+"/SceneBeforeSimulation.unity");
            EditorSceneManager.OpenScene(scenePath,OpenSceneMode.Single);var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var life=campaign.GetComponent<VillageLife>();
            var nav=GameObject.Find("Navigation du village V2").GetComponent<NavMeshSurface>();
            var service=campaign.GetComponent<VillageNavigation>();if(service==null)service=campaign.gameObject.AddComponent<VillageNavigation>();service.surface=nav;
            var navigationSettings=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/NavMeshAreas.asset")[0]);var areas=navigationSettings.FindProperty("areas");
            foreach(var tuple in new[]{(0,"Walkable",1.2f),(4,"Chemins aménagés",1f),(5,"Herbes hautes",1.5f),(6,"Terrain irrégulier",1.8f),(7,"Passages encombrés",2.5f),(8,"Dangers signalés",8f)})
            {var entry=areas.GetArrayElementAtIndex(tuple.Item1);entry.FindPropertyRelative("name").stringValue=tuple.Item2;entry.FindPropertyRelative("cost").floatValue=tuple.Item3;}navigationSettings.ApplyModifiedPropertiesWithoutUndo();
            var notes=new List<string>{"Navigation before install: surfaces="+UnityEngine.Object.FindObjectsByType<NavMeshSurface>(FindObjectsSortMode.None).Length+" agents="+UnityEngine.Object.FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None).Length+" obstacles="+UnityEngine.Object.FindObjectsByType<NavMeshObstacle>(FindObjectsSortMode.None).Length};
            life.carriedMesh=AssetDatabase.LoadAssetAtPath<Mesh>("Assets/Mesh/basket-primeval.asset");life.carriedMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/UngaBunga45001/Generated/NativeRepairV3/polylithic-atlas-solid.mat");
            foreach(var routine in life.routines)
            {
                var actor=campaign.bindings.characters.First(a=>a.id==routine.id);var actorRoot=campaign.bindings.Find(actor.id);var agent=actorRoot.GetComponent<NavMeshAgent>();VillageNavigation.Configure(agent);agent.enabled=false;
                var controller=actor.animator.runtimeAnimatorController as AnimatorController;
                foreach(var tuple in new[]{("Eat","standingeat_chew_295487"),("Laugh","Idle_Stand_Laugh"),("Crouch","Idle_Crouching"),("Sleep","Idle_Lying_Side"),("SitDown","Sit_Start"),("StandUp","Sit_End"),("Inspect","Gather_Crouch_Loop"),("Pick","Gather_Crouch_Start"),("TurnLeft","Additive_Turn_Left"),("TurnRight","Additive_Turn_Right")})
                {
                    if(controller.layers[0].stateMachine.states.Any(s=>s.state.name==tuple.Item1))continue;
                    var clip=AssetDatabase.LoadAssetAtPath<AnimationClip>("Assets/AnimationClip/"+tuple.Item2+".anim");if(clip==null||!clip.humanMotion){notes.Add("Unavailable humanoid animation: "+tuple.Item1+" / "+tuple.Item2);continue;}
                    string path="Assets/UngaBunga45001/Generated/NativeCastV2/V3-"+tuple.Item2+".anim";var loop=AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
                    if(loop==null){loop=UnityEngine.Object.Instantiate(clip);var settings=AnimationUtility.GetAnimationClipSettings(loop);settings.loopTime=tuple.Item1!="SitDown"&&tuple.Item1!="StandUp"&&tuple.Item1!="Pick";AnimationUtility.SetAnimationClipSettings(loop,settings);AssetDatabase.CreateAsset(loop,path);}
                    controller.layers[0].stateMachine.AddState(tuple.Item1).motion=loop;
                }
                EditorUtility.SetDirty(controller);
                var station=UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.enabled&&System.Text.RegularExpressions.Regex.IsMatch(r.name,"grindstone|hide-rack|wood-pile|campfire|log-pile",System.Text.RegularExpressions.RegexOptions.IgnoreCase)).OrderBy(r=>(r.bounds.center-routine.workplace).sqrMagnitude).FirstOrDefault();
                routine.workFocus=station!=null&&Vector3.Distance(station.bounds.center,routine.workplace)<5?station.bounds.center:routine.workplace+actorRoot.forward;
            }
            var roadRoot=GameObject.Find("Coûts de circulation V3");if(roadRoot==null)roadRoot=new GameObject("Coûts de circulation V3");
            if(roadRoot.transform.childCount==0)
            {
                var village=GameObject.Find("Village complet V2");
                foreach(var trail in village.GetComponentsInChildren<MeshFilter>().Where(f=>f.name=="Sentier"))
                {
                    var vertices=trail.sharedMesh.vertices;
                    for(int i=0;i+3<vertices.Length;i+=2)
                    {
                        var a=trail.transform.TransformPoint((vertices[i]+vertices[i+1])*.5f);var b=trail.transform.TransformPoint((vertices[i+2]+vertices[i+3])*.5f);var delta=b-a;delta.y=0;if(delta.magnitude<.1f)continue;
                        var go=new GameObject("Chemin / "+roadRoot.transform.childCount);go.transform.SetParent(roadRoot.transform);go.transform.position=(a+b)*.5f;go.transform.rotation=Quaternion.LookRotation(delta);
                        var volume=go.AddComponent<NavMeshModifierVolume>();volume.area=VillageNavigation.Road;volume.center=Vector3.up*.7f;volume.size=new Vector3(1.3f,2.2f,delta.magnitude+.12f);
                    }
                }
            }
            notes.Add("Preferred route segments="+roadRoot.transform.childCount);Physics.SyncTransforms();nav.RemoveData();nav.BuildNavMesh();
            const string navPath="Assets/UngaBunga45001/Generated/NativeCastV2/VillageNavMesh.asset";var stored=AssetDatabase.LoadAssetAtPath<NavMeshData>(navPath);
            if(stored==null)AssetDatabase.CreateAsset(nav.navMeshData,navPath);else{EditorUtility.CopySerialized(nav.navMeshData,stored);nav.RemoveData();nav.navMeshData=stored;nav.AddData();EditorUtility.SetDirty(stored);}
            var clips=AssetDatabase.FindAssets("t:AnimationClip",new[]{"Assets/AnimationClip"}).Select(g=>AssetDatabase.LoadAssetAtPath<AnimationClip>(AssetDatabase.GUIDToAssetPath(g))).Where(c=>c!=null).Select(c=>c.name+" human="+c.humanMotion+" length="+c.length).ToArray();File.WriteAllLines(root+"/animation-inventory.txt",clips);
            notes.Add("Animation assets inspected="+clips.Length);AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());File.WriteAllLines(root+"/simulation-install.txt",notes);
        }
    }
}
