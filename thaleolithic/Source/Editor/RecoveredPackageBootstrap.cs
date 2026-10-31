using System;
using System.IO;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace UngaBunga45001.Editor
{
    public static class RecoveredPackageBootstrap
    {
        private static AddAndRemoveRequest request;
        private static double deadline;
        [Serializable] private class Receipt { public string status, editor, error; public string[] added, removed; }
        public static void Resolve()
        {
            // Run initially in 6000.3, the version which created the template's
            // two built-in dependencies. Client API removes them before 6000.2 opens.
            var add = new[] { "com.unity.render-pipelines.high-definition@17.2.0" };
            var remove = new[] { "com.unity.modules.adaptiveperformance", "com.unity.modules.vectorgraphics" };
            Debug.Log("UNGA_BUNGA_UPM adding " + string.Join(", ", add) + "; removing " + string.Join(", ", remove));
            request = Client.AddAndRemove(add, remove);
            deadline = EditorApplication.timeSinceStartup + 600;
            EditorApplication.update += Poll;
        }
        private static void Poll()
        {
            if (!request.IsCompleted && EditorApplication.timeSinceStartup < deadline) return;
            EditorApplication.update -= Poll;
            bool success = request.IsCompleted && request.Status == StatusCode.Success;
            var receipt = new Receipt { status = success ? "resolved" : "failed", editor = Application.unityVersion,
                error = success ? null : request.IsCompleted ? request.Error.message : "UPM timeout after 600 seconds",
                added = new[] { "com.unity.render-pipelines.high-definition@17.2.0" },
                removed = new[] { "com.unity.modules.adaptiveperformance", "com.unity.modules.vectorgraphics" } };
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/unity-package-bootstrap.json", JsonUtility.ToJson(receipt, true));
            EditorApplication.Exit(success ? 0 : 1);
        }
    }
}
