#if UNITY_EDITOR
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicFrameProbeV15:MonoBehaviour
 {
  public string film="F15_C08";public float at=18;
  IEnumerator Start()
  {
   var c=FindFirstObjectByType<CampaignRuntime>();c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);if(film=="F15_C08"&&!c.State.completedActions.Contains("WORK_M_V_ABRI"))c.State.completedActions.Add("WORK_M_V_ABRI");c.cinematicDirector.Play(film);
   while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING")yield return null;if(!c.cinematicDirector.IsPlaying)yield break;
   c.SetPause(true);yield return null;var p=c.GetComponent<CinematicStage>().Production;var camera=c.cinematicDirector.cinematicCamera;c.State.cinematicTimeV15=at;p.Evaluate(at,camera);yield return null;
   var flags=BindingFlags.Instance|BindingFlags.NonPublic;var props=(IDictionary)p.GetType().GetField("props",flags).GetValue(p);var item=props["shared-beam"];var target=(Transform)item.GetType().GetField("root").GetValue(item);var ray=new Ray(camera.transform.position,(target.position-camera.transform.position).normalized);var foliage=(HashSet<Renderer>)p.GetType().GetField("foliage",flags).GetValue(p);
   string output="camera="+camera.transform.position+" target="+target.position+" viewport="+camera.WorldToViewportPoint(target.position)+" foliage="+foliage.Count;
   foreach(var r in FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.name.Contains("palm")&&Vector3.Distance(r.transform.position,target.position)<8)){bool hit=r.bounds.IntersectRay(ray,out float distance);output+="\n"+r.name+" tracked="+foliage.Contains(r)+" enabled="+r.enabled+" forcedOff="+r.forceRenderingOff+" hit="+hit+" at="+distance;}
   foreach(var id in new[]{"tarek","uma","dylan"}){var a=c.bindings.AnimatorFor(id);var shoulders=Vector3.Cross(a.GetBoneTransform(HumanBodyBones.RightUpperArm).position-a.GetBoneTransform(HumanBodyBones.LeftUpperArm).position,Vector3.up).normalized;var hips=Vector3.Cross(a.GetBoneTransform(HumanBodyBones.RightUpperLeg).position-a.GetBoneTransform(HumanBodyBones.LeftUpperLeg).position,Vector3.up).normalized;var foot=a.GetBoneTransform(HumanBodyBones.LeftFoot).position;var toes=(a.GetBoneTransform(HumanBodyBones.LeftToes).position-foot).normalized;output+="\n"+id+" headHeight="+(a.GetBoneTransform(HumanBodyBones.Head).position.y-c.bindings.Find(id).position.y)+" controllerNull="+(a.runtimeAnimatorController==null)+" clip="+a.GetComponent<CinematicActorV15>().ClipId+" gap="+a.GetComponent<CinematicActorV15>().ContactGap+" torsoHipDot="+Vector3.Dot(shoulders,hips)+" toeTorsoDot="+Vector3.Dot(toes,shoulders)+" soleGap="+(foot.y-a.leftFeetBottomHeight-VillageLife.Ground(foot));}
   const string folder="E:/UNGA-BUNGA-45001/Revision15";File.WriteAllText(folder+"/C08-frame-probe.txt",output);var rt=RenderTexture.GetTemporary(960,540,24);RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(960,540,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,960,540),0,0);tex.Apply();File.WriteAllBytes(folder+"/C08-frame-probe.png",tex.EncodeToPNG());Destroy(tex);RenderTexture.active=old;RenderTexture.ReleaseTemporary(rt);Destroy(this);
  }
 }
}
#endif
