using System.Collections;
using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;
namespace UngaBunga45001
{
    public sealed class NavigationBootstrap:MonoBehaviour
    {
        public SceneBindings bindings;
        private IEnumerator Start()
        {
            NavMesh.RemoveAllNavMeshData();
            foreach(var surface in FindObjectsByType<NavMeshSurface>(FindObjectsSortMode.None))if(surface.enabled)surface.AddData();
            yield return null;
            if(FindFirstObjectByType<CampaignRuntime>().cinematicDirector.IsPlaying)yield break;
            foreach(var actor in bindings.characters)
            {
                var root=bindings.Find(actor.id);var agent=root.GetComponent<NavMeshAgent>();if(agent==null)continue;
                if(NavMesh.SamplePosition(root.position,out var hit,1.2f,NavMesh.AllAreas)){root.position=hit.position;agent.enabled=true;agent.Warp(hit.position);}
            }
        }
    }
}
