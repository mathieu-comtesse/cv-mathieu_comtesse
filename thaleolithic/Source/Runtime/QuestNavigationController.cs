using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;

namespace UngaBunga45001
{
    public sealed class QuestNavigationController : MonoBehaviour
    {
        public CampaignRuntime campaign;
        public Material markerMaterial;
        public ActionDefinition Action { get; private set; }
        public Transform Target { get; private set; }
        public Vector3 InteractionPoint { get; private set; }
        public Vector3[] Corners => activeRoute?.MapCorners ?? Array.Empty<Vector3>();
        public string Status { get; private set; } = "Recherche de l’objectif";
        public float Distance { get; private set; }
        public int Calculations { get; private set; }
        public bool Replanning => job != null || navigation != null && navigation.TopologyPending;
        public bool Complete => reached || activeRoute != null && activeRoute.SafeRing == activeRoute.Rings.Count - 1;
        public bool MapRouteVisible => settings != null && (settings.preferences.gpsMode != 2 || TemporaryGuidance) && Corners.Length > 1;
        public event System.Action Changed;
        public bool TemporaryGuidance;

        const float ResolveInterval = .32f, CheckInterval = .42f, ReplanInterval = .75f;
        const float DepartureThreshold = 1.8f, TargetThreshold = 1.05f, SampleStep = .38f;
        const int PlanBatch = 8, SampleBatch = 22;
        readonly Dictionary<string, NavMeshObstacle> closures = new Dictionary<string, NavMeshObstacle>();
        NavMeshPath probe;
        Vector3[] probeCorners = new Vector3[96];
        readonly List<Vector3> bestCorners = new List<Vector3>(24);
        readonly Queue<float> recentCalculations = new Queue<float>();
        QuestRibbonRoute activeRoute, pendingRoute = new QuestRibbonRoute();
        QuestRouteSurface surface;
        QuestRibbonRenderer ribbon;
        UISettingsController settings;
        VillageNavigation navigation;
        ConstructionFilmV19 construction;
        MainQuestMarkerV18 mainMarker;
        CampaignActivitiesV17 activities;
        Coroutine job;
        Mesh diamond;
        MeshRenderer destinationRenderer;
        Transform destination;
        CampaignSave observed;
        Vector3 lastTarget, lastPlanPlayer;
        float nextResolve, nextCheck, nextPlan, progress, offRoute;
        int cursor, routeId, hiddenCount, failures, topologyRevision;
        bool dirty = true, safetyDirty, wasPending, reached;
        float calculationMs;
        string visibility = "TEMPORARILY_UNAVAILABLE", lastHidden = "INITIALISATION";

        void Start()
        {
            settings = GetComponent<UISettingsController>();
            navigation = GetComponent<VillageNavigation>();
            construction = GetComponent<ConstructionFilmV19>();
            mainMarker = GetComponent<MainQuestMarkerV18>();
            activities = GetComponent<CampaignActivitiesV17>();
            surface = new QuestRouteSurface(campaign.bindings.player);
            probe = new NavMeshPath();
            var world = new GameObject("Ruban continu du guidage");
            ribbon = world.AddComponent<QuestRibbonRenderer>();
            CreateDestinationMarker();
            topologyRevision = navigation.TopologyRevision;
            navigation.Changed += NavigationChanged;
            campaign.Changed += OnCampaignChanged;
            OnCampaignChanged();
        }

        void OnDestroy()
        {
            if (campaign != null) campaign.Changed -= OnCampaignChanged;
            if (navigation != null) navigation.Changed -= NavigationChanged;
            if (ribbon != null) Destroy(ribbon.gameObject);
            if (diamond != null) Destroy(diamond);
        }

        void OnDisable()
        {
            if (job != null) StopCoroutine(job);
            job = null;
            dirty = true;
            failures = 0;
            if (ribbon != null) ribbon.Present(null, 0, 0, false, false);
            if (destinationRenderer != null) destinationRenderer.enabled = false;
        }

        void OnCampaignChanged()
        {
            if (campaign.State == null) return;
            UpdateClosures();
            ResolveTarget();
        }

