#if UNITY_STANDALONE
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 // Opt-in Windows player verification. It never runs in an ordinary game session.
 public sealed class NativeSmokeV15:MonoBehaviour
 {
  const string Root="E:/UNGA-BUNGA-45001/Revision15/NativeSmoke";
  [Serializable]class Report{public string status,version,poseRevision=CinematicActorV15.PoseRevision,cpu,gpu,savePath,startState,startMessage,introId,scope="Hidden Windows player with explicit rendered captures. Update-loop timings do not measure visible gameplay FPS. Not Radeon 610M or phone certification.";public int actors,avatars,frames,over100ms;public float seconds,filmSeconds,frameP95,frameMaximum;public bool restored,saved,autoStarted,cameraMarker,lookMarker;public string[] errors;}
  readonly List<string> errors=new List<string>();readonly List<float> timings=new List<float>();CampaignRuntime c;bool sampling,hadPreferences;int firstFrame;float began;string originalPreferences;
  void Awake(){hadPreferences=PlayerPrefs.HasKey("UNGA.AdventureUI.v4");originalPreferences=PlayerPrefs.GetString("UNGA.AdventureUI.v4","");}
  void OnApplicationQuit(){if(hadPreferences)PlayerPrefs.SetString("UNGA.AdventureUI.v4",originalPreferences);else PlayerPrefs.DeleteKey("UNGA.AdventureUI.v4");PlayerPrefs.Save();}
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]static void Initialize(){if(Application.isEditor||!Environment.GetCommandLineArgs().Contains("-thaleolithicV15Smoke"))return;new GameObject("Native Windows smoke V15").AddComponent<NativeSmokeV15>();}
  void Log(string message,string trace,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");Directory.CreateDirectory(Root);Application.logMessageReceived+=Log;Application.runInBackground=true;
   float deadline=Time.realtimeSinceStartup+60;while((c=FindFirstObjectByType<CampaignRuntime>())==null||c.State==null){if(Time.realtimeSinceStartup>deadline){File.WriteAllText(Root+"/startup-failed.txt","Campaign did not start");Application.Quit(2);yield break;}yield return null;}
   c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);c.BeginCampaign(true);c.GetComponent<UISettingsController>().preferences.graphicsProfile=0;c.GetComponent<MobileQuality>().Apply();
   bool autoStarted=c.cinematicDirector.IsPlaying;string startState=c.cinematicDirector.SequenceState,startMessage=c.Message;Debug.Log("V15 native startup: "+startState+" | "+startMessage);deadline=Time.realtimeSinceStartup+90;while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING"&&Time.realtimeSinceStartup<deadline)yield return null;
   began=Time.realtimeSinceStartup;firstFrame=Time.frameCount;sampling=true;float filmSeconds=0;bool shotA=false,shotB=false;deadline=Time.realtimeSinceStartup+90;
   while(c.cinematicDirector.IsPlaying&&Time.realtimeSinceStartup<deadline){filmSeconds=Mathf.Max(filmSeconds,c.State.cinematicTimeV15);if(!shotA&&filmSeconds>24){shotA=true;Capture(c.cinematicDirector.cinematicCamera,Root+"/C01-chief.png");}if(!shotB&&filmSeconds>38){shotB=true;Capture(c.cinematicDirector.cinematicCamera,Root+"/C01-notebook.png");}yield return null;}
   sampling=false;Capture(c.bindings.gameplayCamera,Root+"/gameplay.png");bool restored=!c.cinematicDirector.IsPlaying&&c.bindings.gameplayCamera.enabled&&!c.cinematicDirector.cinematicCamera.enabled&&c.bindings.player.GetComponent<ThirdPersonMotor>().enabled&&FindObjectsByType<CinematicActorV15>(FindObjectsSortMode.None).All(a=>!a.Owned);c.Save();bool saved=c.ReloadSavedCampaign();timings.Sort();int avatars=c.bindings.characters.Count(a=>a.animator!=null&&a.animator.avatar!=null&&a.animator.avatar.isValid&&a.animator.avatar.isHuman);
   var report=new Report{version=Application.version,cpu=SystemInfo.processorType,gpu=SystemInfo.graphicsDeviceName,savePath=c.CurrentSavePath,startState=startState,startMessage=startMessage,introId=c.Data.acts[0].introCinematicId,autoStarted=autoStarted,cameraMarker=c.bindings.Find("camera:C01:1")!=null,lookMarker=c.bindings.Find("look:C01")!=null,actors=c.bindings.characters.Length,avatars=avatars,frames=Time.frameCount-firstFrame,seconds=Time.realtimeSinceStartup-began,filmSeconds=filmSeconds,frameP95=timings.Count==0?0:timings[Math.Min(timings.Count-1,(int)(timings.Count*.95f))],frameMaximum=timings.Count==0?0:timings[timings.Count-1],over100ms=timings.Count(t=>t>100),restored=restored,saved=saved,errors=errors.ToArray(),status=Application.version=="0.15.0"&&autoStarted&&avatars==20&&Time.frameCount-firstFrame>100&&filmSeconds>41&&restored&&saved&&shotA&&shotB&&errors.Count==0?"passed":"failed"};File.WriteAllText(Root+"/validation.json",JsonUtility.ToJson(report,true));Application.logMessageReceived-=Log;Application.Quit(report.status=="passed"?0:1);
  }
  void Update(){if(sampling)timings.Add(Time.unscaledDeltaTime*1000);}
  static void Capture(Camera camera,string path){var rt=RenderTexture.GetTemporary(1280,720,24);RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(1280,720,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,1280,720),0,0);tex.Apply();File.WriteAllBytes(path,tex.EncodeToPNG());Destroy(tex);RenderTexture.active=old;RenderTexture.ReleaseTemporary(rt);}
  void OnDestroy()=>Application.logMessageReceived-=Log;
 }
}
#endif
