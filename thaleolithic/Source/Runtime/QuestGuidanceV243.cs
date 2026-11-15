using System.Linq;
using UnityEngine;
using UnityEngine.InputSystem;

namespace UngaBunga45001
{
    internal static class QuestGuidanceV243
    {
        public const string Sst = "V17_SYSTEM";
        public const string Menhir = "grand_menhir";
        public const string AtMenhir = "Grand Menhir atteint. Interagis pour assembler le système SST.";

        public static string Command(UISettingsController settings, ObjectivePhase phase = ObjectivePhase.Interact)
        {
            if (phase == ObjectivePhase.Travel)
            {
                if (MobileControls.TouchActive) return "Joystick";
                string directions = settings == null ? "W A S D" :
                    $"{settings.Binding("forward")} {settings.Binding("left")} {settings.Binding("back")} {settings.Binding("right")}";
                return Gamepad.current != null ? "Stick gauche / " + directions : directions;
            }
            if (MobileControls.TouchActive) return "Bouton Interagir";
            return (settings?.Binding("interact") ?? "E") + (Gamepad.current != null ? " / Manette X" : "");
        }

        public static string Site(CampaignRuntime campaign, string binding)
        {
            if (string.IsNullOrEmpty(binding)) return "Village";
            string character = campaign.CharacterName(binding);
            if (character != binding) return character;
            return binding switch {
                Menhir => "Grand Menhir", "habitations" => "Habitations", "atelier_silex" => "Atelier de silex",
                "foyer" => "Foyer", "stockage" => "Réserves", "bois_construction" => "Poste des bûcherons",
                "pierre_carriere" => "Carrière", "chasse_clairiere" => "Clairière de chasse",
                "rassemblement" => "Point de rassemblement", "repos" => "Infirmerie", "charpente" => "Charpente",
                _ => char.ToUpperInvariant(binding[0]) + binding.Substring(1).Replace('_', ' ')
            };
        }

        public static string Instruction(CampaignRuntime campaign, ActionDefinition action)
        {
            if (action.id == Sst) return campaign.Near(Menhir) ? AtMenhir : "Interagis avec le Grand Menhir pour commencer l’assemblage.";
            if (action.id.StartsWith("travel:")) return "Rejoins " + Site(campaign, action.targetBindingId) + ".";
            if (action.id.StartsWith("quest:")) return "Ouvre la conversation avec " + campaign.CharacterName(action.targetBindingId) + ".";
            return "Interagis " + (campaign.CharacterName(action.targetBindingId) == action.targetBindingId ? "au point indiqué." :
                "avec " + campaign.CharacterName(action.targetBindingId) + ".");
        }

        public static string Brief(CampaignRuntime campaign, QuestDefinition quest, ActionDefinition action)
        {
            var activity = campaign.ActivitiesV17?.activities.FirstOrDefault(candidate => candidate.id == action.id);
            string issuer = campaign.CharacterName(quest.giverId);
            string actor = activity != null && !string.IsNullOrEmpty(activity.actor)
                ? campaign.CharacterName(activity.actor) : campaign.CharacterName(action.targetBindingId);
            if (activity == null && actor == action.targetBindingId) actor = issuer;
            int index = System.Array.IndexOf(quest.actionIds, action.id);
            string next = index >= 0 && index + 1 < quest.actionIds.Length
                ? campaign.FindAction(quest.actionIds[index + 1])?.title : null;
            var record = campaign.QuestState(quest.id);
            next ??= record.status == QuestStatus.READY_TO_CLAIM ? "Recevoir les récompenses et suivre la prochaine mission." :
                record.status == QuestStatus.READY_TO_VALIDATE ? "Récupérer les récompenses auprès de " + issuer + "." :
                !record.accepted ? campaign.FindAction(quest.actionIds.FirstOrDefault() ?? "")?.title :
                "Présenter le résultat à " + issuer + " pour valider la mission.";
            string result = action.id == Sst ? "Relier les quatre fonctions du système de management de la SST." : action.title;
            string progress = "";
            if (activity != null && activity.cards.Length > 0)
            {
                int count = campaign.GetComponent<CampaignActivitiesV17>()?.Progress(action.id)?.answers.Count ?? 0;
                progress = $"\nProgression · {count}/{activity.cards.Length}" + (action.id == Sst ? " tablettes reliées" : "");
            }
            string step = action.id == Sst
                ? (campaign.Near(Menhir) ? "Interagir avec le Grand Menhir" : "Rejoindre le Grand Menhir")
                : action.title;
            return $"ISO 45001 · {activity?.clause ?? string.Join(" · ", quest.iso)}\nObjectif · {result}" +
                $"\nRéférent · {actor}\nLieu · {Site(campaign, action.targetBindingId)}\nÉtape actuelle · {step}" +
                $"\nAction · {Instruction(campaign, action)} ({Command(campaign.GetComponent<UISettingsController>())})" + progress +
                $"\nEnsuite · {next ?? "Suivre la mission dans le journal."}";
        }
    }
}
