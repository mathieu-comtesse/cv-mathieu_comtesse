using System;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicTriggersV15:MonoBehaviour
 {
  public bool SuspendAutomatic;
  CampaignRuntime c;CampaignSave observed;readonly HashSet<string> known=new HashSet<string>();int incidents;float next;
  static readonly Dictionary<string,string> afterAction=new Dictionary<string,string>{
   {"M_I_TUTORIEL_2","F15_C03"},{"M_II_CONSULTATION_1","F15_C04"},{"M_III_CARRIERE_1","F15_C06"},{"M_IV_SILEX_1","F15_C07"},
   {"WORK_M_V_ABRI","F15_C08"},{"M_VII_RECONSTITUER_1","F15_C12"},{"M_VII_AUDIT_1","F15_C13"},
   {"M_V_ABRI_1","F15_MICRO_HUT_CHECK"},{"M_IV_BOIS_1","F15_MICRO_SUPPORT"},{"M_V_RESERVES_3","F15_MICRO_STOCK"},
   {"M_IV_FOYER_3","F15_MICRO_FIRE"},{"M_VI_URGENCE_1","F15_MICRO_FIRSTAID"},{"M_VI_PREPARER_1","F15_MICRO_SKILL"},
   {"M_VI_PREPARER_2","F15_MICRO_EQUIPMENT"},{"M_VII_CORRIGER_3","F15_MICRO_RECHECK"},{"M_II_ROLES_3","F15_MICRO_MENHIR"},
   {"M_IV_SILEX_3","F15_C07_AFTER"},{"WORK_M_IV_SILEX","F15_MICRO_WORKSHOP"},{"M_III_CARRIERE_3","F15_MICRO_QUARRY"},{"M_II_CONSULTATION_4","F15_MICRO_TRAIN"},
   {"M_V_PRIORITES_2","F15_MICRO_PATH"},{"SIDE_CERCLE_1","F15_C09"},{"SIDE_CERCLE_4","F15_C09_AFTER"},{"SIDE_CERCLE_5","F15_MICRO_SPIRITS"},
   {"SIDE_BERGES_1","F15_C10"},{"SIDE_BERGES_4","F15_MICRO_SEASONS"}};
  bool Seen(string id){foreach(var viewed in c.State.viewedCinematics)if(viewed==id||viewed!="C05"&&CinematicCatalogueV15.Resolve(viewed,c)==id)return true;return false;}
  void Update()
  {
   if(c==null)c=GetComponent<CampaignRuntime>();if(c.State==null||SuspendAutomatic||Time.unscaledTime<next)return;next=Time.unscaledTime+.2f;
   if(observed!=c.State){observed=c.State;known.Clear();foreach(var id in c.State.completedActions)known.Add(id);incidents=c.State.accidents.Count;}
   foreach(var id in c.State.completedActions)if(known.Add(id))
   {
    if(id=="M_I_TUTORIEL_1"){var structure=c.GetComponent<CinematicStage>().fallingFrame?.GetComponentInChildren<HutCollapse>();Queue(structure!=null&&structure.Broken?"F15_C03":"F15_C02");}
    else if(afterAction.TryGetValue(id,out var film))Queue(film);
    else
    {
     var action=Array.Find(c.Data.actions,a=>a.id==id);if(action==null)continue;
     if(action.targetBindingId=="alban")Queue(id.StartsWith("WORK_")?"F15_C09_AFTER":"F15_C09");
     if(action.targetBindingId=="milena")Queue(id.StartsWith("WORK_")?"F15_MICRO_SEASONS":"F15_C10");
    }
   }
   if(c.State.accidents.Count>incidents){incidents=c.State.accidents.Count;Queue("F15_C12");}
   if(c.Ending!=null)Queue(CinematicCatalogueV15.Ending(c));
   var pending=c.State.pendingCinematicsV15??=new List<string>();if(pending.Count==0||c.cinematicDirector.IsPlaying||c.IsBusy||c.MenhirActive||c.UserPaused||c.Dialogue!=null||c.QuestOverlay||c.IncidentModal||c.GetComponent<AccidentDirector>().Playing)return;
   string idToPlay=pending[0];pending.RemoveAt(0);if(Seen(idToPlay))return;c.cinematicDirector.Play(idToPlay);c.Save();
  }
  public void Queue(string id)
  {
   if(c==null)c=GetComponent<CampaignRuntime>();if(c.State==null||CinematicCatalogueV15.Find(id)==null||Seen(id))return;
   var pending=c.State.pendingCinematicsV15??=new List<string>();if(!pending.Contains(id))pending.Add(id);
  }
 }
}
