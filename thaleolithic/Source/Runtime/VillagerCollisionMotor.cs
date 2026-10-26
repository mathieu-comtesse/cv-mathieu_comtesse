using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 [DefaultExecutionOrder(100)]public sealed class VillagerCollisionMotor:MonoBehaviour
 {
  NavMeshAgent agent;CharacterController body;CampaignRuntime campaign;float falling,blocked,rebuildAt;bool wasCinematic;
  public Vector3 Velocity{get;private set;}public int BlockedSteps{get;private set;}public int FireStops{get;private set;}
  public string actorId;
  void Awake()
  {
   agent=GetComponent<NavMeshAgent>();campaign=FindFirstObjectByType<CampaignRuntime>();body=GetComponent<CharacterController>();if(body==null)body=gameObject.AddComponent<CharacterController>();body.height=1.75f;body.center=Vector3.up*.875f;body.radius=Mathf.Max(.29f,agent.radius);body.skinWidth=.025f;body.stepOffset=.22f;body.slopeLimit=44;body.minMoveDistance=0;agent.updatePosition=false;agent.updateRotation=false;
  }
  void LateUpdate()
  {
   bool alive=campaign.State?.characters.Find(c=>c.id==actorId)?.alive??true;bool cinematic=campaign.cinematicDirector.IsPlaying||campaign.IncidentModal||!alive;
   if(cinematic||!agent.enabled||!agent.isOnNavMesh){body.enabled=false;Velocity=Vector3.zero;wasCinematic=true;return;}
   if(!body.enabled){body.enabled=true;agent.nextPosition=transform.position;falling=-2;}
   if(wasCinematic){agent.nextPosition=transform.position;wasCinematic=false;}
   if(campaign.UserPaused){agent.nextPosition=transform.position;Velocity=Vector3.zero;return;}
   var from=transform.position;var delta=agent.nextPosition-from;delta.y=0;float cap=agent.speed*Time.deltaTime+.04f;if(delta.magnitude>cap)delta=delta.normalized*cap;
   if(!VillageNavigation.HearthSafe(from+delta,body.radius)){delta=Vector3.zero;FireStops++;agent.ResetPath();}
   falling=body.isGrounded?-2:Mathf.Max(-18,falling-22*Time.deltaTime);var collisions=body.Move(delta+Vector3.up*falling*Time.deltaTime);var moved=transform.position-from;Velocity=moved/Mathf.Max(.001f,Time.deltaTime);agent.nextPosition=transform.position;
   if((collisions&CollisionFlags.Sides)!=0&&delta.sqrMagnitude>.000001f&&new Vector2(moved.x,moved.z).magnitude<delta.magnitude*.35f)blocked+=Time.deltaTime;else blocked=0;
   if(blocked>.55f){blocked=0;BlockedSteps++;agent.ResetPath();if(Time.time>=rebuildAt){campaign.GetComponent<VillageNavigation>()?.RequestRebuild();rebuildAt=Time.time+4;}}
  }
 }
}
