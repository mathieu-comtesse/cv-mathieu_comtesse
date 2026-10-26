using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed partial class CampaignRuntime
 {
  Transform StructureRoot(string id)=>id=="charpente"?GetComponent<CinematicStage>()?.fallingFrame:bindings.Find(id);
  public float BindingDistance(string id)=>BindingDistance(id,bindings.player.position);
  public float BindingDistance(string id,Vector3 point)
  {
   var target=bindings.Find(id);if(target==null)return float.PositiveInfinity;
   if(id=="charpente"||id=="habitations")
   {var structuralRoot=StructureRoot(id);var structures=structuralRoot==null?System.Array.Empty<HutCollapse>():structuralRoot.GetComponentsInChildren<HutCollapse>().Where(h=>h.intactRenderer!=null).ToArray();if(structures.Length>0)return structures.Min(h=>Vector3.Distance(point,h.intactRenderer.bounds.ClosestPoint(point)));}
   return Vector3.Distance(point,target.position);
  }
  public float BindingSearchRadius(string id)
  {
   var target=StructureRoot(id);if(target==null||id!="charpente"&&id!="habitations")return 3.2f;var structures=target.GetComponentsInChildren<HutCollapse>();return structures.Length==0?3.2f:structures.Max(h=>Mathf.Max(h.intactRenderer.bounds.extents.x,h.intactRenderer.bounds.extents.z))+2.8f;
  }
 }
}
