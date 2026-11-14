using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace UngaBunga45001
{
    public sealed class ChapterMotionV241 : MonoBehaviour
    {
        [Serializable] public sealed class Pack
        {
            public string chapter, file;
            public string[] clips;
        }

        [Serializable] public sealed class Manifest
        {
            public Pack[] packs;
        }

        sealed class Slot
        {
            public Pack pack;
            public bool loading, ready;
            public float retryAt;
            public string error;
        }

        readonly Dictionary<string, Slot> chapters = new Dictionary<string, Slot>();
        readonly Dictionary<string, Slot> owners = new Dictionary<string, Slot>();
        readonly Dictionary<string, AnimationClip> clips = new Dictionary<string, AnimationClip>();
        CampaignRuntime campaign;

        void Awake()
        {
            campaign = GetComponent<CampaignRuntime>();
            var manifest = Resources.Load<TextAsset>("ThaleolithicChapterMotion");
            if (manifest == null) return;
            foreach (var pack in JsonUtility.FromJson<Manifest>(manifest.text).packs)
            {
                var slot = new Slot { pack = pack };
                chapters.Add(pack.chapter, slot);
                foreach (var id in pack.clips) owners.Add(id, slot);
            }
        }

        void Update()
        {
            if (chapters.Count == 0 || campaign.State == null) return;
            int act = campaign.State.actIndex;
            if (act == 2 || act == 3 || act == 4) Prepare("07");
            if (act >= 3 && act <= 7) Prepare("08");
        }

        public string Status
        {
            get
            {
                if (chapters.Count == 0) return "embedded";
                var status = new List<string>(chapters.Count);
                foreach (var pair in chapters)
                {
                    var slot = pair.Value;
                    status.Add(pair.Key + ":" + (slot.ready ? "ready" : slot.loading ? "loading" :
                        slot.error != null ? "retry" : "pending"));
                }
                return string.Join(",", status);
            }
        }

        public bool Require(string chapter)
        {
            if (Prepare(chapter)) return true;
            var slot = chapters[chapter];
            campaign.Inform(slot.error != null
                ? "Animations du chapitre indisponibles. Vérifie la connexion, puis réessaie."
                : "Les animations du chapitre se chargent. Réessaie dans quelques secondes.");
            return false;
        }

        public bool Prepare(string chapter)
        {
            if (!chapters.TryGetValue(chapter, out var slot) || slot.ready) return true;
            if (!slot.loading && Time.realtimeSinceStartup >= slot.retryAt)
                StartCoroutine(Load(slot));
            return false;
        }

        public AnimationClip Clip(string id)
        {
            if (clips.TryGetValue(id, out var clip)) return clip;
            if (owners.TryGetValue(id, out var slot))
            {
                Prepare(slot.pack.chapter);
                return null;
            }
            clip = Resources.Load<AnimationClip>("CinematicsV18/Clips/" + id);
            if (clip != null) clips.Add(id, clip);
            return clip;
        }

        IEnumerator Load(Slot slot)
        {
            slot.loading = true;
            AssetBundle bundle = null;
            try
            {
                string url = Application.streamingAssetsPath.TrimEnd('/') + "/" + slot.pack.file;
                using (var request = UnityWebRequestAssetBundle.GetAssetBundle(url))
                {
                    request.timeout = 25;
                    yield return request.SendWebRequest();
                    if (request.result != UnityWebRequest.Result.Success)
                    {
                        Failed(slot, request.error);
                        yield break;
                    }

                    bundle = DownloadHandlerAssetBundle.GetContent(request);
                    if (bundle == null) { Failed(slot, "Bundle vide"); yield break; }
                    var load = bundle.LoadAllAssetsAsync<AnimationClip>();
                    yield return load;
                    var received = new Dictionary<string, AnimationClip>();
                    foreach (var asset in load.allAssets)
                        if (asset is AnimationClip animation) received[animation.name] = animation;
                    foreach (var id in slot.pack.clips)
                        if (!received.ContainsKey(id)) { Failed(slot, "Clip manquant : " + id); yield break; }
                    foreach (var id in slot.pack.clips) clips[id] = received[id];
                    slot.error = null;
                    slot.ready = true;
                }
            }
            finally
            {
                if (bundle != null) bundle.Unload(!slot.ready);
                slot.loading = false;
            }
        }

        void Failed(Slot slot, string detail)
        {
            slot.error = detail;
            slot.retryAt = Time.realtimeSinceStartup + 5;
            Debug.LogWarning("Lot ISO " + slot.pack.chapter + " : " + detail, this);
        }
    }
}