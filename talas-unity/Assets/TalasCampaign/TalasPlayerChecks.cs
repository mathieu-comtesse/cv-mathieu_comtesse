using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
public class TalasPlayerChecks:MonoBehaviour
{
 [Serializable] class Report{public string platform,graphicsDevice,renderMethod="URP offscreen camera with UI";public bool rendered,movement,animated,combatWin,wrongAnswerRejected,documentationWin,globalClockRunsDuringGames,deathPoseHeld;public float averageFps,p95FrameMs;public int frames,errors;}
 int errors;
 [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)] static void Init()
 {
  Application.targetFrameRate=Application.platform==RuntimePlatform.WebGLPlayer?30:60;
  if(Application.platform==RuntimePlatform.WebGLPlayer)
  {
   QualitySettings.SetQualityLevel(0,true);
   var webPipeline=QualitySettings.renderPipeline as UniversalRenderPipelineAsset;
   if(webPipeline!=null)webPipeline.useSRPBatcher=false;
   var lit=Shader.Find("Universal Render Pipeline/Lit");
   Debug.Log("Talas Web render: quality="+QualitySettings.GetQualityLevel()+", pipeline="+(webPipeline!=null?webPipeline.name:"none")+", SRP batcher="+(webPipeline!=null&&webPipeline.useSRPBatcher)+", Lit supported="+(lit!=null&&lit.isSupported)+", renderers="+UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None).Length);
  }
  if(Application.platform==RuntimePlatform.WebGLPlayer)foreach(var r in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))if(r.sharedMaterial!=null&&r.sharedMaterial.shader.name=="Talas/Brume volumetrique")r.material.SetFloat("_Steps",8);
  if(Application.platform==RuntimePlatform.WebGLPlayer)return;
  if(Array.IndexOf(Environment.GetCommandLineArgs(),"--talas-smoke")>=0)new GameObject("ContrÃ´le du player").AddComponent<TalasPlayerChecks>();
 }
 IEnumerator Start()
 {
  Application.logMessageReceived+=(text,stack,type)=>{if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)errors++;};InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;if(Keyboard.current==null)InputSystem.AddDevice<Keyboard>();
  string folder=Application.persistentDataPath;foreach(var a in Environment.GetCommandLineArgs())if(a.StartsWith("--talas-report="))folder=a.Substring(15);System.IO.Directory.CreateDirectory(folder);
  var result=new Report{platform=Application.platform.ToString(),graphicsDevice=SystemInfo.graphicsDeviceName};
  yield return new WaitForSeconds(2);var c=UnityEngine.Object.FindFirstObjectByType<TalasCampaign>();var originalProgress=JsonUtility.FromJson<TalasCampaign.SaveData>(JsonUtility.ToJson(c.progress));for(int read=0;read<30;read++){bool found=false;foreach(var button in UnityEngine.Object.FindObjectsByType<UnityEngine.UI.Button>(FindObjectsSortMode.None))if(button.name=="Continuer"&&button.gameObject.activeInHierarchy){button.onClick.Invoke();found=true;break;}yield return null;if(!found)break;}c.ClosePopup();
  var m=c.player.GetComponent<TalasQuayMovement>();float x=c.player.position.x;var aplayer=m.rig.animationPlayer;Transform bone=null;foreach(var t in aplayer.GetComponentsInChildren<Transform>())if(t.name=="hand_r")bone=t;Quaternion rest=bone!=null?bone.localRotation:Quaternion.identity;
  var previousKeyboard=Keyboard.current;var testKeyboard=InputSystem.AddDevice<Keyboard>("TalasQAKeyboard");for(float held=0;held<1;held+=Time.unscaledDeltaTime){testKeyboard.MakeCurrent();InputSystem.QueueStateEvent(testKeyboard,new KeyboardState(Key.D));yield return null;}result.movement=c.player.position.x>x+.5f;result.animated=aplayer.IsPlaying("Walk_Loop")&&aplayer["Walk_Loop"].time>.1f&&bone!=null&&Quaternion.Angle(rest,bone.localRotation)>.5f;
  InputSystem.QueueStateEvent(testKeyboard,new KeyboardState());yield return null;InputSystem.RemoveDevice(testKeyboard);if(previousKeyboard!=null)previousKeyboard.MakeCurrent();
  result.rendered=Capture(System.IO.Path.Combine(folder,"Windows-Quai.png"));yield return new WaitForSeconds(1);
  var samples=new List<float>();for(int i=0;i<180;i++){samples.Add(Time.unscaledDeltaTime);yield return null;}float sum=0;foreach(float t in samples)sum+=t;result.averageFps=samples.Count/sum;samples.Sort();result.p95FrameMs=samples[(int)(samples.Count*.95f)]*1000;result.frames=samples.Count;
  var g=c.games;float beforeClock=c.progress.remaining;g.Begin("combat",(won,stars)=>{});g.StartGame();yield return new WaitForSeconds(.3f);result.globalClockRunsDuringGames=c.progress.remaining<beforeClock-.15f;int health=g.Health;g.Choose((g.ExpectedAnswer+1)%4);result.wrongAnswerRejected=g.Health==health-1&&g.Score==0;g.Next();yield return null;
  while(g.LastResult==""){if(g.AwaitingAnswer)g.Choose(g.ExpectedAnswer);else if(g.ReadyForNext)g.Next();yield return null;}
  result.combatWin=g.LastResult=="R\u00e9ussite";result.rendered&=Capture(System.IO.Path.Combine(folder,"Windows-Combat.png"));yield return new WaitForSeconds(1);g.ReturnResult();yield return null;
  g.Begin("combat",(won,stars)=>{});g.StartGame();yield return null;while(g.LastResult==""){if(g.AwaitingAnswer)g.Choose((g.ExpectedAnswer+1)%4);else if(g.ReadyForNext)g.Next();yield return null;}yield return new WaitForSeconds(4);foreach(var r in UnityEngine.Object.FindObjectsByType<TalasRigAnimator>(FindObjectsSortMode.None))if(r.CurrentClip=="Death01"&&r.animationPlayer["Death01"].wrapMode==WrapMode.ClampForever)result.deathPoseHeld=true;Capture(System.IO.Path.Combine(folder,"Windows-Echec.png"));g.ReturnResult();yield return null;
  g.Begin("doc",(won,stars)=>{});g.StartGame();yield return null;while(g.LastResult==""){if(g.AwaitingAnswer)g.Choose(g.ExpectedAnswer);else if(g.ReadyForNext)g.Next();yield return null;}result.documentationWin=g.LastResult=="R\u00e9ussite";g.ReturnResult();yield return new WaitForSeconds(1);
  c.progress=originalProgress;c.Save();result.errors=errors;System.IO.File.WriteAllText(System.IO.Path.Combine(folder,"Windows-Verification.json"),JsonUtility.ToJson(result,true));Application.Quit();
 }
 bool Capture(string file)
 {
  var cam=Camera.main;var canvases=UnityEngine.Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None);var modes=new RenderMode[canvases.Length];var cameras=new Camera[canvases.Length];var distances=new float[canvases.Length];
  for(int i=0;i<canvases.Length;i++){modes[i]=canvases[i].renderMode;cameras[i]=canvases[i].worldCamera;distances[i]=canvases[i].planeDistance;canvases[i].renderMode=RenderMode.ScreenSpaceCamera;canvases[i].worldCamera=cam;canvases[i].planeDistance=1;}
  Canvas.ForceUpdateCanvases();var rt=RenderTexture.GetTemporary(1280,720,24,RenderTextureFormat.ARGB32);var previous=RenderTexture.active;var tex=new Texture2D(1280,720,TextureFormat.RGB24,false);
  RenderPipeline.SubmitRenderRequest(cam,new UniversalRenderPipeline.SingleCameraRequest{destination=rt});RenderTexture.active=rt;tex.ReadPixels(new Rect(0,0,1280,720),0,0);tex.Apply();System.IO.File.WriteAllBytes(file,tex.EncodeToPNG());var pixels=tex.GetPixels32();int changed=0;var first=pixels[0];for(int i=0;i<pixels.Length;i+=16)if(Mathf.Abs(pixels[i].r-first.r)+Mathf.Abs(pixels[i].g-first.g)+Mathf.Abs(pixels[i].b-first.b)>15)changed++;
  RenderTexture.active=previous;RenderTexture.ReleaseTemporary(rt);Destroy(tex);for(int i=0;i<canvases.Length;i++){canvases[i].renderMode=modes[i];canvases[i].worldCamera=cameras[i];canvases[i].planeDistance=distances[i];}return changed>2000;
 }
}
