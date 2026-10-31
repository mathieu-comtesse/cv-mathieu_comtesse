using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
public static class BuildV15
{
 const string Root="E:/UNGA-BUNGA-45001",Scene="Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity";
 public static void Windows()=>Run(false);
 public static void Web()=>Run(true);
 static void Run(bool web)
 {
  string label=web?"web":"windows";
  try
  {
   var target=web?BuildTarget.WebGL:BuildTarget.StandaloneWindows64;var named=web?NamedBuildTarget.WebGL:NamedBuildTarget.Standalone;
   var output=Root+(web?"/Builds/Web-V15":"/Builds/Windows-V15/THALEOLITHIC.exe");
   if(web?Directory.Exists(output):File.Exists(output))throw new IOException("Existing V15 build must be preserved before a rebuild: "+output);
   if(EditorUserBuildSettings.activeBuildTarget!=target&&!EditorUserBuildSettings.SwitchActiveBuildTarget(web?BuildTargetGroup.WebGL:BuildTargetGroup.Standalone,target))throw new Exception("Build target switch failed");
   PlayerSettings.SetScriptingDefineSymbols(named,"UNGA_WEB_RENDERER");EditorSceneManager.OpenScene(Scene);
   var pipeline=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/UngaBunga45001/Generated/WebV7/WebPipeline.asset");if(pipeline==null)throw new Exception("Native URP pipeline missing");GraphicsSettings.defaultRenderPipeline=pipeline;
   for(int i=0;i<QualitySettings.names.Length;i++){QualitySettings.SetQualityLevel(i,false);QualitySettings.renderPipeline=pipeline;}QualitySettings.SetQualityLevel(Math.Min(2,QualitySettings.names.Length-1),false);
   PlayerSettings.companyName="Talas";PlayerSettings.productName="THALEOLITHIC";PlayerSettings.bundleVersion="0.15.0";PlayerSettings.runInBackground=false;
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
   File.WriteAllText(Root+"/Revision15/"+label+"-build-result.txt",$"Result={report.summary.result}\nErrors={report.summary.totalErrors}\nWarnings={report.summary.totalWarnings}\nSeconds={report.summary.totalTime.TotalSeconds}\nBytes={report.summary.totalSize}\n");
   if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Build failed: "+report.summary.result);
  }
  catch(Exception e){File.WriteAllText(Root+"/Revision15/"+label+"-build-error.txt",e.ToString());Debug.LogException(e);}
 }
}
