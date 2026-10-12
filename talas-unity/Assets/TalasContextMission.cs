using UnityEngine;
using TMPro;
using UnityEngine.EventSystems;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.UI;
#endif

public class TalasContextMission : MonoBehaviour
{
    public Transform player, companion;
    public TMP_FontAsset font;
    public bool activityEvidence, workerEvidence, completed;
    public bool DialogueOpen => dialog != null && dialog.activeSelf;
    public string LastFeedback { get; private set; }
    GameObject dialog;
    TextMeshProUGUI objective, prompt, dialogueText;
    UnityEngine.UI.Button[] choices;
    TalasQuayMovement movement;
    int question = -1;
    bool feedback;
    readonly float[] stations = { -8, -1, 4.75f };

    void Awake()
    {
        if (player != null) movement = player.GetComponent<TalasQuayMovement>();
        BuildInterface();
    }
    void Update()
    {
        if (companion != null && player != null)
        {
            companion.position = Vector3.Lerp(companion.position,
                player.position + new Vector3(1.15f, 1.85f + Mathf.Sin(Time.time * 2.2f) * .12f, -.12f), Time.deltaTime * 3);
            var rotor = companion.Find("Rotor");
            if (rotor != null) rotor.Rotate(0, 720 * Time.deltaTime, 0);
        }
        bool interact = false, escape = false;
#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null)
        {
            interact = Keyboard.current.eKey.wasPressedThisFrame;
            escape = Keyboard.current.escapeKey.wasPressedThisFrame;
        }
#elif ENABLE_LEGACY_INPUT_MANAGER
        interact = Input.GetKeyDown(KeyCode.E); escape = Input.GetKeyDown(KeyCode.Escape);
#endif
        if (escape) CloseDialogue();
        if (interact && !DialogueOpen) Interact();
        if (objective != null) objective.text = completed ? "CONTEXTE §4  /  Dossier validé" :
            "CONTEXTE §4  /  Comprendre Talas  ·  " + ((activityEvidence ? 1 : 0) + (workerEvidence ? 1 : 0)) + "/2 dossiers";
        if (prompt != null) prompt.text = DialogueOpen ? "Échap : reprendre l'exploration" :
            Nearby() >= 0 ? "E : examiner   ·   Flèches / Q-D : se déplacer" : "Flèches / Q-D : explorer le quai";
    }
    int Nearby()
    {
        if (player == null) return -1;
        int result = -1; float distance = 1.45f;
        for (int i = 0; i < stations.Length; i++)
        {
            float d = Mathf.Abs(player.position.x - stations[i]);
            if (d < distance) { result = i; distance = d; }
        }
        return result;
    }
    public void Interact()
    {
        int station = Nearby();
        if (station < 0 || DialogueOpen) return;
        if (station == 2)
        {
            completed = activityEvidence && workerEvidence;
            ShowMessage(completed ? "Boulon — Le contexte est posé.\n\nTu as identifié l'activité de Talas et les attentes des travailleurs. Ces éléments servent à définir le périmètre du système SST. Le bureau est prêt pour la suite du chapitre." :
                "Boulon — Un atelier magnifique ne remplace pas un dossier complet.\n\nExamine d'abord les deux dossiers sur le quai : l'activité de Talas et les attentes des travailleurs.");
            return;
        }
        if ((station == 0 && activityEvidence) || (station == 1 && workerEvidence))
        { ShowMessage("Boulon — Ce dossier est déjà dans ton carnet. Il reste l'entrée de l'atelier à vérifier."); return; }
        question = station; feedback = false; dialog.SetActive(true); SetMovement(false);
        dialogueText.text = station == 0 ? "DOSSIER 01 · L'ACTIVITÉ DE TALAS\n\nAvant de définir le périmètre du système SST, que faut-il comprendre ?" :
            "DOSSIER 02 · LES PARTIES INTÉRESSÉES\n\nQuelles attentes faut-il prendre en compte dans le contexte de Talas ?";
        SetChoices(station == 0 ? new[] { "Seulement la couleur des équipements", "Les enjeux internes et externes de l'entreprise", "Seulement les résultats du dernier audit" } :
            new[] { "Celles des travailleurs et des autres parties intéressées", "Seulement celles de la direction", "Aucune : le périmètre se choisit au hasard" });
    }
    public void Answer(int index)
    {
        if (!DialogueOpen || feedback || question < 0) return;
        bool correct = index == (question == 0 ? 1 : 0);
        if (correct)
        {
            if (question == 0) activityEvidence = true; else workerEvidence = true;
            LastFeedback = question == 0 ? "Dossier ajouté : enjeux internes et externes." : "Dossier ajouté : attentes des travailleurs et autres parties intéressées.";
        }
        else LastFeedback = "Boulon — On regarde ce qui influence Talas et ce que ses parties intéressées attendent. Réexamine ce dossier pour réessayer.";
        ShowMessage(LastFeedback);
    }
    void ShowMessage(string message)
    {
        feedback = true; question = -1; LastFeedback = message; dialog.SetActive(true); SetMovement(false);
        dialogueText.text = message;
        for (int i = 0; i < choices.Length; i++)
        {
            choices[i].gameObject.SetActive(i == 0); choices[i].onClick.RemoveAllListeners();
        }
        choices[0].GetComponentInChildren<TextMeshProUGUI>().text = "Reprendre l'exploration";
        choices[0].onClick.AddListener(CloseDialogue);
    }
    public void CloseDialogue() { if (dialog != null) dialog.SetActive(false); question = -1; feedback = false; SetMovement(true); }
    void SetMovement(bool enabled) { if (movement != null) movement.controlsEnabled = enabled; }
    void OnDisable() { SetMovement(true); }
    void SetChoices(string[] labels)
    {
        for (int i = 0; i < choices.Length; i++)
        {
            int index = i; choices[i].gameObject.SetActive(true); choices[i].onClick.RemoveAllListeners();
            choices[i].GetComponentInChildren<TextMeshProUGUI>().text = labels[i];
            choices[i].onClick.AddListener(() => Answer(index));
        }
    }
    void BuildInterface()
    {
        var canvasObject = new GameObject("TalasHUD", typeof(RectTransform), typeof(Canvas), typeof(UnityEngine.UI.CanvasScaler), typeof(UnityEngine.UI.GraphicRaycaster));
        canvasObject.transform.SetParent(transform, false);
        canvasObject.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = canvasObject.GetComponent<UnityEngine.UI.CanvasScaler>();
        scaler.uiScaleMode = UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1280, 720); scaler.matchWidthOrHeight = .5f;
        var banner = Panel("Mission", canvasObject.transform, new Vector2(.025f,.875f), new Vector2(.54f,.97f));
        objective = Text("Objectif", banner.transform, "", 21); Stretch(objective.rectTransform, 18, 10);
        prompt = Text("Commandes", canvasObject.transform, "", 19);
        prompt.rectTransform.anchorMin = new Vector2(.025f,.025f); prompt.rectTransform.anchorMax = new Vector2(.65f,.09f);
        prompt.rectTransform.offsetMin = Vector2.zero; prompt.rectTransform.offsetMax = Vector2.zero;
        dialog = Panel("Dossier", canvasObject.transform, new Vector2(.14f,.12f), new Vector2(.86f,.64f));
        dialogueText = Text("Texte du dossier", dialog.transform, "", 24);
        dialogueText.rectTransform.anchorMin = new Vector2(.045f,.53f); dialogueText.rectTransform.anchorMax = new Vector2(.955f,.94f);
        dialogueText.rectTransform.offsetMin = Vector2.zero; dialogueText.rectTransform.offsetMax = Vector2.zero;
        var list = new GameObject("Réponses", typeof(RectTransform), typeof(UnityEngine.UI.VerticalLayoutGroup)); list.transform.SetParent(dialog.transform,false);
        var rect = list.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(.045f,.07f); rect.anchorMax = new Vector2(.955f,.49f); rect.offsetMin = rect.offsetMax = Vector2.zero;
        var layout = list.GetComponent<UnityEngine.UI.VerticalLayoutGroup>(); layout.spacing = 8;
        layout.childControlHeight = layout.childControlWidth = true; layout.childForceExpandWidth = true; layout.childForceExpandHeight = false;
        choices = new UnityEngine.UI.Button[3];
        for (int i = 0; i < choices.Length; i++)
        {
            var button = new GameObject("Réponse " + (i+1), typeof(RectTransform), typeof(UnityEngine.UI.Image), typeof(UnityEngine.UI.Button), typeof(UnityEngine.UI.LayoutElement));
            button.transform.SetParent(list.transform,false); button.GetComponent<UnityEngine.UI.LayoutElement>().preferredHeight = 44;
            var image = button.GetComponent<UnityEngine.UI.Image>(); image.color = new Color(.15f,.30f,.33f,1);
            choices[i] = button.GetComponent<UnityEngine.UI.Button>(); choices[i].targetGraphic = image;
            var label = Text("Libellé", button.transform, "", 20); Stretch(label.rectTransform, 14, 4);
        }
        dialog.SetActive(false);
        if (Object.FindFirstObjectByType<EventSystem>() == null)
        {
            var events = new GameObject("EventSystem",typeof(EventSystem)); events.transform.SetParent(transform,false);
#if ENABLE_INPUT_SYSTEM
            events.AddComponent<InputSystemUIInputModule>();
#else
            events.AddComponent<StandaloneInputModule>();
#endif
        }
    }
    GameObject Panel(string name, Transform parent, Vector2 min, Vector2 max)
    {
        var go = new GameObject(name,typeof(RectTransform),typeof(UnityEngine.UI.Image)); go.transform.SetParent(parent,false);
        var rt = go.GetComponent<RectTransform>(); rt.anchorMin = min; rt.anchorMax = max; rt.offsetMin = rt.offsetMax = Vector2.zero;
        var image = go.GetComponent<UnityEngine.UI.Image>(); image.color = new Color(.025f,.07f,.095f,.95f); image.raycastTarget = false;
        return go;
    }
    TextMeshProUGUI Text(string name, Transform parent, string content, float size)
    {
        var go = new GameObject(name,typeof(RectTransform)); go.transform.SetParent(parent,false);
        var text = go.AddComponent<TextMeshProUGUI>(); text.font = font != null ? font : TMP_Settings.defaultFontAsset;
        text.text = content; text.fontSize = size; text.color = new Color(.94f,.93f,.84f); text.raycastTarget = false;
        text.alignment = TextAlignmentOptions.MidlineLeft; text.textWrappingMode = TextWrappingModes.Normal;
        return text;
    }
    static void Stretch(RectTransform rt, float x, float y) { rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = new Vector2(x,y); rt.offsetMax = new Vector2(-x,-y); }
}