        void ResolveTarget()
        {
            var next = Resolve();
            var target = next == null ? null : campaign.bindings.Find(next.targetBindingId);
            if (observed == campaign.State && next?.id == Action?.id && Target == target) return;
            if (observed != campaign.State || string.IsNullOrEmpty(campaign.State.trackedActionId)) TemporaryGuidance = false;
            observed = campaign.State;
            Action = next;
            Target = target;
            if (job != null) StopCoroutine(job);
            job = null;
            RecycleActive();
            dirty = true;
            reached = false;
            nextPlan = 0;
            Status = Target != null ? "Actualisation du parcours" : campaign.Objectives.Current?.Requirement ??
                (campaign.IsActComplete ? "Acte terminé · consulte le journal" : "Objectif en attente de prérequis");
            Changed?.Invoke();
        }

        public ActionDefinition Resolve() => campaign.Objectives.Current?.Action;

        public void Follow(string id)
        {
            var action = campaign.FindAction(id);
            if (action == null || !campaign.CanExecute(action, out _, true)) return;
            campaign.State.trackedActionId = id;
            campaign.State.trackedActionHistoryIndex = campaign.State.history.Count;
            ResolveTarget();
            TemporaryGuidance = true;
            ForceRefresh();
            campaign.Save();
        }

        public void ForceRefresh()
        {
            dirty = safetyDirty = true;
            nextResolve = 0;
            failures = 0;
        }

        public void Calculate() => ForceRefresh();
        public void Revalidate() => safetyDirty = true;

        void NavigationChanged()
        {
            Revalidate();
            if (topologyRevision == navigation.TopologyRevision) return;
            topologyRevision = navigation.TopologyRevision;
            ForceRefresh();
        }

        void Update()
        {
            if (campaign.State == null || settings == null) return;
            float now = Time.unscaledTime;
            if (now >= nextResolve)
            {
                nextResolve = now + ResolveInterval;
                ResolveTarget();
            }

            var player = campaign.bindings.player.position;
            bool pending = navigation.TopologyPending;
            if (pending != wasPending)
            {
                wasPending = pending;
                safetyDirty = true;
            }

            if (Target != null)
            {
                if (activeRoute != null) ProjectPlayer(player, false);
                float remaining = activeRoute == null ? float.PositiveInfinity : activeRoute.Length - progress;
                reached = Action.id == QuestGuidanceV243.Sst && campaign.Near(Action.targetBindingId) ||
                    campaign.BindingDistance(Action.targetBindingId) < .95f ||
                    remaining <= .75f && offRoute <= 1.1f && campaign.Near(Action.targetBindingId);
                if (activeRoute != null && !reached && (safetyDirty || now >= nextCheck))
                {
                    nextCheck = now + CheckInterval;
                    int safe = SafePrefix(activeRoute, progress, pending);
                    if (safe != activeRoute.SafeRing)
                    {
                        activeRoute.SetSafeRing(safe);
                        Changed?.Invoke();
                    }
                    safetyDirty = false;
                    if (safe < activeRoute.Rings.Count - 1) dirty = true;
                }
                bool moved = (player - lastPlanPlayer).sqrMagnitude > .65f * .65f;
                bool targetMoved = (Target.position - lastTarget).sqrMagnitude > TargetThreshold * TargetThreshold;
                if (targetMoved || offRoute > DepartureThreshold && moved || activeRoute == null && moved) dirty = true;
                if (dirty && !reached && !pending && job == null && now >= nextPlan)
                {
                    nextPlan = now + ReplanInterval;
                    dirty = false;
                    job = StartCoroutine(Plan(player, Target.position, Action.targetBindingId));
                }
                Distance = reached ? 0 : activeRoute == null
                    ? campaign.BindingDistance(Action.targetBindingId)
                    : Mathf.Max(0, remaining) + offRoute;
                Status = reached ? "Objectif atteint" : Replanning ? "Actualisation du parcours" :
                    Complete ? "GUIDAGE DES CRÂNES" : "Aucun passage praticable actuellement.";
            }
            else
            {
                Distance = 0;
                Status = campaign.Objectives.Current?.Requirement ??
                    (campaign.IsActComplete ? "Acte terminé · consulte le journal" : "Objectif en attente de prérequis");
            }

            var preferences = settings.preferences;
            bool allowed = preferences.worldMarkers && (preferences.gpsMode != 2 || TemporaryGuidance);
            bool modal = campaign.IsModal || (construction?.Playing ?? false);
            bool visible = allowed && !modal && !reached;
            bool previouslyVisible = ribbon.Visible;
            ribbon.Present(activeRoute, progress, preferences.gpsMode, preferences.highContrast, visible);
            visibility = !allowed ? "HIDDEN_BY_USER" : modal ? "HIDDEN_BY_MODAL" :
                reached ? "OBJECTIVE_REACHED" : Replanning ? "RECALCULATING" :
                ribbon.Visible ? "VISIBLE" : "TEMPORARILY_UNAVAILABLE";
            if (previouslyVisible && !ribbon.Visible)
            {
                hiddenCount++;
                lastHidden = visibility == "RECALCULATING" ? activeRoute == null ? "OBJECTIF_MODIFIE" : "PREFIXE_SUR_EPUISE" : visibility;
            }
        }

