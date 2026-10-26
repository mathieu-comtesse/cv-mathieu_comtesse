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
        public void Play(string id)
        {
            if (IsPlaying || campaign == null || campaign.Data == null) return;
            SequenceState="LOADING";
            var data = campaign.Data.cinematics.FirstOrDefault(c => c.id == id);
            if (data == null || cinematicCamera == null || data.shots.Length == 0) { SequenceState="FAILED";campaign.Inform("Cinématique non reliée à la scène : " + id); return; }
            foreach (var shot in data.shots)
            {
                if (bindings.Find(shot.cameraBindingId) == null || bindings.Find(shot.lookAtBindingId) == null)
                { SequenceState="FAILED";campaign.Inform("Plan réel manquant : " + shot.cameraBindingId); return; }
            }
            routine = StartCoroutine(Run(data));
        }
        public void Skip() { skip = true; }
        private IEnumerator Run(CinematicDefinition data)
        {
            IsPlaying = true; skip = false; CurrentSummary = data.summary;CurrentId=data.id;SequenceState="PLAYING";
            campaign.State.activeCinematicId=data.id;campaign.Save();
            var stage=GetComponent<CinematicStage>();stage?.Begin(data.id);float filmTime=0;
            bool originalCamera = bindings.gameplayCamera.enabled;
            bindings.gameplayCamera.enabled = false; cinematicCamera.enabled = true;
            foreach (var shot in data.shots)
            {
                var position = bindings.Find(shot.cameraBindingId); var look = bindings.Find(shot.lookAtBindingId);
                cinematicCamera.transform.SetPositionAndRotation(position.position, position.rotation);
                var offset=position.position-look.position;float distance=offset.magnitude;
                foreach(var hit in Physics.SphereCastAll(look.position,.25f,offset.normalized,distance,~0,QueryTriggerInteraction.Ignore))
                    if(hit.distance>1.5f)distance=Mathf.Min(distance,Mathf.Max(2,hit.distance-.3f));
                cinematicCamera.transform.position=look.position+offset.normalized*distance;
                cinematicCamera.transform.LookAt(look.position);
                campaign.Subtitle = string.IsNullOrEmpty(shot.speaker) ? shot.subtitle : shot.speaker + " : " + shot.subtitle;
                if (!string.IsNullOrEmpty(shot.animationTrigger))
                {
                    var actor = bindings.AnimatorFor(shot.actorBindingId);
                    if (actor != null && actor.parameters.Any(p => p.type == AnimatorControllerParameterType.Trigger && p.name == shot.animationTrigger)) actor.SetTrigger(shot.animationTrigger);
                }
                float timer = 0;
                while (timer < shot.durationSeconds && !skip) { SequenceState=campaign.UserPaused?"PAUSED":"PLAYING";if (!campaign.UserPaused){timer += Time.deltaTime;filmTime+=Time.deltaTime;stage?.Evaluate(filmTime,data.durationSeconds,cinematicCamera);} yield return null; }
                if (skip) break;
            }
            cinematicCamera.enabled = false; bindings.gameplayCamera.enabled = originalCamera;
            campaign.Subtitle = ""; IsPlaying = false; routine = null;
            stage?.End();
            SequenceState=skip?"SKIPPED":"COMPLETED";
            if(!campaign.State.viewedCinematics.Contains(data.id))campaign.State.viewedCinematics.Add(data.id);
            campaign.State.activeCinematicId="";campaign.Save();CurrentId="";
            if (skip) campaign.Inform(PlayerSummary(data.id,data.title));
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
            if(IsPlaying){GetComponent<CinematicStage>()?.End();SequenceState="FAILED";}
            if (IsPlaying && bindings != null && bindings.gameplayCamera != null) bindings.gameplayCamera.enabled = true;
            if (cinematicCamera != null) cinematicCamera.enabled = false;
            IsPlaying = false;
        }
    }
}
