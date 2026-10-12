using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEditor;

public static class TalasCampaignQA
{
 [Serializable] public class Result{public string id,result;public bool pass;public int health,score,actions;public float simulatedSeconds,realSeconds;}
 [Serializable] public class Report{public string started,finished;public bool complete,campaignComplete,blockedTravelRejected,saveReloadMatches;public int completedSessions,decisions,notes;public List<Result> games=new List<Result>();public string error;}
 static TalasMiniGames g;static Report report;static int index,frame,actions;static double begin;static bool pending;static float originalScale;static readonly BindingFlags Flags=BindingFlags.Instance|BindingFlags.NonPublic;
 static bool flow;static TalasCampaign campaign;static TalasCampaign.SaveData saved;
 static T Field<T>(string name)=>(T)typeof(TalasMiniGames).GetField(name,Flags).GetValue(g);
 static object PieceField(object o,string n)=>o.GetType().GetField(n).GetValue(o);
 static IList Pieces=>Field<IList>("objects");
 public static string Status=>report==null?"idle":JsonUtility.ToJson(report);
 public static void Start(bool campaignFlow=false){if(!EditorApplication.isPlaying)throw new Exception("Play required");if(report!=null&&!report.complete)throw new Exception("QA already running");g=UnityEngine.Object.FindFirstObjectByType<TalasMiniGames>();if(g.IsRunning)g.Exit();campaign=UnityEngine.Object.FindFirstObjectByType<TalasCampaign>();campaign.ClosePopup();report=new Report{started=DateTime.UtcNow.ToString("o")};flow=campaignFlow;if(flow){saved=campaign.progress;campaign.progress=new TalasCampaign.SaveData();campaign.Travel(0);report.blockedTravelRejected=!campaign.Travel(6);}index=0;pending=true;originalScale=Time.timeScale;Time.timeScale=4;EditorApplication.update+=Tick;}
 static void Tick()
 {
  try
  {
   if(!EditorApplication.isPlaying){Stop("Play stopped");return;}if(frame==Time.frameCount)return;frame=Time.frameCount;
   if(pending){
    if(flow&&index<12&&!g.IsRunning){int decision=(int)typeof(TalasCampaign).GetField("decision",Flags).GetValue(campaign);var popup=(GameObject)typeof(TalasCampaign).GetField("popup",Flags).GetValue(campaign);if(decision>=0){var bank=(TalasBank)typeof(TalasCampaign).GetField("bank",Flags).GetValue(campaign);campaign.AnswerDecision(bank.dialogue[decision].correct);return;}if(popup!=null){foreach(var b in popup.GetComponentsInChildren<UnityEngine.UI.Button>())if(b.name=="Continuer"){b.onClick.Invoke();return;}}campaign.EnterChapter(campaign.CurrentChapter);return;}
    pending=false;begin=EditorApplication.timeSinceStartup;actions=0;if(!g.IsRunning)g.Begin(TalasMiniGames.AllIds[index],(win,stars)=>{});g.StartGame();return;}
   if(g.LastResult!=""){bool won=g.LastResult=="Réussite";report.games.Add(new Result{id=g.ActiveId,result=g.LastResult,pass=won,health=g.Health,score=g.Score,actions=actions,simulatedSeconds=g.Elapsed,realSeconds=(float)(EditorApplication.timeSinceStartup-begin)});g.ReturnResult();if(flow&&!won&&index<12){Stop("Épreuve échouée dans le parcours : "+TalasMiniGames.AllIds[index]);return;}index++;if(index>=TalasMiniGames.AllIds.Length){Stop(null);return;}pending=true;return;}
   if(EditorApplication.timeSinceStartup-begin>100){report.games.Add(new Result{id=g.ActiveId,result="timeout",pass=false,score=g.Score,health=g.Health,actions=actions,simulatedSeconds=g.Elapsed,realSeconds=100});g.Exit();index++;if(index>=TalasMiniGames.AllIds.Length){Stop(null);return;}pending=true;return;}
   int phase=Field<int>("phase");if(g.AwaitingAnswer){g.Choose(g.ExpectedAnswer);actions++;return;}
   if(g.ReadyForNext){if(g.ActiveId=="operation")Click("Cause traitée : continuer");else g.Next();actions++;return;}
   switch(g.ActiveId)
   {
    case "attrape":Catch();break;
    case "fuite":case "jetski":Race();break;
    case "budget":if(phase==1){bool bought=false;for(int p=0;p<5;p++)if(g.Budget>=5&&(g.Bought[p]&1)==0&&g.Buy(p,0)){bought=true;actions++;break;}if(!bought&&g.Budget>=3&&g.Bought[2]==0)bought=g.Buy(2,2);if(!bought){for(int p=0;p<5;p++)if(g.Budget>=3&&g.Bought[p]==0&&g.Buy(p,2)){bought=true;actions++;break;}}if(!bought){g.LaunchQuarter();actions++;}}break;
    case "festin":int item=Field<int>("feastItem");var b=Field<TalasBank>("bank");if(b.feast[item].level==5)g.Control("left");else g.Control("stamp");g.Control("push");actions++;break;
    case "karaoke1":case "karaoke2":foreach(var p in Pieces){var go=(GameObject)PieceField(p,"go");if(Mathf.Abs(go.transform.localPosition.z)<.55f){g.Sing((int)PieceField(p,"lane")+1);actions++;break;}}break;
    case "parcours":Platform();break;
    case "operation":var path=Field<Vector3[]>("path");int pi=Field<int>("pathIndex");g.SetPinching(true);g.Drag(path[Mathf.Min(pi,path.Length-1)],.012f);actions++;break;
    case "avions":case "petanque":case "lanternes":if(Pieces.Count==0){if(g.ActiveId=="lanternes"&&Field<int>("bonusAttempts")==0)for(int i=0;i<6;i++)Click("Force −");g.LaunchBonus();actions++;}break;
   }
  }
  catch(Exception ex){Stop(ex.ToString());}
 }
 static void Click(string name){var a=Field<GameObject>("actions");foreach(var b in a.GetComponentsInChildren<UnityEngine.UI.Button>())if(b.name==name){b.onClick.Invoke();return;}}
 static void Catch(){float target=8,best=20;foreach(var p in Pieces){var go=(GameObject)PieceField(p,"go");if((int)PieceField(p,"type")==0&&go.transform.localPosition.y<best){best=go.transform.localPosition.y;target=go.transform.localPosition.x;}}
  foreach(var p in Pieces){var go=(GameObject)PieceField(p,"go");if((int)PieceField(p,"type")==1&&go.transform.localPosition.y<2&&Mathf.Abs(go.transform.localPosition.x-target)<1.2f)target=target>0?-8:8;}
  float delta=target-g.PlayerPosition.x;if(Mathf.Abs(delta)>.7f){g.Move(delta>0?1:-1);actions++;}}
 static void Race(){float nearest=30;int dangerLane=5;foreach(var p in Pieces){var go=(GameObject)PieceField(p,"go");var v=go.transform.localPosition;if(v.z>0&&v.z<nearest){nearest=v.z;dangerLane=(int)PieceField(p,"lane");}}
  int lane=Field<int>("lane");if(nearest<7&&dangerLane==lane){g.Move(lane==1?-1:1);actions++;}g.Control("guide");}
 static void Platform(){var pickups=Field<HashSet<string>>("pickups");int next=7;GameObject target=null;foreach(var p in Pieces){int i=(int)PieceField(p,"index");if(i<next){next=i;target=(GameObject)PieceField(p,"go");}}
  var pos=g.PlayerPosition;if(target!=null){var t=target.transform.localPosition;float wanted=pos.y<t.y-.8f?2.5f:t.x;float diff=wanted-pos.x;if(Mathf.Abs(diff)>.15f){g.Move(diff>0?1:-1);actions++;}else if(pos.y<t.y-.8f){g.Control("climb");actions++;}}
  else if(pos.x<3){g.Move(1);actions++;}}
 static void Stop(string error){EditorApplication.update-=Tick;Time.timeScale=originalScale;report.complete=true;report.finished=DateTime.UtcNow.ToString("o");report.error=error;if(flow){report.campaignComplete=campaign.CampaignComplete;foreach(int s in campaign.progress.stars)if(s>0)report.completedSessions++;foreach(bool d in campaign.progress.decisions)if(d)report.decisions++;report.notes=campaign.progress.notes.Count;campaign.Save();var reload=JsonUtility.FromJson<TalasCampaign.SaveData>(PlayerPrefs.GetString("Talas.Unity.Campagne.v2"));report.saveReloadMatches=JsonUtility.ToJson(reload)==JsonUtility.ToJson(campaign.progress);campaign.progress=saved;campaign.Save();campaign.Travel(0);}System.IO.Directory.CreateDirectory("Reports");System.IO.File.WriteAllText("Reports/CampaignQA.json",JsonUtility.ToJson(report,true));}
}
