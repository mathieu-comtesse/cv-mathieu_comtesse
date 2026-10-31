#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicMovieCaptureV15:MonoBehaviour
 {
  public string film="C01";public bool fresh=true;public int fps=24;
  [Serializable]class Receipt{public string id,folder;public int frames,audioSamples;public float seconds,audioPeak,renderedContactGap;public bool complete;}
  static string Stamp(float seconds)=>TimeSpan.FromSeconds(Mathf.Max(0,seconds)).ToString(@"hh\:mm\:ss\,fff");
  IEnumerator Start()
  {
   var c=FindFirstObjectByType<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);
   if(fresh)c.BeginCampaign(true);if(film!="C01"){c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);if(film=="F15_C08"&&!c.State.completedActions.Contains("WORK_M_V_ABRI"))c.State.completedActions.Add("WORK_M_V_ABRI");c.cinematicDirector.Play(film);}else if(!fresh)c.cinematicDirector.Play(film);
   while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING")yield return null;if(!c.cinematicDirector.IsPlaying){Destroy(this);yield break;}
   string folder="E:/UNGA-BUNGA-45001/Revision15/MoviesRaw/"+film+"-"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");Directory.CreateDirectory(folder);var rt=new RenderTexture(960,540,24);rt.Create();var tex=new Texture2D(960,540,TextureFormat.RGB24,false);var camera=c.cinematicDirector.cinematicCamera;var tap=camera.gameObject.AddComponent<CinematicAudioTapV15>();tap.recording=true;
   float began=Time.realtimeSinceStartup,next=0,subtitleStart=0,renderGap=0;int count=0,subtitleIndex=1;string subtitle=c.Subtitle;var srt=new StringBuilder();var performers=FindObjectsByType<CinematicActorV15>(FindObjectsSortMode.None);
   void SaveSubtitle(float until){if(!string.IsNullOrWhiteSpace(subtitle))srt.Append(subtitleIndex++).Append('\n').Append(Stamp(subtitleStart)).Append(" --> ").Append(Stamp(until)).Append('\n').Append(Regex.Replace(subtitle,"<[^>]+>","")).Append("\n\n");}
   while(c.cinematicDirector.IsPlaying)
   {
    float elapsed=Time.realtimeSinceStartup-began;if(c.Subtitle!=subtitle){SaveSubtitle(elapsed);subtitle=c.Subtitle;subtitleStart=elapsed;}
    if(elapsed>=next)
    {
     next+=(float)1/fps;RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});foreach(var performer in performers)renderGap=Mathf.Max(renderGap,performer.ContactGap);var previous=RenderTexture.active;RenderTexture.active=rt;tex.ReadPixels(new Rect(0,0,rt.width,rt.height),0,0);tex.Apply();RenderTexture.active=previous;File.WriteAllBytes(folder+"/"+(count++).ToString("D5")+".jpg",tex.EncodeToJPG(82));
    }
    yield return null;
   }
   float seconds=Time.realtimeSinceStartup-began;SaveSubtitle(seconds);File.WriteAllText(folder+"/subtitles.srt",srt.ToString(),new UTF8Encoding(false));tap.recording=false;tap.Save(folder+"/audio.wav");var receipt=new Receipt{id=film,folder=folder,frames=count,seconds=seconds,audioSamples=tap.Samples,audioPeak=tap.Peak,renderedContactGap=renderGap,complete=count>seconds*fps*.9f};File.WriteAllText(folder+"/capture.json",JsonUtility.ToJson(receipt,true));File.WriteAllText("E:/UNGA-BUNGA-45001/Revision15/last-movie.json",JsonUtility.ToJson(receipt,true));Destroy(tap);rt.Release();Destroy(rt);Destroy(tex);Destroy(this);
  }
 }
 public sealed class CinematicAudioTapV15:MonoBehaviour
 {
  public volatile bool recording;readonly List<float> samples=new List<float>();readonly object gate=new object();int channels=2;public int Samples=>samples.Count;public float Peak{get;private set;}
  void OnAudioFilterRead(float[] data,int count){if(!recording)return;lock(gate){channels=count;samples.AddRange(data);}}
  public void Save(string path)
  {
   recording=false;lock(gate){if(samples.Count==0)return;using(var writer=new BinaryWriter(File.Create(path))){int size=samples.Count*2,rate=AudioSettings.outputSampleRate;writer.Write(Encoding.ASCII.GetBytes("RIFF"));writer.Write(36+size);writer.Write(Encoding.ASCII.GetBytes("WAVEfmt "));writer.Write(16);writer.Write((short)1);writer.Write((short)channels);writer.Write(rate);writer.Write(rate*channels*2);writer.Write((short)(channels*2));writer.Write((short)16);writer.Write(Encoding.ASCII.GetBytes("data"));writer.Write(size);foreach(float value in samples){Peak=Mathf.Max(Peak,Mathf.Abs(value));writer.Write((short)(Mathf.Clamp(value,-1,1)*32767));}}}
  }
 }
}
#endif
