using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
    // Quest metadata extends the existing campaign. Actions, resources and save state remain canonical.
    public sealed partial class CampaignRuntime
    {
        public string QuestPanel{get;private set;}="";public string PresentedQuestId{get;private set;}="";
        public string ConversationActorId{get;private set;}="";
        public QuestCatalog QuestCatalog{get;private set;}
        bool questRefresh,claiming;public bool QuestMigrationApplied{get;private set;}
        public QuestDefinition PresentedQuest=>Data?.quests.FirstOrDefault(q=>q.id==PresentedQuestId);
        public QuestRecord QuestState(string id)=>State?.quests.FirstOrDefault(q=>q.id==id);
        public QuestDefinition QuestFor(ActionDefinition action)=>action==null?null:Data.quests.FirstOrDefault(q=>q.actionIds.Contains(action.id));
        public bool QuestOverlay=>!string.IsNullOrEmpty(QuestPanel);
        public bool IncidentModal=>GetComponent<AccidentDirector>()?.Blocking??false;
        void PrepareQuestData()
        {
            var asset=Resources.Load<TextAsset>("UngaBungaQuests");if(asset==null)return;
            QuestCatalog=JsonUtility.FromJson<QuestCatalog>(asset.text);Data.quests=QuestCatalog.quests;
            Data.characters=Data.characters.Concat(QuestCatalog.characters.Where(c=>!Data.characters.Any(x=>x.id==c.id))).ToArray();
            Data.actions=Data.actions.Concat(QuestCatalog.actions.Where(a=>!Data.actions.Any(x=>x.id==a.id))).ToArray();
            Data.dialogues=Data.dialogues.Concat(QuestCatalog.dialogues.Where(d=>!Data.dialogues.Any(x=>x.id==d.id))).ToArray();
            // Correct authored role descriptions without altering preserved source quotations.
            foreach(var a in Data.actions)foreach(var e in a.effects)
            {if(e.target=="mathieu.assignment")e.text="Grand Gardien des Crânes, mentor et responsable de la prévention.";if(e.target=="dylan.assignment")e.text="Apprenti Gardien des Os, personnage contrôlé par le joueur.";}
            Data.characters.First(c=>c.id=="mathieu").role="Grand Gardien des Crânes · mentor";
            Data.characters.First(c=>c.id=="dylan").role="Apprenti Gardien des Os · joueur";
            foreach(var action in Data.actions.Where(a=>a.targetBindingId=="mathieu"&&a.title=="Parler avec Dylan"))action.title="Parler avec Mathieu";
            PreparePhysicalQuestActions();
            PrepareKnowledgeQuests();
            PrepareTribalActions();
            PrepareQuestSequence();
            PrepareStructuralPrevention();
            PrepareMenhirDuel();
        }
        void InitializeQuests(bool fresh=false)
        {
            if(State==null)return;State.quests??=new List<QuestRecord>();State.rewardReceipts??=new List<string>();State.knowledge??=new List<ISOProgress>();State.viewedDialogues??=new List<string>();State.technologies??=new List<string>();State.accidents??=new List<AccidentRecord>();
            InitializeTribalState();InitializeMenhirState();bool migrate=State.questSchema==0&&!fresh;QuestMigrationApplied=migrate;
            foreach(var q in Data.quests)if(QuestState(q.id)==null)
            {
                var record=new QuestRecord{id=q.id};State.quests.Add(record);
                // Legacy completed actions are preserved; migration never reissues resources.
                if(migrate&&q.actionIds.Length>0&&q.actionIds.All(State.completedActions.Contains))
                {record.accepted=record.validated=record.claimed=true;record.status=QuestStatus.COMPLETED;State.rewardReceipts.Add("legacy:"+q.id);}
                else if(migrate&&q.actionIds.Any(State.completedActions.Contains))record.accepted=true;
            }
            State.questSchema=10;RefreshQuests();
        }
        public void RefreshQuests()
        {
            if(State==null||questRefresh)return;questRefresh=true;
            try{var main=MainQuestFrontier();var optional=OptionalQuestFrontier();foreach(var q in Data.quests)
            {
                var r=QuestState(q.id);if(r==null)continue;
                r.completedObjectives=q.actionIds.Where(State.completedActions.Contains).ToArray();
                if(r.claimed){r.status=QuestStatus.COMPLETED;continue;}
                if(r.status==QuestStatus.REPLACED||r.status==QuestStatus.FAILED)continue;
                var giver=State.characters.FirstOrDefault(c=>c.id==q.giverId);
                if(giver!=null&&!giver.alive){r.status=QuestStatus.REPLACED;r.replacementId="investigation:"+q.giverId;continue;}
                bool unlocked=QuestBaseUnlocked(q)&&(q.required?q==main:q.id.StartsWith("investigation:")||q==optional);
                if(!unlocked){r.status=QuestStatus.LOCKED;continue;}
                if(!r.accepted){if(r.status!=QuestStatus.OFFERED&&r.status!=QuestStatus.DEFERRED)r.status=QuestStatus.AVAILABLE;SetKnowledge(q,1);continue;}
                int count=r.completedObjectives.Length;r.status=count==0?QuestStatus.ACCEPTED:QuestStatus.IN_PROGRESS;SetKnowledge(q,2);
                if(count!=q.actionIds.Length)continue;
                r.status=QuestStatus.ACTION_COMPLETED;SetKnowledge(q,3);
                bool safe=QuestValidationIssues(q).Length==0;
                if(!safe)continue;
                r.status=r.validated?QuestStatus.READY_TO_CLAIM:QuestStatus.READY_TO_VALIDATE;
            }}finally{questRefresh=false;}
        }
        void SetKnowledge(QuestDefinition q,int level)
        {
            foreach(var id in q.iso){var n=State.knowledge.FirstOrDefault(x=>x.id==id);if(n==null){n=new ISOProgress{id=id};State.knowledge.Add(n);}n.level=Mathf.Max(n.level,level);}
        }
        bool ActiveQuestAction(ActionDefinition action,out string reason)
        {
            if(action!=null&&action.id.StartsWith("quest:",StringComparison.Ordinal)){var parts=action.id.Split(':');var entry=QuestState(string.Join(":",parts.Skip(2)));if(entry==null||entry.claimed||entry.status==QuestStatus.LOCKED||entry.status==QuestStatus.REPLACED||entry.status==QuestStatus.FAILED){reason="Cette mission n’est pas disponible.";return false;}}
            reason="";var q=QuestFor(action);if(q==null)return true;var r=QuestState(q.id);
            if(r?.claimed==true){reason="Cette mission est terminée.";return false;}
            if(r==null||!r.accepted||r.status==QuestStatus.LOCKED||r.status==QuestStatus.REPLACED||r.status==QuestStatus.FAILED){reason="Parle au référent pour accepter cette mission.";return false;}return true;
        }
        public bool OpenQuest(string id,string panel="Details",bool requireProximity=false)
        {
            RefreshQuests();var q=Data.quests.FirstOrDefault(x=>x.id==id);var r=QuestState(id);if(q==null||r==null||r.status==QuestStatus.LOCKED)return false;
            if(r.status==QuestStatus.REPLACED||r.status==QuestStatus.FAILED){Inform("Cette mission est remplacée par une enquête. Consulte Mathieu.");return false;}
            if(requireProximity&&!Near(q.giverId)){Inform("Rejoins "+CharacterName(q.giverId)+" pour cette conversation.");return false;}
            Dialogue=null;PresentedQuestId=id;ConversationActorId=q.giverId;
            QuestPanel=panel;if(panel=="Offer"&&!r.accepted){r.status=QuestStatus.OFFERED;Save();}
            UserPaused=false;Notify();return true;
        }
        public bool AcceptQuest(string id)
        {
            var q=Data.quests.FirstOrDefault(x=>x.id==id);var r=QuestState(id);RefreshQuests();if(q==null||r==null||r.accepted||!(r.status==QuestStatus.AVAILABLE||r.status==QuestStatus.OFFERED||r.status==QuestStatus.DEFERRED)||!Near(q.giverId))return false;
            r.accepted=true;r.acceptedAt=State.elapsedSeconds;r.status=QuestStatus.ACCEPTED;State.trackedQuestId=id;State.trackedActionId="";
            Record("quest:accepted:"+id,q.title,"Mission acceptée par Dylan.");CloseQuest();RefreshQuests();Save();Inform("Mission acceptée : "+q.title);GetComponent<QuestNavigationController>()?.ForceRefresh();return true;
        }
        public void DeferQuest(string id)
        {var r=QuestState(id);if(r==null||r.accepted)return;r.status=QuestStatus.DEFERRED;r.refusals++;Record("quest:deferred:"+id,id,"Mission conservée, aucune récompense.");CloseQuest();Save();}
        public void CloseQuest(){QuestPanel="";PresentedQuestId="";ConversationActorId="";Notify();}
        public bool ValidateQuest(string id)
        {
            RefreshQuests();var q=Data.quests.FirstOrDefault(x=>x.id==id);var r=QuestState(id);
            if(q==null)return false;if(r?.status!=QuestStatus.READY_TO_VALIDATE){Inform(string.Join(" · ",QuestValidationIssues(q)));return false;}if(!Near(q.giverId)){Inform("Rejoins "+CharacterName(q.giverId)+" pour faire vérifier la mission.");return false;}
            r.validated=true;r.validatedAt=State.elapsedSeconds;SetKnowledge(q,4);RefreshQuests();Save();OpenQuest(id,"Completion");return true;
        }
        public bool ClaimQuest(string id)
        {
            if(claiming||IsBusy||IncidentModal)return false;RefreshQuests();var q=Data.quests.FirstOrDefault(x=>x.id==id);var r=QuestState(id);string receipt="reward:v5:"+id;
            if(q==null||r?.status!=QuestStatus.READY_TO_CLAIM||r.claimed||State.rewardReceipts.Contains(receipt)||!Near(q.giverId))return false;
            claiming=true;var before=JsonUtility.ToJson(State);
            try
            {
                foreach(var reward in q.rewards)
                {
                    if(reward.kind=="resource")Apply(new EffectDefinition{kind="resource",target=reward.id,value=reward.amount,operation="add"});
                    else if(reward.kind=="knowledge")Apply(new EffectDefinition{kind="resource",target="knowledge",value=reward.amount,operation="add"});
                    else if(reward.kind=="evidence"){if(!State.evidence.Contains(reward.id))State.evidence.Add(reward.id);}
                    else if(reward.kind=="technology"){if(!State.technologies.Contains(reward.id))State.technologies.Add(reward.id);}
                    else if(reward.kind=="competence")Apply(new EffectDefinition{kind="character",target=Data.playerCharacterId+".competence",value=reward.amount,operation="add"});
                }
                r.claimed=true;r.claimedAt=State.elapsedSeconds;r.status=QuestStatus.COMPLETED;State.rewardReceipts.Add(receipt);SetKnowledge(q,4);
                Record(receipt,q.title,"Récompenses remises une seule fois à Dylan.");
                if(!TrySave(SavePath)){State=JsonUtility.FromJson<CampaignSave>(before);return false;}
                if(State.trackedQuestId==id){State.trackedQuestId="";State.trackedActionId="";}
                CloseQuest();RefreshQuests();if(IsActComplete&&!IsModal)AdvanceAct();Save();GetComponent<QuestNavigationController>()?.ForceRefresh();var next=MainQuestFrontier();Inform("Mission terminée : "+q.title+" · Récompenses reçues."+(next!=null&&QuestBaseUnlocked(next)?" Nouvelle mission disponible auprès de "+CharacterName(next.giverId)+".":""));return true;
            }finally{claiming=false;}
        }
        public bool Near(string bindingId)=>BindingDistance(bindingId)<=3.5f;
        public string CharacterName(string id)=>Data.characters.FirstOrDefault(c=>c.id==id)?.name??id;
        public ActionDefinition QuestDestination()
        {
            RefreshQuests();var selected=Data.quests.FirstOrDefault(q=>q.id==State.trackedQuestId&&QuestState(q.id)!=null&&!QuestState(q.id).claimed&&QuestState(q.id).status!=QuestStatus.REPLACED&&QuestState(q.id).status!=QuestStatus.FAILED);
            selected??=Data.quests.FirstOrDefault(q=>q.required&&q.actId==CurrentAct?.id&&QuestState(q.id)!=null&&QuestState(q.id).status!=QuestStatus.LOCKED&&QuestState(q.id).status!=QuestStatus.COMPLETED&&QuestState(q.id).status!=QuestStatus.REPLACED);
            if(selected==null)return null;var r=QuestState(selected.id);if(r==null||r.status==QuestStatus.LOCKED)return null;
            if(!r.accepted)return QuestMenuAction(selected,"offer","Parler à "+CharacterName(selected.giverId));
            if(r.status==QuestStatus.READY_TO_VALIDATE||r.status==QuestStatus.READY_TO_CLAIM)return QuestMenuAction(selected,"details","Retourner voir "+CharacterName(selected.giverId));
            var next=selected.actionIds.Select(id=>Data.actions.FirstOrDefault(a=>a.id==id)).FirstOrDefault(a=>a!=null&&!State.completedActions.Contains(a.id)&&CanExecute(a,out _,true));
            if(next==null&&!string.IsNullOrEmpty(selected.verificationFlag)&&!HasFlag(selected.verificationFlag))next=FindAction(selected.actionIds.Last());return next;
        }
        ActionDefinition QuestMenuAction(QuestDefinition q,string mode,string title)=>new ActionDefinition{id="quest:"+mode+":"+q.id,title=title,targetBindingId=q.giverId,actId="*"};
        public ActionDefinition[] QuestInteractions(string binding)
        {
            RefreshQuests();return Data.quests.Where(q=>q.giverId==binding&&QuestState(q.id)!=null&&QuestState(q.id).status!=QuestStatus.LOCKED&&QuestState(q.id).status!=QuestStatus.REPLACED&&QuestState(q.id).status!=QuestStatus.FAILED&&!QuestState(q.id).claimed)
                .Select(q=>QuestMenuAction(q,QuestState(q.id).accepted?"details":"offer",(QuestState(q.id).accepted?"Mission : ":"Proposition : ")+q.title)).ToArray();
        }
        public ActionDefinition FindAction(string id)
        {
            if(string.IsNullOrEmpty(id))return null;if(id.StartsWith("travel:",StringComparison.Ordinal)){string binding=id.Substring(7);return bindings.Find(binding)==null?null:new ActionDefinition{id=id,title="Rejoindre "+(GetComponent<CampaignMap>()?.DisplayName(binding)??binding),targetBindingId=binding,actId="*",repeatable=true};}
            if(id.StartsWith("quest:",StringComparison.Ordinal)){var pieces=id.Split(':');var q=Data.quests.FirstOrDefault(x=>x.id==string.Join(":",pieces.Skip(2)));return q==null?null:QuestMenuAction(q,pieces[1],q.title);}return Data.actions.FirstOrDefault(a=>a.id==id);
        }
        public void TrackQuest(string id){RefreshQuests();var q=Data.quests.FirstOrDefault(x=>x.id==id);var record=QuestState(id);if(q==null||record==null||record.claimed||record.status==QuestStatus.LOCKED||record.status==QuestStatus.FAILED||record.status==QuestStatus.REPLACED)return;State.trackedQuestId=id;State.trackedActionId="";CloseQuest();GetComponent<QuestNavigationController>()?.ForceRefresh();Save();}
        public string QuestTip(QuestDefinition q){var r=QuestState(q.id);if(r?.validated==true)return "Les observations, les actions et leur contrôle sont conservés dans le Carnet des Crânes.";return r!=null&&r.refusals>0?"Tu peux reprendre cette mission. Une décision ne remplace pas les travaux et leur vérification.":q.tip;}
    }
}
