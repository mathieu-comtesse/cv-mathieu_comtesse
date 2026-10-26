using System;
using System.Linq;
namespace UngaBunga45001
{
    public sealed class KnowledgeClause
    {
        public string id,title,phase,target,giver;
        public bool Intro=>id=="1"||id=="2"||id=="3";
        public KnowledgeClause(string line){var parts=line.Split('|');id=parts[0];title=parts[1];int chapter=int.Parse(id.Split('.')[0]);phase=chapter<4?"Repères":chapter<=6?"Planifier":chapter<=8?"Agir":chapter==9?"Vérifier":"Améliorer";target=chapter==7?"atelier_silex":chapter==8?"foyer":chapter==9?"grand_menhir":chapter==10?"charpente":"rassemblement";giver=chapter==5?"lorette":chapter==8?"georges":"mathieu";}
    }
    public static class KnowledgeCatalog
    {
        // Original teaching labels, not a reproduction of the normative text.
        public static readonly KnowledgeClause[] Clauses=new[]{
            "1|À quoi sert le système ?","2|Se repérer dans les références","3|Partager les mots de la prévention",
            "4|Comprendre le village","4.1|Observer le contexte et le climat","4.2|Écouter les attentes, y compris climatiques","4.3|Délimiter les activités concernées","4.4|Relier les activités du système",
            "5|Diriger et participer","5.1|Engager la direction","5.2|Transformer la politique en engagements","5.3|Attribuer les rôles et les moyens","5.4|Consulter et faire participer",
            "6|Préparer l’action","6.1|Risques et possibilités de progrès","6.1.1|Organiser l’analyse","6.1.2|Observer dangers, risques et opportunités","6.1.2.1|Repérer les dangers réels","6.1.2.2|Apprécier l’exposition et la gravité","6.1.2.3|Trouver des possibilités d’amélioration","6.1.3|Repérer les obligations applicables","6.1.4|Préparer les réponses","6.2|Choisir des objectifs utiles","6.2.1|Rendre les objectifs observables","6.2.2|Planifier les moyens et le suivi",
            "7|Soutenir les équipes","7.1|Prévoir les ressources","7.2|Vérifier les compétences","7.3|Faire comprendre les dangers","7.4|Faire circuler l’information","7.4.1|Choisir quoi communiquer et à qui","7.4.2|Communiquer dans la tribu","7.4.3|Informer les intervenants extérieurs","7.5|Conserver les informations utiles","7.5.1|Choisir les traces nécessaires","7.5.2|Créer et actualiser les traces","7.5.3|Retrouver la bonne version",
            "8|Maîtriser les activités","8.1|Préparer et maîtriser le travail","8.1.1|Organiser les opérations","8.1.2|Agir sur la source des dangers","8.1.3|Évaluer les changements","8.1.4|Maîtriser les acquisitions","8.1.4.1|Vérifier les fournitures","8.1.4.2|Coordonner les intervenants","8.1.4.3|Suivre les activités confiées à d’autres","8.2|Se préparer aux urgences",
            "9|Évaluer les résultats","9.1|Mesurer et interpréter","9.1.1|Choisir des observations fiables","9.1.2|Évaluer les obligations retenues","9.2|Auditer le fonctionnement","9.2.1|Vérifier avec des preuves","9.2.2|Préparer le programme d’audit","9.3|Examiner les résultats en conseil",
            "10|Améliorer dans la durée","10.1|Choisir les améliorations","10.2|Comprendre les événements et corriger","10.3|Entretenir le progrès"
        }.Select(line=>new KnowledgeClause(line)).ToArray();
    }
    public sealed partial class CampaignRuntime
    {
        void PrepareKnowledgeQuests()
        {
            var quests=Data.quests.ToList();var actions=Data.actions.ToList();
            foreach(var clause in KnowledgeCatalog.Clauses.Where(c=>!c.Intro&&c.id.Contains(".")&&!quests.Any(q=>q.iso.Contains(c.id))))
            {
                string id="KNOWLEDGE_"+clause.id;var steps=new[]{id+"_OBSERVER",id+"_CONSULTER",id+"_VERIFIER"};
                for(int i=0;i<3;i++)actions.Add(new ActionDefinition{id=steps[i],actId="*",targetBindingId=i==1?clause.giver:clause.target,title=(i==0?"Examiner l’activité : ":i==1?"Confronter l’observation : ":"Vérifier et consigner : ")+clause.title,durationSeconds=3,requiredFlags=i==0?Array.Empty<string>():new[]{"done:"+steps[i-1]},effects=i==2?new[]{new EffectDefinition{kind="flag",target="done:"+steps[i],value=1},new EffectDefinition{kind="flag",target="verified:"+id,value=1},new EffectDefinition{kind="evidence",target="observation:"+clause.id,value=1}}:new[]{new EffectDefinition{kind="flag",target="done:"+steps[i],value=1}}});
                quests.Add(new QuestDefinition{id=id,title="CARNET · "+clause.title.ToUpperInvariant(),giverId=clause.giver,actId="*",required=false,description="Observe une activité réelle du village, confronte tes constats avec le référent et conserve le résultat du contrôle.",tip="Une trace utile précise ce qui a été observé et ce qui reste à vérifier.",completion="L’observation et son contrôle sont consignés.",prerequisites=new[]{"M_I_TUTORIEL"},actionIds=steps,verificationFlag="verified:"+id,iso=new[]{clause.id},rewards=new[]{new QuestReward{kind="knowledge",id="knowledge",name="Fragments de savoir",amount=2},new QuestReward{kind="evidence",id="carnet:"+clause.id,name="Observation contrôlée",amount=1}}});
            }
            Data.quests=quests.ToArray();Data.actions=actions.ToArray();
        }
    }
}
