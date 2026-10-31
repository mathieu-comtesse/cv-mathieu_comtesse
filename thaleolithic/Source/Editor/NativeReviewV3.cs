using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEditor;
using UnityEditor.SceneManagement;
namespace UngaBunga45001.Editor
{
    [InitializeOnLoad] public static class NativeReviewV3
    {
        const string Key="UNGA.NativeReviewV3";
        static int phase,frame;static CampaignRuntime campaign;static Camera camera;static double deadline;
        static NativeReviewV3(){if(SessionState.GetBool(Key,false))EditorApplication.update+=Tick;}
        public static void Run()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>().resumeOnStart=false;
            SessionState.SetBool(Key,true);SessionState.SetFloat(Key+"Deadline",(float)EditorApplication.timeSinceStartup+180);EditorApplication.update-=Tick;EditorApplication.update+=Tick;EditorApplication.isPlaying=true;
        }
        static void Tick()
        {
            if(!SessionState.GetBool(Key,false))return;
            if(EditorApplication.timeSinceStartup>SessionState.GetFloat(Key+"Deadline",0)){Finish(1);return;}
            if(!EditorApplication.isPlaying)return;EditorApplication.QueuePlayerLoopUpdate();
            try
            {
                if(phase==0)
                {
                    campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();if(campaign==null||campaign.State==null)return;
                    campaign.cinematicDirector.Skip();if(campaign.cinematicDirector.IsPlaying)return;
                    camera=campaign.bindings.gameplayCamera;camera.enabled=true;
                    campaign.SetPause(true);campaign.bindings.player.GetComponent<ThirdPersonMotor>().enabled=false;
                    foreach(var canvas in UnityEngine.Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None))canvas.enabled=false;
                    foreach(var r in campaign.bindings.characters.SelectMany(a=>a.meshyActor.GetComponentsInChildren<Renderer>()))r.forceRenderingOff=false;
                    frame=Time.frameCount;phase=1;return;
                }
                if(Time.frameCount-frame<8)return;frame=Time.frameCount;
                if(phase==1){File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/anatomy-runtime.txt",campaign.bindings.characters.Select(AnatomyProbe.Measure));PoseIsolation.Run(campaign);}
                string name;Vector3 center,offset;
                switch(phase)
                {
                    case 1:name="Village";center=new Vector3(350.92f,0,281.88f);center.y=VillageLife.Ground(center)+1;offset=new Vector3(1,25,-22);break;
                    case 2:name="Dylan";center=campaign.bindings.Find("dylan").position+Vector3.up*1.05f;offset=campaign.bindings.characters.First(a=>a.id=="dylan").meshyActor.transform.rotation*new Vector3(1,.35f,3.3f);break;
                    case 3:name="Mammoth";center=campaign.GetComponent<CinematicStage>().mammoth.position+Vector3.up*2.4f;offset=new Vector3(-9,3,-12);break;
                    case 4:name="Peaux";center=new Vector3(362.92f,0,289.88f);center.y=VillageLife.Ground(center)+1.5f;offset=new Vector3(9,5,-10);break;
                    case 5:name="Ateliers";center=campaign.bindings.Find("atelier_silex").position+Vector3.up;offset=new Vector3(6,7,-10);break;
                    case 6:name="Vegetation";center=new Vector3(350.92f,0,259f);center.y=VillageLife.Ground(center)+1;offset=new Vector3(5,3,-7);break;
                    default:Finish(0);return;
                }
                camera.transform.SetPositionAndRotation(center+offset,Quaternion.LookRotation(-offset));camera.fieldOfView=50;Capture(camera,name);phase++;
            }
            catch(Exception e){File.WriteAllText("E:/UNGA-BUNGA-45001/Revision3/review-error.txt",e.ToString());Finish(1);}
        }
        static void Capture(Camera camera,string name)
        {
            var target=new RenderTexture(1440,900,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);target.Create();
            RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=target});
            var previous=RenderTexture.active;RenderTexture.active=target;var image=new Texture2D(1440,900,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,1440,900),0,0);image.Apply();
            Directory.CreateDirectory("E:/UNGA-BUNGA-45001/Revision3/Review");File.WriteAllBytes("E:/UNGA-BUNGA-45001/Revision3/Review/"+name+".png",image.EncodeToPNG());RenderTexture.active=previous;UnityEngine.Object.DestroyImmediate(image);target.Release();UnityEngine.Object.DestroyImmediate(target);
            if(name=="Dylan")
            {
                float aspect=camera.aspect;camera.aspect=1.6f;var notes=new System.Collections.Generic.List<string>();
                foreach(var v in new[]{new Vector3(.35f,.46f),new Vector3(.28f,.45f),new Vector3(.67f,.44f)})
                {
                    var ray=camera.ViewportPointToRay(v);
                    foreach(var r in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.enabled&&r.bounds.IntersectRay(ray)).OrderBy(r=>(r.bounds.center-camera.transform.position).sqrMagnitude).Take(10))notes.Add("ray="+v+" "+NativeRepairV3.Hierarchy(r.transform)+" materials="+string.Join(",",r.sharedMaterials.Select(m=>m!=null?m.name:"missing")));
                }
                File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/white-object-rays.txt",notes);camera.aspect=aspect;
            }
        }
        static void Finish(int exit){SessionState.SetBool(Key,false);EditorApplication.update-=Tick;EditorApplication.Exit(exit);}
    }
}
