using System;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    public sealed partial class TribalInterface
    {
        string narrowInventoryPage="Sac",selectedContainer="stockage";
        public void UseContainer(string id){selectedContainer=id;inventoryContext="Réserve";narrowInventoryPage="Réserve";}
        void DrawInventory()
        {
            if(Narrow)
            {
                var options=campaign.Near(selectedContainer)?new[]{"Sac","Objet","Atelier","Réserve"}:new[]{"Sac","Objet","Atelier"};if(narrowInventoryPage=="Réserve"&&!campaign.Near(selectedContainer))narrowInventoryPage="Sac";
                float bw=W/options.Length;for(int i=0;i<options.Length;i++){string page=options[i];var button=ActionButton(Content,page.ToUpperInvariant(),i*bw,0,bw-4,44,()=>{narrowInventoryPage=page;owner.Render();},narrowInventoryPage==page);button.GetComponentInChildren<TMP_Text>().fontSize=12;}
                var panel=TribalStyle.Top(Content,"Contexte du sac",0,54,W,H-54);if(narrowInventoryPage=="Sac")DrawBag(panel);else{TribalStyle.Panel(panel);if(narrowInventoryPage=="Atelier")DrawCrafting(panel,14,14,W-28,H-82);else if(narrowInventoryPage=="Réserve")DrawContainer(panel,14,14,W-28,H-82);else DrawItemDetails(panel,14,14,W-28,H-82);}return;
            }
            float gap=Small?16:28,left=Mathf.Min(Small?380:640,W*.47f);var bag=TribalStyle.Top(Content,"Mes objets",0,0,left,H);DrawBag(bag);
            var context=TribalStyle.Top(Content,"Contexte d’inventaire",left+gap,0,W-left-gap,H);TribalStyle.Panel(context);
            var choices=campaign.Near(selectedContainer)?new[]{"Objet","Atelier","Réserve"}:new[]{"Objet","Atelier"};if(inventoryContext=="Réserve"&&!campaign.Near(selectedContainer))inventoryContext="Objet";
            float step=(context.rect.width-24)/choices.Length;for(int i=0;i<choices.Length;i++){string choice=choices[i];var button=ActionButton(context,choice.ToUpperInvariant(),12+i*step,10,step-5,40,()=>{inventoryContext=choice;owner.Render();},inventoryContext==choice);button.GetComponentInChildren<TMP_Text>().fontSize=14;}
            float width=context.rect.width-32,height=H-72;if(inventoryContext=="Réserve")DrawContainer(context,16,62,width,height);else if(inventoryContext=="Atelier")DrawCrafting(context,16,62,width,height);else DrawItemDetails(context,16,62,width,height);
        }
        void DrawBag(RectTransform panel)
        {
            TribalStyle.Panel(panel);float width=panel.rect.width,height=panel.rect.height;Label(panel,"Titre",20,14,width-40,30,"MES OBJETS",16,TribalStyle.Paper,true);
            float bodyHeight=Mathf.Clamp(height*.43f,Small?150:220,330),top=46;
            var halo=TribalStyle.Top(panel,"Halo de Dylan",width*.25f,top+4,width*.5f,bodyHeight);var warm=halo.gameObject.AddComponent<TribalHalo>();warm.raycastTarget=false;
            preview.SetActor(campaign.Data.playerCharacterId);preview.Visible=true;var display=TribalStyle.Top(panel,"Dylan · modèle natif",width*.25f,top,width*.5f,bodyHeight);var model=AdventureUI.Fill(display,"Personnage animé").gameObject.AddComponent<UnityEngine.UI.RawImage>();model.texture=preview.Body;model.material=preview.BodyComposite;model.raycastTarget=false;var aspect=model.gameObject.AddComponent<UnityEngine.UI.AspectRatioFitter>();aspect.aspectRatio=576f/800;aspect.aspectMode=UnityEngine.UI.AspectRatioFitter.AspectMode.FitInParent;
            float slot=Small?42:58,lx=Mathf.Max(18,width*.15f-slot*.5f),rx=width*.85f-slot*.5f;
            var clothes=new[]{("head","Tête"),("torso","Torse"),("legs","Jambes"),("feet","Pieds")};for(int i=0;i<clothes.Length;i++)
            {string id=clothes[i].Item1,title=clothes[i].Item2;float x=i<2?lx:rx,y=top+10+i%2*(bodyHeight*(Small?.35f:.55f));var r=TribalStyle.Top(panel,title,x,y,slot,slot);var face=TribalStyle.Panel(r,"slot",new Color(.015f,.01f,.02f,.95f));face.border=new Color(.5f,.44f,.53f,.5f);TribalStyle.Icon(AdventureUI.Fill(r,"Tenue native",6),id,new Color(.74f,.69f,.75f,.8f));var b=r.gameObject.AddComponent<UnityEngine.UI.Button>();b.targetGraphic=face;b.onClick.AddListener(()=>Explain(title+" : tenue native portée par Dylan. Aucun vêtement interchangeable ni protection validée n’est enregistré pour cet emplacement."));AttachTip(r.gameObject,title+" · tenue portée, protection non évaluée");}
            var tool=TribalStyle.Top(panel,"Outil principal",rx,top+bodyHeight-slot-2,slot,slot);var equipped=TribalStyle.Panel(tool,"slot",TribalStyle.Ink);equipped.border=campaign.State.equippedItem=="tool"&&inventory.Quantity("tool")>0?TribalStyle.Gold:Color.clear;TribalStyle.Icon(AdventureUI.Fill(tool,"Hache",5),"tool",inventory.Quantity("tool")>0?Color.white:new Color(1,1,1,.22f));var equipButton=tool.gameObject.AddComponent<UnityEngine.UI.Button>();equipButton.targetGraphic=equipped;equipButton.onClick.AddListener(()=>{inventory.Select(5);if(inventory.Quantity("tool")>0)inventory.Use();else Explain("Fabrique d’abord une hache à l’atelier de silex.");owner.Render();});AttachTip(tool.gameObject,"Outil principal · la hache équipée est visible dans la main de Dylan");
            float gridY=top+bodyHeight+8,gridWidth=width-32;int columns=Small?6:7;float cell=(gridWidth-(columns-1)*6-3)/columns;var grid=TribalStyle.Grid(panel,"Grille du sac",16,gridY,gridWidth,Mathf.Max(44,height-gridY-18),columns,cell);int count=columns*(Small?3:4);
            for(int i=0;i<count;i++)
            {
                int index=i;var r=TribalStyle.Top(grid,"Emplacement "+(i+1),0,0,cell,cell);var face=TribalStyle.Panel(r,"slot",new Color(.003f,.003f,.008f,.95f));
                if(i>=inventory.items.Length)continue;var item=inventory.items[i];face.border=i==inventory.Selected?TribalStyle.Gold:new Color(.2f,.17f,.23f,.5f);TribalStyle.Icon(AdventureUI.Fill(r,item.name,6),item.id,inventory.Quantity(item.id)>0?Color.white:new Color(1,1,1,.2f));
                Bound(r,"Quantité",4,cell-21,cell-8,19,()=>inventory.Quantity(item.id).ToString("0"),14,TribalStyle.Paper).alignment=TextAlignmentOptions.Right;
                var button=r.gameObject.AddComponent<UnityEngine.UI.Button>();button.targetGraphic=face;button.onClick.AddListener(()=>{inventory.Select(index);if(Keyboard.current?.leftShiftKey.isPressed==true&&campaign.Near(selectedContainer)&&item.id!="notebook"&&item.id!="evidence"){float amount=Keyboard.current.leftCtrlKey.isPressed?inventory.Quantity(item.id):Mathf.Max(1,Mathf.Floor(inventory.Quantity(item.id)/2));Transfer(item.id,amount,true,false);}if(Narrow){narrowInventoryPage="Objet";}owner.Render();});AttachTip(r.gameObject,item.name+" · "+item.description);
            }
        }
        void DrawItemDetails(RectTransform panel,float x,float y,float width,float height)
        {
            var item=inventory.Item;TribalStyle.Icon(TribalStyle.Top(panel,"Vignette de l’objet",x,y,Small?44:92,Small?44:92),item.id);
            Label(panel,"Nom de l’objet",x+(Small?58:110),y,width-(Small?58:110),60,item.name.ToUpperInvariant(),Small?20:26,TribalStyle.Gold,true);
            Bound(panel,"Quantité disponible",x,y+(Small?54:106),width,24,()=>"DISPONIBLE : "+inventory.Quantity(item.id).ToString("0"),16);
            var scroll=TribalStyle.Scroll(panel,"Description et état",x,y+(Small?82:145),width,Mathf.Max(36,height-(Small?138:216)),false);
            var body=TribalStyle.Row(scroll,"Détail de l’objet",Small?112:170);string extra=item.id=="tool"?"\n\nÉtat : "+(campaign.State.equippedItem=="tool"&&inventory.Quantity("tool")>0?"équipée dans la main":"non équipée")+".\nL’outil ne valide pas à lui seul une mesure de prévention.":item.id=="evidence"?"\n\n"+string.Join("\n",campaign.State.evidence.TakeLast(8)):"";TribalStyle.Text(AdventureUI.Fill(body,"Description",2),font,item.description+extra,FontSize);
            string action=item.id=="food"?"UTILISER":item.id=="tool"?(campaign.State.equippedItem=="tool"?"RANGER L’OUTIL":"ÉQUIPER"):item.id=="notebook"||item.id=="evidence"?"CONSULTER":"VOIR LES RECETTES";
            var use=ActionButton(panel,action,x,y+height-48,width,46,()=>{inventory.Use();owner.Render();},true);use.interactable=item.id=="wood"||item.id=="stone"||item.id=="fiber"||item.id=="flint"||inventory.CanUseCurrent;
        }
        void Transfer(string item,float amount,bool deposit,bool all)
        {if(!campaign.TransferInventory(selectedContainer,item,amount,deposit,all,out string reason))Explain(reason);owner.Render();}
        void DrawContainer(RectTransform panel,float x,float y,float width,float height)
        {
            Label(panel,"Nom du conteneur",x,y,width,32,"RÉSERVES DE NEILA",Small?18:24,TribalStyle.Paper,true);if(!Small)Label(panel,"Lieu du conteneur",x,y+35,width,40,"Stockage du village · transfert sur place",14,TribalStyle.Muted);
            int columns=6;float cell=Small?Mathf.Min(44,(width-34)/6):(width-(columns-1)*6-4)/columns,gridY=Small?34:79;var grid=TribalStyle.Grid(panel,"Contenu réel des réserves",x,y+gridY,width,Mathf.Max(cell,height-gridY-114),columns,cell);
            foreach(var item in inventory.items.Where(i=>i.id!="notebook"&&i.id!="evidence"))
            {
                var r=TribalStyle.Top(grid,item.id,0,0,cell,cell);var face=TribalStyle.Panel(r,"slot",new Color(.003f,.003f,.008f,.95f));TribalStyle.Icon(AdventureUI.Fill(r,item.name,6),item.id,campaign.Stored(selectedContainer,item.id)>0?Color.white:new Color(1,1,1,.18f));Bound(r,"Quantité stockée",3,cell-21,cell-6,18,()=>campaign.Stored(selectedContainer,item.id).ToString("0"),14).alignment=TextAlignmentOptions.Right;
                var button=r.gameObject.AddComponent<UnityEngine.UI.Button>();button.targetGraphic=face;button.onClick.AddListener(()=>{inventory.Select(Array.FindIndex(inventory.items,i=>i.id==item.id));if(Keyboard.current?.leftShiftKey.isPressed==true)Transfer(item.id,Mathf.Max(1,Mathf.Floor(campaign.Stored(selectedContainer,item.id)/2)),false,false);owner.Render();});AttachTip(r.gameObject,item.name+" · réserve du village");
            }
            var selected=inventory.Item;float gap=6,bw=(width-gap*2)/3;
            void TransferButton(string title,int col,int row,UnityEngine.Events.UnityAction action){var button=ActionButton(panel,title,x+col*(bw+gap),y+height-108+row*54,bw,48,action);button.GetComponentInChildren<TMP_Text>().fontSize=Small?12:15;}
            TransferButton("PRENDRE",0,0,()=>Transfer(selected.id,1,false,false));TransferButton("MOITIÉ",1,0,()=>Transfer(selected.id,Mathf.Max(1,Mathf.Floor(campaign.Stored(selectedContainer,selected.id)/2)),false,false));TransferButton("TOUTE LA RÉSERVE",2,0,()=>Transfer(selected.id,0,false,true));
            TransferButton("DÉPOSER",0,1,()=>Transfer(selected.id,1,true,false));TransferButton("MOITIÉ",1,1,()=>Transfer(selected.id,Mathf.Max(1,Mathf.Floor(inventory.Quantity(selected.id)/2)),true,false));TransferButton("TOUT LE SAC",2,1,()=>Transfer(selected.id,0,true,true));
        }
        void DrawCrafting(RectTransform panel,float x,float y,float width,float height)
        {
            var recipes=owner.Recipes;var chosen=recipes.FirstOrDefault(a=>a.id==selectedRecipe)??recipes.FirstOrDefault();if(chosen==null){Label(panel,"Aucune recette",x,y,width,70,"Aucune recette disponible pour cette partie.");return;}selectedRecipe=chosen.id;
            float listHeight=Mathf.Min(Small?98:210,height*.39f);var list=TribalStyle.Scroll(panel,"Recettes et ateliers",x,y,width,listHeight);
            foreach(var recipe in recipes){var action=recipe;var row=TribalStyle.Row(list,action.id,Small?48:56);var b=TribalStyle.Button(row,font,action.title,()=>{selectedRecipe=action.id;owner.Render();},action.id==chosen.id);b.GetComponentInChildren<TMP_Text>().fontSize=FontSize;}
            float detailY=y+listHeight+12,bodyHeight=Mathf.Max(40,height-listHeight-78);var body=TribalStyle.Scroll(panel,"Conditions de la recette",x,detailY,width,bodyHeight);var textRow=TribalStyle.Row(body,"Coûts et conditions",Mathf.Max(120,chosen.costs.Length*27+100));string costs=string.Join("\n",chosen.costs.Select(c=>$"{inventory.items.FirstOrDefault(i=>i.id==c.id)?.name??c.id} : {campaign.Value("resource",c.id):0} / {c.amount:0}"));bool allowed=campaign.CanExecute(chosen,out string reason,true);
            TribalStyle.Text(AdventureUI.Fill(textRow,"Recette",4),font,chosen.title+"\n\n"+costs+"\nCompétence : "+chosen.minimumCompetence.ToString("0")+"\n"+(allowed?"Conditions réunies.":reason),FontSize);
            bool near=campaign.Near(chosen.targetBindingId);var button=ActionButton(panel,near?"FABRIQUER / CONSTRUIRE":"REJOINDRE L’ATELIER",x,y+height-48,width,46,()=>{owner.Close();if(near)GetComponent<WorldInteraction>().Execute(chosen.id);else GetComponent<QuestNavigationController>().Follow("travel:"+chosen.targetBindingId);},true);button.interactable=!near||allowed;
        }
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class TribalHalo:UnityEngine.UI.MaskableGraphic
    {
        protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper mesh){mesh.Clear();var r=rectTransform.rect;mesh.AddVert(r.center,new Color(1,.58f,.01f,.62f),Vector2.zero);for(int i=0;i<=36;i++){float angle=i*Mathf.PI*2/36;mesh.AddVert(r.center+new Vector2(Mathf.Cos(angle)*r.width*.5f,Mathf.Sin(angle)*r.height*.5f),new Color(1,.12f,.02f,0),Vector2.zero);}for(int i=1;i<=36;i++)mesh.AddTriangle(0,i,i+1);}
    }
}
