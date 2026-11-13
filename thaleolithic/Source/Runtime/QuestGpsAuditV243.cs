#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;

namespace UngaBunga45001
{
    public sealed class QuestGpsAuditV243 : MonoBehaviour
    {
        const string Flag = "-thaleolithicGpsAuditV243";
        static string ReportPath => Environment.GetCommandLineArgs().SkipWhile(arg => arg != "-gpsReport").Skip(1).FirstOrDefault() ??
            "E:/UNGA-BUNGA-45001/Revision24-3/gps-unity.json";
        [Serializable] sealed class Report
        {
            public string status = "running", failure;
            public List<string> passed = new List<string>();
            public List<QuestNavigationController.GpsSample> samples = new List<QuestNavigationController.GpsSample>();
        }
        readonly Report report = new Report();

        public static void RunAudit()
        {
            if (Array.IndexOf(Environment.GetCommandLineArgs(), Flag) < 0) throw new ArgumentException("Sauvegarde d’audit isolée requise.");
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity");
            EditorApplication.isPlaying = true;
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (Array.IndexOf(Environment.GetCommandLineArgs(), Flag) < 0) return;
            Application.runInBackground = true;
            new GameObject("Audit du ruban V24.3").AddComponent<QuestGpsAuditV243>();
        }

        IEnumerator Start()
        {
            var tests = Verify();
            while (true)
            {
                bool next;
                try { next = tests.MoveNext(); }
                catch (Exception error)
                {
                    report.status = "failed";
                    report.failure = error.ToString();
                    File.WriteAllText(ReportPath, JsonUtility.ToJson(report, true));
                    EditorApplication.Exit(1);
                    yield break;
                }
                if (!next) break;
                yield return tests.Current;
            }
            report.status = "passed";
            File.WriteAllText(ReportPath, JsonUtility.ToJson(report, true));
            EditorApplication.Exit(0);
        }

        void Check(bool result, string description)
        {
            if (!result) throw new InvalidOperationException(description);
            report.passed.Add(description);
        }

        IEnumerator Verify()
        {
            var c = FindFirstObjectByType<CampaignRuntime>();
            float deadline = Time.realtimeSinceStartup + 35;
            while (!c.StartupReady && Time.realtimeSinceStartup < deadline) yield return null;
            Check(c.StartupReady && TribalInterfaceAudit.Requested, "Scène de jeu et sauvegarde isolée");
            c.NewCampaign();
            yield return null;
            c.cinematicDirector.Skip();
            while (c.cinematicDirector.IsPlaying && Time.realtimeSinceStartup < deadline) yield return null;
            Check(!c.cinematicDirector.IsPlaying, "Retour en jeu après ouverture");
            var gps = c.GetComponent<QuestNavigationController>();
            var navigation = c.GetComponent<VillageNavigation>();
            var preferences = c.GetComponent<UISettingsController>().preferences;
            preferences.gpsMode = 0;
            preferences.worldMarkers = true;
            gps.Follow("travel:stockage");
            deadline = Time.realtimeSinceStartup + 18;
            while ((!gps.Diagnostic().visible || gps.Corners.Length < 2) && Time.realtimeSinceStartup < deadline) yield return null;
            var first = gps.Diagnostic();
            report.samples.Add(first);
            Check(first.visible && first.objective == "stockage" && first.meshTriangles > 1 && gps.Corners.Length >= 2,
                "Ruban doré et ligne de carte issus du trajet réel vers les réserves");

            navigation.RequestRebuild();
            yield return null;
            var during = gps.Diagnostic();
            report.samples.Add(during);
            Check(navigation.Pending && during.visible && during.routeId == first.routeId && during.mapRouteVisible,
                "Même trajet affiché sur le sol et la carte pendant Pending");
            deadline = Time.realtimeSinceStartup + 12;
            while ((navigation.Pending || gps.Diagnostic().routeId == first.routeId) && Time.realtimeSinceStartup < deadline)
            {
                if (!gps.Diagnostic().visible) throw new InvalidOperationException("Coupure du ruban pendant le recalcul ordinaire.");
                yield return null;
            }
            var replaced = gps.Diagnostic();
            report.samples.Add(replaced);
            Check(replaced.routeId != first.routeId && replaced.visible && replaced.hiddenCount == first.hiddenCount,
                "Permutation du trajet sans frame vide pendant le recalcul");
            Check(Mathf.Abs(replaced.safeLength - during.safeLength) < .5f,
                "Une jonction de polygones ne fait pas disparaître la suite du trajet");
            int revision = navigation.Revision, topology = navigation.TopologyRevision;
            navigation.RequestRebuild(topologyChanged:false);
            deadline = Time.realtimeSinceStartup + 12;
            while (navigation.Revision == revision && Time.realtimeSinceStartup < deadline) yield return null;
            Check(navigation.Revision != revision && navigation.TopologyRevision == topology &&
                gps.Diagnostic().routeId == replaced.routeId && gps.Calculations == replaced.calculations,
                "Le rafraîchissement d’un PNJ ne recalcule pas un trajet valide de Dylan");

            var a = gps.Corners[0];
            var b = gps.Corners[1];
            var position = Vector3.MoveTowards(a, b, Mathf.Min(4, Vector3.Distance(a, b) * .65f));
            position.y = VillageLife.Ground(position);
            var barrier = GameObject.CreatePrimitive(PrimitiveType.Cube);
            barrier.name = "Barrière temporaire de l’audit GPS";
            barrier.transform.position = position + Vector3.up * .85f;
            barrier.transform.localScale = new Vector3(.9f, 1.7f, .9f);
            Physics.SyncTransforms();
            navigation.RequestRebuild();
            gps.ForceRefresh();
            yield return null;
            var clipped = gps.Diagnostic();
            report.samples.Add(clipped);
            Check(clipped.safeLength < replaced.safeLength && clipped.objective == "stockage",
                "Une barrière physique invalide la suite du ruban et conserve la destination");
            Destroy(barrier);
            gps.ForceRefresh();
            deadline = Time.realtimeSinceStartup + 12;
            while ((!gps.Diagnostic().visible || !gps.Complete) && Time.realtimeSinceStartup < deadline) yield return null;
            Check(gps.Complete && gps.Diagnostic().visible, "Route rétablie après retrait de la barrière");

            preferences.gpsMode = 1;
            yield return null;
            Check(gps.Diagnostic().visible && gps.Diagnostic().mode == "discret", "Mode discret conserve un ruban");
            preferences.gpsMode = 2;
            gps.TemporaryGuidance = false;
            yield return null;
            Check(!gps.Diagnostic().visible && !gps.MapRouteVisible && gps.Diagnostic().state == "HIDDEN_BY_USER",
                "Exploration libre retire le guidage automatique");
            gps.Follow("travel:stockage");
            yield return null;
            Check(gps.Diagnostic().visible && gps.MapRouteVisible, "Guidage temporaire disponible en exploration libre");

            c.SetPause(true);
            yield return null;
            Check(!gps.Diagnostic().visible && gps.Diagnostic().state == "HIDDEN_BY_MODAL", "Masquage explicite en pause");
            c.SetPause(false);
            yield return null;
            Check(gps.Diagnostic().visible, "Le ruban revient à la fermeture de la pause");
        }
    }
}
#endif
