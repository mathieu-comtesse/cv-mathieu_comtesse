using UnityEngine;
namespace UngaBunga45001
{
    [RequireComponent(typeof(Animator),typeof(AudioSource))]
    public sealed class NativeAnimationAudio:MonoBehaviour
    {
        public AudioClip step,tool,waterStep;
        public int contactEvents;
        private Animator animator;private AudioSource audioSource;private EnvironmentInteraction environment;private bool player;
        private void Awake(){animator=GetComponent<Animator>();audioSource=GetComponent<AudioSource>();environment=FindFirstObjectByType<EnvironmentInteraction>();var campaign=FindFirstObjectByType<CampaignRuntime>();var controller=GetComponentInParent<CharacterController>();player=controller!=null&&campaign!=null&&controller.transform==campaign.bindings.player;audioSource.spatialBlend=1;audioSource.maxDistance=19;audioSource.minDistance=1.5f;audioSource.volume=.22f;audioSource.playOnAwake=false;}
        public void PlayAudio(AnimationEvent evt){var clip=player&&environment!=null&&environment.WaterDepth>.08f&&waterStep!=null?waterStep:step;if(clip!=null)audioSource.PlayOneShot(clip,.7f);}
        public void PlayRandomCollectionSound(AnimationEvent evt){if(tool!=null)audioSource.PlayOneShot(tool,.65f);}
        public void PlayFootstepSound(){contactEvents++;if(step!=null)audioSource.PlayOneShot(step,.7f);}
        public void SpawnLeftFootprint()=>Contact(HumanBodyBones.LeftFoot);
        public void SpawnRightFootprint()=>Contact(HumanBodyBones.RightFoot);
        public void SpawnLeftRunFootprint()=>Contact(HumanBodyBones.LeftFoot);
        public void SpawnRightRunFootprint()=>Contact(HumanBodyBones.RightFoot);
        private void Contact(HumanBodyBones bone)
        {if(!animator.isHuman)return;var point=animator.GetBoneTransform(bone).position;contactEvents++;Shader.SetGlobalVector("_UngaLastFootstep",new Vector4(point.x,point.y,point.z,Time.time));}
    }
}
