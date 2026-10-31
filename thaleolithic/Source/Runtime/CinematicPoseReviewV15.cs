#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicPoseReviewV15:MonoBehaviour
 {
  [Serializable]class Pose{public string label;public Vector3 head,chest,leftHand,rightHand;}
  [Serializable]class Result{public Pose[] poses;}
  IEnumerator Start()
  {
   var c=FindFirstObjectByType<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);
   c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);
   c.SetPause(true);var root=c.bindings.player;var cc=root.GetComponent<CharacterController>();bool before=cc.enabled;cc.enabled=false;
   var animator=c.bindings.AnimatorFor("dylan");var owner=animator.GetComponent<CinematicActorV15>()??animator.gameObject.AddComponent<CinematicActorV15>();owner.Acquire(animator);
   var camera=c.bindings.gameplayCamera;var oldPos=camera.transform.position;var oldRot=camera.transform.rotation;float fov=camera.fieldOfView;camera.fieldOfView=40;
   var rt=new RenderTexture(960,720,24);rt.Create();var rows=new List<Pose>();const string folder="E:/UNGA-BUNGA-45001/Revision15/PoseReview";Directory.CreateDirectory(folder);
   foreach(var sample in new[]{("neutral","F15_C01_Dylan_OpenRiskNotebook",0f,false),("write","F15_C01_Dylan_OpenRiskNotebook",3f,false),("write-look","F15_C01_Dylan_OpenRiskNotebook",3f,true),("point","F15_C01_Mathieu_ObserveThenCallDylan",3f,false),("boast","F15_C01_Aurelien_BoastAboutBreakfast",3f,false)})
   {
    owner.Look(root.position+root.forward*.5f+Vector3.up, sample.Item4?.78f:0);var clip=CinematicCatalogueV15.Clip(sample.Item2);owner.Sample(clip,sample.Item3,1);yield return null;owner.Sample(clip,sample.Item3,1);
    Vector3 Relative(HumanBodyBones bone)=>root.InverseTransformPoint(animator.GetBoneTransform(bone).position);
    rows.Add(new Pose{label=sample.Item1,head=Relative(HumanBodyBones.Head),chest=Relative(HumanBodyBones.Chest),leftHand=Relative(HumanBodyBones.LeftHand),rightHand=Relative(HumanBodyBones.RightHand)});
    var focus=root.position+Vector3.up;camera.transform.position=focus+root.forward*3.8f+root.right*1.5f;camera.transform.LookAt(focus);
    RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var previous=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(960,720,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,960,720),0,0);tex.Apply();File.WriteAllBytes(folder+"/"+sample.Item1+".png",tex.EncodeToPNG());Destroy(tex);RenderTexture.active=previous;
   }
   File.WriteAllText(folder+"/poses.json",JsonUtility.ToJson(new Result{poses=rows.ToArray()},true));owner.Release();cc.enabled=before;c.SetPause(false);camera.transform.SetPositionAndRotation(oldPos,oldRot);camera.fieldOfView=fov;rt.Release();Destroy(rt);Destroy(this);
  }
 }
}
#endif
