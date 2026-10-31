using System;
using System.IO;
using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.SceneManagement;
namespace UngaBunga45001.Editor
{
    public static class NavigationRepairV2
    {
        public static void Apply()
        {
            FixValidationV2.Apply();
            var scene=EditorSceneManager.GetActiveScene();var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var bindings=campaign.bindings;
            foreach(var agent in UnityEngine.Object.FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None))agent.enabled=false;
            foreach(var surface in UnityEngine.Object.FindObjectsByType<NavMeshSurface>(FindObjectsSortMode.None))surface.AddData();
            if(!NavMesh.SamplePosition(bindings.player.position,out var hub,3,NavMesh.AllAreas))throw new InvalidOperationException("Player has no walkable navigation hub");
            var notes=new System.Collections.Generic.List<string>();
            foreach(var actor in bindings.characters)
            {
                var root=bindings.Find(actor.id);var agent=root.GetComponent<NavMeshAgent>();if(agent==null)continue;agent.enabled=false;
                Vector3? selected=null;
                for(float radius=0;radius<=7&&!selected.HasValue;radius+=.65f)
                for(int angle=0;angle<16&&!selected.HasValue;angle++)
                {
                    var p=root.position+Quaternion.Euler(0,angle*22.5f,0)*Vector3.forward*radius;
                    if(!NavMesh.SamplePosition(p,out var hit,.6f,NavMesh.AllAreas))continue;var path=new NavMeshPath();
                    if(NavMesh.CalculatePath(hub.position,hit.position,NavMesh.AllAreas,path)&&path.status==NavMeshPathStatus.PathComplete)selected=hit.position;
                }
                if(!selected.HasValue)throw new InvalidOperationException("No connected workplace for "+actor.id);
                notes.Add(actor.id+" reposition="+Vector3.Distance(root.position,selected.Value));root.position=selected.Value;
                foreach(var routine in campaign.GetComponent<VillageLife>().routines)if(routine.id==actor.id){routine.workplace=selected.Value;if(NavMesh.SamplePosition(routine.rest,out var rest,3,NavMesh.AllAreas))routine.rest=rest.position;}
            }
            var bootstrap=campaign.GetComponent<NavigationBootstrap>();if(bootstrap==null)bootstrap=campaign.gameObject.AddComponent<NavigationBootstrap>();bootstrap.bindings=bindings;
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision2/navigation-connected.txt",notes);
        }
    }
}