        IEnumerator Plan(Vector3 player, Vector3 target, string binding)
        {
            Calculations++;
            float now = Time.unscaledTime;
            recentCalculations.Enqueue(now);
            TrimCalculations(now);
            lastPlanPlayer = player;
            lastTarget = target;
            double began = Time.realtimeSinceStartupAsDouble;
            double cost = 0;
            int revision = navigation.TopologyRevision;
            float bestScore = float.PositiveInfinity;
            bestCorners.Clear();
            yield return null; // Let the previous strip render while the first batch is prepared.
            began = Time.realtimeSinceStartupAsDouble;
            var filter = surface.Filter;
            var person = campaign.State.characters.Find(member => member.id == binding);
            if ((person == null || person.alive) && NavMesh.SamplePosition(player, out var start, 2, filter))
            {
                int trials = 0;
                float range = campaign.BindingSearchRadius(binding);
                for (float radius = .9f; radius <= range; radius += .55f)
                {
                    for (int i = 0; i < 12; i++)
                    {
                        var point = target + Quaternion.Euler(0, i * 30, 0) * Vector3.forward * radius;
                        TryCandidate(start.position, point, binding, radius, ref bestScore);
                        if (++trials % PlanBatch != 0) continue;
                        cost += Time.realtimeSinceStartupAsDouble - began;
                        yield return null;
                        began = Time.realtimeSinceStartupAsDouble;
                    }
                }
            }

            var route = pendingRoute ?? new QuestRibbonRoute();
            route.Rings.Clear();
            route.CornerRings.Clear();
            route.Corners = route.MapCorners = Array.Empty<Vector3>();
            route.SafeRing = -1;
            bool ready = bestCorners.Count >= 2;
            if (ready)
            {
                int samples = 0;
                for (int i = 0; i < bestCorners.Count && ready; i++)
                {
                    if (i > 0)
                    {
                        var from = bestCorners[i - 1];
                        int subdivisions = Mathf.CeilToInt(Vector3.Distance(from, bestCorners[i]) / SampleStep);
                        for (int j = 1; j < subdivisions; j++)
                        {
                            if (!(ready = AddRing(route, Vector3.Lerp(from, bestCorners[i], (float)j / subdivisions), Normal(from, bestCorners[i])))) break;
                            if (++samples % SampleBatch != 0) continue;
                            cost += Time.realtimeSinceStartupAsDouble - began;
                            yield return null;
                            began = Time.realtimeSinceStartupAsDouble;
                        }
                    }
                    if (!ready) break;
                    var normal = JoinNormal(i);
                    if (!(ready = AddRing(route, bestCorners[i], normal))) break;
                    route.CornerRings.Add(route.Rings.Count - 1);
                }
            }
            bool stale = navigation.TopologyPending || revision != navigation.TopologyRevision;
            if (ready && !stale && route.Rings.Count >= 2)
            {
                var previous = activeRoute;
                activeRoute = route;
                failures = 0;
                pendingRoute = previous;
                route.Id = ++routeId;
                route.Corners = bestCorners.ToArray();
                route.SetSafeRing(route.Rings.Count - 1);
                InteractionPoint = route.Corners[route.Corners.Length - 1];
                ProjectPlayer(campaign.bindings.player.position, true);
                route.SetSafeRing(SafePrefix(route, progress, false));
                Changed?.Invoke();
            }
            else
            {
                pendingRoute = route;
                dirty |= stale;
                if (!stale && activeRoute == null && ++failures < 3) dirty = true;
                if (activeRoute != null && campaign.BindingDistance(binding, InteractionPoint) > 3.5f)
                    RecycleActive();
                if (activeRoute == null || !Complete) nextPlan = Mathf.Max(nextPlan, Time.unscaledTime + 1.35f);
            }
            calculationMs = (float)((cost + Time.realtimeSinceStartupAsDouble - began) * 1000);
            job = null;
        }

