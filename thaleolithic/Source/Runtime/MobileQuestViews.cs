using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class QuestDialogueUI
    {
        float MobileUnit=>MobileControls.Instance.Units;
        Vector2 MobileSize=>new Vector2(Mathf.Max(320,MobileControls.Instance.Viewport.x-24),Mathf.Max(280,MobileControls.Instance.Viewport.y-24));
        RectTransform MobileScroll(RectTransform parent,float x,float y,float width,float height,float contentHeight)
        {
            var root=AdventureUI.Rect(parent,"Défilement tactile",new Vector2(0,1),new Vector2(0,1),new Vector2(x,-y),new Vector2(width,height));var scroll=root.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.horizontal=false;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;
            var viewport=AdventureUI.Fill(root,"Viewport");AdventureUI.Panel(viewport,new Color(0,0,0,.001f)).raycastTarget=true;viewport.gameObject.AddComponent<UnityEngine.UI.RectMask2D>();var content=AdventureUI.Rect(viewport,"Contenu",new Vector2(0,1),new Vector2(0,1),Vector2.zero,new Vector2(width,Mathf.Max(height,contentHeight)));scroll.viewport=viewport;scroll.content=content;return content;
        }
        void MobileNarrative()
        {
            var d=campaign.Dialogue;var options=d.choices.Where(campaign.CanChoose).ToArray();string id=campaign.Data.characters.FirstOrDefault(c=>d.speaker.StartsWith(c.name,System.StringComparison.OrdinalIgnoreCase))?.id??campaign.ConversationActorId;
            portraits.SetActor(string.IsNullOrEmpty(id)?"mathieu":id);var size=MobileSize;size.x=Mathf.Min(650,size.x);narrative.sizeDelta=size;narrative.anchoredPosition=Vector2.zero;narrative.localScale=Vector3.one*MobileUnit;
            Portrait(narrative,43,9,54);Text(narrative,"Interlocuteur",85,19,size.x-110,43,d.speaker.ToUpperInvariant(),22,AdventureUI.Gold);
            var brain=campaign.bindings.Find(id)?.GetComponent<VillagerBrain>();if(brain!=null){var activity=Text(narrative,"Activité du PNJ",85,56,size.x-110,20,"Avant l’échange : "+brain.ConversationActivity,12,TribalStyle.Muted);activity.enableAutoSizing=true;activity.fontSizeMin=10;activity.fontSizeMax=12;activity.textWrappingMode=TextWrappingModes.NoWrap;activity.overflowMode=TextOverflowModes.Overflow;}
            float estimated=Mathf.Ceil(d.text.Length/Mathf.Max(1,(size.x-48)/8))*21;float bodyHeight=d.id.StartsWith("interaction:")?42:Mathf.Min(size.y*.5f,Mathf.Max(100,estimated));var speech=MobileScroll(narrative,24,85,size.x-48,bodyHeight,Mathf.Max(bodyHeight,estimated));Text(speech,"Réplique",0,0,size.x-60,Mathf.Max(bodyHeight,estimated),d.text,16,AdventureUI.Paper);
            float y=85+bodyHeight+9;var content=MobileScroll(narrative,18,y,size.x-36,size.y-y-12,options.Length*52);
            for(int i=0;i<options.Length;i++){var c=options[i];var b=Button(content,c.text,0,i*52,size.x-36,48,()=>campaign.Choose(c.id));b.GetComponentInChildren<TMP_Text>().fontSize=16;b.targetGraphic.color=Color.white;}
            Select(0);
        }
        void MobileQuest(QuestDefinition q,bool compact)
        {
            var state=campaign.QuestState(q.id);portraits.SetActor(q.giverId);var p=compact?offer:details;var size=MobileSize;if(compact)size.x=Mathf.Min(650,size.x);p.sizeDelta=size;p.localScale=Vector3.one*MobileUnit;p.anchoredPosition=Vector2.zero;
            Portrait(p,44,9,54);Text(p,"PNJ",84,15,size.x-150,27,campaign.CharacterName(q.giverId).ToUpperInvariant(),19,AdventureUI.Gold);Text(p,"Titre",84,43,size.x-150,46,q.title,17,AdventureUI.Paper);
            if(!compact)Button(p,"X",size.x-65,10,55,45,campaign.CloseQuest);
            bool showBody=!compact&&size.x>=600;float column=showBody?Mathf.Max(280,size.x-220):size.x-32;var body=MobileScroll(p,16,99,column,size.y-169,560+q.actionIds.Length*29);
            Text(body,"Description",0,0,column-12,76,state.validated?q.completion:q.description,16);float y=85;
            Text(body,"GOAL",0,y,column-12,28,"GOAL",18,AdventureUI.Gold);y+=35;
            foreach(var id in q.actionIds){bool done=campaign.State.completedActions.Contains(id);AdventureUI.Shape(AdventureUI.Rect(body,"État objectif",new Vector2(0,1),new Vector2(0,1),new Vector2(1,-y-4),new Vector2(10,12)),done?new Color(.5f,.86f,.6f):AdventureUI.Gold,done?"check":"diamond");Text(body,"Objectif",19,y,column-32,44,campaign.FindAction(id)?.title??id,16,done?new Color(.59f,.88f,.62f):AdventureUI.Paper);y+=46;}
            Text(body,"Progression",0,y,column-10,25,$"{state.completedObjectives.Length}/{q.actionIds.Length} objectifs réalisés",14);y+=34;Text(body,"REWARDS",0,y,column-10,27,"REWARDS",18,AdventureUI.Gold);y+=34;
            for(int i=0;i<q.rewards.Length;i++)
            {
                var r=q.rewards[i];int columns=Mathf.Max(1,Mathf.FloorToInt(column/83));float x=i%columns*83,ry=y+i/columns*100;
                var b=Button(body,(r.kind=="resource"||r.kind=="knowledge"?r.amount.ToString("0")+" ":"")+r.name,x,ry,77,90,()=>campaign.Inform(r.name+" · "+r.description));b.GetComponentInChildren<TMP_Text>().fontSize=14;
            }
            y+=Mathf.CeilToInt(q.rewards.Length/(float)Mathf.Max(1,Mathf.FloorToInt(column/83)))*100+8;Text(body,"TIP",0,y,column-10,24,"TIP",18,AdventureUI.Gold);Text(body,"Conseil",0,y+31,column-10,100,campaign.QuestTip(q),16);
            body.sizeDelta=new Vector2(body.sizeDelta.x,y+135);
            if(showBody)
            {
                var picture=AdventureUI.Rect(p,"PNJ natif",new Vector2(1,.5f),new Vector2(1,.5f),new Vector2(-8,0),new Vector2(180,250)).gameObject.AddComponent<UnityEngine.UI.RawImage>();picture.texture=portraits.Body;picture.material=portraits.BodyComposite;picture.raycastTarget=false;
            }
            if(compact){Button(p,q.required?"Plus tard":"Refuser",16,size.y-60,(size.x-44)/2,48,()=>campaign.DeferQuest(q.id));Button(p,"Accepter",28+(size.x-44)/2,size.y-60,(size.x-44)/2,48,()=>campaign.AcceptQuest(q.id),true);}
            else
            {
                string label;UnityEngine.Events.UnityAction callback;
                if(state.status==QuestStatus.READY_TO_CLAIM){label="Réclamer les récompenses";callback=()=>campaign.ClaimQuest(q.id);}
                else if(state.status==QuestStatus.READY_TO_VALIDATE&&campaign.Near(q.giverId)){label="Vérifier les résultats";callback=()=>campaign.ValidateQuest(q.id);}
                else if(state.claimed){label="Revenir au village";callback=campaign.CloseQuest;}
                else if(!state.accepted){label="Rejoindre le référent";callback=()=>{campaign.TrackQuest(q.id);};}
                else{label="Suivre la quête";callback=()=>campaign.TrackQuest(q.id);}
                Button(p,label,16,size.y-60,size.x-32,48,callback,true);
            }
        }
    }
}
