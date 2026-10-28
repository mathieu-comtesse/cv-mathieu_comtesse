using System;
using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class TribalInterface
    {
        bool peopleDetails,taskPicker;int taskPage,peoplePage;
        string SiteName(string id)=>GetComponent<CampaignMap>().DisplayName(id);
        string MemberRole(string id,string role)=>id=="dylan"?"Apprenti · joueur":id=="mathieu"?"Mentor · prévention":id=="aurelien"?"Chef de la tribu":role.Split('·')[0].Trim();
        string MemberStatus(CharacterState member)=>!member.alive?"Décédé":!member.available?"Indisponible":member.life<50?"Blessé":member.assignment=="repos"?"Au repos":"Disponible";
        void DrawPeople()
        {
            var sections=new[]{"TÂCHES","INFORMATIONS","RESPONSABILITÉS"};float tabWidth=(W-(Narrow?0:170))/3-6;
            for(int i=0;i<sections.Length;i++){string section=sections[i];var b=ActionButton(Content,section,i*(tabWidth+6),0,tabWidth,40,()=>{peopleSection=section;taskPicker=false;owner.Render();},peopleSection==section);b.GetComponentInChildren<TMP_Text>().fontSize=Narrow?10:Small?12:15;}
            if(!Narrow)Bound(Content,"Effectif réel",W-160,8,160,28,()=>campaign.State.characters.Count(c=>c.alive)+" / "+campaign.State.characters.Count+" MEMBRES",14,TribalStyle.Paper).alignment=TextAlignmentOptions.Right;
            const float top=54;if(Narrow&&peopleDetails){ActionButton(Content,"RETOUR À LA TRIBU",0,50,W,44,()=>{peopleDetails=false;owner.Render();});DrawMember(TribalStyle.Top(Content,"Membre sélectionné",0,104,W,H-104));return;}
            float left=Narrow?W:Mathf.Min(Small?250:390,W*.30f),rh=Small?118:128;int perPage=Mathf.Max(1,Mathf.FloorToInt((H-top-58)/(rh+6)));var members=campaign.Data.characters.Where(d=>campaign.State.characters.Any(c=>c.id==d.id)).ToArray();
            int pages=Mathf.Max(1,Mathf.CeilToInt(members.Length/(float)perPage));peoplePage=Mathf.Clamp(peoplePage,0,pages-1);var list=TribalStyle.Scroll(Content,"Membres de la tribu",0,top,left,H-top-58);
            foreach(var d in members.Skip(peoplePage*perPage).Take(perPage))
            {
                var definition=d;var state=campaign.State.characters.First(c=>c.id==d.id);var r=TribalStyle.Row(list,d.id,rh);bool selected=d.id==selectedPerson;var face=TribalStyle.Panel(r,"row",selected?TribalStyle.Violet:TribalStyle.Ink,selected?new Color(0,.48f,.55f):TribalStyle.Ink,true);
                TribalStyle.Portrait(TribalStyle.Top(r,"Portrait de "+d.name,15,12,48,48),d.id,state.alive);float x=75;
                Label(r,"Nom",x,9,left-x-12,25,d.name,Small?17:20,state.alive?TribalStyle.Paper:TribalStyle.Muted);
                Label(r,"Fonction",x,35,left-x-12,25,MemberRole(d.id,d.role),12,TribalStyle.Muted);
                Bound(r,"État et activité",18,65,left-36,24,()=>MemberStatus(state)+" · "+(campaign.bindings.Find(definition.id)?.GetComponent<VillagerBrain>() is VillagerBrain brain?RoutineName(brain.Behaviour):definition.id=="dylan"?"Joueur":"Au village"),11,state.alive?TribalStyle.Paper:TribalStyle.Muted);
                Label(r,"Compétence",18,91,65,17,"SAVOIR",10,TribalStyle.Muted);TribalStyle.Meter(TribalStyle.Top(r,"Compétence réelle",82,96,left-108,5),()=>state.competence/100,TribalStyle.Gold,TribalStyle.Pink);
                Label(r,"Fatigue",18,108,65,17,"FATIGUE",10,TribalStyle.Muted);TribalStyle.Meter(TribalStyle.Top(r,"Fatigue réelle",82,113,left-108,5),()=>state.fatigue/100,TribalStyle.Cyan,TribalStyle.Pink);
                var button=r.gameObject.AddComponent<UnityEngine.UI.Button>();button.targetGraphic=face;button.onClick.AddListener(()=>{selectedPerson=definition.id;peopleDetails=true;taskPicker=false;owner.Render();});AttachTip(r.gameObject,d.name+" · "+d.role+"\n"+MemberStatus(state)+"\nCompétence : "+state.competence.ToString("0")+"/100 · Fatigue : "+state.fatigue.ToString("0")+"/100");
            }
            var prev=ActionButton(Content,"<",0,H-48,48,44,()=>{peoplePage--;owner.Render();});prev.interactable=peoplePage>0;Label(Content,"Pagination des membres",54,H-38,left-108,32,(peoplePage+1)+" / "+pages,14).alignment=TextAlignmentOptions.Center;var next=ActionButton(Content,">",left-48,H-48,48,44,()=>{peoplePage++;owner.Render();});next.interactable=peoplePage<pages-1;
            if(!Narrow)DrawMember(TribalStyle.Top(Content,"Activités du membre",left+24,top,W-left-24,H-top));
        }
        void DrawMember(RectTransform panel)
        {
            var definition=campaign.Data.characters.FirstOrDefault(c=>c.id==selectedPerson)??campaign.Data.characters.First();selectedPerson=definition.id;var member=campaign.State.characters.First(c=>c.id==selectedPerson);float width=panel.rect.width,height=panel.rect.height;
            Label(panel,"Membre",0,0,width,35,definition.name.ToUpperInvariant(),Small?20:28,TribalStyle.Paper,true);
            Bound(panel,"État du membre",0,Small?32:39,width,Small?40:52,()=>definition.role+(Small?" · ":"\n")+(member.alive?"Énergie "+member.energy.ToString("0")+" · Fatigue "+member.fatigue.ToString("0")+" · Compétence "+member.competence.ToString("0"):"Décédé · aucune affectation possible"),Small?14:17,TribalStyle.Muted);
            if(peopleSection=="INFORMATIONS"||peopleSection=="RESPONSABILITÉS")
            {
                var body=TribalStyle.Scroll(panel,"Informations de la tribu",0,Small?80:100,width,Mathf.Max(32,height-(Small?138:156)));var info=TribalStyle.Row(body,"Identité et responsabilités",Mathf.Max(250,height-160));
                string responsibility=selectedPerson=="aurelien"?"Responsabilité : chef de la tribu.":selectedPerson=="mathieu"?"Responsabilité : mentor de Dylan et prévention.":"Fonction : "+definition.role;
                Bound(info,"Fiche du membre",8,8,width-20,Mathf.Max(240,height-176),()=>responsibility+"\n\nVie : "+member.life.ToString("0")+"/100\nÉnergie : "+member.energy.ToString("0")+"/100\nFatigue : "+member.fatigue.ToString("0")+"/100\nFaim : "+member.hunger.ToString("0")+"/100\nÉtat : "+member.health+"\n\nActivité : "+(campaign.bindings.Find(selectedPerson)?.GetComponent<VillagerBrain>()?.Behaviour.ToString()??(selectedPerson==campaign.Data.playerCharacterId?"Contrôlé par le joueur":"Indisponible")),FontSize);
                if(member.alive&&selectedPerson!=campaign.Data.playerCharacterId)ActionButton(panel,member.assignment=="repos"?"REPRENDRE L’ACTIVITÉ":"ORDONNER UN REPOS",0,height-46,width,44,()=>{member.assignment=member.assignment=="repos"?"":"repos";campaign.Save();campaign.NotifyTribalChange();owner.Render();},true);return;
            }
            if(taskPicker){DrawTaskPicker(panel,Small?78:100,width,height-(Small?78:100));return;}
            float targetX=width*.38f,progressX=width*.64f,statusX=width*.81f,head=Small?76:100;
            Label(panel,"Activité",0,head,width*.36f,24,"ACTIVITÉ",12,TribalStyle.Muted,true);Label(panel,"Objectif",targetX,head,width*.24f,24,"OBJECTIF",12,TribalStyle.Muted,true);Label(panel,"Progression",progressX,head,width*.16f,24,"PROGRESSION",Small?9:11,TribalStyle.Muted);Label(panel,"État",statusX,head,width*.18f,24,"ÉTAT",12,TribalStyle.Muted,true);
            var allTasks=campaign.State.tribalTasks.Where(t=>t.workerId==selectedPerson&&t.status!="cancelled").ToArray();var tasks=allTasks.Where(t=>!TribalTaskRuntime.Terminal(t)).ToArray();var shown=tasks.Concat(allTasks.Where(t=>t.status=="done").Reverse().Take(3)).ToArray();
            var list=TribalStyle.Scroll(panel,"File de travail réelle",0,head+28,width,Mathf.Max(36,height-head-86));
            foreach(var order in shown)
            {
                var task=order;var action=campaign.FindAction(task.actionId);bool done=task.status=="done",chosen=task.id==selectedTask;var row=TribalStyle.Row(list,task.id,Small?94:102);var face=TribalStyle.Panel(row,"row",chosen?TribalStyle.Gold:TribalStyle.Ink,chosen?TribalStyle.Orange:TribalStyle.Ink,true);Color ink=chosen?new Color(.05f,.025f,.015f):TribalStyle.Paper;
                TribalStyle.Icon(TribalStyle.Top(row,"Activité",14,16,28,28),TaskIcon(action));Label(row,"Intitulé",48,12,width*.38f-55,60,action?.title??"Activité terminée",Small?13:16,ink);
                Label(row,"Objectif du travail",targetX,16,width*.25f-8,60,SiteName(action?.targetBindingId),Small?12:15,ink);
                TribalStyle.Meter(TribalStyle.Top(row,"Avancement réel",progressX,26,width*.15f,6),()=>done?1:task.duration<=0?0:task.workedSeconds/task.duration);
                Bound(row,"Avancement chiffré",progressX,40,width*.16f,25,()=>done?"100 %":(100*Mathf.Clamp01(task.workedSeconds/Mathf.Max(1,task.duration))).ToString("0")+" %",11,ink);
                Label(row,"État réel",statusX,16,width*.18f-8,34,done?"✓ FAIT":task.status=="blocked"?"BLOQUÉ":task.status=="moving"?"EN ROUTE":task.status=="working"?"EN COURS":"EN ATTENTE",Small?10:12,done?TribalStyle.Cyan:ink);
                if(!done)ActionButton(row,"X",width-46,48,40,40,()=>{campaign.CancelTask(task.id);owner.Render();});
                if(task.status=="blocked")Label(row,"Motif du blocage",18,70,width-76,24,task.reason,11,chosen?ink:TribalStyle.Gold);
                var button=row.gameObject.AddComponent<UnityEngine.UI.Button>();button.targetGraphic=face;button.onClick.AddListener(()=>{selectedTask=task.id;if(!string.IsNullOrEmpty(task.reason))Explain(task.reason);owner.Render();});
            }
            if(shown.Length==0)
            {
                var row=TribalStyle.Row(list,"Activité régulière",Small?74:96);TribalStyle.Panel(row,"row");var brain=campaign.bindings.Find(selectedPerson)?.GetComponent<VillagerBrain>();Label(row,"Routine",18,14,width-32,32,member.alive?(selectedPerson==campaign.Data.playerCharacterId?"DYLAN · CONTRÔLÉ PAR LE JOUEUR":"ACTIVITÉ RÉGULIÈRE DU VILLAGE"):"MEMBRE INDISPONIBLE",Small?14:18,TribalStyle.Muted);
                if(brain!=null)Bound(row,"Activité réelle",18,45,width-32,26,()=>RoutineName(brain.Behaviour),Small?14:16);if(brain!=null)TribalStyle.Meter(TribalStyle.Top(row,"Cycle réel",18,Small?68:82,width-44,5),()=>brain.RoutineProgress);
            }
            var add=ActionButton(panel,"+  AJOUTER UNE TÂCHE",0,height-48,width,46,()=>{taskPicker=true;taskPage=0;owner.Render();});add.interactable=member.alive&&member.available&&selectedPerson!=campaign.Data.playerCharacterId&&tasks.Length<3;
        }
        void DrawTaskPicker(RectTransform panel,float y,float width,float height)
        {
            var candidates=campaign.Data.actions.Where(a=>a.targetBindingId!=null&&campaign.bindings.Find(a.targetBindingId)!=null&&string.IsNullOrEmpty(a.dialogueId)&&string.IsNullOrEmpty(a.cinematicId)&&!a.dangerous&&!a.effects.Any(e=>e.kind=="accident"||e.kind=="character"&&e.target.EndsWith(".alive")&&e.value<=0)).OrderBy(a=>campaign.CanAssignTask(selectedPerson,a.id,out _)?0:1).ThenBy(a=>a.id.StartsWith("work:")?0:1).ToArray();
            int pageCount=Mathf.Max(1,Mathf.CeilToInt(candidates.Length/10f));taskPage=Mathf.Clamp(taskPage,0,pageCount-1);var list=TribalStyle.Scroll(panel,"Activités et conditions",0,y,width,Mathf.Max(48,height-58));
            foreach(var candidate in candidates.Skip(taskPage*10).Take(10))
            {
                var action=candidate;bool allowed=campaign.CanAssignTask(selectedPerson,action.id,out string reason);var row=TribalStyle.Row(list,action.id,Small?68:76);var button=TribalStyle.Button(row,font,"",()=>{if(!campaign.QueueTask(selectedPerson,action.id,out string issue)){Explain(issue);return;}taskPicker=false;owner.Render();});if(!allowed)button.targetGraphic.color=new Color(.65f,.65f,.7f,.7f);
                TribalStyle.Icon(TribalStyle.Top(row,"Métier",16,13,38,38),TaskIcon(action));Label(row,"Action",66,8,width-80,28,action.title,FontSize,allowed?TribalStyle.Paper:TribalStyle.Muted);Label(row,"Prérequis",66,36,width-80,34,allowed?SiteName(action.targetBindingId)+" · "+action.durationSeconds.ToString("0")+" s · compétence "+action.minimumCompetence.ToString("0"):reason,Small?12:14,allowed?TribalStyle.Cyan:TribalStyle.Muted);
            }
            ActionButton(panel,"RETOUR",0,y+height-48,width*.32f,44,()=>{taskPicker=false;owner.Render();});var prev=ActionButton(panel,"<",width*.35f,y+height-48,44,44,()=>{taskPage--;owner.Render();});prev.interactable=taskPage>0;Label(panel,"Page des tâches",width*.35f+48,y+height-38,width*.65f-100,28,(taskPage+1)+" / "+pageCount,13).alignment=TextAlignmentOptions.Center;var next=ActionButton(panel,">",width-44,y+height-48,44,44,()=>{taskPage++;owner.Render();});next.interactable=taskPage<pageCount-1;
        }
        string TaskIcon(ActionDefinition action){if(action==null)return "craft";var resource=action.effects.FirstOrDefault(e=>e.kind=="resource"&&e.value>0)?.target;if(resource!=null&&TribalStyle.Texture(resource)!=null)return resource;return action.effects.Any(e=>e.kind=="building")?"building":action.effects.Any(e=>e.kind=="risk")?"danger":"craft";}
        string RoutineName(VillagerBehaviour behaviour)=>behaviour switch{VillagerBehaviour.MOVE_TO_TASK=>"Se rend au poste de travail",VillagerBehaviour.WORK=>"Travaille sur place",VillagerBehaviour.COLLECT=>"Collecte des ressources",VillagerBehaviour.TRANSPORT=>"Transporte une charge",VillagerBehaviour.BUILD=>"Participe à la construction",VillagerBehaviour.REST=>"Se repose",VillagerBehaviour.EAT=>"Prend un repas",VillagerBehaviour.TREATMENT=>"Soins en cours",VillagerBehaviour.EVACUATE=>"Évacue la zone",VillagerBehaviour.SOCIALIZE=>"Échange avec la tribu",VillagerBehaviour.INSPECT=>"Observe le village",VillagerBehaviour.DEAD=>"Décédé",_=>"Présent dans le village"};
    }
}
