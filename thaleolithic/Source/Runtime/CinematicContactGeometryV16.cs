using UnityEngine;
namespace UngaBunga45001
{
 public static class CinematicContactGeometryV16
 {
  public struct SurfacePoint{public int a,b,c;public Vector3 weights,point;}
  static Vector3 Closest(Vector3 p,Vector3 a,Vector3 b,Vector3 c,out Vector3 weights)
  {
   var ab=b-a;var ac=c-a;var ap=p-a;float d1=Vector3.Dot(ab,ap),d2=Vector3.Dot(ac,ap);if(d1<=0&&d2<=0){weights=new Vector3(1,0,0);return a;}var bp=p-b;float d3=Vector3.Dot(ab,bp),d4=Vector3.Dot(ac,bp);if(d3>=0&&d4<=d3){weights=new Vector3(0,1,0);return b;}float vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){float v=d1/(d1-d3);weights=new Vector3(1-v,v,0);return a+ab*v;}var cp=p-c;float d5=Vector3.Dot(ab,cp),d6=Vector3.Dot(ac,cp);if(d6>=0&&d5<=d6){weights=new Vector3(0,0,1);return c;}float vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){float w=d2/(d2-d6);weights=new Vector3(1-w,0,w);return a+ac*w;}float va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0){float w=(d4-d3)/((d4-d3)+(d5-d6));weights=new Vector3(0,1-w,w);return b+(c-b)*w;}float sum=1/(va+vb+vc);float y=vb*sum,z=vc*sum;weights=new Vector3(1-y-z,y,z);return a+ab*y+ac*z;
  }
  public static SurfacePoint Nearest(Mesh mesh,Transform space,Vector3 world)
  {
   var vertices=mesh.vertices;var triangles=mesh.triangles;float best=float.PositiveInfinity;SurfacePoint result=default;
   for(int i=0;i<triangles.Length;i+=3){int a=triangles[i],b=triangles[i+1],c=triangles[i+2];var point=Closest(world,space.TransformPoint(vertices[a]),space.TransformPoint(vertices[b]),space.TransformPoint(vertices[c]),out var weights);float distance=(point-world).sqrMagnitude;if(distance<best){best=distance;result=new SurfacePoint{a=a,b=b,c=c,weights=weights,point=point};}}
   return result;
  }
 }
}
