using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class FireRepairV5
    {
        static Vector3 GroundedCenter(MeshRenderer fireplace)
        {
            var point=fireplace.bounds.center;
            foreach(var terrain in Terrain.activeTerrains){var start=terrain.transform.position;var size=terrain.terrainData.size;if(point.x>=start.x&&point.z>=start.z&&point.x<=start.x+size.x&&point.z<=start.z+size.z){point.y=terrain.SampleHeight(point)+start.y+.012f;return point;}}
            throw new InvalidOperationException("No terrain under the native fireplace; preserve its placement for inspection.");
        }
        public static void Apply()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);
            string folder="Assets/UngaBunga45001/Generated/FiresV5";Directory.CreateDirectory(folder);AssetDatabase.Refresh();var notes=new List<string>();
            Material Make(string name,Color color){string path=folder+"/"+name+".mat";var material=AssetDatabase.LoadAssetAtPath<Material>(path);if(material==null){material=new Material(Shader.Find("HDRP/Unlit"));AssetDatabase.CreateAsset(material,path);}material.SetColor("_UnlitColor",color);material.SetColor("_EmissiveColor",color*3);material.SetFloat("_EmissiveExposureWeight",0);material.enableInstancing=true;EditorUtility.SetDirty(material);return material;}
            var outer=Make("Flamme-ambre",new Color(1,.17f,.006f));var inner=Make("Flamme-or",new Color(1,.65f,.07f));var coal=Make("Braises",new Color(.8f,.038f,.004f));
            var sources=UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsInactive.Include,FindObjectsSortMode.None).Where(r=>r.name=="fireplace"&&r.gameObject.activeInHierarchy).ToArray();
            var placed=new List<NativeFire>();
            foreach(var r in sources)
            {
                var parent=r.transform.parent;var existing=parent.GetComponentInChildren<NativeFire>(true);
                if(placed.Any(f=>Vector3.Distance(f.transform.position,r.bounds.center)<1.1f)){if(existing!=null)UnityEngine.Object.DestroyImmediate(existing.gameObject);notes.Add("Coincident exported fireplace: duplicate effect suppressed.");continue;}
                if(existing!=null){existing.transform.position=GroundedCenter(r);placed.Add(existing);continue;}
                var particles=parent.GetComponentsInChildren<ParticleSystem>(true);notes.Add("Source "+r.name+" center="+r.bounds.center+" old particles="+particles.Length+" playOnAwake="+string.Join(",",particles.Select(p=>p.main.playOnAwake+"/"+p.emission.enabled+"/"+p.gameObject.activeInHierarchy)));
                foreach(var p in particles)p.gameObject.SetActive(false);
                foreach(var light in parent.GetComponentsInChildren<Light>(true))light.enabled=false;
                var go=new GameObject("Feu allumé · flammes, braises, lumière et son");go.transform.SetParent(parent,true);go.transform.position=GroundedCenter(r);go.transform.rotation=Quaternion.identity;go.transform.localScale=new Vector3(1/parent.lossyScale.x,1/parent.lossyScale.y,1/parent.lossyScale.z);
                var fire=go.AddComponent<NativeFire>();placed.Add(fire);fire.outerMaterial=outer;fire.innerMaterial=inner;fire.coalMaterial=coal;fire.crackle=AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/AudioClip/sfx_campfire_loop_01.ogg");fire.radius=Mathf.Clamp(Mathf.Min(r.bounds.size.x,r.bounds.size.z)*.32f,.3f,.7f);fire.height=fire.radius*2.2f;notes.Add("Installed animated fire @"+go.transform.position+" radius="+fire.radius+" height="+fire.height);
            }
            if(sources.Length==0)throw new InvalidOperationException("No actual fireplace mesh found; no arbitrary fire added.");
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision5/fire-repair.txt",notes);
        }
    }
}
