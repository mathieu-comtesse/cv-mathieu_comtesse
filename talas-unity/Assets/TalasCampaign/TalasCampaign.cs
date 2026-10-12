using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using TMPro;
public class TalasCampaign:MonoBehaviour
{
 [Serializable] public class SaveData {public int version=2;public int[] stars=new int[12];public bool[] decisions=new bool[13];public int cdi=50;public float remaining=2700;public bool participation,accueil,changement,prevention;public List<string> notes=new List<string>();}
 public Transform player,companion;public TalasMiniGames games;public TMP_FontAsset font;public SaveData progress;
 public int CurrentChapter {get;private set;} public bool CampaignComplete=>Array.TrueForAll(progress.stars,s=>s>0);
 public string CurrentObjective {get;private set;}
 static readonly string[] sessions={"attrape","combat","fuite","budget","festin","karaoke1","karaoke2","doc","parcours","revue","operation","jetski"};
 static readonly int[] chapters={0,1,1,2,2,3,3,3,4,5,6,6};
 const string SaveKey="Talas.Unity.Campagne.v2";
 TalasBank bank;GameObject canvas,popup;TextMeshProUGUI objective,controls;TalasQuayMovement movement;Camera cam;int decision=-1;bool started;
 public bool ChapterUnlocked(int c){for(int i=0;i<sessions.Length;i++)if(chapters[i]<c&&progress.stars[i]==0)return false;return true;}
 void Awake(){TalasUI.Font=font;bank=TalasBank.Load();movement=player.GetComponent<TalasQuayMovement>();cam=Camera.main;progress=Load();canvas=TalasUI.Canvas("Carnet Talas",10);var panel=TalasUI.Panel("Mission",canvas.transform,24,20,760,80);objective=TalasUI.Text(panel.transform,"",18,8,728,65,22);controls=TalasUI.Text(canvas.transform,"Q / D : marche · Maj : courir · E : atelier · M : carnet",24,670,1130,32,18);TalasUI.Button(canvas.transform,"Carnet / M",1040,20,210,44,OpenMap);ShowWelcome();}
 SaveData Load(){string text=PlayerPrefs.GetString(SaveKey,"");try{var saved=JsonUtility.FromJson<SaveData>(text);if(saved!=null&&saved.version==2&&saved.stars.Length==12&&saved.decisions.Length==13){if(saved.notes==null)saved.notes=new List<string>();return saved;}}catch{}return new SaveData();}
 public void Save(){PlayerPrefs.SetString(SaveKey,JsonUtility.ToJson(progress));PlayerPrefs.Save();}
 void Update()
 {
  if(started&&(games.IsRunning?!games.IsPaused:popup==null)&&!CampaignComplete){progress.remaining=Mathf.Max(0,progress.remaining-Time.deltaTime);if(progress.remaining<=0){if(games.IsRunning)games.Exit();Save();ShowNotice("L’audit est arrivé. Ton carnet est conservé. Reprends une nouvelle session de 45 minutes pour terminer les ateliers.",()=>{progress.remaining=2700;Save();});}}
  if(games.IsRunning){canvas.SetActive(false);return;}canvas.SetActive(true);
  CurrentChapter=Mathf.Clamp(Mathf.RoundToInt(player.position.x/22),0,6);float near=Mathf.Abs(player.position.x-ChapterX(CurrentChapter));CurrentObjective=bank.chapters[CurrentChapter].clause+" · "+bank.chapters[CurrentChapter].text;int complete=0;foreach(int s in progress.stars)if(s>0)complete++;
  objective.text=CampaignComplete?"TALAS · Sept chapitres validés\nCDI : "+progress.cdi+" / 100 · Carnet complet":CurrentObjective+"  ·  "+complete+" / 12 épreuves\nAudit : "+Mathf.FloorToInt(progress.remaining/60).ToString("00")+":"+Mathf.FloorToInt(progress.remaining%60).ToString("00")+"  ·  CDI "+progress.cdi+" / 100";
  controls.text=popup!=null?"Clique sur le texte ou la flèche pour lire la suite.":near<2?"E : entrer dans l’atelier · M : carnet · Q / D : marcher":"Q / D : marche · Maj : courir · M : carnet";
  if(companion!=null){companion.position=Vector3.Lerp(companion.position,player.position+new Vector3(1.2f,1.8f+Mathf.Sin(Time.time*2)*.12f,-.2f),Time.deltaTime*4);var rotor=companion.Find("Rotor");if(rotor!=null)rotor.Rotate(0,Time.deltaTime*720,0);}
  var k=Keyboard.current;if(k!=null){if(k.mKey.wasPressedThisFrame&&popup==null)OpenMap();if(k.eKey.wasPressedThisFrame&&popup==null&&near<2&&!EnterChapter(CurrentChapter))ShowNotice("Cet atelier demande les preuves des chapitres précédents. Consulte le carnet pour retrouver l’épreuve à terminer.",()=>{});if(k.escapeKey.wasPressedThisFrame&&popup!=null&&decision<0)ClosePopup();}
 }
 void LateUpdate(){if(games.IsRunning)return;float x=Mathf.Lerp(cam.transform.position.x,player.position.x+2,Time.deltaTime*2.2f);cam.transform.position=new Vector3(x,7.4f,-29);cam.transform.rotation=Quaternion.LookRotation(new Vector3(0,-5,30));}
 public static float ChapterX(int i)=>i*22;
 public bool Travel(int chapter){if(chapter<0||chapter>6||!ChapterUnlocked(chapter)||games.IsRunning)return false;CurrentChapter=chapter;player.position=new Vector3(ChapterX(chapter)-3,0,0);ClosePopup();return true;}
 void ShowWelcome(){ShowNotice("Dylan doit préparer les sept chapitres ISO 45001 avant l’audit. Boulon l’accompagne. Douze épreuves, des décisions qui modifient l’audit, un carnet sauvegardé.\n\nQ / D ou flèches : marcher. Maj : courir. E : atelier. M : carnet.\nLes mini-jeux présentent leurs propres commandes avant de commencer.",()=>{started=true;});}
 void NewPopup(string title){ClosePopup();movement.controlsEnabled=false;popup=TalasUI.Panel("Carnet ouvert",canvas.transform,180,115,920,515);TalasUI.Text(popup.transform,title,24,18,870,48,28);}
 public void OpenMap(){if(games.IsRunning)return;NewPopup("CARNET · ISO 45001");for(int i=0;i<7;i++){int c=i;bool open=ChapterUnlocked(i);int done=0,count=0;for(int j=0;j<sessions.Length;j++)if(chapters[j]==i){count++;if(progress.stars[j]>0)done++;}var b=TalasUI.Button(popup.transform,bank.chapters[i].clause+" · "+bank.chapters[i].text+"  "+done+" / "+count,24+(i%2)*440,82+(i/2)*70,424,58,()=>Travel(c));b.interactable=open;}
  TalasUI.Button(popup.transform,"Avions de papier",24,377,270,44,()=>Bonus("avions"));TalasUI.Button(popup.transform,"Pétanque",310,377,270,44,()=>Bonus("petanque"));TalasUI.Button(popup.transform,"Lanternes",596,377,300,44,()=>Bonus("lanternes"));TalasUI.Button(popup.transform,"Reprendre",24,442,250,44,ClosePopup);TalasUI.Button(popup.transform,"Preuves collectées",294,442,280,44,()=>OpenEvidence(0));TalasUI.Button(popup.transform,"Nouvelle campagne",596,442,300,44,ConfirmReset);}
 void OpenEvidence(int page){NewPopup("CARNET · Preuves et corrections");if(progress.notes.Count==0)TalasUI.Text(popup.transform,"Les documents récupérés et les réponses justes apparaîtront ici.",24,110,860,100,22);for(int i=0;i<4;i++){int n=page*4+i;if(n>=progress.notes.Count)break;var t=TalasUI.Text(popup.transform,progress.notes[n],24,82+i*80,860,72,19);t.enableAutoSizing=true;t.fontSizeMin=15;t.fontSizeMax=19;}TalasUI.Button(popup.transform,"Retour",24,442,260,44,OpenMap);if(page>0)TalasUI.Button(popup.transform,"Page précédente",310,442,270,44,()=>OpenEvidence(page-1));if((page+1)*4<progress.notes.Count)TalasUI.Button(popup.transform,"Page suivante",606,442,290,44,()=>OpenEvidence(page+1));}
 void ConfirmReset(){ShowNotice("La campagne actuelle sera remplacée. Une copie de son carnet sera conservée. Recommencer depuis le chapitre 4 ?",()=>{PlayerPrefs.SetString(SaveKey+".backup",JsonUtility.ToJson(progress));progress=new SaveData();CurrentChapter=0;player.position=new Vector3(-3,0,0);Save();});}
 public bool EnterChapter(int chapter)
 {
  if(!ChapterUnlocked(chapter)||games.IsRunning)return false;CurrentChapter=chapter;
  for(int i=0;i<bank.dialogue.Length;i++)if(bank.dialogue[i].chapter==chapter&&!progress.decisions[i]){ShowDecision(i);return true;}
  for(int i=0;i<sessions.Length;i++)if(chapters[i]==chapter&&progress.stars[i]==0){StartSession(i);return true;}
  ShowNotice("Chapitre validé. Ton carnet contient les preuves. Tu peux rejouer ses épreuves ou visiter l’atelier suivant.",()=>OpenReplay(chapter));return true;
 }
 void OpenReplay(int chapter){NewPopup(bank.chapters[chapter].clause+" · Épreuves");int row=0;for(int i=0;i<sessions.Length;i++)if(chapters[i]==chapter){int s=i;TalasUI.Button(popup.transform,sessions[i]+" · "+progress.stars[i]+" étoile(s)",24,90+row++*68,860,58,()=>StartSession(s));}TalasUI.Button(popup.transform,"Retour au quai",24,442,400,44,ClosePopup);}
 void NewDialogue(){ClosePopup();movement.controlsEnabled=false;popup=TalasUI.Panel("Dialogue Talas",canvas.transform,0,0,1280,720,Color.clear);} void ShowDecision(int i){NewDialogue();decision=i;var q=bank.dialogue[i];TalasUI.Dialogue(popup.transform,"BOULON",q.text,"boulon");for(int n=0;n<q.options.Length;n++){int answer=n;TalasUI.Button(popup.transform,(n+1)+". "+q.options[n],420,210+n*70,760,60,()=>AnswerDecision(answer));}}
 public bool AnswerDecision(int answer){if(decision<0)return false;int n=decision;var q=bank.dialogue[n];if(answer<0||answer>=q.options.Length)return false;progress.decisions[n]=true;progress.cdi=Mathf.Clamp(progress.cdi+q.deltas[answer],0,100);var sets=q.sets[answer];for(int i=0;i<sets.names.Length;i++){bool v=sets.values[i];switch(sets.names[i]){case "participation":progress.participation=v;break;case "accueil":progress.accueil=v;break;case "changement":progress.changement=v;break;case "prevention":progress.prevention=v;break;}}Save();decision=-1;ShowNotice(q.feedbacks[answer],()=>EnterChapter(CurrentChapter));return true;}
 void StartSession(int i){ClosePopup();movement.controlsEnabled=false;games.PreparedAudit=progress.accueil&&progress.prevention&&progress.changement;games.Begin(sessions[i],(won,stars)=>{movement.controlsEnabled=true;canvas.SetActive(true);if(stars<0)return;foreach(var note in games.Notes)if(!progress.notes.Contains(note))progress.notes.Add(note);if(won){if(progress.stars[i]==0)progress.cdi=Mathf.Clamp(progress.cdi+2,0,100);progress.stars[i]=Mathf.Max(progress.stars[i],stars);Save();int chapter=chapters[i];bool done=true;for(int j=0;j<sessions.Length;j++)if(chapters[j]==chapter&&progress.stars[j]==0)done=false;ShowNotice(done?"Chapitre validé : "+bank.chapters[chapter].clause+". Le prochain atelier est accessible.":"Épreuve validée. La suite de ce chapitre t’attend.",()=>{if(done&&chapter<6)Travel(chapter+1);});}else{Save();ShowNotice("Épreuve échouée. Le carnet et les autres réussites sont conservés. Réessaie cet atelier.",()=>{});}});}
 void Bonus(string id){ClosePopup();movement.controlsEnabled=false;games.Begin(id,(won,stars)=>{movement.controlsEnabled=true;});}
 public void ClosePopup(){if(popup!=null){Destroy(popup);popup=null;}decision=-1;if(movement!=null)movement.controlsEnabled=true;}
 void ShowNotice(string text,Action next){NewDialogue();var bar=TalasUI.Dialogue(popup.transform,"BOULON",text,"boulon");TalasUI.Button(popup.transform,"Continuer",900,646,290,44,()=>{if(bar.NextPage())return;ClosePopup();next();});}
 void OnApplicationQuit(){Save();}
 void OnDisable(){if(progress!=null)Save();}
}
