#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class MovementValidationV15:MonoBehaviour
 {
  [Serializable]class Check{public string name,detail;public bool passed;}
  [Serializable]class Report{public string status;public Check[] checks;public string[] errors;public int frames;public float closestFire;}
  const string Folder="E:/UNGA-BUNGA-45001/Revision15/RegressionMovement";List<Check> checks=new List<Check>();List<string> errors=new List<string>();CampaignRuntime c;ThirdPersonMotor motor;CharacterController body;Animator animator;Keyboard simulated,previous;InputSettings.BackgroundBehavior oldBackground;int frame,first;
  readonly Dictionary<NavMeshAgent,bool> stoppedCrowd=new Dictionary<NavMeshAgent,bool>();VillageLife life;bool lifeBefore;
  void ReleaseCrowd(){foreach(var pair in stoppedCrowd)if(pair.Key!=null&&pair.Key.enabled&&pair.Key.isOnNavMesh)pair.Key.isStopped=pair.Value;stoppedCrowd.Clear();if(life!=null){life.enabled=lifeBefore;life=null;}}
  Vector3 FreeLane()
  {
   var preferred=new Vector3(350.92f,0,278.4f);for(float radius=0;radius<=5;radius+=1)for(int originAngle=0;originAngle<(radius==0?1:12);originAngle++)
   {
    var origin=preferred+Quaternion.Euler(0,originAngle*30,0)*Vector3.forward*radius;origin.y=HutCollapse.TerrainFloor(origin)+.04f;
    for(int angle=0;angle<16;angle++){var direction=Quaternion.Euler(0,angle*22.5f,0)*Vector3.forward;bool clear=true;for(float at=0;at<=2;at+=.2f){var point=origin+direction*at;point.y=HutCollapse.TerrainFloor(point)+.04f;float capsuleRadius=body.radius+body.skinWidth;bool occupied=Physics.OverlapCapsule(point+Vector3.up*(capsuleRadius+.02f),point+Vector3.up*(1.8f-capsuleRadius),capsuleRadius,~0,QueryTriggerInteraction.Ignore).Any(col=>!(col is TerrainCollider)&&!col.transform.IsChildOf(motor.transform));if(occupied||!VillageNavigation.HearthSafe(point)||Mathf.Abs(point.y-origin.y)>.2f){clear=false;break;}}if(clear){Warp(origin);motor.FaceDirection(direction);return direction;}}
   }
   throw new InvalidOperationException("No clear keyboard-test lane; physical colliders remain active");
  }
#if UNITY_EDITOR
  InputSettings.EditorInputBehaviorInPlayMode oldEditorInput;
#endif
  void CheckThat(string name,bool passed,string detail=""){checks.Add(new Check{name=name,passed=passed,detail=detail});File.AppendAllText(Folder+"/movement-progress.txt",name+"="+passed+" "+detail+"\n");}
  void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  void Keys(params Key[] keys)=>InputSystem.QueueStateEvent(simulated,new KeyboardState(keys));
  IEnumerator Wait(float time){float until=Time.unscaledTime+time;while(Time.unscaledTime<until)yield return null;}
  void Warp(Vector3 p){body.enabled=false;p.y=HutCollapse.TerrainFloor(p)+.04f;c.bindings.player.position=p;body.enabled=true;motor.FaceDirection(Vector3.forward);}
  void Shot()
  {
   var cam=c.bindings.gameplayCamera;var point=c.bindings.player.position+Vector3.up*.8f;cam.transform.position=point+new Vector3(2.5f,1.6f,3.8f);cam.transform.LookAt(point);cam.fieldOfView=44;var rt=new RenderTexture(960,540,24);rt.Create();RenderPipeline.SubmitRenderRequest(cam,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(960,540,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,960,540),0,0);tex.Apply();File.WriteAllBytes(Folder+(Application.isEditor?"/MovementFrames/":"/NativeMovementFrames/")+(frame++).ToString("D4")+".png",tex.EncodeToPNG());RenderTexture.active=old;Destroy(tex);rt.Release();Destroy(rt);
  }
  IEnumerator Film(float seconds){float until=Time.unscaledTime+seconds;while(Time.unscaledTime<until){Shot();yield return Wait(.1f);}}
  bool CapsuleClear(Vector3 p,float height)
  {return !Physics.OverlapCapsule(p+Vector3.up*.33f,p+Vector3.up*(height-.3f),.27f,~0,QueryTriggerInteraction.Ignore).Any(col=>!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&!col.transform.IsChildOf(c.bindings.player));}
  bool Entrance(out Vector3 from,out Vector3 to)
  {
   foreach(var filter in FindObjectsByType<MeshFilter>(FindObjectsSortMode.None).Where(f=>f.sharedMesh!=null&&f.sharedMesh.name=="hut-mammoth-medium-primeval"))
   {
    var bounds=filter.GetComponent<Renderer>().bounds;var center=bounds.center;center.y=HutCollapse.TerrainFloor(center);float radius=Mathf.Max(bounds.extents.x,bounds.extents.z)+.8f;
    for(int angle=0;angle<48;angle++)
    {var direction=Quaternion.Euler(0,angle*7.5f,0)*Vector3.forward;var start=center+direction*radius;var end=center+direction*2.0f;bool low=true,standing=true;int samples=Mathf.CeilToInt(Vector3.Distance(start,end)/.13f);
     for(int i=0;i<=samples;i++){var point=Vector3.Lerp(start,end,i/(float)samples);point.y=HutCollapse.TerrainFloor(point)+.03f;if(!CapsuleClear(point,ThirdPersonMotor.CrouchedHeight)){low=false;break;}if(!CapsuleClear(point,1.8f))standing=false;}
     if(low){start.y=HutCollapse.TerrainFloor(start)+.04f;end.y=HutCollapse.TerrainFloor(end)+.04f;from=start;to=end;return true;}
    }
   }
   from=to=Vector3.zero;return false;
  }
  IEnumerator Run()
  {
   c.GetComponent<AdventureMenus>().Close();c.CloseQuest();c.SetPause(false);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.NewCampaign();c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);yield return Wait(.4f);motor=c.bindings.player.GetComponent<ThirdPersonMotor>();body=motor.GetComponent<CharacterController>();animator=motor.animator;
   previous=Keyboard.current;oldBackground=InputSystem.settings.backgroundBehavior;InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
#if UNITY_EDITOR
   oldEditorInput=InputSystem.settings.editorInputBehaviorInPlayMode;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
#endif
   simulated=InputSystem.AddDevice<Keyboard>("UNGA isolated movement audit");
   life=c.GetComponent<VillageLife>();lifeBefore=life.enabled;life.enabled=false;foreach(var brain in FindObjectsByType<VillagerBrain>(FindObjectsSortMode.None)){var agent=brain.GetComponent<NavMeshAgent>();if(agent.enabled&&agent.isOnNavMesh){stoppedCrowd[agent]=agent.isStopped;agent.isStopped=true;}}FreeLane();yield return Wait(.35f);float standingHead=animator.GetBoneTransform(HumanBodyBones.Head).position.y-motor.transform.position.y;Keys(c.GetComponent<UISettingsController>().KeyFor("crouch"));yield return Wait(.15f);Keys();yield return Wait(.5f);float crouchedHead=animator.GetBoneTransform(HumanBodyBones.Head).position.y-motor.transform.position.y;
   CheckThat("Commande clavier d’accroupissement",motor.Crouching&&Mathf.Abs(body.height-ThirdPersonMotor.CrouchedHeight)<.01f);CheckThat("Pose native accroupie réelle",standingHead-crouchedHead>.25f,"head drop="+(standingHead-crouchedHead));Directory.CreateDirectory(Folder+(Application.isEditor?"/MovementFrames":"/NativeMovementFrames"));yield return Film(1);
   var start=motor.transform.position;Keys(c.GetComponent<UISettingsController>().KeyFor("forward"));yield return Film(1.6f);Keys();CheckThat("Marche accroupie avec collision physique",Vector3.Distance(start,motor.transform.position)>1&&motor.Crouching,"distance="+Vector3.Distance(start,motor.transform.position)+" flags="+motor.LastCollisionFlags);yield return Wait(.2f);Keys(c.GetComponent<UISettingsController>().KeyFor("crouch"));yield return Wait(.15f);Keys();yield return Wait(.3f);CheckThat("Retour à la posture debout",!motor.Crouching&&body.height>1.7f);
   float ground=motor.transform.position.y,highest=ground;int jumps=motor.SuccessfulJumps;var states=new HashSet<string>();Keys(c.GetComponent<UISettingsController>().KeyFor("jump"));float began=Time.unscaledTime;bool released=false;float until=Time.unscaledTime+1.3f;while(Time.unscaledTime<until){if(!released&&Time.unscaledTime-began>.15f){Keys();released=true;}highest=Mathf.Max(highest,motor.transform.position.y);var state=animator.GetCurrentAnimatorStateInfo(0);var next=animator.GetNextAnimatorStateInfo(0);foreach(var id in new[]{"JumpStart","JumpFall","JumpLand"})if(state.IsName(id)||animator.IsInTransition(0)&&next.IsName(id))states.Add(id);Shot();yield return Wait(.04f);}Keys();
   CheckThat("Saut physique déclenché au clavier",motor.SuccessfulJumps==jumps+1&&highest-ground>.7f,"height="+(highest-ground));CheckThat("Saut et réception natifs",states.Contains("JumpStart")&&states.Contains("JumpFall")&&states.Contains("JumpLand"),string.Join(",",states));CheckThat("Retour au sol après le saut",body.isGrounded&&!motor.InJump&&Mathf.Abs(motor.transform.position.y-ground)<.25f);
   ReleaseCrowd();bool found=Entrance(out var entry,out var inside);CheckThat("Entrée de hutte accessible en position basse",found,"entry="+entry+" inside="+inside);
   if(found){Warp(entry);yield return Wait(.3f);motor.SetCrouched(true);float limit=Time.unscaledTime+8;Keys(c.GetComponent<UISettingsController>().KeyFor("forward"));while(Time.unscaledTime<limit&&Vector3.Distance(new Vector3(motor.transform.position.x,0,motor.transform.position.z),new Vector3(inside.x,0,inside.z))>.5f){motor.FaceDirection(inside-motor.transform.position);yield return null;}Keys();CheckThat("Dylan entre réellement dans une hutte",Vector2.Distance(new Vector2(motor.transform.position.x,motor.transform.position.z),new Vector2(inside.x,inside.z))<.7f);yield return Film(1);}
   Keys();Warp(new Vector3(350.92f,0,278.4f));motor.SetCrouched(false);c.OpenActionMenu("mathieu");yield return Wait(.2f);var activity=FindObjectsByType<TMPro.TMP_Text>(FindObjectsSortMode.None).FirstOrDefault(t=>t.name=="Activité du PNJ");CheckThat("Activité lisible pendant le dialogue",activity!=null&&!activity.isTextTruncated&&activity.text.Length>20,activity?.text??"missing");CheckThat("HUD parasite masqué pendant le dialogue",!c.GetComponent<SurvivalInterface>().GameplayRoot.gameObject.activeSelf);c.Choose("interaction:cancel");yield return Wait(.2f);
   float nearest=999;int overlaps=0;var brains=FindObjectsByType<VillagerBrain>(FindObjectsSortMode.None);var original=brains.ToDictionary(b=>b,b=>b.Travelled);until=Time.unscaledTime+60;
   while(Time.unscaledTime<until)
   {foreach(var brain in brains){foreach(var fire in NativeFire.ActiveFires.Where(f=>f.lit)){var d=brain.transform.position-fire.transform.position;d.y=0;nearest=Mathf.Min(nearest,d.magnitude-fire.radius);}
     var p=brain.transform.position;if(Physics.OverlapCapsule(p+Vector3.up*.42f,p+Vector3.up*1.35f,.22f,~0,QueryTriggerInteraction.Ignore).Any(col=>!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&!col.transform.IsChildOf(brain.transform)&&col.bounds.size.y>.8f))overlaps++;}
    yield return Wait(.15f);}
   CheckThat("PNJ à distance des flammes sur 60 secondes",nearest>=.72f,"minimum radius clearance="+nearest);CheckThat("Capsules PNJ hors des gros obstacles",overlaps==0,"overlap samples="+overlaps);CheckThat("PNJ se déplacent avec les capsules",brains.Count(b=>b.Travelled-original[b]>1)>=5);CheckThat("Aucune erreur pendant les mouvements",errors.Count==0,string.Join(" | ",errors));
   File.WriteAllText(Folder+(Application.isEditor?"/movement-validation.json":"/native-movement-validation.json"),JsonUtility.ToJson(new Report{status=checks.All(x=>x.passed)&&errors.Count==0?"passed":"failed",checks=checks.ToArray(),errors=errors.ToArray(),frames=Time.frameCount-first,closestFire=nearest},true));
  }
  IEnumerator Start()
  {if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");Directory.CreateDirectory(Folder);c=GetComponent<CampaignRuntime>();first=Time.frameCount;File.WriteAllText(Folder+"/movement-progress.txt","");Application.logMessageReceived+=Log;yield return Run();Cleanup();}
  void Cleanup(){ReleaseCrowd();Application.logMessageReceived-=Log;if(simulated!=null){InputSystem.RemoveDevice(simulated);simulated=null;previous?.MakeCurrent();InputSystem.settings.backgroundBehavior=oldBackground;
#if UNITY_EDITOR
 InputSystem.settings.editorInputBehaviorInPlayMode=oldEditorInput;
#endif
}}
  void OnDestroy()=>Cleanup();
 }
}
#endif
