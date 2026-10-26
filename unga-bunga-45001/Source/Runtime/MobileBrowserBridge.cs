using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class MobileBrowserBridge:MonoBehaviour
    {
        [Serializable]class Viewport{public float width,height;public bool touch;}
        [Serializable]class Ready{public string type="ready";public bool saved;public int inputMode,graphicsProfile;}
        [Serializable]class Options{public int inputMode,graphicsProfile=3;}
        [Serializable]class Receipt{public string type="state",player,act,dialogue,quest,duel;public float elapsed,frameMs;public bool paused,touch,film;public Vector3 position;public int fires,characters,claimed;}
        #if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]static extern void UngaBrowserEvent(string json);
        [DllImport("__Internal")]static extern void UngaFlushSave();
        #endif
        CampaignRuntime campaign;bool started;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Initialize(){var go=new GameObject("UNGA_WEB_BRIDGE");DontDestroyOnLoad(go);go.AddComponent<MobileBrowserBridge>();}
        IEnumerator Start()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            while((campaign=FindFirstObjectByType<CampaignRuntime>())==null||campaign.Data==null)yield return null;
            var preferences=campaign.GetComponent<UISettingsController>().preferences;
            UngaBrowserEvent(JsonUtility.ToJson(new Ready{saved=File.Exists(campaign.CurrentSavePath),inputMode=preferences.inputMode,graphicsProfile=preferences.graphicsProfile}));
            while(true){if(started&&campaign.State!=null){var state=new Receipt{player=campaign.Data.playerCharacterId,act=campaign.CurrentAct?.id,dialogue=campaign.Dialogue?.id,quest=campaign.State.trackedQuestId,duel=campaign.MenhirActive?campaign.GetComponent<MenhirDuel>().Phase.ToString():"",elapsed=campaign.State.elapsedSeconds,paused=campaign.UserPaused,touch=MobileControls.TouchActive,film=campaign.cinematicDirector.IsPlaying,position=campaign.bindings.player.position,fires=FindObjectsByType<NativeFire>(FindObjectsSortMode.None).Length,characters=campaign.State.characters.Count,claimed=campaign.State.quests.Count(q=>q.claimed),frameMs=Time.smoothDeltaTime*1000};UngaBrowserEvent(JsonUtility.ToJson(state));}yield return new WaitForSecondsRealtime(2);}
            #else
            yield break;
            #endif
        }
        public void BeginGame(string mode){if(started)return;campaign=FindFirstObjectByType<CampaignRuntime>();if(campaign?.Data==null)return;started=true;campaign.BeginCampaign(mode=="new");}
        public void Configure(string json){try{var options=JsonUtility.FromJson<Options>(json);var settings=FindFirstObjectByType<UISettingsController>();settings.preferences.inputMode=Mathf.Clamp(options.inputMode,0,2);settings.preferences.graphicsProfile=Mathf.Clamp(options.graphicsProfile,0,3);settings.Save();}catch(Exception e){Debug.LogWarning(e.Message);}}
        public void BrowserViewport(string json){try{var data=JsonUtility.FromJson<Viewport>(json);if(data.width>0&&data.height>0){MobileControls.CssWidth=data.width;MobileControls.CssHeight=data.height;MobileControls.BrowserTouch=data.touch;}}catch{}}
        public void BrowserPause(string value){campaign=FindFirstObjectByType<CampaignRuntime>();if(campaign?.State==null||value!="1")return;if(MobileControls.TouchActive){MobileControls.Instance.PauseForBackground();return;}campaign.Save();campaign.SetPause(true);Flush();}
        public static void Flush(){
            #if UNITY_WEBGL && !UNITY_EDITOR
            UngaFlushSave();
            #endif
        }
    }
}
