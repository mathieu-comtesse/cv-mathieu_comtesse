using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.Scripting;

namespace UngaBunga45001
{
    [Preserve]
    public sealed class MobileBrowserBridge : MonoBehaviour
    {
        [Serializable] class Viewport { public float width, height; public bool touch; }
        [Serializable] class Options { public int inputMode, graphicsProfile = 3; }
        [Serializable] class BrowserState { public int sequence; public bool focused, visible, menu, pointer, resume, diagnostic; }
        [Serializable] class Event
        {
            public string type, phase, code, message;
            public bool saved;
            public int request, sequence, inputMode, graphicsProfile;
        }
        [Serializable] class StartRequest { public int request; public string mode; }
        [Serializable] class Receipt
        {
            public string type = "state", player, act, dialogue, quest, duel;
            public float elapsed, frameMs;
            public bool paused, touch, film;
            public Vector3 position;
            public int fires, characters, claimed;
        }
        [Serializable] class InputReceipt
        {
            public string type = "input", window, parent, activity, quest, phase, locks;
            public bool controls, touch, suspended, paused, camera, motor, pointer, focused, resumeRequired;
            public float timeScale;
        }
        [Serializable] class Diagnostics
        {
            public string type = "diagnostic";
            public float yaw, pitch, distance, fps;
            public int touches, allocatedMiB;
        }

#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] static extern void UngaBrowserEvent(string json);
        [DllImport("__Internal")] static extern void UngaFlushSave();
#endif
        CampaignRuntime campaign;
        bool started, initializing, resumeRequired;
        BrowserState browser = new BrowserState { focused = true, visible = true };
        string lastInputReceipt;
        float nextInputReceipt;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Initialize()
        {
            var bridge = new GameObject("UNGA_WEB_BRIDGE");
            DontDestroyOnLoad(bridge);
            bridge.AddComponent<MobileBrowserBridge>();
        }

        static void Emit(object data)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            UngaBrowserEvent(JsonUtility.ToJson(data));
#endif
        }

