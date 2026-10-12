using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
public class TalasWebShell:IPostprocessBuildWithReport
{
 public int callbackOrder=>100;
 public void OnPostprocessBuild(BuildReport report){if(report.summary.platform==BuildTarget.WebGL)Write(report.summary.outputPath);}
 public static void Write(string directory)
 {
  string build=Path.Combine(directory,"Build");string text=File.ReadAllText("Assets/TalasCampaign/Editor/WebShell.html");
  foreach(var spec in new[]{new[]{"__LOADER__","*.loader.js"},new[]{"__DATA__","*.data.gz"},new[]{"__FRAMEWORK__","*.framework.js.gz"},new[]{"__WASM__","*.wasm.gz"}}){var files=Directory.GetFiles(build,spec[1]);if(files.Length!=1)throw new IOException("Fichier navigateur ambigu : "+spec[1]);using(var sha=System.Security.Cryptography.SHA256.Create()){string version=System.BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(files[0]))).Replace("-","").Substring(0,12);text=text.Replace(spec[0],Path.GetFileName(files[0])+"?v="+version);}}
  File.WriteAllText(Path.Combine(directory,"index.html"),text);
 }
}
