Shader "UngaBunga/WebWater"
{
    Properties{_BaseColor("Water",Color)=(.12,.4,.47,.65)}
    SubShader
    {
        Tags{"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
        Pass
        {
            Tags{"LightMode"="UniversalForward"}Blend SrcAlpha OneMinusSrcAlpha ZWrite Off Cull Off
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            CBUFFER_START(UnityPerMaterial)half4 _BaseColor;CBUFFER_END
            struct A{float4 positionOS:POSITION;};struct V{float4 positionCS:SV_POSITION;float3 world:TEXCOORD0;};
            V Vert(A i){V o;o.world=TransformObjectToWorld(i.positionOS.xyz);o.world.y+=sin(o.world.x*1.4+o.world.z*.8+_Time.y)*.018;o.positionCS=TransformWorldToHClip(o.world);return o;}
            half4 Frag(V i):SV_Target{float wave=sin(i.world.x*3+i.world.z*4+_Time.y*1.3)*.018;float fresnel=pow(1-saturate(dot(normalize(_WorldSpaceCameraPos-i.world),float3(0,1,0))),3);return half4(lerp(_BaseColor.rgb+wave,half3(.46,.64,.7),fresnel*.5),_BaseColor.a+fresnel*.15);}
            ENDHLSL
        }
    }
}
