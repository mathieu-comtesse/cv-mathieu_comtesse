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
    [InitializeOnLoad]public static class InterfacePortraitV4
    {
        const string Key="UNGA.InterfacePortraitV4";static int frame;static bool ready;
        static InterfacePortraitV4(){if(SessionState.GetBool(Key,false))EditorApplication.update+=Tick;}
        public static void Run(){EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>().resumeOnStart=false;SessionState.SetBool(Key,true);SessionState.SetFloat(Key+"Deadline",(float)EditorApplication.timeSinceStartup+180);EditorApplication.update-=Tick;EditorApplication.update+=Tick;EditorApplication.isPlaying=true;}
        static void Tick()
        {
            if(!SessionState.GetBool(Key,false))return;if(EditorApplication.timeSinceStartup>SessionState.GetFloat(Key+"Deadline",0)){Finish(1);return;}if(!EditorApplication.isPlaying)return;EditorApplication.QueuePlayerLoopUpdate();
            try
            {
                var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();if(campaign?.State==null)return;
                if(!ready){campaign.cinematicDirector.Skip();if(campaign.cinematicDirector.IsPlaying)return;ready=true;frame=Time.frameCount;return;}if(Time.frameCount-frame<10)return;
                var actor=campaign.bindings.characters.First(a=>a.id==campaign.Data.playerCharacterId);var skin=actor.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>().First(r=>r.bones.Length>20);var mesh=new Mesh();skin.BakeMesh(mesh);
                var model=new GameObject("Portrait natif isolé");model.transform.SetPositionAndRotation(new Vector3(10000,0,10000),skin.transform.rotation);model.transform.localScale=skin.transform.lossyScale;model.AddComponent<MeshFilter>().sharedMesh=mesh;model.AddComponent<MeshRenderer>().sharedMaterial=skin.sharedMaterial;
                var localHead=skin.transform.InverseTransformPoint(actor.animator.GetBoneTransform(HumanBodyBones.Head).position);var center=model.transform.TransformPoint(localHead)+Vector3.up*.01f;
                var cameraObject=new GameObject("Caméra portrait");var camera=cameraObject.AddComponent<Camera>();camera.enabled=false;camera.fieldOfView=30;camera.nearClipPlane=.03f;camera.farClipPlane=8;camera.transform.position=center+actor.meshyActor.transform.forward*.92f;camera.transform.LookAt(center);
                var hd=cameraObject.AddComponent<HDAdditionalCameraData>();hd.clearColorMode=HDAdditionalCameraData.ClearColorMode.Color;hd.backgroundColorHDR=new Color(.11f,.075f,.065f,1);
                var lightObject=new GameObject("Lumière du portrait");var light=lightObject.AddComponent<Light>();light.type=LightType.Directional;light.intensity=90000;light.color=new Color(1,.91f,.79f);light.transform.rotation=Quaternion.LookRotation((center-camera.transform.position).normalized+Vector3.down*.3f);
                var target=new RenderTexture(384,384,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);target.Create();RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=target});var prior=RenderTexture.active;RenderTexture.active=target;var image=new Texture2D(384,384,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,384,384),0,0);image.Apply();File.WriteAllBytes(InterfaceAssetsV4.Folder+"/Dylan-portrait.png",image.EncodeToPNG());File.WriteAllText("E:/UNGA-BUNGA-45001/Revision4/portrait-validation.txt","Rendered from actual player binding "+actor.id+" native mesh "+skin.sharedMesh.name+" native Avatar "+actor.animator.avatar.name);RenderTexture.active=prior;
                Finish(0);
            }catch(Exception e){File.WriteAllText("E:/UNGA-BUNGA-45001/Revision4/portrait-error.txt",e.ToString());Finish(1);}
        }
        static void Finish(int code){SessionState.SetBool(Key,false);EditorApplication.update-=Tick;EditorApplication.Exit(code);}
    }
}
