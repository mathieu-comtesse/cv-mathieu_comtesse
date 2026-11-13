#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class TemperateEmergencyAuditV19:MonoBehaviour
 {
  [Serializable]class Person{public string id,diagnostic;public Vector3 start,end;public float distance;public bool arrived,fireSafe;}
  [Serializable]class Report{public string status,scope="Real character-controller evacuation from an isolated fresh-save fixture. No NPC teleport, death or simulated attendance.";public int expected,outside,present,routes,nodes;public float seconds;public string failure;public Person[] people;public string[] errors;}
  readonly List<string> errors=new List<string>();void Log(string message,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");Application.logMessageReceived+=Log;
   var c=GetComponent<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.State.pendingCinematicsV15.Clear();c.SetPause(false);yield return new WaitForSeconds(3);
   var world=c.GetComponent<ActivityWorldV17>();world.PrepareEmergencyRoster();yield return new WaitUntil(()=>!world.PreparingAssembly);var people=world.ExpectedResidentIds.Select(id=>new Person{id=id,start=c.bindings.Find(id).position,fireSafe=true}).ToArray();
   c.Apply(new EffectDefinition{kind="flag",target="v17:alarm",value=1});float started=Time.realtimeSinceStartup,deadline=started+180;
   var center=c.bindings.Find("rassemblement").position;var body=c.bindings.player.GetComponent<CharacterController>();body.enabled=false;c.bindings.player.position=center+Vector3.up*.08f;body.enabled=true;
   while(Time.realtimeSinceStartup<deadline&&!world.AllAtAssembly(world.ExpectedResidentIds))
   {
    foreach(var p in people){var root=c.bindings.Find(p.id);p.distance+=Vector3.Distance(p.end==Vector3.zero?p.start:p.end,root.position);p.end=root.position;if(!VillageNavigation.HearthSafe(root.position,.26f))p.fireSafe=false;}
    yield return null;
   }
   var mover=c.GetComponent<WorkNavigationV18>();foreach(var p in people){p.end=c.bindings.Find(p.id).position;p.arrived=Vector3.Distance(p.end,center)<5.7f;p.diagnostic=mover.DescribeJob(p.id);}
   var result=new Report{status=people.Length>0&&people.All(p=>p.arrived&&p.fireSafe)&&errors.Count==0?"passed":"failed",expected=world.ExpectedCount,outside=c.State.campaignV17.emergencyOutside.Count,present=world.PresentCount,routes=mover.RoutesFound,nodes=mover.NodesExpanded,seconds=Time.realtimeSinceStartup-started,failure=mover.LastFailure,people=people,errors=errors.ToArray()};Directory.CreateDirectory("E:/UNGA-BUNGA-45001/Revision19/Environment/Emergency");File.WriteAllText("E:/UNGA-BUNGA-45001/Revision19/Environment/Emergency/emergency.json",JsonUtility.ToJson(result,true));Application.logMessageReceived-=Log;Destroy(this);
  }
  void OnDestroy(){Application.logMessageReceived-=Log;}
 }
}
#endif
