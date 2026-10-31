#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UngaBunga45001;
public static class CinematicBakeV15
{
 [Serializable]class Baked{public string id,actor;public int curves;public float duration;public bool human,loop;}
 [Serializable]class Receipt{public Baked[] clips;}
 public static void Bake()
 {
  var library=JsonUtility.FromJson<FilmLibraryV15>(File.ReadAllText("Assets/UngaBunga45001/Resources/CinematicLibraryV15.json"));
  var bindings=UnityEngine.Object.FindFirstObjectByType<SceneBindings>();string folder="Assets/UngaBunga45001/Resources/CinematicsV15/Clips";Directory.CreateDirectory(folder);AssetDatabase.Refresh();
  var reports=new System.Collections.Generic.List<Baked>();
  foreach(var spec in library.clips)
  {
   var original=bindings.AnimatorFor(spec.actor)??bindings.AnimatorFor("dylan");var clone=UnityEngine.Object.Instantiate(original.gameObject);clone.hideFlags=HideFlags.HideAndDontSave;
   clone.transform.SetPositionAndRotation(Vector3.zero,Quaternion.identity);clone.transform.localScale=Vector3.one;var animator=clone.GetComponent<Animator>();animator.Rebind();
   var idle=original.runtimeAnimatorController.animationClips.FirstOrDefault(c=>c.name.Contains("Stand_Listen"))??original.runtimeAnimatorController.animationClips[0];idle.SampleAnimation(clone,.3f);
   var handler=new HumanPoseHandler(animator.avatar,animator.transform);var pose=new HumanPose();handler.GetHumanPose(ref pose);
   var clip=new AnimationClip{name=spec.id,frameRate=30,wrapMode=WrapMode.Once};
   for(int muscle=0;muscle<HumanTrait.MuscleCount;muscle++)
   {
    string name=HumanTrait.MuscleName[muscle];var track=spec.muscles.FirstOrDefault(m=>m.name==name);var keys=new Keyframe[spec.times.Length];
    for(int k=0;k<keys.Length;k++){float delta=track==null?0:track.values[k];keys[k]=new Keyframe(spec.times[k]*spec.duration,Mathf.Clamp(pose.muscles[muscle]+delta,-1,1));}
    var curve=new AnimationCurve(keys);for(int k=0;k<keys.Length;k++){AnimationUtility.SetKeyLeftTangentMode(curve,k,AnimationUtility.TangentMode.ClampedAuto);AnimationUtility.SetKeyRightTangentMode(curve,k,AnimationUtility.TangentMode.ClampedAuto);}AnimationUtility.SetEditorCurve(clip,EditorCurveBinding.FloatCurve("",typeof(Animator),name),curve);
   }
   for(int axis=0;axis<3;axis++){var keys=spec.times.Select((t,k)=>new Keyframe(t*spec.duration,pose.bodyPosition[axis]+(axis==1&&spec.bodyY.Length>k?spec.bodyY[k]:0))).ToArray();AnimationUtility.SetEditorCurve(clip,EditorCurveBinding.FloatCurve("",typeof(Animator),"RootT."+"xyz"[axis]),new AnimationCurve(keys));}
   for(int axis=0;axis<4;axis++)AnimationUtility.SetEditorCurve(clip,EditorCurveBinding.FloatCurve("",typeof(Animator),"RootQ."+"xyzw"[axis]),AnimationCurve.Constant(0,spec.duration,pose.bodyRotation[axis]));
   var settings=AnimationUtility.GetAnimationClipSettings(clip);settings.loopTime=false;settings.loopBlend=false;settings.startTime=0;settings.stopTime=spec.duration;settings.keepOriginalPositionXZ=true;settings.keepOriginalOrientation=true;AnimationUtility.SetAnimationClipSettings(clip,settings);
   string path=folder+"/"+spec.id+".anim";var existing=AssetDatabase.LoadAssetAtPath<AnimationClip>(path);if(existing==null)AssetDatabase.CreateAsset(clip,path);else{EditorUtility.CopySerialized(clip,existing);UnityEngine.Object.DestroyImmediate(clip);clip=existing;EditorUtility.SetDirty(clip);}
   reports.Add(new Baked{id=spec.id,actor=spec.actor,curves=AnimationUtility.GetCurveBindings(clip).Length,duration=clip.length,human=clip.humanMotion,loop=clip.isLooping});handler.Dispose();UnityEngine.Object.DestroyImmediate(clone);
  }
  AssetDatabase.SaveAssets();File.WriteAllText("E:/UNGA-BUNGA-45001/Revision15/clips-baked.json",JsonUtility.ToJson(new Receipt{clips=reports.ToArray()},true));Debug.Log("V15 baked "+reports.Count+" dedicated non-looping native humanoid clips");
 }
}
#endif
