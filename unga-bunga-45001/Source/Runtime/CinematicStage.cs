using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class CinematicStage:MonoBehaviour
    {
        public SceneBindings bindings;
        public CampaignRuntime campaign;
        public Transform fallingFrame,mammoth,wheel,notice;
        private string film;
        readonly Dictionary<string,Vector3[]> travelPaths=new Dictionary<string,Vector3[]>();
        private readonly Dictionary<string,(Vector3 position,Quaternion rotation,bool active)> saved=new Dictionary<string,(Vector3,Quaternion,bool)>();
        private readonly Dictionary<string,Vector3> starts=new Dictionary<string,Vector3>();
        private readonly Dictionary<string,Quaternion> visualRotations=new Dictionary<string,Quaternion>();
        private Quaternion frameRotation;private Vector3 mammothPosition;
        private Vector3 collapseOverview;private bool collapseFramed;private Renderer[] occluders;private int cameraSegment=-1;private float cameraAngle;
        public void Begin(string id)
        {
            film=id;saved.Clear();starts.Clear();travelPaths.Clear();collapseFramed=false;
            cameraSegment=-1;occluders=FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.enabled&&r.bounds.size.y>3).Cast<Renderer>().ToArray();
            foreach(var actor in bindings.characters){var root=bindings.Find(actor.id);saved[actor.id]=(root.position,root.rotation,actor.meshyActor.activeSelf);starts[actor.id]=root.position;visualRotations[actor.id]=actor.meshyActor.transform.localRotation;actor.meshyActor.transform.localRotation=Quaternion.identity;}
            foreach(var actor in bindings.characters){var agent=bindings.Find(actor.id).GetComponent<UnityEngine.AI.NavMeshAgent>();if(agent!=null)agent.enabled=false;}
            if(fallingFrame!=null)frameRotation=fallingFrame.rotation;if(mammoth!=null)mammothPosition=mammoth.position;
            if(wheel!=null)wheel.gameObject.SetActive(id=="C06");
            foreach(var actor in bindings.characters)if(actor.id!="dylan")
            {
                string pose=actor.id=="georges"||actor.id=="brok"?"Mine":actor.id=="uma"||actor.id=="tarek"?"Work":actor.id=="orok"||actor.id=="sila"?"Gather":actor.id=="neila"?"Craft":actor.id=="aurelien"||actor.id=="lorette"?"Talk":"Listen";
                Actor(actor.id,pose,starts[actor.id],Point("grand_menhir"));
            }
        }
        private Transform Focus(string id)=>id=="mammoth"?mammoth:bindings.Find(id);
        private Vector3 Point(string id)=>Focus(id)?.position??bindings.player.position;
        private void Actor(string id,string pose,Vector3 position,Vector3 facing,float speed=0,float playback=1)
        {
            var actor=Array.Find(bindings.characters,c=>c.id==id);if(actor==null||!actor.meshyActor.activeInHierarchy)return;
            var root=bindings.Find(id);position.y=VillageLife.Ground(position);root.position=position;var direction=facing-position;direction.y=0;if(direction.sqrMagnitude>.01f)root.rotation=Quaternion.LookRotation(direction);
            VillageLife.Play(actor.animator,pose);actor.animator.SetFloat("Speed",speed);actor.animator.speed=playback;
        }
        private void Travel(string id,Vector3 end,float begin,float endTime,float t,Vector3? fromOverride=null)
        {
            if(!starts.ContainsKey(id))return;float u=Mathf.Clamp01((t-begin)/(endTime-begin));var from=fromOverride??starts[id];string key=id+":"+begin+":"+endTime;
            if(!travelPaths.TryGetValue(key,out var path))
            {
                if(begin>9)from=bindings.Find(id).position;
                if(VillageNavigation.Plan(from,end,bindings.Find(id),out var route,4)){path=new[]{from}.Concat(route.corners.Skip(Vector3.Distance(from,route.corners[0])<.1f?1:0)).ToArray();travelPaths[key]=path;}
                else{Actor(id,"Listen",from,end);return;}
            }
            float length=0;for(int i=1;i<path.Length;i++)length+=Vector3.Distance(path[i-1],path[i]);float at=length*u;var position=path.Last();
            for(int i=1;i<path.Length;i++){float distance=Vector3.Distance(path[i-1],path[i]);if(at<=distance){position=Vector3.Lerp(path[i-1],path[i],distance<.001f?1:at/distance);break;}at-=distance;}
            float velocity=length/(endTime-begin);bool moving=u>0&&u<1;bool run=velocity>2.7f;var facing=position+(u<1?Tangent(path,u):Point("aurelien")-position);Actor(id,moving?"Locomotion":"Listen",position,facing,moving?(run?1:.5f):0,moving?Mathf.Clamp(velocity/(run?4.3f:1.8f),.45f,1.8f):1);
        }
        Vector3 Tangent(Vector3[] path,float u){float total=0;for(int i=1;i<path.Length;i++)total+=Vector3.Distance(path[i-1],path[i]);float at=total*u;for(int i=1;i<path.Length;i++){var d=path[i]-path[i-1];if(at<=d.magnitude)return d.normalized;at-=d.magnitude;}return path.Length>1?(path[path.Length-1]-path[path.Length-2]).normalized:Vector3.forward;}

        public void Evaluate(float t,float duration,Camera camera)
        {
            var council=Point("grand_menhir");
            switch(film)
            {
                case "C01":
                    if(t<=20)Travel("dylan",council+new Vector3(-2,0,-4),0,9,t);Travel("nork",Point("charpente")+new Vector3(3,0,1),1,13,t);if(t<16)Actor("uma","Work",Point("charpente")+new Vector3(3.1f,0,0),Point("charpente"));else Travel("uma",Point("charpente")+new Vector3(4.8f,0,1),16,19,t,Point("charpente")+new Vector3(3.1f,0,0));
                    Actor("aurelien","Talk",starts["aurelien"],Point("dylan"));
                    if(t>=17&&fallingFrame!=null){var structure=fallingFrame.GetComponentInChildren<HutCollapse>();if(structure!=null&&!structure.Broken)structure.BeginFailure("Assemblage non vérifié au réveil du village.");}
                    if(t>20){Travel("mathilde",Point("charpente")+new Vector3(4.2f,0,-2),20,28,t);Travel("dylan",Point("charpente")+new Vector3(-2,0,-3),20,29,t,council+new Vector3(-2,0,-4));}
                    break;
                case "C02":
                    if(t<=9)Travel("dylan",Point("atelier_silex")+new Vector3(1,0,-2),0,8,t);Travel("lorette",Point("atelier_silex")+new Vector3(3,0,-2),3,12,t);
                    if(t>9)Actor("dylan","Work",Point("atelier_silex")+new Vector3(1,0,-2),Point("brok"));
                    if(notice!=null)notice.localRotation=Quaternion.Euler(0,0,t<14?180:Mathf.Lerp(180,0,Mathf.InverseLerp(14,16,t)));
                    break;
                case "C03":
                    if(t<=10)Travel("georges",Point("habitations")+new Vector3(3,0,2),0,9,t);Travel("mathilde",Point("repos")+new Vector3(-2,0,1),2,12,t);Travel("dylan",Point("stockage")+new Vector3(-2,0,-1),4,18,t);
                    if(t>10)Actor("georges","Work",Point("habitations")+new Vector3(3,0,2),Point("habitations"));
                    break;
                case "C04":
                    Travel("dylan",council+new Vector3(0,0,-3),0,7,t);Travel("eliott",council+new Vector3(2,0,-2),0,8,t);Travel("kora",council+new Vector3(3,0,-3),1,10,t);Actor("aurelien","Talk",starts["aurelien"],council);
                    break;
                case "C05":
                    var hunting=Point("chasse_clairiere");if(t<=18){Travel("eliott",hunting+new Vector3(-3,0,-4),0,10,t);Travel("dylan",hunting+new Vector3(0,0,-6),0,10,t);}Travel("kora",hunting+new Vector3(3,0,-6),0,10,t);
                    if(mammoth!=null){var p=mammothPosition+Vector3.back*Mathf.SmoothStep(0,5,Mathf.Clamp01(t/19));p.y=VillageLife.Ground(p);mammoth.position=p;var animator=mammoth.GetComponentInChildren<Animator>();if(animator!=null)VillageLife.Play(animator,t<18?"Walk":"Attack");}
                    if(t>18){Actor("eliott","React",hunting+new Vector3(-3,0,-4-Mathf.Min(6,(t-18)*.7f)),hunting);Actor("dylan","Locomotion",hunting+new Vector3(0,0,-6-Mathf.Min(6,(t-18)*.8f)),hunting+Vector3.back*20,.8f);}
                    break;
                case "C06":
                    if(t<=10)Travel("dylan",council+new Vector3(-1,0,-2),0,7,t);Actor("aurelien",t<18?"Talk":"Listen",starts["aurelien"],Point("dylan"));
                    if(t>10)Actor("dylan",t<28?"Talk":"Listen",council+new Vector3(-1,0,-2),Point("aurelien"));
                    if(wheel!=null){wheel.position=council+new Vector3(Mathf.Lerp(-4,4,Mathf.Clamp01((t-14)/13)),.65f,-3);wheel.position=new Vector3(wheel.position.x,VillageLife.Ground(wheel.position)+.65f,wheel.position.z);wheel.rotation=Quaternion.Euler(t*85,0,90);}
                    if(t>32)foreach(var id in new[]{"lorette","neila","mathilde"})Actor(id,"Clap",starts[id],council);
                    break;
            }
            if(film=="C01"&&t>=16.5f&&t<=26&&fallingFrame!=null){var target=fallingFrame.position+Vector3.up;if(!collapseFramed){collapseOverview=fallingFrame.GetComponentInChildren<HutCollapse>().OverviewOffset();collapseFramed=true;}camera.transform.position=target+collapseOverview;camera.transform.LookAt(target);camera.fieldOfView=50;return;}
            FrameCamera(t,duration,camera);
        }
        private void FrameCamera(float t,float duration,Camera camera)
        {
            string[] sequence=film=="C01"?new[]{"grand_menhir","aurelien","charpente","uma","mathilde"}:film=="C02"?new[]{"atelier_silex","brok","foyer","orok"}:film=="C03"?new[]{"habitations","georges","repos","stockage","neila","grand_menhir"}:film=="C04"?new[]{"aurelien","dylan","eliott","kora"}:film=="C05"?new[]{"chasse_clairiere","mammoth","eliott","mammoth","dylan"}:new[]{"aurelien","dylan","grand_menhir","lorette","grand_menhir"};
            float segment=duration/sequence.Length;int index=Mathf.Min(sequence.Length-1,(int)(t/segment));float u=(t-index*segment)/segment;
            string id=sequence[index];bool actor=Array.Exists(bindings.characters,c=>c.id==id);var target=Point(id)+Vector3.up*(actor?1.45f:1.5f);
            Vector3 offset=actor?new Vector3(1.8f,.3f,2.8f):new Vector3(-7,5,-10);offset=Quaternion.Euler(0,Mathf.Lerp(-9,9,u),0)*offset*Mathf.Lerp(1.08f,.94f,u);
            if(actor)offset=bindings.Find(id).rotation*offset;
            bool aerial=(film=="C01"&&index==0)||(film=="C06"&&index==sequence.Length-1);
            if(aerial)offset=new Vector3(-1,Mathf.Lerp(19,23,u),-3)*Mathf.Lerp(1,1.12f,u);
            if(cameraSegment!=index)
            {
                cameraSegment=index;float best=-999;cameraAngle=0;
                foreach(float angle in new[]{0f,35,-35,70,-70,110,-110,180})
                {
                    var candidate=Quaternion.Euler(0,angle,0)*offset;float score=candidate.magnitude;var ray=new Ray(target,candidate.normalized);
                    foreach(var r in occluders)if(!r.bounds.Contains(target)&&r.bounds.IntersectRay(ray,out float entry)&&entry>.5f&&entry<candidate.magnitude)score=Mathf.Min(score,entry);
                    foreach(var hit in Physics.SphereCastAll(target,.16f,candidate.normalized,candidate.magnitude,~0,QueryTriggerInteraction.Ignore))if(hit.distance>.5f&&!hit.transform.IsChildOf(Focus(id)))score=Mathf.Min(score,hit.distance);
                    score-=Mathf.Abs(angle)*.001f;if(score>best){best=score;cameraAngle=angle;}
                }
            }
            offset=Quaternion.Euler(0,cameraAngle,0)*offset;
            float distance=offset.magnitude;
            if(!aerial)foreach(var hit in Physics.SphereCastAll(target,.2f,offset.normalized,distance,~0,QueryTriggerInteraction.Ignore))if(hit.distance>1.2f&&!hit.transform.IsChildOf(Focus(id)))distance=Mathf.Min(distance,Mathf.Max(2,hit.distance-.2f));
            camera.transform.position=target+offset.normalized*distance;camera.transform.LookAt(target);camera.fieldOfView=actor?40:55;
            if(!bindings.gameplayCamera.enabled)bindings.gameplayCamera.transform.SetPositionAndRotation(camera.transform.position,camera.transform.rotation);
        }
        public void End()
        {
            foreach(var actor in bindings.characters)
                if(saved.TryGetValue(actor.id,out var value)){var root=bindings.Find(actor.id);root.SetPositionAndRotation(value.position,value.rotation);actor.meshyActor.transform.localRotation=visualRotations[actor.id];actor.meshyActor.SetActive(value.active);VillageLife.Play(actor.animator,"Locomotion");actor.animator.SetFloat("Speed",0);actor.animator.speed=1;}
            if(film=="C01"&&fallingFrame!=null){var structure=fallingFrame.GetComponentInChildren<HutCollapse>();if(structure!=null&&(!structure.Broken||structure.Running))structure.CompleteSkipped();}if(mammoth!=null)mammoth.position=mammothPosition;if(wheel!=null)wheel.gameObject.SetActive(false);if(notice!=null)notice.localRotation=Quaternion.identity;
            foreach(var actor in bindings.characters){var root=bindings.Find(actor.id);var agent=root.GetComponent<UnityEngine.AI.NavMeshAgent>();if(agent!=null){agent.enabled=true;if(agent.isOnNavMesh)agent.Warp(root.position);}}
        }
    }
}


