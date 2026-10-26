using System;
using UnityEngine;
namespace UngaBunga45001
{
    public enum QuestStatus { LOCKED,AVAILABLE,OFFERED,ACCEPTED,IN_PROGRESS,ACTION_COMPLETED,READY_TO_VALIDATE,READY_TO_CLAIM,COMPLETED,DEFERRED,FAILED,REPLACED }
    [Serializable] public sealed class QuestDefinition
    {
        public string id,title,giverId,actId,description,tip,completion,goalId,riskId,buildingId,verificationFlag;
        public bool required=true;public int buildingStage;
        public string[] actionIds=Array.Empty<string>(),prerequisites=Array.Empty<string>(),iso=Array.Empty<string>(),requiredFlags=Array.Empty<string>();
        public QuestReward[] rewards=Array.Empty<QuestReward>();
    }
    [Serializable] public sealed class QuestReward { public string kind,id,name,description;public float amount; }
    [Serializable] public sealed class QuestRecord
    {
        public string id,replacementId="";public QuestStatus status;public bool accepted,validated,claimed;public int refusals;
        public float acceptedAt,validatedAt,claimedAt;public string[] completedObjectives=Array.Empty<string>();
    }
    [Serializable] public sealed class ISOProgress { public string id;public int level; }
    [Serializable] public sealed class QuestCatalog
    {
        public QuestDefinition[] quests=Array.Empty<QuestDefinition>();public ActionDefinition[] actions=Array.Empty<ActionDefinition>();
        public DialogueDefinition[] dialogues=Array.Empty<DialogueDefinition>();public AccidentDefinition[] accidents=Array.Empty<AccidentDefinition>();
        public CharacterDefinition[] characters=Array.Empty<CharacterDefinition>();
    }
    [Serializable] public sealed class AccidentDefinition
    {
        public string id,title,victimId,kind,site,riskId,danger,exposure,warning,immediateCause,organizationalCause,correctiveAction,punchline,reply,speaker;
        public string[] iso=Array.Empty<string>(),requiredFlags=Array.Empty<string>();
    }
    [Serializable] public sealed class AccidentRecord
    {
        public string id,victimId,kind,title,site,decision,warning,immediateCause,organizationalCause,correctiveAction;public string[] iso=Array.Empty<string>();
        public float elapsedSeconds,yaw;public Vector3 position;public bool investigated,playerAttempt;
    }
}
