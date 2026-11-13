using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class NativeTemperateSmokeV19:MonoBehaviour
 {
  [Serializable]class Check{public string name;public bool passed;}
  [Serializable]class Report{public string status,cpu,gpu,scope="Windows player smoke test. Images render the real scene and UI offscreen in the compiled player. Timing samples measure the hidden-window application loop, not fully rendered gameplay FPS. Hidden-window screenshots are not visual evidence. Not a full campaign or Ryzen 610M/mobile certification.";public int frameSamples;public float medianMs,p95Ms,worstMs;public Check[] checks;public string[] errors;}
  readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();readonly List<float> samples=new List<float>();const string Out="E:/UNGA-BUNGA-45001/Revision19/Environment/NativeSmoke/";
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Boot()
  {if(Application.isEditor||!Environment.GetCommandLineArgs().Contains("-thaleolithicTemperateV19Smoke"))return;Application.runInBackground=true;var go=new GameObject("V18 isolated native smoke test");DontDestroyOnLoad(go);go.AddComponent<NativeTemperateSmokeV19>();}
  void CheckThat(string name,bool passed){checks.Add(new Check{name=name,passed=passed});}
  void Log(string message,string trace,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  void Capture(CampaignRuntime c,string name)
  {
   var cam=c.bindings.gameplayCamera;var canvases=FindObjectsByType<Canvas>(FindObjectsSortMode.None).Where(x=>x.isRootCanvas&&x.renderMode==RenderMode.ScreenSpaceOverlay).ToArray();var cameras=canvases.Select(x=>x.worldCamera).ToArray();var distances=canvases.Select(x=>x.planeDistance).ToArray();var rt=RenderTexture.GetTemporary(1280,720,24);var previous=RenderTexture.active;Texture2D image=null;
   try
   {
    foreach(var canvas in canvases){canvas.renderMode=RenderMode.ScreenSpaceCamera;canvas.worldCamera=cam;canvas.planeDistance=cam.nearClipPlane+.1f;}Canvas.ForceUpdateCanvases();UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(cam,new UnityEngine.Rendering.RenderPipeline.StandardRequest{destination=rt});RenderTexture.active=rt;image=new Texture2D(1280,720,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,1280,720),0,0);image.Apply();var pixels=image.GetPixels32();int colorful=0,total=0;for(int i=0;i<pixels.Length;i+=97){var p=pixels[i];total++;if(Mathf.Max(p.r,p.g,p.b)>12)colorful++;}CheckThat(name+" has rendered pixels",colorful>total/20);Directory.CreateDirectory(Out);File.WriteAllBytes(Out+name+".png",image.EncodeToPNG());
   }
   finally{RenderTexture.active=previous;RenderTexture.ReleaseTemporary(rt);if(image!=null)Destroy(image);for(int i=0;i<canvases.Length;i++){canvases[i].renderMode=RenderMode.ScreenSpaceOverlay;canvases[i].worldCamera=cameras[i];canvases[i].planeDistance=distances[i];}}
  }
  IEnumerator Start()
  {
   Application.logMessageReceived+=Log;yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);var c=FindFirstObjectByType<CampaignRuntime>();
   if(!TribalInterfaceAudit.Requested||!Path.GetFullPath(c.CurrentSavePath).StartsWith(Path.GetFullPath(TribalInterfaceAudit.IsolatedSaveRoot))){errors.Add("Isolated save path required; no fixture applied.");Write();Application.Quit(1);yield break;}
   c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.State.pendingCinematicsV15.Clear();c.SetPause(false);yield return new WaitForSeconds(3);
   CheckThat("native cast and avatars",c.bindings.characters.Length==20&&c.bindings.characters.All(a=>a.animator!=null&&a.animator.isHuman&&a.animator.avatar.isValid));
   CheckThat("new catalog loaded",c.ActivitiesV17.activities.Length==24&&c.ActivitiesV17.activities.Sum(a=>a.cards.Length)==87);
   CheckThat("one main quest",c.Data.quests.Count(q=>q.required&&c.QuestState(q.id).status!=QuestStatus.LOCKED)==1);
   CheckThat("future minigame locked",!c.GetComponent<CampaignActivitiesV17>().Begin("V17_DIFFERENCES"));
   CheckThat("7 separate installations",c.GetComponent<VillageUpgradeV18>().Instances.Count==7);
   CheckThat("decorations batched",c.GetComponent<VillageUpgradeV18>().DecorationCount>=200&&c.GetComponent<VillageUpgradeV18>().DecorationDrawCalls<=10);
   var motor=c.bindings.player.GetComponent<ThirdPersonMotor>();CheckThat("crouch",motor.SetCrouched(true)&&motor.Crouching);yield return null;CheckThat("stand",motor.SetCrouched(false)&&!motor.Crouching);yield return new WaitForSeconds(.3f);
   int jumps=motor.SuccessfulJumps;bool jump=motor.TryJump();yield return new WaitForSeconds(.9f);CheckThat("native jump",jump&&motor.SuccessfulJumps==jumps+1);
   int frame=Time.frameCount;yield return new WaitForSeconds(.5f);CheckThat("runtime advances",Time.frameCount>frame+3);
   c.Save();CheckThat("reload",c.ReloadSavedCampaign());yield return new WaitForSeconds(1);CheckThat("reloaded installations",c.State.villageV18.installations.Count==7);var world=c.GetComponent<ActivityWorldV17>();CheckThat("loaded inspection restores render target",RenderTexture.active!=world.Before&&RenderTexture.active!=world.Now);
   string ending=c.Data.endings[0].id;int receipts=c.State.rewardReceipts.Count;c.State.questSchema=16;c.State.actIndex=7;c.State.endingId=ending;c.Save();bool migrated=c.ReloadSavedCampaign();CheckThat("V16 migration preserves receipts and reopens new campaign frontier",migrated&&c.Ending==null&&c.State.endingId==""&&c.State.campaignV17.legacyEnding==ending&&c.State.actIndex==0&&c.State.rewardReceipts.Count==receipts);CheckThat("migration backup exists",File.Exists(c.CurrentSavePath+".pre-v17.bak"));yield return new WaitForSeconds(1);
   float deadline=Time.realtimeSinceStartup+8;while(Time.realtimeSinceStartup<deadline){samples.Add(Time.unscaledDeltaTime*1000);yield return null;}
   var fire=NativeFire.ActiveFires.OrderBy(f=>Vector3.Distance(f.transform.position,c.bindings.Find("foyer").position)).FirstOrDefault();var effect=c.GetComponent<CinematicFireV18>();bool fireStarted=effect.Play(fire);yield return new WaitForSeconds(2.1f);CheckThat("polygonal fire grows from terrain",fireStarted&&effect.Height>8&&Mathf.Abs(effect.BaseY-HutCollapse.TerrainFloor(fire.transform.position)-.025f)<.01f);yield return new WaitForSeconds(3);CheckThat("fire recovers",!effect.Playing);
   Capture(c,"native-player");yield return new WaitForSeconds(1);CheckThat("native frame captured",File.Exists(Out+"native-player.png"));
   foreach(var id in c.Data.quests.First(q=>q.id=="M_I_TUTORIEL").actionIds){if(!c.State.completedActions.Contains(id))c.State.completedActions.Add(id);c.Apply(new EffectDefinition{kind="flag",target="done:"+id,value=1});}var intro=c.QuestState("M_I_TUTORIEL");intro.accepted=intro.validated=intro.claimed=true;c.RefreshQuests();var body=c.bindings.player.GetComponent<CharacterController>();var at=c.bindings.Find("aurelien").position+Vector3.back*2;body.enabled=false;c.bindings.player.position=at;body.enabled=true;
   c.OpenQuest("V17_CONTEXT","Offer");yield return new WaitForSeconds(.6f);Capture(c,"quest-ui");yield return new WaitForSeconds(.6f);CheckThat("native portrait UI captured",File.Exists(Out+"quest-ui.png"));c.CloseQuest();bool accepted=c.AcceptQuest("V17_CONTEXT");var activity=c.GetComponent<CampaignActivitiesV17>();CheckThat("activity UI opens",accepted&&activity.Begin("V17_SWOT"));yield return new WaitForSeconds(.5f);
   var button=c.GetComponent<ActivityViewV17>().Root.GetComponentsInChildren<UnityEngine.UI.Button>().FirstOrDefault(b=>b.GetComponent<ActivityDropV17>()?.answer==0);bool clicked=false;
   if(button!=null&&UnityEngine.EventSystems.EventSystem.current!=null){var rect=button.transform as RectTransform;var point=RectTransformUtility.WorldToScreenPoint(null,rect.TransformPoint(rect.rect.center));var pointer=new UnityEngine.EventSystems.PointerEventData(UnityEngine.EventSystems.EventSystem.current){position=point,button=UnityEngine.EventSystems.PointerEventData.InputButton.Left};var hits=new List<UnityEngine.EventSystems.RaycastResult>();UnityEngine.EventSystems.EventSystem.current.RaycastAll(pointer,hits);if(hits.Count>0&&hits[0].gameObject.GetComponentInParent<UnityEngine.UI.Button>()==button){UnityEngine.EventSystems.ExecuteEvents.Execute(button.gameObject,pointer,UnityEngine.EventSystems.ExecuteEvents.pointerClickHandler);clicked=activity.CurrentProgress.card==1;}}
   CheckThat("real UI raycast and button click",clicked);Capture(c,"activity-ui");yield return new WaitForSeconds(1);activity.Suspend();Write();Application.logMessageReceived-=Log;Application.Quit(checks.All(x=>x.passed)&&errors.Count==0?0:1);
  }
  void Write(){Directory.CreateDirectory(Out);var ordered=samples.OrderBy(x=>x).ToArray();File.WriteAllText(Out+"validation.json",JsonUtility.ToJson(new Report{status=checks.All(x=>x.passed)&&errors.Count==0?"passed":"failed",checks=checks.ToArray(),errors=errors.ToArray(),cpu=SystemInfo.processorType,gpu=SystemInfo.graphicsDeviceName,frameSamples=ordered.Length,medianMs=ordered.Length>0?ordered[ordered.Length/2]:0,p95Ms=ordered.Length>0?ordered[Mathf.Min(ordered.Length-1,Mathf.FloorToInt(ordered.Length*.95f))]:0,worstMs=ordered.LastOrDefault()},true));}
  void OnDestroy(){Application.logMessageReceived-=Log;}
 }
}
