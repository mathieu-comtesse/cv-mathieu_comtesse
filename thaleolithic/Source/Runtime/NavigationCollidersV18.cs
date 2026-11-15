using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 // Match navigation to real static collision volumes. Existing rock collisions stay solid.
 public sealed class NavigationCollidersV18:MonoBehaviour
 {
  sealed class Proxy{public Collider source;public NavMeshObstacle obstacle;public Bounds bounds;}
  readonly List<Proxy> proxies=new List<Proxy>();CampaignRuntime c;float next;
  public int Count=>proxies.Count;
  IEnumerator Start()
  {
   c=GetComponent<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);yield return null;Physics.SyncTransforms();var center=c.bindings.Find("grand_menhir").position;
   foreach(var source in FindObjectsByType<Collider>(FindObjectsSortMode.None).OrderBy(x=>(x.bounds.center-center).sqrMagnitude))
   {
    if(proxies.Count>=100)break;if(source.isTrigger||source is TerrainCollider||source is CharacterController||!source.enabled||source.GetComponentInParent<NavMeshAgent>()!=null||source.GetComponentInParent<ThirdPersonMotor>()!=null||source.GetComponentInParent<NavMeshObstacle>()!=null||source.attachedRigidbody!=null&&!source.attachedRigidbody.isKinematic)continue;
    string ancestry=source.name;for(var parent=source.transform.parent;parent!=null;parent=parent.parent)ancestry+=" "+parent.name;
    bool rock=source is MeshCollider&&source.GetComponentInParent<HutCollapse>()==null&&System.Text.RegularExpressions.Regex.IsMatch(ancestry,"rock|stone|bench|rack|log|grindstone|workbench",System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    bool tree=source is CapsuleCollider&&source.GetComponentInParent<HutCollapse>()==null;
    if(!rock&&!tree)continue;
    var b=source.bounds;float floor=VillageLife.Ground(b.center);if((b.center-center).sqrMagnitude>65*65||b.max.y<floor+.25f||b.min.y>floor+1.85f||b.size.x>18||b.size.z>18)continue;
    var root=new GameObject("Navigation · collision réelle · "+source.name);root.transform.SetParent(transform,true);root.transform.position=b.center;
    var obstacle=root.AddComponent<NavMeshObstacle>();obstacle.shape=NavMeshObstacleShape.Box;obstacle.size=new Vector3(Mathf.Max(.1f,b.size.x),b.size.y,Mathf.Max(.1f,b.size.z));obstacle.carving=true;obstacle.carveOnlyStationary=true;obstacle.carvingMoveThreshold=.05f;obstacle.carvingTimeToStationary=.1f;
    proxies.Add(new Proxy{source=source,obstacle=obstacle,bounds=b});
   }
   c.GetComponent<QuestNavigationController>()?.ForceRefresh();
  }
  void Update()
  {
   if(Time.unscaledTime<next)return;next=Time.unscaledTime+.7f;
   foreach(var p in proxies)
   {
    bool active=p.source!=null&&p.source.enabled&&p.source.gameObject.activeInHierarchy;
    if(p.obstacle.enabled!=active){p.obstacle.enabled=active;c.GetComponent<QuestNavigationController>()?.Revalidate();}if(!active)continue;var b=p.source.bounds;
    if((b.center-p.bounds.center).sqrMagnitude>.0025f||(b.size-p.bounds.size).sqrMagnitude>.0025f){p.obstacle.transform.position=b.center;p.obstacle.size=b.size;p.bounds=b;c.GetComponent<QuestNavigationController>()?.Revalidate();}
   }
  }
 }
}
