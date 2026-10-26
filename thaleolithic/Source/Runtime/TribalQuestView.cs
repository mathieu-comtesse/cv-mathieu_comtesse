using System;
using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed partial class TribalInterface
 {
  bool questDetail;readonly string[] questFilters={"Principales","Secondaires","Prévention","Enquêtes","Ateliers","Améliorations","Terminées"};
  bool QuestInCategory(QuestDefinition q)
  {
   if(!campaign.QuestVisible(q))return false;var r=campaign.QuestState(q.id);if(questCategory=="Terminées")return r.claimed;if(r.claimed)return false;
   switch(questCategory){case "Principales":return q.required;case "Secondaires":return !q.required&&!q.id.StartsWith("KNOWLEDGE_")&&!q.id.StartsWith("investigation:");case "Prévention":return q.iso.Length>0;case "Enquêtes":return q.id.StartsWith("investigation:");case "Ateliers":return !string.IsNullOrEmpty(q.buildingId)||q.actionIds.Select(campaign.FindAction).Any(a=>a!=null&&a.costs.Length>0);case "Améliorations":return q.iso.Any(i=>i=="10"||i.StartsWith("10."));default:return true;}
  }
  string QuestStatusName(QuestRecord r)=>r==null?"Indisponible":r.status switch{QuestStatus.LOCKED=>"Verrouillée",QuestStatus.AVAILABLE=>"Disponible",QuestStatus.OFFERED=>"Proposée",QuestStatus.DEFERRED=>"Reportée",QuestStatus.ACTION_COMPLETED=>"Objectifs réalisés · contrôle requis",QuestStatus.READY_TO_VALIDATE=>"En attente de validation",QuestStatus.READY_TO_CLAIM=>"Récompenses à récupérer",QuestStatus.COMPLETED=>"Terminée",QuestStatus.REPLACED=>"Remplacée par une enquête",QuestStatus.FAILED=>"Échec · voir l’enquête",_=>"En cours"};
  void QuestBlock(RectTransform list,string heading,string text,Color color)
  {
   float width=list.rect.width;var row=TribalStyle.Row(list,heading,100);TribalStyle.Panel(row,left:new Color(.018f,.014f,.031f,.8f));Label(row,"Rubrique",16,12,width-32,24,heading,12,color,true);
   var body=Label(row,"Contenu",16,42,width-32,500,text,Small?15:18,TribalStyle.Paper);float h=body.GetPreferredValues(text,width-32,Mathf.Infinity).y;body.rectTransform.sizeDelta=new Vector2(width-32,h+8);row.GetComponent<UnityEngine.UI.LayoutElement>().preferredHeight=Mathf.Max(84,h+62);
  }
  void DrawQuests()
  {
   campaign.RefreshQuests();int cols=Narrow?3:7;float filterHeight=Narrow?138:44,fw=W/cols;
   for(int i=0;i<questFilters.Length;i++){string filter=questFilters[i];var b=ActionButton(Content,filter.ToUpperInvariant(),i%cols*fw,i/cols*46,fw-5,40,()=>{questCategory=filter;selectedQuest="";questDetail=false;owner.Render();},questCategory==filter);b.GetComponentInChildren<TMP_Text>().fontSize=Small?11:13;}
   float top=filterHeight+14,left=Narrow?W:W*(Small?.38f:.35f);var quests=campaign.Data.quests.Where(QuestInCategory).OrderBy(q=>campaign.QuestState(q.id).accepted?0:1).ToArray();
   if(!quests.Any(q=>q.id==selectedQuest))selectedQuest=quests.FirstOrDefault()?.id??"";
   if(!Narrow||!questDetail)
   {
    var list=TribalStyle.Scroll(Content,"Journal des quêtes",0,top,left,H-top);
    if(quests.Length==0){var empty=TribalStyle.Row(list,"Aucune mission débloquée",120);TribalStyle.Text(AdventureUI.Fill(empty,"Message",16),font,"Aucune mission disponible dans cette catégorie. Poursuis la mission en cours.",FontSize,TribalStyle.Muted);}
    foreach(var candidate in quests)
    {
     var q=candidate;var state=campaign.QuestState(q.id);bool chosen=q.id==selectedQuest;Color ink=chosen?new Color(.05f,.025f,.015f):TribalStyle.Paper;var row=TribalStyle.Row(list,q.id,Small?146:158);TribalStyle.Button(row,font,"",()=>{selectedQuest=q.id;questDetail=true;owner.Render();},chosen);
     TribalStyle.Icon(TribalStyle.Top(row,"Type de mission",14,18,30,30),q.required?"quest":q.id.StartsWith("investigation:")?"evidence":"knowledge");
     Label(row,"Mission",54,12,left-74,58,q.title,Small?15:18,ink);Label(row,"Clause ISO",54,74,left-74,24,"ISO "+string.Join(" · ",q.iso),11,ink);
     Label(row,"État de la mission",18,104,left-36,24,(q.required&&!state.claimed?"PRIORITÉ · ":"")+QuestStatusName(state),11,ink);
     TribalStyle.Meter(TribalStyle.Top(row,"Objectifs réalisés",18,Small?135:146,left-44,5),()=>q.actionIds.Length==0?0:q.actionIds.Count(campaign.State.completedActions.Contains)/(float)q.actionIds.Length,state.claimed?TribalStyle.Cyan:TribalStyle.Gold,state.claimed?TribalStyle.Cyan:TribalStyle.Pink);
    }
   }
   if(Narrow&&!questDetail)return;float dx=Narrow?0:left+22,dw=W-dx;var panel=TribalStyle.Top(Content,"Détail de la mission",dx,top,dw,H-top);var selected=quests.FirstOrDefault(q=>q.id==selectedQuest);if(selected==null)return;
   float y=0;if(Narrow){ActionButton(panel,"RETOUR AUX QUÊTES",0,0,dw,44,()=>{questDetail=false;owner.Render();});y=52;}
   Label(panel,"Titre de la mission",8,y,dw-16,Small?60:78,selected.title,Small?20:28,TribalStyle.Gold,true);y+=Small?66:84;var record=campaign.QuestState(selected.id);
   Label(panel,"Référent et statut",8,y,dw-16,44,campaign.CharacterName(selected.giverId)+" · "+QuestStatusName(record)+"\nISO "+string.Join(" · ",selected.iso),Small?12:15,TribalStyle.Muted);y+=50;
   var details=TribalStyle.Scroll(panel,"Dossier de la mission",0,y,dw,Mathf.Max(32,panel.rect.height-y-62));
   QuestBlock(details,"GOAL · OBJECTIF",selected.description,TribalStyle.Gold);
   foreach(var id in selected.actionIds){bool done=campaign.State.completedActions.Contains(id);QuestBlock(details,done?"✓ OBJECTIF RÉALISÉ":"OBJECTIF À RÉALISER",campaign.FindAction(id)?.title??"Objectif de la mission",done?TribalStyle.Cyan:TribalStyle.Paper);}
   if(!string.IsNullOrEmpty(selected.buildingId))QuestBlock(details,"TRAVAUX ET CONTRÔLE","Étape physique : "+campaign.Value("building",selected.buildingId).ToString("0")+" / "+selected.buildingStage+"\n"+(record.validated?"Efficacité vérifiée avec le référent.":"La vérification de l’efficacité reste obligatoire."),TribalStyle.Cyan);
   if(selected.prerequisites.Length>0)QuestBlock(details,"PRÉREQUIS",string.Join("\n",selected.prerequisites.Select(id=>(campaign.QuestState(id)?.claimed==true?"✓ ":"À terminer · ")+(campaign.Data.quests.FirstOrDefault(q=>q.id==id)?.title??"Mission précédente"))),TribalStyle.Muted);
   QuestBlock(details,"REWARDS · RÉCOMPENSES",string.Join("\n",selected.rewards.Select(r=>r.name+" × "+r.amount.ToString("0"))),TribalStyle.Cyan);QuestBlock(details,"TIP · CONSEIL",campaign.QuestTip(selected),TribalStyle.Pink);
   if(record.claimed)QuestBlock(details,"MISSION TERMINÉE",selected.completion,TribalStyle.Cyan);
   bool near=campaign.Near(selected.giverId);string action=record.status==QuestStatus.READY_TO_CLAIM?"RÉCUPÉRER LES RÉCOMPENSES":record.status==QuestStatus.READY_TO_VALIDATE?"FAIRE VÉRIFIER":record.accepted?"SUIVRE LA MISSION":near?"PARLER AU RÉFÉRENT":"REJOINDRE LE RÉFÉRENT";
   var button=ActionButton(panel,action,0,panel.rect.height-50,dw,44,()=>{owner.Close();if(record.status==QuestStatus.READY_TO_CLAIM&&near)campaign.ClaimQuest(selected.id);else if(record.status==QuestStatus.READY_TO_VALIDATE&&near)campaign.ValidateQuest(selected.id);else if(!record.accepted&&near)campaign.OpenQuest(selected.id,"Offer",true);else if(!record.accepted||record.status==QuestStatus.READY_TO_CLAIM||record.status==QuestStatus.READY_TO_VALIDATE)GetComponent<QuestNavigationController>().Follow("travel:"+selected.giverId);else campaign.TrackQuest(selected.id);},true);button.interactable=!record.claimed&&record.status!=QuestStatus.FAILED&&record.status!=QuestStatus.REPLACED;
  }
 }
}
