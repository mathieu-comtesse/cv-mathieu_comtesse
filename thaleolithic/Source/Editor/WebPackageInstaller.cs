using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
namespace UngaBunga45001.Editor
{
    [InitializeOnLoad]public static class WebPackageInstaller
    {
        const string Key="UNGA.WebPackageInstaller";static SearchRequest search;static AddRequest add;static ListRequest listing;static double deadline;
        static WebPackageInstaller(){if(SessionState.GetBool(Key,false)){deadline=EditorApplication.timeSinceStartup+600;listing=Client.List(true);EditorApplication.update+=Poll;}}
        public static void Install(){SessionState.SetBool(Key,true);deadline=EditorApplication.timeSinceStartup+600;search=Client.Search("com.unity.render-pipelines.universal");EditorApplication.update-=Poll;EditorApplication.update+=Poll;}
        static void Poll()
        {
            if(EditorApplication.timeSinceStartup>deadline){Finish(2,"Package resolution timed out");return;}
            if(search!=null&&search.IsCompleted)
            {
                if(search.Status!=StatusCode.Success){Finish(1,search.Error?.message);return;}var package=search.Result.FirstOrDefault(p=>p.name=="com.unity.render-pipelines.universal");
                if(package==null||!package.versions.all.Contains("17.2.0")){Finish(1,"URP 17.2.0 not returned by Unity registry");return;}
                File.WriteAllText("E:/UNGA-BUNGA-45001/Revision7/package-search.txt",package.name+" verified version=17.2.0");search=null;add=Client.Add("com.unity.render-pipelines.universal@17.2.0");
            }
            if(add!=null&&add.IsCompleted){if(add.Status==StatusCode.Success){Finish(0,add.Result.name+"@"+add.Result.version);return;}Finish(1,add.Error?.message);return;}
            if(listing!=null&&listing.IsCompleted){if(listing.Status!=StatusCode.Success){Finish(1,listing.Error?.message);return;}var p=listing.Result.FirstOrDefault(x=>x.name=="com.unity.render-pipelines.universal"&&x.version=="17.2.0");if(p!=null){Finish(0,p.name+"@"+p.version);return;}listing=null;search=Client.Search("com.unity.render-pipelines.universal");}
        }
        static void Finish(int code,string message){SessionState.SetBool(Key,false);EditorApplication.update-=Poll;File.WriteAllText("E:/UNGA-BUNGA-45001/Revision7/package-install.txt",message??"Unknown package error");AssetDatabase.SaveAssets();EditorApplication.Exit(code);}
    }
}
