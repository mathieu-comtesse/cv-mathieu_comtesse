using System;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    [DefaultExecutionOrder(-70)]public sealed partial class AdventureMenus:MonoBehaviour
    {
        public bool IsOpen=>window!=null&&window.gameObject.activeSelf;public string Mode{get;private set;}="Inventaire";
        TribalInterface tribal;public bool TribalReady=>tribal!=null;
        CampaignRuntime campaign;UISettingsController settings;InventoryController inventory;TMP_FontAsset font;RectTransform window,content;TMP_Text heading,detail;
        bool previousPause;int recipeIndex;string craftCategory="Tout",selectedRecipeId="";string settingsPage="Affichage",chosenClause="";float nextRefresh;
        bool openedInPortrait;public bool PauseBeforeOpen=>openedInPortrait&&MobileControls.Instance!=null?MobileControls.Instance.UnderlyingPause:previousPause;
        public ActionDefinition[] Recipes=>campaign.Data.actions.Where(a=>(a.costs.Length>0||a.id.StartsWith("craft:"))&&(craftCategory=="Tout"||craftCategory=="Outils"&&a.id.StartsWith("craft:")||craftCategory=="Chantiers"&&!a.id.StartsWith("craft:"))).OrderBy(a=>campaign.CanExecute(a,out _,true)?0:1).ThenBy(a=>a.id.StartsWith("craft:")?0:1).ToArray();
        public void Build(CampaignRuntime runtime,Canvas canvas,TMP_FontAsset sourceFont)
        {
            campaign=runtime;font=sourceFont;settings=GetComponent<UISettingsController>();inventory=GetComponent<InventoryController>();
            tribal=gameObject.AddComponent<TribalInterface>();tribal.Build(runtime,this,canvas,font);window=tribal.Root;content=tribal.Content;
            inventory.Changed+=OnChanged;settings.Changed+=OnChanged;
        }
        void OnDestroy(){if(inventory!=null)inventory.Changed-=OnChanged;if(settings!=null)settings.Changed-=OnChanged;}
        void OnChanged(){if(IsOpen)Render();}
        void Update()
        {
            if(!IsOpen)return;
            if(tribal==null&&MobileControls.TouchActive&&(mobileMenuSize-MobileControls.Instance.Viewport).sqrMagnitude>1)Render();
            if(Keyboard.current?.escapeKey.wasPressedThisFrame==true&&settings.Rebinding==null&&settings.ConsumedEscapeFrame!=Time.frameCount){settings.ConsumedEscapeFrame=Time.frameCount;Close();return;}
            if(tribal==null&&Mouse.current?.rightButton.wasPressedThisFrame==true){if(Mode=="Réglages"&&settingsPage=="Commandes"){settingsPage="Affichage";Render();}else Close();return;}
            if(tribal==null&&Time.unscaledTime>nextRefresh){nextRefresh=Time.unscaledTime+.3f;if(settings.Rebinding!=null)heading.text="APPUIE SUR UNE TOUCHE · ÉCHAP POUR ANNULER";else heading.text=Mode.ToUpperInvariant();}
        }
        public void Toggle(string mode){mode=TribalInterface.Normalize(mode);if(IsOpen&&Mode==mode)Close();else Open(mode);}
        public void OpenContainer(string id){tribal?.UseContainer(id);Open("Inventaire");}
        public void Open(string mode)
        {
            if(campaign.State==null||campaign.IsBusy||campaign.MenhirActive||campaign.Dialogue!=null||campaign.QuestOverlay||campaign.IncidentModal||campaign.Ending!=null||campaign.cinematicDirector.IsPlaying)return;
            mode=TribalInterface.Normalize(mode);GetComponent<CampaignMap>()?.SetTribalHost(null);bool entering=!IsOpen;
            if(entering){previousPause=campaign.UserPaused;openedInPortrait=MobileControls.Instance?.PortraitPaused??false;}
            Mode=mode;window.gameObject.SetActive(true);window.SetAsLastSibling();
            // Pause notifies the HUD synchronously. Publish the open state before notifying it.
            if(entering){campaign.SetPause(true);campaign.Save();}
            if(mode=="Inventaire")settings.Learn(1);if(mode=="Fabrication")settings.Learn(2);Render();
        }
        public void Close(){if(!IsOpen)return;tribal?.Closed();window.gameObject.SetActive(false);campaign.SetPause(MobileControls.Instance!=null?MobileControls.Instance.RestoreOverlayPause(PauseBeforeOpen):previousPause);}
        TMP_Text Text(string name,Vector2 position,Vector2 size,string value,int fontSize=23,Color? color=null)=>AdventureUI.Text(AdventureUI.Rect(content,name,new Vector2(0,1),new Vector2(0,1),position,size),font,value,fontSize,color);
        UnityEngine.UI.Button Button(string name,Vector2 position,Vector2 size,UnityEngine.Events.UnityAction action)=>AdventureUI.Button(AdventureUI.Rect(content,name,new Vector2(0,1),new Vector2(0,1),position,size),font,name,action);
        void Clear(){foreach(Transform child in content){child.gameObject.SetActive(false);Destroy(child.gameObject);}}
        public void Render()
        {
            if(content==null||campaign.State==null)return;if(tribal!=null){tribal.Render();return;}Clear();heading.text=Mode.ToUpperInvariant();window.GetComponent<UnityEngine.UI.Image>().color=new Color(.045f,.035f,.05f,settings.preferences.opacity);
            if(MobileControls.TouchActive){RenderMobile();return;}
            window.localScale=Vector3.one;window.sizeDelta=new Vector2(1360,860);content.anchoredPosition=new Vector2(36,-155);content.sizeDelta=new Vector2(1288,600);
            heading.fontSize=31;heading.rectTransform.anchoredPosition=new Vector2(36,-22);heading.rectTransform.sizeDelta=new Vector2(1240,50);
            var pcTabs=new[]{"Inventaire","Fabrication","ISO 45001","Réglages"};for(int i=0;i<pcTabs.Length;i++){var tab=window.Find(pcTabs[i]) as RectTransform;tab.anchoredPosition=new Vector2(36+i*275,-86);tab.sizeDelta=new Vector2(258,43);tab.GetComponentInChildren<TMP_Text>().fontSize=21;}
            var pcClose=window.Find("Fermer") as RectTransform;pcClose.anchoredPosition=new Vector2(-36,25);pcClose.sizeDelta=new Vector2(250,43);pcClose.GetComponentInChildren<TMP_Text>().fontSize=21;window.Find("Commandes menu").gameObject.SetActive(true);
            switch(Mode){case "Inventaire":Inventory();break;case "Fabrication":Craft();break;case "Réglages":Settings();break;case "Commandes":Commands();break;case "ISO 45001":RenderKnowledge(content,font,false);break;}
        }
        void Inventory()
        {
            Text("Catégorie",new Vector2(0,0),new Vector2(600,40),"SAC DE "+campaign.Data.characters.First(c=>c.id==campaign.Data.playerCharacterId).name.ToUpperInvariant()+" · MATÉRIAUX ET ÉQUIPEMENT",20,AdventureUI.Gold);
            for(int i=0;i<8;i++)
            {int index=i;var item=inventory.items[i];var r=AdventureUI.Rect(content,item.name,new Vector2(0,1),new Vector2(0,1),new Vector2(i%4*145,-65-i/4*165),new Vector2(130,145));AdventureUI.Panel(r,i==inventory.Selected?new Color(.5f,.35f,.12f,.8f):new Color(.15f,.12f,.13f,.8f));var icon=AdventureUI.Rect(r,"Icône",new Vector2(.5f,.65f),Vector2.one*.5f,Vector2.zero,new Vector2(47,54));AdventureUI.Shape(icon,item.color,item.shape);AdventureUI.Text(AdventureUI.Rect(r,"Nom",Vector2.zero,Vector2.zero,new Vector2(8,9),new Vector2(116,54)),font,item.name+"\n"+inventory.Quantity(item.id).ToString("0"),15);var b=r.gameObject.AddComponent<UnityEngine.UI.Button>();b.targetGraphic=r.GetComponent<UnityEngine.UI.Image>();b.targetGraphic.raycastTarget=true;b.onClick.AddListener(()=>inventory.Select(index));}
            var selected=inventory.Item;detail=Text("Objet sélectionné",new Vector2(660,-22),new Vector2(580,340),$"<color=#FFD16A><size=32>{selected.name}</size></color>\n\nQuantité : {inventory.Quantity(selected.id):0}\n\n{selected.description}\n\nCatégorie : "+(selected.id=="tool"?"Équipement":selected.id=="notebook"||selected.id=="evidence"?"Carnet et preuves":"Ressource"));
            string use=selected.id=="food"?"Consommer":selected.id=="tool"?"Équiper / ranger":selected.id=="notebook"||selected.id=="evidence"?"Consulter":"Voir les recettes";var button=Button(use,new Vector2(660,-410),new Vector2(350,55),inventory.Use);button.interactable=inventory.Quantity(selected.id)>0;
            Text("Équipement",new Vector2(0,-445),new Vector2(590,80),"Raccourcis 1–8 : choisir un emplacement.\nLes objets fabriqués et les récompenses rejoignent ce sac.",20);
        }
        RectTransform Scroll(string name,Vector2 pos,Vector2 size,int rows)
        {
            var r=AdventureUI.Rect(content,name,new Vector2(0,1),new Vector2(0,1),pos,size);var scroll=r.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.horizontal=false;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;
            var viewport=AdventureUI.Fill(r,"Viewport");AdventureUI.Panel(viewport,new Color(.05f,.04f,.055f,.8f)).raycastTarget=true;var mask=viewport.gameObject.AddComponent<UnityEngine.UI.Mask>();mask.showMaskGraphic=false;
            var body=AdventureUI.Rect(viewport,"Content",new Vector2(0,1),new Vector2(0,1),Vector2.zero,new Vector2(size.x-8,rows*70));
            var layout=body.gameObject.AddComponent<UnityEngine.UI.VerticalLayoutGroup>();layout.spacing=8;layout.childControlHeight=true;layout.childControlWidth=true;layout.childForceExpandHeight=false;layout.childForceExpandWidth=true;
            var fitter=body.gameObject.AddComponent<UnityEngine.UI.ContentSizeFitter>();fitter.verticalFit=UnityEngine.UI.ContentSizeFitter.FitMode.PreferredSize;scroll.viewport=viewport;scroll.content=body;return body;
        }
        void Craft()
        {
            var recipes=Recipes;if(recipes.Length==0)return;recipeIndex=string.IsNullOrEmpty(selectedRecipeId)?0:Mathf.Max(0,Array.FindIndex(recipes,a=>a.id==selectedRecipeId));int category=0;foreach(var value in new[]{"Tout","Outils","Chantiers"}){string choice=value;Button(value,new Vector2(category++*180,0),new Vector2(170,42),()=>{craftCategory=choice;selectedRecipeId="";Render();});}var body=Scroll("Recettes",new Vector2(0,-58),new Vector2(540,487),recipes.Length);
            for(int i=0;i<recipes.Length;i++){int index=i;var r=AdventureUI.Rect(body,recipes[i].title,Vector2.zero,Vector2.zero,Vector2.zero,new Vector2(520,64));var layout=r.gameObject.AddComponent<UnityEngine.UI.LayoutElement>();layout.preferredHeight=64;AdventureUI.Button(r,font,recipes[i].title,()=>{recipeIndex=index;selectedRecipeId=recipes[index].id;Render();});}
            var recipe=recipes[recipeIndex];bool allowed=campaign.CanExecute(recipe,out string reason,true);float distance=Vector3.Distance(campaign.bindings.player.position,campaign.bindings.Find(recipe.targetBindingId).position);
            string cost=string.Join("\n",recipe.costs.Select(c=>{float have=campaign.Value("resource",c.id);var item=inventory.items.FirstOrDefault(i=>i.id==c.id);return (have>=c.amount?"<color=#92DC99>":"<color=#F9947C>")+(item?.name??c.id)+$" : {have:0}/{c.amount:0}</color>";}));
            bool construction=!recipe.id.StartsWith("craft:");
            detail=Text("Recette sélectionnée",new Vector2(600,0),new Vector2(640,435),$"<color=#FFD16A><size=29>{recipe.title}</size></color>\n\n{cost}\n\nDurée : {recipe.durationSeconds:0} s\nCompétence : "+(recipe.minimumCompetence>0?recipe.minimumCompetence.ToString("0"):"selon la préparation du chantier")+"\n\n"+(construction?"Problème traité : "+campaign.Data.acts.SelectMany(a=>a.objectives).FirstOrDefault(o=>o.actionIds.Contains(recipe.id))?.title+"\nPrérequis de sécurité : "+(allowed?"réunis":"à compléter")+"\nVérification : celle de la mission, conservée dans le journal.":"Production au poste de silex. Les matériaux sont consommés à la réalisation.")+(!allowed?"\n\n"+reason:""),22);
            var button=Button(distance>3.5f?"Rejoindre le poste":"Réaliser",new Vector2(600,-470),new Vector2(360,54),()=>{if(distance>3.5f){GetComponent<QuestNavigationController>().Follow(recipe.id);Close();}else{Close();GetComponent<WorldInteraction>().Execute(recipe.id);}});button.interactable=allowed;
        }
        void Settings()
        {
            Button("Affichage",Vector2.zero,new Vector2(235,44),()=>{settingsPage="Affichage";Render();});Button("Commandes clavier",new Vector2(250,0),new Vector2(280,44),()=>{settingsPage="Commandes";Render();});
            if(settingsPage=="Commandes")
            {
                var actions=new[]{"inventory","craft","map","journal","interact","commands","tree","forward","back","left","right","run","jump"};var labels=new[]{"Inventaire","Fabrication","Carte","Journal","Interagir","Commandes","Arbre ISO","Avancer","Reculer","Gauche","Droite","Courir","Sauter"};
                for(int i=0;i<actions.Length;i++){string action=actions[i];Button(labels[i]+" : "+settings.Binding(action),new Vector2(i%3*420,-80-i/3*85),new Vector2(395,58),()=>settings.Rebind(action));}return;
            }
            var p=settings.preferences;int row=0;
            void Option(string title,UnityEngine.Events.UnityAction toggle){int i=row++;Button(title,new Vector2(i%2*630,-75-i/2*61),new Vector2(605,48),()=>{toggle();settings.Save();});}
            Option("Chiffres : "+(p.numbers?"toujours":"au survol"),()=>p.numbers=!p.numbers);Option("Conseils de commandes : "+(settings.ControlsVisible?"visibles":"masqués"),()=>{p.controls=!settings.ControlsVisible;if(p.controls)p.learnedControls=0;});
            Option("GPS : "+new[]{"complet","discret","exploration libre"}[p.gpsMode],()=>p.gpsMode=(p.gpsMode+1)%3);Option("Orientation : "+(p.headingUp?"direction du joueur":"nord fixe"),()=>p.headingUp=!p.headingUp);
            Option("Coordonnées : "+p.coordinates,()=>p.coordinates=!p.coordinates);Option("Marqueurs du monde : "+p.worldMarkers,()=>p.worldMarkers=!p.worldMarkers);
            Option("Sous-titres : "+p.subtitles,()=>p.subtitles=!p.subtitles);Option("Contraste GPS : "+(p.highContrast?"renforcé":"doré"),()=>p.highContrast=!p.highContrast);
            Option("Échelle HUD : "+p.hudScale.ToString("0.00")+" · augmenter",()=>p.hudScale=p.hudScale>=1.15f?.85f:Mathf.Min(1.15f,p.hudScale+.1f));
            Option("Icônes : "+p.iconScale.ToString("0.00")+" · augmenter",()=>p.iconScale=p.iconScale>=1.4f?.8f:p.iconScale+.2f);
            Option("Accidents : "+new[]{"Gore complet","Gore modéré","Cartoon atténué"}[Mathf.Clamp(p.goreLevel,0,2)],()=>p.goreLevel=(p.goreLevel+1)%3);
            Option("Animations des fenêtres : "+(p.reducedMotion?"réduites":"actives"),()=>p.reducedMotion=!p.reducedMotion);
            Option("Opacité : "+p.opacity.ToString("0.00")+" · augmenter",()=>p.opacity=p.opacity>=.95f?.65f:Mathf.Min(.95f,p.opacity+.1f));
        }
        void Commands()
        {
            var target=inventory.CommandTarget();if(target==null){Text("Indisponible",Vector2.zero,new Vector2(1000,150),"Verrouille un membre de la tribu avec le clic droit pour lui donner une consigne.");return;}
            var character=campaign.State.characters.FirstOrDefault(c=>campaign.bindings.Find(c.id)==target);if(character==null)return;var definition=campaign.Data.characters.First(c=>c.id==character.id);
            Text("Membre",Vector2.zero,new Vector2(1150,220),$"{definition.name}\n\nÉnergie : {character.energy:0}/100 · Fatigue : {character.fatigue:0}/100\nCompétence : {character.competence:0}/100\nAffectation : {(character.assignment=="repos"?"repos":"activité du village")}");
            var rest=Button("Se reposer",new Vector2(0,-280),new Vector2(350,55),()=>{character.assignment="repos";campaign.Save();Render();});rest.interactable=character.alive&&character.available;
            var work=Button("Reprendre son activité",new Vector2(390,-280),new Vector2(350,55),()=>{character.assignment="";campaign.Save();Render();});work.interactable=character.alive&&character.available;
        }
        void Iso()
        {
            var nodes=new[]{("4 · Contexte","M_III_DIAGNOSTIC"),("5.3 · Rôles","M_II_ROLES"),("5.4 · Participation","M_II_CONSULTATION"),("6.1.2 · Dangers et risques","M_III_CARRIERE"),("6.2 · Planification","M_III_PRIORITES"),("7.2 · Compétence","M_IV_BOIS"),("8.1.2 · Prévention","M_IV_SILEX"),("8.1 · Organisation","M_V_CONSTRUIRE"),("8.2 · Urgences","M_VI_URGENCE"),("9.2 · Audit","M_VII_AUDIT"),("9.3 · Revue","M_VIII_REVUE"),("10.2 · Causes et actions","M_VII_CORRIGER"),("10.3 · Amélioration","M_VIII_COMPARAISON")};
            for(int i=0;i<nodes.Length;i++){var node=nodes[i];var objective=campaign.Data.acts.SelectMany(a=>a.objectives).First(o=>o.id==node.Item2);bool done=campaign.IsObjectiveComplete(objective);Button((done?"[x] ":"[ ] ")+node.Item1,new Vector2(i%3*420,-i/3*66),new Vector2(395,52),()=>{chosenClause=node.Item2;Render();});}
            if(!string.IsNullOrEmpty(chosenClause))
            {var goal=campaign.Data.acts.SelectMany(a=>a.objectives).First(o=>o.id==chosenClause);var action=goal.actionIds.Select(id=>campaign.Data.actions.First(a=>a.id==id)).FirstOrDefault(a=>campaign.CanExecute(a,out _,true));Text("Preuves",new Vector2(0,-370),new Vector2(1210,110),goal.title+"\n"+string.Join(" · ",goal.actionIds.Select(id=>(campaign.State.completedActions.Contains(id)?"Réalisé : ":"À réaliser : ")+campaign.Data.actions.First(a=>a.id==id).title)),18);var button=Button("Suivre la prochaine action",new Vector2(0,-505),new Vector2(420,48),()=>{GetComponent<QuestNavigationController>().Follow(action.id);Close();});button.interactable=action!=null;}
            Text("Référence pédagogique",new Vector2(0,-565),new Vector2(1250,30),"Liens pédagogiques aux missions réelles. Aucune déclaration de conformité ou de certification.",17);
        }
    }
}
