using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;

namespace UngaBunga45001
{
    [Flags]
    public enum ControlLocks
    {
        None = 0, Loading = 1, PauseMenu = 2, Settings = 4, Dialogue = 8, Question = 16,
        Inspection = 32, SSTAssembly = 64, Cinematic = 128, BrowserFocus = 256,
        GameOver = 512, Activity = 1024, Orientation = 2048, Background = 4096, Error = 8192, Busy = 16384
    }

    public sealed partial class CampaignRuntime : MonoBehaviour
    {
        public TextAsset campaignJson;
        public SceneBindings bindings;
        public CinematicDirector cinematicDirector;
        public bool resumeOnStart = true;
        public bool attenuatedAccidents = true;
        public CampaignData Data { get; private set; }
        public CampaignSave State { get; private set; }
        public DialogueDefinition Dialogue { get; private set; }
        public EndingDefinition Ending { get; private set; }
        public string Message { get; private set; } = "";
        public string Subtitle { get; set; } = "";
        bool userPaused;
        public bool UserPaused
        {
            get => userPaused || GetComponent<AdventureMenus>()?.IsOpen == true || GetComponent<CampaignMap>()?.IsOpen == true;
            private set => userPaused = value;
        }
        public bool BrowserInputSuspended { get; private set; }
        public bool IsBusy { get; private set; }
        public bool StartupReady { get; private set; }
        public string StartupError { get; private set; }
        bool launching, orientationBlocked, backgroundBlocked, reportedControlFault;
        readonly HashSet<string> startupSaves = new HashSet<string>();
        public bool IsModal => (ActiveControlLocks & ~(ControlLocks.Loading | ControlLocks.Busy)) != ControlLocks.None;
        public bool IsPaused => (ActiveControlLocks & (ControlLocks.PauseMenu | ControlLocks.Settings |
            ControlLocks.Orientation | ControlLocks.Background | ControlLocks.BrowserFocus)) != 0;
        public bool BrowserPointerLocked { get; internal set; }
        public bool ControlsAvailable => ActiveControlLocks == ControlLocks.None && GameplayRigAvailable();
        public ControlLocks ActiveControlLocks
        {
            get
            {
                var locks = ControlLocks.None;
                if (State == null) locks |= ControlLocks.Loading;
                if (StartupError != null) locks |= ControlLocks.Error;
                if (BrowserInputSuspended) locks |= ControlLocks.BrowserFocus;
                if (orientationBlocked) locks |= ControlLocks.Orientation;
                if (backgroundBlocked) locks |= ControlLocks.Background;
                var menus = GetComponent<AdventureMenus>();
                if (UserPaused)
                    locks |= menus?.IsOpen == true && menus.Mode == "Réglages" ? ControlLocks.Settings : ControlLocks.PauseMenu;
                if (Dialogue != null) locks |= ControlLocks.Dialogue;
                if (QuestOverlay) locks |= ControlLocks.Question;
                if (IncidentModal || GetComponent<VillageUpgradeViewV18>()?.Open == true) locks |= ControlLocks.Inspection;
                var activity = GetComponent<CampaignActivitiesV17>();
                if (activity?.BlocksGameplay == true)
                    locks |= activity.Current.mode == "assemble" ? ControlLocks.SSTAssembly : ControlLocks.Activity;
                if (MenhirActive) locks |= ControlLocks.Activity;
                if (IsBusy) locks |= ControlLocks.Busy;
                if (cinematicDirector?.IsPlaying == true || GetComponent<ConstructionFilmV19>()?.Playing == true ||
                    GetComponent<VillageUpgradeV18>()?.Presenting == true) locks |= ControlLocks.Cinematic;
                if (Ending != null) locks |= ControlLocks.GameOver;
                return locks;
            }
        }

