Shader "Talas/Ciel du bassin"
{
 Properties { _Top("Zenith",Color)=(0.085,0.15,0.2,1) _Horizon("Horizon",Color)=(0.45,0.4,0.32,1) }
 SubShader
 {
  Tags { "Queue"="Background" "RenderType"="Background" "PreviewType"="Skybox" }
  Cull Off ZWrite Off
  Pass
  {
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   struct A{float4 p:POSITION;};struct V{float4 p:SV_POSITION;float3 d:TEXCOORD0;};
   float4 _Top,_Horizon;
   V vert(A v){V o;o.p=TransformObjectToHClip(v.p.xyz);o.d=v.p.xyz;return o;}
   half4 frag(V i):SV_Target{float y=normalize(i.d).y;float a=saturate(y*.9+.05);return half4(lerp(_Horizon.rgb,_Top.rgb,pow(a,.55)),1);}
   ENDHLSL
  }
 }
}
