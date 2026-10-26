#if UNGA_WEB_RENDERER
using UnityEngine; namespace UngaBunga45001 { public sealed class LocomotionAudit:MonoBehaviour {public static bool Requested=>false;} }
#else
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001
{
    public sealed class LocomotionAudit:MonoBehaviour
    {
        public static bool Requested=>Environment.GetCommandLineArgs().Contains("-ungaWalk");
        [Serializable]private class ActorResult{public string id,navigation,anatomyStart,anatomyMoving,anatomyEnd;public int frames,contactFrames,footstepEvents,facingSamples;public bool avatarValid,pathComplete;public float movement,leftArmDegrees,rightArmDegrees,minLeftGap=999,minRightGap=999,maxPenetration,maxPenetrationTime,forwardAlignment;}
        [Serializable]private class Receipt{public string status,player,mapGeometry;public ActorResult[] actors;public int waterSurfaces,waterQueries,splashes;public float waterDepth,waterMovement,minimumRawDepth,maximumRawDepth;public Vector3 deepestSample;public bool playerGrounded,mapOpened,mapClosed,waterTestPassed;public string[] errors;}
        private readonly List<string> errors=new List<string>();
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]private static void Initialize(){if(!Requested||Application.isEditor)return;var go=new GameObject("Native gait audit");DontDestroyOnLoad(go);go.AddComponent<LocomotionAudit>();}
        private void Awake(){Application.logMessageReceived+=(c,s,t)=>{if((t==LogType.Error||t==LogType.Exception)&&errors.Count<30&&!errors.Contains(c))errors.Add(c);};UnityEngine.SceneManagement.SceneManager.sceneLoaded+=(s,m)=>{var c=FindFirstObjectByType<CampaignRuntime>();if(c!=null)c.resumeOnStart=false;};}
        private IEnumerator Start()
        {
            yield return new WaitUntil(()=>FindFirstObjectByType<CampaignRuntime>()?.State!=null);var campaign=FindFirstObjectByType<CampaignRuntime>();campaign.cinematicDirector.Skip();while(campaign.cinematicDirector.IsPlaying)yield return null;yield return new WaitForSeconds(1);
            var life=campaign.GetComponent<VillageLife>();life.enabled=false;var results=new List<ActorResult>();var bindings=campaign.bindings;
            var keyboard=InputSystem.AddDevice<Keyboard>("Native gait audit keyboard");keyboard.MakeCurrent();InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
            foreach(var actor in bindings.characters)
            {
                var root=bindings.Find(actor.id);var animator=actor.animator;var entry=new ActorResult{id=actor.id,avatarValid=animator.avatar!=null&&animator.avatar.isValid&&animator.avatar.isHuman};results.Add(entry);
                var left=animator.GetBoneTransform(HumanBodyBones.LeftUpperArm);var right=animator.GetBoneTransform(HumanBodyBones.RightUpperArm);var leftFoot=animator.GetBoneTransform(HumanBodyBones.LeftFoot);var rightFoot=animator.GetBoneTransform(HumanBodyBones.RightFoot);
                var leftToe=animator.GetBoneTransform(HumanBodyBones.LeftToes);var rightToe=animator.GetBoneTransform(HumanBodyBones.RightToes);var priorRoot=root.position;
                var leftInitial=left.localRotation;var rightInitial=right.localRotation;var initial=root.position;var agent=root.GetComponent<NavMeshAgent>();var audio=animator.GetComponent<NativeAnimationAudio>();int eventsBefore=audio.contactEvents;
                entry.anatomyStart=Measure(actor);animator.Play("Locomotion",0,0);animator.SetFloat("Speed",.5f);
                entry.navigation=agent==null?"player":("enabled="+agent.enabled+" onMesh="+agent.isOnNavMesh+" position="+root.position);
                if(agent!=null&&agent.enabled&&agent.isOnNavMesh)
                {
                    agent.isStopped=false;agent.speed=1.8f;agent.acceleration=4;
                    for(float radius=2;radius<=4&&!entry.pathComplete;radius+=1)
                    for(int angle=0;angle<16&&!entry.pathComplete;angle++)
                    {
                        var direction=Quaternion.Euler(0,angle*22.5f,0)*Vector3.forward;
                        if(!NavMesh.SamplePosition(initial+direction*radius,out var hit,.5f,NavMesh.AllAreas))continue;var path=new NavMeshPath();
                        if(NavMesh.CalculatePath(initial,hit.position,NavMesh.AllAreas,path)&&path.status==NavMeshPathStatus.PathComplete&&Vector3.Distance(initial,hit.position)>1.3f){agent.SetDestination(hit.position);entry.pathComplete=true;}
                    }
                }
                else if(actor.id=="dylan")entry.pathComplete=true;
                float started=Time.time;
                while(Time.time-started<2.4f)
                {
                    if(actor.id=="dylan"){keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.W));}
                    yield return new WaitForEndOfFrame();entry.frames++;if(entry.anatomyMoving==null&&Time.time-started>1.2f)entry.anatomyMoving=Measure(actor);
                    var movement=root.position-priorRoot;movement.y=0;priorRoot=root.position;
                    if(leftToe!=null&&rightToe!=null&&movement.magnitude>.0001f&&Time.time-started>.8f){var toeDirection=(leftToe.position-leftFoot.position)+(rightToe.position-rightFoot.position);toeDirection.y=0;entry.forwardAlignment+=Vector3.Dot(toeDirection.normalized,movement.normalized);entry.facingSamples++;}
                    if(Time.time-started<.3f){leftInitial=left.localRotation;rightInitial=right.localRotation;}else{entry.leftArmDegrees=Mathf.Max(entry.leftArmDegrees,Quaternion.Angle(leftInitial,left.localRotation));entry.rightArmDegrees=Mathf.Max(entry.rightArmDegrees,Quaternion.Angle(rightInitial,right.localRotation));}
                    float lg=Gap(leftFoot.position,animator.leftFeetBottomHeight,root),rg=Gap(rightFoot.position,animator.rightFeetBottomHeight,root);
                    entry.minLeftGap=Mathf.Min(entry.minLeftGap,Mathf.Abs(lg));entry.minRightGap=Mathf.Min(entry.minRightGap,Mathf.Abs(rg));float penetration=Mathf.Max(-lg,-rg);if(penetration>entry.maxPenetration){entry.maxPenetration=penetration;entry.maxPenetrationTime=Time.time-started;}if(Mathf.Min(Mathf.Abs(lg),Mathf.Abs(rg))<.13f)entry.contactFrames++;
                }
                entry.anatomyEnd=Measure(actor);InputSystem.QueueStateEvent(keyboard,new KeyboardState());if(entry.facingSamples>0)entry.forwardAlignment/=entry.facingSamples;entry.footstepEvents=audio.contactEvents-eventsBefore;entry.movement=Vector3.Distance(initial,root.position);if(agent!=null&&agent.enabled&&agent.isOnNavMesh)agent.ResetPath();animator.SetFloat("Speed",0);
            }
            var map=campaign.GetComponent<CampaignMap>();map.Open();yield return new WaitForEndOfFrame();bool opened=map.IsOpen;ScreenCapture.CaptureScreenshot("E:/UNGA-BUNGA-45001/Revision3/Map.png");yield return null;map.Close();
            var environment=campaign.GetComponent<EnvironmentInteraction>();int waterCount=environment.waters.Length;
            var motor=bindings.player.GetComponent<ThirdPersonMotor>();bool grounded=bindings.player.GetComponent<CharacterController>().isGrounded;
            var receipt=new Receipt{player=bindings.player.name,actors=results.ToArray(),playerGrounded=grounded,waterSurfaces=waterCount,mapOpened=opened,mapClosed=!map.IsOpen};
            receipt.mapGeometry=string.Join(";",campaign.GetComponentsInChildren<RectTransform>(true).Where(r=>r.name=="Dylan"||r.name=="Mini carte").Select(r=>r.name+" active="+r.gameObject.activeInHierarchy+" rect="+r.rect+" anchors="+r.anchorMin));
            Vector3? shore=null;Vector3 waterDirection=Vector3.forward;
            foreach(var water in environment.waters)
            {
                if(water.geometryType!=WaterGeometryType.Custom)continue;
                foreach(var renderer in water.meshRenderers)
                {
                    var bounds=renderer.bounds;
                    for(float x=bounds.min.x;x<bounds.max.x&&!shore.HasValue;x+=2)for(float z=bounds.min.z;z<bounds.max.z&&!shore.HasValue;z+=2)
                    {
                        var p=new Vector3(x,0,z);p.y=VillageLife.Ground(p);if(!environment.SampleDepth(p,out float d)||d<=.18f||d>=.65f||!VillageNavigation.Clear(p,bindings.player))continue;
                        foreach(var direction in new[]{Vector3.forward,Vector3.right,Vector3.back,Vector3.left})
                        {
                            bool clear=true;float previousHeight=p.y;
                            for(int step=1;step<=8;step++)
                            {
                                var next=p+direction*(step*.25f);next.y=VillageLife.Ground(next);
                                if(Mathf.Abs(next.y-previousHeight)>.14f||!environment.SampleDepth(next,out float nextDepth)||nextDepth<.1f||nextDepth>.85f||!VillageNavigation.Clear(next,bindings.player)){clear=false;break;}previousHeight=next.y;
                            }
                            if(!clear)continue;
                            shore=p;waterDirection=direction;break;
                        }
                    }
                }
            }
            if(shore.HasValue)
            {
                var cc=bindings.player.GetComponent<CharacterController>();cc.enabled=false;bindings.player.position=shore.Value+Vector3.up*.1f;cc.enabled=true;motor.FaceDirection(waterDirection);
                var initial=bindings.player.position;int splashesBefore=environment.SplashEmissions;float started=Time.time;
                while(Time.time-started<1.6f){keyboard.MakeCurrent();InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.W));yield return new WaitForEndOfFrame();receipt.waterDepth=Mathf.Max(receipt.waterDepth,environment.WaterDepth);}
                InputSystem.QueueStateEvent(keyboard,new KeyboardState());var travelled=bindings.player.position-initial;receipt.waterMovement=new Vector2(travelled.x,travelled.z).magnitude;receipt.splashes=environment.SplashEmissions-splashesBefore;receipt.waterTestPassed=receipt.waterDepth>.08f&&receipt.waterMovement>.8f&&receipt.splashes>0;
                ScreenCapture.CaptureScreenshot("E:/UNGA-BUNGA-45001/Revision3/Water-contact.png");yield return null;
            }
            receipt.minimumRawDepth=environment.MinimumRawDepth;receipt.maximumRawDepth=environment.MaximumRawDepth;receipt.deepestSample=environment.DeepestSample;receipt.waterQueries=environment.WaterQueriesSucceeded;receipt.errors=errors.ToArray();
            receipt.status=results.Count==18&&results.All(r=>r.avatarValid&&r.movement>.25f&&r.leftArmDegrees>3&&r.rightArmDegrees>3&&r.contactFrames>0&&r.maxPenetration<.25f&&r.forwardAlignment>.5f)&&opened&&!map.IsOpen&&receipt.waterTestPassed&&errors.Count==0?"passed":"failed";
            Directory.CreateDirectory("E:/UNGA-BUNGA-45001/Revision3");File.WriteAllText("E:/UNGA-BUNGA-45001/Revision3/walk-audit.json",JsonUtility.ToJson(receipt,true));InputSystem.RemoveDevice(keyboard);Application.Quit(receipt.status=="passed"?0:1);
        }
        private string Measure(CharacterBinding actor){try{return AnatomyProbe.Measure(actor);}catch(Exception e){errors.Add(e.Message);return "unavailable: "+e.Message;}}
        private static float Gap(Vector3 foot,float sole,Transform root)
        {
            var hit=Physics.RaycastAll(foot+Vector3.up*.5f,Vector3.down,1.5f,~0,QueryTriggerInteraction.Ignore).Where(h=>!h.transform.IsChildOf(root)&&h.normal.y>.55f).OrderBy(h=>h.distance).FirstOrDefault();
            return hit.collider==null?999:foot.y-sole-hit.point.y;
        }
    }
}

#endif
