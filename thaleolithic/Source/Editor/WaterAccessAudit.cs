using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class WaterAccessAudit
    {
        public static void Run()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);Physics.SyncTransforms();
            var lines=new List<string>();var blockers=new Dictionary<string,int>();int clear=0,shallow=0;
            foreach(var water in Object.FindObjectsByType<WaterSurface>(FindObjectsSortMode.None))
            {
                if(water.geometryType!=WaterGeometryType.Custom)continue;
                foreach(var renderer in water.meshRenderers)
                {
                    var b=renderer.bounds;lines.Add("WATER "+renderer.name+" "+b);
                    for(float x=b.min.x;x<b.max.x;x+=2)for(float z=b.min.z;z<b.max.z;z+=2)
                    {
                        var p=new Vector3(x,0,z);p.y=VillageLife.Ground(p);float depth=b.center.y-p.y;if(depth<.1f||depth>.85f)continue;shallow++;
                        var hits=Physics.OverlapCapsule(p+Vector3.up*.38f,p+Vector3.up*1.5f,.3f,~0,QueryTriggerInteraction.Ignore).Where(c=>!(c is TerrainCollider)).ToArray();
                        if(hits.Length==0){clear++;if(clear<20)lines.Add("CLEAR "+p+" depth="+depth);}
                        foreach(var hit in hits){var name=hit.name+" / "+hit.GetType().Name+" / "+hit.bounds;blockers[name]=blockers.TryGetValue(name,out int count)?count+1:1;}
                        if(hits.Length>0&&shallow<12)lines.Add("BLOCKED "+p+" "+string.Join(";",hits.Select(h=>h.name)));
                    }
                }
            }
            lines.Add("shallow="+shallow+" clear="+clear);lines.AddRange(blockers.OrderByDescending(k=>k.Value).Take(25).Select(k=>k.Value+" "+k.Key));File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/water-access-audit.txt",lines);
        }
    }
}
