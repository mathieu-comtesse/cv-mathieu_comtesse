Shader "Nacre/Sand" {
 Properties { _Color("Sand",Color)=(.9254902,.8862745,.7254902,1) _SandMap("Source sand",2D)="white"{} _CausticsAtlas("Original caustics",2D)="black"{} }
 SubShader { Tags {"RenderType"="Opaque"} LOD 200
 CGPROGRAM
 #pragma surface surf Standard fullforwardshadows vertex:vert
 #pragma target 3.0
 fixed4 _Color;sampler2D _SandMap,_CausticsAtlas;float _NacreSeaLevel;
 float causticSlice(float2 p,float frame){float f=fmod(frame+64,64);float2 tile=float2(fmod(f,8),floor(f/8));float2 uv=(tile*258+1+frac(p)*256)/2064;uv.y=1-uv.y;return tex2D(_CausticsAtlas,uv).r;}
 float caustics(float2 p){float z=frac(_Time.y*.2)*64-.5,f=floor(z);return lerp(causticSlice(p*.25,f),causticSlice(p*.25,f+1),frac(z));}
 struct Input { float3 worldPos; float4 color:COLOR; };
 void vert(inout appdata_full v,out Input o){UNITY_INITIALIZE_OUTPUT(Input,o);o.color=v.color;}
 void surf(Input IN,inout SurfaceOutputStandard o){float grain=tex2D(_SandMap,IN.worldPos.xz*.7).r;float wet=IN.color.r;float3 dry=lerp(_Color.rgb,float3(.9294118,.8980392,.7529412),grain);o.Albedo=lerp(dry,float3(.906,.8103758,.633294),wet);o.Smoothness=lerp(.12,.45,wet);o.Emission=caustics(IN.worldPos.xz)*saturate((_NacreSeaLevel-IN.worldPos.y)*4)*float3(.16,.2,.15);o.Metallic=0;o.Occlusion=.96;}
 ENDCG
 } Fallback "Diffuse"
}
