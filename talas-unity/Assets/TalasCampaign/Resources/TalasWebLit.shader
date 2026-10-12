Shader "Talas/Eclairage WebGL"
{
 Properties { [MainColor] _BaseColor("Teinte",Color)=(1,1,1,1) [MainTexture] _BaseMap("Texture",2D)="white"{} _Smoothness("Lissage",Range(0,1))=.3 _Metallic("Metal",Range(0,1))=0 }
 SubShader
 {
  Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry" }
  Pass
  {
   Name "Forward" Tags { "LightMode"="UniversalForward" }
   ZWrite On ZTest LEqual Cull Back
   HLSLPROGRAM
   #pragma target 3.0
   #pragma vertex vert
   #pragma fragment frag
   #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
   struct A {float4 p:POSITION;float3 n:NORMAL;float2 uv:TEXCOORD0;};
   struct V {float4 p:SV_POSITION;float3 world:TEXCOORD0;float3 normal:TEXCOORD1;float2 uv:TEXCOORD2;};
   TEXTURE2D(_BaseMap);SAMPLER(sampler_BaseMap);
   CBUFFER_START(UnityPerMaterial)
   float4 _BaseColor,_BaseMap_ST;float _Smoothness,_Metallic;
   CBUFFER_END
   V vert(A i){V o;o.world=TransformObjectToWorld(i.p.xyz);o.p=TransformWorldToHClip(o.world);o.normal=TransformObjectToWorldNormal(i.n);o.uv=TRANSFORM_TEX(i.uv,_BaseMap);return o;}
   half4 frag(V i):SV_Target
   {
    float3 n=normalize(i.normal),view=normalize(GetCameraPositionWS()-i.world);
    Light light=GetMainLight(TransformWorldToShadowCoord(i.world));
    half3 base=SAMPLE_TEXTURE2D(_BaseMap,sampler_BaseMap,i.uv).rgb*_BaseColor.rgb;
    half diffuse=saturate(dot(n,light.direction));
    half3 color=base*(max(SampleSH(n),half3(.18,.18,.18))+light.color*diffuse*light.shadowAttenuation);
    half spec=pow(saturate(dot(n,normalize(view+light.direction))),lerp(8,64,_Smoothness))*_Smoothness*.18;
    color+=lerp(half3(1,1,1),base,_Metallic)*light.color*spec*light.shadowAttenuation;
    float distanceToCamera=length(GetCameraPositionWS()-i.world);
    float fog=saturate(distanceToCamera*unity_FogParams.z+unity_FogParams.w);
    color=lerp(unity_FogColor.rgb,color,fog);
    return half4(color,1);
   }
   ENDHLSL
  }
  UsePass "Universal Render Pipeline/Lit/ShadowCaster"
  UsePass "Universal Render Pipeline/Lit/DepthOnly"
 }
}
