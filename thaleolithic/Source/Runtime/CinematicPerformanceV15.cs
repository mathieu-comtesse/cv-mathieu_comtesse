using System;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 // Short performances inside the existing duel/accident directors use the same native clip reader.
 public sealed class CinematicPerformanceV15:MonoBehaviour
 {
  sealed class Take{public string actor,look;public AnimationClip clip,movement;public CinematicActorV15 player;public float time,movementTime,movementWeight;public bool hold;}
  readonly Dictionary<string,Take> takes=new Dictionary<string,Take>();readonly List<string> finished=new List<string>();CampaignRuntime campaign;
  public static CinematicPerformanceV15 For(CampaignRuntime c){var p=c.GetComponent<CinematicPerformanceV15>();if(p==null)p=c.gameObject.AddComponent<CinematicPerformanceV15>();p.campaign=c;return p;}
  public bool Play(string actor,string clipId,string look="",bool hold=false)
  {
   if(campaign==null)campaign=GetComponent<CampaignRuntime>();if(campaign.cinematicDirector.IsPlaying)return false;
   var animator=campaign.bindings.AnimatorFor(actor);var clip=CinematicCatalogueV15.Clip(clipId);if(animator==null||clip==null)return false;
   if(!takes.TryGetValue(actor,out var take))
   {
    var player=animator.GetComponent<CinematicActorV15>()??animator.gameObject.AddComponent<CinematicActorV15>();if(player.Owned)return false;player.Acquire(animator);take=new Take{actor=actor,player=player};takes.Add(actor,take);
   }
   take.clip=clip;take.time=0;take.hold=hold;take.look=look;take.movement=null;take.movementWeight=0;return true;
  }
  public bool Acting(string actor)=>takes.ContainsKey(actor);
  public void TravelLegs(string actor,AnimationClip clip,float time,float weight){if(takes.TryGetValue(actor,out var take)){take.movement=clip;take.movementTime=time;take.movementWeight=weight;}}
  public void Stop(string actor){if(takes.TryGetValue(actor,out var take)){take.player.Release();takes.Remove(actor);}}
  public void StopAll(){foreach(var take in takes.Values)take.player.Release();takes.Clear();}
  void LateUpdate()
  {
   if(campaign==null||campaign.State==null)return;if(campaign.cinematicDirector.IsPlaying){StopAll();return;}finished.Clear();
   foreach(var pair in takes)
   {
    var take=pair.Value;if(!campaign.UserPaused)take.time+=Time.deltaTime;
    if(!string.IsNullOrEmpty(take.look)){var focus=campaign.bindings.Find(take.look);if(focus!=null)take.player.Look(focus.position+Vector3.up*1.4f,.7f);}
    take.player.Sample(take.clip,Mathf.Min(take.time,take.clip.length-.001f),Mathf.SmoothStep(0,1,take.time/.18f),take.movement,take.movementTime,take.movementWeight);
    if(take.time>=take.clip.length&&!take.hold)finished.Add(pair.Key);
   }
   foreach(var actor in finished)Stop(actor);
  }
  public void DuelDecision(int question,bool correct)
  {
   int n=Mathf.Clamp(question+1,1,5);string[] action={"ResponsibilityStepIn","WorkersEvidenceCounter","ResourcesTwoHandCheck","ConsultationSideStep","CommitmentGroundedFinish"};
   string[] counter={"SloganMassue","TabletteDeDelegation","ManqueDeMoyens","OrdreSansConsultation","MiniMenhirAutoritaire"};
   Play("dylan",correct?"F15_DUEL_"+n+"_Dylan_"+action[n-1]:"F15_DUEL_"+n+"_Dylan_ReactTo"+counter[n-1],"aurelien");
   Play("aurelien",correct?"F15_DUEL_"+n+"_Aurelien_ReceiveDecision"+n:"F15_DUEL_"+n+"_Aurelien_Counter"+counter[n-1],"dylan");
  }
  public bool Accident(string actor,string kind)
  {
   string name=char.ToUpperInvariant(kind[0])+kind.Substring(1);string who=char.ToUpperInvariant(actor[0])+actor.Substring(1);string id="F15_DEATH_"+kind.ToUpperInvariant()+"_"+who+"_RecognizeAndReactTo"+name;
   if(CinematicCatalogueV15.Clip(id)==null)id="F15_DEATH_"+kind.ToUpperInvariant()+"_Dylan_RecognizeAndReactTo"+name;
   return Play(actor,id,"",true);
  }
  void OnDisable()=>StopAll();void OnDestroy()=>StopAll();
 }
}
