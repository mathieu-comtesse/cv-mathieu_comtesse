Shader "Talas/Brume peinte"
{
    Properties { _BaseColor("Teinte", Color)=(0.32,0.48,0.53,0.2) }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
        Pass
        {
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS:POSITION; float2 uv:TEXCOORD0; };
            struct Varyings { float4 positionCS:SV_POSITION; float2 uv:TEXCOORD0; };
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
            CBUFFER_END
            Varyings vert(Attributes v) { Varyings o; o.positionCS=TransformObjectToHClip(v.positionOS.xyz); o.uv=v.uv; return o; }
            float hash(float2 p) { return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453); }
            float noise(float2 p) { float2 i=floor(p),f=frac(p); f=f*f*(3-2*f); return lerp(lerp(hash(i),hash(i+float2(1,0)),f.x),lerp(hash(i+float2(0,1)),hash(i+1),f.x),f.y); }
            half4 frag(Varyings i):SV_Target
            {
                float2 p=i.uv*float2(18,3)+float2(_Time.y*.075,_Time.y*.017);
                float n=noise(p)*.6+noise(p*2.1)*.4;
                float fade=sin(saturate(i.uv.y)*3.14159265)*smoothstep(0,.08,i.uv.x)*smoothstep(0,.08,1-i.uv.x);
                return half4(_BaseColor.rgb,_BaseColor.a*fade*smoothstep(.18,.72,n));
            }
            ENDHLSL
        }
    }
}
