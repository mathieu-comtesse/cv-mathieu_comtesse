#if UNGA_WEB_RENDERER
using UnityEngine; namespace UngaBunga45001 { public sealed class InterfaceAudit:MonoBehaviour {public static bool Requested=>false;} }
#else
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
namespace UngaBunga45001
{
    public sealed class InterfaceAudit:MonoBehaviour
    {
        public static bool Requested=>Environment.GetCommandLineArgs().Contains("-ungaUI");
        [Serializable]class Check{public string name,detail;public bool passed;}
        [Serializable]class Receipt{public string status,player;public int firstFrame,lastFrame,navigationCalculations;public Check[] checks;public string[] errors,captures;}
        readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>(),captures=new List<string>();
        CampaignRuntime campaign;UISettingsController settings;InventoryController inventory;AdventureMenus menus;QuestNavigationController nav;CampaignMap map;Keyboard keyboard;string originalPreferences;bool hadPreferences,finished;
        const string Folder="E:/UNGA-BUNGA-45001/Revision4";
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Initialize(){if(!Requested||Application.isEditor)return;var go=new GameObject("Interface validation V4");DontDestroyOnLoad(go);go.AddComponent<InterfaceAudit>();}
        void Awake(){hadPreferences=PlayerPrefs.HasKey("UNGA.AdventureUI.v4");originalPreferences=PlayerPrefs.GetString("UNGA.AdventureUI.v4","");Application.logMessageReceived+=(c,s,t)=>{if((t==LogType.Error||t==LogType.Exception)&&!errors.Contains(c)&&errors.Count<30)errors.Add(c);};UnityEngine.SceneManagement.SceneManager.sceneLoaded+=(s,m)=>{var runtime=FindFirstObjectByType<CampaignRuntime>();if(runtime!=null)runtime.resumeOnStart=false;};StartCoroutine(Timeout());}
        IEnumerator Timeout(){yield return new WaitForSecondsRealtime(300);if(!finished){errors.Add("Audit timed out");Finish();}}
        void CheckThat(string name,bool passed,string detail=""){checks.Add(new Check{name=name,passed=passed,detail=detail});File.AppendAllText(Folder+"/ui-progress.txt",name+" = "+passed+" "+detail+"\n");}
        IEnumerator Wait(float seconds=.4f){float until=Time.unscaledTime+seconds;while(Time.unscaledTime<until)yield return null;}
        IEnumerator Press(Key key){keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState(key));yield return null;InputSystem.QueueStateEvent(keyboard,new KeyboardState());yield return null;yield return Wait();}
        IEnumerator Shot(string name,int width=1920,int height=1080)
        {
            Screen.SetResolution(width,height,FullScreenMode.Windowed);yield return Wait(.5f);yield return new WaitForEndOfFrame();string path=Folder+"/Review/"+name+".png";ScreenCapture.CaptureScreenshot(path);yield return null;captures.Add(path);CheckThat("Capture "+name,Screen.width==width&&Screen.height==height,$"actual={Screen.width}x{Screen.height}");
            if(name.StartsWith("HUD-"))
            {
                var anchors=new[]{"Portrait et survie","Quête suivie","Inventaire rapide","Aides contextuelles","Conseil des Sages","Minimap encadrée"};var boxes=new List<Rect>();bool valid=true;
                foreach(var label in anchors){var rect=campaign.GetComponentsInChildren<RectTransform>().First(t=>t.name==label);var corners=new Vector3[4];rect.GetWorldCorners(corners);var box=new Rect(corners[0].x,corners[0].y,corners[2].x-corners[0].x,corners[2].y-corners[0].y);valid&=box.xMin>=0&&box.yMin>=0&&box.xMax<=Screen.width+1&&box.yMax<=Screen.height+1;boxes.Add(box);}
                for(int i=0;i<boxes.Count;i++)for(int j=i+1;j<boxes.Count;j++)valid&=!boxes[i].Overlaps(boxes[j]);CheckThat("Ancrages sans chevauchement "+width,valid);
            }
        }
        Vector3 playerPosition()=>campaign.bindings.player.position+Vector3.right*10;
        IEnumerator Start()
        {
            Directory.CreateDirectory(Folder+"/Review");File.WriteAllText(Folder+"/ui-progress.txt","");yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);campaign=FindFirstObjectByType<CampaignRuntime>();campaign.cinematicDirector.Skip();while(campaign.cinematicDirector.IsPlaying)yield return null;
            settings=campaign.GetComponent<UISettingsController>();inventory=campaign.GetComponent<InventoryController>();menus=campaign.GetComponent<AdventureMenus>();nav=campaign.GetComponent<QuestNavigationController>();map=campaign.GetComponent<CampaignMap>();settings.preferences=new AdventurePreferences();
            keyboard=InputSystem.AddDevice<Keyboard>("UNGA UI verification keyboard");keyboard.MakeCurrent();InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;yield return Wait(1.2f);int first=Time.frameCount;
            var hud=campaign.GetComponent<CampaignHud>();var view=campaign.GetComponent<SurvivalInterface>();CheckThat("HUD natif compact",hud.playerPortrait!=null&&view.GameplayRoot!=null&&!view.SkipButton.gameObject.activeSelf&&FindObjectsByType<EventSystem>(FindObjectsSortMode.None).Length==1);
            CheckThat("GPS initial vers le mentor",nav.Action?.id=="M_I_TUTORIEL_1"&&nav.Complete&&nav.Corners.Length>=2,"target="+nav.Target?.name+" corners="+nav.Corners.Length);
            var projection=new WorldMapProjection(new Vector2(-120,-88),new Vector2(400,200));var sample=new Vector3(-93,7,-40);var roundtrip=projection.ToWorld(projection.ToUv(sample),7);
            var p0=map.Projection.ToUv(campaign.bindings.player.position);var px=map.Projection.ToUv(campaign.bindings.player.position+Vector3.right);var pz=map.Projection.ToUv(campaign.bindings.player.position+Vector3.forward);
            CheckThat("Coordonnées X/Z et origine négative",Vector3.Distance(sample,roundtrip)<.0001f&&px.x>p0.x&&pz.y>p0.y);
            settings.preferences.headingUp=true;yield return Wait(.2f);var rotated=map.Projection.Project(playerPosition(),new Rect(p0-Vector2.one*.1f,Vector2.one*.2f),90);CheckThat("Repère en mode direction du joueur",rotated.y>.5f&&Mathf.Abs(rotated.x-.5f)<.01f);settings.preferences.headingUp=false;
            yield return Shot("HUD-1920");yield return Shot("HUD-1280",1280,720);yield return Shot("HUD-2560",2560,1440);Screen.SetResolution(1920,1080,FullScreenMode.Windowed);yield return Wait();
            float energy=campaign.Value("stat","energy");var player=campaign.bindings.player;var initial=player.position;
            float started=Time.unscaledTime;while(Time.unscaledTime-started<1.1f){keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.W,Key.LeftShift));yield return null;}InputSystem.QueueStateEvent(keyboard,new KeyboardState());yield return null;
            CheckThat("Course et énergie",campaign.Value("stat","energy")<energy-1&&Vector3.Distance(initial,player.position)>1,$"energy={campaign.Value("stat","energy")} movement={Vector3.Distance(initial,player.position)}");
            yield return Press(Key.Tab);CheckThat("Tab ouvre inventaire",menus.IsOpen&&menus.Mode=="Inventaire");inventory.Select(4);campaign.Apply(new EffectDefinition{kind="stat",target="food",operation="set",value=40});menus.Render();yield return Wait();
            float food=inventory.Quantity("food");var consume=menus.GetComponentsInChildren<UnityEngine.UI.Button>().FirstOrDefault(b=>b.GetComponentInChildren<TMP_Text>()?.text=="Consommer");
            bool raycast=false;if(consume!=null){var pos=RectTransformUtility.WorldToScreenPoint(null,consume.transform.TransformPoint(consume.GetComponent<RectTransform>().rect.center));var hits=new List<RaycastResult>();EventSystem.current.RaycastAll(new PointerEventData(EventSystem.current){position=pos},hits);raycast=hits.Any(h=>h.gameObject.transform.IsChildOf(consume.transform)||h.gameObject==consume.gameObject);consume.onClick.Invoke();}
            CheckThat("Utilisation réelle et pointeur",consume!=null&&raycast&&inventory.Quantity("food")==food-1&&campaign.Value("stat","food")>40);yield return Shot("Inventaire");menus.Close();
            yield return Press(Key.V);CheckThat("V ouvre fabrication",menus.IsOpen&&menus.Mode=="Fabrication"&&menus.Recipes.Length>=2);yield return Shot("Fabrication");yield return Press(Key.V);CheckThat("V referme fabrication",!menus.IsOpen);
            yield return Press(Key.M);float zoom=map.Zoom;map.SetZoom(2);map.Pan(new Vector2(35,15));yield return Wait();CheckThat("Carte zoom et déplacement",map.IsOpen&&map.Zoom>zoom);yield return Shot("Carte-GPS");yield return Press(Key.M);CheckThat("M ferme et reprend",!map.IsOpen&&!campaign.UserPaused);
            var mentor=campaign.bindings.Find("mathieu");var agent=mentor.GetComponent<NavMeshAgent>();var prior=mentor.position;int calculations=nav.Calculations;
            if(NavMesh.SamplePosition(prior+Vector3.right*1.8f,out var moved,2,VillageNavigation.Filter()))agent.Warp(moved.position);yield return Wait(1.2f);CheckThat("PNJ mobile actualise le GPS",nav.Calculations>calculations&&nav.Complete);agent.Warp(prior);
            var cc=player.GetComponent<CharacterController>();cc.enabled=false;player.position=mentor.position+Vector3.back*1.5f;cc.enabled=true;campaign.GetComponent<WorldInteraction>().Execute("M_I_TUTORIEL_1");yield return Wait();bool dialogue=campaign.Dialogue!=null;
            var continueButton=campaign.GetComponentsInChildren<UnityEngine.UI.Button>().FirstOrDefault(b=>b.GetComponentInChildren<TMP_Text>()?.text=="Continuer");if(continueButton!=null)continueButton.onClick.Invoke();yield return new WaitUntil(()=>!campaign.IsBusy&&campaign.Dialogue==null);yield return Wait(1);
            CheckThat("Objectif suivant automatique",dialogue&&campaign.State.completedActions.Contains("M_I_TUTORIEL_1")&&nav.Action?.id=="M_I_TUTORIEL_2"&&nav.Complete);yield return Shot("Objectif-suivant");
            if(nav.Corners.Length>=2)
            {
                var a=nav.Corners[0];var b=nav.Corners[1];var obstacle=GameObject.CreatePrimitive(PrimitiveType.Cube);obstacle.name="Construction temporaire de validation";var middle=Vector3.Lerp(a,b,.55f);middle.y=VillageLife.Ground(middle)+1;obstacle.transform.position=middle;obstacle.transform.localScale=new Vector3(.8f,2,.8f);var carve=obstacle.AddComponent<NavMeshObstacle>();carve.size=Vector3.one;carve.carving=true;carve.carveOnlyStationary=false;
                var bounds=obstacle.GetComponent<Collider>().bounds;campaign.GetComponent<VillageNavigation>().RequestRebuild();yield return Wait(1.3f);while(campaign.GetComponent<VillageNavigation>().Rebuilding)yield return null;nav.ForceRefresh();yield return Wait(.9f);bool crosses=false;for(int i=1;i<nav.Corners.Length;i++){var delta=nav.Corners[i]-nav.Corners[i-1];if(bounds.IntersectRay(new Ray(nav.Corners[i-1]+Vector3.up,delta.normalized),out float d)&&d<delta.magnitude)crosses=true;}CheckThat("Construction et nouveau trajet",nav.Complete&&!crosses,"revision="+campaign.GetComponent<VillageNavigation>().Revision);Destroy(obstacle);yield return null;campaign.GetComponent<VillageNavigation>().RequestRebuild();yield return Wait(1);
            }
            campaign.State.risks.Add(new NamedValue("silex",2));campaign.Inform("Danger identifié au poste de silex");nav.Follow("craft:flint");yield return Wait(1.1f);var closure=campaign.GetComponentsInChildren<NavMeshObstacle>().FirstOrDefault(o=>o.name=="Danger identifié : silex");CheckThat("Danger identifié exclu des trajets",closure!=null&&closure.enabled&&closure.carving&&nav.Complete);campaign.State.risks.First(r=>r.id=="silex").value=0;campaign.Inform("Zone de validation réouverte");yield return Wait(1);
            var life=campaign.GetComponent<VillageLife>();bool activeLife=life.enabled;life.enabled=false;
            foreach(var recipeId in new[]{"craft:flint","craft:tool"})
            {
                nav.Follow(recipeId);yield return Wait(.8f);if(nav.Complete){cc.enabled=false;player.position=nav.InteractionPoint;cc.enabled=true;}var recipe=campaign.Data.actions.First(a=>a.id==recipeId);string item=recipeId=="craft:flint"?"flint":"tool";float beforeCount=inventory.Quantity(item);campaign.GetComponent<WorldInteraction>().Execute(recipeId);yield return new WaitUntil(()=>!campaign.IsBusy);CheckThat("Fabrication réelle "+item,inventory.Quantity(item)>beforeCount&&campaign.State.completedActions.Contains(recipeId));
            }
            inventory.Select(5);inventory.Use();var equipped=campaign.bindings.characters.First(c=>c.id==campaign.Data.playerCharacterId).animator.GetBoneTransform(HumanBodyBones.RightHand).GetComponentsInChildren<MeshRenderer>().FirstOrDefault(r=>r.name=="Hache équipée du joueur");CheckThat("Outil équipé à l'échelle",equipped!=null&&equipped.enabled&&equipped.bounds.size.magnitude>.1f&&equipped.bounds.size.magnitude<1.2f);life.enabled=activeLife;
            float energyBeforeEffect=campaign.Value("stat","energy");campaign.Apply(new EffectDefinition{kind="character",target=campaign.Data.playerCharacterId+".energy",operation="add",value=-4});CheckThat("État joueur unique",Mathf.Abs(campaign.State.characters.First(c=>c.id==campaign.Data.playerCharacterId).energy-campaign.Value("stat","energy"))<.01f&&Mathf.Abs(campaign.Value("stat","energy")-(energyBeforeEffect-4))<.01f);
            settings.preferences.learnedControls=31;CheckThat("Aide masquée après apprentissage",!settings.ControlsVisible);settings.preferences.learnedControls=0;CheckThat("Aide réactivable",settings.ControlsVisible);
            settings.preferences.hudScale=1.1f;settings.preferences.gpsMode=1;settings.Save();var saved=JsonUtility.FromJson<AdventurePreferences>(PlayerPrefs.GetString("UNGA.AdventureUI.v4"));CheckThat("Préférences persistantes",saved.hudScale==1.1f&&saved.gpsMode==1);settings.preferences=new AdventurePreferences();
            menus.Open("Réglages");yield return Shot("Réglages");
            var keyboardTab=menus.GetComponentsInChildren<UnityEngine.UI.Button>().First(b=>b.GetComponentInChildren<TMP_Text>()?.text=="Commandes clavier");keyboardTab.onClick.Invoke();yield return Wait();
            var rebind=menus.GetComponentsInChildren<UnityEngine.UI.Button>().First(b=>b.GetComponentInChildren<TMP_Text>()?.text=="Inventaire : Tab");rebind.onClick.Invoke();yield return Press(Key.I);CheckThat("Remappage clavier",settings.Binding("inventory")=="I");yield return Shot("Commandes");menus.Close();yield return Press(Key.I);CheckThat("Raccourci remappé fonctionnel",menus.IsOpen&&menus.Mode=="Inventaire");menus.Close();settings.preferences.inventory="Tab";
            settings.preferences.gpsMode=1;nav.TemporaryGuidance=false;yield return Wait(.9f);var routeRoot=campaign.transform.Find("Repères du guidage des Crânes");CheckThat("GPS discret sans tracé au sol",routeRoot.Cast<Transform>().Where(t=>t.name=="Parcours praticable").All(t=>!t.gameObject.activeSelf));settings.preferences.gpsMode=2;yield return Wait(.9f);CheckThat("Exploration sans route automatique",campaign.GetComponentsInChildren<MapRouteGraphic>().All(g=>!g.RouteVisible));settings.preferences.gpsMode=0;

            campaign.cinematicDirector.Play("C01");yield return Wait(.5f);CheckThat("HUD et GPS suspendus en cinématique",!view.GameplayRoot.gameObject.activeSelf&&view.SkipButton.gameObject.activeSelf);campaign.cinematicDirector.Skip();while(campaign.cinematicDirector.IsPlaying)yield return null;yield return Wait(.5f);CheckThat("HUD rétabli après cinématique",view.GameplayRoot.gameObject.activeSelf&&!view.SkipButton.gameObject.activeSelf);
            // A real construction action is executed from a documented prerequisite fixture, without shortening its duration.
            var build=campaign.Data.actions.First(a=>a.id=="M_V_CONSTRUIRE_3");campaign.State.actIndex=Array.FindIndex(campaign.Data.acts,a=>a.id==build.actId);
            foreach(var prerequisite in build.requiredFlags)if(!campaign.HasFlag(prerequisite))campaign.State.flags.Add(prerequisite);
            foreach(var id in new[]{"M_V_CONSTRUIRE_1","M_V_CONSTRUIRE_2"})if(!campaign.State.completedActions.Contains(id))campaign.State.completedActions.Add(id);
            var housing=campaign.bindings.buildings.First(b=>b.id=="habitations");int before=Array.FindIndex(housing.stages,g=>g.activeSelf);var target=campaign.bindings.Find(build.targetBindingId);
            nav.Follow(build.id);yield return Wait(1);if(nav.Complete){cc.enabled=false;player.position=nav.InteractionPoint;cc.enabled=true;}
            int navigationBeforeBuilding=campaign.GetComponent<VillageNavigation>().Revision;campaign.GetComponent<WorldInteraction>().Execute(build.id);yield return new WaitUntil(()=>!campaign.IsBusy);yield return Wait(1);
            CheckThat("Construction, preuve, ISO et ressources synchronisés",campaign.State.completedActions.Contains(build.id)&&campaign.State.evidence.Contains(build.id)&&Array.FindIndex(housing.stages,g=>g.activeSelf)!=before&&campaign.IsObjectiveComplete(campaign.Data.acts.SelectMany(a=>a.objectives).First(o=>o.id=="M_V_CONSTRUIRE")));
            CheckThat("Nouvelle géométrie actualise la navigation",campaign.GetComponent<VillageNavigation>().Revision>navigationBeforeBuilding);
            menus.Open("ISO 45001");yield return Shot("Arbre-ISO");menus.Close();float fatigue=campaign.Value("stat","fatigue");cc.enabled=false;player.position=campaign.bindings.Find("repos").position+Vector3.right*.8f;cc.enabled=true;yield return Wait(1.5f);CheckThat("Repos réduit la fatigue",campaign.Value("stat","fatigue")<fatigue);
            campaign.State.inventorySlot=6;campaign.Save();var pathToSave=Path.Combine(Application.temporaryCachePath,"unga-bunga-verification",campaign.Data.id+".save.json");
            bool found=false;foreach(var file in Directory.GetFiles(Path.Combine(Application.temporaryCachePath,"unga-bunga-verification"),"*.json")){try{var state=JsonUtility.FromJson<CampaignSave>(File.ReadAllText(file));if(state.inventorySlot==6&&state.completedActions.Contains(build.id))found=true;}catch{}}
            CheckThat("Sauvegarde conserve état et inventaire",found);File.WriteAllText(Folder+"/ui-frames.txt",first+" -> "+Time.frameCount);Finish();
        }
        void Finish()
        {
            if(finished)return;finished=true;if(hadPreferences)PlayerPrefs.SetString("UNGA.AdventureUI.v4",originalPreferences);else PlayerPrefs.DeleteKey("UNGA.AdventureUI.v4");PlayerPrefs.Save();
            var receipt=new Receipt{status=checks.All(c=>c.passed)&&errors.Count==0?"passed":"failed",player=campaign?.Data.playerCharacterId,firstFrame=1,lastFrame=Time.frameCount,navigationCalculations=nav?.Calculations??0,checks=checks.ToArray(),errors=errors.ToArray(),captures=captures.ToArray()};File.WriteAllText(Folder+"/interface-validation.json",JsonUtility.ToJson(receipt,true));if(keyboard!=null)InputSystem.RemoveDevice(keyboard);Application.Quit(receipt.status=="passed"?0:1);
        }
    }
}

#endif
