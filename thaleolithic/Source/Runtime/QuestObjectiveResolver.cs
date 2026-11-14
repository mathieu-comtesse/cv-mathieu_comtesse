using System;
using System.Linq;

namespace UngaBunga45001
{
    internal enum ObjectivePhase { Offer, Interact, Activity, Travel, Validate, Claim, Blocked, Complete }

    internal sealed class QuestObjective
    {
        public QuestDefinition Quest;
        public ActionDefinition Action;
        public ActivityDefinitionV17 Activity;
        public ObjectivePhase Phase;
        public string HelperId, GiverId, TargetBindingId, TargetObjectId, Site, Iso, Title, Verb,
            Requirement, Instruction, Validation, Completion, NextId, NextLabel;
        public int Finished, Total;
        public bool Optional;
        public string QuestId => Quest?.id;
    }

    internal sealed class QuestObjectiveResolver
    {
        readonly CampaignRuntime campaign;
        CampaignActivitiesV17 activities;
        CampaignSave observed;
        (int act, int completed, int flags, int evidence, int receipts, int history, string quest,
            string action, string activity, string ending) stamp;
        bool dirty = true;
        QuestObjective main, current;

        public QuestObjectiveResolver(CampaignRuntime campaign)
        {
            this.campaign = campaign;
            activities = campaign.GetComponent<CampaignActivitiesV17>();
        }

        public QuestObjective Main { get { Refresh(); return main; } }
        public QuestObjective Current { get { Refresh(); return current; } }
        public int Resolutions { get; private set; }
        public void Invalidate() => dirty = true;

        void Refresh()
        {
            var state = campaign.State;
            if (state == null || campaign.Data == null) { main = current = null; observed = null; return; }
            if (activities == null) activities = campaign.GetComponent<CampaignActivitiesV17>();
            var next = (state.actIndex, state.completedActions.Count, state.flags.Count, state.evidence.Count,
                state.rewardReceipts.Count, state.history.Count, state.trackedQuestId, state.trackedActionId,
                activities?.Current?.id, state.endingId);
            bool finishedTravel = current?.Phase == ObjectivePhase.Travel && current.Action?.id == state.trackedActionId &&
                campaign.Near(current.TargetBindingId);
            if (!dirty && observed == state && stamp == next && !finishedTravel) return;
            dirty = false;
            observed = state;
            Resolutions++;
            var quest = campaign.MainQuestFrontier();
            var record = quest == null ? null : campaign.QuestState(quest.id);
            if (record?.status == QuestStatus.REPLACED && !string.IsNullOrEmpty(record.replacementId))
                quest = campaign.Data.quests.FirstOrDefault(q => q.id == record.replacementId) ?? quest;
            main = campaign.Ending == null ? ForQuest(quest, false) : null;
            current = main;
            var active = activities?.Current;
            if (active != null)
            {
                var action = campaign.FindAction(active.id);
                var parent = campaign.QuestFor(action);
                current = active.mode == "runner"
                    ? Describe(parent, campaign.FindAction("travel:rassemblement"), active, ObjectivePhase.Travel, false)
                    : Describe(parent, action, active, ObjectivePhase.Activity, parent?.required == false);
            }
            else if (campaign.Ending == null)
            {
                var tracked = campaign.FindAction(state.trackedActionId);
                if (tracked != null && !finishedTravel && campaign.CanExecute(tracked, out _, true) &&
                    !(tracked.repeatable && state.trackedActionHistoryIndex >= 0 &&
                      state.history.Skip(state.trackedActionHistoryIndex).Any(item => item.id == tracked.id)))
                {
                    var parent = campaign.QuestFor(tracked) ?? (tracked.id == main?.Action?.id ? main.Quest : null);
                    if (tracked.id != main?.Action?.id)
                        current = Describe(parent, tracked, ActivityFor(tracked), PhaseFor(parent, tracked), parent?.required != true);
                }
                else
                {
                    state.trackedActionId = "";
                    var trackedQuest = campaign.Data.quests.FirstOrDefault(q => q.id == state.trackedQuestId);
                    if (trackedQuest != null && !trackedQuest.required && campaign.QuestVisible(trackedQuest) &&
                        campaign.QuestState(trackedQuest.id)?.claimed != true)
                        current = ForQuest(trackedQuest, true) ?? main;
                }
            }
            stamp = (next.actIndex, next.Item2, next.Item3, next.Item4, next.Item5, next.Item6,
                state.trackedQuestId, state.trackedActionId, next.Item9, state.endingId);
        }

        public QuestObjective ForQuest(QuestDefinition quest) => ForQuest(quest, quest?.required == false);

        QuestObjective ForQuest(QuestDefinition quest, bool optional)
        {
            if (quest == null) return null;
            var action = campaign.QuestDestination(quest);
            var result = Describe(quest, action, ActivityFor(action), PhaseFor(quest, action), optional);
            if (result.Phase == ObjectivePhase.Blocked) result.Requirement = BlockReason(quest);
            return result;
        }

        ActivityDefinitionV17 ActivityFor(ActionDefinition action) => action == null ? null :
            campaign.ActivitiesV17?.activities.FirstOrDefault(entry => entry.id == action.id);

