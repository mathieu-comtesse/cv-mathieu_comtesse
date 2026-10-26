using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
 // Owns the arcade interlude. Quest outcomes remain in CampaignRuntime, never in UI callbacks.
 public sealed class MenhirDuel:MonoBehaviour
 {
  public MenhirPhase Phase{get;private set;}=MenhirPhase.Inactive;
  public bool Active=>Phase!=MenhirPhase.Inactive;
  public MenhirProgress Progress=>c?.State?.menhir;
  public MenhirCatalog Catalog{get;private set;}
  public MenhirQuestion Question=>Catalog.questions[Mathf.Clamp(Progress.question,0,4)];
  public string Caption{get;private set;}="";public string Banner{get;private set;}="";
  public DuelFighterState DylanState{get;private set;}public DuelFighterState ChiefState{get;private set;}
  public bool CanQuestion=>Phase==MenhirPhase.Combat&&combatTime>=4;
  public float TouchMove;public bool TouchGuard;
  public int Selection;public bool HintShown;public event Action Changed;
  CampaignRuntime c;MenhirDuelView view;Camera camera;bool originalCamera,lifeWas;
  readonly Dictionary<Behaviour,bool> suspended=new Dictionary<Behaviour,bool>();
  readonly Dictionary<Animator,float> animatorSpeeds=new Dictionary<Animator,float>();
  readonly Dictionary<Animator,AnimatorCullingMode> culling=new Dictionary<Animator,AnimatorCullingMode>();
  readonly List<GameObject> props=new List<GameObject>();
  float x=-2,bx=2,vertical,height,combatTime,cooldown,bossAt,attackUntil,guardUntil,shakeUntil;
  float impact;int combo;string comboKeys="";float comboAt;bool completing,observedPause;
  Vector3 axis=>Progress.arenaAxis;Vector3 center=>Progress.arena;Vector3 side=>Vector3.Cross(Vector3.up,axis).normalized;
  bool Reduced=>GetComponent<UISettingsController>()?.preferences.reducedMotion??false;
  float Dt=>c.UserPaused?0:Time.deltaTime;
  void Start(){c=GetComponent<CampaignRuntime>();Catalog=JsonUtility.FromJson<MenhirCatalog>(Resources.Load<TextAsset>("MenhirDuel").text);view=gameObject.AddComponent<MenhirDuelView>();view.Bind(this,c);}
  void Update()
  {
   if(c?.State==null||!Active)return;
   if(observedPause!=c.UserPaused){observedPause=c.UserPaused;foreach(var actor in c.bindings.characters)if(actor.animator!=null)actor.animator.speed=observedPause?0:1;}
   if(Keyboard.current?.escapeKey.wasPressedThisFrame==true)Pause();
   if(c.UserPaused)return;
   Progress.elapsedSeconds+=Time.deltaTime;
   if(Phase==MenhirPhase.Combat)
   {
    combatTime+=Dt;cooldown-=Dt;var k=Keyboard.current;float direction=TouchMove;
    if(k!=null)direction+=((k.dKey.isPressed||k.rightArrowKey.isPressed)?1:0)-((k.aKey.isPressed||k.qKey.isPressed||k.leftArrowKey.isPressed)?1:0);
    direction=Mathf.Clamp(direction,-1,1);bool guard=TouchGuard||k?.lKey.isPressed==true;
    if(k?.spaceKey.wasPressedThisFrame==true)Jump();if(k?.jKey.wasPressedThisFrame==true)Attack(false);if(k?.kKey.wasPressedThisFrame==true)Attack(true);
    if(k?.eKey.wasPressedThisFrame==true)Ask();
    if(height>0||vertical>0){vertical-=22*Dt;height=Mathf.Max(0,height+vertical*Dt);if(height==0){vertical=0;Pose("dylan","JumpLand");attackUntil=Time.time+.22f;}}
    if(Time.time>attackUntil)
    {Move(ref x,direction*Dt*(guard?1.1f:2.5f),true);DylanState=guard?DuelFighterState.Defend:Mathf.Abs(direction)>.05f?DuelFighterState.Move:DuelFighterState.Idle;Pose("dylan",height>.01f?"JumpFall":guard?"Crouch":"Locomotion",Mathf.Abs(direction)>.05f?.5f:0);}
    guardUntil=guard?Time.time+.15f:guardUntil;
    if(Time.time>bossAt){bossAt=Time.time+5.5f-Stage*.65f;StartCoroutine(BossStrike());}
    if(combatTime>=18)Ask();PlaceFighters();
   }
   if(Phase==MenhirPhase.Question)
   {var k=Keyboard.current;if(k?.downArrowKey.wasPressedThisFrame==true){Selection=(Selection+1)%3;Signal();}if(k?.upArrowKey.wasPressedThisFrame==true){Selection=(Selection+2)%3;Signal();}if(k?.digit1Key.wasPressedThisFrame==true)Submit(0,Progress.epoch);else if(k?.digit2Key.wasPressedThisFrame==true)Submit(1,Progress.epoch);else if(k?.digit3Key.wasPressedThisFrame==true)Submit(2,Progress.epoch);else if(k?.enterKey.wasPressedThisFrame==true)Submit(Selection,Progress.epoch);}
   UpdateCamera();
  }
  public int Stage=>Progress.aurelienLife<30?3:Progress.aurelienLife<65?2:1;
  public void Begin(bool replay=false)
  {
   if(Active||c==null)return;bool resume=Progress.inProgress;
   if(!resume){Progress.replay=replay;Progress.question=0;Progress.cleared=new bool[5];Progress.dylanLife=Progress.aurelienLife=Progress.energy=100;Progress.streak=0;Progress.elapsedSeconds=0;Progress.arenaSet=false;Progress.returnActors.Clear();}
   if(!Progress.arenaSet&&!FindArena()){c.Inform("Aucune aire de duel dégagée près du menhir. Le combat n’a pas commencé.");return;}
   if(!resume)foreach(var actor in c.bindings.characters){var root=c.bindings.Find(actor.id);if(root==null)continue;var agent=root.GetComponent<NavMeshAgent>();Progress.returnActors.Add(new DuelReturnActor{id=actor.id,position=root.position,rotation=root.rotation,visualRotation=actor.meshyActor.transform.localRotation,agentEnabled=agent!=null&&agent.enabled});}
   Progress.started=Progress.inProgress=true;Progress.epoch++;c.CloseQuest();c.SetPause(false);
   Phase=MenhirPhase.ChooseMode;originalCamera=c.bindings.gameplayCamera.enabled;camera=c.cinematicDirector.cinematicCamera;camera.enabled=true;c.bindings.gameplayCamera.enabled=false;
   c.bindings.SetGameplayBlocked(true);var life=GetComponent<VillageLife>();lifeWas=life.enabled;life.enabled=false;suspended.Clear();animatorSpeeds.Clear();culling.Clear();
   foreach(var actor in c.bindings.characters)
   {var root=c.bindings.Find(actor.id);if(root==null)continue;actor.meshyActor.transform.localRotation=Quaternion.identity;foreach(var b in root.GetComponentsInChildren<Behaviour>().Where(b=>b is NavMeshAgent||b is NativeLocomotionAgent||b is FootGrounding||b is VillagerCollisionMotor||b is VillagerBrain||b is ThirdPersonMotor)){suspended[b]=b.enabled;b.enabled=false;}foreach(var cc in root.GetComponents<CharacterController>())cc.enabled=false;animatorSpeeds[actor.animator]=actor.animator.speed;actor.animator.speed=1;culling[actor.animator]=actor.animator.cullingMode;actor.animator.cullingMode=AnimatorCullingMode.AlwaysAnimate;}
   x=-2;bx=2;height=vertical=0;PlaceFighters();PlaceAudience();CreateArenaMarks();Caption=resume?"Les acquis sont conservés. Reprends l’épreuve en cours.":"LA POLITIQUE DU MENHIR · Dylan contre Aurélien";Banner="CHOISIS TON MODE";Signal();c.Save();
  }
  public void ChooseMode(int mode){if(Phase!=MenhirPhase.ChooseMode)return;Progress.mode=Mathf.Clamp(mode,0,2);HintShown=mode==2;Phase=MenhirPhase.Intro;Signal();StartCoroutine(Introduction(Progress.question>0));}
  bool FindArena()
  {
   var menhir=c.bindings.Find("grand_menhir").position;
   for(float r=6;r<=26;r+=2)for(int a=0;a<24;a++)for(int orientation=0;orientation<8;orientation++)
   {var middle=menhir+Quaternion.Euler(0,a*15,0)*Vector3.forward*r;middle.y=VillageLife.Ground(middle);var line=Quaternion.Euler(0,orientation*45,0)*Vector3.right;var depth=Vector3.Cross(Vector3.up,line);bool clear=true;
    for(int i=-4;i<=4&&clear;i++)for(int j=-1;j<=1;j++){var p=middle+line*i+depth*j*.85f;if(!Clear(p)||Mathf.Abs(VillageLife.Ground(p)-middle.y)>.6f){clear=false;break;}}
    if(!clear||!CameraClear(middle,line,depth,false)||!CameraClear(middle,line,depth,true))continue;Progress.arena=middle;Progress.arenaAxis=line;Progress.arenaSet=true;return true;
   }return false;
  }
  bool Clear(Vector3 p)
  {p.y=VillageLife.Ground(p);return VillageNavigation.HearthSafe(p)&&!Physics.OverlapCapsule(p+Vector3.up*.35f,p+Vector3.up*1.35f,.34f,~0,QueryTriggerInteraction.Ignore).Any(col=>!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&col.GetComponentInParent<MenhirProp>()==null);}
  bool CameraClear(Vector3 middle,Vector3 line,Vector3 depth,bool question)
  {
   var focus=middle+Vector3.up*1.1f+(question?line*2.5f:Vector3.zero);var origin=focus+depth*(question?11.8f:10.5f)+Vector3.up*3.4f;
   bool Solid(Collider col)=>!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&col.GetComponentInParent<MenhirProp>()==null;
   if(Physics.OverlapSphere(origin,.4f,~0,QueryTriggerInteraction.Ignore).Any(Solid))return false;
   foreach(float at in new[]{-2f,0,2f}){var target=middle+line*at+Vector3.up*1.1f;var delta=target-origin;if(Physics.SphereCastAll(origin,.18f,delta.normalized,delta.magnitude-.5f,~0,QueryTriggerInteraction.Ignore).Any(hit=>Solid(hit.collider)))return false;}return true;
  }
  void Move(ref float at,float amount,bool player)
  {float next=Mathf.Clamp(at+amount,-3.8f,3.8f);if(player)next=Mathf.Min(next,bx-.85f);else next=Mathf.Max(next,x+.85f);if(Clear(center+axis*next))at=next;}
  void Place(string id,Vector3 position,Vector3 facing)
  {var root=c.bindings.Find(id);if(root==null)return;position.y=VillageLife.Ground(position)+(id=="dylan"?height:0);root.position=position;facing.y=0;if(facing.sqrMagnitude>.01f)root.rotation=Quaternion.LookRotation(facing);}
  void PlaceFighters(){Place("dylan",center+axis*x,axis);Place("aurelien",center+axis*bx,-axis);}
  void PlaceAudience()
  {int n=0;foreach(var actor in c.bindings.characters.Where(a=>a.id!="dylan"&&a.id!="aurelien"&&c.State.characters.First(s=>s.id==a.id).alive)){bool placed=false;for(int i=0;i<16;i++){float along=(n%7-3)*1.2f,back=3.2f+n/7*1.1f+i*.4f;var p=center+axis*along-side*back;if(!Clear(p))continue;Place(actor.id,p,center-p);Pose(actor.id,actor.id=="mathieu"?"Inspect":"Clap");placed=true;break;}if(placed)n++;}}
  void Pose(string id,string state,float speed=0){var animator=c.bindings.AnimatorFor(id);if(animator==null)return;animator.speed=1;VillageLife.Play(animator,state);animator.SetFloat("Speed",speed);}
  void ReactAudience(bool success){foreach(var actor in c.bindings.characters.Where(a=>a.id!="dylan"&&a.id!="aurelien"))Pose(actor.id,success?"Clap":"React");}
  void CreateArenaMarks(){for(int i=0;i<2;i++)Prop("Limite de l’arène",center+axis*(i==0?-4.3f:4.3f),new Vector3(.18f,.18f,.18f),false);}
  GameObject Prop(string name,Vector3 p,Vector3 scale,bool wood=true)
  {var go=GameObject.CreatePrimitive(wood?PrimitiveType.Cube:PrimitiveType.Sphere);go.name=name;go.AddComponent<MenhirProp>();Destroy(go.GetComponent<Collider>());go.transform.position=p;go.transform.localScale=scale;var mats=GetComponent<VillageLife>();if(mats.carriedMaterial!=null)go.GetComponent<Renderer>().sharedMaterial=mats.carriedMaterial;props.Add(go);return go;}
  IEnumerator Wait(float seconds){float t=0;while(t<seconds&&Active){if(!c.UserPaused)t+=Time.deltaTime;yield return null;}}
  IEnumerator Introduction(bool resume)
  {
   if(resume){Caption="Mathieu : « Reprenons la décision qui reste à comprendre. »";Pose("mathieu","Talk");yield return Wait(4);BeginRound();yield break;}
   Banner="LE CHEF A UN PLAN. SURTOUT POUR SA STATUE.";Caption="Aurélien : « Avec un chef aussi solide que ce menhir, rien ne peut tomber ! »";Pose("aurelien","Talk");Pose("dylan","Listen");yield return Wait(10);
   var beam=Prop("Support mal attaché de la pancarte",center+axis*3+Vector3.up*1.5f,new Vector3(.12f,2,.12f));Pose("uma","Work");Caption="Un support de pancarte se déboîte. Les artisans reculent ; le grand discours continue.";
   float t=0;while(t<4){t+=Dt;beam.transform.rotation=Quaternion.AngleAxis(Mathf.SmoothStep(0,75,t/4),side);beam.transform.position=center+axis*3+Vector3.up*Mathf.Lerp(1.5f,.5f,t/4);yield return null;}Pose("aurelien","React");ReactAudience(false);yield return Wait(5);beam.SetActive(false);
   Caption="Dylan : « Le menhir ne vérifie pas les assemblages. Qui décide, avec quels moyens et avec les travailleurs ? »";Pose("dylan","Talk");Pose("aurelien","Listen");yield return Wait(9);
   Caption="Alban : « Il avait pourtant signé avec un très gros caillou. »\nMilena : « Ça explique le poids de ses engagements. »";Pose("alban","Talk");Pose("milena","Laugh");yield return Wait(7);
   Caption="Mathieu : « Cinq décisions. Tu frappes avec ce que tu comprends. Un slogan ne protège personne. »";Pose("mathieu","Talk");yield return Wait(5);BeginRound();
  }
  public void SkipFilm(){if(Phase!=MenhirPhase.Intro&&Phase!=MenhirPhase.Finale)return;StopAllCoroutines();if(Phase==MenhirPhase.Finale)FinishVictory();else BeginRound();}
  void BeginRound(){Phase=MenhirPhase.Combat;combatTime=0;cooldown=0;bossAt=Time.time+5;Progress.epoch++;height=vertical=0;Banner="ÉPREUVE "+(Progress.question+1)+" / 5 · "+Question.title;Caption="A/D ou flèches : bouger · Espace : sauter · J/K : coups · L : garde · E : décision";PlaceFighters();Pose("dylan","Locomotion");Pose("aurelien","Locomotion");Signal();c.Save();}
  public void Jump(){if(Phase!=MenhirPhase.Combat||height>.01f)return;vertical=6.8f;height=.01f;Pose("dylan","JumpStart");attackUntil=Time.time+.22f;}
  public void Attack(bool heavy)
  {
   if(Phase!=MenhirPhase.Combat||c.UserPaused||cooldown>0||Progress.energy<(heavy?12:5))return;
   Progress.energy-=heavy?12:5;cooldown=heavy?.65f:.32f;attackUntil=Time.time+cooldown;DylanState=DuelFighterState.Attack;Pose("dylan",heavy?"DuelKick":"DuelPunch");
   comboKeys=Time.time-comboAt<1.4f?comboKeys+(heavy?"K":"J"):(heavy?"K":"J");comboAt=Time.time;if(comboKeys.Length>3)comboKeys=comboKeys.Substring(comboKeys.Length-3);
   if(Mathf.Abs(bx-x)<2.2f){float damage=comboKeys=="JJK"?5:heavy?2:1;float floor=100-Progress.cleared.Count(b=>b)*20-7;Progress.aurelienLife=Mathf.Max(Mathf.Max(5,floor),Progress.aurelienLife-damage);Pose("aurelien","React");ChiefState=DuelFighterState.Impact;Impact();Caption=comboKeys=="JJK"?"COMBO J · J · K ! Les coups seuls ne valident aucune épreuve.":"Impact ! La décision reste à comprendre.";}
   else Caption="Trop loin. Rapproche-toi sans sortir de l’arène.";Signal();
  }
  IEnumerator BossStrike()
  {
   if(Phase!=MenhirPhase.Combat||Progress.mode!=0)yield break;ChiefState=DuelFighterState.Attack;Caption=Stage==1?"Aurélien prépare un slogan massue !":Stage==2?"Aurélien délègue le problème... avec une tablette !":"Aurélien prépare son mini-menhir d’autorité !";Pose("aurelien","Throw");Signal();yield return Wait(.8f);if(Phase!=MenhirPhase.Combat)yield break;
   var projectile=Prop(Stage==3?"Mini-menhir":"Tablette du chef",center+axis*bx+Vector3.up*1.1f,Stage==3?new Vector3(.3f,.65f,.25f):new Vector3(.45f,.12f,.28f),Stage!=3);var from=projectile.transform.position;var target=center+axis*x+Vector3.up*.9f;float t=0;while(t<.6f){t+=Dt;projectile.transform.position=Vector3.Lerp(from,target,t/.6f);projectile.transform.Rotate(0,Dt*300,0);yield return null;}projectile.SetActive(false);
   if(Phase!=MenhirPhase.Combat)yield break;bool avoided=height>.45f||Mathf.Abs(Vector3.Dot(c.bindings.player.position-target,axis))>.8f;bool guarded=Time.time<guardUntil;float damage=avoided?0:guarded?2:8;Progress.dylanLife=Mathf.Max(0,Progress.dylanLife-damage);if(damage>0){Pose("dylan",guarded?"Crouch":"React");Impact();}Caption=avoided?"ESQUIVE !":guarded?"GARDE · impact amorti":"Le slogan fait mal. La question reste accessible.";if(Progress.dylanLife<=0)Defeat();Signal();
  }
  void Impact(){shakeUntil=Reduced?0:Time.time+.18f;impact=1;var audio=GetComponent<AccidentDirector>();var source=GetComponent<AudioSource>();if(source!=null&&audio!=null&&audio.impact!=null)source.PlayOneShot(audio.impact,.55f);}
  public void Ask(){if(!CanQuestion)return;StopAllCoroutines();foreach(var prop in props)if(prop!=null&&!prop.name.StartsWith("Limite"))prop.SetActive(false);height=vertical=0;PlaceFighters();Phase=MenhirPhase.Question;Selection=0;Progress.epoch++;Caption="Une seule décision. Ses conséquences seront visibles dans l’arène.";Pose("dylan","Listen");Pose("aurelien","Talk");Signal();c.Save();}
  public bool Submit(int answer,int expectedEpoch)
  {
   if(Phase!=MenhirPhase.Question||c.UserPaused||expectedEpoch!=Progress.epoch||answer<0||answer>=Question.answers.Length)return false;
   string receipt=Progress.question+":"+Progress.epoch;if(Progress.answerReceipts.Contains(receipt))return false;Progress.answerReceipts.Add(receipt);Phase=MenhirPhase.Resolving;Progress.epoch++;var chosen=Question.answers[answer];Progress.lastFeedback=chosen.reply+"\n\n"+Question.correction;if(chosen.quality==2){Progress.mastered[Progress.question]=true;Progress.cleared[Progress.question]=true;Progress.streak++;}else{Progress.mistakes[Progress.question]++;Progress.streak=0;}Signal();c.Save();StartCoroutine(Resolve(chosen));return true;
  }
  IEnumerator Resolve(MenhirAnswer answer)
  {
   int oldStage=Stage;Banner=answer.quality==2?"DÉCISION VÉRIFIÉE":answer.quality==1?"PARTIEL · LA PRÉVENTION RESTE À ORGANISER":"CONTRE DU CHEF · CORRIGE TA DÉCISION";Caption=answer.reply;
   x=-1.15f;bx=1.15f;PlaceFighters();Pose(answer.quality==0?"aurelien":"dylan",answer.attack=="chain"?"DuelKick":answer.attack=="plan"?"Throw":"DuelPunch");
   var start=center+axis*(answer.quality==0?bx:x)+Vector3.up*1.1f;var end=center+axis*(answer.quality==0?x:bx)+Vector3.up*1.1f;
   var prop=Prop(answer.attack,start,answer.attack=="plan"?new Vector3(.9f,.08f,.65f):answer.attack=="micro"?new Vector3(.15f,.7f,.15f):new Vector3(.5f,.35f,.4f),answer.attack!="authority");float t=0;while(t<1.2f){t+=Dt;prop.transform.position=Vector3.Lerp(start,end,t/1.2f)+Vector3.up*Mathf.Sin(Mathf.PI*t/1.2f)*.65f;prop.transform.Rotate(side,Dt*160);yield return null;}prop.SetActive(false);Impact();
   if(answer.quality==2){Progress.aurelienLife=Mathf.Min(Progress.aurelienLife,100-Progress.cleared.Count(v=>v)*20);Progress.dylanLife=Mathf.Min(100,Progress.dylanLife+12);Progress.energy=Mathf.Min(100,Progress.energy+30);Pose("aurelien",Progress.question==4?"DuelFall":"React");ChiefState=DuelFighterState.Impact;ReactAudience(true);Caption=answer.reply+(Progress.streak>=3?"\nCOMBO PÉDAGOGIQUE x"+Progress.streak:"");}
   else{Progress.dylanLife=Mathf.Max(0,Progress.dylanLife-(answer.quality==1?5:14));if(answer.quality==1)Progress.aurelienLife=Mathf.Max(5,Progress.aurelienLife-3);Pose("dylan","React");Pose("aurelien","Talk");ReactAudience(false);}
   Signal();yield return Wait(3);Caption=Progress.lastFeedback;Signal();yield return Wait(6);
   if(Progress.dylanLife<=0){Defeat();yield break;}
   if(answer.quality!=2){Phase=MenhirPhase.Question;Progress.epoch++;Signal();c.Save();yield break;}
   if(Progress.question==4){Phase=MenhirPhase.Finale;Signal();yield return Finale();yield break;}
   Progress.question++;if(Stage!=oldStage){Phase=MenhirPhase.Transition;Banner="PHASE "+Stage;Caption=Stage==2?"Aurélien : « Très bien. Je vais déléguer ma responsabilité à cette tablette ! »":"Aurélien : « Puisque personne ne respecte mon autorité, j’en prends une plus lourde. »";Pose("aurelien","Talk");Pose("mathieu","React");Signal();yield return Wait(7);}x=-2;bx=2;BeginRound();
  }
  void Defeat(){Phase=MenhirPhase.Defeat;Banner="DYLAN À TERRE · LES ACQUIS RESTENT";Caption="Reprends l’épreuve en cours avec ta vie et ton énergie restaurées. Les réponses déjà comprises sont conservées.";Pose("dylan","DuelFall");Pose("aurelien","Clap");Signal();c.Save();}
  public void Retry(){if(Phase!=MenhirPhase.Defeat)return;Progress.dylanLife=Progress.energy=100;Pose("dylan","StandUp");BeginRound();}
  IEnumerator Finale()
  {
   Banner="LE MENHIR SERT ENFIN À QUELQUE CHOSE";Caption="Aurélien : « Je peux au moins garder mon menhir ? »";Pose("aurelien","Sit");Pose("dylan","Talk");ReactAudience(true);Signal();yield return Wait(8);
   Caption="Dylan : « Oui. Pour afficher nos engagements, les moyens, les responsabilités et le suivi. Et cette fois, on demande l’avis de ceux qui travaillent. »";Pose("dylan","Talk");Pose("aurelien","StandUp");yield return Wait(10);
   Caption="Mathieu : « Comprendre ces principes est un début. Il reste à les appliquer et à vérifier leur efficacité sur le terrain. »";Pose("mathieu","Talk");Pose("aurelien","Listen");yield return Wait(9);
   Caption="Alban : « C’est la première fois que son poids administratif est utile. »\nMilena : « Attendons de voir qui porte le panneau. »";Pose("alban","Laugh");Pose("milena","Talk");yield return Wait(8);FinishVictory();
  }
  void FinishVictory(){if(completing)return;completing=true;RestoreWorld();c.CompleteMenhirDuel();completing=false;}
  public void Leave(){if(!Active)return;StopAllCoroutines();RestoreWorld();c.Save();c.Inform("Duel suspendu. Les épreuves comprises sont sauvegardées ; reparle à Aurélien pour reprendre.");}
  void RestoreWorld()
  {
   foreach(var saved in Progress.returnActors){var root=c.bindings.Find(saved.id);if(root==null)continue;root.position=saved.position;root.rotation=saved.rotation;var actor=c.bindings.characters.FirstOrDefault(a=>a.id==saved.id);if(actor?.meshyActor!=null)actor.meshyActor.transform.localRotation=saved.visualRotation;}
   foreach(var pair in suspended)if(pair.Key!=null)pair.Key.enabled=pair.Value;foreach(var actor in c.bindings.characters){var root=c.bindings.Find(actor.id);if(root==null)continue;var agent=root.GetComponent<NavMeshAgent>();var cc=root.GetComponent<CharacterController>();if(cc!=null)cc.enabled=actor.id=="dylan";if(agent!=null&&agent.enabled){var saved=Progress.returnActors.FirstOrDefault(a=>a.id==actor.id);if(saved!=null)agent.Warp(saved.position);}Pose(actor.id,"Locomotion");}
   foreach(var p in props)if(p!=null)Destroy(p);props.Clear();GetComponent<VillageLife>().enabled=lifeWas;camera.enabled=false;c.bindings.gameplayCamera.enabled=originalCamera;Phase=MenhirPhase.Inactive;TouchMove=0;TouchGuard=false;foreach(var pair in culling)if(pair.Key!=null)pair.Key.cullingMode=pair.Value;culling.Clear();animatorSpeeds.Clear();c.SetPause(false);c.bindings.SetGameplayBlocked(false);Signal();
  }
  public void Pause(){if(!Active)return;c.SetPause(!c.UserPaused);foreach(var actor in c.bindings.characters)if(actor.animator!=null)actor.animator.speed=c.UserPaused?0:1;Signal();}
  void UpdateCamera()
  {
   var focus=center+Vector3.up*1.1f;float distance=Phase==MenhirPhase.Question?11.8f:10.5f;
   if(Phase==MenhirPhase.Question)focus+=axis*2.5f;
   camera.fieldOfView=42;var offset=side*distance+Vector3.up*3.4f;camera.transform.position=focus+offset;if(Time.time<shakeUntil)camera.transform.position+=Vector3.up*Mathf.Sin(Time.time*94)*.035f;camera.transform.LookAt(focus);c.bindings.gameplayCamera.transform.SetPositionAndRotation(camera.transform.position,camera.transform.rotation);impact=Mathf.MoveTowards(impact,0,Time.deltaTime*5);
  }
  void Signal()=>Changed?.Invoke();
 }
 public sealed class MenhirProp:MonoBehaviour{}
}
