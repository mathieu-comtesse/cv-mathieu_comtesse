#if UNITY_EDITOR
using System;using System.Collections;using System.Collections.Generic;using System.IO;using UnityEngine;
namespace UngaBunga45001{
 public sealed class TemperateValidationSuiteV19:MonoBehaviour{
 [Serializable]class Item{public string test,status;public float seconds;}
 [Serializable]class Status{public string status;}
 [Serializable]class Report{public string status,current,scope="Sequential isolated editor fixtures followed by a fresh full campaign using real public gameplay APIs. The campaign driver selects known correct answers; this is not a first-time human reading study.";public Item[] tests;}
 const string Out="E:/UNGA-BUNGA-45001/Revision19/Environment/";readonly List<Item> tests=new List<Item>();string current="",status="running";CampaignRuntime c;
 void Write()=>File.WriteAllText(Out+"suite-validation.json",JsonUtility.ToJson(new Report{status=status,current=current,tests=tests.ToArray()},true));
 IEnumerator Test<T>(string label,string report,float timeout,Action<T> setup=null)where T:Component{current=label;Write();Directory.CreateDirectory(Path.GetDirectoryName(Out+report));File.WriteAllText(Out+report,"{\"status\":\"starting\"}");float start=Time.realtimeSinceStartup;var part=gameObject.AddComponent<T>();setup?.Invoke(part);while(part!=null&&Time.realtimeSinceStartup-start<timeout)yield return null;string result=File.Exists(Out+report)?JsonUtility.FromJson<Status>(File.ReadAllText(Out+report)).status:"missing";if(part!=null){Destroy(part);result="timeout";yield return null;}tests.Add(new Item{test=label,status=result,seconds=Time.realtimeSinceStartup-start});Write();}
 IEnumerator Start(){c=GetComponent<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);yield return Test<TemperateDoorFilmV19>("door film","door-film.json",300);yield return Test<TemperateHydroAuditV19>("river and grass","hydro-validation.json",90);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);yield return Test<CinematicMatrixAuditV16>("native cinematics C01/C08","LegacyMatrix/validation.json",300,a=>a.outputFolder=Out+"LegacyMatrix");yield return Test<TemperateEmergencyAuditV19>("physical evacuation","Emergency/emergency.json",240);c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=false;c.GetComponent<TemperateVillageV19>().SuspendAutomatic=false;yield return Test<TemperateJourneyV19>("fresh complete campaign","Journey/validation.json",2800);if(File.Exists(c.CurrentSavePath))File.Copy(c.CurrentSavePath,Out+"Journey/completed-editor-save.json",true);current="finished";status=tests.TrueForAll(t=>t.status=="passed")?"passed":"failed";Write();Destroy(this);}
 }
}
#endif
