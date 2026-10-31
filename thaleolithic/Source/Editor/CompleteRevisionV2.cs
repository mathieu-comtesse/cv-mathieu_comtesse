using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class CompleteRevisionV2
    {
        public static void Apply()
        {
            RenderRevisionV2.Apply();
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var bindings=campaign.bindings;
            foreach(var actor in bindings.characters)
            {
                var path=PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(actor.meshyActor);string appearance=Path.GetFileNameWithoutExtension(path);
                foreach(var renderer in actor.meshyActor.GetComponentsInChildren<Renderer>(true))if(renderer.name.StartsWith("MeshyHead"))foreach(var material in renderer.sharedMaterials)
                {material.SetColor("_BaseColor",Color.white);material.SetTexture("_BaseColorMap",AssetDatabase.LoadAssetAtPath<Texture2D>(PrehistoricCastV2.Root+"/"+appearance+"/"+appearance+"-HeadPalette.png"));EditorUtility.SetDirty(material);}
                if(actor.animator.GetComponent<FootGrounding>()==null)actor.animator.gameObject.AddComponent<FootGrounding>();
                var controller=(AnimatorController)actor.animator.runtimeAnimatorController;var layers=controller.layers;layers[0].iKPass=true;controller.layers=layers;
                foreach(var state in layers[0].stateMachine.states)
                {
                    if(!(state.state.motion is AnimationClip clip)||state.state.name=="React"||state.state.name=="Throw")continue;
                    string target="Assets/UngaBunga45001/Generated/NativeCastV2/Loop-"+clip.name+".anim";var copy=AssetDatabase.LoadAssetAtPath<AnimationClip>(target);
                    if(copy==null){copy=UnityEngine.Object.Instantiate(clip);copy.name=clip.name+" authored loop";var settings=AnimationUtility.GetAnimationClipSettings(copy);settings.loopTime=true;AnimationUtility.SetAnimationClipSettings(copy,settings);AssetDatabase.CreateAsset(copy,target);}state.state.motion=copy;
                }
                EditorUtility.SetDirty(controller);
            }
            var motor=bindings.player.GetComponent<ThirdPersonMotor>();motor.walkSpeed=1.8f;motor.runSpeed=4.3f;
            var stage=campaign.GetComponent<CinematicStage>()??campaign.gameObject.AddComponent<CinematicStage>();stage.bindings=bindings;stage.campaign=campaign;stage.fallingFrame=GameObject.Find("Charpente effondrée du tutoriel")?.transform;
            stage.mammoth=bindings.Find("chasse_clairiere").GetComponentsInChildren<Transform>(true).FirstOrDefault(t=>t.name.Contains("Mammoth_Mob"));
            if(stage.mammoth!=null)
            {
                foreach(var animator in stage.mammoth.GetComponentsInChildren<Animator>(true))
                {
                    string path="Assets/UngaBunga45001/Generated/NativeCastV2/Mammoth.controller";var controller=AssetDatabase.LoadAssetAtPath<AnimatorController>(path);
                    if(controller==null){controller=AnimatorController.CreateAnimatorControllerAtPath(path);var machine=controller.layers[0].stateMachine;foreach(var pair in new[]{("Idle","Mammoth_idle"),("Walk","Mammoth_walk"),("Attack","Mammoth_attack03_run")}){var stateNode=machine.AddState(pair.Item1);stateNode.motion=AssetDatabase.LoadAssetAtPath<AnimationClip>("Assets/AnimationClip/"+pair.Item2+".anim");if(pair.Item1=="Idle")machine.defaultState=stateNode;}}
                    animator.enabled=true;animator.runtimeAnimatorController=controller;animator.applyRootMotion=false;
                }
            }
            if(stage.wheel==null)
            {
                var wheel=new GameObject("Roue du progrès");wheel.transform.SetParent(campaign.transform);var disk=GameObject.CreatePrimitive(PrimitiveType.Cylinder);disk.transform.SetParent(wheel.transform,false);disk.transform.localScale=new Vector3(1.1f,.16f,1.1f);disk.transform.localRotation=Quaternion.Euler(90,0,0);disk.GetComponent<Renderer>().sharedMaterial=Wood();stage.wheel=wheel.transform;wheel.SetActive(false);
            }
            if(stage.notice==null)
            {
                var sign=new GameObject("Panneau retourné par Lorette");sign.transform.position=bindings.Find("atelier_silex").position+new Vector3(2,0,-1);sign.transform.SetParent(campaign.transform);
                var post=GameObject.CreatePrimitive(PrimitiveType.Cube);post.transform.SetParent(sign.transform,false);post.transform.localPosition=Vector3.up*.65f;post.transform.localScale=new Vector3(.12f,1.3f,.12f);post.GetComponent<Renderer>().sharedMaterial=Wood();
                var board=GameObject.CreatePrimitive(PrimitiveType.Cube);board.transform.SetParent(sign.transform,false);board.transform.localPosition=Vector3.up*1.3f;board.transform.localScale=new Vector3(1.15f,.5f,.09f);board.GetComponent<Renderer>().sharedMaterial=Wood();stage.notice=board.transform;
            }
            var evolution=campaign.GetComponent<VillageEvolution>();
            if(evolution==null)
            {
                evolution=campaign.gameObject.AddComponent<VillageEvolution>();evolution.campaign=campaign;var village=GameObject.Find("Village complet V2").transform;
                evolution.earlyHuts=Enumerable.Range(0,village.childCount).Select(i=>village.GetChild(i).gameObject).Where(go=>go.name.StartsWith("CampHut_Destroyable")).ToArray();var improved=new List<GameObject>();
                foreach(var old in evolution.earlyHuts){var group=new GameObject("Habitation renforcée V2");group.transform.SetParent(village);group.transform.SetPositionAndRotation(old.transform.position,old.transform.rotation);Clone("Hut.WoodFrame_Placed",group.transform,Vector3.zero);Clone("Hut.LeatherCover_Placed",group.transform,Vector3.zero);group.SetActive(false);improved.Add(group);}evolution.improvedHuts=improved.ToArray();
                var safety=new GameObject("Zones de travail délimitées");safety.transform.SetParent(village);var position=bindings.Find("atelier_silex").position;safety.transform.position=position;for(int i=0;i<4;i++)Clone("Fence_Wood_Placed",safety.transform,new Vector3(-4+i*2.5f,0,3));safety.SetActive(false);evolution.safetyProps=safety;
            }
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);
            File.WriteAllText("E:/UNGA-BUNGA-45001/Revision2/completion-install.txt","Dylan playable; 18 native human skeletons; source gait/work/talk clips; foot IK; minimap/world map; six inhabited huts and six upgraded variants; real cinematic staging, camera moves, working actors, collapse, mammoth and rolling wheel. Awaiting runtime and visual checks.");
        }
        private static Material Wood()
        {const string path="Assets/UngaBunga45001/Generated/NativeCastV2/Primitive-Wood.mat";var mat=AssetDatabase.LoadAssetAtPath<Material>(path);if(mat==null){mat=new Material(Shader.Find("HDRP/Lit"));mat.SetColor("_BaseColor",new Color(.16f,.075f,.027f));mat.SetFloat("_Smoothness",.06f);AssetDatabase.CreateAsset(mat,path);}return mat;}
        private static void Clone(string name,Transform parent,Vector3 local)
        {
            var prefab=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/"+name+".prefab");var go=(GameObject)PrefabUtility.InstantiatePrefab(prefab,parent.gameObject.scene);go.transform.SetParent(parent,false);go.transform.localPosition=local;
            foreach(var script in go.GetComponentsInChildren<MonoBehaviour>(true))if(script!=null)UnityEngine.Object.DestroyImmediate(script);
            foreach(var tr in go.GetComponentsInChildren<Transform>(true)){GameObjectUtility.RemoveMonoBehavioursWithMissingScript(tr.gameObject);if(System.Text.RegularExpressions.Regex.IsMatch(tr.name,"Ghost|Preview|Outline|Highlight|Canvas",System.Text.RegularExpressions.RegexOptions.IgnoreCase))tr.gameObject.SetActive(false);}
        }
    }
}
