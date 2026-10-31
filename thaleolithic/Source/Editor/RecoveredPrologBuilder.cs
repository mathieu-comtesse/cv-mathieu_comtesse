using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace UngaBunga45001.Editor
{
    [Serializable] public sealed class PrologBuildReceipt
    {
        public string status, utc, sourceScene, outputScene;
        public bool sourceScenePreserved, played;
        public Vector3 observedSpawn, campaignOrigin;
        public int sourceRenderers, sourceColliders, sourceLights, sourceTerrains, sourceWaterNamedObjects, sourceVegetationNamedObjects;
        public int bindings, buildings, stages, actors, disabledNativeStubs, disabledSourceCanvases;
        public List<PlacementReceipt> placements = new List<PlacementReceipt>();
        public List<PrefabReceipt> prefabInstances = new List<PrefabReceipt>();
        public List<ActorReceipt> avatars = new List<ActorReceipt>();
        public List<string> limitations = new List<string>();
    }
    [Serializable] public sealed class PlacementReceipt { public string id, grounding; public Vector3 position; }
    [Serializable] public sealed class PrefabReceipt { public string path, instance, building; public int stage, renderers, colliders; }
    [Serializable] public sealed class ActorReceipt { public string id, fbx, rig, animatorController; public bool validAvatar, humanoid; public int skinnedMeshes; public float normalizedHeight; public string[] clips; }

    public static class RecoveredPrologBuilder
    {
        private const string Source = "Assets/Scenes/PrologScene.unity";
        private const string Output = "Assets/UngaBunga45001/Scenes/UngaBunga45001.unity";
        private const string Generated = "Assets/UngaBunga45001/Generated";
        private static readonly Vector3 ObservedSpawn = new Vector3(591.55f, 20.53877f, 276.75f);
        private static readonly Vector3 CampaignOrigin = new Vector3(350.92f, 11.657f, 281.88f);
        private static PrologBuildReceipt receipt;
        private static Terrain[] terrains;
        private static Transform root;
        private static Scene scene;
        private static readonly Dictionary<string, Transform> points = new Dictionary<string, Transform>();
        private static readonly List<BuildingBinding> buildings = new List<BuildingBinding>();
        private static string Arg(string name, string fallback) { var args = Environment.GetCommandLineArgs(); int i = Array.IndexOf(args, name); return i >= 0 && i + 1 < args.Length ? args[i + 1] : fallback; }

        public static void BuildBatch()
        {
            string receiptPath = Arg("-ubBuildReceipt", @"E:\UNGA-BUNGA-45001\Analysis\prolog-build-receipt.json");
            receipt = new PrologBuildReceipt { utc = DateTime.UtcNow.ToString("O"), sourceScene = Source, outputScene = Output, observedSpawn = ObservedSpawn, campaignOrigin = CampaignOrigin, sourceScenePreserved = true, played = false, status = "preparing" };
            try { Build(); receipt.status = "scene-saved-awaiting-play-validation"; }
            catch (Exception exception) { receipt.status = "failed"; receipt.limitations.Add(exception.ToString()); throw; }
            finally { Directory.CreateDirectory(Path.GetDirectoryName(receiptPath)); File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true)); }
        }

        private static void Build()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(Source) == null) throw new FileNotFoundException("Scène Prolog récupérée absente.");
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(Output) != null) throw new IOException("Sortie existante : archiver ou choisir une autre adaptation avant reconstruction.");
            if (!File.Exists(Arg("-ubExtractionReceipt", @"E:\UNGA-BUNGA-45001\Analysis\assetripper-export-receipt.json"))) throw new FileNotFoundException("Reçu d'extraction requis.");
            var dataAsset = AssetDatabase.LoadAssetAtPath<TextAsset>("Assets/UngaBunga45001/Resources/UngaBungaCampaign.json");
            var font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/Resources/fonts & materials/Inter-Regular SDF.asset");
            if (dataAsset == null || font == null) throw new InvalidDataException("Campagne et police Inter SDF récupérée sont obligatoires.");
            var campaignData = JsonUtility.FromJson<CampaignData>(dataAsset.text);
            scene = EditorSceneManager.OpenScene(Source, OpenSceneMode.Single);
            Transform sourcePlayer = Exact("Game Systems/PlayerFollower/PlayerBrain");
            var sourceCamera = Exact("Game Systems/CameraSetup/Main Camera").GetComponent<Camera>();
            if (sourceCamera == null || Vector3.Distance(sourcePlayer.position, ObservedSpawn) > .5f) throw new InvalidDataException("Les ancres source ne correspondent pas à l'inventaire observé.");
            if (Vector3.Distance(Exact("Prologue_Campfire_Placed").position, CampaignOrigin) > .05f) throw new InvalidDataException("Le feu de camp source ne correspond pas à l'inventaire observé.");
            var sourceObjects = AllTransforms();
            receipt.sourceRenderers = Components<Renderer>().Length; receipt.sourceColliders = Components<Collider>().Length;
            receipt.sourceLights = Components<Light>().Length; terrains = Components<Terrain>(); receipt.sourceTerrains = terrains.Length;
            var terrainMaterial = AssetDatabase.LoadAssetAtPath<Material>("Assets/UngaBunga45001/Generated/Rendering/TerrainLayers-HDRP.mat");
            if (terrainMaterial == null) throw new InvalidDataException("Configurer les ressources HDRP réelles avant de générer la scène.");
            foreach (var terrain in terrains) terrain.materialTemplate = terrainMaterial;
            receipt.sourceWaterNamedObjects = sourceObjects.Count(t => t.name.IndexOf("water", StringComparison.OrdinalIgnoreCase) >= 0);
            receipt.sourceVegetationNamedObjects = sourceObjects.Count(t => new[] { "tree", "grass", "bush", "fern" }.Any(s => t.name.IndexOf(s, StringComparison.OrdinalIgnoreCase) >= 0));
            // Source logic consists of recovered stubs. Disable only its business behaviours, preserving native render data.
            foreach (var behaviour in Components<MonoBehaviour>())
            {
                if (behaviour == null) continue;
                string assembly = behaviour.GetType().Assembly.GetName().Name;
                if ((assembly == "Assembly-CSharp" || assembly.StartsWith("Polylithic", StringComparison.OrdinalIgnoreCase)) && !(behaviour.GetType().Namespace ?? "").StartsWith("UngaBunga45001", StringComparison.Ordinal))
                { behaviour.enabled = false; receipt.disabledNativeStubs++; }
            }
            foreach (var canvas in Components<Canvas>()) { if (canvas.enabled) { canvas.enabled = false; receipt.disabledSourceCanvases++; } }
            foreach (var camera in Components<Camera>()) if (camera != sourceCamera) camera.enabled = false;
            foreach (var listener in Components<AudioListener>()) listener.enabled = listener.gameObject == sourceCamera.gameObject;
            foreach (var animator in sourcePlayer.GetComponentsInChildren<Animator>(true)) animator.enabled = false;
            foreach (var renderer in sourcePlayer.GetComponentsInChildren<Renderer>(true)) renderer.enabled = false;
            foreach (var collider in sourcePlayer.GetComponentsInChildren<Collider>(true)) collider.enabled = false;
            foreach (var behaviour in sourceCamera.GetComponents<Behaviour>())
                if (behaviour != null && !(behaviour is Camera) && !(behaviour is AudioListener) && (behaviour.GetType().FullName ?? "").IndexOf("Cinemachine", StringComparison.OrdinalIgnoreCase) >= 0) behaviour.enabled = false;

            points.Clear(); buildings.Clear();
            root = new GameObject("UNGA BUNGA 45001 — adaptation authored on recovered Prolog").transform;
            Directory.CreateDirectory(Generated + "/Controllers"); Directory.CreateDirectory(Generated + "/Clips");
            var bindings = root.gameObject.AddComponent<SceneBindings>(); bindings.recoveredSourceScene = Source;
            // Explicit authored positions, compact around the observed spawn. Source terrain, foliage, water and lighting stay in place.
            CreatePoint("grand_menhir", new Vector2(0, 9));
            CreatePoint("habitations", new Vector2(-14, 10));
            CreatePoint("stockage", new Vector2(14, 10));
            CreatePoint("atelier_silex", new Vector2(-14, -9));
            CreatePoint("foyer", new Vector2(8, -12));
            CreatePoint("bois_construction", new Vector2(-25, 0));
            CreatePoint("pierre_carriere", new Vector2(-26, 14));
            CreatePoint("chasse_clairiere", new Vector2(28, -10));
            CreatePoint("rassemblement", new Vector2(1, 1));
            CreatePoint("repos", new Vector2(8, 4));
            CreatePoint("charpente", new Vector2(-10, 10));
            CreatePoint("vue_village", new Vector2(0, -3));
            Place("MenhirA_BuildableVariant", points["grand_menhir"], Vector3.zero, "meeting", -1);
            Place("Bench_PlacedItem", points["repos"], Vector3.zero, "rest", -1);
            Place("LogPile_Buildable", points["bois_construction"], Vector3.zero, "wood", -1);
            Place("Hut.WoodFrame_Placed", points["charpente"], Vector3.zero, "inspection", -1);
            Place("worldgenerationobjects/stone-f Prolog", points["pierre_carriere"], Vector3.zero, "quarry", -1);
            Place("Mammoth_Mob", points["chasse_clairiere"], new Vector3(6, 0, 2), "hunt", -1);
            BuildStages();

            Transform player = new GameObject("Mathieu_PlayerController").transform; player.SetParent(root); player.position = Ground(CampaignOrigin + new Vector3(-1,0,3), out _); player.position += Vector3.up * .12f;
            var controller = player.gameObject.AddComponent<CharacterController>(); controller.height = 1.8f; controller.radius = .32f; controller.center = new Vector3(0, .9f, 0); controller.stepOffset = .3f; controller.slopeLimit = 48;
            sourceCamera.transform.SetParent(root, true); sourceCamera.enabled = true;
            var actorBindings = new List<CharacterBinding>();
            var ids = new[] { "aurelien", "mathieu", "dylan", "georges", "eliott", "mathilde", "lorette", "neila" };
            var display = new[] { "Aurelien", "Mathieu", "Dylan", "Georges", "Eliott", "Mathilde", "Lorette", "Neila" };
            var offsets = new[] { new Vector2(-5, 11), new Vector2(-1,3), new Vector2(1.5f,3), new Vector2(-4,4), new Vector2(1,6), new Vector2(5,4), new Vector2(-4,7), new Vector2(-1,9) };
            AnimationClip[] dylanClips = ImportDylanClips();
            for (int i = 0; i < ids.Length; i++)
            {
                var actorParent = ids[i] == "mathieu" ? player : new GameObject("Actor_" + display[i]).transform;
                if (actorParent != player) { actorParent.SetParent(root); actorParent.position = Ground(CampaignOrigin + new Vector3(offsets[i].x, 0, offsets[i].y), out _); }
                var actor = CreateActor(ids[i], display[i], actorParent, dylanClips);
                actorBindings.Add(actor); points[ids[i]] = actorParent;
            }
            bindings.characters = actorBindings.ToArray(); bindings.player = player; bindings.gameplayCamera = sourceCamera; bindings.buildings = buildings.ToArray();
            var motor = player.gameObject.AddComponent<ThirdPersonMotor>(); motor.viewCamera = sourceCamera; motor.visual = actorBindings.First(c => c.id == "mathieu").meshyActor.transform; motor.animator = actorBindings.First(c => c.id == "mathieu").animator;
            bindings.gameplayControls = new Behaviour[] { motor };
            BuildCameras(campaignData, sourceCamera);
            foreach (string id in campaignData.actions.Select(a => a.targetBindingId).Concat(campaignData.cinematics.SelectMany(c => c.shots.SelectMany(s => new[] { s.cameraBindingId, s.lookAtBindingId }))).Distinct())
                if (!points.TryGetValue(id, out var target) || target == null) throw new InvalidDataException("Binding runtime absent : " + id);
            bindings.objects = points.OrderBy(p => p.Key).Select(p => new ObjectBinding { id = p.Key, target = p.Value }).ToArray();
            var campaign = root.gameObject.AddComponent<CampaignRuntime>(); campaign.campaignJson = dataAsset; campaign.bindings = bindings;
            var director = root.gameObject.AddComponent<CinematicDirector>(); director.campaign = campaign; director.bindings = bindings;
            var cinematicCamera = new GameObject("CampaignCinematicCamera").AddComponent<Camera>(); cinematicCamera.transform.SetParent(root); cinematicCamera.CopyFrom(sourceCamera); cinematicCamera.enabled = false;
            foreach (var component in sourceCamera.GetComponents<Component>())
            {
                if (component == null) continue;
                string type = component.GetType().FullName ?? "";
                if (type.Contains("HDAdditionalCameraData") || type.Contains("UniversalAdditionalCameraData"))
                {
                    var copy = cinematicCamera.GetComponent(component.GetType()) ?? cinematicCamera.gameObject.AddComponent(component.GetType()); EditorUtility.CopySerialized(component, copy);
                }
            }
            director.cinematicCamera = cinematicCamera; campaign.cinematicDirector = director;
            var interaction = root.gameObject.AddComponent<WorldInteraction>(); interaction.campaign = campaign;
            var hud = root.gameObject.AddComponent<CampaignHud>(); hud.campaign = campaign; hud.interaction = interaction; hud.font = font;
            hud.panelBackground=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Sprite/InfoWindowBackground.asset");
            hud.buttonBackground=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Sprite/RuggedBackground.asset");
            hud.statusBackground=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Sprite/QuestStatus_Background.asset");
            if(hud.panelBackground==null||hud.buttonBackground==null||hud.statusBackground==null)throw new InvalidDataException("Les sprites d'interface Polylithic requis ne sont pas chargés.");
            SetupEvents();
            if (!bindings.Validate(out var errors)) throw new InvalidDataException(errors);
            receipt.bindings = bindings.objects.Length; receipt.buildings = buildings.Count; receipt.stages = buildings.Sum(b => b.stages.Length); receipt.actors = actorBindings.Count;
            receipt.limitations.Add("Source business scripts are IL2CPP export stubs; this adaptation supplies its own motor and campaign rules.");
            receipt.limitations.Add("Station placements, geometry combinations, camera shots and actor scale are authored on the real Prolog terrain, not original game placement.");
            receipt.limitations.Add("Eight source models are supplied; humanoid retargeting depends on valid Unity avatars, listed per actor. Fallback source poses are explicitly reported.");
            receipt.limitations.Add("Native canvas assets are retained but disabled to avoid stub overlays; campaign HUD supplements original assets and is not a recreation of every native menu.");
            receipt.limitations.Add("No Play Mode, rendered frame, traversal, dialogue readability, collision or visual fidelity check has been performed by this builder.");
            Directory.CreateDirectory(Path.GetDirectoryName(Output));
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, Output, true)) throw new IOException("Impossible de sauvegarder l'adaptation.");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(Output, true) };
            AssetDatabase.SaveAssets(); AssetDatabase.Refresh();
            Debug.Log("UNGA BUNGA : vraie carte Prolog adaptée et sauvegardée. Validation jouée et visuelle requise.");
        }

        private static Transform[] AllTransforms() => scene.GetRootGameObjects().SelectMany(r => r.GetComponentsInChildren<Transform>(true)).ToArray();
        private static T[] Components<T>() where T : Component => scene.GetRootGameObjects().SelectMany(r => r.GetComponentsInChildren<T>(true)).ToArray();
        private static Transform Exact(string path)
        {
            var matches = AllTransforms().Where(t => PathOf(t) == path).ToArray();
            if (matches.Length != 1) throw new InvalidDataException("Chemin source absent ou ambigu : " + path); return matches[0];
        }
        private static string PathOf(Transform t) { string path = t.name; while (t.parent != null) { t = t.parent; path = t.name + "/" + path; } return path; }
        private static Vector3 Ground(Vector3 desired, out string method)
        {
            foreach (var terrain in terrains)
            {
                if (terrain.terrainData == null || !terrain.gameObject.activeInHierarchy) continue;
                Vector3 p = terrain.transform.position, size = terrain.terrainData.size;
                if (desired.x >= p.x && desired.x <= p.x + size.x && desired.z >= p.z && desired.z <= p.z + size.z)
                { desired.y = terrain.SampleHeight(desired) + p.y; method = "Terrain.SampleHeight:" + PathOf(terrain.transform); return desired; }
            }
            Physics.SyncTransforms();
            var hits = Physics.RaycastAll(new Vector3(desired.x, 500, desired.z), Vector3.down, 1000, ~0, QueryTriggerInteraction.Ignore)
                .Where(h => root == null || !h.transform.IsChildOf(root)).OrderBy(h => Mathf.Abs(h.point.y - desired.y)).ToArray();
            if (hits.Length == 0) throw new InvalidDataException("Aucun sol source pour " + desired);
            desired.y = hits[0].point.y; method = "source-collider:" + PathOf(hits[0].transform); return desired;
        }
        private static Transform CreatePoint(string id, Vector2 offset)
        {
            var t = new GameObject(id).transform; t.SetParent(root); t.position = Ground(CampaignOrigin + new Vector3(offset.x, 0, offset.y), out var method);
            points.Add(id, t); receipt.placements.Add(new PlacementReceipt { id = id, position = t.position, grounding = method }); return t;
        }
        private static GameObject Place(string name, Transform parent, Vector3 offset, string building, int stage)
        {
            string path = "Assets/Resources/" + name + ".prefab";
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path); if (prefab == null) throw new FileNotFoundException("Prefab récupéré requis : " + path);
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab, scene); instance.transform.SetParent(parent, false); instance.transform.localPosition = offset; instance.transform.localRotation = Quaternion.identity;
            instance.transform.position = Ground(instance.transform.position, out _);
            // Retain renderers/colliders, but strip stub scripts and invisible authoring/UI helpers on new station instances.
            foreach (var behaviour in instance.GetComponentsInChildren<MonoBehaviour>(true)) if (behaviour != null) UnityEngine.Object.DestroyImmediate(behaviour);
            foreach (var canvas in instance.GetComponentsInChildren<Canvas>(true)) canvas.gameObject.SetActive(false);
            foreach (var animator in instance.GetComponentsInChildren<Animator>(true)) animator.enabled = false;
            foreach (var rigidbody in instance.GetComponentsInChildren<Rigidbody>(true)) { rigidbody.isKinematic = true; rigidbody.useGravity = false; }
            foreach (var collider in instance.GetComponentsInChildren<Collider>(true)) if (collider.isTrigger) collider.enabled = false;
            var renderers = instance.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0) throw new InvalidDataException("Prefab sans géométrie : " + path);
            receipt.prefabInstances.Add(new PrefabReceipt { path = path, instance = PathOf(instance.transform), building = building, stage = stage, renderers = renderers.Length, colliders = instance.GetComponentsInChildren<Collider>(true).Length });
            return instance;
        }

        private static void BuildStages()
        {
            foreach (string id in new[] { "habitations", "stockage", "atelier_silex", "foyer" })
            {
                var stages = new GameObject[4];
                for (int stage = 0; stage < 4; stage++)
                {
                    var group = new GameObject(id + "_Stage" + stage); group.transform.SetParent(points[id], false); stages[stage] = group;
                    if (id == "habitations")
                    {
                        Place(stage == 0 ? "CampHutFrame_Destroyable" : "Hut.WoodFrame_Placed", group.transform, Vector3.zero, id, stage);
                        if (stage >= 2) Place("Hut.LeatherCover_Placed", group.transform, Vector3.zero, id, stage);
                        if (stage >= 1) Place("Bench_PlacedItem", group.transform, new Vector3(1.4f, 0, -1), id, stage);
                        if (stage == 3) Place("StoneFence_Straight2m_BuildableVariant", group.transform, new Vector3(0, 0, 3), id, stage);
                    }
                    if (id == "stockage")
                    {
                        Place(stage == 0 ? "VillageStockpile_Placed" : stage == 1 ? "CampStorage_Placed" : "CampFoodStorage_Placed", group.transform, Vector3.zero, id, stage);
                        if (stage >= 2) Place("UndergroundStorage_Placed", group.transform, new Vector3(3, 0, 0), id, stage);
                        if (stage == 3) Place("StoneFence_Straight3m_BuildableVariant", group.transform, new Vector3(1.5f, 0, 3), id, stage);
                    }
                    if (id == "atelier_silex")
                    {
                        Place("Grindstone_Placed", group.transform, Vector3.zero, id, stage);
                        if (stage >= 1) Place("Bench_PlacedItem", group.transform, new Vector3(2, 0, 0), id, stage);
                        if (stage >= 2) Place("HideRack_Placed", group.transform, new Vector3(0, 0, 2), id, stage);
                        if (stage == 3) Place("StoneFence_Straight3m_BuildableVariant", group.transform, new Vector3(-2, 0, 0), id, stage);
                    }
                    if (id == "foyer")
                    {
                        Place(stage < 2 ? "Campfire_Placed" : "Stove_Stone_Placed", group.transform, Vector3.zero, id, stage);
                        if (stage == 0) Place("BeechLog_Gatherable", group.transform, new Vector3(.8f, 0, .2f), id, stage);
                        if (stage >= 1) Place("LogPile_Buildable", group.transform, new Vector3(3, 0, 0), id, stage);
                        if (stage >= 2) Place("Bench_PlacedItem", group.transform, new Vector3(0, 0, -2), id, stage);
                        if (stage == 3) Place("StoneFence_Straight2m_BuildableVariant", group.transform, new Vector3(-2, 0, 1.5f), id, stage);
                    }
                    group.SetActive(stage == 0);
                }
                buildings.Add(new BuildingBinding { id = id, stages = stages });
            }
        }

        private static AnimationClip[] ImportDylanClips()
        {
            var clips = new List<AnimationClip>();
            foreach (string action in new[] { "Idle", "Walk", "Run" })
            {
                string path = "Assets/UngaBungaCast/Dylan/Animations/Dylan-" + action + ".fbx";
                if (!(AssetImporter.GetAtPath(path) is ModelImporter importer)) { receipt.limitations.Add("Clip Dylan absent : " + path); continue; }
                importer.animationType = ModelImporterAnimationType.Human; importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel; importer.importAnimation = true; importer.SaveAndReimport();
                var clip = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview__") && c.length > .1f && c.humanMotion);
                if (clip == null) receipt.limitations.Add("Clip humanoïde Dylan invalide : " + action);
                else
                {
                    // Mixamo FBXs may all use the same internal clip name: retain source and create explicit local motion assets.
                    var copy = UnityEngine.Object.Instantiate(clip); copy.name = "Dylan-" + action;
                    var settings = AnimationUtility.GetAnimationClipSettings(copy); settings.loopTime = true; AnimationUtility.SetAnimationClipSettings(copy, settings);
                    AssetDatabase.CreateAsset(copy, Generated + "/Clips/Dylan-" + action + ".anim"); clips.Add(copy);
                }
            }
            return clips.ToArray();
        }
        private static CharacterBinding CreateActor(string id, string name, Transform parent, AnimationClip[] dylanClips)
        {
            string path = "Assets/UngaBungaCast/" + name + "/" + name + ".fbx";
            if (!(AssetImporter.GetAtPath(path) is ModelImporter importer)) throw new FileNotFoundException("FBX Meshy absent : " + path);
            importer.animationType = id == "aurelien" ? ModelImporterAnimationType.Generic : ModelImporterAnimationType.Human;
            importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel; importer.importAnimation = true; importer.SaveAndReimport();
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path); if (model == null) throw new InvalidDataException("FBX non importé : " + path);
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(model, scene); instance.name = "Meshy_" + name; instance.transform.SetParent(parent, false);
            var renderers = instance.GetComponentsInChildren<Renderer>(true); if (renderers.Length == 0) throw new InvalidDataException("Meshy sans Renderer : " + name);
            AssignCastMaterials(instance, name);
            Bounds bounds = renderers[0].bounds; foreach (var r in renderers.Skip(1)) bounds.Encapsulate(r.bounds);
            float height = id == "aurelien" ? 2.2f : 1.8f;
            if (bounds.size.y < .001f) throw new InvalidDataException("Meshy sans hauteur : " + name);
            float scale = height / bounds.size.y; instance.transform.localScale *= scale;
            bounds = renderers[0].bounds; foreach (var r in renderers.Skip(1)) bounds.Encapsulate(r.bounds);
            instance.transform.position += Vector3.up * (parent.position.y - bounds.min.y);
            var animator = instance.GetComponentInChildren<Animator>(true); if (animator == null) animator = instance.AddComponent<Animator>();
            var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault(); if (avatar != null) animator.avatar = avatar;
            bool valid = avatar != null && avatar.isValid; bool human = valid && avatar.isHuman;
            var ownClips = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview__") && c.length > .1f).ToArray();
            AnimationClip[] usable = id == "aurelien" ? ownClips : human ? dylanClips : ownClips;
            var controller = MakeController(id, usable, id == "aurelien"); animator.runtimeAnimatorController = controller; animator.applyRootMotion = false; animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            if (!human && id != "aurelien") receipt.limitations.Add(name + " : avatar humanoïde invalide, animations Dylan non retargetées ; pose/clips propres seulement.");
            if (id != "aurelien" && usable.Length < 3) receipt.limitations.Add(name + " : cycle Idle/Walk/Run complet non confirmé.");
            if (id == "aurelien" && usable.Length < 7) receipt.limitations.Add("Aurélien T-Rex : moins de sept clips source importés.");
            receipt.avatars.Add(new ActorReceipt { id = id, fbx = path, rig = id == "aurelien" ? "Generic T-Rex" : "Human retarget requested", validAvatar = valid, humanoid = human, animatorController = AssetDatabase.GetAssetPath(controller), skinnedMeshes = instance.GetComponentsInChildren<SkinnedMeshRenderer>(true).Length, normalizedHeight = height, clips = usable.Select(c => c.name).ToArray() });
            return new CharacterBinding { id = id, meshyActor = instance, animator = animator, useMeshy = true };
        }
        private static AnimatorController MakeController(string id, AnimationClip[] clips, bool trex)
        {
            string path = Generated + "/Controllers/" + id + ".controller";
            if (AssetDatabase.LoadAssetAtPath<AnimatorController>(path) != null) throw new IOException("Contrôleur généré existant : " + path);
            var controller = AnimatorController.CreateAnimatorControllerAtPath(path); controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
            var machine = controller.layers[0].stateMachine;
            AnimationClip Pick(params string[] keys) => clips.FirstOrDefault(c => keys.Any(k => c.name.IndexOf(k, StringComparison.OrdinalIgnoreCase) >= 0));
            var idle = Pick("Idle"); var walk = Pick("Walk"); var run = Pick("Run", "Jog");
            var locomotion = machine.AddState("Locomotion"); machine.defaultState = locomotion;
            if (idle != null && walk != null && run != null)
            {
                var blend = new BlendTree { name = id + " Idle Walk Run", blendType = BlendTreeType.Simple1D, blendParameter = "Speed", useAutomaticThresholds = false };
                AssetDatabase.AddObjectToAsset(blend, controller); blend.AddChild(idle, 0); blend.AddChild(walk, .5f); blend.AddChild(run, 1); locomotion.motion = blend;
            }
            else { locomotion.motion = idle ?? clips.FirstOrDefault(); receipt.limitations.Add(id + " : locomotion BlendTree incomplet, clip propre de repli utilisé."); }
            if (trex)
            {
                foreach (string key in new[] { "Dance", "Hit", "Death", "Punch" })
                {
                    var clip = Pick(key); if (clip == null) continue;
                    controller.AddParameter(key, AnimatorControllerParameterType.Trigger); var state = machine.AddState(key); state.motion = clip;
                    var enter = machine.AddAnyStateTransition(state); enter.hasExitTime = false; enter.duration = .12f; enter.AddCondition(AnimatorConditionMode.If, 0, key);
                    if (key != "Death") { var exit = state.AddTransition(locomotion); exit.hasExitTime = true; exit.exitTime = .95f; exit.duration = .12f; }
                }
            }
            return controller;
        }
        private static void AssignCastMaterials(GameObject instance, string name)
        {
            Directory.CreateDirectory(Generated + "/Materials");
            string pipeline = UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline == null ? "BuiltIn" : UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline.GetType().Name;
            bool hd = pipeline.IndexOf("HD", StringComparison.OrdinalIgnoreCase) >= 0;
            var shader = hd ? AssetDatabase.LoadAssetAtPath<Shader>("Packages/com.unity.render-pipelines.high-definition/Runtime/Material/Lit/Lit.shader") : Shader.Find(pipeline == "BuiltIn" ? "Standard" : "Universal Render Pipeline/Lit");
            if (shader == null) { receipt.limitations.Add(name + " : shader Lit compatible absent, matériaux FBX conservés."); return; }
            string folder = "Assets/UngaBungaCast/" + name + "/Textures/";
            var albedo = AssetDatabase.LoadAssetAtPath<Texture2D>(folder + name + "-0.png");
            var orm = AssetDatabase.LoadAssetAtPath<Texture2D>(folder + name + "-1.png");
            var normal = AssetDatabase.LoadAssetAtPath<Texture2D>(folder + name + "-2.png");
            if (albedo == null || normal == null || orm == null) { receipt.limitations.Add(name + " : triplet albedo/ORM/normal incomplet, matériaux FBX conservés."); return; }
            var normalImporter = AssetImporter.GetAtPath(AssetDatabase.GetAssetPath(normal)) as TextureImporter;
            if (normalImporter != null) { normalImporter.textureType = TextureImporterType.NormalMap; normalImporter.sRGBTexture = false; normalImporter.SaveAndReimport(); }
            var ormImporter = AssetImporter.GetAtPath(AssetDatabase.GetAssetPath(orm)) as TextureImporter;
            if (ormImporter != null) { ormImporter.sRGBTexture = false; ormImporter.isReadable = true; ormImporter.SaveAndReimport(); }
            orm = AssetDatabase.LoadAssetAtPath<Texture2D>(folder + name + "-1.png");
            var pixels = orm.GetPixels32();
            for (int i = 0; i < pixels.Length; i++) { var p = pixels[i]; pixels[i] = new Color32(p.b, p.r, 255, (byte)(255 - p.g)); }
            var mask = new Texture2D(orm.width, orm.height, TextureFormat.RGBA32, true, true); mask.SetPixels32(pixels); mask.Apply();
            string maskPath = Generated + "/Materials/" + name + "-UnityMask.png"; File.WriteAllBytes(maskPath, mask.EncodeToPNG()); UnityEngine.Object.DestroyImmediate(mask);
            AssetDatabase.ImportAsset(maskPath); var maskImporter = AssetImporter.GetAtPath(maskPath) as TextureImporter; if (maskImporter != null) { maskImporter.sRGBTexture = false; maskImporter.SaveAndReimport(); }
            var packed = AssetDatabase.LoadAssetAtPath<Texture2D>(maskPath);
            int materialIndex = 0;
            foreach (var renderer in instance.GetComponentsInChildren<Renderer>(true))
            {
                bool skin = renderer.name.IndexOf("skin", StringComparison.OrdinalIgnoreCase) >= 0;
                var originals = renderer.sharedMaterials; var materials = new Material[originals.Length];
                for (int i = 0; i < originals.Length; i++)
                {
                    var previous = originals[i]; var material = new Material(shader) { name = name + "_" + renderer.name + "_" + i };
                    Color color = previous != null && previous.HasProperty("_BaseColor") ? previous.GetColor("_BaseColor") : previous != null && previous.HasProperty("_Color") ? previous.GetColor("_Color") : Color.white;
                    Texture texture = skin ? albedo : previous != null ? previous.mainTexture : null;
                    foreach (string prop in new[] { "_Color", "_BaseColor" }) if (material.HasProperty(prop)) material.SetColor(prop, skin ? Color.white : color);
                    foreach (string prop in new[] { "_MainTex", "_BaseMap", "_BaseColorMap" }) if (material.HasProperty(prop) && texture != null) material.SetTexture(prop, texture);
                    if (skin)
                    {
                        foreach (string prop in new[] { "_BumpMap", "_NormalMap" }) if (material.HasProperty(prop)) material.SetTexture(prop, normal);
                        foreach (string prop in new[] { "_MetallicGlossMap", "_MaskMap", "_OcclusionMap" }) if (material.HasProperty(prop)) material.SetTexture(prop, packed);
                        foreach (string keyword in new[] { "_NORMALMAP", "_METALLICGLOSSMAP", "_METALLICSPECGLOSSMAP", "_OCCLUSIONMAP", "_MASKMAP" }) material.EnableKeyword(keyword);
                    }
                    if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", .5f);
                    if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", .5f);
                    string materialPath = Generated + "/Materials/" + name + "-" + materialIndex++ + ".mat";
                    AssetDatabase.CreateAsset(material, materialPath); materials[i] = material;
                }
                renderer.sharedMaterials = materials;
            }
            receipt.limitations.Add(name + " : matériaux compatibles " + pipeline + " générés depuis les textures copiées ; ORM converti en R=metallic G=occlusion A=1-roughness. Évaluation visuelle à faire.");
        }
        private static void BuildCameras(CampaignData data, Camera sourceCamera)
        {
            var shared = new GameObject("SharedOpeningClosingCameraAnchor").transform; shared.SetParent(root);
            shared.position = points["vue_village"].position + new Vector3(-18, 17, -22); shared.LookAt(points["grand_menhir"].position + Vector3.up);
            foreach (var cinematic in data.cinematics)
            {
                string location = cinematic.id == "C02" ? "atelier_silex" : cinematic.id == "C03" ? "habitations" : cinematic.id == "C05" ? "chasse_clairiere" : "grand_menhir";
                var look = new GameObject("Look_" + cinematic.id).transform; look.SetParent(root); look.position = points[location].position + Vector3.up; points["look:" + cinematic.id] = look;
                for (int i = 0; i < cinematic.shots.Length; i++)
                {
                    var shot = cinematic.shots[i];
                    if (i == 0 && (cinematic.id == "C01" || cinematic.id == "C06")) { points[shot.cameraBindingId] = shared; continue; }
                    var camera = new GameObject("Plan_" + cinematic.id + "_" + (i + 1)).transform; camera.SetParent(root);
                    float angle = 25 + i * 38; camera.position = look.position + Quaternion.Euler(0, angle, 0) * new Vector3(0, 5.5f, -11); camera.LookAt(look.position); points[shot.cameraBindingId] = camera;
                }
            }
        }
        private static void SetupEvents()
        {
            foreach (var events in Components<UnityEngine.EventSystems.EventSystem>()) events.gameObject.SetActive(false);
            var target = new GameObject("CampaignEventSystem", typeof(UnityEngine.EventSystems.EventSystem)); target.transform.SetParent(root);
#if ENABLE_INPUT_SYSTEM
            target.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
#else
            target.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
#endif
        }
    }
}
