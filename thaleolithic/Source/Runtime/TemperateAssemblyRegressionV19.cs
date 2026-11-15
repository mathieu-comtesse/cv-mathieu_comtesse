#if UNITY_EDITOR
using System;
using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.AI;

namespace UngaBunga45001
{
    public sealed class TemperateAssemblyRegressionV19 : MonoBehaviour
    {
        [Serializable] sealed class Result
        {
            public string status, diagnostic;
            public Vector3 start, end;
            public float startGround, travelled, seconds;
            public bool controllerEnabled;
        }

        IEnumerator Start()
        {
            if (!TribalInterfaceAudit.Requested) throw new InvalidOperationException("Isolated save required");
            var campaign = GetComponent<CampaignRuntime>();
            if (!campaign.HasFlag("v17:alarm")) throw new InvalidOperationException("Load the recorded evacuation checkpoint first");
            var navigation = GetComponent<WorkNavigationV18>();
            var world = GetComponent<ActivityWorldV17>();
            var chief = campaign.bindings.Find("aurelien");
            var body = chief.GetComponent<CharacterController>();
            var start = new Vector3(350.519989f, 12.249809f, 275.079986f);

            navigation.enabled = false;
            chief.GetComponent<NavMeshAgent>().enabled = false;
            body.enabled = false;
            chief.position = start;
            body.enabled = true;
            Physics.SyncTransforms();
            navigation.enabled = true;

            float begin = Time.realtimeSinceStartup;
            float travelled = 0;
            var last = start;
            bool continuouslyPhysical = true;
            while (Time.realtimeSinceStartup - begin < 60 && !world.AllAtAssembly(new[] { "aurelien" }))
            {
                yield return null;
                float distance = Vector3.Distance(last, chief.position);
                travelled += distance;
                continuouslyPhysical &= body.enabled && distance < Mathf.Max(.45f, Time.deltaTime * 25);
                last = chief.position;
            }
            bool passed = continuouslyPhysical && travelled > 5 && world.AllAtAssembly(new[] { "aurelien" });
            File.WriteAllText("E:/UNGA-BUNGA-45001/Revision19/Environment/assembly-start-validation.json", JsonUtility.ToJson(new Result {
                status = passed ? "passed" : "failed",
                start = start, end = chief.position, startGround = VillageLife.Ground(start),
                travelled = travelled, seconds = Time.realtimeSinceStartup - begin,
                controllerEnabled = continuouslyPhysical,
                diagnostic = navigation.DescribeJob("aurelien") + " · " + navigation.LastFailure
            }, true));
            Destroy(this);
        }
    }
}
#endif
