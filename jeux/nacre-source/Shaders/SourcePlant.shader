Shader "Nacre/SourcePlant" { Properties {_MainTex("Original atlas",2D)="white"{} _Cutoff("Clip",Range(0,1))=.2} SubShader {Tags {"Queue"="AlphaTest" "RenderType"="TransparentCutout"} Cull Off
CGPROGRAM
#pragma surface surf Standard fullforwardshadows alphatest:_Cutoff
sampler2D _MainTex;struct Input{float2 uv_MainTex;};
void surf(Input IN,inout SurfaceOutputStandard o){fixed4 c=tex2D(_MainTex,IN.uv_MainTex);o.Albedo=c.rgb;o.Alpha=c.a;o.Smoothness=.1;}
ENDCG
}Fallback "Transparent/Cutout/Diffuse"}
