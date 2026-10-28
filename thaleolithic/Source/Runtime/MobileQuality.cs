using System;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
    public sealed class MobileQuality:MonoBehaviour
    {
        public int AppliedProfile{get;private set;}=-1;public float AverageFrameMilliseconds{get;private set;}
        public float RenderScale{get;private set;}=1;public int SlowFrames{get;private set;}
        UISettingsController settings;CampaignRuntime campaign;
        float elapsed,frames,nextAdjustment,healthySince;int requested=-1,sampleCount;
        readonly float[] samples=new float[120];
        public static int AutomaticProfile(string gpu,int graphicsMemory,int systemMemory,bool touch)
        {
            string name=(gpu??"").ToLowerInvariant();
            if(name.Contains("610m")||name.Contains("620m")||name.Contains("radeon(tm) graphics")||name.Contains("radeon graphics")||name.Contains("vega")||name.Contains("intel(r) uhd")||name.Contains("iris")||name.Contains("intel(r) hd"))return 0;
            if(systemMemory>0&&systemMemory<=8192)return 0;
            if(touch||graphicsMemory<=0||graphicsMemory<4096)return 1;
            return 2;
        }
        void Ensure(){if(settings==null)settings=GetComponent<UISettingsController>();if(campaign==null)campaign=GetComponent<CampaignRuntime>();}
        public void Apply()
        {
            Ensure();int profile=Mathf.Clamp(settings.preferences.graphicsProfile,0,3);requested=profile;
            if(profile==3)profile=AutomaticProfile(SystemInfo.graphicsDeviceName,SystemInfo.graphicsMemorySize,SystemInfo.systemMemorySize,MobileControls.TouchActive);
            AppliedProfile=profile;sampleCount=0;nextAdjustment=Time.unscaledTime+8;healthySince=0;
            float far=profile==0?75:profile==1?110:180;campaign.bindings.gameplayCamera.farClipPlane=far;
            if(campaign.cinematicDirector?.cinematicCamera!=null)campaign.cinematicDirector.cinematicCamera.farClipPlane=far;
            QualitySettings.shadowDistance=profile==0?12:profile==1?25:50;QualitySettings.shadowResolution=profile==0?ShadowResolution.Low:profile==1?ShadowResolution.Medium:ShadowResolution.High;
            foreach(var terrain in Terrain.activeTerrains){terrain.heightmapPixelError=profile==0?16:profile==1?10:5;terrain.detailObjectDistance=profile==0?18:profile==1?35:65;terrain.detailObjectDensity=profile==0?.18f:profile==1?.45f:.8f;terrain.treeDistance=profile==0?65:profile==1?100:180;}
            SetScale(profile==0?.85f:profile==1?.9f:1);
            if(GraphicsSettings.currentRenderPipeline is UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset urp)
            {urp.msaaSampleCount=profile==0?1:2;urp.shadowDistance=Mathf.Min(40,QualitySettings.shadowDistance);urp.shadowCascadeCount=profile==0?1:2;urp.mainLightShadowmapResolution=profile==0?512:profile==1?1024:2048;urp.maxAdditionalLightsCount=profile==0?2:4;}
            Application.targetFrameRate=profile<2?30:60;
            foreach(var portrait in GetComponents<DialoguePortraitPresenter>())portrait.ApplyQuality(profile);
        }
        void SetScale(float value){RenderScale=value;if(GraphicsSettings.currentRenderPipeline is UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset urp)urp.renderScale=value;}
        void Start(){Apply();}
        void Update()
        {
            Ensure();if(requested!=settings.preferences.graphicsProfile)Apply();float dt=Time.unscaledDeltaTime;elapsed+=dt;frames++;if(dt>.1f)SlowFrames++;
            if(elapsed>=5){AverageFrameMilliseconds=elapsed/frames*1000;elapsed=frames=0;}
            // Automatic resolution uses a full warm window; background tabs are not GPU measurements.
            if(requested!=3||!Application.isFocused||Time.unscaledTime<nextAdjustment||dt>.25f)return;
            samples[sampleCount++]=dt*1000;if(sampleCount<samples.Length)return;Array.Sort(samples);float p90=samples[(int)(samples.Length*.9f)];sampleCount=0;nextAdjustment=Time.unscaledTime+4;
            float ceiling=AppliedProfile==0?.85f:AppliedProfile==1?.9f:1;
            if(p90>(AppliedProfile<2?42:23)){SetScale(Mathf.Max(.55f,RenderScale-.08f));healthySince=0;}
            else if(p90<(AppliedProfile<2?35:18)){if(healthySince==0)healthySince=Time.unscaledTime;if(Time.unscaledTime-healthySince>=24){SetScale(Mathf.Min(ceiling,RenderScale+.04f));healthySince=Time.unscaledTime;}}
            else healthySince=0;
        }
    }
}