        IEnumerator Start()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WebGLInput.stickyCursorLock = false;
            WebGLInput.captureAllKeyboardInput = false;
            float deadline = Time.realtimeSinceStartup + 20;
            while (true)
            {
                campaign = FindFirstObjectByType<CampaignRuntime>();
                if (campaign != null && campaign.StartupReady) break;
                if (!string.IsNullOrEmpty(campaign?.StartupError) || Time.realtimeSinceStartup >= deadline)
                {
                    Emit(new Event { type = "GAME_START_FAILED", phase = "SCENE", code = "SCENE_NOT_READY",
                        message = campaign?.StartupError ?? "La campagne n’a pas terminé la préparation de la scène." });
                    yield break;
                }
                yield return null;
            }
            var preferences = campaign.GetComponent<UISettingsController>().preferences;
            Emit(new Event { type = "ready", phase = "NOT_STARTED", saved = File.Exists(campaign.CurrentSavePath),
                inputMode = preferences.inputMode, graphicsProfile = preferences.graphicsProfile });
            while (true)
            {
                if (started && campaign != null && campaign.State != null)
                {
                    Emit(new Receipt { player = campaign.Data.playerCharacterId, act = campaign.CurrentAct?.id,
                        dialogue = campaign.Dialogue?.id, quest = campaign.State.trackedQuestId,
                        duel = campaign.MenhirActive ? campaign.GetComponent<MenhirDuel>().Phase.ToString() : "",
                        elapsed = campaign.State.elapsedSeconds, paused = campaign.UserPaused, touch = MobileControls.TouchActive,
                        film = campaign.cinematicDirector.IsPlaying, position = campaign.bindings.player.position,
                        fires = FindObjectsByType<NativeFire>(FindObjectsSortMode.None).Length,
                        characters = campaign.State.characters.Count, claimed = campaign.State.quests.Count(q => q.claimed),
                        frameMs = Time.smoothDeltaTime * 1000 });
                    if (browser.diagnostic)
                    {
                        var motor = campaign.bindings.player.GetComponent<ThirdPersonMotor>();
                        Emit(new Diagnostics { yaw = motor.Yaw, pitch = motor.Pitch, distance = motor.OrbitDistance,
                            fps = 1 / Mathf.Max(.0001f, Time.smoothDeltaTime), touches = MobileControls.ContactCount,
                            allocatedMiB = (int)(UnityEngine.Profiling.Profiler.GetTotalAllocatedMemoryLong() / (1024 * 1024)) });
                    }
                }
                yield return new WaitForSecondsRealtime(1);
            }
#else
            yield break;
#endif
        }

        void LateUpdate()
        {
            if (!started || campaign == null || campaign.State == null || Time.unscaledTime < nextInputReceipt) return;
            nextInputReceipt = Time.unscaledTime + .1f;
            var menus = campaign.GetComponent<AdventureMenus>();
            var activity = campaign.GetComponent<CampaignActivitiesV17>();
            var motor = campaign.bindings.player.GetComponent<ThirdPersonMotor>();
            var receipt = new InputReceipt {
                window = menus.IsOpen ? menus.Mode : campaign.Dialogue != null ? "Dialogue" : campaign.QuestOverlay ? "Quête" :
                    activity.Active ? "Activité" : campaign.cinematicDirector.IsPlaying ? "Cinématique" : "",
                parent = menus.ParentMode, activity = activity.Current?.id, quest = campaign.State.trackedQuestId,
                touch = MobileControls.TouchActive, suspended = campaign.BrowserInputSuspended, paused = campaign.UserPaused,
                camera = campaign.bindings.gameplayCamera.isActiveAndEnabled, timeScale = Time.timeScale,
                motor = motor.isActiveAndEnabled, controls = campaign.ControlsAvailable, phase = campaign.InterfaceState,
                locks = campaign.ActiveControlLocks.ToString(), pointer = browser.pointer, focused = browser.focused,
                resumeRequired = resumeRequired
            };
            string json = JsonUtility.ToJson(receipt);
            if (json == lastInputReceipt) return;
            lastInputReceipt = json;
#if UNITY_WEBGL && !UNITY_EDITOR
            UngaBrowserEvent(json);
#endif
        }

        [Preserve]
        public void BeginGame(string json)
        {
            if (initializing) return;
            StartRequest request = null;
            try
            {
                request = JsonUtility.FromJson<StartRequest>(json);
                if (request == null || (request.mode != "new" && request.mode != "continue"))
                    throw new ArgumentException("Mode de démarrage inconnu.");
                if (!started)
                {
                    initializing = true;
                    Emit(new Event { type = "GAME_STARTING", phase = "INITIALIZING", request = request.request });
                    campaign.BeginBrowserCampaign(request.mode == "new");
                    started = true;
                    ApplyBrowserState();
                }
                Emit(new Event { type = "GAME_STARTED", phase = "READY_TO_PLAY", request = request.request, saved = File.Exists(campaign.CurrentSavePath) });
            }
            catch (Exception error)
            {
                Debug.LogException(error, this);
                Emit(new Event { type = "GAME_START_FAILED", phase = "CAMPAIGN", request = request?.request ?? 0,
                    code = error is InvalidDataException ? "SAVE_INVALID" : "CAMPAIGN_INIT", message = error.Message });
            }
            finally { initializing = false; }
        }

        [Preserve]
        public void Configure(string json)
        {
            var options = JsonUtility.FromJson<Options>(json);
            var settings = campaign.GetComponent<UISettingsController>();
            settings.preferences.inputMode = Mathf.Clamp(options.inputMode, 0, 2);
            settings.preferences.graphicsProfile = Mathf.Clamp(options.graphicsProfile, 0, 3);
            settings.Save();
            campaign.GetComponent<MobileQuality>()?.Apply();
        }

        [Preserve]
        public void BrowserViewport(string json)
        {
            var viewport = JsonUtility.FromJson<Viewport>(json);
            if (viewport.width <= 0 || viewport.height <= 0) return;
            MobileControls.CssWidth = viewport.width;
            MobileControls.CssHeight = viewport.height;
            MobileControls.BrowserTouch = viewport.touch;
        }

        [Preserve]
        public void BrowserFocus(string json)
        {
            var state = JsonUtility.FromJson<BrowserState>(json);
            if (state.sequence <= browser.sequence) return;
            if (started && !state.visible && browser.visible && MobileControls.TouchActive && (campaign.ActiveControlLocks & ~ControlLocks.BrowserFocus) == ControlLocks.None)
                resumeRequired = true;
            browser = state;
            if (campaign != null) campaign.BrowserPointerLocked = state.pointer;
            if (state.resume && state.focused && state.visible && !state.menu) resumeRequired = false;
            ApplyBrowserState();
            Emit(new Event { type = "BROWSER_ACK", sequence = browser.sequence, phase = started ? campaign.InterfaceState : "NOT_STARTED" });
        }

        [Preserve]
        public void BrowserPointerGesture(string json) => BrowserFocus(json);

        void ApplyBrowserState()
        {
            if (!started || campaign == null || campaign.State == null) return;
            bool suspended = !browser.focused || !browser.visible || browser.menu || resumeRequired;
            if (campaign.BrowserInputSuspended == suspended) return;
#if ENABLE_INPUT_SYSTEM
            var keyboard = UnityEngine.InputSystem.Keyboard.current;
            if (keyboard != null) UnityEngine.InputSystem.InputSystem.ResetDevice(keyboard);
            var mouse = UnityEngine.InputSystem.Mouse.current;
            if (mouse != null) UnityEngine.InputSystem.InputSystem.ResetDevice(mouse);
            var touchscreen = UnityEngine.InputSystem.Touchscreen.current;
            if (touchscreen != null) UnityEngine.InputSystem.InputSystem.ResetDevice(touchscreen);
#endif
            MobileControls.Instance?.ResetTransientInput();
            campaign.GetComponent<ActivityViewV17>()?.CancelDrag();
            campaign.SetBrowserInputSuspended(suspended);
            if (suspended) campaign.Save();
        }

        public static void Flush()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            UngaFlushSave();
#endif
        }
    }
}
