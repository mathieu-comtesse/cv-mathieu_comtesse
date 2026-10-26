using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class AccidentDirector:MonoBehaviour
    {
        public CampaignRuntime campaign;public Material bloodMaterial,woodMaterial,stoneMaterial,flameMaterial;
        public Mesh rockMesh,treeMesh;public AudioClip impact,crack;public bool Playing{get;private set;}public bool DeathScreen{get;private set;}public bool Analysis{get;private set;}
        public bool Blocking=>Playing||DeathScreen;public AccidentDefinition Current{get;private set;}public AccidentRagdoll LastBody{get;private set;}
        public int LastGoreLevel{get;private set;}public int LastBloodCount{get;private set;}public bool LastWarningChecked{get;private set;}
        readonly Dictionary<string,GameObject> corpses=new Dictionary<string,GameObject>();readonly List<GameObject> transient=new List<GameObject>();CampaignSave restored;
        public bool RequestFatal(string victim)
        {
            if(Blocking||campaign.QuestCatalog==null)return Blocking;
            var state=campaign.State.characters.FirstOrDefault(c=>c.id==victim);if(state==null||!state.alive)return false;
            var spec=campaign.QuestCatalog.accidents.FirstOrDefault(a=>a.id=="NPC_"+victim);if(victim==campaign.Data.playerCharacterId)spec=campaign.QuestCatalog.accidents.FirstOrDefault(a=>a.id=="D01");
            if(spec==null)return false;if(spec.kind=="hut"&&campaign.StructureProtected){campaign.Inform("Accès suspendu ou assemblage vérifié : l’intervention dangereuse est arrêtée.");return true;}StartCoroutine(Run(spec));return true;
        }
        public bool Request(string id)
        {
            if(Blocking||campaign.QuestCatalog==null)return false;var spec=campaign.QuestCatalog.accidents.FirstOrDefault(a=>a.id==id);if(spec==null||!spec.requiredFlags.All(campaign.HasFlag)||!campaign.Near(spec.site))return false;
            if(campaign.State.characters.FirstOrDefault(c=>c.id==spec.victimId)?.alive!=true)return false;
            if(spec.kind=="hut"&&campaign.StructureProtected){campaign.Inform("La zone est fermée ou la structure a été vérifiée.");return false;}LastWarningChecked=true;StartCoroutine(Run(spec));return true;
        }
        void Update()
        {
            if(campaign?.State==null)return;if(restored==campaign.State)return;restored=campaign.State;
            foreach(var record in restored.accidents.Where(a=>!a.playerAttempt))
            {
                if(corpses.ContainsKey(record.victimId))continue;var binding=campaign.bindings.characters.FirstOrDefault(c=>c.id==record.victimId);if(binding==null)continue;
                var body=CreateBody(binding,record.position,record.yaw,2);body.transform.rotation=Quaternion.Euler(0,0,70);body.Freeze();corpses[record.victimId]=body.gameObject;
            }
        }
        AccidentRagdoll CreateBody(CharacterBinding binding,Vector3 position,float yaw,int gore)
        {var go=new GameObject("Conséquence persistante · "+binding.id);go.transform.SetPositionAndRotation(position,Quaternion.Euler(0,yaw,0));var ragdoll=go.AddComponent<AccidentRagdoll>();ragdoll.Create(binding,position,yaw,gore,bloodMaterial);return ragdoll;}
        IEnumerator Run(AccidentDefinition spec)
        {
            Playing=true;DeathScreen=false;Analysis=false;Current=spec;LastGoreLevel=Mathf.Clamp(campaign.GetComponent<UISettingsController>().preferences.goreLevel,0,2);LastBloodCount=0;
            var binding=campaign.bindings.characters.First(c=>c.id==spec.victimId);var root=campaign.bindings.Find(spec.victimId);Vector3 origin=root.position;float yaw=root.eulerAngles.y;
            var structure=spec.kind=="hut"?FindObjectsByType<HutCollapse>(FindObjectsSortMode.None).Where(h=>h.site=="habitations"&&!h.Broken).OrderBy(h=>Vector3.Distance(h.transform.position,campaign.bindings.Find(spec.site).position)).FirstOrDefault():null;
            if(spec.kind=="hut"&&structure==null){Playing=false;campaign.Inform("Aucune structure utilisable à cet emplacement.");yield break;}
            if(structure!=null){origin=structure.transform.position+Vector3.forward*.35f;origin.y=HutCollapse.TerrainFloor(origin);root.position=origin;}
            var camera=campaign.cinematicDirector.cinematicCamera;bool oldCamera=campaign.bindings.gameplayCamera.enabled;campaign.bindings.gameplayCamera.enabled=false;camera.enabled=true;float oldFov=camera.fieldOfView;camera.fieldOfView=48;
            campaign.bindings.SetGameplayBlocked(true);var victimAgent=root.GetComponent<UnityEngine.AI.NavMeshAgent>();if(victimAgent!=null&&victimAgent.enabled&&victimAgent.isOnNavMesh)victimAgent.isStopped=true;
            var originalRotation=binding.meshyActor.transform.localRotation;
            VillageLife.Play(binding.animator,"Gather");campaign.Subtitle="Mathieu : "+spec.warning;var props=CreateProps(spec,origin);
            Vector3 side=(campaign.bindings.gameplayCamera.transform.position-origin).normalized;side.y=.38f;side.Normalize();
            Vector3 overview=structure!=null?structure.OverviewOffset():Vector3.zero;float t=0;bool hit=false;Vector3 start=props.Length>0?props[0].position:origin;
            while(t<10)
            {
                t+=Time.deltaTime;
                if(t>2.7f&&t<4)campaign.Subtitle=spec.victimId==campaign.Data.playerCharacterId?"Dylan : Ah.":"";
                if(structure!=null&&t>=2&&!structure.Broken)structure.BeginFailure(spec.exposure);
                if(t>=4&&!hit)
                {
                    hit=true;LastBody=CreateBody(binding,origin,yaw,LastGoreLevel);binding.meshyActor.SetActive(false);
                    Vector3 impulse=spec.kind=="mammoth"?new Vector3(3,6,1):spec.kind=="river"?new Vector3(1,2,2):spec.kind=="fire"?new Vector3(1,3,0):new Vector3(.4f,-1,.7f);
                    LastBody.Impulse(impulse);Blood(origin+Vector3.up*.8f,LastGoreLevel);PlayImpact(origin,spec.kind=="tree"?crack:impact);
                    campaign.RegisterAccident(spec,origin,yaw);if(spec.victimId==campaign.Data.playerCharacterId)transient.Add(LastBody.gameObject);else corpses[spec.victimId]=LastBody.gameObject;
                }
                if(t>=3.6f&&t<5.6f)AnimateProps(spec,props,origin,start,Mathf.Clamp01((t-3.6f)/1.8f));
                var look=structure!=null?structure.transform.position+Vector3.up*.9f:hit&&LastBody!=null?LastBody.transform.GetComponentsInChildren<Rigidbody>().First().position:origin+Vector3.up*.95f;
                Vector3 offset=structure!=null?overview:side*(spec.kind=="mammoth"?6:4.5f)+Vector3.up*.7f;if(structure==null){if(t<2.6f)offset*=1.2f;if(t>2.7f&&t<4)offset*=.65f;}
                var desired=look+offset;var delta=desired-look;float distance=delta.magnitude;
                if(structure==null)foreach(var collision in Physics.SphereCastAll(look,.16f,delta.normalized,distance,~0,QueryTriggerInteraction.Ignore))if(collision.distance>.9f&&!collision.transform.IsChildOf(root)&&!collision.transform.IsChildOf(LastBody==null?root:LastBody.transform))distance=Mathf.Min(distance,collision.distance-.15f);
                camera.transform.position=look+delta.normalized*Mathf.Max(1.1f,distance);camera.transform.LookAt(look);
                if(t>=6)campaign.Subtitle=spec.speaker+" : "+spec.punchline;if(t>=8)campaign.Subtitle=spec.reply;
                yield return null;
            }
            if(structure!=null&&structure.Running)structure.Settle();LastBody?.Freeze();foreach(var obj in props)if(obj!=null)foreach(var rb in obj.GetComponentsInChildren<Rigidbody>()){rb.linearVelocity=Vector3.zero;rb.angularVelocity=Vector3.zero;rb.isKinematic=true;}
            camera.enabled=false;camera.fieldOfView=oldFov;campaign.bindings.gameplayCamera.enabled=oldCamera;campaign.Subtitle="";Playing=false;binding.meshyActor.transform.localRotation=originalRotation;
            if(spec.victimId==campaign.Data.playerCharacterId)DeathScreen=true;else{campaign.FinishIncident();campaign.Inform("ÉVÉNEMENT GRAVE · "+campaign.CharacterName(spec.victimId)+" est décédé. Une enquête est ouverte auprès de Mathieu.");}
        }
        Transform[] CreateProps(AccidentDefinition spec,Vector3 origin)
        {
            var items=new List<Transform>();
            Transform Mesh(string name,Mesh mesh,Material material,Vector3 position,Vector3 dimensions)
            {
                GameObject obj;if(mesh==null)obj=GameObject.CreatePrimitive(PrimitiveType.Cube);else{obj=new GameObject(name);obj.AddComponent<MeshFilter>().sharedMesh=mesh;obj.AddComponent<MeshRenderer>();obj.AddComponent<BoxCollider>();}
                obj.name=name;obj.transform.position=position;obj.GetComponent<MeshRenderer>().sharedMaterial=material;var bounds=mesh==null?Vector3.one:mesh.bounds.size;obj.transform.localScale=new Vector3(dimensions.x/Mathf.Max(.01f,bounds.x),dimensions.y/Mathf.Max(.01f,bounds.y),dimensions.z/Mathf.Max(.01f,bounds.z));transient.Add(obj);items.Add(obj.transform);return obj.transform;
            }
            if(spec.kind=="tree")Mesh("Arbre de la productivité",treeMesh,woodMaterial,origin+Vector3.forward*.8f,new Vector3(.5f,5,.5f));
            else if(spec.kind=="rock")Mesh("Bloc instable",rockMesh,stoneMaterial,origin+Vector3.up*3.6f,new Vector3(1.8f,1.7f,1.5f));
            else if(spec.kind=="hut"){ /* The native assembly owns the progressive failure. */ }
            else if(spec.kind=="stock"){for(int i=0;i<7;i++)Mesh("Réserve instable",rockMesh,stoneMaterial,origin+new Vector3((i%3-1)*.65f,2+i*.3f,.5f),Vector3.one*.7f);}
            else if(spec.kind=="river"){for(int i=0;i<5;i++)Mesh("Berge qui cède",rockMesh,stoneMaterial,origin+new Vector3((i-2)*.6f,-.18f,1),new Vector3(.8f,.25f,1.8f));}
            else if(spec.kind=="workshop"){var beam=Mesh("Rupture du poste",treeMesh,woodMaterial,origin+new Vector3(2,1.2f,0),new Vector3(.4f,2.2f,.3f));beam.rotation=Quaternion.Euler(0,0,90);}
            else if(spec.kind=="fire")
            {var obj=new GameObject("Embrasement stylisé");obj.transform.position=origin;var fire=obj.AddComponent<NativeFire>();fire.outerMaterial=flameMaterial;fire.innerMaterial=flameMaterial;fire.coalMaterial=bloodMaterial;fire.height=1.8f;fire.radius=.65f;transient.Add(obj);items.Add(obj.transform);}
            else if(spec.kind=="mammoth")
            {var native=campaign.GetComponent<CinematicStage>()?.mammoth;if(native!=null){var obj=Instantiate(native.gameObject);obj.name="Mammouth de la séquence conditionnelle";obj.SetActive(true);obj.transform.position=origin+Vector3.forward*5;obj.transform.LookAt(origin);foreach(var collider in obj.GetComponentsInChildren<Collider>())collider.enabled=false;transient.Add(obj);items.Add(obj.transform);}}
            return items.ToArray();
        }
        void AnimateProps(AccidentDefinition spec,Transform[] props,Vector3 origin,Vector3 start,float p)
        {
            for(int i=0;i<props.Length;i++)
            {
                var prop=props[i];if(prop==null)continue;
                if(spec.kind=="tree"){prop.position=origin+Vector3.up*(2.5f*(1-p)) +Vector3.forward*(.8f+2*p);prop.rotation=Quaternion.Euler(-90*p,0,0);}
                else if(spec.kind=="mammoth")prop.position=Vector3.Lerp(start,origin+Vector3.back*3,p);
                else if(spec.kind=="river")prop.position=origin+new Vector3((i-2)*.6f,-.18f-p*(1+i*.25f),1+p);
                else if(spec.kind=="fire")prop.localScale=Vector3.one*(.6f+p*.5f);
                else if(spec.kind=="workshop")prop.position=Vector3.Lerp(start,origin+Vector3.left*2+Vector3.up*.2f,p);
                else{prop.position=Vector3.Lerp(start+Vector3.right*(i*.35f),origin+new Vector3((i%3-1)*.5f,.25f,i*.16f),p*p);prop.Rotate(Vector3.right,Time.deltaTime*130);}
            }
        }
        void Blood(Vector3 origin,int level)
        {
            LastBloodCount=level==0?28:level==1?8:0;
            for(int i=0;i<LastBloodCount;i++)
            {var p=GameObject.CreatePrimitive(PrimitiveType.Cube);p.name="Sang polygonal";p.transform.position=origin;p.transform.localScale=Vector3.one*(.028f+i%4*.013f);p.GetComponent<MeshRenderer>().sharedMaterial=bloodMaterial;var rb=p.AddComponent<Rigidbody>();rb.mass=.03f;rb.linearDamping=.9f;rb.maxLinearVelocity=6;float angle=i*2.399f;rb.linearVelocity=new Vector3(Mathf.Sin(angle)*2.5f,1.8f+i%4*.35f,Mathf.Cos(angle)*2.5f);transient.Add(p);}
            if(level<2)
            {var stain=GameObject.CreatePrimitive(PrimitiveType.Cylinder);stain.name="Trace stylisée au sol";stain.transform.position=new Vector3(origin.x,VillageLife.Ground(origin)+.018f,origin.z);stain.transform.localScale=new Vector3(level==0?1.3f:.6f,.008f,level==0?.9f:.4f);Destroy(stain.GetComponent<Collider>());stain.GetComponent<MeshRenderer>().sharedMaterial=bloodMaterial;transient.Add(stain);}
        }
        void PlayImpact(Vector3 position,AudioClip clip){if(clip!=null)AudioSource.PlayClipAtPoint(clip,position,.8f);}
        public void ToggleAnalysis(){Analysis=!Analysis;}
        public bool Retry(){if(!DeathScreen)return false;return campaign.RestoreDecisionCheckpoint();}
        public void ResetPresentation()
        {
            StopAllCoroutines();Playing=DeathScreen=Analysis=false;Current=null;
            foreach(var obj in transient)if(obj!=null)Destroy(obj);transient.Clear();foreach(var obj in corpses.Values)if(obj!=null)Destroy(obj);corpses.Clear();restored=null;
            foreach(var binding in campaign.bindings.characters)if(binding.meshyActor!=null)binding.meshyActor.SetActive(campaign.State.characters.FirstOrDefault(c=>c.id==binding.id)?.alive??false);
            campaign.cinematicDirector.cinematicCamera.enabled=false;campaign.bindings.gameplayCamera.enabled=true;campaign.bindings.SetGameplayBlocked(false);
        }
    }
}
