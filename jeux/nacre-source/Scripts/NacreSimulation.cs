using System;
using UnityEngine;

// Browser height/flux solver; original decoded tool stencils are sampled below.
// GPU/native dynamics equivalence has not been established.
public sealed class NacreSimulation {
 public readonly int N; public readonly float Size, Cell; public float[] ground, initial, compact, wet, water, vx, vz, sediment;
 readonly float[] next, transfer; public float tide, wave=.12f; public int steps; public double eroded, deposited;
 public NacreSimulation(int n=192,float size=32){N=n;Size=size;Cell=size/(n-1);int l=n*n;ground=new float[l];initial=new float[l];compact=new float[l];wet=new float[l];water=new float[l];vx=new float[l];vz=new float[l];sediment=new float[l];next=new float[l];transfer=new float[l];
  for(int z=0;z<N;z++)for(int x=0;x<N;x++){float px=X(x),pz=X(z),a=Mathf.Atan2(pz,px),r=Mathf.Sqrt(px*px/42.25f+pz*pz/23.04f)/(1+.13f*Mathf.Sin(a*3+.5f)+.07f*Mathf.Sin(a*5-1));float h=.74f-Mathf.SmoothStep(0,1,Mathf.InverseLerp(.69f,1.08f,r))*2.45f+.025f*Mathf.PerlinNoise(px*.7f+17,pz*.7f+4);int k=I(x,z);ground[k]=initial[k]=h;compact[k]=.45f;}
 }
 public int I(int x,int z)=>z*N+x;public float X(int x)=>-Size/2+x*Cell;
 public float Sample(float[] a,float x,float z){float u=Mathf.Clamp((x+Size/2)/Cell,0,N-1.001f),v=Mathf.Clamp((z+Size/2)/Cell,0,N-1.001f);int i=(int)u,j=(int)v;return Mathf.Lerp(Mathf.Lerp(a[I(i,j)],a[I(i+1,j)],u-i),Mathf.Lerp(a[I(i,j+1)],a[I(i+1,j+1)],u-i),v-j);}
 public void Step(float dt,float time){steps++;Array.Clear(transfer,0,transfer.Length);
  // Staggered face velocities, then conservative flux divergence (no in-place neighbour update).
  for(int z=0;z<N-1;z++)for(int x=0;x<N-1;x++){int k=I(x,z);float depth=Mathf.Max(0,tide+water[k]-ground[k]);vx[k]=depth>.008f&&tide+water[k+1]>ground[k+1]+.008f?Mathf.Clamp((vx[k]-9.81f*(water[k+1]-water[k])/Cell*dt)*Mathf.Exp(-.45f*dt),-1.3f,1.3f):0;vz[k]=depth>.008f&&tide+water[k+N]>ground[k+N]+.008f?Mathf.Clamp((vz[k]-9.81f*(water[k+N]-water[k])/Cell*dt)*Mathf.Exp(-.45f*dt),-1.3f,1.3f):0;}
  for(int z=1;z<N-1;z++)for(int x=1;x<N-1;x++){int k=I(x,z);float depth=Mathf.Max(0,tide+water[k]-ground[k]);float flux=FaceFlux(k,k+1,vx[k])+FaceFlux(k,k+N,vz[k])-FaceFlux(k-1,k,vx[k-1])-FaceFlux(k-N,k,vz[k-N]);next[k]=Mathf.Clamp(water[k]-flux*dt/Cell,-.20f,.20f)*.9995f;
   float moist=Mathf.Clamp01(1-(ground[k]-tide-water[k])/.28f);wet[k]=Mathf.Max(moist,wet[k]-dt*.012f);
   float speed=Mathf.Sqrt(vx[k]*vx[k]+vz[k]*vz[k]);if(depth>.01f&&depth<.5f&&speed>.09f){float loss=Mathf.Min(.0015f,dt*.006f*speed*(1-compact[k]*.68f));ground[k]-=loss;sediment[k]+=loss;eroded+=loss;compact[k]=Mathf.Max(.05f,compact[k]-dt*.014f);}
   if(speed<.06f&&sediment[k]>0){float deposit=Mathf.Min(sediment[k],dt*.004f);ground[k]+=deposit;sediment[k]-=deposit;deposited+=deposit;}
  }
  for(int z=0;z<N;z++)for(int x=0;x<N;x++){int k=I(x,z);if(x<3||z<3||x>N-4||z>N-4)next[k]=wave*Mathf.Sin(time*1.8f-X(x)*.55f-X(z)*.26f);}
  var swap=water;water=nextCopy(next,swap);
  // Conservative sand slumping: every outgoing transfer is matched at the receiving cell.
  for(int z=1;z<N-1;z++)for(int x=1;x<N-1;x++){int k=I(x,z);if(ground[k]<-.4f)continue;Relax(k,k+1,dt);Relax(k,k+N,dt);}
  for(int k=0;k<ground.Length;k++)ground[k]+=transfer[k];
  // Suspended material follows the signed face flow; each transfer is paired and bounded.
  Array.Clear(transfer,0,transfer.Length);
  for(int z=1;z<N-1;z++)for(int x=1;x<N-1;x++){int k=I(x,z);MoveSediment(k,k+1,vx[k],dt);MoveSediment(k,k+N,vz[k],dt);}
  for(int k=0;k<sediment.Length;k++)sediment[k]=Mathf.Max(0,sediment[k]+transfer[k]);
 }
 float FaceFlux(int a,int b,float speed){float da=Mathf.Max(0,tide+water[a]-ground[a]),db=Mathf.Max(0,tide+water[b]-ground[b]);return Mathf.Min(1.2f,Mathf.Min(da,db))*speed;}
 void MoveSediment(int a,int b,float speed,float dt){if(speed<0){int swap=a;a=b;b=swap;}float q=Mathf.Min(sediment[a]*.12f,sediment[a]*Mathf.Abs(speed)*dt/Cell*.25f);transfer[a]-=q;transfer[b]+=q;}
 float[] nextCopy(float[] a,float[] b){Array.Copy(a,b,a.Length);return b;}
 void Relax(int a,int b,float dt){float diff=ground[a]-ground[b],limit=Cell*(.7f+Mathf.Min(compact[a],compact[b])*11);if(Mathf.Abs(diff)<=limit)return;float v=Mathf.Sign(diff)*Mathf.Min((Mathf.Abs(diff)-limit)*dt*.17f,.008f);transfer[a]-=v;transfer[b]+=v;}
 public float Sculpt(float x,float z,float radius,string tool,bool add,float amount){float volume=0;int ix=Mathf.RoundToInt((x+Size/2)/Cell),iz=Mathf.RoundToInt((z+Size/2)/Cell),r=Mathf.CeilToInt(radius/Cell);var before=(float[])ground.Clone();
  for(int j=Mathf.Max(1,iz-r);j<Mathf.Min(N-1,iz+r+1);j++)for(int i=Mathf.Max(1,ix-r);i<Mathf.Min(N-1,ix+r+1);i++){float dx=X(i)-x,dz=X(j)-z,d=Mathf.Sqrt(dx*dx+dz*dz);int k=I(i,j);float w=SourceStencil.Weight(tool,dx/(2*radius)+.5f,dz/(2*radius)+.5f);if(w<=0)continue;if(tool=="rake"){float avg=(before[k-1]+before[k+1]+before[k-N]+before[k+N])*.25f;ground[k]=Mathf.Lerp(before[k],avg,amount*w*7);ground[k]-=amount*w*.025f;compact[k]=Mathf.Min(1,compact[k]+amount*w*.2f);}else{float delta=(add?1:-1)*amount*w;ground[k]=Mathf.Clamp(ground[k]+delta,-.65f,3.8f);volume+=(ground[k]-before[k])*Cell*Cell;compact[k]=Mathf.Max(.12f,compact[k]-.04f);}}
  return volume;
 }
 // Native Shovel.OnAction: one capacity / Brush.Volume stroke on press,
 // its positive counterpart on release. Normalise on this grid to retain m3.
 public float Scoop(float x,float z,float radius,float volume){
  int ix=Mathf.RoundToInt((x+Size/2)/Cell),iz=Mathf.RoundToInt((z+Size/2)/Cell),r=Mathf.CeilToInt(radius/Cell);double integral=0;
  for(int j=Mathf.Max(1,iz-r);j<Mathf.Min(N-1,iz+r+1);j++)for(int i=Mathf.Max(1,ix-r);i<Mathf.Min(N-1,ix+r+1);i++)integral+=SourceStencil.Weight("shovel",(X(i)-x)/(2*radius)+.5f,(X(j)-z)/(2*radius)+.5f)*Cell*Cell;
  if(integral<1e-9)return 0;double changed=0;
  for(int j=Mathf.Max(1,iz-r);j<Mathf.Min(N-1,iz+r+1);j++)for(int i=Mathf.Max(1,ix-r);i<Mathf.Min(N-1,ix+r+1);i++){
   int k=I(i,j);float w=SourceStencil.Weight("shovel",(X(i)-x)/(2*radius)+.5f,(X(j)-z)/(2*radius)+.5f),before=ground[k];ground[k]+=(float)(volume*w/integral);changed+=(ground[k]-before)*Cell*Cell;compact[k]=Mathf.Max(.12f,compact[k]-.04f);
  }return (float)changed;
 }
 public void Stamp(float x,float z,string tool,float yaw,float scale,int variant=0){float cy=Sample(ground,x,z);float c=Mathf.Cos(yaw),s=Mathf.Sin(yaw);string pattern="TowerRoundPatternStencil_0"+(variant==0?UnityEngine.Random.Range(1,6):Mathf.Clamp(variant,1,5));
  for(int j=1;j<N-1;j++)for(int i=1;i<N-1;i++){float dx=X(i)-x,dz=X(j)-z,u=(dx*c+dz*s)/scale,v=(-dx*s+dz*c)/scale,r=Mathf.Sqrt(u*u+v*v);int k=I(i,j);float h=-99;
   if(tool=="tower"&&Mathf.Abs(u)<1&&Mathf.Abs(v)<1){float alpha=SourceStencil.Sample(pattern,u*.5f+.5f,v*.5f+.5f,3);if(alpha>0){float target=cy+(2*SourceStencil.Sample(pattern,u*.5f+.5f,v*.5f+.5f,0)-1)*scale;h=Mathf.Lerp(ground[k],Mathf.Max(ground[k],target),alpha);}}
   if(tool=="wall"&&Mathf.Abs(u)<1.45f&&Mathf.Abs(v)<.24f){h=cy+1.45f;if(Mathf.Cos(u*8)>.05f)h+=.28f;}
   if(h>-90){ground[k]=Mathf.Max(ground[k],h);compact[k]=1;wet[k]=Mathf.Max(wet[k],.3f);}
  }
 }
 public void Impulse(float x,float z,float strength){for(int j=1;j<N-1;j++)for(int i=1;i<N-1;i++){float d=Vector2.Distance(new Vector2(X(i),X(j)),new Vector2(x,z));if(d<1)water[I(i,j)]+=strength*(1-d);}}
}
