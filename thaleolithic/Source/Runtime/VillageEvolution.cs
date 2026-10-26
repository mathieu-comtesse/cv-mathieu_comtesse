using UnityEngine;
namespace UngaBunga45001
{
    public sealed class VillageEvolution:MonoBehaviour
    {
        public CampaignRuntime campaign;public GameObject[] earlyHuts,improvedHuts;public GameObject safetyProps;
        private bool priorImproved,priorOrganised;private bool initialized;
        private void Update()
        {
            if(campaign.State==null)return;bool improved=campaign.Value("building","habitations")>=2;bool organised=campaign.HasFlag("workers_consulted")||campaign.State.actIndex>=3;
            foreach(var hut in earlyHuts)hut.SetActive(!improved);foreach(var hut in improvedHuts)hut.SetActive(improved);safetyProps.SetActive(organised);
            if(initialized&&(improved!=priorImproved||organised!=priorOrganised))GetComponent<VillageNavigation>()?.RequestRebuild();priorImproved=improved;priorOrganised=organised;initialized=true;
        }
    }
}
