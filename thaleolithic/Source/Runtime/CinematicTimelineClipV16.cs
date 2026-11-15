using System;
using UnityEngine;
using UnityEngine.Playables;
namespace UngaBunga45001
{
 [Serializable]public sealed class CinematicTimelineClipV16:PlayableAsset
 {
  public string kind,actor,clipId,lookAt,faceTo,text;public AnimationClip animation;public float sourceDuration=1,weight=1;public int index;
  public override Playable CreatePlayable(PlayableGraph graph,GameObject owner){var p=ScriptPlayable<CinematicTimelineBehaviourV16>.Create(graph);p.GetBehaviour().clip=this;return p;}
 }
}