        void TryCandidate(Vector3 start, Vector3 point, string binding, float radius, ref float bestScore)
        {
            var filter = surface.Filter;
            if (!NavMesh.SamplePosition(point, out var end, 1.25f, filter))
            {
                point.y = VillageLife.Ground(point);
                if (!NavMesh.SamplePosition(point, out end, .58f, filter)) return;
            }
            if (campaign.BindingDistance(binding, end.position) > 3.4f ||
                !VillageNavigation.Clear(end.position, campaign.bindings.player) ||
                !NavMesh.CalculatePath(start, end.position, filter, probe) || probe.status != NavMeshPathStatus.PathComplete) return;
            int count = probe.GetCornersNonAlloc(probeCorners);
            if (count == probeCorners.Length) { probeCorners = probe.corners; count = probeCorners.Length; }
            if (count < 2) return;
            float score = radius * .45f;
            for (int i = 1; i < count; i++) score += Vector3.Distance(probeCorners[i - 1], probeCorners[i]);
            if (score >= bestScore) return;
            for (int i = 1; i < count; i++)
                if (!ClearSegment(probeCorners[i - 1], probeCorners[i], false)) return;
            bestScore = score;
            bestCorners.Clear();
            for (int i = 0; i < count; i++) bestCorners.Add(probeCorners[i]);
        }

        static Vector3 Normal(Vector3 a, Vector3 b)
        {
            var delta = b - a;
            return new Vector3(-delta.z, 0, delta.x).normalized;
        }

        Vector3 JoinNormal(int i)
        {
            var incoming = i > 0 ? Normal(bestCorners[i - 1], bestCorners[i]) : Vector3.zero;
            var outgoing = i + 1 < bestCorners.Count ? Normal(bestCorners[i], bestCorners[i + 1]) : Vector3.zero;
            if (i == 0) return outgoing;
            if (i == bestCorners.Count - 1) return incoming;
            var bisector = (incoming + outgoing).normalized;
            float ratio = Vector3.Dot(bisector, outgoing);
            return ratio >= .62f ? bisector / ratio : bisector; // Capped join on a tight bend.
        }

        bool AddRing(QuestRibbonRoute route, Vector3 sample, Vector3 normal)
        {
            if (!surface.Project(sample, out var center, out var navCenter)) return false;
            float distance = 0;
            if (route.Rings.Count > 0)
            {
                var previous = route.Rings[route.Rings.Count - 1];
                if (!ClearSegment(previous.center, center, false)) return false;
                distance = previous.distance + Vector3.Distance(previous.center, center);
            }
            var offset = normal * ribbon.HalfWidth;
            var left = surface.Edge(center, navCenter, offset);
            var right = surface.Edge(center, navCenter, -offset);
            if (route.Rings.Count > 0)
            {
                var previous = route.Rings[route.Rings.Count - 1];
                // Keep an edge inside the corridor even when the natural miter would clip an inside corner.
                if (NavMesh.Raycast(previous.left, left, out _, surface.Filter)) left = center;
                if (NavMesh.Raycast(previous.right, right, out _, surface.Filter)) right = center;
            }
            route.Rings.Add(new QuestRibbonRoute.Ring { center = center, left = left, right = right, distance = distance });
            return true;
        }

