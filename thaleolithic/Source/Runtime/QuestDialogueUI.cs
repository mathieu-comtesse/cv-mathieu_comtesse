using System;
using System.Linq;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    public sealed partial class QuestDialogueUI:MonoBehaviour
    {
        CampaignRuntime campaign;TMP_FontAsset font;DialoguePortraitPresenter portraits;UISettingsController settings;
        RectTransform narrative,offer,details;CanvasGroup activeGroup;string shown="";float opened;readonly List<UnityEngine.UI.Button> choices=new List<UnityEngine.UI.Button>();int selection;
        public RectTransform ActivePanel{get;private set;}public bool Built=>narrative!=null;public string CurrentSpeaker=>portraits?.ActorId;
        public void Build(CampaignRuntime runtime,Canvas canvas,TMP_FontAsset sourceFont)
        {
            campaign=runtime;font=sourceFont;settings=GetComponent<UISettingsController>();portraits=gameObject.AddComponent<DialoguePortraitPresenter>();portraits.Initialize(campaign);
            narrative=Panel(canvas.transform,"Dialogue narratif",new Vector2(860,560),new Vector2(0,-55),new Color(.027f,.019f,.035f,.94f));
            offer=Panel(canvas.transform,"Proposition de quête",new Vector2(520,795),new Vector2(0,-20),new Color(.055f,.035f,.04f,.94f));
            details=Panel(canvas.transform,"Fiche de quête",new Vector2(1320,800),Vector2.zero,new Color(.13f,.075f,.045f,.9f));
            campaign.Changed+=Refresh;Refresh();
        }
        RectTransform Panel(Transform parent,string name,Vector2 size,Vector2 position,Color color)
        {var panel=AdventureUI.Rect(parent,name,Vector2.one*.5f,Vector2.one*.5f,position,size);var shape=TribalStyle.Panel(panel,"panel",TribalStyle.Ink,raycast:true);panel.gameObject.AddComponent<CanvasGroup>();panel.gameObject.SetActive(false);return panel;}
        TMP_Text Text(Transform parent,string name,float x,float y,float w,float h,string value,float size=23,Color? color=null,TextAlignmentOptions alignment=TextAlignmentOptions.TopLeft)
        =>AdventureUI.Text(AdventureUI.Rect(parent,name,new Vector2(0,1),new Vector2(0,1),new Vector2(x,-y),new Vector2(w,h)),font,value,size,color,alignment);
        UnityEngine.UI.Button Button(Transform parent,string name,float x,float y,float w,float h,UnityEngine.Events.UnityAction action,bool gold=false)
        {var button=TribalStyle.Button(AdventureUI.Rect(parent,name,new Vector2(0,1),new Vector2(0,1),new Vector2(x,-y),new Vector2(w,h)),font,name,action,gold);if(gold){button.GetComponentInChildren<TMP_Text>().color=new Color(.06f,.035f,.025f);button.GetComponentInChildren<TMP_Text>().alignment=TextAlignmentOptions.Center;}choices.Add(button);return button;}
        void Portrait(Transform parent,float x,float y,float size)
        {var rim=AdventureUI.Rect(parent,"Portrait en losange",new Vector2(0,1),new Vector2(.5f,1),new Vector2(x,-y),Vector2.one*size);AdventureUI.Shape(rim,AdventureUI.Paper);var inner=AdventureUI.Fill(rim,"Masque du portrait",4);AdventureUI.Shape(inner,new Color(.1f,.07f,.08f));inner.gameObject.AddComponent<UnityEngine.UI.Mask>();var image=AdventureUI.Fill(inner,"Visage du PNJ").gameObject.AddComponent<UnityEngine.UI.RawImage>();image.texture=portraits.Portrait;image.raycastTarget=false;}
        public void Refresh()
        {
            if(!Built||campaign.State==null)return;bool playing=campaign.cinematicDirector.IsPlaying||campaign.IncidentModal;
            string key=playing?"":campaign.Dialogue!=null?"narrative:"+campaign.Dialogue.id:campaign.QuestOverlay?campaign.QuestPanel+":"+campaign.PresentedQuestId+":"+campaign.QuestState(campaign.PresentedQuestId)?.status:"";
            if(!string.IsNullOrEmpty(key))key+=":"+MobileControls.TouchActive+":"+Screen.width+"x"+Screen.height;
            if(key==shown)return;shown=key;choices.Clear();selection=0;ActivePanel=null;
            foreach(var p in new[]{narrative,offer,details}){p.gameObject.SetActive(false);p.localScale=Vector3.one;foreach(Transform t in p){t.gameObject.SetActive(false);Destroy(t.gameObject);}}
            portraits.Visible=!string.IsNullOrEmpty(key);if(!portraits.Visible)return;
            if(campaign.Dialogue!=null){ActivePanel=narrative;Narrative();}
            else if(campaign.PresentedQuest!=null){ActivePanel=campaign.QuestPanel=="Offer"?offer:details;Quest(campaign.PresentedQuest,ActivePanel==offer);}
            if(ActivePanel==null)return;ActivePanel.gameObject.SetActive(true);ActivePanel.SetAsLastSibling();activeGroup=ActivePanel.GetComponent<CanvasGroup>();opened=Time.unscaledTime;activeGroup.alpha=settings.preferences.reducedMotion?1:0;
        }
        void Narrative()
        {
            if(campaign.Dialogue.id.StartsWith("interaction:")){ContextActions();return;}
            if(campaign.Dialogue.id.StartsWith("document:")){Document();return;}
            portraits.BodyVisible=false;
            if(MobileControls.TouchActive){MobileNarrative();return;}
            var d=campaign.Dialogue;string actor=campaign.Data.characters.FirstOrDefault(c=>d.speaker.StartsWith(c.name,StringComparison.OrdinalIgnoreCase))?.id;
            actor??=string.IsNullOrEmpty(campaign.ConversationActorId)?"mathieu":campaign.ConversationActorId;portraits.SetActor(actor);
            var options=d.choices.Where(campaign.CanChoose).ToArray();float height=Mathf.Max(560,270+options.Length*52);narrative.sizeDelta=new Vector2(860,height);Portrait(narrative,430,-70,110);
            Text(narrative,"Nom",35,50,790,43,d.speaker.ToUpperInvariant(),30,AdventureUI.Paper,TextAlignmentOptions.Center);
            var brain=campaign.bindings.Find(actor)?.GetComponent<VillagerBrain>();if(brain!=null){var activity=Text(narrative,"Activité du PNJ",55,94,750,26,"ACTIVITÉ INTERROMPUE · "+brain.ConversationActivity,15,TribalStyle.Muted,TextAlignmentOptions.Center);activity.enableAutoSizing=true;activity.fontSizeMin=12;activity.fontSizeMax=15;activity.textWrappingMode=TextWrappingModes.NoWrap;activity.overflowMode=TextOverflowModes.Overflow;}
            Text(narrative,"Réplique",55,128,750,126,d.text,24,Color.white,TextAlignmentOptions.Top);
            for(int i=0;i<options.Length;i++)
            {
                var c=options[i];var b=Button(narrative,c.text,45,268+i*52,770,47,()=>campaign.Choose(c.id));b.targetGraphic.color=new Color(0,0,0,0);var label=b.GetComponentInChildren<TMP_Text>();label.fontSize=22;label.alignment=TextAlignmentOptions.Center;
                var accent=b.gameObject.AddComponent<DialogueChoiceAccent>();accent.label=label;accent.line=AdventureUI.Rect(b.transform,"Soulignement",new Vector2(.5f,0),new Vector2(.5f,0),new Vector2(0,1),new Vector2(120,2));AdventureUI.Panel(accent.line,AdventureUI.Gold);accent.Set(false);
            }
            Select(0);
        }
        void Quest(QuestDefinition q,bool compact)
        {
            portraits.BodyVisible=!compact;
            if(MobileControls.TouchActive){MobileQuest(q,compact);return;}
            var r=campaign.QuestState(q.id);portraits.SetActor(q.giverId);var p=compact?offer:details;
            p.sizeDelta=compact?new Vector2(520,795):new Vector2(1320,800);p.anchoredPosition=compact?new Vector2(0,-20):Vector2.zero;
            if(compact){var header=AdventureUI.Rect(p,"En-tête turquoise",new Vector2(0,1),new Vector2(0,1),Vector2.zero,new Vector2(520,102));AdventureUI.Panel(header,new Color(.13f,.13f,.26f,.96f));Portrait(p,68,9,82);Text(p,"PNJ",126,30,350,46,campaign.CharacterName(q.giverId).ToUpperInvariant(),26);}
            else
            {
                AdventureUI.Shape(AdventureUI.Rect(p,"Losange de quête",new Vector2(0,1),new Vector2(0,1),new Vector2(30,-31),new Vector2(20,24)),AdventureUI.Gold);
                var render=AdventureUI.Rect(p,"PNJ 3D vivant",new Vector2(1,0),new Vector2(1,0),new Vector2(-12,95),new Vector2(440,600)).gameObject.AddComponent<UnityEngine.UI.RawImage>();render.texture=portraits.Body;render.material=portraits.BodyComposite;render.raycastTarget=false;
                Text(p,"Identité du PNJ",886,68,390,48,campaign.CharacterName(q.giverId).ToUpperInvariant(),24,AdventureUI.Gold,TextAlignmentOptions.Center);
            }
            float left=compact?28:36,width=compact?464:780,titleY=compact?122:25;
            Text(p,"Titre de la mission",compact?left:70,titleY,width-(compact?0:40),compact?70:80,(campaign.QuestPanel=="Completion"?"QUÊTE TERMINÉE\n":"")+q.title,compact?25:27,AdventureUI.Gold);
            float y=compact?204:110;Text(p,"Dialogue de mission",left,y,width,compact?89:85,r.validated?q.completion:q.description,compact?20:23);y+=compact?103:102;
            Text(p,"GOAL",left,y,width,29,"GOAL",21,AdventureUI.Gold);y+=37;
            for(int i=0;i<q.actionIds.Length;i++)
            {
                var a=campaign.FindAction(q.actionIds[i]);bool done=campaign.State.completedActions.Contains(q.actionIds[i]);float row=compact?32:41;
                AdventureUI.Shape(AdventureUI.Rect(p,"Objectif "+i,new Vector2(0,1),new Vector2(0,1),new Vector2(left,-y-5),new Vector2(15,18)),done?new Color(.5f,.86f,.57f):AdventureUI.Gold,done?"check":"diamond");
                Text(p,"Condition "+i,left+25,y,width-25,row,a?.title??q.actionIds[i],compact?18:21,done?new Color(.59f,.88f,.62f):AdventureUI.Paper);y+=row;
            }
            Text(p,"Progression",left,y+2,width,25,$"{r.completedObjectives.Length}/{q.actionIds.Length} objectifs réalisés",17);y+=36;
            Text(p,"REWARDS",left,y,width,28,"REWARDS",21,AdventureUI.Gold);y+=35;RewardIcons(p,q,left,y,compact?72:104,compact?62:72);y+=compact?82:96;
            Text(p,"TIP",left,y,width,23,"TIP",19,AdventureUI.Gold);Text(p,"Conseil",left,y+27,width,compact?55:58,campaign.QuestTip(q),compact?17:19);
            if(compact)
            {
                Button(p,q.required?"Plus tard":"Refuser",28,724,220,44,()=>campaign.DeferQuest(q.id));Button(p,"Accepter",270,724,222,44,()=>campaign.AcceptQuest(q.id),true);
            }
            else
            {
                string label;UnityEngine.Events.UnityAction callback;
                if(r.status==QuestStatus.READY_TO_CLAIM){label="Réclamer les récompenses";callback=()=>campaign.ClaimQuest(q.id);}
                else if(r.status==QuestStatus.READY_TO_VALIDATE){label=campaign.Near(q.giverId)?"Vérifier avec "+campaign.CharacterName(q.giverId):"Rejoindre "+campaign.CharacterName(q.giverId);callback=()=>{if(campaign.Near(q.giverId))campaign.ValidateQuest(q.id);else campaign.TrackQuest(q.id);};}
                else if(!r.accepted){label="Voir la proposition";callback=()=>campaign.OpenQuest(q.id,"Offer",true);}
                else if(r.claimed){label="Revenir au village";callback=campaign.CloseQuest;}
                else{label="Suivre la quête";callback=()=>campaign.TrackQuest(q.id);}
                Button(p,label,355,720,600,55,callback,true);Button(p,"Fermer",1130,725,155,45,campaign.CloseQuest);
                if(r.status==QuestStatus.ACTION_COMPLETED)Text(p,"Vérification requise",36,670,1100,35,"Travaux ou vérification encore nécessaires : aucune récompense distribuée.",19,AdventureUI.Gold);
            }
        }
        void RewardIcons(RectTransform p,QuestDefinition q,float x,float y,float spacing,float size)
        {
            for(int i=0;i<q.rewards.Length;i++)
            {
                var r=q.rewards[i];var box=AdventureUI.Rect(p,"Récompense "+r.id,new Vector2(0,1),new Vector2(0,1),new Vector2(x+i*spacing,-y),new Vector2(size,size));AdventureUI.Panel(box,new Color(.04f,.03f,.04f,.85f));
                string shape=r.kind=="resource"?r.id:r.kind=="evidence"?"book":r.kind=="competence"?"tool":"diamond";TribalStyle.Icon(AdventureUI.Rect(box,"Icône",new Vector2(.5f,.65f),Vector2.one*.5f,Vector2.zero,new Vector2(35,36)),r.kind=="resource"?r.id:r.kind=="evidence"?"evidence":r.kind=="competence"?"craft":"knowledge");
                Text(box,"Quantité",3,size-23,size-6,20,r.kind=="resource"||r.kind=="knowledge"?"x"+r.amount.ToString("0"):r.kind=="evidence"?"Carnet":"Savoir",14,AdventureUI.Paper,TextAlignmentOptions.Center);
                var tooltip=Text(p,"Détail récompense "+i,30,674,1200,37,r.name+" · "+r.description,18,AdventureUI.Paper);tooltip.gameObject.SetActive(false);var tip=box.gameObject.AddComponent<AdventureTooltip>();box.GetComponent<UnityEngine.UI.Image>().raycastTarget=true;tip.label=tooltip;tip.caption=r.name+" · "+r.description;
            }
        }
        void Select(int index){if(choices.Count==0)return;selection=(index+choices.Count)%choices.Count;for(int i=0;i<choices.Count;i++)choices[i].GetComponent<DialogueChoiceAccent>()?.Set(i==selection);EventSystem.current?.SetSelectedGameObject(choices[selection].gameObject);}
        void Update()
        {
            if(ActivePanel==null||!ActivePanel.gameObject.activeSelf)return;activeGroup.alpha=settings.preferences.reducedMotion?1:Mathf.Clamp01((Time.unscaledTime-opened)/.25f);
            activeGroup.interactable=Time.unscaledTime-opened>.18f;
            var k=Keyboard.current;var g=Gamepad.current;bool down=k?.downArrowKey.wasPressedThisFrame==true||g?.dpad.down.wasPressedThisFrame==true,up=k?.upArrowKey.wasPressedThisFrame==true||g?.dpad.up.wasPressedThisFrame==true;
            if(down)Select(selection+1);if(up)Select(selection-1);
            // EventSystem owns Enter/Submit, avoiding a second click when keyboard navigation is used.
            if(k?.escapeKey.wasPressedThisFrame==true){settings.ConsumedEscapeFrame=Time.frameCount;if(campaign.Dialogue?.id.StartsWith("interaction:")==true||campaign.Dialogue?.id.StartsWith("document:")==true)campaign.Choose("interaction:cancel");else if(campaign.QuestOverlay){if(campaign.QuestPanel=="Offer")campaign.DeferQuest(campaign.PresentedQuestId);else campaign.CloseQuest();}}
        }
        void OnDestroy(){if(campaign!=null)campaign.Changed-=Refresh;}
    }
    public sealed class DialogueChoiceAccent:MonoBehaviour,IPointerEnterHandler,IPointerExitHandler,ISelectHandler,IDeselectHandler
    {
        public TMP_Text label;public RectTransform line;public void Set(bool on){if(label!=null)label.color=on?AdventureUI.Gold:AdventureUI.Paper;if(line!=null)line.gameObject.SetActive(on);}
        public void OnPointerEnter(PointerEventData e)=>Set(true);public void OnPointerExit(PointerEventData e)=>Set(false);public void OnSelect(BaseEventData e)=>Set(true);public void OnDeselect(BaseEventData e)=>Set(false);
    }
}
