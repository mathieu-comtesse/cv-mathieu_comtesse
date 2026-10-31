using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001.Editor
{
    public static class NativeOriginalCast
    {
        static readonly Dictionary<string,(string prefab,string mesh)> Sources=new Dictionary<string,(string,string)>{
            {"Aurelien",("npcs/quest givers/NPC_Template_Member","man-shaman-primeval")},{"Dylan",("NPC_Twig_Member","man-twig-primeval")},
            {"Mathieu",("NPC_Crane_Member","man-crane-primeval")},{"Georges",("NPC_Boulder_Member","man-balvan-primeval")},
            {"Eliott",("NPC_Mufflefoot_Member","man-tichonozka-primeval")},{"Mathilde",("NPC_She-wolf_Member","woman-vlcice-primeval")},
            {"Neila",("NPC_Owl_Member","woman-sova-primeval")},{"Lorette",("NPC_TheWiseOne_Member","woman-hermit-primeval")}};
        public static void Install()
        {
            const string path="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity";
            string backup="E:/UNGA-BUNGA-45001/Revision3/SceneBeforeOriginalAvatars.unity";if(!File.Exists(backup))File.Copy(path,backup);
            EditorSceneManager.OpenScene(path,OpenSceneMode.Single);var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var notes=new List<string>();
            foreach(var binding in campaign.bindings.characters)
            {
                var old=binding.meshyActor;if(old.name.StartsWith("NativeOriginal_")){notes.Add(binding.id+" already original");continue;}
                var appearance=Path.GetFileNameWithoutExtension(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(old));if(!Sources.ContainsKey(appearance))throw new InvalidOperationException("Unknown native appearance: "+binding.id+" / "+appearance);
                var spec=Sources[appearance];var root=campaign.bindings.Find(binding.id);var prefab=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/"+spec.prefab+".prefab");
                var model=(GameObject)PrefabUtility.InstantiatePrefab(prefab,root.gameObject.scene);model.name="NativeOriginal_"+binding.id;model.transform.SetParent(root,false);model.transform.localPosition=Vector3.zero;model.transform.localRotation=Quaternion.identity;model.transform.localScale=old.transform.localScale;
                foreach(var script in model.GetComponentsInChildren<MonoBehaviour>(true))if(script!=null)UnityEngine.Object.DestroyImmediate(script);
                foreach(var t in model.GetComponentsInChildren<Transform>(true))GameObjectUtility.RemoveMonoBehavioursWithMissingScript(t.gameObject);
                foreach(var joint in model.GetComponentsInChildren<Joint>(true))UnityEngine.Object.DestroyImmediate(joint);
                foreach(var obstacle in model.GetComponentsInChildren<NavMeshObstacle>(true))UnityEngine.Object.DestroyImmediate(obstacle);
                foreach(var lod in model.GetComponentsInChildren<LODGroup>(true))UnityEngine.Object.DestroyImmediate(lod);
                foreach(var collider in model.GetComponentsInChildren<Collider>(true))UnityEngine.Object.DestroyImmediate(collider);
                foreach(var rb in model.GetComponentsInChildren<Rigidbody>(true))UnityEngine.Object.DestroyImmediate(rb);
                foreach(var a in model.GetComponentsInChildren<NavMeshAgent>(true))UnityEngine.Object.DestroyImmediate(a);
                foreach(var light in model.GetComponentsInChildren<Light>(true))light.enabled=false;
                foreach(var audio in model.GetComponentsInChildren<AudioSource>(true))audio.enabled=false;
                var skin=model.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r=>r.sharedMesh!=null&&r.sharedMesh.name==spec.mesh);if(skin==null)throw new InvalidOperationException("Native mesh missing: "+spec.mesh);
                var animator=model.GetComponentsInChildren<Animator>(true).FirstOrDefault(a=>a.avatar!=null&&a.avatar.isValid&&a.avatar.isHuman);if(animator==null)throw new InvalidOperationException("Original human Avatar missing: "+spec.prefab);
                var keep=new HashSet<Transform>();
                void Keep(Transform t){while(t!=null&&t.IsChildOf(model.transform)){keep.Add(t);t=t.parent;}}
                Keep(model.transform);Keep(skin.transform);Keep(animator.transform);foreach(var bone in skin.bones)Keep(bone);Keep(skin.rootBone);
                foreach(var t in model.GetComponentsInChildren<Transform>(true).Reverse())if(t!=null&&!keep.Contains(t))UnityEngine.Object.DestroyImmediate(t.gameObject);
                foreach(var a in model.GetComponentsInChildren<Animator>(true))a.enabled=a==animator;
                foreach(var r in model.GetComponentsInChildren<Renderer>(true)){r.enabled=r==skin;r.forceRenderingOff=false;}
                for(var t=skin.transform;t!=null&&t.IsChildOf(model.transform);t=t.parent)t.gameObject.SetActive(true);
                for(var t=animator.transform;t!=null&&t.IsChildOf(model.transform);t=t.parent)t.gameObject.SetActive(true);
                model.SetActive(true);skin.sharedMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/UngaBunga45001/Generated/NativeRepairV3/Native-body-atlas-solid.mat");skin.updateWhenOffscreen=true;
                skin.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.On;skin.receiveShadows=true;
                animator.enabled=true;animator.runtimeAnimatorController=binding.animator.runtimeAnimatorController;animator.applyRootMotion=false;animator.cullingMode=AnimatorCullingMode.AlwaysAnimate;
                animator.gameObject.AddComponent<FootGrounding>();var bridge=animator.gameObject.AddComponent<NativeAnimationAudio>();var oldBridge=binding.animator.GetComponent<NativeAnimationAudio>();bridge.step=oldBridge.step;bridge.tool=oldBridge.tool;bridge.waterStep=oldBridge.waterStep;
                var sound=animator.GetComponent<AudioSource>();sound.enabled=true;
                if(binding.id=="dylan"){var motor=root.GetComponent<ThirdPersonMotor>();motor.visual=model.transform;motor.animator=animator;}
                var locomotion=root.GetComponent<NativeLocomotionAgent>();if(locomotion!=null)locomotion.animator=animator;
                binding.meshyActor=model;binding.animator=animator;old.SetActive(false);
                if(new[]{"georges","brok","tarek","uma"}.Contains(binding.id))
                {
                    var hand=animator.GetBoneTransform(HumanBodyBones.RightHand);var tool=new GameObject("Outil natif de travail");tool.transform.SetParent(hand,false);var scale=hand.lossyScale;var inverse=new Vector3(1/Mathf.Abs(scale.x),1/Mathf.Abs(scale.y),1/Mathf.Abs(scale.z));tool.transform.localScale=inverse;tool.transform.localPosition=Vector3.Scale(new Vector3(0,.02f,.025f),inverse);tool.transform.localRotation=Quaternion.Euler(0,0,90);
                    tool.AddComponent<MeshFilter>().sharedMesh=AssetDatabase.LoadAssetAtPath<Mesh>("Assets/Mesh/stone-axe-primeval.asset");var renderer=tool.AddComponent<MeshRenderer>();renderer.sharedMaterial=skin.sharedMaterial;var visibility=tool.AddComponent<HeldWorkTool>();visibility.animator=animator;visibility.target=renderer;
                    if(renderer.bounds.size.magnitude>1.2f)throw new InvalidOperationException("Native hand tool scale invalid");
                }
                notes.Add(binding.id+" source="+spec.prefab+" mesh="+skin.sharedMesh.name+" avatar="+animator.avatar.name+" valid="+animator.avatar.isValid+" human="+animator.avatar.isHuman+" bones="+skin.bones.Length);
            }
            EditorUtility.SetDirty(campaign.bindings);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/native-original-cast.txt",notes);
        }
    }
}
