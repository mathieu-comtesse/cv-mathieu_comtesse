using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class TribalTaskRuntime:MonoBehaviour
    {
        CampaignRuntime campaign;
        void Awake(){campaign=GetComponent<CampaignRuntime>();}
        public static bool Terminal(TribalTaskState task)=>task.status=="done"||task.status=="cancelled"||task.status=="failed";
        public TribalTaskState Current(string worker)=>campaign.State?.tribalTasks?.FirstOrDefault(t=>t.workerId==worker&&!Terminal(t));
        public bool Handle(VillagerBrain brain,float elapsed)
        {
            var task=Current(brain.id);if(task==null)return false;
            if(!campaign.CanAssignTask(brain.id,task.actionId,out string reason)){task.status="blocked";task.reason=reason;brain.CancelAssignedWork();return true;}
            var action=campaign.FindAction(task.actionId);var target=campaign.bindings.Find(action.targetBindingId);
            if(!brain.AssignedWorkStep(target.position,action.effects.Any(e=>e.kind=="building")?"Work":"Gather")){task.status="moving";task.reason=brain.BlockedReason;return true;}
            task.status="working";task.reason="";task.workedSeconds=Mathf.Min(task.duration,task.workedSeconds+elapsed);
            if(task.workedSeconds>=task.duration&&!campaign.CommitVillagerTask(task.id,out reason)){task.status="blocked";task.reason=reason;}
            return true;
        }
        void Update()
        {
            if(campaign?.State?.tribalTasks==null)return;bool changed=false;
            foreach(var task in campaign.State.tribalTasks.Where(t=>!Terminal(t)))if(campaign.State.characters.FirstOrDefault(c=>c.id==task.workerId)?.alive!=true){task.status="failed";task.reason="Le membre n’est plus disponible.";changed=true;}
            if(changed){campaign.Save();campaign.NotifyTribalChange();}
        }
    }
}
