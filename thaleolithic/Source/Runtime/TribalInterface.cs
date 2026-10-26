using System;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
namespace UngaBunga45001
{
    public sealed partial class TribalInterface:MonoBehaviour
    {
        public RectTransform Root{get;private set;}public RectTransform Content{get;private set;}public TMP_Text Heading{get;private set;}
        CampaignRuntime campaign;AdventureMenus owner;InventoryController inventory;UISettingsController settings;TMP_FontAsset font;Canvas canvas;
        RectTransform header,footer,tip;TMP_Text tipText;DialoguePortraitPresenter preview;CampaignSave observedSave;float nextRefresh;
        readonly List<Action> live=new List<Action>();Vector2 renderedSize;string structure="";bool rendering;float transitionAt;
        string selectedPerson="mathieu",peopleSection="TÂCHES",selectedTask="",questCategory="Principales",selectedQuest="",codexCategory="ISO 45001",selectedCodex="",inventoryContext="Objet",selectedRecipe="";
        readonly string[] tabs={"Peuple","Carte","Inventaire","Technologie","Quêtes","Codex"};
        public Vector2 Viewport=>MobileControls.Instance!=null?MobileControls.Instance.Viewport:new Vector2(Screen.width,Screen.height);
        float Unit=>MobileControls.Instance!=null?MobileControls.Instance.Units:canvas.GetComponent<RectTransform>().rect.width/Mathf.Max(1,Screen.width);
        bool Narrow=>Viewport.x<600;bool Small=>Viewport.x<1000;float FontSize=>Small?16:18;float W=>Content.rect.width;float H=>Content.rect.height;
        public static string Normalize(string mode)
        {switch(mode){case "Commandes":case "PEUPLE":return "Peuple";case "ISO 45001":case "TECHNOLOGIE":return "Technologie";case "Missions":case "Journal":case "QUÊTES":return "Quêtes";case "CARTE":return "Carte";case "INVENTAIRE":case "Sac":return "Inventaire";case "CODEX":return "Codex";case "Pause":return "Réglages";default:return mode;}}
        public void Build(CampaignRuntime runtime,AdventureMenus controller,Canvas target,TMP_FontAsset sourceFont)
        {
            campaign=runtime;owner=controller;canvas=target;font=sourceFont;inventory=GetComponent<InventoryController>();settings=GetComponent<UISettingsController>();
            Root=AdventureUI.Rect(canvas.transform,"Gestion de la tribu V8",Vector2.one*.5f,Vector2.one*.5f,Vector2.zero,Viewport);var group=Root.gameObject.AddComponent<CanvasGroup>();group.alpha=1;
            var background=AdventureUI.Fill(Root,"Monde assombri").gameObject.AddComponent<UnityEngine.UI.Image>();background.color=new Color(.018f,.012f,.035f,.72f);background.raycastTarget=true;
            header=TribalStyle.Top(Root,"Navigation principale",0,0,Viewport.x,84);TribalStyle.Panel(header,left:new Color(.025f,.016f,.03f,.82f));
            Content=TribalStyle.Top(Root,"Écran de gestion",24,98,Viewport.x-48,Viewport.y-132);
            footer=TribalStyle.Top(Root,"Commandes de gestion",24,Viewport.y-30,Viewport.x-48,24);
            tip=TribalStyle.Top(Root,"Description contextuelle",20,Viewport.y-132,360,90);TribalStyle.Panel(tip,left:TribalStyle.Ink);tipText=TribalStyle.Text(AdventureUI.Fill(tip,"Texte",12),font,"",16);tip.gameObject.SetActive(false);
            preview=gameObject.AddComponent<DialoguePortraitPresenter>();preview.Initialize(campaign);Root.gameObject.SetActive(false);
        }
        string StructureStamp()=>campaign.State==null?"":campaign.State.completedActions.Count+":"+campaign.State.accidents.Count+":"+string.Join(",",campaign.State.tribalTasks.Select(t=>t.id+t.status))+":"+string.Join(",",campaign.State.quests.Select(q=>q.id+q.status))+":"+string.Join(",",campaign.State.characters.Select(c=>c.id+c.alive+c.available))+":"+string.Join(",",campaign.State.buildings.Select(b=>b.id+b.value));
        public void Render()
        {
            if(rendering||Root==null||campaign.State==null)return;rendering=true;
            try
            {
                GetComponent<CampaignMap>()?.SetTribalHost(null);
                foreach(Transform child in Content){child.gameObject.SetActive(false);Destroy(child.gameObject);}foreach(Transform child in header){child.gameObject.SetActive(false);Destroy(child.gameObject);}foreach(Transform child in footer){child.gameObject.SetActive(false);Destroy(child.gameObject);}live.Clear();tip.gameObject.SetActive(false);preview.Visible=false;
                observedSave=campaign.State;renderedSize=Viewport;structure=StructureStamp();Root.sizeDelta=Viewport;Root.localScale=Vector3.one*Unit;float hh=Narrow?112:84,margin=Small?12:24;
                header.sizeDelta=new Vector2(Viewport.x,hh);Content.anchoredPosition=new Vector2(margin,-hh-12);Content.sizeDelta=new Vector2(Viewport.x-margin*2,Mathf.Max(140,Viewport.y-hh-48));footer.anchoredPosition=new Vector2(margin,-Viewport.y+26);footer.sizeDelta=new Vector2(Viewport.x-margin*2,24);
                transitionAt=Time.unscaledTime;DrawNavigation();Canvas.ForceUpdateCanvases();
                switch(owner.Mode){case "Peuple":DrawPeople();break;case "Inventaire":DrawInventory();break;case "Fabrication":inventoryContext="Atelier";narrowInventoryPage="Atelier";DrawInventory();break;case "Carte":DrawMap();break;case "Technologie":DrawTechnology();break;case "Quêtes":DrawQuests();break;case "Codex":DrawCodex();break;case "Réglages":DrawSettings();break;default:DrawQuests();break;}
                var help=TribalStyle.Text(TribalStyle.Top(footer,"Aides",0,0,Mathf.Max(100,footer.rect.width-150),24),font,MobileControls.TouchActive?"Toucher : sélectionner  ·  Glisser : parcourir":"Sélection : clic  ·  Inventaire : "+settings.Binding("inventory")+"  ·  Carte : "+settings.Binding("map")+"  ·  Fermer : Échap",Small?12:14,TribalStyle.Muted);
                var options=TribalStyle.Button(TribalStyle.Top(footer,"Réglages",footer.rect.width-136,-4,136,28),font,"RÉGLAGES",()=>owner.Open("Réglages"));options.GetComponentInChildren<TMP_Text>().fontSize=12;
                RefreshValues();
            }finally{rendering=false;}
        }
        void DrawNavigation()
        {
            Heading=TribalStyle.Text(TribalStyle.Top(header,"THALEOLITHIC",20,20,160,46),font,"THALEOLITHIC",12,TribalStyle.Muted,true);Heading.gameObject.SetActive(Viewport.x>=1100);
            float left=Viewport.x>=1100?210:12;int columns=Narrow?3:6;float width=(Viewport.x-left-72)/columns;string current=owner.Mode=="Fabrication"?"Inventaire":owner.Mode;
            for(int i=0;i<tabs.Length;i++)
            {
                string mode=tabs[i];float x=left+i%columns*width,y=Narrow?6+i/columns*49:16;var r=TribalStyle.Top(header,mode,x,y,width-4,44);var button=TribalStyle.Button(r,font,mode.ToUpperInvariant(),()=>owner.Open(mode));var face=button.targetGraphic as TribalPolygon;face.left=face.right=Color.clear;
                var label=button.GetComponentInChildren<TMP_Text>();label.fontSize=Small?12:14;label.characterSpacing=Small?.5f:2;label.alignment=TextAlignmentOptions.Center;label.color=mode==current?TribalStyle.Paper:TribalStyle.Muted;
                if(mode==current){var line=TribalStyle.Top(header,"Onglet actif",x+8,y+45,width-20,3);TribalStyle.Panel(line,"row",TribalStyle.Gold,TribalStyle.Pink);}
            }
            var close=TribalStyle.Button(TribalStyle.Top(header,"Fermer la gestion",Viewport.x-60,14,44,44),font,"X",owner.Close);close.GetComponentInChildren<TMP_Text>().alignment=TextAlignmentOptions.Center;
        }
        TMP_Text Label(RectTransform parent,string name,float x,float y,float width,float height,string value,float? size=null,Color? color=null,bool heading=false)
        =>TribalStyle.Text(TribalStyle.Top(parent,name,x,y,width,height),font,value,size??FontSize,color,heading);
        TMP_Text Bound(RectTransform parent,string name,float x,float y,float width,float height,Func<string> value,float? size=null,Color? color=null)
        {var text=Label(parent,name,x,y,width,height,value(),size,color);live.Add(()=>{if(text!=null)text.text=value();});return text;}
        UnityEngine.UI.Button ActionButton(RectTransform parent,string name,float x,float y,float width,float height,UnityEngine.Events.UnityAction callback,bool selected=false)
        {var button=TribalStyle.Button(TribalStyle.Top(parent,name,x,y,width,height),font,name,callback,selected);button.GetComponentInChildren<TMP_Text>().fontSize=FontSize;return button;}
        void Explain(string text){campaign.Inform(text);ShowTip(text,true);}
        void ShowTip(string text)=>ShowTip(text,false);
        void ShowTip(string text,bool explicitNotice){if(MobileControls.TouchActive&&!explicitNotice)return;tipText.text=text;tip.sizeDelta=new Vector2(Mathf.Min(400,Viewport.x-40),Mathf.Min(180,tipText.GetPreferredValues(text,Mathf.Min(376,Viewport.x-64),Mathf.Infinity).y+24));tip.anchoredPosition=new Vector2(20,-Viewport.y+tip.sizeDelta.y+42);tip.SetAsLastSibling();tip.gameObject.SetActive(true);}
        void AttachTip(GameObject target,string text){var hover=target.AddComponent<TribalTip>();hover.text=text;hover.show=ShowTip;hover.hide=()=>{if(tip!=null)tip.gameObject.SetActive(false);};}
        void RefreshValues(){foreach(var update in live)update();}
        void Update()
        {
            if(Root==null||!Root.gameObject.activeSelf)return;
            if(campaign.cinematicDirector.IsPlaying||campaign.IncidentModal){owner.Close();return;}
            if((renderedSize-Viewport).sqrMagnitude>1||observedSave!=campaign.State){owner.Render();return;}
            if(Time.unscaledTime>=nextRefresh){nextRefresh=Time.unscaledTime+.15f;if(structure!=StructureStamp()){owner.Render();return;}RefreshValues();}
        }
        void OnDisable(){if(preview!=null)preview.Visible=false;}
        void LateUpdate(){if(Root!=null&&Root.gameObject.activeSelf){Root.localScale=Vector3.one*Unit;Root.GetComponent<CanvasGroup>().alpha=settings.preferences.reducedMotion?1:Mathf.Clamp01((Time.unscaledTime-transitionAt)/.12f);}}
        public void Closed(){if(preview!=null)preview.Visible=false;GetComponent<CampaignMap>()?.SetTribalHost(null);}
    }
}
