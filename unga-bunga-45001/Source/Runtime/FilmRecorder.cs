#if UNGA_WEB_RENDERER
using UnityEngine; namespace UngaBunga45001 { public sealed class FilmRecorder:MonoBehaviour {public static bool Requested=>false;public static bool Active=>false;} }
#else
using System;
using System.Collections;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
namespace UngaBunga45001
{
    // Opt-in capture of real game frames; no encoder is started during normal play.
    public sealed class FilmRecorder:MonoBehaviour
    {
        public static bool Requested=>Environment.GetCommandLineArgs().Contains("-ungaFilm");
        public static bool Active{get;private set;}
        private const string Folder="E:/UNGA-BUNGA-45001/Revision3/Films";
        private System.Diagnostics.Process encoder;private int frames;private string clip;private bool finished;
        private CampaignRuntime campaign;private Keyboard keyboard;private FilmAudioCapture audioCapture;private bool captureFailed;
        private Transform[] mammothBones;private Quaternion[] mammothRest;private float mammothBoneDegrees;private Vector3 mammothStart;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]private static void Initialize()
        {if(!Requested||Application.isEditor)return;var go=new GameObject("Capture des films");DontDestroyOnLoad(go);go.AddComponent<FilmRecorder>();}
        private void Awake(){Active=true;Application.logMessageReceived+=(message,stack,type)=>{if(captureFailed||(type!=LogType.Error&&type!=LogType.Exception))return;captureFailed=true;Directory.CreateDirectory(Folder);File.AppendAllText(Folder+"/capture-errors.txt",message+"\n"+stack+"\n");Application.Quit(1);};UnityEngine.SceneManagement.SceneManager.sceneLoaded+=(scene,mode)=>{var c=FindFirstObjectByType<CampaignRuntime>();if(c!=null)c.resumeOnStart=false;};StartCoroutine(Timeout());}
        private IEnumerator Timeout(){yield return new WaitForSecondsRealtime(2400);if(!finished){File.AppendAllText(Folder+"/capture-errors.txt","Capture timeout\n");Application.Quit(1);}}
        private IEnumerator Start()
        {
            yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);campaign=FindFirstObjectByType<CampaignRuntime>();campaign.cinematicDirector.Skip();while(campaign.cinematicDirector.IsPlaying)yield return null;
            Directory.CreateDirectory(Folder);Time.captureFramerate=24;QualitySettings.vSyncCount=0;Application.targetFrameRate=24;
            var listener=FindFirstObjectByType<AudioListener>();audioCapture=listener.gameObject.AddComponent<FilmAudioCapture>();
            var selected=Environment.GetCommandLineArgs().FirstOrDefault(a=>a.StartsWith("-ungaClip="))?.Substring(10);
            foreach(var film in campaign.Data.cinematics.Where(f=>selected==null||selected==f.id))
            {
                int stage=film.id=="C02"?1:film.id=="C03"?2:film.id=="C06"?3:0;
                foreach(var building in campaign.State.buildings)building.value=stage;campaign.bindings.Apply(campaign.State,true);
                clip=film.id;frames=0;campaign.cinematicDirector.Play(film.id);
                if(clip=="C05"){var mammoth=campaign.GetComponent<CinematicStage>().mammoth;mammothStart=mammoth.position;mammothBones=mammoth.GetComponentsInChildren<SkinnedMeshRenderer>().SelectMany(r=>r.bones).Where(b=>b!=null).Distinct().ToArray();mammothRest=mammothBones.Select(b=>b.localRotation).ToArray();mammothBoneDegrees=0;}
                while(campaign.cinematicDirector.IsPlaying){yield return new WaitForEndOfFrame();if(campaign.cinematicDirector.IsPlaying)CaptureFrame();}
                CloseEncoder();
                if(clip=="C05"){File.AppendAllText(Folder+"/capture-receipt.txt","Mammoth bones="+mammothBones.Length+" animatedDegrees="+mammothBoneDegrees+"\n");if(mammothBoneDegrees<2){captureFailed=true;Application.Quit(1);yield break;}}
            }
            if(selected==null||selected=="Gameplay")yield return Gameplay();
            if(captureFailed)yield break;
            Time.captureFramerate=0;Active=false;finished=true;Application.Quit();
        }
        private void CaptureFrame()
        {
            var texture=ScreenCapture.CaptureScreenshotAsTexture();var bytes=texture.GetRawTextureData();
            if(clip=="C05"&&mammothBones!=null)for(int i=0;i<mammothBones.Length;i++)mammothBoneDegrees=Mathf.Max(mammothBoneDegrees,Quaternion.Angle(mammothRest[i],mammothBones[i].localRotation));
            if(encoder==null)
            {
                int channels=bytes.Length/(Screen.width*Screen.height);if(channels!=3&&channels!=4)throw new InvalidOperationException("Unexpected screenshot format: "+texture.format);
                audioCapture.Begin();
                encoder=new System.Diagnostics.Process();encoder.StartInfo.FileName=@"C:\Users\pihan\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe";
                encoder.StartInfo.Arguments="-y -v error -f rawvideo -pixel_format "+(channels==3?"rgb24":"rgba")+" -video_size "+Screen.width+"x"+Screen.height+" -framerate 24 -i pipe:0 -vf vflip -an -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart "+Folder+"/"+clip+"-render.mp4";
                encoder.StartInfo.UseShellExecute=false;encoder.StartInfo.RedirectStandardInput=true;encoder.StartInfo.CreateNoWindow=true;encoder.Start();
            }
            encoder.StandardInput.BaseStream.Write(bytes,0,bytes.Length);Destroy(texture);frames++;
        }
        private void CloseEncoder()
        {
            if(encoder==null)return;encoder.StandardInput.Close();encoder.WaitForExit();int exit=encoder.ExitCode;encoder.Dispose();encoder=null;
            if(exit!=0)throw new InvalidOperationException("Film encoding failed: "+clip);
            long samples=audioCapture.End(Folder+"/"+clip+".f32");
            if(samples>0)
            {
                var mux=new System.Diagnostics.Process();mux.StartInfo.FileName=@"C:\Users\pihan\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe";
                mux.StartInfo.Arguments="-y -v error -i "+Folder+"/"+clip+"-render.mp4 -f f32le -ar "+AudioSettings.outputSampleRate+" -ac "+audioCapture.Channels+" -i "+Folder+"/"+clip+".f32 -af apad -shortest -c:v copy -c:a aac -b:a 160k -movflags +faststart "+Folder+"/"+clip+".mp4";
                mux.StartInfo.UseShellExecute=false;mux.StartInfo.CreateNoWindow=true;mux.Start();mux.WaitForExit();if(mux.ExitCode!=0)throw new InvalidOperationException("Audio mux failed: "+clip);mux.Dispose();
            }
            else File.Copy(Folder+"/"+clip+"-render.mp4",Folder+"/"+clip+".mp4",true);
            File.AppendAllText(Folder+"/capture-receipt.txt",clip+" frames="+frames+" fps=24 seconds="+(frames/24f)+" real Unity screen capture; audio samples="+samples+" peak="+audioCapture.Peak+"\n");
        }
        private IEnumerator Gameplay()
        {
            Active=false;clip="Gameplay";frames=0;campaign.NewCampaign();campaign.cinematicDirector.Skip();while(campaign.cinematicDirector.IsPlaying)yield return null;
            keyboard=InputSystem.AddDevice<Keyboard>("Gameplay capture keyboard");keyboard.MakeCurrent();InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
            var player=campaign.bindings.player;var motor=player.GetComponent<ThirdPersonMotor>();var controller=player.GetComponent<CharacterController>();
            var mentor=campaign.bindings.Find("mathieu");var path=new NavMeshPath();bool valid=false;Vector3 spawn=player.position;controller.enabled=false;
            foreach(float radius in new[]{8f,10f,6f,12f})
            {
                foreach(var direction in new[]{Vector3.back,Vector3.right,Vector3.left,Vector3.forward})
                {
                    if(!NavMesh.SamplePosition(mentor.position+direction*radius,out var start,2,NavMesh.AllAreas)||!Clear(start.position))continue;
                    for(int angle=0;angle<8;angle++)
                    {
                        var p=mentor.position+Quaternion.Euler(0,angle*45,0)*Vector3.forward*1.4f;
                        if(!NavMesh.SamplePosition(p,out var goal,.6f,NavMesh.AllAreas)||!Clear(goal.position))continue;
                        if(!NavMesh.CalculatePath(start.position,goal.position,NavMesh.AllAreas,path)||path.status!=NavMeshPathStatus.PathComplete)continue;
                        float length=0;for(int i=1;i<path.corners.Length;i++)length+=Vector3.Distance(path.corners[i-1],path.corners[i]);
                        if(length<6||length>22)continue;spawn=start.position;valid=true;break;
                    }
                    if(valid)break;
                }
                if(valid)break;
            }
            player.position=spawn+Vector3.up*.06f;controller.enabled=true;
            if(!valid){captureFailed=true;File.AppendAllText(Folder+"/capture-errors.txt","No clear connected gameplay route\n");Application.Quit(1);yield break;}
            motor.FaceDirection(path.corners[1]-path.corners[0]);
            int corner=1;bool interacted=false,continued=false;float distance=0;Vector3 previous=player.position;
            for(int frame=0;frame<24*32;frame++)
            {
                float t=frame/24f;keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState());
                if(t>2&&t<16&&valid&&corner<path.corners.Length)
                {
                    var direction=path.corners[corner]-player.position;direction.y=0;if(direction.magnitude<.35f)corner++;else{motor.FaceDirection(direction);InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.W));}
                }
                var map=campaign.GetComponent<CampaignMap>();if(frame==24*16)map.Open();if(frame==24*20)map.Close();
                if(t>=21&&!interacted){campaign.GetComponent<WorldInteraction>().Execute("M_I_TUTORIEL_1");interacted=campaign.Dialogue!=null;}
                if(t>=27&&!continued){var button=campaign.GetComponentsInChildren<UnityEngine.UI.Button>().FirstOrDefault(b=>b.GetComponentInChildren<TMPro.TMP_Text>()?.text=="Continuer");if(button!=null){button.onClick.Invoke();continued=true;}}
                yield return new WaitForEndOfFrame();distance+=Vector3.Distance(previous,player.position);previous=player.position;CaptureFrame();
                if(frame%24==0)File.AppendAllText(Folder+"/gameplay-diagnostic.txt",$"t={t:F1} input={motor.LastMovementInput} W={keyboard.wKey.isPressed} current={Keyboard.current?.name} enabled={motor.enabled} modal={campaign.IsModal} busy={campaign.IsBusy} dt={Time.deltaTime} velocity={motor.ActualVelocity} collision={motor.LastCollisionFlags} corner={corner}/{path.corners.Length} pos={player.position} mentor={mentor.position} distance={distance:F2}\n");
            }
            CloseEncoder();File.AppendAllText(Folder+"/capture-receipt.txt","Gameplay path="+valid+" movement="+distance+" grounded="+controller.isGrounded+" dialogue="+interacted+" continued="+continued+"\n");InputSystem.RemoveDevice(keyboard);
            if(distance<2||!interacted||!continued){captureFailed=true;File.AppendAllText(Folder+"/capture-errors.txt","Gameplay capture failed its movement or dialogue checks\n");Application.Quit(1);}
        }
        private static bool Clear(Vector3 p)=>!Physics.CheckCapsule(p+Vector3.up*.5f,p+Vector3.up*1.5f,.32f,~0,QueryTriggerInteraction.Ignore);
        private void OnDestroy(){if(encoder!=null){try{encoder.StandardInput.Close();}catch{}encoder.Dispose();}}
    }
}


#endif
