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
 public sealed class CinematicValidationV18:MonoBehaviour
 {
  [Serializable]class Check{public string name,detail;public bool passed;}
  [Serializable]class Report{public string status,scope="Local Unity runtime integration checks; accelerated where stated. Not a first-time human campaign, mobile hardware or Ryzen 610M certification.";public Check[] checks;public string[] errors;}
  readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();bool finished;const string Out="E:/UNGA-BUNGA-45001/Revision18/Checks/";
  void Log(string s,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(s);}
  void CheckThat(string name,bool ok,string detail=""){checks.Add(new Check{name=name,passed=ok,detail=detail});Write();}
  void Write(){Directory.CreateDirectory(Out);File.WriteAllText(Out+"validation.json",JsonUtility.ToJson(new Report{status=checks.Any(x=>!x.passed)||errors.Count>0?"failed":finished?"passed":"running",checks=checks.ToArray(),errors=errors.ToArray()},true));}
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save flag required.");Application.logMessageReceived+=Log;Application.runInBackground=true;
   var c=GetComponent<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;
   c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.State.pendingCinematicsV15.Clear();c.SetPause(false);yield return new WaitForSeconds(2);
   var activities=c.GetComponent<CampaignActivitiesV17>();var v=c.GetComponent<VillageUpgradeV18>();
   CheckThat("isolated save",c.CurrentSavePath.StartsWith(TribalInterfaceAudit.IsolatedSaveRoot),c.CurrentSavePath);
   CheckThat("24 activities / 87 cards",c.ActivitiesV17.activities.Length==24&&c.ActivitiesV17.activities.Sum(a=>a.cards.Length)==87);
   CheckThat("native actor identities preserved",c.bindings.characters.Length==20&&c.Data.characters.Count(x=>x.name=="Ouways")==1);
   CheckThat("one main quest available",c.Data.quests.Count(q=>q.required&&c.QuestState(q.id).status!=QuestStatus.LOCKED)==1,c.MainQuestFrontier()?.id);
   CheckThat("future activity rejected",!activities.Begin("V17_DIFFERENCES"));
   yield return new WaitForSeconds(.5f);CheckThat("original decorations batched",v.DecorationCount>=200&&v.DecorationDrawCalls<=10,$"{v.DecorationCount} objects, {v.DecorationDrawCalls} static material batches");
   CheckThat("all six physical installations placed",v.Instances.Count==6,v.Instances.Count.ToString());
   if(v.Instances.Count<6){Write();Destroy(this);yield break;}
   Snapshot(c,"village-initial");
   // Controlled fixture: close tutorial using the real action outcome, then exercise the new context.
   foreach(var id in c.Data.quests.First(q=>q.id=="M_I_TUTORIEL").actionIds){if(!c.State.completedActions.Contains(id))c.State.completedActions.Add(id);c.Apply(new EffectDefinition{kind="flag",target="done:"+id,value=1});}
   var intro=c.QuestState("M_I_TUTORIEL");intro.accepted=intro.validated=intro.claimed=true;c.RefreshQuests();
   Move(c,"aurelien");CheckThat("context can be accepted",c.AcceptQuest("V17_CONTEXT"));yield return null;
   CheckThat("SWOT starts near active chief",activities.Begin("V17_SWOT"));
   CheckThat("wrong card leaves progress open",!activities.Submit(3)&&activities.CurrentProgress.card==0);yield return new WaitForSeconds(.5f);
   while(activities.Active&&activities.CurrentProgress.card<4){int answer=activities.Current.cards[activities.CurrentProgress.card].correct;activities.Submit(answer);yield return new WaitForSeconds(.5f);}
   CheckThat("SWOT creates verified tangible evidence",c.State.completedActions.Contains("V17_SWOT")&&c.State.campaignV17.evidence.Any(e=>e.id=="Tablette du contexte"&&e.stage==EvidenceStageV17.Verified));
   c.GetComponent<QuestNavigationController>()?.ForceRefresh();yield return new WaitForSeconds(.4f);CheckThat("marker transfers to next actual person",c.GetComponent<MainQuestMarkerV18>().TargetId=="lorette",c.GetComponent<MainQuestMarkerV18>().TargetId);
   foreach(string id in new[]{"V17_PARTIES","V17_SCOPE","V17_SYSTEM"})
   {
    var a=c.ActivitiesV17.activities.First(x=>x.id==id);Move(c,a.site);if(!activities.Begin(id)){CheckThat("begin "+id,false);continue;}
    while(activities.Active){var p=activities.CurrentProgress;if(p.card>=activities.Current.cards.Length)break;activities.Submit(activities.Current.cards[p.card].correct);yield return new WaitForSeconds(.5f);}
   }
   Move(c,"aurelien");CheckThat("context validation",c.ValidateQuest("V17_CONTEXT"));c.CloseQuest();CheckThat("context reward transaction",c.ClaimQuest("V17_CONTEXT"));
   yield return new WaitForSeconds(.7f);CheckThat("chapter 4 adds distinct totem segment",c.State.villageV18.chapters.Contains(4)&&v.TotemSegments==1);v.SkipPresentation();
   int receipts=c.State.rewardReceipts.Count;CheckThat("duplicate reward refused",!c.ClaimQuest("V17_CONTEXT")&&receipts==c.State.rewardReceipts.Count);CheckThat("totem cannot advance from dialogue alone",!v.TryCompleteChapter(8));
   // Upgrade fixture uses real eligibility, debit, staged work and three distinct controls.
   Move(c,"v18:hut_mathilde");int before=(int)c.Value("resource","wood");CheckThat("individual upgrade starts",v.BeginUpgrade("hut_mathilde"));CheckThat("resources charged once",(int)c.Value("resource","wood")==before-4&&!v.BeginUpgrade("hut_mathilde"));CheckThat("building not usable during work",!v.StateFor("hut_mathilde").usable);
   float deadline=Time.realtimeSinceStartup+90;bool workCaptured=false;
   while(v.StateFor("hut_mathilde").phase==InstallationPhaseV18.Building&&Time.realtimeSinceStartup<deadline)
   {
    if(!workCaptured&&v.StateFor("hut_mathilde").workSeconds>5)
    {
     workCaptured=true;Snapshot(c,"hut-work-in-progress");var state=v.StateFor("hut_mathilde");var worker=c.bindings.Find(state.builder);var position=worker.position;float work=state.workSeconds;
     // Explicit conversation-state fixture: observe real movement/work suspension, not a text-only assertion.
     var conversation=typeof(CampaignRuntime).GetProperty("ConversationActorId").GetSetMethod(true);var dialogue=typeof(CampaignRuntime).GetProperty("Dialogue").GetSetMethod(true);conversation.Invoke(c,new object[]{state.builder});dialogue.Invoke(c,new object[]{new DialogueDefinition{id="v18:conversation-check",speaker=c.CharacterName(state.builder),text="Contrôle de la pause du chantier",choices=Array.Empty<ChoiceDefinition>()}});
     yield return new WaitForSeconds(1);CheckThat("conversation suspends builder motion and work",Vector3.Distance(worker.position,position)<.05f&&Mathf.Abs(state.workSeconds-work)<.01f&&worker.GetComponent<VillagerBrain>().Behaviour==VillagerBehaviour.SOCIALIZE);
     dialogue.Invoke(c,new object[]{null});conversation.Invoke(c,new object[]{""});
    }
    yield return null;
   }
   yield return new WaitForSeconds(.6f);Snapshot(c,"hut-awaiting-controls");
   CheckThat("work leaves mandatory control",v.StateFor("hut_mathilde").phase==InstallationPhaseV18.AwaitingControl&&!v.StateFor("hut_mathilde").usable);
   CheckThat("three physical controls",v.Control("hut_mathilde","stability")&&v.Control("hut_mathilde","access")&&v.Control("hut_mathilde","use")&&v.StateFor("hut_mathilde").tier==1&&v.StateFor("hut_mathilde").usable);
   CheckThat("tier 2 gated by resources/competence chapter",!v.BeginUpgrade("hut_mathilde"));
   c.Save();var json=JsonUtility.ToJson(c.State);CheckThat("save roundtrip evidence and tier",JsonUtility.FromJson<CampaignSave>(json).villageV18.installations.Any(s=>s.id=="hut_mathilde"&&s.tier==1)&&JsonUtility.FromJson<CampaignSave>(json).campaignV17.evidence.Any(e=>e.id=="Tablette du contexte"));
   CheckThat("8 emergency means / 15 observations",c.ActivitiesV17.activities.First(a=>a.id=="V17_PREPARE_FIRE").cards.Length==8&&c.ActivitiesV17.activities.First(a=>a.id=="V17_DIFFERENCES").cards.Length==15);
   CheckThat("time measured including reading",c.State.campaignV17.wallSeconds>0&&c.State.campaignV17.timing.Sum(x=>x.seconds)>0,c.State.campaignV17.wallSeconds.ToString("0.00"));
   Snapshot(c,"context-and-totem");finished=true;Write();Application.logMessageReceived-=Log;Destroy(this);
  }
  static void Move(CampaignRuntime c,string id)
  {var root=c.bindings.player;var p=c.bindings.Find(id).position+Vector3.back*2.3f;p.y=VillageLife.Ground(p)+.05f;var body=root.GetComponent<CharacterController>();bool enabled=body.enabled;body.enabled=false;root.position=p;body.enabled=enabled;}
  static void Snapshot(CampaignRuntime c,string name)
  {
   var cam=c.bindings.gameplayCamera;var position=cam.transform.position;var rotation=cam.transform.rotation;var look=name.StartsWith("hut")?c.GetComponent<VillageUpgradeV18>().Instances["hut_mathilde"].transform.position+Vector3.up:c.bindings.Find("grand_menhir").position+Vector3.back*3;cam.transform.position=look+new Vector3(7,6,-9);cam.transform.LookAt(look);
   var rt=RenderTexture.GetTemporary(1280,720,24);var old=RenderTexture.active;RenderPipeline.SubmitRenderRequest(cam,new RenderPipeline.StandardRequest{destination=rt});RenderTexture.active=rt;var tex=new Texture2D(1280,720,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,1280,720),0,0);tex.Apply();Directory.CreateDirectory(Out);File.WriteAllBytes(Out+name+".png",tex.EncodeToPNG());Destroy(tex);RenderTexture.active=old;RenderTexture.ReleaseTemporary(rt);cam.transform.SetPositionAndRotation(position,rotation);
  }
  void OnDestroy(){Application.logMessageReceived-=Log;}
 }
}
#endif
