using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class RecoveredWindowsBuild
    {
        [Serializable] private class PlayReceipt {public string status;}
        [Serializable] private class Receipt {public string status,output,editor;public int errors,warnings;public ulong bytes;public double seconds;public bool fullCampaignRunThrough;}
        public static void Build()
        {
            const string root="E:/UNGA-BUNGA-45001";
            var play=JsonUtility.FromJson<PlayReceipt>(File.ReadAllText(root+"/Analysis/unity-play-audit.json"));
            if(play.status!="passed")throw new InvalidOperationException("Resolve Play Mode failures before building");
            string folder=root+"/Builds/Windows";string output=folder+"/UNGA-BUNGA-45001.exe";
            if(Directory.Exists(folder)&&Directory.GetFileSystemEntries(folder).Length>0)throw new IOException("Build output exists; preserve it before another build");
            Directory.CreateDirectory(folder);
            string settingsBackup=root+"/Analysis/BuildSettingsBackups/ProjectSettings.asset";
            if(!File.Exists(settingsBackup)){Directory.CreateDirectory(Path.GetDirectoryName(settingsBackup));File.Copy("ProjectSettings/ProjectSettings.asset",settingsBackup);}
            // The recovered cloud configuration collides with the file emitted by the genuine Services package.
            string cloud="Assets/StreamingAssets/UnityServicesProjectConfiguration.json";
            if(File.Exists(cloud))
            {
                string backup=root+"/Analysis/QuarantinedBuildConfiguration/"+cloud;Directory.CreateDirectory(Path.GetDirectoryName(backup));
                if(File.Exists(backup))throw new IOException("Configuration backup already exists; inspect before replacing");
                File.Move(cloud,backup);if(File.Exists(cloud+".meta"))File.Move(cloud+".meta",backup+".meta");AssetDatabase.Refresh();
                File.WriteAllText(root+"/Analysis/build-configuration-repair.txt","Recovered Services configuration and metadata moved from working Assets/StreamingAssets to Analysis/QuarantinedBuildConfiguration. Reference export unchanged. Genuine package generates the build configuration. Native CPU-inaccessible custom cursor replaced by the operating system cursor.");
            }
            PlayerSettings.defaultCursor=null;
            RecoveredCinematicFraming.Apply();
            PlayerSettings.companyName="Talas";PlayerSettings.productName="UNGA BUNGA 45001";
            PlayerSettings.defaultScreenWidth=1600;PlayerSettings.defaultScreenHeight=900;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/UngaBunga45001/Scenes/UngaBunga45001.unity"},locationPathName=output,target=BuildTarget.StandaloneWindows64,options=BuildOptions.None});
            var summary=report.summary;
            var receipt=new Receipt{status=summary.result.ToString(),output=output,editor=Application.unityVersion,errors=summary.totalErrors,warnings=summary.totalWarnings,bytes=summary.totalSize,seconds=summary.totalTime.TotalSeconds,fullCampaignRunThrough=false};
            File.WriteAllText(root+"/Analysis/windows-build-receipt.json",JsonUtility.ToJson(receipt,true));
            if(summary.result!=BuildResult.Succeeded)throw new InvalidOperationException("Windows build failed; see receipt and log");
        }
    }
}
