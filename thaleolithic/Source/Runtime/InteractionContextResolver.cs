using System;
using System.Linq;
namespace UngaBunga45001
{
    public enum InteractionKind { MainQuest,Conversation,Inspection,Document,Context,Locked }
    public sealed class InteractionContext
    {
        public InteractionKind kind;public string heading,title,detail,icon;public bool available;public int priority;
    }
    public static class InteractionContextResolver
    {
        public static InteractionContext Resolve(CampaignRuntime c,ActionDefinition a)
        {
            bool available=c.CanExecute(a,out string reason,true);var q=c.QuestFor(a);
            if(q==null&&a.id.StartsWith("quest:"))q=c.Data.quests.FirstOrDefault(x=>a.id.EndsWith(":"+x.id,StringComparison.Ordinal));
            var step=c.Objectives.Main;
            bool main=step?.Action?.id==a.id;
            var activity=c.ActivitiesV17?.activities.FirstOrDefault(candidate=>candidate.id==a.id);
            string verb=main?step.Verb:QuestObjectiveResolver.VerbFor(a,ObjectivePhase.Interact,activity);
            var r=new InteractionContext{available=available,title=a.title,kind=main?InteractionKind.MainQuest:a.interactionType=="Document"?InteractionKind.Document:a.id.StartsWith("SOURCE_TALK_")?InteractionKind.Conversation:a.interactionType=="Inspection"?InteractionKind.Inspection:InteractionKind.Context};
            r.priority=main?0:r.kind==InteractionKind.Conversation?1:r.kind==InteractionKind.Document?2:3;
            switch(r.kind)
            {
                case InteractionKind.MainQuest:r.heading="MISSION PRINCIPALE · "+verb.ToUpperInvariant();r.icon="quest";r.detail=step.Site+" · "+step.Finished+"/"+step.Total+" objectifs";break;
                case InteractionKind.Conversation:r.heading="PARLER · FACULTATIF";r.icon="talk";r.detail="Conversation libre avec "+c.CharacterName(a.targetBindingId);break;
                case InteractionKind.Document:r.heading="CONSULTER";r.icon="book";r.detail="Ouvrir le registre et lire les faits enregistrés";break;
                case InteractionKind.Inspection:r.heading="INSPECTER";r.icon="inspect";r.detail="Observer sur place et enregistrer le constat";break;
                default:r.heading=(q?.required==false?"QUÊTE SECONDAIRE · ":"")+verb.ToUpperInvariant();r.icon=q?.required==false?"quest":"tool";r.detail=activity!=null?ActivityGuideV244.Success(activity):QuestGuidanceV243.Site(c,a.targetBindingId);break;
            }
            if(!available){r.kind=InteractionKind.Locked;r.heading="INDISPONIBLE";r.icon="lock";r.detail=reason;r.priority+=10;}
            return r;
        }
    }
    public sealed partial class CampaignRuntime
    {
        void PrepareInteractionActions()
        {
            foreach(var a in Data.actions)
            {if(a.title?.StartsWith("Examiner",StringComparison.OrdinalIgnoreCase)==true||a.title?.StartsWith("Inspecter",StringComparison.OrdinalIgnoreCase)==true||a.title?.StartsWith("Observer",StringComparison.OrdinalIgnoreCase)==true)a.interactionType="Inspection";}
            foreach(var a in Data.actions.Where(x=>x.id.StartsWith("SOURCE_TALK_")))a.title="Discuter avec "+(Data.characters.FirstOrDefault(x=>x.id==a.targetBindingId)?.name??"un habitant");
            Data.actions=Data.actions.Concat(new[]{new ActionDefinition{id="DOCUMENT_CARE",title="Consulter les registres de soins",targetBindingId="mathilde",actId="*",repeatable=true,interactionType="Document"}}).ToArray();
            var introduction=Data.actions.FirstOrDefault(a=>a.id=="M_I_TUTORIEL_3");if(introduction!=null)introduction.title="Interroger Mathilde sur les premiers dangers";
        }
        void OpenCareRegister()
        {
            ConversationActorId="mathilde";
            string patients=string.Join("\n",State.characters.Where(c=>c.life<100||!c.alive).Select(c=>CharacterName(c.id)+" · "+(c.alive?c.health+" · vie "+c.life.ToString("0")+"/100":"décédé")));
            string incidents=string.Join("\n",State.accidents.Select(a=>a.id));
            Dialogue=new DialogueDefinition{id="document:care",speaker="REGISTRE DES SOINS",text="Source : état enregistré du village et registre des incidents.\n\nPERSONNES PRISES EN COMPTE\n"+(patients.Length>0?patients:"Aucune atteinte enregistrée à cet instant.")+"\n\nINCIDENTS ENREGISTRÉS\n"+(incidents.Length>0?incidents:"Aucun incident enregistré dans ce registre.")+"\n\nLimite : l’absence de trace médicale ne prouve pas l’absence de danger structurel. Ce registre ne conclut pas sur les causes de l’effondrement.",choices=new[]{new ChoiceDefinition{id="interaction:cancel",text="Fermer le registre"}}};Notify();
        }
    }
}
