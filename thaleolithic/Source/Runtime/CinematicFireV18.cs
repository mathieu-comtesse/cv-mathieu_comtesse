using System;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 // Original geometric fire gag: anticipation, snap, hold, recovery. The base never rises.
 [DefaultExecutionOrder(180)]public sealed class CinematicFireV18:MonoBehaviour
 {
  CampaignRuntime c;NativeFire hearth;Transform root;Mesh mesh;Material[] materials;MeshRenderer[] layers;float time;
  public bool Playing=>root!=null;public float Elapsed=>time;public float Height{get;private set;}public float BaseY{get;private set;}
  public static CinematicFireV18 For(CampaignRuntime c){var f=c.GetComponent<CinematicFireV18>()??c.gameObject.AddComponent<CinematicFireV18>();f.c=c;return f;}
  public bool Play(NativeFire fire)
  {
   if(fire==null||Playing)return false;hearth=fire;time=0;
   root=new GameObject("V18 · embrasement polygonal ancré").transform;root.SetParent(transform,true);var p=fire.transform.position;p.y=HutCollapse.TerrainFloor(p)+.025f;root.position=p;BaseY=p.y;
   // Separate vertices per triangle retain broad flat facets; no spheres or subdivision.
   var vertices=new System.Collections.Generic.List<Vector3>();var indices=new System.Collections.Generic.List<int>();
   void Tri(Vector3 a,Vector3 b,Vector3 d){int n=vertices.Count;vertices.Add(a);vertices.Add(b);vertices.Add(d);indices.Add(n);indices.Add(n+1);indices.Add(n+2);}
   for(int i=0;i<7;i++)
   {
    float a=i*Mathf.PI*2/7,b=(i+1)*Mathf.PI*2/7;var lo=new Vector3(Mathf.Cos(a)*.5f,0,Mathf.Sin(a)*.5f);var next=new Vector3(Mathf.Cos(b)*.5f,0,Mathf.Sin(b)*.5f);var middle=new Vector3(Mathf.Cos(a+.3f)*.31f,.52f,Mathf.Sin(a+.3f)*.31f);var m2=new Vector3(Mathf.Cos(b+.3f)*.31f,.52f,Mathf.Sin(b+.3f)*.31f);var tip=new Vector3(Mathf.Cos(a)*.12f,1+(i%3)*.16f,Mathf.Sin(a)*.12f);
    Tri(lo,next,middle);Tri(next,m2,middle);Tri(middle,m2,tip);
   }
   mesh=new Mesh{name="TH18 angular flame lobes"};mesh.SetVertices(vertices);mesh.SetTriangles(indices,0);mesh.RecalculateNormals();
   var colours=new[]{new Color(.98f,.19f,.015f),new Color(1,.49f,.035f),new Color(1,.91f,.67f)};materials=new Material[3];
   for(int i=0;i<3;i++){var mat=new Material(Shader.Find("Universal Render Pipeline/Unlit"));mat.color=colours[i];materials[i]=mat;}
   layers=new MeshRenderer[9];for(int i=0;i<layers.Length;i++){var go=new GameObject("Lobe "+i);go.transform.SetParent(root,false);go.AddComponent<MeshFilter>().sharedMesh=mesh;layers[i]=go.AddComponent<MeshRenderer>();layers[i].sharedMaterial=materials[i%3];layers[i].shadowCastingMode=ShadowCastingMode.Off;layers[i].receiveShadows=false;}
   return true;
  }
  void LateUpdate()
  {
   if(!Playing)return;if(c!=null&&c.UserPaused)return;time+=Time.deltaTime;
   float gain=time<1.25f?Mathf.Lerp(.55f,1.3f,time/1.25f):time<1.8f?1.3f:time<1.91f?Mathf.Lerp(1.3f,8.8f,(time-1.8f)/.11f):time<2.8f?8.8f:Mathf.Lerp(8.8f,.45f,Mathf.SmoothStep(0,1,(time-2.8f)/2));
   Height=gain;for(int i=0;i<layers.Length;i++)
   {
    float a=i*2.399f;var t=layers[i].transform;float inner=i%3==2?.63f:1;
    t.localPosition=new Vector3(Mathf.Cos(a)*.22f,0,Mathf.Sin(a)*.22f);float width=.55f+gain*.5f;t.localScale=new Vector3(width*inner,gain*(.7f+(i%4)*.1f)*inner,width*inner);t.localRotation=Quaternion.Euler(0,i*63+Mathf.Sin(time*5+i)*12,0);
   }
   if(hearth!=null&&hearth.WarmLight!=null){hearth.WarmLight.range=Mathf.Min(13,7+gain*.7f);hearth.WarmLight.intensity=(RenderBackend.HDRP?1800:2.5f)*Mathf.Clamp(gain,1,4);}
   if(time>=4.8f)Stop();
  }
  public void Stop(){if(root!=null)Destroy(root.gameObject);root=null;if(hearth!=null&&hearth.WarmLight!=null)hearth.WarmLight.range=7;if(mesh!=null)Destroy(mesh);if(materials!=null)foreach(var material in materials)if(material!=null)Destroy(material);Height=0;}
  void OnDisable(){Stop();}
 }
}
