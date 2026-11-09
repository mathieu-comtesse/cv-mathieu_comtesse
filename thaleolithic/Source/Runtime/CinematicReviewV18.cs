#if UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicReviewV18:MonoBehaviour
 {
  public bool fireOnly;
  const string Out="E:/UNGA-BUNGA-45001/Revision18/Review/";CampaignRuntime c;Camera camera;RenderTexture rt;Texture2D image;float previousCapture,oldFov;Vector3 position,fixedPosition;Quaternion rotation,fixedRotation;bool fixedCamera;Behaviour[] controls;bool[] enabledControls;
  void Frame(Vector3 at,Vector3 offset){camera.transform.position=at+offset;camera.transform.LookAt(at);fixedPosition=camera.transform.position;fixedRotation=camera.transform.rotation;fixedCamera=true;}
  void Capture(string directory,int frame)
  {
   if(fixedCamera)camera.transform.SetPositionAndRotation(fixedPosition,fixedRotation);Directory.CreateDirectory(Out+directory);var old=RenderTexture.active;RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});RenderTexture.active=rt;image.ReadPixels(new Rect(0,0,1280,720),0,0);image.Apply();File.WriteAllBytes(Out+directory+"/"+frame.ToString("D5")+".png",image.EncodeToPNG());RenderTexture.active=old;
  }
  IEnumerator Film(string name,float seconds,Func<bool> condition=null)
  {int frame=0;float elapsed=0;while(elapsed<seconds&&(condition==null||condition())){yield return null;Capture(name,frame++);elapsed+=Time.deltaTime;}File.WriteAllText(Out+name+".json","{\"frames\":"+frame+",\"fps\":30,\"source\":\"Unity runtime, fixed 1/30 simulation step; offline review capture, not a performance benchmark\"}");}
  void Move(string id)
  {var p=c.bindings.Find(id).position+Vector3.back*2.3f;p.y=VillageLife.Ground(p)+.08f;var body=c.bindings.player.GetComponent<CharacterController>();body.enabled=false;c.bindings.player.position=p;body.enabled=true;}
  IEnumerator ContextTotem()
  {
   foreach(var id in c.Data.quests.First(q=>q.id=="M_I_TUTORIEL").actionIds){if(!c.State.completedActions.Contains(id))c.State.completedActions.Add(id);c.Apply(new EffectDefinition{kind="flag",target="done:"+id,value=1});}
   var intro=c.QuestState("M_I_TUTORIEL");intro.accepted=intro.validated=intro.claimed=true;c.RefreshQuests();Move("aurelien");c.AcceptQuest("V17_CONTEXT");var activity=c.GetComponent<CampaignActivitiesV17>();
   foreach(var id in new[]{"V17_SWOT","V17_PARTIES","V17_SCOPE","V17_SYSTEM"}){var a=c.ActivitiesV17.activities.First(x=>x.id==id);Move(a.site);if(!activity.Begin(id))throw new InvalidOperationException("Totem review prerequisite failed: "+id);while(activity.Active){var p=activity.CurrentProgress;activity.Submit(a.cards[p.card].correct);yield return new WaitForSeconds(.5f);}}
   Move("aurelien");if(!c.ValidateQuest("V17_CONTEXT"))throw new InvalidOperationException("Context review validation failed");c.CloseQuest();fixedCamera=false;if(!c.ClaimQuest("V17_CONTEXT"))throw new InvalidOperationException("Context review receipt failed");yield return Film("totem",6.4f);
  }
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");c=GetComponent<CampaignRuntime>();c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.State.pendingCinematicsV15.Clear();c.SetPause(false);yield return new WaitForSeconds(3);
   camera=c.bindings.gameplayCamera;position=camera.transform.position;rotation=camera.transform.rotation;oldFov=camera.fieldOfView;camera.fieldOfView=55;controls=c.bindings.gameplayControls.Where(x=>x!=null&&x.gameObject==camera.gameObject).ToArray();enabledControls=controls.Select(x=>x.enabled).ToArray();foreach(var control in controls)control.enabled=false;rt=new RenderTexture(1280,720,24);image=new Texture2D(1280,720,TextureFormat.RGB24,false);previousCapture=Time.captureDeltaTime;Time.captureDeltaTime=1f/30;
   var fire=NativeFire.ActiveFires.OrderBy(f=>Vector3.Distance(f.transform.position,c.bindings.Find("foyer").position)).First();Frame(fire.transform.position+Vector3.up*4,new Vector3(9,4,-16));c.GetComponent<CinematicFireV18>().Play(fire);yield return Film("fire",6);if(fireOnly){Cleanup();Destroy(this);yield break;}
   yield return ContextTotem();var v=c.GetComponent<VillageUpgradeV18>();var s=v.StateFor("hut_mathilde");var site=v.Instances[s.id].transform.position;var body=c.bindings.player.GetComponent<CharacterController>();body.enabled=false;c.bindings.player.position=site+Vector3.back*3;body.enabled=true;
   Frame(site+Vector3.up,new Vector3(7,5,-8));if(v.BeginUpgrade(s.id)){float deadline=Time.realtimeSinceStartup+120;while(s.workSeconds<.25f&&Time.realtimeSinceStartup<deadline)yield return null;yield return Film("work",15);}
   for(int tier=0;tier<4;tier++){s.tier=tier;s.pendingTier=tier;s.phase=InstallationPhaseV18.Verified;s.usable=true;v.RefreshInstallation(s.id);yield return null;yield return null;Capture("architecture-tier-"+tier,0);}
   File.WriteAllText(Out+"complete.json","{\"status\":\"captured\",\"architecture\":\"Isolated visual fixture for tiers 0-3; not campaign unlock evidence\"}");Cleanup();Destroy(this);
  }
  void Cleanup(){Time.captureDeltaTime=previousCapture;if(camera!=null){camera.transform.SetPositionAndRotation(position,rotation);camera.fieldOfView=oldFov;}if(controls!=null)for(int i=0;i<controls.Length;i++)if(controls[i]!=null)controls[i].enabled=enabledControls[i];if(rt!=null){rt.Release();Destroy(rt);rt=null;}if(image!=null){Destroy(image);image=null;}}
  void OnDestroy(){Cleanup();}
 }
}
#endif
