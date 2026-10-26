using System;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class CampaignRuntime
    {
        string DecisionPath=>Path.Combine(Path.GetDirectoryName(SavePath),Data.id+".decision.json");
        public void CaptureDecisionCheckpoint(){if(State==null||IncidentModal||IsBusy)return;Save(DecisionPath);}
        public bool RestoreDecisionCheckpoint()
        {
            if(!File.Exists(DecisionPath))return false;StopAllCoroutines();IsBusy=false;Dialogue=null;pendingAction=null;UserPaused=false;Ending=null;QuestPanel="";PresentedQuestId="";ConversationActorId="";
            if(!Load(DecisionPath))return false;GetComponent<AccidentDirector>()?.ResetPresentation();SyncWorld();Save();Notify();GetComponent<QuestNavigationController>()?.ForceRefresh();return true;
        }
        public void RegisterAccident(AccidentDefinition definition,Vector3 position,float yaw)
        {
            if(State.accidents.Any(a=>a.id==definition.id&&!a.playerAttempt))return;
            bool player=definition.victimId==Data.playerCharacterId;
            var record=new AccidentRecord{id=definition.id,title=definition.title,victimId=definition.victimId,kind=definition.kind,site=definition.site,elapsedSeconds=State.elapsedSeconds,position=position,yaw=yaw,playerAttempt=player,decision=State.history.LastOrDefault()?.text??"Intervention maintenue malgré l’alerte",warning=definition.warning,immediateCause=definition.immediateCause,organizationalCause=definition.organizationalCause,correctiveAction=definition.correctiveAction,iso=definition.iso};
            State.accidents.Add(record);if(player)return;
            var victim=State.characters.First(c=>c.id==definition.victimId);victim.alive=false;victim.available=false;victim.life=0;victim.health="décédé";victim.assignment="";
            SetDerivedFlag("accident:"+definition.victimId,true);SetDerivedFlag("catastrophe",true);SetDerivedFlag("events_analyzed",false);
            foreach(var q in Data.quests.Where(q=>q.giverId==definition.victimId||q.actionIds.Select(FindAction).Any(a=>a?.targetBindingId==definition.victimId)))
            {var state=QuestState(q.id);if(state==null||state.claimed)continue;state.status=QuestStatus.REPLACED;state.replacementId="investigation:"+definition.victimId;}
            State.trackedQuestId="investigation:"+definition.victimId;State.trackedActionId="";
            Record("accident:"+definition.id,definition.title,definition.organizationalCause);SyncWorld();Save();Notify();
        }
        public void FinishIncident(){Dialogue=null;pendingAction=null;ConversationActorId="";RefreshQuests();SyncWorld();Save();Notify();}
        public bool ReloadSavedCampaign(){if(IsBusy||IncidentModal||!Load(SavePath))return false;Dialogue=null;QuestPanel="";PresentedQuestId="";UserPaused=false;GetComponent<AccidentDirector>()?.ResetPresentation();ResolveEnding();SyncWorld();Notify();return true;}
    }
}
