Shader "Talas/Couleurs des personnages"
{
    Properties { _BaseColor("Teinte", Color)=(1,1,1,1) }
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
            struct Attributes { float4 positionOS:POSITION; float3 normalOS:NORMAL; float4 color:COLOR; };
            struct Varyings { float4 positionCS:SV_POSITION; float3 normalWS:TEXCOORD0; float4 color:TEXCOORD1; };
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
            CBUFFER_END
            Varyings vert(Attributes v) { Varyings o; o.positionCS=TransformObjectToHClip(v.positionOS.xyz);o.normalWS=TransformObjectToWorldNormal(v.normalOS);o.color=v.color*_BaseColor;return o; }
            half4 frag(Varyings i):SV_Target
            {
                Light light=GetMainLight();float n=saturate(dot(normalize(i.normalWS),light.direction));
                float diffuse=.62+floor(n*3)/3*.38;
                return half4(i.color.rgb*diffuse,1);
            }
            ENDHLSL
        }
    }
}
