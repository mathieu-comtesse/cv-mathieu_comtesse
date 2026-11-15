#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicResumeAuditV16:MonoBehaviour
 {
  public string film="C01";public float checkpoint=9;
  [Serializable]class Report{public string status,savePath;public int savedActors;public float savedTime,resumedTime,maxPositionGap,maxPropGap;public int savedProps;public bool advanced,restored,receiptsStable;}
  IEnumerator Start()
  {
   var c=FindFirstObjectByType<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.BeginCampaign(true);if(film!="C01"){c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);if(!c.State.completedActions.Contains("WORK_M_V_ABRI"))c.State.completedActions.Add("WORK_M_V_ABRI");c.cinematicDirector.Play(film);}
   yield return new WaitUntil(()=>c.cinematicDirector.IsPlaying&&c.State.cinematicTimeV15>checkpoint);c.SetPause(true);yield return null;c.Save();
   float at=c.State.cinematicTimeV15;var positions=c.State.cinematicActorsV15.ToDictionary(a=>a.id,a=>a.position);var propPositions=c.State.cinematicPropsV16.ToDictionary(p=>p.id,p=>p.position);string rewards=string.Join("|",c.State.rewardReceipts);bool resumeBefore=c.resumeOnStart;var d=c.cinematicDirector;d.enabled=false;yield return null;d.enabled=true;c.resumeOnStart=true;c.BeginCampaign(false);
   float deadline=Time.realtimeSinceStartup+50;while(d.IsPlaying&&d.SequenceState!="PAUSED"&&Time.realtimeSinceStartup<deadline)yield return null;
   float gap=0;foreach(var actor in positions)gap=Mathf.Max(gap,Vector3.Distance(c.bindings.Find(actor.Key).position,actor.Value));float resumed=c.State.cinematicTimeV15;var production=c.GetComponent<CinematicStage>().Production;var propMap=(System.Collections.IDictionary)typeof(CinematicProductionV15).GetField("props",System.Reflection.BindingFlags.NonPublic|System.Reflection.BindingFlags.Instance).GetValue(production);float propGap=0;foreach(System.Collections.DictionaryEntry pair in propMap){var root=(Transform)pair.Value.GetType().GetField("root").GetValue(pair.Value);if(propPositions.TryGetValue((string)pair.Key,out var position))propGap=Mathf.Max(propGap,Vector3.Distance(root.position,position));}
   c.SetPause(false);float end=Time.realtimeSinceStartup+4;while(d.IsPlaying&&c.State.cinematicTimeV15<at+1&&Time.realtimeSinceStartup<end)yield return null;bool advances=c.State.cinematicTimeV15>=at+.9f;d.Skip();yield return new WaitUntil(()=>!d.IsPlaying);
   bool restored=c.bindings.gameplayCamera.enabled&&!d.cinematicCamera.enabled&&FindObjectsByType<CinematicActorV15>(FindObjectsSortMode.None).All(a=>!a.Owned)&&Mathf.Abs(Time.timeScale-1)<.01f;bool stable=rewards==string.Join("|",c.State.rewardReceipts);
   var result=new Report{savedProps=propPositions.Count,maxPropGap=propGap,savedActors=positions.Count,savedTime=at,resumedTime=resumed,maxPositionGap=gap,advanced=advances,restored=restored,receiptsStable=stable,savePath=c.CurrentSavePath,status=positions.Count>0&&Mathf.Abs(at-resumed)<.08f&&gap<.05f&&propGap<.08f&&advances&&restored&&stable?"passed":"failed"};File.WriteAllText("E:/UNGA-BUNGA-45001/Revision16/"+(film=="C01"?"resume-validation.json":"resume-c08-validation.json"),JsonUtility.ToJson(result,true));c.resumeOnStart=resumeBefore;Destroy(this);
  }
 }
}
#endif
