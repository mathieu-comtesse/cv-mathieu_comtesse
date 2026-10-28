using System;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
public static class WindowsUrpBuildV14
{
 public static void Build()
 {
  const string root="E:/UNGA-BUNGA-45001",scene="Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity";
  try
  {
   string output=root+"/Builds/Windows-V14/THALEOLITHIC.exe";if(File.Exists(output))throw new IOException("Preserve existing V14 before a rebuild");
   PlayerSettings.SetScriptingDefineSymbols(NamedBuildTarget.Standalone,"UNGA_WEB_RENDERER");
   EditorSceneManager.OpenScene(scene);FireGroundingV9.Apply();SceneRenderRepairV10.Apply();SitePlacementV10.Inspect(true);HutAssemblerV10.Build();NativeMotionInstallV11.Apply();NavigationSafetyV11.Apply();
   var pipeline=AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset>("Assets/UngaBunga45001/Generated/WebV7/WebPipeline.asset");GraphicsSettings.defaultRenderPipeline=pipeline;for(int i=0;i<QualitySettings.names.Length;i++){QualitySettings.SetQualityLevel(i,false);QualitySettings.renderPipeline=pipeline;}
   PlayerSettings.companyName="Talas";PlayerSettings.productName="THALEOLITHIC";PlayerSettings.bundleVersion="0.14.0";PlayerSettings.defaultCursor=null;PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;PlayerSettings.runInBackground=false;PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64,false);PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64,new[]{GraphicsDeviceType.Direct3D11});
   EditorSceneManager.SaveOpenScenes();AssetDatabase.SaveAssets();var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{scene},locationPathName=output,target=BuildTarget.StandaloneWindows64,options=BuildOptions.None});File.WriteAllText(root+"/Revision14/windows-build-result.txt",$"Result={report.summary.result}\nRenderer=URP (same scene as browser)\nErrors={report.summary.totalErrors}\nWarnings={report.summary.totalWarnings}\nSeconds={report.summary.totalTime.TotalSeconds}\nBytes={report.summary.totalSize}\n");EditorApplication.Exit(report.summary.result==BuildResult.Succeeded?0:1);
  }
  catch(Exception e){File.WriteAllText(root+"/Revision14/windows-build-error.txt",e.ToString());Debug.LogException(e);EditorApplication.Exit(2);}
 }
}
