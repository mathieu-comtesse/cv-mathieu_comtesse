using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001.Editor
{
    [InitializeOnLoad]public static class FireReviewV5
    {
        const string Key="UNGA.FireReviewV5";static int frame;static bool ready;
        static FireReviewV5(){if(SessionState.GetBool(Key,false))EditorApplication.update+=Tick;}
        public static void Run(){EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>().resumeOnStart=false;SessionState.SetBool(Key,true);SessionState.SetFloat(Key+"Deadline",(float)EditorApplication.timeSinceStartup+150);EditorApplication.update-=Tick;EditorApplication.update+=Tick;EditorApplication.isPlaying=true;}
        static void Tick()
        {
            if(!SessionState.GetBool(Key,false))return;if(EditorApplication.timeSinceStartup>SessionState.GetFloat(Key+"Deadline",0)){Finish(1);return;}if(!EditorApplication.isPlaying)return;EditorApplication.QueuePlayerLoopUpdate();
            try{var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();if(campaign?.State==null)return;
                if(!ready){campaign.cinematicDirector.Skip();if(campaign.cinematicDirector.IsPlaying)return;ready=true;frame=Time.frameCount;return;}if(Time.frameCount-frame<30)return;
                var fires=UnityEngine.Object.FindObjectsByType<NativeFire>(FindObjectsSortMode.None);var fire=fires.OrderByDescending(f=>f.transform.position.x).First();
                var camera=campaign.bindings.gameplayCamera;foreach(var b in camera.GetComponents<MonoBehaviour>())if(b.GetType().Name!="HDAdditionalCameraData")b.enabled=false;
                var look=fire.transform.position+Vector3.up*.4f;Vector3 best=look+new Vector3(0,1.2f,-3.1f);float longest=0;
                for(int a=0;a<24;a++){var delta=Quaternion.Euler(0,a*15,0)*new Vector3(0,.75f,-2.8f);float clear=delta.magnitude;foreach(var hit in Physics.SphereCastAll(look,.12f,delta.normalized,delta.magnitude,~0,QueryTriggerInteraction.Ignore))if(hit.distance>.25f)clear=Mathf.Min(clear,hit.distance);if(clear>longest){longest=clear;best=look+delta.normalized*Mathf.Min(delta.magnitude,clear-.15f);}}
                camera.transform.position=best;camera.transform.LookAt(look);camera.fieldOfView=48;
                var target=new RenderTexture(1280,720,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);target.Create();RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=target});var old=RenderTexture.active;RenderTexture.active=target;var image=new Texture2D(1280,720,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,1280,720),0,0);image.Apply();File.WriteAllBytes("E:/UNGA-BUNGA-45001/Revision5/Review/Feu-allume.png",image.EncodeToPNG());RenderTexture.active=old;
                File.WriteAllText("E:/UNGA-BUNGA-45001/Revision5/fire-validation.txt","fires="+fires.Length+" animated="+fires.All(f=>f.AnimatedFlames==7)+" lights="+fires.All(f=>f.WarmLight!=null&&f.WarmLight.enabled&&f.WarmLight.intensity>0)+" crackle="+fires.All(f=>f.GetComponent<AudioSource>().isPlaying)+" frame="+Time.frameCount);Finish(0);
            }catch(Exception e){File.WriteAllText("E:/UNGA-BUNGA-45001/Revision5/fire-error.txt",e.ToString());Finish(1);}
        }
        static void Finish(int code){SessionState.SetBool(Key,false);EditorApplication.update-=Tick;EditorApplication.Exit(code);}
    }
}
