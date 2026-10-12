Shader "Talas/Brume volumetrique"
{
 Properties { _BaseColor("Couleur",Color)=(0.27,0.4,0.43,1) _Density("Densite",Range(0,1))=0.045 _Steps("Echantillons",Range(8,48))=24 }
 SubShader
 {
  Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent-10" "RenderType"="Transparent" }
  Pass
  {
   Blend SrcAlpha OneMinusSrcAlpha ZWrite Off Cull Front
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareDepthTexture.hlsl"
   struct A { float4 p:POSITION; };
   struct V { float4 p:SV_POSITION; float3 world:TEXCOORD0; };
   CBUFFER_START(UnityPerMaterial)
   float4 _BaseColor; float _Density; float _Steps;
   CBUFFER_END
   V vert(A v) { V o;o.world=TransformObjectToWorld(v.p.xyz);o.p=TransformWorldToHClip(o.world);return o; }
   float hash(float3 p) { p=frac(p*.1031);p+=dot(p,p.yzx+33.33);return frac((p.x+p.y)*p.z); }
   float noise(float3 p) { float3 f=frac(p),q=floor(p);f=f*f*(3-2*f);return lerp(lerp(lerp(hash(q),hash(q+float3(1,0,0)),f.x),lerp(hash(q+float3(0,1,0)),hash(q+float3(1,1,0)),f.x),f.y),lerp(lerp(hash(q+float3(0,0,1)),hash(q+float3(1,0,1)),f.x),lerp(hash(q+float3(0,1,1)),hash(q+1),f.x),f.y),f.z); }
   half4 frag(V i):SV_Target
   {
    float3 eye=GetCameraPositionWS(), ray=normalize(i.world-eye);
    float3 origin=TransformWorldToObject(eye), direction=mul((float3x3)unity_WorldToObject,ray);
    direction+=float3(1e-7,1e-7,1e-7);
    float3 a=(-.5-origin)/direction,b=(.5-origin)/direction;
    float3 lo=min(a,b),hi=max(a,b);
    float entry=max(0,max(lo.x,max(lo.y,lo.z))),leave=min(hi.x,min(hi.y,hi.z));
    float2 uv=i.p.xy/_ScaledScreenParams.xy;
    float depth=SampleSceneDepth(uv);
    #if !UNITY_REVERSED_Z
    depth=lerp(UNITY_NEAR_CLIP_VALUE,1,depth);
    #endif
    float3 opaque=ComputeWorldSpacePosition(uv,depth,UNITY_MATRIX_I_VP);
    leave=min(leave,length(opaque-eye));
    if(leave<=entry) return 0;
    float stepSize=(leave-entry)/_Steps,total=0;
    for(int s=0;s<48;s++) { if(s>=_Steps)break;float3 p=eye+ray*(entry+(s+.5)*stepSize);float3 local=origin+direction*(entry+(s+.5)*stepSize);float height=saturate((.5-local.y)*1.5);float n=noise(p*.32+float3(_Time.y*.025,0,_Time.y*.008));total+=_Density*stepSize*height*smoothstep(.14,.85,n); }
    float opacity=1-exp(-total);
    float warm=pow(saturate(dot(ray,normalize(float3(-.7,.3,.5)))),8);
    return half4(lerp(_BaseColor.rgb,float3(.8,.59,.32),warm*.24),opacity);
   }
   ENDHLSL
  }
 }
}
