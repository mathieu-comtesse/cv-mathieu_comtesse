#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicPoseSnapshotV15:MonoBehaviour
 {
  public string film="C01",label="C01-foot-corrected";public float at=24;
  [Serializable]class Pose{public string id;public float torsoHipDot,leftToeForward,rightToeForward,leftToeTilt,rightToeTilt,leftSoleGap,rightSoleGap;}
  [Serializable]class Report{public string film;public float at;public Pose[] poses;}
  IEnumerator Start()
  {
   var c=FindFirstObjectByType<CampaignRuntime>();c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);c.BeginCampaign(true);if(film!="C01"){c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.cinematicDirector.Play(film);}while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING")yield return null;
   c.SetPause(true);yield return null;var camera=c.cinematicDirector.cinematicCamera;c.GetComponent<CinematicStage>().Production.Evaluate(at,camera);yield return null;const string folder="E:/UNGA-BUNGA-45001/Revision15/Review/";
   var rt=RenderTexture.GetTemporary(1280,720,24);RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(1280,720,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,1280,720),0,0);tex.Apply();File.WriteAllBytes(folder+label+".png",tex.EncodeToPNG());Destroy(tex);RenderTexture.active=old;RenderTexture.ReleaseTemporary(rt);
   var poses=new List<Pose>();foreach(string id in new[]{"aurelien","dylan","tarek","uma"}){var a=c.bindings.AnimatorFor(id);var root=c.bindings.Find(id);var shoulders=Vector3.Cross(a.GetBoneTransform(HumanBodyBones.RightUpperArm).position-a.GetBoneTransform(HumanBodyBones.LeftUpperArm).position,Vector3.up).normalized;var hips=Vector3.Cross(a.GetBoneTransform(HumanBodyBones.RightUpperLeg).position-a.GetBoneTransform(HumanBodyBones.LeftUpperLeg).position,Vector3.up).normalized;var left=a.GetBoneTransform(HumanBodyBones.LeftFoot).position;var right=a.GetBoneTransform(HumanBodyBones.RightFoot).position;var lt=(a.GetBoneTransform(HumanBodyBones.LeftToes).position-left).normalized;var rto=(a.GetBoneTransform(HumanBodyBones.RightToes).position-right).normalized;poses.Add(new Pose{id=id,torsoHipDot=Vector3.Dot(shoulders,hips),leftToeForward=Vector3.Dot(Vector3.ProjectOnPlane(lt,Vector3.up).normalized,root.forward),rightToeForward=Vector3.Dot(Vector3.ProjectOnPlane(rto,Vector3.up).normalized,root.forward),leftToeTilt=lt.y,rightToeTilt=rto.y,leftSoleGap=left.y-a.leftFeetBottomHeight-VillageLife.Ground(left),rightSoleGap=right.y-a.rightFeetBottomHeight-VillageLife.Ground(right)});}
   File.WriteAllText(folder+label+".json",JsonUtility.ToJson(new Report{film=film,at=at,poses=poses.ToArray()},true));Destroy(this);
  }
 }
}
#endif
