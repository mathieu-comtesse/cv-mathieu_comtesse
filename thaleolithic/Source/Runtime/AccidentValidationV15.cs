#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class AccidentValidationV15:MonoBehaviour
 {
  [Serializable]class Take{public string kind,id,status;public bool began,body,recorded,released,reacted;public float anticipationTravel;public string[] errors;}
  [Serializable]class Report{public string status,scope="Actual accident directors in an isolated save, including anticipation, body, persistence and actor release.";public Take[] takes;}
  public string only="";
  readonly List<Take> takes=new List<Take>();readonly List<string> errors=new List<string>();
  void Log(string message,string trace,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  const string Folder="E:/UNGA-BUNGA-45001/Revision15/Accidents";
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");Directory.CreateDirectory(Folder);var c=FindFirstObjectByType<CampaignRuntime>();var director=c.GetComponent<AccidentDirector>();c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;Application.logMessageReceived+=Log;
   foreach(var kind in new[]{"tree","rock","hut","stock","river","workshop","fire","mammoth"})
   {
    if(only!=""&&!only.Split(',').Contains(kind))continue;
    c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.SetPause(false);c.BeginCampaign(true);c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);yield return null;
    var spec=c.QuestCatalog.accidents.First(a=>a.kind==kind);foreach(string flag in spec.requiredFlags)c.Apply(new EffectDefinition{kind="flag",target=flag,value=1});var body=c.bindings.player.GetComponent<CharacterController>();body.enabled=false;var p=c.bindings.Find(spec.site).position+Vector3.right*1.5f;p.y=HutCollapse.TerrainFloor(p)+.04f;c.bindings.player.position=p;body.enabled=true;
    errors.Clear();bool began=director.Request(spec.id);float deadline=Time.realtimeSinceStartup+15;var animator=c.bindings.AnimatorFor(spec.victimId);var hand=animator.GetBoneTransform(HumanBodyBones.RightHand);var first=hand.position;float travel=0;bool reacted=false,shot=false;
    while(director.Playing&&Time.realtimeSinceStartup<deadline)
    {
     if(director.LastBody==null||c.State.accidents.Count==0){travel=Mathf.Max(travel,Vector3.Distance(first,hand.position));var actor=animator.GetComponent<CinematicActorV15>();reacted|=actor!=null&&actor.Owned&&actor.IKCallbacks>0;}
     if(!shot&&Time.realtimeSinceStartup>deadline-8){shot=true;Capture(c.cinematicDirector.cinematicCamera,Folder+"/"+kind+".png");}
     yield return null;
    }
    bool released=!director.Playing&&!c.cinematicDirector.cinematicCamera.enabled&&c.bindings.gameplayCamera.enabled&&FindObjectsByType<CinematicActorV15>(FindObjectsSortMode.None).All(a=>!a.Owned);bool recorded=c.State.accidents.Any(a=>a.victimId==spec.victimId);bool ragdoll=director.LastBody!=null;
    takes.Add(new Take{kind=kind,id=spec.id,began=began,body=ragdoll,recorded=recorded,released=released,reacted=reacted,anticipationTravel=travel,errors=errors.ToArray(),status=began&&ragdoll&&recorded&&released&&reacted&&travel>.03f&&errors.Count==0?"passed":"failed"});File.WriteAllText(Folder+"/validation.json",JsonUtility.ToJson(new Report{status=takes.All(t=>t.status=="passed")?"passed":"failed",takes=takes.ToArray()},true));
   }
   director.ResetPresentation();c.SetPause(false);Application.logMessageReceived-=Log;Destroy(this);
  }
  static void Capture(Camera camera,string path){var rt=RenderTexture.GetTemporary(640,360,24);RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});var old=RenderTexture.active;RenderTexture.active=rt;var tex=new Texture2D(640,360,TextureFormat.RGB24,false);tex.ReadPixels(new Rect(0,0,640,360),0,0);tex.Apply();File.WriteAllBytes(path,tex.EncodeToPNG());Destroy(tex);RenderTexture.active=old;RenderTexture.ReleaseTemporary(rt);}
  void OnDestroy()=>Application.logMessageReceived-=Log;
 }
}
#endif
