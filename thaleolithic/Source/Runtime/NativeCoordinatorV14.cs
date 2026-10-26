#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.IO;
using System.Collections;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class NativeCoordinatorV14:MonoBehaviour
 {
  const string Root="E:/UNGA-BUNGA-45001/Revision14";
  IEnumerator Await(string path,DateTime before,float seconds)
  {float end=Time.realtimeSinceStartup+seconds;while(Time.realtimeSinceStartup<end&&(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<=before))yield return null;if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<=before)throw new TimeoutException(path);}
  IEnumerator Start()
  {
   string path=Root+"/validation-v14.json";var stamp=File.Exists(path)?File.GetLastWriteTimeUtc(path):DateTime.MinValue;gameObject.AddComponent<ValidationV14>();yield return Await(path,stamp,180);
   if(!File.ReadAllText(path).Contains("\"status\": \"passed\"")){File.WriteAllText(Root+"/native-suite-state.txt","Core validation failed");yield break;}
   path=Root+"/native-low-performance.json";stamp=File.Exists(path)?File.GetLastWriteTimeUtc(path):DateTime.MinValue;var probe=gameObject.AddComponent<DevelopmentProbeV14>();probe.label="native-low";probe.sampleSeconds=15;probe.lowProfile=true;probe.walkFiveMinutes=true;yield return Await(path,stamp,480);File.WriteAllText(Root+"/native-suite-state.txt","Native heads: core validation and five-minute rendered walk complete");Destroy(this);
  }
 }
}
#endif
