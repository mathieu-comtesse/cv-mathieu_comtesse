using System;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    // Compatibility strings are private storage identifiers, never displayed as the game title.
    public static class CampaignSaveMigration
    {
        public static bool TryCopyValidSave(string source,string destination,string campaignId)
        {
            if(!File.Exists(source)||File.Exists(destination))return false;
            try
            {
                var state=JsonUtility.FromJson<CampaignSave>(File.ReadAllText(source));
                if(state==null||state.campaignId!=campaignId||state.characters==null||!state.characters.Any(c=>c.id=="dylan"))return false;
                Directory.CreateDirectory(Path.GetDirectoryName(destination));
                File.Copy(source,destination,false);
                foreach(var checkpoint in Directory.GetFiles(Path.GetDirectoryName(source),campaignId+".act-*.json"))
                {string target=Path.Combine(Path.GetDirectoryName(destination),Path.GetFileName(checkpoint));if(!File.Exists(target))File.Copy(checkpoint,target,false);}
                return true;
            }
            catch(Exception e){Debug.LogWarning("Import de sauvegarde différé : "+e.Message);return false;}
        }
        public static void Ensure(CampaignRuntime campaign)
        {
            if(TribalInterfaceAudit.Requested||QuestIntegrationAudit.Requested||campaign.Data==null||File.Exists(campaign.CurrentSavePath))return;
            try
            {
                string id=campaign.Data.id;
                #if UNITY_WEBGL && !UNITY_EDITOR
                // Unity 6 mounts the shared IDBFS root before Mono starts. An old URL hash may remain inside it.
                var candidates=Directory.Exists("/idbfs")?Directory.GetFiles("/idbfs",id+".json",SearchOption.AllDirectories):Array.Empty<string>();
                #else
                var parent=Directory.GetParent(Application.persistentDataPath)?.FullName;
                var candidates=new[]{Path.Combine(Application.persistentDataPath,"unga-bunga-45001",id+".json"),Path.Combine(parent??Application.persistentDataPath,"UNGA BUNGA 45001","unga-bunga-45001",id+".json"),Path.Combine(parent??Application.persistentDataPath,"UNGA BUNGA 45001 - Web","unga-bunga-45001",id+".json")};
                #endif
                foreach(string source in candidates.Where(File.Exists).OrderByDescending(File.GetLastWriteTimeUtc))
                    if(TryCopyValidSave(source,campaign.CurrentSavePath,id)){Debug.Log("Sauvegarde précédente importée dans THALEOLITHIC.");break;}
            }
            catch(Exception e){Debug.LogWarning("Recherche de sauvegarde précédente différée : "+e.Message);}
        }
    }
}
