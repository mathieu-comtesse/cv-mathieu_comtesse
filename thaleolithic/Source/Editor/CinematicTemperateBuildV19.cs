using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
public static class CinematicTemperateBuildV19
{
 const string Root="E:/UNGA-BUNGA-45001",Scene="Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity";
 public static void Windows()=>Run(false);
 public static void Web()=>Run(true);
 public static void WindowsV221()=>Run(false,true);
 public static void WebV221()=>Run(true,true);
 public static void WebV231()=>Run(true,v231:true);
 public static void WebV24()=>Run(true,v24:true);
 public static void WebV241()=>Run(true,v241:true);
 public static void WebV243()=>Run(true,v241:true,v243:true);
 public static void WebV244()=>Run(true,v241:true,v244:true);
 static void Run(bool web,bool v221=false,bool v231=false,bool v24=false,bool v241=false,bool v243=false,bool v244=false)
 {
  string label=web?"web":"windows";
  try
  {
   var target=web?BuildTarget.WebGL:BuildTarget.StandaloneWindows64;var named=web?NamedBuildTarget.WebGL:NamedBuildTarget.Standalone;
   var output=Root+(v244?"/Builds/Web-V24.4":v243?"/Builds/Web-V24.3":v241?"/Builds/Web-V24.1":v24?"/Builds/Web-V24":v231?"/Builds/Web-V23.1":v221?(web?"/Builds/Web-V22.1":"/Builds/Windows-V22.1/THALEOLITHIC.exe"):(web?"/Builds/Web-V19-Temperate-r9":"/Builds/Windows-V19-Temperate-r9/THALEOLITHIC.exe"));
   if(v244&&!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("THALEOLITHIC_WEB_BUILD_DIR")))
    output=Path.GetFullPath(Environment.GetEnvironmentVariable("THALEOLITHIC_WEB_BUILD_DIR"));
   if(web?Directory.Exists(output):File.Exists(output))throw new IOException("Existing V19 build must be preserved before a rebuild: "+output);
   if(EditorUserBuildSettings.activeBuildTarget!=target&&!EditorUserBuildSettings.SwitchActiveBuildTarget(web?BuildTargetGroup.WebGL:BuildTargetGroup.Standalone,target))throw new Exception("Build target switch failed");
   PlayerSettings.SetScriptingDefineSymbols(named,"UNGA_WEB_RENDERER;THALEOLITHIC_CINEMACHINE");EditorSceneManager.OpenScene(Scene);
   var pipeline=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/UngaBunga45001/TemperateV19/Terrain/TemperatePipeline.asset");if(pipeline==null)throw new Exception("Native URP pipeline missing");GraphicsSettings.defaultRenderPipeline=pipeline;
   for(int i=0;i<QualitySettings.names.Length;i++){QualitySettings.SetQualityLevel(i,false);QualitySettings.renderPipeline=pipeline;}QualitySettings.SetQualityLevel(Math.Min(2,QualitySettings.names.Length-1),false);
   PlayerSettings.companyName="Talas";PlayerSettings.productName="THALEOLITHIC";PlayerSettings.bundleVersion=v244?"0.24.4":v243?"0.24.3":v241?"0.24.1":v24?"0.24.0":v231?"0.23.1":v221?"0.22.1":"0.19.9";PlayerSettings.runInBackground=false;
   if(web)
   {
    PlayerSettings.SetIl2CppCodeGeneration(named,Il2CppCodeGeneration.OptimizeSize);PlayerSettings.SetManagedStrippingLevel(named,ManagedStrippingLevel.Medium);PlayerSettings.stripUnusedMeshComponents=true;
    PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;PlayerSettings.WebGL.decompressionFallback=true;PlayerSettings.WebGL.exceptionSupport=WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;PlayerSettings.WebGL.debugSymbolMode=WebGLDebugSymbolMode.Off;PlayerSettings.WebGL.wasm2023=false;PlayerSettings.WebGL.initialMemorySize=128;PlayerSettings.WebGL.maximumMemorySize=2048;PlayerSettings.WebGL.template="APPLICATION:Minimal";UnityEditor.WebGL.UserBuildSettings.codeOptimization=UnityEditor.WebGL.WasmCodeOptimization.DiskSize;PlayerSettings.SetUseDefaultGraphicsAPIs(target,false);PlayerSettings.SetGraphicsAPIs(target,new[]{GraphicsDeviceType.OpenGLES3});
   }
   else
   {
    PlayerSettings.defaultCursor=null;PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;PlayerSettings.SetScriptingBackend(named,ScriptingImplementation.Mono2x);PlayerSettings.SetUseDefaultGraphicsAPIs(target,false);PlayerSettings.SetGraphicsAPIs(target,new[]{GraphicsDeviceType.Direct3D11});
   }
   AssetDatabase.SaveAssets();
   BuildReport report;
   using(v24||v241?FrenchWebFontScope.Create():null)
   using(v241?LegacyWebTextureScopeV241.Create():null)
   using(var motion=v241?ChapterMotionBuildV241.Create():null)
   {
    WebSceneNavigationV241.Enabled=v241;
    try
    {
     report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{Scene},locationPathName=output,target=target,
         options=v241?BuildOptions.DetailedBuildReport:BuildOptions.None});
    }
    finally { WebSceneNavigationV241.Enabled=false; }
    if(report.summary.result==BuildResult.Succeeded && v241)
    {
     motion.VerifyAndCopy(report,output);
     if(report.packedAssets.Any(file=>file.contents.Any(item=>item.sourceAssetPath=="Assets/NavMeshData/NavMesh-Terrain.asset")))
      Debug.LogWarning("La référence au NavMesh historique est toujours présente dans le build.");
    }
    if(v241 && !v243 && !v244 && report.summary.result==BuildResult.Succeeded)WebAssetInventoryV241.Write(report,"v241");
   }
   File.WriteAllText(Receipt(v221,v231,v24,v241,v243,v244,label,"result"),$"Result={report.summary.result}\nErrors={report.summary.totalErrors}\nWarnings={report.summary.totalWarnings}\nSeconds={report.summary.totalTime.TotalSeconds}\nBytes={report.summary.totalSize}\n");
   if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Build failed: "+report.summary.result);
  }
  catch(Exception e){File.WriteAllText(Receipt(v221,v231,v24,v241,v243,v244,label,"error"),e.ToString());Debug.LogException(e);if(v221||v231||v24||v241)throw;}
 }
 static string Receipt(bool v221,bool v231,bool v24,bool v241,bool v243,bool v244,string label,string kind)
 {
  string reportDir=v244?Environment.GetEnvironmentVariable("THALEOLITHIC_WEB_REPORT_DIR"):null;
  if(!string.IsNullOrEmpty(reportDir))return Path.Combine(reportDir,label+"-build-"+kind+".txt");
  return Root+(v244?"/Revision24-4/"+label:v243?"/Revision24-3/"+label:v241?"/Revision24-1/"+label:v24?"/Revision24/"+label:v231?"/Revision23-1/"+label:v221?"/Revision22-1/"+label:"/Revision19/Environment/"+label+"-r9")+"-build-"+kind+".txt";
 }
}
