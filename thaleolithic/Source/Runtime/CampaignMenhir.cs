using System;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed partial class CampaignRuntime
 {
  public const string MenhirQuestId="M_II_ROLES",MenhirActionId="MENHIR_DUEL",MenhirReplayId="MENHIR_DUEL_REPLAY";
  ActionDefinition[] menhirLegacy=Array.Empty<ActionDefinition>();
  public bool MenhirActive=>GetComponent<MenhirDuel>()?.Active??false;
  void PrepareMenhirDuel()
  {
   var quest=Data.quests.First(q=>q.id==MenhirQuestId);menhirLegacy=quest.actionIds.Select(FindAction).Where(a=>a!=null).ToArray();
   quest.giverId="aurelien";quest.actionIds=new[]{MenhirActionId};quest.iso=new[]{"5.1","5.2","5.3","5.4"};quest.description="Dylan affronte Aurélien devant son menhir. Cinq épreuves relient les décisions du chef aux moyens, aux responsabilités et à la participation des travailleurs. Une réponse déclenche une attaque ou un contre.";quest.tip="Les cinq épreuves doivent être comprises. Les coups manuels ne permettent pas de sauter une question. Le mode pédagogique permet de se concentrer sur les décisions.";quest.completion="Les engagements et les huit responsabilités sont affichés au menhir. La compréhension des principes est conservée ; les autres missions restent nécessaires pour les appliquer et les vérifier sur le terrain.";
   foreach(var archived in menhirLegacy)archived.actId="MENHIR_ARCHIVE";Data.actions=Data.actions.Concat(new[]{new ActionDefinition{id=MenhirActionId,title="Défier Aurélien : le duel du menhir",actId="ACTE_II",targetBindingId="aurelien",durationSeconds=0,effects=new[]{new EffectDefinition{kind="flag",target="duel:won",value=1},new EffectDefinition{kind="evidence",target="leadership:duel",value=1}}},new ActionDefinition{id=MenhirReplayId,title="Rejouer le duel du menhir",actId="*",targetBindingId="aurelien",repeatable=true,requiredFlags=new[]{"done:M_II_ROLES_3"}},new ActionDefinition{id="MENHIR_BOARD",title="Lire les engagements et les responsabilités",actId="*",targetBindingId="grand_menhir",repeatable=true,requiredFlags=new[]{"menhir:useful"},dialogueId="MENHIR_BOARD_READ"}}).ToArray();
   Data.dialogues=Data.dialogues.Concat(new[]{new DialogueDefinition{id="MENHIR_BOARD_READ",speaker="Dylan · lecture du panneau",text="Aurélien fournit les moyens et suit les résultats. Mathieu accompagne la prévention. Georges organise carrières et constructions ; Eliott, les expéditions ; Mathilde, les soins ; Lorette, la représentation des habitants ; Neila, les approvisionnements. Dylan observe et signale. Les travailleurs participent aux décisions et peuvent alerter.\n\nLe panneau rappelle les engagements : les actions et leurs contrôles restent à réaliser dans le village.",choices=new[]{new ChoiceDefinition{id="MENHIR_BOARD_CLOSE",text="Revenir au village"}}}}).ToArray();
   if(GetComponent<MenhirDuel>()==null)gameObject.AddComponent<MenhirDuel>();if(GetComponent<MenhirPolicyBoard>()==null)gameObject.AddComponent<MenhirPolicyBoard>();
  }
  void InitializeMenhirState()
  {
   State.menhir??=new MenhirProgress();var p=State.menhir;if(p.mastered==null||p.mastered.Length!=5)p.mastered=new bool[5];if(p.cleared==null||p.cleared.Length!=5)p.cleared=new bool[5];if(p.mistakes==null||p.mistakes.Length!=5)p.mistakes=new int[5];p.answerReceipts??=new System.Collections.Generic.List<string>();p.returnActors??=new System.Collections.Generic.List<DuelReturnActor>();
  }
  bool MenhirActionAllowed(ActionDefinition action,out string reason)
  {reason="";if(menhirLegacy.Any(a=>a.id==action.id)){reason="Cette décision se résout désormais dans le duel du menhir.";return false;}if(action.id==MenhirReplayId&&QuestState(MenhirQuestId)?.claimed!=true){reason="Récupère d’abord les récompenses de cette mission.";return false;}return true;}
  public bool MenhirCriterion(string clause)
  {var p=State.menhir;if(p==null)return false;if(clause=="5")return p.mastered.All(x=>x);int index=clause=="5.1"?0:clause=="5.2"?1:clause=="5.3"?2:clause=="5.4"?3:-1;return index<0||p.mastered[index];}
  public bool CompleteMenhirDuel()
  {
   InitializeMenhirState();var p=State.menhir;if(!p.cleared.All(x=>x)||!p.mastered.All(x=>x))return false;
   bool first=!p.completed;p.completed=true;p.inProgress=false;SetDerivedFlag("menhir:useful",true);
   if(QuestState(MenhirQuestId)?.claimed!=true){foreach(var action in menhirLegacy)ApplyActionOutcome(action);ApplyActionOutcome(FindAction(MenhirActionId));}
   foreach(var clause in new[]{"5.1","5.2","5.3","5.4"}){var progress=State.knowledge.FirstOrDefault(k=>k.id==clause);if(progress==null){progress=new ISOProgress{id=clause};State.knowledge.Add(progress);}progress.level=Mathf.Max(progress.level,3);}
   if(first&&!State.rewardReceipts.Contains("menhir:trust:v1")){foreach(var member in State.characters.Where(c=>c.alive))member.trust=Mathf.Min(100,member.trust+10);State.rewardReceipts.Add("menhir:trust:v1");}
   Record("menhir:completed","Le duel du menhir","Cinq critères de compréhension vérifiés ; responsabilités affichées et confiance renforcée.");SyncWorld();RefreshQuests();Save();Notify();GetComponent<QuestNavigationController>()?.ForceRefresh();
   if(QuestState(MenhirQuestId)?.status==QuestStatus.READY_TO_VALIDATE&&Near("aurelien"))ValidateQuest(MenhirQuestId);else Inform("Duel terminé. Les acquis sont conservés ; aucune récompense déjà reçue n’est distribuée à nouveau.");return true;
  }
 }
}
