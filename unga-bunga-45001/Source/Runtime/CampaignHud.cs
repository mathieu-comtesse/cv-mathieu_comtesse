using System;
using System.Linq;
using System.Text;
using TMPro;
using UnityEngine;

namespace UngaBunga45001
{
    // Supplemental campaign UI. Recovered native UI must be mapped and reviewed separately.
    public sealed class CampaignHud : MonoBehaviour
    {
        public CampaignRuntime campaign;
        public WorldInteraction interaction;
        public TMP_FontAsset font;
        public Sprite panelBackground, buttonBackground, statusBackground;
        public int baseFontSize = 24;
        public Texture2D playerPortrait; private SurvivalInterface presenter;
        public Canvas Canvas => canvas;
        private Canvas canvas;
        private TextMeshProUGUI status, objective, message, subtitle, modalText, navigation;
        private RectTransform modal, choiceArea;
        private string shownDialogue, shownEnding, menu = "Missions";
        private bool wasPaused;
        private Vector2 endingViewport;
        private Transform destination;
        private RectTransform topFilmBar,bottomFilmBar;
        private int menuPage, endingPage;
        private readonly System.Collections.Generic.List<TMP_Text> texts = new System.Collections.Generic.List<TMP_Text>();
        private System.Collections.IEnumerator Start()
        {
            while(campaign.Data==null||campaign.State==null)yield return null;
            if (font == null) { Debug.LogError("Police TMP explicitement requise pour le HUD.", this); enabled = false; yield break; }
            Build(); campaign.Changed += Refresh; Refresh();
        }
        private void OnDestroy() { if (campaign != null) campaign.Changed -= Refresh; }
        private void Build()
        {
            var root = new GameObject("CampaignCanvas", typeof(RectTransform), typeof(Canvas), typeof(UnityEngine.UI.CanvasScaler), typeof(UnityEngine.UI.GraphicRaycaster));
            root.transform.SetParent(transform, false); canvas = root.GetComponent<Canvas>(); canvas.renderMode = RenderMode.ScreenSpaceOverlay; canvas.sortingOrder = 100;
            var scaler = root.GetComponent<UnityEngine.UI.CanvasScaler>(); scaler.uiScaleMode = UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize; scaler.referenceResolution = new Vector2(1920, 1080); scaler.matchWidthOrHeight = .5f;
            topFilmBar=Rect(root.transform,"Film upper bar",new Vector2(0,.88f),Vector2.one);bottomFilmBar=Rect(root.transform,"Film lower bar",Vector2.zero,new Vector2(1,.18f));
            foreach(var bar in new[]{topFilmBar,bottomFilmBar}){var black=bar.gameObject.AddComponent<UnityEngine.UI.Image>();black.color=Color.black;black.raycastTarget=false;bar.gameObject.SetActive(false);}
            subtitle=Label(root.transform,"SousTitres",new Vector2(.15f,.14f),new Vector2(.85f,.3f));
            modal = Rect(root.transform, "DialogueEtCarnet", new Vector2(.23f, .15f), new Vector2(.77f, .8f));
            var image = modal.gameObject.AddComponent<UnityEngine.UI.Image>(); ApplyBackground(image,panelBackground); image.raycastTarget = true;
            modalText = Label(modal, "Texte", new Vector2(.025f, .36f), new Vector2(.975f, .98f));
            choiceArea = Rect(modal, "Choix", new Vector2(.025f, .02f), new Vector2(.975f, .34f));
            modal.gameObject.SetActive(false);
            presenter=GetComponent<SurvivalInterface>();presenter.Build(campaign,canvas,font,playerPortrait);
            GetComponent<AdventureMenus>().Build(campaign,canvas,font);
            var map=GetComponent<CampaignMap>();if(map!=null)map.Build(canvas,font);
            (GetComponent<QuestDialogueUI>()??gameObject.AddComponent<QuestDialogueUI>()).Build(campaign,canvas,font);
            (GetComponent<AccidentInterface>()??gameObject.AddComponent<AccidentInterface>()).Build(campaign,canvas,font,playerPortrait);
            (GetComponent<MobileControls>()??gameObject.AddComponent<MobileControls>()).Build(campaign,canvas,font);
            if(GetComponent<MobileQuality>()==null)gameObject.AddComponent<MobileQuality>();
        }
        private RectTransform Rect(Transform parent, string name, Vector2 min, Vector2 max)
        {
            var go = new GameObject(name, typeof(RectTransform)); go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = Vector2.zero; rect.offsetMax = Vector2.zero; return rect;
        }
        private TextMeshProUGUI Label(Transform parent, string name, Vector2 min, Vector2 max)
        {
            var rect = Rect(parent, name, min, max);
            if(parent==canvas.transform && (name=="Survie"||name=="Mission"||name=="Conseil"))
            {
                var background=rect.gameObject.AddComponent<UnityEngine.UI.Image>();ApplyBackground(background,statusBackground);background.raycastTarget=false;
                rect=Rect(rect,name+"Texte",new Vector2(.035f,.06f),new Vector2(.965f,.94f));
            }
            var text = rect.gameObject.AddComponent<TextMeshProUGUI>();
            text.font = font; text.fontSize = baseFontSize; text.color = Color.white; text.textWrappingMode = TextWrappingModes.Normal; text.raycastTarget = false; text.overflowMode = TextOverflowModes.Ellipsis; texts.Add(text); return text;
        }
        private void Button(Transform parent, string text, Vector2 min, Vector2 max, UnityEngine.Events.UnityAction callback)
        {
            var rect = Rect(parent, "Button", min, max); var image = rect.gameObject.AddComponent<UnityEngine.UI.Image>(); ApplyBackground(image,buttonBackground); image.raycastTarget = true;
            var button = rect.gameObject.AddComponent<UnityEngine.UI.Button>(); button.targetGraphic = image; button.onClick.AddListener(callback);
            var label = Label(rect, "Libellé", new Vector2(.025f, .04f), new Vector2(.975f, .96f)); label.text = text; label.alignment = TextAlignmentOptions.MidlineLeft;
            if(MobileControls.TouchActive)label.fontSize=16*MobileControls.Instance.Units;
        }
        private static void ApplyBackground(UnityEngine.UI.Image image,Sprite sprite)
        {
            image.sprite=sprite;image.color=new Color(.09f,.075f,.055f,.96f);
            image.type=sprite!=null && sprite.border.sqrMagnitude>0?UnityEngine.UI.Image.Type.Sliced:UnityEngine.UI.Image.Type.Simple;
        }
        private void ClearChoices() { foreach (Transform child in choiceArea) Destroy(child.gameObject); }
        private void Refresh()
        {
            if (canvas == null || campaign.State == null) return;
            presenter.Refresh();
            bool filming=campaign.cinematicDirector!=null&&campaign.cinematicDirector.IsPlaying;
            topFilmBar.gameObject.SetActive(filming);bottomFilmBar.gameObject.SetActive(filming);
            subtitle.gameObject.SetActive(GetComponent<UISettingsController>().preferences.subtitles);
            subtitle.rectTransform.anchorMin=filming?new Vector2(.12f,.035f):new Vector2(.15f,.14f);subtitle.rectTransform.anchorMax=filming?new Vector2(.88f,.16f):new Vector2(.85f,.3f);
            subtitle.text=campaign.Subtitle;
            if(campaign.Dialogue!=null||campaign.QuestOverlay||campaign.IncidentModal){modal.gameObject.SetActive(false);wasPaused=false;return;}
            if(GetComponent<CampaignMap>().IsOpen||GetComponent<AdventureMenus>().IsOpen){modal.gameObject.SetActive(false);wasPaused=false;return;}
            if(MobileControls.TouchActive&&campaign.UserPaused&&campaign.Ending==null){modal.gameObject.SetActive(false);wasPaused=false;return;}
            bool show=campaign.Dialogue!=null||campaign.Ending!=null||campaign.UserPaused;
            modal.gameObject.SetActive(show);
            if (campaign.Dialogue != null)
            {
                if (shownDialogue == campaign.Dialogue.id) return;
                shownDialogue = campaign.Dialogue.id; shownEnding = null; ClearChoices();
                modalText.text = campaign.Dialogue.speaker + "\n\n" + campaign.Dialogue.text;
                var options = campaign.Dialogue.choices.Where(campaign.CanChoose).ToArray();
                for (int i = 0; i < options.Length; i++)
                {
                    var choice = options[i]; float height = 1f / Mathf.Max(1, options.Length);
                    Button(choiceArea, choice.text, new Vector2(0, 1 - height * (i + 1)), new Vector2(1, 1 - height * i - .02f), () => campaign.Choose(choice.id));
                }
                return;
            }
            shownDialogue = null;
            if (campaign.Ending != null)
            {
                if(MobileControls.TouchActive){var view=MobileControls.Instance.Viewport;if(endingViewport!=view){endingViewport=view;shownEnding=null;}float u=MobileControls.Instance.Units;modal.anchorMin=Vector2.zero;modal.anchorMax=Vector2.one;modal.offsetMin=Vector2.one*12*u;modal.offsetMax=-Vector2.one*12*u;modalText.rectTransform.anchorMin=new Vector2(0,.4f);modalText.rectTransform.anchorMax=Vector2.one;modalText.rectTransform.offsetMin=Vector2.one*12*u;modalText.rectTransform.offsetMax=-Vector2.one*12*u;modalText.fontSize=16*u;choiceArea.anchorMin=Vector2.zero;choiceArea.anchorMax=new Vector2(1,.38f);choiceArea.offsetMin=Vector2.one*12*u;choiceArea.offsetMax=-Vector2.one*12*u;}
                if (shownEnding == campaign.Ending.id) return; shownEnding = campaign.Ending.id; ClearChoices();
                ShowEnding(); return;
            }
            if(campaign.UserPaused&&campaign.Ending==null){modal.gameObject.SetActive(false);if(!wasPaused)GetComponent<AdventureMenus>().Open("Réglages");}
            wasPaused = campaign.UserPaused;
        }
        private string Report() => $"Dangers identifiés : {campaign.State.flags.Count(f => f.StartsWith("observed:"))}\nRisques critiques non maîtrisés : {campaign.State.risks.Count(v => v.value >= 2)}\nPreuves : {campaign.State.evidence.Count} ; décès : {campaign.State.characters.Count(c => !c.alive)}";
        public void OpenJournal(string page="Missions")
        {GetComponent<AdventureMenus>()?.Open(page=="Tribu"?"Peuple":page=="Risques"?"Codex":page);}
        private void ShowMenu(string name)
        {
            if(GetComponent<AdventureMenus>().TribalReady){OpenJournal(name);return;}

            if(name=="Réglages"||name=="Ressources"||name=="ISO 45001"){GetComponent<AdventureMenus>().Open(name=="Ressources"?"Inventaire":name);return;}
            if(name=="Carte"){GetComponent<CampaignMap>()?.Open();return;}
            if (menu != name) menuPage = 0;
            menu = name; ClearChoices(); var body = new StringBuilder(name + "\n\n");
            var state = campaign.State;
            switch (name)
            {
                case "Missions":
                    foreach (var o in campaign.CurrentAct.objectives) body.AppendLine((campaign.IsObjectiveComplete(o) ? "Validé : " : "À faire : ") + o.title);
                    body.AppendLine("\nIndice : " + campaign.CurrentAct.objectives.FirstOrDefault(o => !campaign.IsObjectiveComplete(o))?.title);
                    break;
                case "Carte":
                    foreach (var o in campaign.bindings.objects.Where(o => o.target != null && !o.id.StartsWith("camera:") && !o.id.StartsWith("look:")))
                    { if (body.Length > 1300) break; body.AppendLine(o.id + " : " + Vector3.Distance(campaign.bindings.player.position, o.target.position).ToString("0") + " m"); }
                    break;
                case "Tribu": foreach (var c in state.characters.Take(18)) body.AppendLine($"{c.id} : {(c.alive ? c.health : "décédé")}, compétence {c.competence:0}, fatigue {c.fatigue:0}"); break;
                case "Ressources": foreach (var r in state.resources) body.AppendLine(r.id + " : " + r.value.ToString("0")); break;
                case "Risques": foreach (var r in state.risks) body.AppendLine(r.id + " : " + (r.value >= 2 ? "CRITIQUE" : r.value > 0 ? "à vérifier" : "maîtrisé")); break;
                case "Codex":
                    foreach (var proof in state.evidence) body.AppendLine(proof);
                    body.AppendLine("\nRépliques du scénario :");
                    foreach (var quote in campaign.Data.sourceQuotes.Where(q => string.IsNullOrEmpty(q.actId) || Array.FindIndex(campaign.Data.acts, a => a.id == q.actId) <= state.actIndex)) body.AppendLine(quote.speakerId + " : " + quote.text);
                    body.AppendLine("\nSimulation pédagogique. Aucune déclaration de certification ISO 45001."); break;
                case "Réglages": body.AppendLine("Sous-titres activés. Dialogues : temps suspendu.\nTaille de texte ajustable. Présentation des accidents atténuée disponible.\nZQSD/WASD : déplacement ; Maj : course ; Espace : saut ; E : interaction ; souris : caméra."); break;
            }
            int count; modalText.text = Page(body.ToString(), ref menuPage, out count);
            string[] tabs = { "Missions", "Carte", "Tribu", "Ressources", "Risques", "Codex", "ISO 45001", "Réglages" };
            for (int i = 0; i < tabs.Length; i++) { string tab = tabs[i]; float w = 1f / tabs.Length; Button(choiceArea, tab, new Vector2(i * w, .69f), new Vector2((i + 1) * w - .005f, 1), () => ShowMenu(tab)); }
            Button(choiceArea, "Reprendre", new Vector2(0, 0), new Vector2(.22f, .30f), () => { campaign.SetPause(false); wasPaused = false; });
            if (count > 1)
            {
                Button(choiceArea, "Page précédente", new Vector2(.24f, 0), new Vector2(.48f, .30f), () => { menuPage--; ShowMenu(menu); });
                Button(choiceArea, "Page suivante", new Vector2(.50f, 0), new Vector2(.74f, .30f), () => { menuPage++; ShowMenu(menu); });
            }
            if (name == "Missions")
            {
                Button(choiceArea, "Localiser", new Vector2(.24f, .34f), new Vector2(.48f, .65f), Locate);
                Button(choiceArea, "Acte suivant", new Vector2(.50f, .34f), new Vector2(.74f, .65f), () => { campaign.SetPause(false); wasPaused = false; campaign.AdvanceAct(); });
                Button(choiceArea, "Rejouer l'acte", new Vector2(.76f, .34f), new Vector2(1, .65f), () => { campaign.ReplayAct(state.actIndex); wasPaused = false; });
            }
            if (name == "Réglages")
            {
                Button(choiceArea, "Texte +", new Vector2(.24f, .34f), new Vector2(.48f, .65f), () => SetTextSize(baseFontSize + 2));
                Button(choiceArea, "Texte -", new Vector2(.50f, .34f), new Vector2(.74f, .65f), () => SetTextSize(baseFontSize - 2));
                Button(choiceArea, "Atténuer les accidents", new Vector2(.76f, 0), new Vector2(1, .30f), () => { campaign.attenuatedAccidents = !campaign.attenuatedAccidents; });
            }
        }
        private void Locate()
        {
            var goal = campaign.CurrentAct.objectives.FirstOrDefault(o => !campaign.IsObjectiveComplete(o));
            var action = goal == null ? null : campaign.Data.actions.FirstOrDefault(a => goal.actionIds.Contains(a.id) && !campaign.State.completedActions.Contains(a.id));
            destination = action == null ? null : campaign.bindings.Find(action.targetBindingId);
            if(action!=null)GetComponent<QuestNavigationController>().Follow(action.id);
            campaign.SetPause(false); wasPaused = false;
        }
        public void SetTextSize(int size) { baseFontSize = Mathf.Clamp(size, 20, 36); foreach (var text in texts) if (text != null) text.fontSize = baseFontSize; }
        private string Page(string content, ref int page, out int count)
        {
            content=System.Text.RegularExpressions.Regex.Replace(content,@"(?m)^[ \t]*#{1,6}[ \t]+","").Replace("**","");
            Canvas.ForceUpdateCanvases();
            float width=Mathf.Max(300,modalText.rectTransform.rect.width-8);
            float height=Mathf.Max(90,modalText.rectTransform.rect.height-baseFontSize*2.7f);
            var pages=new System.Collections.Generic.List<string>();int start=0;
            while(start<content.Length)
            {
                int low=1,high=Mathf.Min(4000,content.Length-start),fit=1;
                while(low<=high)
                {
                    int mid=(low+high)/2;
                    if(modalText.GetPreferredValues(content.Substring(start,mid),width,Mathf.Infinity).y<=height){fit=mid;low=mid+1;}else high=mid-1;
                }
                if(start+fit<content.Length)
                {
                    int boundary=content.LastIndexOf('\n',start+fit-1,fit);
                    if(boundary<start+fit/2)boundary=content.LastIndexOf(' ',start+fit-1,fit);
                    if(boundary>start+fit/2)fit=boundary-start+1;
                }
                pages.Add(content.Substring(start,fit).Trim());start+=fit;
            }
            if(pages.Count==0)pages.Add("");count=pages.Count;page=Mathf.Clamp(page,0,count-1);
            return pages[page]+$"\n\nPage {page+1}/{count}";
        }
        private void ShowEnding()
        {
            ClearChoices(); int count;
            string story=System.Text.RegularExpressions.Regex.Replace(campaign.Ending.text,@"\A\s*#{1,6}[^\r\n]*(?:\r?\n|$)","").TrimStart();
            modalText.text = Page(campaign.Ending.title + "\n\n" + story + "\n\n" + Report(), ref endingPage, out count);
            Button(choiceArea, "Rejouer cet acte", Vector2.zero, new Vector2(.49f, .45f), () => campaign.ReplayAct(campaign.State.actIndex));
            Button(choiceArea, "Nouvelle tribu", new Vector2(.51f, 0), new Vector2(1, .45f), campaign.NewCampaign);
            if (count > 1)
            {
                Button(choiceArea, "Page précédente", new Vector2(0, .52f), new Vector2(.49f, 1), () => { endingPage--; ShowEnding(); });
                Button(choiceArea, "Page suivante", new Vector2(.51f, .52f), Vector2.one, () => { endingPage++; ShowEnding(); });
            }
        }
    }
}
