using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
public static class WindowsBuildV10
{
    public static void Build()
    {
        const string root="E:/UNGA-BUNGA-45001";const string output=root+"/Builds/Windows-V11/UNGA-BUNGA-45001.exe";
        try{
            UnityEditor.SceneManagement.EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity");FireGroundingV9.Apply();SceneRenderRepairV10.Apply();SitePlacementV10.Inspect(true);HutAssemblerV10.Build();NativeMotionInstallV11.Apply();NavigationSafetyV11.Apply();if(File.Exists(output))throw new IOException("Preserve the previous V8 output before rebuilding.");PlayerSettings.companyName="Talas";PlayerSettings.productName="UNGA BUNGA 45001";PlayerSettings.bundleVersion="0.11.0";PlayerSettings.defaultCursor=null;PlayerSettings.defaultScreenWidth=1440;PlayerSettings.defaultScreenHeight=900;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/UngaBunga45001/Scenes/UngaBunga45001.unity"},locationPathName=output,target=BuildTarget.StandaloneWindows64,options=BuildOptions.None});File.WriteAllText(root+"/Revision10/windows-build-result.txt",$"Result={report.summary.result}\nErrors={report.summary.totalErrors}\nWarnings={report.summary.totalWarnings}\nSeconds={report.summary.totalTime.TotalSeconds}\nBytes={report.summary.totalSize}\n");EditorApplication.Exit(report.summary.result==BuildResult.Succeeded?0:1);
        }catch(Exception e){File.WriteAllText(root+"/Revision10/windows-build-error.txt",e.ToString());Debug.LogException(e);EditorApplication.Exit(2);}
    }
}

