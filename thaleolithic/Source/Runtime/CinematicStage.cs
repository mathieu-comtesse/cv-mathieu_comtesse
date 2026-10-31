using UnityEngine;
namespace UngaBunga45001
{
 // Serialized scene references remain compatible with the authored V14 scene.
 public sealed class CinematicStage:MonoBehaviour
 {
  public SceneBindings bindings;public CampaignRuntime campaign;
  public Transform fallingFrame,mammoth,wheel,notice;
  CinematicProductionV15 production;
  public CinematicProductionV15 Production=>production;
  public void Begin(string id){if(production==null)production=GetComponent<CinematicProductionV15>()??gameObject.AddComponent<CinematicProductionV15>();production.Begin(id,this);}
  public void Evaluate(float time,float duration,Camera camera)=>production?.Evaluate(time,camera);
  public void End()=>production?.End(true);
  public void Abort()=>production?.End(false);
 }
}
