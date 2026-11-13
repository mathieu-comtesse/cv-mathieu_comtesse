#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.UI;

namespace UngaBunga45001.Editor
{
    public sealed class StabilityRegressionV23 : MonoBehaviour
    {
        const string SessionKey = "THALEOLITHIC.V23.StabilityRegression";
        [Serializable] sealed class Report
        {
            public string status = "running", failure;
            public List<string> passed = new List<string>();
        }

        readonly Report report = new Report();
        string output;

        public static void RunAudit()
        {
            if (Array.IndexOf(Environment.GetCommandLineArgs(), "-stabilityReport") < 0)
                throw new ArgumentException("Use -stabilityReport with an absolute output path.");
            SessionState.SetBool(SessionKey, true);
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity");
            EditorApplication.isPlaying = true;
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (!SessionState.GetBool(SessionKey, false)) return;
            SessionState.EraseBool(SessionKey);
            Application.runInBackground = true;
            new GameObject("V23.1 Stability Regression").AddComponent<StabilityRegressionV23>();
        }

        IEnumerator Start()
        {
            var args = Environment.GetCommandLineArgs();
            output = args[Array.IndexOf(args, "-stabilityReport") + 1];
            var suite = Verify();
            while (true)
            {
                bool pending;
                try { pending = suite.MoveNext(); }
                catch (Exception error)
                {
                    report.status = "failed";
                    report.failure = error.ToString();
                    File.WriteAllText(output, JsonUtility.ToJson(report, true));
                    Debug.LogException(error);
                    EditorApplication.Exit(1);
                    yield break;
                }
                if (!pending) break;
                yield return suite.Current;
            }
            report.status = "passed";
            File.WriteAllText(output, JsonUtility.ToJson(report, true));
            EditorApplication.Exit(0);
        }

        void Check(bool condition, string name)
        {
            if (!condition) throw new InvalidOperationException(name);
            report.passed.Add(name);
            File.WriteAllText(output, JsonUtility.ToJson(report, true));
        }

