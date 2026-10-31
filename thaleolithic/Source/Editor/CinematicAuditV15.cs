#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UngaBunga45001;
public static class CinematicAuditV15
{
 [Serializable]class ClipInfo{public string name,path;public float duration;public bool loop,human;public int events;}
 [Serializable]class ActorInfo{public string id,avatar,controller;public bool humanoid,jaw,leftEye,rightEye;public int blendShapes,bones,triangles;public string mesh;public ClipInfo[] clips;}
 [Serializable]class Report{public string engine="Unity 6000.2.12f1 / URP",physics="PhysX",scene;public ActorInfo[] actors;public string[] muscles;public CinematicDefinition[] films;public string[] audio;}
 public static void Run()
 {
  const string scene="Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity";
  if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play mode before auditing assets");
  EditorSceneManager.OpenScene(scene);var c=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();
  var data=JsonUtility.FromJson<CampaignData>(c.campaignJson.text);
  var report=new Report{scene=scene,muscles=HumanTrait.MuscleName,films=data.cinematics,
   audio=AssetDatabase.FindAssets("t:AudioClip",new[]{"Assets"}).Select(AssetDatabase.GUIDToAssetPath).ToArray(),
   actors=c.bindings.characters.Select(a=>{
    var animator=a.animator;var meshes=a.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>(true);
    var clips=animator.runtimeAnimatorController?.animationClips.Distinct().Select(clip=>new ClipInfo{name=clip.name,path=AssetDatabase.GetAssetPath(clip),duration=clip.length,loop=clip.isLooping,human=clip.humanMotion,events=AnimationUtility.GetAnimationEvents(clip).Length}).ToArray();
    return new ActorInfo{id=a.id,avatar=AssetDatabase.GetAssetPath(animator.avatar),controller=AssetDatabase.GetAssetPath(animator.runtimeAnimatorController),humanoid=animator.isHuman,jaw=animator.isHuman&&animator.GetBoneTransform(HumanBodyBones.Jaw)!=null,leftEye=animator.isHuman&&animator.GetBoneTransform(HumanBodyBones.LeftEye)!=null,rightEye=animator.isHuman&&animator.GetBoneTransform(HumanBodyBones.RightEye)!=null,blendShapes=meshes.Sum(m=>m.sharedMesh.blendShapeCount),bones=meshes.Sum(m=>m.bones.Length),triangles=meshes.Sum(m=>m.sharedMesh.triangles.Length/3),mesh=string.Join(";",meshes.Select(m=>AssetDatabase.GetAssetPath(m.sharedMesh))),clips=clips??Array.Empty<ClipInfo>()};
   }).ToArray()};
  Directory.CreateDirectory("E:/UNGA-BUNGA-45001/Revision15");File.WriteAllText("E:/UNGA-BUNGA-45001/Revision15/audit-before.json",JsonUtility.ToJson(report,true));Debug.Log("V15 audit: "+report.actors.Length+" native actors, "+report.films.Length+" existing films");
 }
}
#endif
