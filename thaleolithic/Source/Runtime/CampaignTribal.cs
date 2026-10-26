using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class CampaignRuntime
    {
        static readonly string[] transferable={"wood","stone","flint","fiber","food","tool"};
        void PrepareTribalActions()
        {
            var actions=Data.actions.ToList();
            void Production(string id,string title,string site,string resource,float seconds,float skill)
            {if(actions.Any(a=>a.id==id))return;actions.Add(new ActionDefinition{id=id,title=title,actId="*",targetBindingId=site,durationSeconds=seconds,minimumCompetence=skill,repeatable=true,effects=new[]{new EffectDefinition{kind="resource",target=resource,operation="add",value=1}}});}
            Production("work:wood","Collecter du bois","bois_construction","wood",12,15);
            Production("work:stone","Extraire de la pierre","pierre_carriere","stone",14,25);
            Production("work:fiber","Collecter des fibres","stockage","fiber",10,10);
            Production("work:food","Préparer des provisions","foyer","food",12,15);
            Data.actions=actions.ToArray();
        }
        void InitializeTribalState(){State.containers??=new List<TribalContainerState>();State.tribalTasks??=new List<TribalTaskState>();foreach(var container in State.containers)container.items??=new List<NamedValue>();}
        public TribalContainerState Container(string id)
        {if(State==null||id!="stockage"||bindings.Find(id)==null)return null;InitializeTribalState();var data=State.containers.FirstOrDefault(c=>c.id==id);if(data==null){data=new TribalContainerState{id=id};State.containers.Add(data);}return data;}
        public float Stored(string container,string item)=>Container(container)?.items.FirstOrDefault(i=>i.id==item)?.value??0;
        public bool TransferInventory(string containerId,string itemId,float requested,bool deposit,bool all,out string reason)
        {
            reason="";var container=Container(containerId);if(container==null||!Near(containerId)){reason="Rejoins les réserves pour transférer des objets.";return false;}
            if(IsBusy||IncidentModal||Ending!=null){reason="Termine l’intervention en cours.";return false;}
            if(!all&&(!transferable.Contains(itemId)||float.IsNaN(requested)||float.IsInfinity(requested)||requested<=0)){reason="Cet objet ne peut pas être transféré.";return false;}
            var before=JsonUtility.ToJson(State);bool changed=false;
            foreach(string id in all?transferable:new[]{itemId})
            {
                float available=deposit?Value("resource",id):Stored(containerId,id);float amount=all?available:Mathf.Min(available,requested);if(amount<=0)continue;
                var value=container.items.FirstOrDefault(i=>i.id==id);if(value==null){value=new NamedValue(id,0);container.items.Add(value);}value.value+=deposit?amount:-amount;
                Apply(new EffectDefinition{kind="resource",target=id,operation="add",value=deposit?-amount:amount});changed=true;
            }
            if(deposit&&Value("resource","tool")<=0)State.equippedItem="";
            if(!changed){reason="Aucun objet disponible pour ce transfert.";return false;}
            Record("inventory:transfer",deposit?"Objets déposés aux réserves":"Objets récupérés aux réserves","Le contenu du sac disponible et du conteneur a été mis à jour.");
            if(!TrySave(SavePath)){State=JsonUtility.FromJson<CampaignSave>(before);reason="Le transfert n’a pas été enregistré.";Notify();return false;}Notify();return true;
        }
        void ApplyActionOutcome(ActionDefinition action,string worker=null)
        {
            foreach(var cost in action.costs)Apply(new EffectDefinition{kind="resource",target=cost.id,operation="add",value=-cost.amount});
            foreach(var effect in action.effects)Apply(effect);
            if(!State.completedActions.Contains(action.id))State.completedActions.Add(action.id);
            if(!string.IsNullOrEmpty(action.reference)&&!State.evidence.Contains(action.reference))State.evidence.Add(action.reference);
            Record(action.id,action.title,worker==null?"Action réalisée et conséquences enregistrées.":"Action réalisée sur place par "+CharacterName(worker)+".");
            ApplyStructuralOutcome(action);
        }
        public bool CanAssignTask(string worker,string actionId,out string reason)
        {
            reason="";if(Ending!=null||IncidentModal){reason="Une intervention est en cours.";return false;}var member=State?.characters.FirstOrDefault(c=>c.id==worker);var action=Data?.actions.FirstOrDefault(a=>a.id==actionId);
            if(member==null||!member.alive||!member.available||worker==Data.playerCharacterId){reason="Ce membre ne peut pas recevoir cette tâche.";return false;}
            if(member.life<50){reason="Ce membre doit d’abord recevoir des soins.";return false;}
            if(action==null||bindings.Find(action.targetBindingId)==null){reason="Cette activité ne possède pas de poste de travail accessible.";return false;}
            if(!string.IsNullOrEmpty(action.dialogueId)||!string.IsNullOrEmpty(action.cinematicId)||action.dangerous||action.effects.Any(e=>e.kind=="accident"||e.kind=="character"&&e.target.EndsWith(".alive")&&e.value<=0)){reason="Cette intervention nécessite Dylan et une décision explicite.";return false;}
            return CanExecute(action,out reason,true,worker);
        }
        public bool QueueTask(string worker,string actionId,out string reason)
        {
            InitializeTribalState();if(!CanAssignTask(worker,actionId,out reason))return false;
            if(State.tribalTasks.Count(t=>t.workerId==worker&&!TribalTaskRuntime.Terminal(t))>=3){reason="Ce membre possède déjà trois tâches en attente.";return false;}
            var action=FindAction(actionId);State.tribalTasks.Add(new TribalTaskState{id=Guid.NewGuid().ToString("N"),workerId=worker,actionId=actionId,duration=action.durationSeconds,createdAt=State.elapsedSeconds});
            Save();Notify();return true;
        }
        public bool CancelTask(string taskId)
        {
            var task=State?.tribalTasks?.FirstOrDefault(t=>t.id==taskId);if(task==null||TribalTaskRuntime.Terminal(task))return false;task.status="cancelled";task.reason="Annulée avant attribution du résultat.";
            bindings.Find(task.workerId)?.GetComponent<VillagerBrain>()?.CancelAssignedWork();Save();Notify();return true;
        }
        public bool CommitVillagerTask(string taskId,out string reason)
        {
            InitializeTribalState();var task=State.tribalTasks.FirstOrDefault(t=>t.id==taskId);reason="";
            if(task==null||task.status!="working"||task.workedSeconds<task.duration||!CanAssignTask(task.workerId,task.actionId,out reason))return false;
            var action=FindAction(task.actionId);var worker=bindings.Find(task.workerId);var site=bindings.Find(action.targetBindingId);
            if(worker==null||Vector3.Distance(worker.position,site.position)>3.75f){reason="Le membre doit travailler sur place.";return false;}
            var before=JsonUtility.ToJson(State);task.status="done";task.reason="";ApplyActionOutcome(action,task.workerId);
            if(!TrySave(SavePath)){State=JsonUtility.FromJson<CampaignSave>(before);reason="La tâche n’a pas été enregistrée.";return false;}SyncWorld();Notify();return true;
        }
        public void NotifyTribalChange(){Notify();}
    }
}
