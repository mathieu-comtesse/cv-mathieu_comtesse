#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using TMPro;
namespace UngaBunga45001
{
    public sealed class ValidationV13:MonoBehaviour
    {
        [Serializable]sealed class Check{public string name,detail;public bool passed;}
        [Serializable]sealed class Report{public string status;public Check[] checks;public string[] errors;public int frameStart,frameEnd;}
        readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();CampaignRuntime c;int first;
        bool preferencesCaptured,hadPreferences;string originalPreferences;
        const string Root="E:/UNGA-BUNGA-45001/Revision13";
        void CheckThat(string name,bool value,string detail=""){checks.Add(new Check{name=name,passed=value,detail=detail});File.AppendAllText(Root+"/checks-progress.txt",name+"="+value+" "+detail+"\n");}
        void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
        IEnumerator Wait(float seconds){float until=Time.unscaledTime+seconds;while(Time.unscaledTime<until)yield return null;}
        void Near(string id){var target=c.bindings.Find(id);var body=c.bindings.player.GetComponent<CharacterController>();body.enabled=false;c.bindings.player.position=target.position+Vector3.back*1.4f+Vector3.up*.1f;body.enabled=true;}
        void Shot(string name)
        {
            var camera=c.cinematicDirector.IsPlaying?c.cinematicDirector.cinematicCamera:c.bindings.gameplayCamera;var canvas=c.GetComponent<CampaignHud>().Canvas;var mode=canvas.renderMode;var previous=canvas.worldCamera;var target=camera.targetTexture;var output=new RenderTexture(1280,720,24);output.Create();camera.targetTexture=output;canvas.renderMode=RenderMode.ScreenSpaceCamera;canvas.worldCamera=camera;canvas.planeDistance=.5f;Canvas.ForceUpdateCanvases();RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=output});var active=RenderTexture.active;RenderTexture.active=output;var texture=new Texture2D(1280,720,TextureFormat.RGB24,false);texture.ReadPixels(new Rect(0,0,1280,720),0,0);texture.Apply();File.WriteAllBytes(Root+"/"+name+".png",texture.EncodeToPNG());RenderTexture.active=active;camera.targetTexture=target;canvas.renderMode=mode;canvas.worldCamera=previous;output.Release();Destroy(output);Destroy(texture);
        }
        IEnumerator Start()
        {
            if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");c=GetComponent<CampaignRuntime>();first=Time.frameCount;Application.logMessageReceived+=Log;File.WriteAllText(Root+"/checks-progress.txt","");
            hadPreferences=PlayerPrefs.HasKey("UNGA.AdventureUI.v4");originalPreferences=PlayerPrefs.GetString("UNGA.AdventureUI.v4","");preferencesCaptured=true;
            c.NewCampaign();c.cinematicDirector.Skip();yield return Wait(.5f);c.CloseQuest();c.SetPause(false);
            CheckThat("Public campaign title",c.Data.title=="THALEOLITHIC",c.Data.title);
            CheckThat("Opening skip commits one completion",c.State.viewedCinematics.Count(x=>x=="C01")==1&&c.State.activeCinematicId==""&&c.cinematicDirector.SequenceState=="SKIPPED");
            CheckThat("Opening returns gameplay camera",!c.cinematicDirector.cinematicCamera.enabled&&c.bindings.gameplayCamera.enabled);
            var a=c.ActionsFor("mathieu");CheckThat("Interaction arrays reused between changes",ReferenceEquals(a,c.ActionsFor("mathieu")));c.Inform("État de test actualisé");CheckThat("Interaction cache invalidated on state change",!ReferenceEquals(a,c.ActionsFor("mathieu")));
            string migration=Root+"/MigrationTest";Directory.CreateDirectory(migration);string source=migration+"/source.json",dest=migration+"/new/save.json";File.WriteAllText(source,JsonUtility.ToJson(c.State));if(File.Exists(dest))File.Delete(dest);
            CheckThat("Legacy save imported",CampaignSaveMigration.TryCopyValidSave(source,dest,c.Data.id));CheckThat("Legacy source preserved",File.Exists(source));string before=File.ReadAllText(dest);CheckThat("Existing new save never overwritten",!CampaignSaveMigration.TryCopyValidSave(source,dest,c.Data.id)&&File.ReadAllText(dest)==before);
            CheckThat("Foreign campaign rejected",!CampaignSaveMigration.TryCopyValidSave(source,migration+"/foreign.json","other-campaign"));
            var q=c.Data.quests.First(x=>x.id=="M_I_TUTORIEL");var record=c.QuestState(q.id);record.accepted=true;record.status=QuestStatus.IN_PROGRESS;
            foreach(string id in q.actionIds.Take(2)){if(!c.State.completedActions.Contains(id))c.State.completedActions.Add(id);if(!c.State.flags.Contains("done:"+id))c.State.flags.Add("done:"+id);}c.Inform("Fixture : deux premières étapes réalisées");
            Near("mathilde");yield return Wait(.2f);c.OpenActionMenu("mathilde");yield return Wait(.3f);
            var action=c.FindAction("M_I_TUTORIEL_3");var social=c.ActionsFor("mathilde").FirstOrDefault(x=>x.id.StartsWith("SOURCE_TALK_"));
            CheckThat("Mathilde main quest classified from active frontier",InteractionContextResolver.Resolve(c,action).kind==InteractionKind.MainQuest);
            CheckThat("Mathilde social conversation separate",social!=null&&InteractionContextResolver.Resolve(c,social).kind==InteractionKind.Conversation);
            CheckThat("Mathilde actual care register separate",InteractionContextResolver.Resolve(c,c.FindAction("DOCUMENT_CARE")).kind==InteractionKind.Document);
            var active=c.GetComponent<QuestDialogueUI>().ActivePanel;CheckThat("Main quest uses gold polygon row",active.GetComponentsInChildren<TribalPolygon>().Any(x=>x.name==action.id&&x.left==TribalStyle.Gold));
            CheckThat("No old public menu title",!active.GetComponentsInChildren<TMP_Text>().Any(t=>t.text.Contains("UNGA BUNGA")));Shot("Mathilde-categories");
            c.Choose("interaction:cancel");int evidence=c.State.evidence.Count,done=c.State.completedActions.Count;
            c.GetComponent<WorldInteraction>().Execute("DOCUMENT_CARE");yield return Wait(.2f);CheckThat("Register opens documentary reader",c.Dialogue?.id=="document:care"&&c.GetComponent<QuestDialogueUI>().ActivePanel.Find("Nom du registre")!=null);Shot("Mathilde-registre");c.Choose("interaction:cancel");CheckThat("Reading does not validate investigation",c.State.evidence.Count==evidence&&c.State.completedActions.Count==done);
            c.OpenActionMenu("mathilde");yield return null;var row=c.Dialogue.choices.FirstOrDefault(x=>x.actionId==social?.id);if(row!=null)c.Choose(row.id);yield return Wait(.1f);CheckThat("Social action opens its own conversation",c.Dialogue!=null&&!c.Dialogue.id.StartsWith("document:")&&!c.Dialogue.id.StartsWith("interaction:"));
            while(c.Dialogue!=null){var option=c.Dialogue.choices.FirstOrDefault(c.CanChoose);if(option==null)break;c.Choose(option.id);yield return null;}while(c.IsBusy)yield return null;
            CheckThat("Social conversation does not complete main testimony",!c.State.completedActions.Contains("M_I_TUTORIEL_3"));
            c.State.completedActions.Add("M_I_TUTORIEL_3");c.Inform("Témoignage terminé dans la fixture");c.OpenActionMenu("mathilde");yield return null;CheckThat("Completed step leaves priority menu",c.Dialogue.choices.All(x=>x.actionId!="M_I_TUTORIEL_3"));c.Choose("interaction:cancel");
            var preferences=c.GetComponent<UISettingsController>().preferences;int input=preferences.inputMode;preferences.inputMode=1;MobileControls.CssWidth=844;MobileControls.CssHeight=390;MobileControls.BrowserTouch=true;
            c.State.completedActions.Remove("M_I_TUTORIEL_3");c.Inform("Fixture tactile");c.OpenActionMenu("mathilde");yield return Wait(.3f);CheckThat("Touch category menu fits viewport",c.GetComponent<QuestDialogueUI>().ActivePanel.sizeDelta.y<=390&&c.GetComponent<QuestDialogueUI>().ActivePanel.sizeDelta.x<=844);Shot("Mathilde-tactile");c.Choose("interaction:cancel");preferences.inputMode=input;MobileControls.BrowserTouch=false;MobileControls.CssWidth=MobileControls.CssHeight=0;
            foreach(var film in c.Data.cinematics)
            {
                c.SetPause(false);c.cinematicDirector.Play(film.id);yield return Wait(.3f);CheckThat(film.id+" camera and live playback",c.cinematicDirector.IsPlaying&&c.cinematicDirector.cinematicCamera.enabled&&c.cinematicDirector.CurrentId==film.id);Shot(film.id+"-camera");c.cinematicDirector.Skip();yield return Wait(.2f);CheckThat(film.id+" skip saved and controls restored",c.State.viewedCinematics.Contains(film.id)&&c.State.activeCinematicId==""&&!c.cinematicDirector.IsPlaying&&c.bindings.gameplayCamera.enabled);
            }
            c.Save();c.BeginCampaign(false);yield return Wait(.3f);CheckThat("Completed films do not replay on load",!c.cinematicDirector.IsPlaying);
            c.cinematicDirector.Play("C04");yield return Wait(.2f);CheckThat("Pending film saved before playing",JsonUtility.FromJson<CampaignSave>(File.ReadAllText(c.CurrentSavePath)).activeCinematicId=="C04");c.cinematicDirector.enabled=false;c.cinematicDirector.enabled=true;c.BeginCampaign(false);yield return Wait(.3f);CheckThat("Interrupted film resumes from saved state",c.cinematicDirector.IsPlaying&&c.cinematicDirector.CurrentId=="C04");c.cinematicDirector.Skip();yield return Wait(.2f);
            CheckThat("No duplicate film completion receipts",c.State.viewedCinematics.Distinct().Count()==c.State.viewedCinematics.Count);
            c.GetComponent<AdventureMenus>().Open("Inventaire");yield return Wait(.2f);Shot("THALEOLITHIC-menu");CheckThat("Management header renamed",c.GetComponent<CampaignHud>().Canvas.GetComponentsInChildren<TMP_Text>(true).Any(t=>t.text=="THALEOLITHIC"));c.GetComponent<AdventureMenus>().Close();
            File.WriteAllText(Root+"/validation-v13.json",JsonUtility.ToJson(new Report{status=checks.All(x=>x.passed)&&errors.Count==0?"passed":"failed",checks=checks.ToArray(),errors=errors.ToArray(),frameStart=first,frameEnd=Time.frameCount},true));Destroy(this);
        }
        void OnDestroy(){Application.logMessageReceived-=Log;if(preferencesCaptured){if(hadPreferences)PlayerPrefs.SetString("UNGA.AdventureUI.v4",originalPreferences);else PlayerPrefs.DeleteKey("UNGA.AdventureUI.v4");PlayerPrefs.Save();}}
    }
}
#endif
