using System;
using System.Collections.Generic;
namespace UngaBunga45001
{
    [Serializable]public sealed class TribalContainerState
    {public string id;public List<NamedValue> items=new List<NamedValue>();}
    [Serializable]public sealed class TribalTaskState
    {public string id,workerId,actionId,status="queued",reason="";public float workedSeconds,duration,createdAt;}
    public static class TribalInterfaceAudit
    {
#if UNITY_EDITOR
        static bool JourneyV241 => Array.IndexOf(Environment.GetCommandLineArgs(), "-thaleolithicJourneyV241") >= 0;
        static bool JourneyV24 => JourneyV241 || Array.IndexOf(Environment.GetCommandLineArgs(), "-thaleolithicJourneyV24") >= 0;
#endif
        public static string IsolatedSaveRoot=>
#if UNITY_EDITOR
            JourneyV241 ? "E:/UNGA-BUNGA-45001/Revision24-1/JourneySave" :
            JourneyV24 ? "E:/UNGA-BUNGA-45001/Revision24/JourneySave" :
#endif
            Array.IndexOf(Environment.GetCommandLineArgs(),"-thaleolithicConstructionModules")>=0?"E:/UNGA-BUNGA-45001/Revision19/ModulesConstruction/AuditSave":Array.IndexOf(Environment.GetCommandLineArgs(),"-thaleolithicJourneyFinalV19")>=0?"E:/UNGA-BUNGA-45001/Revision19/Environment/JourneyFinalSave":Array.IndexOf(Environment.GetCommandLineArgs(),"-thaleolithicJourneyResumeV19")>=0?"E:/UNGA-BUNGA-45001/Revision19/Environment/JourneyResumeSave":Array.IndexOf(Environment.GetCommandLineArgs(),"-thaleolithicJourneyV19")>=0?"E:/UNGA-BUNGA-45001/Revision19/Environment/JourneySave":Array.IndexOf(Environment.GetCommandLineArgs(),"-thaleolithicTemperateV19Smoke")>=0?"E:/UNGA-BUNGA-45001/Revision19/Environment/NativeSmokeSave":Array.IndexOf(Environment.GetCommandLineArgs(),"-ungaV11Audit")>=0?"E:/UNGA-BUNGA-45001/Revision10/NativeAuditSave":"E:/UNGA-BUNGA-45001/Revision8/AuditSave";
        public static bool Requested=>
#if UNITY_EDITOR
            JourneyV24 ||
#endif
            Array.IndexOf(Environment.GetCommandLineArgs(),"-ungaInterfaceV8Audit")>=0;
    }
}
