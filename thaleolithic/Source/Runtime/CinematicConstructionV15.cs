using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 // The montage uses the actual separated native components, preserving meshes and materials.
 public sealed class CinematicConstructionV15
 {
  sealed class Piece{public GameObject visual;public int kind,index;}
  readonly List<Piece> pieces=new List<Piece>();readonly Dictionary<Collider,bool> collisions=new Dictionary<Collider,bool>();HutCollapse hut;bool visible;int phase=-1;
  public StructuralPiece Beam{get;private set;}public Vector3 BeamPosition=>hut.transform.TransformPoint(Beam.restPosition);public Quaternion BeamRotation=>hut.transform.rotation*Beam.restRotation;
  public void Begin(CampaignRuntime c)
  {
   if(!c.State.completedActions.Contains("WORK_M_V_ABRI"))return;
   hut=Object.FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).FirstOrDefault(h=>h.site=="habitations"&&!h.Broken);if(hut==null)return;
   Beam=hut.pieces.Where(p=>p.kind==2).OrderByDescending(p=>p.root.GetComponent<MeshFilter>().sharedMesh.bounds.size.x).FirstOrDefault();if(Beam==null){hut=null;return;}
   visible=hut.intactRenderer.enabled;hut.intactRenderer.enabled=false;foreach(var col in hut.intactColliders)if(col!=null){collisions[col]=col.enabled;col.enabled=false;}int index=0;
   foreach(var native in hut.pieces)
   {
    if(native==Beam)continue;var go=new GameObject("Montage · "+native.root.name);go.transform.SetParent(hut.transform,false);go.transform.SetLocalPositionAndRotation(native.restPosition,native.restRotation);go.transform.localScale=native.root.localScale;
    var mesh=native.root.GetComponent<MeshFilter>().sharedMesh;go.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterials=native.root.GetComponent<MeshRenderer>().sharedMaterials;renderer.receiveShadows=true;var collision=go.AddComponent<MeshCollider>();collision.sharedMesh=mesh;collision.convex=true;go.SetActive(false);pieces.Add(new Piece{visual=go,kind=native.kind,index=index++});
   }
  }
  public void Evaluate(float time)
  {
   if(hut==null)return;hut.intactRenderer.enabled=false;foreach(var col in collisions.Keys)if(col!=null)col.enabled=false;int next=time<5.5f?0:time<10?1:time<21.5f?2:3;if(next==phase)return;phase=next;
   // Each edit advances the build; components do not fly into place while the camera watches.
   foreach(var p in pieces)p.visual.SetActive(phase==3||p.kind==0&&(phase>=1||p.index%3==0)||p.kind==2&&phase>=2);
  }
  public void End(){if(hut!=null)hut.intactRenderer.enabled=visible;foreach(var pair in collisions)if(pair.Key!=null)pair.Key.enabled=pair.Value;collisions.Clear();foreach(var p in pieces)if(p.visual!=null)Object.Destroy(p.visual);pieces.Clear();hut=null;Beam=null;}
 }
}
