using System.Collections;using UnityEngine;using UnityEngine.AI;
namespace UngaBunga45001{
 public sealed class WoodGateV19:MonoBehaviour{
  public bool Closed{get;private set;}public bool Moving{get;private set;}public bool Succeeded{get;private set;}public Transform hinge,leaf;public BoxCollider panel;CampaignRuntime c;InstallationStateV18 state;
  public void Initialize(CampaignRuntime campaign,InstallationStateV18 record){c=campaign;state=record;Closed=record.gateClosed;hinge.localRotation=Quaternion.Euler(0,Closed?0:100,0);var obstacle=leaf.gameObject.AddComponent<NavMeshObstacle>();obstacle.shape=NavMeshObstacleShape.Box;obstacle.center=panel.center;obstacle.size=panel.size;obstacle.carving=true;obstacle.carveOnlyStationary=false;}
  bool Occupied(){var center=hinge.parent.TransformPoint(new Vector3(0,.55f,0));foreach(var actor in Physics.OverlapBox(center,new Vector3(.78f,.62f,.24f),hinge.parent.rotation,~0,QueryTriggerInteraction.Ignore))if(actor is CharacterController)return true;return false;}
  public IEnumerator Toggle(){Succeeded=false;if(Moving)yield break;if(!Closed&&Occupied()){c.Inform("Le passage est occupé : éloigne-toi de la barrière.");yield break;}Moving=true;var from=hinge.localRotation;var to=Quaternion.Euler(0,Closed?100:0,0);float t=0;while(t<.65f){if(!c.UserPaused)t+=Time.deltaTime;hinge.localRotation=Quaternion.Slerp(from,to,Mathf.SmoothStep(0,1,t/.65f));yield return null;}Closed=!Closed;state.gateClosed=Closed;Moving=false;Succeeded=true;c.GetComponent<VillageNavigation>().RequestRebuild();c.Save();}
 }
}
