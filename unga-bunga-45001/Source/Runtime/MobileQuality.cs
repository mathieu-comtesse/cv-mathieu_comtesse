using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
    public sealed class MobileQuality:MonoBehaviour
    {
        public int AppliedProfile{get;private set;}=-1;public float AverageFrameMilliseconds{get;private set;}
        float elapsed,frames;int requested=-1;
        public void Apply()
        {
            var preferences=GetComponent<UISettingsController>().preferences;int profile=preferences.graphicsProfile;
            if(profile==3)profile=SystemInfo.systemMemorySize>0&&SystemInfo.systemMemorySize<4000?0:MobileControls.TouchActive?1:2;
            AppliedProfile=profile;requested=preferences.graphicsProfile;
            var camera=GetComponent<CampaignRuntime>().bindings.gameplayCamera;camera.farClipPlane=profile==0?75:profile==1?110:180;
            QualitySettings.shadowDistance=profile==0?14:profile==1?28:50;QualitySettings.shadowResolution=profile==0?ShadowResolution.Low:profile==1?ShadowResolution.Medium:ShadowResolution.High;
            foreach(var terrain in Terrain.activeTerrains){terrain.detailObjectDistance=profile==0?22:profile==1?38:65;terrain.detailObjectDensity=profile==0?.25f:profile==1?.5f:.8f;terrain.treeDistance=profile==0?75:profile==1?110:180;}
            if(GraphicsSettings.currentRenderPipeline is UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset urp)urp.renderScale=profile==0?.7f:profile==1?.85f:1;
            Application.targetFrameRate=Application.platform==RuntimePlatform.WebGLPlayer?-1:profile<2?30:60;
        }
        void Update(){if(!MobileControls.TouchActive)return;if(requested!=GetComponent<UISettingsController>().preferences.graphicsProfile)Apply();elapsed+=Time.unscaledDeltaTime;frames++;if(elapsed>=5){AverageFrameMilliseconds=elapsed/frames*1000;elapsed=frames=0;}}
    }
}
