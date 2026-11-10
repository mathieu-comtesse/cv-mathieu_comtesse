#if UNITY_EDITOR || !UNITY_WEBGL
using System;using System.Collections;using System.Collections.Generic;using System.IO;using System.Linq;using UnityEngine;
namespace UngaBunga45001{
public sealed class TemperateJourneyV19:MonoBehaviour{
 static readonly bool V241=Environment.GetCommandLineArgs().Contains("-thaleolithicJourneyV241");
 static readonly bool V243=Environment.GetCommandLineArgs().Contains("-thaleolithicJourneyV243");
 static readonly bool V244=Environment.GetCommandLineArgs().Contains("-thaleolithicJourneyV244");
 static readonly bool V24=V241||V243||V244||Environment.GetCommandLineArgs().Contains("-thaleolithicJourneyV24");
 static readonly bool Resume=Environment.GetCommandLineArgs().Contains("-thaleolithicJourneyResumeV19");
 static string Out=>V244?(Environment.GetEnvironmentVariable("THALEOLITHIC_JOURNEY_REPORT_DIR")??"E:/UNGA-BUNGA-45001/Revision24-4/Journey/"):V243?"E:/UNGA-BUNGA-45001/Revision24-3/Journey/":V241?"E:/UNGA-BUNGA-45001/Revision24-1/Journey/":V24?"E:/UNGA-BUNGA-45001/Revision24/Journey/":"E:/UNGA-BUNGA-45001/Revision19/Environment/"+(Resume?"JourneyResume/":Environment.GetCommandLineArgs().Contains("-thaleolithicJourneyFinalV19")?"JourneyFinal/":"Journey/");
 [Serializable]class Step{public string stage,detail,objective,target;public float seconds;public Vector3 position;}
 [Serializable]class Definition {public string id,quest,iso,giver,helper,binding,site,instruction,controls,success,rewards,next;public bool nativeBinding;}
 [Serializable]class Definitions {public Definition[] activities;public string[] mainQuests;}
 [Serializable]class Perf {public float second,frameMs;public long allocatedMiB,reservedMiB;public QuestNavigationController.GpsSample gps;}
 [Serializable]class Report{public Perf[] performance;public string runtime=Application.isEditor?"Unity Editor":"Windows player";public string endingId, receiver;public string version=Application.version;public bool resumed=Resume;public string status,scope="Automated campaign (see resumed field) using real quest/action/choice/minigame APIs and CharacterController routes. Known correct answers are selected automatically. The test driver injects no quest unlock/completion flags and does not teleport the player; native cinematics retain their authored staging. Not a first-time human reading-time study or hardware performance certification.",stage,failure;public float realSeconds,campaignSeconds,walkedMetres;public int claimed,activities,chapters;public Step[] steps;public string[] errors;}
 CampaignRuntime c;CampaignActivitiesV17 activity;ThirdPersonMotor motor;CharacterController body;float start,walked,nextReport;string stage="startup",failure="";bool completed,reached;readonly List<Step> steps=new List<Step>();readonly List<string> errors=new List<string>();readonly List<Perf> performance=new List<Perf>();
#if UNITY_EDITOR
 public static void RunV24Audit()
 {
  if(!V24)throw new InvalidOperationException("Le parcours V24 exige le dossier de sauvegarde isolé.");
  UnityEditor.SceneManagement.EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity");
  UnityEditor.EditorApplication.isPlaying=true;
 }
#endif
 [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Boot(){if(Application.isEditor?!V24:!Environment.GetCommandLineArgs().Contains("-thaleolithicJourneyV19"))return;Application.runInBackground=true;var go=new GameObject("TH19 real campaign journey");DontDestroyOnLoad(go);go.AddComponent<TemperateJourneyV19>();}
 void Log(string message,string trace,LogType t){if(t==LogType.Error||t==LogType.Exception)errors.Add(message);}
 void Write(){Directory.CreateDirectory(Out);File.WriteAllText(Out+"validation.json",JsonUtility.ToJson(new Report{performance=performance.ToArray(),receiver=c?.gameObject.name,endingId=c?.State?.endingId??"",status=failure!=""||errors.Count>0?"failed":completed?"passed":"running",stage=stage,failure=failure,realSeconds=Time.realtimeSinceStartup-start,campaignSeconds=c?.State?.elapsedSeconds??0,walkedMetres=walked,claimed=c?.Data?.quests.Count(q=>q.required&&c.QuestState(q.id).claimed)??0,activities=c?.State?.campaignV17?.activities.Count(a=>a.completed&&a.verified)??0,chapters=c?.State?.villageV18?.chapters.Count??0,steps=steps.ToArray(),errors=errors.ToArray()},true));}
 void Mark(string label,string detail="")
 {
  stage=label;
  var objective=V244?c.Objectives.Main:null;
  if(V244&&label=="new-campaign")AuditDefinitions();
  if(V244&&label.StartsWith("action:",StringComparison.Ordinal)&&label.Substring(7)!=objective?.Action?.id)
   failure="Étape résolue incohérente : "+label+" / "+objective?.Action?.id;
  if(V244&&label.StartsWith("claim:",StringComparison.Ordinal)&&(objective?.Phase!=ObjectivePhase.Claim||label.Substring(6)!=objective.QuestId))
   failure="Récompense guidée incohérente : "+label;
  steps.Add(new Step{stage=label,detail=detail,seconds=Time.realtimeSinceStartup-start,position=c.bindings.player.position,
   objective=objective?.Action?.id,target=objective?.TargetBindingId});
  Write();
  if(!(V241||V243||V244)||!(label.StartsWith("action:",StringComparison.Ordinal)||label=="claim:V17_IMPROVEMENT"))return;
  c.Save();
  string folder=Path.Combine(Out,"fixtures");
  Directory.CreateDirectory(folder);
  string id=label.Replace(':','-');
  File.Copy(c.CurrentSavePath,Path.Combine(folder,id+".json"),true);
 }
 void AuditDefinitions()
 {
  var main=c.Data.quests.Where(q=>q.required).ToArray();
  var rows=new List<Definition>();
  foreach(var a in c.ActivitiesV17.activities)
  {
   var parents=main.Where(q=>q.actionIds.Contains(a.id)).ToArray();
   var action=c.FindAction(a.id);
   if(parents.Length!=1||action==null||action.targetBindingId!=a.site||c.bindings.Find(a.site)==null||
      c.bindings.Find(a.actor)==null||c.bindings.Find(parents[0].giverId)==null)
   {
    failure="Binding, action ou quête parente incohérents : "+a.id;
    continue;
   }
   var q=parents[0];int i=Array.IndexOf(q.actionIds,a.id);
   rows.Add(new Definition{id=a.id,quest=q.id,iso=a.clause,giver=c.CharacterName(q.giverId),helper=c.CharacterName(a.actor),
    binding=a.site,site=QuestGuidanceV243.Site(c,a.site),instruction=ActivityGuideV244.Instruction(a),
    controls=ActivityGuideV244.Controls(a),success=ActivityGuideV244.Success(a),nativeBinding=true,
    rewards=string.Join(" · ",q.rewards.Select(r=>r.name+" × "+r.amount)),
    next=i+1<q.actionIds.Length?c.FindAction(q.actionIds[i+1])?.title:"Vérification auprès de "+c.CharacterName(q.giverId)});
  }
  if(main.Length!=10||rows.Count!=24)failure="Catalogue principal incomplet : "+main.Length+" quêtes, "+rows.Count+" activités. "+failure;
  Directory.CreateDirectory(Out);
  File.WriteAllText(Out+"audit-activites.json",JsonUtility.ToJson(new Definitions{mainQuests=main.Select(q=>q.id).ToArray(),activities=rows.ToArray()},true));
 }
 void Update(){if(c!=null&&Time.realtimeSinceStartup>nextReport){nextReport=Time.realtimeSinceStartup+5;
 if(V24)performance.Add(new Perf{second=Time.realtimeSinceStartup-start,frameMs=Time.smoothDeltaTime*1000,
  allocatedMiB=UnityEngine.Profiling.Profiler.GetTotalAllocatedMemoryLong()/1048576,
  reservedMiB=UnityEngine.Profiling.Profiler.GetTotalReservedMemoryLong()/1048576,
  gps=V243||V244?c.GetComponent<QuestNavigationController>().Diagnostic():default});
 Write();}}
 bool Terminal=>c!=null&&c.Ending!=null&&!c.cinematicDirector.IsPlaying;
 bool Expired=>Time.realtimeSinceStartup-start>2700;
 IEnumerator Idle(){float limit=Time.realtimeSinceStartup+150,stable=0;while(Time.realtimeSinceStartup<limit&&!Expired&&!Terminal){bool blocked=c.IsBusy||c.IsModal||c.GetComponent<VillageUpgradeV18>().PendingPresentation;if(!blocked){stable+=Time.unscaledDeltaTime;if(stable>=.2f)yield break;}else stable=0;if(c.Dialogue!=null){var choices=c.Dialogue.choices.Where(c.CanChoose).ToArray();var best=choices.FirstOrDefault(x=>x.id=="V5_INTRO_OBSERVER")??choices.FirstOrDefault(x=>x.id.EndsWith("_C",StringComparison.Ordinal))??choices.FirstOrDefault(x=>x.id!="interaction:cancel")??choices.FirstOrDefault();if(best==null){failure="No available dialogue choice: "+c.Dialogue.id;yield break;}yield return new WaitForSeconds(.8f);c.Choose(best.id);}else if(c.QuestOverlay)c.CloseQuest();yield return null;}if((c.IsBusy||c.IsModal)&&!Terminal)failure="Modal did not release at "+stage;}

 IEnumerator Travel(string binding){reached=false;var target=c.bindings.Find(binding);if(target==null){failure="Missing binding "+binding;yield break;}Mark("walk:"+binding);float limit=Time.realtimeSinceStartup+100;Vector3[] route=null;int corner=1,approach=0;float nextPlan=0,blocked=0;Vector3 destination=Vector3.zero;while(c.BindingDistance(binding)>2.65f&&Time.realtimeSinceStartup<limit&&!Expired){if(c.IsModal||c.IsBusy){yield return Idle();route=null;continue;}if(!V24)motor.enabled=false;body.enabled=true;if(route==null||Time.time>nextPlan){Vector3[] candidate=null;if(candidate==null){var direction=c.bindings.player.position-target.position;direction.y=0;destination=target.position+Quaternion.Euler(0,(approach%8)*45,0)*direction.normalized*2.3f;destination.y=VillageLife.Ground(destination);yield return PhysicalRouteV19.Plan(c.bindings.player.position,destination,c.bindings.player,p=>candidate=p,()=>!Expired,avoidPeers:true);}route=candidate;corner=1;nextPlan=Time.time+5;if(route==null){approach++;yield return new WaitForSeconds(.5f);continue;}}while(corner<route.Length&&Flat(c.bindings.player.position,route[corner])<.2f)corner++;if(corner>=route.Length){route=null;approach++;yield return null;continue;}var d=route[corner]-c.bindings.player.position;d.y=0;var before=c.bindings.player.position;body.Move((d.normalized*2.6f+Vector3.down*2)*Time.deltaTime);float moved=Vector3.Distance(before,c.bindings.player.position);walked+=moved;blocked=moved<.05f*Time.deltaTime?blocked+Time.deltaTime:0;if(blocked>.7f){route=null;approach++;nextPlan=0;blocked=0;}motor.visual.rotation=Quaternion.RotateTowards(motor.visual.rotation,Quaternion.LookRotation(d),240*Time.deltaTime);VillageLife.Play(c.bindings.AnimatorFor("dylan"),"Locomotion");c.bindings.AnimatorFor("dylan").SetFloat("Speed",.8f);yield return null;}VillageLife.Play(c.bindings.AnimatorFor("dylan"),"Listen");c.bindings.AnimatorFor("dylan").SetFloat("Speed",0);reached=c.BindingDistance(binding)<=3.1f;if(!reached)failure="Physical route blocked: "+binding+" at "+c.bindings.player.position;}
 static float Flat(Vector3 a,Vector3 b){a.y=b.y=0;return Vector3.Distance(a,b);}
 IEnumerator SolveActivity(ActivityDefinitionV17 a){c.OpenActionMenu(a.site);string choice="interaction:action:"+a.id;int page=0;while(c.Dialogue!=null&&!c.Dialogue.choices.Any(x=>x.id==choice)&&page++<8&&c.Dialogue.choices.Any(x=>x.id=="interaction:next")){c.Choose("interaction:next");yield return null;}if(c.Dialogue?.choices.Any(x=>x.id==choice)==true)c.Choose(choice);yield return null;while(activity.IntroPlaying&&!Expired)yield return null;if(!activity.Active){failure="Activity refused through actual action menu: "+a.id+" "+c.Message+" distance="+c.BindingDistance(a.site);yield break;}if(V244&&activity.GuideOpen)activity.DismissGuide();if(a.mode=="allocation"){for(int i=0;i<3;i++)activity.Allocate(i,a.needs[i]);activity.ConfirmAllocation();}else{int guard=0;while(activity.Active&&activity.CurrentProgress.card<a.cards.Length&&guard++<a.cards.Length*3){int index=activity.CurrentProgress.card;if(a.mode=="differences")activity.ObserveDifference(index);activity.Submit(a.cards[index].correct);yield return new WaitForSeconds(.5f);}if(a.mode=="risk"&&activity.Active){activity.PerformWork();yield return new WaitForSeconds(3.2f);activity.VerifyWork();}if(a.mode=="differences"&&activity.Active)activity.ValidateDifferences();if(a.mode=="assemble"&&activity.Active)activity.ConfirmSstAssembly();if(a.mode=="briefing"){float end=Time.realtimeSinceStartup+70;while(activity.Active&&Time.realtimeSinceStartup<end)yield return null;}if(a.mode=="runner"&&activity.Active){yield return Travel("rassemblement");float end=Time.realtimeSinceStartup+180;var world=c.GetComponent<ActivityWorldV17>();while(!world.AllAtAssembly(world.ExpectedResidentIds)&&Time.realtimeSinceStartup<end)yield return null;activity.ValidateAssembly();}}if(!c.State.completedActions.Contains(a.id))failure="Activity incomplete: "+a.id+" "+activity.Feedback;}
 IEnumerator Duel(){var duel=c.GetComponent<MenhirDuel>();c.GetComponent<WorldInteraction>().Execute(CampaignRuntime.MenhirActionId);float limit=Time.realtimeSinceStartup+230;while(duel.Active&&Time.realtimeSinceStartup<limit){if(duel.Phase==MenhirPhase.ChooseMode)duel.ChooseMode(2);if(duel.CanQuestion)duel.Ask();if(duel.Phase==MenhirPhase.Question){int best=Array.FindIndex(duel.Question.answers,a=>a.quality==2);duel.Submit(best,duel.Progress.epoch);}if(duel.Phase==MenhirPhase.Defeat)duel.Retry();duel.TouchGuard=true;yield return null;}duel.TouchGuard=false;if(!c.State.completedActions.Contains(CampaignRuntime.MenhirActionId))failure="Duel not completed normally";}
 bool Claim(QuestDefinition quest)
 {
  if(!c.ClaimQuest(quest.id))return false;
  if(!V244)return true;
  string receipt="reward:v5:"+quest.id;
  if(c.ClaimQuest(quest.id)||c.State.rewardReceipts.Count(id=>id==receipt)!=1)
  {
   failure="Récompense dupliquée : "+quest.id;
   return false;
  }
  Mark("receipt:"+quest.id,"Remise enregistrée une seule fois ; second appel refusé.");
  return true;
 }
 IEnumerator Start(){start=Time.realtimeSinceStartup;Application.logMessageReceived+=Log;yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);c=FindFirstObjectByType<CampaignRuntime>();if(!TribalInterfaceAudit.Requested){failure="Isolated save required";Write();yield break;}if(!Resume)c.NewCampaign();yield return null;activity=c.GetComponent<CampaignActivitiesV17>();motor=c.bindings.player.GetComponent<ThirdPersonMotor>();body=c.bindings.player.GetComponent<CharacterController>();Mark(Resume?"resume-real-save":"new-campaign");yield return Idle();int guard=0;while(failure==""&&!Expired&&guard++<180){yield return Idle();if(failure!="")break;c.RefreshQuests();var q=c.MainQuestFrontier();if(q==null){completed=true;break;}var state=c.QuestState(q.id);if(!state.accepted){yield return Travel(q.giverId);if(failure!="")break;Mark("accept:"+q.id);if(!c.AcceptQuest(q.id)){failure="Quest accept refused: "+q.id+" "+state.status;break;}yield return null;continue;}if(state.status==QuestStatus.READY_TO_VALIDATE||state.status==QuestStatus.READY_TO_CLAIM){yield return Travel(q.giverId);if(failure!="")break;if(state.status==QuestStatus.READY_TO_VALIDATE){Mark("validate:"+q.id);if(!c.ValidateQuest(q.id)){failure="Quest validation refused: "+q.id;break;}c.CloseQuest();}if(c.QuestState(q.id).status==QuestStatus.READY_TO_CLAIM){Mark("claim:"+q.id);if(!Claim(q)){if(failure=="")failure="Quest reward refused: "+q.id;break;}}yield return null;continue;}var action=q.actionIds.Select(c.FindAction).FirstOrDefault(a=>a!=null&&!c.State.completedActions.Contains(a.id)&&c.CanExecute(a,out _,true));if(action==null){failure="No executable required action: "+q.id+" "+string.Join(";",c.QuestValidationIssues(q));break;}yield return Travel(action.targetBindingId);if(failure!="")break;yield return Idle();if(!c.CanExecute(action,out var laterReason)){Mark("wait:"+action.id,laterReason);yield return Idle();continue;}Mark("action:"+action.id);var minigame=c.ActivitiesV17.activities.FirstOrDefault(a=>a.id==action.id);if(minigame!=null)yield return SolveActivity(minigame);else if(action.id==CampaignRuntime.MenhirActionId)yield return Duel();else{c.GetComponent<WorldInteraction>().Execute(action.id);yield return null;yield return Idle();if(!c.State.completedActions.Contains(action.id))failure="Action incomplete: "+action.id+" "+c.Message;}yield return null;}if(Expired)failure="Campaign exceeded 2700 real seconds";if(!completed&&failure=="")failure="Journey iteration guard reached";c.Save();Mark(completed?"campaign-completed":"stopped",failure);Write();motor.enabled=true;Application.logMessageReceived-=Log;if(!Application.isEditor)Application.Quit(completed&&errors.Count==0?0:1);
#if UNITY_EDITOR
 else if(V24)UnityEditor.EditorApplication.Exit(completed&&errors.Count==0?0:1);
#endif
 Destroy(this);}
 void OnDestroy(){Application.logMessageReceived-=Log;}
}}

#endif
