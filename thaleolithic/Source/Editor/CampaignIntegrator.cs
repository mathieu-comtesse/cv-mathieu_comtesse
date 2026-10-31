using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace UngaBunga45001.Editor
{
    [Serializable] public sealed class SceneIntegrationManifest
    {
        public string sourceScenePath, outputScenePath, campaignJsonPath, fontAssetPath, playerPath, cameraPath;
        public string inventoryPath;
        public ObjectSpec[] objects = Array.Empty<ObjectSpec>();
        public CharacterSpec[] characters = Array.Empty<CharacterSpec>();
        public BuildingSpec[] buildings = Array.Empty<BuildingSpec>();
        public ControlSpec[] controls = Array.Empty<ControlSpec>();
    }
    [Serializable] public sealed class ObjectSpec { public string id, hierarchyPath; }
    [Serializable] public sealed class CharacterSpec { public string id, sourceActorPath, placementPath, prefabPath, animatorControllerPath; public float uniformScale = 1; }
    [Serializable] public sealed class BuildingSpec { public string id; public string[] stagePaths = Array.Empty<string>(); }
    [Serializable] public sealed class ControlSpec { public string hierarchyPath, componentType; }
    [Serializable] public sealed class RecoveredInventory { public string[] scenePaths = Array.Empty<string>(); public string sourceReceiptPath; }
    [Serializable] public sealed class SourceNarrativeCounts { public SourceAct[] acts; public SourceMission[] missions; public SourceDecision[] decisions; public SourceEnding[] endings; }
    [Serializable] public sealed class SourceAct { public string id; public string[] missionIds; }
    [Serializable] public sealed class SourceMission { public string id, actId, decisionId; }
    [Serializable] public sealed class SourceDecision { public string id, missionId; public SourceOption[] options; }
    [Serializable] public sealed class SourceOption { public string id, text, consequence; }
    [Serializable] public sealed class SourceEnding { public string id; }
    [Serializable] public sealed class DataValidationReceipt
    {
        public string utc, status, sourceNarrative, compiledCampaign;
        public int acts, missions, decisions, actions, cinematics, endings;
        public bool sceneCreated, runtimePlayed;
        public string[] errors, checks;
    }
    public static class CampaignIntegrator
    {
        private static string Argument(string name, string fallback)
        {
            string[] args = Environment.GetCommandLineArgs(); int index = Array.IndexOf(args, name); return index >= 0 && index+1 < args.Length ? args[index+1] : fallback;
        }
        public static void ValidateDataBatch()
        {
            string root = Argument("-ubRoot", @"E:\UNGA-BUNGA-45001");
            string source = Path.Combine(root, "Narrative", "runtime.json");
            string compiled = Argument("-ubCampaign", Path.Combine(root, "Integration", "Assets", "UngaBunga45001", "Resources", "UngaBungaCampaign.json"));
            var receipt = ValidateData(source, compiled);
            string output = Argument("-ubReceipt", Path.Combine(root, "Analysis", "unity-data-validation.json"));
            Directory.CreateDirectory(Path.GetDirectoryName(output)); File.WriteAllText(output, JsonUtility.ToJson(receipt, true));
            if (receipt.errors.Length > 0) throw new InvalidDataException(string.Join("\n", receipt.errors));
            Debug.Log("UNGA BUNGA : données valides. Aucune scène créée ni partie jouée. Reçu : " + output);
        }
        public static DataValidationReceipt ValidateData(string sourcePath, string campaignPath)
        {
            var errors = new List<string>(); var checks = new List<string>();
            var source = JsonUtility.FromJson<SourceNarrativeCounts>(File.ReadAllText(sourcePath));
            var data = JsonUtility.FromJson<CampaignData>(File.ReadAllText(campaignPath));
            if (source.acts.Length != 8 || source.missions.Length != 22 || source.decisions.Length != 9 || source.endings.Length != 3) errors.Add("Comptes du scénario source incorrects.");
            if (data.acts.Length != 8 || data.endings.Length != 3 || data.cinematics.Length != 6 || data.sourceQuotes.Length != 44 || Mathf.Abs(data.durationSeconds - 2700) > .01f) errors.Add("Structure campagne incorrecte.");
            var actionIds = new HashSet<string>(data.actions.Select(a => a.id));
            if (actionIds.Count != data.actions.Length) errors.Add("IDs actions dupliqués.");
            if (data.acts.SelectMany(a => a.objectives).Count() != 22) errors.Add("22 missions jouables requises.");
            foreach (var mission in source.missions)
                if (!data.acts.Where(a => a.id == mission.actId).SelectMany(a => a.objectives).Any(o => o.id == mission.id)) errors.Add("Mission perdue : " + mission.id);
            foreach (var objective in data.acts.SelectMany(a => a.objectives))
                foreach (string id in objective.actionIds) if (!actionIds.Contains(id)) errors.Add("Objectif sans action : " + id);
            var flagProducers = new HashSet<string>(data.actions.SelectMany(a => a.effects).Concat(data.dialogues.SelectMany(d => d.choices).SelectMany(c => c.effects)).Where(e => e.kind == "flag" && e.value > 0).Select(e => e.target));
            foreach (var action in data.actions)
            {
                if (string.IsNullOrEmpty(action.targetBindingId)) errors.Add("Action sans lieu réel : " + action.id);
                foreach (var gate in action.requiredFlags) if (!flagProducers.Contains(gate)) errors.Add("Condition inaccessible : " + action.id + " / " + gate);
                if (!string.IsNullOrEmpty(action.dialogueId) && !data.dialogues.Any(d => d.id == action.dialogueId)) errors.Add("Dialogue absent : " + action.id);
            }
            foreach (var decision in source.decisions)
            {
                var dialogue = data.dialogues.FirstOrDefault(d => d.id == decision.id);
                if (dialogue == null || dialogue.choices.Length != decision.options.Length) errors.Add("Décision perdue : " + decision.id);
                else foreach (var option in decision.options) if (!dialogue.choices.Any(c => c.id == option.id)) errors.Add("Choix perdu : " + option.id);
            }
            foreach (var scene in data.cinematics)
                if (Mathf.Abs(scene.shots.Sum(s => s.durationSeconds)-scene.durationSeconds) > .01f || scene.shots.Any(s => string.IsNullOrEmpty(s.cameraBindingId) || string.IsNullOrEmpty(s.lookAtBindingId))) errors.Add("Plans incomplets : " + scene.id);
            var best = data.endings.OrderByDescending(e => e.priority).First();
            foreach (string gate in new[] { "criticalRisksControlled", "workers_consulted", "systemVerified", "noUntreatedCatastrophe" }) if (!best.requiredFlags.Contains(gate)) errors.Add("Fin excellente sans garde : " + gate);
            if (!data.endings.Any(e => e.requiredFlags.Length == 0 && e.forbiddenFlags.Length == 0)) errors.Add("Fin de repli manquante.");
            if (!data.actions.Any(a => a.repeatable && a.effects.Any(e => e.kind == "resource"))) errors.Add("Aucune récupération de ressources.");
            checks.Add("8 actes / 22 missions / 9 décisions A-B-C / 6 cinématiques / 3 fins");
            checks.Add("IDs uniques, objectifs/actions, conditions produites, dialogues, durée des plans");
            checks.Add("Fin excellente conditionnée aux risques, à la participation, aux vérifications et aux catastrophes analysées");
            return new DataValidationReceipt { utc = DateTime.UtcNow.ToString("O"), status = errors.Count == 0 ? "data-validated" : "failed", sourceNarrative = sourcePath, compiledCampaign = campaignPath,
                acts = data.acts.Length, missions = source.missions.Length, decisions = source.decisions.Length, actions = data.actions.Length, cinematics = data.cinematics.Length, endings = data.endings.Length,
                sceneCreated = false, runtimePlayed = false, errors = errors.ToArray(), checks = checks.ToArray() };
        }
        // Requires an explicit, reviewed manifest. Never discovers a scene and selects the first result.
        public static void IntegrateBatch()
        {
            string path = Argument("-ubManifest", "");
            if (string.IsNullOrEmpty(path)) throw new ArgumentException("-ubManifest est obligatoire.");
            Integrate(JsonUtility.FromJson<SceneIntegrationManifest>(File.ReadAllText(path)));
        }
        public static void Integrate(SceneIntegrationManifest manifest)
        {
            if (manifest == null || !manifest.sourceScenePath.StartsWith("Assets/", StringComparison.Ordinal) || !manifest.sourceScenePath.EndsWith(".unity", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("Scène source explicite Assets/*.unity requise.");
            if (manifest.sourceScenePath == manifest.outputScenePath || !manifest.outputScenePath.StartsWith("Assets/", StringComparison.Ordinal) || !manifest.outputScenePath.EndsWith(".unity", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("La sortie doit être une autre scène sous Assets.");
            if (string.IsNullOrEmpty(manifest.inventoryPath) || !File.Exists(manifest.inventoryPath)) throw new ArgumentException("Inventaire des scènes récupérées requis.");
            var inventory = JsonUtility.FromJson<RecoveredInventory>(File.ReadAllText(manifest.inventoryPath));
            if (!inventory.scenePaths.Contains(manifest.sourceScenePath) || string.IsNullOrEmpty(inventory.sourceReceiptPath) || !File.Exists(inventory.sourceReceiptPath)) throw new InvalidDataException("Scène absente de l'inventaire ou reçu extraction absent.");
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(manifest.sourceScenePath) == null) throw new FileNotFoundException("Scène récupérée absente.");
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(manifest.outputScenePath) != null) throw new IOException("La scène de sortie existe déjà ; nouvelle sortie requise.");
            var dataAsset = AssetDatabase.LoadAssetAtPath<TextAsset>(manifest.campaignJsonPath);
            var font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(manifest.fontAssetPath);
            if (dataAsset == null || font == null) throw new InvalidDataException("Campagne et police TMP explicites requises.");
            CampaignData data = JsonUtility.FromJson<CampaignData>(dataAsset.text);
            Scene scene = EditorSceneManager.OpenScene(manifest.sourceScenePath, OpenSceneMode.Single);
            try
            {
                Transform FindPath(string hierarchy)
                {
                    if (string.IsNullOrEmpty(hierarchy)) throw new ArgumentException("Chemin de hiérarchie vide.");
                    var matches = scene.GetRootGameObjects().SelectMany(g => g.GetComponentsInChildren<Transform>(true)).Where(t => HierarchyPath(t) == hierarchy).ToArray();
                    if (matches.Length != 1) throw new InvalidDataException("Chemin absent ou ambigu : " + hierarchy);
                    return matches[0];
                }
                var player = FindPath(manifest.playerPath); var camera = FindPath(manifest.cameraPath).GetComponent<Camera>();
                if (camera == null) throw new InvalidDataException("Caméra réelle non reliée.");
                var objects = manifest.objects.Select(o => new ObjectBinding { id = o.id, target = FindPath(o.hierarchyPath) }).ToArray();
                foreach (string id in data.actions.Select(a => a.targetBindingId).Concat(data.cinematics.SelectMany(c => c.shots.SelectMany(s => new[] { s.cameraBindingId, s.lookAtBindingId }))).Distinct())
                    if (!objects.Any(o => o.id == id)) throw new InvalidDataException("Binding obligatoire absent : " + id);
                foreach (string id in new[] { "aurelien", "mathieu", "dylan", "georges", "eliott", "mathilde", "lorette", "neila" }) if (!manifest.characters.Any(c => c.id == id)) throw new InvalidDataException("Meshy non affecté : " + id);
                var characterPlans = manifest.characters.Select(c => new { spec = c, placement = FindPath(c.placementPath), source = string.IsNullOrEmpty(c.sourceActorPath) ? null : FindPath(c.sourceActorPath), prefab = AssetDatabase.LoadAssetAtPath<GameObject>(c.prefabPath) }).ToArray();
                foreach (var c in characterPlans) if (c.prefab == null || c.spec.uniformScale <= 0) throw new InvalidDataException("Prefab Meshy/échelle invalide : " + c.spec.id);
                foreach (var c in characterPlans) if (c.source != null && c.placement.IsChildOf(c.source)) throw new InvalidDataException("Le visuel Meshy serait masqué par son parent natif : " + c.spec.id + ". Lier le conteneur de locomotion et son enfant visuel séparément.");
                var first = objects.First(o => o.id == "camera:C01:1"); var last = objects.First(o => o.id == "camera:C06:1");
                if (first.target != last.target) throw new InvalidDataException("C01 et C06 doivent partager exactement le premier cadrage.");
                var buildings = manifest.buildings.Select(b => new BuildingBinding { id = b.id, stages = b.stagePaths.Select(p => FindPath(p).gameObject).ToArray() }).ToArray();
                foreach (var b in buildings) if (b.stages.Length != 4 || b.stages.Distinct().Count() != 4) throw new InvalidDataException("Quatre géométries distinctes requises : " + b.id);
                foreach (var id in data.actions.SelectMany(a => a.effects).Concat(data.dialogues.SelectMany(d => d.choices).SelectMany(c => c.effects)).Where(e => e.kind == "building").Select(e => e.target).Distinct()) if (!buildings.Any(b => b.id == id)) throw new InvalidDataException("Géométries d'amélioration absentes : " + id);
                var controls = manifest.controls.Select(c => { var t = FindPath(c.hierarchyPath); var component = t.GetComponents<Behaviour>().FirstOrDefault(b => b.GetType().FullName == c.componentType); if (component == null) throw new InvalidDataException("Contrôleur absent : " + c.componentType); return component; }).ToArray();
                var root = new GameObject("UNGA BUNGA 45001 Campaign");
                var bindings = root.AddComponent<SceneBindings>(); bindings.recoveredSourceScene = manifest.sourceScenePath; bindings.player = player; bindings.gameplayCamera = camera; bindings.objects = objects; bindings.buildings = buildings; bindings.gameplayControls = controls;
                bindings.characters = characterPlans.Select(c =>
                {
                    var instance = (GameObject)PrefabUtility.InstantiatePrefab(c.prefab, scene);
                    instance.name = "Meshy_" + c.spec.id; instance.transform.SetParent(c.placement, false); instance.transform.localPosition = Vector3.zero; instance.transform.localRotation = Quaternion.identity; instance.transform.localScale = Vector3.one * c.spec.uniformScale;
                    var animator = instance.GetComponentInChildren<Animator>(true);
                    if (!string.IsNullOrEmpty(c.spec.animatorControllerPath)) { if (animator == null) throw new InvalidDataException("Animator absent : " + c.spec.id); animator.runtimeAnimatorController = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>(c.spec.animatorControllerPath); }
                    return new CharacterBinding { id = c.spec.id, sourceActor = c.source?.gameObject, meshyActor = instance, animator = animator, useMeshy = true };
                }).ToArray();
                var campaign = root.AddComponent<CampaignRuntime>(); campaign.campaignJson = dataAsset; campaign.bindings = bindings;
                var director = root.AddComponent<CinematicDirector>(); director.campaign = campaign; director.bindings = bindings;
                var cinema = new GameObject("CampaignCinematicCamera").AddComponent<Camera>(); cinema.transform.SetParent(root.transform); cinema.CopyFrom(camera); cinema.enabled = false; director.cinematicCamera = cinema; campaign.cinematicDirector = director;
                var interaction = root.AddComponent<WorldInteraction>(); interaction.campaign = campaign;
                var hud = root.AddComponent<CampaignHud>(); hud.campaign = campaign; hud.interaction = interaction; hud.font = font;
                if (!bindings.Validate(out string error)) throw new InvalidDataException(error);
                int eventSystems = UnityEngine.Object.FindObjectsByType<UnityEngine.EventSystems.EventSystem>(FindObjectsInactive.Include, FindObjectsSortMode.None).Length;
                if (eventSystems > 1) throw new InvalidDataException("Plusieurs EventSystem présents : sélectionner le système natif à conserver avant intégration.");
                if (eventSystems == 0)
                {
                    var events = new GameObject("CampaignEventSystem", typeof(UnityEngine.EventSystems.EventSystem));
#if ENABLE_INPUT_SYSTEM
                    events.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
#else
                    events.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
#endif
                }
                Directory.CreateDirectory(Path.GetDirectoryName(manifest.outputScenePath));
                if (!EditorSceneManager.SaveScene(scene, manifest.outputScenePath, true)) throw new IOException("Échec d'enregistrement de la scène adaptée.");
                AssetDatabase.Refresh(); Debug.Log("Scène adaptée enregistrée : " + manifest.outputScenePath + ". Lecture et fidélité visuelle restent à vérifier.");
            }
            catch { EditorSceneManager.OpenScene(manifest.sourceScenePath, OpenSceneMode.Single); throw; }
        }
        private static string HierarchyPath(Transform transform) { string result = transform.name; while (transform.parent != null) { transform = transform.parent; result = transform.name + "/" + result; } return result; }
    }
}
