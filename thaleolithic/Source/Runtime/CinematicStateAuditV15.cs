#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicStateAuditV15:MonoBehaviour
 {
  [Serializable]class Check{public string name;public bool passed;}
  [Serializable]class Report{public string status,scope="Explicit upstream action/flag fixtures; real trigger queue, actors, save reload and cinematic world consequences. Not a complete campaign run.";public Check[] checks;}
  readonly List<Check> checks=new List<Check>();CampaignRuntime c;CinematicTriggersV15 triggers;
  void CheckThat(string name,bool passed){checks.Add(new Check{name=name,passed=passed});File.WriteAllText("E:/UNGA-BUNGA-45001/Revision15/state-validation.json",JsonUtility.ToJson(new Report{status=checks.All(t=>t.passed)?"passed":"failed",checks=checks.ToArray()},true));}
  IEnumerator Skip(){c.cinematicDirector.Skip();float deadline=Time.realtimeSinceStartup+60;while(c.cinematicDirector.IsPlaying&&Time.realtimeSinceStartup<deadline)yield return null;}
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");c=FindFirstObjectByType<CampaignRuntime>();triggers=c.GetComponent<CinematicTriggersV15>();triggers.SuspendAutomatic=true;yield return Skip();c.SetPause(false);c.BeginCampaign(true);yield return Skip();
   triggers.SuspendAutomatic=false;yield return new WaitForSecondsRealtime(.3f);c.SetPause(true);c.State.completedActions.Add("M_I_TUTORIEL_1");yield return new WaitForSecondsRealtime(.4f);
   CheckThat("Tutorial completion queues the collapse while paused",c.State.pendingCinematicsV15.Contains("F15_C02")&&!c.cinematicDirector.IsPlaying);c.SetPause(false);float limit=Time.realtimeSinceStartup+8;while(!c.cinematicDirector.IsPlaying&&Time.realtimeSinceStartup<limit)yield return null;CheckThat("Collapse starts after the tutorial, not at awakening",c.cinematicDirector.CurrentId=="F15_C02");yield return Skip();triggers.SuspendAutomatic=true;
   c.State.pendingCinematicsV15.Add("F15_C06");c.Save();CheckThat("Pending cinematic survives save reload",c.ReloadSavedCampaign()&&c.State.pendingCinematicsV15.Contains("F15_C06"));c.State.pendingCinematicsV15.Clear();
   var victim=c.State.characters.Find(a=>a.id=="brok");victim.alive=false;c.bindings.Apply(c.State,false);c.cinematicDirector.Play("F15_C07");limit=Time.realtimeSinceStartup+60;while(c.cinematicDirector.IsPlaying&&c.cinematicDirector.SequenceState=="LOADING"&&Time.realtimeSinceStartup<limit)yield return null;
   var substitute=c.bindings.AnimatorFor("tarek").GetComponent<CinematicActorV15>();CheckThat("A living native actor replaces the deceased role",!c.bindings.characters.First(a=>a.id=="brok").meshyActor.activeInHierarchy&&substitute!=null&&substitute.Owned);yield return Skip();
   c.State.completedActions.Add("WORK_M_V_ABRI");c.Apply(new EffectDefinition{kind="flag",target="structure:accessClosed",value=1});c.Apply(new EffectDefinition{kind="risk",target="abri",value=2,operation="set"});var hut=FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).First(h=>h.site=="habitations");hut.BeginFailure("Validation fixture");hut.CompleteSkipped();string rewards=string.Join("|",c.State.rewardReceipts);
   c.cinematicDirector.Play("F15_C08");yield return Skip();CheckThat("Construction does not grant the formal verification",!c.HasFlag("verified:M_V_ABRI")&&c.HasFlag("structure:accessClosed")&&c.Value("risk","abri")>0);CheckThat("Construction keeps unverified housing closed",c.State.hutFailures.Any(h=>!h.repaired));CheckThat("Cinematic has not issued quest rewards",rewards==string.Join("|",c.State.rewardReceipts));
   c.Apply(new EffectDefinition{kind="flag",target="verified:M_V_ABRI",value=1});c.Apply(new EffectDefinition{kind="risk",target="abri",value=0,operation="set"});c.cinematicDirector.Play("F15_C08");yield return Skip();CheckThat("Verified construction repairs the actual assembly",c.State.hutFailures.First(h=>h.id==hut.assemblyId).repaired&&!hut.Broken&&hut.intactRenderer.enabled);
   foreach(var pair in new[]{("FIN_3","F15_C14_GOOD"),("FIN_2","F15_C14_MIXED"),("FIN_1","F15_C14_BAD")}){c.State.endingId=pair.Item1;CheckThat("Canonical ending "+pair.Item1,CinematicCatalogueV15.Ending(c)==pair.Item2);}c.State.endingId="";c.SetPause(false);triggers.SuspendAutomatic=true;Destroy(this);
  }
 }
}
#endif
