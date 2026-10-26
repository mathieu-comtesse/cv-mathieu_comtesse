#if UNITY_EDITOR || UNITY_STANDALONE
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.EventSystems;
namespace UngaBunga45001
{
    // Explicitly attached by the isolated editor test. Excluded from player builds.
    public sealed class TribalValidationV8:MonoBehaviour
    {
        [Serializable]class Check{public string name,detail;public bool passed;}
        [Serializable]class Report{public string status;public Check[] checks;public string[] errors;public int frameStart,frameEnd;}
        const string Folder="E:/UNGA-BUNGA-45001/Revision8";readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();CampaignRuntime c;AdventureMenus menus;int firstFrame;
        static string preferences;static bool hadPreferences,preserved;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void NativeTest(){if(Application.isEditor||!TribalInterfaceAudit.Requested||(Environment.GetCommandLineArgs().Contains("-ungaPriorityV10Audit")||Environment.GetCommandLineArgs().Contains("-ungaV11Audit")))return;hadPreferences=PlayerPrefs.HasKey("UNGA.AdventureUI.v4");preferences=PlayerPrefs.GetString("UNGA.AdventureUI.v4","");preserved=true;Application.runInBackground=true;var go=new GameObject("V8 native test bootstrap");DontDestroyOnLoad(go);go.AddComponent<TribalAuditBootstrap>();}
        public static void RestorePreferences(){if(!preserved)return;if(hadPreferences)PlayerPrefs.SetString("UNGA.AdventureUI.v4",preferences);else PlayerPrefs.DeleteKey("UNGA.AdventureUI.v4");PlayerPrefs.Save();preserved=false;}
        void CheckThat(string name,bool passed,string detail=""){checks.Add(new Check{name=name,passed=passed,detail=detail});File.AppendAllText(Folder+"/validation-progress.txt",name+" = "+passed+" "+detail+"\n");}
        void OnLog(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
        IEnumerator Wait(float seconds){float until=Time.unscaledTime+seconds;while(Time.unscaledTime<until)yield return null;}
        void Near(string id){var target=c.bindings.Find(id);var cc=c.bindings.player.GetComponent<CharacterController>();cc.enabled=false;c.bindings.player.position=target.position+Vector3.back*1.2f+Vector3.up*.1f;cc.enabled=true;}
        bool Click(UnityEngine.UI.Button button)
        {
            Canvas.ForceUpdateCanvases();var pointer=new PointerEventData(EventSystem.current);pointer.position=RectTransformUtility.WorldToScreenPoint(null,button.transform.TransformPoint(((RectTransform)button.transform).rect.center));var hits=new List<RaycastResult>();EventSystem.current.RaycastAll(pointer,hits);var hit=hits.FirstOrDefault();var receiver=hit.gameObject==null?null:ExecuteEvents.GetEventHandler<IPointerClickHandler>(hit.gameObject);bool routed=receiver==button.gameObject;if(routed)ExecuteEvents.Execute(receiver,pointer,ExecuteEvents.pointerClickHandler);return routed;
        }
        IEnumerator DoAction(string id)
        {
            var action=c.FindAction(id);Near(action.targetBindingId);yield return Wait(.1f);c.GetComponent<WorldInteraction>().Execute(id);yield return null;int safety=0;while(c.Dialogue!=null&&safety++<5){var options=c.Dialogue.choices.Where(c.CanChoose).ToArray();c.Choose((options.FirstOrDefault(o=>o.id=="V5_INTRO_OBSERVER")??options.FirstOrDefault(o=>o.id.EndsWith("_C",StringComparison.Ordinal))??options.First()).id);yield return null;}float deadline=Time.unscaledTime+20;while(c.IsBusy&&Time.unscaledTime<deadline)yield return null;CheckThat("Action de quête "+id,c.State.completedActions.Contains(id),c.Message);
        }
        IEnumerator Start()
        {
            if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("V8 isolated test flag required.");
            c=GetComponent<CampaignRuntime>();menus=GetComponent<AdventureMenus>();Application.logMessageReceived+=OnLog;File.WriteAllText(Folder+"/validation-progress.txt","");firstFrame=Time.frameCount;
            CheckThat("Sauvegarde isolée",Path.GetFullPath(c.CurrentSavePath).StartsWith(Path.GetFullPath(TribalInterfaceAudit.IsolatedSaveRoot)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase),c.CurrentSavePath);
            c.NewCampaign();c.cinematicDirector.Skip();c.CloseQuest();menus.Close();c.SetPause(false);yield return Wait(.25f);
            foreach(string screen in new[]{"Peuple","Carte","Inventaire","Technologie","Quêtes","Codex"})
            {
                menus.Open("Inventaire");yield return Wait(.12f);var root=GetComponent<TribalInterface>().Root;var button=root.GetComponentsInChildren<UnityEngine.UI.Button>().First(b=>b.name==screen);bool click=Click(button);yield return Wait(.15f);CheckThat("Onglet cliquable "+screen,click&&menus.Mode==screen&&menus.IsOpen&&c.UserPaused);
                CheckThat("Géométrie finie "+screen,root.GetComponentsInChildren<RectTransform>().All(r=>!float.IsNaN(r.rect.width)&&!float.IsInfinity(r.rect.height)&&r.rect.width>=0&&r.rect.height>=0));if(!Application.isEditor){yield return new WaitForEndOfFrame();ScreenCapture.CaptureScreenshot(Folder+"/Native-"+screen+".png");yield return null;}menus.Close();CheckThat("Pause restaurée "+screen,!c.UserPaused);
            }
            c.SetPause(true);menus.Open("Inventaire");yield return null;menus.Close();CheckThat("Pause antérieure conservée",c.UserPaused);c.SetPause(false);
            Near("stockage");c.SetPause(true);float wood=c.Value("resource","wood"),stored=c.Stored("stockage","wood");
            bool deposited=c.TransferInventory("stockage","wood",3,true,false,out _);bool recovered=c.TransferInventory("stockage","wood",2,false,false,out _);CheckThat("Transfert conserve les quantités",deposited&&recovered&&Mathf.Approximately(c.Value("resource","wood"),wood-1)&&Mathf.Approximately(c.Stored("stockage","wood"),stored+1));
            CheckThat("Quantité invalide refusée",!c.TransferInventory("stockage","wood",float.NaN,true,false,out _));CheckThat("Preuves non transférables",!c.TransferInventory("stockage","evidence",1,true,false,out _));c.Save();CheckThat("Transfert conservé après rechargement",c.ReloadSavedCampaign()&&Mathf.Approximately(c.Value("resource","wood"),wood-1)&&Mathf.Approximately(c.Stored("stockage","wood"),stored+1));
            Near("grand_menhir");CheckThat("Transfert à distance refusé",!c.TransferInventory("stockage","wood",1,true,false,out _));
            var candidates=c.State.characters.Where(s=>s.id!="dylan"&&s.id!="mathilde"&&c.CanAssignTask(s.id,"work:wood",out _)).OrderBy(s=>Vector3.Distance(c.bindings.Find(s.id).position,c.bindings.Find("bois_construction").position));var worker=candidates.First();worker.energy=100;worker.fatigue=0;worker.hunger=0;worker.assignment="";string workerId=worker.id;
            float before=c.Value("resource","wood");Vector3 start=c.bindings.Find(workerId).position;CheckThat("Tâche refusée à Dylan",!c.QueueTask("dylan","work:wood",out _));bool queued=c.QueueTask(workerId,"work:wood",out string reason);var task=c.State.tribalTasks.LastOrDefault(t=>t.workerId==workerId);CheckThat("Tâche enregistrée",queued,reason);c.Save();CheckThat("File conservée au rechargement",c.ReloadSavedCampaign()&&c.State.tribalTasks.Any(t=>t.id==task.id));task=c.State.tribalTasks.First(t=>t.id==task.id);c.SetPause(false);
            float until=Time.unscaledTime+100;while(!TribalTaskRuntime.Terminal(task)&&Time.unscaledTime<until)yield return null;
            CheckThat("Travail physique terminé",task.status=="done"&&task.workedSeconds>=task.duration,workerId+" · "+task.status+" · "+task.reason);CheckThat("Résultat réel unique",task.status=="done"&&Mathf.Approximately(c.Value("resource","wood"),before+1)&&!c.CommitVillagerTask(task.id,out _));CheckThat("Déplacement réel du PNJ",Vector3.Distance(start,c.bindings.Find(workerId).position)>.5f);
            c.SetPause(true);before=c.Value("resource","wood");queued=c.QueueTask(workerId,"work:wood",out _);var cancelled=c.State.tribalTasks.Last(t=>t.workerId==workerId);CheckThat("Annulation sans résultat",queued&&c.CancelTask(cancelled.id)&&Mathf.Approximately(before,c.Value("resource","wood"))&&!c.CommitVillagerTask(cancelled.id,out _));
            var state=c.State.characters.First(s=>s.id==workerId);state.alive=false;CheckThat("Affectation impossible après décès",!c.QueueTask(workerId,"work:wood",out _));state.alive=true;c.Save();c.SetPause(false);menus.Open("Peuple");
            menus.Close();Near("mathieu");float knowledge=c.Value("resource","knowledge");c.OpenQuest("M_I_TUTORIEL","Offer",true);CheckThat("Acceptation canonique de la quête",c.AcceptQuest("M_I_TUTORIEL"));foreach(string id in c.Data.quests.First(q=>q.id=="M_I_TUTORIEL").actionIds)yield return DoAction(id);Near("mathieu");CheckThat("Pas de récompense avant contrôle",Mathf.Approximately(knowledge,c.Value("resource","knowledge"))&&c.QuestState("M_I_TUTORIEL").status==QuestStatus.READY_TO_VALIDATE);CheckThat("Validation auprès du référent",c.ValidateQuest("M_I_TUTORIEL"));CheckThat("Récompense unique",c.ClaimQuest("M_I_TUTORIEL")&&!c.ClaimQuest("M_I_TUTORIEL")&&Mathf.Approximately(c.Value("resource","knowledge"),knowledge+5));CheckThat("Récompense conservée après rechargement",c.ReloadSavedCampaign()&&c.QuestState("M_I_TUTORIEL").claimed&&!c.ClaimQuest("M_I_TUTORIEL"));
            menus.Open("Peuple");CheckThat("Boucle de jeu avance",Time.frameCount>firstFrame+10);CheckThat("Aucune exception de jeu",errors.Count==0,string.Join(" | ",errors));bool passed=checks.All(x=>x.passed)&&errors.Count==0;File.WriteAllText(Folder+(Application.isEditor?"/validation.json":"/native-validation.json"),JsonUtility.ToJson(new Report{status=passed?"passed":"failed",checks=checks.ToArray(),errors=errors.ToArray(),frameStart=firstFrame,frameEnd=Time.frameCount},true));Application.logMessageReceived-=OnLog;RestorePreferences();if(!Application.isEditor)Application.Quit(passed?0:1);
        }
    }
    public sealed class TribalAuditBootstrap:MonoBehaviour
    {
        IEnumerator Start(){Screen.SetResolution(1440,900,FullScreenMode.Windowed);yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);yield return null;FindFirstObjectByType<CampaignRuntime>().gameObject.AddComponent<TribalValidationV8>();Destroy(gameObject);}
        void OnApplicationQuit()=>TribalValidationV8.RestorePreferences();
    }
}
#endif
