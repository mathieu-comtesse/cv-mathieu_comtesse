using System.Linq;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace UngaBunga45001
{
    public sealed class WorldInteraction : MonoBehaviour
    {
        public CampaignRuntime campaign;
        public float interactionDistance = 3.5f;
        public string FocusBindingId { get; private set; }
        public ActionDefinition[] FocusActions => string.IsNullOrEmpty(FocusBindingId) ? System.Array.Empty<ActionDefinition>() : campaign.ActionsFor(FocusBindingId);
        private void Update()
        {
            if (campaign == null || campaign.State == null) return;
            var map=GetComponent<CampaignMap>();
            if (PressedEscape() && GetComponent<UISettingsController>()?.ConsumedEscapeFrame!=Time.frameCount && !(map?.IsOpen??false) && (map==null||map.ConsumedEscapeFrame!=Time.frameCount)){GetComponent<AdventureMenus>().Open("Réglages");}
            if (campaign.IsModal || campaign.IsBusy) { FocusBindingId = null; return; }
            FocusBindingId = null; float nearest = interactionDistance;
            foreach (var binding in campaign.bindings.objects)
            {
                if (binding.target == null || !binding.target.gameObject.activeInHierarchy) continue;
                float distance=campaign.BindingDistance(binding.id);float squaredDistance=distance*distance;
                if(squaredDistance>nearest*nearest||campaign.ActionsFor(binding.id).Length==0)continue;
                nearest=Mathf.Sqrt(squaredDistance);FocusBindingId=binding.id;
            }
            if (PressedInteract() && FocusActions.Length > 0)
                Interact();
        }
        public void Interact()
        {
            if(campaign.IsModal||campaign.IsBusy)return;
                var available=FocusActions.Where(a=>campaign.CanExecute(a,out _)).ToArray();
                if(available.Length>1)campaign.OpenActionMenu(FocusBindingId);
                else if(available.Length==1)Execute(available[0].id);
        }
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
            return GetComponent<UISettingsController>()?.Pressed("interact")??false;
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
