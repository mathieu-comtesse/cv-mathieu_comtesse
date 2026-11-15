using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 // Only the temporary duplicate is folded; the recovered mesh and UVs remain unchanged.
 public sealed class CinematicConstructionV16
 {
  CinematicBuildingStateV16 building;GameObject cover,frame,rack;Transform geometry;Mesh coverMesh,frameMesh;MeshRenderer originalFrame;bool frameVisible;
  Vector3[] restVertices,restNormals,foldVertices,vertices;float lastUnfold=-1;Transform[] grips;CinematicContactGeometryV16.SurfacePoint[] anchors;
  readonly Dictionary<MeshRenderer,bool> originalCovers=new Dictionary<MeshRenderer,bool>();readonly Dictionary<Collider,bool> collisions=new Dictionary<Collider,bool>();
  public Transform Foundation{get;private set;}public Vector3 FoundationRoot{get;private set;}
  public StructuralPiece Beam{get;private set;}public GameObject Cover=>cover;public Vector3 CoverPosition{get;private set;}public float CoverDepth{get;private set;}
  public bool Begin(CampaignRuntime c)
  {
   if(!c.State.completedActions.Contains("WORK_M_V_ABRI"))return false;
   var hut=Object.FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).FirstOrDefault(h=>h.site=="habitations"&&!h.Broken&&h.name.Contains("frame")&&!h.name.Contains("destroyed"));if(hut==null)return false;
   Beam=hut.pieces.Where(p=>p.kind==2).OrderBy(p=>Mathf.Abs(p.root.position.y-hut.transform.position.y-1.7f)+Vector3.Distance(p.root.position,hut.transform.position+Vector3.back*1.4f)).FirstOrDefault();if(Beam==null)return false;
   cover=CinematicBuildingStateV16.MakeCover(c,false);if(cover==null)return false;CoverPosition=cover.transform.position;geometry=cover.transform.GetChild(0);var filter=geometry.GetComponent<MeshFilter>();coverMesh=Object.Instantiate(filter.sharedMesh);coverMesh.name="Couverture native temporaire · pli editable";coverMesh.MarkDynamic();filter.sharedMesh=coverMesh;restVertices=coverMesh.vertices;restNormals=coverMesh.normals;foldVertices=new Vector3[restVertices.Length];vertices=(Vector3[])restVertices.Clone();CoverDepth=coverMesh.bounds.size.z*Mathf.Abs(geometry.lossyScale.z);
   var pivot=new Vector3(coverMesh.bounds.center.x,1.5f,coverMesh.bounds.min.z+.22f);
   for(int i=0;i<restVertices.Length;i++){var p=restVertices[i]-pivot;float x=Mathf.Abs(p.x);p.x=Mathf.Sign(p.x)*(Mathf.Min(x,1.25f)+Mathf.Max(0,x-1.25f)*.15f);p.y=p.y*.12f+Mathf.Sin(p.z*2)*.035f;p.z*=.12f;foldVertices[i]=pivot+p;}
   building=CinematicBuildingStateV16.For(c);building.SceneOwned=true;building.Refresh();
   foreach(var native in Object.FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).Where(h=>h.site=="habitations"&&h.name.Contains("-hide-primeval"))){originalCovers[native.intactRenderer]=native.intactRenderer.enabled;native.intactRenderer.enabled=false;}
   originalFrame=hut.intactRenderer;frameVisible=originalFrame.enabled;originalFrame.enabled=false;foreach(var col in hut.intactColliders)if(col!=null){collisions[col]=col.enabled;col.enabled=false;}
   frame=new GameObject("Ossature native · traverse en cours de pose");frame.transform.SetPositionAndRotation(hut.transform.position,hut.transform.rotation);frameMesh=new Mesh{name="Ossature native sans la traverse manipulee"};frameMesh.CombineMeshes(hut.pieces.Where(p=>p!=Beam).Select(p=>new CombineInstance{mesh=p.root.GetComponent<MeshFilter>().sharedMesh,transform=frame.transform.worldToLocalMatrix*p.root.localToWorldMatrix}).ToArray(),true,true);frame.AddComponent<MeshFilter>().sharedMesh=frameMesh;frame.AddComponent<MeshRenderer>().sharedMaterials=originalFrame.sharedMaterials;frame.AddComponent<MeshCollider>().sharedMesh=frameMesh;
   var post=hut.pieces.Where(p=>p.kind==0).OrderBy(p=>Vector3.Distance(p.root.position,hut.transform.position+new Vector3(-1.2f,.8f,-2))).First();var point=CinematicContactGeometryV16.Nearest(post.root.GetComponent<MeshFilter>().sharedMesh,post.root,hut.transform.position+new Vector3(-1.5f,.9f,-2.5f)).point;Foundation=new GameObject("Appui natif inspecte · contact de surface").transform;Foundation.SetParent(frame.transform,true);Foundation.position=point;var outward=point-hut.transform.position;outward.y=0;FoundationRoot=point+outward.normalized*.46f;FoundationRoot=new Vector3(FoundationRoot.x,HutCollapse.TerrainFloor(FoundationRoot)+.04f,FoundationRoot.z);return true;
  }
  public void BindCoverGrips(params Transform[] targets)
  {
   grips=targets;anchors=new CinematicContactGeometryV16.SurfacePoint[targets.Length];float[] offsets={.78f,1.12f,-1.12f,-.78f};
   var current=cover.transform.position;cover.transform.position=CoverPosition;
   for(int i=0;i<targets.Length;i++){var desired=CoverPosition+new Vector3(offsets[i],.7f,-2.6f);anchors[i]=CinematicContactGeometryV16.Nearest(coverMesh,geometry,desired);}
   cover.transform.position=current;Evaluate(0);
  }
  public Vector3 PrepareBeamPickup(Vector3 site)
  {
   var p=site+Vector3.back*2.5f;p.y=HutCollapse.TerrainFloor(p)+.62f;rack=new GameObject("Tréteaux natifs de préparation");
   var source=Beam.root.GetComponent<MeshFilter>();var material=Beam.root.GetComponent<MeshRenderer>().sharedMaterials;
   for(int i=0;i<2;i++){var stand=new GameObject("Support natif de la traverse");stand.transform.SetParent(rack.transform,false);stand.transform.position=p+Vector3.right*(i==0?-.5f:.5f);stand.transform.position=new Vector3(stand.transform.position.x,HutCollapse.TerrainFloor(stand.transform.position)+.275f,stand.transform.position.z);var visual=new GameObject("Bois natif");visual.transform.SetParent(stand.transform,false);visual.AddComponent<MeshFilter>().sharedMesh=source.sharedMesh;visual.AddComponent<MeshRenderer>().sharedMaterials=material;CinematicPropShapeV15.Fit(visual.transform,source.sharedMesh,new Vector3(.22f,.55f,.32f));visual.AddComponent<MeshCollider>().sharedMesh=source.sharedMesh;}
   return p;
  }
  void UpdateGrips(){if(grips==null)return;for(int i=0;i<grips.Length;i++){var a=anchors[i];grips[i].position=geometry.TransformPoint(vertices[a.a]*a.weights.x+vertices[a.b]*a.weights.y+vertices[a.c]*a.weights.z);}}
  public void Evaluate(float time)
  {
   if(cover==null)return;if(originalFrame!=null)originalFrame.enabled=false;foreach(var native in originalCovers.Keys)if(native!=null)native.enabled=false;foreach(var col in collisions.Keys)if(col!=null)col.enabled=false;
   building.SetSceneState(time<10?HabitationStateV16.Prepared:time<34.8f?HabitationStateV16.Frame:HabitationStateV16.Covered);float unfold=Mathf.SmoothStep(0,1,Mathf.InverseLerp(28,34.5f,time));if(!Mathf.Approximately(lastUnfold,unfold)){lastUnfold=unfold;for(int i=0;i<vertices.Length;i++)vertices[i]=Vector3.LerpUnclamped(foldVertices[i],restVertices[i],unfold);coverMesh.vertices=vertices;coverMesh.RecalculateBounds();if(unfold>=1)coverMesh.normals=restNormals;else coverMesh.RecalculateNormals();}UpdateGrips();
  }
  public void End()
  {
   if(cover!=null)Object.Destroy(cover);cover=null;if(rack!=null)Object.Destroy(rack);if(originalFrame!=null)originalFrame.enabled=frameVisible;foreach(var native in originalCovers)if(native.Key!=null)native.Key.enabled=native.Value;originalCovers.Clear();foreach(var pair in collisions)if(pair.Key!=null)pair.Key.enabled=pair.Value;collisions.Clear();if(frame!=null)Object.Destroy(frame);if(frameMesh!=null)Object.Destroy(frameMesh);if(coverMesh!=null)Object.Destroy(coverMesh);if(building!=null){building.SceneOwned=false;building.Refresh();}building=null;
  }
 }
}