        public string InterfaceState
        {
            get
            {
                var locks = ActiveControlLocks;
                if (locks.HasFlag(ControlLocks.Error)) return "ERROR";
                if (locks.HasFlag(ControlLocks.Loading)) return "LOADING";
                if (locks.HasFlag(ControlLocks.Cinematic)) return "CINEMATIC";
                if (locks.HasFlag(ControlLocks.GameOver)) return "GAME_OVER";
                if (locks.HasFlag(ControlLocks.Dialogue)) return "DIALOGUE";
                if (locks.HasFlag(ControlLocks.Question)) return "QUESTION";
                if (locks.HasFlag(ControlLocks.SSTAssembly)) return "SST_ASSEMBLY";
                if (locks.HasFlag(ControlLocks.Inspection)) return "INSPECTION";
                if ((locks & (ControlLocks.Activity | ControlLocks.Busy)) != 0) return "ACTIVITY";
                if (locks.HasFlag(ControlLocks.Settings)) return "SETTINGS";
                return locks == ControlLocks.None ? "GAMEPLAY" : "PAUSE";
            }
        }
        public ActDefinition CurrentAct => Data != null && State != null && State.actIndex >= 0 && State.actIndex < Data.acts.Length ? Data.acts[State.actIndex] : null;
        public float RemainingSeconds => State == null || Data == null ? 0 : Mathf.Max(0, Data.durationSeconds - State.elapsedSeconds);
        public event Action Changed;
        private string pendingAction;
        public ActionDefinition CurrentAction=>Data?.actions.FirstOrDefault(a=>a.id==pendingAction);
        private string actionMenuBinding;
        private int actionMenuPage;
        readonly Dictionary<string,ActionDefinition[]> actionCache=new Dictionary<string,ActionDefinition[]>(); CampaignSave cachedActionState;
        #if UNITY_EDITOR || DEVELOPMENT_BUILD
        public bool DebugDisableActionCache;
        #endif
        private float notifyTimer, autosaveTimer;
        private bool VerificationSession=>StandaloneVerification.Requested||FilmRecorder.Requested||LocomotionAudit.Requested||InterfaceAudit.Requested||QuestIntegrationAudit.Requested||(Application.isEditor&&Environment.GetCommandLineArgs().Any(a=>a.StartsWith("UngaBunga45001.Editor.")&&(a.Contains("Audit")||a.Contains("Review")||a.Contains("Portrait"))));
        private string SavePath => TribalInterfaceAudit.Requested?Path.Combine(TribalInterfaceAudit.IsolatedSaveRoot,Data.id+".json"):QuestIntegrationAudit.Requested?Path.Combine(QuestIntegrationAudit.IsolatedSaveRoot,Data.id+".json"):Path.Combine(VerificationSession?Application.temporaryCachePath:Application.persistentDataPath,VerificationSession?"unga-bunga-verification":"thaleolithic",Data.id+".json");
        public string CurrentSavePath=>SavePath;

        private void Start()
        {
            try { PrepareScene(); }
            catch (Exception error)
            {
                StartupError = error.Message;
                Debug.LogException(error, this);
                enabled = false;
            }
        }

        private void PrepareScene()
        {
            if (campaignJson == null || bindings == null) throw new InvalidOperationException("Campagne et SceneBindings requis.");
            Data = JsonUtility.FromJson<CampaignData>(campaignJson.text);
            PrepareQuestData();
            ValidateData();
            GetComponent<TemperateVillageV19>()?.PrepareData(this);
            if (!bindings.Validate(out string issues)) throw new InvalidOperationException("Bindings incomplets : " + issues);
            if (GetComponent<ChapterMotionV241>() == null) gameObject.AddComponent<ChapterMotionV241>();
            if (!GameplayRigAvailable(false) || cinematicDirector == null || GetComponent<UISettingsController>() == null)
                throw new InvalidOperationException("Le moteur, la caméra ou les réglages de Dylan sont absents.");
            CampaignSaveMigration.Ensure(this);
            CinematicWorldResetV15.For(this);
            if(GetComponent<CinematicTriggersV15>()==null)gameObject.AddComponent<CinematicTriggersV15>();
            CinematicWorldPropsV15.For(this);
            CinematicBuildingStateV16.For(this);
            VillageUpgradeV18.For(this);
            if(GetComponent<TemperateVillageV19>()!=null&&GetComponent<ConstructionFilmV19>()==null)gameObject.AddComponent<ConstructionFilmV19>();
            if(GetComponent<TemperateVillageV19>()!=null&&GetComponent<TemperateWeatherV19>()==null)gameObject.AddComponent<TemperateWeatherV19>();
            if(GetComponent<TemperateVillageV19>()!=null&&GetComponent<TemperateTreeVisibilityV19>()==null)gameObject.AddComponent<TemperateTreeVisibilityV19>();
            if(GetComponent<VillageUpgradeViewV18>()==null)gameObject.AddComponent<VillageUpgradeViewV18>();
            if(GetComponent<VillagePresentationViewV18>()==null)gameObject.AddComponent<VillagePresentationViewV18>();
            CinematicFireV18.For(this);
            if(GetComponent<NavigationCollidersV18>()==null)gameObject.AddComponent<NavigationCollidersV18>();
            if(GetComponent<NavEntryRepairV18>()==null)gameObject.AddComponent<NavEntryRepairV18>();
            if(GetComponent<WorkNavigationV18>()==null)gameObject.AddComponent<WorkNavigationV18>();
            if(GetComponent<MainQuestMarkerV18>()==null)gameObject.AddComponent<MainQuestMarkerV18>();
            StartupReady = true;
#if UNITY_WEBGL && !UNITY_EDITOR
            ReconcileControls();
#else
            BeginCampaign(false);
#endif
        }
        public void BeginCampaign(bool fresh)
        {
            if(Data==null)return;
            if (fresh || !resumeOnStart || !Load(SavePath)) NewCampaign();
            else ResumeCampaign();
        }

