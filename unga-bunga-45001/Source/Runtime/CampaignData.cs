using System;
using UnityEngine;

namespace UngaBunga45001
{
    // JsonUtility deliberately uses arrays and public fields; no dictionaries or polymorphic payloads.
    [Serializable] public sealed class CampaignData
    {
        public int schemaVersion = 1;
        public string id, title;
        public string playerCharacterId="dylan";
        public float durationSeconds = 2700;
        public CharacterDefinition[] characters = Array.Empty<CharacterDefinition>();
        public ValueDefinition[] stats = Array.Empty<ValueDefinition>(), resources = Array.Empty<ValueDefinition>();
        public ActDefinition[] acts = Array.Empty<ActDefinition>();
        public ActionDefinition[] actions = Array.Empty<ActionDefinition>();
        public DialogueDefinition[] dialogues = Array.Empty<DialogueDefinition>();
        public CinematicDefinition[] cinematics = Array.Empty<CinematicDefinition>();
        public EndingDefinition[] endings = Array.Empty<EndingDefinition>();
        public SourceQuote[] sourceQuotes = Array.Empty<SourceQuote>();
        public QuestDefinition[] quests = Array.Empty<QuestDefinition>();
    }
    [Serializable] public sealed class CharacterDefinition { public string id, name, role; }
    [Serializable] public sealed class SourceQuote { public string id, speakerId, text, actId; public int sourceLine; }
    [Serializable] public sealed class ValueDefinition { public string id; public float value, min, max = 100; }
    [Serializable] public sealed class ActDefinition
    {
        public string id, title, introCinematicId, exitCinematicId;
        public float durationSeconds;
        public ObjectiveDefinition[] objectives = Array.Empty<ObjectiveDefinition>();
    }
    [Serializable] public sealed class ObjectiveDefinition
    {
        public string id, title, reference;
        public bool required = true;
        public string[] actionIds = Array.Empty<string>();
    }
    [Serializable] public sealed class ActionDefinition
    {
        public string id, title, actId, targetBindingId, dialogueId, cinematicId, reference;
        public float durationSeconds;
        public bool dangerous, repeatable;
        public float minimumCompetence;
        public string[] requiredFlags = Array.Empty<string>(), forbiddenFlags = Array.Empty<string>();
        public CostDefinition[] costs = Array.Empty<CostDefinition>();
        public EffectDefinition[] effects = Array.Empty<EffectDefinition>();
    }
    [Serializable] public sealed class CostDefinition { public string id; public float amount; }
    [Serializable] public sealed class EffectDefinition { public string kind, target, operation, text; public float value; public string[] requiredFlags = Array.Empty<string>(), forbiddenFlags = Array.Empty<string>(); }
    [Serializable] public sealed class DialogueDefinition
    {
        public string id, speaker, text;
        public ChoiceDefinition[] choices = Array.Empty<ChoiceDefinition>();
    }
    [Serializable] public sealed class ChoiceDefinition
    {
        public string id, text, nextDialogueId, actionId;
        public string[] requiredFlags = Array.Empty<string>();
        public EffectDefinition[] effects = Array.Empty<EffectDefinition>();
    }
    [Serializable] public sealed class CinematicDefinition
    {
        public string id, title, summary;
        public float durationSeconds;
        public ShotDefinition[] shots = Array.Empty<ShotDefinition>();
    }
    [Serializable] public sealed class ShotDefinition
    {
        public string cameraBindingId, lookAtBindingId, subtitle, speaker, animationTrigger, actorBindingId;
        public float durationSeconds;
    }
    [Serializable] public sealed class EndingDefinition
    {
        public string id, title, text;
        public int priority;
        public string[] requiredFlags = Array.Empty<string>(), forbiddenFlags = Array.Empty<string>();
    }
    [Serializable] public sealed class NamedValue { public string id; public float value; public NamedValue(string key, float number) { id = key; value = number; } }
    [Serializable] public sealed class CharacterState
    {
        public string id, assignment = "", health = "disponible";
        public bool alive = true, available = true;
        public float life = 100, energy = 100, fatigue, competence, trust = 25;
        public float hunger=20,morale=60,yaw,taskTimer; public int taskPhase,taskTurn;
        public string behaviour="IDLE";public Vector3 position,destination;public bool positionSaved;
    }
    [Serializable] public sealed class DecisionRecord { public string id, text, consequence; public float elapsedSeconds; }
    [Serializable] public sealed class CampaignSave
    {
        public int version = 1, actIndex;
        public MenhirProgress menhir=new MenhirProgress();
        public string campaignId, endingId;
        public string trackedActionId="",equippedItem="";public int inventorySlot;public int trackedActionHistoryIndex=-1;
        public bool playerPositionSaved,playerCrouching;public Vector3 playerPosition;public float playerYaw;
        public System.Collections.Generic.List<string> viewedCinematics=new System.Collections.Generic.List<string>();
        public float elapsedSeconds;
        public System.Collections.Generic.List<string> flags = new System.Collections.Generic.List<string>();
        public System.Collections.Generic.List<string> completedActions = new System.Collections.Generic.List<string>();
        public System.Collections.Generic.List<string> evidence = new System.Collections.Generic.List<string>();
        public System.Collections.Generic.List<NamedValue> stats = new System.Collections.Generic.List<NamedValue>();
        public System.Collections.Generic.List<NamedValue> resources = new System.Collections.Generic.List<NamedValue>();
        public System.Collections.Generic.List<NamedValue> risks = new System.Collections.Generic.List<NamedValue>();
        public System.Collections.Generic.List<NamedValue> buildings = new System.Collections.Generic.List<NamedValue>();
        public System.Collections.Generic.List<CharacterState> characters = new System.Collections.Generic.List<CharacterState>();
        public System.Collections.Generic.List<DecisionRecord> history = new System.Collections.Generic.List<DecisionRecord>();
        public int questSchema;
        public string trackedQuestId="", decisionCheckpoint="";
        public System.Collections.Generic.List<QuestRecord> quests=new System.Collections.Generic.List<QuestRecord>();
        public System.Collections.Generic.List<string> rewardReceipts=new System.Collections.Generic.List<string>(),viewedDialogues=new System.Collections.Generic.List<string>(),technologies=new System.Collections.Generic.List<string>();
        public System.Collections.Generic.List<ISOProgress> knowledge=new System.Collections.Generic.List<ISOProgress>();
        public System.Collections.Generic.List<AccidentRecord> accidents=new System.Collections.Generic.List<AccidentRecord>();
        public System.Collections.Generic.List<TribalContainerState> containers=new System.Collections.Generic.List<TribalContainerState>();
        public System.Collections.Generic.List<TribalTaskState> tribalTasks=new System.Collections.Generic.List<TribalTaskState>();
        public System.Collections.Generic.List<HutFailureRecord> hutFailures=new System.Collections.Generic.List<HutFailureRecord>();
    }
}
