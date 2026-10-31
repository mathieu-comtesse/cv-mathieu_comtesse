#if UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class GameplayMovieCaptureV15:MonoBehaviour
 {
  [Serializable]class Receipt{public string id="Gameplay",folder;public int frames,audioSamples,jumps;public float seconds,audioPeak,distance;public bool complete,crouched;}
  Keyboard keyboard,previous;InputSettings.BackgroundBehavior background;InputSettings.EditorInputBehaviorInPlayMode editorInput;bool configured;
  void Keys(params Key[] keys)=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));
  static (Vector3 origin,Vector3 forward) SafeLane(ThirdPersonMotor motor,CharacterController body)
  {
   var preferred=new Vector3(350.92f,0,278.4f);float capsuleRadius=body.radius+body.skinWidth;
   for(float radius=0;radius<=8;radius+=1)for(int originAngle=0;originAngle<(radius==0?1:12);originAngle++)
   {
    var origin=preferred+Quaternion.Euler(0,originAngle*30,0)*Vector3.forward*radius;origin.y=HutCollapse.TerrainFloor(origin)+.04f;
    for(int angle=0;angle<24;angle++)
    {
     var direction=Quaternion.Euler(0,angle*15,0)*Vector3.forward;bool clear=true;float previousHeight=origin.y;
     for(float at=-3;at<=6.5f;at+=.25f){var p=origin+direction*at;p.y=HutCollapse.TerrainFloor(p)+.04f;if(!VillageNavigation.HearthSafe(p,capsuleRadius)||Mathf.Abs(p.y-previousHeight)>.2f||Physics.OverlapCapsule(p+Vector3.up*(capsuleRadius+.02f),p+Vector3.up*(1.8f-capsuleRadius),capsuleRadius,~0,QueryTriggerInteraction.Ignore).Any(col=>!(col is TerrainCollider)&&!col.transform.IsChildOf(motor.transform))){clear=false;break;}previousHeight=p.y;}
     if(clear)return(origin,direction);
    }
   }
   throw new InvalidOperationException("No physically clear gameplay recording lane");
  }
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");
   var c=FindFirstObjectByType<CampaignRuntime>();c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);c.CloseQuest();c.GetComponent<AdventureMenus>().Close();
   var motor=c.bindings.player.GetComponent<ThirdPersonMotor>();var body=motor.GetComponent<CharacterController>();var lane=SafeLane(motor,body);body.enabled=false;motor.transform.position=lane.origin;body.enabled=true;motor.FaceDirection(lane.forward);motor.SetCrouched(false);
   previous=Keyboard.current;background=InputSystem.settings.backgroundBehavior;editorInput=InputSystem.settings.editorInputBehaviorInPlayMode;InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;configured=true;keyboard=InputSystem.AddDevice<Keyboard>("THALEOLITHIC V15 gameplay review");
   var settings=c.GetComponent<UISettingsController>();Key forward=settings.KeyFor("forward"),back=settings.KeyFor("back"),crouch=settings.KeyFor("crouch"),jump=settings.KeyFor("jump"),run=settings.KeyFor("run");
   yield return new WaitForSecondsRealtime(.5f);int initialJumps=motor.SuccessfulJumps;float travelled=0;bool crouched=false;var last=motor.transform.position;string folder="E:/UNGA-BUNGA-45001/Revision15/MoviesRaw/Gameplay-"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");Directory.CreateDirectory(folder);
   var camera=c.bindings.gameplayCamera;var tap=camera.gameObject.AddComponent<CinematicAudioTapV15>();tap.recording=true;var rt=new RenderTexture(960,540,24);rt.Create();var tex=new Texture2D(960,540,TextureFormat.RGB24,false);float began=Time.realtimeSinceStartup,next=0;int frames=0;
   try
   {
    while(Time.realtimeSinceStartup-began<12)
    {
     float t=Time.realtimeSinceStartup-began;
     if(t<1)Keys();else if(t<3.4f)Keys(forward);else if(t<4)Keys();else if(t<4.15f)Keys(crouch);else if(t<4.5f)Keys();else if(t<6)Keys(forward);else if(t<6.15f)Keys(crouch);else if(t<6.8f)Keys();else if(t<6.95f)Keys(jump);else if(t<8.5f)Keys();else if(t<10.3f)Keys(back,run);else Keys();
     crouched|=motor.Crouching;travelled+=Vector3.Distance(last,motor.transform.position);last=motor.transform.position;
     if(t>=next)
     {
      next+=1f/24;var canvases=FindObjectsByType<Canvas>(FindObjectsSortMode.None).Where(canvas=>canvas.isRootCanvas&&canvas.renderMode==RenderMode.ScreenSpaceOverlay).ToArray();
      try{foreach(var canvas in canvases){canvas.renderMode=RenderMode.ScreenSpaceCamera;canvas.worldCamera=camera;canvas.planeDistance=.5f;}Canvas.ForceUpdateCanvases();RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;tex.ReadPixels(new Rect(0,0,960,540),0,0);tex.Apply();RenderTexture.active=old;File.WriteAllBytes(folder+"/"+(frames++).ToString("D5")+".jpg",tex.EncodeToJPG(82));}
      finally{foreach(var canvas in canvases)if(canvas!=null){canvas.renderMode=RenderMode.ScreenSpaceOverlay;canvas.worldCamera=null;}}
     }
     yield return null;
    }
    tap.recording=false;tap.Save(folder+"/audio.wav");float seconds=Time.realtimeSinceStartup-began;var receipt=new Receipt{folder=folder,frames=frames,seconds=seconds,audioSamples=tap.Samples,audioPeak=tap.Peak,jumps=motor.SuccessfulJumps-initialJumps,distance=travelled,crouched=crouched,complete=frames>=seconds*24*.9f};File.WriteAllText(folder+"/capture.json",JsonUtility.ToJson(receipt,true));File.WriteAllText(folder+"/subtitles.srt","");File.WriteAllText("E:/UNGA-BUNGA-45001/Revision15/last-movie.json",JsonUtility.ToJson(receipt,true));
   }
   finally{Cleanup();if(tap!=null)Destroy(tap);rt.Release();Destroy(rt);Destroy(tex);motor.SetCrouched(false);}
   Destroy(this);
  }
  void Cleanup(){if(keyboard!=null){InputSystem.RemoveDevice(keyboard);keyboard=null;previous?.MakeCurrent();}if(configured){InputSystem.settings.backgroundBehavior=background;InputSystem.settings.editorInputBehaviorInPlayMode=editorInput;configured=false;}}
  void OnDestroy()=>Cleanup();
 }
}
#endif
