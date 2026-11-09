#if UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicContactSnapshotV16:MonoBehaviour
 {
  public bool disableFootIK,disableHandIK;
  public float at=33.5f;public string label="cover-contact";
  [Serializable]class Actor{public string id;public Vector3 root,leftShoulder,leftHand,leftGoal,rightShoulder,rightHand,rightGoal;public float leftReach,rightReach,leftLength,rightLength;}
  [Serializable]class Report{public float at;public Actor[] actors;}
  IEnumerator Start()
  {
   var c=GetComponent<CampaignRuntime>();c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);c.BeginCampaign(true);c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);if(!c.State.completedActions.Contains("WORK_M_V_ABRI"))c.State.completedActions.Add("WORK_M_V_ABRI");c.cinematicDirector.Play("F15_C08");while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING")yield return null;c.SetPause(true);yield return null;
   foreach(var owner in FindObjectsByType<CinematicActorV15>(FindObjectsSortMode.None)){owner.FootContacts=!disableFootIK;owner.HandContacts=!disableHandIK;}var camera=c.cinematicDirector.cinematicCamera;c.GetComponent<CinematicStage>().Production.Evaluate(at,camera);yield return null;yield return null;string folder="E:/UNGA-BUNGA-45001/Revision16/Snapshots/";Directory.CreateDirectory(folder);var rt=RenderTexture.GetTemporary(1280,720,24);RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var previous=RenderTexture.active;RenderTexture.active=rt;var texture=new Texture2D(1280,720,TextureFormat.RGB24,false);texture.ReadPixels(new Rect(0,0,1280,720),0,0);texture.Apply();File.WriteAllBytes(folder+label+".png",texture.EncodeToPNG());RenderTexture.active=previous;RenderTexture.ReleaseTemporary(rt);Destroy(texture);
   var list=new List<Actor>();foreach(string id in new[]{"tarek","uma","georges"}){var animator=c.bindings.AnimatorFor(id);var owner=animator.GetComponent<CinematicActorV15>();Transform Goal(string side)=>(Transform)typeof(CinematicActorV15).GetField(side,System.Reflection.BindingFlags.NonPublic|System.Reflection.BindingFlags.Instance).GetValue(owner);var l=Goal("left");var r=Goal("right");Vector3 Bone(HumanBodyBones bone)=>animator.GetBoneTransform(bone).position;var ls=Bone(HumanBodyBones.LeftUpperArm);var le=Bone(HumanBodyBones.LeftLowerArm);var lh=Bone(HumanBodyBones.LeftHand);var rs=Bone(HumanBodyBones.RightUpperArm);var re=Bone(HumanBodyBones.RightLowerArm);var rh=Bone(HumanBodyBones.RightHand);list.Add(new Actor{id=id,root=c.bindings.Find(id).position,leftShoulder=ls,leftHand=lh,leftGoal=l!=null?l.position:lh,rightShoulder=rs,rightHand=rh,rightGoal=r!=null?r.position:rh,leftReach=l!=null?Vector3.Distance(ls,l.position):0,rightReach=r!=null?Vector3.Distance(rs,r.position):0,leftLength=Vector3.Distance(ls,le)+Vector3.Distance(le,lh),rightLength=Vector3.Distance(rs,re)+Vector3.Distance(re,rh)});}
   File.WriteAllText(folder+label+".json",JsonUtility.ToJson(new Report{at=at,actors=list.ToArray()},true));var physical=new CinematicFrameAuditV16(c);physical.Tick(at);physical.Save(folder+label+"-physical.json");c.SetPause(false);c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);Destroy(this);
  }
 }
}
#endif
