#if UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicReviewBatchV15:MonoBehaviour
 {
  public string steps="movement,matrix,resume,c01,c08,gameplay";
  const string Root="E:/UNGA-BUNGA-45001/Revision15/";
  [Serializable]class Progress{public string state,step,detail;}
  [Serializable]class Status{public string status;public bool complete;}
  void Note(string state,string step,string detail="")=>File.WriteAllText(Root+"batch-progress.json",JsonUtility.ToJson(new Progress{state=state,step=step,detail=detail},true));
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");var c=FindFirstObjectByType<CampaignRuntime>();c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);Time.timeScale=1;
   foreach(string step in steps.Split(','))
   {
    Note("running",step);MonoBehaviour worker;string receipt;bool movie=false;DateTime began=DateTime.UtcNow;
    switch(step)
    {
     case "movement":worker=c.gameObject.AddComponent<MovementValidationV15>();receipt="RegressionMovement/movement-validation.json";break;
     case "matrix":worker=c.gameObject.AddComponent<CinematicMatrixAuditV15>();receipt="Matrix/validation.json";break;
     case "resume":worker=c.gameObject.AddComponent<CinematicResumeAuditV15>();receipt="resume-validation.json";break;
     case "river":var river=c.gameObject.AddComponent<AccidentValidationV15>();river.only="river";worker=river;receipt="Accidents/validation.json";break;
     case "c01":case "c08":var capture=c.gameObject.AddComponent<CinematicMovieCaptureV15>();capture.film=step=="c01"?"C01":"F15_C08";worker=capture;receipt="last-movie.json";movie=true;break;
     case "gameplay":worker=c.gameObject.AddComponent<GameplayMovieCaptureV15>();receipt="last-movie.json";movie=true;break;
     default:Note("failed",step,"Unknown review step");yield break;
    }
    float deadline=Time.realtimeSinceStartup+(step=="matrix"?900:180);string path=Root+receipt;
    while(Time.realtimeSinceStartup<deadline)
    {
     bool written=File.Exists(path)&&File.GetLastWriteTimeUtc(path)>=began;
     bool done=step=="matrix"||movie?worker==null:written;
     if(done&&written)break;yield return null;
    }
    if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<began){Note("failed",step,"No completed receipt before deadline");yield break;}
    var status=JsonUtility.FromJson<Status>(File.ReadAllText(path));bool passed=movie?status.complete:status.status=="passed";
    if(worker!=null)Destroy(worker);if(!passed){Note("failed",step,path);yield break;}
    if(movie)File.Copy(path,Root+step+"-movie.json",true);Note("passed",step);yield return null;
   }
   Note("completed",steps);Destroy(this);
  }
 }
}
#endif
