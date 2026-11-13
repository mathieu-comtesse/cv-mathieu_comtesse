using System;
using System.IO;
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
 static void Run(bool web,bool v221=false,bool v231=false)
 {
  string label=web?"web":"windows";
  try
  {
   var target=web?BuildTarget.WebGL:BuildTarget.StandaloneWindows64;var named=web?NamedBuildTarget.WebGL:NamedBuildTarget.Standalone;
   var output=Root+(v231?"/Builds/Web-V23.1":v221?(web?"/Builds/Web-V22.1":"/Builds/Windows-V22.1/THALEOLITHIC.exe"):(web?"/Builds/Web-V19-Temperate-r9":"/Builds/Windows-V19-Temperate-r9/THALEOLITHIC.exe"));
   if(web?Directory.Exists(output):File.Exists(output))throw new IOException("Existing V19 build must be preserved before a rebuild: "+output);
   if(EditorUserBuildSettings.activeBuildTarget!=target&&!EditorUserBuildSettings.SwitchActiveBuildTarget(web?BuildTargetGroup.WebGL:BuildTargetGroup.Standalone,target))throw new Exception("Build target switch failed");
   PlayerSettings.SetScriptingDefineSymbols(named,"UNGA_WEB_RENDERER;THALEOLITHIC_CINEMACHINE");EditorSceneManager.OpenScene(Scene);
   var pipeline=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/UngaBunga45001/TemperateV19/Terrain/TemperatePipeline.asset");if(pipeline==null)throw new Exception("Native URP pipeline missing");GraphicsSettings.defaultRenderPipeline=pipeline;
   for(int i=0;i<QualitySettings.names.Length;i++){QualitySettings.SetQualityLevel(i,false);QualitySettings.renderPipeline=pipeline;}QualitySettings.SetQualityLevel(Math.Min(2,QualitySettings.names.Length-1),false);
   PlayerSettings.companyName="Talas";PlayerSettings.productName="THALEOLITHIC";PlayerSettings.bundleVersion=v231?"0.23.1":v221?"0.22.1":"0.19.9";PlayerSettings.runInBackground=false;
   if(web)
   {
    PlayerSettings.SetIl2CppCodeGeneration(named,Il2CppCodeGeneration.OptimizeSize);PlayerSettings.SetManagedStrippingLevel(named,ManagedStrippingLevel.Medium);PlayerSettings.stripUnusedMeshComponents=true;
    PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;PlayerSettings.WebGL.decompressionFallback=true;PlayerSettings.WebGL.exceptionSupport=WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;PlayerSettings.WebGL.debugSymbolMode=WebGLDebugSymbolMode.Off;PlayerSettings.WebGL.wasm2023=false;PlayerSettings.WebGL.initialMemorySize=128;PlayerSettings.WebGL.maximumMemorySize=2048;PlayerSettings.WebGL.template="APPLICATION:Minimal";UnityEditor.WebGL.UserBuildSettings.codeOptimization=UnityEditor.WebGL.WasmCodeOptimization.DiskSize;PlayerSettings.SetUseDefaultGraphicsAPIs(target,false);PlayerSettings.SetGraphicsAPIs(target,new[]{GraphicsDeviceType.OpenGLES3});
   }
   else
   {
    PlayerSettings.defaultCursor=null;PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;PlayerSettings.SetScriptingBackend(named,ScriptingImplementation.Mono2x);PlayerSettings.SetUseDefaultGraphicsAPIs(target,false);PlayerSettings.SetGraphicsAPIs(target,new[]{GraphicsDeviceType.Direct3D11});
   }
   AssetDatabase.SaveAssets();var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{Scene},locationPathName=output,target=target,options=BuildOptions.None});
   File.WriteAllText(Receipt(v221,v231,label,"result"),$"Result={report.summary.result}\nErrors={report.summary.totalErrors}\nWarnings={report.summary.totalWarnings}\nSeconds={report.summary.totalTime.TotalSeconds}\nBytes={report.summary.totalSize}\n");
   if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Build failed: "+report.summary.result);
  }
  catch(Exception e){File.WriteAllText(Receipt(v221,v231,label,"error"),e.ToString());Debug.LogException(e);if(v221||v231)throw;}
 }
 static string Receipt(bool v221,bool v231,string label,string kind)=>Root+(v231?"/Revision23-1/"+label:v221?"/Revision22-1/"+label:"/Revision19/Environment/"+label+"-r9")+"-build-"+kind+".txt";
}
