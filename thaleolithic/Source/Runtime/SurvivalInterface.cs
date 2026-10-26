using System;
using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class SurvivalInterface:MonoBehaviour
    {
        CampaignRuntime campaign;UISettingsController settings;InventoryController inventory;AdventureMenus menus;QuestNavigationController nav;TMP_FontAsset font;ContextualControlsUI controlHints;
        public RectTransform GameplayRoot{get;private set;}public RectTransform SkipButton{get;private set;}
        RectTransform statusRoot,questRoot,hotbarRoot,controlsRoot,timerRoot,doneMark,activeMark;TMP_Text timer,quests,notification,prompt,controls,tooltip,states,targetLabel;
        readonly RectTransform[] fills=new RectTransform[4],slots=new RectTransform[8];readonly TMP_Text[] values=new TMP_Text[4],quantities=new TMP_Text[8];
        readonly string[] keys={"life","energy","food","fatigue"},titles={"Vie","Énergie","Nourriture","Fatigue"};
        string lastMessage,lastAction;float notificationUntil;readonly Color[] colors={new Color(1,.43f,.35f),new Color(.1f,.88f,.73f),new Color(.47f,.9f,.23f),new Color(.94f,.12f,.76f)};
        public void Build(CampaignRuntime runtime,Canvas canvas,TMP_FontAsset sourceFont,Texture2D portrait)
        {
            campaign=runtime;font=sourceFont;settings=GetComponent<UISettingsController>();inventory=GetComponent<InventoryController>();menus=GetComponent<AdventureMenus>();nav=GetComponent<QuestNavigationController>();
            GameplayRoot=AdventureUI.Fill(canvas.transform,"HUD survie et aventure");statusRoot=AdventureUI.Rect(GameplayRoot,"Portrait et survie",new Vector2(0,1),new Vector2(0,1),new Vector2(28,-28),new Vector2(455,150));
            var rim=AdventureUI.Rect(statusRoot,"Médaillon losange",new Vector2(0,1),new Vector2(0,1),Vector2.zero,new Vector2(108,108));AdventureUI.Shape(rim,AdventureUI.Paper);
            var inner=AdventureUI.Fill(rim,"Portrait masqué",5);var diamond=AdventureUI.Shape(inner,new Color(.18f,.13f,.14f));var mask=inner.gameObject.AddComponent<UnityEngine.UI.Mask>();mask.showMaskGraphic=true;
            var picture=AdventureUI.Fill(inner,"Portrait du joueur").gameObject.AddComponent<UnityEngine.UI.RawImage>();picture.texture=Resources.Load<Texture2D>("TribalUI/Portraits/dylan")??portrait;picture.raycastTarget=false;
            tooltip=AdventureUI.Text(AdventureUI.Rect(statusRoot,"Infobulle survie",new Vector2(0,1),new Vector2(0,1),new Vector2(118,-130),new Vector2(480,55)),font,"",18);tooltip.gameObject.SetActive(false);
            for(int i=0;i<4;i++)
            {
                int index=i;var frame=AdventureUI.Rect(statusRoot,titles[i],new Vector2(0,1),new Vector2(0,1),new Vector2(130,-5-i*25),new Vector2(295,18));AdventureUI.Shape(frame,new Color(.75f,.72f,.66f));
                var background=AdventureUI.Fill(frame,"Fond de jauge",2);AdventureUI.Shape(background,new Color(.055f,.045f,.065f,.95f),"bar");fills[i]=AdventureUI.Fill(background,"Valeur",1);TribalStyle.Panel(fills[i],"row",colors[i],i==0?TribalStyle.Pink:i==1?new Color(.05f,.5f,.88f):colors[i]);
                var icon=AdventureUI.Rect(statusRoot,titles[i]+" icône",new Vector2(0,1),new Vector2(0,1),new Vector2(112,-6-i*25),new Vector2(13,16));AdventureUI.Shape(icon,colors[i],i==0?"cross":i==2?"food":"diamond");
                values[i]=AdventureUI.Text(AdventureUI.Fill(frame,"Chiffres",1),font,"",14,Color.white,TextAlignmentOptions.Center);
                var hit=frame.GetComponent<AdventureShape>();hit.raycastTarget=true;var tip=frame.gameObject.AddComponent<AdventureTooltip>();tip.label=tooltip;tip.caption=titles[index];
            }
            states=AdventureUI.Text(AdventureUI.Rect(statusRoot,"États actifs",new Vector2(0,1),new Vector2(0,1),new Vector2(130,-111),new Vector2(350,30)),font,"",17);
            timerRoot=AdventureUI.Rect(GameplayRoot,"Conseil des Sages",new Vector2(.5f,1),new Vector2(.5f,1),new Vector2(0,-25),new Vector2(380,35));timer=AdventureUI.Text(timerRoot,font,"",21,AdventureUI.Paper,TextAlignmentOptions.Center);
            notification=AdventureUI.Text(AdventureUI.Rect(GameplayRoot,"Notification temporaire",new Vector2(.5f,1),new Vector2(.5f,1),new Vector2(0,-78),new Vector2(650,80)),font,"",24,AdventureUI.Gold,TextAlignmentOptions.Center);
            questRoot=AdventureUI.Rect(GameplayRoot,"Quête suivie",Vector2.one,Vector2.one,new Vector2(-28,-275),new Vector2(338,250));quests=AdventureUI.Text(questRoot,font,"",21);quests.alignment=TextAlignmentOptions.TopLeft;
            doneMark=AdventureUI.Rect(questRoot,"Objectif accompli",new Vector2(0,1),Vector2.one*.5f,Vector2.zero,new Vector2(14,16));AdventureUI.Shape(doneMark,new Color(.57f,.86f,.6f),"check");activeMark=AdventureUI.Rect(questRoot,"Objectif à suivre",new Vector2(0,1),Vector2.one*.5f,Vector2.zero,new Vector2(14,16));AdventureUI.Shape(activeMark,AdventureUI.Gold);
            hotbarRoot=AdventureUI.Rect(GameplayRoot,"Inventaire rapide",Vector2.zero,Vector2.zero,new Vector2(28,30),new Vector2(568,75));
            for(int i=0;i<8;i++)
            {int index=i;slots[i]=AdventureUI.Rect(hotbarRoot,"Emplacement "+(i+1),Vector2.zero,Vector2.zero,new Vector2(i*70,0),new Vector2(62,66));AdventureUI.Panel(slots[i],AdventureUI.Paper);AdventureUI.Panel(AdventureUI.Fill(slots[i],"Fond translucide",2),new Color(.03f,.025f,.04f,.72f));
                AdventureUI.Text(AdventureUI.Rect(slots[i],"Raccourci",new Vector2(0,1),new Vector2(0,1),new Vector2(4,-2),new Vector2(20,17)),font,(i+1).ToString(),14,AdventureUI.Gold);
                var icon=AdventureUI.Rect(slots[i],"Objet",Vector2.one*.5f,Vector2.one*.5f,Vector2.zero,new Vector2(32,35));TribalStyle.Icon(icon,inventory.items[i].id);
                quantities[i]=AdventureUI.Text(AdventureUI.Rect(slots[i],"Quantité",Vector2.one,Vector2.one,new Vector2(-3,-46),new Vector2(40,18)),font,"",15,Color.white,TextAlignmentOptions.Right);
                var button=slots[i].gameObject.AddComponent<UnityEngine.UI.Button>();button.targetGraphic=slots[i].GetComponent<UnityEngine.UI.Image>();button.targetGraphic.raycastTarget=true;button.onClick.AddListener(()=>inventory.Select(index));}
            controlsRoot=AdventureUI.Rect(GameplayRoot,"Aides contextuelles",Vector2.right,Vector2.right,new Vector2(-28,28),new Vector2(245,152));AdventureUI.Panel(controlsRoot,new Color(.02f,.025f,.055f,.58f));var hintRoot=AdventureUI.Fill(controlsRoot,"Commandes",8);controlHints=hintRoot.gameObject.AddComponent<ContextualControlsUI>();controlHints.Build(font);
            prompt=AdventureUI.Text(AdventureUI.Rect(GameplayRoot,"Interaction ciblée",new Vector2(.5f,.26f),new Vector2(.5f,.5f),Vector2.zero,new Vector2(700,70)),font,"",23,AdventureUI.Paper,TextAlignmentOptions.Center);
            targetLabel=AdventureUI.Text(AdventureUI.Rect(GameplayRoot,"Cible verrouillée",new Vector2(.5f,.35f),Vector2.one*.5f,Vector2.zero,new Vector2(500,35)),font,"",19,AdventureUI.Gold,TextAlignmentOptions.Center);
            SkipButton=AdventureUI.Rect(canvas.transform,"Passer la cinématique",Vector2.right,Vector2.right,new Vector2(-35,28),new Vector2(280,43));AdventureUI.Button(SkipButton,font,"Passer la cinématique",()=>campaign.cinematicDirector.Skip());
            inventory.Changed+=Refresh;
        }
        void OnDestroy(){if(inventory!=null)inventory.Changed-=Refresh;}
        public void Refresh()
        {
            if(campaign?.State==null||GameplayRoot==null)return;bool film=campaign.cinematicDirector.IsPlaying;bool overlay=menus.IsOpen||GetComponent<CampaignMap>().IsOpen;
            GameplayRoot.gameObject.SetActive(!campaign.MenhirActive&&!film&&!overlay&&!campaign.IncidentModal&&campaign.Dialogue==null&&!campaign.QuestOverlay&&campaign.Ending==null);SkipButton.gameObject.SetActive(film);
            foreach(var group in new[]{statusRoot,questRoot,hotbarRoot,controlsRoot,timerRoot})group.localScale=Vector3.one*settings.preferences.hudScale;
            for(int i=0;i<4;i++){float value=campaign.Value("stat",keys[i]);fills[i].anchorMax=new Vector2(Mathf.Clamp01(value/100),1);values[i].text=$"{value:0}/100";values[i].gameObject.SetActive(settings.preferences.numbers);fills[i].parent.parent.GetComponent<AdventureTooltip>().caption=$"{titles[i]} : {value:0}/100";}
            int sec=Mathf.CeilToInt(campaign.RemainingSeconds);timer.text=$"Conseil des Sages : {sec/60:00}:{sec%60:00}";
            states.text=(campaign.Value("stat","life")<50?"+ Blessure  ":"")+(campaign.Value("stat","fatigue")>=70?"! Fatigue critique  ":"")+(campaign.Value("stat","food")<20?"! Faim":"");
            var act=campaign.CurrentAct;var tracked=campaign.QuestFor(nav.Action)??campaign.Data.quests.FirstOrDefault(q=>nav.Action?.id.EndsWith(":"+q.id,StringComparison.Ordinal)==true);
            var last=campaign.State.history.Select(h=>campaign.FindAction(h.id)).LastOrDefault(a=>a!=null&&(tracked==null?a.actId==act.id:tracked.actionIds.Contains(a.id))&&campaign.State.completedActions.Contains(a.id));
            quests.text=$"<color=#F4C567><b>{tracked?.title??act.title}</b></color>\n\n";
            if(last!=null)quests.text+="<indent=23><color=#92DC99>"+last.title+"</color></indent>\n";
            if(nav.Action!=null)quests.text+=$"<indent=23><color=#FFD16A>{nav.Action.title}</color></indent>\n{nav.Distance:0} m";
            else if(campaign.IsActComplete)quests.text+="Acte terminé · ouvre le journal";
            if(!nav.Complete&&nav.Target!=null)quests.text+=nav.Replanning?"\nActualisation du parcours":"\nAucun chemin accessible";
            quests.text+="\n\n<size=17>Risques critiques : "+(campaign.State.risks.Count==0?"à évaluer":campaign.State.risks.Count(r=>r.value>=2).ToString())+"</size>";
            quests.ForceMeshUpdate(true);
            void PlaceMark(RectTransform mark,string text){int index=string.IsNullOrEmpty(text)?-1:quests.GetParsedText().IndexOf(text,StringComparison.Ordinal);bool show=index>=0&&index<quests.textInfo.characterCount;mark.gameObject.SetActive(show);if(show)mark.anchoredPosition=new Vector2(8,quests.textInfo.characterInfo[index].baseLine+6);}
            PlaceMark(doneMark,last?.title);PlaceMark(activeMark,nav.Action?.title);
            if(lastAction!=nav.Action?.id){if(lastAction!=null){notification.text="Nouvel objectif\n"+nav.Action?.title;notificationUntil=Time.unscaledTime+4;}lastAction=nav.Action?.id;}
            if(lastMessage!=campaign.Message){lastMessage=campaign.Message;if(!string.IsNullOrWhiteSpace(lastMessage)){notification.text=lastMessage;notificationUntil=Time.unscaledTime+4;}}
            notification.gameObject.SetActive(Time.unscaledTime<notificationUntil);
            var interaction=GetComponent<WorldInteraction>();var available=interaction.FocusActions.Where(a=>campaign.CanExecute(a,out _)).ToArray();
            string name=campaign.Data.characters.FirstOrDefault(c=>c.id==interaction.FocusBindingId)?.name;prompt.text=available.Length==0?"":settings.Binding("interact")+" : "+(name!=null?"Parler à "+name:available[0].title);
            for(int i=0;i<8;i++){float quantity=inventory.Quantity(inventory.items[i].id);quantities[i].text=quantity>0?quantity.ToString("0"):"";slots[i].GetComponent<UnityEngine.UI.Image>().color=i==inventory.Selected?AdventureUI.Gold:new Color(.55f,.52f,.46f,quantity>0?.65f:.3f);slots[i].Find("Objet").localScale=Vector3.one*settings.preferences.iconScale;slots[i].Find("Objet").GetComponent<UnityEngine.UI.RawImage>().color=quantity>0?Color.white:new Color(.4f,.4f,.4f,.35f);}
            controlsRoot.gameObject.SetActive(settings.ControlsVisible||inventory.CommandTarget()!=null&&settings.preferences.controls);var hints=new System.Collections.Generic.List<(string,string)>{("Inventaire",settings.Binding("inventory")),("Fabrication",settings.Binding("craft"))};
            if(inventory.CanUseCurrent)hints.Add(("Utiliser","mouse-left"));hints.Add(("Cibler","mouse-right"));if(inventory.CommandTarget()!=null)hints.Add(("Commandes",settings.Binding("commands")));controlHints.Set(hints.ToArray());
            targetLabel.text=inventory.LockedTarget==null?"":"Cible : "+(campaign.Data.characters.FirstOrDefault(c=>campaign.bindings.Find(c.id)==inventory.LockedTarget)?.name??"Cible");
        }
    }
}
