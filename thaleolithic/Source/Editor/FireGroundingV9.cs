using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UngaBunga45001;
public static class FireGroundingV9
{
    const string Root="E:/UNGA-BUNGA-45001/Revision9-Fire";
    public const float BaseOffset=.012f;
    [Serializable]public sealed class Entry{public string name;public Vector3 before,after,woodMin,woodMax;public float ground,offsetBefore,offsetAfter;}
    [Serializable]public sealed class Report{public string scene;public Entry[] fires;}
    public static float TerrainHeight(Vector3 point)
    {
        foreach(var terrain in Terrain.activeTerrains){var start=terrain.transform.position;var size=terrain.terrainData.size;if(point.x>=start.x&&point.z>=start.z&&point.x<=start.x+size.x&&point.z<=start.z+size.z)return terrain.SampleHeight(point)+start.y;}
        throw new InvalidOperationException("No actual terrain under the fireplace at "+point);
    }
    static NativeFire[] Hearths()=>UnityEngine.Object.FindObjectsByType<NativeFire>(FindObjectsSortMode.None).Where(f=>f.transform.parent!=null&&f.transform.parent.GetComponentsInChildren<MeshRenderer>(true).Any(r=>r.name=="fireplace")).OrderBy(f=>f.transform.position.x).ToArray();
    public static Report Inspect(bool repair)
    {
        var fires=Hearths();if(fires.Length!=2)throw new InvalidOperationException("Expected the two existing village hearths, found "+fires.Length);
        var entries=fires.Select(f=>{var original=f.transform.position;float floor=TerrainHeight(original);var wood=f.transform.parent.GetComponentsInChildren<MeshRenderer>(true).Where(r=>r.name=="fireplace").OrderBy(r=>(r.bounds.center-original).sqrMagnitude).First();if(repair){var next=original;next.y=floor+BaseOffset;f.transform.position=next;EditorUtility.SetDirty(f.transform);}
            return new Entry{name=f.transform.parent.name,before=original,after=f.transform.position,ground=floor,offsetBefore=original.y-floor,offsetAfter=f.transform.position.y-floor,woodMin=wood.bounds.min,woodMax=wood.bounds.max};}).ToArray();
        var report=new Report{scene=EditorSceneManager.GetActiveScene().name,fires=entries};File.WriteAllText(Root+(repair?"/grounding-repair-":"/grounding-before-")+report.scene+".json",JsonUtility.ToJson(report,true));return report;
    }
    public static void Apply(){var report=Inspect(true);if(report.fires.Any(f=>Mathf.Abs(f.offsetAfter-BaseOffset)>.001f))throw new InvalidOperationException("Hearth base not grounded");EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();}
}
