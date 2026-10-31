using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class RecoveredRenderIsolation
    {
        public static void Run()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var binding=UnityEngine.Object.FindFirstObjectByType<SceneBindings>();
            foreach(var volume in UnityEngine.Object.FindObjectsByType<Volume>(FindObjectsSortMode.None))volume.enabled=false;
            foreach(var pass in UnityEngine.Object.FindObjectsByType<CustomPassVolume>(FindObjectsSortMode.None))pass.enabled=false;
            var profile=ScriptableObject.CreateInstance<VolumeProfile>();
            var exposure=profile.Add<Exposure>(true);exposure.mode.Override(ExposureMode.Fixed);exposure.fixedExposure.Override(12);
            var environment=profile.Add<VisualEnvironment>(true);environment.skyType.Override((int)SkyType.Gradient);
            var sky=profile.Add<GradientSky>(true);sky.top.Override(new Color(.25f,.4f,.6f));sky.middle.Override(new Color(.5f,.6f,.7f));sky.bottom.Override(new Color(.25f,.3f,.3f));
            var global=new GameObject("Temporary render diagnostic exposure").AddComponent<Volume>();global.isGlobal=true;global.priority=10000;global.sharedProfile=profile;
            var camera=new GameObject("Temporary genuine HDRP camera").AddComponent<Camera>();camera.gameObject.AddComponent<HDAdditionalCameraData>();
            camera.transform.position=binding.player.position+new Vector3(-6,4,-7);camera.transform.LookAt(binding.player.position+Vector3.up);camera.cullingMask=-1;camera.nearClipPlane=.1f;camera.farClipPlane=1000;
            var target=new RenderTexture(1600,900,24,RenderTextureFormat.ARGB32);target.Create();var request=new RenderPipeline.StandardRequest{destination=target};
            if(!RenderPipeline.SupportsRenderRequest(camera,request))throw new InvalidOperationException("HDRP request unsupported");
            RenderPipeline.SubmitRenderRequest(camera,request);RenderPipeline.SubmitRenderRequest(camera,request);
            RenderTexture.active=target;var image=new Texture2D(1600,900,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,1600,900),0,0);image.Apply();
            Directory.CreateDirectory("E:/UNGA-BUNGA-45001/Preview");File.WriteAllBytes("E:/UNGA-BUNGA-45001/Preview/Unity-Render-Isolation.png",image.EncodeToPNG());
            var description="Diagnostic only: same recovered scene, fresh HDRP camera, source volumes/custom passes temporarily disabled, fixed exposure 12; no changes saved.\n"+
                "Pipeline: "+RenderPipelineManager.currentPipeline?.GetType().FullName+"\nSource renderers: "+UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None).Length+"\n"+
                string.Join("\n",UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Where(l=>l.type==LightType.Directional).Select(l=>l.name+" intensity="+l.intensity+" enabled="+l.enabled));
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-render-isolation.txt",description);
            RenderTexture.active=null;target.Release();
        }
    }
}