        void ResumeCampaign()
        {
            InitializeQuests();
            ResolveEnding();
            SyncWorld();
            CinematicSpawnSafetyV15.Repair(this);
            Notify();
            if (!string.IsNullOrEmpty(State.activeCinematicId)) cinematicDirector.Play(State.activeCinematicId);
        }

        public void BeginBrowserCampaign(bool fresh)
        {
            if (!StartupReady) throw new InvalidOperationException(StartupError ?? "La scène est en préparation.");
            launching = true;
            try
            {
                if (fresh) NewCampaign();
                else
                {
                    if (!Load(SavePath) && !Load(SavePath + ".bak"))
                        throw new InvalidDataException("La sauvegarde et sa copie de secours sont introuvables ou illisibles.");
                    ResumeCampaign();
                }
                ReconcileControls();
                if (CurrentAct == null || State.characters.Find(c => c.id == Data.playerCharacterId) == null ||
                    !GameplayRigAvailable(false) || (ActiveControlLocks == ControlLocks.None && !ControlsAvailable))
                    throw new InvalidOperationException("La campagne ou le contrôle de Dylan n’a pas été initialisé.");
            }
            catch
            {
                if (cinematicDirector.IsPlaying)
                {
                    cinematicDirector.enabled = false;
                    cinematicDirector.enabled = true;
                }
                GetComponent<CampaignActivitiesV17>()?.Suspend();
                State = null;
                startupSaves.Clear();
                ReconcileControls();
                throw;
            }
            finally { launching = false; }

            foreach (var path in startupSaves) TrySave(path);
            startupSaves.Clear();
        }

        bool GameplayRigAvailable(bool requireEnabled = true)
        {
            if (bindings == null || bindings.player == null || bindings.gameplayCamera == null) return false;
            var motor = bindings.player.GetComponent<ThirdPersonMotor>();
            var controller = bindings.player.GetComponent<CharacterController>();
            return motor != null && motor.viewCamera == bindings.gameplayCamera && controller != null &&
                (!requireEnabled || (motor.isActiveAndEnabled && controller.enabled && bindings.gameplayCamera.isActiveAndEnabled));
        }

        public void ReconcileControls()
        {
            if (bindings == null) return;
            var locks = ActiveControlLocks;
            bindings.SetGameplayBlocked(locks != ControlLocks.None);
            bool fault = locks == ControlLocks.None && !GameplayRigAvailable();
            if (fault && !reportedControlFault) Debug.LogError("GAMEPLAY actif alors que le moteur, le contrôleur ou la caméra de Dylan est indisponible.", this);
            reportedControlFault = fault;
        }

