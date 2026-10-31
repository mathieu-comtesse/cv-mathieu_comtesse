using System.Collections;
using System.Linq;
using UnityEngine;

namespace UngaBunga45001
{
    public sealed class CinematicDirector : MonoBehaviour
    {
        public CampaignRuntime campaign;
        public SceneBindings bindings;
        public Camera cinematicCamera;
        public bool IsPlaying { get; private set; }
        public string CurrentSummary { get; private set; }
        public string CurrentId {get;private set;}="";
        public string SequenceState {get;private set;}="READY";
        private bool skip;
        private Coroutine routine;
        AudioListener homeListener,filmListener;bool homeListening,filmListening;
        void RestoreListeners(){if(homeListener!=null)homeListener.enabled=homeListening;if(filmListener!=null)filmListener.enabled=filmListening;}
        public void Play(string id)
        {
            if (IsPlaying || campaign == null || campaign.Data == null) return;
            SequenceState="LOADING";
            var data = CinematicCatalogueV15.Definition(id,campaign)??campaign.Data.cinematics.FirstOrDefault(c => c.id == id);
            if (data == null || cinematicCamera == null || data.shots.Length == 0) { SequenceState="FAILED";campaign.Inform("Cinématique non reliée à la scène : " + id); return; }
            foreach (var shot in data.shots)
            {
                if (bindings.Find(shot.cameraBindingId) == null || bindings.Find(shot.lookAtBindingId) == null)
                { SequenceState="FAILED";campaign.Inform("Plan réel manquant : " + shot.cameraBindingId); return; }
            }
            RenderBackend.CinematicCamera(cinematicCamera,bindings.gameplayCamera);
            routine = StartCoroutine(Run(data));
        }
        public void Skip() { skip = true; }
        private IEnumerator Run(CinematicDefinition data)
        {
            float resume=campaign.State.activeCinematicId==data.id?Mathf.Clamp(campaign.State.cinematicTimeV15,0,data.durationSeconds):0;
            string resolvedId=CinematicCatalogueV15.Resolve(data.id,campaign);
            if(resume<=0)campaign.State.cinematicActorsV15?.Clear();
            IsPlaying=true;skip=false;CurrentSummary=data.summary;CurrentId=data.id;SequenceState="PLAYING";campaign.State.activeCinematicId=data.id;campaign.State.cinematicTimeV15=resume;campaign.Save();
            var stage=GetComponent<CinematicStage>();bool originalCamera=bindings.gameplayCamera.enabled;var home=bindings.gameplayCamera.transform.position;var homeRotation=bindings.gameplayCamera.transform.rotation;var playerStart=bindings.player.position;bool completed=false;float originalTimeScale=Time.timeScale>0?Time.timeScale:1;
            bindings.SetGameplayBlocked(true);bindings.gameplayCamera.enabled=false;cinematicCamera.enabled=true;
            homeListener=bindings.gameplayCamera.GetComponent<AudioListener>()??FindObjectsByType<AudioListener>(FindObjectsSortMode.None).FirstOrDefault(a=>a.enabled);homeListening=homeListener!=null&&homeListener.enabled;if(homeListener!=null)homeListener.enabled=false;
            filmListener=cinematicCamera.GetComponent<AudioListener>();filmListening=filmListener!=null&&filmListener.enabled;if(filmListener==null)filmListener=cinematicCamera.gameObject.AddComponent<AudioListener>();filmListener.enabled=true;
            try
            {
                SequenceState="LOADING";cinematicCamera.transform.SetPositionAndRotation(home,homeRotation);var navigation=GetComponent<VillageNavigation>();
                if(navigation!=null){navigation.RequestRebuild();float deadline=Time.realtimeSinceStartup+8;while(navigation.Pending&&!skip&&Time.realtimeSinceStartup<deadline)yield return null;}
                GetComponent<CinematicWorldResetV15>()?.EnableAgents();
                var score=GetComponent<CinematicScoreV15>()??gameObject.AddComponent<CinematicScoreV15>();var blueprint=CinematicCatalogueV15.Find(CinematicCatalogueV15.Resolve(data.id,campaign));if(blueprint!=null&&!skip){var preparation=score.Prepare(blueprint.mood);while(!skip&&preparation.MoveNext())yield return preparation.Current;if(!skip)score.Begin(blueprint.mood);}
                var routePreparation=CinematicNavigationV15.Prepare(campaign,blueprint,()=>skip);while(routePreparation.MoveNext())yield return routePreparation.Current;
                stage.Begin(data.id);var entry=stage.Production.PrepareEntry(cinematicCamera,()=>skip);while(entry.MoveNext())yield return entry.Current;float shotStart=0,saveAt=resume+5;
                foreach(var shot in data.shots)
                {
                    if(shotStart+shot.durationSeconds<=resume){shotStart+=shot.durationSeconds;continue;}
                    var line=stage.Production.Subtitle(shot.subtitle);campaign.Subtitle=string.IsNullOrEmpty(shot.speaker)?line:stage.Production.Speaker(shot.speaker)+" : "+line;
                    float timer=Mathf.Max(0,resume-shotStart);
                    while(timer<shot.durationSeconds&&!skip)
                    {
                        SequenceState=campaign.UserPaused?"PAUSED":"PLAYING";
                        Time.timeScale=campaign.UserPaused?0:originalTimeScale;
                        if(!campaign.UserPaused){timer+=Time.deltaTime;float time=shotStart+timer;campaign.State.cinematicTimeV15=time;stage.Evaluate(time,data.durationSeconds,cinematicCamera);if(time>=saveAt){saveAt=time+5;campaign.Save();}}
                        yield return null;
                    }
                    shotStart+=shot.durationSeconds;if(skip)break;
                }
                var destination=home+bindings.player.position-playerStart;
                if(!skip){var from=cinematicCamera.transform.position;var rotation=cinematicCamera.transform.rotation;float t=0;while(t<.45f&&!skip){Time.timeScale=campaign.UserPaused?0:originalTimeScale;if(!campaign.UserPaused)t+=Time.deltaTime;float u=Mathf.SmoothStep(0,1,t/.45f);cinematicCamera.transform.SetPositionAndRotation(Vector3.Lerp(from,destination,u),Quaternion.Slerp(rotation,homeRotation,u));yield return null;}}
                Time.timeScale=originalTimeScale;
                stage.End();destination=home+bindings.player.position-playerStart;bindings.gameplayCamera.transform.SetPositionAndRotation(destination,homeRotation);completed=true;
            }
            finally
            {
                Time.timeScale=originalTimeScale;if(!completed)stage?.Abort();GetComponent<CinematicScoreV15>()?.End();RestoreListeners();cinematicCamera.enabled=false;bindings.gameplayCamera.enabled=originalCamera;campaign.Subtitle="";IsPlaying=false;routine=null;CurrentId="";bindings.SetGameplayBlocked(false);
                SequenceState=completed?(skip?"SKIPPED":"COMPLETED"):"FAILED";
                if(completed){if(!campaign.State.viewedCinematics.Contains(data.id))campaign.State.viewedCinematics.Add(data.id);if(!campaign.State.viewedCinematics.Contains(resolvedId))campaign.State.viewedCinematics.Add(resolvedId);campaign.State.activeCinematicId="";campaign.State.cinematicTimeV15=0;campaign.State.cinematicActorsV15?.Clear();campaign.Save();}
            }
            if(skip)campaign.Inform(PlayerSummary(data.id,data.title));
        }
        // Authored player-facing summaries; the complete source staging remains in the codex data.
        private static string PlayerSummary(string id,string title)
        {
            switch(id)
            {
                case "C01":return "Le village s’éveille. Rejoins Mathieu pour observer les premiers dangers.";
                case "C02":return "Les ateliers évoluent. Vérifie leurs protections et leurs circulations.";
                case "C03":return "Le village se transforme. Compare les installations et les risques encore ouverts.";
                case "C04":return "La chasse se prépare. Vérifie les moyens, la fatigue et les consignes de repli.";
                case "C05":return "Face au mammouth, les décisions de préparation et de coordination ont des conséquences.";
                case "C06":return "Le conseil examine les progrès. Prépare les prochaines vérifications et l’entretien.";
                default:return title;
            }
        }
        private void OnDisable()
        {
            if (routine != null) StopCoroutine(routine);
            RestoreListeners();
            if(IsPlaying){GetComponent<CinematicStage>()?.Abort();SequenceState="FAILED";}
            if (IsPlaying && bindings != null && bindings.gameplayCamera != null) bindings.gameplayCamera.enabled = true;
            if (cinematicCamera != null) cinematicCamera.enabled = false;
            IsPlaying = false;
        }
    }
}