        ObjectivePhase PhaseFor(QuestDefinition quest, ActionDefinition action)
        {
            var record = quest == null ? null : campaign.QuestState(quest.id);
            if (record?.claimed == true) return ObjectivePhase.Complete;
            if (action == null) return ObjectivePhase.Blocked;
            if (action.id.StartsWith("travel:", StringComparison.Ordinal)) return ObjectivePhase.Travel;
            if (action.id.StartsWith("quest:"))
                return record?.status == QuestStatus.READY_TO_CLAIM ? ObjectivePhase.Claim :
                    record?.status == QuestStatus.READY_TO_VALIDATE ? ObjectivePhase.Validate : ObjectivePhase.Offer;
            return ObjectivePhase.Interact;
        }

        QuestObjective Describe(QuestDefinition quest, ActionDefinition action, ActivityDefinitionV17 activity,
            ObjectivePhase phase, bool optional)
        {
            string binding = action?.targetBindingId;
            string person = string.IsNullOrEmpty(binding) ? null : campaign.CharacterName(binding);
            int index = quest == null || action == null ? -1 : Array.IndexOf(quest.actionIds, activity?.id ?? action.id);
            string nextId = index >= 0 && index + 1 < quest.actionIds.Length ? quest.actionIds[index + 1] : null;
            string nextLabel = nextId == null ? null : campaign.FindAction(nextId)?.title;
            if (phase == ObjectivePhase.Offer && quest?.actionIds.Length > 0)
            {
                nextId = quest.actionIds[0];
                nextLabel = campaign.FindAction(nextId)?.title;
            }
            else if (quest != null && phase != ObjectivePhase.Claim && phase != ObjectivePhase.Complete && nextLabel == null)
            {
                nextId = "quest:details:" + quest.id;
                nextLabel = (phase == ObjectivePhase.Validate ? "Réclamer les récompenses auprès de " : "Faire vérifier le résultat auprès de ") +
                    campaign.CharacterName(quest.giverId);
            }
            return new QuestObjective {
                Quest = quest, Action = action, Activity = activity, Phase = phase, Optional = optional,
                GiverId = quest?.giverId, HelperId = activity?.actor ?? (person != binding ? binding : quest?.giverId),
                TargetBindingId = binding, TargetObjectId = person == binding ? binding : null,
                Site = QuestGuidanceV243.Site(campaign, binding), Iso = activity?.clause ?? string.Join(" · ", quest?.iso ?? Array.Empty<string>()),
                Title = action?.title ?? quest?.title ?? "Exploration libre",
                Verb = VerbFor(action, phase, activity),
                Instruction = activity == null ? InstructionFor(phase, person) : ActivityGuideV244.Instruction(activity),
                Validation = activity == null ? ValidationFor(phase) : ActivityGuideV244.Success(activity),
                Completion = activity?.outro ?? quest?.completion, NextId = nextId,
                NextLabel = nextLabel ?? (phase == ObjectivePhase.Claim ? "Suivre la nouvelle mission principale." : null),
                Finished = quest == null ? 0 : campaign.QuestState(quest.id)?.completedObjectives.Length ?? 0,
                Total = quest?.actionIds.Length ?? 0
            };
        }

        string BlockReason(QuestDefinition quest)
        {
            var prior = quest.prerequisites.FirstOrDefault(id => campaign.QuestState(id)?.claimed != true);
            if (prior != null)
                return "Termine d’abord « " + (campaign.Data.quests.FirstOrDefault(q => q.id == prior)?.title ?? prior) + " ».";
            if (campaign.QuestState(quest.id)?.status == QuestStatus.REPLACED)
                return "Le référent est indisponible. Ouvre l’enquête liée à la mission.";
            foreach (string id in quest.actionIds)
            {
                if (campaign.State.completedActions.Contains(id)) continue;
                if (!campaign.CanExecute(campaign.FindAction(id), out string reason, true)) return reason;
            }
            return campaign.QuestValidationIssues(quest).FirstOrDefault() ??
                "Rejoins " + campaign.CharacterName(quest.giverId) + " après l’ouverture de l’acte.";
        }

        internal static string VerbFor(ActionDefinition action, ObjectivePhase phase, ActivityDefinitionV17 activity)
        {
            if (phase == ObjectivePhase.Validate) return "Valider";
            if (phase == ObjectivePhase.Claim) return "Réclamer";
            if (phase == ObjectivePhase.Offer) return "Parler";
            if (phase == ObjectivePhase.Travel) return "Rejoindre";
            if (activity?.mode == "assemble") return "Assembler";
            if (action?.interactionType == "Inspection") return "Inspecter";
            if (action?.interactionType == "Document") return "Consulter";
            if (!string.IsNullOrEmpty(action?.dialogueId)) return "Parler";
            return "Réaliser";
        }

        static string InstructionFor(ObjectivePhase phase, string person)
        {
            if (phase == ObjectivePhase.Offer) return "Parle à " + person + " et accepte la mission.";
            if (phase == ObjectivePhase.Validate) return "Présente les preuves à " + person + " et fais vérifier le résultat.";
            if (phase == ObjectivePhase.Claim) return "Retourne voir " + person + " pour recevoir la récompense.";
            if (phase == ObjectivePhase.Travel) return "Rejoins le point indiqué sur la carte.";
            return "Interagis au lieu indiqué pour lancer l’action.";
        }

        static string ValidationFor(ObjectivePhase phase) => phase switch {
            ObjectivePhase.Offer => "Accepter la mission dans le dialogue.",
            ObjectivePhase.Validate => "Faire vérifier les actions et les preuves de la mission.",
            ObjectivePhase.Claim => "Réclamer la récompense une seule fois auprès du référent.",
            ObjectivePhase.Travel => "Atteindre le point d’interaction.",
            _ => "Terminer l’action et conserver le résultat dans le Carnet des Crânes."
        };
    }
}
