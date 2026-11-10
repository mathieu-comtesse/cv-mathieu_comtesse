using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 [Serializable] public sealed class ActivityCardV17
 {
  public string id,question,explanation,before,after,site,clause,concept,requiredEvidence,@object,dialogue,source;public string[] choices=Array.Empty<string>();public int correct;public bool critical;
 }
 [Serializable] public sealed class ActivityDefinitionV17
 {
  public string id,title,mode,clause,actor,site,evidence,intro,outro,risk,measure,responsible,source;public float duration;public int minimum,budget;
  public int[] needs=Array.Empty<int>();public string[] requiredConcepts=Array.Empty<string>();public ActivityCardV17[] cards=Array.Empty<ActivityCardV17>();
 }
 [Serializable] public sealed class ActivityCatalogV17 {public int version;public ActivityDefinitionV17[] activities=Array.Empty<ActivityDefinitionV17>();public QuestDefinition[] quests=Array.Empty<QuestDefinition>();}
 public enum EvidenceStageV17 {Discovered,Decided,Realised,Verified}
 [Serializable] public sealed class EvidenceRecordV17
 {
  public string id,name,clause,source,activity,result,verification;public EvidenceStageV17 stage;public float at;
 }
 [Serializable] public sealed class ActivityProgressV17
 {
  public string id;public int card,mistakes,lane=1;public float seconds,workSeconds,routeDistance;public bool completed,observed,worked,verified;
  public int[] allocation={0,0,0};public List<string> answers=new List<string>();public List<string> observations=new List<string>();public List<string> people=new List<string>();
 }
 [Serializable] public sealed class TimeSegmentV17 {public string sequence,category;public float seconds;}
 [Serializable] public sealed class CampaignProgressV17
 {
  public int revision=17;public bool freePlay,emergencyRosterPrepared,emergencyAssemblySaved;public Vector3 emergencyAssemblyPoint;public List<string> emergencyExpected=new List<string>(),emergencyOutside=new List<string>();public string active="",beforePainting="",legacyEnding="";public float wallSeconds;public List<ActivityProgressV17> activities=new List<ActivityProgressV17>();
  public List<EvidenceRecordV17> evidence=new List<EvidenceRecordV17>();public List<TimeSegmentV17> timing=new List<TimeSegmentV17>();
 }
 public sealed partial class CampaignRuntime
 {
  public ActivityCatalogV17 ActivitiesV17{get;private set;}
  void PrepareCampaignV17()
  {
   var text=Resources.Load<TextAsset>("CampaignV17");if(text==null)return;ActivitiesV17=JsonUtility.FromJson<ActivityCatalogV17>(text.text);
   foreach(var a in ActivitiesV17.activities){if(a.actor=="ouways")a.actor="nork";if(a.site=="ouways")a.site="nork";}
   foreach(var q in ActivitiesV17.quests)if(q.giverId=="ouways")q.giverId="nork";
   var painter=Data.characters.FirstOrDefault(c=>c.id=="nork");if(painter!=null){painter.name="Ouways";painter.role="Graveur et peintre du village";}
   var required=new List<QuestDefinition>();
   required.Add(Data.quests.First(q=>q.id=="M_I_TUTORIEL"));required.Add(ActivitiesV17.quests.First(q=>q.id=="V17_CONTEXT"));
   required.Add(Data.quests.First(q=>q.id==MenhirQuestId));required.Add(ActivitiesV17.quests.First(q=>q.id=="V17_RISKS"));required.Add(ActivitiesV17.quests.First(q=>q.id=="V17_SUPPORT"));
   var hut=Data.quests.First(q=>q.id=="M_V_ABRI");required.Add(hut);
   required.AddRange(ActivitiesV17.quests.Where(q=>q.id=="V17_OPERATIONS"||q.id=="V17_EMERGENCY"||q.id=="V17_EVALUATION"||q.id=="V17_IMPROVEMENT"));
   required[0].iso=Array.Empty<string>();required[0].actId="ACTE_I";
   for(int i=0;i<required.Count;i++){var q=required[i];q.required=true;q.requiredFlags=Array.Empty<string>();q.prerequisites=i==0?Array.Empty<string>():new[]{required[i-1].id};q.goalId="v17:goal:"+q.id;}
   var retained=new HashSet<string>(required.SelectMany(q=>q.actionIds));retained.Add(MenhirActionId);retained.Add("STRUCTURE_REPLAN");
   foreach(var a in Data.actions)
   {
    if(a.id=="M_V_ABRI_1")a.requiredFlags=Array.Empty<string>();
    if(!retained.Contains(a.id)&&a.actId!="*"&&a.actId!="MENHIR_ARCHIVE")a.actId="FREE_V16";
   }
   foreach(var q in Data.quests.Where(q=>!required.Contains(q))){q.required=false;q.requiredFlags=q.requiredFlags.Concat(new[]{"v17:free"}).Distinct().ToArray();}
   Data.quests=required.Concat(Data.quests.Where(q=>!required.Contains(q))).ToArray();
   var newActions=new List<ActionDefinition>();
   foreach(var a in ActivitiesV17.activities)
   {
    var q=required.First(x=>x.actionIds.Contains(a.id));int index=Array.IndexOf(q.actionIds,a.id);
    newActions.Add(new ActionDefinition{id=a.id,title=a.title,actId=q.actId,targetBindingId=a.site,interactionType="ActivityV17",reference="ISO 45001 · "+a.clause,requiredFlags=index>0?new[]{"done:"+q.actionIds[index-1]}:Array.Empty<string>(),effects=new[]{new EffectDefinition{kind="flag",target="done:"+a.id,value=1},new EffectDefinition{kind="evidence",target=a.evidence,value=1}}});
   }
   Data.actions=Data.actions.Concat(newActions).ToArray();
   string[] titles={"LE GRAND RÉVEIL · LE CONTEXTE","LE CHEF CONTRE-ATTAQUE","LA CHASSE AUX RISQUES","LA TRIBU A DES MOYENS","LES 15 DIFFÉRENCES","AU FEU !!!","LES ANCIENS VIENNENT AUDITER","LE PROCHAIN CYCLE"};
   float[] budgets={360,360,420,360,360,300,300,180};
   for(int i=0;i<Data.acts.Length;i++)
   {
    var act=Data.acts[i];act.title=titles[i];act.durationSeconds=budgets[i];if(i>0)act.introCinematicId="";act.exitCinematicId="";
    act.objectives=required.Where(q=>q.actId==act.id).Select(q=>new ObjectiveDefinition{id=q.goalId,title=q.title,required=true,actionIds=q.actionIds,reference="V17 · "+string.Join(", ",q.iso)}).ToArray();
   }
   if(GetComponent<CampaignActivitiesV17>()==null)gameObject.AddComponent<CampaignActivitiesV17>();
   if(GetComponent<ActivityViewV17>()==null)gameObject.AddComponent<ActivityViewV17>();
   if(GetComponent<ActivityWorldV17>()==null)gameObject.AddComponent<ActivityWorldV17>();
   if(GetComponent<ActivityActingV18>()==null)gameObject.AddComponent<ActivityActingV18>();
   if(GetComponent<AuditSpiritsV17>()==null)gameObject.AddComponent<AuditSpiritsV17>();
  }
  public void InitializeCampaignV17()
  {
   State.campaignV17??=new CampaignProgressV17();State.campaignV17.activities??=new List<ActivityProgressV17>();State.campaignV17.evidence??=new List<EvidenceRecordV17>();State.campaignV17.timing??=new List<TimeSegmentV17>();State.campaignV17.emergencyExpected??=new List<string>();State.campaignV17.emergencyOutside??=new List<string>();
   foreach(var a in ActivitiesV17?.activities??Array.Empty<ActivityDefinitionV17>())if(!State.campaignV17.activities.Any(s=>s.id==a.id))State.campaignV17.activities.Add(new ActivityProgressV17{id=a.id});
  }
  public void SetEvidenceV17(ActivityDefinitionV17 a,EvidenceStageV17 stage,string result,string proof="")
  {
   InitializeCampaignV17();var list=State.campaignV17.evidence;var e=list.Find(x=>x.id==a.evidence);if(e==null){e=new EvidenceRecordV17{id=a.evidence,name=a.evidence,clause=a.clause,source="V17 · documents de conception",activity=a.id};list.Add(e);}
   e.source=a.source??"V17 · documents de conception";e.stage=stage;e.result=result;e.verification=proof;e.at=State.elapsedSeconds;
  }
  public bool CompleteActivityV17(string id)
  {
   var runner=GetComponent<CampaignActivitiesV17>();var p=runner?.Progress(id);if(p==null||!p.completed||State.completedActions.Contains(id))return false;
   var a=FindAction(id);if(a==null||!CanExecute(a,out _,true))return false;ApplyActionOutcome(a);RefreshQuests();SyncWorld();Save();Notify();return true;
  }
  public void FreePlayV17()
  {
   if(Ending==null)return;Ending=null;State.endingId="";State.campaignV17.freePlay=true;SetDerivedFlag("v17:free",true);
   actionCache.Clear();RefreshQuests();Save();Notify();
  }
 }
 public enum SstAssemblyPhase { Ready, Assembling, Validating, Success, Error, Paused, Exited }

 public sealed class CampaignActivitiesV17:MonoBehaviour
 {
  CampaignRuntime c;CampaignSave observed;public ActivityDefinitionV17 Current{get;private set;}public bool Active=>Current!=null;public bool BlocksGameplay=>Active&&Current.mode!="runner";
  public string Feedback{get;private set;}="";public event Action Changed;public bool TimedOut{get;private set;}
  public ActivityProgressV17 Progress(string id)=>c?.State?.campaignV17?.activities.Find(a=>a.id==id);
  public ActivityProgressV17 CurrentProgress=>Current==null?null:Progress(Current.id);
  public bool SstExitPromptOpen{get;private set;}
  SstAssemblyPhase assemblyPhase;
  public SstAssemblyPhase AssemblyPhase => Current?.mode == "assemble" && (c.IsPaused || SstExitPromptOpen)
    ? SstAssemblyPhase.Paused : assemblyPhase;
  public bool WorkReady=>Current!=null&&Current.mode=="risk"&&CurrentProgress.card>=Current.cards.Length;
  float feedbackUntil;Vector3 lastPlayer;float telemetryTick;
  ChapterMotionV241 motion;
  void Awake(){c=GetComponent<CampaignRuntime>();}
  void Start(){motion=GetComponent<ChapterMotionV241>();}
  public bool Begin(string id)
  {
   if(Active||c.IsBusy||c.IsModal)return false;var a=c.ActivitiesV17?.activities.FirstOrDefault(x=>x.id==id);var action=c.FindAction(id);
   if(a==null||!c.CanExecute(action,out _)||!c.Near(a.site))return false;
   var chapter=a.mode=="briefing"?"07":a.mode=="differences"||a.mode=="audit"?"08":null;
   if(chapter!=null&&motion!=null&&!motion.Require(chapter))return false;
   c.InitializeCampaignV17();var p=Progress(id);if(p==null||p.completed)return false;
   if(a.mode=="assemble")
   {
    p.answers = a.cards.Where(card => p.answers.Contains(card.id)).Select(card => card.id).Distinct().ToList();
    p.card = Array.FindIndex(a.cards, card => !p.answers.Contains(card.id));
    if (p.card < 0) p.card = a.cards.Length;
    assemblyPhase = SstAssemblyPhase.Ready;
   }
   Current=a;Feedback=a.intro??"";TimedOut=false;SstExitPromptOpen=false;feedbackUntil=0;c.State.campaignV17.active=id;
   observed=c.State;
   if(a.mode=="prepare")GetComponent<ActivityWorldV17>()?.PrepareEmergencyRoster();
   c.SetEvidenceV17(a,p.worked?EvidenceStageV17.Realised:p.answers.Count>0?EvidenceStageV17.Decided:EvidenceStageV17.Discovered,p.worked?a.measure:"Activité observée, décisions et acquis conservés.");c.CaptureDecisionCheckpoint();Changed?.Invoke();return true;
  }
  public void Suspend()
  {
   if(!Active)return;
   if(Current.mode=="assemble")assemblyPhase=SstAssemblyPhase.Exited;
   GetComponent<ActivityViewV17>()?.CancelDrag();
   c.State.campaignV17.active="";Current=null;Feedback="";SstExitPromptOpen=false;feedbackUntil=0;Changed?.Invoke();
   c.ReconcileControls();c.GetComponent<QuestNavigationController>()?.ForceRefresh();c.Save();
  }
  public void ToggleSstExitPrompt()
  {
   if(Current?.mode!="assemble")return;
   GetComponent<ActivityViewV17>()?.CancelDrag();
   SstExitPromptOpen=!SstExitPromptOpen;Changed?.Invoke();
  }
  public bool Submit(int answer)
  {
   if(!Active||SstExitPromptOpen||c.IsPaused||TimedOut||Time.unscaledTime<feedbackUntil)return false;var p=CurrentProgress;
   if(Current.mode=="differences"&&!p.observed)return false;
   if(p.card<0||p.card>=Current.cards.Length||answer<0||answer>=Current.cards[p.card].choices.Length)return false;
   var card=Current.cards[p.card];bool proof=string.IsNullOrEmpty(card.requiredEvidence)||c.HasFlag(card.requiredEvidence)||c.State.campaignV17.evidence.Any(e=>e.id==card.requiredEvidence&&e.stage==EvidenceStageV17.Verified);
   bool correct=answer==card.correct&&proof;
   if(!correct){if(Current.mode=="assemble")assemblyPhase=SstAssemblyPhase.Error;p.mistakes++;Feedback=proof?"Réessaie : "+card.explanation:"La preuve correspondante n’est pas encore vérifiée. Reprends le contrôle sur le terrain.";feedbackUntil=Time.unscaledTime+.45f;Changed?.Invoke();return false;}
   if(!p.answers.Contains(card.id))p.answers.Add(card.id);
   p.card++;
   if(Current.mode=="assemble")
   {
    assemblyPhase=SstAssemblyPhase.Assembling;
    while(p.card<Current.cards.Length&&p.answers.Contains(Current.cards[p.card].id))p.card++;
   }
   Feedback=card.explanation;feedbackUntil=Time.unscaledTime+.45f;
   c.SetEvidenceV17(Current,EvidenceStageV17.Decided,string.Join(" · ",p.answers));
   if(Current.mode=="differences")
   {p.observed=false;string key="difference:"+card.id;if(!c.State.campaignV17.evidence.Any(e=>e.id==key))c.State.campaignV17.evidence.Add(new EvidenceRecordV17{id=key,name=card.question,clause=card.clause,source=card.source,activity=Current.id,stage=EvidenceStageV17.Verified,result=card.before+"\n→ "+card.after+"\n\n"+card.dialogue+"\n\n"+card.explanation,verification="Localisation et explication associées par Dylan.",at=c.State.elapsedSeconds});Changed?.Invoke();c.Save();return true;}
   if(p.card>=Current.cards.Length&&Current.mode!="risk"&&Current.mode!="briefing"&&Current.mode!="runner"&&Current.mode!="allocation"&&Current.mode!="assemble")Finish();else{c.Save();Changed?.Invoke();}return true;
  }
  public void ConfirmSstAssembly()
  {
   if(Current?.mode!="assemble"||CurrentProgress.card<Current.cards.Length||c.IsPaused||SstExitPromptOpen||
      assemblyPhase==SstAssemblyPhase.Validating)return;
   assemblyPhase=SstAssemblyPhase.Validating;
   try { Finish(); }
   finally { assemblyPhase=Active?SstAssemblyPhase.Error:SstAssemblyPhase.Success; }
  }
  public bool Allocate(int index,int delta)
  {
   if(Current?.mode!="allocation"||index<0||index>=3)return false;var p=CurrentProgress;int value=Mathf.Clamp(p.allocation[index]+delta,0,Current.budget);
   if(p.allocation.Sum()-p.allocation[index]+value>Current.budget)return false;p.allocation[index]=value;Changed?.Invoke();return true;
  }
  public bool ConfirmAllocation()
  {
   if(Current?.mode!="allocation")return false;var p=CurrentProgress;if(Enumerable.Range(0,3).Any(i=>p.allocation[i]<Current.needs[i])){Feedback="Les objectifs ont des besoins différents : formation 3, stockage 4, foyer 2. Ajuste les moyens.";Changed?.Invoke();return false;}
   p.card=Current.cards.Length;Finish();return true;
  }
  public void MoveLane(int delta){if(!Active)return;CurrentProgress.lane=Mathf.Clamp(CurrentProgress.lane+delta,0,2);Changed?.Invoke();}
  public void ProjectileHit(){if(Current?.mode!="briefing")return;CurrentProgress.mistakes++;feedbackUntil=Time.unscaledTime+.7f;Feedback="Dylan est brièvement étourdi. Les messages déjà transmis restent acquis.";Changed?.Invoke();}
  public bool ObserveDifference(int index)
  {
   if(Current?.mode!="differences"||index<0||index>=Current.cards.Length)return false;var p=CurrentProgress;var card=Current.cards[index];if(p.answers.Contains(card.id))return false;
   p.card=index;p.observed=true;Feedback=card.before+"\n→ "+card.after;Changed?.Invoke();return true;
  }
  public bool ValidateDifferences()
  {
   if(Current?.mode!="differences")return false;var p=CurrentProgress;
   bool enough=p.answers.Count>=Current.minimum;bool critical=Current.cards.Where(x=>x.critical).All(x=>p.answers.Contains(x.id));bool concepts=Current.requiredConcepts.All(x=>Current.cards.Any(card=>card.concept==x&&p.answers.Contains(card.id)));
   if(!enough||!critical||!concepts){Feedback="Complète les observations critiques et les notions : élimination, changements, interventions, achats et externalisation.";Changed?.Invoke();return false;}Finish();return true;
  }
  public bool PerformWork()
  {
   if(!WorkReady||!c.Near(Current.site)||CurrentProgress.worked)return false;CurrentProgress.worked=true;
   c.Apply(new EffectDefinition{kind="risk",target=Current.risk,value=1});c.Apply(new EffectDefinition{kind="flag",target="measure:"+Current.id,value=1});
   c.SetEvidenceV17(Current,EvidenceStageV17.Realised,Current.measure);GetComponent<ActivityWorldV17>()?.ApplyMeasure(Current);c.Save();Changed?.Invoke();return true;
  }
  public bool VerifyWork()
  {
   if(!WorkReady||!CurrentProgress.worked||CurrentProgress.workSeconds<3||!c.Near(Current.site))return false;
   CurrentProgress.verified=true;c.Apply(new EffectDefinition{kind="risk",target=Current.risk,value=0});Finish();return true;
  }
  public bool ValidateAssembly()
  {
   if(Current?.mode!="runner"||CurrentProgress.card<Current.cards.Length||!c.Near("rassemblement"))return false;var p=CurrentProgress;
   var expected=GetComponent<ActivityWorldV17>().ExpectedResidentIds;
   var world=GetComponent<ActivityWorldV17>();if(world==null||!world.AllAtAssembly(expected)){Feedback="Le rassemblement reste incomplet. Signale les absences et attends les personnes sur l’itinéraire sûr.";Changed?.Invoke();return false;}
   p.people=expected.ToList();Finish();return true;
  }
  public void RetryTimer(){if(!TimedOut)return;CurrentProgress.seconds=0;TimedOut=false;Feedback="Les observations et preuves acquises sont conservées.";Changed?.Invoke();}
  void Finish()
  {
   if(Current.mode=="differences"){ValidateDifferencesInternal();return;}FinishCore();
  }
  void ValidateDifferencesInternal()
  {
   var p=CurrentProgress;if(p.answers.Count<Current.minimum||Current.cards.Where(x=>x.critical).Any(x=>!p.answers.Contains(x.id))||Current.requiredConcepts.Any(x=>!Current.cards.Any(card=>card.concept==x&&p.answers.Contains(card.id)))){Changed?.Invoke();c.Save();return;}FinishCore();
  }
  void FinishCore()
  {
   if(!c.CanExecute(c.FindAction(Current.id),out var reason,true)){Feedback=reason;Changed?.Invoke();c.Save();return;}
   var a=Current;var p=CurrentProgress;p.completed=p.verified=true;c.SetEvidenceV17(a,EvidenceStageV17.Verified,a.outro??"Résultat conservé.","Choix et preuves contrôlés à l’étape de jeu "+c.State.elapsedSeconds.ToString("0"));
   if(a.id=="V17_DEBRIEF_FIRE")c.Apply(new EffectDefinition{kind="flag",target="v17:alarm",value=0});
   if(a.id=="V17_SKILLS")c.Apply(new EffectDefinition{kind="flag",target="competence_verified",value=1});if(a.id=="V17_OBJECTIVES")c.Apply(new EffectDefinition{kind="flag",target="workers_consulted",value=1});if(a.id=="V17_AUDIT")c.Apply(new EffectDefinition{kind="flag",target="audit_performed",value=1});if(a.id=="V17_CORRECTIVE")c.Apply(new EffectDefinition{kind="flag",target="events_analyzed",value=1});if(a.id=="V17_IMPROVE")c.Apply(new EffectDefinition{kind="flag",target="maintenance_planned",value=1});
   c.State.campaignV17.active="";Current=null;c.CompleteActivityV17(a.id);Feedback=a.outro??"Preuve enregistrée dans le Carnet des Crânes.";Changed?.Invoke();c.GetComponent<QuestNavigationController>()?.ForceRefresh();
   if(a.mode=="assemble")c.Inform(Feedback);
  }
  void Update()
  {
   if(c.State==null)return;if(observed!=c.State){observed=c.State;c.InitializeCampaignV17();c.State.campaignV17.active="";Current=null;SstExitPromptOpen=false;assemblyPhase=SstAssemblyPhase.Exited;}
   float dt=Time.unscaledDeltaTime;if(!c.IsPaused&&c.Ending==null&&!c.State.campaignV17.freePlay)
   {
    var save=c.State.campaignV17;save.wallSeconds+=dt;string sequence=Current?.id??c.MainQuestFrontier()?.id??c.CurrentAct?.id??"conclusion";
    string category=c.cinematicDirector.IsPlaying?"cinematic":Active?"minigame":c.Dialogue!=null||c.QuestOverlay?"reading":c.IsBusy?"interaction":(c.bindings.player.position-lastPlayer).sqrMagnitude>.00001f?"travel":"observation";
    var segment=save.timing.FindLast(s=>s.sequence==sequence&&s.category==category);if(segment==null){segment=new TimeSegmentV17{sequence=sequence,category=category};save.timing.Add(segment);}segment.seconds+=dt;
   }lastPlayer=c.bindings.player.position;
   if(!Active||SstExitPromptOpen||c.IsPaused||TimedOut)return;var p=CurrentProgress;p.seconds+=dt;
   if(WorkReady&&p.worked)p.workSeconds+=dt;
   if(Current.duration>0&&p.seconds>=Current.duration&&!(Current.mode=="assemble"&&p.card>=Current.cards.Length))
   {if(Current.mode=="briefing"&&p.card>=Current.cards.Length){Finish();return;}if(Current.mode!="runner"){TimedOut=true;Feedback="Temps écoulé. Les acquis sont conservés ; reprends l’essai pour compléter la maîtrise.";Changed?.Invoke();}}
  }
 }
}
