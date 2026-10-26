using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UngaBunga45001;
public static class SitePlacementV10
{
 public static void Inspect(bool apply)
 {
  var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var log=new List<string>();
  foreach(string id in new[]{"habitations","charpente"})
  {
   var marker=campaign.bindings.Find(id);var root=id=="charpente"?campaign.GetComponent<CinematicStage>().fallingFrame:marker;var old=root.position;
   bool Free(Vector3 point)
   {
    float floor=HutCollapse.TerrainFloor(point);float low=floor,high=floor;for(int x=-1;x<=1;x++)for(int z=-1;z<=1;z++){float y=HutCollapse.TerrainFloor(point+new Vector3(x*2.7f,0,z*2.7f));low=Mathf.Min(low,y);high=Mathf.Max(high,y);}if(high-low>.6f)return false;
    foreach(var col in Physics.OverlapBox(new Vector3(point.x,floor+1.45f,point.z),new Vector3(3.1f,1.5f,3.1f),Quaternion.identity,~0,QueryTriggerInteraction.Ignore))if(!(col is TerrainCollider)&&!col.transform.IsChildOf(root)&&!campaign.bindings.characters.Any(a=>col.transform.IsChildOf(campaign.bindings.Find(a.id)))&&col.bounds.size.sqrMagnitude>.3f)return false;return true;
   }
   if(Free(old)){log.Add(id+" existing footprint clear: "+old);continue;}
   Vector3 best=old;float score=float.PositiveInfinity;for(int x=-20;x<=20;x++)for(int z=-20;z<=20;z++){var point=old+new Vector3(x*1.4f,0,z*1.4f);float cost=x*x+z*z;if(cost>=score||!Free(point))continue;score=cost;point.y=HutCollapse.TerrainFloor(point);best=point;}
   if(float.IsInfinity(score))throw new InvalidOperationException("No clear structural footprint near "+id);log.Add(id+" original overlaps native rocks/trees: "+old+"; clear location="+best+"; displacement="+Vector3.Distance(old,best));
   if(apply){root.position=best;if(marker!=root&&!marker.IsChildOf(root)){marker.position+=best-old;EditorUtility.SetDirty(marker);}foreach(var assembly in root.GetComponentsInChildren<HutCollapse>(true)){var p=assembly.transform.position;assembly.assemblyId=assembly.site+":"+p.x.ToString("F2",System.Globalization.CultureInfo.InvariantCulture)+":"+p.z.ToString("F2",System.Globalization.CultureInfo.InvariantCulture)+":"+assembly.intactRenderer.GetComponent<MeshFilter>().sharedMesh.name;EditorUtility.SetDirty(assembly);}EditorUtility.SetDirty(root);Physics.SyncTransforms();}
  }
  File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision10/site-placement-"+(apply?"applied":"diagnosis")+"-"+(RenderBackend.HDRP?"PC":"Web")+".txt",log);if(apply){EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());EditorSceneManager.SaveOpenScenes();}
 }
}
