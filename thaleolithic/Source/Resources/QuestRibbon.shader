Shader "UngaBunga45001/QuestRibbon"
{
    Properties
    {
        _Tint("Teinte", Color) = (.89,.67,.32,1)
        _Opacity("Opacité", Range(0,1)) = .7
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
        Pass
        {
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                half4 _Tint;
                half _Opacity;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; half4 color : COLOR; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; half alpha : TEXCOORD1; };

            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = input.uv;
                output.alpha = input.color.a;
                return output;
            }

            half4 Frag(Varyings input) : SV_Target
            {
                half edge = smoothstep(0, .19, min(input.uv.x, 1 - input.uv.x));
                half grain = frac(sin(floor(input.uv.y * 21) * 3.17 + floor(input.uv.x * 13) * 6.43) * 42.73);
                return half4(_Tint.rgb * (.91 + .07 * grain + .05 * edge), _Opacity * edge * input.alpha);
            }
            ENDHLSL
        }
    }
}
