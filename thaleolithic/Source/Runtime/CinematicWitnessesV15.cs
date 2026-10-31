using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 public sealed class CinematicWitnessesV15
 {
  sealed class Witness{public string id;public Transform root;public VillagerBrain brain;public VillagerCollisionMotor collision;public bool thinking,moving;public NavMeshAgent agent;public bool stopped;}
  readonly List<Witness> witnesses=new List<Witness>();CinematicPerformanceV15 performances;
  public void Begin(CampaignRuntime c,string victim)
  {
   performances=CinematicPerformanceV15.For(c);var origin=c.bindings.Find(victim).position;
   foreach(var actor in c.bindings.characters)
   {
    if(actor.id==victim||!actor.meshyActor.activeInHierarchy)continue;var root=c.bindings.Find(actor.id);if(root==null||Vector3.Distance(root.position,origin)>22)continue;
    var w=new Witness{id=actor.id,root=root,brain=root.GetComponent<VillagerBrain>(),collision=root.GetComponent<VillagerCollisionMotor>(),agent=root.GetComponent<NavMeshAgent>()};
    if(w.brain!=null){w.thinking=w.brain.enabled;w.brain.enabled=false;}if(w.collision!=null){w.moving=w.collision.enabled;w.collision.enabled=false;}if(w.agent!=null&&w.agent.enabled&&w.agent.isOnNavMesh){w.stopped=w.agent.isStopped;w.agent.isStopped=true;}
    string clip=actor.id=="aurelien"?"F15_C04_Aurelien_SwallowReplyAndReconsider":actor.id=="mathieu"?"F15_C03_Mathieu_TouchShoulderAndBlockPassage":actor.id=="mathilde"&&Vector3.Distance(root.position,origin)<3?"F15_C02_Mathilde_KneelAndAssessVictim":"F15_C02_Dylan_FreezeThenStepAway";
    performances.Play(actor.id,clip,victim,true);witnesses.Add(w);
   }
  }
  public void End(){foreach(var w in witnesses){performances.Stop(w.id);if(w.brain!=null){w.brain.enabled=w.thinking;w.brain.ResumeAfterCinematic();}if(w.collision!=null)w.collision.enabled=w.moving;if(w.agent!=null&&w.agent.enabled&&w.agent.isOnNavMesh){w.agent.Warp(w.root.position);w.agent.isStopped=w.stopped;}}witnesses.Clear();}
 }
}
