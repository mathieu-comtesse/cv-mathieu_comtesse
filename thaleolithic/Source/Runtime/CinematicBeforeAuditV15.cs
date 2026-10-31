#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicBeforeAuditV15:MonoBehaviour
 {
  [Serializable]class Actor{public string id;public string[] clips;public int observedLoops,transitions;public float seconds;}
  [Serializable]class Film{public string id;public float seconds;public int frames;public Actor[] actors;}
  [Serializable]class Report{public string scope="Live V14 playback, isolated Editor save; loop counts sampled at 10 Hz";public Film[] films;}
  sealed class Sample{public HashSet<string> names=new HashSet<string>();public int loops,transitions,hash;public float normalized;}
  IEnumerator Start()
  {
   var c=FindFirstObjectByType<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);var films=new List<Film>();
   foreach(var data in c.Data.cinematics)
   {
    var samples=c.bindings.characters.ToDictionary(a=>a.id,a=>new Sample());int first=Time.frameCount;float start=Time.realtimeSinceStartup,next=0;c.cinematicDirector.Play(data.id);
    while(c.cinematicDirector.IsPlaying)
    {
     if(Time.unscaledTime>=next){next=Time.unscaledTime+.1f;foreach(var binding in c.bindings.characters){var a=binding.animator;var state=a.GetCurrentAnimatorStateInfo(0);var sample=samples[binding.id];if(state.fullPathHash==sample.hash&&state.loop)sample.loops+=Mathf.Max(0,Mathf.FloorToInt(state.normalizedTime)-Mathf.FloorToInt(sample.normalized));else if(sample.hash!=0)sample.transitions++;sample.hash=state.fullPathHash;sample.normalized=state.normalizedTime;foreach(var clip in a.GetCurrentAnimatorClipInfo(0))sample.names.Add(clip.clip.name);}}
     yield return null;
    }
    float seconds=Time.realtimeSinceStartup-start;films.Add(new Film{id=data.id,seconds=seconds,frames=Time.frameCount-first,actors=samples.Select(pair=>new Actor{id=pair.Key,clips=pair.Value.names.ToArray(),observedLoops=pair.Value.loops,transitions=pair.Value.transitions,seconds=seconds}).ToArray()});
    File.WriteAllText("E:/UNGA-BUNGA-45001/Revision15/before-inventory-live.json",JsonUtility.ToJson(new Report{films=films.ToArray()},true));
   }
   File.WriteAllText("E:/UNGA-BUNGA-45001/Revision15/before-audit-complete.txt","Six existing films measured with native actor clips; frames advanced.");c.gameObject.AddComponent<CinematicClipAuditV15>();Destroy(this);
  }
 }
}
#endif
