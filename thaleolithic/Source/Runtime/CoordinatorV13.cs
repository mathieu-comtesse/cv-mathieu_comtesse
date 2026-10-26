#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.IO;
using System.Collections;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class CoordinatorV13:MonoBehaviour
    {
        const string Root="E:/UNGA-BUNGA-45001/Revision13";
        IEnumerator Await(string file,DateTime stamp,float seconds)
        {float end=Time.realtimeSinceStartup+seconds;while(Time.realtimeSinceStartup<end&&(!File.Exists(file)||File.GetLastWriteTimeUtc(file)<=stamp))yield return null;if(!File.Exists(file)||File.GetLastWriteTimeUtc(file)<=stamp)throw new TimeoutException(file);}
        IEnumerator Start()
        {
            var file=Root+"/validation-v13.json";var stamp=File.Exists(file)?File.GetLastWriteTimeUtc(file):DateTime.MinValue;gameObject.AddComponent<ValidationV13>();yield return Await(file,stamp,180);
            if(!File.ReadAllText(file).Contains("\"status\": \"passed\"")){File.WriteAllText(Root+"/suite-state.txt","Validation failed; performance sequence not started.");yield break;}
            foreach(string label in new[]{"baseline-equivalent","candidate-equivalent"})
            {
                file=Root+"/"+label+"-performance.json";stamp=File.Exists(file)?File.GetLastWriteTimeUtc(file):DateTime.MinValue;
                var probe=gameObject.AddComponent<DevelopmentProbeV13>();probe.label=label;probe.sampleSeconds=12;probe.walkFiveMinutes=label=="candidate-equivalent";
                File.WriteAllText(Root+"/suite-state.txt",label+" in progress");yield return Await(file,stamp,480);yield return null;
            }
            File.WriteAllText(Root+"/suite-state.txt","Validation and comparable performance runs completed.");Destroy(this);
        }
    }
}
#endif
