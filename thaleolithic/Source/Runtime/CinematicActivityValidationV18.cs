#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicActivityValidationV18:MonoBehaviour
 {
  [Serializable]class Check{public string name,detail;public bool passed;}
  [Serializable]class Report{public string status,scope="Activity integration using explicit quest unlock fixtures and real per-activity decisions, timers, physical risk controls and evacuation. Native tutorial, duel and hut quest prerequisites are fixtures, not end-to-end campaign validation.";public Check[] checks;public string[] errors;}
  readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();CampaignRuntime c;CampaignActivitiesV17 activity;const string Out="E:/UNGA-BUNGA-45001/Revision18/Checks/activities.json";
  void CheckThat(string name,bool passed,string detail=""){checks.Add(new Check{name=name,passed=passed,detail=detail});Write();}
  void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  void Write(){Directory.CreateDirectory(Path.GetDirectoryName(Out));File.WriteAllText(Out,JsonUtility.ToJson(new Report{status=checks.Any(x=>!x.passed)||errors.Count>0?"failed":checks.Count==24?"passed":"running",checks=checks.ToArray(),errors=errors.ToArray()},true));}
  void Move(string site)
  {var p=c.bindings.Find(site).position+Vector3.back*2;p.y=VillageLife.Ground(p)+.08f;var body=c.bindings.player.GetComponent<CharacterController>();body.enabled=false;c.bindings.player.position=p;body.enabled=true;}
  void Stage(ActivityDefinitionV17 a)
  {
   var q=c.Data.quests.First(x=>x.actionIds.Contains(a.id));
   foreach(var prior in c.Data.quests.TakeWhile(x=>x.id!=q.id).Where(x=>x.required))
   {var r=c.QuestState(prior.id);r.accepted=r.validated=r.claimed=true;foreach(var actionId in prior.actionIds){if(c.ActivitiesV17.activities.Any(x=>x.id==actionId))continue;if(!c.State.completedActions.Contains(actionId))c.State.completedActions.Add(actionId);c.Apply(new EffectDefinition{kind="flag",target="done:"+actionId,value=1});foreach(var e in c.FindAction(actionId)?.effects??Array.Empty<EffectDefinition>())if(e.kind=="evidence")c.Apply(e);}}
   if(q.id=="V17_OPERATIONS")c.Apply(new EffectDefinition{kind="flag",target="verified:M_V_ABRI",value=1});
   c.State.actIndex=Array.FindIndex(c.Data.acts,x=>x.id==q.actId);c.QuestState(q.id).accepted=true;c.CloseQuest();c.RefreshQuests();Move(a.site);
  }
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");Application.logMessageReceived+=Log;c=GetComponent<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.State.pendingCinematicsV15.Clear();c.SetPause(false);yield return new WaitForSeconds(3);activity=c.GetComponent<CampaignActivitiesV17>();
   foreach(var a in c.ActivitiesV17.activities)
   {
    Stage(a);yield return null;if(!activity.Begin(a.id)){CheckThat(a.id,false,"Begin refused: "+c.Message);continue;}
    if(a.mode=="allocation"){for(int i=0;i<3;i++)activity.Allocate(i,a.needs[i]);activity.ConfirmAllocation();}
    else
    {
     int guard=0;while(activity.Active&&activity.CurrentProgress.card<a.cards.Length&&guard++<a.cards.Length+3)
     {if(a.mode=="differences")activity.ObserveDifference(guard-1);var card=a.cards[activity.CurrentProgress.card];activity.Submit(card.correct);yield return new WaitForSeconds(.48f);}
     if(a.mode=="risk"&&activity.Active){activity.PerformWork();yield return new WaitForSeconds(3.1f);activity.VerifyWork();}
     if(a.mode=="differences"&&activity.Active)activity.ValidateDifferences();
     if(a.mode=="briefing"){float end=Time.realtimeSinceStartup+65;while(activity.Active&&Time.realtimeSinceStartup<end)yield return null;}
     if(a.mode=="runner"&&activity.Active)
     {
      var world=c.GetComponent<ActivityWorldV17>();world.PrepareEmergencyRoster();yield return new WaitUntil(()=>!world.PreparingAssembly);c.Apply(new EffectDefinition{kind="flag",target="v17:alarm",value=1});Move("rassemblement");float end=Time.realtimeSinceStartup+180;while(!world.AllAtAssembly(world.ExpectedResidentIds)&&Time.realtimeSinceStartup<end)yield return null;activity.ValidateAssembly();
     }
    }
    CheckThat(a.id,c.State.completedActions.Contains(a.id)&&activity.Progress(a.id).verified,activity.Feedback);if(activity.Active)activity.Suspend();yield return new WaitForSeconds(.6f);
   }
   Write();Application.logMessageReceived-=Log;Destroy(this);
  }
  void OnDestroy(){Application.logMessageReceived-=Log;}
 }
}
#endif