        bool ClearSegment(Vector3 a, Vector3 b, bool checkNavMesh)
        {
            if (QuestRouteSurface.Intersects(campaign.StructuralClosure, a, b)) return false;
            foreach (var obstacle in closures.Values)
                if (QuestRouteSurface.Intersects(obstacle, a, b)) return false;
            return surface.Open(a, b, checkNavMesh);
        }

        int SafePrefix(QuestRibbonRoute route, float from, bool pending)
        {
            int first = route.RingAt(from);
            int end = route.Rings.Count - 1;
            int i = first;
            while (i < end)
            {
                int next = Mathf.Min(i + 4, end);
                var a = route.Rings[i].center;
                var b = route.Rings[next].center;
                var middle = route.Rings[(i + next) / 2].center;
                // Straight runs are checked as one cast. Bends and crests retain the original samples.
                if ((middle - (a + b) * .5f).sqrMagnitude > .12f * .12f) { next = i + 1; b = route.Rings[next].center; }
                if (!ClearSegment(a, b, !pending))
                {
                    for (int j = i; j < next; j++)
                        if (!ClearSegment(route.Rings[j].center, route.Rings[j + 1].center, !pending)) return j;
                }
                i = next;
            }
            return end;
        }

        void ProjectPlayer(Vector3 player, bool fresh)
        {
            var rings = activeRoute.Rings;
            int first = fresh ? 0 : Mathf.Max(0, cursor - 3);
            int last = fresh ? rings.Count - 2 : Mathf.Min(rings.Count - 2, cursor + 14);
            float best = float.PositiveInfinity;
            int segment = cursor;
            float along = progress;
            for (int i = first; i <= last; i++)
            {
                var a = rings[i];
                var b = rings[i + 1];
                var delta = b.center - a.center;
                float t = Mathf.Clamp01(Vector3.Dot(player - a.center, delta) / Mathf.Max(.0001f, delta.sqrMagnitude));
                float error = (player - Vector3.Lerp(a.center, b.center, t)).sqrMagnitude;
                if (error >= best) continue;
                best = error;
                segment = i;
                along = Mathf.Lerp(a.distance, b.distance, t);
            }
            cursor = segment;
            progress = along;
            offRoute = Mathf.Sqrt(best);
        }

        void RecycleActive()
        {
            if (activeRoute != null && pendingRoute == null) pendingRoute = activeRoute;
            activeRoute = null;
            cursor = 0;
            progress = offRoute = 0;
        }

        void UpdateClosures()
        {
            foreach (var pair in closures)
            {
                bool enabled = (campaign.State.risks.Find(r => r.id == pair.Key)?.value ?? 0) >= 2;
                if (pair.Value.enabled != enabled) { pair.Value.enabled = enabled; ForceRefresh(); }
            }
            foreach (var risk in campaign.State.risks)
            {
                string binding = risk.id == "carriere" ? "pierre_carriere" : risk.id == "silex" ? "atelier_silex" :
                    risk.id == "fumees" ? "foyer" : risk.id == "stockage" ? "stockage" : null;
                if (binding == null || closures.ContainsKey(risk.id)) continue;
                var target = campaign.bindings.Find(binding);
                if (target == null) continue;
                var go = new GameObject("Danger identifié : " + risk.id);
                go.transform.SetParent(transform, false);
                go.transform.position = target.position + Vector3.up;
                var obstacle = go.AddComponent<NavMeshObstacle>();
                obstacle.shape = NavMeshObstacleShape.Box;
                obstacle.size = new Vector3(1.6f, 2, 1.6f);
                obstacle.carving = true;
                obstacle.carveOnlyStationary = false;
                obstacle.enabled = risk.value >= 2;
                closures.Add(risk.id, obstacle);
                if (obstacle.enabled) ForceRefresh();
            }
        }