        IEnumerator Verify()
        {
            yield return null;
            var campaign = FindFirstObjectByType<CampaignRuntime>();
            Check(campaign != null && campaign.StartupReady && campaign.State != null, "Campagne et scène initialisées");
            Check(campaign.CurrentSavePath.Contains("unga-bunga-verification"), "Sauvegarde isolée");
            campaign.GetComponent<CinematicTriggersV15>().SuspendAutomatic = true;
            campaign.NewCampaign();
            campaign.cinematicDirector.Skip();
            yield return new WaitUntil(() => !campaign.cinematicDirector.IsPlaying);
            campaign.State.pendingCinematicsV15.Clear();
            campaign.CloseQuest();
            campaign.SetPause(false);
            var world = campaign.GetComponent<WorldInteraction>();
            var menus = campaign.GetComponent<AdventureMenus>();
            var motor = campaign.bindings.player.GetComponent<ThirdPersonMotor>();
            var controller = motor.GetComponent<CharacterController>();
            var camera = campaign.bindings.gameplayCamera;
            Check(campaign.ControlsAvailable && motor.enabled && camera.enabled, "Retour de la cinématique");

            for (int i = 0; i < 20; i++)
            {
                world.HandleEscape();
                menus.Open("Réglages");
                Click(FindObjectsByType<Button>(FindObjectsSortMode.None).Single(button => button.name == "Fermer la gestion"));
                if (menus.Mode != "Pause") throw new InvalidOperationException("La croix n’a pas restauré le parent.");
                yield return null;
                world.HandleEscape();
                yield return null;
                if (menus.IsOpen || !campaign.ControlsAvailable) throw new InvalidOperationException("Menu ou verrou résiduel.");
            }
            Check(true, "20 cycles Pause → Réglages → Pause → Gameplay");

            menus.Open("Pause");
            campaign.SetBrowserInputSuspended(true);
            menus.Close();
            Check(!motor.enabled && camera.enabled && campaign.ActiveControlLocks == ControlLocks.BrowserFocus,
                "Fermeture du menu pendant la perte de focus");
            campaign.SetMobileInterruption(true, false);
            campaign.SetBrowserInputSuspended(false);
            Check(!motor.enabled && campaign.ActiveControlLocks == ControlLocks.Orientation, "Le verrou portrait est indépendant");
            campaign.SetMobileInterruption(false, false);
            Check(campaign.ControlsAvailable, "Le paysage restaure Dylan et la caméra");

            const string tutorial = "M_I_TUTORIEL", firstAction = "M_I_TUTORIEL_1";
            Check(campaign.OpenQuest(tutorial, "Offer", true) && campaign.AcceptQuest(tutorial), "Mission de Mathieu acceptée");
            campaign.CloseQuest();
            campaign.Execute(firstAction);
            Check(campaign.Dialogue != null && !campaign.ControlsAvailable, "Dialogue de Mathieu actif");
            for (int i = 0; i < 6 && campaign.Dialogue != null; i++)
            {
                var available = campaign.Dialogue.choices.Where(campaign.CanChoose).ToArray();
                var answer = available.FirstOrDefault(choice => choice.id == "V5_INTRO_OBSERVER") ?? available.First();
                campaign.Choose(answer.id);
                yield return null;
            }
            campaign.CloseQuest();
            float actionDeadline = Time.realtimeSinceStartup + campaign.FindAction(firstAction).durationSeconds + 15;
            while ((!campaign.ControlsAvailable || !campaign.State.completedActions.Contains(firstAction)) &&
                Time.realtimeSinceStartup < actionDeadline)
            {
                if (campaign.cinematicDirector.IsPlaying) campaign.cinematicDirector.Skip();
                yield return null;
            }
            Check(campaign.Dialogue == null && campaign.ControlsAvailable && campaign.State.completedActions.Contains(firstAction),
                "Réponse enregistrée, Dylan et caméra disponibles");
            campaign.Save();
            Check(campaign.ReloadSavedCampaign() && campaign.State.completedActions.Contains(firstAction),
                "Réponse de Mathieu retrouvée après rechargement");

            var player = motor.transform;
            var savedPosition = player.position;
            var savedGravity = motor.gravity;
            controller.enabled = false;
            player.position = new Vector3(0, 300, 0);
            controller.enabled = true;
            motor.gravity = 0;
            InputSystem.settings.editorInputBehaviorInPlayMode = InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
            InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
            var mouse = InputSystem.AddDevice<Mouse>();
            mouse.MakeCurrent();
            float previous = motor.Yaw, total = 0;
            for (int i = 0; i < 46; i++)
            {
                InputSystem.QueueStateEvent(mouse, new MouseState { delta = new Vector2(28 / motor.sensitivity, 0) });
                yield return null;
                var step = Mathf.DeltaAngle(previous, motor.Yaw);
                if (step < -1 || step > 45) throw new InvalidOperationException("Discontinuité du yaw.");
                total += step;
                previous = motor.Yaw;
            }
            if (total < 1080) throw new InvalidOperationException("Orbite incomplète : " + total + "°");
            Check(true, "Trois tours horizontaux continus : " + total.ToString("0") + "°");
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            var view = Quaternion.Euler(motor.Pitch, motor.Yaw, 0);
            wall.transform.position = player.position + Vector3.up * motor.cameraHeight + view * Vector3.back * 2;
            wall.transform.rotation = view;
            wall.transform.localScale = new Vector3(4, 4, .2f);
            yield return null;
            yield return null;
            float close = motor.OrbitDistance;
            Check(close < 2 && close > .5f && Quaternion.Angle(camera.transform.rotation, view) < .5f, "Mur évité sur le même axe");
            Destroy(wall);
            yield return null;
            yield return null;
            Check(motor.OrbitDistance < motor.cameraDistance, "Restitution progressive de la distance");
            yield return new WaitForSecondsRealtime(.65f);
            Check(motor.OrbitDistance > close && motor.OrbitDistance > motor.cameraDistance - .1f, "Distance nominale restaurée");
            InputSystem.RemoveDevice(mouse);
            controller.enabled = false;
            player.position = savedPosition;
            controller.enabled = true;
            motor.gravity = savedGravity;

            var resident = campaign.bindings.Find("lorette").GetComponent<CharacterController>();
            Check(resident.enabled && Physics.GetIgnoreCollision(controller, resident),
                "Le contrôleur de Dylan laisse passer le joueur au travers des PNJ");
            var positionBeforeContact = player.position;
            controller.enabled = false;
            player.position = resident.transform.position + Vector3.up * 10 + Vector3.back * 2;
            controller.enabled = true;
            motor.gravity = 0;
            var residentPosition = resident.transform.position;
            resident.transform.position += Vector3.up * 10;
            Physics.SyncTransforms();
            yield return null;
            Check(Physics.GetIgnoreCollision(controller, resident), "La règle de passage est rétablie après réactivation du contrôleur");
            var barrier = GameObject.CreatePrimitive(PrimitiveType.Cube);
            barrier.transform.position = player.position + Vector3.forward * 4 + Vector3.up * .9f;
            barrier.transform.localScale = new Vector3(3, 2, .2f);
            Physics.SyncTransforms();
            controller.Move(Vector3.forward * 3);
            Check(player.position.z > residentPosition.z + .5f, "Dylan traverse la trajectoire du PNJ");
            var hit = controller.Move(Vector3.forward * 2);
            Check((hit & CollisionFlags.Sides) != 0 && player.position.z < barrier.transform.position.z,
                "Le même déplacement s’arrête devant un obstacle du décor");
            Destroy(barrier);
            resident.transform.position = residentPosition;
            controller.enabled = false;
            player.position = positionBeforeContact;
            controller.enabled = true;
            motor.gravity = savedGravity;

            var data = campaign.ActivitiesV17.activities.Single(a => a.id == "V17_SYSTEM");
            var quest = campaign.Data.quests.Single(q => q.actionIds.Contains(data.id));
            foreach (var prior in campaign.Data.quests.TakeWhile(q => q.id != quest.id).Where(q => q.required))
            {
                var saved = campaign.QuestState(prior.id);
                saved.accepted = saved.validated = saved.claimed = true;
            }
            foreach (var id in quest.actionIds.TakeWhile(id => id != data.id))
            {
                if (!campaign.State.completedActions.Contains(id)) campaign.State.completedActions.Add(id);
                campaign.Apply(new EffectDefinition { kind = "flag", target = "done:" + id, value = 1 });
            }
            campaign.State.actIndex = Array.FindIndex(campaign.Data.acts, a => a.id == quest.actId);
            campaign.QuestState(quest.id).accepted = true;
            campaign.RefreshQuests();
            var point = campaign.bindings.Find(data.site).position + Vector3.back * 1.5f;
            point.y = VillageLife.Ground(point) + .04f;
            controller.enabled = false;
            player.position = point;
            controller.enabled = true;
            var activity = campaign.GetComponent<CampaignActivitiesV17>();
            var viewSst = campaign.GetComponent<ActivityViewV17>();
            Check(activity.Begin(data.id) && data.cards.Length == 4, "Assemblage SST ouvert");
            yield return null;

            Drop(viewSst, (data.cards[0].correct + 1) % data.cards[0].choices.Length);
            Check(activity.CurrentProgress.card == 0 && activity.AssemblyPhase == SstAssemblyPhase.Error, "Dépôt faux sans blocage");
            yield return new WaitForSecondsRealtime(.5f);
            Drop(viewSst, data.cards[0].correct);
            Check(activity.CurrentProgress.card == 1 && activity.CurrentProgress.answers.Count == 1, "Dépôt correct enregistré");
            world.HandleEscape();
            yield return null;
            Check(activity.AssemblyPhase == SstAssemblyPhase.Paused && !motor.enabled, "Pause de l’assemblage");
            Click(viewSst.Root.GetComponentsInChildren<Button>().Single(button => button.name == "QUITTER L’ASSEMBLAGE"));
            Check(!activity.Active && campaign.ControlsAvailable, "Sortie SST et restauration des commandes");
            Check(activity.Begin(data.id) && activity.CurrentProgress.card == 1, "Pièce retrouvée au retour");
            campaign.Save();
            Check(campaign.ReloadSavedCampaign(), "Rechargement de la sauvegarde SST");
            float resumeDeadline = Time.realtimeSinceStartup + 5;
            while (!activity.Active && Time.realtimeSinceStartup < resumeDeadline) yield return null;
            Check(activity.Current?.id == data.id && activity.CurrentProgress.answers.Count == 1,
                "Assemblage rouvert automatiquement avec la pièce sauvegardée");
            while (activity.CurrentProgress.card < data.cards.Length)
            {
                if (!activity.Submit(data.cards[activity.CurrentProgress.card].correct))
                    throw new InvalidOperationException("Impossible de poser une pièce restante.");
                yield return new WaitForSecondsRealtime(.5f);
            }
            Check(activity.Active, "Les pièces posées attendent la validation");
            activity.ConfirmSstAssembly();
            activity.ConfirmSstAssembly();
            Check(!activity.Active && activity.AssemblyPhase == SstAssemblyPhase.Success && campaign.ControlsAvailable &&
                campaign.State.completedActions.Count(id => id == data.id) == 1, "Validation SST unique et retour au GPS");

            // Isolated outcome fixtures. FIN_3 is exercised by the full campaign runner.
            foreach (var risk in campaign.State.risks) risk.value = 3;
            campaign.FinishCampaign();
            Check(campaign.Ending?.id == "FIN_1" && CinematicCatalogueV15.Ending(campaign) == "F15_C14_BAD",
                "FIN_1 sélectionnée avec des risques critiques");
            campaign.FreePlayV17();
            foreach (var risk in campaign.State.risks) risk.value = 0;
            if (campaign.State.risks.Count == 0) campaign.State.risks.Add(new NamedValue("fixture-v24", 0));
            campaign.Apply(new EffectDefinition { kind = "flag", target = "audit_performed", value = 1 });
            campaign.Apply(new EffectDefinition { kind = "flag", target = "events_analyzed", value = 1 });
            campaign.FinishCampaign();
            Check(campaign.Ending?.id == "FIN_2" && CinematicCatalogueV15.Ending(campaign) == "F15_C14_MIXED",
                "FIN_2 sélectionnée avec audit et système incomplet");
        }

        static void Click(Button button) => ExecuteEvents.Execute(button.gameObject,
            new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left }, ExecuteEvents.pointerClickHandler);

        static void Drop(ActivityViewV17 view, int answer)
        {
            var drag = view.Root.GetComponentInChildren<ActivityDragV17>();
            var pointer = new PointerEventData(EventSystem.current) { pointerId = 3, pointerDrag = drag.gameObject };
            drag.OnBeginDrag(pointer);
            view.Root.GetComponentsInChildren<ActivityDropV17>().Single(drop => drop.answer == answer).OnDrop(pointer);
        }
    }
}
#endif
