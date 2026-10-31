using System;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 [Serializable]public sealed class CinematicWorldPropV15{public string id,kind;public Vector3 position,size;public Quaternion rotation=Quaternion.identity;}
 public static class CinematicPropShapeV15
 {
  public static void Fit(Transform visual,Mesh mesh,Vector3 desired)
  {
   if(mesh==null){visual.localScale=desired;return;}var size=mesh.bounds.size;int source=size.x>size.y?(size.x>size.z?0:2):(size.y>size.z?1:2),target=desired.x>desired.y?(desired.x>desired.z?0:2):(desired.y>desired.z?1:2);Vector3[] axis={Vector3.right,Vector3.up,Vector3.forward};var rotation=Quaternion.FromToRotation(axis[source],axis[target]);var scale=Vector3.one;
   for(int i=0;i<3;i++){var mapped=rotation*axis[i];float wanted=Mathf.Abs(mapped.x)*desired.x+Mathf.Abs(mapped.y)*desired.y+Mathf.Abs(mapped.z)*desired.z;scale[i]=wanted/Mathf.Max(.01f,size[i]);}visual.localRotation=rotation;visual.localScale=scale;visual.localPosition=-(rotation*Vector3.Scale(mesh.bounds.center,scale));
  }
 }
 public sealed class CinematicWorldPropsV15:MonoBehaviour
 {
  readonly Dictionary<string,GameObject> objects=new Dictionary<string,GameObject>();CampaignRuntime c;CampaignSave observed;
  public static CinematicWorldPropsV15 For(CampaignRuntime c){var p=c.GetComponent<CinematicWorldPropsV15>()??c.gameObject.AddComponent<CinematicWorldPropsV15>();p.c=c;p.Restore();return p;}
  void Update()=>Restore();
  void Restore()
  {
   if(c==null)c=GetComponent<CampaignRuntime>();if(c.State==null||observed==c.State)return;foreach(var go in objects.Values)if(go!=null){go.SetActive(false);Destroy(go);}objects.Clear();observed=c.State;
   foreach(var record in c.State.cinematicWorldPropsV15??new List<CinematicWorldPropV15>())
   {
    var root=new GameObject("Objet posé · "+record.id);root.transform.SetPositionAndRotation(record.position,record.rotation);var visual=GameObject.CreatePrimitive(PrimitiveType.Cube);Destroy(visual.GetComponent<Collider>());visual.transform.SetParent(root.transform,false);var accident=c.GetComponent<AccidentDirector>();visual.GetComponent<Renderer>().sharedMaterial=accident.woodMaterial;
    Mesh mesh=null;if(record.kind=="beam"){var frame=c.GetComponent<CinematicStage>().fallingFrame?.GetComponentInChildren<HutCollapse>();if(frame!=null)foreach(var piece in frame.pieces)if(piece.kind==2){mesh=piece.root.GetComponent<MeshFilter>().sharedMesh;break;}}
    if(mesh!=null)visual.GetComponent<MeshFilter>().sharedMesh=mesh;CinematicPropShapeV15.Fit(visual.transform,mesh,record.size);var collider=root.AddComponent<BoxCollider>();collider.size=record.size;objects[record.id]=root;
   }
  }
  public void Store(string id,string kind,Vector3 size,GameObject go)
  {
   observed=c.State;if(objects.TryGetValue(id,out var previous)&&previous!=null&&previous!=go){previous.SetActive(false);Destroy(previous);}objects[id]=go;go.name="Objet posé · "+id;var collider=go.GetComponent<BoxCollider>();if(collider==null)collider=go.AddComponent<BoxCollider>();collider.size=size;var rb=go.GetComponent<Rigidbody>();if(rb!=null){rb.linearVelocity=Vector3.zero;rb.angularVelocity=Vector3.zero;rb.isKinematic=true;}
   var records=c.State.cinematicWorldPropsV15??=new List<CinematicWorldPropV15>();records.RemoveAll(p=>p.id==id);records.Add(new CinematicWorldPropV15{id=id,kind=kind,size=size,position=go.transform.position,rotation=go.transform.rotation});
  }
 }
}
