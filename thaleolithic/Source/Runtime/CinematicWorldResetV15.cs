using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 public sealed class CinematicWorldResetV15:MonoBehaviour
 {
  sealed class Initial{public CharacterBinding actor;public Transform root;public Vector3 position;public Quaternion rotation,visual;public bool agentEnabled;}
  readonly List<Initial> initial=new List<Initial>();CampaignRuntime c;Vector3 cameraPosition;Quaternion cameraRotation;bool restoring;
  public static CinematicWorldResetV15 For(CampaignRuntime c)
  {
   var reset=c.GetComponent<CinematicWorldResetV15>();if(reset!=null)return reset;reset=c.gameObject.AddComponent<CinematicWorldResetV15>();reset.c=c;reset.cameraPosition=c.bindings.gameplayCamera.transform.position;reset.cameraRotation=c.bindings.gameplayCamera.transform.rotation;
   // Native agents begin disabled while the village NavMesh is prepared. Their initial
   // enabled flag is a loading state, not the intended state of a living villager.
   foreach(var actor in c.bindings.characters){var root=c.bindings.Find(actor.id);if(root!=null){var agent=root.GetComponent<NavMeshAgent>();reset.initial.Add(new Initial{actor=actor,root=root,position=root.position,rotation=root.rotation,visual=actor.meshyActor.transform.localRotation,agentEnabled=agent!=null&&actor.id!="dylan"});}}return reset;
  }
  public void Restore()
  {
   foreach(var item in initial)
   {
    var agent=item.root.GetComponent<NavMeshAgent>();var cc=item.root.GetComponent<CharacterController>();bool activeBody=cc!=null&&cc.enabled;if(agent!=null)agent.enabled=false;if(cc!=null)cc.enabled=false;item.root.SetPositionAndRotation(item.position,item.rotation);item.actor.meshyActor.transform.localRotation=item.visual;if(cc!=null)cc.enabled=activeBody;
    var load=item.actor.animator.GetComponent<CarriedLoad>();if(load!=null){load.carrying=false;load.ShowPresentation(false);}
   }
   foreach(var hut in FindObjectsByType<HutCollapse>(FindObjectsSortMode.None))hut.ResetIntact();c.bindings.gameplayCamera.transform.SetPositionAndRotation(cameraPosition,cameraRotation);var motor=c.bindings.player.GetComponent<ThirdPersonMotor>();motor.FaceDirection(cameraRotation*Vector3.forward);motor.SetCrouched(false);Physics.SyncTransforms();restoring=true;c.GetComponent<VillageNavigation>()?.RequestRebuild();
  }
  public void EnableAgents()
  {
   if(!restoring||c.GetComponent<VillageNavigation>().Pending)return;foreach(var item in initial){var agent=item.root.GetComponent<NavMeshAgent>();if(agent==null||!item.agentEnabled)continue;if(NavMesh.SamplePosition(item.root.position,out var point,.8f,VillageNavigation.Filter())&&VillageNavigation.Clear(point.position,item.root)){item.root.position=point.position+Vector3.up*.04f;agent.enabled=true;if(agent.isOnNavMesh)agent.Warp(item.root.position);}}restoring=false;
  }
  void Update(){if(restoring&&c!=null&&!c.cinematicDirector.IsPlaying)EnableAgents();}
 }
}
