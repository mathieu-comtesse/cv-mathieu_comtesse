using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace UngaBunga45001
{
    [Serializable] public sealed class ObjectBinding { public string id; public Transform target; }
    [Serializable] public sealed class CharacterBinding
    {
        public string id;
        public GameObject sourceActor, meshyActor;
        public Animator animator;
        public GameObject injuryPresentation, attenuatedPresentation;
        public bool useMeshy;
    }
    [Serializable] public sealed class BuildingBinding
    {
        public string id;
        public GameObject[] stages = new GameObject[4];
    }
    public sealed class SceneBindings : MonoBehaviour
    {
        public string recoveredSourceScene;
        public Transform player;
        public Camera gameplayCamera;
        public Behaviour[] gameplayControls = Array.Empty<Behaviour>();
        public ObjectBinding[] objects = Array.Empty<ObjectBinding>();
        public CharacterBinding[] characters = Array.Empty<CharacterBinding>();
        public BuildingBinding[] buildings = Array.Empty<BuildingBinding>();
        private readonly Dictionary<Behaviour, bool> enabledBeforeBlock = new Dictionary<Behaviour, bool>();
        private bool blocked;
        private CursorLockMode previousCursorLock;
        private bool previousCursorVisible;
        // Native V2 rigs are already expressed in metres. FootGrounding handles slope contact.
        public Transform Find(string id) => objects.FirstOrDefault(o => o.id == id)?.target ?? characters.FirstOrDefault(c => c.id == id)?.meshyActor?.transform ?? characters.FirstOrDefault(c => c.id == id)?.sourceActor?.transform;
        public Animator AnimatorFor(string id) => characters.FirstOrDefault(c => c.id == id)?.animator;
        public bool Validate(out string errors)
        {
            var issues = new List<string>();
            if (string.IsNullOrEmpty(recoveredSourceScene)) issues.Add("provenance scène source");
            if (player == null) issues.Add("joueur réel");
            if (gameplayCamera == null) issues.Add("caméra réelle");
            foreach (string id in new[] { "aurelien", "mathieu", "dylan", "georges", "eliott", "mathilde", "lorette", "neila" })
            {
                var actor = characters.FirstOrDefault(c => c.id == id);
                if (actor == null || actor.meshyActor == null || !actor.useMeshy) issues.Add("personnage Meshy " + id);
            }
            foreach (var group in objects.GroupBy(b => b.id)) if (group.Count() > 1) issues.Add("binding dupliqué " + group.Key);
            foreach (var b in buildings) if (b.stages == null || b.stages.Length != 4 || b.stages.Any(s => s == null)) issues.Add("4 géométries réelles requises " + b.id);
            errors = string.Join(", ", issues); return issues.Count == 0;
        }
        public void SetGameplayBlocked(bool value)
        {
            if (value == blocked) return; blocked = value;
            if (blocked)
            {
                previousCursorLock = Cursor.lockState; previousCursorVisible = Cursor.visible;
                enabledBeforeBlock.Clear();
                foreach (var control in gameplayControls) if (control != null && control != this) { enabledBeforeBlock[control] = control.enabled; control.enabled = false; }
            }
            else { foreach (var pair in enabledBeforeBlock) if (pair.Key != null) pair.Key.enabled = pair.Value; enabledBeforeBlock.Clear(); }
            Cursor.lockState = blocked ? CursorLockMode.None : previousCursorLock;
            Cursor.visible = blocked || previousCursorVisible;
        }
        public void Apply(CampaignSave state, bool attenuated)
        {
            bool geometryChanged=false;
            foreach (var binding in characters)
            {
                var character = state.characters.Find(c => c.id == binding.id); if (character == null) continue;
                if (binding.sourceActor != null && binding.useMeshy) binding.sourceActor.SetActive(false);
                if (binding.meshyActor != null) binding.meshyActor.SetActive(binding.useMeshy && character.alive);
                bool injured = !character.alive || character.life < 50;
                if (binding.injuryPresentation != null) binding.injuryPresentation.SetActive(injured && !attenuated);
                if (binding.attenuatedPresentation != null) binding.attenuatedPresentation.SetActive(injured && attenuated);
            }
            foreach (var binding in buildings)
            {
                int stage = Mathf.Clamp(Mathf.RoundToInt(state.buildings.Find(v => v.id == binding.id)?.value ?? 0), 0, 3);
                for (int i = 0; i < binding.stages.Length; i++) if (binding.stages[i] != null){if(binding.stages[i].activeSelf!=(i==stage))geometryChanged=true;binding.stages[i].SetActive(i == stage);}
            }
            if(geometryChanged)GetComponent<VillageNavigation>()?.RequestRebuild();
        }
    }
}

