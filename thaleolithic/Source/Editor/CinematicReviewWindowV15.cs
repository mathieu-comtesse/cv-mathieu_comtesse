#if UNITY_EDITOR
using System;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;
using UngaBunga45001;
public sealed class CinematicReviewWindowV15:EditorWindow
{
 [SerializeField]string pending="";DropdownField selection;Label state;Button launch,pause,skip,tests;
 bool Safe=>Environment.CommandLine.Contains("-ungaInterfaceV8Audit")||Environment.CommandLine.Contains("-ungaV11Audit");
 [MenuItem("THALEOLITHIC/Réalisation V15")]
 public static void Open()=>GetWindow<CinematicReviewWindowV15>("Réalisation V15");
 public void CreateGUI()
 {
  var root=rootVisualElement;root.style.paddingLeft=root.style.paddingRight=16;root.style.paddingTop=root.style.paddingBottom=16;root.Add(new Label("THALEOLITHIC · Réalisation V15"){style={fontSize=20,marginBottom=12}});
  var films=CinematicCatalogueV15.Library.films.Where(f=>!f.id.StartsWith("F15_DEATH_")&&!f.id.StartsWith("F15_DUEL_")).ToArray();selection=new DropdownField("Séquence",films.Select(f=>f.id+" · "+f.title+" · "+f.duration+" s").ToList(),0);root.Add(selection);
  launch=new Button(()=>{pending=films[selection.index].id;if(!EditorApplication.isPlaying)EditorApplication.isPlaying=true;}){text="Lancer la scène"};root.Add(launch);
  pause=new Button(()=>{var c=FindFirstObjectByType<CampaignRuntime>();if(c!=null)c.SetPause(!c.UserPaused);}){text="Pause / reprendre"};root.Add(pause);
  skip=new Button(()=>FindFirstObjectByType<CampaignRuntime>()?.cinematicDirector.Skip()){text="Passer la scène"};root.Add(skip);
  tests=new Button(()=>{var c=FindFirstObjectByType<CampaignRuntime>();if(c!=null&&c.GetComponent<CinematicMatrixAuditV15>()==null)c.gameObject.AddComponent<CinematicMatrixAuditV15>();}){text="Contrôler toutes les séquences"};root.Add(tests);
  root.Add(new Button(()=>EditorUtility.RevealInFinder("E:/UNGA-BUNGA-45001/Revision15/Matrix")){text="Ouvrir les résultats"});state=new Label{style={whiteSpace=WhiteSpace.Normal,marginTop=12}};root.Add(state);Refresh();
 }
 void Update()
 {
  Refresh();if(!Safe||!EditorApplication.isPlaying||string.IsNullOrEmpty(pending))return;var c=FindFirstObjectByType<CampaignRuntime>();if(c?.State==null)return;c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;
  if(c.cinematicDirector.IsPlaying){c.cinematicDirector.Skip();return;}string id=pending;pending="";c.SetPause(false);c.cinematicDirector.Play(id);
 }
 void Refresh()
 {
  if(state==null)return;var c=FindFirstObjectByType<CampaignRuntime>();bool running=EditorApplication.isPlaying&&c?.State!=null;launch.SetEnabled(Safe);pause.SetEnabled(Safe&&running);skip.SetEnabled(Safe&&running);tests.SetEnabled(Safe&&running);
  state.text=!Safe?"Session de test requise : lance Unity avec -ungaInterfaceV8Audit. La sauvegarde habituelle reste protégée.":!running?"Session de test prête. Choisis une scène puis Lance la scène.":"État : "+c.cinematicDirector.SequenceState+" · "+c.cinematicDirector.CurrentId+" · "+c.State.cinematicTimeV15.ToString("0.0")+" s\nPersonnages natifs conservés. Les tests techniques ne remplacent pas la revue visuelle.";
 }
}
#endif
