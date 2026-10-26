using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.SceneManagement;
using UngaBunga45001;
public static class NavigationSafetyV11
{
 public static void Apply()
 {
  var c=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var nav=c.GetComponent<VillageNavigation>().surface;int fires=0;
  foreach(var fire in UnityEngine.Object.FindObjectsByType<NativeFire>(FindObjectsSortMode.None))
  {
   if(fire.transform.parent==null||!fire.transform.parent.GetComponentsInChildren<MeshRenderer>().Any(r=>r.name.Contains("fireplace")))continue;
   var modifier=fire.GetComponent<NavMeshModifierVolume>();if(modifier==null)modifier=fire.gameObject.AddComponent<NavMeshModifierVolume>();modifier.area=1;modifier.center=Vector3.up;modifier.size=new Vector3((fire.radius+.8f)*2,2.5f,(fire.radius+.8f)*2);fires++;
  }
  foreach(var actor in c.bindings.characters.Where(a=>a.id!="dylan")){var root=c.bindings.Find(actor.id);var agent=root.GetComponent<NavMeshAgent>();if(agent==null)continue;agent.radius=.31f;agent.height=1.75f;agent.baseOffset=0;VillageNavigation.Configure(agent);EditorUtility.SetDirty(agent);}
  Physics.SyncTransforms();nav.RemoveData();nav.BuildNavMesh();if(nav.navMeshData==null)throw new InvalidOperationException("Navigation safety bake failed");EditorUtility.SetDirty(nav.navMeshData);
  var fireList=UnityEngine.Object.FindObjectsByType<NativeFire>(FindObjectsSortMode.None);var notes=new System.Collections.Generic.List<string>{"Surface="+nav.name+"; geometry="+nav.useGeometry+"; agent="+nav.agentTypeID+"; fire exclusion volumes="+fires};
  bool Safe(Vector3 point,Transform root)
  {if(Mathf.Abs(point.y-HutCollapse.TerrainFloor(point))>.45f)return false;foreach(var fire in fireList)if(fire.lit&&new Vector2(point.x-fire.transform.position.x,point.z-fire.transform.position.z).magnitude<fire.radius+.85f)return false;return !Physics.OverlapCapsule(point+Vector3.up*.36f,point+Vector3.up*1.4f,.3f,~0,QueryTriggerInteraction.Ignore).Any(col=>!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&(root==null||!col.transform.IsChildOf(root)));}
  if(!NavMesh.SamplePosition(c.bindings.player.position,out var hub,2,VillageNavigation.Filter()))throw new InvalidOperationException("No navigation hub at the player");
  bool Connected(Vector3 point){var path=new NavMeshPath();return NavMesh.CalculatePath(hub.position,point,VillageNavigation.Filter(),path)&&path.status==NavMeshPathStatus.PathComplete;}
  Vector3 Find(Vector3 goal,Transform actor)
  {for(float radius=0;radius<9;radius+=.45f)for(int angle=0;angle<(radius==0?1:24);angle++){var p=goal+Quaternion.Euler(0,angle*15,0)*Vector3.forward*radius;p.y=HutCollapse.TerrainFloor(p);if(NavMesh.SamplePosition(p,out var hit,.45f,VillageNavigation.Filter())&&Safe(hit.position,actor)&&Connected(hit.position))return hit.position;}throw new InvalidOperationException("No safe native movement point near "+goal);}
  foreach(var actor in c.bindings.characters.Where(a=>a.id!="dylan")){var root=c.bindings.Find(actor.id);if(!Safe(root.position,root)||!NavMesh.SamplePosition(root.position,out var current,.35f,VillageNavigation.Filter())||!Connected(current.position)){var old=root.position;var agent=root.GetComponent<NavMeshAgent>();bool enabled=agent.enabled;agent.enabled=false;root.position=Find(old,root);agent.enabled=enabled;notes.Add(actor.id+" moved out of obstacle/fire/disconnected island: "+Vector3.Distance(old,root.position));EditorUtility.SetDirty(root);}}
  var life=c.GetComponent<VillageLife>();foreach(var routine in life.routines){var root=c.bindings.Find(routine.id);if(routine.id=="uma"){routine.workplace=c.bindings.Find("habitations").position+Vector3.right*3.4f;routine.workFocus=c.bindings.Find("habitations").position+Vector3.up;}
   routine.workplace=Find(routine.workplace,root);routine.rest=Find(routine.rest,root);}
  EditorUtility.SetDirty(life);AssetDatabase.SaveAssets();EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());EditorSceneManager.SaveOpenScenes();File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision10/navigation-safety-"+(RenderBackend.HDRP?"PC":"Web")+".txt",notes);
 }
}
