using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;
namespace UngaBunga45001
{
 // Timeline supplies the actual actor cues, framing, prop clocks and event gates.
 // Native animation graphs remain the single writers of the humanoid poses.
 public sealed class CinematicTimelineV16:MonoBehaviour
 {
  public sealed class ActorFrame{public readonly FilmCueV15 cue=new FilmCueV15();public AnimationClip clip;public float local;}
  readonly Dictionary<string,ActorFrame> actors=new Dictionary<string,ActorFrame>();
  readonly Dictionary<string,ActorFrame> actorPool=new Dictionary<string,ActorFrame>();
  public readonly Dictionary<string,float> PropTimes=new Dictionary<string,float>();public readonly HashSet<int> EventIndices=new HashSet<int>();
  PlayableDirector director;TimelineAsset asset;
  public bool Active=>asset!=null;public float Clock{get;private set;}public int ShotIndex{get;private set;}=-1;public string Text{get;private set;}public float LightWeight{get;private set;}=1;
  public bool Begin(string id)
  {
   return BeginAsset(Resources.Load<TimelineAsset>("CinematicsV16/Timelines/"+id));
  }
  public bool BeginAsset(TimelineAsset timeline)
  {
   End();asset=timeline;if(asset==null)return false;
   director=gameObject.AddComponent<PlayableDirector>();director.playOnAwake=false;director.timeUpdateMode=DirectorUpdateMode.Manual;director.playableAsset=asset;
   foreach(var output in asset.outputs)director.SetGenericBinding(output.sourceObject,this);director.RebuildGraph();return true;
  }
  public void Evaluate(float time){if(!Active)return;Clock=time;actors.Clear();PropTimes.Clear();EventIndices.Clear();ShotIndex=-1;Text=null;LightWeight=1;director.time=Math.Min(time,Math.Max(0,asset.duration-.0001));director.Evaluate();}
  public ActorFrame Actor(string id)=>actors.TryGetValue(id,out var value)?value:null;
  public void Submit(CinematicTimelineClipV16 clip,float local)
  {
   switch(clip.kind){
    case "actor":if(!actorPool.TryGetValue(clip.actor,out var frame)){frame=new ActorFrame();actorPool[clip.actor]=frame;}frame.clip=clip.animation;frame.local=Mathf.Min(local,clip.sourceDuration-.001f);frame.cue.actor=clip.actor;frame.cue.clip=clip.animation!=null?clip.animation.name:clip.clipId;frame.cue.start=Clock-local;frame.cue.duration=clip.sourceDuration;frame.cue.lookAt=clip.lookAt;frame.cue.faceTo=clip.faceTo;actors[clip.actor]=frame;break;
    case "camera":ShotIndex=clip.index;break;
    case "subtitle":Text=clip.text;break;
    case "prop":PropTimes[clip.actor]=Clock;break;
    case "event":EventIndices.Add(clip.index);break;
    case "light":LightWeight=clip.weight;break;
   }
  }
  public void End(){if(director!=null){director.Stop();Destroy(director);}asset=null;actors.Clear();PropTimes.Clear();EventIndices.Clear();}
  void OnDestroy()=>End();
 }
 public sealed class CinematicTimelineBehaviourV16:PlayableBehaviour
 {
  public CinematicTimelineClipV16 clip;
  public override void ProcessFrame(Playable playable,FrameData info,object playerData){if(info.effectiveWeight>.001f&&playerData is CinematicTimelineV16 owner)owner.Submit(clip,(float)playable.GetTime());}
 }
}
