#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEngine;
namespace UngaBunga45001
{
 // Editor evidence and editable Blender assembly, never included in player builds.
 public sealed class CinematicMotionTraceV16
 {
  [Serializable]class Pose{public string id;public Vector3 position;public Quaternion rotation;public float[] bones;}
  [Serializable]class Sample{public float at,fov;public Vector3 cameraPosition;public Quaternion cameraRotation;public Pose[] actors,props;}
  [Serializable]class Skeleton{public string id;public string[] bones;}
  [Serializable]class Geometry{public string id;public Vector3 localPosition,localScale;public Quaternion localRotation;public Vector3[] vertices;public Vector2[] uv;public int[] triangles;}
  [Serializable]class Trace{public string provenance="Actual Unity playback of Blender-authored takes. Native local bone coordinates, props, world roots and real production camera sampled at 10 Hz for editable assembly.";public Skeleton[] skeletons;public Geometry[] geometry;public Sample[] samples;}
  readonly CampaignRuntime campaign;readonly CharacterBinding[] bindings;readonly List<Sample> samples=new List<Sample>();readonly Dictionary<string,Transform> objects=new Dictionary<string,Transform>();readonly List<Geometry> geometry=new List<Geometry>();float next;
  void Add(string id,Transform root,MeshFilter filter,Mesh source=null)
  {
   if(filter==null)return;objects[id]=root;var mesh=source??filter.sharedMesh;geometry.Add(new Geometry{id=id,localPosition=root.InverseTransformPoint(filter.transform.position),localRotation=Quaternion.Inverse(root.rotation)*filter.transform.rotation,localScale=new Vector3(filter.transform.lossyScale.x/root.lossyScale.x,filter.transform.lossyScale.y/root.lossyScale.y,filter.transform.lossyScale.z/root.lossyScale.z),vertices=mesh.vertices,uv=mesh.uv,triangles=mesh.triangles});
  }
  public CinematicMotionTraceV16(CampaignRuntime c)
  {
   campaign=c;bindings=c.bindings.characters.Where(b=>b.animator.GetComponent<CinematicActorV15>()?.Owned==true).ToArray();var production=c.GetComponent<CinematicStage>().Production;var props=(IDictionary)typeof(CinematicProductionV15).GetField("props",BindingFlags.NonPublic|BindingFlags.Instance).GetValue(production);
   foreach(DictionaryEntry pair in props){var type=pair.Value.GetType();var root=(Transform)type.GetField("root").GetValue(pair.Value);string id=(string)pair.Key;Mesh source=null;if(id=="cover-sheet"){var native=c.bindings.buildings.First(b=>b.id=="habitations").stages.Where(s=>s!=null).SelectMany(s=>s.GetComponentsInChildren<HutCollapse>(true)).First(h=>h.name.Contains("-hide-primeval")&&!h.name.Contains("destroyed"));source=native.intactRenderer.GetComponent<MeshFilter>().sharedMesh;}Add(id,root,root.GetComponentInChildren<MeshFilter>(),source);}
   var frame=UnityEngine.Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None).FirstOrDefault(m=>m.name.StartsWith("Ossature native"));if(frame!=null)Add("construction-frame",frame.transform,frame);var rack=GameObject.Find("Tréteaux natifs de préparation");if(rack!=null){int i=0;foreach(var filter in rack.GetComponentsInChildren<MeshFilter>())Add("staging-stand-"+(i++),filter.transform.parent,filter);}
  }
  public void Tick()
  {
   float time=campaign.State.cinematicTimeV15;if(time<next)return;next=time+.1f;var camera=campaign.cinematicDirector.cinematicCamera;var poses=new List<Pose>();
   foreach(var binding in bindings){var renderer=binding.meshyActor.GetComponentInChildren<SkinnedMeshRenderer>();var space=renderer.transform;var values=new float[renderer.bones.Length*7];for(int i=0;i<renderer.bones.Length;i++){var b=renderer.bones[i];var p=space.InverseTransformPoint(b.position);var q=Quaternion.Inverse(space.rotation)*b.rotation;int n=i*7;values[n]=p.x;values[n+1]=p.y;values[n+2]=p.z;values[n+3]=q.x;values[n+4]=q.y;values[n+5]=q.z;values[n+6]=q.w;}poses.Add(new Pose{id=binding.id,position=space.position,rotation=space.rotation,bones=values});}
   samples.Add(new Sample{at=time,fov=camera.fieldOfView,cameraPosition=camera.transform.position,cameraRotation=camera.transform.rotation,actors=poses.ToArray(),props=objects.Where(p=>p.Value!=null).Select(p=>new Pose{id=p.Key,position=p.Value.position,rotation=p.Value.rotation}).ToArray()});
  }
  public void Save(string path){File.WriteAllText(path,JsonUtility.ToJson(new Trace{skeletons=bindings.Select(b=>new Skeleton{id=b.id,bones=b.meshyActor.GetComponentInChildren<SkinnedMeshRenderer>().bones.Select(t=>t.name).ToArray()}).ToArray(),geometry=geometry.ToArray(),samples=samples.ToArray()}));}
 }
}
#endif
