Shader "UngaBunga/PortraitComposite"
{
    Properties
    {
        [PerRendererData] _MainTex("Portrait",2D)="white"{}
        _MaskTex("Silhouette",2D)="white"{}
        _Color("Color",Color)=(1,1,1,1)
        _StencilComp("Stencil Comparison",Float)=8
        _Stencil("Stencil ID",Float)=0
        _StencilOp("Stencil Operation",Float)=0
        _StencilWriteMask("Stencil Write Mask",Float)=255
        _StencilReadMask("Stencil Read Mask",Float)=255
        _ColorMask("Color Mask",Float)=15
    }
    SubShader
    {
        Tags{"Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" "PreviewType"="Plane" "CanUseSpriteAtlas"="False"}
        Stencil{Ref [_Stencil] Comp [_StencilComp] Pass [_StencilOp] ReadMask [_StencilReadMask] WriteMask [_StencilWriteMask]}
        Cull Off Lighting Off ZWrite Off ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            struct A{float4 vertex:POSITION;float2 uv:TEXCOORD0;float4 color:COLOR;};
            struct V{float4 vertex:SV_POSITION;float2 uv:TEXCOORD0;float4 color:COLOR;};
            sampler2D _MainTex,_MaskTex;float4 _Color;
            V vert(A v){V o;o.vertex=UnityObjectToClipPos(v.vertex);o.uv=v.uv;o.color=v.color*_Color;return o;}
            fixed4 frag(V i):SV_Target{fixed4 c=tex2D(_MainTex,i.uv)*i.color;c.a=smoothstep(.06,.32,tex2D(_MaskTex,i.uv).r)*i.color.a;return c;}
            ENDCG
        }
    }
}
