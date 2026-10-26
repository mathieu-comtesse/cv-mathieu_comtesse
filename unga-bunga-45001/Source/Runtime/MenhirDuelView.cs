using System;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
namespace UngaBunga45001
{
 public sealed class MenhirDuelView:MonoBehaviour
 {
  MenhirDuel duel;CampaignRuntime c;Canvas canvas;RectTransform root;TMP_FontAsset font;Vector2 size;bool dirty=true;MenhirPhase renderedPhase;bool renderedPause;TMP_Text sequenceTitle,dialogueText;
  Vector2 View=>MobileControls.Instance!=null?MobileControls.Instance.Viewport:new Vector2(Screen.width,Screen.height);
  public void Bind(MenhirDuel owner,CampaignRuntime runtime)
  {duel=owner;c=runtime;duel.Changed+=Mark;var go=new GameObject("Duel du menhir · interface",typeof(RectTransform),typeof(Canvas),typeof(GraphicRaycaster));canvas=go.GetComponent<Canvas>();canvas.renderMode=RenderMode.ScreenSpaceOverlay;canvas.sortingOrder=190;root=AdventureUI.Fill(go.transform,"Zone sûre");font=FindFirstObjectByType<TextMeshProUGUI>()?.font??TMP_Settings.defaultFontAsset;root.gameObject.SetActive(false);}
  void Mark(){if(duel.Phase!=renderedPhase||c.UserPaused!=renderedPause||duel.Phase==MenhirPhase.Question)dirty=true;}
  void OnDestroy(){if(duel!=null)duel.Changed-=Mark;if(canvas!=null)Destroy(canvas.gameObject);}
  void LateUpdate()
  {if(root==null)return;root.gameObject.SetActive(duel.Active);if(!duel.Active)return;canvas.scaleFactor=Screen.width/Mathf.Max(1,View.x);if(dirty||c.UserPaused!=renderedPause||(size-View).sqrMagnitude>1){size=View;dirty=false;Draw();}if(sequenceTitle!=null)sequenceTitle.text=duel.Banner;if(dialogueText!=null)dialogueText.text=duel.Caption;}
  TMP_Text Text(Transform parent,string name,float x,float y,float w,float h,string text,float fontSize=18,Color? color=null)
  {var t=TribalStyle.Text(TribalStyle.Top(parent,name,x,y,w,h),font,text,fontSize,color);t.overflowMode=TextOverflowModes.Overflow;return t;}
  Button Button(Transform parent,string name,float x,float y,float w,float h,string text,UnityEngine.Events.UnityAction action,bool selected=false)
  {var b=TribalStyle.Button(TribalStyle.Top(parent,name,x,y,w,h),font,text,action,selected);b.name=name;var t=b.GetComponentInChildren<TMP_Text>();t.fontSize=18;t.enableAutoSizing=true;t.fontSizeMin=14;t.fontSizeMax=18;t.textWrappingMode=TextWrappingModes.Normal;t.overflowMode=TextOverflowModes.Overflow;return b;}
  void Draw()
  {
   foreach(Transform child in root){child.gameObject.SetActive(false);Destroy(child.gameObject);}duel.TouchMove=0;duel.TouchGuard=false;sequenceTitle=dialogueText=null;renderedPhase=duel.Phase;renderedPause=c.UserPaused;
   var safe=Screen.safeArea;root.anchorMin=new Vector2(safe.xMin/Screen.width,safe.yMin/Screen.height);root.anchorMax=new Vector2(safe.xMax/Screen.width,safe.yMax/Screen.height);root.offsetMin=root.offsetMax=Vector2.zero;Canvas.ForceUpdateCanvases();float w=root.rect.width,h=root.rect.height,pad=w<900?12:24;
   var p=duel.Progress;bool compact=w<900;float portrait=compact?44:62,barWidth=Mathf.Min(w*.34f,w/2-portrait-pad*2);
   TribalStyle.Portrait(TribalStyle.Top(root,"Portrait Dylan",pad,10,portrait,portrait),"dylan");TribalStyle.Portrait(TribalStyle.Top(root,"Portrait Aurélien",w-pad-portrait,10,portrait,portrait),"aurelien");
   float left=pad+portrait+10;Text(root,"Dylan",left,8,barWidth,24,"DYLAN",compact?14:18);Text(root,"Aurélien",w-left-barWidth,8,barWidth,24,"AURÉLIEN · CHEF",compact?14:18);
   TribalStyle.Meter(TribalStyle.Top(root,"Vie Dylan",left,34,barWidth,compact?12:18),()=>p.dylanLife/100,TribalStyle.Gold,TribalStyle.Pink);TribalStyle.Meter(TribalStyle.Top(root,"Vie Aurélien",w-left-barWidth,34,barWidth,compact?12:18),()=>p.aurelienLife/100,TribalStyle.Orange,TribalStyle.Danger);
   TribalStyle.Meter(TribalStyle.Top(root,"Énergie",left,compact?51:58,barWidth,6),()=>p.energy/100,TribalStyle.Cyan,TribalStyle.Violet);
   Text(root,"Épreuve et phase",w*.5f-65,9,130,50,(p.question+1)+" / 5\nPHASE "+duel.Stage,compact?13:16,TribalStyle.Gold).alignment=TextAlignmentOptions.Center;
   if(c.UserPaused){var shade=AdventureUI.Fill(root,"Pause du combat");TribalStyle.Panel(shade,left:new Color(.015f,.01f,.025f,.9f),raycast:true);float pw=Mathf.Min(480,w-32);var panel=TribalStyle.Top(root,"Combat en pause",(w-pw)/2,Mathf.Max(75,(h-250)/2),pw,250);Text(panel,"Titre",20,8,pw-40,40,"COMBAT EN PAUSE",23,TribalStyle.Gold);Button(panel,"Reprendre",16,60,pw-32,54,"Reprendre le combat",duel.Pause,true);Button(panel,"Sauvegarder et quitter",16,128,pw-32,64,"Sauvegarder et revenir au village",duel.Leave);return;}
   Button(root,"Pause",w-92,compact?66:82,80,44,"Pause",duel.Pause);
   if(duel.Phase==MenhirPhase.ChooseMode){Mode(w,h);return;}
   if(duel.Phase==MenhirPhase.Question){Question(w,h,pad);return;}
   if(duel.Phase==MenhirPhase.Defeat){var panel=Center(w,h,Mathf.Min(620,w-30),260,"Reprise");Text(panel,"Acquis conservés",20,16,panel.rect.width-40,42,duel.Banner,22,TribalStyle.Gold);Text(panel,"Explication",20,64,panel.rect.width-40,100,duel.Caption,18);Button(panel,"Réessayer",20,182,panel.rect.width-40,56,"Reprendre cette épreuve",duel.Retry,true);return;}
   float captionHeight=compact?112:120;float bottom=duel.Phase==MenhirPhase.Combat&&MobileControls.TouchActive?110:12;var caption=TribalStyle.Top(root,"Sous-titres du duel",pad,h-bottom-captionHeight,w-2*pad,captionHeight);TribalStyle.Panel(caption);sequenceTitle=Text(caption,"Titre de séquence",16,9,caption.rect.width-32,26,duel.Banner,compact?14:18,TribalStyle.Gold);var subtitle=dialogueText=Text(caption,"Dialogue",16,40,caption.rect.width-32,captionHeight-46,duel.Caption,compact?15:19);subtitle.enableAutoSizing=true;subtitle.fontSizeMin=13;subtitle.fontSizeMax=compact?15:19;
   if(duel.Phase==MenhirPhase.Intro||duel.Phase==MenhirPhase.Finale)Button(root,"Passer la scène",pad,85,190,46,"Passer la cinématique",duel.SkipFilm);
   if(duel.Phase==MenhirPhase.Combat)
   {var decision=Button(root,"Ouvrir la décision",w-270,compact?118:140,250,52,"Comprendre et décider · E",duel.Ask,true);decision.gameObject.AddComponent<MenhirQuestionGate>().duel=duel;if(MobileControls.TouchActive)Touch(w,h);}
  }
  RectTransform Center(float w,float h,float pw,float ph,string name){var r=TribalStyle.Top(root,name,(w-pw)/2,Mathf.Max(76,(h-ph)/2),pw,ph);TribalStyle.Panel(r,raycast:true);return r;}
  void Mode(float w,float h)
  {
   float pw=Mathf.Min(620,w-28),ph=Mathf.Min(370,h-96);var panel=Center(w,h,pw,ph,"Mode du duel");Text(panel,"Titre",20,14,pw-40,34,"LA POLITIQUE DU MENHIR",23,TribalStyle.Gold);var body=TribalStyle.Scroll(panel,"Choix du mode",14,58,pw-28,ph-72);
   string[] labels={"Arcade · esquive, garde et décisions","Pédagogique · sans attaques automatiques","Avec indices · aide visible pour chaque décision"};for(int i=0;i<3;i++){int mode=i;var row=TribalStyle.Row(body,"Mode "+i,66);Button(row,"Choisir mode "+i,0,0,pw-32,62,labels[i],()=>duel.ChooseMode(mode),i==1);}
   var note=TribalStyle.Row(body,"Commandes",70);Text(note,"Aide",8,0,pw-50,70,"A/D : bouger · Espace : sauter · J/K : coups · L : garde.\nLes coups ne remplacent jamais une bonne décision.",15,TribalStyle.Muted);
  }
  void Question(float w,float h,float pad)
  {
   bool compact=w<900;float pw=w*(compact?.61f:.55f),top=compact?78:94;var panel=TribalStyle.Top(root,"Décision pédagogique",w-pw-pad,top,pw,h-top-12);TribalStyle.Panel(panel,raycast:true);float cw=pw-28;
   Text(panel,"Clause",14,10,cw,27,"ÉPREUVE "+(duel.Progress.question+1)+" · ISO "+duel.Question.clause,compact?14:18,TribalStyle.Gold);
   var content=TribalStyle.Scroll(panel,"Question et réponses",12,48,cw,panel.rect.height-58);var questionRow=TribalStyle.Row(content,"Situation",compact?90:115);var q=Text(questionRow,"Question",8,4,cw-18,questionRow.rect.height-8,duel.Question.question,compact?16:21);q.enableAutoSizing=true;q.fontSizeMin=15;q.fontSizeMax=compact?16:21;
   int epoch=duel.Progress.epoch;
   for(int i=0;i<duel.Question.answers.Length;i++)
   {int answer=i;string text=((char)('A'+i))+" · "+duel.Question.answers[i].text;float preferred=q.GetPreferredValues(text,cw-50,0).y;float height=Mathf.Max(62,preferred+28);var row=TribalStyle.Row(content,"Réponse "+i,height);Button(row,"Réponse "+i,0,0,cw-4,height-4,text,()=>duel.Submit(answer,epoch),duel.Selection==i);}
   if(duel.HintShown||duel.Progress.mode==2){var row=TribalStyle.Row(content,"Indice",100);Text(row,"Indice pédagogique",8,6,cw-20,88,"INDICE · "+duel.Question.hint,compact?14:17,TribalStyle.Cyan);}
   else{var row=TribalStyle.Row(content,"Demander un indice",52);Button(row,"Indice",0,0,cw-4,48,"Afficher un indice",()=>{duel.HintShown=true;dirty=true;});}
   var footer=TribalStyle.Row(content,"Touches",40);Text(footer,"Aide",8,4,cw-18,32,MobileControls.TouchActive?"Touche une réponse. La scène montre la conséquence.":"Haut / Bas puis Entrée · ou touches 1, 2, 3",13,TribalStyle.Muted);
  }
  void Touch(float w,float h)
  {
   void Hold(string name,float x,string label,Action<bool> set){var b=Button(root,name,x,h-92,62,64,label,()=>{});var hold=b.gameObject.AddComponent<MenhirHold>();hold.set=set;}
   Hold("Déplacement gauche",14,"<",held=>duel.TouchMove=held?-1:0);Hold("Déplacement droite",84,">",held=>duel.TouchMove=held?1:0);
   float start=Mathf.Max(170,w-322);Button(root,"Saut tactile",start,h-92,72,64,"Saut",duel.Jump);Button(root,"Coup rapide tactile",start+78,h-92,72,64,"Coup",()=>duel.Attack(false));Button(root,"Coup fort tactile",start+156,h-92,72,64,"Fort",()=>duel.Attack(true));Hold("Garde tactile",start+234,"Garde",held=>duel.TouchGuard=held);
  }
 }
 public sealed class MenhirHold:MonoBehaviour,IPointerDownHandler,IPointerUpHandler
 {public Action<bool> set;public void OnPointerDown(PointerEventData e)=>set?.Invoke(true);public void OnPointerUp(PointerEventData e)=>set?.Invoke(false);void OnDisable()=>set?.Invoke(false);}
 public sealed class MenhirQuestionGate:MonoBehaviour{public MenhirDuel duel;void Update(){GetComponent<Button>().interactable=duel.CanQuestion;}}
}
