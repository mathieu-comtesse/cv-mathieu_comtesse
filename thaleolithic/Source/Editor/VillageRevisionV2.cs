using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class VillageRevisionV2
    {
        private static SceneBindings bindings;private static Transform village;private static readonly Vector3 origin=new Vector3(350.92f,0,281.88f);
        private static int structures,cleared;
        private static Vector3 At(float x,float z){var p=origin+new Vector3(x,0,z);p.y=VillageLife.Ground(p);return p;}
        public static void Install()
        {
            const string scenePath="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity";
            string backup="E:/UNGA-BUNGA-45001/Revision2/SceneBeforeRevision.unity";if(!File.Exists(backup))File.Copy(scenePath,backup);
            var scene=EditorSceneManager.OpenScene(scenePath,OpenSceneMode.Single);var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();bindings=campaign.bindings;
            if(GameObject.Find("Village complet V2")!=null)throw new InvalidOperationException("Village V2 already installed; edit in place");
            village=new GameObject("Village complet V2").transform;
            foreach(var p in new[]{("habitations",-14f,-11f),("atelier_silex",-16f,1f),("pierre_carriere",-22f,0f),("bois_construction",-24f,12f),("foyer",12f,2f),("stockage",17f,8f),("repos",11f,9f),("chasse_clairiere",25f,25f),("rassemblement",1f,1f),("charpente",-10f,8f),("grand_menhir",0f,10f),("vue_village",0f,-5f)})bindings.Find(p.Item1).position=At(p.Item2,p.Item3);
            var dylanOld=bindings.characters.First(c=>c.id=="dylan");var oldPlayer=bindings.player;var npcParent=new GameObject("Actor_Mathieu").transform;npcParent.position=At(-3,7);npcParent.SetParent(oldPlayer.parent,true);
            var actors=new List<CharacterBinding>();
            foreach(var old in bindings.characters)
            {
                Transform parent=old.id=="dylan"?oldPlayer:old.id=="mathieu"?npcParent:bindings.Find(old.id);
                if(parent==old.meshyActor.transform)parent=old.meshyActor.transform.parent;
                var appearance=PrehistoricCastV2.Names.First(n=>n.Equals(old.id,StringComparison.OrdinalIgnoreCase));
                var actor=PrehistoricCastV2.Create(old.id,appearance,parent);actors.Add(actor);old.meshyActor.SetActive(false);
                var objectBinding=bindings.objects.FirstOrDefault(b=>b.id==old.id);if(objectBinding!=null)objectBinding.target=parent;
            }
            oldPlayer.name="Dylan_PlayerController";var motor=oldPlayer.GetComponent<ThirdPersonMotor>();var playerActor=actors.First(c=>c.id=="dylan");motor.visual=playerActor.meshyActor.transform;motor.animator=playerActor.animator;
            var extra=new[]{("brok","Georges",-15f,1f,"Craft"),("tarek","Eliott",-23f,11f,"Work"),("orok","Georges",12f,4f,"Gather"),("uma","Mathilde",-12f,20f,"Work"),("kora","Neila",18f,20f,"Listen"),("nork","Mathieu",-21f,2f,"Locomotion"),("sila","Lorette",13f,1f,"Craft"),("varg","Aurelien",21f,20f,"Talk"),("grumb","Mathieu",3f,14f,"Listen"),("petit_os","Dylan",4f,-4f,"Wave")};
            var objectBindings=bindings.objects.ToList();var routines=new List<VillagerRoutine>();
            foreach(var row in extra)
            {
                var parent=new GameObject("Actor_"+row.Item1).transform;parent.SetParent(village);parent.position=At(row.Item3,row.Item4);
                var actor=PrehistoricCastV2.Create(row.Item1,row.Item2,parent);if(row.Item1=="petit_os")actor.meshyActor.transform.localScale=Vector3.one*.68f;
                actors.Add(actor);objectBindings.Add(new ObjectBinding{id=row.Item1,target=parent});routines.Add(new VillagerRoutine{id=row.Item1,pose=row.Item5,workplace=parent.position,rest=At(row.Item3+3,row.Item4-3),phase=routines.Count*4});
            }
            bindings.characters=actors.ToArray();bindings.objects=objectBindings.ToArray();
            foreach(var p in new[]{("aurelien",-2f,12f,"Talk"),("mathieu",-3f,5f,"Listen"),("georges",-19f,0f,"Mine"),("eliott",21f,19f,"Listen"),("mathilde",11f,9f,"Gather"),("lorette",1f,9f,"Talk"),("neila",17f,8f,"Craft")})
            {var point=bindings.Find(p.Item1);point.position=At(p.Item2,p.Item3);routines.Add(new VillagerRoutine{id=p.Item1,pose=p.Item4,workplace=point.position,rest=At(p.Item2+2,p.Item3-3),phase=routines.Count*4});}
            var life=campaign.GetComponent<VillageLife>()??campaign.gameObject.AddComponent<VillageLife>();life.campaign=campaign;life.routines=routines.ToArray();
            // Six lived-in early huts plus the evolving housing group. Initial settlement is inhabited, not an empty construction site.
            foreach(var p in new[]{new Vector2(-20,-12),new Vector2(-9,-15),new Vector2(3,-17),new Vector2(15,-13),new Vector2(24,-5),new Vector2(-26,-4)})
            {Place("CampHut_Destroyable",At(p.x,p.y),0,3.2f);Place("Bed_Placed",At(p.x+.5f,p.y+.7f),0,0);}
            // Visible workshops, food preparation, rest and supplies correspond to the seven source zones.
            foreach(var p in new[]{At(-16,1),At(-12,3),At(-19,4)})Place("Grindstone_Placed",p,35,2);
            Place("HideRack_Placed",At(-18,7),90,2);Place("HideRack_Placed",At(14,-1),0,2);Place("BigTent_Placed",At(12,8),0,4);
            Place("CampFoodStorage_Placed",At(10,-2),0,2);Place("VillageStorageCommon_Placed",At(18,7),0,3);Place("CampStorage_Placed",At(17,11),0,2);
            Place("Campfire_Placed",At(12,2),0,2);Place("Bed_Placed",At(9,9),0,0);Place("Bed_Placed",At(13,10),0,0);Place("Bench_PlacedItem",At(6,8),35,0);
            Place("LogPile_Buildable",At(-23,10),0,2);Place("Hut.WoodFrame_Placed",At(-13,19),20,3);Place("Hut.LeatherCover_Placed",At(-13,19),20,0);
            // The tutorial keeps one fallen frame distinct from inhabited houses and working workshops.
            var fallen=bindings.Find("charpente");foreach(var r in fallen.GetComponentsInChildren<Renderer>(true))r.gameObject.SetActive(false);
            var collapse=Place("CampHutFrame_Destroyable",fallen.position,0,2);collapse.name="Charpente effondrée du tutoriel";collapse.transform.rotation=Quaternion.Euler(0,15,67);
            foreach(var id in new[]{"grand_menhir","habitations","atelier_silex","foyer","stockage","bois_construction","pierre_carriere","chasse_clairiere"})Trail(origin+new Vector3(0,0,3),bindings.Find(id).position);
            ConfigureMap(campaign);
            EditorUtility.SetDirty(bindings);EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
            File.WriteAllText("E:/UNGA-BUNGA-45001/Revision2/village-install.json",JsonUtility.ToJson(new Receipt{player="dylan",actors=actors.Count,structures=structures,clearedRenderers=cleared,sourceZones=7,additionalInhabitedHuts=6},true));
        }
        [Serializable]private class Receipt{public string player;public int actors,structures,clearedRenderers,sourceZones,additionalInhabitedHuts;}
        private static GameObject Place(string name,Vector3 position,float angle,float clearance)
        {
            var prefab=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/"+name+".prefab");if(prefab==null)throw new FileNotFoundException(name);
            var instance=(GameObject)PrefabUtility.InstantiatePrefab(prefab,village.gameObject.scene);instance.transform.SetParent(village,true);instance.transform.SetPositionAndRotation(position,Quaternion.Euler(0,angle,0));
            foreach(var b in instance.GetComponentsInChildren<MonoBehaviour>(true))if(b!=null)UnityEngine.Object.DestroyImmediate(b);
            foreach(var t in instance.GetComponentsInChildren<Transform>(true))
            {
                GameObjectUtility.RemoveMonoBehavioursWithMissingScript(t.gameObject);
                if(System.Text.RegularExpressions.Regex.IsMatch(t.name,"Ghost|Preview|Outline|Highlight|^UI$|Canvas",System.Text.RegularExpressions.RegexOptions.IgnoreCase))t.gameObject.SetActive(false);
            }
            foreach(var rb in instance.GetComponentsInChildren<Rigidbody>(true)){rb.isKinematic=true;rb.useGravity=false;}
            foreach(var a in instance.GetComponentsInChildren<Animator>(true))a.enabled=false;
            foreach(var r in instance.GetComponentsInChildren<Renderer>(true)){r.shadowCastingMode=ShadowCastingMode.On;r.receiveShadows=true;}
            if(clearance>0)foreach(var renderer in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
            {
                if(renderer.transform.IsChildOf(village)||!System.Text.RegularExpressions.Regex.IsMatch(renderer.name,"grass|fern|tree|bush|sapling",System.Text.RegularExpressions.RegexOptions.IgnoreCase))continue;
                var delta=renderer.bounds.center-position;if(new Vector2(delta.x,delta.z).magnitude<clearance){renderer.enabled=false;foreach(var c in renderer.GetComponents<Collider>())c.enabled=false;cleared++;}
            }
            structures++;return instance;
        }
        private static void Trail(Vector3 from,Vector3 to)
        {
            var vertices=new List<Vector3>();var tris=new List<int>();var delta=to-from;var side=Vector3.Cross(delta.normalized,Vector3.up)*.9f;int count=Mathf.Max(2,Mathf.CeilToInt(delta.magnitude/1.5f));
            for(int i=0;i<=count;i++)foreach(float sign in new[]{-1f,1f}){var p=Vector3.Lerp(from,to,(float)i/count)+side*sign;p.y=VillageLife.Ground(p)+.035f;vertices.Add(p);}
            for(int i=0;i<count;i++){int a=i*2;tris.AddRange(new[]{a,a+2,a+1,a+1,a+2,a+3});}
            var mesh=new Mesh{name="Sentier de circulation"};mesh.SetVertices(vertices);mesh.SetTriangles(tris,0);mesh.RecalculateNormals();
            string folder="Assets/UngaBunga45001/Generated/VillageV2";Directory.CreateDirectory(folder);AssetDatabase.Refresh();string path=folder+"/Trail-"+village.childCount+".asset";AssetDatabase.CreateAsset(mesh,path);
            var go=new GameObject("Sentier");go.transform.SetParent(village);go.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=go.AddComponent<MeshRenderer>();var material=AssetDatabase.LoadAssetAtPath<Material>(folder+"/Trail.mat");
            if(material==null){material=new Material(Shader.Find("HDRP/Lit"));material.SetColor("_BaseColor",new Color(.22f,.16f,.095f));material.SetFloat("_Smoothness",.03f);AssetDatabase.CreateAsset(material,folder+"/Trail.mat");}renderer.sharedMaterial=material;renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=true;
        }
        private static void ConfigureMap(CampaignRuntime campaign)
        {
            var terrain=UnityEngine.Object.FindFirstObjectByType<Terrain>();var data=terrain.terrainData;int n=768;var texture=new Texture2D(n,n,TextureFormat.RGB24,false);var pixels=new Color[n*n];
            for(int z=0;z<n;z++)for(int x=0;x<n;x++)
            {
                float u=(float)x/(n-1),v=(float)z/(n-1),height=data.GetInterpolatedHeight(u,v);var normal=data.GetInterpolatedNormal(u,v);float shade=.55f+.45f*Mathf.Max(0,Vector3.Dot(normal,new Vector3(-.5f,.8f,-.3f).normalized));
                var color=height<.8f?new Color(.10f,.27f,.31f):Color.Lerp(new Color(.18f,.31f,.17f),new Color(.51f,.46f,.31f),height/data.size.y);float contour=Mathf.Repeat(height,2)<.09f?.79f:1;pixels[z*n+x]=color*shade*contour;
            }
            texture.SetPixels(pixels);texture.Apply();string folder="Assets/UngaBunga45001/Generated/VillageV2";Directory.CreateDirectory(folder);string path=folder+"/Carte-terrain-reel.png";File.WriteAllBytes(path,texture.EncodeToPNG());UnityEngine.Object.DestroyImmediate(texture);AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
            var map=campaign.GetComponent<CampaignMap>()??campaign.gameObject.AddComponent<CampaignMap>();map.campaign=campaign;map.terrainMap=AssetDatabase.LoadAssetAtPath<Texture2D>(path);map.worldOrigin=new Vector2(terrain.transform.position.x,terrain.transform.position.z);map.worldSize=new Vector2(data.size.x,data.size.z);
        }
    }
}
