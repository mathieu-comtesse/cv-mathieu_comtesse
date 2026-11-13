namespace UngaBunga45001
{
    internal static class ActivityGuideV244
    {
        public static string Instruction(ActivityDefinitionV17 activity) => activity.mode switch {
            "sort" => "Classe quatre observations sur la sécurité. Force et faiblesse viennent du village. Opportunité et menace viennent de l’extérieur.",
            "pair" => "Associe chaque situation au besoin ou à la réponse qui lui correspond.",
            "scope" => "Indique ce qui entre dans le périmètre de prévention de la tribu.",
            "assemble" => "Interagis avec le Grand Menhir. Associe quatre tablettes aux fonctions du système SST.",
            "risk" => "Observe le poste, évalue le risque et choisis une mesure adaptée à l’exposition.",
            "vote" => "Choisis les objectifs avec les travailleurs et identifie comment mesurer leur effet.",
            "allocation" => "Répartis les moyens selon les besoins. Utilise les boutons + et −.",
            "briefing" => "Réponds aux messages de sécurité et déplace Dylan latéralement pour esquiver les fruits.",
            "swipe" => "Classe chaque document. Glisse la tablette ou sélectionne une destination.",
            "differences" => "Sélectionne un repère sur les deux stèles, puis explique ce qui a changé.",
            "prepare" => "Prépare le départ, les rôles et le contrôle des présents avant le signal.",
            "runner" => "Réponds aux consignes puis suis le GPS vers le point de rassemblement.",
            "debrief" => "Compare les faits de l’évacuation avec la procédure et relève les écarts.",
            "dashboard" => "Lis les chiffres du village et sélectionne l’indicateur qui répond à la question.",
            "audit" => "Écoute la demande de l’esprit auditeur. Présente une preuve enregistrée qui y répond.",
            "review" => "Croise les indicateurs, les preuves et les écarts avant de choisir une décision de direction.",
            "corrective" => "Cherche la cause et choisis une action qui évite que l’événement se répète.",
            "improvement" => "Appuie-toi sur les résultats vérifiés pour définir le prochain cycle.",
            _ => activity.title
        };

        public static string Success(ActivityDefinitionV17 activity) => activity.mode switch {
            "assemble" => "Relie les quatre tablettes, puis choisis « Valider l’assemblage ».",
            "risk" => "Réalise la mesure sur le poste, puis utilise « Contrôler l’effet sur le poste ».",
            "allocation" => "Couvre les besoins des trois postes, puis valide l’affectation.",
            "differences" => $"Relie au moins {activity.minimum} observations, dont les critiques et les notions requises, puis valide.",
            "runner" => "Arrive au point de rassemblement, attends les personnes attendues puis vérifie la présence.",
            "briefing" => "Transmets tous les messages puis termine le point sécurité.",
            "audit" => "Réponds à chaque demande avec une preuve vérifiée du Carnet des Crânes.",
            _ => $"Valide les {activity.cards.Length} réponses. La preuve s’enregistre dans le Carnet des Crânes."
        };

        public static string Controls(ActivityDefinitionV17 activity)
        {
            if (activity.mode == "runner") return "Déplace Dylan au clavier ou au joystick tactile. Sélectionne les réponses à l’écran.";
            if (activity.mode == "briefing") return "Utilise ↑ et ↓ puis Entrée pour répondre. Les flèches gauche et droite déplacent Dylan.";
            if (activity.mode == "assemble" || activity.mode == "sort" || activity.mode == "swipe")
                return "Glisse la tablette ou choisis une réponse au clic, au toucher, ou avec les flèches puis Entrée.";
            return "Clique ou touche une réponse. Au clavier, déplace le choix avec les flèches puis valide avec Entrée.";
        }
    }
}
