#if UNITY_EDITOR || UNITY_STANDALONE
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 [DefaultExecutionOrder(350)]public sealed class ConstructionAuditV19:MonoBehaviour
 {
  [Serializable]class Check{public string name,detail;public bool passed;}
  [Serializable]class Report{public string status,scope="Real upgrade and crew travel in the modified scene; isolated tier/chapter fixture. Movie frames use a fixed simulation step, not hardware FPS.";public Check[] checks;public string[] errors;public int frames;public float handGap,deliveryTravel;}
  const string Out="E:/UNGA-BUNGA-45001/Revision19/Environment/";readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();CampaignRuntime c;ConstructionFilmV19 film;int frames;bool complete,recording;float oldCapture;bool cameraClose=true;
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]static void Boot(){if(!Application.isEditor&&Environment.GetCommandLineArgs().Contains("-thaleolithicConstructionV19"))UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>().gameObject.AddComponent<ConstructionAuditV19>();}
  void Write()=>File.WriteAllText(Out+"construction-validation.json",JsonUtility.ToJson(new Report{status=errors.Count>0||checks.Any(x=>!x.passed)?"failed":complete?"passed":"running",checks=checks.ToArray(),errors=errors.ToArray(),frames=frames,handGap=film?.WorstHandGap??0,deliveryTravel=film?.DeliveryTravel??0},true));
  void CheckThat(string name,bool ok,string detail=""){checks.Add(new Check{name=name,passed=ok,detail=detail});Write();}
  void Log(string m,string trace,LogType t){if(t==LogType.Error||t==LogType.Exception)errors.Add(m);}
  void Capture(string file){var cam=c.bindings.gameplayCamera;TemperateEnvironmentAuditV19.Capture(cam,cam.transform.position,cam.transform.position+cam.transform.forward,Out+file);}
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");Application.logMessageReceived+=Log;c=GetComponent<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.State.pendingCinematicsV15.Clear();c.SetPause(false);yield return new WaitForSeconds(4);film=c.GetComponent<ConstructionFilmV19>();
   var village=c.GetComponent<VillageUpgradeV18>();var s=village.StateFor("hut_mathilde");s.tier=s.pendingTier=1;s.phase=InstallationPhaseV18.Verified;s.usable=true;c.State.villageV18.chapters.Add(7);village.RefreshInstallation(s.id);yield return null;yield return null;var root=village.Instances[s.id].transform;var motor=c.bindings.player.GetComponent<ThirdPersonMotor>();motor.enabled=false;var body=c.bindings.player.GetComponent<CharacterController>();body.enabled=false;var pos=root.position+Vector3.right*2.8f;pos.y=VillageLife.Ground(pos)+.035f;c.bindings.player.position=pos;body.enabled=true;
   float wood=c.Value("resource","wood"),clay=c.Value("resource","clay"),straw=c.Value("resource","straw");CheckThat("upgrade starts through actual resource gate",village.BeginUpgrade(s.id));CheckThat("materials paid exactly once",c.Value("resource","wood")==wood-6&&c.Value("resource","clay")==clay-4&&c.Value("resource","straw")==straw-4&&!village.BeginUpgrade(s.id));
   float deadline=Time.time+180;while(!film.Playing&&s.phase==InstallationPhaseV18.Building&&Time.time<deadline)yield return null;CheckThat("crew reaches the construction site",film.Playing,film.Stage);if(!film.Playing){complete=true;Write();Application.logMessageReceived-=Log;motor.enabled=true;yield break;}
   CheckThat("Cinemachine controls the construction camera",film.CinemachineActive);float low=film.BeamHeight,high=low;int before=film.CompletedFilms;oldCapture=Time.captureDeltaTime;Time.captureDeltaTime=1f/30;
   recording=true;while(film.Playing){high=Mathf.Max(high,film.BeamHeight);yield return null;}recording=false;
   Time.captureDeltaTime=oldCapture;CheckThat("all filmed camera positions remain near the site",cameraClose);CheckThat("nine Timeline shots evaluated",film.ShotCount==9,film.ShotCount.ToString());CheckThat("beam really lifts",high-low>1.3f,(high-low).ToString("0.000"));CheckThat("Neila delivers from a different position",film.DeliveryTravel>.5f,film.DeliveryTravel.ToString("0.000"));CheckThat("hands follow the lifted beam",film.WorstHandGap<.15f,film.WorstHandGap.ToString("0.000"));CheckThat("construction film completes",film.CompletedFilms==before+1);
   yield return new WaitForSeconds(1);CheckThat("finished construction awaits all three controls",s.phase==InstallationPhaseV18.AwaitingControl&&!s.usable&&s.tier==1&&s.pendingTier==2);CheckThat("checks authorize real tier2",village.Control(s.id,"stability")&&village.Control(s.id,"access")&&village.Control(s.id,"use")&&s.tier==2&&s.usable);yield return null;CheckThat("native architecture and interior instantiated after controls",village.Instances[s.id].GetComponentsInChildren<MeshFilter>().Any(f=>f.sharedMesh.name=="roof-flat")&&c.GetComponent<TemperateVillageV19>().Points.ContainsKey("env19:hut_mathilde:shelf"));c.Save();CheckThat("film receipt survives reload",c.ReloadSavedCampaign()&&c.State.villageV18.installations.Find(x=>x.id==s.id).filmTier==2);
   complete=true;Write();Application.logMessageReceived-=Log;motor.enabled=true;if(!Application.isEditor)Application.Quit(checks.All(x=>x.passed)&&errors.Count==0?0:1);Destroy(this);
  }
  void LateUpdate(){if(recording&&film!=null&&film.Playing){cameraClose&=Vector3.Distance(c.bindings.gameplayCamera.transform.position,c.GetComponent<VillageUpgradeV18>().Instances["hut_mathilde"].transform.position)<22;Capture("ConstructionFrames/"+(frames++).ToString("D5")+".png");if(frames%30==0)Write();}}
  void OnDestroy(){Time.captureDeltaTime=oldCapture;Application.logMessageReceived-=Log;}
 }
}
#endif
