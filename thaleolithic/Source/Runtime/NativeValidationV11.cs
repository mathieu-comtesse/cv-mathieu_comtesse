#if UNITY_STANDALONE
using System;
using System.IO;
using System.Collections;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class NativeValidationV11:MonoBehaviour
 {
  string preferences;bool existed,captured;
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Boot()
  {if(Application.isEditor||Array.IndexOf(Environment.GetCommandLineArgs(),"-ungaV11Audit")<0)return;if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Native validation requires an isolated save");var go=new GameObject("Native validation V11");DontDestroyOnLoad(go);go.AddComponent<NativeValidationV11>();Application.runInBackground=true;}
  IEnumerator Start()
  {
   const string folder="E:/UNGA-BUNGA-45001/Revision10";existed=PlayerPrefs.HasKey("UNGA.AdventureUI.v4");preferences=PlayerPrefs.GetString("UNGA.AdventureUI.v4","");captured=true;
   yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);yield return null;var c=FindFirstObjectByType<CampaignRuntime>();
   foreach(var test in new[]{("native-movement-validation.json",typeof(MovementValidationV11)),("native-menhir-validation.json",typeof(MenhirValidationV11))})
   {var path=folder+"/"+test.Item1;var stamp=File.Exists(path)?File.GetLastWriteTimeUtc(path):DateTime.MinValue;c.gameObject.AddComponent(test.Item2);float end=Time.unscaledTime+360;while(Time.unscaledTime<end&&(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<=stamp))yield return null;if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<=stamp||!File.ReadAllText(path).Contains("\"status\": \"passed\"")){File.WriteAllText(folder+"/native-suite-result.txt","Failed or timed out: "+test.Item1);Application.Quit(1);yield break;}}
   File.WriteAllText(folder+"/native-suite-result.txt","Movement and menhir passed; priority regression running.");c.gameObject.AddComponent<PriorityValidationV10>();
  }
  void OnApplicationQuit(){if(!captured)return;if(existed)PlayerPrefs.SetString("UNGA.AdventureUI.v4",preferences);else PlayerPrefs.DeleteKey("UNGA.AdventureUI.v4");PlayerPrefs.Save();}
 }
}
#endif
