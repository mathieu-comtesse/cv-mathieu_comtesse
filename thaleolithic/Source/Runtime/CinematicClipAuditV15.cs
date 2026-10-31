#if UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicClipAuditV15:MonoBehaviour
 {
  [Serializable]class Frame{public float time,handY,leftFootY,rightFootY,height;public Vector3 palm;}
  [Serializable]class Report{public string status;public float handTravel;public bool human,loop;public Frame[] frames;}
  IEnumerator Start()
  {
   const string folder="E:/UNGA-BUNGA-45001/Revision15/Prototype";Directory.CreateDirectory(folder);
   var c=FindFirstObjectByType<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);yield return null;
   var life=c.GetComponent<VillageLife>();bool oldLife=life.enabled;life.enabled=false;bool paused=c.UserPaused;c.SetPause(true);var animator=c.bindings.AnimatorFor("dylan");var cc=c.bindings.player.GetComponent<CharacterController>();bool oldCC=cc.enabled;cc.enabled=false;
   var root=c.bindings.player;var originalPosition=root.position;var clear=new Vector3(351.8f,0,279.6f);clear.y=HutCollapse.TerrainFloor(clear)+.04f;root.position=clear;
   var owned=animator.gameObject.GetComponent<CinematicActorV15>()??animator.gameObject.AddComponent<CinematicActorV15>();owned.Acquire(animator);var clip=CinematicCatalogueV15.Clip("C01_Dylan_StartledByCrack");
   var camera=c.bindings.gameplayCamera;var oldPosition=camera.transform.position;var oldRotation=camera.transform.rotation;float oldFov=camera.fieldOfView;camera.fieldOfView=40;
   var rt=new RenderTexture(960,720,24);rt.Create();var baked=new Mesh();var renderer=animator.GetComponentInChildren<SkinnedMeshRenderer>();var frames=new System.Collections.Generic.List<Frame>();
   foreach(float time in new[]{0f,.48f,.96f,1.63f,2.38f,3.39f})
   {
    owned.Sample(clip,time,1);yield return null;owned.Sample(clip,time,1);renderer.BakeMesh(baked,true);
    var palm=animator.GetBoneTransform(HumanBodyBones.RightHand).position;var left=animator.GetBoneTransform(HumanBodyBones.LeftFoot).position;var right=animator.GetBoneTransform(HumanBodyBones.RightFoot).position;
    frames.Add(new Frame{time=time,palm=palm,handY=palm.y-c.bindings.player.position.y,leftFootY=left.y-HutCollapse.TerrainFloor(left),rightFootY=right.y-HutCollapse.TerrainFloor(right),height=baked.bounds.size.y});
    var focus=c.bindings.player.position+Vector3.up;camera.transform.position=focus+animator.transform.forward*3.8f+animator.transform.right*1.5f+Vector3.up*.1f;camera.transform.LookAt(focus);
    RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var before=RenderTexture.active;RenderTexture.active=rt;var image=new Texture2D(rt.width,rt.height,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,rt.width,rt.height),0,0);image.Apply();File.WriteAllBytes(folder+"/Pose-"+frames.Count+".png",image.EncodeToPNG());Destroy(image);RenderTexture.active=before;
   }
   float distance=0;for(int i=1;i<frames.Count;i++)distance+=Vector3.Distance(frames[i-1].palm,frames[i].palm);
   bool feet=frames.TrueForAll(f=>Mathf.Abs(f.leftFootY)<.22f&&Mathf.Abs(f.rightFootY)<.22f);var report=new Report{human=clip.humanMotion,loop=clip.isLooping,handTravel=distance,frames=frames.ToArray(),status=distance>.15f&&clip.humanMotion&&!clip.isLooping&&feet?"passed":"failed"};
   File.WriteAllText(folder+"/clip-audit.json",JsonUtility.ToJson(report,true));owned.Release();root.position=originalPosition;cc.enabled=oldCC;life.enabled=oldLife;c.SetPause(paused);camera.transform.SetPositionAndRotation(oldPosition,oldRotation);camera.fieldOfView=oldFov;rt.Release();Destroy(rt);Destroy(baked);Destroy(this);
  }
 }
}
#endif
