using UnityEngine;
namespace UngaBunga45001
{
 public sealed class ConstructionCameraV19
 {
  #if THALEOLITHIC_CINEMACHINE
  Unity.Cinemachine.CinemachineBrain brain;Unity.Cinemachine.CinemachineCamera shot;bool created,wasEnabled;Unity.Cinemachine.CinemachineBrain.UpdateMethods oldUpdate;
  #endif
  public bool Active{get;private set;}
  public void Begin(Camera camera)
  {
   #if THALEOLITHIC_CINEMACHINE
   brain=camera.GetComponent<Unity.Cinemachine.CinemachineBrain>();created=brain==null;if(created)brain=camera.gameObject.AddComponent<Unity.Cinemachine.CinemachineBrain>();wasEnabled=brain.enabled;oldUpdate=brain.UpdateMethod;brain.UpdateMethod=Unity.Cinemachine.CinemachineBrain.UpdateMethods.ManualUpdate;brain.DefaultBlend=new Unity.Cinemachine.CinemachineBlendDefinition(Unity.Cinemachine.CinemachineBlendDefinition.Styles.Cut,0);brain.enabled=true;var go=new GameObject("Cinemachine · chantier V19");shot=go.AddComponent<Unity.Cinemachine.CinemachineCamera>();var lens=shot.Lens;lens.FieldOfView=camera.fieldOfView;lens.NearClipPlane=camera.nearClipPlane;lens.FarClipPlane=camera.farClipPlane;shot.Lens=lens;Active=true;
   #endif
  }
  public void Apply(Camera camera)
  {
   #if THALEOLITHIC_CINEMACHINE
   if(!Active)return;shot.transform.SetPositionAndRotation(camera.transform.position,camera.transform.rotation);brain.ManualUpdate(Time.frameCount,Time.deltaTime);
   #endif
  }
  public void End()
  {
   #if THALEOLITHIC_CINEMACHINE
   if(shot!=null)Object.Destroy(shot.gameObject);if(brain!=null){brain.enabled=false;if(created)Object.Destroy(brain);else{brain.UpdateMethod=oldUpdate;brain.enabled=wasEnabled;}}
   #endif
   Active=false;
  }
 }
}
