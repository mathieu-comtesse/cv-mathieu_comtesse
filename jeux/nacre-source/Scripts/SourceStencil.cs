using System;using System.Collections.Generic;using UnityEngine;
public static class SourceStencil {
 class Mask{public int w,h;public float[] pixels;}static readonly Dictionary<string,Mask> masks=new Dictionary<string,Mask>();
 // Ground.Paint reads source R as signed height (2R-1), and A as stencil.
 public static float Sample(string name,float u,float v,int channel){
  if(u<0||v<0||u>1||v>1)return 0;Mask m;
  if(!masks.TryGetValue(name,out m)){var raw=Resources.Load<TextAsset>("Sandcastle/"+name);if(!raw)throw new InvalidOperationException("Empreinte originale absente : "+name);var b=raw.bytes;m=new Mask{w=BitConverter.ToInt32(b,0),h=BitConverter.ToInt32(b,4)};if(b.Length!=8+m.w*m.h*16)throw new InvalidOperationException("Empreinte RGBAFloat invalide : "+name);m.pixels=new float[m.w*m.h*4];Buffer.BlockCopy(b,8,m.pixels,0,b.Length-8);masks[name]=m;}
  float x=Mathf.Clamp(u*m.w-.5f,0,m.w-1),y=Mathf.Clamp(v*m.h-.5f,0,m.h-1);int ix=(int)x,iy=(int)y,jx=Mathf.Min(ix+1,m.w-1),jy=Mathf.Min(iy+1,m.h-1);
  return Mathf.Lerp(Mathf.Lerp(m.pixels[(iy*m.w+ix)*4+channel],m.pixels[(iy*m.w+jx)*4+channel],x-ix),Mathf.Lerp(m.pixels[(jy*m.w+ix)*4+channel],m.pixels[(jy*m.w+jx)*4+channel],x-ix),y-iy);
 }
 public static float Weight(string tool,float u,float v){string name=tool=="rake"?"RakeMediumPatternStencil":"ShovelMediumPatternStencil";float d=Vector2.Distance(new Vector2(u,v),Vector2.one*.5f)*2;if(d>=1)return 0;float a=Sample(name,u,v,3);if(tool=="rake")return a;return Mathf.Max(0,2*Sample(name,u,v,0)-1)*a*(1-d*d*d);}
}
