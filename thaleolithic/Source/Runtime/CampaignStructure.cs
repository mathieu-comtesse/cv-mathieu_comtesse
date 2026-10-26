using System;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 public sealed partial class CampaignRuntime
 {
  public bool StructureProtected=>HasFlag("structure:accessClosed")||HasFlag("verified:M_V_ABRI")&&Value("risk","abri")==0;
  NavMeshObstacle structuralClosure;
  void PrepareStructuralPrevention()
  {
   var q=Data.quests.First(x=>x.id=="M_V_ABRI");var actions=Data.actions.ToList();
   ActionDefinition Step(string id,string title,string target,string previous,float duration,EffectDefinition[] extra=null)
   {var a=new ActionDefinition{id=id,title=title,targetBindingId=target,actId="ACTE_V",durationSeconds=duration,requiredFlags=new[]{"done:"+previous},effects=new[]{new EffectDefinition{kind="flag",target="done:"+id,value=1},new EffectDefinition{kind="evidence",target=id,value=1}}.Concat(extra??Array.Empty<EffectDefinition>()).ToArray()};actions.Add(a);return a;}
   Step("STRUCTURE_ALERT","Alerter Aurélien sur les signaux de faiblesse","aurelien","M_V_ABRI_1",3);
   Step("STRUCTURE_CONSULT","Consulter Uma sur les occupants et les charges","uma","STRUCTURE_ALERT",3);
   Step("STRUCTURE_INSPECT","Inspecter les appuis, les liens et la toiture","habitations","STRUCTURE_CONSULT",5);
   var decision=actions.First(a=>a.id=="M_V_ABRI_2");decision.requiredFlags=decision.requiredFlags.Concat(new[]{"done:STRUCTURE_INSPECT"}).Distinct().ToArray();
   var close=Step("STRUCTURE_RESTRICT","Interdire l’accès avant les travaux","habitations","M_V_ABRI_2",3,new[]{new EffectDefinition{kind="flag",target="structure:accessClosed",value=1}});close.requiredFlags=close.requiredFlags.Concat(new[]{"choice:D_ABRI_C"}).ToArray();
   var work=actions.First(a=>a.id=="WORK_M_V_ABRI");work.title="Reprendre les appuis et poser les renforts";work.durationSeconds=12;work.requiredFlags=work.requiredFlags.Concat(new[]{"choice:D_ABRI_C","done:STRUCTURE_RESTRICT","structure:accessClosed"}).ToArray();
   q.actionIds=new[]{"M_V_ABRI_1","STRUCTURE_ALERT","STRUCTURE_CONSULT","STRUCTURE_INSPECT","M_V_ABRI_2","STRUCTURE_RESTRICT",work.id,"M_V_ABRI_3"};
   // An inadequate strategy must be revised explicitly, rather than passing the final control automatically.
   actions.Add(new ActionDefinition{id="STRUCTURE_REPLAN",title="Revoir la méthode de stabilisation avec Georges",actId="ACTE_V",targetBindingId="georges",dialogueId="D_ABRI",repeatable=true,requiredFlags=new[]{"done:M_V_ABRI_2"},effects=Array.Empty<EffectDefinition>()});
   foreach(var d in Data.dialogues.Where(d=>d.id=="D_ABRI"))foreach(var choice in d.choices)
    choice.effects=choice.effects.Concat(new[]{new EffectDefinition{kind="flag",target="structure:accessClosed",value=choice.id=="D_ABRI_C"?1:0},new EffectDefinition{kind="flag",target="structure:provisional",value=choice.id=="D_ABRI_B"?1:0}}).ToArray();
   Data.actions=actions.ToArray();
   var facts=new ActionDefinition{id="STRUCTURE_FACTS",title="Consigner les faits et les assemblages rompus",actId="*",targetBindingId="habitations",durationSeconds=4,requiredFlags=new[]{"incident:structure"},effects=new[]{new EffectDefinition{kind="flag",target="done:STRUCTURE_FACTS",value=1},new EffectDefinition{kind="evidence",target="structure:facts",value=1}}};
   var causes=new ActionDefinition{id="STRUCTURE_CAUSES",title="Analyser les alertes ignorées et les décisions avec Mathieu",actId="*",targetBindingId="mathieu",durationSeconds=4,requiredFlags=new[]{"done:STRUCTURE_FACTS"},effects=new[]{new EffectDefinition{kind="flag",target="done:STRUCTURE_CAUSES",value=1},new EffectDefinition{kind="evidence",target="structure:causes",value=1}}};
   var findings=new ActionDefinition{id="STRUCTURE_FINDINGS",title="Consigner les corrections et le contrôle d’efficacité",actId="*",targetBindingId="mathieu",durationSeconds=3,requiredFlags=new[]{"done:STRUCTURE_CAUSES","verified:M_V_ABRI"},effects=new[]{new EffectDefinition{kind="flag",target="done:STRUCTURE_FINDINGS",value=1},new EffectDefinition{kind="flag",target="verified:structureInvestigation",value=1},new EffectDefinition{kind="evidence",target="structure:findings",value=1}}};
   Data.actions=Data.actions.Concat(new[]{facts,causes,findings}).ToArray();Data.quests=Data.quests.Concat(new[]{new QuestDefinition{id="investigation:structure",title="LA CHARPENTE AVAIT PRÉVENU",giverId="mathieu",actId="*",required=false,requiredFlags=new[]{"incident:structure"},description="L’incident n’a pas fait de victime. Reconstitue les faits, les alertes et la décision de maintenir une réparation provisoire. Les renforts doivent traiter la cause puis être vérifiés.",tip="Une réparation n’efface pas la décision qui a laissé le risque ouvert.",completion="Les faits, les causes et le contrôle des travaux sont conservés.",actionIds=new[]{facts.id,causes.id,work.id,"M_V_ABRI_3",findings.id},iso=new[]{"8.1.3","10.2"},verificationFlag="verified:structureInvestigation",rewards=new[]{new QuestReward{kind="knowledge",id="knowledge",name="Fragments de savoir",amount=3},new QuestReward{kind="evidence",id="structure:report",name="Enquête de charpente vérifiée",amount=1}}}}).ToArray();
  }
  void ApplyStructuralOutcome(ActionDefinition action)
  {
   if(action.id=="STRUCTURE_RESTRICT")RefreshStructuralClosure();
   if(action.id=="WORK_M_V_ABRI")foreach(var h in FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).Where(h=>h.site=="habitations"))h.Reinforce();
   if(action.id=="M_V_ABRI_2"&&HasFlag("structure:provisional"))
   {var h=FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).Where(x=>x.site=="habitations").OrderBy(x=>Vector3.Distance(x.transform.position,bindings.Find("habitations").position)).FirstOrDefault();h?.BeginFailure("Réparation provisoire autorisée sans évaluation de l’assemblage.");}
   if(action.id=="M_V_ABRI_3"||action.id=="INV_uma_3")
   {foreach(var h in FindObjectsByType<HutCollapse>(FindObjectsInactive.Include,FindObjectsSortMode.None).Where(h=>h.site=="habitations"))h.Repair();Apply(new EffectDefinition{kind="flag",target="structure:accessClosed",value=0});if(action.id=="INV_uma_3"){foreach(var incident in State.accidents.Where(a=>a.kind=="hut"))incident.investigated=true;Apply(new EffectDefinition{kind="building",target="habitations",value=2});}RefreshStructuralClosure();}
  }
  bool StructuralCondition(ActionDefinition action,out string reason)
  {reason="";if(action.id=="WORK_M_V_ABRI"&&HasFlag("incident:structure")&&!HasFlag("done:STRUCTURE_CAUSES")){reason="Avant de reconstruire, examine les débris puis analyse les causes avec Mathieu.";return false;}return true;}
  void RefreshStructuralClosure()
  {
   if(structuralClosure==null&&!HasFlag("structure:accessClosed"))return;
   if(structuralClosure==null){var go=new GameObject("Accès à la charpente suspendu");go.transform.SetParent(transform,false);go.transform.position=bindings.Find("habitations").position+Vector3.up;structuralClosure=go.AddComponent<NavMeshObstacle>();structuralClosure.shape=NavMeshObstacleShape.Box;structuralClosure.size=new Vector3(5.6f,2,5.6f);structuralClosure.carving=true;structuralClosure.carveOnlyStationary=false;}
   structuralClosure.enabled=HasFlag("structure:accessClosed");GetComponent<VillageNavigation>()?.RequestRebuild();GetComponent<QuestNavigationController>()?.ForceRefresh();
  }
 }
}