        void CreateDestinationMarker()
        {
            diamond = new Mesh { name = "Losange de destination" };
            diamond.vertices = new[] { new Vector3(0,.16f,0), new Vector3(.12f,0,0), new Vector3(0,0,.12f),
                new Vector3(-.12f,0,0), new Vector3(0,0,-.12f), new Vector3(0,-.04f,0) };
            diamond.triangles = new[] { 0,2,1,0,3,2,0,4,3,0,1,4,5,1,2,5,2,3,5,3,4,5,4,1 };
            diamond.RecalculateNormals();
            var go = new GameObject("Objectif actif");
            destination = go.transform;
            destination.SetParent(transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = diamond;
            destinationRenderer = go.AddComponent<MeshRenderer>();
            destinationRenderer.sharedMaterial = markerMaterial;
            destinationRenderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            destinationRenderer.enabled = false;
        }

        void LateUpdate()
        {
            if (destinationRenderer == null) return;
            if (Target == null || campaign.IsModal || !settings.preferences.worldMarkers ||
                (construction?.Playing ?? false) || mainMarker?.TargetId == Action?.targetBindingId)
            {
                destinationRenderer.enabled = false;
                return;
            }
            var camera = campaign.bindings.gameplayCamera;
            float bob = settings.preferences.reducedMotion ? 0 : Mathf.Sin(Time.unscaledTime * 2) * .06f;
            destination.position = Target.position + Vector3.up * (2.7f + bob);
            float distance = Vector3.Distance(camera.transform.position, destination.position);
            float height = 2 * distance * Mathf.Tan(camera.fieldOfView * Mathf.Deg2Rad * .5f) * 28 / Mathf.Max(1, Screen.height);
            destination.localScale = Vector3.one * Mathf.Clamp(height / .2f, .005f, 3);
            destination.rotation = camera.transform.rotation;
            destinationRenderer.enabled = distance < 90 &&
                camera.WorldToViewportPoint(destination.position).z > camera.nearClipPlane + .15f;
        }

        [Serializable]
        public struct GpsSample
        {
            public bool enabled, visible, mapRouteVisible, recalculating;
            public string mode, objective, state, lastHidden, status;
            public int routeId, navMeshRevision, topologyRevision, points, meshTriangles, meshUpdates, routeChanges, hiddenCount,
                calculations, calculationsPerMinute;
            public float totalLength, visibleLength, safeLength, calculationMs, meshMs, progress;
            public Vector3 nextPoint;
        }

        void TrimCalculations(float now)
        {
            while (recentCalculations.Count > 0 && now - recentCalculations.Peek() >= 60) recentCalculations.Dequeue();
        }

        public GpsSample Diagnostic()
        {
            TrimCalculations(Time.unscaledTime);
            int mode = settings.preferences.gpsMode;
            float next = activeRoute == null ? 0 : Mathf.Min(progress + .95f, activeRoute.SafeEnd);
            return new GpsSample { enabled = settings.preferences.worldMarkers && (mode != 2 || TemporaryGuidance),
                visible = ribbon.Visible, mapRouteVisible = MapRouteVisible, recalculating = Replanning,
                mode = mode == 1 ? "discret" : mode == 2 ? "exploration libre" : "complet",
                objective = Action?.targetBindingId, state = visibility, status = Status, lastHidden = lastHidden,
                routeId = activeRoute?.Id ?? 0, navMeshRevision = navigation.Revision, topologyRevision = navigation.TopologyRevision,
                points = activeRoute?.Rings.Count ?? 0, totalLength = activeRoute?.Length ?? 0,
                safeLength = activeRoute?.SafeEnd ?? 0, progress = progress,
                visibleLength = ribbon.VisibleLength, meshTriangles = ribbon.Triangles, meshUpdates = ribbon.MeshUpdates,
                routeChanges = routeId, hiddenCount = hiddenCount, calculationMs = calculationMs,
                meshMs = ribbon.LastMeshMs, calculations = Calculations, calculationsPerMinute = recentCalculations.Count,
                nextPoint = activeRoute == null ? Vector3.zero : activeRoute.At(next, activeRoute.RingAt(next)).center };
        }
    }
}
