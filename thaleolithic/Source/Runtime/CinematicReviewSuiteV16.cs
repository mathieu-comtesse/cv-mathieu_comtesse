#if UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicReviewSuiteV16:MonoBehaviour
 {
  [Serializable]class Status{public string status;}
  public bool recordOnly;
  const string Root="E:/UNGA-BUNGA-45001/Revision16/";
  IEnumerator Start()
  {
   var c=GetComponent<CampaignRuntime>();c.GetComponent<UISettingsController>().preferences.graphicsProfile=0;c.GetComponent<MobileQuality>().Apply();
   if(!recordOnly){File.WriteAllText(Root+"review-suite-state.json","{\"stage\":\"integration\"}");var matrix=gameObject.AddComponent<CinematicMatrixAuditV16>();while(matrix!=null)yield return null;
   if(JsonUtility.FromJson<Status>(File.ReadAllText(Root+"Matrix/validation.json")).status!="passed")throw new InvalidOperationException("Integration checks failed before recording");
   File.WriteAllText(Root+"review-suite-state.json","{\"stage\":\"resume\"}");foreach(string resumeFilm in new[]{"C01","F15_C08"}){var resume=gameObject.AddComponent<CinematicResumeAuditV16>();resume.film=resumeFilm;resume.checkpoint=resumeFilm=="C01"?9:30;while(resume!=null)yield return null;string report=resumeFilm=="C01"?"resume-validation.json":"resume-c08-validation.json";if(JsonUtility.FromJson<Status>(File.ReadAllText(Root+report)).status!="passed")throw new InvalidOperationException("Saved-film resume check failed before recording: "+resumeFilm);}
   }
   foreach(string film in new[]{"C01","F15_C08"}){File.WriteAllText(Root+"review-suite-state.json","{\"stage\":\""+film+"\"}");var capture=gameObject.AddComponent<CinematicMovieCaptureV16>();capture.film=film;while(capture!=null)yield return null;File.Copy(Root+"last-movie.json",Root+(film=="C01"?"c01":"c08")+"-movie.json",true);}
   File.WriteAllText(Root+"review-suite-state.json","{\"stage\":\"gameplay\"}");var gameplay=gameObject.AddComponent<GameplayMovieCaptureV16>();while(gameplay!=null)yield return null;File.Copy(Root+"last-movie.json",Root+"gameplay-movie.json",true);File.WriteAllText(Root+"review-suite-state.json","{\"stage\":\"recorded-for-review\"}");Destroy(this);
  }
 }
}
#endif
