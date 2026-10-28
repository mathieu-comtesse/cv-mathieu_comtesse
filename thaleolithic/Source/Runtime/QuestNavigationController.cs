using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
    public sealed class QuestNavigationController:MonoBehaviour
    {
        public CampaignRuntime campaign;public Material markerMaterial;
        public ActionDefinition Action{get;private set;}public Transform Target{get;private set;}public Vector3 InteractionPoint{get;private set;}
        public Vector3[] Corners{get;private set;}=Array.Empty<Vector3>();public string Status{get;private set;}="Recherche de l'objectif";
        public float Distance{get;private set;}public int Calculations{get;private set;}private bool pathComplete;public bool Replanning=>navigation!=null&&navigation.Pending;public bool Complete{get=>pathComplete&&!Replanning;private set=>pathComplete=value;}
        public event System.Action Changed;public bool TemporaryGuidance;
        UISettingsController settings;VillageNavigation navigation;float nextCheck;Vector3 lastPlayer,lastTarget;int revision=-1;string oldAction;
        Transform markerRoot,targetMarker;readonly List<Transform> stones=new List<Transform>();readonly Dictionary<string,NavMeshObstacle> closures=new Dictionary<string,NavMeshObstacle>();Mesh diamond;
        void Start(){settings=GetComponent<UISettingsController>();navigation=GetComponent<VillageNavigation>();campaign.Changed+=OnCampaignChanged;CreateMarkers();ForceRefresh();}
        void OnDestroy(){if(campaign!=null)campaign.Changed-=OnCampaignChanged;if(diamond!=null)Destroy(diamond);}
        void OnCampaignChanged(){if(campaign.State==null)return;UpdateClosures();var next=Resolve();if(next?.id!=Action?.id){if(string.IsNullOrEmpty(campaign.State.trackedActionId))TemporaryGuidance=false;Action=next;nextCheck=0;}}
        public ActionDefinition Resolve()
        {
            if(campaign.State==null||campaign.CurrentAct==null)return null;
            if(!string.IsNullOrEmpty(campaign.State.trackedActionId))
            {var chosen=campaign.FindAction(campaign.State.trackedActionId);if(chosen!=null&&(!chosen.id.StartsWith("travel:")||!campaign.Near(chosen.targetBindingId))&&campaign.CanExecute(chosen,out _,true)&&!(chosen.repeatable&&campaign.State.trackedActionHistoryIndex>=0&&campaign.State.history.Skip(campaign.State.trackedActionHistoryIndex).Any(r=>r.id==chosen.id)))return chosen;campaign.State.trackedActionId="";}
            var quest=campaign.QuestDestination();if(quest!=null)return quest;
            foreach(var goal in campaign.CurrentAct.objectives.Where(g=>!campaign.IsObjectiveComplete(g)))
            {
                var candidates=goal.actionIds.Select(id=>campaign.Data.actions.FirstOrDefault(a=>a.id==id)).Where(a=>a!=null&&campaign.CanExecute(a,out _,true));
                // Authoring order is narrative priority. Distance breaks ties only for independent optional actions.
                var selected=goal.required?candidates.FirstOrDefault():candidates.OrderBy(a=>(campaign.bindings.Find(a.targetBindingId)?.position-campaign.bindings.player.position)?.sqrMagnitude??float.MaxValue).FirstOrDefault();
                if(selected!=null)return selected;
            }
            return null;
        }
        public void Follow(string id){var action=campaign.FindAction(id);if(action==null||!campaign.CanExecute(action,out _,true))return;campaign.State.trackedActionId=id;campaign.State.trackedActionHistoryIndex=campaign.State.history.Count;TemporaryGuidance=true;Action=action;ForceRefresh();campaign.Save();}
        public void ForceRefresh(){nextCheck=0;lastPlayer=Vector3.one*float.PositiveInfinity;}
        void Update()
        {
            if(campaign.State==null||settings==null)return;
            bool visible=!campaign.cinematicDirector.IsPlaying&&!campaign.UserPaused&&!campaign.QuestOverlay&&!campaign.IncidentModal&&campaign.Dialogue==null&&settings.preferences.worldMarkers&&!Replanning;
            if(markerRoot!=null)markerRoot.gameObject.SetActive(visible);
            if(Time.unscaledTime<nextCheck||Replanning)return;nextCheck=Time.unscaledTime+.65f;
            var next=Resolve();Action=next;Target=Action==null?null:campaign.bindings.Find(Action.targetBindingId);
            if(Target==null){Corners=Array.Empty<Vector3>();Complete=false;Status=campaign.IsActComplete?"Acte terminé · consulte le journal":"Objectif en attente de prérequis";Changed?.Invoke();RefreshMarkers();return;}
            if(Action.id!=oldAction||(campaign.bindings.player.position-lastPlayer).sqrMagnitude>2.25f||(Target.position-lastTarget).sqrMagnitude>.8f||revision!=navigation.Revision)
            {Calculate();oldAction=Action.id;lastPlayer=campaign.bindings.player.position;lastTarget=Target.position;revision=navigation.Revision;}
            Distance=LengthFrom(campaign.bindings.player.position);RefreshMarkers();
        }
        public void Calculate()
        {
            if(Target==null)return;Calculations++;var from=campaign.bindings.player.position;var filter=VillageNavigation.Filter();filter.areaMask&=~(1<<VillageNavigation.Danger);
            Complete=false;var best=new NavMeshPath();float score=float.MaxValue;Vector3 access=Target.position;
            if(NavMesh.SamplePosition(from,out var start,2,filter))
            {
                var body=campaign.bindings.characters.FirstOrDefault(c=>c.id==Action.targetBindingId);if(body!=null&&!campaign.State.characters.First(c=>c.id==body.id).alive){Status="Personnage indisponible · consulte le journal";Corners=Array.Empty<Vector3>();Changed?.Invoke();return;}
                for(float radius=.9f;radius<=campaign.BindingSearchRadius(Action.targetBindingId);radius+=.55f)for(int i=0;i<12;i++)
                {
                    var p=Target.position+Quaternion.Euler(0,i*30,0)*Vector3.forward*radius;p.y=VillageLife.Ground(p);
                    if(!NavMesh.SamplePosition(p,out var end,.55f,filter)||campaign.BindingDistance(Action.targetBindingId,end.position)>3.4f||!VillageNavigation.Clear(end.position,campaign.bindings.player))continue;
                    var path=new NavMeshPath();if(!NavMesh.CalculatePath(start.position,end.position,filter,path)||path.status!=NavMeshPathStatus.PathComplete)continue;
                    float length=0;for(int c=1;c<path.corners.Length;c++)length+=Vector3.Distance(path.corners[c-1],path.corners[c]);float value=length+radius*.45f;
                    if(value<score){score=value;best=path;access=end.position;Complete=true;}
                }
            }
            Corners=Complete?best.corners:Array.Empty<Vector3>();InteractionPoint=access;
            Status=Complete?"GUIDAGE DES CRÂNES":"Aucun chemin accessible actuellement · consulte la carte";Distance=LengthFrom(from);Changed?.Invoke();
        }
        float LengthFrom(Vector3 player){if(!Complete||Corners.Length<2)return Target!=null?Vector3.Distance(player,Target.position):0;float length=Vector3.Distance(player,Corners[1]);for(int i=2;i<Corners.Length;i++)length+=Vector3.Distance(Corners[i-1],Corners[i]);return length;}
        void UpdateClosures()
        {
            foreach(var closure in closures){bool active=(campaign.State.risks.FirstOrDefault(r=>r.id==closure.Key)?.value??0)>=2;if(closure.Value.enabled!=active){closure.Value.enabled=active;ForceRefresh();}}

            foreach(var risk in campaign.State.risks)
            {
                string binding=risk.id=="carriere"?"pierre_carriere":risk.id=="silex"?"atelier_silex":risk.id=="fumees"?"foyer":risk.id=="stockage"?"stockage":null;
                if(binding==null)continue;var target=campaign.bindings.Find(binding);if(target==null)continue;
                if(!closures.TryGetValue(risk.id,out var obstacle)){var go=new GameObject("Danger identifié : "+risk.id);go.transform.SetParent(transform,false);go.transform.position=target.position+Vector3.up;obstacle=go.AddComponent<NavMeshObstacle>();obstacle.shape=NavMeshObstacleShape.Box;obstacle.size=new Vector3(1.6f,2,1.6f);obstacle.carving=true;obstacle.carveOnlyStationary=false;closures.Add(risk.id,obstacle);}
                bool active=risk.value>=2;if(obstacle.enabled!=active){obstacle.enabled=active;ForceRefresh();}
            }
        }
        void CreateMarkers()
        {
            diamond=new Mesh{name="Losange de guidage original"};diamond.vertices=new[]{new Vector3(0,.16f,0),new Vector3(.12f,0,0),new Vector3(0,0,.12f),new Vector3(-.12f,0,0),new Vector3(0,0,-.12f),new Vector3(0,-.04f,0)};diamond.triangles=new[]{0,2,1,0,3,2,0,4,3,0,1,4,5,1,2,5,2,3,5,3,4,5,4,1};diamond.RecalculateNormals();
            markerRoot=new GameObject("Repères du guidage des Crânes").transform;markerRoot.SetParent(transform,false);
            Transform Make(string name){var go=new GameObject(name);go.transform.SetParent(markerRoot,false);go.AddComponent<MeshFilter>().sharedMesh=diamond;var r=go.AddComponent<MeshRenderer>();r.sharedMaterial=markerMaterial;r.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;return go.transform;}
            targetMarker=Make("Objectif actif");targetMarker.localScale=new Vector3(2.3f,2.3f,2.3f);for(int i=0;i<32;i++)stones.Add(Make("Parcours praticable"));
        }
        void RefreshMarkers()
        {
            bool guide=settings.preferences.gpsMode==0||TemporaryGuidance&&settings.preferences.gpsMode==2;
            targetMarker.gameObject.SetActive(Target!=null);if(Target!=null)targetMarker.position=Target.position+Vector3.up*(2.7f+Mathf.Sin(Time.unscaledTime*2)*.06f);
            foreach(var stone in stones)stone.gameObject.SetActive(false);if(!guide||!Complete)return;int index=0;float carry=1;
            for(int i=1;i<Corners.Length&&index<stones.Count;i++)
            {
                var delta=Corners[i]-Corners[i-1];float length=delta.magnitude;for(float t=carry;t<length&&index<stones.Count;t+=1.8f){var p=Corners[i-1]+delta.normalized*t;if(Vector3.Distance(p,campaign.bindings.player.position)>45)break;p.y=VillageLife.Ground(p)+.11f;stones[index].position=p;stones[index++].gameObject.SetActive(true);}carry=Mathf.Repeat(carry-length,1.8f);
            }
        }
        void LateUpdate()
        {
            if(targetMarker==null||Target==null)return;
            var camera=campaign.bindings.gameplayCamera;targetMarker.position=Target.position+Vector3.up*(2.7f+Mathf.Sin(Time.unscaledTime*2)*.06f);
            float distance=Vector3.Distance(camera.transform.position,targetMarker.position);float desiredHeight=2*distance*Mathf.Tan(camera.fieldOfView*Mathf.Deg2Rad*.5f)*28/Mathf.Max(1,Screen.height);
            targetMarker.localScale=Vector3.one*Mathf.Clamp(desiredHeight/.2f,.005f,3);targetMarker.rotation=camera.transform.rotation;
            targetMarker.GetComponent<MeshRenderer>().enabled=camera.WorldToViewportPoint(targetMarker.position).z>camera.nearClipPlane+.15f&&distance<90;
        }
    }
}
