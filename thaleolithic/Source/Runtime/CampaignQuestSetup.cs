using System;
using System.Linq;
using System.Collections.Generic;
namespace UngaBunga45001
{
    public sealed partial class CampaignRuntime
    {
        void PreparePhysicalQuestActions()
        {
            var intro=Data.actions.First(a=>a.id=="M_I_TUTORIEL_1");intro.dialogueId="V5_DYLAN_INTRO";
            var additions=new List<ActionDefinition>();
            foreach(var q in Data.quests.Where(q=>q.required&&!string.IsNullOrEmpty(q.riskId)))
            {
                // Decisions only select a strategy. Physical work and a later control enact it.
                var final=FindAction(q.actionIds.Last());var decision=q.actionIds.Select(FindAction).FirstOrDefault(a=>!string.IsNullOrEmpty(a.dialogueId)&&Data.dialogues.Any(d=>d.id==a.dialogueId&&d.choices.Length>1));
                if(decision==null||final==null)continue;
                foreach(var d in Data.dialogues.Where(d=>d.id==decision.dialogueId||d.id.StartsWith(decision.dialogueId+"_",StringComparison.Ordinal)))foreach(var c in d.choices)foreach(var e in c.effects)
                {if(e.kind=="risk"&&e.target==q.riskId&&e.value==0)e.value=1;if(e.kind=="flag"&&e.target=="effective:"+q.id)e.target="decision:"+q.id;}
                string id="WORK_"+q.id,binding=string.IsNullOrEmpty(q.buildingId)?"safety_"+q.riskId:q.buildingId;
                var work=new ActionDefinition{id=id,title="Réaliser les mesures et réorganiser le poste",actId=decision.actId,targetBindingId=decision.targetBindingId,durationSeconds=8,requiredFlags=new[]{"done:"+decision.id},costs=new[]{new CostDefinition{id="wood",amount=2},new CostDefinition{id="stone",amount=1}},effects=new[]{new EffectDefinition{kind="flag",target="done:"+id,value=1},new EffectDefinition{kind="flag",target="measure:"+q.id,value=1},new EffectDefinition{kind="flag",target=q.verificationFlag,value=0},new EffectDefinition{kind="building",target=binding,value=1},new EffectDefinition{kind="risk",target=q.riskId,value=1}}};
                additions.Add(work);q.actionIds=q.actionIds.Take(q.actionIds.Length-1).Concat(new[]{id,final.id}).ToArray();
                final.requiredFlags=final.requiredFlags.Concat(new[]{"measure:"+q.id}).Distinct().ToArray();final.repeatable=true;
                final.effects=final.effects.Concat(new[]{new EffectDefinition{kind="risk",target=q.riskId,value=0},new EffectDefinition{kind="flag",target="effective:"+q.id,value=1},new EffectDefinition{kind="flag",target=q.verificationFlag,value=1}}).ToArray();
            }
            Data.actions=Data.actions.Concat(additions).ToArray();
        }
    }
}
