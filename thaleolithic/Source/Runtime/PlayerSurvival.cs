using UnityEngine;
namespace UngaBunga45001
{
    public sealed class PlayerSurvival:MonoBehaviour
    {
        public CampaignRuntime campaign;ThirdPersonMotor motor;CharacterController controller;
        void Start(){motor=campaign.bindings.player.GetComponent<ThirdPersonMotor>();controller=motor.GetComponent<CharacterController>();}
        void Update()
        {
            if(campaign.State==null||campaign.IsModal)return;float dt=Time.deltaTime;float speed=new Vector2(controller.velocity.x,controller.velocity.z).magnitude;
            float energy=speed>2.6f?-5:speed>.1f?-.25f:2.5f;float fatigue=campaign.IsBusy?.45f:speed>2.6f?.32f:speed>.1f?.07f:-.12f;
            var rest=campaign.bindings.Find("repos");if(speed<.1f&&!campaign.IsBusy&&rest!=null&&Vector3.Distance(rest.position,controller.transform.position)<4){fatigue=-1;energy=4;}
            campaign.Apply(new EffectDefinition{kind="stat",target="energy",operation="add",value=energy*dt});campaign.Apply(new EffectDefinition{kind="stat",target="fatigue",operation="add",value=fatigue*dt});campaign.Apply(new EffectDefinition{kind="stat",target="food",operation="add",value=-.015f*dt});
        }
    }
}
