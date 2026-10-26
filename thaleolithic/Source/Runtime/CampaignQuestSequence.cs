using System;
using System.Linq;
using System.Collections.Generic;
namespace UngaBunga45001
{
 public sealed partial class CampaignRuntime
 {
  void PrepareQuestSequence()
  {
   var gates=new Dictionary<string,string>{{"SIDE_CERCLE","M_IV_FOYER"},{"SIDE_BERGES","M_III_CARRIERE"},{"SIDE_CUISINE","M_IV_FOYER"},{"SIDE_TRANSPORT","M_III_PRIORITES"},{"SIDE_APPRENTISSAGE","M_IV_BOIS"},{"SIDE_COORDINATION","M_II_ROLES"},{"SIDE_MEULE","M_IV_SILEX"},{"SIDE_PEAUX","M_V_ABRI"},{"SIDE_OS","M_V_RESERVES"},{"SIDE_COLLECTE","M_III_DIAGNOSTIC"}};
   foreach(var q in Data.quests)
   {
    string gate=null;if(gates.TryGetValue(q.id,out var authored))gate=authored;
    else if(q.id.StartsWith("KNOWLEDGE_")){int.TryParse(q.id.Substring(10).Split('.')[0],out int chapter);gate=chapter<=4?"M_I_ENQUETE":chapter==5?"M_II_ROLES":chapter==6?"M_III_DIAGNOSTIC":chapter==7?"M_IV_BOIS":chapter==8?"M_V_ABRI":chapter==9?"M_VII_AUDIT":"M_VII_CORRIGER";}
    if(gate!=null)q.prerequisites=q.prerequisites.Concat(new[]{gate}).Distinct().ToArray();
   }
  }
  bool QuestResolved(string id)
  {var r=QuestState(id);return r!=null&&(r.claimed||r.status==QuestStatus.REPLACED&&!string.IsNullOrEmpty(r.replacementId)&&QuestState(r.replacementId)?.claimed==true);}
  bool QuestBaseUnlocked(QuestDefinition q)=>
   (q.actId=="*"||Array.FindIndex(Data.acts,a=>a.id==q.actId)<=State.actIndex)&&q.requiredFlags.All(HasFlag)&&q.prerequisites.All(QuestResolved);
  public QuestDefinition MainQuestFrontier()=>Data.quests.FirstOrDefault(q=>q.required&&!QuestResolved(q.id));
  QuestDefinition OptionalQuestFrontier()
  {
   var eligible=Data.quests.Where(q=>!q.required&&!q.id.StartsWith("investigation:")&&QuestState(q.id)?.claimed!=true&&QuestState(q.id)?.status!=QuestStatus.FAILED&&QuestState(q.id)?.status!=QuestStatus.REPLACED&&QuestBaseUnlocked(q));
   // Resume an existing optional assignment before offering another. Old progress stays in the save.
   return eligible.FirstOrDefault(q=>QuestState(q.id)?.accepted==true)??eligible.FirstOrDefault();
  }
  public bool QuestVisible(QuestDefinition q)
  {var r=QuestState(q.id);return r!=null&&(r.claimed||r.status!=QuestStatus.LOCKED&&(r.status!=QuestStatus.REPLACED||r.accepted));}
  public string[] QuestValidationIssues(QuestDefinition q)
  {
   var issues=new List<string>();foreach(var id in q.actionIds)if(!State.completedActions.Contains(id))issues.Add("À réaliser : "+(FindAction(id)?.title??"objectif de la mission"));
   foreach(var evidence in q.actionIds.Select(FindAction).Where(a=>a!=null).SelectMany(a=>a.effects).Where(e=>e.kind=="evidence"&&e.value>0).Select(e=>e.target).Distinct())if(!State.evidence.Contains(evidence))issues.Add("Preuve manquante : "+evidence);
   if(!string.IsNullOrEmpty(q.riskId)&&Value("risk",q.riskId)>=2)issues.Add("Le risque du poste reste critique.");
   if(!string.IsNullOrEmpty(q.buildingId)&&Value("building",q.buildingId)<q.buildingStage)issues.Add("Les travaux physiques ne sont pas achevés.");
   if(!string.IsNullOrEmpty(q.verificationFlag)&&!HasFlag(q.verificationFlag))issues.Add("Le contrôle d’efficacité reste à réaliser.");
   return issues.ToArray();
  }
 }
}
