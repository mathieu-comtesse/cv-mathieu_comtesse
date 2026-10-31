using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.Rendering;

namespace UngaBunga45001.Editor
{
    [InitializeOnLoad]
    public static class RecoveredPlayAudit
    {
        private const string Key="UngaBunga.PlayAudit.Active";
        [Serializable] private class Receipt
        {
            public string status,bindingsIssues,interactionAction;
            public string motorDiagnostic,cameraDiagnostic,collisionDiagnostic;
            public bool bindingsValid,framesAdvanced,clockAdvanced,movementReceived,grounded,distanceGate,nearInteractionStarted;
            public bool dialogueOpened,uiChoiceInvoked,actionCompleted;
            public int firstFrame,lastFrame,actors;
            public float firstTime,lastTime,movementMeters;
            public string[] errors,captures,actorDiagnostics;
        }
        private static readonly List<string> errors=new List<string>();
        private static Receipt receipt;
        private static CampaignRuntime campaign;
        private static Keyboard keyboard;
        private static Vector3 initial;
        private static float started,phaseStarted;
        private static int phase;
        static RecoveredPlayAudit(){if(SessionState.GetBool(Key,false))Subscribe();}
        private static void Subscribe(){EditorApplication.update-=Tick;EditorApplication.update+=Tick;Application.logMessageReceived-=Log;Application.logMessageReceived+=Log;}
        private static void Log(string condition,string stack,LogType type){if(EditorApplication.isPlaying&&(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)&&!errors.Contains(condition)&&errors.Count<40)errors.Add(condition);}
        public static void Run()
        {
            Application.SetStackTraceLogType(LogType.Error,StackTraceLogType.Full);
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var source=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();if(source==null)throw new InvalidOperationException("Adapted campaign scene missing");source.resumeOnStart=false;
            SessionState.SetBool(Key,true);SessionState.SetFloat(Key+"Deadline",(float)EditorApplication.timeSinceStartup+180);
            SessionState.SetInt(Key+"ExitCode",-1);
            Subscribe();EditorApplication.isPlaying=true;
        }
        private static void Tick()
        {
            try
            {
                if(!SessionState.GetBool(Key,false)){EditorApplication.update-=Tick;return;}
                int completedCode=SessionState.GetInt(Key+"ExitCode",-1);
                if(completedCode>=0&&!EditorApplication.isPlaying){SessionState.SetBool(Key,false);SessionState.SetInt(Key+"ExitCode",-1);EditorApplication.Exit(completedCode);return;}
                if(EditorApplication.timeSinceStartup>SessionState.GetFloat(Key+"Deadline",0)){Finish("timeout");return;}
                if(phase==9){if(!EditorApplication.isPlaying){SessionState.SetBool(Key,false);EditorApplication.Exit(receipt.status=="passed"?0:1);}return;}
                if(!EditorApplication.isPlaying)return;
                EditorApplication.QueuePlayerLoopUpdate();
                if(phase==0)
                {
                    campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();if(campaign==null||campaign.State==null)return;
                    campaign.cinematicDirector.Skip();campaign.SetPause(false);
                    receipt=new Receipt{status="running",firstFrame=Time.frameCount,firstTime=campaign.State.elapsedSeconds,actors=campaign.bindings.characters.Length};
                    receipt.bindingsValid=campaign.bindings.Validate(out receipt.bindingsIssues);
                    initial=campaign.bindings.player.position;started=Time.unscaledTime;phaseStarted=started;
                    InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
                    InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
                    keyboard=InputSystem.AddDevice<Keyboard>("UngaBungaAuditKeyboard");
                    keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState(KeyCodeToInput()));phase=1;return;
                }
                if(phase==1 && Time.unscaledTime-phaseStarted>1.3f && Time.frameCount-receipt.firstFrame>=15)
                {
                    var motor=campaign.bindings.player.GetComponent<ThirdPersonMotor>();var cam=campaign.bindings.gameplayCamera;
                    var movement=typeof(ThirdPersonMotor).GetMethod("ReadMovement",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic).Invoke(motor,null);
                    receipt.motorDiagnostic="enabled="+motor.enabled+" W="+keyboard.wKey.isPressed+" current="+Keyboard.current?.name+" movement="+movement+" modal="+campaign.IsModal+" busy="+campaign.IsBusy+" scale="+Time.timeScale;
                    receipt.cameraDiagnostic="active="+cam.gameObject.activeInHierarchy+" enabled="+cam.enabled+" pos="+cam.transform.position+" forward="+cam.transform.forward+" pipeline="+RenderPipelineManager.currentPipeline?.GetType().FullName+" controls="+string.Join(",",campaign.bindings.gameplayControls.Select(b=>b.name+":"+b.enabled));
                    receipt.collisionDiagnostic=string.Join(";",Physics.OverlapCapsule(campaign.bindings.player.position+Vector3.up*.4f,campaign.bindings.player.position+Vector3.up*1.4f,.35f,~0,QueryTriggerInteraction.Ignore).Select(c=>c.name+":"+c.GetType().Name));
                    InputSystem.QueueStateEvent(keyboard,new KeyboardState());
                    Vector3 delta=campaign.bindings.player.position-initial;receipt.movementMeters=new Vector2(delta.x,delta.z).magnitude;receipt.movementReceived=receipt.movementMeters>.25f;
                    receipt.grounded=campaign.bindings.player.GetComponent<CharacterController>().isGrounded;
                    receipt.actorDiagnostics=campaign.bindings.characters.Select(a=>a.id+" active="+a.meshyActor.activeInHierarchy+" root="+campaign.bindings.Find(a.id).position+" visual="+a.meshyActor.transform.position+" foot="+a.animator.GetBoneTransform(HumanBodyBones.LeftFoot).position+" renderers="+string.Join(";",a.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>().Select(r=>r.name+":"+r.enabled+":"+r.bounds+":layer"+r.gameObject.layer))).ToArray(); Capture("Unity-Gameplay.png");
                    var action=campaign.Data.actions.FirstOrDefault(a=>a.actId==campaign.CurrentAct.id&&campaign.CanExecute(a,out _));
                    if(action!=null)
                    {
                        receipt.interactionAction=action.id;var target=campaign.bindings.Find(action.targetBindingId);var player=campaign.bindings.player;var controller=player.GetComponent<CharacterController>();var prior=player.position;
                        controller.enabled=false;player.position=target.position+Vector3.right*50;
                        var interaction=campaign.GetComponent<WorldInteraction>();interaction.Execute(action.id);receipt.distanceGate=campaign.Message.StartsWith("Rejoins",StringComparison.Ordinal);
                        player.position=target.position+Vector3.right*.7f+Vector3.up*.12f;controller.enabled=true;
                        interaction.Execute(action.id);receipt.nearInteractionStarted=campaign.IsBusy||campaign.Dialogue!=null||campaign.State.completedActions.Contains(action.id);
                    }
                    phaseStarted=Time.unscaledTime;phase=2;return;
                }
                if(phase==1){keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState(KeyCodeToInput()));}
                if(phase==2 && Time.unscaledTime-phaseStarted>.5f)
                {
                    receipt.dialogueOpened=campaign.Dialogue!=null;Capture("Unity-Interaction.png");
                    var button=campaign.GetComponentsInChildren<UnityEngine.UI.Button>().FirstOrDefault(b=>b.GetComponentInChildren<TMPro.TMP_Text>()?.text=="Continuer");
                    if(button!=null){button.onClick.Invoke();receipt.uiChoiceInvoked=true;}
                    phaseStarted=Time.unscaledTime;phase=3;return;
                }
                if(phase==3 && !campaign.IsBusy && Time.unscaledTime-phaseStarted>.1f)
                {
                    receipt.actionCompleted=campaign.State.completedActions.Contains(receipt.interactionAction);
                    receipt.lastFrame=Time.frameCount;receipt.lastTime=campaign.State.elapsedSeconds;
                    receipt.framesAdvanced=receipt.lastFrame-receipt.firstFrame>=15;receipt.clockAdvanced=receipt.lastTime>receipt.firstTime+.2f;
                    Finish(receipt.bindingsValid&&receipt.actors==18&&receipt.framesAdvanced&&receipt.clockAdvanced&&receipt.movementReceived&&receipt.grounded&&receipt.distanceGate&&receipt.nearInteractionStarted&&receipt.dialogueOpened&&receipt.uiChoiceInvoked&&receipt.actionCompleted&&errors.Count==0?"passed":"failed");
                }
            }
            catch(Exception exception){errors.Add(exception.ToString());Finish("exception");}
        }
        private static UnityEngine.InputSystem.Key KeyCodeToInput()=>UnityEngine.InputSystem.Key.W;
        private static void Capture(string filename)
        {
            var camera=campaign.bindings.gameplayCamera;var canvas=campaign.GetComponentInChildren<Canvas>();
            var texture=new RenderTexture(1600,900,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);texture.Create();
            var prior=RenderTexture.active;var mode=canvas.renderMode;var worldCamera=canvas.worldCamera;var mask=camera.cullingMask;
            try
            {
                canvas.renderMode=RenderMode.ScreenSpaceCamera;canvas.worldCamera=camera;canvas.planeDistance=.5f;camera.cullingMask|=1<<5;Canvas.ForceUpdateCanvases();
                var request=new RenderPipeline.StandardRequest{destination=texture};
                if(!RenderPipeline.SupportsRenderRequest(camera,request))throw new InvalidOperationException("Active render pipeline does not support the capture request");
                RenderPipeline.SubmitRenderRequest(camera,request);
                RenderTexture.active=texture;var pixels=new Texture2D(1600,900,TextureFormat.RGB24,false);pixels.ReadPixels(new Rect(0,0,1600,900),0,0);pixels.Apply();
                Directory.CreateDirectory("E:/UNGA-BUNGA-45001/Preview");File.WriteAllBytes("E:/UNGA-BUNGA-45001/Preview/"+filename,pixels.EncodeToPNG());UnityEngine.Object.DestroyImmediate(pixels);
            }
            finally{canvas.renderMode=mode;canvas.worldCamera=worldCamera;camera.cullingMask=mask;RenderTexture.active=prior;texture.Release();UnityEngine.Object.DestroyImmediate(texture);}
        }
        private static void Finish(string status)
        {
            if(receipt==null)receipt=new Receipt();receipt.status=status;receipt.errors=errors.ToArray();receipt.captures=new[]{"Preview/Unity-Gameplay.png","Preview/Unity-Interaction.png"};
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-play-audit.json",JsonUtility.ToJson(receipt,true));
            if(keyboard!=null)InputSystem.RemoveDevice(keyboard);SessionState.SetInt(Key+"ExitCode",status=="passed"?0:1);phase=9;EditorApplication.isPlaying=false;
        }
    }
}
