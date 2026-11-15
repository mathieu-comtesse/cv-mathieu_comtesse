using System;
using UnityEngine;
namespace UngaBunga45001
{
    [Serializable]public sealed class VillagerRoutine{public string id,pose;public Vector3 workplace,rest;public float phase;public Vector3 workFocus;}
    public sealed class VillageLife:MonoBehaviour
    {
        public CampaignRuntime campaign;
        public VillagerRoutine[] routines=Array.Empty<VillagerRoutine>();
        public Mesh carriedMesh;public Material carriedMaterial;
        private CampaignSave restored;private VillagerBrain[] brains=Array.Empty<VillagerBrain>();
        private void Start()
        {
            if(GetComponent<TribalTaskRuntime>()==null)gameObject.AddComponent<TribalTaskRuntime>();
            var list=new System.Collections.Generic.List<VillagerBrain>();
            foreach(var routine in routines)
            {
                var binding=Array.Find(campaign.bindings.characters,c=>c.id==routine.id);var actor=campaign.bindings.Find(routine.id);if(actor==null||binding==null)continue;
                var brain=actor.GetComponent<VillagerBrain>();if(brain==null)brain=actor.gameObject.AddComponent<VillagerBrain>();brain.Bind(campaign,routine,binding.animator);
                var collision=actor.GetComponent<VillagerCollisionMotor>();if(collision==null)collision=actor.gameObject.AddComponent<VillagerCollisionMotor>();collision.actorId=routine.id;
                var load=binding.animator.GetComponent<CarriedLoad>();if(load==null)load=binding.animator.gameObject.AddComponent<CarriedLoad>();load.animator=binding.animator;load.actor=actor;load.mesh=carriedMesh;load.material=carriedMaterial;brain.load=load;list.Add(brain);
            }
            brains=list.ToArray();
        }
        private void Update()
        {
            if(campaign.State==null||restored==campaign.State)return;restored=campaign.State;
            if(!restored.playerPositionSaved)campaign.bindings.player.GetComponent<ThirdPersonMotor>().SetCrouched(false);
            if(restored.playerPositionSaved&&!campaign.cinematicDirector.IsPlaying)
            {
                var player=campaign.bindings.player;var cc=player.GetComponent<CharacterController>();bool was=cc.enabled;cc.enabled=false;
                if(VillageNavigation.Clear(restored.playerPosition,player,height:restored.playerCrouching?ThirdPersonMotor.CrouchedHeight:1.8f)){player.position=restored.playerPosition;player.GetComponent<ThirdPersonMotor>().FaceDirection(Quaternion.Euler(0,restored.playerYaw,0)*Vector3.forward);}cc.enabled=was;player.GetComponent<ThirdPersonMotor>().SetCrouched(restored.playerCrouching);
            }
        }
        public void Capture()
        {
            if(campaign.State==null||campaign.cinematicDirector.IsPlaying||campaign.MenhirActive)return;
            foreach(var brain in brains)if(brain!=null)brain.Capture();
            campaign.State.playerPosition=campaign.bindings.player.position;campaign.State.playerYaw=campaign.bindings.player.GetComponent<ThirdPersonMotor>().visual.eulerAngles.y;campaign.State.playerPositionSaved=true;campaign.State.playerCrouching=campaign.bindings.player.GetComponent<ThirdPersonMotor>().Crouching;
        }
        static readonly System.Collections.Generic.List<Terrain> activeTerrains = new System.Collections.Generic.List<Terrain>();
        static int terrainFrame = -1;
        public static float Ground(Vector3 p)
        {
            if (terrainFrame != Time.frameCount)
            {
                terrainFrame = Time.frameCount;
                activeTerrains.Clear();
                Terrain.GetActiveTerrains(activeTerrains);
            }
            foreach (var terrain in activeTerrains)
            {
                if (terrain == null || terrain.terrainData == null) continue;
                var origin = terrain.transform.position;
                var size = terrain.terrainData.size;
                if (p.x >= origin.x && p.z >= origin.z && p.x <= origin.x + size.x && p.z <= origin.z + size.z)
                    return terrain.SampleHeight(p) + origin.y;
            }
            return p.y;
        }
        public static void Play(Animator animator,string state)
        {
            if(!animator.HasState(0,Animator.StringToHash(state)))return;
            if(animator.IsInTransition(0)){if(animator.GetNextAnimatorStateInfo(0).IsName(state))return;}
            else if(animator.GetCurrentAnimatorStateInfo(0).IsName(state))return;
            animator.CrossFade(state,.12f);
        }
    }
}
