using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class VillageUpgradeViewV18:MonoBehaviour
 {
  CampaignRuntime c;VillageUpgradeV18 village;RectTransform panel,body;TMP_Text title,details;UnityEngine.UI.Button launch;UnityEngine.UI.Button[] controls;string selected="";float check;int fingerprint;
  public bool Open=>panel!=null&&panel.gameObject.activeSelf;public string Selected=>selected;
  void Ensure()
  {
   if(c==null){c=GetComponent<CampaignRuntime>();village=GetComponent<VillageUpgradeV18>();}if(panel!=null)return;var hud=GetComponent<CampaignHud>();if(hud?.Canvas==null)return;
   panel=AdventureUI.Rect(hud.Canvas.transform,"Améliorations des installations V18",new Vector2(.5f,.5f),new Vector2(.5f,.5f),Vector2.zero,new Vector2(950,710));TribalStyle.Panel(panel,"panel",TribalStyle.Ink,null,true);
   title=TribalStyle.Text(TribalStyle.Top(panel,"Titre",35,25,880,50),hud.font,"AMÉLIORATIONS",30,TribalStyle.Gold,true);
   details=TribalStyle.Text(TribalStyle.Top(panel,"Conditions réelles",35,95,880,390),hud.font,"",24);details.overflowMode=TextOverflowModes.Overflow;
   launch=TribalStyle.Button(TribalStyle.Top(panel,"Lancer les travaux",35,510,880,55),hud.font,"LANCER L’AMÉLIORATION",Launch,true);
   controls=new UnityEngine.UI.Button[3];var ids=new[]{"stability","access","use"};var labels=new[]{"STABILITÉ","ACCÈS ET PASSAGES","CONDITIONS D’USAGE"};
   for(int i=0;i<3;i++){string id=ids[i];controls[i]=TribalStyle.Button(TribalStyle.Top(panel,labels[i],35+i*294,577,285,48),hud.font,labels[i],()=>{village.Control(selected,id);Render();});}
   TribalStyle.Button(TribalStyle.Top(panel,"Retour",35,643,880,45),hud.font,"REVENIR AU VILLAGE",Close);panel.gameObject.SetActive(false);
  }
  public void Show(string id){Ensure();if(panel==null||village.StateFor(id)==null)return;selected=id;panel.gameObject.SetActive(true);c.SetPause(false);Render();}
  public void Close(){if(!Open)return;panel.gameObject.SetActive(false);c.ReconcileControls();}
  void Launch()
  {
   if(!village.BeginUpgrade(selected)){Render();return;}
   Close();
   c.Inform("Chantier lancé. Reste près de l’installation pour voir les travaux, puis reviens vérifier les trois critères.");
  }
  void Render()
  {
   var s=village.StateFor(selected);if(s==null){Close();return;}int next=Mathf.Min(3,s.tier+1);
   title.text="AMÉLIORATIONS · "+c.CharacterName(s.owner).ToUpperInvariant();
   string[] tiers={"Branches, peaux et travail au sol","Poteaux consolidés, supports et assises","Chaume, torchis et postes aménagés","Torchis renforcé, rangement et accès définis"};
   if(s.type=="monument")tiers=new[]{"Pierre brute et réunion rudimentaire","Socle organisé et tablette de politique SST","Supports de suivi et assises de consultation","Place de pilotage et tableaux des objectifs"};
   string status=s.phase==InstallationPhaseV18.Building?"Travaux en cours":s.phase==InstallationPhaseV18.AwaitingControl?"À VÉRIFIER · accès suspendu":s.phase==InstallationPhaseV18.Verified?"Contrôles enregistrés":"Installation existante";
   string reason=village.BlockReason(selected);
   string natural=(c.GetComponent<TemperateVillageV19>()!=null&&s.type=="habitation"&&s.tier>=1)?$" · argile {2+2*s.tier} · paille {2+2*s.tier}":"";
   details.text=$"NIVEAU ACTUEL : {s.tier} · {tiers[s.tier]}\nNIVEAU SUIVANT : {next} · {tiers[next]}\n\nRESSOURCES : bois {4+2*s.tier} · fibres {2+s.tier} · pierre {1+s.tier}{natural}\nRESPONSABLE : {c.CharacterName(s.owner)} · compétence requise 50\nTRAVAUX : supports, parois ou rangement selon le métier\nCONTRÔLES : stabilité · accès · conditions d’usage\nÉTAT : {status}\n\n"+(reason==""?"Les conditions sont réunies pour engager les travaux.":reason);
   launch.interactable=reason=="";for(int i=0;i<3;i++)controls[i].interactable=s.phase==InstallationPhaseV18.AwaitingControl&&!s.controls.Contains(new[]{"stability","access","use"}[i]);
   fingerprint=(int)s.phase*10+s.controls.Count;
  }
  void Update()
  {
   Ensure();if(panel==null)return;if(Open){panel.localScale=Vector3.one*Mathf.Min(1,((panel.parent as RectTransform).rect.width-30)/950);if(Time.unscaledTime>check){check=Time.unscaledTime+.25f;var s=village.StateFor(selected);if(s==null||(int)s.phase*10+s.controls.Count!=fingerprint)Render();}}
  }
 }
 public sealed partial class CampaignRuntime
 {
  public ActionDefinition[] VillageActionsV18(string site)
  {
   var village=GetComponent<VillageUpgradeV18>();if(village==null)return System.Array.Empty<ActionDefinition>();village.EnsureState();
   return State.villageV18.installations.Where(s=>"v18:"+s.id==site).Select(s=>new ActionDefinition{id="upgrade:v18:"+s.id,title="Améliorations de l’installation · "+CharacterName(s.owner),actId="*",repeatable=true,targetBindingId="v18:"+s.id,interactionType="Physical"}).ToArray();
  }
  public ActionDefinition VillageActionV18(string id)
  {
   if(!id.StartsWith("upgrade:v18:"))return null;var state=GetComponent<VillageUpgradeV18>()?.StateFor(id.Substring(12));return state==null?null:new ActionDefinition{id=id,title="Améliorations de l’installation",actId="*",targetBindingId="v18:"+state.id,repeatable=true};
  }
 }
}
