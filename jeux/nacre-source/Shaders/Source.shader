Shader "Nacre/Source" { Properties {_Color("Color",Color)=(1,1,1,1)} SubShader {Tags {"RenderType"="Opaque"}
CGPROGRAM
#pragma surface surf Standard fullforwardshadows vertex:vert
struct Input{float4 color:COLOR;};fixed4 _Color;
void vert(inout appdata_full v,out Input o){UNITY_INITIALIZE_OUTPUT(Input,o);o.color=v.color;}
void surf(Input IN,inout SurfaceOutputStandard o){o.Albedo=IN.color.rgb*_Color.rgb;o.Smoothness=.16;o.Alpha=1;}
ENDCG
}Fallback "Diffuse"}
