#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicFrameAuditV16
 {
  sealed class Body{public string id;public CinematicActorV15 owner;public Transform root;public SkinnedMeshRenderer renderer;public Mesh baked;public int[] left,right;public Vector3 before;public bool seen;}
  [Serializable]class Sample{public string actor,clip;public float at,leftSoleGap,rightSoleGap,leftTerrainGap,rightTerrainGap,speed,handGap;public bool fireSafe;public string obstacle;}
  [Serializable]class Report{public string status="captured-for-review",measurement="Animated sole vertices against real upward-facing support colliders and terrain; terrain-only gaps retained separately.";public int samples,timelineActorCommands;public float maxStationaryFloat,minSoleGap;public Sample[] observations;}
  readonly List<Body> bodies=new List<Body>();readonly List<Sample> samples=new List<Sample>();readonly Collider[] overlaps=new Collider[32];readonly RaycastHit[] supports=new RaycastHit[32];readonly CampaignRuntime campaign;float next,last;int commands;float maximum,minimum=float.PositiveInfinity;
  float Floor(Vector3 p,Transform actor){float floor=HutCollapse.TerrainFloor(p);int count=Physics.RaycastNonAlloc(p+Vector3.up*.3f,Vector3.down,supports,1,~0,QueryTriggerInteraction.Ignore);for(int i=0;i<count;i++){var hit=supports[i];if(hit.normal.y>.55f&&hit.point.y<=p.y+.2f&&!hit.transform.IsChildOf(actor)&&hit.collider.GetComponentInParent<Animator>()==null)floor=Mathf.Max(floor,hit.point.y);}return floor;}
  public CinematicFrameAuditV16(CampaignRuntime c){campaign=c;foreach(var binding in c.bindings.characters){var renderer=binding.meshyActor.GetComponentInChildren<SkinnedMeshRenderer>(true);var weights=renderer.sharedMesh.boneWeights;var names=renderer.bones.Select(b=>b.name).ToArray();int[] Foot(string side)=>Enumerable.Range(0,weights.Length).Where(i=>{var w=weights[i];float sum=0;int[] indices={w.boneIndex0,w.boneIndex1,w.boneIndex2,w.boneIndex3};float[] amounts={w.weight0,w.weight1,w.weight2,w.weight3};for(int n=0;n<4;n++)if(names[indices[n]].StartsWith(side)&&(names[indices[n]].Contains("Foot")||names[indices[n]].Contains("Toe")))sum+=amounts[n];return sum>.35f;}).ToArray();bodies.Add(new Body{id=binding.id,owner=binding.animator.GetComponent<CinematicActorV15>(),root=c.bindings.Find(binding.id),renderer=renderer,baked=new Mesh(),left=Foot("Left"),right=Foot("Right")});}}
  public void Tick(float time)
  {
   if(time<next)return;float dt=time-last;last=time;next=time+.5f;var timeline=campaign.GetComponent<CinematicTimelineV16>();if(timeline!=null&&timeline.Active){var field=typeof(CinematicTimelineV16).GetField("actors",System.Reflection.BindingFlags.NonPublic|System.Reflection.BindingFlags.Instance);commands=Math.Max(commands,((System.Collections.IDictionary)field.GetValue(timeline)).Count);}
   foreach(var body in bodies){if(body.owner==null)body.owner=body.renderer.GetComponentInParent<CinematicActorV15>();if(body.owner==null||!body.owner.Owned)continue;float speed=body.seen?Vector3.Distance(body.before,body.root.position)/Mathf.Max(.001f,dt):100;body.seen=true;body.before=body.root.position;body.renderer.BakeMesh(body.baked);var vertices=body.baked.vertices;float Gap(int[] indices,bool terrainOnly=false){float gap=float.PositiveInfinity;foreach(int index in indices){var p=body.renderer.transform.TransformPoint(vertices[index]);gap=Mathf.Min(gap,p.y-(terrainOnly?HutCollapse.TerrainFloor(p):Floor(p,body.root)));}return float.IsPositiveInfinity(gap)?0:gap;}float left=Gap(body.left),right=Gap(body.right);if(speed<.05f)maximum=Mathf.Max(maximum,Mathf.Min(left,right));minimum=Mathf.Min(minimum,Mathf.Min(left,right));string obstacle="";int count=Physics.OverlapCapsuleNonAlloc(body.root.position+Vector3.up*.4f,body.root.position+Vector3.up*1.25f,.25f,overlaps,~0,QueryTriggerInteraction.Ignore);for(int i=0;i<count;i++){var hit=overlaps[i];if(hit is TerrainCollider||hit.transform.IsChildOf(body.root)||hit.GetComponentInParent<Animator>()!=null)continue;if(hit.GetComponentInParent<HutCollapse>()!=null||hit.name.StartsWith("Ossature native")){obstacle=hit.name;break;}}samples.Add(new Sample{actor=body.id,clip=body.owner.ClipId,at=time,handGap=body.owner.ContactGap,leftSoleGap=left,rightSoleGap=right,leftTerrainGap=Gap(body.left,true),rightTerrainGap=Gap(body.right,true),speed=speed,fireSafe=VillageNavigation.HearthSafe(body.root.position),obstacle=obstacle});}
  }
  public void Save(string path){File.WriteAllText(path,JsonUtility.ToJson(new Report{samples=samples.Count,timelineActorCommands=commands,maxStationaryFloat=maximum,minSoleGap=minimum,observations=samples.ToArray()},true));foreach(var body in bodies)UnityEngine.Object.Destroy(body.baked);}
 }
}
#endif
