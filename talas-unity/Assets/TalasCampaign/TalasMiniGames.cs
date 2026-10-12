using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using TMPro;

public class TalasMiniGames:MonoBehaviour
{
 public GameObject characterPrefab,bossPrefab,workshopPrefab; public Material floorMaterial,waterMaterial;
 public GameObject[] propPrefabs;
 public List<string> Notes=new List<string>();
 public bool PreparedAudit;
 public bool IsRunning {get;private set;} public string ActiveId {get;private set;} public string LastResult {get;private set;}
 public bool IsPaused=>paused||phase==0;
 public int Health {get;private set;} public int Score {get;private set;} public int Index {get;private set;}
 public float Elapsed {get;private set;} public int Budget {get;private set;} public int Quarter {get;private set;}
 public int[] Bought=new int[5]; public Vector3 PlayerPosition=>avatar!=null?avatar.transform.localPosition:Vector3.zero;
 public int ExpectedAnswer=>questions!=null&&Index<questions.Length?questions[Index].correct:-1;
 public bool AwaitingAnswer=>questions!=null&&phase==1;
 public bool ReadyForNext=>phase==2;
 public int PendingObjects=>objects.Count;
 TalasBank bank; Action<bool,int> finished; GameObject ui,stage,avatar,actions; TextMeshProUGUI heading,status,feedback;
 Camera cam; Vector3 oldCam; Quaternion oldRot; float oldFov; bool oldOrtho; float oldSize;TalasGameAudio audio;
 TalasQuestion[] questions; TalasRigAnimator rig; int phase,success,total,lane,spawnIndex,songHit,awakened,selectedPost,feastItem,bonusAttempts;
 float timer,nextSpawn,jump,vy,slide,stamp,steal,dragPenalty,progress,actionTime;
 bool pinching,paused; Vector3 dragPoint; Vector3[] path; int pathIndex;
 readonly List<Piece> objects=new List<Piece>();readonly List<GameObject> platforms=new List<GameObject>();readonly HashSet<string> pickups=new HashSet<string>();
 int[] rivals=new int[3]; System.Random random;
 class Piece {public GameObject go; public int type,index,lane;public float speed;public bool hit;}
 static readonly string[] ids={"attrape","combat","fuite","budget","festin","karaoke1","karaoke2","doc","parcours","revue","operation","jetski","avions","petanque","lanternes"};
 public static string[] AllIds=>ids;
 public void Begin(string id,Action<bool,int> done)
 {
  if(Array.IndexOf(ids,id)<0)throw new ArgumentException("Mini-jeu inconnu "+id);
  if(IsRunning)Exit();bank=TalasBank.Load();ActiveId=id;finished=done;IsRunning=true;LastResult="";phase=0;paused=false;Health=id=="budget"?20:5;Score=Index=success=total=spawnIndex=songHit=awakened=lane=bonusAttempts=0;Elapsed=timer=jump=vy=slide=stamp=steal=progress=dragPenalty=0;nextSpawn=.7f;Budget=8;Quarter=1;selectedPost=0;Bought=new int[5];rivals=new int[3];objects.Clear();Notes.Clear();platforms.Clear();pickups.Clear();random=new System.Random(45001);questions=null;
  cam=Camera.main;oldCam=cam.transform.position;oldRot=cam.transform.rotation;oldFov=cam.fieldOfView;oldOrtho=cam.orthographic;oldSize=cam.orthographicSize;
  stage=new GameObject("Plateau "+id);stage.transform.position=new Vector3(220,0,0);audio=stage.AddComponent<TalasGameAudio>();if(id.StartsWith("karaoke"))audio.Rhythm();
  Box("Sol atelier",new Vector3(0,-.2f,2),new Vector3(23,.3f,30),new Color(.14f,.23f,.24f),floorMaterial);
  if(workshopPrefab!=null){var house=Instantiate(workshopPrefab,stage.transform);house.transform.localPosition=new Vector3(0,0,12);house.transform.localScale*=1.5f;}
  avatar=characterPrefab!=null?Instantiate(characterPrefab,stage.transform):Box("Dylan",new Vector3(0,1,0),new Vector3(.65f,2,.65f),TalasUI.Amber);
  avatar.name="Dylan dans le mini-jeu";avatar.transform.localPosition=Vector3.zero;rig=avatar.GetComponent<TalasRigAnimator>();if(rig!=null)rig.Locomotion(0);
  cam.orthographic=false;cam.fieldOfView=32;cam.transform.position=stage.transform.position+new Vector3(0,9,-25);cam.transform.LookAt(stage.transform.position+new Vector3(0,2,2));
  ui=TalasUI.Canvas("Mini-jeu "+id,20);var top=TalasUI.Panel("Titre",ui.transform,20,18,1000,74);heading=TalasUI.Text(top.transform,Title(id),18,8,960,30,24);status=TalasUI.Text(top.transform,"",18,41,960,26,18);
  TalasUI.Button(ui.transform,"Pause",1040,18,100,36,()=>paused=!paused);TalasUI.Button(ui.transform,"Quitter",1150,18,110,36,Exit);
  var dialogue=TalasUI.Dialogue(ui.transform,id=="combat"?"AURÉLIEN":"BOULON",Instructions(id),id=="combat"?"aurelien":"boulon");feedback=dialogue.body;
  actions=new GameObject("Actions",typeof(RectTransform));TalasUI.Place(actions,ui.transform,30,115,430,470);
  Button("Commencer",0,()=>{phase=1;ClearActions();Setup();});status.text="Lis les commandes, puis commence.";TalasWebRendering.Adapt(stage);
 }
 public void Exit(){if(!IsRunning)return;Cleanup();finished?.Invoke(false,-1);}
 void Finish(bool won)
 {
  if(!IsRunning||phase==3)return;phase=3;paused=false;LastResult=won?"Réussite":"Échec";ClearActions();if(rig!=null)rig.Play(won?"Dance_Loop":"Death01",true);
  feedback.text=(won?"Épreuve réussie. ":"Dylan a échoué. Tu peux recommencer. ")+"Score : "+Score+". Les réussites sont conservées dans le carnet.";
  Button("Retour au village",0,()=>{int stars=won?Mathf.Clamp(1+Score/Mathf.Max(1,total/2),1,3):0;Cleanup();finished?.Invoke(won,stars);});
 }
 void Cleanup(){IsRunning=false;if(ui!=null)Destroy(ui);if(stage!=null)Destroy(stage);objects.Clear();cam.transform.SetPositionAndRotation(oldCam,oldRot);cam.fieldOfView=oldFov;cam.orthographic=oldOrtho;cam.orthographicSize=oldSize;}
 public void ReturnResult(){if(phase!=3)return;var b=actions.GetComponentInChildren<UnityEngine.UI.Button>();if(b!=null)b.onClick.Invoke();}
 void ClearActions(){foreach(Transform t in actions.transform)Destroy(t.gameObject);}
 void Button(string label,int n,Action action){TalasUI.Button(actions.transform,label,0,n*56,430,50,action);}
 GameObject Box(string name,Vector3 p,Vector3 size,Color c,Material mat=null,PrimitiveType type=PrimitiveType.Cube)
 {
  var go=GameObject.CreatePrimitive(type);go.name=name;go.transform.SetParent(stage.transform,false);go.transform.localPosition=p;go.transform.localScale=size;Destroy(go.GetComponent<Collider>());var r=go.GetComponent<Renderer>();if(mat!=null)r.sharedMaterial=TalasWebRendering.MaterialFor(mat);else{var m=new Material(Application.platform==RuntimePlatform.WebGLPlayer?Resources.Load<Shader>("TalasWebLit"):Shader.Find("Universal Render Pipeline/Lit"));m.color=c;m.SetFloat("_Smoothness",.4f);r.sharedMaterial=m;go.AddComponent<TalasOwnedMaterial>().material=m;}return go;
 }
 void Setup()
 {
  switch(ActiveId)
  {
   case "combat":questions=bank.combat;Box("Bureau de direction",new Vector3(5,.05f,1),new Vector3(4,.1f,2),new Color(.22f,.16f,.12f));if(bossPrefab!=null){var boss=Instantiate(bossPrefab,stage.transform);boss.transform.localPosition=new Vector3(5,0,0);boss.transform.localScale*=1.25f;}ShowQuestion();break;
   case "doc":questions=bank.doc;ShowQuestion();break;
   case "revue":questions=(TalasQuestion[])bank.review.Clone();if(!PreparedAudit)Array.Copy(bank.reviewUnprepared,0,questions,10,bank.reviewUnprepared.Length);ShowQuestion();break;
   case "budget":for(int i=0;i<5;i++)Box(bank.postes[i].text,new Vector3(-8+i*4,.1f,6),new Vector3(2.5f,.18f,2.5f),Color.Lerp(Color.gray,TalasUI.Amber,i*.15f));BudgetMenu();break;
   case "festin":Box("Table du festin",new Vector3(0,.85f,1),new Vector3(15,.2f,3),new Color(.26f,.17f,.12f));for(int i=-1;i<=1;i+=2)for(int z=0;z<=2;z+=2)Box("Pied de table",new Vector3(i*6,.4f,z),new Vector3(.25f,.8f,.25f),new Color(.2f,.14f,.1f));avatar.transform.localPosition=new Vector3(0,0,-1.5f);for(int i=0;i<3;i++)if(characterPrefab!=null){var rival=Instantiate(characterPrefab,stage.transform);rival.transform.localPosition=new Vector3(-4+i*4,0,3.2f);rival.GetComponent<TalasRigAnimator>().Play("Sitting_Idle_Loop");}NewPlate();ActionButtons();break;
   case "parcours":SetupPlatforms();ActionButtons();break;
   case "operation":avatar.SetActive(false);NewCause();ActionButtons();break;
   case "jetski":Box("Bassin de régate",new Vector3(0,-.1f,8),new Vector3(22,.2f,50),Color.cyan,waterMaterial);Box("Jet-ski",new Vector3(0,.1f,0),new Vector3(1.4f,.45f,2.5f),TalasUI.Amber);if(rig!=null)rig.Play("Sitting_Idle_Loop");ActionButtons();break;
   case "avions":case "petanque":case "lanternes":SetupBonus();break;
   default:for(int i=0;i<3;i++)Box("Voie "+i,new Vector3((i-1)*4,.01f,7),new Vector3(.08f,.02f,20),TalasUI.Amber);ActionButtons();break;
  }
  DressStage();TalasWebRendering.Adapt(stage);
 }
 GameObject Prop(string name,Vector3 p,float height=1)
 {
  if(propPrefabs==null)return null;foreach(var prefab in propPrefabs)if(prefab!=null&&prefab.name==name){var go=Instantiate(prefab,stage.transform);go.transform.localPosition=p;go.transform.localScale*=height;TalasWebRendering.Adapt(go);return go;}return null;
 }
 void DressStage()
 {
  switch(ActiveId)
  {
   case "attrape":case "doc":Prop("vestiaire",new Vector3(-7,0,4),3);Prop("etabli",new Vector3(6,0,5),2);Prop("banc",new Vector3(-4,0,3),1);break;
   case "combat":Prop("etabli",new Vector3(5,0,1),1.5f);Prop("armoire-electrique",new Vector3(8,0,5),2.5f);break;
   case "budget":string[] n={"fut-chimique","rayonnage","poste-soudure","chariot-elevateur","palette"};for(int i=0;i<5;i++)Prop(n[i],new Vector3(-8+i*4,0,6),1.7f);break;
   case "parcours":Prop("avion-a320",new Vector3(-1,-.5f,4),5);Prop("chariot-elevateur",new Vector3(-6,0,2),1.8f);Prop("palan",new Vector3(13,7,2),3);break;
   case "fuite":for(int i=0;i<8;i++){Prop("cone",new Vector3(-7,.1f,i*3),.8f);Prop("cone",new Vector3(7,.1f,i*3),.8f);}Prop("panneau-sortie",new Vector3(0,3,15),1.2f);break;
   case "jetski":Prop("barque",new Vector3(-7,0,7),1);Prop("barque",new Vector3(8,0,12),1.2f);break;
   case "operation":Prop("chariot-infirmerie",new Vector3(0,-.5f,3),2);break;
   default:Prop("banc",new Vector3(-7,0,5),1.5f);Prop("banc",new Vector3(7,0,5),1.5f);break;
  }
 }
 void ActionButtons()
 {
  switch(ActiveId){case "attrape":Button("Gauche",0,()=>Move(-1));Button("Droite",1,()=>Move(1));break;
   case "fuite":case "jetski":Button("Voie gauche",0,()=>Move(-1));Button("Voie droite",1,()=>Move(1));Button("Saut / accélération",2,()=>Control("jump"));Button("Glisser / ralentir",3,()=>Control("slide"));Button("Guider un collègue",4,()=>Control("guide"));break;
   case "festin":Button("Tamponner",0,()=>Control("stamp"));Button("Refiler à gauche",1,()=>Control("left"));Button("Refiler à droite",2,()=>Control("right"));Button("Repousser les mains",3,()=>Control("push"));break;
   case "karaoke1":case "karaoke2":for(int i=0;i<3;i++){int n=i;Button(new[]{"Q : piste gauche","S : piste centrale","D : piste droite"}[i],i,()=>Sing(n));}break;
   case "parcours":Button("Gauche",0,()=>Move(-1));Button("Droite",1,()=>Move(1));Button("Double saut",2,()=>Control("jump"));Button("Grimper",3,()=>Control("climb"));Button("Tornade",4,()=>Control("spin"));Button("Dernier drapeau",5,()=>Control("respawn"));break;
   case "operation":Button("Pincer / poser",0,()=>pinching=!pinching);break;}
 }
 void Update()
 {
  if(!IsRunning)return;if(phase==3)return;var k=Keyboard.current;if(k!=null&&k.escapeKey.wasPressedThisFrame)paused=!paused;
  if(paused){status.text="PAUSE — Échap pour reprendre";return;}if(phase==0)return;
  float dt=Mathf.Min(Time.deltaTime,.05f);Elapsed+=dt;timer+=dt;status.text=Title(ActiveId)+"  ·  Santé "+Health+"  ·  Score "+Score+"  ·  "+Mathf.FloorToInt(Elapsed)+" s";
  if(k!=null)
  {
   if(k.digit1Key.wasPressedThisFrame)Choose(0);if(k.digit2Key.wasPressedThisFrame)Choose(1);if(k.digit3Key.wasPressedThisFrame)Choose(2);if(k.digit4Key.wasPressedThisFrame)Choose(3);if(k.digit5Key.wasPressedThisFrame)Choose(4);
   if(k.enterKey.wasPressedThisFrame&&phase==2)Next();
   if(ActiveId.StartsWith("karaoke")){if(k.qKey.wasPressedThisFrame||k.leftArrowKey.wasPressedThisFrame)Sing(0);if(k.sKey.wasPressedThisFrame||k.downArrowKey.wasPressedThisFrame)Sing(1);if(k.dKey.wasPressedThisFrame||k.rightArrowKey.wasPressedThisFrame)Sing(2);}
   else if(ActiveId=="fuite"||ActiveId=="jetski"){if(k.qKey.wasPressedThisFrame||k.leftArrowKey.wasPressedThisFrame)Move(-1);if(k.dKey.wasPressedThisFrame||k.rightArrowKey.wasPressedThisFrame)Move(1);}
   else if(ActiveId=="attrape"||ActiveId=="parcours"){float axis=(k.dKey.isPressed||k.rightArrowKey.isPressed?1:0)-(k.qKey.isPressed||k.aKey.isPressed||k.leftArrowKey.isPressed?1:0);Walk(axis,dt);}
   if(k.spaceKey.wasPressedThisFrame)Control(ActiveId=="festin"?"stamp":"jump");if(k.sKey.wasPressedThisFrame)Control(ActiveId=="festin"?"push":"slide");if(k.eKey.wasPressedThisFrame)Control(ActiveId=="parcours"?"spin":"guide");if(k.zKey.isPressed||k.upArrowKey.isPressed)Control("climb");if(k.rKey.wasPressedThisFrame)Control("respawn");
   if(ActiveId=="festin"){if(k.qKey.wasPressedThisFrame)Control("left");if(k.dKey.wasPressedThisFrame)Control("right");}
  }
  if(questions!=null){if(ActiveId=="combat"&&phase==1&&timer>10)Choose(-1);if(ActiveId=="jetski"&&phase==2)TickRace(dt);return;}
  switch(ActiveId){case "attrape":TickCatch(dt);break;case "fuite":case "jetski":TickRace(dt);break;case "budget":TickBudget(dt);break;case "festin":TickFeast(dt);break;case "karaoke1":case "karaoke2":TickSong(dt);break;case "parcours":TickPlatforms(dt);break;case "operation":TickOperation(dt);break;case "avions":case "petanque":case "lanternes":TickBonus(dt);break;}
  if(Health<=0)Finish(false);
 }
 public void StartGame(){if(phase==0){phase=1;ClearActions();Setup();}}
 public void Move(int direction)
 {
  if(!IsRunning||phase!=1)return;if(ActiveId=="fuite"||ActiveId=="jetski"){lane=Mathf.Clamp(lane+direction,-1,1);return;}Walk(direction,ActiveId=="parcours"?.1f:.22f);
 }
 void Walk(float axis,float dt){var p=avatar.transform.localPosition;p.x=Mathf.Clamp(p.x+axis*(ActiveId=="parcours"?5:8)*dt,ActiveId=="parcours"?-9:-8,ActiveId=="parcours"?16:8);avatar.transform.localPosition=p;if(rig!=null)rig.Locomotion(axis*3);}
 public void Control(string action)
 {
  if(!IsRunning||phase!=1)return;
  if(action=="jump"&&(ActiveId=="fuite"||ActiveId=="parcours")){if(ActiveId=="parcours"&&jump>=2)return;if(ActiveId=="fuite"&&jump>0)return;jump++;vy=7.8f;if(rig!=null)rig.Play("Jump_Loop",true);}
  if(action=="slide")slide=1;
  if(action=="guide"&&ActiveId=="fuite")foreach(var p in objects)if(p.type==2&&!p.hit&&p.lane==lane&&p.go.transform.localPosition.z<2.5f&&p.go.transform.localPosition.z>-1){p.hit=true;Score+=2;success++;feedback.text="Collègue guidé au rassemblement (§8.2).";p.go.SetActive(false);}
  if(ActiveId=="festin"){if(action=="stamp"&&stamp<=0){stamp=1.8f-Mathf.Clamp(bank.feast[feastItem].level,0,5)*.25f;actionTime=stamp;if(rig!=null)rig.Play("Punch_Cross",true);}if(action=="left"||action=="right"){if(bank.feast[feastItem].level==5){Score++;rivals[action=="left"?0:2]-=2;}else{Score-=1;rivals[action=="left"?0:2]+=5-bank.feast[feastItem].level;}NewPlate();}if(action=="push"){steal=0;feedback.text="Main repoussée. Le plan d’actions reste sur ta table.";}}
  if(ActiveId=="parcours"){
   if(action=="respawn"){avatar.transform.localPosition=new Vector3(pickups.Contains("drapeau")?8:-8,pickups.Contains("drapeau")?7:0,0);vy=jump=0;}
   if(action=="climb")foreach(var p in platforms)if(p.name=="Échelle"&&Mathf.Abs(avatar.transform.localPosition.x-p.transform.localPosition.x)<.8f&&Mathf.Abs(avatar.transform.localPosition.y-p.transform.localPosition.y)<2.8f){var v=avatar.transform.localPosition;v.y+=3*Time.deltaTime;avatar.transform.localPosition=v;vy=0;}
   if(action=="spin"){slide=.45f;if(rig!=null)rig.Play("Punch_Jab",true);}
  }
 }
 void ShowQuestion()
 {
  if(Index>=questions.Length){Finish(Score>=Mathf.CeilToInt(total*.5f)&&Health>0);return;}
  phase=1;timer=0;ClearActions();var q=questions[Index];feedback.text=q.text;
  for(int i=0;i<q.options.Length;i++){int n=i;Button((i+1)+". "+q.options[i],i,()=>Choose(n));}
 }
 public void Choose(int n)
 {
  if(questions==null||phase!=1||Index>=questions.Length)return;var q=questions[Index];bool correct=n==q.correct;total++;if(correct){Score++;success++;if(rig!=null)rig.Play(ActiveId=="combat"?"Punch_Cross":"Idle_Talking_Loop",true);}else if(ActiveId=="combat"||ActiveId=="jetski"){Health--;if(rig!=null)rig.Play("Hit_Head",true);}
  audio.Note(correct?2:0);
  if(ActiveId=="combat"){var boss=stage.transform.Find("Aurelien — articulé(Clone)");if(boss!=null){var br=boss.GetComponent<TalasRigAnimator>();if(br!=null)br.Play(correct?"Hit_Chest":"Punch_Cross",true);TalasImpact.Burst((correct?boss.position:avatar.transform.position)+Vector3.up*1.35f,correct?TalasUI.Amber:new Color(.9f,.25f,.2f));}}
  if(correct&&!Notes.Contains(q.feedback))Notes.Add(q.feedback);
  phase=2;feedback.text=(correct?"Exact. ":"À corriger. ")+q.feedback;ClearActions();Button("Lire la correction, puis continuer",0,Next);if(Health<=0)Finish(false);
 }
 public void Next()
 {
  if(phase!=2)return;Index++;if(ActiveId=="jetski"){questions=null;phase=1;ClearActions();ActionButtons();return;}ShowQuestion();
 }
 void Spawn(int type,int index,int targetLane,float y,float z,float speed)
 {
  var color=type==0?new Color(.17f,.68f,.88f):type==2?new Color(.4f,.85f,.5f):new Color(.88f,.25f,.18f);
  var go=Box(type==0?"Document / mesure":type==2?"Collègue":"Danger",new Vector3(targetLane*4,y,z),type==0?new Vector3(.75f,.45f,.15f):new Vector3(.8f,.8f,.8f),color);objects.Add(new Piece{go=go,type=type,index=index,lane=targetLane,speed=speed});
 }
 void TickCatch(float dt)
 {
  if(timer>=nextSpawn&&spawnIndex<20){int i=spawnIndex++;bool good=i%2==0;Spawn(good?0:1,i/2,random.Next(-2,3),7,0,1.9f+i*.015f);nextSpawn=timer+1.4f;}
  for(int i=objects.Count-1;i>=0;i--){var p=objects[i];var v=p.go.transform.localPosition;v.x=Mathf.Clamp(v.x,-8,8);v.y-=p.speed*dt;p.go.transform.localPosition=v;
   if(v.y<1.5f&&Mathf.Abs(v.x-avatar.transform.localPosition.x)<.85f&&!p.hit){p.hit=true;if(p.type==0){Score++;success++;feedback.text=bank.docs[p.index].text+" — "+bank.docs[p.index].info;Notes.Add(feedback.text);}else{Health--;feedback.text="Déchet : ce n’est pas une preuve SST.";}Destroy(p.go);objects.RemoveAt(i);}else if(v.y<-.5f){Destroy(p.go);objects.RemoveAt(i);}}
  total=10;if(spawnIndex==20&&objects.Count==0)Finish(Score>=5&&Health>0);
 }
 void TickRace(float dt)
 {
  if(phase!=1)return;progress+=dt*(ActiveId=="jetski"?18:8);slide=Mathf.Max(0,slide-dt);var pos=avatar.transform.localPosition;pos.x=Mathf.Lerp(pos.x,lane*4,dt*10);
  if(jump>0){vy-=18*dt;pos.y+=vy*dt;if(pos.y<=0){pos.y=0;jump=0;vy=0;}}avatar.transform.localPosition=pos;
  if(timer>=nextSpawn){Spawn(random.Next(0,3),spawnIndex++,random.Next(-1,2),.55f,20,ActiveId=="jetski"?8:6);nextSpawn=timer+2.1f;}
  for(int i=objects.Count-1;i>=0;i--){var p=objects[i];var v=p.go.transform.localPosition;v.z-=p.speed*dt;p.go.transform.localPosition=v;
   if(!p.hit&&v.z<.8f&&v.z>-.8f&&p.lane==lane){p.hit=true;bool safe=ActiveId=="jetski"?p.type==0:p.type==0?pos.y>1.1f:p.type==1?slide>0:false;if(safe){Score++;}else if(p.type!=2||ActiveId=="jetski"){Health--;feedback.text=ActiveId=="jetski"?"Bouée heurtée : ralentis et anticipe.":p.type==0?"Obstacle bas : il fallait sauter.":"Traverse haute : il fallait glisser.";}}
   if(v.z<-3){Destroy(p.go);objects.RemoveAt(i);}}
  if(ActiveId=="jetski"&&progress>120*(Index+1)&&Index<bank.jetski.Length){questions=bank.jetski;ShowQuestion();return;}
  float target=ActiveId=="jetski"?1200:560;status.text=Title(ActiveId)+"  ·  "+(int)progress+" / "+target+" m  ·  Santé "+Health+"  ·  Score "+Score;
  if(progress>=target){total=ActiveId=="jetski"?bank.jetski.Length:10;Finish(Health>0&&(ActiveId!="jetski"||success>=4));}
 }
 float Risk(int p){int b=Bought[p];return (b&1)!=0?0:((b&2)!=0?.5f:1)*((b&4)!=0?.15f:1)*((b&8)!=0?.5f:1)*((b&16)!=0?.5f:1);}
 void BudgetMenu()
 {
  phase=1;ClearActions();for(int i=0;i<5;i++){int n=i;Button(bank.postes[i].text+" · "+Mathf.RoundToInt(Risk(i)*100)+" %",i,()=>PostMenu(n));}
  Button("Lancer le trimestre "+Quarter,5,LaunchQuarter);feedback.text="Budget : "+Budget+" points. Équipe : "+Health+" / 20. Les mesures se cumulent et restent acquises. Objectif final : au moins 10 / 20.";
 }
 void PostMenu(int p){selectedPost=p;ClearActions();for(int i=0;i<5;i++){int l=i;string s=bank.postes[p].options[i];var b=TalasUI.Button(actions.transform,(5-i)+" pts · "+(s==""?"Indisponible":s),0,i*56,430,50,()=>Buy(p,l));b.interactable=s!=""&&(Bought[p]&(1<<i))==0&&Budget>=5-i;}Button("Retour aux postes",5,BudgetMenu);}
 public bool Buy(int post,int level){if(ActiveId!="budget"||phase!=1||post<0||post>=5||level<0||level>=5||bank.postes[post].options[level]==""||(Bought[post]&(1<<level))!=0||Budget<5-level)return false;Bought[post]|=1<<level;Budget-=5-level;Score++;Box("Mesure "+level,new Vector3(-8+post*4,2.2f+level*.12f,6),new Vector3(2.2f,.1f,.8f),level==0?Color.green:Color.cyan);BudgetMenu();return true;}
 public void LaunchQuarter(){if(ActiveId!="budget"||phase!=1)return;phase=4;ClearActions();timer=0;for(int p=0;p<5;p++)for(int n=0;n<(Quarter<=2?1:2);n++)if(Risk(p)>0){Spawn(1,p,0,.5f,6+n*1.2f,1.9f);objects[objects.Count-1].go.transform.localPosition=new Vector3(-8+p*4,.5f,6+n*1.2f);}feedback.text="Les dangers sortent des postes. Les mesures arrêtent les risques avant qu’ils atteignent l’équipe.";}
 void TickBudget(float dt){if(phase!=4)return;for(int i=objects.Count-1;i>=0;i--){var p=objects[i];p.go.transform.localPosition=Vector3.MoveTowards(p.go.transform.localPosition,new Vector3(0,.5f,0),dt*p.speed);if(p.go.transform.localPosition.z<.3f){if(random.NextDouble()<Risk(p.index))Health--;Destroy(p.go);objects.RemoveAt(i);}}
  if(objects.Count==0){if(Quarter==4){total=15;Finish(Health>=10);return;}Quarter++;Budget+=5;BudgetMenu();}}
 void NewPlate(){feastItem=random.Next(bank.feast.Length);stamp=0;timer=0;feedback.text=bank.feast[feastItem].text+" — Tamponner, refiler, ou repousser une main ?";if(objects.Count>0){foreach(var o in objects)Destroy(o.go);objects.Clear();}Spawn(0,feastItem,0,1.2f,1,0);}
 void TickFeast(float dt){if(stamp>0){stamp-=dt;if(stamp<=0){int level=bank.feast[feastItem].level;Score+=level==5?-2:5-level;success++;NewPlate();}}else if(timer>2.8f)NewPlate();if(Elapsed>nextSpawn){for(int i=0;i<3;i++)rivals[i]+=random.Next(0,4);steal=1;nextSpawn=Elapsed+3.5f;}if(steal>0){steal-=dt;if(steal<=0){Score=Mathf.Max(0,Score-1);feedback.text="Un voisin vole une mesure : S repousse ses mains.";}}status.text="Festin · "+Mathf.CeilToInt(60-Elapsed)+" s · Dylan "+Score+" · Voisins "+string.Join(" / ",rivals);if(Elapsed>=60){int rank=1;foreach(int s in rivals)if(s>Score)rank++;total=30;Finish(rank<=2);}}
 void TickSong(float dt){if(timer>=nextSpawn&&spawnIndex<30){Spawn(0,spawnIndex++,random.Next(-1,2),.5f,15,5);nextSpawn=timer+1.1f;var song=ActiveId=="karaoke1"?bank.song1:bank.song2;feedback.text=song[(spawnIndex/6)%song.Length];}
  for(int i=objects.Count-1;i>=0;i--){var p=objects[i];var v=p.go.transform.localPosition;v.z-=5*dt;p.go.transform.localPosition=v;if(v.z<-1.3f){songHit=0;awakened=Mathf.Max(0,awakened-1);Destroy(p.go);objects.RemoveAt(i);}}
  total=30;status.text="Karaoké · "+Score+" / 30 notes · Opérateurs réveillés "+awakened+" / 3";if(spawnIndex>=30&&objects.Count==0)Finish(Score>=15&&awakened>=2);}
 public bool Sing(int target){if(!ActiveId.StartsWith("karaoke")||phase!=1)return false;for(int i=0;i<objects.Count;i++){var p=objects[i];if(p.lane==target-1&&Mathf.Abs(p.go.transform.localPosition.z)<1.1f){Score++;songHit++;audio.Note(target);if(songHit>=3){awakened=Mathf.Min(3,awakened+1);songHit=0;}Destroy(p.go);objects.RemoveAt(i);return true;}}songHit=0;return false;}
 void SetupPlatforms(){cam.orthographic=true;cam.orthographicSize=7.5f;cam.transform.position=stage.transform.position+new Vector3(2,5,-25);cam.transform.rotation=Quaternion.identity;avatar.transform.localPosition=new Vector3(-8,0,0);
  for(int i=0;i<7;i++){float x=i%2==0?-3:8;var go=Box("Étage "+i,new Vector3(x,i*2.3f-.15f,0),new Vector3(14,.3f,2),new Color(.26f,.31f,.3f));platforms.Add(go);if(i>0){var ladder=Box("Échelle",new Vector3(i%2==0?2:3,i*2.3f-1.1f,.7f),new Vector3(.3f,2.3f,.2f),TalasUI.Amber);platforms.Add(ladder);}}
  string[] names={"badge","air","burger","café","clé","rapport","drapeau"};for(int i=0;i<7;i++){var o=Box(names[i],new Vector3(i%2==0?-6:10,i*2.3f+.6f,0),new Vector3(.5f,.5f,.5f),i==6?Color.green:TalasUI.Amber);objects.Add(new Piece{go=o,index=i,type=0});}feedback.text="Badge → portique ; air → gabarit ; burger → chien ; café → WC → clé. Ramasse le rapport et livre-le tout en haut. 5 cœurs, double saut, échelles et drapeau.";}
 void TickPlatforms(float dt){slide=Mathf.Max(0,slide-dt);var p=avatar.transform.localPosition;float previous=p.y;vy-=18*dt;p.y+=vy*dt;
  foreach(var floor in platforms)if(floor.name.StartsWith("Étage")){float top=floor.transform.localPosition.y+.15f;float x=floor.transform.localPosition.x;if(vy<=0&&previous>=top-.02f&&p.y<=top&&Mathf.Abs(p.x-x)<7){p.y=top;vy=0;jump=0;}}
  if(p.y< -2){Health--;p=new Vector3(pickups.Contains("drapeau")?8:-8,pickups.Contains("drapeau")?6.9f:0,0);vy=jump=0;}avatar.transform.localPosition=p;
  for(int i=objects.Count-1;i>=0;i--){var o=objects[i];if(Vector3.Distance(p+Vector3.up*.6f,o.go.transform.localPosition)<1){pickups.Add(o.go.name);Score++;feedback.text="Carnet : "+o.go.name+" acquis.";Destroy(o.go);objects.RemoveAt(i);}}
  float aimY=Mathf.Max(5,p.y+2);cam.transform.position=Vector3.Lerp(cam.transform.position,stage.transform.position+new Vector3(2,aimY,-25),dt*3);
  if(p.x>2&&p.y>13.5f&&pickups.Contains("rapport")&&pickups.Contains("clé")){total=7;Finish(true);}if(Elapsed>180)Finish(false);}
 void NewCause(){ClearActions();if(Index>=bank.causes.Length){total=6;Finish(Score>=3);return;}foreach(var o in objects)Destroy(o.go);objects.Clear();cam.orthographic=true;cam.orthographicSize=8;cam.transform.position=stage.transform.position+new Vector3(0,4,-25);cam.transform.rotation=Quaternion.identity;
  path=new[]{new Vector3(-5,3,0),new Vector3(-3,5,0),new Vector3(0,5,0),new Vector3(2,2.5f,0),new Vector3(5,3,0)};pathIndex=0;dragPoint=path[0];pinching=false;dragPenalty=0;
  for(int i=0;i<path.Length-1;i++){var a=path[i];var b=path[i+1];var line=Box("Couloir de cause",(a+b)*.5f,new Vector3(Vector3.Distance(a,b),.75f,.1f),new Color(.85f,.42f,.11f));line.transform.localRotation=Quaternion.Euler(0,0,Mathf.Atan2(b.y-a.y,b.x-a.x)*Mathf.Rad2Deg);}
  Spawn(0,Index,0,3,0,0);objects[0].go.transform.localPosition=dragPoint;Box("Zone de dépôt",path[path.Length-1],new Vector3(.8f,.8f,.2f),Color.green);feedback.text=bank.causes[Index].text+" — Maintiens le clic sur la cause et suis le couloir orange jusqu’au cercle vert.";}
 void TickOperation(float dt){var mouse=Mouse.current;if(mouse!=null){if(mouse.leftButton.wasPressedThisFrame){var v=PointerWorld(mouse.position.ReadValue());if(Vector3.Distance(v,dragPoint)<1)pinching=true;}if(mouse.leftButton.wasReleasedThisFrame)pinching=false;if(pinching&&mouse.leftButton.isPressed)Drag(PointerWorld(mouse.position.ReadValue()),dt);}
  if(pinching&&Keyboard.current!=null){var k=Keyboard.current;var delta=new Vector3((k.rightArrowKey.isPressed?1:0)-(k.leftArrowKey.isPressed?1:0),(k.upArrowKey.isPressed?1:0)-(k.downArrowKey.isPressed?1:0),0);Drag(dragPoint+delta*dt*4,dt);}status.text="Extraction "+(Index+1)+" / 6 · "+Mathf.CeilToInt(90-Elapsed-dragPenalty)+" s";if(Elapsed+dragPenalty>90)Finish(false);}
 Vector3 PointerWorld(Vector2 pointer){var ray=cam.ScreenPointToRay(pointer);float t=(stage.transform.position.z-ray.origin.z)/ray.direction.z;return ray.GetPoint(t)-stage.transform.position;}
 public bool Drag(Vector3 p,float dt=.02f){if(ActiveId!="operation"||phase!=1||!pinching)return false;var candidate=Vector3.MoveTowards(dragPoint,p,dt*12);float distance=10;for(int i=0;i<path.Length-1;i++){var a=path[i];var b=path[i+1];var d=b-a;var nearest=a+d*Mathf.Clamp01(Vector3.Dot(candidate-a,d)/d.sqrMagnitude);distance=Mathf.Min(distance,Vector3.Distance(nearest,candidate));}if(distance>.32f){dragPenalty+=dt*5;return false;}dragPoint=candidate;objects[0].go.transform.localPosition=dragPoint;if(pathIndex<path.Length&&Vector3.Distance(dragPoint,path[pathIndex])<.3f)pathIndex++;if(pathIndex==path.Length&&Vector3.Distance(dragPoint,path[path.Length-1])<.3f){Score++;feedback.text=bank.causes[Index].info;Notes.Add(feedback.text);Index++;phase=2;pinching=false;ClearActions();Button("Cause traitée : continuer",0,()=>{phase=1;NewCause();ActionButtons();});}return true;}
 public void SetPinching(bool value){pinching=value;}
 void SetupBonus(){Box("Cible",new Vector3(5,.2f,0),new Vector3(1,.2f,1),TalasUI.Amber);feedback.text=ActiveId=="lanternes"?"Clique pour régler la flamme. Lance trois lanternes dans la zone verte.":"Choisis l’angle et la force, puis lance. Trois essais pour atteindre la cible.";Button("Angle −",0,()=>jump=Mathf.Max(10,jump-5));Button("Angle +",1,()=>jump=Mathf.Min(80,jump+5));Button("Force −",2,()=>vy=Mathf.Max(2,vy-1));Button("Force +",3,()=>vy=Mathf.Min(15,vy+1));Button("Lancer",4,LaunchBonus);jump=45;vy=10;}
 public void LaunchBonus(){if(phase!=1||objects.Count>0)return;bonusAttempts++;Spawn(0,0,0,1,0,0);objects[0].go.transform.localPosition=new Vector3(-5,1,0);actionTime=0;}
 void TickBonus(float dt){status.text=Title(ActiveId)+" · Essai "+bonusAttempts+" / 3 · Angle "+jump+"° · Force "+vy;foreach(var o in objects){actionTime+=dt;float angle=jump*Mathf.Deg2Rad;var p=new Vector3(-5+vy*Mathf.Cos(angle)*actionTime,1+vy*Mathf.Sin(angle)*actionTime-4.9f*actionTime*actionTime,0);if(ActiveId=="lanternes")p.y=1+actionTime*2;o.go.transform.localPosition=p;if(p.y<=.2f||p.y>=8){if(Mathf.Abs(p.x-5)<1.5f){Score++;feedback.text="Cible atteinte.";}else feedback.text="Ajuste l’angle et la force.";Destroy(o.go);objects.Clear();if(bonusAttempts>=3){total=3;Finish(Score>0);}break;}}}
 static string Title(string id){switch(id){case "attrape":return "§4 · Le fantôme en pantoufles";case "combat":return "§5 · Combat contre le PDG";case "fuite":return "§5 / §8.2 · Évacuation du géant";case "budget":return "§6 · Budget de prévention";case "festin":return "§6 · Festin des mesures";case "karaoke1":return "§7 · Karaoké : sensibilisation";case "karaoke2":return "§7 · Karaoké : compétences";case "doc":return "§7 · Centre de documentation";case "parcours":return "§8 · L’échafaudage";case "revue":return "§9 · Revue de direction";case "operation":return "§10 · Opération des causes";case "jetski":return "§10 · Régate d’amélioration";case "avions":return "Bonus · Avions de papier";case "petanque":return "Bonus · Pétanque";default:return "Bonus · Lanternes";}}
 static string Instructions(string id){switch(id){case "attrape":return "Q / D ou flèches : déplacer Dylan. Attrape les dix documents bleus, évite les déchets rouges. Au moins cinq preuves, cinq cœurs.";case "combat":return "1 à 4 ou clic : répondre à l’excuse du PDG avant dix secondes. Une erreur laisse passer son attaque. Lis chaque correction.";case "fuite":return "Q / D : voie · Espace : saut · S : glissade · E : guider. Rejoins le rassemblement à 560 mètres sans perdre tes cinq cœurs.";case "budget":return "Finance les cinq postes, puis lance chaque trimestre. Budget 8, puis +5. Élimination 5, substitution 4, collectif 3, organisation 2, EPI 1. Santé finale ≥10 / 20.";case "festin":return "Espace : tamponner · Q / D : refiler · S : repousser. Élimination +5, substitution +4, collectif +3, organisation +2, EPI +1 ; mauvaise mesure −2. Termine dans les deux premiers.";case "karaoke1":case "karaoke2":return "Q / S / D : trois pistes. Appuie quand la note arrive sur Dylan. Trois notes justes réveillent un opérateur. Un raté l’endort.";case "doc":return "Lis le besoin puis oriente le visiteur : Légifrance, INRS, FDS, ISO 45001 ou Archives. Aucun chrono. Lis la correction avant le visiteur suivant.";case "parcours":return "Q / D : déplacement · Espace : double saut · Z : échelle · E : tornade · R : drapeau. Récupère les objets et livre le rapport sur le toit.";case "revue":return "Trois manches : entrées obligatoires, constats d’audit, décisions de la revue. Clic ou touches 1 à 3. Les corrections restent affichées.";case "operation":return "Clic maintenu : extraire la cause. Suis le couloir orange jusqu’au dépôt vert. Les bords coûtent du temps. Six causes organisationnelles à traiter.";case "jetski":return "Q / D : trois voies. Évite les bouées rouges, récolte les signaux bleus. Analyse tes écarts et choisis les actions correctives aux étapes du circuit.";default:return "Trois essais. Ajuste l’angle et la force, puis lance. Échap : pause.";}}
}
public class TalasOwnedMaterial:MonoBehaviour{public Material material;void OnDestroy(){if(material!=null)Destroy(material);}}
