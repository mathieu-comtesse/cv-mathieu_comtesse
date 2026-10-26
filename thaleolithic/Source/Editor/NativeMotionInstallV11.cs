using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using UnityEngine;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UngaBunga45001;
public static class NativeMotionInstallV11
{
 public static void Apply()
 {
  const string folder="Assets/UngaBunga45001/Generated/MotionV11";Directory.CreateDirectory(folder);AssetDatabase.Refresh();var notes=new List<string>();
  AnimationClip Clip(string name,bool loop)
  {
   string source="Assets/AnimationClip/"+name+".anim";if(!File.Exists(source)){string recovered="E:/UNGA-BUNGA-45001/RecoveredProject/ExportedProject/"+source;File.Copy(recovered,source);if(File.Exists(recovered+".meta"))File.Copy(recovered+".meta",source+".meta");AssetDatabase.ImportAsset(source,ImportAssetOptions.ForceSynchronousImport);}
   var original=AssetDatabase.LoadAssetAtPath<AnimationClip>(source);if(original==null||!original.humanMotion)throw new InvalidOperationException("A native human clip is required: "+name);string path=folder+"/"+name+".anim";var copy=AssetDatabase.LoadAssetAtPath<AnimationClip>(path);if(copy==null){copy=UnityEngine.Object.Instantiate(original);var settings=AnimationUtility.GetAnimationClipSettings(copy);settings.loopTime=loop;AnimationUtility.SetAnimationClipSettings(copy,settings);AssetDatabase.CreateAsset(copy,path);}notes.Add(name+" | native human=True | seconds="+original.length+" | sourceSHA256="+BitConverter.ToString(SHA256.Create().ComputeHash(File.ReadAllBytes(source))).Replace("-","").ToLowerInvariant()+" | loop="+loop);return copy;
  }
  var crouchIdle=Clip("Idle_Crouching",true);var crouchWalk=Clip("CrouchWalk_Forward",true);var left=Clip("CrouchWalk_Left",true);var right=Clip("CrouchWalk_Right",true);var jump=Clip("Jump Start",false);var fall=Clip("Falling",true);var land=Clip("Jump End",false);
  var c=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var player=c.bindings.characters.First(a=>a.id=="dylan").animator;
  var controller=player.runtimeAnimatorController as AnimatorController;if(controller==null)throw new InvalidOperationException("Player native controller not found");var machine=controller.layers[0].stateMachine;
  void State(string name,Motion motion){var state=machine.states.FirstOrDefault(s=>s.state.name==name).state;if(state==null)state=machine.AddState(name);state.motion=motion;EditorUtility.SetDirty(state);}
  var blend=AssetDatabase.LoadAllAssetsAtPath(AssetDatabase.GetAssetPath(controller)).OfType<BlendTree>().FirstOrDefault(b=>b.name=="Native crouch locomotion");if(blend==null){blend=new BlendTree{name="Native crouch locomotion",blendType=BlendTreeType.Simple1D,blendParameter="Speed",useAutomaticThresholds=false};AssetDatabase.AddObjectToAsset(blend,controller);blend.AddChild(crouchIdle,0);blend.AddChild(crouchWalk,.5f);}State("CrouchLocomotion",blend);State("CrouchLeft",left);State("CrouchRight",right);State("JumpStart",jump);State("JumpFall",fall);State("JumpLand",land);EditorUtility.SetDirty(controller);
  var punch=Clip("crouched_melee_attack",false);var knock=Clip("HitReaction_KnockBack",false);var dodge=Clip("Standing Dodge Backward",false);
  // The recovered clip named kick belongs to a hoofed animal. Never bind it to a human avatar.
  string kickPath=folder+"/Duel_responsibility_kick.anim";var kick=AssetDatabase.LoadAssetAtPath<AnimationClip>(kickPath);
  if(kick==null){kick=UnityEngine.Object.Instantiate(punch);AssetDatabase.CreateAsset(kick,kickPath);}
  kick.name="Duel responsibility kick · authored on native human rig";foreach(var binding in AnimationUtility.GetCurveBindings(kick).Where(b=>b.propertyName.StartsWith("RightUpperLeg")||b.propertyName.StartsWith("RightLowerLeg")||b.propertyName.StartsWith("Right Upper Leg")||b.propertyName.StartsWith("Right Lower Leg")||b.propertyName.StartsWith("RightFoot")))AnimationUtility.SetEditorCurve(kick,binding,null);
  AnimationUtility.SetEditorCurve(kick,EditorCurveBinding.FloatCurve("",typeof(Animator),"Right Upper Leg Front-Back"),new AnimationCurve(new Keyframe(0,0),new Keyframe(.25f,.78f),new Keyframe(.5f,.68f),new Keyframe(.85f,0)));
  AnimationUtility.SetEditorCurve(kick,EditorCurveBinding.FloatCurve("",typeof(Animator),"Right Lower Leg Stretch"),new AnimationCurve(new Keyframe(0,0),new Keyframe(.18f,.6f),new Keyframe(.38f,-.75f),new Keyframe(.7f,.25f),new Keyframe(1,0)));EditorUtility.SetDirty(kick);
  notes.Add("Duel responsibility kick | authored human muscle curves on cloned native crouched_melee_attack; original animal kick excluded");
  foreach(var fighter in c.bindings.characters.Where(a=>a.id=="dylan"||a.id=="aurelien"))
  {var ac=fighter.animator.runtimeAnimatorController as AnimatorController;if(ac==null)throw new InvalidOperationException("Native fighter controller missing");var sm=ac.layers[0].stateMachine;void Add(string id,Motion motion){var state=sm.states.FirstOrDefault(s=>s.state.name==id).state;if(state==null)state=sm.AddState(id);state.motion=motion;EditorUtility.SetDirty(state);}Add("DuelPunch",punch);Add("DuelKick",kick);Add("DuelFall",knock);Add("DuelDodge",dodge);EditorUtility.SetDirty(ac);}
  var motor=c.bindings.player.GetComponent<ThirdPersonMotor>();motor.jumpHeight=1.05f;motor.gravity=-22;EditorUtility.SetDirty(motor);AssetDatabase.SaveAssets();EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());EditorSceneManager.SaveOpenScenes();File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision10/native-motion-"+(RenderBackend.HDRP?"PC":"Web")+".txt",notes);
 }

}
