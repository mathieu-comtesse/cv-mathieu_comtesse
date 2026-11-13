using System.Linq;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace UngaBunga45001
{
    [DefaultExecutionOrder(-60)]
    public sealed class WorldInteraction : MonoBehaviour
    {
        public CampaignRuntime campaign;
        public float interactionDistance = 3.5f;
        static readonly Unity.Profiling.ProfilerMarker UpdateMarker=new Unity.Profiling.ProfilerMarker("THALEOLITHIC.Interactions");
        public string FocusBindingId { get; private set; }
        public ActionDefinition[] FocusActions => string.IsNullOrEmpty(FocusBindingId) ? System.Array.Empty<ActionDefinition>() : campaign.ActionsFor(FocusBindingId);
        public ActionDefinition FocusInspection { get; private set; }
        private void Update()
        {
            using var profile=UpdateMarker.Auto();
            if (campaign == null || campaign.State == null) return;
            FocusInspection = null;
            if (PressedEscape() && GetComponent<UISettingsController>()?.ConsumedEscapeFrame!=Time.frameCount)
            {
                HandleEscape();FocusBindingId=null;return;
            }
            if(GetComponent<ConstructionFilmV19>()?.Playing??false){FocusBindingId=null;return;}
            if(GetComponent<CampaignActivitiesV17>()?.Active??false){FocusBindingId=null;return;}
            if (campaign.IsModal || campaign.IsBusy) { FocusBindingId = null; return; }
            FocusBindingId = null; float nearest = interactionDistance;
            var step = campaign.Objectives.Current;
            if (step?.Action?.interactionType == "Inspection" &&
                campaign.BindingDistance(step.TargetBindingId) <= interactionDistance && campaign.CanExecute(step.Action, out _))
                FocusInspection = step.Action;
            if (step?.Action != null && step.Phase != ObjectivePhase.Travel && campaign.BindingDistance(step.TargetBindingId) <= interactionDistance)
                FocusBindingId = step.TargetBindingId;
            else foreach (var binding in campaign.bindings.objects)
            {
                if (binding.target == null || !binding.target.gameObject.activeInHierarchy) continue;
                float distance=campaign.BindingDistance(binding.id);float squaredDistance=distance*distance;
                if(squaredDistance>nearest*nearest||campaign.ActionsFor(binding.id).Length==0)continue;
                nearest=Mathf.Sqrt(squaredDistance);FocusBindingId=binding.id;
            }
            if (PressedInteract() && (FocusInspection != null || FocusActions.Length > 0))
                Interact();
        }
        public void HandleEscape()
        {
            if(campaign?.State==null||campaign.BrowserInputSuspended)return;
            var settings=GetComponent<UISettingsController>();
            if(settings!=null)
            {
                if(settings.Rebinding!=null||settings.ConsumedEscapeFrame==Time.frameCount)return;
                settings.ConsumedEscapeFrame=Time.frameCount;
            }
            var film=GetComponent<ConstructionFilmV19>();
            if(film?.Playing==true){film.Skip();return;}
            if(campaign.cinematicDirector.IsPlaying||campaign.IncidentModal||campaign.Ending!=null)return;
            var duel=GetComponent<MenhirDuel>();
            if(duel?.Active==true){duel.Pause();return;}
            if(campaign.Dialogue!=null||campaign.QuestOverlay){GetComponent<QuestDialogueUI>()?.Back();return;}
            var activity=GetComponent<CampaignActivitiesV17>();
            if(activity?.Active==true)
            {
                if(activity.Current.mode=="assemble")activity.ToggleSstExitPrompt();
                else activity.Suspend();
                return;
            }
            var upgrade=GetComponent<VillageUpgradeViewV18>();
            if(upgrade?.Open==true){upgrade.Close();return;}
            var menus=GetComponent<AdventureMenus>();
            if(menus?.IsOpen==true){menus.Back();return;}
            var map=GetComponent<CampaignMap>();
            if(map?.IsOpen==true){map.Close();return;}
            menus?.Open("Pause");
        }
        public void RestoreControls()
        {
            var menus=GetComponent<AdventureMenus>();
            if(menus?.Mode!="Pause"||!menus.IsOpen)return;
            MobileControls.Instance?.ResetTransientInput();
            menus.Resume();
        }
        public void Interact()
        {
            if(campaign.IsModal||campaign.IsBusy)return;
            if(FocusInspection!=null){Execute(FocusInspection.id);return;}
            if(SstFocused()){Execute(QuestGuidanceV243.Sst);return;}
            var available=FocusActions.Where(a=>campaign.CanExecute(a,out _)).ToArray();
            if(available.Length>1)campaign.OpenActionMenu(FocusBindingId);
            else if(available.Length==1)Execute(available[0].id);
        }
        bool SstFocused() => GetComponent<QuestNavigationController>()?.Action?.id == QuestGuidanceV243.Sst &&
            campaign.BindingDistance(QuestGuidanceV243.Menhir) <= interactionDistance &&
            campaign.CanExecute(campaign.FindAction(QuestGuidanceV243.Sst),out _);
        public void Execute(string id)
        {
            var action = campaign.FindAction(id);
            var target = action == null ? null : campaign.bindings.Find(action.targetBindingId);
            if (target == null || campaign.BindingDistance(action.targetBindingId) > interactionDistance) { campaign.Inform("Rejoins d'abord le lieu de l'action."); return; }
            if(campaign.CanExecute(action,out _))GetComponent<UISettingsController>()?.Learn(4);
            campaign.Execute(id);
        }
        private bool PressedInteract()
        {
#if ENABLE_INPUT_SYSTEM
            return (GetComponent<UISettingsController>()?.Pressed("interact")??false) ||
                Gamepad.current?.buttonWest.wasPressedThisFrame == true;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKeyDown(KeyCode.E);
#else
            return false;
#endif
        }
        private bool PressedEscape()
        {
#if ENABLE_INPUT_SYSTEM
            return Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame && GetComponent<UISettingsController>()?.Rebinding==null;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKeyDown(KeyCode.Escape);
#else
            return false;
#endif
        }
    }
}
