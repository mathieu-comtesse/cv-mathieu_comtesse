#if UNGA_WEB_RENDERER
using UnityEngine; namespace UngaBunga45001 { public sealed class QuestIntegrationAudit:MonoBehaviour {public static bool Requested=>false;public const string IsolatedSaveRoot="";} }
#else
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class QuestIntegrationAudit:MonoBehaviour
    {
        public static bool Requested=>Environment.GetCommandLineArgs().Contains("-ungaQuestAudit");
        public const string IsolatedSaveRoot="E:/UNGA-BUNGA-45001/Revision5/AuditSave";
        [Serializable]class Check{public string name,detail;public bool passed;}
        [Serializable]class Report{public string status;public Check[] checks;public string[] errors;public int frame;}
        readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();CampaignRuntime c;bool finished;string prefs;bool hadPrefs;
        const string Folder="E:/UNGA-BUNGA-45001/Revision5";
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Initialize(){if(!Requested)return;var go=new GameObject("Validation des quêtes V5");DontDestroyOnLoad(go);go.AddComponent<QuestIntegrationAudit>();}
        void Awake(){hadPrefs=PlayerPrefs.HasKey("UNGA.AdventureUI.v4");prefs=PlayerPrefs.GetString("UNGA.AdventureUI.v4","");Application.logMessageReceived+=(message,stack,type)=>{if((type==LogType.Error||type==LogType.Exception)&&errors.Count<20&&!errors.Contains(message))errors.Add(message+"\n"+stack);};UnityEngine.SceneManagement.SceneManager.sceneLoaded+=(s,m)=>{var runtime=FindFirstObjectByType<CampaignRuntime>();if(runtime!=null)runtime.resumeOnStart=false;};StartCoroutine(Timeout());}
        IEnumerator Timeout(){yield return new WaitForSecondsRealtime(480);if(!finished){errors.Add("Timeout");Finish();}}
        void CheckThat(string name,bool passed,string detail=""){checks.Add(new Check{name=name,passed=passed,detail=detail});File.AppendAllText(Folder+"/quest-progress.txt",name+" = "+passed+" "+detail+"\n");}
        IEnumerator Wait(float seconds=.5f){float until=Time.unscaledTime+seconds;while(Time.unscaledTime<until)yield return null;}
        void Near(string binding)
        {
            var target=c.bindings.Find(binding);if(target==null){CheckThat("Destination existante "+binding,false);return;}Vector3 p=target.position+Vector3.back*1.3f;
            for(int i=0;i<12;i++){var test=target.position+Quaternion.Euler(0,i*30,0)*Vector3.forward*1.8f;test.y=VillageLife.Ground(test);if(VillageNavigation.Clear(test,c.bindings.player)){p=test;break;}}
            var cc=c.bindings.player.GetComponent<CharacterController>();cc.enabled=false;c.bindings.player.position=p+Vector3.up*.04f;cc.enabled=true;
        }
        IEnumerator Shot(string name,int width=1920,int height=1080)
        {
            Screen.SetResolution(width,height,FullScreenMode.Windowed);yield return Wait(.6f);yield return new WaitForEndOfFrame();
            var camera=c.bindings.gameplayCamera;
            if(Application.isEditor)
            {
                var rt=new RenderTexture(width,height,24,RenderTextureFormat.ARGB32);rt.Create();var canvas=c.GetComponent<CampaignHud>().Canvas;canvas.renderMode=RenderMode.ScreenSpaceCamera;canvas.worldCamera=camera;canvas.planeDistance=1;camera.targetTexture=rt;Canvas.ForceUpdateCanvases();UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(camera,new UnityEngine.Rendering.RenderPipeline.StandardRequest{destination=rt});var prior=RenderTexture.active;RenderTexture.active=rt;var image=new Texture2D(width,height,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,width,height),0,0);image.Apply();File.WriteAllBytes(Folder+"/Review/"+name+".png",image.EncodeToPNG());RenderTexture.active=prior;camera.targetTexture=null;canvas.renderMode=RenderMode.ScreenSpaceOverlay;Destroy(image);rt.Release();Destroy(rt);
            }
            else{ScreenCapture.CaptureScreenshot(Folder+"/Review/"+name+".png");yield return null;CheckThat("Résolution "+name,Screen.width==width&&Screen.height==height);}
        }
        IEnumerator Do(string id,string choice="")
        {
            var action=c.FindAction(id);Near(action.targetBindingId);yield return Wait(.15f);c.GetComponent<WorldInteraction>().Execute(id);yield return null;
            int safety=0;while(c.Dialogue!=null&&safety++<5){var options=c.Dialogue.choices.Where(c.CanChoose).ToArray();var selected=options.FirstOrDefault(x=>x.id==choice)??options.FirstOrDefault(x=>x.id.EndsWith("_C",StringComparison.Ordinal))??options.First();c.Choose(selected.id);yield return null;}
            float deadline=Time.unscaledTime+30;while(c.IsBusy&&Time.unscaledTime<deadline)yield return null;CheckThat("Action réelle "+id,c.State.completedActions.Contains(id),c.State.completedActions.Contains(id)?"":c.Message);yield return Wait(.2f);
        }
        IEnumerator Start()
        {
            Directory.CreateDirectory(Folder+"/Review");File.WriteAllText(Folder+"/quest-progress.txt","");yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);c=FindFirstObjectByType<CampaignRuntime>();c.cinematicDirector.Skip();while(c.cinematicDirector.IsPlaying)yield return null;yield return Wait(1);
            CheckThat("Sauvegarde exclusivement dans le dossier de test",Path.GetFullPath(c.CurrentSavePath).StartsWith(Path.GetFullPath(IsolatedSaveRoot)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase),c.CurrentSavePath);
            CheckThat("Dylan joueur et Mathieu mentor",c.Data.playerCharacterId=="dylan"&&c.Data.characters.First(x=>x.id=="mathieu").role.Contains("mentor")&&c.bindings.player==c.bindings.Find("dylan"));
            CheckThat("Dix personnages principaux présents",new[]{"dylan","mathieu","aurelien","georges","eliott","mathilde","lorette","neila","alban","milena"}.All(id=>c.bindings.AnimatorFor(id)?.avatar?.isHuman==true));
            CheckThat("Feux allumés",FindObjectsByType<NativeFire>(FindObjectsSortMode.None).Count(f=>f.AnimatedFlames==7&&f.WarmLight.enabled)==2);
            CheckThat("Quêtes initiales verrouillées",c.QuestState("M_I_TUTORIEL").status==QuestStatus.AVAILABLE&&c.QuestState("M_II_ROLES").status==QuestStatus.LOCKED);
            Near("mathieu");c.OpenQuest("M_I_TUTORIEL","Offer",true);yield return Wait(.8f);yield return Shot("Offre-1920");float knowledge=c.Value("resource","knowledge");c.DeferQuest("M_I_TUTORIEL");CheckThat("Reporter conserve la quête sans récompense",c.QuestState("M_I_TUTORIEL").status==QuestStatus.DEFERRED&&c.Value("resource","knowledge")==knowledge);
            c.OpenQuest("M_I_TUTORIEL","Offer",true);CheckThat("Acceptation réelle",c.AcceptQuest("M_I_TUTORIEL"));Near("mathieu");c.GetComponent<WorldInteraction>().Execute("M_I_TUTORIEL_1");yield return Wait(1);CheckThat("Dialogue natif et portrait du mentor",c.Dialogue?.id=="V5_DYLAN_INTRO"&&c.GetComponent<QuestDialogueUI>().CurrentSpeaker=="mathieu");yield return Shot("Dialogue-1920");
            c.Choose("V5_INTRO_OBSERVER");while(c.IsBusy)yield return null;
            foreach(var id in c.Data.quests.First(q=>q.id=="M_I_TUTORIEL").actionIds.Skip(1))yield return Do(id);
            CheckThat("Aucun gain avant validation",c.QuestState("M_I_TUTORIEL").status==QuestStatus.READY_TO_VALIDATE&&c.Value("resource","knowledge")==knowledge);
            Near("mathieu");CheckThat("Validation auprès du mentor",c.ValidateQuest("M_I_TUTORIEL"));yield return Shot("Recompenses-1920");CheckThat("Récompense unique",c.ClaimQuest("M_I_TUTORIEL")&&!c.ClaimQuest("M_I_TUTORIEL")&&c.Value("resource","knowledge")==knowledge+5);
            CheckThat("Preuve dans le Carnet et progression ciblée",c.State.evidence.Contains("quest:M_I_TUTORIEL")&&c.State.knowledge.Any(n=>n.id=="4.1"&&n.level==4)&&!c.State.knowledge.Any(n=>n.id=="10.2"&&n.level==4));
            CheckThat("Rechargement sans doublon",c.ReloadSavedCampaign()&&c.QuestState("M_I_TUTORIEL").claimed&&!c.ClaimQuest("M_I_TUTORIEL")&&c.Value("resource","knowledge")==knowledge+5);
            yield return Wait(.6f);var alban=c.Data.quests.First(q=>q.id=="SIDE_CERCLE");Near("alban");c.OpenQuest(alban.id,"Offer",true);CheckThat("Alban accepte la mission",c.AcceptQuest(alban.id));foreach(var id in alban.actionIds.Take(3))yield return Do(id);
            CheckThat("Choix seul ne termine pas la quête",c.QuestState(alban.id).status==QuestStatus.IN_PROGRESS&&!c.HasFlag(alban.verificationFlag));foreach(var id in alban.actionIds.Skip(3))yield return Do(id);
            Near("alban");c.ValidateQuest(alban.id);yield return Shot("Quete-Alban");CheckThat("Quête complète Alban et récompenses",c.ClaimQuest(alban.id)&&c.State.evidence.Contains("quest:"+alban.id));
            Near("milena");c.OpenQuest("SIDE_BERGES","Offer",true);CheckThat("Milena accepte la quête des berges",c.AcceptQuest("SIDE_BERGES"));yield return Wait(1);CheckThat("GPS vers la berge réelle",c.GetComponent<QuestNavigationController>().Action?.targetBindingId=="berge_observation");
            foreach(var resolution in new[]{new Vector2Int(1280,720),new Vector2Int(2560,1440)})
            {Near("mathieu");c.OpenQuest("M_I_TUTORIEL","Details");yield return Shot("Fiche-"+resolution.x,resolution.x,resolution.y);c.CloseQuest();}
            Screen.SetResolution(1920,1080,FullScreenMode.Windowed);
            var accidents=c.GetComponent<AccidentDirector>();CheckThat("Accident sans alerte refusé",!accidents.Request("D02"));
            // Controlled branch fixture: the warning is then explicitly chosen at its real location.
            Near("pierre_carriere");c.CaptureDecisionCheckpoint();float beforeTime=c.State.elapsedSeconds,beforeWood=c.Value("resource","wood");c.Apply(new EffectDefinition{kind="flag",target="warning:D02",value=1});CheckThat("Déclenchement conditionnel",accidents.Request("D02"));while(accidents.Playing)yield return null;yield return Wait(.3f);yield return Shot("Mort-Dylan");
            CheckThat("Physique bornée et gore complet",accidents.LastBody!=null&&accidents.LastBody.Bodies>=12&&accidents.LastBody.Frozen&&accidents.LastBloodCount==28);
            CheckThat("Corps reste au lieu de l’accident",accidents.LastBody.GetComponentsInChildren<Rigidbody>().All(b=>Vector3.Distance(b.position,c.bindings.player.position)<15));
            CheckThat("Écran de mort sans décès définitif",accidents.DeathScreen&&c.State.characters.First(x=>x.id=="dylan").alive);CheckThat("Reprise avant la mauvaise décision",accidents.Retry()&&!c.HasFlag("warning:D02")&&c.State.elapsedSeconds<=beforeTime+.2f&&c.Value("resource","wood")==beforeWood&&c.QuestState("M_I_TUTORIEL").claimed);
            c.GetComponent<UISettingsController>().preferences.goreLevel=2;Near("pierre_carriere");c.CaptureDecisionCheckpoint();c.Apply(new EffectDefinition{kind="character",target="georges.alive",value=0});while(accidents.Playing)yield return null;
            CheckThat("Décès PNJ et enquête persistants",!c.State.characters.First(x=>x.id=="georges").alive&&c.HasFlag("accident:georges")&&c.QuestState("investigation:georges").status==QuestStatus.AVAILABLE&&accidents.LastBloodCount==0);c.Save();CheckThat("PNJ décédé ne revient pas",c.ReloadSavedCampaign()&&!c.State.characters.First(x=>x.id=="georges").alive&&!c.bindings.characters.First(x=>x.id=="georges").meshyActor.activeSelf);
            Finish();
        }
        void Finish()
        {
            if(finished)return;finished=true;if(hadPrefs)PlayerPrefs.SetString("UNGA.AdventureUI.v4",prefs);else PlayerPrefs.DeleteKey("UNGA.AdventureUI.v4");PlayerPrefs.Save();
            var report=new Report{status=errors.Count==0&&checks.All(x=>x.passed)?"passed":"failed",checks=checks.ToArray(),errors=errors.ToArray(),frame=Time.frameCount};File.WriteAllText(Folder+"/quest-validation.json",JsonUtility.ToJson(report,true));
            #if UNITY_EDITOR
            UnityEditor.EditorApplication.Exit(report.status=="passed"?0:1);
            #else
            Application.Quit(report.status=="passed"?0:1);
            #endif
        }
    }
}

#endif
