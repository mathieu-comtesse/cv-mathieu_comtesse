#if UNITY_EDITOR || UNITY_STANDALONE
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicArchitectureValidationV19:MonoBehaviour
 {
  [Serializable]class Check{public string name,detail;public bool passed;}
  [Serializable]class Report{public string status,scope;public Check[] checks;public string[] errors;}
  readonly List<Check> checks=new List<Check>();readonly List<string> errors=new List<string>();CampaignRuntime c;VillageUpgradeV18 village;ThirdPersonMotor motor;CharacterController body;bool oldMotor;int frame;bool complete;
  static bool Modules=>Environment.GetCommandLineArgs().Contains("-thaleolithicConstructionModules");
  static string Out=>"E:/UNGA-BUNGA-45001/Revision19/"+(Modules?"ModulesConstruction/":Application.isEditor?"":"NativeChecks/");
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]static void Boot()
  {if(Application.isEditor||!Environment.GetCommandLineArgs().Contains("-thaleolithicV19Architecture"))return;Application.runInBackground=true;var root=new GameObject("V19 architecture test bootstrap");DontDestroyOnLoad(root);root.AddComponent<ArchitectureBootstrapV19>();}
  void CheckThat(string name,bool passed,string detail=""){checks.Add(new Check{name=name,passed=passed,detail=detail});Write();}
  void Write(){Directory.CreateDirectory(Out);File.WriteAllText(Out+"validation.json",JsonUtility.ToJson(new Report{status=errors.Count>0||checks.Any(x=>!x.passed)?"failed":complete?"passed":"running",scope=Modules?"Tier 2 and 3 module geometry, character-controller traversal and isolated save reload in the production scene.":"Architecture upgrade, controls and character-controller traversal in an isolated campaign.",checks=checks.ToArray(),errors=errors.ToArray()},true));}
  void Log(string message,string trace,LogType type){if(type==LogType.Error||type==LogType.Exception)errors.Add(message);}
  void Place(Vector3 p){body.enabled=false;p.y=VillageLife.Ground(p)+.035f;c.bindings.player.position=p;body.enabled=true;}
  void Capture(string name,bool sequence=false)
  {
   var root=village.Instances["hut_mathilde"].transform;var cam=c.bindings.gameplayCamera;var pos=cam.transform.position;var rot=cam.transform.rotation;cam.transform.position=root.position+new Vector3(5,3.4f,-6.5f);cam.transform.LookAt(root.position+Vector3.up*1.1f);var previous=RenderTexture.active;var rt=RenderTexture.GetTemporary(1280,720,24);Texture2D image=null;
   try{RenderPipeline.SubmitRenderRequest(cam,new RenderPipeline.StandardRequest{destination=rt});RenderTexture.active=rt;image=new Texture2D(1280,720,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,1280,720),0,0);image.Apply();string path=sequence?Out+"DoorFrames/"+(frame++).ToString("D5")+".png":Out+"Review/"+name+".png";Directory.CreateDirectory(Path.GetDirectoryName(path));File.WriteAllBytes(path,image.EncodeToPNG());}
   finally{RenderTexture.active=previous;RenderTexture.ReleaseTemporary(rt);if(image!=null)Destroy(image);cam.transform.SetPositionAndRotation(pos,rot);}
  }
  IEnumerator Walk(Transform house,Vector3 direction,float seconds,bool record)
  {
   var animator=c.bindings.AnimatorFor("dylan");VillageLife.Play(animator,motor.Crouching?"CrouchLocomotion":"Locomotion");animator.SetFloat("Speed",.5f);float elapsed=0;
   while(elapsed<seconds){float dt=Time.deltaTime;body.Move((direction*1.25f+Vector3.down*2)*dt);if(motor.visual!=null)motor.visual.rotation=Quaternion.LookRotation(direction);elapsed+=dt;yield return null;if(record)Capture("",true);}
   animator.SetFloat("Speed",0);
  }
  IEnumerator Door(InstallationStateV18 state,int tier,bool record)
  {
   var house=village.Instances[state.id].transform;motor.SetCrouched(false);Place(house.position+Vector3.back*2.65f);yield return null;
   yield return Walk(house,Vector3.forward,1.8f,record);float standing=house.InverseTransformPoint(c.bindings.player.position).z;CheckThat("tier "+tier+" standing entry blocked",standing< -1.4f,standing.ToString("0.000"));
   bool crouched=motor.SetCrouched(true);yield return Walk(house,Vector3.forward,1.8f,record);float inside=house.InverseTransformPoint(c.bindings.player.position).z;CheckThat("tier "+tier+" crouched entry crosses real doorway",crouched&&inside>-.75f,inside.ToString("0.000"));
   CheckThat("tier "+tier+" feet remain on terrain",Mathf.Abs(c.bindings.player.position.y-VillageLife.Ground(c.bindings.player.position))<.12f);
   bool stand=motor.SetCrouched(false);CheckThat("tier "+tier+" can stand inside",stand);yield return Walk(house,Vector3.forward,1.7f,record);float back=house.InverseTransformPoint(c.bindings.player.position).z;CheckThat("tier "+tier+" rear wall blocks traversal",back<1.45f,back.ToString("0.000"));
   motor.SetCrouched(true);yield return Walk(house,Vector3.back,3.1f,record);float outside=house.InverseTransformPoint(c.bindings.player.position).z;CheckThat("tier "+tier+" crouched exit",outside< -1.9f,outside.ToString("0.000"));motor.SetCrouched(false);
  }
  IEnumerator Start()
  {
   if(!TribalInterfaceAudit.Requested)throw new InvalidOperationException("Isolated save required");Application.logMessageReceived+=Log;c=GetComponent<CampaignRuntime>();yield return new WaitUntil(()=>c.State!=null);if(!Path.GetFullPath(c.CurrentSavePath).StartsWith(Path.GetFullPath(TribalInterfaceAudit.IsolatedSaveRoot)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Test must not modify the player save");c.GetComponent<CinematicTriggersV15>().SuspendAutomatic=true;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.NewCampaign();yield return null;c.cinematicDirector.Skip();yield return new WaitUntil(()=>!c.cinematicDirector.IsPlaying);c.State.pendingCinematicsV15.Clear();c.SetPause(false);yield return new WaitForSeconds(3);
   village=c.GetComponent<VillageUpgradeV18>();motor=c.bindings.player.GetComponent<ThirdPersonMotor>();body=c.bindings.player.GetComponent<CharacterController>();oldMotor=motor.enabled;motor.enabled=false;
   if(Modules){yield return AuditModules();yield break;}
   CheckThat("six existing installation identities",village.Instances.Count==6);CheckThat("tier 0/1 do not contain native earth panels",village.Instances.Values.All(r=>!r.GetComponentsInChildren<MeshFilter>().Any(f=>f.sharedMesh.name=="wall-flat")));
   var s=village.StateFor("hut_mathilde");s.tier=s.pendingTier=1;s.phase=InstallationPhaseV18.Verified;s.usable=true;c.State.villageV18.chapters.Add(7);village.RefreshInstallation(s.id);yield return null;yield return null;Capture("tier1-before");Place(village.Instances[s.id].transform.position+Vector3.right*2.3f);
   int wood=(int)c.Value("resource","wood");CheckThat("real tier 1 to 2 upgrade starts",village.BeginUpgrade(s.id));CheckThat("resources charged once",(int)c.Value("resource","wood")==wood-6&&!village.BeginUpgrade(s.id));
   float deadline=Time.realtimeSinceStartup+100;bool panel=false;
   while(s.phase==InstallationPhaseV18.Building&&Time.realtimeSinceStartup<deadline){if(!panel&&s.workSeconds>3){panel=true;CheckThat("builder prepares the native wall mesh",FindObjectsByType<MeshFilter>(FindObjectsSortMode.None).Any(f=>f.sharedMesh!=null&&f.sharedMesh.name=="wall-flat"&&f.transform.root==transform.root));Capture("native-work-panel");}yield return null;}
   CheckThat("finished native tier stays unusable before controls",s.phase==InstallationPhaseV18.AwaitingControl&&!s.usable&&s.tier==1);yield return null;Capture("tier2-awaiting-controls");
   var closed=village.Instances[s.id].transform;Place(closed.position+Vector3.back*2.7f);motor.SetCrouched(true);yield return Walk(closed,Vector3.forward,1.6f,false);CheckThat("unchecked construction physically remains closed",closed.InverseTransformPoint(c.bindings.player.position).z< -1.7f);motor.SetCrouched(false);Place(closed.position+Vector3.right*2.3f);
   CheckThat("three controls reopen installation",village.Control(s.id,"stability")&&village.Control(s.id,"access")&&village.Control(s.id,"use")&&s.tier==2&&s.usable);yield return null;yield return null;
   CheckThat("tier2 replaces old roof and walls",village.Instances[s.id].GetComponentsInChildren<MeshFilter>().Any(f=>f.sharedMesh.name=="roof-flat")&&!village.Instances[s.id].GetComponentsInChildren<Transform>().Any(t=>t.name.StartsWith("TH18_Wall")||t.name.StartsWith("TH18_Roof")));
   CheckThat("native atlas assigned to every architecture renderer",village.Instances[s.id].GetComponentsInChildren<MeshRenderer>().All(r=>r.sharedMaterials.All(m=>m.mainTexture!=null&&m.mainTexture.name=="atlas-universal-albedo-a")));
   Capture("tier2-after");float priorCapture=Time.captureDeltaTime;if(Application.isEditor)Time.captureDeltaTime=1f/30;yield return Door(s,2,Application.isEditor);Time.captureDeltaTime=priorCapture;
   s.tier=s.pendingTier=3;s.phase=InstallationPhaseV18.Verified;s.usable=true;village.RefreshInstallation(s.id);yield return null;yield return null;CheckThat("tier3 uses joined native ridge",village.Instances[s.id].GetComponentsInChildren<MeshFilter>().Any(f=>f.sharedMesh.name=="roof-ridge"));Capture("tier3-after");yield return Door(s,3,false);
   c.Save();CheckThat("native tier state survives reload",c.ReloadSavedCampaign()&&c.State.villageV18.installations.Find(x=>x.id==s.id).tier==3);yield return new WaitForSeconds(1.2f);CheckThat("native ridge reconstructed after reload",village.Instances[s.id].GetComponentsInChildren<MeshFilter>().Any(f=>f.sharedMesh.name=="roof-ridge"));
   complete=true;Write();if(motor!=null)motor.enabled=oldMotor;Application.logMessageReceived-=Log;if(!Application.isEditor)Application.Quit(checks.All(x=>x.passed)&&errors.Count==0?0:1);Destroy(this);
  }
  IEnumerator AuditModules()
  {
   var state=village.StateFor("hut_mathilde");
   CheckThat("ordinary campaign starts with both homes",village.Instances.ContainsKey(state.id)&&village.Instances.ContainsKey("hut_milena"));
   for(int tier=2;tier<=3;tier++)
   {
    state.tier=state.pendingTier=tier;state.phase=InstallationPhaseV18.Verified;state.usable=true;
    village.RefreshInstallation(state.id);yield return null;yield return null;
    var house=village.Instances[state.id];
    var names=house.GetComponentsInChildren<MeshCollider>().Where(m=>m.sharedMesh!=null).Select(m=>m.sharedMesh.name).ToArray();
    CheckThat("tier "+tier+" uses a native door and window with colliders",names.Contains("wall-doorframe-wall")&&names.Contains("wall-window"));
    CheckThat("tier "+tier+" uses two native gables and the matching roof",names.Count(n=>n=="wall-ridge")==2&&names.Contains(tier==2?"roof-flat":"roof-ridge"));
    var newMeshes=house.GetComponentsInChildren<MeshFilter>().Where(f=>f.sharedMesh!=null&&new[]{"wall-doorframe-wall","wall-window","wall-ridge"}.Contains(f.sharedMesh.name));
    CheckThat("tier "+tier+" keeps the original color atlas",newMeshes.All(f=>f.GetComponent<MeshRenderer>().sharedMaterials.All(m=>m.mainTexture?.name=="atlas-universal-albedo-a")));
    Capture("modules-tier"+tier);yield return Door(state,tier,false);
   }
   c.Save();
   CheckThat("tier 3 survives isolated save reload",c.ReloadSavedCampaign()&&village.StateFor(state.id).tier==3);
   yield return new WaitForSeconds(1.2f);
   CheckThat("reloaded home restores native windows",village.Instances[state.id].GetComponentsInChildren<MeshFilter>().Any(f=>f.sharedMesh!=null&&f.sharedMesh.name=="wall-window"));
   complete=true;Write();motor.enabled=oldMotor;Application.logMessageReceived-=Log;
#if UNITY_EDITOR
   if(Application.isBatchMode)UnityEditor.EditorApplication.Exit(checks.All(x=>x.passed)&&errors.Count==0?0:1);
#endif
   Destroy(this);
  }
  void OnDestroy(){Application.logMessageReceived-=Log;}
 }
 public sealed class ArchitectureBootstrapV19:MonoBehaviour
 {IEnumerator Start(){yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);FindFirstObjectByType<CampaignRuntime>().gameObject.AddComponent<CinematicArchitectureValidationV19>();Destroy(gameObject);}}
}
#endif
