#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicReviewAuditV15:MonoBehaviour
 {
  public string film="C01";public bool fresh=true;public float captureInterval=3;
  [Serializable]class Frame{public float time;public string[] clips;public string shot;}
  [Serializable]class Report{public string id,status,maxHandGapProp;public int frames,pathFailures,contactFrames;public float seconds,maxHandGap,maxHandGapAt;public string[] errors;public Frame[] captures;}
  readonly List<string> errors=new List<string>();
  void Log(string message,string trace,LogType type){if(type==LogType.Exception||type==LogType.Error)errors.Add(message);}
  IEnumerator Start()
  {
   var c=FindFirstObjectByType<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);
   c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);
   if(fresh)c.BeginCampaign(true);else c.cinematicDirector.Play(film);
   if(film!="C01"&&c.cinematicDirector.CurrentId!=film){c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.cinematicDirector.Play(film);}
   while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING")yield return null;
   if(!c.cinematicDirector.IsPlaying||c.GetComponent<CinematicStage>().Production==null){Debug.LogError("Cinematic review could not start "+film);Destroy(this);yield break;}
   c.SetPause(false);Application.logMessageReceived+=Log;int first=Time.frameCount;float began=Time.realtimeSinceStartup,next=0;var captures=new List<Frame>();string folder="E:/UNGA-BUNGA-45001/Revision15/Review/"+film;Directory.CreateDirectory(folder);var rt=new RenderTexture(960,540,24);rt.Create();int index=0;
   while(c.cinematicDirector.IsPlaying)
   {
    if(c.State.cinematicTimeV15>=next)
    {
     next=c.State.cinematicTimeV15+captureInterval;var production=c.GetComponent<CinematicStage>().Production;var source=CinematicCatalogueV15.Find(production.FilmId);captures.Add(new Frame{time=c.State.cinematicTimeV15,clips=production.CurrentClips.Select(p=>p.Key+"="+p.Value).ToArray(),shot=source.shots.LastOrDefault(s=>s.start<=c.State.cinematicTimeV15)?.label});
     var camera=c.cinematicDirector.cinematicCamera;RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var active=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(rt.width,rt.height,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,rt.width,rt.height),0,0);tex.Apply();File.WriteAllBytes(folder+"/"+(index++).ToString("D4")+".png",tex.EncodeToPNG());Destroy(tex);RenderTexture.active=active;
    }
    yield return null;
   }
   var final=c.GetComponent<CinematicStage>().Production;Application.logMessageReceived-=Log;var report=new Report{id=film,frames=Time.frameCount-first,seconds=Time.realtimeSinceStartup-began,pathFailures=final.PathFailures,contactFrames=final.ContactFrames,maxHandGap=final.MaxHandGap,maxHandGapAt=final.MaxHandGapAt,maxHandGapProp=final.MaxHandGapProp,errors=errors.ToArray(),captures=captures.ToArray(),status=errors.Count==0&&final.PathFailures==0&&final.MaxHandGap<.15f?"passed":"failed"};File.WriteAllText(folder+"/validation.json",JsonUtility.ToJson(report,true));rt.Release();Destroy(rt);Destroy(this);
  }
  void OnDestroy()=>Application.logMessageReceived-=Log;
 }
}
#endif
