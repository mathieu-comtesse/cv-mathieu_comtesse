using System;
using UnityEngine;
namespace UngaBunga45001
{
 // Manual film paths must retain the support height of small walkable stones.
 public static class CinematicSupportV16
 {
  static readonly RaycastHit[] hits=new RaycastHit[32];static readonly Vector3[] offsets={Vector3.zero,Vector3.right*.35f,Vector3.left*.35f,Vector3.forward*.35f,Vector3.back*.35f};
  public static float Height(Vector3 point,Transform actor)
  {
   float terrain=HutCollapse.TerrainFloor(point),height=terrain;
   foreach(var offset in offsets){var p=point+offset;p.y=terrain+.45f;int count=Physics.RaycastNonAlloc(p,Vector3.down,hits,.7f,~0,QueryTriggerInteraction.Ignore);for(int i=0;i<count;i++){var hit=hits[i];if(hit.transform.IsChildOf(actor)||hit.normal.y<.6f||hit.point.y>terrain+.3f)continue;if(hit.collider is TerrainCollider||hit.collider is CharacterController||hit.collider.GetComponentInParent<UnityEngine.AI.NavMeshAgent>()!=null||hit.collider.GetComponentInParent<Animator>()!=null)continue;var body=hit.collider.attachedRigidbody;if(body!=null&&!body.isKinematic&&!body.IsSleeping())continue;height=Mathf.Max(height,hit.point.y);}}
   return height;
  }
 }
}
