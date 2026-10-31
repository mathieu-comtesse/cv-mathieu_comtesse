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
 // Accelerated integration checks. These timings are deliberately not performance measurements.
 public sealed class CinematicMatrixAuditV15:MonoBehaviour
 {
  [Serializable]class Take{public string id,status,handProp;public int frames,paths,contacts;public float handGap,handGapAt;public bool restored,rewardsStable,paused;public string[] errors;}
  [Serializable]class Report{public string status,scope="Accelerated editor integration; not hardware performance or artistic acceptance";public Take[] takes;}
  readonly List<string> errors=new List<string>();readonly List<Take> takes=new List<Take>();float previousScale;
  void Log(string text,string trace,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(text);}
  public string only="";
  IEnumerator Start()
  {
   const string folder="E:/UNGA-BUNGA-45001/Revision15/Matrix";Directory.CreateDirectory(folder);previousScale=Time.timeScale;
   var c=FindFirstObjectByType<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);Application.logMessageReceived+=Log;
   var seeds=c.bindings.characters.ToDictionary(a=>a.id,a=>c.bindings.Find(a.id).position);var rotations=c.bindings.characters.ToDictionary(a=>a.id,a=>c.bindings.Find(a.id).rotation);
   var controllers=c.bindings.characters.ToDictionary(a=>a.id,a=>a.animator.runtimeAnimatorController);
   var films=CinematicCatalogueV15.Library.films.Where(f=>!f.id.StartsWith("F15_DEATH_")&&!f.id.StartsWith("F15_DUEL_")&&(only==""||only.Split(',').Contains(f.id))).ToArray();
   foreach(var film in films)
   {
    foreach(var a in c.bindings.characters){var root=c.bindings.Find(a.id);var cc=root.GetComponent<CharacterController>();bool enabled=cc!=null&&cc.enabled;if(cc!=null)cc.enabled=false;root.SetPositionAndRotation(seeds[a.id],rotations[a.id]);if(cc!=null)cc.enabled=enabled;}
    string rewardBefore=string.Join("|",c.State.rewardReceipts)+string.Join("|",c.State.completedActions);errors.Clear();Time.timeScale=4;
    c.cinematicDirector.Play(film.id);float deadline=Time.realtimeSinceStartup+70;while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING"&&Time.realtimeSinceStartup<deadline)yield return null;
    var stage=c.GetComponent<CinematicStage>();if(!c.cinematicDirector.IsPlaying||stage.Production==null){takes.Add(new Take{id=film.id,status="failed",errors=new[]{"Film did not begin"}});Write(folder);continue;}
    int frame=Time.frameCount;bool pauseChecked=false,paused=false,captured=false;
    while(c.cinematicDirector.IsPlaying&&Time.realtimeSinceStartup<deadline)
    {
     float at=c.State.cinematicTimeV15;
     if(!pauseChecked&&at>Mathf.Min(2,film.duration*.2f))
     {
      pauseChecked=true;c.SetPause(true);yield return null;float frozen=c.State.cinematicTimeV15;var pos=c.bindings.player.position;yield return new WaitForSecondsRealtime(.12f);paused=Mathf.Abs(c.State.cinematicTimeV15-frozen)<.001f&&Vector3.Distance(pos,c.bindings.player.position)<.001f;c.SetPause(false);
     }
     if(!captured&&at>film.duration*.55f){captured=true;Capture(c.cinematicDirector.cinematicCamera,folder+"/"+film.id+".png");}
     yield return null;
    }
    if(c.cinematicDirector.IsPlaying){errors.Add("Film exceeded deadline");c.cinematicDirector.Skip();yield return null;}
    var p=stage.Production;bool restored=!c.cinematicDirector.IsPlaying&&!c.cinematicDirector.cinematicCamera.enabled&&c.bindings.gameplayCamera.enabled&&c.bindings.characters.All(a=>a.animator.runtimeAnimatorController==controllers[a.id]&&!(a.animator.GetComponent<CinematicActorV15>()?.Owned??false));
    bool rewards=rewardBefore==string.Join("|",c.State.rewardReceipts)+string.Join("|",c.State.completedActions);
    takes.Add(new Take{id=film.id,frames=Time.frameCount-frame,paths=p.PathFailures,contacts=p.ContactFrames,handGap=p.MaxHandGap,handGapAt=p.MaxHandGapAt,handProp=p.MaxHandGapProp,restored=restored,rewardsStable=rewards,paused=paused,errors=errors.ToArray(),status=errors.Count==0&&p.PathFailures==0&&p.MaxHandGap<.15f&&restored&&rewards&&paused?"passed":"failed"});Write(folder);yield return null;
   }
   // Skip during a paused movie must release input, graphs, cameras, and the simulation clock.
   Time.timeScale=1;c.cinematicDirector.Play("F15_C03");yield return new WaitUntil(()=>c.cinematicDirector.SequenceState!="LOADING");c.SetPause(true);yield return null;c.cinematicDirector.Skip();float limit=Time.realtimeSinceStartup+3;while(c.cinematicDirector.IsPlaying&&Time.realtimeSinceStartup<limit)yield return null;c.SetPause(false);
   takes.Add(new Take{id="skip-while-paused",status=!c.cinematicDirector.IsPlaying&&Time.timeScale==1&&c.bindings.gameplayCamera.enabled?"passed":"failed"});Write(folder);Application.logMessageReceived-=Log;Time.timeScale=previousScale;Destroy(this);
  }
  void Write(string folder)=>File.WriteAllText(folder+"/validation.json",JsonUtility.ToJson(new Report{status=takes.All(t=>t.status=="passed")?"passed":"failed",takes=takes.ToArray()},true));
  static void Capture(Camera camera,string path){var rt=RenderTexture.GetTemporary(640,360,24);RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(640,360,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,640,360),0,0);tex.Apply();File.WriteAllBytes(path,tex.EncodeToPNG());Destroy(tex);RenderTexture.active=old;RenderTexture.ReleaseTemporary(rt);}
  void OnDestroy(){Application.logMessageReceived-=Log;Time.timeScale=previousScale;}
 }
}
#endif
