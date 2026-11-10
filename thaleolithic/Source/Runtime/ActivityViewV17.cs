using System;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
 public sealed class ActivityViewV17:MonoBehaviour
 {
  CampaignRuntime c;CampaignActivitiesV17 activity;RectTransform root,content;UnityEngine.UI.ScrollRect scroll;TMP_Text timer;float next;bool ready,mobile;int selectedDifference=-1,lastWidth,lastHeight,padChoice;readonly System.Collections.Generic.List<UnityEngine.UI.Button> choices=new System.Collections.Generic.List<UnityEngine.UI.Button>();
  public RectTransform Root=>root;
  void Start(){c=GetComponent<CampaignRuntime>();activity=GetComponent<CampaignActivitiesV17>();activity.Changed+=Render;}
  void Ensure()
  {
   if(root!=null)return;var hud=GetComponent<CampaignHud>();if(hud?.Canvas==null)return;
   root=AdventureUI.Rect(hud.Canvas.transform,"Activité intégrée V17",new Vector2(.5f,.5f),new Vector2(.5f,.5f),Vector2.zero,new Vector2(1420,920));TribalStyle.Panel(root,"panel",new Color(.018f,.014f,.031f,.96f),null,true);
   var viewport=AdventureUI.Fill(root,"Fenêtre défilante",12);viewport.gameObject.AddComponent<UnityEngine.UI.RectMask2D>();var touch=viewport.gameObject.AddComponent<UnityEngine.UI.Image>();touch.color=Color.clear;touch.raycastTarget=true;
   content=AdventureUI.Rect(viewport,"Contenu spécialisé",new Vector2(.5f,1),new Vector2(.5f,1),Vector2.zero,new Vector2(1376,896));
   scroll=root.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.viewport=viewport;scroll.content=content;scroll.horizontal=false;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;scroll.scrollSensitivity=32;root.gameObject.SetActive(false);ready=true;
  }
  TMP_Text Text(Transform parent,string name,float x,float y,float w,float h,string text,float size=24,Color? color=null)
  {var label=TribalStyle.Text(TribalStyle.Top(parent,name,x,y,w,h),GetComponent<CampaignHud>().font,text,mobile?Mathf.Max(17,size*.75f):size,color);return label;}
  UnityEngine.UI.Button Button(Transform parent,string name,float x,float y,float w,float h,Action action,bool selected=false)
  {var button=TribalStyle.Button(TribalStyle.Top(parent,name,x,y,w,h),GetComponent<CampaignHud>().font,name,()=>action(),selected);if(mobile)foreach(var label in button.GetComponentsInChildren<TMP_Text>())label.fontSize=17;return button;}
  public void Render()
  {
   Ensure();if(!ready)return;bool active=activity.Active&&!activity.IntroPlaying;root.gameObject.SetActive(active);if(!active)return;
   foreach(Transform child in content){child.gameObject.SetActive(false);Destroy(child.gameObject);}choices.Clear();var a=activity.Current;var p=activity.CurrentProgress;
   mobile=Screen.width<1000&&MobileControls.TouchActive;lastWidth=Screen.width;lastHeight=Screen.height;
   bool runner=a.mode=="runner";float desiredHeight=runner?290:920;
   root.sizeDelta=new Vector2(mobile?Mathf.Max(280,Screen.width-24):runner?1600:1420,mobile?Mathf.Min(Screen.height-24,desiredHeight):desiredHeight);root.anchorMin=root.anchorMax=new Vector2(.5f,runner?1:.5f);root.pivot=new Vector2(.5f,runner?1:.5f);root.anchoredPosition=runner?new Vector2(0,-12):Vector2.zero;
   float w=root.sizeDelta.x-44;content.sizeDelta=new Vector2(w,runner?266:a.mode=="differences"?1000:896);scroll.vertical=mobile||a.mode=="differences";content.anchoredPosition=Vector2.zero;
   Text(content,"Titre",10,0,mobile?w-20:w-260,runner?35:50,a.title.ToUpperInvariant(),runner?24:32,TribalStyle.Gold);
   if(activity.SstExitPromptOpen)
   {
    timer=null;
    Text(content,"Pause de l’assemblage",25,95,w-50,85,"Les pièces validées restent enregistrées.",25);
    Button(content,"REPRENDRE L’ASSEMBLAGE",25,195,w-50,56,activity.ToggleSstExitPrompt,true);
    Button(content,"QUITTER L’ASSEMBLAGE",25,265,w-50,56,activity.Suspend);
    return;
   }
   if(a.mode=="assemble"){DrawSst(w);return;}
   if(activity.GuideOpen){DrawGuide(w,runner);return;}
   timer=Text(content,"Temps et observations",mobile?10:w-240,mobile?48:5,mobile?w-20:230,40,"",22,TribalStyle.Cyan);timer.alignment=mobile?TextAlignmentOptions.TopLeft:TextAlignmentOptions.TopRight;
   if(a.mode=="differences"){DrawDifferences(w);return;}
   if(a.mode=="allocation"){DrawAllocation(w);return;}
   if(a.mode=="dashboard"||a.mode=="review")
   {
    int verified=c.State.campaignV17.evidence.Count(e=>e.stage==EvidenceStageV17.Verified);int open=c.State.risks.Count(r=>r.value>0);
    Text(content,"Données de la partie",15,60,w-30,90,$"PREUVES VÉRIFIÉES : {verified}   RISQUES OUVERTS : {open}\nÉVÉNEMENTS SIGNALÉS : {c.State.accidents.Count}   FORMATIONS VALIDÉES : {(c.HasFlag("competence_verified")?1:0)}",24,TribalStyle.Cyan);
   }
   float top=runner?(mobile?88:46):(a.mode=="dashboard"||a.mode=="review"?170:90);
   if(activity.TimedOut)
   {Text(content,"Temps écoulé",25,top,w-50,130,activity.Feedback,28);Button(content,"REPRENDRE L’ESSAI",25,top+155,w-50,65,activity.RetryTimer,true);Footer(w);return;}
   if(activity.WorkReady)
   {
    Text(content,"Mesure réelle",25,top,w-50,150,a.measure+"\n\n"+(p.worked?"Mesure mise en place. Observe le nouveau poste avant de vérifier son effet.":"La décision est enregistrée. Elle n’est pas encore une mesure réalisée."),28);
    var work=Button(content,"RÉALISER SUR LE POSTE",25,top+220,w-50,70,()=>activity.PerformWork(),true);work.interactable=!p.worked;
    var verify=Button(content,"CONTRÔLER L’EFFET SUR LE POSTE",25,top+315,w-50,70,()=>activity.VerifyWork());verify.interactable=p.worked&&p.workSeconds>=3;verify.name="V17VerifyWork";Footer(w);return;
   }
   if(p.card>=a.cards.Length)
   {
    Text(content,"Fin des questions",20,top,w-40,70,runner?"Rejoins le point de rassemblement. Compare la liste aux personnes réellement présentes.":"Les messages sont transmis. Termine le point sécurité en évitant les projectiles.",25);
    if(runner)
    {var world=GetComponent<ActivityWorldV17>();Text(content,"Comptage réel",20,top+78,w*.57f,52,$"PRÉSENTS : {world.PresentCount} / {world.ExpectedCount}",22,TribalStyle.Cyan);Button(content,"VÉRIFIER LE RASSEMBLEMENT",w*.59f,top+75,w*.4f,58,()=>activity.ValidateAssembly(),true);}
    else DrawLanes(w,top+140);
    Footer(w);return;
   }
   var card=a.cards[p.card];Text(content,"Question avant les réponses",20,top,w-40,runner?56:165,card.question,runner?22:30);
   if(a.mode=="sort"||a.mode=="swipe")
   {
    var drag=TribalStyle.Top(content,"Tablette à déplacer",w*.24f,top+175,w*.52f,96);TribalStyle.Panel(drag,"panel",TribalStyle.Violet,null,true);
    Text(drag,"Geste",15,15,drag.rect.width-30,70,"GLISSE LA TABLETTE VERS UNE ZONE\nOu clique sur la destination",20);
    drag.gameObject.AddComponent<ActivityDragV17>().view=this;
    for(int i=0;i<card.choices.Length;i++)
    {int answer=i;float width=(w-60)/card.choices.Length;var b=Button(content,card.choices[i],20+i*(width+6),top+315,width,100,()=>activity.Submit(answer),false);var drop=b.gameObject.AddComponent<ActivityDropV17>();drop.view=this;drop.answer=answer;choices.Add(b);}
   }
   else
   {
    float by=top+(runner?66:190),height=runner?42:76;
    for(int i=0;i<card.choices.Length;i++)
    {int answer=i;float width=runner?(w-35)/card.choices.Length:w-40;var b=Button(content,(i+1)+" · "+card.choices[i],runner?15+i*(width+5):20,by+(runner?0:i*(height+12)),width,height,()=>activity.Submit(answer),i==0);choices.Add(b);}
   }
   if(a.mode=="briefing")DrawLanes(w,650);
   Footer(w);
  }
  void DrawGuide(float w,bool runner)
  {
   timer=null;
   var a=activity.Current;
   float y=runner?(mobile?68:47):(mobile?52:90);
   float row=runner?38:mobile?52:72;
   Text(content,"But de l’exercice",16,y,w-32,row,ActivityGuideV244.Instruction(a),runner?19:24,TribalStyle.Gold);
   Text(content,"Commande",16,y+row,w-32,row,ActivityGuideV244.Controls(a),runner?17:22);
   Text(content,"Réussite",16,y+row*2,w-32,row,ActivityGuideV244.Success(a),runner?17:22,TribalStyle.Cyan);
   if(!runner)Text(content,"Interruption",16,y+row*3,w-32,row,"Tu peux revenir au village. Les réponses et preuves acquises restent enregistrées.",22);
   float buttons=runner?y+row*3+5:y+row*4+7;
   var begin=Button(content,"COMMENCER",16,buttons,(w-44)*.54f,48,activity.DismissGuide,true);
   Button(content,"QUITTER · ACQUIS CONSERVÉS",22+(w-44)*.54f,buttons,(w-44)*.46f,48,activity.Suspend);
   content.sizeDelta=new Vector2(w,buttons+61);
   if(Gamepad.current!=null)EventSystem.current?.SetSelectedGameObject(begin.gameObject);
  }
  void DrawSst(float w)
  {
   var a=activity.Current;var p=activity.CurrentProgress;
   bool narrow=w<590;
   float margin=14,usable=w-margin*2,unit=(usable-18)/4;
   float slotY=mobile?66:90,slotHeight=mobile?43:56,answerY=mobile?245:336;
   Text(content,"Clause et progression",margin,mobile?36:45,usable,30,$"ISO 45001 · {a.clause}     {p.answers.Count} / {a.cards.Length} TABLETTES RELIÉES",21,TribalStyle.Cyan);
   string[] phases={"COMPRENDRE\nET PLANIFIER","METTRE\nEN ŒUVRE","VÉRIFIER","CORRIGER\nET AMÉLIORER"};
   for(int i=0;i<a.cards.Length;i++)
   {
    bool filled=p.answers.Contains(a.cards[i].id);
    float x=margin+i*(unit+6);
    if(i>0&&filled&&p.answers.Contains(a.cards[i-1].id))
     AdventureUI.Panel(TribalStyle.Top(content,"Liaison "+i,x-7,slotY+slotHeight/2,8,3),TribalStyle.Gold);
    var slot=TribalStyle.Top(content,"Emplacement "+(i+1),x,slotY,unit,slotHeight);
    TribalStyle.Panel(slot,"row",filled?new Color(.37f,.23f,.12f):new Color(.10f,.10f,.16f));
    var label=Text(slot,"Fonction",3,3,unit-6,slotHeight-6,(filled?"✓ ":"")+phases[i],narrow?14:19,filled?TribalStyle.Gold:TribalStyle.Paper);
    label.alignment=TextAlignmentOptions.Center;
    if(narrow)label.fontSize=12;
   }
   bool done=p.card>=a.cards.Length;
   float bottom;
   if(done)
   {
    Text(content,"Assemblage complet",margin,mobile?122:168,usable,76,"LES QUATRE ÉLÉMENTS SONT RELIÉS\nLe système SST peut maintenant être vérifié.",25,TribalStyle.Gold);
    choices.Add(Button(content,"VALIDER L’ASSEMBLAGE",margin,mobile?182:258,usable,56,activity.ConfirmSstAssembly,true));
    bottom=mobile?250:324;
   }
   else
   {
    Text(content,"Consigne SST",margin,mobile?113:157,usable,narrow?48:43,"Lis la tablette centrale et associe-la à la bonne fonction du système SST.",21);
    var card=a.cards[p.card];
    var tablet=TribalStyle.Top(content,"Tablette à déplacer",margin,mobile?155:211,usable,mobile?82:narrow?112:105);
    TribalStyle.Panel(tablet,"panel",new Color(.36f,.23f,.14f),new Color(.70f,.48f,.27f),true);
    Text(tablet,"Tablette SST",16,8,usable-32,25,$"TABLETTE {p.card+1} · GLISSE, CLIQUE OU TOUCHE UNE RÉPONSE",17,TribalStyle.Gold);
    Text(tablet,"Question",16,mobile?31:36,usable-32,mobile?46:narrow?66:60,card.question,26,TribalStyle.Paper);
    tablet.gameObject.AddComponent<ActivityDragV17>().view=this;
    int count=card.choices.Length;
    float width=narrow?usable:(usable-(count-1)*10)/count;
    for(int i=0;i<count;i++)
    {
     int answer=i;
     var button=Button(content,card.choices[i],margin+(narrow?0:i*(width+10)),answerY+(narrow?i*57:0),width,narrow?51:mobile?61:85,
      ()=>activity.Submit(answer));
     var drop=button.gameObject.AddComponent<ActivityDropV17>();drop.view=this;drop.answer=answer;
     choices.Add(button);
    }
    bottom=narrow?answerY+174:mobile?312:435;
   }
   Text(content,"Retour de l’assemblage",margin,bottom,usable,narrow?66:58,activity.Feedback,21,
    activity.AssemblyPhase==SstAssemblyPhase.Error?new Color(1,.62f,.43f):TribalStyle.Cyan);
   Button(content,"QUITTER · ACQUIS CONSERVÉS",margin,bottom+69,usable,46,activity.ToggleSstExitPrompt);
   content.sizeDelta=new Vector2(w,bottom+128);
   scroll.vertical=mobile;
   timer=null;padChoice=0;
   if(Gamepad.current!=null&&choices.Count>0)EventSystem.current?.SetSelectedGameObject(choices[0].gameObject);
  }
  void DrawAllocation(float w)
  {
   var a=activity.Current;var p=activity.CurrentProgress;Text(content,"Besoins et moyens",20,85,w-40,125,"Réserve les 9 unités disponibles selon les besoins des objectifs : formation 3, stockage 4, foyer 2.\nUne répartition égale laisserait le stockage sans moyens suffisants.",28);
   if(mobile)
   {
    for(int i=0;i<3;i++){int index=i;float y=270+i*95;Text(content,"Coffre "+i,20,y,w-40,32,a.cards[0].choices[i].ToUpperInvariant()+" · "+p.allocation[i],22,TribalStyle.Gold);Button(content,"−",20,y+34,(w-55)/2,48,()=>activity.Allocate(index,-1));Button(content,"+",35+(w-55)/2,y+34,(w-55)/2,48,()=>activity.Allocate(index,1));}
    Button(content,"AFFECTER LES MOYENS",25,600,w-50,65,()=>activity.ConfirmAllocation(),true);Footer(w);return;
   }
   for(int i=0;i<3;i++)
   {int index=i;float x=25+i*(w-40)/3;float width=(w-70)/3;var box=TribalStyle.Top(content,"Coffre "+i,x,255,width,255);TribalStyle.Panel(box,"panel");Text(box,"Nom",20,25,width-40,60,a.cards[0].choices[i].ToUpperInvariant(),26,TribalStyle.Gold);Text(box,"Ressources engagées",20,95,width-40,60,p.allocation[i].ToString(),44,TribalStyle.Cyan);Button(box,"−",20,180,80,55,()=>activity.Allocate(index,-1));Button(box,"+",width-100,180,80,55,()=>activity.Allocate(index,1));}
   Button(content,"AFFECTER LES MOYENS",25,555,w-50,65,()=>activity.ConfirmAllocation(),true);Footer(w);
  }
  void DrawLanes(float w,float y)
  {
   Text(content,"Esquive",25,y,w-50,35,"DÉPLACE DYLAN : évite les fruits sans interrompre les messages",20,TribalStyle.Cyan);
   Button(content,"← GAUCHE",25,y+42,w*.45f,50,()=>activity.MoveLane(-1));Button(content,"DROITE →",w*.52f,y+42,w*.45f,50,()=>activity.MoveLane(1));
  }
  void DrawDifferences(float w)
  {
   var world=GetComponent<ActivityWorldV17>();world.RefreshPainting();var a=activity.Current;var p=activity.CurrentProgress;float width=(w-65)/2;
   for(int side=0;side<2;side++)
   {
    float x=20+side*(width+25);Text(content,side==0?"AVANT":"MAINTENANT",x,55,width,36,side==0?"AVANT":"MAINTENANT",25,TribalStyle.Cyan);
    var imageRect=TribalStyle.Top(content,"Stèle "+side,x,100,width,350);var image=imageRect.gameObject.AddComponent<UnityEngine.UI.RawImage>();image.texture=side==0?world.Before:world.Now;image.raycastTarget=true;
    for(int i=0;i<a.cards.Length;i++)
    {int index=i;var uv=world.PaintingUv(a.cards[i].site);float sx=Mathf.Clamp(uv.x,.05f,.95f)*width,sy=(1-Mathf.Clamp(uv.y,.05f,.95f))*350; // Same coordinates on both representations.
     sx+=((i%3)-1)*26;sy+=(i/5-1)*26;
     Button(imageRect,(i+1).ToString(),sx-17,sy-17,34,34,()=>SelectDifference(index),p.answers.Contains(a.cards[i].id));}
   }
   if(selectedDifference>=0&&selectedDifference<a.cards.Length)
   {
    var card=a.cards[selectedDifference];Text(content,"Observation",25,474,w-50,125,card.question+" · ISO "+card.clause+"\nAVANT : "+card.before+"\nMAINTENANT : "+card.after,24);
    for(int i=0;i<card.choices.Length;i++){int answer=i;var button=Button(content,card.choices[i],25+i*(w-50)/2,618,(w-65)/2,56,()=>activity.Submit(answer),i==0);button.interactable=!p.answers.Contains(card.id);}
   }
   else Text(content,"Repérage",25,480,w-50,90,"Sélectionne une modification sur l’une des stèles, puis associe son explication.",28);
   Button(content,"OBSERVATION PRÉCÉDENTE",25,686,(w-65)/2,48,()=>SelectDifference((selectedDifference+a.cards.Length-1)%a.cards.Length));
   Button(content,"OBSERVATION SUIVANTE",40+(w-65)/2,686,(w-65)/2,48,()=>SelectDifference((selectedDifference+1)%a.cards.Length));
   Button(content,"VALIDER LES OBSERVATIONS",25,746,w-50,48,()=>activity.ValidateDifferences(),true);Footer(w);
  }
  void Footer(float w)
  {
   bool compact=activity.Current.mode=="runner";float height=compact?246:activity.Current.mode=="differences"?990:876;
   if(!compact)Text(content,"Explication courte",25,height-115,w-50,75,activity.Feedback,21,TribalStyle.Cyan);
   Button(content,"REVENIR AU VILLAGE · ACQUIS CONSERVÉS",25,height-47,w-50,44,activity.Suspend);
  }
  public void Drop(int answer){activity.Submit(answer);}
  public void CancelDrag(){if(root!=null)foreach(var drag in root.GetComponentsInChildren<ActivityDragV17>())drag.Cancel();}
  void SelectDifference(int index){selectedDifference=index;if(!activity.ObserveDifference(index))Render();}
  void Update()
  {
   if(activity==null)return;Ensure();if(root==null)return;bool show=activity.Active&&!activity.IntroPlaying;if(root.gameObject.activeSelf!=show)Render();if(!show)return;
   if(lastWidth!=Screen.width||lastHeight!=Screen.height){Render();return;}var parent=root.parent as RectTransform;root.localScale=Vector3.one*(mobile?1/Mathf.Max(.01f,GetComponent<CampaignHud>().Canvas.scaleFactor):Mathf.Min(1,(parent.rect.width-24)/root.sizeDelta.x,(parent.rect.height-24)/root.sizeDelta.y));
   if(Time.unscaledTime>=next)
   {
    next=Time.unscaledTime+.2f;var a=activity.Current;var p=activity.CurrentProgress;if(timer!=null)timer.text=(a.duration>0?Mathf.Max(0,a.duration-p.seconds).ToString("0")+" s":"")+"  "+p.answers.Count+" / "+a.cards.Length;
    var control=root.GetComponentsInChildren<UnityEngine.UI.Button>().FirstOrDefault(b=>b.name=="V17VerifyWork");if(control!=null)control.interactable=p.worked&&p.workSeconds>=3;
   }
   if(activity.SstExitPromptOpen||activity.GuideOpen||c.IsPaused)return;
   var gamepad=Gamepad.current;
   if(activity.Current.mode=="assemble"&&gamepad!=null&&choices.Count>0)
   {
    int shift=gamepad.dpad.left.wasPressedThisFrame||gamepad.dpad.up.wasPressedThisFrame?-1:
     gamepad.dpad.right.wasPressedThisFrame||gamepad.dpad.down.wasPressedThisFrame?1:0;
    if(shift!=0){padChoice=(padChoice+shift+choices.Count)%choices.Count;EventSystem.current?.SetSelectedGameObject(choices[padChoice].gameObject);}
   }
   var keys=Keyboard.current;if(keys==null)return;
   if(activity.Current.mode=="swipe"){if(keys.leftArrowKey.wasPressedThisFrame)activity.Submit(0);if(keys.upArrowKey.wasPressedThisFrame)activity.Submit(1);if(keys.rightArrowKey.wasPressedThisFrame)activity.Submit(2);}
   else{if(keys.digit1Key.wasPressedThisFrame)activity.Submit(0);if(keys.digit2Key.wasPressedThisFrame)activity.Submit(1);if(keys.digit3Key.wasPressedThisFrame)activity.Submit(2);if(keys.digit4Key.wasPressedThisFrame)activity.Submit(3);}
   if(activity.Current?.mode=="briefing"){if(keys.leftArrowKey.wasPressedThisFrame)activity.MoveLane(-1);if(keys.rightArrowKey.wasPressedThisFrame)activity.MoveLane(1);}
  }
  void OnDestroy(){if(activity!=null)activity.Changed-=Render;}
 }
 [RequireComponent(typeof(CanvasGroup))]
 public sealed class ActivityDragV17:MonoBehaviour,IBeginDragHandler,IDragHandler,IEndDragHandler
 {
  public ActivityViewV17 view;Vector2 start;CanvasGroup group;int pointer;bool dragging,dropped;
  void Awake(){group=GetComponent<CanvasGroup>();}
  public void OnBeginDrag(PointerEventData e)
  {
   if(dragging||view==null||!view.isActiveAndEnabled)return;
   pointer=e.pointerId;dragging=true;dropped=false;
   start=((RectTransform)transform).anchoredPosition;
   group.blocksRaycasts=false;
  }
  public void OnDrag(PointerEventData e){if(dragging&&pointer==e.pointerId)((RectTransform)transform).anchoredPosition+=e.delta/Mathf.Max(.001f,transform.lossyScale.x);}
  public void OnEndDrag(PointerEventData e){if(dragging&&pointer==e.pointerId)Cancel();}
  public bool Accept(int id){if(!dragging||dropped||pointer!=id)return false;dropped=true;return true;}
  public void Cancel(){if(!dragging)return;dragging=false;((RectTransform)transform).anchoredPosition=start;if(group!=null)group.blocksRaycasts=true;}
  void OnDisable(){Cancel();}
 }
 public sealed class ActivityDropV17:MonoBehaviour,IDropHandler
 {public ActivityViewV17 view;public int answer;public void OnDrop(PointerEventData e){var drag=e.pointerDrag?.GetComponent<ActivityDragV17>();if(drag!=null&&drag.view==view&&drag.Accept(e.pointerId))view.Drop(answer);}}
}
