using System;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
    public enum VillagerBehaviour{IDLE,WANDER,MOVE_TO_TASK,WORK,COLLECT,TRANSPORT,BUILD,SOCIALIZE,EAT,REST,SLEEP,TRAIN,INSPECT,ALERT,EVACUATE,INJURED,TREATMENT,DEAD,CINEMATIC_CONTROL}
    public sealed class VillagerBrain:MonoBehaviour
    {
        public string id;public CampaignRuntime campaign;public VillagerRoutine routine;public Animator animator;public CarriedLoad load;
        public VillagerBehaviour Behaviour{get;private set;}
        public int CompletedCycles{get;private set;}public int PathFailures{get;private set;}public float Travelled{get;private set;}
        public string BlockedReason{get;private set;}="";public Vector3 Destination{get;private set;}
        public float RoutineProgress=>phase==2?Mathf.Clamp01(timer/(7+(turn+StableId())%7)):phase==4?Mathf.Clamp01(timer/2):0;
        VillageLife life;NavMeshAgent agent;CharacterState state;CampaignSave save;float timer,decisionAt,stuckTime;int phase,turn;Vector3 previous;bool moving,resting;
        void Awake(){agent=GetComponent<NavMeshAgent>();previous=transform.position;life=FindFirstObjectByType<VillageLife>();}
        public void Bind(CampaignRuntime runtime,VillagerRoutine job,Animator controller)
        {campaign=runtime;routine=job;id=job.id;animator=controller;}
        void Restore()
        {
            save=campaign.State;state=save.characters.FirstOrDefault(c=>c.id==id);if(state==null)return;
            if(state.positionSaved&&VillageNavigation.Clear(state.position,transform))
            {if(agent.enabled&&agent.isOnNavMesh)agent.Warp(state.position);else transform.position=state.position;transform.rotation=Quaternion.Euler(0,state.yaw,0);}
            phase=state.taskPhase;timer=state.taskTimer;turn=state.taskTurn;decisionAt=Time.time+.1f;resting=false;
        }
        public string ActivityLabel=>Behaviour switch{VillagerBehaviour.MOVE_TO_TASK=>"En route vers son poste",VillagerBehaviour.WORK=>"Travaille au village",VillagerBehaviour.COLLECT=>"Collecte des ressources",VillagerBehaviour.TRANSPORT=>"Transporte une charge",VillagerBehaviour.BUILD=>"Travaille sur la construction",VillagerBehaviour.SOCIALIZE=>"Échange avec la tribu",VillagerBehaviour.REST=>"Se repose",VillagerBehaviour.EAT=>"Prend un repas",VillagerBehaviour.TREATMENT=>"Reçoit des soins",VillagerBehaviour.INSPECT=>"Observe le village",VillagerBehaviour.EVACUATE=>"Évacue la zone",VillagerBehaviour.DEAD=>"Décédé",_=>"Présent au village"};
        public string ActivityBeforeConversation{get;private set;}="Présent au village";bool wasSpeaking;
        public string ConversationActivity=>wasSpeaking?ActivityBeforeConversation:ActivityLabel;
        void Update()
        {
            if(life!=null&&!life.enabled)return;
            if(campaign==null||campaign.State==null||routine==null)return;if(save!=campaign.State)Restore();if(state==null)return;
            Travelled+=Vector3.Distance(previous,transform.position);previous=transform.position;
            if(!state.alive){Behaviour=VillagerBehaviour.DEAD;Stop();if(load!=null)load.carrying=false;return;}
            if(campaign.cinematicDirector.IsPlaying){Behaviour=VillagerBehaviour.CINEMATIC_CONTROL;return;}
            if(campaign.UserPaused){Stop();return;}
            if(!agent.enabled||!agent.isOnNavMesh){Behaviour=VillagerBehaviour.IDLE;BlockedReason="Navigation indisponible";return;}
            var definition=campaign.Data.characters.FirstOrDefault(c=>c.id==id);
            bool speaking=campaign.ConversationActorId==id&&(campaign.Dialogue!=null||campaign.QuestOverlay)||campaign.Dialogue!=null&&definition!=null&&campaign.Dialogue.speaker.StartsWith(definition.name,StringComparison.OrdinalIgnoreCase);
            if(speaking){if(!wasSpeaking)ActivityBeforeConversation=ActivityLabel;wasSpeaking=true;Stop();Face(campaign.bindings.player.position);Pose("Talk");Behaviour=VillagerBehaviour.SOCIALIZE;return;}wasSpeaking=false;
            if(agent.hasPath&&agent.remainingDistance>.5f&&agent.velocity.sqrMagnitude<.006f&&!agent.pathPending)stuckTime+=Time.deltaTime;else stuckTime=0;
            if(stuckTime>3){agent.ResetPath();decisionAt=0;stuckTime=0;PathFailures++;BlockedReason="Itinéraire réévalué après obstacle";}
            // Near actors think at 5 Hz; distant actors keep their current safe route between 1 Hz decisions.
            if(Time.time<decisionAt){AnimateMovement();return;}
            float distance=Vector3.Distance(transform.position,campaign.bindings.player.position);float dt=distance<65?.2f:1;decisionAt=Time.time+dt;
            state.energy=Mathf.Max(0,state.energy-(moving?.14f:.055f)*dt);state.fatigue=Mathf.Min(100,state.fatigue+(moving?.13f:.055f)*dt);state.hunger=Mathf.Min(100,state.hunger+.065f*dt);
            bool evacuation=campaign.HasFlag("emergency_active")||(campaign.HasFlag("done:M_VI_URGENCE_1")&&!campaign.HasFlag("done:M_VI_URGENCE_3"));
            if(evacuation){Behaviour=VillagerBehaviour.EVACUATE;Move(Slot("rassemblement",1.6f),1.8f);if(Arrived()){Stop();Pose("Listen");}return;}
            if(state.life<50){Behaviour=VillagerBehaviour.INJURED;Move(Slot("repos",1.2f),.7f);if(Arrived()){Stop();Pose("Sit");Behaviour=VillagerBehaviour.TREATMENT;var healer=campaign.State.characters.FirstOrDefault(c=>c.id=="mathilde");if(healer!=null&&healer.alive&&Vector3.Distance(transform.position,campaign.bindings.Find("mathilde").position)<3)state.life=Mathf.Min(75,state.life+dt*1.2f);}return;}
            if(id=="mathilde")
            {
                var patient=campaign.State.characters.FirstOrDefault(c=>c.alive&&c.id!="mathilde"&&c.life<50);
                if(patient!=null){Behaviour=VillagerBehaviour.TREATMENT;Move(campaign.bindings.Find(patient.id).position+Vector3.right*1.1f,1.9f);if(Arrived()){Stop();Face(campaign.bindings.Find(patient.id).position);Pose("Gather");patient.life=Mathf.Min(75,patient.life+dt*1.5f);}return;}
            }
            if(state.assignment=="repos"||state.fatigue>68||state.energy<25||resting)
            {
                Behaviour=VillagerBehaviour.REST;resting=true;Move(routine.rest,1.1f);
                if(Arrived()){Stop();Pose("Sit");float benefit=campaign.Value("building","habitations")>=2?1.8f:1;state.energy=Mathf.Min(100,state.energy+dt*1.4f*benefit);state.fatigue=Mathf.Max(0,state.fatigue-dt*1.3f*benefit);if(state.energy>80&&state.fatigue<24&&state.assignment!="repos")resting=false;}return;
            }
            if(state.hunger>72)
            {
                Behaviour=VillagerBehaviour.EAT;Move(Slot("foyer",1.4f),1.1f);
                if(Arrived()){Stop();Pose("Eat");timer+=dt;if(timer>5){state.hunger=Mathf.Max(0,state.hunger-45);timer=0;}}return;
            }
            if(campaign.GetComponent<TribalTaskRuntime>()?.Handle(this,dt)==true)return;
            if(id=="mathieu")
            {
                var player=campaign.bindings.player;var side=player.right*(turn%2==0?1:-1);var goal=player.position-player.forward*2.5f+side*1.2f;
                if(Vector3.Distance(transform.position,player.position)>4){Behaviour=VillagerBehaviour.MOVE_TO_TASK;Move(goal,Vector3.Distance(transform.position,player.position)>9?2.7f:1.6f);}
                else{Stop();Face(player.position);Pose("Listen");Behaviour=VillagerBehaviour.INSPECT;}return;
            }
            if(id=="aurelien"||id=="lorette"||id=="grumb"||id=="petit_os"){Social(dt);return;}
            Task(dt);
        }
        void Task(float dt)
        {
            switch(phase)
            {
                case 0:Behaviour=VillagerBehaviour.MOVE_TO_TASK;Move(routine.workplace,1.25f+(StableId()%4)*.08f);if(Arrived()){Stop();timer=0;phase=1;}break;
                case 1:Behaviour=VillagerBehaviour.INSPECT;Face(routine.workFocus);Pose("Gather");timer+=dt;if(timer>=2.5f){timer=0;phase=2;}break;
                case 2:
                    Behaviour=routine.pose=="Gather"?VillagerBehaviour.COLLECT:routine.pose=="Work"?VillagerBehaviour.BUILD:VillagerBehaviour.WORK;
                    Face(routine.workFocus);Pose(routine.pose);timer+=dt;
                    if(timer>=7+(turn+StableId())%7){timer=0;phase=3;if(load!=null)load.carrying=true;}break;
                case 3:Behaviour=VillagerBehaviour.TRANSPORT;Move(Slot("stockage",2.2f),1.05f);if(Arrived()){Stop();timer=0;phase=4;}break;
                case 4:
                    Behaviour=VillagerBehaviour.WORK;Pose("Gather");timer+=dt;
                    if(timer>2){if(load!=null)load.Deposit();Produce();CompletedCycles++;turn++;timer=0;phase=5;}break;
                case 5:Behaviour=VillagerBehaviour.REST;Move(routine.rest,1.2f);if(Arrived()){Stop();Pose(turn%3==0?"Laugh":"Sit");timer+=dt;state.energy=Mathf.Min(100,state.energy+dt*.8f);state.fatigue=Mathf.Max(0,state.fatigue-dt*.6f);if(timer>5+(StableId()+turn)%8){phase=0;timer=0;}}break;
            }
        }
        void Produce()
        {
            string resource=id=="tarek"?"wood":id=="brok"||id=="georges"?"stone":id=="orok"||id=="sila"?"food":id=="neila"?"fiber":id=="uma"?"": "food";
            if(!string.IsNullOrEmpty(resource))campaign.Apply(new EffectDefinition{kind="resource",target=resource,value=1,operation="add"});
            state.morale=Mathf.Clamp(state.morale+1,0,100);
        }
        void Social(float dt)
        {
            string site=id=="aurelien"?(turn%3==0?"habitations":turn%3==1?"grand_menhir":"stockage"):id=="grumb"?(turn%2==0?"atelier_silex":"grand_menhir"):id=="lorette"?(turn%2==0?"rassemblement":"atelier_silex"):"repos";
            Behaviour=VillagerBehaviour.SOCIALIZE;Move(Slot(site,1.8f),1.05f+(StableId()%3)*.1f);
            if(Arrived()){Stop();Pose(turn%3==0?"Talk":turn%3==1?"Listen":"Laugh");Face(campaign.bindings.Find(site).position);timer+=dt;if(timer>7+(StableId()+turn)%11){timer=0;turn++;}}
        }
        int StableId(){int h=0;foreach(char c in id)h=(h*31+c)&0x7fffffff;return h;}
        Vector3 Slot(string site,float radius){var target=campaign.bindings.Find(site);if(target==null)return routine.workplace;return target.position+Quaternion.Euler(0,(StableId()%12)*30,0)*Vector3.forward*radius;}
        Vector3 requestedGoal=Vector3.positiveInfinity;
        void Move(Vector3 target,float speed)
        {
            agent.speed=speed*(state.life<70?.7f:1);agent.acceleration=2.8f;
            if((requestedGoal-target).sqrMagnitude>.35f||!agent.hasPath&&!Arrived())
            {
                if(VillageNavigation.Plan(transform.position,target,transform,out var path,3.5f,agent.agentTypeID)){agent.isStopped=false;agent.SetPath(path);requestedGoal=target;Destination=path.corners.Last();BlockedReason="";}
                else{BlockedReason="Destination sans chemin dégagé";PathFailures++;Stop();return;}
            }
            else agent.isStopped=false;AnimateMovement();
        }
        bool Arrived()=>!agent.pathPending&&(!agent.hasPath||agent.remainingDistance<=.45f)&&Vector3.Distance(transform.position,Destination)<.8f;
        void AnimateMovement(){moving=agent.enabled&&agent.isOnNavMesh&&agent.velocity.sqrMagnitude>.003f;if(moving)Pose("Locomotion");}
        void Stop(){moving=false;if(agent!=null&&agent.enabled&&agent.isOnNavMesh)agent.isStopped=true;}
        void Face(Vector3 p){var d=p-transform.position;d.y=0;if(d.sqrMagnitude>.04f)transform.rotation=Quaternion.RotateTowards(transform.rotation,Quaternion.LookRotation(d),120*Time.deltaTime);}
        void Pose(string pose){if(!animator.HasState(0,Animator.StringToHash(pose)))pose="Listen";VillageLife.Play(animator,pose);if(pose!="Locomotion")animator.SetFloat("Speed",0);}
        public bool AssignedWorkStep(Vector3 site,string pose){Behaviour=VillagerBehaviour.MOVE_TO_TASK;Move(site,1.3f);if(!Arrived())return false;Stop();Face(site);Pose(pose);Behaviour=VillagerBehaviour.WORK;return true;}
        public void CancelAssignedWork(){Stop();if(agent!=null&&agent.enabled&&agent.isOnNavMesh)agent.ResetPath();Pose("Listen");}
        public void Capture(){if(state==null)return;state.position=transform.position;state.positionSaved=true;state.yaw=transform.eulerAngles.y;state.behaviour=Behaviour.ToString();state.taskPhase=phase;state.taskTimer=timer;state.taskTurn=turn;state.destination=Destination;}
    }
}
