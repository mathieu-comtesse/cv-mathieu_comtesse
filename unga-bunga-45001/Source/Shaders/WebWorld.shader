Shader "UngaBunga/WebWorld"
{
    Properties
    {
        [MainTexture] _BaseColorMap("Native albedo",2D)="white"{}
        [MainColor] _BaseColor("Tint",Color)=(1,1,1,1)
        _AlphaCutoff("Alpha cutoff",Range(0,1))=0
        _WindStrength("Wind and footsteps",Float)=0
        _WarmHide("Warm hide palette",Float)=0
        [Enum(UnityEngine.Rendering.CullMode)]_Cull("Cull",Float)=2
    }
    SubShader
    {
        Tags{"RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry"}
        Cull [_Cull]
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        TEXTURE2D(_BaseColorMap);SAMPLER(sampler_BaseColorMap);
        CBUFFER_START(UnityPerMaterial)
        float4 _BaseColorMap_ST;half4 _BaseColor;float _AlphaCutoff,_WindStrength,_WarmHide,_Cull;
        CBUFFER_END
        float4 _UngaActors[24];int _UngaActorCount;float4 _UngaLastFootstep;
        struct A{float4 positionOS:POSITION;float3 normalOS:NORMAL;float2 uv:TEXCOORD0;UNITY_VERTEX_INPUT_INSTANCE_ID};
        struct V{float4 positionCS:SV_POSITION;float3 world:TEXCOORD0;half3 normal:TEXCOORD1;float2 uv:TEXCOORD2;half fog:TEXCOORD3;UNITY_VERTEX_INPUT_INSTANCE_ID UNITY_VERTEX_OUTPUT_STEREO};
        float3 World(A input)
        {
            float3 p=TransformObjectToWorld(input.positionOS.xyz);if(_WindStrength<.001)return p;float weight=saturate(input.positionOS.y*1.6);weight*=weight*_WindStrength;
            float wind=sin(p.x*.73+p.z*.59+_Time.y*1.8)*.055;p.xz+=float2(wind,wind*.53)*weight;
            p.y-=saturate(1-(_Time.y-_UngaLastFootstep.w)*1.6)*saturate(1-length(p.xz-_UngaLastFootstep.xz)/.7)*weight*.06;
            for(int i=0;i<min(_UngaActorCount,24);i++){float2 d=p.xz-_UngaActors[i].xz;float distance=length(d);float bend=saturate(1-distance/max(.1,_UngaActors[i].w))*weight*.48;p.xz+=d/max(.08,distance)*bend;p.y-=bend*.4;}return p;
        }
        V Vert(A input){V o;UNITY_SETUP_INSTANCE_ID(input);UNITY_TRANSFER_INSTANCE_ID(input,o);UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);o.world=World(input);o.positionCS=TransformWorldToHClip(o.world);o.normal=TransformObjectToWorldNormal(input.normalOS);o.uv=TRANSFORM_TEX(input.uv,_BaseColorMap);o.fog=ComputeFogFactor(o.positionCS.z);return o;}
        half4 Albedo(float2 uv){half4 color=SAMPLE_TEXTURE2D(_BaseColorMap,sampler_BaseColorMap,uv)*_BaseColor;clip(color.a-_AlphaCutoff);float shade=max(color.r,max(color.g,color.b));float hide=step(color.g*1.04,color.r)*step(color.b*1.04,color.g)*(1-smoothstep(.13,.32,shade));color.rgb=lerp(color.rgb,float3(.28,.135,.058),hide*.82*_WarmHide);return color;}
        ENDHLSL
        Pass
        {
            Name "Native forward" Tags{"LightMode"="UniversalForward"}
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile_fog
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile _ _ADDITIONAL_LIGHTS
            half4 Frag(V input,FRONT_FACE_TYPE face:FRONT_FACE_SEMANTIC):SV_Target
            {
                UNITY_SETUP_INSTANCE_ID(input);half4 base=Albedo(input.uv);half3 n=normalize(input.normal)*IS_FRONT_VFACE(face,1,-1);Light sun=GetMainLight(TransformWorldToShadowCoord(input.world));
                half diffuse=saturate(dot(n,sun.direction));half shade=sun.shadowAttenuation;half3 ambient=max(half3(.12,.09,.16),SampleSH(n));half3 light=ambient*.8+sun.color*(.15+diffuse*.85)*shade;
                #if defined(_ADDITIONAL_LIGHTS)
                uint count=GetAdditionalLightsCount();for(uint i=0;i<count;i++){Light local=GetAdditionalLight(i,input.world);light+=local.color*saturate(dot(n,local.direction))*local.distanceAttenuation*local.shadowAttenuation;}
                #endif
                return half4(MixFog(base.rgb*light,input.fog),1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "Native shadows" Tags{"LightMode"="ShadowCaster"}
            ZWrite On ZTest LEqual ColorMask 0
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex ShadowVert
            #pragma fragment ShadowFrag
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW
            float3 _LightDirection,_LightPosition;
            V ShadowVert(A input){V o=Vert(input);float3 direction=_LightDirection;
                #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                direction=normalize(_LightPosition-o.world);
                #endif
                o.positionCS=TransformWorldToHClip(ApplyShadowBias(o.world,o.normal,direction));o.positionCS=ApplyShadowClamping(o.positionCS);return o;}
            half4 ShadowFrag(V input):SV_Target{Albedo(input.uv);return 0;}
            ENDHLSL
        }
    }
}
