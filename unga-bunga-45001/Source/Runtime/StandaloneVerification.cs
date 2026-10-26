#if UNGA_WEB_RENDERER
using UnityEngine; namespace UngaBunga45001 { public sealed class StandaloneVerification:MonoBehaviour {public static bool Requested=>false;} }
#else
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace UngaBunga45001
{
    // Opt-in verification of the built player. Saves are isolated from the player's campaign.
    public sealed class StandaloneVerification : MonoBehaviour
    {
        public static bool Requested => Environment.GetCommandLineArgs().Contains("-ungaVerify");
        private const string Root = "E:/UNGA-BUNGA-45001";
        [Serializable] private class Receipt
        {
            public string status,unity,gpu,action;
            public bool standalone,bindingsValid,grounded,movement,dialogueOpened,uiChoiceInvoked,actionCompleted;
            public int actors,validAvatars,frames;
            public bool screenshotsValid=true,actionMenu,routePassed,checkpointReplay,allCinematics;
            public bool acceleratedRoute=true;
            public int routeActions,cinematicsChecked;
            public string routeEnding;
            public float movementMeters,elapsedSeconds;
            public string[] errors,captures;
        }
        private readonly List<string> errors=new List<string>();
        private Receipt receipt=new Receipt();
        private bool finished;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Initialize()
        {
            if(!Requested || Application.isEditor)return;
            var go=new GameObject("Standalone verification");DontDestroyOnLoad(go);go.AddComponent<StandaloneVerification>();
        }
        private void Awake()
        {
            Application.logMessageReceived+=Log;
            UnityEngine.SceneManagement.SceneManager.sceneLoaded+=SceneLoaded;
            StartCoroutine(Timeout());
        }
        private void SceneLoaded(UnityEngine.SceneManagement.Scene scene,UnityEngine.SceneManagement.LoadSceneMode mode)
        {var campaign=FindFirstObjectByType<CampaignRuntime>();if(campaign!=null)campaign.resumeOnStart=false;}
        private void Log(string condition,string stack,LogType type)
        {if((type==LogType.Error||type==LogType.Exception||type==LogType.Assert)&&errors.Count<40&&!errors.Contains(condition))errors.Add(condition);}
        private IEnumerator Timeout(){yield return new WaitForSecondsRealtime(180);if(!finished)Finish("timeout");}
        private IEnumerator Capture(string name)
        {
            yield return new WaitForEndOfFrame();
            var texture=ScreenCapture.CaptureScreenshotAsTexture();
            var pixels=texture.GetPixels32();bool nonBlack=false;
            for(int i=0;i<pixels.Length;i+=127)if(pixels[i].r+pixels[i].g+pixels[i].b>60){nonBlack=true;break;}
            if(!nonBlack){receipt.screenshotsValid=false;errors.Add("Capture is black: "+name);}
            Directory.CreateDirectory(Root+"/Preview");File.WriteAllBytes(Root+"/Preview/"+name,texture.EncodeToPNG());Destroy(texture);
        }
        private IEnumerator Start()
        {
            yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);
            var campaign=FindFirstObjectByType<CampaignRuntime>();
            receipt.standalone=!Application.isEditor;receipt.unity=Application.unityVersion;receipt.gpu=SystemInfo.graphicsDeviceName;
            receipt.bindingsValid=campaign.bindings.Validate(out _);receipt.actors=campaign.bindings.characters.Length;
            receipt.validAvatars=campaign.bindings.characters.Count(c=>c.animator!=null&&c.animator.avatar!=null&&c.animator.avatar.isValid);
            yield return new WaitForSecondsRealtime(2);yield return Capture("Windows-Cinematic.png");
            campaign.cinematicDirector.Skip();yield return null;yield return null;
            var keyboard=InputSystem.AddDevice<Keyboard>("UngaBungaPlayerAuditKeyboard");keyboard.MakeCurrent();
            InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
            var initial=campaign.bindings.player.position;float start=Time.realtimeSinceStartup;int frames=Time.frameCount;
            while(Time.realtimeSinceStartup-start<1.2f){keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.W));yield return null;}
            InputSystem.QueueStateEvent(keyboard,new KeyboardState());yield return null;
            var delta=campaign.bindings.player.position-initial;receipt.movementMeters=new Vector2(delta.x,delta.z).magnitude;
            receipt.movement=receipt.movementMeters>.25f;receipt.grounded=campaign.bindings.player.GetComponent<CharacterController>().isGrounded;
            yield return Capture("Windows-Gameplay.png");
            var action=campaign.Data.actions.FirstOrDefault(a=>a.actId==campaign.CurrentAct.id&&campaign.CanExecute(a,out _));
            if(action!=null)
            {
                receipt.action=action.id;var target=campaign.bindings.Find(action.targetBindingId);var controller=campaign.bindings.player.GetComponent<CharacterController>();
                controller.enabled=false;campaign.bindings.player.position=target.position+Vector3.right*.7f+Vector3.up*.12f;controller.enabled=true;
                campaign.GetComponent<WorldInteraction>().Execute(action.id);yield return new WaitForSecondsRealtime(.5f);
                receipt.dialogueOpened=campaign.Dialogue!=null;yield return Capture("Windows-Dialogue.png");
                var button=campaign.GetComponentsInChildren<UnityEngine.UI.Button>().FirstOrDefault(b=>b.GetComponentInChildren<TMPro.TMP_Text>()?.text=="Continuer");
                if(button!=null){button.onClick.Invoke();receipt.uiChoiceInvoked=true;}
                float deadline=Time.realtimeSinceStartup+15;
                while(campaign.IsBusy&&Time.realtimeSinceStartup<deadline)yield return null;
                receipt.actionCompleted=campaign.State.completedActions.Contains(action.id);
            }
            receipt.frames=Time.frameCount-frames;receipt.elapsedSeconds=campaign.State.elapsedSeconds;InputSystem.RemoveDevice(keyboard);
            campaign.OpenActionMenu("aurelien");yield return null;
            var cancel=campaign.GetComponentsInChildren<UnityEngine.UI.Button>().LastOrDefault(b=>b.GetComponentInChildren<TMPro.TMP_Text>()?.text=="Revenir au village");
            if(cancel!=null){cancel.onClick.Invoke();receipt.actionMenu=campaign.Dialogue==null;}
            yield return SafeRoute(campaign);
            Finish(receipt.bindingsValid&&receipt.actors==18&&receipt.validAvatars==18&&receipt.movement&&receipt.grounded&&receipt.dialogueOpened&&receipt.uiChoiceInvoked&&receipt.actionCompleted&&receipt.screenshotsValid&&receipt.actionMenu&&receipt.routePassed&&receipt.checkpointReplay&&receipt.allCinematics&&errors.Count==0?"passed":"failed");
        }
        private IEnumerator Skip(CampaignRuntime campaign)
        {
            if(campaign.cinematicDirector.IsPlaying)campaign.cinematicDirector.Skip();
            while(campaign.cinematicDirector.IsPlaying)yield return null;
            yield return null;
        }
        private IEnumerator SafeRoute(CampaignRuntime campaign)
        {
            campaign.NewCampaign();yield return Skip(campaign);
            // Bound the test by removing work waits only; effects, conditions, UI choices and world states remain real.
            foreach(var action in campaign.Data.actions)action.durationSeconds=0;
            for(int act=0;act<campaign.Data.acts.Length;act++)
            {
                foreach(var action in campaign.Data.actions.Where(a=>a.actId==campaign.CurrentAct.id&&!a.id.StartsWith("SOURCE_TALK_")&&!a.id.StartsWith("OPTION_")&&!a.id.StartsWith("SUPPORT_")).ToArray())
                {
                    yield return Skip(campaign);
                    if(!campaign.CanExecute(action,out string reason)){errors.Add("Safe route blocked at "+action.id+": "+reason);yield break;}
                    var controller=campaign.bindings.player.GetComponent<CharacterController>();var target=campaign.bindings.Find(action.targetBindingId);
                    controller.enabled=false;campaign.bindings.player.position=target.position+Vector3.right*.7f+Vector3.up*.12f;controller.enabled=true;
                    campaign.GetComponent<WorldInteraction>().Execute(action.id);yield return null;
                    int guard=0;
                    while(campaign.Dialogue!=null&&guard++<12)
                    {
                        var choice=campaign.Dialogue.choices.FirstOrDefault(c=>c.id.EndsWith("_C")&&campaign.CanChoose(c))??campaign.Dialogue.choices.FirstOrDefault(c=>campaign.CanChoose(c));
                        yield return null;
                        var button=campaign.GetComponentsInChildren<UnityEngine.UI.Button>().LastOrDefault(b=>b.GetComponentInChildren<TMPro.TMP_Text>()?.text==choice.text);
                        if(button==null){errors.Add("Choice button missing at "+action.id);yield break;}
                        button.onClick.Invoke();yield return null;
                    }
                    while(campaign.IsBusy)yield return null;
                    if(!campaign.State.completedActions.Contains(action.id)){errors.Add("Safe route action incomplete: "+action.id);yield break;}
                    receipt.routeActions++;
                }
                yield return Skip(campaign);
                if(!campaign.IsActComplete){errors.Add("Safe route objectives incomplete: "+campaign.CurrentAct.id);yield break;}
                campaign.AdvanceAct();yield return Skip(campaign);
            }
            receipt.routeEnding=campaign.Ending?.id;
            receipt.routePassed=campaign.Ending?.priority==2&&campaign.State.characters.All(c=>c.alive)&&campaign.bindings.buildings.All(b=>campaign.State.buildings.Find(v=>v.id==b.id)?.value==3);
            yield return Capture("Windows-Ending.png");
            campaign.ReplayAct(7);receipt.checkpointReplay=campaign.Ending==null&&campaign.State.actIndex==7&&!campaign.IsActComplete;
            foreach(var cinematic in campaign.Data.cinematics)
            {
                campaign.cinematicDirector.Play(cinematic.id);yield return null;
                if(campaign.cinematicDirector.IsPlaying&&campaign.cinematicDirector.cinematicCamera.enabled)receipt.cinematicsChecked++;
                yield return Skip(campaign);
            }
            receipt.allCinematics=receipt.cinematicsChecked==6;
        }
        private void Finish(string status)
        {
            if(finished)return;finished=true;receipt.status=status;receipt.errors=errors.ToArray();receipt.captures=new[]{"Preview/Windows-Cinematic.png","Preview/Windows-Gameplay.png","Preview/Windows-Dialogue.png"};
            Directory.CreateDirectory(Root+"/Analysis");File.WriteAllText(Root+"/Analysis/windows-player-audit.json",JsonUtility.ToJson(receipt,true));
            Application.Quit(status=="passed"?0:1);
        }
    }
}

#endif
