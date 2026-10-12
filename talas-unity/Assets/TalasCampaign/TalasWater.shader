Shader "Talas/Eau animee"
{
 Properties { _BaseColor("Eau",Color)=(0.025,0.12,0.16,1) }
 SubShader
 {
  Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" }
  Pass
  {
   Tags { "LightMode"="UniversalForward" }
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
   struct A {float4 p:POSITION;float3 n:NORMAL;};
   struct V {float4 p:SV_POSITION;float3 w:TEXCOORD0;float fog:TEXCOORD1;};
   CBUFFER_START(UnityPerMaterial) float4 _BaseColor; CBUFFER_END
   V vert(A v){V o;o.w=TransformObjectToWorld(v.p.xyz);o.p=TransformWorldToHClip(o.w);o.fog=ComputeFogFactor(o.p.z);return o;}
   half4 frag(V i):SV_Target
   {
    float t=_Time.y;float2 p=i.w.xz;
    float dx=cos(p.x*1.4+t*.7)*.055+cos(p.x*3.1+p.y*1.2-t)*.025;
    float dz=sin(p.y*1.9-t*.5)*.045+sin(p.x*3.1+p.y*1.2-t)*.025;
    float3 n=normalize(float3(dx,1,dz)),v=normalize(GetCameraPositionWS()-i.w);
    Light l=GetMainLight();float fresnel=pow(1-saturate(dot(n,v)),4);
    float glint=pow(saturate(dot(n,normalize(l.direction+v))),160)*1.4;
    float3 sky=lerp(float3(.12,.23,.29),float3(.42,.53,.56),saturate(reflect(-v,n).y));
    float3 c=lerp(_BaseColor.rgb,sky,.15+fresnel*.72)+l.color*glint;
    float ripple=pow(saturate(sin(p.x*.83+p.y*5.2+t*.9)),32)*.02;c+=ripple;
    return half4(MixFog(c,i.fog),1);
   }
   ENDHLSL
  }
 }
}
