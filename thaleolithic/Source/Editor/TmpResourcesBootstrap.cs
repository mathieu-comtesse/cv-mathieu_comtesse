using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class TmpResourcesBootstrap
    {
        private static double deadline;
        public static void Import()
        {
            var package=UnityEditor.PackageManager.PackageInfo.GetAllRegisteredPackages().First(p=>p.name=="com.unity.ugui");
            string path=Path.Combine(package.resolvedPath,"Package Resources/TMP Essential Resources.unitypackage");
            AssetDatabase.importPackageCompleted+=name=>Finish(true,name);
            AssetDatabase.importPackageFailed+=(name,error)=>Finish(false,name+": "+error);
            AssetDatabase.importPackageCancelled+=name=>Finish(false,"Cancelled: "+name);
            deadline=EditorApplication.timeSinceStartup+300;EditorApplication.update+=Poll;
            AssetDatabase.ImportPackage(path,false);
        }
        private static void Poll(){if(EditorApplication.timeSinceStartup>deadline)Finish(false,"Import timeout");}
        private static void Finish(bool success,string message)
        {
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-tmp-resources.txt",(success?"success: ":"failed: ")+message);
            EditorApplication.Exit(success?0:1);
        }
    }
}
