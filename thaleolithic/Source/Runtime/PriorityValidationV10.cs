#if UNITY_EDITOR || UNITY_STANDALONE
using System;
using System.IO;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class PriorityValidationV10:MonoBehaviour
 {
  [Serializable]class Check{public string name,detail;public bool passed;}
  [Serializable]class Report{public string status,coverage;public Check[] checks;public string[] errors;public int firstFrame,lastFrame;}
  const string Folder="E:/UNGA-BUNGA-45001/Revision10";readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();CampaignRuntime c;AdventureMenus menus;int first;
  static bool NativeRequested=>Environment.GetCommandLineArgs().Contains("-ungaPriorityV10Audit");
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Bootstrap(){if(Application.isEditor||!NativeRequested)return;Application.runInBackground=true;var go=new GameObject("Priority validation bootstrap");DontDestroyOnLoad(go);go.AddComponent<PriorityValidationBootstrap>();}
  void OnLog(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  void CheckThat(string name,bool passed,string detail=""){checks.Add(new Check{name=name,passed=passed,detail=detail});File.AppendAllText(Folder+"/priority-progress.txt",name+"="+passed+" "+detail+"\n");}
  IEnumerator Wait(float seconds){float end=Time.unscaledTime+seconds;while(Time.unscaledTime<end)yield return null;}
  void Near(string id)
  {var cc=c.bindings.player.GetComponent<CharacterController>();cc.enabled=false;var target=c.bindings.Find(id).position;var p=target+Vector3.back*1.2f;
   if(id=="habitations"||id=="charpente"){bool found=false;for(float radius=2.8f;radius<=c.BindingSearchRadius(id)&&!found;radius+=.4f)for(int angle=0;angle<24;angle++){var candidate=target+Quaternion.Euler(0,angle*15,0)*Vector3.back*radius;candidate.y=HutCollapse.TerrainFloor(candidate)+.04f;if(VillageNavigation.Clear(candidate,c.bindings.player)&&c.BindingDistance(id,candidate)<3.4f){p=candidate;found=true;break;}}}
   p.y=HutCollapse.TerrainFloor(p)+.08f;c.bindings.player.position=p;cc.enabled=true;}
  void FreshCampaign()
  {menus.Close();c.CloseQuest();c.SetPause(false);c.NewCampaign();c.cinematicDirector.Skip();}
  IEnumerator Do(string id,string preferred="")
  {
   var action=c.FindAction(id);Near(action.targetBindingId);yield return Wait(.1f);c.GetComponent<WorldInteraction>().Execute(id);yield return null;int count=0;
   while(c.Dialogue!=null&&count++<8){var choices=c.Dialogue.choices.Where(c.CanChoose).ToArray();if(choices.Length==0)break;var choice=choices.FirstOrDefault(x=>x.id==preferred)??choices.FirstOrDefault(x=>x.id=="V5_INTRO_OBSERVER")??choices.FirstOrDefault(x=>x.id.EndsWith("_C",StringComparison.Ordinal))??choices.First();c.Choose(choice.id);yield return null;}
   float deadline=Time.unscaledTime+25;while(c.IsBusy&&Time.unscaledTime<deadline)yield return null;CheckThat("Interaction réelle : "+id,c.State.completedActions.Contains(id),c.Message);
  }
  bool Click(UnityEngine.UI.Button b)
  {Canvas.ForceUpdateCanvases();var pointer=new PointerEventData(EventSystem.current){position=RectTransformUtility.WorldToScreenPoint(null,b.transform.TransformPoint(((RectTransform)b.transform).rect.center))};var hits=new List<RaycastResult>();EventSystem.current.RaycastAll(pointer,hits);var hit=hits.FirstOrDefault();var target=hit.gameObject==null?null:ExecuteEvents.GetEventHandler<IPointerClickHandler>(hit.gameObject);if(target!=b.gameObject)return false;ExecuteEvents.Execute(target,pointer,ExecuteEvents.pointerClickHandler);return true;}
  void ActVFixture()
  {
   // An explicit isolated fixture reaches the late-game branch without pretending to play the entire campaign.
   foreach(var q in c.Data.quests.Where(q=>q.required&&q.id!="M_V_ABRI").TakeWhile(q=>q.id!="M_V_RESERVES"))
   {var record=c.QuestState(q.id);record.accepted=record.validated=record.claimed=true;record.status=QuestStatus.COMPLETED;foreach(var id in q.actionIds){if(!c.State.completedActions.Contains(id))c.State.completedActions.Add(id);c.Apply(new EffectDefinition{kind="flag",target="done:"+id,value=1});}}
   c.State.actIndex=4;c.Apply(new EffectDefinition{kind="building",target="habitations",value=1});c.Apply(new EffectDefinition{kind="risk",target="abri",value=2});c.Apply(new EffectDefinition{kind="resource",target="wood",value=40});c.Apply(new EffectDefinition{kind="resource",target="stone",value=40});c.RefreshQuests();Near("georges");CheckThat("Fixture acte V : mission accessible",c.AcceptQuest("M_V_ABRI"));
  }
  void Shot(string path,Camera camera)
  {
   var rt=new RenderTexture(1280,720,24);rt.Create();RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(1280,720,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,1280,720),0,0);tex.Apply();File.WriteAllBytes(path,tex.EncodeToPNG());RenderTexture.active=old;Destroy(tex);rt.Release();Destroy(rt);
  }
  IEnumerator Run()
  {
   CheckThat("Sauvegarde de test isolée",Path.GetFullPath(c.CurrentSavePath).StartsWith(Path.GetFullPath(TribalInterfaceAudit.IsolatedSaveRoot)+Path.DirectorySeparatorChar));FreshCampaign();yield return Wait(.4f);c.RefreshQuests();
   var available=c.Data.quests.Where(q=>c.QuestVisible(q)&&!c.QuestState(q.id).claimed).ToArray();CheckThat("Une seule mission au démarrage",available.Length==1&&available[0].id=="M_I_TUTORIEL",string.Join(",",available.Select(q=>q.id)));
   Near("aurelien");CheckThat("Quête future refusée à l’acceptation",!c.AcceptQuest("M_II_ROLES"));string tracked=c.State.trackedQuestId;c.TrackQuest("M_II_ROLES");CheckThat("GPS futur refusé",c.State.trackedQuestId==tracked);CheckThat("Action future refusée par le moteur",!c.CanExecute(c.FindAction("M_II_ROLES_1"),out _,true));CheckThat("Menu futur refusé par le moteur",!c.CanExecute(c.FindAction("quest:offer:M_II_ROLES"),out _,true));
   menus.Open("Peuple");yield return Wait(.2f);var ui=GetComponent<TribalInterface>();var prev=ui.Root.GetComponentsInChildren<UnityEngine.UI.Button>().First(b=>b.name=="<");var next=ui.Root.GetComponentsInChildren<UnityEngine.UI.Button>().First(b=>b.name==">");var label=ui.Root.GetComponentsInChildren<TMPro.TMP_Text>().First(t=>t.name=="Pagination des membres");string initial=label.text;bool click=Click(next);yield return Wait(.2f);label=ui.Root.GetComponentsInChildren<TMPro.TMP_Text>().First(t=>t.name=="Pagination des membres");CheckThat("Pagination Peuple par clic réel",click&&label.text!=initial,label.text);prev=ui.Root.GetComponentsInChildren<UnityEngine.UI.Button>().First(b=>b.name=="<");CheckThat("Retour de page disponible",prev.interactable&&Click(prev));yield return Wait(.15f);CheckThat("Responsabilités accessibles",Click(ui.Root.GetComponentsInChildren<UnityEngine.UI.Button>().First(b=>b.name=="RESPONSABILITÉS")));yield return Wait(.15f);menus.Close();CheckThat("Fermeture rétablit le gameplay",!c.UserPaused&&!menus.IsOpen);
   Near("mathieu");CheckThat("Tutoriel accepté",c.AcceptQuest("M_I_TUTORIEL"));var tutorial=c.Data.quests.First(q=>q.id=="M_I_TUTORIEL");float knowledge=c.Value("resource","knowledge");foreach(var id in tutorial.actionIds)yield return Do(id);Near("mathieu");
   string evidence=tutorial.actionIds.Select(c.FindAction).SelectMany(a=>a.effects).First(e=>e.kind=="evidence"&&e.value>0).target;c.State.evidence.Remove(evidence);c.RefreshQuests();CheckThat("Preuve manquante bloque la validation",!c.ValidateQuest(tutorial.id)&&c.QuestValidationIssues(tutorial).Any(i=>i.Contains(evidence)));c.State.evidence.Add(evidence);c.RefreshQuests();
   CheckThat("Aucune récompense avant contrôle",Mathf.Approximately(knowledge,c.Value("resource","knowledge")));CheckThat("Validation réelle du tutoriel",c.ValidateQuest(tutorial.id));CheckThat("Récompense attribuée une seule fois",c.ClaimQuest(tutorial.id)&&!c.ClaimQuest(tutorial.id)&&Mathf.Approximately(c.Value("resource","knowledge"),knowledge+5));CheckThat("GPS quitte la mission terminée",c.GetComponent<QuestNavigationController>().Resolve()?.id!="quest:details:"+tutorial.id);CheckThat("Pas de répétition d’objectif terminé",!c.CanExecute(c.FindAction(tutorial.actionIds.Last()),out _,true));CheckThat("Progression conservée après rechargement",c.ReloadSavedCampaign()&&c.QuestState(tutorial.id).claimed&&c.QuestState("M_I_ENQUETE").status==QuestStatus.AVAILABLE&&!c.ClaimQuest(tutorial.id));
   yield return Wait(.2f);Near("mathilde");CheckThat("Enquête initiale acceptée",c.AcceptQuest("M_I_ENQUETE"));foreach(var id in c.Data.quests.First(q=>q.id=="M_I_ENQUETE").actionIds)yield return Do(id);Near("mathilde");CheckThat("Enquête initiale vérifiée et récompensée",c.ValidateQuest("M_I_ENQUETE")&&c.ClaimQuest("M_I_ENQUETE"));yield return Wait(.2f);c.cinematicDirector.Skip();yield return Wait(.2f);c.RefreshQuests();CheckThat("Transition vers l’acte suivant",c.State.actIndex==1&&c.QuestState("M_II_CONSULTATION").status==QuestStatus.AVAILABLE,"act="+c.State.actIndex);CheckThat("Une seule prévention optionnelle proposée",c.Data.quests.Count(q=>!q.required&&!q.id.StartsWith("investigation:")&&c.QuestVisible(q)&&!c.QuestState(q.id).claimed)<=1);
   FreshCampaign();yield return Wait(.3f);ActVFixture();foreach(string id in new[]{"M_V_ABRI_1","STRUCTURE_ALERT","STRUCTURE_CONSULT","STRUCTURE_INSPECT","M_V_ABRI_2","STRUCTURE_RESTRICT"})yield return Do(id);CheckThat("Contrôle impossible avant travaux",!c.CanExecute(c.FindAction("M_V_ABRI_3"),out _,true));CheckThat("Zone réellement fermée",c.StructureProtected&&FindObjectsByType<UnityEngine.AI.NavMeshObstacle>(FindObjectsSortMode.None).Any(o=>o.enabled&&o.name=="Accès à la charpente suspendu"));yield return Do("WORK_M_V_ABRI");CheckThat("Renforts visibles dans le monde",FindObjectsByType<Transform>(FindObjectsSortMode.None).Any(t=>t.name=="Renfort posé 0"));yield return Do("M_V_ABRI_3");CheckThat("Mesure contrôlée et risque réduit",c.Value("risk","abri")==0&&c.HasFlag("verified:M_V_ABRI"));Near("habitations");c.Apply(new EffectDefinition{kind="flag",target="warning:D04",value=1});CheckThat("Prévention empêche l’incident",!c.GetComponent<AccidentDirector>().Request("D04")&&!c.GetComponent<AccidentDirector>().Playing&&c.State.characters.First(x=>x.id=="dylan").alive);
   FreshCampaign();yield return Wait(.3f);ActVFixture();foreach(string id in new[]{"M_V_ABRI_1","STRUCTURE_ALERT","STRUCTURE_CONSULT","STRUCTURE_INSPECT"})yield return Do(id);yield return Do("M_V_ABRI_2","D_ABRI_B");
   var hut=FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).First(h=>h.site=="habitations"&&h.Broken);var fixedPosition=hut.transform.position;var fixedRotation=hut.transform.rotation;var camera=c.bindings.gameplayCamera;foreach(var b in camera.GetComponents<MonoBehaviour>())if(b.GetType().Name!="UniversalAdditionalCameraData"&&b.GetType().Name!="HDAdditionalCameraData")b.enabled=false;c.bindings.player.GetComponent<ThirdPersonMotor>().enabled=false;camera.enabled=true;var overview=hut.OverviewOffset();camera.transform.position=fixedPosition+Vector3.up+overview;camera.transform.LookAt(fixedPosition+Vector3.up*.9f);camera.fieldOfView=50;
   Directory.CreateDirectory(Folder+"/CollapseFrames");int frame=0;float until=Time.unscaledTime+9;while(Time.unscaledTime<until){camera.transform.position=fixedPosition+Vector3.up+overview;camera.transform.LookAt(fixedPosition+Vector3.up*.9f);Shot(Folder+"/CollapseFrames/"+(frame++).ToString("D4")+".png",camera);yield return Wait(.12f);}
   CheckThat("Racine de hutte immobile",Vector3.Distance(fixedPosition,hut.transform.position)<.001f&&Quaternion.Angle(fixedRotation,hut.transform.rotation)<.01f);CheckThat("Destruction en pièces natives indépendantes",hut.Broken&&!hut.Running&&hut.pieces.Length>=40&&!hut.intactRenderer.enabled&&hut.pieces.All(p=>p.root.gameObject.activeSelf&&p.root.GetComponent<Rigidbody>().isKinematic));CheckThat("Impacts physiques sur le terrain",hut.ImpactCount>0,"impacts="+hut.ImpactCount);CheckThat("Conséquence non mortelle enregistrée une seule fois",c.State.hutFailures.Count(h=>h.id==hut.assemblyId)==1&&c.State.characters.First(x=>x.id=="uma").alive);CheckThat("Réparation provisoire ne valide pas la mission",!c.CanExecute(c.FindAction("WORK_M_V_ABRI"),out _,true)&&!c.ValidateQuest("M_V_ABRI"));c.RefreshQuests();CheckThat("Enquête ouverte après l’incident",c.QuestState("investigation:structure").status==QuestStatus.AVAILABLE);var positions=hut.pieces.Select(p=>p.root.localPosition).ToArray();c.Save();CheckThat("Rechargement de la conséquence",c.ReloadSavedCampaign());yield return Wait(.3f);CheckThat("Débris conservés après reprise",hut.Broken&&positions.Select((p,i)=>Vector3.Distance(p,hut.pieces[i].root.localPosition)).All(d=>d<.02f));
   CheckThat("Boucle du jeu avance",Time.frameCount>first+100);CheckThat("Aucune erreur de jeu pendant les tests",errors.Count==0,string.Join(" | ",errors));
  }
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated V8 save flag required");c=GetComponent<CampaignRuntime>();menus=GetComponent<AdventureMenus>();first=Time.frameCount;File.WriteAllText(Folder+"/priority-progress.txt","");Application.logMessageReceived+=OnLog;var run=Run();
   while(true){object current=null;bool more=false;try{more=run.MoveNext();if(more)current=run.Current;}catch(Exception e){errors.Add(e.ToString());}if(!more)break;yield return current;}
   Application.logMessageReceived-=OnLog;bool passed=checks.All(x=>x.passed)&&errors.Count==0;File.WriteAllText(Folder+(Application.isEditor?"/priority-validation.json":"/native-priority-validation.json"),JsonUtility.ToJson(new Report{status=passed?"passed":"failed",coverage="Real initial quests, UI clicks, saves and two structural branches. Act V reached with an explicit fixture; not a full campaign run.",checks=checks.ToArray(),errors=errors.ToArray(),firstFrame=first,lastFrame=Time.frameCount},true));if(!Application.isEditor)Application.Quit(passed?0:1);
  }
 }
 public sealed class PriorityValidationBootstrap:MonoBehaviour
 {IEnumerator Start(){yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);yield return null;FindFirstObjectByType<CampaignRuntime>().gameObject.AddComponent<PriorityValidationV10>();Destroy(gameObject);}}
}
#endif

