using System;
using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class AdventureMenus
    {
        Vector2 mobileMenuSize;
        void RenderMobile()
        {
            var mobile=MobileControls.Instance;mobileMenuSize=mobile.Viewport;var size=new Vector2(mobile.Viewport.x-24,mobile.Viewport.y-24);window.sizeDelta=size;window.localScale=Vector3.one*mobile.Units;
            heading.fontSize=22;heading.rectTransform.anchoredPosition=new Vector2(18,-10);heading.rectTransform.sizeDelta=new Vector2(size.x-36,34);
            bool narrow=size.x<550;int columns=narrow?2:4;var tabs=new[]{"Inventaire","Fabrication","ISO 45001","Réglages"};for(int i=0;i<tabs.Length;i++){var rect=window.Find(tabs[i]) as RectTransform;rect.anchoredPosition=new Vector2(18+i%columns*(size.x-36)/columns,-51-i/columns*52);rect.sizeDelta=new Vector2((size.x-36)/columns-8,44);rect.GetComponentInChildren<TMP_Text>().fontSize=16;}
            var close=window.Find("Fermer") as RectTransform;close.anchoredPosition=new Vector2(-18,10);close.sizeDelta=new Vector2(110,44);var closeText=close.GetComponentInChildren<TMP_Text>();closeText.fontSize=16;closeText.text="Fermer";window.Find("Commandes menu").gameObject.SetActive(false);
            content.anchoredPosition=new Vector2(18,narrow?-159:-107);content.sizeDelta=new Vector2(size.x-36,Mathf.Max(120,size.y-(narrow?223:171)));
            switch(Mode){case "Inventaire":MobileInventory();break;case "Fabrication":MobileCraft();break;case "Réglages":MobileSettings();break;case "Commandes":MobileCommands();break;case "Missions":MobileMissions();break;case "ISO 45001":MobileKnowledge();break;default:MobileMissions();break;}
        }
        TMP_Text MobileText(string name,float x,float y,float w,float h,string text,float size=16,Color? color=null)=>AdventureUI.Text(AdventureUI.Rect(content,name,new Vector2(0,1),new Vector2(0,1),new Vector2(x,-y),new Vector2(w,h)),font,text,size,color,TextAlignmentOptions.TopLeft);
        UnityEngine.UI.Button MobileButton(string title,float x,float y,float w,float h,UnityEngine.Events.UnityAction action)
        {var b=AdventureUI.Button(AdventureUI.Rect(content,title,new Vector2(0,1),new Vector2(0,1),new Vector2(x,-y),new Vector2(w,h)),font,title,action);b.GetComponentInChildren<TMP_Text>().fontSize=16;return b;}
        void MobileInventory()
        {
            float width=content.rect.width,height=content.rect.height,left=Mathf.Min(370,width*.48f);bool narrow=width<550;int columns=narrow?2:4;float cell=Mathf.Min(86,(left-18)/columns);
            for(int i=0;i<8;i++){int index=i;var item=inventory.items[i];var b=MobileButton(item.name+"\n"+inventory.Quantity(item.id).ToString("0"),i%columns*(cell+4),i/columns*91,cell,86,()=>inventory.Select(index));b.GetComponentInChildren<TMP_Text>().fontSize=16;b.targetGraphic.color=i==inventory.Selected?new Color(.5f,.34f,.12f):new Color(.1f,.07f,.08f);}
            var current=inventory.Item;MobileText("Objet",left+18,0,width-left-18,45,current.name.ToUpperInvariant()+" · "+inventory.Quantity(current.id).ToString("0"),20,AdventureUI.Gold);
            MobileText("Description",left+18,53,width-left-18,Mathf.Max(60,height-111),current.description,16);
            MobileButton(current.id=="food"?"Consommer":current.id=="tool"?"Équiper":current.id=="notebook"||current.id=="evidence"?"Carnet":"Recettes",left+18,height-48,width-left-18,46,inventory.Use).interactable=inventory.Quantity(current.id)>0;
        }
        void MobileCraft()
        {
            float width=content.rect.width,height=content.rect.height;bool narrow=width<550;float left=narrow?width:Mathf.Min(310,width*.43f),listHeight=narrow?Mathf.Min(240,height*.4f):height,detailX=narrow?0:left+15,detailY=narrow?listHeight+12:0,detailWidth=narrow?width:width-left-15;var recipes=Recipes;var list=Scroll("Recettes tactiles",Vector2.zero,new Vector2(left,listHeight),recipes.Length);
            foreach(var recipe in recipes){var a=recipe;var r=AdventureUI.Rect(list,a.title,Vector2.zero,Vector2.zero,Vector2.zero,new Vector2(left-8,52));r.gameObject.AddComponent<UnityEngine.UI.LayoutElement>().preferredHeight=52;var b=AdventureUI.Button(r,font,a.title,()=>{selectedRecipeId=a.id;Render();});b.GetComponentInChildren<TMP_Text>().fontSize=16;}
            var chosen=recipes.FirstOrDefault(a=>a.id==selectedRecipeId)??recipes.FirstOrDefault();if(chosen==null)return;selectedRecipeId=chosen.id;
            var panel=Scroll("Conditions de fabrication",new Vector2(detailX,-detailY),new Vector2(detailWidth,Mathf.Max(90,height-detailY-58)),1);var description=AdventureUI.Rect(panel,"Recette",Vector2.zero,Vector2.zero,Vector2.zero,new Vector2(detailWidth-15,250));description.gameObject.AddComponent<UnityEngine.UI.LayoutElement>().preferredHeight=250;
            string materials=string.Join("\n",chosen.costs.Select(cost=>$"{cost.id} : {campaign.Value("resource",cost.id):0}/{cost.amount:0}"));AdventureUI.Text(description,font,chosen.title+"\n\n"+materials+$"\n\nDurée : {chosen.durationSeconds:0} s\nCompétence : {chosen.minimumCompetence:0}\n"+(campaign.CanExecute(chosen,out var reason,true)?"Matériaux et conditions réunis.":reason),16);
            bool near=campaign.Near(chosen.targetBindingId);var button=MobileButton(near?"Fabriquer / construire":"Rejoindre l’atelier",detailX,height-48,detailWidth,46,()=>{Close();if(near)campaign.GetComponent<WorldInteraction>().Execute(chosen.id);else campaign.GetComponent<QuestNavigationController>().Follow(chosen.id);});button.interactable=campaign.CanExecute(chosen,out _,true);
        }
        void MobileSettings()
        {
            var p=settings.preferences;var body=Scroll("Réglages tactiles",Vector2.zero,content.sizeDelta,18);
            void Option(string label,UnityEngine.Events.UnityAction action){var rect=AdventureUI.Rect(body,label,Vector2.zero,Vector2.zero,Vector2.zero,new Vector2(content.rect.width-10,48));rect.gameObject.AddComponent<UnityEngine.UI.LayoutElement>().preferredHeight=48;var b=AdventureUI.Button(rect,font,label,()=>{action();settings.Save();Render();});b.GetComponentInChildren<TMP_Text>().fontSize=16;}
            Option("Commandes : "+new[]{"automatiques","tactiles","clavier et souris"}[p.inputMode],()=>p.inputMode=(p.inputMode+1)%3);
            Option("Course : "+(p.autoRun?"joystick automatique":"bouton manuel"),()=>p.autoRun=!p.autoRun);
            Option("Sensibilité de caméra : "+p.touchSensitivity.ToString("0.0"),()=>p.touchSensitivity=p.touchSensitivity>=2?.5f:p.touchSensitivity+.25f);
            Option("Axe vertical : "+(p.invertTouchY?"inversé":"normal"),()=>p.invertTouchY=!p.invertTouchY);
            Option("Qualité : "+new[]{"faible","moyenne","élevée","automatique"}[p.graphicsProfile],()=>{p.graphicsProfile=(p.graphicsProfile+1)%4;GetComponent<MobileQuality>()?.Apply();});
            Option("Accidents : "+new[]{"gore complet","gore modéré","cartoon atténué"}[p.goreLevel],()=>p.goreLevel=(p.goreLevel+1)%3);
            Option("Animations des fenêtres : "+(p.reducedMotion?"réduites":"actives"),()=>p.reducedMotion=!p.reducedMotion);
            Option("Sous-titres : "+(p.subtitles?"oui":"non"),()=>p.subtitles=!p.subtitles);
            Option("GPS : "+new[]{"complet","discret","exploration libre"}[p.gpsMode],()=>p.gpsMode=(p.gpsMode+1)%3);
            Option("Carte : "+(p.headingUp?"direction du joueur":"nord fixe"),()=>p.headingUp=!p.headingUp);
            Option("Contraste GPS : "+(p.highContrast?"renforcé":"doré"),()=>p.highContrast=!p.highContrast);
            Option("Réactiver les aides",()=>{p.controls=p.autoHints=true;p.learnedControls=0;});
            Option("Sauvegarder maintenant",campaign.Save);
            Option("Revenir aux missions",()=>{Mode="Missions";});
        }
        void MobileMissions()
        {
            var quests=campaign.Data.quests.Where(q=>campaign.QuestState(q.id).status!=QuestStatus.LOCKED).ToArray();var body=Scroll("Missions et journal",Vector2.zero,new Vector2(content.rect.width,content.rect.height-56),quests.Length);
            foreach(var q in quests){var quest=q;var state=campaign.QuestState(q.id);var rect=AdventureUI.Rect(body,q.id,Vector2.zero,Vector2.zero,Vector2.zero,new Vector2(content.rect.width-8,52));rect.gameObject.AddComponent<UnityEngine.UI.LayoutElement>().preferredHeight=52;var button=AdventureUI.Button(rect,font,q.title+" · "+QuestStatusName(state.status),()=>{Close();campaign.OpenQuest(quest.id,"Details");});button.GetComponentInChildren<TMP_Text>().fontSize=16;}
            MobileButton("Acte suivant",0,content.rect.height-48,210,46,()=>{Close();campaign.AdvanceAct();}).interactable=campaign.IsActComplete;
            MobileText("Temps restant",235,content.rect.height-40,content.rect.width-250,35,$"Conseil dans {Mathf.CeilToInt(campaign.RemainingSeconds/60)} min · "+campaign.CurrentAct.title,16);
        }
        string QuestStatusName(QuestStatus status)=>status==QuestStatus.COMPLETED?"terminée":status==QuestStatus.READY_TO_CLAIM?"récompenses à réclamer":status==QuestStatus.READY_TO_VALIDATE?"à vérifier":status==QuestStatus.REPLACED?"enquête ouverte":status==QuestStatus.AVAILABLE||status==QuestStatus.DEFERRED?"disponible":"en cours";
        void MobileCommands()
        {
            var actor=inventory.CommandTarget();var state=campaign.State.characters.FirstOrDefault(c=>campaign.bindings.Find(c.id)==actor);if(state==null){MobileText("Aucune cible",0,0,content.rect.width,80,"Approche un membre de la tribu et sélectionne-le pour donner une consigne.");return;}
            MobileText("Membre",0,0,content.rect.width,90,$"{campaign.CharacterName(state.id)} · Énergie {state.energy:0} · Fatigue {state.fatigue:0}\nCompétence {state.competence:0}",18);
            MobileButton("Se reposer",0,105,240,48,()=>{state.assignment="repos";campaign.Save();Render();});MobileButton("Reprendre l’activité",258,105,260,48,()=>{state.assignment="";campaign.Save();Render();});
        }
        void MobileKnowledge(){RenderKnowledge(content,font,true);}
    }
}
