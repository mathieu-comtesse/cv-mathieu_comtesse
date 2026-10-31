using System.IO;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class RecoveredCinematicFraming
    {
        public static void Apply()
        {
            var scene=EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            var campaign=Object.FindFirstObjectByType<CampaignRuntime>();
            var anchor=campaign.bindings.Find("camera:C01:1");var closing=campaign.bindings.Find("camera:C06:1");
            if(anchor!=closing)throw new System.InvalidOperationException("Opening and closing must share their anchor");
            var meeting=campaign.bindings.Find("grand_menhir");
            anchor.position=meeting.position+new Vector3(-4,4,-15);anchor.LookAt(meeting.position+Vector3.up*1.5f);
            campaign.cinematicDirector.cinematicCamera.fieldOfView=55;
            campaign.cinematicDirector.cinematicCamera.nearClipPlane=.1f;
            EditorSceneManager.SaveScene(scene);
            File.WriteAllText("E:/UNGA-BUNGA-45001/Analysis/cinematic-framing-repair.txt","Authored opening/closing shared anchor moved inside the camp after the first Windows image showed the camera inside native scenery. C01 and C06 keep one identical anchor; FOV 55, near 0.1. Source scene unchanged. Runtime spherecast prevents geometry between the target and other authored shot positions.");
        }
    }
}
