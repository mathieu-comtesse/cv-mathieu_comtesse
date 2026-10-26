using UnityEngine;
using UnityEngine.Rendering;
#if !UNGA_WEB_RENDERER
using UnityEngine.Rendering.HighDefinition;
#endif
namespace UngaBunga45001
{
    public static class RenderBackend
    {
        public static bool HDRP
        {
            get{
                #if UNGA_WEB_RENDERER
                return false;
                #else
                return GraphicsSettings.currentRenderPipeline is HDRenderPipelineAsset;
                #endif
            }
        }
        public static void PortraitCamera(Camera camera)
        {
            camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(0,0,0,0);
            #if !UNGA_WEB_RENDERER
            if(HDRP){var hd=camera.gameObject.AddComponent<HDAdditionalCameraData>();hd.clearColorMode=HDAdditionalCameraData.ClearColorMode.Color;hd.backgroundColorHDR=new Color(0,0,0,0);}
            #endif
        }
        public static void PortraitLight(Light light)
        {
            #if !UNGA_WEB_RENDERER
            if(HDRP){light.gameObject.AddComponent<HDAdditionalLightData>();light.lightUnit=LightUnit.Candela;light.intensity=150000;return;}
            #endif
            light.intensity=1.2f;
        }
        public static void FireLight(Light light)
        {
            #if !UNGA_WEB_RENDERER
            if(HDRP)light.gameObject.AddComponent<HDAdditionalLightData>();
            #endif
            light.lightUnit=LightUnit.Lumen;
        }
        public static Material SilhouetteMaterial()
        {
            var shader=Shader.Find(HDRP?"HDRP/Unlit":"Universal Render Pipeline/Unlit");var material=new Material(shader);
            if(material.HasProperty("_BaseColor"))material.SetColor("_BaseColor",Color.white);if(material.HasProperty("_UnlitColor"))material.SetColor("_UnlitColor",Color.white);
            if(HDRP){material.SetColor("_EmissiveColor",Color.white*1000);material.SetFloat("_EmissiveExposureWeight",0);}return material;
        }
    }
}
