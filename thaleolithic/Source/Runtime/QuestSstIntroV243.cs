using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;

namespace UngaBunga45001
{
    public sealed class QuestSstIntroV243 : MonoBehaviour
    {
        CampaignRuntime campaign;
        CampaignActivitiesV17 activity;
        ActivityProgressV17 receipt;
        Camera home, shotCamera;
        Coroutine sequence;
        GameObject props;
        Material stone;
        RectTransform overlay;
        TMP_Text caption;
        bool homeEnabled, listenerEnabled;
        AudioListener listener;
        public bool Playing => sequence != null;

        public void Play(CampaignRuntime runtime, CampaignActivitiesV17 current)
        {
            var hud = runtime.GetComponent<CampaignHud>();
            if (sequence != null || hud?.Canvas == null || runtime.cinematicDirector.cinematicCamera == null) return;
            if (runtime.GetComponent<UISettingsController>().preferences.reducedMotion)
            {
                current.CurrentProgress.introSeen = true;
                runtime.Save();
                return;
            }
            campaign = runtime;
            activity = current;
            receipt = current.CurrentProgress;
            home = runtime.bindings.gameplayCamera;
            shotCamera = runtime.cinematicDirector.cinematicCamera;
            homeEnabled = home.enabled;
            listener = home.GetComponent<AudioListener>();
            listenerEnabled = listener != null && listener.enabled;
            if (listener != null) listener.enabled = false;
            RenderBackend.CinematicCamera(shotCamera, home);
            home.enabled = false;
            shotCamera.enabled = true;

            overlay = AdventureUI.Rect(hud.Canvas.transform, "Introduction SST", new Vector2(.5f, 0),
                new Vector2(.5f, 0), new Vector2(0, 24), new Vector2(1120, 154));
            overlay.SetAsLastSibling();
            AdventureUI.Panel(overlay, AdventureUI.Ink);
            caption = AdventureUI.Text(TribalStyle.Top(overlay, "Mathieu · explication", 24, 14, 1072, 68), hud.font, "", 28);
            var skip = TribalStyle.Button(TribalStyle.Top(overlay, "Passer", 755, 91, 340, 48), hud.font,
                "PASSER À L’ASSEMBLAGE", () => End(true), true);
            skip.GetComponentInChildren<TMP_Text>().fontSize = 19;
            sequence = StartCoroutine(Show());
            activity.GetComponent<ActivityViewV17>().Render();
            campaign.ReconcileControls();
        }

        IEnumerator Show()
        {
            var dylan = campaign.bindings.player;
            var menhir = campaign.bindings.Find(QuestGuidanceV243.Menhir);
            var mathieu = campaign.bindings.Find("mathieu");
            Vector3 direction = menhir.position - dylan.position;
            direction.y = 0;
            if (direction.sqrMagnitude < .01f) direction = dylan.forward;
            direction.Normalize();
            var side = Vector3.Cross(Vector3.up, direction);
            Vector3 table = dylan.position + direction * 1.08f;
            table.y = VillageLife.Ground(table);
            props = new GameObject("Quatre tablettes devant le Menhir");
            var source = GetComponent<QuestNavigationController>().markerMaterial;
            if (source != null)
            {
                stone = new Material(source) { color = new Color(.54f, .37f, .21f) };
                if (stone.HasProperty("_EmissionColor")) stone.SetColor("_EmissionColor", Color.black);
            }
            for (int i = 0; i < 4; i++)
            {
                var tablet = GameObject.CreatePrimitive(PrimitiveType.Cube);
                tablet.name = "Tablette SST " + (i + 1);
                tablet.transform.SetParent(props.transform, true);
                var p = table + side * ((i - 1.5f) * .28f) + direction * ((i % 2) * .18f);
                p.y = VillageLife.Ground(p) + .07f;
                tablet.transform.SetPositionAndRotation(p, Quaternion.Euler(0, i * 29 - 20, 0));
                tablet.transform.localScale = new Vector3(.22f, .10f, .28f);
                tablet.GetComponent<Collider>().enabled = false;
                if (stone != null) tablet.GetComponent<Renderer>().sharedMaterial = stone;
            }
            // Three short shots use existing actors at their current positions.
            yield return Shot(table - direction * 2.55f + side * .78f + Vector3.up * 1.52f,
                table + Vector3.up * .42f, "Grand Menhir · quatre tablettes à relier.", 2.3f);
            var at = mathieu != null ? mathieu.position : table;
            var view = mathieu != null ? mathieu.forward : direction;
            yield return Shot(at + view * 2.3f + Vector3.up * 1.52f, at + Vector3.up * 1.28f,
                "Mathieu · On a des décisions, des mesures et des contrôles. Il manque les liens.", 3.1f);
            yield return Shot(table - direction * .64f + side * .31f + Vector3.up * 1.78f, table,
                "Mathieu · Comprendre, organiser, vérifier, améliorer. Sans lien, ce sont quatre cailloux très bien rangés.", 4.0f);
            sequence = null;
            End(true);
        }

        IEnumerator Shot(Vector3 position, Vector3 look, string text, float seconds)
        {
            shotCamera.transform.SetPositionAndRotation(position, Quaternion.LookRotation(look - position));
            caption.text = text;
            for (float time = 0; time < seconds;)
            {
                if (Keyboard.current?.escapeKey.wasPressedThisFrame == true || Gamepad.current?.buttonEast.wasPressedThisFrame == true)
                {
                    End(true);
                    yield break;
                }
                if (!campaign.IsPaused) time += Time.unscaledDeltaTime;
                yield return null;
            }
        }

        public void Cancel()
        {
            if (sequence != null) End(false);
        }

        void End(bool seen)
        {
            if (sequence != null) StopCoroutine(sequence);
            sequence = null;
            if (shotCamera != null) shotCamera.enabled = false;
            if (home != null) home.enabled = homeEnabled;
            if (listener != null) listener.enabled = listenerEnabled;
            if (props != null) Destroy(props);
            if (stone != null) Destroy(stone);
            if (overlay != null) Destroy(overlay.gameObject);
            if (seen && receipt != null && activity.CurrentProgress == receipt)
            {
                receipt.introSeen = true;
                campaign.Save();
            }
            if (campaign != null && campaign.isActiveAndEnabled) campaign.ReconcileControls();
            if (activity != null && activity.isActiveAndEnabled) activity.GetComponent<ActivityViewV17>()?.Render();
        }

        void OnDisable() => Cancel();
    }
}
