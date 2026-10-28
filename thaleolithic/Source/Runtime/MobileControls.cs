using System;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    public sealed class MobileControls:MonoBehaviour
    {
        public static MobileControls Instance{get;private set;}public static bool TouchActive=>Instance!=null&&Instance.Active;
        public static float CssWidth, CssHeight;public static bool BrowserTouch;
        public bool Active=>settings!=null&&(settings.preferences.inputMode==1||settings.preferences.inputMode==0&&(Application.isMobilePlatform||BrowserTouch||usingTouch||Environment.GetCommandLineArgs().Contains("-ungaTouch")));
        public Vector2 Movement{get;private set;}public Vector2 Look{get;private set;}public bool Running=>runHeld||settings.preferences.autoRun&&Movement.magnitude>.82f;
        public float Units=>safeArea==null?1:safeArea.rect.width/Mathf.Max(1,Viewport.x);public Vector2 Viewport=>CssWidth>0?new Vector2(CssWidth,CssHeight):new Vector2(Screen.width,Screen.height)/Mathf.Max(1,Screen.dpi/160);
        CampaignRuntime campaign;UISettingsController settings;Canvas canvas;TMP_FontAsset font;RectTransform safeArea,surface,menuSurface,joystick,knob,rotation,resume,skipFilm;UnityEngine.UI.Button interact,orders;
        bool usingTouch,runHeld,jump,crouch,portraitPause,background,previousPause;Vector2 requestedMovement;float lastTouch;
        public bool PortraitPaused=>portraitPause;public bool UnderlyingPause=>previousPause;
        bool OverlayOpen=>campaign.GetComponent<AdventureMenus>().IsOpen||campaign.GetComponent<CampaignMap>().IsOpen;
        bool BasePause()=>campaign.GetComponent<AdventureMenus>().IsOpen?campaign.GetComponent<AdventureMenus>().PauseBeforeOpen:campaign.GetComponent<CampaignMap>().IsOpen?campaign.GetComponent<CampaignMap>().PauseBeforeOpen:campaign.UserPaused;
        public bool RestoreOverlayPause(bool previous)=>previous||portraitPause||background;
        readonly System.Collections.Generic.Dictionary<string,RectTransform> lookup=new System.Collections.Generic.Dictionary<string,RectTransform>();
        readonly System.Collections.Generic.List<Action> restore=new System.Collections.Generic.List<Action>();bool mobileLayout;
        public void Build(CampaignRuntime runtime,Canvas root,TMP_FontAsset sourceFont)
        {
            Instance=this;campaign=runtime;settings=GetComponent<UISettingsController>();canvas=root;font=sourceFont;
            var existing=canvas.transform.Cast<Transform>().ToArray();safeArea=AdventureUI.Fill(canvas.transform,"Zone sûre des interfaces");foreach(var t in existing)t.SetParent(safeArea,false);
            surface=AdventureUI.Rect(safeArea,"Commandes tactiles",Vector2.zero,Vector2.zero,Vector2.zero,Viewport);
            menuSurface=AdventureUI.Rect(safeArea,"Menus tactiles",Vector2.zero,Vector2.zero,Vector2.zero,Viewport);
            var camera=AdventureUI.Fill(surface,"Zone tactile de caméra");camera.anchorMin=new Vector2(.42f,0);AdventureUI.Panel(camera,new Color(0,0,0,0)).raycastTarget=true;var cameraGesture=camera.gameObject.AddComponent<MobileGesture>();cameraGesture.controls=this;cameraGesture.cameraZone=true;
            joystick=AdventureUI.Rect(surface,"Joystick analogique",Vector2.zero,Vector2.zero,new Vector2(18,20),new Vector2(116,116));AdventureUI.Shape(joystick,new Color(.045f,.035f,.04f,.5f),"circle").raycastTarget=true;var gesture=joystick.gameObject.AddComponent<MobileGesture>();gesture.controls=this;
            knob=AdventureUI.Rect(joystick,"Pouce",Vector2.one*.5f,Vector2.one*.5f,Vector2.zero,new Vector2(46,46));AdventureUI.Shape(knob,new Color(.83f,.76f,.6f,.65f),"circle");
            UnityEngine.UI.Button Button(string text,Vector2 anchor,Vector2 pivot,Vector2 pos,Vector2 size,UnityEngine.Events.UnityAction onClick)
            {var button=AdventureUI.Button(AdventureUI.Rect(surface,text,anchor,pivot,pos,size),font,text,onClick);button.GetComponentInChildren<TMP_Text>().fontSize=16;button.GetComponentInChildren<TMP_Text>().alignment=TextAlignmentOptions.Center;return button;}
            interact=Button("Interagir",Vector2.right,Vector2.right,new Vector2(-14,22),new Vector2(140,54),()=>campaign.GetComponent<WorldInteraction>().Interact());
            Button("Action",Vector2.right,Vector2.right,new Vector2(-164,22),new Vector2(76,54),()=>campaign.GetComponent<InventoryController>().Use());
            Button("Saut",Vector2.right,Vector2.right,new Vector2(-14,88),new Vector2(58,48),()=>jump=true);
            Button("Accroupir",Vector2.right,Vector2.right,new Vector2(-14,148),new Vector2(110,48),()=>crouch=true);
            var run=Button("Courir",Vector2.zero,Vector2.zero,new Vector2(144,22),new Vector2(90,48),()=>{});var hold=run.gameObject.AddComponent<MobileHold>();hold.changed=value=>runHeld=value;
            Button("Caméra",Vector2.right,Vector2.right,new Vector2(-82,88),new Vector2(78,48),()=>campaign.bindings.player.GetComponent<ThirdPersonMotor>().FaceDirection(campaign.bindings.player.GetComponent<ThirdPersonMotor>().visual.forward));
            orders=Button("Ordres",Vector2.right,Vector2.right,new Vector2(-170,88),new Vector2(72,48),()=>campaign.GetComponent<AdventureMenus>().Open("Commandes"));
            int index=0;foreach(var mode in new[]{"Sac","Fabriquer","Journal","Pause"})
            {string value=mode;var button=Button(value,new Vector2(.5f,1),new Vector2(.5f,1),new Vector2(-156+index++*104,-10),new Vector2(98,44),()=>campaign.GetComponent<AdventureMenus>().Open(value=="Sac"?"Inventaire":value=="Fabriquer"?"Fabrication":value=="Journal"?"Missions":"Réglages"));button.transform.SetParent(menuSurface,false);}
            Button("Chemin",Vector2.right,Vector2.right,new Vector2(-250,22),new Vector2(78,54),()=>{campaign.GetComponent<QuestNavigationController>().TemporaryGuidance=true;campaign.GetComponent<QuestNavigationController>().ForceRefresh();});
            rotation=AdventureUI.Rect(safeArea,"Passer en paysage",Vector2.one*.5f,Vector2.one*.5f,Vector2.zero,new Vector2(320,180));AdventureUI.Panel(rotation,new Color(.035f,.025f,.04f,.95f)).raycastTarget=true;AdventureUI.Text(AdventureUI.Fill(rotation,"Orientation",20),font,"Tourne ton téléphone pour profiter du jeu en paysage.\n\nLe menu reste accessible.",20,AdventureUI.Paper,TextAlignmentOptions.Center);
            resume=AdventureUI.Rect(safeArea,"Reprendre après interruption",Vector2.one*.5f,Vector2.one*.5f,Vector2.zero,new Vector2(320,150));AdventureUI.Panel(resume,new Color(.035f,.025f,.04f,.96f)).raycastTarget=true;AdventureUI.Button(AdventureUI.Fill(resume,"Reprendre",20),font,"Reprendre la partie",()=>{background=false;campaign.SetPause(previousPause||portraitPause||OverlayOpen);});
            var map=Find("Minimap encadrée");if(map!=null){var button=map.gameObject.AddComponent<UnityEngine.UI.Button>();var graphic=map.GetComponent<UnityEngine.UI.Graphic>();if(graphic!=null){graphic.raycastTarget=true;button.targetGraphic=graphic;}button.onClick.AddListener(()=>campaign.GetComponent<CampaignMap>().Open());}
            surface.SetAsFirstSibling();rotation.gameObject.SetActive(false);resume.gameObject.SetActive(false);
            skipFilm=AdventureUI.Rect(safeArea,"Passer le film tactile",Vector2.one,Vector2.one,new Vector2(-14,-14),new Vector2(160,48));AdventureUI.Button(skipFilm,font,"Passer le film",()=>campaign.cinematicDirector.Skip());skipFilm.gameObject.SetActive(false);
        }
        RectTransform Find(string name){if(lookup.TryGetValue(name,out var found)&&found!=null)return found;found=canvas.GetComponentsInChildren<RectTransform>(true).FirstOrDefault(r=>r.name==name);if(found!=null)lookup[name]=found;return found;}
        public void SetJoystick(PointerEventData e,bool release=false)
        {
            if(release){requestedMovement=Vector2.zero;knob.anchoredPosition=Vector2.zero;return;}
            RectTransformUtility.ScreenPointToLocalPointInRectangle(joystick,e.position,e.pressEventCamera,out var local);var delta=local-joystick.rect.center;requestedMovement=Vector2.ClampMagnitude(delta/44,1);knob.anchoredPosition=requestedMovement*34;
        }
        public void DragCamera(Vector2 delta){if(!campaign.IsModal&&!campaign.IsBusy)Look+=new Vector2(delta.x,delta.y*(settings.preferences.invertTouchY?-1:1))*settings.preferences.touchSensitivity;}
        public Vector2 ConsumeLook(){var result=Look;Look=Vector2.zero;return result;}
        public bool ConsumeCrouch(){bool value=crouch;crouch=false;return value;}
        public bool ConsumeJump(){bool result=jump;jump=false;return result;}
        void Update()
        {
            if(campaign==null)return;if(Touchscreen.current!=null&&Touchscreen.current.touches.Any(t=>t.press.isPressed)){usingTouch=true;lastTouch=Time.unscaledTime;}
            if(Keyboard.current?.anyKey.wasPressedThisFrame==true&&Time.unscaledTime-lastTouch>1)usingTouch=false;
            bool gameplay=Active&&!campaign.IsModal&&!campaign.IsBusy&&Screen.width>Screen.height;
            if(Active){Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
            Movement=Vector2.MoveTowards(Movement,gameplay?requestedMovement:Vector2.zero,Time.unscaledDeltaTime*12);
            if(!gameplay){requestedMovement=Vector2.zero;Look=Vector2.zero;knob.anchoredPosition=Vector2.zero;}
            surface.gameObject.SetActive(gameplay);interact.interactable=campaign.GetComponent<WorldInteraction>().FocusActions.Any(a=>campaign.CanExecute(a,out _));
            menuSurface.gameObject.SetActive(Active&&!OverlayOpen&&!campaign.IsBusy&&!campaign.cinematicDirector.IsPlaying&&campaign.Dialogue==null&&!campaign.QuestOverlay&&!campaign.IncidentModal&&campaign.Ending==null&&!background);
            skipFilm.gameObject.SetActive(Active&&campaign.cinematicDirector.IsPlaying);
            string actor=campaign.GetComponent<WorldInteraction>().FocusBindingId;interact.GetComponentInChildren<TMP_Text>().text=actor!=null&&campaign.Data.characters.Any(c=>c.id==actor)?"Parler à "+campaign.CharacterName(actor):"Interagir";
            orders.gameObject.SetActive(campaign.GetComponent<InventoryController>().CommandTarget()!=null);
            bool portrait=Active&&Screen.width<Screen.height;if(portrait&&!portraitPause){if(!background)previousPause=BasePause();campaign.SetPause(true);portraitPause=true;}else if(!portrait&&portraitPause){portraitPause=false;if(!background)campaign.SetPause(previousPause||OverlayOpen);}
            rotation.gameObject.SetActive(portrait&&!campaign.GetComponent<AdventureMenus>().IsOpen&&!campaign.GetComponent<CampaignMap>().IsOpen);resume.gameObject.SetActive(background);if(background)resume.SetAsLastSibling();
        }
        void LateUpdate()
        {
            if(safeArea==null)return;var safe=Screen.safeArea;safeArea.anchorMin=safe.min/new Vector2(Screen.width,Screen.height);safeArea.anchorMax=safe.max/new Vector2(Screen.width,Screen.height);safeArea.offsetMin=safeArea.offsetMax=Vector2.zero;
            if(!Active){if(mobileLayout){foreach(var action in restore)action();restore.Clear();mobileLayout=false;}return;}
            if(!mobileLayout){foreach(var name in new[]{"Portrait et survie","Minimap encadrée","Inventaire rapide","Quête suivie","Conseil des Sages","Aides contextuelles","États actifs","Interaction ciblée","SousTitres"}){var r=Find(name);if(r==null)continue;var pos=r.anchoredPosition;var scale=r.localScale;var size=r.sizeDelta;bool enabled=r.gameObject.activeSelf;var text=r.GetComponent<TMP_Text>();float fontSize=text!=null?text.fontSize:0;restore.Add(()=>{r.anchoredPosition=pos;r.localScale=scale;r.sizeDelta=size;r.gameObject.SetActive(enabled);if(text!=null)text.fontSize=fontSize;});}var hotbar=Find("Inventaire rapide");if(hotbar!=null)restore.Add(()=>{foreach(Transform child in hotbar)child.gameObject.SetActive(true);});mobileLayout=true;}
            float u=Units;surface.sizeDelta=menuSurface.sizeDelta=Viewport;surface.localScale=menuSurface.localScale=Vector3.one*u;rotation.localScale=resume.localScale=skipFilm.localScale=Vector3.one*u;
            int topIndex=0;foreach(RectTransform button in menuSurface){int i=topIndex++;button.anchoredPosition=Viewport.x<760?new Vector2(i%2==0?-54:54,-10-i/2*52):new Vector2(-156+i*104,-10);}
            var subtitles=Find("SousTitres");if(subtitles!=null)subtitles.GetComponent<TMP_Text>().fontSize=16*u;
            var nativeSkip=Find("Passer la cinématique");if(nativeSkip!=null)nativeSkip.gameObject.SetActive(false);
            void Layout(string name,Vector2 position,float scale){var r=Find(name);if(r==null)return;r.anchoredPosition=position*u;r.localScale=Vector3.one*(u*scale);}
            Layout("Portrait et survie",new Vector2(12,-12),.36f);Layout("Minimap encadrée",new Vector2(-12,-12),112/205f);
            Layout("Inventaire rapide",new Vector2(12,153),44/62f);var bar=Find("Inventaire rapide");if(bar!=null){bar.sizeDelta=new Vector2(272,75);for(int i=0;i<8;i++)bar.GetChild(i).gameObject.SetActive(i<4);}
            var quest=Find("Quête suivie");if(quest!=null){quest.anchoredPosition=new Vector2(-12,-140)*u;quest.sizeDelta=new Vector2(190,100)*u;quest.localScale=Vector3.one;var text=quest.GetComponent<TMP_Text>();text.fontSize=16*u;var nav=campaign.GetComponent<QuestNavigationController>();text.text="<b>"+campaign.CurrentAct.title+"</b>\n"+nav.Action?.title+"\n"+nav.Distance.ToString("0")+" m";}
            var timer=Find("Conseil des Sages");if(timer!=null)timer.gameObject.SetActive(false);var hints=Find("Aides contextuelles");if(hints!=null)hints.gameObject.SetActive(false);var state=Find("États actifs");if(state!=null)state.gameObject.SetActive(false);
            var prompt=Find("Interaction ciblée");if(prompt!=null)prompt.gameObject.SetActive(false);
        }
        public void PauseForBackground(){if(campaign?.State==null||background)return;if(!portraitPause)previousPause=BasePause();campaign.Save();MobileBrowserBridge.Flush();campaign.SetPause(true);background=true;requestedMovement=Movement=Vector2.zero;}
        void OnApplicationFocus(bool focus){if(!focus&&Active)PauseForBackground();}
        void OnDestroy(){if(Instance==this)Instance=null;}
    }
    public sealed class MobileHold:MonoBehaviour,IPointerDownHandler,IPointerUpHandler
    {public Action<bool> changed;public void OnPointerDown(PointerEventData e)=>changed?.Invoke(true);public void OnPointerUp(PointerEventData e)=>changed?.Invoke(false);void OnDisable()=>changed?.Invoke(false);}
    public sealed class MobileGesture:MonoBehaviour,IPointerDownHandler,IPointerUpHandler,IDragHandler
    {
        public MobileControls controls;public bool cameraZone;int pointer=int.MinValue;
        public void OnPointerDown(PointerEventData e){if(pointer!=int.MinValue)return;pointer=e.pointerId;if(!cameraZone)controls.SetJoystick(e);}
        public void OnDrag(PointerEventData e){if(e.pointerId!=pointer)return;if(cameraZone)controls.DragCamera(e.delta);else controls.SetJoystick(e);}
        public void OnPointerUp(PointerEventData e){if(e.pointerId!=pointer)return;pointer=int.MinValue;if(!cameraZone)controls.SetJoystick(e,true);}
        void OnDisable(){pointer=int.MinValue;}
    }
}
