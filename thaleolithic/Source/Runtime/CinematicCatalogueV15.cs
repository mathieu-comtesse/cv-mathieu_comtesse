using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 [Serializable]public sealed class FilmMuscleV15{public string name;public float[] values=Array.Empty<float>();}
 [Serializable]public sealed class FilmClipV15{public string id,actor,intention;public float duration;public float[] times=Array.Empty<float>(),bodyY=Array.Empty<float>();public FilmMuscleV15[] muscles=Array.Empty<FilmMuscleV15>();}
 [Serializable]public sealed class FilmCueV15{public string actor,clip,lookAt,faceTo;public float start,duration;}
 [Serializable]public sealed class FilmBlockingV15{public string actor,site;public Vector3 offset;public float start,end;}
 [Serializable]public sealed class FilmShotV15{public string label,focus,second,speaker,subtitle;public float start,end,fov=45,height=1.35f;public Vector3 from,to,lookOffset;}
 [Serializable]public sealed class FilmPropV15{public string id,actor,assistant,kind,site,destination;public Vector3 offset,finalOffset,size;public float pickup,release,impact;public bool persistent;}
 [Serializable]public sealed class FilmEventV15{public string kind,target,sound;public float at;}
 [Serializable]public sealed class FilmContactV15{public string actor,target,bone="RightUpperArm",hand="Left";public float start,end;public Vector3 offset;}
 [Serializable]public sealed class FilmActorStateV15{public string id;public Vector3 position;public Quaternion rotation=Quaternion.identity;}
 [Serializable]public sealed class FilmV15
 {public string id,title,summary,site,mood,condition;public float duration;public FilmCueV15[] cues=Array.Empty<FilmCueV15>();public FilmShotV15[] shots=Array.Empty<FilmShotV15>();public FilmBlockingV15[] blocking=Array.Empty<FilmBlockingV15>();public FilmPropV15[] props=Array.Empty<FilmPropV15>();public FilmEventV15[] events=Array.Empty<FilmEventV15>();public FilmContactV15[] contacts=Array.Empty<FilmContactV15>();}
 [Serializable]public sealed class FilmLibraryV15{public FilmClipV15[] clips=Array.Empty<FilmClipV15>();public FilmV15[] films=Array.Empty<FilmV15>();}
 public static class CinematicCatalogueV15
 {
  static FilmLibraryV15 library;static readonly Dictionary<string,AnimationClip> clips=new Dictionary<string,AnimationClip>();
  public static FilmLibraryV15 Library=>library??=JsonUtility.FromJson<FilmLibraryV15>(Resources.Load<TextAsset>("CinematicLibraryV15").text);
  public static AnimationClip Clip(string id){if(!clips.TryGetValue(id,out var clip)){clip=Resources.Load<AnimationClip>("CinematicsV15/Clips/"+id);clips[id]=clip;}return clip;}
  public static FilmV15 Find(string id)=>Library.films.FirstOrDefault(f=>f.id==id);
  // Existing save IDs retain their original meaning; V15 scenes have separate identities.
  public static string Resolve(string id,CampaignRuntime c)
  {
   switch(id){case "C01":return "F15_C01";case "C02":return "F15_WORKSHOP_WOOD";case "C03":return "F15_MICRO_STOCK";case "C04":return "F15_C11";case "C05":return c.HasFlag("verified:M_VI_PREPARER")?"F15_C11_READY":"F15_C11_DANGER";case "C06":return "F15_PROGRESS_REVIEW";default:return id;}
  }
  public static string Ending(CampaignRuntime c){var actual=c.Ending?.id??c.State.endingId;return actual=="FIN_3"?"F15_C14_GOOD":actual=="FIN_2"?"F15_C14_MIXED":"F15_C14_BAD";}
  public static CinematicDefinition Definition(string id,CampaignRuntime c)
  {
   var f=Find(Resolve(id,c));if(f==null)return null;
   return new CinematicDefinition{id=id,title=f.title,summary=f.summary,durationSeconds=f.duration,shots=f.shots.Select(s=>new ShotDefinition{durationSeconds=s.end-s.start,cameraBindingId="camera:C01:1",lookAtBindingId="look:C01",speaker=s.speaker,subtitle=s.subtitle}).ToArray()};
  }
 }
}
