using System;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    [DefaultExecutionOrder(-80)]public sealed partial class CampaignMap:MonoBehaviour
    {
        public CampaignRuntime campaign;public Texture2D terrainMap,villageDetail;public Vector2 worldOrigin,worldSize,detailOrigin,detailSize;
        public bool IsOpen{get;private set;}public int ConsumedEscapeFrame{get;private set;}=-1;
        public Transform SelectedTarget=>navigation?.Target??inspected;public string SelectedName=>navigation?.Action?.title??"Lieu repéré";
        public WorldMapProjection Projection{get;private set;}public Rect MiniCrop{get;private set;}public Rect FullCrop{get;private set;}
        public float Zoom{get;private set;}=4;public bool showSites=true,showPeople,showDangers=true;
        readonly List<(Transform target,RectTransform marker)> miniSites=new List<(Transform,RectTransform)>();
        readonly List<(string id,Transform target,RectTransform mini,RectTransform full)> hazards=new List<(string,Transform,RectTransform,RectTransform)>();
        RectTransform miniRect,fullRect,window,miniPlayer,fullPlayer,miniTarget,fullTarget;UnityEngine.UI.RawImage miniImage,fullImage;
        TMP_Text coordinates,caption,north;TMP_FontAsset font;UISettingsController settings;QuestNavigationController navigation;
        MapRouteGraphic miniRoute,fullRoute;MapFootprintsGraphic miniBuildings,fullBuildings;MapWorldGeometry geometry;bool previousPause;Vector2 center;Transform inspected;float nextRefresh;
        bool openedInPortrait;public bool PauseBeforeOpen=>openedInPortrait&&MobileControls.Instance!=null?MobileControls.Instance.UnderlyingPause:previousPause;
        readonly List<(string id,Transform target,RectTransform marker,bool person)> markers=new List<(string,Transform,RectTransform,bool)>();
        readonly Dictionary<string,string> names=new Dictionary<string,string>{{"grand_menhir","Grand Menhir"},{"habitations","Habitations"},{"atelier_silex","Atelier de silex"},{"foyer","Foyer"},{"stockage","Réserves"},{"bois_construction","Bûcherons"},{"pierre_carriere","Carrière"},{"chasse_clairiere","Clairière de chasse"},{"rassemblement","Rassemblement"},{"repos","Infirmerie"},{"charpente","Charpente"}};
        RectTransform Label(Transform p,string name,Vector2 a,Vector2 pivot,Vector2 pos,Vector2 size,string value,float fs=20){var r=AdventureUI.Rect(p,name,a,pivot,pos,size);return r;}
        RectTransform Marker(Transform p,string name,Color color,float size,string kind="diamond")
        {var r=AdventureUI.Rect(p,name,Vector2.zero,Vector2.one*.5f,Vector2.zero,Vector2.one*size);AdventureUI.Shape(r,color,kind);return r;}
        RectTransform View(Transform parent,string name,Vector2 a,Vector2 pivot,Vector2 position,Vector2 size,out UnityEngine.UI.RawImage image)
        {
            var frame=AdventureUI.Rect(parent,name,a,pivot,position,size);AdventureUI.Panel(frame,AdventureUI.Paper);
            var inner=AdventureUI.Fill(frame,"Vue cartographique",3);var background=AdventureUI.Panel(inner,Color.black);background.raycastTarget=true;var mask=inner.gameObject.AddComponent<UnityEngine.UI.Mask>();mask.showMaskGraphic=false;
            var content=AdventureUI.Fill(inner,"Topographie réelle");image=content.gameObject.AddComponent<UnityEngine.UI.RawImage>();image.texture=terrainMap;image.raycastTarget=false;return inner;
        }
        public void Build(Canvas canvas,TMP_FontAsset sourceFont)
        {
            font=sourceFont;settings=GetComponent<UISettingsController>();navigation=GetComponent<QuestNavigationController>();Projection=new WorldMapProjection(worldOrigin,worldSize);geometry=GetComponent<MapWorldGeometry>()??gameObject.AddComponent<MapWorldGeometry>();geometry.Build(campaign);center=Projection.ToUv(campaign.bindings.player.position);
            miniRect=View(canvas.transform,"Minimap encadrée",Vector2.one,Vector2.one,new Vector2(-30,-28),new Vector2(205,205),out miniImage);
            miniImage.rectTransform.pivot=Vector2.one*.5f;miniImage.rectTransform.offsetMin=miniImage.rectTransform.offsetMax=Vector2.zero;
            miniImage.rectTransform.anchorMin=Vector2.one*-.2071068f;miniImage.rectTransform.anchorMax=Vector2.one*1.2071068f;
            miniBuildings=AdventureUI.Fill(miniRect,"Constructions réelles").gameObject.AddComponent<MapFootprintsGraphic>();miniBuildings.geometry=geometry;miniBuildings.projection=Projection;miniBuildings.raycastTarget=false;
            miniRoute=AdventureUI.Fill(miniRect,"Itinéraire GPS").gameObject.AddComponent<MapRouteGraphic>();miniRoute.raycastTarget=false;
            foreach(var site in campaign.bindings.objects.Where(o=>names.ContainsKey(o.id))){var marker=Marker(miniRect,"Lieu : "+names[site.id],new Color(.88f,.86f,.73f,.8f),11,site.id=="habitations"?"house":site.id=="atelier_silex"?"tool":"stone");miniSites.Add((site.target,marker));}
            miniTarget=Marker(miniRect,"Destination active",AdventureUI.Gold,16);miniPlayer=Marker(miniRect,"Joueur réel",AdventureUI.Paper,20,"arrow");
            north=AdventureUI.Text(Label(miniRect.parent,"Nord",new Vector2(.5f,1),new Vector2(.5f,1),new Vector2(0,-4),new Vector2(30,25),"",18),font,"N",18);
            coordinates=AdventureUI.Text(Label(miniRect.parent,"Coordonnées",new Vector2(.5f,0),new Vector2(.5f,1),new Vector2(0,-4),new Vector2(205,24),"",15),font,"",15,AdventureUI.Paper,TextAlignmentOptions.Center);
            window=AdventureUI.Fill(canvas.transform,"Grande carte interactive");AdventureUI.Panel(window,new Color(.025f,.025f,.045f,.97f));
            AdventureUI.Text(Label(window,"Titre",new Vector2(0,1),new Vector2(0,1),new Vector2(50,-26),new Vector2(1200,52),"",30),font,"CARTE DES CRÂNES FENDUS",30,AdventureUI.Gold);
            var viewport=AdventureUI.Rect(window,"Zone carte",new Vector2(.59f,.51f),new Vector2(.5f,.5f),Vector2.zero,new Vector2(1180,790));fullRect=View(viewport,"Carte",new Vector2(.5f,.5f),new Vector2(.5f,.5f),Vector2.zero,new Vector2(Mathf.Min(1180,790*worldSize.x/worldSize.y),Mathf.Min(790,1180*worldSize.y/worldSize.x)),out fullImage);
            var pointer=fullRect.gameObject.AddComponent<MapPointer>();pointer.map=this;
            fullBuildings=AdventureUI.Fill(fullRect,"Constructions réelles").gameObject.AddComponent<MapFootprintsGraphic>();fullBuildings.geometry=geometry;fullBuildings.projection=Projection;fullBuildings.raycastTarget=false;
            fullRoute=AdventureUI.Fill(fullRect,"Itinéraire GPS").gameObject.AddComponent<MapRouteGraphic>();fullRoute.raycastTarget=false;
            foreach(var binding in campaign.bindings.objects.Where(o=>names.ContainsKey(o.id)))AddMarker(binding.id,binding.target,names[binding.id],false);
            foreach(var binding in campaign.bindings.characters)AddMarker(binding.id,campaign.bindings.Find(binding.id),campaign.Data.characters.FirstOrDefault(c=>c.id==binding.id)?.name??binding.id,true);
            foreach(var risk in new[]{("carriere","pierre_carriere"),("silex","atelier_silex"),("fumees","foyer"),("stockage","stockage")}){var target=campaign.bindings.Find(risk.Item2);if(target!=null)hazards.Add((risk.Item1,target,Marker(miniRect,"Danger "+risk.Item1,new Color(1,.3f,.2f),14,"cross"),Marker(fullRect,"Danger "+risk.Item1,new Color(1,.3f,.2f),22,"cross")));}
            AdventureUI.Text(AdventureUI.Rect(fullRect,"Nord de la grande carte",new Vector2(.96f,.96f),Vector2.one*.5f,Vector2.zero,new Vector2(35,35)),font,"N",23,AdventureUI.Paper,TextAlignmentOptions.Center);
            fullPlayer=Marker(fullRect,"Joueur",AdventureUI.Paper,22,"arrow");fullTarget=Marker(fullRect,"Quête suivie",AdventureUI.Gold,26);
            AdventureUI.Text(Label(window,"Aide carte",new Vector2(0,0),Vector2.zero,new Vector2(50,23),new Vector2(1400,35),"Molette : zoom   ·   Glisser : déplacer   ·   Losange doré : objectif   ·   M / Échap : fermer",20),font,"Molette : zoom   ·   Glisser : déplacer   ·   Losange doré : objectif   ·   M / Échap : fermer",20);
            caption=AdventureUI.Text(Label(window,"Guidage carte",new Vector2(0,1),new Vector2(0,1),new Vector2(50,-104),new Vector2(310,140),"",18),font,"",18);
            int row=0;foreach(var filter in new[]{"Lieux","Personnages","Dangers","Village","Monde","Itinéraire","Fermer"})
            {string chosen=filter;AdventureUI.Button(AdventureUI.Rect(window,filter,new Vector2(0,1),new Vector2(0,1),new Vector2(50,-250-row++*65),new Vector2(280,48)),font,filter,()=>{switch(chosen){case "Lieux":showSites=!showSites;break;case "Personnages":showPeople=!showPeople;break;case "Dangers":showDangers=!showDangers;break;case "Village":Zoom=4;center=Projection.ToUv(campaign.bindings.player.position);break;case "Monde":Zoom=1;center=Vector2.one*.5f;break;case "Itinéraire":navigation.TemporaryGuidance=true;navigation.ForceRefresh();break;case "Fermer":Close();break;}});}
            AdventureUI.Text(AdventureUI.Rect(window,"Légende",Vector2.zero,Vector2.zero,new Vector2(50,95),new Vector2(320,120)),font,"<color=#FFD16A>Objectif · losange</color>\n<color=#DFDBBA>Lieux du village</color>\n<color=#A6D9E6>Membres de la tribu</color>\n<color=#FF6E55>+ Danger identifié</color>",18);
            window.gameObject.SetActive(false);
        }
        void AddMarker(string id,Transform target,string label,bool person)
        {
            if(target==null)return;var r=Marker(fullRect,label,person?new Color(.65f,.85f,.9f):AdventureUI.Paper,person?12:16);r.GetComponent<AdventureShape>().raycastTarget=true;
            var b=r.gameObject.AddComponent<UnityEngine.UI.Button>();b.targetGraphic=r.GetComponent<AdventureShape>();b.onClick.AddListener(()=>{Inspect(id,target,label);});markers.Add((id,target,r,person));
        }
        Rect Crop(Vector3 world,float radius)=>new Rect((world.x-radius-worldOrigin.x)/worldSize.x,(world.z-radius-worldOrigin.y)/worldSize.y,2*radius/worldSize.x,2*radius/worldSize.y);
        static void Place(RectTransform marker,Vector2 uv,bool clamp=false)
        {bool inside=uv.x>=0&&uv.x<=1&&uv.y>=0&&uv.y<=1;marker.gameObject.SetActive(inside||clamp);if(clamp)uv=new Vector2(Mathf.Clamp(uv.x,.05f,.95f),Mathf.Clamp(uv.y,.05f,.95f));marker.anchorMin=marker.anchorMax=uv;marker.anchoredPosition=Vector2.zero;}
        void Update()
        {
            if(window==null||campaign.State==null)return;
            if(settings.Pressed("map")&&campaign.Dialogue==null&&!campaign.cinematicDirector.IsPlaying){if(IsOpen)Close();else Open();}
            if(IsOpen&&Keyboard.current?.escapeKey.wasPressedThisFrame==true){ConsumedEscapeFrame=Time.frameCount;settings.ConsumedEscapeFrame=Time.frameCount;Close();}
            miniRect.parent.localScale=Vector3.one*settings.preferences.hudScale;
            bool visible=!campaign.MenhirActive&&!campaign.cinematicDirector.IsPlaying&&!IsOpen&&!campaign.GetComponent<AdventureMenus>().IsOpen;miniRect.parent.gameObject.SetActive(visible);
            if(Time.unscaledTime<nextRefresh)return;nextRefresh=Time.unscaledTime+.08f;
            var player=campaign.bindings.player;float yaw=player.GetComponent<ThirdPersonMotor>().visual.eulerAngles.y;float heading=settings.preferences.headingUp?yaw:0;
            MiniCrop=Crop(player.position,45);Background(miniImage,Crop(player.position,45*Mathf.Sqrt(2)));miniBuildings.SetView(MiniCrop,heading);miniImage.rectTransform.localEulerAngles=new Vector3(0,0,heading);
            Place(miniPlayer,Projection.Project(player.position,MiniCrop,heading));miniPlayer.localEulerAngles=new Vector3(0,0,heading-yaw);
            miniPlayer.sizeDelta=Vector2.one*(20*settings.preferences.iconScale);miniTarget.gameObject.SetActive(navigation.Target!=null);
            if(navigation.Target!=null){var uv=Projection.Project(navigation.Target.position,MiniCrop,heading);bool outside=uv.x<0||uv.x>1||uv.y<0||uv.y>1;var shape=miniTarget.GetComponent<AdventureShape>();shape.kind=outside?"arrow":"diamond";shape.SetVerticesDirty();miniTarget.localEulerAngles=new Vector3(0,0,outside?Mathf.Atan2(uv.y-.5f,uv.x-.5f)*Mathf.Rad2Deg-90:0);Place(miniTarget,uv,true);}
            foreach(var site in miniSites)Place(site.marker,Projection.Project(site.target.position,MiniCrop,heading));
            foreach(var risk in hazards){var state=campaign.State.risks.FirstOrDefault(v=>v.id==risk.id);bool known=state!=null&&showDangers;risk.mini.gameObject.SetActive(known);if(known){Place(risk.mini,Projection.Project(risk.target.position,MiniCrop,heading));risk.mini.GetComponent<AdventureShape>().color=state.value>=2?new Color(1,.3f,.2f):state.value>0?AdventureUI.Gold:new Color(.4f,.9f,.5f);}}
            coordinates.gameObject.SetActive(true);coordinates.text=(settings.preferences.coordinates?$"{player.position.x:0}, {player.position.y:0}, {player.position.z:0} · ":"")+settings.Binding("map")+" : Carte";north.text="N";var northDirection=(Vector2)(Quaternion.Euler(0,0,heading)*Vector2.up);north.rectTransform.anchorMin=north.rectTransform.anchorMax=Vector2.one*.5f+northDirection*.43f;north.rectTransform.pivot=Vector2.one*.5f;north.rectTransform.anchoredPosition=Vector2.zero;
            miniRoute.SetRoute(navigation.Corners.Select(p=>Projection.Project(p,MiniCrop,heading)).ToArray(),(settings.preferences.gpsMode!=2||navigation.TemporaryGuidance)&&navigation.Complete,settings.preferences.highContrast);
            if(!IsOpen)return;SyncIncidentMarkers();
            float side=1/Zoom;FullCrop=new Rect(center-Vector2.one*side*.5f,Vector2.one*side);Background(fullImage,FullCrop);fullBuildings.SetView(FullCrop,0);
            Place(fullPlayer,Projection.Project(player.position,FullCrop));fullPlayer.localEulerAngles=new Vector3(0,0,-yaw);
            foreach(var entry in markers)
            {
                bool active=entry.person?showPeople&&campaign.State.characters.First(c=>c.id==entry.id).alive:entry.id.StartsWith("incident:")?showDangers&&campaign.State.accidents.Any(a=>entry.id=="incident:"+a.id+":"+a.elapsedSeconds.ToString("R",System.Globalization.CultureInfo.InvariantCulture)):showSites;
                if(active)Place(entry.marker,Projection.Project(entry.target.position,FullCrop));else entry.marker.gameObject.SetActive(false);
            }
            foreach(var risk in hazards){var state=campaign.State.risks.FirstOrDefault(v=>v.id==risk.id);bool known=state!=null&&showDangers;risk.full.gameObject.SetActive(known);if(known){Place(risk.full,Projection.Project(risk.target.position,FullCrop));risk.full.GetComponent<AdventureShape>().color=state.value>=2?new Color(1,.3f,.2f):state.value>0?AdventureUI.Gold:new Color(.4f,.9f,.5f);}}
            fullTarget.gameObject.SetActive(navigation.Target!=null);if(navigation.Target!=null)Place(fullTarget,Projection.Project(navigation.Target.position,FullCrop),true);
            fullRoute.SetRoute(navigation.Corners.Select(p=>Projection.Project(p,FullCrop)).ToArray(),(settings.preferences.gpsMode!=2||navigation.TemporaryGuidance)&&navigation.Complete,settings.preferences.highContrast);
            string riskCount=campaign.State.risks.Count==0?"À évaluer":campaign.State.risks.Count(r=>r.value>=2).ToString();
            caption.text=$"{(navigation.Replanning?"Actualisation du parcours":navigation.Status)}\n{navigation.Action?.title}\n{navigation.Distance:0} m\n\nRisques critiques : {riskCount}\nZoom : {Zoom:0.0}x";
            if(inspected!=null)caption.text+="\nLieu repéré : "+(names.FirstOrDefault(k=>campaign.bindings.Find(k.Key)==inspected).Value??campaign.Data.characters.FirstOrDefault(c=>campaign.bindings.Find(c.id)==inspected)?.name??"Lieu");
        }
        void Background(UnityEngine.UI.RawImage image,Rect worldCrop)
        {
            var start=worldOrigin+Vector2.Scale(worldCrop.min,worldSize);var extent=Vector2.Scale(worldCrop.size,worldSize);var detail=new Rect(detailOrigin,detailSize);
            if(villageDetail!=null&&detail.Contains(start)&&detail.Contains(start+extent))
            {image.texture=villageDetail;image.uvRect=new Rect(new Vector2((start.x-detailOrigin.x)/detailSize.x,(start.y-detailOrigin.y)/detailSize.y),new Vector2(extent.x/detailSize.x,extent.y/detailSize.y));}
            else{image.texture=terrainMap;image.uvRect=worldCrop;}
        }
        public void Pan(Vector2 delta){delta/=window.GetComponentInParent<Canvas>().scaleFactor*(tribalHost!=null?window.lossyScale.x/Mathf.Max(.001f,window.GetComponentInParent<Canvas>().transform.lossyScale.x):1);center-=new Vector2(delta.x/fullRect.rect.width,delta.y/fullRect.rect.height)/Zoom;center=new Vector2(Mathf.Clamp(center.x,.5f/Zoom,1-.5f/Zoom),Mathf.Clamp(center.y,.5f/Zoom,1-.5f/Zoom));nextRefresh=0;}
        public void SetZoom(float delta){Zoom=Mathf.Clamp(Zoom*Mathf.Pow(1.18f,delta),1,16);nextRefresh=0;}
        public void Open(){if(GetComponent<AdventureMenus>()?.TribalReady==true){GetComponent<AdventureMenus>().Open("Carte");return;}if(window==null||IsOpen)return;GetComponent<AdventureMenus>()?.Close();previousPause=campaign.UserPaused;openedInPortrait=MobileControls.Instance?.PortraitPaused??false;campaign.SetPause(true);IsOpen=true;window.gameObject.SetActive(true);window.SetAsLastSibling();nextRefresh=0;}
        public void Close(){if(tribalHost!=null){GetComponent<AdventureMenus>().Close();return;}if(!IsOpen)return;IsOpen=false;window.gameObject.SetActive(false);campaign.SetPause(MobileControls.Instance!=null?MobileControls.Instance.RestoreOverlayPause(PauseBeforeOpen):previousPause);}
        public void SelectNextObjective(){navigation?.ForceRefresh();}
    }
    public sealed class MapPointer:MonoBehaviour,IScrollHandler,IDragHandler
    {
        public CampaignMap map;float pinch;
        int Touches=>Touchscreen.current==null?0:Touchscreen.current.touches.Count(t=>t.press.isPressed);
        public void OnScroll(PointerEventData e)=>map.SetZoom(e.scrollDelta.y);public void OnDrag(PointerEventData e){if(Touches<2)map.Pan(e.delta);}
        void Update(){if(!MobileControls.TouchActive||Touches!=2){pinch=0;return;}var touches=Touchscreen.current.touches.Where(t=>t.press.isPressed).Take(2).ToArray();float distance=Vector2.Distance(touches[0].position.ReadValue(),touches[1].position.ReadValue());if(pinch>1&&distance>1)map.SetZoom(Mathf.Log(distance/pinch)/Mathf.Log(1.18f));pinch=distance;}
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class MapRouteGraphic:UnityEngine.UI.MaskableGraphic
    {
        Vector2[] points=Array.Empty<Vector2>();bool visible;public bool RouteVisible=>visible;
        public void SetRoute(Vector2[] value,bool show,bool contrast){points=value;visible=show;color=contrast?Color.white:AdventureUI.Gold;SetVerticesDirty();}
        protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper vh)
        {vh.Clear();if(!visible)return;var r=rectTransform.rect;for(int i=1;i<points.Length;i++){var a=r.min+Vector2.Scale(points[i-1],r.size);var b=r.min+Vector2.Scale(points[i],r.size);var d=(b-a).normalized;var n=new Vector2(-d.y,d.x)*1.8f;int s=vh.currentVertCount;vh.AddVert(a-n,color,Vector2.zero);vh.AddVert(a+n,color,Vector2.zero);vh.AddVert(b+n,color,Vector2.zero);vh.AddVert(b-n,color,Vector2.zero);vh.AddTriangle(s,s+1,s+2);vh.AddTriangle(s,s+2,s+3);}}
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class MapArrow:UnityEngine.UI.Graphic
    {protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper vh){vh.Clear();var r=rectTransform.rect;vh.AddVert(new Vector3(0,r.height*.5f),color,Vector2.zero);vh.AddVert(new Vector3(-r.width*.45f,-r.height*.5f),color,Vector2.zero);vh.AddVert(new Vector3(0,-r.height*.2f),color,Vector2.zero);vh.AddVert(new Vector3(r.width*.45f,-r.height*.5f),color,Vector2.zero);vh.AddTriangle(0,1,2);vh.AddTriangle(0,2,3);}}
}