        public void SetMobileInterruption(bool portrait, bool background)
        {
            if (orientationBlocked == portrait && backgroundBlocked == background) return;
            orientationBlocked = portrait;
            backgroundBlocked = background;
            ReconcileControls();
        }
        private void ValidateData()
        {
            if (Data == null || string.IsNullOrEmpty(Data.id) || Data.acts.Length != 8 || Data.durationSeconds <= 0) throw new InvalidDataException("8 actes et durée positive requis.");
            if (Data.actions.GroupBy(a => a.id).Any(g => g.Count() > 1)) throw new InvalidDataException("Action ID dupliqué.");
            foreach (var act in Data.acts)
                foreach (var objective in act.objectives)
                    foreach (var id in objective.actionIds)
                        if (!Data.actions.Any(a => a.id == id)) throw new InvalidDataException("Action absente : " + id);
        }
        public void NewCampaign()
        {
            GetComponent<ConstructionFilmV19>()?.Cancel();
            GetComponent<ActivityActingV18>()?.ReleaseForFilm();GetComponent<WorkNavigationV18>()?.PrepareForFilm();GetComponent<VillageUpgradeViewV18>()?.Close();GetComponent<CampaignActivitiesV17>()?.Suspend();
            if(cinematicDirector.IsPlaying){bool active=cinematicDirector.enabled;cinematicDirector.enabled=false;cinematicDirector.enabled=active;}
            if(State!=null){var duel=GetComponent<MenhirDuel>();if(duel!=null&&duel.Active)duel.Leave();GetComponent<AccidentDirector>()?.ResetPresentation();}
            State = new CampaignSave { campaignId = Data.id };
            foreach (var v in Data.stats) State.stats.Add(new NamedValue(v.id, v.value));
            foreach (var v in Data.resources) State.resources.Add(new NamedValue(v.id, v.value));
            foreach (var c in Data.characters) State.characters.Add(new CharacterState { id = c.id,competence=c.id=="dylan"?15:c.id=="petit_os"?10:70 });
            Ending = null; Dialogue = null; userPaused = false; pendingAction = null; QuestPanel="";PresentedQuestId="";ConversationActorId="";InitializeQuests(true);
            CinematicWorldResetV15.For(this).Restore();CinematicWorldPropsV15.For(this);CinematicSpawnSafetyV15.Repair(this);EnterAct();
        }
        private void Update()
        {
            ReconcileControls();
            if (State == null || Ending != null) return;
            // V17 includes reading, decisions, travel, work and films in the measured campaign.
            if (!IsPaused && !(State.campaignV17?.freePlay??false) && !(cinematicDirector!=null&&cinematicDirector.IsPlaying&&cinematicDirector.SequenceState=="LOADING")) State.elapsedSeconds += Time.deltaTime;
            // An overrun is measured, never disguised as a completed campaign.
            if (ActivitiesV17==null && RemainingSeconds <= 0 && !IsModal && !IsBusy) FinishCampaign();
            notifyTimer += Time.unscaledDeltaTime; autosaveTimer += Time.unscaledDeltaTime;
            if (notifyTimer >= .25f) { notifyTimer = 0; Notify(); }
            float saveInterval=Application.platform==RuntimePlatform.WebGLPlayer?5:30;
            if (autosaveTimer >= saveInterval && !IsBusy && Dialogue == null && !(cinematicDirector != null && cinematicDirector.IsPlaying)) { autosaveTimer = 0; Save(); }
        }
        public void TogglePause() { if (Dialogue != null || Ending != null || QuestOverlay || IncidentModal) return; SetPause(!UserPaused); }
        public void SetPause(bool pause) { userPaused = pause; ReconcileControls(); Notify(); }
        public void SetBrowserInputSuspended(bool suspended)
        {
            if(BrowserInputSuspended==suspended)return;
            BrowserInputSuspended=suspended;
            ReconcileControls();
        }
        public bool HasFlag(string id) => State != null && State.flags.Contains(id);
        public float Value(string kind, string id)
        {
            if (State == null) return 0;
            var list = Values(kind); return list?.Find(v => v.id == id)?.value ?? 0;
        }
        private List<NamedValue> Values(string kind)
        {
            switch (kind) { case "stat": return State.stats; case "resource": return State.resources; case "risk": return State.risks; case "building": return State.buildings; default: return null; }
        }
        private bool FlagsMatch(string[] required, string[] forbidden) => (required == null || required.All(HasFlag)) && (forbidden == null || forbidden.All(f => !HasFlag(f)));
        public bool IsObjectiveComplete(ObjectiveDefinition goal) => goal.actionIds.All(id => State.completedActions.Contains(id)) || Data.quests.Any(q=>q.goalId==goal.id&&QuestState(q.id)?.status==QuestStatus.REPLACED&&(QuestState(QuestState(q.id).replacementId)?.claimed??false));
        public bool IsActComplete => CurrentAct != null && CurrentAct.objectives.Where(o => o.required).All(IsObjectiveComplete)&&Data.quests.Where(q=>q.required&&q.actId==CurrentAct.id).All(q=>QuestState(q.id)?.claimed==true||QuestState(q.id)?.status==QuestStatus.REPLACED&&(QuestState(QuestState(q.id).replacementId)?.claimed??false));
        public ActionDefinition[] ActionsFor(string bindingId)
        {
            if(Data==null||State==null)return Array.Empty<ActionDefinition>();
            if(cachedActionState!=State){actionCache.Clear();cachedActionState=State;}
            #if UNITY_EDITOR || DEVELOPMENT_BUILD
            if(!DebugDisableActionCache&&actionCache.TryGetValue(bindingId,out var cached))return cached;
            #else
            if(actionCache.TryGetValue(bindingId,out var cached))return cached;
            #endif
            var result=Data == null ? Array.Empty<ActionDefinition>() : Data.actions.Where(a => a.targetBindingId == bindingId && CurrentActAction(a) && (a.repeatable || !State.completedActions.Contains(a.id))).Where(a=>ActiveQuestAction(a,out _)).Concat(QuestInteractions(bindingId)).Concat(VillageActionsV18(bindingId)).OrderBy(a => CanExecute(a, out _) ? 0 : 1).ToArray();actionCache[bindingId]=result;return result;
        }
        bool CurrentActAction(ActionDefinition action)=>action.actId==CurrentAct?.id||action.actId=="*"||(State.campaignV17.freePlay&&action.actId=="FREE_V16");
        public bool CanExecute(ActionDefinition action, out string reason, bool ignoreInterface=false,string actingCharacterId=null)
        {
            reason = "";
            if (action == null || State == null) { reason = "Action inconnue."; return false; }
            if(!MenhirActionAllowed(action,out reason))return false;
            if (!ignoreInterface&&(IsModal || IsBusy)) { reason = "Termine l'action en cours."; return false; }
            if(action.interactionType=="FurnitureV19"&&!(GetComponent<TemperateVillageV19>()?.CanUse(action.id,out reason)??false))return false;
            if(action.id.StartsWith("travel:",StringComparison.Ordinal))return bindings.Find(action.targetBindingId)!=null&&(State.characters.FirstOrDefault(c=>c.id==action.targetBindingId)?.alive??true);
            if(action.id.StartsWith("quest:",StringComparison.Ordinal))return ActiveQuestAction(action,out reason)&&(State.characters.FirstOrDefault(c=>c.id==action.targetBindingId)?.alive??false);
            if(!ActiveQuestAction(action,out reason))return false;
            if(!StructuralCondition(action,out reason))return false;
            if(action.minimumCompetence>0&&(State.characters.Find(c=>c.id==(actingCharacterId??Data.playerCharacterId))?.competence??0)<action.minimumCompetence){reason="Compétence nécessaire : "+action.minimumCompetence.ToString("0");return false;}
            if (!CurrentActAction(action)) { reason = "Cette action appartient à un autre acte."; return false; }
            if (!action.repeatable && State.completedActions.Contains(action.id)) { reason = "Action déjà réalisée."; return false; }
            if (!FlagsMatch(action.requiredFlags, action.forbiddenFlags)) { reason = "Observe, consulte et prépare les conditions requises."; return false; }
            if (action.dangerous && Value("stat", "fatigue") >= 80) { reason = "Fatigue élevée : organise un repos avant cette intervention."; return false; }
            foreach (var cost in action.costs) if (Value("resource", cost.id) < cost.amount) { reason = "Ressource nécessaire : " + cost.id; return false; }
            var actor = State.characters.Find(c => c.id == action.targetBindingId);
            if (actor != null && (!actor.alive || !actor.available)) { reason = "Ce personnage n'est plus disponible. Affecte un remplaçant compétent."; return false; }
            return true;
        }
        public void Execute(string id)
        {
            var action = FindAction(id);
            if (!CanExecute(action, out string reason)) { Inform(reason); return; }
            if(action.interactionType=="ActivityV17"){GetComponent<CampaignActivitiesV17>().Begin(id);return;}
            if(id.StartsWith("upgrade:v18:")){GetComponent<VillageUpgradeViewV18>().Show(id.Substring(12));return;}
            if(action.interactionType=="Document"){OpenCareRegister();return;}
            if(id==MenhirActionId||id==MenhirReplayId){GetComponent<MenhirDuel>().Begin(id==MenhirReplayId);return;}
            if(action.id.StartsWith("quest:",StringComparison.Ordinal)){var parts=action.id.Split(':');OpenQuest(string.Join(":",parts.Skip(2)),parts[1]=="offer"?"Offer":"Details",true);return;}
            if(action.id.StartsWith("travel:",StringComparison.Ordinal))return;
            CaptureDecisionCheckpoint();ConversationActorId=State.characters.Any(c=>c.id==action.targetBindingId)?action.targetBindingId:"mathieu";
            if (!string.IsNullOrEmpty(action.dialogueId))
            {
                var dialogue = Data.dialogues.FirstOrDefault(d => d.id == action.dialogueId);
                if (dialogue == null) { Inform("Dialogue manquant : " + action.dialogueId); return; }
                pendingAction = id; Dialogue = dialogue; Notify(); return;
            }
            StartCoroutine(Perform(action));
        }
        public void OpenActionMenu(string bindingId, int page = 0)
        {
            var available=ActionsFor(bindingId).Where(a=>!a.id.StartsWith("travel:",StringComparison.Ordinal)).OrderBy(a=>InteractionContextResolver.Resolve(this,a).priority).ToArray();
            if(available.Length==0){Inform("Aucune action disponible ici pour le moment.");return;}
            ConversationActorId=State.characters.Any(c=>c.id==bindingId)?bindingId:"mathieu";actionMenuBinding=bindingId;actionMenuPage=Mathf.Clamp(page,0,(available.Length-1)/4);
            var choices=available.Skip(actionMenuPage*4).Take(4).Select(a=>new ChoiceDefinition{id="interaction:action:"+a.id,text=a.title,actionId=a.id}).ToList();
            if(actionMenuPage>0)choices.Add(new ChoiceDefinition{id="interaction:previous",text="Page précédente"});
            if((actionMenuPage+1)*4<available.Length)choices.Add(new ChoiceDefinition{id="interaction:next",text="Page suivante"});
            choices.Add(new ChoiceDefinition{id="interaction:cancel",text="Revenir au village"});
            Dialogue=new DialogueDefinition{id="interaction:"+bindingId+":"+actionMenuPage,speaker="Actions disponibles",text="Choisis une action ou une conversation.",choices=choices.ToArray()};Notify();
        }
        private IEnumerator Perform(ActionDefinition action)
        {
            IsBusy = true; Message = action.title; Notify();
            float elapsed = 0;
            float duration = action.durationSeconds * (action.dangerous && Value("stat", "energy") < 20 ? 1.5f : 1f);
            if(action.interactionType=="FurnitureV19")
            {var furniture=GetComponent<TemperateVillageV19>();yield return furniture.Use(action);if(!furniture.ActionSucceeded){IsBusy=false;Notify();yield break;}}
            else while (elapsed < duration) { if (!UserPaused) elapsed += Time.deltaTime; yield return null; }
            ApplyActionOutcome(action);
            IsBusy = false; SyncWorld(); Save(); Notify();
            if (!string.IsNullOrEmpty(action.cinematicId) && cinematicDirector != null) cinematicDirector.Play(action.cinematicId);
        }
        public void Choose(string choiceId)
        {
            if (Dialogue == null) return;
            var choice = Dialogue.choices.FirstOrDefault(c => c.id == choiceId);
            if (choice == null || !FlagsMatch(choice.requiredFlags, null)) return;
            if(choice.id.StartsWith("interaction:",StringComparison.Ordinal))
            {
                if(choice.id=="interaction:next"){Dialogue=null;OpenActionMenu(actionMenuBinding,actionMenuPage+1);return;}
                if(choice.id=="interaction:previous"){Dialogue=null;OpenActionMenu(actionMenuBinding,actionMenuPage-1);return;}
                Dialogue=null;Notify();
                if(!string.IsNullOrEmpty(choice.actionId))GetComponent<WorldInteraction>().Execute(choice.actionId);
                return;
            }
            if(!State.viewedDialogues.Contains(Dialogue.id))State.viewedDialogues.Add(Dialogue.id);
            foreach (var effect in choice.effects) Apply(effect);
            Record(choice.id, choice.text, string.Join(" ; ", choice.effects.Select(e => e.text).Where(s => !string.IsNullOrEmpty(s))));
            if (!string.IsNullOrEmpty(choice.nextDialogueId))
            {
                Dialogue = Data.dialogues.FirstOrDefault(d => d.id == choice.nextDialogueId);
                if (Dialogue == null) Debug.LogError("Dialogue suivant absent : " + choice.nextDialogueId, this);
            }
            else Dialogue = null;
            if (Dialogue == null)
            {
                string actionId = pendingAction; pendingAction = null;
                if (!string.IsNullOrEmpty(actionId))
                {
                    var a = Data.actions.FirstOrDefault(x => x.id == actionId);
                    if (a != null && !IncidentModal) StartCoroutine(Perform(a));
                }
                else if (!string.IsNullOrEmpty(choice.actionId) && !IncidentModal) Execute(choice.actionId);
                ConversationActorId="";
            }
            SyncWorld(); Notify();
        }
        public bool CanChoose(ChoiceDefinition choice) => FlagsMatch(choice.requiredFlags, null);
        public void Apply(EffectDefinition effect)
        {
            if (string.IsNullOrEmpty(effect.target) || !FlagsMatch(effect.requiredFlags, effect.forbiddenFlags)) return;
            if (effect.kind == "flag") { if (effect.value > 0 && !HasFlag(effect.target)) State.flags.Add(effect.target); else if (effect.value <= 0) State.flags.Remove(effect.target); return; }
            if(effect.kind=="accident"){GetComponent<AccidentDirector>()?.Request(effect.target);return;}
            if (effect.kind == "evidence") { if (!State.evidence.Contains(effect.target)) State.evidence.Add(effect.target); return; }
            if (effect.kind == "character")
            {
                string[] part = effect.target.Split('.');
                var c = State.characters.Find(x => x.id == part[0]);
                if (c == null || part.Length != 2) return;
                switch (part[1])
                {
                    case "alive": if(effect.value<=0&&c.alive&&GetComponent<AccidentDirector>()?.RequestFatal(c.id)==true)return; if (effect.value <= 0) { c.alive = false; c.available = false; c.life = 0; c.health = "décédé"; } break;
                    case "life": c.life = Mathf.Clamp(effect.operation == "add" ? c.life + effect.value : effect.value, 0, 100); if (c.life <= 0) { c.alive = false; c.available = false; } break;
                    case "energy": c.energy = Mathf.Clamp(c.energy + effect.value, 0, 100); break;
                    case "fatigue": c.fatigue = Mathf.Clamp(c.fatigue + effect.value, 0, 100); break;
                    case "competence": c.competence = Mathf.Clamp(c.competence + effect.value, 0, 100); break;
                    case "trust": c.trust = Mathf.Clamp(c.trust + effect.value, 0, 100); break;
                    case "assignment": c.assignment = effect.text; break;
                }
                if(c.id==Data.playerCharacterId)
                {
                    string stat=part[1]=="alive"||part[1]=="life"?"life":part[1]=="energy"?"energy":part[1]=="fatigue"?"fatigue":null;
                    if(stat!=null){var linked=State.stats.Find(v=>v.id==stat);if(linked!=null)linked.value=stat=="life"?c.life:stat=="energy"?c.energy:c.fatigue;}
                }
                return;
            }
            var list = Values(effect.kind); if (list == null) { Debug.LogError("Effet inconnu : " + effect.kind, this); return; }
            var value = list.Find(v => v.id == effect.target); if (value == null) { value = new NamedValue(effect.target, 0); list.Add(value); }
            value.value = effect.operation == "add" ? value.value + effect.value : effect.value;
            if (effect.kind == "stat") { var definition = Data.stats.FirstOrDefault(v => v.id == effect.target); value.value = Mathf.Clamp(value.value, definition?.min ?? 0, definition?.max ?? 100); }
            if (effect.kind == "resource") value.value = Mathf.Max(0, value.value);
            if(effect.kind=="stat")
            {
                var player=State.characters.Find(c=>c.id==Data.playerCharacterId);if(player!=null)switch(effect.target){case "life":player.life=value.value;break;case "energy":player.energy=value.value;break;case "fatigue":player.fatigue=value.value;break;case "food":player.hunger=100-value.value;break;}
            }
        }
        public void AdvanceAct()
        {
            if (!IsActComplete || IsModal || IsBusy) { Inform("Termine les objectifs indispensables de l'acte."); return; }
            if (State.actIndex + 1 >= Data.acts.Length) { FinishCampaign(); return; }
            State.actIndex++; EnterAct();
        }
        private void EnterAct()
        {
            if (CurrentAct != null) SetDerivedFlag("entered:" + CurrentAct.id, true);
            SyncWorld(); Save(); Save(CheckpointPath(State.actIndex)); Notify();
            if (!string.IsNullOrEmpty(CurrentAct?.introCinematicId) && cinematicDirector != null) cinematicDirector.Play(CurrentAct.introCinematicId);
        }
        private string CheckpointPath(int act) => Path.Combine(Path.GetDirectoryName(SavePath), Data.id + ".act-" + act + ".json");
        public void ReplayAct(int act)
        {
            if (act < 0 || act >= Data.acts.Length || IsBusy || (cinematicDirector != null && cinematicDirector.IsPlaying)) return;
            if (!Load(CheckpointPath(act))) { Inform("Cet acte n'a pas encore de point de reprise."); return; }
            Dialogue = null; pendingAction = null; userPaused = false; Ending = null;
            ResolveEnding(); SyncWorld(); Save(); Notify();
        }
        public void FinishCampaign()
        {
            SetDerivedFlag("criticalRisksControlled", State.risks.Count > 0 && State.risks.All(r => r.value < 2));
            SetDerivedFlag("noUntreatedCatastrophe", State.characters.All(c => c.alive) || HasFlag("events_analyzed"));
            SetDerivedFlag("systemVerified", Data.acts.SelectMany(a => a.objectives).Where(o => o.required).All(IsObjectiveComplete));
            // A high score never cancels an untreated lethal risk. Endings depend on explicit flags.
            var ending = Data.endings.OrderByDescending(e => e.priority).FirstOrDefault(e => FlagsMatch(e.requiredFlags, e.forbiddenFlags));
            if (ending == null) { Inform("Aucune fin ne correspond à l'état de la partie."); return; }
            Ending = ending; State.endingId = ending.id; Save(); Notify();
        }
        private void SetDerivedFlag(string id, bool value) { if (value && !HasFlag(id)) State.flags.Add(id); else if (!value) State.flags.Remove(id); }
        private void ResolveEnding() { Ending = string.IsNullOrEmpty(State.endingId) ? null : Data.endings.FirstOrDefault(e => e.id == State.endingId); }
        private void Record(string id, string text, string consequence) { State.history.Add(new DecisionRecord { id = id, text = text, consequence = consequence, elapsedSeconds = State.elapsedSeconds }); }
        public void Inform(string text) { Message = text; Notify(); }
        private void Notify() { ReconcileControls(); actionCache.Clear(); RefreshQuests(); Changed?.Invoke(); }
        private void SyncWorld() { if (bindings != null && State != null){bindings.Apply(State, attenuatedAccidents);RefreshStructuralClosure();GetComponent<ActivityWorldV17>()?.InvalidatePainting();} }
        public void Save() { if (Data != null && State != null) Save(SavePath); }
        private void Save(string path) => TrySave(path);
        private bool TrySave(string path)
        {
            if (launching) { startupSaves.Add(path); return true; }
            if(TribalInterfaceAudit.Requested&&!Path.GetFullPath(path).StartsWith(Path.GetFullPath(TribalInterfaceAudit.IsolatedSaveRoot)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("V8 audit write outside isolated directory refused.");
            if(QuestIntegrationAudit.Requested&&!Path.GetFullPath(path).StartsWith(Path.GetFullPath(QuestIntegrationAudit.IsolatedSaveRoot)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Audit write outside isolated directory refused.");
            try
            {
                GetComponent<VillageLife>()?.Capture();
                GetComponent<CinematicWildlifeV15>()?.Capture();
                GetComponent<CinematicStage>()?.Production?.CaptureActors();
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                string temporary = path + ".tmp"; File.WriteAllText(temporary, JsonUtility.ToJson(State, true));
                if (File.Exists(path)) File.Replace(temporary,path,path+".bak",true); else File.Move(temporary, path);
                MobileBrowserBridge.Flush();
                return true;
            }
            catch (Exception e) { Message = "Sauvegarde impossible : " + e.Message; Debug.LogError(Message, this); return false; }
        }
        private bool Load(string path)
        {
            if(TribalInterfaceAudit.Requested&&!Path.GetFullPath(path).StartsWith(Path.GetFullPath(TribalInterfaceAudit.IsolatedSaveRoot)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("V8 audit read outside isolated directory refused.");
            if(QuestIntegrationAudit.Requested&&!Path.GetFullPath(path).StartsWith(Path.GetFullPath(QuestIntegrationAudit.IsolatedSaveRoot)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Audit read outside isolated directory refused.");
            if (!File.Exists(path)) return false;
            try
            {
                var candidate = JsonUtility.FromJson<CampaignSave>(File.ReadAllText(path));
                if (candidate == null || candidate.campaignId != Data.id || candidate.version != 1 || candidate.actIndex < 0 || candidate.actIndex >= Data.acts.Length) return false;
                if(GetComponent<TemperateVillageV19>()!=null&&candidate.environmentSchema<TemperateVillageV19.CurrentEnvironmentSchema)
                {string backup=path+(candidate.environmentSchema<19?".pre-temperate-v19.bak":".pre-temperate-v19-banks.bak");if(!File.Exists(backup))File.Copy(path,backup,false);TemperateVillageV19.Migrate(candidate);}
                RestoreVerifiedShelter(candidate);
                State = candidate; InitializeQuests(); return true;
            }
            catch (Exception e) { Debug.LogWarning("Sauvegarde illisible : " + e.Message, this); return false; }
        }
        private void OnApplicationPause(bool paused) { if (paused) Save(); }
        private void OnApplicationQuit() => Save();
        private void OnDisable() { if (bindings != null) bindings.SetGameplayBlocked(StartupError != null); }
    }
}
