Shader "Nacre/Water" {
 Properties { _Night("Night",Range(0,1))=0 }
 SubShader { Tags {"Queue"="Transparent" "RenderType"="Transparent"}
 GrabPass {"_NacreRefraction"}
 Pass { Blend SrcAlpha OneMinusSrcAlpha ZWrite Off Cull Off
 CGPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "UnityCG.cginc"
 sampler2D _NacreRefraction;float _Night;
 struct appdata {float4 vertex:POSITION;float3 normal:NORMAL;float4 color:COLOR;};
 struct v2f {float4 pos:SV_POSITION;float4 grab:TEXCOORD0;float3 world:TEXCOORD1;float3 normal:TEXCOORD2;float4 color:COLOR;};
 v2f vert(appdata v){v2f o;o.pos=UnityObjectToClipPos(v.vertex);o.grab=ComputeGrabScreenPos(o.pos);o.world=mul(unity_ObjectToWorld,v.vertex).xyz;o.normal=UnityObjectToWorldNormal(v.normal);o.color=v.color;return o;}
 fixed4 frag(v2f i):SV_Target{float depth=i.color.r;if(depth<.008)discard;float2 p=i.world.xz;float t=_Time.y;float3 n=normalize(i.normal+float3(cos(p.x*5+t)*.025,0,sin(p.y*4-t)*.025));float3 view=normalize(_WorldSpaceCameraPos-i.world);float fres=pow(1-saturate(dot(n,view)),4);float4 grab=i.grab;grab.xy+=n.xz*.015*grab.w;float3 refr=tex2Dproj(_NacreRefraction,UNITY_PROJ_COORD(grab)).rgb;float3 tint=lerp(float3(.33,.77,.72),float3(.055,.30,.38),saturate(depth*.45));float3 color=lerp(refr,tint,.20+saturate(depth*.55)*.72);float spec=pow(saturate(dot(reflect(-normalize(float3(-.4,1,.3)),n),view)),96);color+=spec*.4;color=lerp(color,float3(.49,.67,.72),fres*.55);float foam=i.color.g*(.5+.5*sin(p.x*12+p.y*10+t*3));color=lerp(color,float3(.95,.98,.94),saturate(foam));color*=lerp(1,.38,_Night);return fixed4(color,saturate(depth*8));}
 ENDCG
 }
 }
}
