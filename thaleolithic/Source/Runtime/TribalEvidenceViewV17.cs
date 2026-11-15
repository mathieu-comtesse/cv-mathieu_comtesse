using System;
using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed partial class TribalInterface
 {
  readonly string[] evidenceTabsV17={"Contexte","Leadership","Risques","Objectifs","Compétences","Communication","Documents","Maîtrise opérationnelle","Urgences","Évaluation","Audit","Amélioration"};int evidenceTabV17;string selectedEvidenceV17="";
  static int EvidenceCategoryV17(string clause)
  {if(clause.StartsWith("4"))return 0;if(clause.StartsWith("5"))return 1;if(clause.StartsWith("6.2"))return 3;if(clause.StartsWith("6"))return 2;if(clause.StartsWith("7.4"))return 5;if(clause.StartsWith("7.5"))return 6;if(clause.StartsWith("7"))return 4;if(clause.StartsWith("8.2"))return 8;if(clause.StartsWith("8"))return 7;if(clause.StartsWith("9.2"))return 10;if(clause.StartsWith("9"))return 9;return 11;}
  void DrawEvidenceV17()
  {
   float top=0;
   if(Narrow)
   {
    ActionButton(Content,"CARNET · "+evidenceTabsV17[evidenceTabV17].ToUpperInvariant()+" ›",0,0,W,48,()=>{evidenceTabV17=(evidenceTabV17+1)%evidenceTabsV17.Length;selectedEvidenceV17="";owner.Render();});top=60;
   }
   else
   {
    float width=(W-25)/6;for(int i=0;i<evidenceTabsV17.Length;i++){int tab=i;var b=ActionButton(Content,evidenceTabsV17[i].ToUpperInvariant(),i%6*(width+5),i/6*52,width,46,()=>{evidenceTabV17=tab;selectedEvidenceV17="";owner.Render();},tab==evidenceTabV17);b.GetComponentInChildren<TMP_Text>().fontSize=Small?13:16;}top=116;
   }
   var records=campaign.State.campaignV17?.evidence.Where(e=>EvidenceCategoryV17(e.clause)==evidenceTabV17).ToArray()??Array.Empty<EvidenceRecordV17>();
   var selected=records.FirstOrDefault(e=>e.id==selectedEvidenceV17)??records.FirstOrDefault();if(selected!=null)selectedEvidenceV17=selected.id;
   float left=Narrow?W:Mathf.Min(340,W*.34f),gap=Narrow?0:20;
   if(!Narrow||!codexDetail)
   {
    var list=TribalStyle.Scroll(Content,"Preuves du Carnet",0,top,left,H-top-62);
    foreach(var e in records){var item=e;var row=TribalStyle.Row(list,item.id,86);TribalStyle.Button(row,font,item.name+"\n"+StageNameV17(item.stage),()=>{selectedEvidenceV17=item.id;codexDetail=true;owner.Render();},selected?.id==item.id);}
   }
   if(!Narrow||codexDetail)
   {
    float x=Narrow?0:left+gap;var panel=TribalStyle.Top(Content,"Fiche de preuve",x,top,W-x,H-top-62);TribalStyle.Panel(panel);
    if(selected==null)Label(panel,"À découvrir",20,20,W-x-40,150,"Aucune preuve encore découverte dans cette catégorie.\nLes décisions, réalisations et vérifications apparaîtront ici.",22,TribalStyle.Muted);
    else
    {
     float y=Narrow?65:20;if(Narrow)ActionButton(panel,"RETOUR AUX PREUVES",15,10,W-30,44,()=>{codexDetail=false;owner.Render();});
     Label(panel,"Objet tangible",20,y,W-x-40,80,selected.name.ToUpperInvariant(),Small?22:28,TribalStyle.Gold,true);
     var step=campaign.Objectives.Current;
     string next=step?.Activity?.id==selected.activity?"\n\nÉTAPE ACTIVE\n"+step.Validation+"\nEnsuite · "+step.NextLabel:"";
     string text=$"ISO {selected.clause}\nÉTAT : {StageNameV17(selected.stage)}\nÉTAPE : {TimeSpan.FromSeconds(selected.at):mm\\:ss}\nSOURCE : {selected.source}\n\nACTION ET RÉSULTAT\n{selected.result}\n\nPREUVE DE VÉRIFICATION\n{(string.IsNullOrEmpty(selected.verification)?"À réaliser. Une décision ne prouve pas la maîtrise.":selected.verification)}"+next;
     TextBody(panel,"Traçabilité",20,y+95,W-x-40,Mathf.Max(80,panel.rect.height-y-115),text);
    }
   }
   ActionButton(Content,"CONSULTER LES AUTRES RUBRIQUES DU CODEX",0,H-49,W,44,()=>{codexCategory="ISO 45001";codexDetail=false;owner.Render();});
  }
  static string StageNameV17(EvidenceStageV17 stage)=>stage==EvidenceStageV17.Discovered?"Découvert":stage==EvidenceStageV17.Decided?"Décidé":stage==EvidenceStageV17.Realised?"Réalisé":"Vérifié";
 }
}
