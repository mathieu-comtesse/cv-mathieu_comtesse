using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class QuestDialogueUI
    {
        void ContextActions()
        {
            portraits.Visible=false;var d=campaign.Dialogue;string actor=campaign.ConversationActorId;
            bool touch=MobileControls.TouchActive;var viewport=touch?MobileControls.Instance.Viewport:new Vector2(Screen.width,Screen.height);
            float width=touch?Mathf.Min(680,viewport.x-24):740,height=touch?viewport.y-24:Mathf.Min(720,campaign.GetComponent<CampaignHud>().Canvas.GetComponent<RectTransform>().rect.height-40);
            if(!touch)height=Mathf.Min(height,184+d.choices.Where(x=>x.id!="interaction:cancel").Sum(x=>{var action=campaign.FindAction(x.actionId);return 6+(action==null?48:InteractionContextResolver.Resolve(campaign,action).kind==InteractionKind.MainQuest?96:78);}));
            narrative.sizeDelta=new Vector2(width,height);narrative.localScale=Vector3.one*(touch?MobileUnit:1);narrative.anchoredPosition=Vector2.zero;
            TribalStyle.Portrait(TribalStyle.Top(narrative,"Portrait de l’interlocuteur",20,15,64,64),actor);
            var person=campaign.Data.characters.FirstOrDefault(p=>p.id==actor);
            Text(narrative,"Interlocuteur",100,12,width-180,40,(person?.name??"Actions sur place").ToUpperInvariant(),touch?20:24,TribalStyle.Paper).overflowMode=TextOverflowModes.Overflow;
            Text(narrative,"Fonction",100,48,width-125,28,person?.role??"Poste du village",touch?12:16,TribalStyle.Muted);
            var brain=campaign.bindings.Find(actor)?.GetComponent<VillagerBrain>();
            if(brain!=null)Text(narrative,"Activité du PNJ",22,86,width-44,25,"AVANT L’ÉCHANGE · "+brain.ConversationActivity,touch?12:15,TribalStyle.Muted);
            var rows=TribalStyle.Scroll(narrative,"Catégories d’interaction",12,118,width-24,Mathf.Max(60,height-178));
            foreach(var choice in d.choices.Where(campaign.CanChoose).Where(c=>c.id!="interaction:cancel"))
            {
                var a=campaign.FindAction(choice.actionId);
                if(a==null){var row=TribalStyle.Row(rows,choice.id,48);var b=TribalStyle.Button(row,font,choice.text,()=>campaign.Choose(choice.id));choices.Add(b);continue;}
                var model=InteractionContextResolver.Resolve(campaign,a);bool main=model.kind==InteractionKind.MainQuest;
                Color tint=main?TribalStyle.Gold:model.kind==InteractionKind.Conversation?TribalStyle.Cyan:model.kind==InteractionKind.Document||model.kind==InteractionKind.Inspection?new Color(.66f,.35f,1):model.kind==InteractionKind.Locked?TribalStyle.Muted:new Color(.7f,.47f,.27f);
                var row2=TribalStyle.Row(rows,a.id,main?96:78);var b2=TribalStyle.Button(row2,font,"",()=>campaign.Choose(choice.id),main);b2.interactable=model.available;choices.Add(b2);
                if(!main){var face=(TribalPolygon)b2.targetGraphic;face.left=new Color(tint.r*.19f,tint.g*.19f,tint.b*.19f,.96f);face.right=new Color(.025f,.02f,.04f,.96f);}
                var icon=AdventureUI.Rect(row2,"Symbole "+model.icon,new Vector2(0,.5f),new Vector2(0,.5f),new Vector2(24,0),new Vector2(32,32));AdventureUI.Shape(icon,main?new Color(.12f,.06f,.02f):tint,model.icon=="quest"?"diamond":model.icon);
                var ink=main?new Color(.13f,.07f,.02f):TribalStyle.Paper;
                Text(row2,"Catégorie",74,8,width-125,20,model.heading,touch?11:13,main?ink:tint);
                Text(row2,"Action",74,29,width-125,28,model.title,touch?16:20,ink);
                Text(row2,"Progression ou condition",74,main?64:56,width-130,main?24:20,model.detail,touch?11:13,main?ink:TribalStyle.Muted);
            }
            Button(narrative,"Revenir au village",20,height-51,width-40,39,()=>campaign.Choose("interaction:cancel"));Select(choices.FindIndex(b=>b.interactable));
        }
        void Document()
        {
            portraits.Visible=false;bool touch=MobileControls.TouchActive;var v=touch?MobileControls.Instance.Viewport:new Vector2(1000,760);
            float w=Mathf.Min(900,v.x-24),h=Mathf.Min(720,v.y-24);narrative.sizeDelta=new Vector2(w,h);narrative.localScale=Vector3.one*(touch?MobileUnit:1);narrative.anchoredPosition=Vector2.zero;
            Text(narrative,"Type de consultation",24,17,w-48,25,"DOCUMENTATION · MATHILDE",15,new Color(.7f,.45f,1));
            Text(narrative,"Nom du registre",24,48,w-48,35,campaign.Dialogue.speaker,touch?22:28);
            var content=MobileScroll(narrative,24,98,w-48,h-162,640);var t=Text(content,"Données du registre",0,0,w-70,640,campaign.Dialogue.text,touch?16:22);t.overflowMode=TextOverflowModes.Overflow;t.ForceMeshUpdate();content.sizeDelta=new Vector2(w-48,Mathf.Max(h-162,t.preferredHeight+30));
            Button(narrative,"Fermer le registre",24,h-52,w-48,40,()=>campaign.Choose("interaction:cancel"));Select(0);
        }
    }
}
