using System;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class TribalInterface
    {
        sealed class CodexEntry{public string id,title,body,icon;public bool discovered=true;public string destination;}
        bool codexDetail;readonly string[] codexCategories={"ISO 45001","Personnages","Métiers","Dangers","Incidents","Mesures","Ateliers","Animaux","Ressources","Glossaire"};
        IEnumerable<CodexEntry> CodexEntries()
        {
            switch(codexCategory)
            {
                case "ISO 45001":
                    foreach(var clause in KnowledgeCatalog.Clauses.Where(c=>c.Intro))yield return new CodexEntry{id=clause.id,title=clause.id+" · "+clause.title,icon="knowledge",body=clause.id=="1"?"Le système relie les responsabilités, les moyens, les observations et les décisions. Dans le village, tu repères les dangers, organises les travaux puis vérifies leurs effets.":clause.id=="2"?"Les clauses 4 à 10 structurent l’arbre de technologie. Les missions en donnent une interprétation pédagogique. Le texte normatif demeure la référence pour une démarche réelle.":"Danger : source susceptible de provoquer une atteinte. Risque : exposition et conséquences possibles. Mesure : action qui vise à supprimer ou réduire le risque. Preuve : trace d’une observation ou d’un contrôle."};
                    yield return new CodexEntry{id="pdca",title="Planifier · Agir · Vérifier · Améliorer",icon="knowledge",body="Planifier : comprendre le contexte et choisir les moyens.\n\nAgir : organiser les équipes et maîtriser les activités.\n\nVérifier : observer les résultats et auditer les pratiques.\n\nAméliorer : comprendre les écarts, corriger et contrôler l’efficacité."};break;
                case "Personnages":
                    foreach(var definition in campaign.Data.characters){var s=campaign.State.characters.First(c=>c.id==definition.id);yield return new CodexEntry{id=definition.id,title=definition.name,icon="rest",destination=definition.id,body=definition.role+"\n\n"+(definition.id=="dylan"?"Personnage jouable.":definition.id=="mathieu"?"Mentor de Dylan et référent prévention.":definition.id=="aurelien"?"Chef humain de la tribu.":"Membre du village.")+"\n\nÉtat : "+(s.alive?s.health:"Décédé")+"\nCompétence : "+s.competence.ToString("0")+"/100\nÉnergie : "+s.energy.ToString("0")+"/100\nFatigue : "+s.fatigue.ToString("0")+"/100"};}break;
                case "Métiers":
                    foreach(var group in campaign.Data.characters.Where(c=>c.id!=campaign.Data.playerCharacterId).GroupBy(c=>c.role))yield return new CodexEntry{id=group.Key,title=group.Key,icon="craft",body="Membres concernés\n"+string.Join("\n",group.Select(c=>c.name))+"\n\nLes tâches sont attribuées dans PEUPLE. Une affectation vérifie les ressources, la compétence et l’accessibilité du poste. Le travail progresse uniquement après l’arrivée du membre sur place."};break;
                case "Dangers":
                    foreach(var risk in campaign.State.risks)yield return new CodexEntry{id=risk.id,title=risk.id,icon="danger",body="Risque enregistré : "+risk.value.ToString("0")+"\n\n"+(risk.value>=2?"Situation critique : préparer une intervention et vérifier ses effets.":risk.value>0?"Risque résiduel : poursuivre les contrôles.":"Mesure appliquée : conserver la preuve du contrôle.")+"\n\nMissions liées\n"+string.Join("\n",campaign.Data.quests.Where(q=>q.riskId==risk.id).Select(q=>q.title))};break;
                case "Incidents":
                    foreach(var h in campaign.State.hutFailures??new System.Collections.Generic.List<HutFailureRecord>())yield return new CodexEntry{id=h.id,title="Effondrement de charpente",icon="building",destination=h.site,body="FAITS\nRupture progressive des appuis, chute de la toiture et des traverses.\n\nDÉCISION\n"+h.decision+"\n\nSIGNAUX\nCraquements et déformation des assemblages.\n\nCAUSE IMMÉDIATE\nPerte d’un appui et report des charges.\n\nCAUSE ORGANISATIONNELLE\nStructure utilisée avant vérification des appuis, des liens et de la charge.\n\nMESURES\nFermer l’accès, consulter les occupants, reprendre les appuis, renforcer puis contrôler.\n\nVÉRIFICATION\n"+(h.repaired?"Réparation contrôlée, réutilisation autorisée.":h.rebuilt?"Renforts posés ; contrôle avant réutilisation encore nécessaire.":"Hutte inutilisable. L’enquête et la remise en état restent à mener.")};
                    foreach(var a in campaign.State.accidents)yield return new CodexEntry{id=a.id+":"+a.elapsedSeconds,title=a.title,icon="danger",destination=a.site,body="Victime : "+campaign.CharacterName(a.victimId)+"\nLieu : "+SiteName(a.site)+"\nTemps : "+a.elapsedSeconds.ToString("0")+" s\n\nFAITS\n"+a.decision+"\n\nSIGNAUX PRÉALABLES\n"+a.warning+"\n\nCAUSE IMMÉDIATE\n"+a.immediateCause+"\n\nCAUSE ORGANISATIONNELLE\n"+a.organizationalCause+"\n\nACTION CORRECTIVE\n"+a.correctiveAction+"\n\nEnquête : "+(a.investigated?"menée":"à mener")+"\nISO : "+string.Join(" · ",a.iso)};break;
                case "Mesures":
                    foreach(var q in campaign.Data.quests.Where(q=>!string.IsNullOrEmpty(q.riskId)||!string.IsNullOrEmpty(q.verificationFlag)))yield return new CodexEntry{id=q.id,title=q.title,icon="evidence",discovered=campaign.QuestState(q.id)?.accepted==true,body=q.description+"\n\nContrôle : "+(campaign.QuestState(q.id)?.validated==true?"réalisé":"à effectuer")+"\n\n"+campaign.QuestTip(q)+"\n\nTraces disponibles\n"+string.Join("\n",q.actionIds.Where(id=>campaign.State.completedActions.Contains(id)).Select(id=>campaign.FindAction(id)?.title))};break;
                case "Ateliers":
                    foreach(var site in new[]{"atelier_silex","foyer","stockage","bois_construction","pierre_carriere","charpente","habitations"})
                    {var actions=campaign.Data.actions.Where(a=>a.targetBindingId==site).ToArray();var quests=campaign.Data.quests.Where(q=>q.actionIds.Any(id=>actions.Any(a=>a.id==id))).ToArray();yield return new CodexEntry{id=site,title=SiteName(site),icon=site=="foyer"?"fire":"workshop",destination=site,discovered=campaign.bindings.Find(site)!=null,body="Poste présent dans le village : "+(campaign.bindings.Find(site)!=null?"oui":"non")+"\n\nCONSTRUCTION PHYSIQUE\n"+string.Join("\n",quests.Where(q=>!string.IsNullOrEmpty(q.buildingId)).Select(q=>q.title+" · étape "+campaign.Value("building",q.buildingId).ToString("0")+" / "+q.buildingStage))+"\n\nPRÉVENTION\n"+string.Join("\n",quests.Select(q=>(campaign.QuestState(q.id)?.validated==true?"Contrôlée · ":"À contrôler · ")+q.title))+"\n\nACTIVITÉS\n"+string.Join("\n",actions.Select(a=>a.title))};}break;
                case "Animaux":
                    yield return new CodexEntry{id="mammoth",title="Mammouth",icon="hunt",body="Animal présent dans l’environnement. Reste à distance des zones de chasse et observe les signaux de danger. Les mesures de la mission doivent être préparées avant l’exposition."};break;
                case "Ressources":
                    foreach(var item in inventory.items)yield return new CodexEntry{id=item.id,title=item.name,icon=item.id,body=item.description+"\n\nQuantité dans le sac : "+inventory.Quantity(item.id).ToString("0")+(item.id=="notebook"||item.id=="evidence"?"":"\nRéserves du village : "+campaign.Stored("stockage",item.id).ToString("0"))};break;
                case "Glossaire":
                    foreach(var line in new[]{"danger|Source ou situation susceptible de provoquer une atteinte à la santé.","risque|Combinaison de l’exposition à un danger et des conséquences possibles.","compétence|Capacité à accomplir une activité. Le jeu vérifie les seuils exigés par chaque tâche.","participation|Contribution des travailleurs aux décisions qui concernent leur activité.","preuve|Trace d’un fait observé ou d’un contrôle réalisé.","action corrective|Action qui traite les causes d’un événement afin d’éviter sa répétition.","vérification|Contrôle de l’effet réel d’une mesure. Construire ne suffit pas à conclure que le risque est maîtrisé."}){var parts=line.Split('|');yield return new CodexEntry{id=parts[0],title=parts[0],icon="notebook",body=parts[1]};}break;
            }
        }
        void DrawCodex()
        {
            float categoryWidth=Narrow?W:Mathf.Min(Small?150:210,W*.18f),left=Narrow?W:Mathf.Min(Small?215:330,W*.28f),gap=Small?12:22;float top=Narrow?52:0;
            if(Narrow){int index=Array.IndexOf(codexCategories,codexCategory);ActionButton(Content,codexCategory.ToUpperInvariant()+"  ›",0,0,W,44,()=>{codexCategory=codexCategories[(index+1)%codexCategories.Length];selectedCodex="";codexDetail=false;owner.Render();});}
            else{var categories=TribalStyle.Scroll(Content,"Catégories du Codex",0,0,categoryWidth,H);foreach(string value in codexCategories){string category=value;var row=TribalStyle.Row(categories,category,48);var button=TribalStyle.Button(row,font,category.ToUpperInvariant(),()=>{codexCategory=category;selectedCodex="";owner.Render();},category==codexCategory);button.GetComponentInChildren<TMP_Text>().fontSize=Small?12:15;}}
            var entries=CodexEntries().ToArray();var chosen=entries.FirstOrDefault(e=>e.id==selectedCodex)??entries.FirstOrDefault();if(chosen!=null)selectedCodex=chosen.id;
            float lx=Narrow?0:categoryWidth+gap;
            if(!Narrow||!codexDetail)
            {var list=TribalStyle.Scroll(Content,"Entrées du Codex",lx,top,left,H-top);foreach(var value in entries){var entry=value;var row=TribalStyle.Row(list,entry.id,Small?70:84);var button=TribalStyle.Button(row,font,"",()=>{selectedCodex=entry.id;codexDetail=true;owner.Render();},chosen?.id==entry.id);TribalStyle.Icon(TribalStyle.Top(row,"Icône",12,16,36,36),entry.icon,entry.discovered?Color.white:new Color(1,1,1,.2f));Label(row,"Nom",58,10,left-70,60,entry.discovered?entry.title:"À découvrir",Small?14:18,entry.discovered?TribalStyle.Paper:TribalStyle.Muted);}}
            if(Narrow&&!codexDetail)return;float dx=Narrow?0:lx+left+gap,dw=W-dx;var panel=TribalStyle.Top(Content,"Fiche du Codex",dx,top,dw,H-top);TribalStyle.Panel(panel);if(chosen==null){Label(panel,"Vide",18,20,dw-36,100,"Aucune entrée découverte dans cette catégorie.");return;}float titleY=Narrow?62:20;
            if(Narrow)ActionButton(panel,"RETOUR AU CODEX",12,8,dw-24,44,()=>{codexDetail=false;owner.Render();});
            if(codexCategory=="Personnages")TribalStyle.Portrait(TribalStyle.Top(panel,"Portrait",18,titleY,64,64),chosen.id,campaign.State.characters.First(c=>c.id==chosen.id).alive);
            float tx=codexCategory=="Personnages"?94:18;Label(panel,"Titre de l’entrée",tx,titleY,dw-tx-18,70,chosen.discovered?chosen.title.ToUpperInvariant():"À DÉCOUVRIR",Small?21:28,TribalStyle.Gold,true);
            TextBody(panel,"Contenu de l’entrée",18,titleY+82,dw-36,Mathf.Max(32,panel.rect.height-titleY-154),chosen.discovered?chosen.body:"Accepte la mission liée et observe l’activité pour documenter cette entrée.");
            if(chosen.discovered&&!string.IsNullOrEmpty(chosen.destination)){var follow=ActionButton(panel,"REPÉRER SUR LE GPS",18,panel.rect.height-56,dw-36,44,()=>{owner.Close();GetComponent<QuestNavigationController>().Follow("travel:"+chosen.destination);},true);follow.interactable=campaign.bindings.Find(chosen.destination)!=null;}
        }
    }
}

