using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public enum HabitationStateV16{Damaged,Prepared,Frame,Covered,Verified,Reopened}
 public sealed class CinematicBuildingStateV16:MonoBehaviour
 {
  CampaignRuntime campaign;GameObject cover;float check;HabitationStateV16 sceneState;public bool SceneOwned;public HabitationStateV16 State{get;private set;}
  public void SetSceneState(HabitationStateV16 state){sceneState=state;if(SceneOwned)State=state;}
  public static CinematicBuildingStateV16 For(CampaignRuntime c){var value=c.GetComponent<CinematicBuildingStateV16>()??c.gameObject.AddComponent<CinematicBuildingStateV16>();value.campaign=c;return value;}
  public static GameObject MakeCover(CampaignRuntime c,bool collision)
  {
   var binding=c.bindings.buildings.FirstOrDefault(b=>b.id=="habitations");if(binding==null)return null;
   var native=binding.stages.Where(s=>s!=null).SelectMany(s=>s.GetComponentsInChildren<HutCollapse>(true)).FirstOrDefault(h=>h.name.Contains("-hide-primeval")&&!h.name.Contains("destroyed"));if(native==null)return null;
   var source=native.intactRenderer;var sourceMesh=source.GetComponent<MeshFilter>().sharedMesh;var root=new GameObject("Couverture native · travaux réalisés");root.transform.position=source.transform.TransformPoint(sourceMesh.bounds.center);
   var geometry=new GameObject("Peau native");geometry.transform.SetParent(root.transform,false);geometry.transform.SetPositionAndRotation(source.transform.position,source.transform.rotation);geometry.transform.localScale=source.transform.lossyScale;var mesh=source.GetComponent<MeshFilter>().sharedMesh;geometry.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=geometry.AddComponent<MeshRenderer>();renderer.sharedMaterials=source.sharedMaterials;renderer.receiveShadows=true;renderer.shadowCastingMode=source.shadowCastingMode;if(collision)geometry.AddComponent<MeshCollider>().sharedMesh=mesh;
   return root;
  }
  public void Refresh()
  {
   if(campaign?.State==null)return;bool worked=campaign.State.completedActions.Contains("WORK_M_V_ABRI"),verified=campaign.HasFlag("verified:M_V_ABRI"),reopened=verified&&campaign.Value("risk","abri")==0;
   State=SceneOwned?sceneState:reopened?HabitationStateV16.Reopened:verified?HabitationStateV16.Verified:worked?HabitationStateV16.Covered:campaign.State.hutFailures!=null&&campaign.State.hutFailures.Any(h=>h.site=="habitations"&&!h.repaired&&!h.rebuilt)?HabitationStateV16.Damaged:HabitationStateV16.Frame;
   bool show=worked&&!verified&&!SceneOwned;if(show&&cover==null)cover=MakeCover(campaign,true);if(cover!=null)cover.SetActive(show);
  }
  void Update(){if(Time.unscaledTime<check)return;check=Time.unscaledTime+.25f;Refresh();}
  void OnDestroy(){if(cover!=null)Destroy(cover);}
 }
}
