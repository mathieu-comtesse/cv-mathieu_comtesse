using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed partial class CampaignRuntime
 {
  readonly System.Collections.Generic.Dictionary<Transform,HutCollapse[]> structureCache=new System.Collections.Generic.Dictionary<Transform,HutCollapse[]>();
  HutCollapse[] Structures(Transform root){if(root==null)return System.Array.Empty<HutCollapse>();if(!structureCache.TryGetValue(root,out var values)){values=root.GetComponentsInChildren<HutCollapse>(true);structureCache[root]=values;}return values;}
  Transform StructureRoot(string id)=>id=="charpente"?GetComponent<CinematicStage>()?.fallingFrame:bindings.Find(id);
  public float BindingDistance(string id)=>BindingDistance(id,bindings.player.position);
  public float BindingDistance(string id,Vector3 point)
  {
   var target=bindings.Find(id);if(target==null)return float.PositiveInfinity;
   if(id=="charpente"||id=="habitations")
   {float nearest=float.PositiveInfinity;foreach(var h in Structures(StructureRoot(id)))if(h!=null&&h.gameObject.activeInHierarchy&&h.intactRenderer!=null)nearest=Mathf.Min(nearest,(point-h.intactRenderer.bounds.ClosestPoint(point)).sqrMagnitude);if(!float.IsPositiveInfinity(nearest))return Mathf.Sqrt(nearest);}
   return Vector3.Distance(point,target.position);
  }
  public float BindingSearchRadius(string id)
  {
   var target=StructureRoot(id);if(target==null||id!="charpente"&&id!="habitations")return 3.2f;float size=-1;foreach(var h in Structures(target))if(h!=null&&h.gameObject.activeInHierarchy&&h.intactRenderer!=null)size=Mathf.Max(size,Mathf.Max(h.intactRenderer.bounds.extents.x,h.intactRenderer.bounds.extents.z));return size<0?3.2f:size+2.8f;
  }
 }
}
