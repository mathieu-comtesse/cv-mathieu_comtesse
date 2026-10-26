#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Unity.Profiling;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.AI;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
namespace UngaBunga45001
{
    // Opt-in development measurement. Never included in a release player.
    public sealed class DevelopmentProbeV14 : MonoBehaviour
    {
        public string label="baseline";public float sampleSeconds=15;public bool walkFiveMinutes;public bool lowProfile;
        [Serializable]sealed class Metric{public string name,unit;public bool available;public double mean,p95,p99,maximum;}
        [Serializable]sealed class Phase{public string name;public int frames;public float seconds,distance;public int over100ms,over250ms;public Metric[] metrics;}
        [Serializable]sealed class Report{public string label,unity,gpu,cpu,platform,scope="Editor measurement; not physical phone certification";public int width,height;public Phase[] phases;public string[] errors;}
        readonly List<Phase> phases=new List<Phase>();readonly List<string> errors=new List<string>();
        readonly List<(string name,string unit,ProfilerRecorder recorder,List<double> values)> probes=new List<(string,string,ProfilerRecorder,List<double>)>();
        CampaignRuntime c;AdventureMenus menus;RenderTexture output;Canvas hud;RenderMode previousMode;Camera previousCamera;bool walking;Keyboard keyboard,previousKeyboard;Vector3[] route=Array.Empty<Vector3>();int corner,targetIndex;float nextPlan;
        readonly string[] walkTargets={"grand_menhir","stockage","atelier_silex","habitations"};
        InputSettings.BackgroundBehavior oldBackground;bool inputChanged;Vector3 lastWalkPosition;float stuck;
        #if UNITY_EDITOR
        InputSettings.EditorInputBehaviorInPlayMode oldEditorInput;
        #endif
        void Probe(ProfilerCategory cat,string name,string unit){var r=ProfilerRecorder.StartNew(cat,name,1);probes.Add((name,unit,r,new List<double>()));}
        IEnumerator Start()
        {
            c=GetComponent<CampaignRuntime>();if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("An isolated test save is required");
            Application.logMessageReceived+=Log;Application.runInBackground=true;menus=GetComponent<AdventureMenus>();
            c.NewCampaign();c.cinematicDirector.Skip();yield return new WaitForSecondsRealtime(1);c.CloseQuest();c.SetPause(false);
            c.DebugDisableActionCache=label.StartsWith("baseline-equivalent");if(lowProfile){c.GetComponent<UISettingsController>().preferences.graphicsProfile=0;c.GetComponent<MobileQuality>().Apply();}QualitySettings.vSyncCount=0;Application.targetFrameRate=-1;
            output=new RenderTexture(1280,720,24);output.Create();hud=c.GetComponent<CampaignHud>().Canvas;previousMode=hud.renderMode;previousCamera=hud.worldCamera;hud.renderMode=RenderMode.ScreenSpaceCamera;hud.planeDistance=.5f;
            Probe(ProfilerCategory.Internal,"Main Thread","ms");Probe(ProfilerCategory.Internal,"Render Thread","ms");
            Probe(ProfilerCategory.Scripts,"THALEOLITHIC.Interactions","ms");
            Probe(ProfilerCategory.Memory,"GC Allocated In Frame","bytes");Probe(ProfilerCategory.Memory,"Total Used Memory","bytes");
            Probe(ProfilerCategory.Render,"Draw Calls Count","count");Probe(ProfilerCategory.Render,"Triangles Count","count");Probe(ProfilerCategory.Render,"SetPass Calls Count","count");
            Probe(ProfilerCategory.Animation,"Animator.Update","ms");Probe(ProfilerCategory.Physics,"Physics.Simulate","ms");
            yield return Sample("village-idle",sampleSeconds);
            c.OpenActionMenu("mathieu");yield return Sample("npc-interaction",sampleSeconds);c.Choose("interaction:cancel");
            menus.Open("Inventaire");yield return Sample("inventory",sampleSeconds);menus.Close();
            c.cinematicDirector.Play("C01");yield return Sample("opening-film",sampleSeconds);c.cinematicDirector.Skip();yield return new WaitForSecondsRealtime(1);
            if(walkFiveMinutes)yield return Sample("village-five-minutes",300);
            var report=new Report{label=label,unity=Application.unityVersion,gpu=SystemInfo.graphicsDeviceName,cpu=SystemInfo.processorType,platform=Application.platform.ToString(),width=1280,height=720,phases=phases.ToArray(),errors=errors.ToArray()};
            File.WriteAllText("E:/UNGA-BUNGA-45001/Revision14/"+label+"-performance.json",JsonUtility.ToJson(report,true));Destroy(this);
        }
        IEnumerator Sample(string name,float duration)
        {
            walking=name=="village-five-minutes";if(walking){previousKeyboard=Keyboard.current;oldBackground=InputSystem.settings.backgroundBehavior;InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;inputChanged=true;
            #if UNITY_EDITOR
            oldEditorInput=InputSystem.settings.editorInputBehaviorInPlayMode;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
            #endif
            keyboard=InputSystem.AddDevice<Keyboard>("THALEOLITHIC development walk");keyboard.MakeCurrent();lastWalkPosition=c.bindings.player.position;}
            foreach(var p in probes)p.values.Clear();var frames=new List<double>();float until=Time.realtimeSinceStartup+2;while(Time.realtimeSinceStartup<until)yield return null;
            float begin=Time.realtimeSinceStartup,distance=0;var previous=c.bindings.player.position;int n=0;until=begin+duration;
            while(Time.realtimeSinceStartup<until)
            {
                yield return null;n++;frames.Add(Time.unscaledDeltaTime*1000);distance+=Vector3.Distance(previous,c.bindings.player.position);previous=c.bindings.player.position;
                foreach(var p in probes)if(p.recorder.Valid&&p.recorder.Count>0)p.values.Add(p.recorder.LastValue*(p.unit=="ms"?1e-6:1));
            }
            Metric M(string metric,string unit,bool valid,List<double> v){v.Sort();return new Metric{name=metric,unit=unit,available=valid&&v.Count>0,maximum=v.Count>0?v[v.Count-1]:0,p99=v.Count>0?v[Math.Min(v.Count-1,(int)(v.Count*.99))]:0,mean=v.Count>0?v.Average():0,p95=v.Count>0?v[Math.Min(v.Count-1,(int)(v.Count*.95))]:0};}
            var metrics=probes.Select(p=>M(p.name,p.unit,p.recorder.Valid,p.values)).ToList();metrics.Insert(0,M("frame","ms",true,frames));
            phases.Add(new Phase{name=name,frames=n,seconds=Time.realtimeSinceStartup-begin,distance=distance,over100ms=frames.Count(x=>x>100),over250ms=frames.Count(x=>x>250),metrics=metrics.ToArray()});
            if(walking){if(distance<30)errors.Add("Five-minute walking scenario invalid: travelled under 30 m");walking=false;RestoreInput();}
        }
        void Update()
        {
            if(!walking||keyboard==null||c.IsModal||c.IsBusy)return;var position=c.bindings.player.position;
            if((position-lastWalkPosition).sqrMagnitude<.000001f)stuck+=Time.deltaTime;else stuck=0;lastWalkPosition=position;
            if(stuck>2){route=Array.Empty<Vector3>();corner=0;nextPlan=0;stuck=0;}
            if(corner>=route.Length&&Time.time>=nextPlan)
            {nextPlan=Time.time+1;var target=c.bindings.Find(walkTargets[targetIndex++%walkTargets.Length]);if(target!=null&&VillageNavigation.Plan(position,target.position,c.bindings.player,out var path,6)){route=path.corners;corner=1;}}
            while(corner<route.Length&&Vector3.Distance(new Vector3(position.x,0,position.z),new Vector3(route[corner].x,0,route[corner].z))<.65f)corner++;
            if(corner<route.Length){c.bindings.player.GetComponent<ThirdPersonMotor>().FaceDirection(route[corner]-position);InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.W));}else InputSystem.QueueStateEvent(keyboard,new KeyboardState());
        }
        void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
        void LateUpdate(){if(output==null||c==null)return;var camera=c.cinematicDirector.IsPlaying?c.cinematicDirector.cinematicCamera:c.bindings.gameplayCamera;camera.targetTexture=output;hud.worldCamera=camera;Canvas.ForceUpdateCanvases();RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=output});}
        void RestoreInput(){if(keyboard!=null){InputSystem.RemoveDevice(keyboard);keyboard=null;previousKeyboard?.MakeCurrent();}if(!inputChanged)return;InputSystem.settings.backgroundBehavior=oldBackground;
        #if UNITY_EDITOR
        InputSystem.settings.editorInputBehaviorInPlayMode=oldEditorInput;
        #endif
        inputChanged=false;}
        void OnDestroy(){Application.logMessageReceived-=Log;RestoreInput();foreach(var p in probes)if(p.recorder.Valid)p.recorder.Dispose();if(hud!=null){hud.renderMode=previousMode;hud.worldCamera=previousCamera;}if(c!=null){c.DebugDisableActionCache=false;c.bindings.gameplayCamera.targetTexture=null;c.cinematicDirector.cinematicCamera.targetTexture=null;}if(output!=null){output.Release();Destroy(output);}}
    }
}
#endif
